import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import { authService, ratingService, classService } from '../services/authservice';

const StudentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('rate');
  const [selectedLecturerForView, setSelectedLecturerForView] = useState(null);

  // State for API data
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const dashboardStats = {
    smartScore: 82,
    attendanceRate: 88,
    pendingAssignments: 5,
    upcomingExams: 3,
    lecturersToRate: 4,
    averageGrade: 'B+'
  };

  // Fetch data from APIs
  useEffect(() => {
    fetchLecturers();
    fetchClasses();
    fetchRatings();
  }, []);

  // Fetch lecturers that the student is enrolled in
  const fetchLecturers = async () => {
    try {
      setApiLoading(true);
      // Use the endpoint for enrolled lecturers
      const response = await authService.get(`/api/student/lecturers/${user.id}`);
      if (response.success && response.lecturers) {
        const lecturersWithRatings = response.lecturers.map(lecturer => ({
          id: lecturer.user_id,
          name: lecturer.full_name,
          email: lecturer.email,
          department: lecturer.role === 'principal-lecturer' ? 'Principal Lecturer' : 'Computer Science',
          courses: lecturer.courses || [], // Courses from enrollment
          rating: 4.0, // Will be updated with actual ratings
          totalRatings: 0,
          canRate: true,
          role: lecturer.role
        }));
        setLecturers(lecturersWithRatings);
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    } finally {
      setApiLoading(false);
    }
  };

  // Helper function to assign courses based on lecturer role
  const getLecturerCourses = (role) => {
    switch (role) {
      case 'principal-lecturer':
        return ['CS401 - Software Engineering', 'CS501 - Advanced Programming'];
      case 'lecturer':
        return ['CS101 - Introduction to Programming', 'CS201 - Data Structures'];
      default:
        return ['General Courses'];
    }
  };

  // Fetch classes from API
  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      if (response.success) {
        setClasses(response.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };



  // Fetch ratings from API
  const fetchRatings = async () => {
    try {
      const response = await ratingService.getAllRatings();
      if (response.success) {
        setRatings(response.ratings);
        updateLecturerRatings(response.ratings);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  // Update lecturer ratings based on fetched ratings data
  const updateLecturerRatings = (ratingsData) => {
    const lecturerRatings = {};
    
    ratingsData.forEach(rating => {
      if (rating.lecturer_name) {
        if (!lecturerRatings[rating.lecturer_name]) {
          lecturerRatings[rating.lecturer_name] = {
            total: 0,
            count: 0,
            ratings: []
          };
        }
        lecturerRatings[rating.lecturer_name].total += rating.rating;
        lecturerRatings[rating.lecturer_name].count++;
        lecturerRatings[rating.lecturer_name].ratings.push(rating);
      }
    });

    // Update lecturers with actual ratings
    setLecturers(prevLecturers => 
      prevLecturers.map(lecturer => {
        const ratingData = lecturerRatings[lecturer.name];
        if (ratingData) {
          return {
            ...lecturer,
            rating: (ratingData.total / ratingData.count).toFixed(1),
            totalRatings: ratingData.count
          };
        }
        return lecturer;
      })
    );
  };

  // Submit rating using the correct API endpoint
  const submitRating = async () => {
    if (selectedLecturer && rating > 0 && selectedCourse) {
      try {
        setLoading(true);

        // Submit the rating using the correct endpoint structure
        const response = await ratingService.submitRating({
          studentId: user.id,
          lecturerName: selectedLecturer.name,
          courseName: selectedCourse,
          rating: rating,
          review: review
        });

        if (response.success) {
          alert(`Thank you for rating ${selectedLecturer.name} with ${rating} stars for ${selectedCourse}!`);
          // Refresh data
          fetchRatings();
          fetchLecturers();
          // Reset form
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

  // Star Rating Component
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

  // Generate reviews based on actual ratings data
  const getLecturerReviews = (lecturerName) => {
    return ratings
      .filter(rating => rating.lecturer_name === lecturerName && rating.review)
      .map(rating => ({
        id: rating.rating_id,
        rating: rating.rating,
        review: rating.review,
        date: new Date(rating.created_at).toLocaleDateString(),
        course: rating.course_name || 'Various Courses'
      }));
  };

  // Mock data for demonstration (replace with actual API data)
  const lecturerPosts = [
    {
      id: 1,
      lecturer: 'Dr. Sarah Johnson',
      course: 'CS201 - Data Structures',
      type: 'assignment',
      title: 'Implement BST',
      content: 'Implement a BST with traversal algorithms. Due date: Oct 15, 2024',
      date: '2024-10-05',
      dueDate: '2024-10-15',
      attachments: 2,
      submitted: false
    }
  ];

  const attendanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    data: [95, 88, 92, 85, 90, 87],
    average: 89.5
  };

  // Attendance Chart Component
  const AttendanceChart = () => {
    const maxData = Math.max(...attendanceData.data);
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
        <div className="chart-average">
          Semester Average: <strong>{attendanceData.average}%</strong>
        </div>
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
            <small>Student ID: {user.student_number}</small>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1>Student Dashboard</h1>
          <div className="header-actions">
            <button className="btn-notification">🔔</button>
            <button className="btn-settings">⚙️</button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-content">
                    <h3>Smart Score</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.smartScore}</span>
                      <span className="stat-divider">/</span>
                      <span className="stat-total">100</span>
                    </div>
                    <div className="stat-trend positive">+5% This week</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Attendance Rate</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.attendanceRate}%</span>
                    </div>
                    <div className="stat-trend positive">+2% Last week</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <h3>Pending Assignments</h3>
                    <div className="stat-main">
                      <span className="stat-value">{dashboardStats.pendingAssignments}</span>
                    </div>
                    <div className="stat-trend negative">-1 This week</div>
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

              <div className="content-grid">
                <div className="content-card large">
                  <div className="card-header">
                    <h3>📊 Semester Attendance</h3>
                  </div>
                  <div className="card-content">
                    <AttendanceChart />
                  </div>
                </div>

                <div className="content-card">
                  <div className="card-header">
                    <h3>⭐ Lecturers to Rate</h3>
                    <span className="card-badge">{lecturers.length}</span>
                  </div>
                  <div className="lecturers-list">
                    {lecturers.slice(0, 4).map(lecturer => (
                      <div key={lecturer.id} className="lecturer-item">
                        <div className="lecturer-info">
                          <div className="avatar-small">
                            {lecturer.name.split(' ').map(n => n[0]).join('')}
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
                  </div>
                </div>
              </div>
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
                    onClick={() => setViewMode('rate')}
                  >
                    Rate Lecturers
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'view' ? 'active' : ''}`}
                    onClick={() => setViewMode('view')}
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
                        {selectedLecturerForView.name.split(' ').map(n => n[0]).join('')}
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
                      {getLecturerReviews(selectedLecturerForView.name).map(review => (
                        <div key={review.id} className="review-item">
                          <div className="review-header">
                            <StarRating rating={review.rating} />
                            <span className="review-date">{review.date}</span>
                          </div>
                          <p className="review-text">{review.review}</p>
                          <span className="review-course">{review.course}</span>
                        </div>
                      ))}
                      {getLecturerReviews(selectedLecturerForView.name).length === 0 && (
                        <p className="no-reviews">No reviews yet for this lecturer.</p>
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
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Rating</th>
                            <th>Total Ratings</th>
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
                                <StarRating rating={lecturer.rating} />
                                <span className="rating-text">{lecturer.rating}/5</span>
                              </td>
                              <td>{lecturer.totalRatings}</td>
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

                  <div className="lecturers-list-section">
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
                                  {lecturer.courses.map((course, idx) => (
                                    <span key={idx} className="tag">{course}</span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <StarRating rating={lecturer.rating} />
                                <span className="rating-text">{lecturer.rating}/5</span>
                              </td>
                              <td>
                                <button
                                  className="btn-sm"
                                  onClick={() => setSelectedLecturer(lecturer)}
                                >
                                  ⭐ Rate
                                </button>
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
                <p>View lecture reports submitted by your lecturers</p>
              </div>

              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Course</th>
                      <th>Lecturer</th>
                      <th>Date</th>
                      <th>Topic</th>
                      <th>Attendance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectureReports.map(report => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.course_code}</strong>
                          <br />
                          <small>{report.course_name}</small>
                        </td>
                        <td>{report.lecturer_name}</td>
                        <td>{new Date(report.date_of_lecture).toLocaleDateString()}</td>
                        <td>
                          <div className="topic-preview">
                            {report.topic_taught.substring(0, 50)}...
                          </div>
                        </td>
                        <td>
                          {report.actual_students_present} / {report.total_registered_students}
                          <br />
                          <small>{Math.round((report.actual_students_present / report.total_registered_students) * 100)}%</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            report.status === 'approved' ? 'bg-success' :
                            report.status === 'pending' ? 'bg-warning' :
                            report.status === 'rejected' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <div className="content-header">
                <h2>📈 Academic Monitoring</h2>
                <p>Track your academic performance</p>
              </div>

              <div className="monitoring-content">
                <div className="content-card large">
                  <h4>📊 Your Class Schedule</h4>
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
                            <td>
                              <strong>{cls.course_code}</strong>
                              <br />
                              <small>{cls.course_name}</small>
                            </td>
                            <td>{cls.lecturer_name}</td>
                            <td>{cls.scheduled_time}</td>
                            <td>📍 {cls.venue}</td>
                            <td>
                              <span className="badge bg-success">Active</span>
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
      </div>
    </div>
  );
};

export default StudentDashboard;