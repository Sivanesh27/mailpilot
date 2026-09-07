import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookieOnResponse } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  clearSessionCookieOnResponse(res);
  return res;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.nextUrl));
  clearSessionCookieOnResponse(res);
  return res;
}
