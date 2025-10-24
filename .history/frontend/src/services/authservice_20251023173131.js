// src/services/authService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

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
      throw new Error('Cannot connect to server. Make sure the backend is running on port 8081.');
    }

    throw error;
  }
};

// API request function
const apiRequest = realApiRequest;

// Authentication Service
export const authService = {
  async register(userData) {
    try {
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
        courses: []
      };
    }
  },

  async createCourse(courseData) {
    try {
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
        ratings: []
      };
    }
  },

  async getLecturerRatings(lecturerName) {
    try {
      return await apiRequest(`/ratings/lecturer/${encodeURIComponent(lecturerName)}`);
    } catch (error) {
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
  },

  async getReportRatings(reportId) {
    try {
      return await apiRequest(`/ratings/report/${reportId}`);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        ratings: [],
        summary: { totalRatings: 0, averageRating: 0 }
      };
    }
  },

  async submitReportRating(ratingData) {
    try {
      return await apiRequest('/ratings/report', {
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
    return { success: false, message: 'Service not implemented' };
  }
};

// Simplified versions of other services for mock mode
export const lecturerService = {
  getAllLecturers: async () => {
    try {
      return await realApiRequest('/lecturers');
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      return { success: false, message: error.message, lecturers: [] };
    }
  },

  getLecturersFromUsers: async () => {
    try {
      return await realApiRequest('/lecturers-users');
    } catch (error) {
      console.error('Error fetching lecturers from users:', error);
      return { success: false, message: error.message, lecturers: [] };
    }
  }
};

export const announcementService = {
  async getAllAnnouncements() {
    return { success: false, message: 'Service not implemented' };
  }
};

export const assignmentService = {
  async getAllAssignments() {
    return { success: false, message: 'Service not implemented' };
  }
};

export const examService = {
  async getAllExams() {
    return { success: false, message: 'Service not implemented' };
  }
};

export const gradeService = {
  async getAllGrades() {
    return { success: false, message: 'Service not implemented' };
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
    return { success: false, message: 'Service not implemented' };
  }
};

export const userService = {
  async getAllUsers() {
    try {
      return await apiRequest('/users');
    } catch (error) {
      return {
        success: false,
        message: error.message,
        users: []
      };
    }
  },

  async getPrincipalLecturer() {
    try {
      const response = await apiRequest('/users');
      const principalLecturer = response.users.find(user => user.role === 'principal-lecturer');
      return {
        success: true,
        principalLecturer: principalLecturer || null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
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
        classes: []
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
  },

  // Principal lecturer feedback methods for reports
  async submitReportFeedback(reportId, feedback, status) {
    try {
      return await apiRequest(`/reports/${reportId}/feedback`, {
        method: 'PUT',
        body: JSON.stringify({ feedback, status }),
      });
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async submitLectureReportFeedback(reportId, feedback, status) {
    try {
      return await apiRequest(`/lecture-reports/${reportId}/feedback`, {
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