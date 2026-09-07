import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL('/login', req.nextUrl));
}
