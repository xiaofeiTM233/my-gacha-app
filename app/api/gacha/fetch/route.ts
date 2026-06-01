// app/api/gacha/fetch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adapterManager } from '@/lib/adapter';

export async function POST(request: NextRequest) {
  try {
    const { token, adapter } = await request.json();

    if (!token) {
      return NextResponse.json(
        { code: -1, msg: '请提供 Token' },
        { status: 400 }
      );
    }

    // 通过适配器获取并导入数据
    const result = await adapterManager.fetchAndImport(adapter || 'AdapterA', token);

    if (!result.success) {
      return NextResponse.json(
        { code: -1, msg: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      code: 0,
      msg: result.message,
    });
  } catch (error) {
    console.error('通过 Token 获取抽卡数据时出错:', error);
    return NextResponse.json(
      {
        code: -1,
        msg: `服务器错误: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
