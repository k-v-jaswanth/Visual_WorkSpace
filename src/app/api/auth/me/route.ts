import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      token = req.cookies.get('echo-auth-token')?.value || null;
    }

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = verifyJWT(token);
    return NextResponse.json({ user });
  } catch (e) {
    console.error('Verify session error:', e);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
