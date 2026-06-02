// lib/adapter.ts
import dbConnect from './db';
import History from '../models/history';
import Pool from '../models/pool';

// API返回的抽卡记录项接口
export interface IApiResultItem {
  poolId: string;
  poolName: string;
  charId: string;
  charName: string;
  rarity: number;
  isNew: boolean;
  gachaTs: string;
  pos: number;
  poolType?: string;      // 卡池类型 ID
  poolTypeName?: string;  // 卡池类型名称
}

// API返回的数据结构接口
export interface IApiResponse {
  code: number;
  data: {
    list: IApiResultItem[];
    hasMore: boolean;
  };
  msg: string;
}

// 适配器接口
export interface IAdapter {
  name: string;
  validate(data: any): boolean;
  transform(data: any): Promise<any>;
  save(items: any[], extraData?: any): Promise<void>;
  fetchByToken?(token: string): Promise<any>;
}

// 适配器A - 处理特定格式的API数据
export class AdapterA implements IAdapter {
  name = 'AdapterA';

  private readonly API_CONFIG = {
    csrfUrl: 'https://ak.hypergryph.com/user',
    appTokenUrl: 'https://as.hypergryph.com/user/oauth2/v2/grant',
    bindingListUrl: 'https://binding-api-account-prod.hypergryph.com/account/binding/v1/binding_list',
    u8TokenUrl: 'https://binding-api-account-prod.hypergryph.com/account/binding/v1/u8_token_by_uid',
    roleLoginUrl: 'https://ak.hypergryph.com/user/api/role/login',
    cateUrl: 'https://ak.hypergryph.com/user/api/inquiry/gacha/cate',
    gachaUrl: 'https://ak.hypergryph.com/user/api/inquiry/gacha/history',
  };

  /**
   * 通过 Token 从明日方舟 API 获取抽卡数据
   */
  async fetchByToken(token: string): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
      'Referer': 'https://ak.hypergryph.com/',
      'Content-Type': 'application/json',
    };

    // 用于收集 cookie
    let cookies: string[] = [];

    // 辅助函数：合并 cookie
    const mergeCookies = (res: Response) => {
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const newCookies = setCookie.split(',').map(c => c.split(';')[0].trim());
        cookies = [...cookies, ...newCookies];
      }
    };

    // 1. 获取 CSRF token
    const csrfRes = await fetch(this.API_CONFIG.csrfUrl, { headers, redirect: 'manual' });
    mergeCookies(csrfRes);
    const cookieHeader = cookies.join('; ');

    // 2. 获取 app_token
    const appTokenRes = await fetch(this.API_CONFIG.appTokenUrl, {
      method: 'POST',
      headers: { ...headers, 'Cookie': cookieHeader },
      body: JSON.stringify({ token, appCode: 'be36d44aa36bfb5b', type: 1 }),
    });
    mergeCookies(appTokenRes);
    const appTokenData = await appTokenRes.json();
    const appToken = appTokenData?.data?.token;
    if (!appToken) throw new Error('获取 app_token 失败');

    // 3. 获取绑定列表，找到默认 uid
    const bindingRes = await fetch(`${this.API_CONFIG.bindingListUrl}?token=${encodeURIComponent(appToken)}&appCode=arknights`, { headers });
    const bindingData = await bindingRes.json();
    const uid = this.findDefaultUid(bindingData);
    if (!uid) throw new Error('未找到默认角色，请先在官网设置默认角色');

    // 4. 获取 u8_token
    const u8TokenRes = await fetch(this.API_CONFIG.u8TokenUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: appToken, uid }),
    });
    const u8TokenData = await u8TokenRes.json();
    const u8Token = u8TokenData?.data?.token;
    if (!u8Token) throw new Error('获取 u8_token 失败');

    // 5. 角色登录（需要带上所有 cookie）
    const roleLoginRes = await fetch(this.API_CONFIG.roleLoginUrl, {
      method: 'POST',
      headers: { ...headers, 'X-Role-Token': u8Token, 'Cookie': cookies.join('; ') },
      body: JSON.stringify({ token: u8Token, source_from: '', share_type: '', share_by: '' }),
    });
    mergeCookies(roleLoginRes);

    // 6. 获取卡池列表（带上登录后的 cookie）
    const cateRes = await fetch(this.API_CONFIG.cateUrl, {
      headers: { ...headers, 'X-Role-Token': u8Token, 'Cookie': cookies.join('; ') },
    });
    const cateData = await cateRes.json();
    const poolList: { id: string; name: string }[] = cateData?.data || [];

    // 7. 遍历卡池获取抽卡记录（分页获取，每页 199 条）
    const allRecords: any[] = [];
    for (const pool of poolList) {
      let gachaTs: string | undefined;
      let pos: number | undefined;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({ uid, category: pool.id, size: '199' });
        if (gachaTs) params.set('gachaTs', gachaTs);
        if (pos !== undefined) params.set('pos', String(pos));

        const gachaRes = await fetch(`${this.API_CONFIG.gachaUrl}?${params}`, {
          headers: { ...headers, 'X-Role-Token': u8Token, 'Cookie': cookies.join('; ') },
        });
        const gachaData = await gachaRes.json();
        const list = gachaData?.data?.list || [];
        hasMore = gachaData?.data?.hasMore || false;

        // 给每条记录添加卡池类型信息
        const recordsWithType = list.map((item: any) => ({
          ...item,
          poolType: pool.id,
          poolTypeName: pool.name,
        }));
        allRecords.push(...recordsWithType);

        // 如果还有更多数据，用最后一条记录的 gachaTs 和 pos 继续请求
        if (hasMore && list.length > 0) {
          const last = list[list.length - 1];
          gachaTs = last.gachaTs;
          pos = last.pos;
        }
      }
    }

    // 8. 转换为适配器格式
    return {
      code: 0,
      data: {
        list: allRecords,
        hasMore: false,
      },
      msg: 'success',
    };
  }

  private findDefaultUid(data: any): string | null {
    for (const app of data?.data?.list || []) {
      for (const binding of app?.bindingList || []) {
        if (binding.isDefault) return binding.uid;
      }
    }
    return null;
  }

  /**
   * 验证API数据格式是否正确
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (data.code !== 0) return false;
    if (!data.data || !data.data.list || !Array.isArray(data.data.list)) return false;
    
    // 检查列表中每一项的字段
    return data.data.list.every((item: any) => {
      return (
        item.poolId && typeof item.poolId === 'string' &&
        item.charId && typeof item.charId === 'string' &&
        item.charName && typeof item.charName === 'string' &&
        typeof item.rarity === 'number' &&
        typeof item.isNew === 'boolean' &&
        item.gachaTs && typeof item.gachaTs === 'string' &&
        typeof item.pos === 'number'
      );
    });
  }

  /**
   * 将API数据转换为数据库模型格式
   */
  async transform(data: IApiResponse): Promise<{ historyItems: any[], poolInfo: Map<string, any> }> {
    const historyItems = data.data.list.map((item) => {
      return {
        poolId: item.poolId,
        id: `${item.gachaTs}_${item.pos}`, // 使用时间戳和位置组合作为唯一ID
        result: {
          id: item.charId,
          name: item.charName,
        },
        rarity: item.rarity,
        new: item.isNew,
        pity: false, // API数据中没有pity信息，默认为false
        ts: parseInt(item.gachaTs),
        pos: item.pos,
      };
    });

    // 收集卡池信息
    const poolInfo = new Map<string, any>();
    data.data.list.forEach((item) => {
      if (!poolInfo.has(item.poolId)) {
        poolInfo.set(item.poolId, {
          id: item.poolId,
          name: item.poolName || item.poolTypeName || item.poolId,
          type: item.poolType || 'UNKNOWN', // 使用 API 返回的卡池类型
          up: [],
          startTs: 0,
          endTs: 0,
          draws: 0,
          draws10: 0,
          rank: '',
          mRarity: 5,
        });
      }
    });

    return { historyItems, poolInfo };
  }

  /**
   * 保存卡池信息到数据库
   */
  private async savePools(poolInfo: Map<string, any>): Promise<void> {
    await dbConnect();

    let newPoolCount = 0;
    for (const [poolId, poolData] of poolInfo.entries()) {
      try {
        const existing = await Pool.findOne({ id: poolId });

        // 从history中计算draws和draws10
        const historyRecords = await History.find({ poolId }).sort({ ts: 1 });
        const draws = historyRecords.length;
        const draws10 = historyRecords.filter(r => r.pos === 9).length;

        // 已有卡池用数据库中的 up/mRarity，新卡池用 poolInfo 的默认值
        const upList = existing?.up?.length ? existing.up : (poolData.up || []);
        const mRarity = existing?.mRarity || poolData.mRarity || 6;

        // 计算出了多少个up（在up列表中的角色）
        const upCount = historyRecords.filter(r => upList.includes(r.result.name)).length;

        // 计算出了多少个最高稀有度
        const mRCount = historyRecords.filter(r => r.rarity === mRarity).length;

        // 写回poolData（新卡池create时需要）
        poolData.draws = draws;
        poolData.draws10 = draws10;
        poolData.upCount = upCount;
        poolData.mRCount = mRCount;
        poolData.mRarity = mRarity;

        // 计算时间范围
        if (historyRecords.length > 0) {
          poolData.startTs = historyRecords[0].ts;
          poolData.endTs = historyRecords[historyRecords.length - 1].ts;
        }

        if (existing) {
          // 已有卡池：更新统计数据
          await Pool.updateOne({ id: poolId }, {
            $set: {
              draws,
              draws10,
              upCount,
              mRCount,
              startTs: poolData.startTs,
              endTs: poolData.endTs,
            },
          });
        } else {
          // 新卡池：创建
          await Pool.create(poolData);
          newPoolCount++;
        }
      } catch (error) {
        console.error(`❌ 保存卡池失败: ${poolId}`, error);
        throw error;
      }
    }

    if (newPoolCount > 0) {
      console.log(`✅ 成功保存 ${newPoolCount} 个新卡池`);
    }
  }

  /**
   * 保存数据到数据库
   */
  async save(items: any[], poolInfo?: Map<string, any>): Promise<void> {
    await dbConnect();

    // 1. 批量 upsert 抽卡记录（存在则覆盖，不存在则插入）
    if (items.length > 0) {
      const bulkOps = items.map(item => ({
        updateOne: {
          filter: { id: item.id },
          update: { $set: item },
          upsert: true,
        },
      }));
      const result = await History.bulkWrite(bulkOps, { ordered: false });
      console.log(`✅ 抽卡记录: 插入 ${result.upsertedCount} 条, 更新 ${result.modifiedCount} 条`);
    }

    // 2. 抽卡记录保存完成后，再计算并保存卡池信息
    if (poolInfo && poolInfo.size > 0) {
      await this.savePools(poolInfo);
    }
  }
}

/**
 * 适配器管理器
 */
export class AdapterManager {
  private adapters: Map<string, IAdapter> = new Map();

  /**
   * 注册适配器
   */
  register(adapter: IAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 获取适配器
   */
  get(name: string): IAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * 使用指定适配器处理数据
   */
  async process(adapterName: string, data: any): Promise<{ success: boolean; message: string }> {
    const adapter = this.get(adapterName);

    if (!adapter) {
      return { success: false, message: `未找到适配器: ${adapterName}` };
    }

    // 验证数据
    if (!adapter.validate(data)) {
      return { success: false, message: '数据格式验证失败' };
    }

    try {
      // 转换数据
      const transformed = await adapter.transform(data);
      const items = transformed.historyItems || transformed;
      const poolInfo = transformed.poolInfo;

      console.log(`🔄 已转换 ${items.length} 条抽卡记录`);
      if (poolInfo && poolInfo.size > 0) {
        console.log(`🎯 发现 ${poolInfo.size} 个新卡池`);
      }

      // 保存数据
      await adapter.save(items, poolInfo);

      let message = `成功保存 ${items.length} 条抽卡记录`;
      if (poolInfo && poolInfo.size > 0) {
        message += ` 和 ${poolInfo.size} 个卡池`;
      }

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error('处理数据时出错:', error);
      return {
        success: false,
        message: `处理数据时出错: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 通过 Token 获取数据并导入
   */
  async fetchAndImport(adapterName: string, token: string): Promise<{ success: boolean; message: string }> {
    const adapter = this.get(adapterName);

    if (!adapter) {
      return { success: false, message: `未找到适配器: ${adapterName}` };
    }

    if (!adapter.fetchByToken) {
      return { success: false, message: `适配器 ${adapterName} 不支持 Token 获取` };
    }

    try {
      // 通过 Token 获取数据
      const data = await adapter.fetchByToken(token);
      // 处理并保存数据
      return await this.process(adapterName, data);
    } catch (error) {
      console.error('通过 Token 获取数据时出错:', error);
      return {
        success: false,
        message: `获取数据失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// 创建默认的适配器管理器实例
export const adapterManager = new AdapterManager();

// 注册默认适配器
adapterManager.register(new AdapterA());

export default adapterManager;
