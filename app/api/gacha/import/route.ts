// app/api/gacha/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adapterManager, IApiResponse } from '@/lib/adapter';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: IApiResponse = await request.json();

    // 使用适配器A处理数据
    const result = await adapterManager.process('AdapterA', body);

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
    console.error('导入抽卡数据时出错:', error);
    return NextResponse.json(
      { 
        code: -1, 
        msg: `服务器错误: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
