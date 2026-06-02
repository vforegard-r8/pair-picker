import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AuthWrapper from './AuthWrapper.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>
);
