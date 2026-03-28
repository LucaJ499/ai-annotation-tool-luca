import { NextRequest, NextResponse } from 'next/server';

// 访问口令cookie名称
const ACCESS_COOKIE_NAME = 'site_access_granted';

export async function GET(request: NextRequest) {
  const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME);
  
  if (accessCookie && accessCookie.value === 'verified') {
    return NextResponse.json({ verified: true });
  }
  
  return NextResponse.json({ verified: false }, { status: 401 });
}
