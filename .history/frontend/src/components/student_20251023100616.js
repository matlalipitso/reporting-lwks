import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import {
  lecturerService,
  ratingService,
  classService,
  userService,
  courseService,
  monitoringService
} from '../services/authservice';

const StudentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [monitoringData, setMonitoringData] = useState({
    attendanceRate: 0,
    assignmentCompletion: 0,
    studyHours: 0,
    warnings: 0,
    alerts: []
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('rate'); // 'rate' or 'view'
  const [selectedLecturerForView, setSelectedLecturerForView] = useState(null);
  // Real data states
  const [dashboardStats, setDashboardStats] = useState({
    smartScore: 0,
    attendanceRate: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
    lecturersToRate: 0,
    averageGrade: 'N/A'
  });

  const [attendanceData, setAttendanceData] = useState({
    labels: [],
    data: [],
    average: 0
  });

  const [lecturerPosts, setLecturerPosts] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [studentRatings, setStudentRatings] = useState([]);
  const [lectureReports, setLectureReports] = useState([]);

  // Fetch all data from API
  useEffect(() => {
    fetchInitialData();
  }, [user.id]);

  const fetchInitialData = async () => {
    setApiLoading(true);
    try {
      await Promise.all([
        fetchLecturers(),
        fetchClasses(),
        fetchLectureReports(),
        fetchCourses(),
        fetchStudentRatings(),
        fetchMonitoringData(),
        fetchDashboardStats()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setApiLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const response = await userService.getAllUsers();
      if (response.success && response.users) {
        // Get all users with lecturer or principal-lecturer role
        const lecturerUsers = response.users.filter(
          user => user.role === 'lecturer' || user.role === 'principal-lecturer'
        );

        // Get ratings for each lecturer to calculate average
        const lecturersWithRatings = await Promise.all(
          lecturerUsers.map(async (lecturer) => {
            const ratingsResponse = await ratingService.getAllRatings();
            const lecturerRatings = ratingsResponse.success
              ? ratingsResponse.ratings.filter(rating => rating.lecturer_name === lecturer.full_name)
              : [];

            const averageRating = lecturerRatings.length > 0
              ? lecturerRatings.reduce((sum, rating) => sum + rating.rating, 0) / lecturerRatings.length
              : 0;

            // Get courses taught by this lecturer
            const lecturerCourses = courses.filter(course =>
              course.lecturer_name === lecturer.full_name
            ).map(course => `${course.course_code} - ${course.course_name}`);

            return {
              id: lecturer.user_id,
              name: lecturer.full_name,
              email: lecturer.email,
              department: lecturer.role === 'principal-lecturer' ? 'Principal Lecturer' : 'Computer Science',
              courses: lecturerCourses.length > 0 ? lecturerCourses : ['General Courses'],
              rating: parseFloat(averageRating.toFixed(1)),
              totalRatings: lecturerRatings.length,
              canRate: true,
              role: lecturer.role
            };
          })
        );

        setLecturers(lecturersWithRatings);
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      if (response.success) {
        setClasses(response.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchLectureReports = async () => {
    try {
      const response = await lectureReportService.getAllReports();
      if (response.success) {
        setLectureReports(response.reports || []);
        
        // Calculate attendance data from lecture reports
        const recentReports = response.reports.slice(0, 6);
        const attendanceLabels = recentReports.map((report, index) => `Week ${index + 1}`);
        const attendanceValues = recentReports.map(report => 
          Math.round((report.actual_students_present / report.total_registered_students) * 100)
        );
        
        const averageAttendance = attendanceValues.length > 0
          ? attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length
          : 0;

        setAttendanceData({
          labels: attendanceLabels,
          data: attendanceValues,
          average: parseFloat(averageAttendance.toFixed(1))
        });
      }
    } catch (error) {
      console.error('Error fetching lecture reports:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await courseService.getAllCourses();
      if (response.success) {
        setCourses(response.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudentRatings = async () => {
    try {
      const response = await ratingService.getAllRatings();
      if (response.success) {
        // Filter ratings by current student
        const studentRatings = response.ratings.filter(
          rating => rating.student_id === user.id
        );
        setStudentRatings(studentRatings);
      }
    } catch (error) {
      console.error('Error fetching student ratings:', error);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      const response = await monitoringService.getStudentMonitoring();
      if (response.success) {
        setMonitoringData({
          attendanceRate: response.attendanceRate || 0,
          assignmentCompletion: response.assignmentCompletion || 0,
          studyHours: response.studyHours || 0,
          warnings: response.warnings || 0,
          alerts: response.alerts || []
        });
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Calculate dashboard statistics from real data
      const lecturersToRate = lecturers.filter(lecturer => 
        !studentRatings.some(rating => 
          rating.lecturer_name === lecturer.name && rating.student_id === user.id
        )
      ).length;

      const pendingAssignments = lecturerPosts.filter(post => 
        post.type === 'assignment' && !post.submitted
      ).length;

      // Calculate smart score based on attendance and assignment completion
      const smartScore = Math.round(
        (monitoringData.attendanceRate * 0.4) + (monitoringData.assignmentCompletion * 0.6)
      );

      setDashboardStats({
        smartScore,
        attendanceRate: monitoringData.attendanceRate,
        pendingAssignments,
        upcomingExams: 3, // This would come from exams table
        lecturersToRate,
        averageGrade: 'B+' // This would come from grades table
      });
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
    }
  };

  const fetchLecturerPosts = async () => {
    try {
      // This would come from announcements/assignments tables
      // For now, we'll generate posts from courses and lecturers
      const posts = courses.slice(0, 4).map((course, index) => {
        const lecturer = lecturers.find(l => l.courses.includes(`${course.course_code} - ${course.course_name}`));
        const postTypes = ['assignment', 'material', 'announcement'];
        const type = postTypes[index % postTypes.length];
        
        return {
          id: course.course_id,
          lecturer: lecturer ? lecturer.name : 'Unknown Lecturer',
          course: `${course.course_code} - ${course.course_name}`,
          type: type,
          title: type === 'assignment' ? `${course.course_code} Assignment` :
                 type === 'material' ? `${course.course_code} Lecture Materials` :
                 `${course.course_code} Announcement`,
          content: type === 'assignment' ? `Complete the assigned exercises for ${course.course_name}` :
                   type === 'material' ? `Lecture materials uploaded for ${course.course_name}` :
                   `Important announcement regarding ${course.course_name}`,
          date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          dueDate: type === 'assignment' ? 
            new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : null,
          attachments: Math.floor(Math.random() * 3),
          submitted: type === 'assignment' ? Math.random() > 0.5 : null
        };
      });

      setLecturerPosts(posts);
    } catch (error) {
      console.error('Error fetching lecturer posts:', error);
    }
  };

  // Update data when dependencies change
  useEffect(() => {
    if (lecturers.length > 0 && courses.length > 0) {
      fetchLecturerPosts();
      fetchDashboardStats();
    }
  }, [lecturers, courses, studentRatings, monitoringData]);

  const submitRating = async () => {
    if (selectedLecturer && rating > 0 && selectedCourse) {
      try {
        setLoading(true);
        const response = await ratingService.submitRating({
          studentId: user.id,
          lecturerName: selectedLecturer.name,
          courseName: selectedCourse,
          rating: rating,
          review: review
        });

        if (response.success) {
          alert(`Thank you for rating ${selectedLecturer.name} with ${rating} stars for ${selectedCourse}!\nReview: ${review}`);
          // Refresh data
          await Promise.all([
            fetchLecturers(),
            fetchStudentRatings()
          ]);
          setRating(0);
          setReview('');
          setSelectedCourse('');
          setSelectedLecturer(null);
        } else {
          alert('Error submitting rating. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please select a course and provide a rating.');
    }
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

  // Get real reviews from database
  const getLecturerReviews = async (lecturerName) => {
    try {
      const response = await ratingService.getAllRatings();
      if (response.success) {
        const lecturerReviews = response.ratings.filter(
          rating => rating.lecturer_name === lecturerName
        );
        
        return lecturerReviews.map(review => ({
          id: review.rating_id,
          rating: review.rating,
          review: review.review || 'No comment provided',
          date: new Date(review.created_at).toLocaleDateString(),
          course: review.course_name
        }));
      }
    } catch (error) {
      console.error('Error fetching lecturer reviews:', error);
    }
    return [];
  };

  // Simple bar chart component for attendance
  const AttendanceChart = () => {
    const maxData = attendanceData.data.length > 0 ? Math.max(...attendanceData.data) : 100;

    return (
      <div className="attendance-chart">
        <div className="chart-bars">
          {attendanceData.data.map((value, index) => (
            <div key={index} className="chart-bar-container">
              <div
                className="chart-bar"
                style={{ height: `${(value / maxData) * 100}%` }}
              >
                <span className="bar-value">{value}%</span>
              </div>
              <span className="bar-label">{attendanceData.labels[index]}</span>
            </div>
          ))}
        </div>
        {attendanceData.data.length > 0 && (
          <div className="chart-average">
            Semester Average: <strong>{attendanceData.average}%</strong>
          </div>
        )}
        {attendanceData.data.length === 0 && (
          <p className="no-data">No attendance data available</p>
        )}
      </div>
    );
  };

  return (
    <div className="student-dashboard urbn-style">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <h2>LUCT</h2>
          </div>
          <p>Student Portal</p>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'rate-lecturers' ? 'active' : ''}`} onClick={() => setActiveTab('rate-lecturers')}>
            ⭐ Rate Lecturers
          </button>
          <button className={`nav-item ${activeTab === 'lecture-reports' ? 'active' : ''}`} onClick={() => setActiveTab('lecture-reports')}>
            📋 Lecture Reports
          </button>
          <button className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            📈 Monitoring
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
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="header-actions">
            <button className="btn-notification">🔔</button>
            <button className="btn-settings">⚙️</button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              {apiLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading dashboard data...</p>
                </div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card primary">
                      <div className="stat-content">
                        <h3>Smart Score</h3>
                        <div className="stat-main">
                          <span className="stat-value">{dashboardStats.smartScore}</span>
                          <span className="stat-divider">/</span>
                          <span className="stat-total">100</span>
                        </div>
                        <div className="stat-trend positive">Based on performance</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Attendance Rate</h3>
                        <div className="stat-main">
                          <span className="stat-value">{dashboardStats.attendanceRate}%</span>
                        </div>
                        <div className="stat-trend positive">Current rate</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Pending Assignments</h3>
                        <div className="stat-main">
                          <span className="stat-value">{dashboardStats.pendingAssignments}</span>
                        </div>
                        <div className="stat-trend negative">To complete</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Lecturers to Rate</h3>
                        <div className="stat-main">
                          <span className="stat-value">{dashboardStats.lecturersToRate}</span>
                        </div>
                        <div className="stat-trend">Pending review</div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="content-grid">
                    {/* Attendance Chart */}
                    <div className="content-card large">
                      <div className="card-header">
                        <h3>📊 Semester Attendance</h3>
                        <button className="btn-more">Show more →</button>
                      </div>
                      <div className="card-content">
                        <AttendanceChart />
                      </div>
                    </div>

                    {/* Recent Lecturer Posts */}
                    <div className="content-card">
                      <div className="card-header">
                        <h3>📝 Recent Posts</h3>
                        <span className="card-badge">{lecturerPosts.length}</span>
                      </div>
                      <div className="posts-list">
                        {lecturerPosts.slice(0, 4).map(post => (
                          <div key={post.id} className="post-item">
                            <div className="post-header">
                              <span className={`post-type ${post.type}`}>
                                {post.type === 'assignment' ? '📄' :
                                 post.type === 'material' ? '📚' : '📢'}
                              </span>
                              <div className="post-info">
                                <h5>{post.title}</h5>
                                <span className="post-course">{post.course}</span>
                              </div>
                            </div>
                            <div className="post-meta">
                              <span className="post-lecturer">By {post.lecturer}</span>
                              <span className="post-date">{post.date}</span>
                            </div>
                          </div>
                        ))}
                        {lecturerPosts.length === 0 && (
                          <p className="no-posts">No recent posts from lecturers.</p>
                        )}
                      </div>
                    </div>

                    {/* Lecturers to Rate */}
                    <div className="content-card">
                      <div className="card-header">
                        <h3>⭐ Lecturers to Rate</h3>
                        <span className="card-badge">{dashboardStats.lecturersToRate}</span>
                      </div>
                      <div className="lecturers-list">
                        {lecturers.filter(lecturer => 
                          !studentRatings.some(rating => 
                            rating.lecturer_name === lecturer.name
                          )
                        ).slice(0, 4).map(lecturer => (
                          <div key={lecturer.id} className="lecturer-item">
                            <div className="lecturer-info">
                              <div className="avatar-small">
                                {lecturer.name ? lecturer.name.split(' ').map(n => n[0]).join('') : 'U'}
                              </div>
                              <div className="lecturer-details">
                                <h5>{lecturer.name}</h5>
                                <span className="lecturer-dept">{lecturer.department}</span>
                                <div className="lecturer-rating">
                                  <StarRating rating={lecturer.rating} />
                                  <span className="rating-text">{lecturer.rating}/5</span>
                                </div>
                              </div>
                            </div>
                            <button
                              className="btn-sm"
                              onClick={() => {
                                setActiveTab('rate-lecturers');
                                setSelectedLecturer(lecturer);
                              }}
                            >
                              ⭐ Rate Now
                            </button>
                          </div>
                        ))}
                        {dashboardStats.lecturersToRate === 0 && (
                          <p className="no-lecturers">All lecturers rated!</p>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="content-card">
                      <div className="card-header">
                        <h3>⚡ Quick Actions</h3>
                      </div>
                      <div className="actions-grid">
                        <button className="action-btn" onClick={() => setActiveTab('rate-lecturers')}>
                          <span className="action-icon">⭐</span>
                          <span>Rate Lecturer</span>
                        </button>
                        <button className="action-btn" onClick={() => setActiveTab('monitoring')}>
                          <span className="action-icon">📈</span>
                          <span>View Monitoring</span>
                        </button>
                        <button className="action-btn" onClick={() => setActiveTab('lecture-reports')}>
                          <span className="action-icon">📋</span>
                          <span>Lecture Reports</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Rate Lecturers Tab */}
          {activeTab === 'rate-lecturers' && (
            <div className="tab-content">
              <div className="content-header">
                <h2>⭐ Rate Your Lecturers</h2>
                <p>Share your feedback to help improve teaching quality</p>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn ${viewMode === 'rate' ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode('rate');
                      setSelectedLecturer(null);
                      setSelectedLecturerForView(null);
                    }}
                  >
                    Rate Lecturers
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'view' ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode('view');
                      setSelectedLecturer(null);
                      setSelectedLecturerForView(null);
                    }}
                  >
                    View Ratings
                  </button>
                </div>
              </div>

              {apiLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading lecturers...</p>
                </div>
              ) : viewMode === 'view' && selectedLecturerForView ? (
                <div className="rating-panel">
                  <div className="panel-header">
                    <button className="back-btn" onClick={() => setSelectedLecturerForView(null)}>← Back to Lecturers</button>
                    <h3>Reviews for {selectedLecturerForView.name}</h3>
                  </div>
                  <div className="lecturer-overview">
                    <div className="lecturer-info">
                      <div className="lecturer-avatar">
                        {selectedLecturerForView.name ? selectedLecturerForView.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </div>
                      <div className="lecturer-details">
                        <h4>{selectedLecturerForView.name}</h4>
                        <p>{selectedLecturerForView.department}</p>
                        <div className="lecturer-rating">
                          <StarRating rating={selectedLecturerForView.rating} />
                          <span className="rating-text">
                            {selectedLecturerForView.rating}/5 ({selectedLecturerForView.totalRatings} ratings)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="reviews-section">
                    <h4>Student Reviews</h4>
                    <div className="reviews-list">
                      {studentRatings.filter(rating => rating.lecturer_name === selectedLecturerForView.name).map(review => (
                        <div key={review.rating_id} className="review-item">
                          <div className="review-header">
                            <StarRating rating={review.rating} />
                            <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="review-text">{review.review || 'No comment provided'}</p>
                          <span className="review-course">{review.course_name}</span>
                        </div>
                      ))}
                      {studentRatings.filter(rating => rating.lecturer_name === selectedLecturerForView.name).length === 0 && (
                        <p className="no-reviews">No reviews available for this lecturer.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : viewMode === 'view' ? (
                <div className="rating-selection">
                  <div className="selection-header">
                    <h3>View Lecturer Ratings</h3>
                    <p>Explore ratings and reviews from other students</p>
                  </div>

                  <div className="lecturers-list-section">
                    <h3>All Lecturers ({lecturers.length})</h3>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Courses</th>
                            <th>Rating</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lecturers.map(lecturer => (
                            <tr key={lecturer.id}>
                              <td className="name-cell">
                                <div className="avatar-small">
                                  {lecturer.name ? lecturer.name.split(' ').map(n => n[0]).join('') : 'U'}
                                </div>
                                {lecturer.name}
                              </td>
                              <td>{lecturer.department}</td>
                              <td>
                                <div className="tags">
                                  {lecturer.courses.slice(0, 2).map((course, idx) => (
                                    <span key={idx} className="tag">{course}</span>
                                  ))}
                                  {lecturer.courses.length > 2 && (
                                    <span className="tag-more">+{lecturer.courses.length - 2} more</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <StarRating rating={lecturer.rating} />
                                <span className="rating-text">{lecturer.rating}/5 ({lecturer.totalRatings} ratings)</span>
                              </td>
                              <td>
                                <button
                                  className="btn-sm"
                                  onClick={() => setSelectedLecturerForView(lecturer)}
                                >
                                  👁️ View Reviews
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : selectedLecturer ? (
                <div className="rating-panel">
                  <div className="panel-header">
                    <button className="back-btn" onClick={() => setSelectedLecturer(null)}>← Back to Lecturers</button>
                    <h3>Rate {selectedLecturer.name}</h3>
                  </div>
                  <div className="rating-form">
                    <div className="current-rating">
                      <span>Current Rating: </span>
                      <StarRating rating={selectedLecturer.rating} />
                      <span className="rating-count">({selectedLecturer.totalRatings} ratings)</span>
                    </div>
                    <div className="rating-input">
                      <label>Your Rating:</label>
                      <StarRating rating={rating} onRate={setRating} interactive={true} />
                    </div>
                    <div className="course-input">
                      <label>Select Course:</label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="course-select"
                        required
                      >
                        <option value="">Choose a course...</option>
                        {selectedLecturer.courses.map((course, idx) => (
                          <option key={idx} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="review-input">
                      <label>Your Review (Optional):</label>
                      <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Share your experience with this lecturer..."
                        rows="4"
                      />
                    </div>
                    <div className="rating-actions">
                      <button className="btn-outline" onClick={() => setSelectedLecturer(null)}>Cancel</button>
                      <button
                        className="btn-primary"
                        onClick={submitRating}
                        disabled={rating === 0 || selectedCourse === '' || loading}
                      >
                        {loading ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rating-selection">
                  <div className="selection-header">
                    <h3>Select a Lecturer to Rate</h3>
                    <p>Choose from the lecturers you have taken courses with</p>
                  </div>

                  <div className="lecturer-dropdown-section">
                    <div className="form-group">
                      <label>Select Lecturer:</label>
                      <select
                        value={selectedLecturer ? selectedLecturer.id : ''}
                        onChange={(e) => {
                          const lecturerId = e.target.value;
                          const lecturer = lecturers.find(l => l.id === parseInt(lecturerId));
                          setSelectedLecturer(lecturer);
                        }}
                        className="lecturer-select"
                      >
                        <option value="">Choose a lecturer...</option>
                        {lecturers.map(lecturer => (
                          <option key={lecturer.id} value={lecturer.id}>
                            {lecturer.name} - {lecturer.department}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedLecturer && (
                      <div className="lecturer-preview-card">
                        <div className="lecturer-info">
                          <div className="lecturer-avatar">
                            {selectedLecturer.name ? selectedLecturer.name.split(' ').map(n => n[0]).join('') : 'U'}
                          </div>
                          <div className="lecturer-details">
                            <h4>{selectedLecturer.name}</h4>
                            <p>{selectedLecturer.department}</p>
                            <div className="lecturer-rating">
                              <StarRating rating={selectedLecturer.rating} />
                              <span className="rating-text">
                                {selectedLecturer.rating}/5 ({selectedLecturer.totalRatings} ratings)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="lecturer-courses">
                          <h5>Courses:</h5>
                          <div className="course-tags">
                            {selectedLecturer.courses.map((course, idx) => (
                              <span key={idx} className="course-tag">{course}</span>
                            ))}
                          </div>
                        </div>
                        <div className="lecturer-actions">
                          <button
                            className="btn-primary"
                            onClick={() => setSelectedLecturer(selectedLecturer)}
                          >
                            ⭐ Rate This Lecturer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lecturers-list-section">
                    <h3>All Lecturers ({lecturers.length})</h3>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Courses</th>
                            <th>Rating</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lecturers.map(lecturer => (
                            <tr key={lecturer.id}>
                              <td className="name-cell">
                                <div className="avatar-small">
                                  {lecturer.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                {lecturer.name}
                              </td>
                              <td>{lecturer.department}</td>
                              <td>
                                <div className="tags">
                                  {lecturer.courses.slice(0, 2).map((course, idx) => (
                                    <span key={idx} className="tag">{course}</span>
                                  ))}
                                  {lecturer.courses.length > 2 && (
                                    <span className="tag-more">+{lecturer.courses.length - 2} more</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <StarRating rating={lecturer.rating} />
                                <span className="rating-text">{lecturer.rating}/5</span>
                              </td>
                              <td>
                                {!studentRatings.some(rating => rating.lecturer_name === lecturer.name) ? (
                                  <button
                                    className="btn-sm"
                                    onClick={() => setSelectedLecturer(lecturer)}
                                  >
                                    ⭐ Rate
                                  </button>
                                ) : (
                                  <button className="btn-sm btn-success" disabled>
                                    ✅ Rated
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lecture Reports Tab */}
          {activeTab === 'lecture-reports' && (
            <div className="tab-content">
              <div className="content-header">
                <h2>📋 Lecture Reports</h2>
                <p>View detailed reports of recent lectures and class activities</p>
              </div>

              {apiLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading lecture reports...</p>
                </div>
              ) : (
                <div className="lecture-reports-content">
                  <div className="reports-stats">
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Total Reports</h3>
                        <div className="stat-main">
                          <span className="stat-value">{lectureReports.length}</span>
                        </div>
                        <div className="stat-trend">This semester</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Completed Lectures</h3>
                        <div className="stat-main">
                          <span className="stat-value">
                            {lectureReports.filter(report => report.status === 'Completed').length}
                          </span>
                        </div>
                        <div className="stat-trend positive">All sessions</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Average Attendance</h3>
                        <div className="stat-main">
                          <span className="stat-value">
                            {lectureReports.length > 0
                              ? Math.round(lectureReports.reduce((sum, report) => sum + (report.actual_students_present / report.total_registered_students * 100), 0) / lectureReports.length)
                              : 0}%
                          </span>
                        </div>
                        <div className="stat-trend positive">Across all lectures</div>
                      </div>
                    </div>
                  </div>

                  <div className="reports-list">
                    <div className="content-card large">
                      <div className="card-header">
                        <h4>📋 Recent Lecture Reports</h4>
                        <span className="card-badge">{lectureReports.length}</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-striped table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th>Date</th>
                              <th>Course</th>
                              <th>Lecturer</th>
                              <th>Topic</th>
                              <th>Attendance</th>
                              <th>Duration</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lectureReports.map(report => (
                              <tr key={report.id}>
                                <td>{new Date(report.date_of_lecture).toLocaleDateString()}</td>
                                <td>{report.course_name} ({report.course_code})</td>
                                <td>{report.lecturer_name}</td>
                                <td>{report.topic_taught}</td>
                                <td>
                                  <span className="attendance-info">
                                    {report.actual_students_present}/{report.total_registered_students}
                                    <span className="attendance-rate">
                                      ({Math.round(report.actual_students_present / report.total_registered_students * 100)}%)
                                    </span>
                                  </span>
                                </td>
                                <td>{report.scheduled_time}</td>
                                <td>
                                  <span className={`badge ${report.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                    {report.status}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn-sm"
                                    title="View Details"
                                    onClick={() => setSelectedReportForView(report)}
                                  >
                                    👁️ View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {lectureReports.length === 0 && (
                        <p className="no-reports">No lecture reports available.</p>
                      )}
                    </div>
                  </div>

                  {/* Report Details Panel */}
                  {selectedReportForView && (
                    <div className="report-detail-panel">
                      <div className="panel-header">
                        <button className="back-btn" onClick={() => setSelectedReportForView(null)}>← Back to Reports</button>
                        <h3>Lecture Report Details</h3>
                      </div>
                      <div className="report-details">
                        <div className="detail-row">
                          <strong>Date:</strong> {new Date(selectedReportForView.date_of_lecture).toLocaleDateString()}
                        </div>
                        <div className="detail-row">
                          <strong>Course:</strong> {selectedReportForView.course_name} ({selectedReportForView.course_code})
                        </div>
                        <div className="detail-row">
                          <strong>Lecturer:</strong> {selectedReportForView.lecturer_name}
                        </div>
                        <div className="detail-row">
                          <strong>Topic:</strong> {selectedReportForView.topic_taught}
                        </div>
                        <div className="detail-row">
                          <strong>Attendance:</strong> {selectedReportForView.actual_students_present}/{selectedReportForView.total_registered_students} ({Math.round(selectedReportForView.actual_students_present / selectedReportForView.total_registered_students * 100)}%)
                        </div>
                        <div className="detail-row">
                          <strong>Duration:</strong> {selectedReportForView.scheduled_time}
                        </div>
                        <div className="detail-row">
                          <strong>Status:</strong> {selectedReportForView.status}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <div className="content-header">
                <h2>📈 Academic Monitoring</h2>
                <p>Track your academic performance and attendance</p>
              </div>

              {apiLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading monitoring data...</p>
                </div>
              ) : (
                <div className="monitoring-content">
                  <div className="monitoring-stats">
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Attendance Rate</h3>
                        <div className="stat-main">
                          <span className="stat-value">{monitoringData.attendanceRate}%</span>
                        </div>
                        <div className="stat-trend positive">On track</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Assignment Completion</h3>
                        <div className="stat-main">
                          <span className="stat-value">{monitoringData.assignmentCompletion}%</span>
                        </div>
                        <div className="stat-trend warning">Needs improvement</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Study Hours</h3>
                        <div className="stat-main">
                          <span className="stat-value">{monitoringData.studyHours}</span>
                        </div>
                        <div className="stat-trend positive">This week</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h3>Academic Warnings</h3>
                        <div className="stat-main">
                          <span className="stat-value">{monitoringData.warnings}</span>
                        </div>
                        <div className="stat-trend positive">All clear</div>
                      </div>
                    </div>
                  </div>

                  <div className="monitoring-charts">
                    <div className="content-card large">
                      <h4>📊 Weekly Attendance Trend</h4>
                      <div className="card-content">
                        <AttendanceChart />
                      </div>
                    </div>

                    <div className="content-card">
                      <h4>🚨 Recent Alerts</h4>
                      <div className="alerts-list">
                        {(monitoringData.alerts || []).map((alert, index) => (
                          <div key={index} className={`alert-item ${alert.type}`}>
                            <div className="alert-icon">
                              {alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </div>
                            <div className="alert-content">
                              <h5>{alert.title}</h5>
                              <p>{alert.message}</p>
                              <span className="alert-date">{alert.date}</span>
                            </div>
                          </div>
                        ))}
                        {(monitoringData.alerts || []).length === 0 && (
                          <p className="no-alerts">No recent alerts. Keep up the good work!</p>
                        )}
                      </div>
                    </div>

                    {/* Weekly Class Schedule */}
                    <div className="content-card">
                      <div className="card-header">
                        <h4>📅 Class Schedule</h4>
                        <span className="card-badge">{classes.length}</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-striped table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th>Course</th>
                              <th>Lecturer</th>
                              <th>Schedule</th>
                              <th>Venue</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classes.map(cls => (
                              <tr key={cls.class_id}>
                                <td>{cls.class_name}</td>
                                <td>{cls.lecturer_name}</td>
                                <td>{new Date(cls.scheduled_time).toLocaleString()}</td>
                                <td>📍 {cls.venue}</td>
                                <td>
                                  <span className={`badge bg-success`}>
                                    Active
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;