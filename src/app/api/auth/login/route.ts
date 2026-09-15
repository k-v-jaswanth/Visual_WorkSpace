import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { validateEmail } from '@/lib/emailValidation';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const check = validateEmail(email);
    if (!check.isValid) {
      return NextResponse.json({ error: check.error || 'Invalid email address format.' }, { status: 400 });
    }

    const result = authenticateUser(email, password);
    if (!result) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user, token: result.token });
    response.cookies.set('echo-auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Internal server error during login.' }, { status: 500 });
  }
}
