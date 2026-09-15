import { NextRequest, NextResponse } from 'next/server';
import { googleAuthUser } from '@/lib/auth';
import { validateEmail } from '@/lib/emailValidation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let name = body.name || 'Jaswanth';
    let email = (body.email || '').trim();
    let avatar = body.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80';
    let verified = true;

    // Strict email check
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      return NextResponse.json({ error: emailCheck.error || 'Invalid email address.' }, { status: 400 });
    }

    // If real Google ID token / credential from Google Identity Services is provided
    if (body.credential) {
      try {
        // Attempt verifying with Google's tokeninfo endpoint
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.credential}`);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          name = googleData.name || name;
          email = googleData.email || email;
          avatar = googleData.picture || avatar;
          verified = googleData.email_verified === 'true' || googleData.email_verified === true;
        } else {
          // Fallback decode base64 JWT payload if offline / simulated
          const parts = body.credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
            name = payload.name || name;
            email = payload.email || email;
            avatar = payload.picture || avatar;
            verified = Boolean(payload.email_verified);
          }
        }
      } catch (tokenErr) {
        console.warn('Could not verify Google ID token with remote endpoint, using parsed data:', tokenErr);
      }
    }

    const result = googleAuthUser(name, email, avatar, verified);
    const response = NextResponse.json({
      success: true,
      user: { ...result.user, verified },
      token: result.token,
    });

    response.cookies.set('echo-auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (e) {
    console.error('Google auth error:', e);
    return NextResponse.json({ error: 'Google sign-in failed.' }, { status: 500 });
  }
}

