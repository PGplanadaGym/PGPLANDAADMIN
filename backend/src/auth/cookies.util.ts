import type { CookieOptions, Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie('access_token', accessToken, {
    ...baseOptions,
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseOptions,
    path: '/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/auth' });
}
