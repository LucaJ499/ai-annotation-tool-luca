import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 访问口令cookie名称
const ACCESS_COOKIE_NAME = 'site_access_granted'

// 不需要验证的路径
const PUBLIC_PATHS = ['/access', '/api/access/verify', '/api/access/check', '/api/access/clear']

// 静态资源路径前缀
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/static']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[MIDDLEWARE] 访问路径:', pathname)

  // 检查是否是静态资源
  if (STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    console.log('[MIDDLEWARE] 静态资源，放行')
    return NextResponse.next()
  }

  // 检查是否是公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    console.log('[MIDDLEWARE] 公开路径，放行')
    return NextResponse.next()
  }

  // 检查是否已通过验证
  const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)
  console.log('[MIDDLEWARE] cookie状态:', accessCookie ? `存在，值=${accessCookie.value}` : '不存在')
  
  if (!accessCookie || accessCookie.value !== 'verified') {
    console.log('[MIDDLEWARE] 未验证，重定向到/access')
    // 未验证，重定向到访问口令页面
    const accessUrl = new URL('/access', request.url)
    // 记录原始访问路径，验证成功后可以跳转回去
    accessUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(accessUrl)
  }

  console.log('[MIDDLEWARE] 已验证，放行')
  // 已验证，正常访问
  return NextResponse.next()
}

// 配置匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
