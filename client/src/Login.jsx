import React, { useState, useEffect } from 'react';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function Login() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [multiTeamEnabled] = useState(true);

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


  return (
    <div className="login-container">
      <div className="login-card">
        <h1>👥 Pair Picker</h1>
        <p className="login-subtitle">Smart pair programming for Rise8 teams</p>

        <div className="login-content">
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
        </div>
      </div>
    </div>
  );
}

export default Login;
