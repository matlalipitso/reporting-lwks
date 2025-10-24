


import React, { useState, useEffect } from 'react';
import { authService } from '../services/authservice';

const ConnectionTest = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus('checking');
    const result = await authService.healthCheck();
    
    if (result.success) {
      setStatus('connected');
      setMessage('✅ Backend connected successfully!');
    } else {
      setStatus('error');
      setMessage('❌ Cannot connect to backend. Make sure your server is running on port 5001.');
    }
  };

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px',
      backgroundColor: status === 'connected' ? '#d4edda' : status === 'error' ? '#f8d7da' : '#fff3cd',
      color: status === 'connected' ? '#155724' : status === 'error' ? '#721c24' : '#856404',
      borderRadius: '5px',
      border: `1px solid ${status === 'connected' ? '#c3e6cb' : status === 'error' ? '#f5c6cb' : '#ffeaa7'}`
    }}>
      <strong>Server Status:</strong> {status === 'checking' ? 'Checking...' : message}
      <button 
        onClick={checkConnection}
        style={{ marginLeft: '10px', padding: '5px 10px' }}
      >
        Retry
      </button>
    </div>
  );
};

export default ConnectionTest;