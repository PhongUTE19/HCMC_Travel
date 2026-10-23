import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthPage from './components/auth/AuthPage';
import './index.css';
import './components/auth/auth.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AuthPage /></React.StrictMode>,
);
