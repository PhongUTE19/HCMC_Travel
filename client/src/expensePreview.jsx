import React from 'react';
import ReactDOM from 'react-dom/client';
import ExpenseTrackerApp from './components/expense/ExpenseTrackerApp';
import './index.css';

// Tạo trang xem trước độc lập, không thay đổi entry point của ứng dụng cũ.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ExpenseTrackerApp />
  </React.StrictMode>,
);
