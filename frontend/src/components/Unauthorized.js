import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Unauthorized = () => {
  const { isDarkTheme } = useTheme();

  return (
    <div className={`container mt-5 ${isDarkTheme ? 'dark-theme' : ''}`}>
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className={`card shadow ${isDarkTheme ? 'bg-dark text-light' : ''}`}>
            <div className="card-body text-center p-5">
              <div className="mb-4">
                <h1 className="display-1 text-danger">🚫</h1>
                <h2 className="card-title">Access Denied</h2>
                <p className="card-text text-muted">
                  You don't have permission to access this page.
                </p>
              </div>

              <div className="d-grid gap-2">
                <Link to="/login" className="btn btn-primary">
                  Go to Login
                </Link>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
