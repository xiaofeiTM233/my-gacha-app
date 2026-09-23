// lib/adapters/E.ts
import dbConnect from '../db';
import History from '../../models/history';
import Pool from '../../models/pool';
import { IAdapter } from './index';

// EC - 角色寻访 API 数据模型
export interface IECResultItem {
  kind: string;
  poolId: string;
  poolName: string;
  nameText: string;
  charId: string;
  charName: string;
  rarity: number;
  isFree: boolean;
  isNew: boolean;
  gachaTs: string;
  seqId: string;
  game?: string;
  poolType?: string;
}

export interface IECApiResponse {
  code: number;
  data: {
    list: IECResultItem[];
    hasMore: boolean;
  };
  msg: string;
}

// EW - 武器寻访 API 数据模型
export interface IEWResultItem {
  kind: string;
  poolId: string;
  poolName: string;
  nameText: string;
  weaponId: string;
  weaponName: string;
  weaponType: string;
  rarity: number;
  isNew: boolean;
  gachaTs: string;
  seqId: string;
  game?: string;
  poolType?: string;
}

export interface IEWApiResponse {
  code: number;
  data: {
    list: IEWResultItem[];
    hasMore: boolean;
  };
  msg: string;
}

// 适配器E - 处理终末地API数据
export class AdapterE implements IAdapter {
  name = 'AdapterE';

  private readonly API_CONFIG = {
    char: 'https://ef-webview.hypergryph.com/api/record/char',
    weapon: 'https://ef-webview.hypergryph.com/api/record/weapon',
    grant: 'https://as.hypergryph.com/user/oauth2/v2/grant',
    binding: 'https://binding-api-account-prod.hypergryph.com/account/binding/v1/binding_list',
    u8: 'https://binding-api-account-prod.hypergryph.com/account/binding/v1/u8_token_by_uid',
  };

  async fetchByToken(token: string): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.8 Chrome/87.0.4280.144 Safari/537.36 PC/WIN/HGSDK HGWebPC/1.38.1',
      'Referer': 'https://ef-webview.hypergryph.com/',
      'Content-Type': 'application/json',
    };

    // token → app_token
    const grantRes = await fetch(this.API_CONFIG.grant, {
      method: 'POST', headers,
      body: JSON.stringify({ token, appCode: 'be36d44aa36bfb5b', type: 1 }),
    });
    const grantData = await grantRes.json();
    const appToken = grantData?.data?.token;
    if (!appToken) throw new Error('获取 app_token 失败');

    // app_token → uid
    const bindRes = await fetch(`${this.API_CONFIG.binding}?token=${encodeURIComponent(appToken)}&appCode=endfield`, { headers });
    const bindData = await bindRes.json();
    const uid = this.findUid(bindData);
    if (!uid) throw new Error('未找到默认角色');

    // uid → u8_token
    const u8Res = await fetch(this.API_CONFIG.u8, {
      method: 'POST', headers,
      body: JSON.stringify({ token: appToken, uid }),
    });
    const u8Data = await u8Res.json();
    const u8Token = u8Data?.data?.token;
    if (!u8Token) throw new Error('获取 u8_token 失败');

    // 用 u8_token 拉取抽卡记录
    const list: any[] = [];

    // EC - 角色寻访
    const charMetaRes = await fetch(`${this.API_CONFIG.char}/meta?token=${encodeURIComponent(u8Token)}&lang=zh-cn&server_id=1`, { headers });
    const charMetaData = await charMetaRes.json();
    const tabs: any[] = charMetaData?.data?.tabs || [];

    for (const tab of tabs) {
      const recs = await this.fetchPages(u8Token, this.API_CONFIG.char, 'pool_type', tab.poolType, headers);
      list.push(...recs.map((r: any) => ({ ...r, game: 'EC', poolType: tab.poolType })));
      await this.delay(800 + Math.random() * 700);
    }

    // EW - 武器寻访
    const weaponPoolRes = await fetch(`${this.API_CONFIG.weapon}/pool?token=${encodeURIComponent(u8Token)}&lang=zh-cn&server_id=1`, { headers });
    const weaponPoolData = await weaponPoolRes.json();
    const weaponPools: any[] = weaponPoolData?.data || [];

    for (const pool of weaponPools) {
      const recs = await this.fetchPages(u8Token, this.API_CONFIG.weapon, 'pool_id', pool.poolId, headers);
      list.push(...recs.map((r: any) => ({ ...r, game: 'EW', poolType: pool.poolId })));
      await this.delay(800 + Math.random() * 700);
    }

    const filtered = list.filter((r: any) => r.kind === 'draw');
    return { code: 0, data: { list: filtered, hasMore: false }, msg: 'success' };
  }

  private async fetchPages(
    token: string, url: string, key: string, val: string, headers: Record<string, string>,
  ): Promise<any[]> {
    const list: any[] = [];
    let more = true;
    let seq: string | undefined;

    while (more) {
      const params = new URLSearchParams({ token, lang: 'zh-cn', server_id: '1' });
      params.set(key, val);
      if (seq) params.set('seq_id', seq);

      const res = await fetch(`${url}?${params}`, { headers });
      const data = await res.json();
      const items = data?.data?.list || [];
      more = data?.data?.hasMore || false;
      list.push(...items);

      if (more && items.length > 0) {
        seq = items[items.length - 1].seqId;
        await this.delay(800 + Math.random() * 700);
      }
    }

    return list;
  }

  private findUid(data: any): string | null {
    for (const app of data?.data?.list || []) {
      for (const b of app?.bindingList || []) {
        if (b.isDefault) return b.uid;
      }
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证API数据格式是否正确
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (data.code !== 0) return false;
    if (!data.data || !data.data.list || !Array.isArray(data.data.list)) return false;

    const invalid = data.data.list.find((item: any) => {
      const hasName = item.charName || item.weaponName;
      const hasId = item.charId || item.weaponId;
      return !(
        hasName && typeof hasName === 'string' &&
        hasId && typeof hasId === 'string' &&
        item.poolId && typeof item.poolId === 'string' &&
        typeof item.rarity === 'number' &&
        item.gachaTs && typeof item.gachaTs === 'string'
      );
    });
    if (invalid) {
      console.log('validate 失败记录:', JSON.stringify(invalid));
      return false;
    }
    return true;
  }

  /**
   * 将API数据转换为数据库模型格式
   */
  async transform(data: any): Promise<{ historyItems: any[]; poolInfo: Map<string, any> }> {
    const historyItems = data.data.list.map((item: any) => {
      const isChar = !!item.charId;

      return {
        poolId: item.poolId,
        id: item.seqId || `${item.gachaTs}_${Math.random().toString(36).slice(2, 11)}`,
        result: isChar
          ? { id: item.charId, name: item.charName }
          : { id: item.weaponId, name: item.weaponName },
        rarity: item.rarity,
        new: item.isNew,
        free: item.isFree || false,
        pity: false,
        ts: parseInt(item.gachaTs),
        seqId: item.seqId,
      };
    });

    // 收集卡池信息
    const poolInfo = new Map<string, any>();
    data.data.list.forEach((item: any) => {
      if (!poolInfo.has(item.poolId)) {
        poolInfo.set(item.poolId, {
          id: item.poolId,
          name: item.poolName || item.poolId,
          type: item.poolType || item.poolId,
          game: item.game || 'EC',
          up: [],
          startTs: 0,
          endTs: 0,
          draws: 0,
          draws10: 0,
          rank: '',
          mRarity: 6,
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

        const historyRecords = await History.find({ poolId }).sort({ ts: 1 }).lean();
        const draws = historyRecords.length;
        // E 系列记录没有 pos 字段，无法用 pos===9 判断十连。
        // 改用 seqId 判断：seqId 是全局连续递增的总计数，一次十连的 10 条记录 seqId 依次 +1。
        // E 系列 transform 时把 seqId 存进了 History.id，按 seqId 排序后统计连续段内每满 10 条记一次十连。
        const bySeq = [...historyRecords].sort((a, b) => Number(a.id) - Number(b.id));
        let draws10 = 0;
        let run = 0;
        let prevSeq: number | null = null;
        for (const r of bySeq) {
          const seq = Number(r.id);
          run = prevSeq !== null && Number.isFinite(seq) && seq === prevSeq + 1 ? run + 1 : 1;
          if (run % 10 === 0) draws10++;
          prevSeq = seq;
        }

        const upList = existing?.up?.length ? existing.up : (poolData.up || []);
        const mRarity = existing?.mRarity || poolData.mRarity || 6;

        const upCount = historyRecords.filter(r => upList.includes(r.result.name)).length;
        const mRCount = historyRecords.filter(r => r.rarity === mRarity).length;

        poolData.draws = draws;
        poolData.draws10 = draws10;
        poolData.upCount = upCount;
        poolData.mRCount = mRCount;
        poolData.mRarity = mRarity;

        if (historyRecords.length > 0) {
          poolData.startTs = historyRecords[0].ts;
          poolData.endTs = historyRecords[historyRecords.length - 1].ts;
        }

        if (existing) {
          await Pool.updateOne({ id: poolId }, {
            $set: {
              draws,
              draws10,
              upCount,
              mRCount,
              startTs: poolData.startTs,
              endTs: poolData.endTs,
              game: poolData.game,
            },
          });
        } else {
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

    if (poolInfo && poolInfo.size > 0) {
      await this.savePools(poolInfo);
    }
  }
}
