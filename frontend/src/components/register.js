
import React, { useState } from 'react';
import { authService } from '../services/authservice';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Register = (onAuthSuccess) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    studentNumber: ''
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertType, setAlertType] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setAlertType('');

    try {
      const result = await authService.register(formData);

      if (result.success) {
        setMessage('✅ Registration successful! You can now login.');
        setAlertType('success');

        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'student',
          studentNumber: ''
        });

        // Redirect to login after successful registration
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMessage(`❌ ${result.message}`);
        setAlertType('danger');
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message.includes('Cannot connect to server')) {
        setMessage('❌ Cannot connect to server. Please check if the backend is running.');
      } else {
        setMessage('❌ Registration failed. Please try again.');
      }
      setAlertType('danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div></div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={toggleTheme}
                title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkTheme ? '☀️' : '🌙'}
              </button>
            </div>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="card-title">Create Account</h2>
                <p className="text-muted">Sign up for a new account</p>
              </div>

              {message && (
                <div className={`alert alert-${alertType} alert-dismissible fade show`} role="alert">
                  {message}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage('')}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    placeholder="Enter your password (min. 6 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <div className="form-text">Password must be at least 6 characters long.</div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="role" className="form-label">Role</label>
                    <select
                      className="form-select"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="student">Student</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="principal-lecturer">Principal Lecturer</option>
                      <option value="project-manager">Project Manager</option>
                    </select>
                  </div>
                  
                  {formData.role === 'student' && (
                    <div className="col-md-6 mb-3">
                      <label htmlFor="studentNumber" className="form-label">Student Number</label>
                      <input
                        type="text"
                        className="form-control"
                        id="studentNumber"
                        name="studentNumber"
                        placeholder="Enter student number"
                        value={formData.studentNumber}
                        onChange={handleChange}
                        required={formData.role === 'student'}
                      />
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-success w-100 py-2 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Sign in here
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

export default Register;