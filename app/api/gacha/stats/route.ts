import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import History from '@/models/history';
import Pool from '@/models/pool';

// 高稀有度记录项（只统计 rarity === mR 的）
export interface IHighRarityItem {
  charId: string;
  charName: string;
  pulls: number;       // 距上一个mR角色的抽数
  isUp: boolean;       // 是否为UP角色（在up列表中）
}

// 卡池统计详情
export interface IPoolDetail {
  poolId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  totalPulls: number;        // 总抽数
  highRarityItems: IHighRarityItem[]; // mR稀有度的所有出金记录
  upList: string[];          // 该卡池的up列表
}

// 完整统计数据
export interface IStatsData {
  pools: IPoolDetail[];
}

export async function GET() {
  try {
    await dbConnect();

    // 获取所有抽卡记录，按时间排序
    const allHistory = await History.find().sort({ ts: 1 }).lean();

    // 获取所有卡池
    const allPools = await Pool.find().lean();

    // 按poolId分组历史记录
    const historyByPool = new Map<string, typeof allHistory>();
    allHistory.forEach((h) => {
      const list = historyByPool.get(h.poolId) || [];
      list.push(h);
      historyByPool.set(h.poolId, list);
    });

    // ====== 计算各卡池详情 ======
    const pools: IPoolDetail[] = [];

    for (const pool of allPools) {
      const records = historyByPool.get(pool.id) || [];
      if (records.length === 0) continue;

      const mRarity = pool.mRarity || 6;
      const upList = pool.up || [];

      // 格式化日期 MM.DD
      const formatDate = (ts: number) => {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      };

      // ====== 找出所有 >= mR 稀有度的记录 ======
      const mRRecords = records.filter((r) => r.rarity >= mRarity);

      // 为每个mR记录计算：距上一个mR用了多少抽 + 判断是否UP
      const highRarityItems: IHighRarityItem[] = [];

      for (let i = 0; i < mRRecords.length; i++) {
        const record = mRRecords[i];

        // 在records中找到这条记录的位置
        let recordIndex = -1;
        for (let k = 0; k < records.length; k++) {
          if (records[k].id === record.id) {
            recordIndex = k;
            break;
          }
        }
        if (recordIndex < 0) continue;

        // 往前找上一个mR记录的位置
        let prevMRIndex = -1;
        for (let p = recordIndex - 1; p >= 0; p--) {
          if (records[p].rarity === mRarity) {
            prevMRIndex = p;
            break;
          }
        }

        // 抽数 = 当前位置 - 上一个mR位置
        const pulls = prevMRIndex >= 0 ? recordIndex - prevMRIndex : recordIndex + 1;

        // 判断是否UP：角色名在up列表中
        const isUp = upList.length > 0 && upList.some(
          (upName) => upName === record.result.name || record.result.name.includes(upName)
        );

        highRarityItems.push({
          charId: record.result.id,
          charName: record.result.name,
          pulls,
          isUp,
        });
      }

      pools.push({
        poolId: pool.id,
        name: pool.name,
        type: pool.type,
        startDate: formatDate(pool.startTs as number),
        endDate: formatDate(pool.endTs as number),
        totalPulls: records.length,
        highRarityItems,
        upList,
      });
    }

    // 按结束时间倒序排列
    pools.sort((a, b) => {
      const dateA = a.endDate || a.startDate;
      const dateB = b.endDate || b.startDate;
      return dateB.localeCompare(dateA);
    });

    const statsData: IStatsData = { pools };

    return NextResponse.json({ code: 0, data: statsData, msg: 'ok' });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { code: -1, data: null, msg: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
