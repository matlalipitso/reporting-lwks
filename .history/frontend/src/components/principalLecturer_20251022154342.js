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
  // eslint-disable-next-line no-unused-vars
  const [monitoringData, setMonitoringData] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [lecturers, setLecturers] = useState([]);
  // eslint-disable-next-line no-unused-vars
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

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all required data in parallel
      const [
        coursesResult,
        lectureReportsResult,
        generalReportsResult,
        ratingsResult,
        monitoringResult,
        classesResult,
        lecturersResult,
        feedbackResult
      ] = await Promise.all([
        courseService.getAllCourses(),
        lectureReportService.getAllReports(),
        reportService.getAllReports(),
        ratingService.getAllRatings(),
        monitoringService.getStudentMonitoring(),
        classService.getAllClasses(),
        userService.getLecturers(),
        feedbackService.getAllFeedback()
      ]);

      if (coursesResult.success) setCourses(coursesResult.courses || []);
      if (lectureReportsResult.success) {
        // Filter lecture reports to only show those made by lecturers
        const lecturerNames = lecturersResult.success ? lecturersResult.lecturers.map(l => l.full_name) : [];
        const lecturerLectureReports = lectureReportsResult.reports.filter(report =>
          lecturerNames.includes(report.lecturer_name)
        );
        setLectureReports(lecturerLectureReports || []);
      }
      if (generalReportsResult.success) {
        // Filter general reports to only show those made by lecturers
        const lecturerNames = lecturersResult.success ? lecturersResult.lecturers.map(l => l.full_name) : [];
        const lecturerReports = generalReportsResult.reports.filter(report =>
          lecturerNames.includes(report.author_name)
        );
        setGeneralReports(lecturerReports || []);
      }
      if (ratingsResult.success) setRatings(ratingsResult.ratings || []);
      if (monitoringResult.success) setMonitoringData(monitoringResult.monitoring || []);
      if (classesResult.success) {
        // Filter classes for current principal lecturer
        const principalClasses = classesResult.classes.filter(cls =>
          cls.lecturer_id === user.id || cls.lecturer_name === user.name
        );
        setClasses(principalClasses);
      }
      if (lecturersResult.success) setLecturers(lecturersResult.lecturers || []);
      if (feedbackResult.success) setFeedback(feedbackResult.feedback || []);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.name]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Computed filtered courses
  const filteredCourses = selectedDepartment === 'all'
    ? courses
    : courses.filter(course => course.department === selectedDepartment);

  // Get unique departments for filter dropdown
  const departments = ['all', ...new Set(courses.map(course => course.department).filter(Boolean))];

  // Calculate dashboard statistics
  const calculateStats = () => {
    const totalCourses = courses.length;
    const totalLecturers = new Set(courses.flatMap(course => course.lecturer_id ? [course.lecturer_id] : [])).size;
    const totalStudents = classes.reduce((acc, cls) => acc + (cls.total_registered_students || 0), 0);
    
    // Calculate average rating from ratings data
    const averageRating = ratings.length > 0 
      ? (ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length).toFixed(1)
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
        lecturer_name: user.name // Set current user as lecturer
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
        reviewer_id: user.id,
        feedback_text: feedbackText,
        priority: priority
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
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
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

    const teachingRatings = ratings.filter(r => r.review?.includes('teach') || r.review?.includes('explain'));
    const communicationRatings = ratings.filter(r => r.review?.includes('communicat') || r.review?.includes('clear'));
    const supportRatings = ratings.filter(r => r.review?.includes('support') || r.review?.includes('help'));

    return {
      overall: (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1),
      teaching: teachingRatings.length > 0 ? (teachingRatings.reduce((sum, r) => sum + r.rating, 0) / teachingRatings.length).toFixed(1) : 0,
      communication: communicationRatings.length > 0 ? (communicationRatings.reduce((sum, r) => sum + r.rating, 0) / communicationRatings.length).toFixed(1) : 0,
      support: supportRatings.length > 0 ? (supportRatings.reduce((sum, r) => sum + r.rating, 0) / supportRatings.length).toFixed(1) : 0
    };
  };

  const ratingStats = calculateRatingStats();

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
                  <button className="btn-primary">Generate Report</button>
                  <button className="btn-outline">Export</button>
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

              <div className="list-container">
                <div className="list-header">
                  <span>Course Code</span>
                  <span>Course Name</span>
                  <span>Department</span>
                  <span>Credits</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {filteredCourses.map(course => (
                  <div key={course.course_id} className="list-row">
                    <span className="name-cell">{course.course_code}</span>
                    <span>
                      <strong>{course.course_name}</strong>
                      <div className="course-description">{course.description}</div>
                    </span>
                    <span>{course.department || 'General'}</span>
                    <span>{course.credits || 3}</span>
                    <span>
                      <span className={`status-badge ${course.is_active ? 'active' : 'inactive'}`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm">View Details</button>
                      <button className="btn-sm btn-outline">Manage</button>
                    </span>
                  </div>
                ))}
                {filteredCourses.length === 0 && (
                  <div className="no-data">
                    <p>No courses found for the selected department.</p>
                  </div>
                )}
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
                  <button className="btn-outline">Filter</button>
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
                    <h3>{lectureReports.reduce((acc, r) => acc + (r.actual_students_present || 0), 0)}</h3>
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
                    {[...lectureReports, ...generalReports].map(report => (
                      <tr key={report.id}>
                        <td className="name-cell">
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
                  </tbody>
                </table>
                {lectureReports.length === 0 && generalReports.length === 0 && (
                  <div className="no-data">
                    <p>No reports available.</p>
                  </div>
                )}
              </div>

              {/* New Report Modal */}
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
                        <div className="form-group">
                          <label>Faculty Name *</label>
                          <input
                            type="text"
                            value={newReport.faculty_name}
                            onChange={(e) => setNewReport(prev => ({ ...prev, faculty_name: e.target.value }))}
                            placeholder="Enter faculty name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Class Name *</label>
                          <input
                            type="text"
                            value={newReport.class_name}
                            onChange={(e) => setNewReport(prev => ({ ...prev, class_name: e.target.value }))}
                            placeholder="Enter class name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Week of Reporting *</label>
                          <input
                            type="text"
                            value={newReport.week_of_reporting}
                            onChange={(e) => setNewReport(prev => ({ ...prev, week_of_reporting: e.target.value }))}
                            placeholder="e.g., Week 1, Week 2"
                          />
                        </div>
                        <div className="form-group">
                          <label>Date of Lecture *</label>
                          <input
                            type="date"
                            value={newReport.date_of_lecture}
                            onChange={(e) => setNewReport(prev => ({ ...prev, date_of_lecture: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Course Name *</label>
                          <input
                            type="text"
                            value={newReport.course_name}
                            onChange={(e) => setNewReport(prev => ({ ...prev, course_name: e.target.value }))}
                            placeholder="Enter course name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Course Code *</label>
                          <input
                            type="text"
                            value={newReport.course_code}
                            onChange={(e) => setNewReport(prev => ({ ...prev, course_code: e.target.value }))}
                            placeholder="Enter course code"
                          />
                        </div>
                        <div className="form-group">
                          <label>Lecturer Name *</label>
                          <input
                            type="text"
                            value={newReport.lecturer_name}
                            onChange={(e) => setNewReport(prev => ({ ...prev, lecturer_name: e.target.value }))}
                            placeholder="Enter lecturer name"
                            disabled
                          />
                        </div>
                        <div className="form-group">
                          <label>Actual Students Present *</label>
                          <input
                            type="number"
                            value={newReport.actual_students_present}
                            onChange={(e) => setNewReport(prev => ({ ...prev, actual_students_present: e.target.value }))}
                            placeholder="Enter number of students present"
                          />
                        </div>
                        <div className="form-group">
                          <label>Total Registered Students *</label>
                          <input
                            type="number"
                            value={newReport.total_registered_students}
                            onChange={(e) => setNewReport(prev => ({ ...prev, total_registered_students: e.target.value }))}
                            placeholder="Enter total registered students"
                          />
                        </div>
                        <div className="form-group">
                          <label>Venue *</label>
                          <input
                            type="text"
                            value={newReport.venue}
                            onChange={(e) => setNewReport(prev => ({ ...prev, venue: e.target.value }))}
                            placeholder="Enter venue/location"
                          />
                        </div>
                        <div className="form-group">
                          <label>Scheduled Time *</label>
                          <input
                            type="text"
                            value={newReport.scheduled_time}
                            onChange={(e) => setNewReport(prev => ({ ...prev, scheduled_time: e.target.value }))}
                            placeholder="e.g., 09:00-11:00"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Topic Taught *</label>
                          <textarea
                            value={newReport.topic_taught}
                            onChange={(e) => setNewReport(prev => ({ ...prev, topic_taught: e.target.value }))}
                            placeholder="Enter the topic taught in the lecture"
                            rows="3"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Learning Outcomes *</label>
                          <textarea
                            value={newReport.learning_outcomes}
                            onChange={(e) => setNewReport(prev => ({ ...prev, learning_outcomes: e.target.value }))}
                            placeholder="Describe the learning outcomes achieved"
                            rows="3"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Recommendations</label>
                          <textarea
                            value={newReport.recommendations}
                            onChange={(e) => setNewReport(prev => ({ ...prev, recommendations: e.target.value }))}
                            placeholder="Any recommendations or observations (optional)"
                            rows="3"
                          />
                        </div>
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
                        <div className="detail-row">
                          <strong>Class Name:</strong> {selectedReport.class_name}
                        </div>
                        <div className="detail-row">
                          <strong>Week of Reporting:</strong> {selectedReport.week_of_reporting}
                        </div>
                        <div className="detail-row">
                          <strong>Date of Lecture:</strong> {selectedReport.date_of_lecture}
                        </div>
                        <div className="detail-row">
                          <strong>Course Name:</strong> {selectedReport.course_name}
                        </div>
                        <div className="detail-row">
                          <strong>Course Code:</strong> {selectedReport.course_code}
                        </div>
                        <div className="detail-row">
                          <strong>Lecturer Name:</strong> {selectedReport.lecturer_name}
                        </div>
                        <div className="detail-row">
                          <strong>Actual Students Present:</strong> {selectedReport.actual_students_present}
                        </div>
                        <div className="detail-row">
                          <strong>Total Registered Students:</strong> {selectedReport.total_registered_students}
                        </div>
                        <div className="detail-row">
                          <strong>Venue:</strong> {selectedReport.venue}
                        </div>
                        <div className="detail-row">
                          <strong>Scheduled Time:</strong> {selectedReport.scheduled_time}
                        </div>
                        <div className="detail-row">
                          <strong>Topic Taught:</strong> {selectedReport.topic_taught}
                        </div>
                        <div className="detail-row">
                          <strong>Learning Outcomes:</strong> {selectedReport.learning_outcomes}
                        </div>
                        {selectedReport.recommendations && (
                          <div className="detail-row">
                            <strong>Recommendations:</strong> {selectedReport.recommendations}
                          </div>
                        )}
                        {selectedReport.status && (
                          <div className="detail-row">
                            <strong>Status:</strong> {selectedReport.status}
                          </div>
                        )}
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
                  <button className="btn-primary">Generate Report</button>
                  <button className="btn-outline">Export Data</button>
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
                        ? Math.round(lectureReports.reduce((sum, report) => 
                            sum + (report.actual_students_present / report.total_registered_students * 100), 0) / lectureReports.length)
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

              <div className="list-container">
                <div className="list-header">
                  <span>Course</span>
                  <span>Lecturer</span>
                  <span>Date</span>
                  <span>Attendance</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {lectureReports.map(report => (
                  <div key={report.id} className="list-row">
                    <span className="name-cell">{report.course_name}</span>
                    <span>{report.lecturer_name}</span>
                    <span>{report.date_of_lecture}</span>
                    <span>
                      <div className="attendance-rate">
                        {Math.round((report.actual_students_present / report.total_registered_students) * 100)}%
                      </div>
                    </span>
                    <span>
                      <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                        {report.status || 'Pending'}
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm" onClick={() => handleViewReport(report)}>View</button>
                      {report.status === 'pending' && (
                        <button className="btn-sm btn-primary" onClick={() => handleReviewReport(report)}>
                          Review
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                {lectureReports.length === 0 && (
                  <div className="no-data">
                    <p>No lecture reports available for monitoring.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ratings Tab */}
          {activeTab === 'ratings' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Ratings & Reviews</h2>
                <div className="header-actions">
                  <button className="btn-primary">Request Reviews</button>
                  <button className="btn-outline">Export</button>
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
                      <div className="stat-fill" style={{ width: `${(ratingStats.teaching / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.teaching}</span>
                  </div>
                  <div className="stat-item">
                    <span>Communication</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${(ratingStats.communication / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.communication}</span>
                  </div>
                  <div className="stat-item">
                    <span>Support</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${(ratingStats.support / 5) * 100}%` }}></div>
                    </div>
                    <span>{ratingStats.support}</span>
                  </div>
                </div>
              </div>
              
              <div className="list-container">
                <div className="list-header">
                  <span>Student</span>
                  <span>Course</span>
                  <span>Rating</span>
                  <span>Comment</span>
                  <span>Date</span>
                  <span>Actions</span>
                </div>
                {ratings.map(rating => (
                  <div key={rating.rating_id} className="list-row">
                    <span className="name-cell">
                      <div className="avatar-small">
                        {`Student ${rating.student_id}`.split(' ').map(n => n[0]).join('')}
                      </div>
                      Student {rating.student_id}
                    </span>
                    <span>{rating.course_name}</span>
                    <span>
                      <div className="performance-score">{rating.rating}</div>
                    </span>
                    <span className="comment-preview">{rating.review || 'No comment'}</span>
                    <span>{new Date(rating.created_at).toLocaleDateString()}</span>
                    <span>
                      <button className="btn-sm">View Full</button>
                    </span>
                  </div>
                ))}
                {ratings.length === 0 && (
                  <div className="no-data">
                    <p>No ratings available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>My Classes</h2>
                <div className="header-actions">
                  <button className="btn-primary">+ New Class</button>
                  <button className="btn-outline">Schedule</button>
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
                    <h3>{classes.reduce((acc, cls) => acc + (cls.enrolled_count || 0), 0)}</h3>
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

              <div className="list-container">
                <div className="list-header">
                  <span>Class Name</span>
                  <span>Course</span>
                  <span>Students</span>
                  <span>Schedule</span>
                  <span>Venue</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {classes.map(cls => (
                  <div key={cls.class_id} className="list-row">
                    <span className="name-cell">
                      <strong>{cls.class_name}</strong>
                    </span>
                    <span>{courses.find(c => c.course_id === cls.course_id)?.course_name || 'N/A'}</span>
                    <span>{cls.enrolled_count || 0}/{cls.total_registered_students || 0}</span>
                    <span>{new Date(cls.scheduled_time).toLocaleString()}</span>
                    <span>{cls.venue}</span>
                    <span>
                      <span className={`status-badge ${cls.is_active ? 'active' : 'inactive'}`}>
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm">View</button>
                      <button className="btn-sm btn-primary">Manage</button>
                    </span>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="no-data">
                    <p>No classes assigned to you.</p>
                  </div>
                )}
              </div>

              <div className="upcoming-events">
                <h3>Upcoming Classes</h3>
                <div className="events-grid">
                  {classes.filter(cls => new Date(cls.scheduled_time) > new Date())
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
                  {classes.filter(cls => new Date(cls.scheduled_time) > new Date()).length === 0 && (
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