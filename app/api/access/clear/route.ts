import { NextRequest, NextResponse } from 'next/server';

// 访问口令cookie名称
const ACCESS_COOKIE_NAME = 'site_access_granted';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: '访问状态已清除' });
  
  // 清除cookie
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
