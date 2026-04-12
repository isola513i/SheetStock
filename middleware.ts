import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
  findUserById,
  createAccessToken,
  ACCESS_COOKIE_OPTIONS,
} from '@/lib/server/auth';

const PROTECTED_PATHS = ['/', '/admin'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const legacyToken = request.cookies.get(LEGACY_COOKIE)?.value;

  const accessUser = accessToken ? await verifyAccessToken(accessToken) : null;
  const isAuthenticated = Boolean(accessUser);

  // Guest visiting root → redirect to catalog
  if (pathname === '/' && !isAuthenticated) {
    if (refreshToken) {
      const userId = await verifyRefreshToken(refreshToken);
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          // Logged-in customer → catalog, admin/sale → stay on /
          const dest = user.role === 'customer' ? '/catalog' : '/';
          const newAccess = await createAccessToken(user);
          const response = dest === '/' ? NextResponse.next() : NextResponse.redirect(new URL(dest, request.url));
          response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
          if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
          return response;
        }
      }
    }
    return NextResponse.redirect(new URL('/catalog', request.url));
  }

  // Login/register pages
  if (pathname === '/login' || pathname === '/register') {
    if (isAuthenticated) {
      const dest = accessUser?.role === 'customer' ? '/catalog' : '/';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    if (!isAuthenticated && refreshToken) {
      const userId = await verifyRefreshToken(refreshToken);
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          const dest = user.role === 'customer' ? '/catalog' : '/';
          const newAccess = await createAccessToken(user);
          const response = NextResponse.redirect(new URL(dest, request.url));
          response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
          if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
          return response;
        }
      }
    }
    return NextResponse.next();
  }

  // Protected page routes (admin pages)
  if (isProtectedPath(pathname)) {
    const isAdminPath = pathname.startsWith('/admin');

    if (isAuthenticated) {
      // Block non-admin users from /admin paths
      if (isAdminPath && accessUser?.role !== 'admin') {
        return NextResponse.redirect(new URL('/catalog', request.url));
      }
      const response = NextResponse.next();
      if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }
    if (refreshToken) {
      const userId = await verifyRefreshToken(refreshToken);
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          if (isAdminPath && user.role !== 'admin') {
            return NextResponse.redirect(new URL('/catalog', request.url));
          }
          const newAccess = await createAccessToken(user);
          const response = NextResponse.next();
          response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
          if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
          return response;
        }
      }
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API routes: silently refresh access token if expired but refresh valid
  if (isApiPath(pathname) && !isAuthenticated && refreshToken) {
    const userId = await verifyRefreshToken(refreshToken);
    if (userId) {
      const user = findUserById(userId);
      if (user) {
        const newAccess = await createAccessToken(user);
        const response = NextResponse.next();
        response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons).*)'],
};
