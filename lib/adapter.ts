// lib/adapter.ts
import dbConnect from './db';
import History from '../models/history';

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
  transform(data: any): Promise<any[]>;
  save(items: any[]): Promise<void>;
}

// 适配器A - 处理特定格式的API数据
export class AdapterA implements IAdapter {
  name = 'AdapterA';

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
  async transform(data: IApiResponse): Promise<any[]> {
    const items = data.data.list.map((item) => {
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
    
    return items;
  }

  /**
   * 保存数据到数据库
   */
  async save(items: any[]): Promise<void> {
    await dbConnect();
    
    for (const item of items) {
      try {
        // 检查是否已存在相同记录
        const existing = await History.findOne({ id: item.id });
        
        if (existing) {
          console.log(`⚠️ 记录已存在，跳过: ${item.id}`);
          continue;
        }
        
        // 插入新记录
        await History.create(item);
        console.log(`✅ 成功保存记录: ${item.result.name} (${item.result.id})`);
      } catch (error) {
        console.error(`❌ 保存记录失败: ${item.id}`, error);
        throw error;
      }
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
    console.log(`📦 已注册适配器: ${adapter.name}`);
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
      const items = await adapter.transform(data);
      console.log(`🔄 已转换 ${items.length} 条记录`);

      // 保存数据
      await adapter.save(items);
      
      return { 
        success: true, 
        message: `成功保存 ${items.length} 条记录到数据库` 
      };
    } catch (error) {
      console.error('处理数据时出错:', error);
      return { 
        success: false, 
        message: `处理数据时出错: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

// 创建默认的适配器管理器实例
export const adapterManager = new AdapterManager();

// 注册默认适配器
adapterManager.register(new AdapterA());

export default adapterManager;
