import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Pool from '@/models/pool';
import History from '@/models/history';

// 获取所有卡池
export async function GET() {
  try {
    await dbConnect();
    const pools = await Pool.find().sort({ endTs: -1 }).lean();
    return NextResponse.json({ code: 0, data: pools, msg: 'ok' });
  } catch (error) {
    console.error('获取卡池列表失败:', error);
    return NextResponse.json(
      { code: -1, data: null, msg: '获取卡池列表失败' },
      { status: 500 }
    );
  }
}

// 新增卡池
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // 检查id是否已存在
    const existing = await Pool.findOne({ id: body.id });
    if (existing) {
      return NextResponse.json(
        { code: -1, data: null, msg: '卡池ID已存在' },
        { status: 400 }
      );
    }

    const pool = await Pool.create(body);
    return NextResponse.json({ code: 0, data: pool, msg: '创建成功' });
  } catch (error) {
    console.error('创建卡池失败:', error);
    return NextResponse.json(
      { code: -1, data: null, msg: '创建卡池失败' },
      { status: 500 }
    );
  }
}

// 更新卡池
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { code: -1, data: null, msg: '缺少卡池ID' },
        { status: 400 }
      );
    }

    // 获取现有卡池，合并 up/mRarity 用于计算
    const existing = await Pool.findOne({ id });
    const upList = updateData.up ?? existing?.up ?? [];
    const mRarity = updateData.mRarity ?? existing?.mRarity ?? 6;

    // 根据历史记录自动计算统计字段
    const historyRecords = await History.find({ poolId: id }).sort({ ts: 1 });
    const draws = historyRecords.length;
    const draws10 = historyRecords.filter((r) => r.pos === 9).length;
    const upCount = historyRecords.filter((r) => upList.includes(r.result.name)).length;
    const mRCount = historyRecords.filter((r) => r.rarity >= mRarity).length;

    // 计算时间范围
    let startTs = updateData.startTs ?? existing?.startTs;
    let endTs = updateData.endTs ?? existing?.endTs;
    if (historyRecords.length > 0) {
      startTs = historyRecords[0].ts;
      endTs = historyRecords[historyRecords.length - 1].ts;
    }

    const pool = await Pool.findOneAndUpdate(
      { id },
      {
        $set: {
          ...updateData,
          draws,
          draws10,
          upCount,
          mRCount,
          startTs,
          endTs,
        },
      },
      { returnDocument: 'after' }
    );

    if (!pool) {
      return NextResponse.json(
        { code: -1, data: null, msg: '卡池不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ code: 0, data: pool, msg: '更新成功' });
  } catch (error) {
    console.error('更新卡池失败:', error);
    return NextResponse.json(
      { code: -1, data: null, msg: '更新卡池失败' },
      { status: 500 }
    );
  }
}

// 删除卡池
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { code: -1, data: null, msg: '缺少卡池ID' },
        { status: 400 }
      );
    }

    const result = await Pool.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { code: -1, data: null, msg: '卡池不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ code: 0, data: null, msg: '删除成功' });
  } catch (error) {
    console.error('删除卡池失败:', error);
    return NextResponse.json(
      { code: -1, data: null, msg: '删除卡池失败' },
      { status: 500 }
    );
  }
}
