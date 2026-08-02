// lib/adapters/index.ts
import { AdapterA } from './A';
import { AdapterE } from './E';

// 适配器接口
export interface IAdapter {
  name: string;
  validate(data: any): boolean;
  transform(data: any): Promise<any>;
  save(items: any[], extraData?: any): Promise<void>;
  fetchByToken?(token: string): Promise<any>;
}

const adapters: Map<string, IAdapter> = new Map();

export function register(adapter: IAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function get(name: string): IAdapter | undefined {
  return adapters.get(name);
}

// 注册所有适配器
register(new AdapterA());
register(new AdapterE());
