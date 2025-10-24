// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authservice';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertType, setAlertType] = useState('');

  const navigate = useNavigate();

  // Removed automatic redirect on mount to allow users to login with different accounts

  // Get intended destination or default to role-based page
  // const from = location.state?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const getRoleSpecificDashboardPath = (role) => {
    switch (role) {
      case 'lecturer':
        return '/lecturer-dashboard';
      case 'student':
        return '/student-dashboard';
      case 'principal-lecturer':
        return '/principal-lecturer-dashboard';
      case 'project-manager':
        return '/project-manager-dashboard';
      default:
        return '/login';
    }
  };

  const redirectUser = (role) => {
    const redirectPath = getRoleSpecificDashboardPath(role);
    console.log(`Redirecting ${role} to: ${redirectPath}`);

    // Use replace: true to prevent going back to login page
    navigate(redirectPath, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setAlertType('');
    
    if (!validateForm()) {
      setMessage('❌ Please fix the form errors');
      setAlertType('danger');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login(formData);

      if (result.success && result.user && result.token) {
        console.log('Login successful. User data:', result.user);
        console.log('User role:', result.user.role);
        setMessage('✅ Login successful! Redirecting...');
        setAlertType('success');

        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('token', result.token);

        // Optional: Save login timestamp
        localStorage.setItem('loginTime', new Date().toISOString());

        // Redirect immediately to role-specific dashboard
        redirectUser(result.user.role);

      } else {
        const errorMessage = result.message || 'Login failed. Please try again.';
        setMessage(`❌ ${errorMessage}`);
        setAlertType('danger');
        
        // Clear form on failure
        setFormData({
          email: formData.email, // Keep email for convenience
          password: ''
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.message) {
        if (error.message.includes('Cannot connect to server') || error.message.includes('Network Error')) {
          errorMessage = '❌ Cannot connect to server. Please check if the backend is running.';
        } else if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
          errorMessage = '❌ Invalid email or password. Please try again.';
        } else if (error.message.includes('404')) {
          errorMessage = '❌ User not found. Please check your email address.';
        } else if (error.message.includes('500')) {
          errorMessage = '❌ Server error. Please try again later.';
        }
      }
      
      setMessage(errorMessage);
      setAlertType('danger');
      
      // Clear password on error
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Clear message when form data changes
  useEffect(() => {
    if (message) {
      setMessage('');
    }
  }, [formData.email, formData.password, message]);

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className={`card shadow ${isDarkTheme ? 'bg-dark text-light' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Welcome Back</h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={toggleTheme}
                title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                disabled={isLoading}
              >
                {isDarkTheme ? '☀️' : '🌙'}
              </button>
            </div>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="card-title">Login</h2>
                <p className="text-muted">Sign in to your account</p>
              </div>

              {message && (
                <div
                  className={`alert alert-${alertType} alert-dismissible fade show`}
                  role="alert"
                >
                  {message}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setMessage('')}
                    disabled={isLoading}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="mb-2">
                  <Link to="/forgot-password" className="text-decoration-none">
                    Forgot your password?
                  </Link>
                </p>
                <p className="mb-0">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-decoration-none">
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;