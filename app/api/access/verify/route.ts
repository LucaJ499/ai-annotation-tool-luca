import { NextRequest, NextResponse } from 'next/server';

// 访问口令cookie名称
const ACCESS_COOKIE_NAME = 'site_access_granted';

// Cookie有效期：7天（秒）
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  console.log('[VERIFY API] 收到验证请求');
  
  try {
    // 检查环境变量是否配置
    const validAccessKey = process.env.ACCESS_KEY;
    console.log('[VERIFY API] 环境变量 ACCESS_KEY:', validAccessKey ? '已设置' : '未设置');
    
    if (!validAccessKey) {
      console.error('[VERIFY API] ACCESS_KEY 环境变量未设置');
      return NextResponse.json(
        { success: false, error: '系统配置错误，请联系管理员' },
        { status: 500 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { accessKey } = body;
    console.log('[VERIFY API] 收到的口令:', accessKey ? '有值' : '为空');

    // 验证输入
    if (!accessKey || typeof accessKey !== 'string') {
      console.log('[VERIFY API] 口令为空或格式错误');
      return NextResponse.json(
        { success: false, error: '请输入访问口令' },
        { status: 400 }
      );
    }

    // 校验口令
    const trimmedKey = accessKey.trim();
    console.log('[VERIFY API] 校验口令:', trimmedKey === validAccessKey ? '匹配' : '不匹配');
    
    if (trimmedKey !== validAccessKey) {
      return NextResponse.json(
        { success: false, error: '访问口令错误，请重新输入' },
        { status: 401 }
      );
    }

    // 验证成功，设置cookie
    console.log('[VERIFY API] 口令校验成功，准备设置cookie');
    const response = NextResponse.json({ success: true });
    
    // 设置cookie - 本地开发环境不使用secure
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('[VERIFY API] 环境:', isProduction ? '生产' : '开发', 'secure:', isProduction);
    
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: 'verified',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    
    console.log('[VERIFY API] cookie已设置，返回成功响应');
    return response;
  } catch (error) {
    console.error('[VERIFY API] 验证过程出错:', error);
    return NextResponse.json(
      { success: false, error: '验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}
