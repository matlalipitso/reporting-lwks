 // src/services/authService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.REACT_APP_USE_MOCK !== 'false'; // Default to true for development, set REACT_APP_USE_MOCK=false when backend is ready

// Note: Backend is now ready, you can set REACT_APP_USE_MOCK=false in .env to use real API

// Mock data storage (in-memory)
let mockData = {
  lectureReports: [
    {
      id: 1,
      facultyName: 'To Faculty',
      className: 'CS-4A',
      weekOfReporting: 'Week 1',
      dateOfLecture: '2024-01-15',
      courseName: 'Software Engineering',
      courseCode: 'CS401',
      lecturerName: 'Dr. John Smith',
      actualStudentsPresent: 45,
      totalRegisteredStudents: 50,
      venue: 'Lab A',
      scheduledTime: '09:00-11:00',
      topicTaught: 'Introduction to Software Engineering',
      learningOutcomes: 'Students understood basic SE concepts and methodologies',
      recommendations: 'More practical examples needed for next lecture',
      createdAt: '2024-01-15T10:00:00Z'
    }
  ],
  reports: [],
  ratings: [
    {
      id: 1,
      lecturerId: 1,
      studentId: 1,
      rating: 4,
      review: 'Great lecturer, very clear explanations',
      course: 'CS201 - Data Structures',
      lecturerName: 'Dr. Sarah Johnson',
      createdAt: '2024-10-15T10:00:00Z'
    },
    {
      id: 2,
      lecturerId: 2,
      studentId: 2,
      rating: 5,
      review: 'Excellent teaching methods',
      course: 'IT101 - Programming Fundamentals',
      lecturerName: 'Prof. Michael Chen',
      createdAt: '2024-10-14T14:30:00Z'
    },
    {
      id: 3,
      lecturerId: 3,
      studentId: 3,
      rating: 3,
      review: 'Good content but could be more engaging',
      course: 'MATH101 - Calculus I',
      lecturerName: 'Dr. Emily Davis',
      createdAt: '2024-10-13T09:15:00Z'
    }
  ],
  courses: [
    { id: 1, name: 'Software Engineering', code: 'CS401', students: 45, rating: 4.5, trend: '+2%' },
    { id: 2, name: 'Database Design', code: 'CS302', students: 38, rating: 4.2, trend: '+1%' },
    { id: 3, name: 'Web Development', code: 'CS205', students: 52, rating: 4.7, trend: '+3%' }
  ],
  classes: [
    {
      id: 1,
      name: 'CS101 - Introduction to Programming',
      module: '1BScSM',
      lecturer: 'Dr. Sarah Johnson',
      lecturerId: 1,
      students: 45,
      schedule: 'Mon/Wed 9:00-11:00',
      venue: 'Lab 301',
      status: 'Active',
      faculty: 'Computing & IT',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      name: 'DBIT201 - Database Systems',
      module: '2.DBIT',
      lecturer: 'Dr. James Wilson',
      lecturerId: 4,
      students: 32,
      schedule: 'Tue/Thu 14:00-16:00',
      venue: 'Room 205',
      status: 'Active',
      faculty: 'Computing & IT',
      createdAt: '2024-01-16T10:00:00Z'
    },
    {
      id: 3,
      name: 'BSCIT301 - Web Technologies',
      module: '3.BSCIT',
      lecturer: 'Prof. Lisa Brown',
      lecturerId: 5,
      students: 28,
      schedule: 'Fri 10:00-13:00',
      venue: 'Computer Lab 2',
      status: 'Active',
      faculty: 'Computing & IT',
      createdAt: '2024-01-17T10:00:00Z'
    }
  ],
  users: [
    { id: 1, name: 'Dr. John Smith', email: 'john.smith@luct.ac.za', role: 'lecturer', password: 'password' },
    { id: 2, name: 'Jane Doe', email: 'jane.doe@luct.ac.za', role: 'student', password: 'password' },
    { id: 3, name: 'Dr. Sarah Johnson', email: 'sarah.johnson@luct.ac.za', role: 'principal-lecturer', password: 'password' },
    { id: 4, name: 'Mike Wilson', email: 'mike.wilson@luct.ac.za', role: 'project-manager', password: 'password' }
  ]
};

// Mock service functions
const mockApiCall = async (endpoint, options = {}) => {
  console.log(`🔄 Mock API call to: ${endpoint}`, options);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Handle different endpoints
  switch (endpoint) {
    case '/lecture-reports':
      if (options.method === 'POST') {
        const newReport = {
          id: Date.now(),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString()
        };
        mockData.lectureReports.push(newReport);
        return {
          success: true,
          message: 'Lecture report submitted successfully',
          report: newReport
        };
      } else {
        return {
          success: true,
          reports: mockData.lectureReports
        };
      }

    case '/reports':
      if (options.method === 'POST') {
        const newReport = {
          id: Date.now(),
          ...JSON.parse(options.body),
          date: new Date().toISOString().split('T')[0],
          status: 'Submitted'
        };
        mockData.reports.push(newReport);
        return {
          success: true,
          message: 'Report submitted successfully',
          report: newReport
        };
      } else {
        return {
          success: true,
          reports: mockData.reports
        };
      }

    case '/ratings':
      if (options.method === 'POST') {
        const newRating = {
          id: Date.now(),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString()
        };
        mockData.ratings.push(newRating);
        return {
          success: true,
          message: 'Rating submitted successfully',
          rating: newRating
        };
      } else {
        return {
          success: true,
          ratings: mockData.ratings
        };
      }

    case '/courses':
      return {
        success: true,
        courses: mockData.courses
      };

    case '/classes':
      if (options.method === 'POST') {
        const newClass = {
          id: Date.now(),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString()
        };
        mockData.classes.push(newClass);
        return {
          success: true,
          message: 'Class created successfully',
          class: newClass
        };
      } else {
        return {
          success: true,
          classes: mockData.classes
        };
      }

    case '/health':
      return {
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
      };

    default:
      return {
        success: false,
        message: `Mock endpoint ${endpoint} not implemented`
      };
  }
};

// Real API call function
const realApiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  // Get token from localStorage for authenticated requests
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add authorization header if token exists
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`🔄 Making request to: ${url}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle specific HTTP errors
      if (response.status === 401) {
        // Unauthorized - clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Response from ${endpoint}:`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ Request failed for ${endpoint}:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
    }
    
    throw error;
  }
};

// Choose between real and mock API
const apiRequest = USE_MOCK ? mockApiCall : realApiRequest;

// Authentication Service
export const authService = {
  async register(userData) {
    try {
      // For mock mode, simulate registration
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newUser = {
          id: Date.now(),
          ...userData,
          role: userData.role || 'student' // Default to student if no role provided
        };
        mockData.users.push(newUser);
        
        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        return {
          success: true,
          message: 'Registration successful',
          token,
          user: newUser
        };
      }
      
      const result = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async login(credentials) {
    try {
      // For mock mode, simulate login
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple mock authentication
        const user = mockData.users.find(u =>
          u.email === credentials.email &&
          u.password === credentials.password
        );

        let defaultUser;
        if (!user) {
          // Generate name from email
          const emailLocal = credentials.email.split('@')[0];
          const nameParts = emailLocal.split('.').map(part =>
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          );
          const generatedName = nameParts.join(' ');

          // Determine role based on email content for testing different roles
          let role = 'lecturer'; // default
          const emailLower = credentials.email.toLowerCase();
          if (emailLower.includes('student')) {
            role = 'student';
          } else if (emailLower.includes('principal') || emailLower.includes('principal-lecturer')) {
            role = 'principal-lecturer';
          } else if (emailLower.includes('project') || emailLower.includes('manager')) {
            role = 'project-manager';
          } else if (emailLower.includes('lecturer')) {
            role = 'lecturer';
          }

          defaultUser = {
            id: Date.now(),
            name: generatedName,
            email: credentials.email,
            role: role
          };
        }

        const finalUser = user || defaultUser;

        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(finalUser));

        return {
          success: true,
          message: 'Login successful',
          token,
          user: finalUser
        };
      }
      
      return await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async healthCheck() {
    try {
      return await apiRequest('/health', {
        method: 'GET',
      });
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.log('✅ User logged out');
  },

  isAuthenticated() {
    return !!this.getCurrentUser() && !!this.getToken();
  },

  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  isStudent() {
    return this.hasRole('student');
  },

  isLecturer() {
    return this.hasRole('lecturer');
  },

  isPrincipalLecturer() {
    return this.hasRole('principal-lecturer');
  },

  isProjectManager() {
    return this.hasRole('project-manager');
  }
};

// Lecture Reports Service
export const lectureReportService = {
  async getAllReports() {
    try {
      return await realApiRequest('/lecture-reports');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        reports: []
      };
    }
  },

  async createReport(reportData) {
    try {
      return await realApiRequest('/lecture-reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async getReportById(id) {
    try {
      return await realApiRequest(`/lecture-reports/${id}`);
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async updateReport(id, reportData) {
    try {
      return await realApiRequest(`/lecture-reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reportData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async deleteReport(id) {
    try {
      return await realApiRequest(`/lecture-reports/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

// Courses Service
export const courseService = {
  async getAllCourses() {
    try {
      return await apiRequest('/courses');
    } catch (error) {
      return { 
        success: false, 
        message: error.message,
        courses: USE_MOCK ? mockData.courses : []
      };
    }
  },

  async createCourse(courseData) {
    try {
      if (USE_MOCK) {
        const newCourse = {
          id: Date.now(),
          ...courseData
        };
        mockData.courses.push(newCourse);
        return {
          success: true,
          message: 'Course created successfully',
          course: newCourse
        };
      }
      
      return await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async getCourseById(id) {
    try {
      if (USE_MOCK) {
        const course = mockData.courses.find(c => c.id === id);
        return {
          success: true,
          course: course || null
        };
      }
      return await apiRequest(`/courses/${id}`);
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async updateCourse(id, courseData) {
    try {
      if (USE_MOCK) {
        const index = mockData.courses.findIndex(c => c.id === id);
        if (index !== -1) {
          mockData.courses[index] = { ...mockData.courses[index], ...courseData };
          return {
            success: true,
            message: 'Course updated successfully',
            course: mockData.courses[index]
          };
        }
        return { success: false, message: 'Course not found' };
      }
      
      return await apiRequest(`/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(courseData),
      });
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async deleteCourse(id) {
    try {
      if (USE_MOCK) {
        mockData.courses = mockData.courses.filter(c => c.id !== id);
        return {
          success: true,
          message: 'Course deleted successfully'
        };
      }
      
      return await apiRequest(`/courses/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async getCoursesByDepartment(department) {
    try {
      if (USE_MOCK) {
        const courses = mockData.courses.filter(c => c.department === department);
        return {
          success: true,
          courses
        };
      }
      return await apiRequest(`/courses/department/${encodeURIComponent(department)}`);
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  },

  async getCoursesByLecturer(lecturerId) {
    try {
      if (USE_MOCK) {
        // For mock, return all courses
        return {
          success: true,
          courses: mockData.courses
        };
      }
      return await apiRequest(`/courses/lecturer/${lecturerId}`);
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
};

// Ratings Service
export const ratingService = {
  async getAllRatings() {
    try {
      return await apiRequest('/ratings');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        ratings: USE_MOCK ? mockData.ratings : []
      };
    }
  },

  async getLecturerRatings(lecturerName) {
    try {
      return await apiRequest(`/ratings/lecturer/${encodeURIComponent(lecturerName)}`);
    } catch (error) {
      if (USE_MOCK) {
        const lecturerRatings = mockData.ratings.filter(rating => rating.lecturerName === lecturerName);
        const totalRatings = lecturerRatings.length;
        const averageRating = totalRatings > 0 ? lecturerRatings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings : 0;

        return {
          success: true,
          ratings: lecturerRatings,
          summary: { totalRatings, averageRating }
        };
      }
      return {
        success: false,
        message: error.message,
        ratings: [],
        summary: { totalRatings: 0, averageRating: 0 }
      };
    }
  },

  async submitRating(ratingData) {
    try {
      return await apiRequest('/ratings', {
        method: 'POST',
        body: JSON.stringify(ratingData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

export const monitoringService = {
  async getStudentMonitoring() {
    return USE_MOCK ? {
      success: true,
      monitoring: {
        attendanceRate: 85,
        assignmentCompletion: 78,
        lowPerformanceStudents: 5,
        upcomingDeadlines: 3
      }
    } : { success: false, message: 'Service not implemented' };
  }
};

// Simplified versions of other services for mock mode
export const lecturerService = {
  getAllLecturers: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lecturers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      return { success: false, message: 'Failed to fetch lecturers' };
    }
  },

  getLecturersFromUsers: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lecturers-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching lecturers from users:', error);
      return { success: false, message: 'Failed to fetch lecturers' };
    }
  }
};

export const announcementService = {
  async getAllAnnouncements() {
    return USE_MOCK ? {
      success: true,
      announcements: []
    } : { success: false, message: 'Service not implemented' };
  }
};

export const assignmentService = {
  async getAllAssignments() {
    return USE_MOCK ? {
      success: true,
      assignments: []
    } : { success: false, message: 'Service not implemented' };
  }
};

export const examService = {
  async getAllExams() {
    return USE_MOCK ? {
      success: true,
      exams: []
    } : { success: false, message: 'Service not implemented' };
  }
};

export const gradeService = {
  async getAllGrades() {
    return USE_MOCK ? {
      success: true,
      grades: []
    } : { success: false, message: 'Service not implemented' };
  }
};

export const reportService = {
  async getAllReports() {
    try {
      return await realApiRequest('/reports');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        reports: []
      };
    }
  },

  async createReport(reportData) {
    try {
      return await realApiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async getReportById(id) {
    try {
      return await realApiRequest(`/reports/${id}`);
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async updateReport(id, reportData) {
    try {
      return await realApiRequest(`/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reportData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async deleteReport(id) {
    try {
      return await realApiRequest(`/reports/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async submitFeedback(id, feedback, status) {
    try {
      return await realApiRequest(`/reports/${id}/feedback`, {
        method: 'PUT',
        body: JSON.stringify({ feedback, status }),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

export const facultyReportService = {
  async getAllFacultyReports() {
    return USE_MOCK ? {
      success: true,
      reports: []
    } : { success: false, message: 'Service not implemented' };
  }
};

export const userService = {
  async getAllUsers() {
    return USE_MOCK ? {
      success: true,
      users: mockData.users
    } : { success: false, message: 'Service not implemented' };
  }
};

export const classService = {
  async getAllClasses() {
    try {
      return await apiRequest('/classes');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        classes: USE_MOCK ? mockData.classes : []
      };
    }
  },

  async createClass(classData) {
    try {
      return await apiRequest('/classes', {
        method: 'POST',
        body: JSON.stringify(classData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async updateClass(id, classData) {
    try {
      if (USE_MOCK) {
        const index = mockData.classes.findIndex(c => c.id === id);
        if (index !== -1) {
          mockData.classes[index] = { ...mockData.classes[index], ...classData };
          return {
            success: true,
            message: 'Class updated successfully',
            class: mockData.classes[index]
          };
        }
        return { success: false, message: 'Class not found' };
      }

      return await apiRequest(`/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(classData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async deleteClass(id) {
    try {
      if (USE_MOCK) {
        mockData.classes = mockData.classes.filter(c => c.id !== id);
        return {
          success: true,
          message: 'Class deleted successfully'
        };
      }

      return await apiRequest(`/classes/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

export const feedbackService = {
  async getAllFeedback() {
    try {
      return await apiRequest('/feedback');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        feedback: []
      };
    }
  },

  async createFeedback(feedbackData) {
    try {
      return await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async getFeedbackByReportId(reportId) {
    try {
      return await apiRequest(`/feedback/report/${reportId}`);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        feedback: []
      };
    }
  },

  async updateFeedback(id, feedbackData) {
    try {
      return await apiRequest(`/feedback/${id}`, {
        method: 'PUT',
        body: JSON.stringify(feedbackData),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async deleteFeedback(id) {
    try {
      return await apiRequest(`/feedback/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

// Export all services
const services = {
  authService,
  lectureReportService,
  ratingService,
  monitoringService,
  courseService,
  lecturerService,
  announcementService,
  assignmentService,
  examService,
  gradeService,
  reportService,
  facultyReportService,
  userService,
  classService,
  feedbackService
};

export default services;