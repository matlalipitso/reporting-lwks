import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Dashboard from './components/lecturer';
import PrincipalLecturerDashboard from './components/principalLecturer';
import ProgramLeaderDashboard from './components/programLeader';
import StudentDashboard from './components/student';
import Login from './components/login';
import Register from './components/register';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';

function AppContent() {
  const { isDarkTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Check authentication status
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    // Additional validation to ensure token and user are valid
    if (!token || !user) {
      return false;
    }
    
    try {
      const userObj = JSON.parse(user);
      // Check if user object has required properties
      return !!(userObj && userObj.role);
    } catch (error) {
      // If parsing fails, clear invalid data and return false
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  };

  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr).role : null;
    } catch (error) {
      return null;
    }
  };

  const getRoleSpecificDashboardPath = () => {
    const role = getUserRole();
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

  const getUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : {};
    } catch (error) {
      return {};
    }
  };

  return (
    <div className={`app-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      <Routes>
        {/* Public routes - redirect to dashboard if already authenticated */}
        <Route
          path="/login"
          element={
            isAuthenticated() ? 
            <Navigate to={getRoleSpecificDashboardPath()} replace /> : 
            <Login />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated() ? 
            <Navigate to={getRoleSpecificDashboardPath()} replace /> : 
            <Register />
          }
        />

        {/* Role-specific dashboard routes */}
        <Route
          path="/lecturer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <Dashboard 
                user={getUserData()} 
                onLogout={handleLogout} 
                isDarkTheme={isDarkTheme} 
                toggleTheme={toggleTheme} 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard 
                user={getUserData()} 
                onLogout={handleLogout} 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal-lecturer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['principal-lecturer']}>
              <PrincipalLecturerDashboard 
                user={getUserData()} 
                onLogout={handleLogout} 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project-manager-dashboard"
          element={
            <ProtectedRoute allowedRoles={['project-manager']}>
              <ProgramLeaderDashboard 
                user={getUserData()} 
                onLogout={handleLogout} 
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />
        
        {/* Root path - redirect to dashboard if authenticated, otherwise to login */}
        <Route
          path="/"
          element={
            isAuthenticated() ?
            <Navigate to={getRoleSpecificDashboardPath()} replace /> :
            <Navigate to="/login" replace />
          }
        />
        
        {/* Catch all route - redirect to login */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;