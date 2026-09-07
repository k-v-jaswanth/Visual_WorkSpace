import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  Video,
  Workflow,
  Users,
  CheckCircle,
} from 'lucide-react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

interface AuthModalProps {
  apiBase: string;
  onAuthenticated: (user: AuthUser, token: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  apiBase,
  onAuthenticated,
  theme,
  onToggleTheme,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      localStorage.setItem('cm_token', data.token);
      localStorage.setItem('cm_user', JSON.stringify(data.user));
      onAuthenticated(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      localStorage.setItem('cm_token', data.token);
      localStorage.setItem('cm_user', JSON.stringify(data.user));
      onAuthenticated(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (role: 'priya' | 'sam') => {
    if (role === 'priya') {
      setName('Priya Sharma');
      setEmail('priya@canvasmeet.io');
      setPassword('securePass123!');
      setConfirmPassword('securePass123!');
    } else {
      setName('Sam Wilson');
      setEmail('sam@canvasmeet.io');
      setPassword('securePass123!');
      setConfirmPassword('securePass123!');
    }
    setError(null);
  };

  return (
    <div className="auth-container">
      {/* Theme Switcher Top Right */}
      <div className="auth-top-bar">
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div className="auth-card">
        {/* Left / Top Branding & Features */}
        <div className="auth-header">
          <div className="brand-badge">
            <Sparkles size={20} className="sparkle-icon" />
            <span>CanvasMeet</span>
          </div>
          <h2>Turn Live Conversations Into Visual Action</h2>
          <p>
            Real-time collaborative meetings, WebRTC video, and AI-driven workspace canvas.
          </p>

          <div className="auth-feature-pills">
            <span><Video size={14} /> WebRTC Video & Audio</span>
            <span><Workflow size={14} /> AI Living Canvas</span>
            <span><ShieldCheck size={14} /> Real Database Auth</span>
            <span><Users size={14} /> Live Collaboration</span>
          </div>
        </div>

        {/* Tab Switcher: Real Sign In vs Real Sign Up */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
          >
            Create Real Account
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' ? (
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrap">
                <UserIcon size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Work Email</label>
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="e.g. priya@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password (min 6 characters)</label>
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="primary-action-btn" disabled={loading}>
              {loading ? (
                <div className="btn-spinner" />
              ) : (
                <>
                  <span>Create Account & Enter Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Sign In Form */
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="e.g. priya@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="primary-action-btn" disabled={loading}>
              {loading ? (
                <div className="btn-spinner" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick autofill test accounts to speed up multi-user testing */}
        <div className="demo-accounts-helper">
          <small>Quick test shortcuts (populates real form & registers to DB):</small>
          <div className="quick-buttons">
            <button
              type="button"
              className="chip-btn"
              onClick={() => fillQuickDemo('priya')}
            >
              Test User 1 (Priya)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => fillQuickDemo('sam')}
            >
              Test User 2 (Sam)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
