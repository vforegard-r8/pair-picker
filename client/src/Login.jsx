import React, { useState, useEffect } from 'react';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function Login() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [multiTeamEnabled, setMultiTeamEnabled] = useState(false);
  const [simpleAuthEnabled, setSimpleAuthEnabled] = useState(false);

  useEffect(() => {
    // Check which auth method is enabled
    fetch(`${API_URL}/auth/config`)
      .then(res => res.json())
      .then(data => {
        setSimpleAuthEnabled(data.simpleAuthEnabled);
        setMultiTeamEnabled(data.multiTeamEnabled);
      })
      .catch(() => {
        setSimpleAuthEnabled(false);
        setMultiTeamEnabled(true);
      });
  }, []);

  const handleTeamLogin = async (createNew) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/team-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, password, createNew }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        window.location.reload(); // Reload to trigger auth check
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: teamName, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        window.location.reload();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>👥 Pair Picker</h1>
        <p className="login-subtitle">Smart pair programming for Rise8 teams</p>

        <div className="login-content">
          {multiTeamEnabled ? (
            <>
              <p className="login-description">
                Enter your team name and password to continue.
              </p>

              <div className="login-form">
                <input
                  type="text"
                  placeholder="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="login-input"
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Password (min 4 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  disabled={loading}
                />
                {error && <p className="login-error">{error}</p>}
                <div className="login-buttons">
                  <button
                    onClick={() => handleTeamLogin(false)}
                    className="login-btn"
                    disabled={loading || !teamName || !password}
                  >
                    {loading ? 'Please wait...' : 'Login to Team'}
                  </button>
                  <button
                    onClick={() => handleTeamLogin(true)}
                    className="login-btn create-btn"
                    disabled={loading || !teamName || !password}
                  >
                    Create New Team
                  </button>
                </div>
              </div>

              <div className="login-info">
                <p className="login-info-text">
                  <strong>New team?</strong> Choose a unique team name and password.<br/>
                  <strong>Existing team?</strong> Enter your team's credentials to login.<br/>
                  <small>Each team's data is completely isolated.</small>
                </p>
              </div>
            </>
          ) : simpleAuthEnabled ? (
            <>
              <p className="login-description">
                Sign in to access the pair picker.
              </p>

              <form onSubmit={handleSimpleLogin} className="login-form">
                <input
                  type="text"
                  placeholder="Username"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="login-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
                {error && <p className="login-error">{error}</p>}
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="login-info">
                <p className="login-info-text">
                  Default: username: <strong>rise8</strong>, password: <strong>pair-picker</strong>
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="login-description">
                Sign in with your Rise8 Google account to access the pair picker.
              </p>

              <button onClick={handleGoogleLogin} className="google-login-btn">
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="login-info">
                <p className="login-info-text">
                  🔒 Only @rise8.us email addresses and whitelisted accounts can access this app.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
