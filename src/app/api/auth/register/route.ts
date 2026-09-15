import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { validateEmail } from '@/lib/emailValidation';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const check = validateEmail(email);
    if (!check.isValid) {
      return NextResponse.json({ error: check.error || 'Invalid email address.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const result = registerUser(name || 'User', email, password);
    const response = NextResponse.json({ success: true, user: result.user, token: result.token });

    response.cookies.set('echo-auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 400 });
  }
}
