import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import {
  courseService,
  lectureReportService,
  ratingService,
  monitoringService,
  reportService,
  classService,
  userService
} from '../services/authservice';

const Dashboard = ({ user, onLogout, isDarkTheme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [lectureReports, setLectureReports] = useState([]);
  const [ratingsData, setRatingsData] = useState({
    overallRating: 0,
    totalRatings: 0,
    recentReviews: [],
    moduleRatings: []
  });
  const [monitoringData, setMonitoringData] = useState({
    attendanceRate: 0,
    assignmentCompletion: 0,
    lowPerformanceStudents: 0,
    upcomingDeadlines: 0
  });

  // Form states
  const [viewingReport, setViewingReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [viewingLectureReport, setViewingLectureReport] = useState(null);
  const [editingLectureReport, setEditingLectureReport] = useState(null);
  const [viewingClass, setViewingClass] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);

  const [principalLecturer, setPrincipalLecturer] = useState(null);

  const [newClass, setNewClass] = useState({
    course_id: '',
    class_name: '',
    lecturer_id: '',
    venue: '',
    scheduled_time: '',
    total_registered_students: ''
  });

  const [editingClass, setEditingClass] = useState(null);

  const [newReport, setNewReport] = useState({
    title: '',
    content: '',
    status: 'pending',
    author_id: '',
    author_name: ''
  });

  const [newLectureReport, setNewLectureReport] = useState({
    faculty_name: '',
    class_name: '',
    week_of_reporting: '',
    date_of_lecture: '',
    course_name: '',
    course_code: '',
    lecturer_name: '',
    actual_students_present: '',
    total_registered_students: '',
    venue: '',
    scheduled_time: '',
    topic_taught: '',
    learning_outcomes: '',
    recommendations: ''
  });

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchModules(),
          fetchPrincipalLecturer(),
          fetchClasses(),
          fetchReports(),
          fetchLectureReports(),
          fetchRatingsData(),
          fetchMonitoringData()
        ]);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user.id]);

  // Fetch data when tabs change
  useEffect(() => {
    if (activeTab === 'monitoring') {
      fetchMonitoringData();
    } else if (activeTab === 'rating') {
      fetchRatingsData();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'lecture-reports') {
      fetchLectureReports();
    } else if (activeTab === 'classes') {
      fetchClasses();
    } else if (activeTab === 'modules') {
      fetchModules();
    }
  }, [activeTab]);

  // API Functions
  const fetchModules = async () => {
    try {
      const response = await courseService.getAllCourses();
      if (response.success) {
        setModules(response.courses || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const fetchPrincipalLecturer = async () => {
    try {
      const response = await userService.getPrincipalLecturer();
      if (response.success) {
        setPrincipalLecturer(response.principalLecturer);
      }
    } catch (error) {
      console.error('Error fetching principal lecturer:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      if (response.success) {
        // Filter classes created by the principal lecturer
        const principalLecturerClasses = response.classes.filter(
          cls => principalLecturer && cls.lecturer_id === principalLecturer.user_id
        );
        setClasses(principalLecturerClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await reportService.getAllReports();
      if (response.success) {
        // Filter reports for current author
        const userReports = response.reports.filter(
          report => report.author_id === user.id
        );
        setReports(userReports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchLectureReports = async () => {
    try {
      const response = await lectureReportService.getAllReports();
      if (response.success) {
        // Filter lecture reports for current lecturer
        const userLectureReports = response.reports.filter(
          report => report.lecturer_name === user.name
        );
        setLectureReports(userLectureReports);
      }
    } catch (error) {
      console.error('Error fetching lecture reports:', error);
    }
  };

  const fetchRatingsData = async () => {
    try {
      // Get ratings for this lecturer
      const response = await ratingService.getAllRatings();
      if (response.success) {
        const lecturerRatings = response.ratings.filter(
          rating => rating.lecturer_name === user.name
        );

        const overallRating = lecturerRatings.length > 0 
          ? lecturerRatings.reduce((sum, rating) => sum + rating.rating, 0) / lecturerRatings.length
          : 0;

        // Calculate module ratings
        const moduleRatingsMap = {};
        lecturerRatings.forEach(rating => {
          if (!moduleRatingsMap[rating.course_name]) {
            moduleRatingsMap[rating.course_name] = { total: 0, count: 0 };
          }
          moduleRatingsMap[rating.course_name].total += rating.rating;
          moduleRatingsMap[rating.course_name].count += 1;
        });

        const moduleRatings = Object.keys(moduleRatingsMap).map(courseName => ({
          module: courseName,
          rating: (moduleRatingsMap[courseName].total / moduleRatingsMap[courseName].count).toFixed(1),
          ratingsCount: moduleRatingsMap[courseName].count
        }));

        setRatingsData({
          overallRating: parseFloat(overallRating.toFixed(1)),
          totalRatings: lecturerRatings.length,
          recentReviews: lecturerRatings.slice(0, 10).map(rating => ({
            id: rating.rating_id,
            student: `Student ${rating.student_id}`,
            rating: rating.rating,
            comment: rating.review || 'No comment provided',
            date: new Date(rating.created_at).toLocaleDateString()
          })),
          moduleRatings
        });
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      // Calculate attendance rate from lecture reports
      const recentLectureReports = lectureReports.filter(report => {
        const reportDate = new Date(report.date_of_lecture);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return reportDate >= thirtyDaysAgo;
      });

      const attendanceRate = recentLectureReports.length > 0
        ? recentLectureReports.reduce((sum, report) => {
            const rate = (report.actual_students_present / report.total_registered_students) * 100;
            return sum + rate;
          }, 0) / recentLectureReports.length
        : 0;

      // Mock other monitoring data (you can replace with actual API calls)
      setMonitoringData({
        attendanceRate: Math.round(attendanceRate),
        assignmentCompletion: 75, // This would come from assignments table
        lowPerformanceStudents: Math.floor(Math.random() * 10), // Mock data
        upcomingDeadlines: Math.floor(Math.random() * 5) + 1 // Mock data
      });
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  };

  // Handler Functions
  const handleAddClass = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const classData = {
        ...newClass,
        lecturer_id: user.id,
        total_registered_students: parseInt(newClass.total_registered_students),
        enrolled_count: 0
      };

      const result = await classService.createClass(classData);
      if (result.success) {
        await fetchClasses();
        setNewClass({
          course_id: '',
          class_name: '',
          lecturer_id: '',
          venue: '',
          scheduled_time: '',
          total_registered_students: ''
        });
        setActiveTab('classes');
        alert('Class created successfully!');
      } else {
        alert(`Failed to create class: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Error creating class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setActiveTab('edit-class');
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await classService.updateClass(editingClass.class_id, editingClass);
      if (result.success) {
        await fetchClasses();
        setEditingClass(null);
        setActiveTab('classes');
        alert('Class updated successfully!');
      } else {
        alert(`Failed to update class: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating class:', error);
      alert('Error updating class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      setIsLoading(true);
      try {
        const result = await classService.deleteClass(classId);
        if (result.success) {
          await fetchClasses();
          alert('Class deleted successfully!');
        } else {
          alert(`Failed to delete class: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting class:', error);
        alert('Error deleting class. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const reportData = {
        title: newReport.title,
        content: newReport.content,
        status: newReport.status,
        authorId: user.id,
        authorName: user.name
      };

      const result = await reportService.createReport(reportData);
      if (result.success) {
        await fetchReports();
        setNewReport({
          title: '',
          content: '',
          status: 'pending',
          author_id: '',
          author_name: ''
        });
        setActiveTab('reports');
        alert('Report submitted successfully!');
      } else {
        alert(`Failed to submit report: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLectureReport = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const reportData = {
        facultyName: newLectureReport.faculty_name,
        className: newLectureReport.class_name,
        weekOfReporting: newLectureReport.week_of_reporting,
        dateOfLecture: newLectureReport.date_of_lecture,
        courseName: newLectureReport.course_name,
        courseCode: newLectureReport.course_code,
        lecturerName: user.name,
        actualStudentsPresent: parseInt(newLectureReport.actual_students_present),
        totalRegisteredStudents: parseInt(newLectureReport.total_registered_students),
        venue: newLectureReport.venue,
        scheduledTime: newLectureReport.scheduled_time,
        topicTaught: newLectureReport.topic_taught,
        learningOutcomes: newLectureReport.learning_outcomes,
        recommendations: newLectureReport.recommendations,
        authorId: user.id,
        status: 'pending'
      };

      // Validate that actual students present doesn't exceed total registered
      if (reportData.actualStudentsPresent > reportData.totalRegisteredStudents) {
        alert('Actual students present cannot exceed total registered students.');
        setIsLoading(false);
        return;
      }

      const result = await lectureReportService.createReport(reportData);
      if (result.success) {
        await fetchLectureReports();
        setNewLectureReport({
          faculty_name: '',
          class_name: '',
          week_of_reporting: '',
          date_of_lecture: '',
          course_name: '',
          course_code: '',
          lecturer_name: '',
          actual_students_present: '',
          total_registered_students: '',
          venue: '',
          scheduled_time: '',
          topic_taught: '',
          learning_outcomes: '',
          recommendations: ''
        });
        setActiveTab('lecture-reports');
        alert('Lecture report submitted successfully!');
      } else {
        alert(`Failed to submit lecture report: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting lecture report:', error);
      alert('Error submitting lecture report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setNewReport({
      title: report.title,
      content: report.content,
      author_id: report.author_id,
      author_name: report.author_name
    });
    setActiveTab('new-report');
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setIsLoading(true);
      try {
        const result = await reportService.deleteReport(reportId);
        if (result.success) {
          await fetchReports();
          alert('Report deleted successfully!');
        } else {
          alert(`Failed to delete report: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Error deleting report. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditLectureReport = (report) => {
    setEditingLectureReport(report);
    setNewLectureReport({
      faculty_name: report.faculty_name,
      class_name: report.class_name,
      week_of_reporting: report.week_of_reporting,
      date_of_lecture: report.date_of_lecture,
      course_name: report.course_name,
      course_code: report.course_code,
      lecturer_name: report.lecturer_name,
      actual_students_present: report.actual_students_present,
      total_registered_students: report.total_registered_students,
      venue: report.venue,
      scheduled_time: report.scheduled_time,
      topic_taught: report.topic_taught,
      learning_outcomes: report.learning_outcomes,
      recommendations: report.recommendations
    });
    setActiveTab('new-lecture-report');
  };

  const handleDeleteLectureReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this lecture report?')) {
      setIsLoading(true);
      try {
        const result = await lectureReportService.deleteReport(reportId);
        if (result.success) {
          await fetchLectureReports();
          alert('Lecture report deleted successfully!');
        } else {
          alert(`Failed to delete lecture report: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting lecture report:', error);
        alert('Error deleting lecture report. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Helper Components
  const StarRating = ({ rating, size = 'medium' }) => {
    const sizeClass = size === 'small' ? 'star-small' : size === 'large' ? 'star-large' : 'star-medium';
    
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${sizeClass}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const PerformanceChart = ({ modules }) => {
    return (
      <div className="performance-chart">
        {modules.slice(0, 5).map(module => (
          <div key={module.course_id} className="chart-item">
            <div className="chart-info">
              <span className="module-code">{module.course_code}</span>
              <span className="module-rating">
                {ratingsData.moduleRatings.find(mr => mr.module === module.course_name)?.rating || 'N/A'}/5
              </span>
            </div>
            <div className="chart-bar-container">
              <div 
                className="chart-bar performance"
                style={{ 
                  width: `${((ratingsData.moduleRatings.find(mr => mr.module === module.course_name)?.rating || 0) / 5) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const AttendanceChart = () => {
    // Use actual lecture report data for attendance chart
    const recentReports = lectureReports.slice(0, 6).map((report, index) => ({
      week: `Week ${index + 1}`,
      attendance: Math.round((report.actual_students_present / report.total_registered_students) * 100)
    }));

    const maxAttendance = recentReports.length > 0 ? Math.max(...recentReports.map(d => d.attendance)) : 100;
    
    return (
      <div className="attendance-chart">
        <div className="chart-bars">
          {recentReports.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar"
                style={{ height: `${(item.attendance / maxAttendance) * 100}%` }}
              >
                <span className="bar-value">{item.attendance}%</span>
              </div>
              <span className="bar-label">{item.week}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Calculate dashboard statistics
  const dashboardStats = {
    teachingScore: ratingsData.overallRating,
    activeModules: modules.length,
    totalStudents: classes.reduce((acc, cls) => acc + (cls.total_registered_students || 0), 0),
    attendanceRate: monitoringData.attendanceRate
  };

  return (
    <div className={`lecturer-dashboard urbn-style ${isLoading ? 'loading' : ''}`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <h2>LUCT</h2>
          </div>
          <p>Lecturer Portal</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'modules' ? 'active' : ''}`}
            onClick={() => setActiveTab('modules')}
          >
            📚 My Modules
          </button>
          <button 
            className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            🎓 Classes
          </button>
          <button 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📋 Reports
          </button>
          <button
            className={`nav-item ${activeTab === 'lecture-reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('lecture-reports')}
          >
            📝 Lecture Reports
          </button>
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          <button
            className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            📊 Monitoring
          </button>
          <button
            className={`nav-item ${activeTab === 'rating' ? 'active' : ''}`}
            onClick={() => setActiveTab('rating')}
          >
            ⭐ Rating
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-content">
            <h1>Welcome back, {user.name}!</h1>
            <p>Here's your teaching overview for today</p>
          </div>
          <div className="header-actions">
            <button className="btn-primary">+ New Announcement</button>
            <button className="btn-notification">🔔</button>
            <button className="btn-settings">⚙️</button>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-content animated-fadeIn">
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-content">
                    <h3>Teaching Score</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.teachingScore}</span>
                      <span className="stat-divider">/</span>
                      <span className="stat-total">5.0</span>
                    </div>
                    <div className="stat-trend positive">Based on {ratingsData.totalRatings} ratings</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Active Modules</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.activeModules}</span>
                    </div>
                    <div className="stat-trend">This semester</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Total Students</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.totalStudents}</span>
                    </div>
                    <div className="stat-trend">Across all classes</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Attendance Rate</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.attendanceRate}%</span>
                    </div>
                    <div className="stat-trend">Last 30 days</div>
                  </div>
                </div>
              </div>

              <div className="content-grid">
                <div className="content-card large">
                  <div className="card-header">
                    <h3>📊 Module Performance</h3>
                    <button className="btn-more">Show more →</button>
                  </div>
                  <div className="card-content">
                    <PerformanceChart modules={modules} />
                  </div>
                </div>

                <div className="content-card">
                  <div className="card-header">
                    <h3>⏰ Today's Classes</h3>
                    <span className="card-badge">{classes.filter(cls => {
                      const today = new Date().toDateString();
                      const classDate = new Date(cls.scheduled_time).toDateString();
                      return classDate === today;
                    }).length}</span>
                  </div>
                  <div className="classes-list">
                    {classes.filter(cls => {
                      const today = new Date().toDateString();
                      const classDate = new Date(cls.scheduled_time).toDateString();
                      return classDate === today;
                    }).slice(0, 2).map((classItem, index) => (
                      <div key={classItem.class_id} className="class-item animated-slideIn">
                        <div className="class-time">
                          {new Date(classItem.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="class-details">
                          <h5>{classItem.class_name}</h5>
                          <p>{classItem.venue} • {classItem.enrolled_count || 0} students</p>
                        </div>
                        <button className="btn-action">View</button>
                      </div>
                    ))}
                    {classes.filter(cls => {
                      const today = new Date().toDateString();
                      const classDate = new Date(cls.scheduled_time).toDateString();
                      return classDate === today;
                    }).length === 0 && (
                      <p className="text-muted">No classes scheduled for today</p>
                    )}
                  </div>
                </div>

                <div className="content-card">
                  <div className="card-header">
                    <h3>🚨 Quick Actions</h3>
                  </div>
                  <div className="actions-grid">
                    <button className="action-btn" onClick={() => setActiveTab('new-lecture-report')}>
                      <span className="action-icon">📝</span>
                      <span>Lecture Report</span>
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab('new-report')}>
                      <span className="action-icon">📋</span>
                      <span>Submit Report</span>
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab('classes')}>
                      <span className="action-icon">🎓</span>
                      <span>Manage Classes</span>
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab('rating')}>
                      <span className="action-icon">⭐</span>
                      <span>View Ratings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modules Tab */}
          {activeTab === 'modules' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>📚 My Teaching Modules</h2>
                <p>Manage your courses and track performance</p>
              </div>

              <div className="modules-grid">
                {modules.map(module => {
                  const moduleRating = ratingsData.moduleRatings.find(mr => mr.module === module.course_name);
                  return (
                    <div key={module.course_id} className="module-card animated-slideIn">
                      <div className="module-header">
                        <div className="module-info">
                          <h4>{module.course_name}</h4>
                          <span className="module-code">{module.course_code}</span>
                        </div>
                        <div className="module-rating">
                          <StarRating rating={moduleRating?.rating || 0} size="small" />
                          <span className="rating-text">{moduleRating?.rating || 'N/A'}/5</span>
                        </div>
                      </div>
                      
                      <div className="module-stats">
                        <div className="stat">
                          <span className="value">
                            {classes.filter(cls => cls.course_id === module.course_id).reduce((acc, cls) => acc + (cls.total_registered_students || 0), 0)}
                          </span>
                          <span className="label">Students</span>
                        </div>
                        <div className="stat">
                          <span className="value trend-positive">
                            {moduleRating?.ratingsCount || 0}
                          </span>
                          <span className="label">Ratings</span>
                        </div>
                      </div>

                      <div className="module-actions">
                        <button className="btn-outline">View Students</button>
                        <button className="btn-primary">Manage Content</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>🎓 My Classes</h2>
                <div className="header-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setActiveTab('add-class')}
                  >
                    + New Class
                  </button>
                </div>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <span>Class Name</span>
                  <span>Course</span>
                  <span>Scheduled Time</span>
                  <span>Students</span>
                  <span>Venue</span>
                  <span>Actions</span>
                </div>
                {classes.map((classItem, index) => (
                  <div key={classItem.class_id} className="table-row animated-fadeIn" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span>{classItem.class_name}</span>
                    <span>{modules.find(m => m.course_id === classItem.course_id)?.course_name || 'N/A'}</span>
                    <span>{new Date(classItem.scheduled_time).toLocaleString()}</span>
                    <span>{classItem.enrolled_count || 0}/{classItem.total_registered_students || 0}</span>
                    <span>{classItem.venue}</span>
                    <span>
                      <button 
                        className="btn-sm" 
                        onClick={() => handleEditClass(classItem)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-sm btn-danger" 
                        onClick={() => handleDeleteClass(classItem.class_id)}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Class Tab */}
          {activeTab === 'add-class' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>Add New Class</h2>
                <button className="back-btn" onClick={() => setActiveTab('classes')}>← Back</button>
              </div>
              
              <form onSubmit={handleAddClass} className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Course</label>
                    <select
                      value={newClass.course_id}
                      onChange={(e) => setNewClass({...newClass, course_id: e.target.value})}
                      required
                    >
                      <option value="">Select Course</option>
                      {modules.map(module => (
                        <option key={module.course_id} value={module.course_id}>
                          {module.course_name} ({module.course_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Class Name</label>
                    <input 
                      type="text" 
                      value={newClass.class_name}
                      onChange={(e) => setNewClass({...newClass, class_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Scheduled Time</label>
                    <input 
                      type="datetime-local" 
                      value={newClass.scheduled_time}
                      onChange={(e) => setNewClass({...newClass, scheduled_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Registered Students</label>
                    <input 
                      type="number" 
                      value={newClass.total_registered_students}
                      onChange={(e) => setNewClass({...newClass, total_registered_students: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue</label>
                    <input 
                      type="text" 
                      value={newClass.venue}
                      onChange={(e) => setNewClass({...newClass, venue: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-outline" onClick={() => setActiveTab('classes')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Class Tab */}
          {activeTab === 'edit-class' && editingClass && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>Edit Class</h2>
                <button className="back-btn" onClick={() => setActiveTab('classes')}>← Back</button>
              </div>
              
              <form onSubmit={handleUpdateClass} className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Course</label>
                    <select
                      value={editingClass.course_id}
                      onChange={(e) => setEditingClass({...editingClass, course_id: e.target.value})}
                      required
                    >
                      <option value="">Select Course</option>
                      {modules.map(module => (
                        <option key={module.course_id} value={module.course_id}>
                          {module.course_name} ({module.course_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Class Name</label>
                    <input 
                      type="text" 
                      value={editingClass.class_name}
                      onChange={(e) => setEditingClass({...editingClass, class_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Scheduled Time</label>
                    <input 
                      type="datetime-local" 
                      value={editingClass.scheduled_time}
                      onChange={(e) => setEditingClass({...editingClass, scheduled_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Registered Students</label>
                    <input 
                      type="number" 
                      value={editingClass.total_registered_students}
                      onChange={(e) => setEditingClass({...editingClass, total_registered_students: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue</label>
                    <input 
                      type="text" 
                      value={editingClass.venue}
                      onChange={(e) => setEditingClass({...editingClass, venue: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-outline" onClick={() => setActiveTab('classes')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Class
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>📋 Reports & Submissions</h2>
                <div className="header-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => setActiveTab('new-report')}
                  >
                    + New Report
                  </button>
                </div>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <span>Report Title</span>
                  <span>Author</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {reports.map((report, index) => (
                  <div key={report.id} className="table-row animated-fadeIn" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span>{report.title}</span>
                    <span>{report.author_name}</span>
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span className={`status ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                    <span>
                      <button className="btn-sm" onClick={() => setViewingReport(report)}>View</button>
                      <button className="btn-sm" onClick={() => handleEditReport(report)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteReport(report.id)}>Delete</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Report Tab */}
          {activeTab === 'new-report' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>Submit New Report</h2>
                <button className="back-btn" onClick={() => setActiveTab('reports')}>← Back</button>
              </div>
              
              <form onSubmit={handleSubmitReport} className="form-card">
                <div className="form-group">
                  <label>Report Title</label>
                  <input
                    type="text"
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    rows="6"
                    value={newReport.content}
                    onChange={(e) => setNewReport({...newReport, content: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newReport.status}
                    onChange={(e) => setNewReport({...newReport, status: e.target.value})}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-outline" onClick={() => setActiveTab('reports')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lecture Reports Tab */}
          {activeTab === 'lecture-reports' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>📝 Lecture Reports</h2>
                <div className="header-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setActiveTab('new-lecture-report')}
                  >
                    + New Lecture Report
                  </button>
                </div>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <span>Course</span>
                  <span>Date</span>
                  <span>Attendance</span>
                  <span>Topic</span>
                  <span>Actions</span>
                </div>
                {lectureReports.map((report, index) => (
                  <div key={report.id} className="table-row animated-fadeIn" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span>{report.course_name} ({report.course_code})</span>
                    <span>{new Date(report.date_of_lecture).toLocaleDateString()}</span>
                    <span>{report.actual_students_present}/{report.total_registered_students}</span>
                    <span className="truncate-text">{report.topic_taught.substring(0, 50)}...</span>
                    <span>
                      <button className="btn-sm" onClick={() => setViewingLectureReport(report)}>View</button>
                      <button className="btn-sm" onClick={() => handleEditLectureReport(report)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteLectureReport(report.id)}>Delete</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Lecture Report Tab */}
          {activeTab === 'new-lecture-report' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>Submit New Lecture Report</h2>
                <button className="back-btn" onClick={() => setActiveTab('lecture-reports')}>← Back</button>
              </div>
              
              <form onSubmit={handleSubmitLectureReport} className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Faculty Name</label>
                    <input
                      type="text"
                      value={newLectureReport.faculty_name}
                      onChange={(e) => setNewLectureReport({...newLectureReport, faculty_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Class Name</label>
                    <input
                      type="text"
                      value={newLectureReport.class_name}
                      onChange={(e) => setNewLectureReport({...newLectureReport, class_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Week of Reporting</label>
                    <input
                      type="text"
                      value={newLectureReport.week_of_reporting}
                      onChange={(e) => setNewLectureReport({...newLectureReport, week_of_reporting: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Lecture</label>
                    <input
                      type="date"
                      value={newLectureReport.date_of_lecture}
                      onChange={(e) => setNewLectureReport({...newLectureReport, date_of_lecture: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Course Name</label>
                    <input
                      type="text"
                      value={newLectureReport.course_name}
                      onChange={(e) => setNewLectureReport({...newLectureReport, course_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Course Code</label>
                    <input
                      type="text"
                      value={newLectureReport.course_code}
                      onChange={(e) => setNewLectureReport({...newLectureReport, course_code: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Lecturer Name</label>
                    <input
                      type="text"
                      value={newLectureReport.lecturer_name}
                      onChange={(e) => setNewLectureReport({...newLectureReport, lecturer_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Actual Students Present</label>
                    <input
                      type="number"
                      value={newLectureReport.actual_students_present}
                      onChange={(e) => setNewLectureReport({...newLectureReport, actual_students_present: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Registered Students</label>
                    <input
                      type="number"
                      value={newLectureReport.total_registered_students}
                      onChange={(e) => setNewLectureReport({...newLectureReport, total_registered_students: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue</label>
                    <input
                      type="text"
                      value={newLectureReport.venue}
                      onChange={(e) => setNewLectureReport({...newLectureReport, venue: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Scheduled Time</label>
                    <input
                      type="text"
                      value={newLectureReport.scheduled_time}
                      onChange={(e) => setNewLectureReport({...newLectureReport, scheduled_time: e.target.value})}
                      placeholder="e.g., 09:00-11:00"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Topic Taught</label>
                  <textarea
                    rows="3"
                    value={newLectureReport.topic_taught}
                    onChange={(e) => setNewLectureReport({...newLectureReport, topic_taught: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Learning Outcomes</label>
                  <textarea
                    rows="3"
                    value={newLectureReport.learning_outcomes}
                    onChange={(e) => setNewLectureReport({...newLectureReport, learning_outcomes: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Recommendations</label>
                  <textarea
                    rows="3"
                    value={newLectureReport.recommendations}
                    onChange={(e) => setNewLectureReport({...newLectureReport, recommendations: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-outline" onClick={() => setActiveTab('lecture-reports')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Lecture Report
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>📈 Teaching Analytics</h2>
                <p>Track your teaching performance and student engagement</p>
              </div>

              <div className="analytics-grid">
                <div className="content-card large">
                  <h3>Student Performance Trends</h3>
                  <div className="card-content">
                    <PerformanceChart modules={modules} />
                  </div>
                </div>

                <div className="content-card">
                  <h3>📊 Attendance Overview</h3>
                  <div className="card-content">
                    <AttendanceChart />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>📊 Academic Monitoring</h2>
                <p>Monitor student progress and class performance</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Attendance Rate</h3>
                    <div className="stat-main">
                      <span className="stat-value">{monitoringData.attendanceRate}%</span>
                    </div>
                    <div className="stat-trend">Last 30 days</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Assignment Completion</h3>
                    <div className="stat-main">
                      <span className="stat-value">{monitoringData.assignmentCompletion}%</span>
                    </div>
                    <div className="stat-trend positive">Overall completion</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Low Performance</h3>
                    <div className="stat-main">
                      <span className="stat-value">{monitoringData.lowPerformanceStudents}</span>
                    </div>
                    <div className="stat-trend">Students need help</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Upcoming Deadlines</h3>
                    <div className="stat-main">
                      <span className="stat-value">{monitoringData.upcomingDeadlines}</span>
                    </div>
                    <div className="stat-trend warning">Due this week</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rating Tab */}
          {activeTab === 'rating' && (
            <div className="tab-content animated-fadeIn">
              <div className="content-header">
                <h2>⭐ Student Ratings & Reviews</h2>
                <p>Feedback from your students</p>
              </div>

              <div className="rating-overview">
                <div className="overview-card">
                  <div className="overview-content">
                    <div className="overview-rating">
                      <span className="rating-value">{ratingsData.overallRating}</span>
                      <span className="rating-total">/5.0</span>
                    </div>
                    <StarRating rating={ratingsData.overallRating} size="large" />
                    <span className="rating-count">{ratingsData.totalRatings} total ratings</span>
                  </div>
                </div>

                <div className="reviews-list">
                  <h3>Recent Reviews</h3>
                  {ratingsData.recentReviews.length > 0 ? (
                    ratingsData.recentReviews.map((review, index) => (
                      <div key={review.id} className="review-item animated-slideIn" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="review-header">
                          <div className="reviewer-info">
                            <strong>{review.student}</strong>
                            <span className="review-date">{review.date}</span>
                          </div>
                          <StarRating rating={review.rating} size="small" />
                        </div>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No reviews yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;