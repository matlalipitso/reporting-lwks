import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import { authService, ratingService, classService, lectureReportService, lecturerService } from '../services/authservice';

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
  const [lectureReports, setLectureReports] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [courses, setCourses] = useState([]);
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
    fetchLectureReports();
    fetchRatings();
    fetchCourses();
  }, []);

  // Fetch lecturers from the correct API endpoint
  const fetchLecturers = async () => {
    try {
      setApiLoading(true);
      const response = await lecturerService.getLecturersFromUsers();
      if (response.success && response.lecturers) {
        const lecturersWithRatings = response.lecturers.map(lecturer => ({
          id: lecturer.user_id,
          name: lecturer.full_name,
          email: lecturer.email,
          department: lecturer.role === 'principal-lecturer' ? 'Principal Lecturer' : 'Computer Science',
          courses: [], // Will be populated with actual courses
          rating: 0, // Will be updated with actual ratings
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

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      const response = await authService.get('/api/courses');
      if (response.success) {
        setCourses(response.courses);
        // Update lecturers with their actual courses
        updateLecturerCourses(response.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  // Update lecturers with their actual courses from the database
  const updateLecturerCourses = (coursesData) => {
    // For now, assign all courses to all lecturers since students should be able to rate any course
    setLecturers(prevLecturers =>
      prevLecturers.map(lecturer => {
        const allCourses = coursesData.map(course => `${course.course_code} - ${course.course_name}`);

        return {
          ...lecturer,
          courses: allCourses
        };
      })
    );
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

  // Fetch lecture reports from API
  const fetchLectureReports = async () => {
    try {
      const response = await lectureReportService.getAllLectureReports();
      if (response.success) {
        setLectureReports(response.reports || []);
      }
    } catch (error) {
      console.error('Error fetching lecture reports:', error);
    }
  };

  // Fetch ratings from API
  const fetchRatings = async () => {
    try {
      const response = await ratingService.getAllRatings();
      if (response.success) {
        setRatings(response.ratings || []);
        updateLecturerRatings(response.ratings || []);
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
        if (ratingData && ratingData.count > 0) {
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

  // Check if student has already rated a lecturer for a specific course
  const checkIfRated = async (lecturerId, courseName) => {
    try {
      const response = await ratingService.checkRating({
        lecturer_id: lecturerId,
        student_id: user.id,
        course_name: courseName
      });
      return response.alreadyRated;
    } catch (error) {
      console.error('Error checking rating:', error);
      return false;
    }
  };

  // Submit rating using the correct API endpoint
  const submitRating = async () => {
    if (selectedLecturer && rating > 0) {
      try {
        setLoading(true);

        // Use default course name since course selection is removed
        const courseName = 'General';

        // Check if already rated
        const alreadyRated = await checkIfRated(selectedLecturer.id, courseName);
        if (alreadyRated) {
          alert('You have already rated this lecturer. You can update your rating.');
        }

        // Submit the rating using the correct endpoint structure
        const response = await ratingService.submitRating({
          studentId: user.id,
          lecturerName: selectedLecturer.name,
          courseName: courseName,
          rating: rating,
          review: review
        });

        if (response.success) {
          alert(`Thank you for rating ${selectedLecturer.name} with ${rating} stars!`);
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
      alert('Please provide a rating.');
    }
  };

  // Star Rating Component
  const StarRating = ({ rating, onRate, interactive = false, size = 'medium' }) => {
    return (
      <div className={`star-rating ${size}`}>
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
    const lecturerReviews = ratings
      .filter(rating => rating.lecturer_name === lecturerName && rating.review)
      .map(rating => ({
        id: rating.rating_id,
        rating: rating.rating,
        review: rating.review,
        date: new Date(rating.created_at).toLocaleDateString(),
        course: rating.course_name || 'Various Courses',
        studentName: `Student ${rating.student_id}` // In real app, you'd fetch student name
      }));

    // If no reviews, show some placeholder text
    if (lecturerReviews.length === 0) {
      return [{
        id: 1,
        rating: 0,
        review: "No reviews yet. Be the first to rate this lecturer!",
        date: new Date().toLocaleDateString(),
        course: "No courses rated",
        studentName: "System"
      }];
    }

    return lecturerReviews;
  };

  // Get lecturer statistics
  const getLecturerStats = (lecturerName) => {
    const lecturerRatings = ratings.filter(rating => rating.lecturer_name === lecturerName);
    const totalRatings = lecturerRatings.length;
    const averageRating = totalRatings > 0 
      ? (lecturerRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
      stars: star,
      count: lecturerRatings.filter(r => r.rating === star).length,
      percentage: totalRatings > 0 ? (lecturerRatings.filter(r => r.rating === star).length / totalRatings * 100).toFixed(1) : 0
    }));

    return {
      totalRatings,
      averageRating,
      ratingDistribution
    };
  };

  // Mock data for demonstration
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

  // Rating Distribution Chart
  const RatingDistribution = ({ distribution }) => {
    return (
      <div className="rating-distribution">
        <h5>Rating Distribution</h5>
        {distribution.map(item => (
          <div key={item.stars} className="distribution-row">
            <span className="stars">{item.stars} ★</span>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
            <span className="percentage">{item.percentage}%</span>
            <span className="count">({item.count})</span>
          </div>
        ))}
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
                      <span className="stat-value">{lecturers.filter(l => l.canRate).length}</span>
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
                              <StarRating rating={parseFloat(lecturer.rating)} />
                              <span className="rating-text">{lecturer.rating}/5 ({lecturer.totalRatings})</span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => {
                            setActiveTab('rate-lecturers');
                            setSelectedLecturer(lecturer);
                            setViewMode('rate');
                          }}
                        >
                          ⭐ Rate Now
                        </button>
                      </div>
                    ))}
                    {lecturers.length === 0 && (
                      <div className="no-lecturers">
                        <p>No lecturers available to rate.</p>
                      </div>
                    )}
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
                    onClick={() => {
                      setViewMode('rate');
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
                      <div className="lecturer-avatar large">
                        {selectedLecturerForView.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="lecturer-details">
                        <h4>{selectedLecturerForView.name}</h4>
                        <p className="lecturer-email">{selectedLecturerForView.email}</p>
                        <p className="lecturer-dept">{selectedLecturerForView.department}</p>
                        <div className="lecturer-rating-main">
                          <StarRating rating={parseFloat(selectedLecturerForView.rating)} size="large" />
                          <div className="rating-stats">
                            <span className="rating-value">{selectedLecturerForView.rating}/5</span>
                            <span className="rating-count">({selectedLecturerForView.totalRatings} ratings)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="lecturer-courses">
                      <h5>Courses Taught:</h5>
                      <div className="course-tags">
                        {selectedLecturerForView.courses.map((course, idx) => (
                          <span key={idx} className="course-tag">{course}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="rating-stats-section">
                    <RatingDistribution distribution={getLecturerStats(selectedLecturerForView.name).ratingDistribution} />
                  </div>

                  <div className="reviews-section">
                    <h4>Student Reviews</h4>
                    <div className="reviews-list">
                      {getLecturerReviews(selectedLecturerForView.name).map(review => (
                        <div key={review.id} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <StarRating rating={review.rating} />
                              <span className="reviewer-name">{review.studentName}</span>
                            </div>
                            <span className="review-date">{review.date}</span>
                          </div>
                          <p className="review-text">{review.review}</p>
                          <span className="review-course">{review.course}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : viewMode === 'view' ? (
                <div className="rating-selection">
                  <div className="selection-header">
                    <h3>View Lecturer Ratings</h3>
                    <p>Explore ratings and reviews from other students</p>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Lecturer</th>
                          <th>Department</th>
                          <th>Rating</th>
                          <th>Total Ratings</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lecturers.map(lecturer => (
                          <tr key={lecturer.id}>
                            <td>
                              <div className="lecturer-info-table">
                                <div className="lecturer-avatar small">
                                  {lecturer.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="lecturer-details-table">
                                  <strong>{lecturer.name}</strong>
                                  <br />
                                  <small className="text-muted">{lecturer.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>{lecturer.department}</td>
                            <td>
                              <div className="rating-cell">
                                <StarRating rating={parseFloat(lecturer.rating)} />
                                <span className="rating-text">{lecturer.rating}/5</span>
                              </div>
                            </td>
                            <td>{lecturer.totalRatings}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn btn-sm btn-outline-primary me-2"
                                  onClick={() => setSelectedLecturerForView(lecturer)}
                                  title="View Details"
                                >
                                  👁️ View
                                </button>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => {
                                    setSelectedLecturer(lecturer);
                                    setViewMode('rate');
                                  }}
                                  title="Rate Lecturer"
                                >
                                  ⭐ Rate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {lecturers.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-4">
                              <p>No lecturers available.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedLecturer ? (
                <div className="rating-panel">
                  <div className="panel-header">
                    <button className="back-btn" onClick={() => setSelectedLecturer(null)}>← Back to Lecturers</button>
                    <h3>Rate {selectedLecturer.name}</h3>
                  </div>
                  <div className="rating-form">
                    <div className="lecturer-preview">
                      <div className="lecturer-avatar">
                        {selectedLecturer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="lecturer-details">
                        <h4>{selectedLecturer.name}</h4>
                        <p>{selectedLecturer.department}</p>
                        <div className="current-rating">
                          <span>Current Rating: </span>
                          <StarRating rating={parseFloat(selectedLecturer.rating)} />
                          <span className="rating-count">({selectedLecturer.totalRatings} ratings)</span>
                        </div>
                      </div>
                    </div>

                    <div className="rating-input">
                      <label>Your Rating:</label>
                      <div className="star-rating-large">
                        <StarRating rating={rating} onRate={setRating} interactive={true} size="large" />
                        <div className="rating-labels">
                          <span>1 - Poor</span>
                          <span>5 - Excellent</span>
                        </div>
                      </div>
                    </div>



                    <div className="review-input">
                      <label>Your Review (Optional):</label>
                      <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Share your experience with this lecturer. What did you like? What could be improved?"
                        rows="4"
                      />
                      <small className="text-muted">Your review will help other students and improve teaching quality.</small>
                    </div>

                    <div className="rating-actions">
                      <button className="btn-outline" onClick={() => setSelectedLecturer(null)}>Cancel</button>
                      <button
                        className="btn-primary"
                        onClick={submitRating}
                        disabled={rating === 0 || loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Submitting...
                          </>
                        ) : (
                          'Submit Rating'
                        )}
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

                  {/* Lecturer Dropdown Selector */}
                  <div className="lecturer-dropdown-section">
                    <label htmlFor="lecturer-select">Quick Select Lecturer:</label>
                    <select
                      id="lecturer-select"
                      value={selectedLecturer ? selectedLecturer.id : ''}
                      onChange={(e) => {
                        const lecturerId = e.target.value;
                        const lecturer = lecturers.find(l => l.id === parseInt(lecturerId));
                        setSelectedLecturer(lecturer || null);
                      }}
                      className="lecturer-select-dropdown"
                    >
                      <option value="">-- Select a Lecturer --</option>
                      {lecturers.map(lecturer => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.name} - {lecturer.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lecturers-grid">
                    {lecturers.map(lecturer => (
                      <div key={lecturer.id} className="lecturer-card">
                        <div className="lecturer-card-header">
                          <div className="lecturer-avatar">
                            {lecturer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="lecturer-info">
                            <h5>{lecturer.name}</h5>
                            <p className="lecturer-dept">{lecturer.department}</p>
                            <p className="lecturer-email">{lecturer.email}</p>
                          </div>
                        </div>
                        <div className="lecturer-rating">
                          <StarRating rating={parseFloat(lecturer.rating)} />
                          <span className="rating-text">
                            {lecturer.rating}/5 ({lecturer.totalRatings} ratings)
                          </span>
                        </div>
                        <div className="lecturer-courses-preview">
                          <strong>Courses:</strong>
                          <div className="course-tags">
                            {lecturer.courses.slice(0, 2).map((course, idx) => (
                              <span key={idx} className="course-tag small">{course.split(' - ')[0]}</span>
                            ))}
                            {lecturer.courses.length > 2 && (
                              <span className="course-tag small">+{lecturer.courses.length - 2} more</span>
                            )}
                          </div>
                        </div>
                        <div className="lecturer-actions">
                          <button
                            className="btn-sm btn-primary"
                            onClick={() => setSelectedLecturer(lecturer)}
                          >
                            ⭐ Rate This Lecturer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {lecturers.length === 0 && (
                    <div className="no-lecturers-message">
                      <div className="alert alert-info">
                        <h5>No Lecturers Available</h5>
                        <p>There are currently no lecturers available to rate. Please check back later.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Other tabs remain the same */}
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
                            {report.topic_taught?.substring(0, 50)}...
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
                    {lectureReports.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <p>No lecture reports available.</p>
                        </td>
                      </tr>
                    )}
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
                        {classes.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-4">
                              <p>No classes enrolled.</p>
                            </td>
                          </tr>
                        )}
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