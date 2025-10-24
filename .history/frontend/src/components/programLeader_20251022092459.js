import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import {
  reportService,
  facultyReportService,
  lectureReportService,
  classService,
  userService,
  courseService,
  ratingService,
  feedbackService,
  monitoringService
} from '../services/authservice';

const ProgramLeaderDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [message, setMessage] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedReportForFeedback, setSelectedReportForFeedback] = useState(null);

  // Rating functionality state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedLecturerForRating, setSelectedLecturerForRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  // Add Course functionality state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    credits: 3,
    facultyId: ''
  });
  const [courseFormLoading, setCourseFormLoading] = useState(false);

  // Add Lecturer functionality state
  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [lecturerFormData, setLecturerFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'lecturer',
    department: ''
  });
  const [lecturerFormLoading, setLecturerFormLoading] = useState(false);

  // Real data states
  const [faculties, setFaculties] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);
  const [facultyReports, setFacultyReports] = useState([]);
  const [lectureReports, setLectureReports] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [monitoringData, setMonitoringData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all required data in parallel
      const [
        reportsResult,
        facultyReportsResult,
        lectureReportsResult,
        classesResult,
        usersResult,
        coursesResult,
        ratingsResult,
        feedbackResult,
        monitoringResult
      ] = await Promise.all([
        reportService.getAllReports(),
        facultyReportService.getAllFacultyReports(),
        lectureReportService.getAllReports(),
        classService.getAllClasses(),
        userService.getAllUsers(),
        courseService.getAllCourses(),
        ratingService.getAllRatings(),
        feedbackService.getAllFeedback(),
        monitoringService.getStudentMonitoring()
      ]);

      // Process and set data
      if (reportsResult.success) setReports(reportsResult.reports || []);
      if (facultyReportsResult.success) setFacultyReports(facultyReportsResult.reports || []);
      if (lectureReportsResult.success) setLectureReports(lectureReportsResult.reports || []);
      if (classesResult.success) setClasses(classesResult.classes || []);
      if (usersResult.success) {
        const allUsers = usersResult.users || [];
        // Extract lecturers (users with lecturer roles)
        const lecturerUsers = allUsers.filter(u => 
          u.role === 'lecturer' || u.role === 'principal-lecturer'
        );
        setLecturers(lecturerUsers);
        
        // Extract students
        const studentUsers = allUsers.filter(u => u.role === 'student');
        setStudents(studentUsers);
      }
      if (coursesResult.success) setCourses(coursesResult.courses || []);
      if (ratingsResult.success) setRatings(ratingsResult.ratings || []);
      if (feedbackResult.success) setFeedbacks(feedbackResult.feedback || []);
      if (monitoringResult.success) setMonitoringData(monitoringResult.monitoring || []);

      // Generate faculties from courses data
      const uniqueFaculties = [...new Set(coursesResult.courses?.map(course => course.department).filter(Boolean))];
      const facultyData = uniqueFaculties.map((faculty, index) => ({
        id: index + 1,
        name: faculty,
        principal: 'Department Head', // This would come from users table in a real scenario
        email: `${faculty.toLowerCase().replace(/\s+/g, '.')}@luct.ac.za`,
        departments: [faculty],
        performance: 'Good',
        lecturers: lecturers.filter(l => l.department === faculty).length,
        students: classes.filter(c => courses.find(co => co.course_id === c.course_id)?.department === faculty)
          .reduce((acc, cls) => acc + (cls.enrolled_count || 0), 0),
        budget: 1000000, // Default budget
        passRate: Math.floor(Math.random() * 20) + 75 // Mock pass rate
      }));
      setFaculties(facultyData);

      // Generate assignments from classes and lecturers
      const assignmentData = lecturers.slice(0, 3).map((lecturer, index) => ({
        id: index + 1,
        title: `Lecturer - ${lecturer.department || 'General'}`,
        faculty: lecturer.department || 'General',
        status: 'Active',
        startDate: '2024-01-01',
        endDate: '2026-12-31'
      }));
      setAssignments(assignmentData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = () => {
    const totalFaculties = faculties.length;
    const totalLecturers = lecturers.length;
    const totalStudents = students.length;
    const totalBudget = faculties.reduce((acc, fac) => acc + fac.budget, 0);
    const averagePassRate = faculties.length > 0 
      ? Math.round(faculties.reduce((acc, fac) => acc + fac.passRate, 0) / faculties.length)
      : 0;

    return {
      totalFaculties,
      totalLecturers,
      totalStudents,
      totalBudget,
      averagePassRate
    };
  };

  const stats = calculateStats();

  // Handler functions
  const handleSubmitRating = async () => {
    if (!selectedLecturerForRating || !ratingValue) {
      alert('Please select a lecturer and provide a rating.');
      return;
    }

    setRatingLoading(true);
    try {
      const result = await ratingService.submitRating({
        studentId: user.id,
        lecturerName: selectedLecturerForRating.name,
        courseName: 'General', // Program leader rating for general performance
        rating: ratingValue,
        review: ratingReview
      });

      if (result.success) {
        alert(`Rating submitted for ${selectedLecturerForRating.name}`);
        setShowRatingModal(false);
        setSelectedLecturerForRating(null);
        setRatingValue(5);
        setRatingReview('');
        // Reload ratings
        const ratingsResult = await ratingService.getAllRatings();
        if (ratingsResult.success) setRatings(ratingsResult.ratings || []);
      } else {
        alert('Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating. Please try again.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedReportForFeedback || !feedbackText.trim()) {
      alert('Please select a report and provide feedback.');
      return;
    }

    try {
      const result = await feedbackService.createFeedback({
        report_id: selectedReportForFeedback.id,
        reviewer_id: user.id,
        feedback_text: feedbackText,
        priority: 'medium'
      });

      if (result.success) {
        alert('Feedback submitted successfully!');
        setShowFeedbackModal(false);
        setSelectedReportForFeedback(null);
        setFeedbackText('');
        // Reload feedback
        const feedbackResult = await feedbackService.getAllFeedback();
        if (feedbackResult.success) setFeedbacks(feedbackResult.feedback || []);
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  const sendMessageToLecturer = () => {
    if (selectedLecturer && message.trim()) {
      alert(`Message sent to ${selectedLecturer.name}:\n\n${message}`);
      setMessage('');
      setSelectedLecturer(null);
    }
  };

  // Handle Add Course form submission
  const handleSubmitCourse = async () => {
    if (!courseFormData.courseCode || !courseFormData.courseName) {
      alert('Course code and name are required.');
      return;
    }

    setCourseFormLoading(true);
    try {
      const result = await courseService.createCourse({
        courseCode: courseFormData.courseCode,
        courseName: courseFormData.courseName,
        description: courseFormData.description,
        facultyId: courseFormData.facultyId || null,
        credits: courseFormData.credits
      });

      if (result.success) {
        alert('Course created successfully!');
        setShowAddCourseModal(false);
        setCourseFormData({
          courseCode: '',
          courseName: '',
          description: '',
          credits: 3,
          facultyId: ''
        });
        // Reload courses
        const coursesResult = await courseService.getAllCourses();
        if (coursesResult.success) setCourses(coursesResult.courses || []);
      } else {
        alert('Failed to create course. Please try again.');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error creating course. Please try again.');
    } finally {
      setCourseFormLoading(false);
    }
  };

  const PassRatePieChart = ({ passRate }) => {
    const circumference = 2 * Math.PI * 40;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (passRate / 100) * circumference;

    return (
      <div className="pass-rate-chart">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="8"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="8" 
                  strokeDasharray={strokeDasharray} 
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 50 50)"/>
          <text x="50" y="50" textAnchor="middle" dy="7" fontSize="20" fontWeight="bold" fill="#F9FAFB">
            {passRate}%
          </text>
        </svg>
        <div className="chart-label">Pass Rate</div>
      </div>
    );
  };

  const StarRating = ({ rating, onRate, interactive = false }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={() => interactive && onRate(star)}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    const universityPerformance = faculties.map(faculty => ({
      faculty: faculty.name,
      academic: faculty.passRate,
      satisfaction: Math.floor(Math.random() * 15) + 80, // Mock satisfaction
      research: Math.floor(Math.random() * 20) + 75, // Mock research score
      overall: Math.round((faculty.passRate + 80 + 75) / 3) // Average of mock scores
    }));

    const resources = [
      { category: 'Academic Staff', allocated: lecturers.length, used: lecturers.length, budget: lecturers.length * 50000 },
      { category: 'Administrative Staff', allocated: 15, used: 14, budget: 2250000 },
      { category: 'Equipment & Facilities', allocated: 100, used: 85, budget: 5000000 },
      { category: 'Student Support', allocated: 50, used: 45, budget: 1500000 }
    ];

    return { universityPerformance, resources };
  };

  const { universityPerformance, resources } = calculatePerformanceMetrics();

  return (
    <div className="program-leader-dashboard urbn-theme">
      {/* Side Navigation */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <h2>LUCT</h2>
          </div>
          <p>Program Leader</p>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            📚 Courses
          </button>
          <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            📋 Reports
          </button>
          <button className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            📊 Monitoring
          </button>
          <button className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
            🎓 Classes
          </button>
          <button className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`} onClick={() => setActiveTab('lectures')}>
            📝 Lectures
          </button>
          <button className={`nav-item ${activeTab === 'lecture-reports' ? 'active' : ''}`} onClick={() => setActiveTab('lecture-reports')}>
            📋 Lecture Reports
          </button>
          <button className={`nav-item ${activeTab === 'rating' ? 'active' : ''}`} onClick={() => setActiveTab('rating')}>
            ⭐ Rating
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'PL'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'Program Leader'}</span>
              <span className="user-role">Program Leader</span>
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
              {activeTab === 'courses' && 'Course Management'}
              {activeTab === 'reports' && 'Reports & Documents'}
              {activeTab === 'monitoring' && 'Monitoring'}
              {activeTab === 'classes' && 'Class Management'}
              {activeTab === 'lectures' && 'Lectures'}
              {activeTab === 'lecture-reports' && 'Lecture Reports'}
              {activeTab === 'rating' && 'My Ratings & Reviews'}
            </h1>
            <p>Welcome back, {user?.name || 'Program Leader'}</p>
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
                <h2>Course Management</h2>
                <div className="header-actions">
                  <button className="btn-primary" onClick={() => setShowAddCourseModal(true)}>+ Add Course</button>
                  <button className="btn-outline">Export</button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>{courses.length}</h3>
                    <p>Total Courses</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏛️</div>
                  <div className="stat-info">
                    <h3>{faculties.length}</h3>
                    <p>Departments</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-info">
                    <h3>{lecturers.length}</h3>
                    <p>Lecturers</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-info">
                    <h3>
                      {ratings.length > 0 
                        ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
                        : '0.0'
                      }
                    </h3>
                    <p>Avg. Rating</p>
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
                {courses.map(course => (
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
                      <button className="btn-sm">View</button>
                      <button className="btn-sm btn-outline">Edit</button>
                    </span>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="no-data">
                    <p>No courses available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Reports & Documents</h2>
                <div className="header-actions">
                  <button className="btn-primary">+ New Report</button>
                  <button className="btn-outline">Generate</button>
                </div>
              </div>

              {/* General Reports Section */}
              <div className="monitoring-section">
                <h3>General Reports</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Title</span>
                    <span>Author</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {reports.map(report => (
                    <div key={report.id} className="list-row">
                      <span className="name-cell">{report.title}</span>
                      <span>{report.author_name}</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      <span>
                        <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                          {report.status || 'Pending'}
                        </span>
                      </span>
                      <span>
                        <button className="btn-sm">View</button>
                        <button 
                          className="btn-sm btn-primary"
                          onClick={() => {
                            setSelectedReportForFeedback(report);
                            setShowFeedbackModal(true);
                          }}
                        >
                          Feedback
                        </button>
                      </span>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="no-data">
                      <p>No general reports available.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Faculty Reports Section */}
              <div className="monitoring-section">
                <h3>Faculty Reports</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Title</span>
                    <span>Author</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {facultyReports.map(report => (
                    <div key={report.id} className="list-row">
                      <span className="name-cell">{report.title}</span>
                      <span>{report.author_name}</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      <span>
                        <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                          {report.status || 'Pending'}
                        </span>
                      </span>
                      <span>
                        <button className="btn-sm">View</button>
                        <button className="btn-sm btn-outline">Download</button>
                      </span>
                    </div>
                  ))}
                  {facultyReports.length === 0 && (
                    <div className="no-data">
                      <p>No faculty reports available.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lecture Reports Section */}
              <div className="monitoring-section">
                <h3>Lecture Reports</h3>
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
                      <span>{new Date(report.date_of_lecture).toLocaleDateString()}</span>
                      <span>
                        {report.actual_students_present}/{report.total_registered_students}
                      </span>
                      <span>
                        <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                          {report.status || 'Pending'}
                        </span>
                      </span>
                      <span>
                        <button className="btn-sm">View</button>
                        <button className="btn-sm btn-outline">Details</button>
                      </span>
                    </div>
                  ))}
                  {lectureReports.length === 0 && (
                    <div className="no-data">
                      <p>No lecture reports available.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>University Monitoring Dashboard</h2>
                <div className="header-actions">
                  <button className="btn-primary">Generate Report</button>
                  <button className="btn-outline">Export Data</button>
                </div>
              </div>

              {/* Key Metrics Overview */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🏛️</div>
                  <div className="stat-info">
                    <h3>{stats.totalFaculties}</h3>
                    <p>Active Faculties</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-info">
                    <h3>{stats.totalLecturers}</h3>
                    <p>Total Lecturers</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{stats.totalStudents}</h3>
                    <p>Enrolled Students</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>{stats.averagePassRate}%</h3>
                    <p>Avg Pass Rate</p>
                  </div>
                </div>
              </div>

              {/* Faculty Performance List */}
              <div className="monitoring-section">
                <h3>Faculty Performance Overview</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Faculty</span>
                    <span>Lecturers</span>
                    <span>Students</span>
                    <span>Pass Rate</span>
                    <span>Performance</span>
                  </div>
                  {faculties.map(faculty => (
                    <div key={faculty.id} className="list-row">
                      <span className="name-cell">{faculty.name}</span>
                      <span>{faculty.lecturers}</span>
                      <span>{faculty.students}</span>
                      <span>{faculty.passRate}%</span>
                      <span>
                        <span className={`performance-badge ${faculty.performance.toLowerCase()}`}>
                          {faculty.performance}
                        </span>
                      </span>
                    </div>
                  ))}
                  {faculties.length === 0 && (
                    <div className="no-data">
                      <p>No faculty data available.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Allocation List */}
              <div className="monitoring-section">
                <h3>Resource Allocation</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Category</span>
                    <span>Allocated</span>
                    <span>Used</span>
                    <span>Utilization</span>
                    <span>Budget</span>
                  </div>
                  {resources.map(resource => (
                    <div key={resource.category} className="list-row">
                      <span className="name-cell">{resource.category}</span>
                      <span>{resource.allocated}</span>
                      <span>{resource.used}</span>
                      <span>
                        <div className="utilization-bar">
                          <div
                            className="utilization-fill"
                            style={{ width: `${(resource.used / resource.allocated) * 100}%` }}
                          ></div>
                          <span>{Math.round((resource.used / resource.allocated) * 100)}%</span>
                        </div>
                      </span>
                      <span>R{resource.budget.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* University Performance List */}
              <div className="monitoring-section">
                <h3>University Performance Metrics</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Faculty</span>
                    <span>Academic Score</span>
                    <span>Satisfaction Score</span>
                    <span>Research Score</span>
                    <span>Overall Rating</span>
                  </div>
                  {universityPerformance.map(perf => (
                    <div key={perf.faculty} className="list-row">
                      <span className="name-cell">{perf.faculty}</span>
                      <span>{perf.academic}%</span>
                      <span>{perf.satisfaction}%</span>
                      <span>{perf.research}%</span>
                      <span>
                        <span className="overall-rating">
                          {perf.overall}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lecturer Performance List */}
              <div className="monitoring-section">
                <h3>Lecturer Performance Summary</h3>
                <div className="list-container">
                  <div className="list-header">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Department</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {lecturers.map(lecturer => (
                    <div key={lecturer.user_id} className="list-row">
                      <span className="name-cell">
                        <div className="avatar-small">
                          {lecturer.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </div>
                        {lecturer.full_name}
                      </span>
                      <span>{lecturer.email}</span>
                      <span>{lecturer.department || 'General'}</span>
                      <span>
                        <span className={`status-badge active`}>
                          Active
                        </span>
                      </span>
                      <span>
                        <button 
                          className="btn-sm"
                          onClick={() => {
                            setSelectedLecturer(lecturer);
                            setMessage('');
                          }}
                        >
                          Message
                        </button>
                        <button 
                          className="btn-sm btn-primary"
                          onClick={() => {
                            setSelectedLecturerForRating(lecturer);
                            setShowRatingModal(true);
                          }}
                        >
                          Rate
                        </button>
                      </span>
                    </div>
                  ))}
                  {lecturers.length === 0 && (
                    <div className="no-data">
                      <p>No lecturers available.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Class Management</h2>
                <div className="header-actions">
                  <button className="btn-primary">+ Add New Class</button>
                  <button className="btn-outline">Export</button>
                </div>
              </div>

              <div className="list-container">
                <div className="list-header">
                  <span>Class Name</span>
                  <span>Course</span>
                  <span>Lecturer</span>
                  <span>Students</span>
                  <span>Schedule</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {classes.map(cls => (
                  <div key={cls.class_id} className="list-row">
                    <span className="name-cell">{cls.class_name}</span>
                    <span>{courses.find(c => c.course_id === cls.course_id)?.course_name || 'N/A'}</span>
                    <span>{cls.lecturer_name}</span>
                    <span>{cls.enrolled_count || 0}/{cls.total_registered_students || 0}</span>
                    <span>{new Date(cls.scheduled_time).toLocaleString()}</span>
                    <span>
                      <span className={`status-badge ${cls.is_active ? 'active' : 'inactive'}`}>
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm">Edit</button>
                      <button className="btn-sm btn-outline">View</button>
                    </span>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="no-data">
                    <p>No classes available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lectures Tab */}
          {activeTab === 'lectures' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Lecturer Management</h2>
                <div className="header-actions">
                  <button className="btn-primary">+ Add Lecturer</button>
                  <button className="btn-outline">Export</button>
                </div>
              </div>

              <div className="list-container">
                <div className="list-header">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Department</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {lecturers.map(lecturer => (
                  <div key={lecturer.user_id} className="list-row">
                    <span className="name-cell">
                      <div className="avatar-small">
                        {lecturer.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                      {lecturer.full_name}
                    </span>
                    <span>{lecturer.email}</span>
                    <span>{lecturer.department || 'General'}</span>
                    <span>
                      <span className="role-tag">{lecturer.role}</span>
                    </span>
                    <span>
                      <span className={`status-badge active`}>
                        Active
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm">Message</button>
                      <button className="btn-sm btn-outline">View</button>
                    </span>
                  </div>
                ))}
                {lecturers.length === 0 && (
                  <div className="no-data">
                    <p>No lecturers available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lecture Reports Tab */}
          {activeTab === 'lecture-reports' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Lecture Reports</h2>
                <div className="header-actions">
                  <button className="btn-outline">Generate</button>
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
                    <span>{new Date(report.date_of_lecture).toLocaleDateString()}</span>
                    <span>
                      {report.actual_students_present}/{report.total_registered_students}
                    </span>
                    <span>
                      <span className={`status-badge ${report.status?.toLowerCase() || 'pending'}`}>
                        {report.status || 'Pending'}
                      </span>
                    </span>
                    <span>
                      <button className="btn-sm">View</button>
                      <button className="btn-sm btn-outline">Download</button>
                    </span>
                  </div>
                ))}
                {lectureReports.length === 0 && (
                  <div className="no-data">
                    <p>No lecture reports available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rating Tab */}
          {activeTab === 'rating' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Ratings & Reviews</h2>
                <div className="header-actions">
                  <button className="btn-primary">Request Feedback</button>
                  <button className="btn-outline">Export</button>
                </div>
              </div>

              <div className="ratings-overview">
                <div className="rating-card">
                  <h3>Overall Rating</h3>
                  <div className="rating-score">
                    {ratings.length > 0 
                      ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
                      : '0.0'
                    }
                  </div>
                  <StarRating 
                    rating={ratings.length > 0 ? Math.round(ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length) : 0} 
                  />
                  <div className="rating-count">Based on {ratings.length} reviews</div>
                </div>
                
                <div className="rating-stats">
                  <div className="stat-item">
                    <span>Teaching Quality</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '90%' }}></div>
                    </div>
                    <span>4.5</span>
                  </div>
                  <div className="stat-item">
                    <span>Leadership</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '88%' }}></div>
                    </div>
                    <span>4.4</span>
                  </div>
                  <div className="stat-item">
                    <span>Responsiveness</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '92%' }}></div>
                    </div>
                    <span>4.6</span>
                  </div>
                </div>
              </div>
              
              <div className="reviews-list">
                <h4>Recent Reviews</h4>
                {ratings.map(rating => (
                  <div key={rating.rating_id} className="review-item">
                    <div className="review-header">
                      <div className="reviewer-info">
                        <div className="avatar-small">
                          {`Student ${rating.student_id}`.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <strong>Student {rating.student_id}</strong>
                          <span>{rating.course_name}</span>
                        </div>
                      </div>
                      <div className="review-rating">
                        <span>{rating.rating}</span>
                        <StarRating rating={rating.rating} />
                      </div>
                    </div>
                    <div className="review-comment">{rating.review || 'No comment provided'}</div>
                    <div className="review-date">{new Date(rating.created_at).toLocaleDateString()}</div>
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
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedLecturerForRating && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Rate {selectedLecturerForRating.full_name}</h3>
              <button className="close-btn" onClick={() => setShowRatingModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="rating-input">
                <label>Your Rating:</label>
                <StarRating rating={ratingValue} onRate={setRatingValue} interactive={true} />
              </div>
              <div className="review-input">
                <label>Your Review (Optional):</label>
                <textarea
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  placeholder="Share your feedback about this lecturer..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowRatingModal(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleSubmitRating}
                disabled={ratingLoading}
              >
                {ratingLoading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedReportForFeedback && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Feedback for Report</h3>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter your feedback for this report..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmitFeedback}>
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {selectedLecturer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Message {selectedLecturer.full_name}</h3>
              <button className="close-btn" onClick={() => setSelectedLecturer(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setSelectedLecturer(null)}>Cancel</button>
              <button className="btn-primary" onClick={sendMessageToLecturer}>
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Course</h3>
              <button className="close-btn" onClick={() => setShowAddCourseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Course Code</label>
                <input
                  type="text"
                  value={courseFormData.courseCode}
                  onChange={(e) => setCourseFormData({...courseFormData, courseCode: e.target.value})}
                  placeholder="Enter course code"
                />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  value={courseFormData.courseName}
                  onChange={(e) => setCourseFormData({...courseFormData, courseName: e.target.value})}
                  placeholder="Enter course name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})}
                  placeholder="Enter course description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Credits</label>
                <input
                  type="number"
                  value={courseFormData.credits}
                  onChange={(e) => setCourseFormData({...courseFormData, credits: parseInt(e.target.value)})}
                  min="1"
                  max="10"
                />
              </div>
              <div className="form-group">
                <label>Faculty ID (Optional)</label>
                <input
                  type="text"
                  value={courseFormData.facultyId}
                  onChange={(e) => setCourseFormData({...courseFormData, facultyId: e.target.value})}
                  placeholder="Enter faculty ID"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAddCourseModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSubmitCourse}
                disabled={courseFormLoading}
              >
                {courseFormLoading ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramLeaderDashboard;