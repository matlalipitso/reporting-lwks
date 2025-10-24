import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import {
  courseService,
  lectureReportService,
  ratingService,
  reportService,
  classService,
  userService,
  monitoringService,
  feedbackService
} from '../services/authservice';

const PrincipalLecturerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // State for API data
  const [courses, setCourses] = useState([]);
  const [lectureReports, setLectureReports] = useState([]);
  const [generalReports, setGeneralReports] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [monitoringData, setMonitoringData] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [feedback, setFeedback] = useState([]);

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(false);

  // Form states
  const [newReport, setNewReport] = useState({
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

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [reportFeedback, setReportFeedback] = useState([]);

  // Fixed data loading function
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all required data with proper error handling
      const requests = [
        courseService.getAllCourses().catch(err => ({ success: false, courses: [], error: err })),
        lectureReportService.getAllReports().catch(err => ({ success: false, reports: [], error: err })),
        reportService.getAllReports().catch(err => ({ success: false, reports: [], error: err })),
        ratingService.getAllRatings().catch(err => ({ success: false, ratings: [], error: err })),
        monitoringService.getStudentMonitoring().catch(err => ({ success: false, monitoring: [], error: err })),
        classService.getAllClasses().catch(err => ({ success: false, classes: [], error: err })),
        userService.getAllUsers().catch(err => ({ success: false, users: [], error: err })),
        feedbackService.getAllFeedback().catch(err => ({ success: false, feedback: [], error: err }))
      ];

      const results = await Promise.all(requests);

      // Process results with fallbacks
      const [
        coursesResult,
        lectureReportsResult,
        generalReportsResult,
        ratingsResult,
        monitoringResult,
        classesResult,
        lecturersResult,
        feedbackResult
      ] = results;

      // Set courses data
      if (coursesResult.success && coursesResult.courses) {
        setCourses(coursesResult.courses);
      } else {
        console.warn('Failed to load courses:', coursesResult.error);
        setCourses([]);
      }

      // Set lecture reports data
      if (lectureReportsResult.success && lectureReportsResult.reports) {
        setLectureReports(lectureReportsResult.reports);
      } else {
        console.warn('Failed to load lecture reports:', lectureReportsResult.error);
        setLectureReports([]);
      }

      // Set general reports data
      if (generalReportsResult.success && generalReportsResult.reports) {
        setGeneralReports(generalReportsResult.reports);
      } else {
        console.warn('Failed to load general reports:', generalReportsResult.error);
        setGeneralReports([]);
      }

      // Set ratings data
      if (ratingsResult.success && ratingsResult.ratings) {
        setRatings(ratingsResult.ratings);
      } else {
        console.warn('Failed to load ratings:', ratingsResult.error);
        setRatings([]);
      }

      // Set monitoring data
      if (monitoringResult.success && monitoringResult.monitoring) {
        setMonitoringData(monitoringResult.monitoring);
      } else {
        console.warn('Failed to load monitoring data:', monitoringResult.error);
        setMonitoringData([]);
      }

      // Set classes data - filter for current principal lecturer
      if (classesResult.success && classesResult.classes) {
        const principalClasses = classesResult.classes.filter(cls =>
          cls.lecturer_id === user?.id
        );
        setClasses(principalClasses);
      } else {
        console.warn('Failed to load classes:', classesResult.error);
        setClasses([]);
      }

      // Set lecturers data
      if (lecturersResult.success && lecturersResult.lecturers) {
        setLecturers(lecturersResult.lecturers);
      } else {
        console.warn('Failed to load lecturers:', lecturersResult.error);
        setLecturers([]);
      }

      // Set feedback data
      if (feedbackResult.success && feedbackResult.feedback) {
        setFeedback(feedbackResult.feedback);
      } else {
        console.warn('Failed to load feedback:', feedbackResult.error);
        setFeedback([]);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      // Set all states to empty arrays on complete failure
      setCourses([]);
      setLectureReports([]);
      setGeneralReports([]);
      setRatings([]);
      setMonitoringData([]);
      setClasses([]);
      setLecturers([]);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name]);

  // Load data on component mount and when activeTab changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, activeTab]);

  // Computed filtered courses
  const filteredCourses = selectedDepartment === 'all'
    ? courses
    : courses.filter(course => course.department === selectedDepartment);

  // Get unique departments for filter dropdown
  const departments = ['all', ...new Set(courses.map(course => course.department).filter(Boolean))];

  // Calculate dashboard statistics
  const calculateStats = () => {
    const totalCourses = courses.length;
    const totalLecturers = lecturers.length;
    const totalStudents = classes.reduce((acc, cls) => acc + (parseInt(cls.total_registered_students) || 0), 0);
    
    // Calculate average rating from ratings data
    const validRatings = ratings.filter(rating => rating.rating && !isNaN(rating.rating));
    const averageRating = validRatings.length > 0 
      ? (validRatings.reduce((sum, rating) => sum + parseFloat(rating.rating), 0) / validRatings.length).toFixed(1)
      : '0.0';

    return {
      totalCourses,
      totalLecturers,
      totalStudents,
      averageRating
    };
  };

  const stats = calculateStats();

  const handleSubmitNewReport = async () => {
    // Validate required fields
    const requiredFields = [
      'faculty_name', 'class_name', 'week_of_reporting', 'date_of_lecture',
      'course_name', 'course_code', 'lecturer_name', 'actual_students_present',
      'total_registered_students', 'venue', 'scheduled_time', 'topic_taught', 'learning_outcomes'
    ];

    const missingFields = requiredFields.filter(field => !newReport[field]?.trim());

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate numeric fields
    if (isNaN(newReport.actual_students_present) || isNaN(newReport.total_registered_students)) {
      alert('Student counts must be valid numbers');
      return;
    }

    try {
      const result = await lectureReportService.createReport({
        ...newReport,
        actual_students_present: parseInt(newReport.actual_students_present),
        total_registered_students: parseInt(newReport.total_registered_students),
        lecturer_name: user?.name || 'Principal Lecturer',
        lecturer_id: user?.id,
        status: 'submitted'
      });

      if (result.success) {
        setNewReport({
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
        setShowReportModal(false);
        alert('Lecture report created successfully!');
        // Reload reports to show the new report
        loadDashboardData();
      } else {
        alert('Failed to create lecture report. Please try again.');
      }
    } catch (error) {
      console.error('Error creating lecture report:', error);
      alert('Error creating lecture report. Please try again.');
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleAddFeedback = async (reportId, feedbackText, priority = 'medium') => {
    try {
      const result = await feedbackService.createFeedback({
        report_id: reportId,
        reviewer_id: user?.id,
        reviewer_name: user?.name,
        feedback_text: feedbackText,
        priority: priority,
        status: 'submitted'
      });

      if (result.success) {
        alert('Feedback submitted successfully!');
        setSelectedFeedback(null);
        setShowFeedbackModal(false);
        loadDashboardData();
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  const handleReviewReport = (report) => {
    setSelectedFeedback(report);
    setShowFeedbackModal(true);
  };

  const StarRating = ({ rating }) => {
    const numericRating = parseFloat(rating) || 0;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= numericRating ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Calculate rating statistics
  const calculateRatingStats = () => {
    if (ratings.length === 0) return { overall: 0, teaching: 0, communication: 0, support: 0 };

    const validRatings = ratings.filter(r => r.rating && !isNaN(r.rating));
    const teachingRatings = validRatings.filter(r => r.review?.includes('teach') || r.review?.includes('explain'));
    const communicationRatings = validRatings.filter(r => r.review?.includes('communicat') || r.review?.includes('clear'));
    const supportRatings = validRatings.filter(r => r.review?.includes('support') || r.review?.includes('help'));

    return {
      overall: validRatings.length > 0 ? (validRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / validRatings.length).toFixed(1) : 0,
      teaching: teachingRatings.length > 0 ? (teachingRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / teachingRatings.length).toFixed(1) : 0,
      communication: communicationRatings.length > 0 ? (communicationRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / communicationRatings.length).toFixed(1) : 0,
      support: supportRatings.length > 0 ? (supportRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / supportRatings.length).toFixed(1) : 0
    };
  };

  const ratingStats = calculateRatingStats();

  // Dashboard Overview Tab
  const DashboardOverview = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>Dashboard Overview</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={loadDashboardData}>
            Refresh Data
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{stats.totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-info">
            <h3>{stats.totalLecturers}</h3>
            <p>Assigned Lecturers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>{stats.averageRating}</h3>
            <p>Avg. Course Rating</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{lectureReports.length}</h3>
            <p>Lecture Reports</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-info">
            <h3>{classes.length}</h3>
            <p>My Classes</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>Recent Reports</h3>
          <div className="recent-list">
            {lectureReports.slice(0, 5).map(report => (
              <div key={report.id} className="recent-item">
                <div className="recent-info">
                  <strong>{report.course_name}</strong>
                  <span>{report.lecturer_name} • {report.date_of_lecture}</span>
                </div>
                <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                  {report.status || 'Pending'}
                </span>
              </div>
            ))}
            {lectureReports.length === 0 && (
              <p className="no-data">No recent reports</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h3>Upcoming Classes</h3>
          <div className="recent-list">
            {classes
              .filter(cls => new Date(cls.scheduled_time) > new Date())
              .slice(0, 5)
              .map(cls => (
                <div key={cls.class_id} className="recent-item">
                  <div className="recent-info">
                    <strong>{cls.class_name}</strong>
                    <span>{new Date(cls.scheduled_time).toLocaleString()} • {cls.venue}</span>
                  </div>
                  <span className="status-badge active">Upcoming</span>
                </div>
              ))}
            {classes.filter(cls => new Date(cls.scheduled_time) > new Date()).length === 0 && (
              <p className="no-data">No upcoming classes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="program-leader-dashboard urbn-theme">
      {/* Side Navigation */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <h2>LUCT</h2>
          </div>
          <p>Principal Lecturer</p>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            📚 Courses
          </button>
          <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            📋 Reports
          </button>
          <button className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            👁️ Monitoring
          </button>
          <button className={`nav-item ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => setActiveTab('ratings')}>
            ⭐ Ratings
          </button>
          <button className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
            🎓 My Classes
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'PRL'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'Principal Lecturer'}</span>
              <span className="user-role">Principal Lecturer</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="content-header">
          <div className="header-title">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'courses' && 'Courses & Lectures'}
              {activeTab === 'reports' && 'Lecture Reports & Feedback'}
              {activeTab === 'monitoring' && 'Monitoring Dashboard'}
              {activeTab === 'ratings' && 'Ratings & Reviews'}
              {activeTab === 'classes' && 'My Classes'}
            </h1>
            <p>Welcome back, {user?.name || 'Principal Lecturer'}</p>
          </div>
          <div className="header-actions">
            <button className="notification-bell">🔔</button>
            <div className="current-time">{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {loading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading dashboard data...</p>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && <DashboardOverview />}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Courses Under My Stream</h2>
                <div className="header-actions">
                  <div className="filter-group">
                    <label>Filter by Department:</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="filter-select"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept === 'all' ? 'All Departments' : dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary" onClick={loadDashboardData}>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>{stats.totalCourses}</h3>
                    <p>Total Courses</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-info">
                    <h3>{stats.totalLecturers}</h3>
                    <p>Assigned Lecturers</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{stats.totalStudents}</h3>
                    <p>Total Students</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-info">
                    <h3>{stats.averageRating}</h3>
                    <p>Avg. Course Rating</p>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Department</th>
                      <th>Lecturer</th>
                      <th>Credits</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map(course => (
                      <tr key={course.course_id}>
                        <td>{course.course_code}</td>
                        <td>
                          <strong>{course.course_name}</strong>
                          {course.description && (
                            <div className="course-description">{course.description}</div>
                          )}
                        </td>
                        <td>{course.department || 'General'}</td>
                        <td>{course.lecturer_name || 'Not Assigned'}</td>
                        <td>{course.credits || 3}</td>
                        <td>
                          <span className={`status-badge ${course.is_active ? 'active' : 'inactive'}`}>
                            {course.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-sm">View Details</button>
                        </td>
                      </tr>
                    ))}
                    {filteredCourses.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">
                          <p>No courses found for the selected department.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Lecture Reports & Feedback</h2>
                <div className="header-actions">
                  <button className="btn-primary" onClick={() => setShowReportModal(true)}>+ New Report</button>
                  <button className="btn-outline" onClick={loadDashboardData}>Refresh</button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <h3>{lectureReports.length + generalReports.length}</h3>
                    <p>Total Reports</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-info">
                    <h3>{new Set(lectureReports.map(r => r.lecturer_name)).size}</h3>
                    <p>Lecturers</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>{new Set(lectureReports.map(r => r.course_name)).size}</h3>
                    <p>Courses</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{lectureReports.reduce((acc, r) => acc + (parseInt(r.actual_students_present) || 0), 0)}</h3>
                    <p>Total Attendance</p>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Report Title</th>
                      <th>Type</th>
                      <th>Lecturer</th>
                      <th>Course</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...lectureReports, ...generalReports].map((report, index) => (
                      <tr key={report.id || `report-${index}`}>
                        <td>
                          {report.course_name ? `${report.course_name} (${report.course_code})` : report.title}
                        </td>
                        <td>
                          <span className={`type-badge ${report.course_name ? 'lecture' : 'general'}`}>
                            {report.course_name ? 'Lecture' : 'General'}
                          </span>
                        </td>
                        <td>{report.lecturer_name || report.author_name}</td>
                        <td>{report.course_name || 'N/A'}</td>
                        <td>{report.date_of_lecture || report.created_at}</td>
                        <td>
                          <span className={`status-badge ${report.status?.toLowerCase() || 'submitted'}`}>
                            {report.status || 'Submitted'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-sm" onClick={() => handleViewReport(report)}>View</button>
                          {report.status === 'pending' && (
                            <button className="btn-sm btn-primary" onClick={() => handleReviewReport(report)}>
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {lectureReports.length === 0 && generalReports.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">
                          <p>No reports available.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modals remain the same as in your original code */}
              {showReportModal && (
                <div className="modal-overlay">
                  <div className="modal-content large-modal">
                    <div className="modal-header">
                      <h3>Create New Lecture Report</h3>
                      <button
                        className="close-btn"
                        onClick={() => setShowReportModal(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-grid">
                        {/* Form fields remain the same */}
                        <div className="form-group">
                          <label>Faculty Name *</label>
                          <input
                            type="text"
                            value={newReport.faculty_name}
                            onChange={(e) => setNewReport(prev => ({ ...prev, faculty_name: e.target.value }))}
                            placeholder="Enter faculty name"
                          />
                        </div>
                        {/* ... other form fields ... */}
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button
                        className="btn-outline"
                        onClick={() => setShowReportModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleSubmitNewReport}
                      >
                        Create Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Report Modal */}
              {showViewModal && selectedReport && (
                <div className="modal-overlay">
                  <div className="modal-content large-modal">
                    <div className="modal-header">
                      <h3>View Lecture Report</h3>
                      <button
                        className="close-btn"
                        onClick={() => setShowViewModal(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="report-details">
                        <div className="detail-row">
                          <strong>Faculty Name:</strong> {selectedReport.faculty_name}
                        </div>
                        {/* ... other report details ... */}
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button
                        className="btn-outline"
                        onClick={() => setShowViewModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Modal */}
              {showFeedbackModal && selectedFeedback && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Add Feedback for Report</h3>
                      <button
                        className="close-btn"
                        onClick={() => setShowFeedbackModal(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Feedback</label>
                        <textarea
                          placeholder="Enter your feedback for this report..."
                          rows="4"
                          id="feedbackText"
                        />
                      </div>
                      <div className="form-group">
                        <label>Priority</label>
                        <select id="feedbackPriority">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button
                        className="btn-outline"
                        onClick={() => setShowFeedbackModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          const feedbackText = document.getElementById('feedbackText').value;
                          const priority = document.getElementById('feedbackPriority').value;
                          if (feedbackText.trim()) {
                            handleAddFeedback(selectedFeedback.id, feedbackText, priority);
                          } else {
                            alert('Please enter feedback text.');
                          }
                        }}
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Monitoring Dashboard</h2>
                <div className="header-actions">
                  <button className="btn-primary" onClick={loadDashboardData}>Refresh</button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👁️</div>
                  <div className="stat-info">
                    <h3>{lectureReports.length}</h3>
                    <p>Lecture Reports</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>
                      {lectureReports.length > 0
                        ? Math.round(lectureReports.reduce((sum, report) => {
                            const present = parseInt(report.actual_students_present) || 0;
                            const total = parseInt(report.total_registered_students) || 1;
                            return sum + (present / total * 100);
                          }, 0) / lectureReports.length)
                        : 0}%
                    </h3>
                    <p>Avg. Attendance</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-info">
                    <h3>
                      {lectureReports.filter(report => report.status === 'approved').length}
                    </h3>
                    <p>Approved Reports</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <h3>{stats.averageRating}</h3>
                    <p>Avg. Rating</p>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Lecturer</th>
                      <th>Date</th>
                      <th>Attendance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectureReports.map(report => (
                      <tr key={report.id}>
                        <td>{report.course_name}</td>
                        <td>{report.lecturer_name}</td>
                        <td>{report.date_of_lecture}</td>
                        <td>
                          <div className="attendance-rate">
                            {Math.round(((parseInt(report.actual_students_present) || 0) / (parseInt(report.total_registered_students) || 1)) * 100)}%
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                            {report.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-sm" onClick={() => handleViewReport(report)}>View</button>
                          {report.status === 'pending' && (
                            <button className="btn-sm btn-primary" onClick={() => handleReviewReport(report)}>
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {lectureReports.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">
                          <p>No lecture reports available for monitoring.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ratings Tab */}
          {activeTab === 'ratings' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Ratings & Reviews</h2>
                <div className="header-actions">
                  <button className="btn-primary" onClick={loadDashboardData}>Refresh</button>
                </div>
              </div>

              <div className="ratings-overview">
                <div className="rating-card">
                  <h3>Overall Rating</h3>
                  <div className="rating-score">{ratingStats.overall}</div>
                  <StarRating rating={parseFloat(ratingStats.overall)} />
                  <div className="rating-count">Based on {ratings.length} reviews</div>
                </div>
                
                <div className="rating-stats">
                  <div className="stat-item">
                    <span>Teaching Quality</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${(parseFloat(ratingStats.teaching) / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.teaching}</span>
                  </div>
                  <div className="stat-item">
                    <span>Communication</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${(parseFloat(ratingStats.communication) / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.communication}</span>
                  </div>
                  <div className="stat-item">
                    <span>Support</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${(parseFloat(ratingStats.support) / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.support}</span>
                  </div>
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map(rating => (
                      <tr key={rating.rating_id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-small me-2">
                              {`Student ${rating.student_id}`.split(' ').map(n => n[0]).join('')}
                            </div>
                            Student {rating.student_id}
                          </div>
                        </td>
                        <td>{rating.course_name}</td>
                        <td>
                          <div className="performance-score">{rating.rating}</div>
                        </td>
                        <td className="comment-preview">{rating.review || 'No comment'}</td>
                        <td>{new Date(rating.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn-sm">View Full</button>
                        </td>
                      </tr>
                    ))}
                    {ratings.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">
                          <p>No ratings available.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>My Classes</h2>
                <div className="header-actions">
                  <button className="btn-primary" onClick={loadDashboardData}>Refresh</button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-info">
                    <h3>{classes.length}</h3>
                    <p>Total Classes</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{classes.reduce((acc, cls) => acc + (parseInt(cls.enrolled_count) || 0), 0)}</h3>
                    <p>Total Students</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-info">
                    <h3>{classes.filter(cls => cls.is_active).length}</h3>
                    <p>Active Classes</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-info">
                    <h3>{stats.averageRating}</h3>
                    <p>Avg. Class Rating</p>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Course</th>
                      <th>Students</th>
                      <th>Schedule</th>
                      <th>Venue</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => (
                      <tr key={cls.class_id}>
                        <td>
                          <strong>{cls.class_name}</strong>
                        </td>
                        <td>{courses.find(c => c.course_id === cls.course_id)?.course_name || 'N/A'}</td>
                        <td>{cls.enrolled_count || 0}/{cls.total_registered_students || 0}</td>
                        <td>{cls.scheduled_time ? new Date(cls.scheduled_time).toLocaleString() : 'Not scheduled'}</td>
                        <td>{cls.venue || 'Not specified'}</td>
                        <td>
                          <span className={`status-badge ${cls.is_active ? 'active' : 'inactive'}`}>
                            {cls.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-sm">View</button>
                          <button className="btn-sm btn-primary">Manage</button>
                        </td>
                      </tr>
                    ))}
                    {classes.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">
                          <p>No classes assigned to you.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="upcoming-events mt-4">
                <h3>Upcoming Classes</h3>
                <div className="events-grid">
                  {classes
                    .filter(cls => cls.scheduled_time && new Date(cls.scheduled_time) > new Date())
                    .slice(0, 3)
                    .map(cls => (
                      <div key={cls.class_id} className="event-card">
                        <div className="event-date">
                          {new Date(cls.scheduled_time).getDate()}
                        </div>
                        <div className="event-details">
                          <strong>{cls.class_name}</strong>
                          <p>
                            {new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {cls.venue}
                          </p>
                        </div>
                      </div>
                    ))}
                  {classes.filter(cls => cls.scheduled_time && new Date(cls.scheduled_time) > new Date()).length === 0 && (
                    <p className="no-events">No upcoming classes scheduled.</p>
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

export default PrincipalLecturerDashboard;