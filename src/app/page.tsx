'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { UserProfile } from '@/lib/auth';
import GoogleAuthModal from '@/components/auth/GoogleAuthModal';

type AuthMode = 'signin' | 'signup';

export default function StartupathonAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('m@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cachedUser, setCachedUser] = useState<UserProfile | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Check if a previous user exists in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('echo-user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.name) {
          setCachedUser(u);
          if (u.email) setEmail(u.email);
        }
      }
    } catch {}
  }, []);

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to sign in. Please verify your credentials.');
        setLoading(false);
        return;
      }

      // Success
      const profile = data.user;
      localStorage.setItem('echo-user', JSON.stringify({ ...profile, micOn: true, cameraOn: true }));
      localStorage.setItem('echo-token', data.token);
      setSuccessMsg(`✓ Welcome back, ${profile.name}! Launching canvas…`);

      setTimeout(() => {
        enterRoom(profile);
      }, 500);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields (Full Name, Email, and Password).');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Registration failed. Try a different email.');
        setLoading(false);
        return;
      }

      const profile = data.user;
      localStorage.setItem('echo-user', JSON.stringify({ ...profile, micOn: true, cameraOn: true }));
      localStorage.setItem('echo-token', data.token);
      setSuccessMsg(`✓ Account created for ${profile.name}! Connecting in real-time…`);

      setTimeout(() => {
        enterRoom(profile);
      }, 500);
    } catch {
      setError('Network error during registration. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user: UserProfile) => {
    setIsGoogleModalOpen(false);
    localStorage.setItem('echo-user', JSON.stringify({ ...user, micOn: true, cameraOn: true }));
    setSuccessMsg(`✓ Signed in with Google as ${user.name}! Joining workspace…`);
    setTimeout(() => {
      enterRoom(user);
    }, 450);
  };

  const handleFillDemo = () => {
    setEmail('m@example.com');
    setPassword('password123');
    setError('');
    setSuccessMsg('✓ Demo credentials filled!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('echo-user');
    localStorage.removeItem('echo-token');
    setCachedUser(null);
    setEmail('m@example.com');
    setPassword('password123');
    setSuccessMsg('Signed out successfully.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const enterRoom = (profile: UserProfile) => {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    localStorage.setItem(
      'echo-user',
      JSON.stringify({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        color: profile.color || '#7c3aed',
        avatar: profile.avatar,
        verified: profile.verified ?? true,
        micOn: true,
        cameraOn: true,
      })
    );
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="auth-page-container">
      {/* Real-time Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={handleGoogleSuccess}
      />

      {/* Background concentric glowing rings */}
      <div className="auth-ambient-bg">
        <div className="auth-glow-circle auth-glow-primary" />
        <div className="auth-glow-circle auth-glow-secondary" />
        <div className="auth-rings" />
      </div>

      {/* Top Brand Nav */}
      <nav className="auth-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="auth-brand-title" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          Startupathon
        </span>

        {cachedUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: cachedUser.color || '#7c3aed',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {cachedUser.name[0]}
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {cachedUser.name}
                <span
                  style={{
                    color: '#34A853',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(52, 168, 83, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                  }}
                  title="Real-Time Verified Account"
                >
                  ✓ Verified
                </span>
              </span>
            </div>

            <button
              onClick={() => enterRoom(cachedUser)}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✦ Resume Workspace
            </button>

            <button
              onClick={handleSignOut}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Sign out to test fresh login or different account"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Main 2-Column Section */}
      <main className="auth-main-layout">
        <div className="auth-split-grid">
          {/* Left Hero */}
          <div className="auth-hero-section">
            <div className="auth-hero-kicker">Startupathon</div>
            <h1 className="auth-hero-headline">
              Find the room where<br />
              your <em>best work</em> happens
            </h1>
            <p className="auth-hero-subtitle">
              Sign in to browse curated roles, compete in the challenge,
              and connect with teams that actually ship.
            </p>
            <div className="auth-hero-motto">
              PASSION &amp; PERSISTENCE OVER PEDIGREE
            </div>

            {/* Feature badges */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '48px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                ✦ Real-Time Google OAuth
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                🎥 WebRTC Video Mesh
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                🧠 AI Collaborative Canvas
              </span>
            </div>
          </div>

          {/* Right Auth Card — EXACTLY matching user screenshot with Real-Time Google & Auth */}
          <div className="auth-card-box">
            {/* Header with Title & Mode Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="auth-card-title" style={{ margin: 0 }}>
                {mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </div>
            </div>

            {/* Mode Tab Switcher */}
            <div className="auth-tab-pill-group" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`auth-tab-pill ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
                style={{ border: 'none', background: mode === 'signin' ? 'rgba(255,255,255,0.14)' : 'transparent' }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-pill ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                style={{ border: 'none', background: mode === 'signup' ? 'rgba(255,255,255,0.14)' : 'transparent' }}
              >
                Sign Up (Real-Time)
              </button>
            </div>

            {/* Error / Success Messages */}
            {error && <div className="auth-alert-box auth-alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
            {successMsg && <div className="auth-alert-box auth-alert-success" style={{ marginBottom: '16px' }}>{successMsg}</div>}

            {mode === 'signin' ? (
              /* Sign In Form */
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="auth-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <label className="auth-field-label" style={{ margin: 0 }}>Email</label>
                    <button
                      type="button"
                      onClick={handleFillDemo}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: '#fb7185',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Fill Demo (m@example.com)
                    </button>
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    className="auth-text-input"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <label className="auth-field-label" style={{ margin: 0 }}>Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-text-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  id="signin-btn"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Signing In in Real-Time…' : 'Sign In'}
                </button>

                <div className="auth-or-divider">OR</div>

                {/* Google Sign In — opens real-time Google account selector */}
                <button
                  id="google-signin-btn"
                  type="button"
                  className="auth-google-btn"
                  onClick={() => setIsGoogleModalOpen(true)}
                  disabled={loading}
                  title="Sign in instantly with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Footer Links matching screenshot */}
                <div className="auth-card-footer">
                  <button
                    type="button"
                    onClick={() => alert('Demo Account:\nEmail: m@example.com\nPassword: password123')}
                  >
                    Forgot password?
                  </button>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
                    Need to create an account?{' '}
                    <button
                      type="button"
                      className="auth-footer-highlight"
                      onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Sign Up Form */
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="auth-field-group">
                  <label className="auth-field-label">Full Name</label>
                  <input
                    id="signup-name-input"
                    type="text"
                    className="auth-text-input"
                    placeholder="e.g. Alex Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field-group">
                  <label className="auth-field-label">Email Address</label>
                  <input
                    id="signup-email-input"
                    type="email"
                    className="auth-text-input"
                    placeholder="alex.vance@startupathon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <label className="auth-field-label" style={{ margin: 0 }}>Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="signup-password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-text-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  id="signup-submit-btn"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Registering in Real-Time…' : 'Sign Up & Enter Workspace'}
                </button>

                <div className="auth-or-divider">OR</div>

                {/* Google Sign Up */}
                <button
                  type="button"
                  className="auth-google-btn"
                  onClick={() => setIsGoogleModalOpen(true)}
                  disabled={loading}
                  title="Sign up instantly with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign Up with Google</span>
                </button>

                <div className="auth-card-footer">
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="auth-footer-highlight"
                      onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
