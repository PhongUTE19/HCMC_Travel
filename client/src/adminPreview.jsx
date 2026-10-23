import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminSessionGate from './components/admin/AdminSessionGate';
import './index.css';
import './components/admin/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AdminSessionGate /></React.StrictMode>,
);
