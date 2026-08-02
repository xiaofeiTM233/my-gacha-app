// app/api/gacha/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/adapters';

export async function POST(request: NextRequest) {
  try {
    const { adapter: adapterName, ...data } = await request.json();
    const adapter = get(adapterName || 'AdapterA');

    if (!adapter) {
      return NextResponse.json({ code: -1, msg: '未找到适配器' }, { status: 400 });
    }

    if (!adapter.validate(data)) {
      return NextResponse.json({ code: -1, msg: '数据格式验证失败' }, { status: 400 });
    }

    const { historyItems, poolInfo } = await adapter.transform(data);

    console.log(`🔄 已转换 ${historyItems.length} 条抽卡记录`);
    if (poolInfo && poolInfo.size > 0) {
      console.log(`🎯 发现 ${poolInfo.size} 个新卡池`);
    }

    await adapter.save(historyItems, poolInfo);

    let msg = `成功保存 ${historyItems.length} 条抽卡记录`;
    if (poolInfo && poolInfo.size > 0) {
      msg += ` 和 ${poolInfo.size} 个卡池`;
    }

    return NextResponse.json({ code: 0, msg });
  } catch (error) {
    console.error('导入抽卡数据时出错:', error);
    return NextResponse.json(
      { code: -1, msg: `服务器错误: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
