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

const PROTECTED_PATHS = ['/', '/catalog', '/pricing', '/admin'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const legacyToken = request.cookies.get(LEGACY_COOKIE)?.value;

  // Check if user has a valid access token
  const accessUser = accessToken ? verifyAccessToken(accessToken) : null;
  const isAuthenticated = Boolean(accessUser);

  // Login/register pages: redirect to home if already authenticated
  if (pathname === '/login' || pathname === '/register') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Try refresh token to auto-login
    if (!isAuthenticated && refreshToken) {
      const userId = verifyRefreshToken(refreshToken);
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          const newAccess = createAccessToken(user);
          const response = NextResponse.redirect(new URL('/', request.url));
          response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
          if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
          return response;
        }
      }
    }

    return NextResponse.next();
  }

  // Protected routes
  if (isProtectedPath(pathname)) {
    // Access token valid — proceed
    if (isAuthenticated) {
      const response = NextResponse.next();
      // Clear legacy cookie if present
      if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }

    // Access expired — try refresh token to issue new access token silently
    if (refreshToken) {
      const userId = verifyRefreshToken(refreshToken);
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          const newAccess = createAccessToken(user);
          const response = NextResponse.next();
          response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
          if (legacyToken) response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
          return response;
        }
      }
    }

    // No valid tokens — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|api).*)'],
};
