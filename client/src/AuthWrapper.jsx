import React, { useState, useEffect } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/user`, {
        credentials: 'include'
      });
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'white',
        fontSize: '1.5em'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <App user={user} onLogout={handleLogout} />;
}

export default AuthWrapper;
