import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import jwt from 'jsonwebtoken';

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: process.env.DB_USER || '46uLvdkuDn4vp8d.root',
  password: process.env.DB_PASSWORD || '1S6GYMwJsPF6nbT6',
  database: process.env.DB_NAME || 'test',
  ssl: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  connectTimeout: 60000,
  charset: 'utf8mb4'
};

console.log('Database config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password
});

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    return false;
  }
}

// Initialize database and tables
async function initializeDatabase() {
  try {
    const connected = await testConnection();
    if (!connected) {
      return;
    }

    const connection = await pool.getConnection();

    // Create users table if not exists
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'lecturer', 'principal-lecturer', 'project-manager') NOT NULL DEFAULT 'student',
        student_number VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `;

    // Create faculties table
    const createFacultiesTable = `
      CREATE TABLE IF NOT EXISTS faculties (
        faculty_id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_name VARCHAR(100) NOT NULL
      )
    `;

    // Create courses table
    const createCoursesTable = `
      CREATE TABLE IF NOT EXISTS courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_code VARCHAR(50) NOT NULL UNIQUE,
        course_name VARCHAR(255) NOT NULL,
        description TEXT,
        faculty_id INT,
        principal_lecturer_id INT,
        credits INT DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_course_code (course_code)
      )
    `;

    // Create classes table
    const createClassesTable = `
      CREATE TABLE IF NOT EXISTS classes (
        class_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        lecturer_id INT NOT NULL,
        venue VARCHAR(100),
        scheduled_time DATETIME NOT NULL,
        total_registered_students INT,
        enrolled_count INT DEFAULT 0,
        INDEX idx_course_id (course_id),
        INDEX idx_lecturer_id (lecturer_id)
      )
    `;

    // Create lecturers table
    const createLecturersTable = `
      CREATE TABLE IF NOT EXISTS lecturers (
        lecturer_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        department VARCHAR(255) NOT NULL,
        specialization VARCHAR(255),
        office_location VARCHAR(255),
        office_hours VARCHAR(255),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      )
    `;

    // Create reports table
    const createReportsTable = `
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INT NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        reviewer_id INT,
        reviewer_feedback TEXT,
        status ENUM('pending','reviewed','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_author_id (author_id),
        INDEX idx_reviewer_id (reviewer_id),
        INDEX idx_status (status)
      )
    `;

    // Create lecture reports table
    const createLectureReportsTable = `
      CREATE TABLE IF NOT EXISTS lecture_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_name VARCHAR(255) NOT NULL,
        class_name VARCHAR(255) NOT NULL,
        week_of_reporting VARCHAR(50) NOT NULL,
        date_of_lecture DATE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) NOT NULL,
        lecturer_name VARCHAR(255) NOT NULL,
        actual_students_present INT NOT NULL,
        total_registered_students INT NOT NULL,
        venue VARCHAR(255),
        scheduled_time VARCHAR(50),
        topic_taught TEXT NOT NULL,
        learning_outcomes TEXT NOT NULL,
        recommendations TEXT,
        author_id INT NOT NULL,
        reviewer_id INT,
        reviewer_feedback TEXT,
        status ENUM('pending','reviewed','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_author_id (author_id),
        INDEX idx_lecturer_name (lecturer_name),
        INDEX idx_reviewer_id (reviewer_id),
        INDEX idx_status (status)
      )
    `;

    // Create ratings table
    const createRatingsTable = `
      CREATE TABLE IF NOT EXISTS ratings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        lecturer_name VARCHAR(255) NULL,
        course_name VARCHAR(255) NULL,
        report_id INT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_lecturer_name (lecturer_name),
        INDEX idx_course_name (course_name),
        INDEX idx_report_id (report_id)
      )
    `;

    // Create feedback table
    const createFeedbackTable = `
      CREATE TABLE IF NOT EXISTS feedback (
        feedback_id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        reviewer_id INT NOT NULL,
        feedback_text TEXT NOT NULL,
        action_items TEXT,
        status ENUM('submitted','addressed','closed') DEFAULT 'submitted',
        priority ENUM('low','medium','high','critical') DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_report_id (report_id),
        INDEX idx_reviewer_id (reviewer_id)
      )
    `;

    // Create student enrollments table
    const createStudentEnrollmentsTable = `
      CREATE TABLE IF NOT EXISTS student_enrollments (
        enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        class_id INT NOT NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('enrolled','completed','dropped') DEFAULT 'enrolled',
        grade DECIMAL(4,2),
        UNIQUE KEY unique_student_class (student_id, class_id),
        INDEX idx_student_id (student_id),
        INDEX idx_class_id (class_id)
      )
    `;

    // Create course assignments table
    const createCourseAssignmentsTable = `
      CREATE TABLE IF NOT EXISTS course_assignments (
        assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        assigned_by INT NOT NULL,
        academic_year YEAR,
        semester ENUM('spring','summer','fall','winter') DEFAULT 'fall',
        assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_course_id (course_id),
        INDEX idx_lecturer_id (lecturer_id)
      )
    `;

    // Create monitoring logs table
    const createMonitoringLogsTable = `
      CREATE TABLE IF NOT EXISTS monitoring_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        target_type ENUM('course','class','report','rating','feedback') NOT NULL,
        target_id INT NOT NULL,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_target (target_type, target_id)
      )
    `;

    // Execute all table creation queries
    await connection.execute(createUsersTable);
    console.log('✅ Users table ready');

    await connection.execute(createFacultiesTable);
    console.log('✅ Faculties table ready');

    await connection.execute(createCoursesTable);
    console.log('✅ Courses table ready');

    await connection.execute(createClassesTable);
    console.log('✅ Classes table ready');

    await connection.execute(createLecturersTable);
    console.log('✅ Lecturers table ready');

    await connection.execute(createReportsTable);
    console.log('✅ Reports table ready');

    await connection.execute(createLectureReportsTable);
    console.log('✅ Lecture reports table ready');

    await connection.execute(createRatingsTable);
    console.log('✅ Ratings table ready');

    await connection.execute(createFeedbackTable);
    console.log('✅ Feedback table ready');

    await connection.execute(createStudentEnrollmentsTable);
    console.log('✅ Student enrollments table ready');

    await connection.execute(createCourseAssignmentsTable);
    console.log('✅ Course assignments table ready');

    await connection.execute(createMonitoringLogsTable);
    console.log('✅ Monitoring logs table ready');

    // Insert sample faculties
    const sampleFaculties = [
      { name: 'Computer Science' },
      { name: 'Engineering' },
      { name: 'Business Administration' },
      { name: 'Mathematics' }
    ];

    for (const faculty of sampleFaculties) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO faculties (faculty_name) VALUES (?)',
          [faculty.name]
        );
      } catch (error) {
        console.log('Faculty insertion error:', error.message);
      }
    }

    // Insert test users
    const testUsers = [
      {
        name: 'John Lecturer',
        email: 'lecturer@example.com',
        password: 'password123',
        role: 'lecturer'
      },
      {
        name: 'Jane Student',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
        studentNumber: 'STU001'
      },
      {
        name: 'Principal Lecturer',
        email: 'principal@example.com',
        password: 'password123',
        role: 'principal-lecturer'
      },
      {
        name: 'Project Manager',
        email: 'manager@example.com',
        password: 'password123',
        role: 'project-manager'
      }
    ];

    for (const user of testUsers) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        await connection.execute(
          'INSERT IGNORE INTO users (full_name, email, password_hash, role, student_number) VALUES (?, ?, ?, ?, ?)',
          [user.name, user.email, hashedPassword, user.role, user.studentNumber || null]
        );
      } catch (error) {
        console.log(`User ${user.email} already exists or error:`, error.message);
      }
    }

    console.log('✅ Test users inserted');

    // Insert sample courses
    const sampleCourses = [
      { code: 'CS101', name: 'Introduction to Programming', credits: 4 },
      { code: 'CS201', name: 'Data Structures', credits: 4 },
      { code: 'MATH101', name: 'Calculus I', credits: 3 },
      { code: 'BUS101', name: 'Business Fundamentals', credits: 3 }
    ];

    for (const course of sampleCourses) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO courses (course_code, course_name, credits) VALUES (?, ?, ?)',
          [course.code, course.name, course.credits]
        );
      } catch (error) {
        console.log('Course insertion error:', error.message);
      }
    }

    console.log('✅ Sample courses inserted');

    // Insert sample reports
    const sampleReports = [
      {
        title: 'Weekly Teaching Progress Report',
        content: 'This week covered chapters 1-3 of the Data Structures course. Students showed good understanding of basic concepts.',
        authorId: 2, // lecturer@example.com
        authorName: 'John Lecturer',
        status: 'submitted'
      },
      {
        title: 'Student Performance Analysis',
        content: 'Analysis of student performance in Mathematics 101. Most students are performing well above average.',
        authorId: 2, // lecturer@example.com
        authorName: 'John Lecturer',
        status: 'pending'
      },
      {
        title: 'Course Material Review',
        content: 'Reviewed course materials for Computer Science 101. All materials are up to date and comprehensive.',
        authorId: 2, // lecturer@example.com
        authorName: 'John Lecturer',
        status: 'approved'
      }
    ];

    for (const report of sampleReports) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO reports (title, content, author_id, author_name, status) VALUES (?, ?, ?, ?, ?)',
          [report.title, report.content, report.authorId, report.authorName, report.status]
        );
      } catch (error) {
        console.log('Report insertion error:', error.message);
      }
    }

    console.log('✅ Sample reports inserted');

    // Insert sample lecture reports
    const sampleLectureReports = [
      {
        faculty_name: 'Computer Science',
        class_name: 'CS101-A',
        week_of_reporting: 'Week 1',
        date_of_lecture: '2024-01-15',
        course_name: 'Introduction to Programming',
        course_code: 'CS101',
        lecturer_name: 'John Lecturer',
        actual_students_present: 25,
        total_registered_students: 30,
        venue: 'Room 101',
        scheduled_time: '09:00-11:00',
        topic_taught: 'Introduction to Variables and Data Types',
        learning_outcomes: 'Students will understand basic programming concepts and variable declarations',
        recommendations: 'More practice exercises needed for data types',
        author_id: 2
      },
      {
        faculty_name: 'Computer Science',
        class_name: 'CS201-B',
        week_of_reporting: 'Week 2',
        date_of_lecture: '2024-01-16',
        course_name: 'Data Structures',
        course_code: 'CS201',
        lecturer_name: 'John Lecturer',
        actual_students_present: 22,
        total_registered_students: 28,
        venue: 'Lab 201',
        scheduled_time: '13:00-15:00',
        topic_taught: 'Arrays and Linked Lists',
        learning_outcomes: 'Students will implement basic data structures',
        recommendations: 'Additional lab time for implementation',
        author_id: 2
      }
    ];

    for (const lectureReport of sampleLectureReports) {
      try {
        await connection.execute(
          `INSERT IGNORE INTO lecture_reports (
            faculty_name, class_name, week_of_reporting, date_of_lecture,
            course_name, course_code, lecturer_name, actual_students_present,
            total_registered_students, venue, scheduled_time, topic_taught,
            learning_outcomes, recommendations, author_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lectureReport.faculty_name, lectureReport.class_name, lectureReport.week_of_reporting,
            lectureReport.date_of_lecture, lectureReport.course_name, lectureReport.course_code,
            lectureReport.lecturer_name, lectureReport.actual_students_present,
            lectureReport.total_registered_students, lectureReport.venue, lectureReport.scheduled_time,
            lectureReport.topic_taught, lectureReport.learning_outcomes, lectureReport.recommendations,
            lectureReport.author_id
          ]
        );
      } catch (error) {
        console.log('Lecture report insertion error:', error.message);
      }
    }

    console.log('✅ Sample lecture reports inserted');

    // Insert sample student enrollments
    const sampleEnrollments = [
      { student_id: 4, class_id: 1 }, // Jane Student (student@example.com) enrolled in CS101 class
      { student_id: 4, class_id: 2 }, // Jane Student enrolled in CS201 class
    ];

    for (const enrollment of sampleEnrollments) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO student_enrollments (student_id, class_id) VALUES (?, ?)',
          [enrollment.student_id, enrollment.class_id]
        );
      } catch (error) {
        console.log('Student enrollment insertion error:', error.message);
      }
    }

    console.log('✅ Sample student enrollments inserted');

    // Insert sample classes (assign lecturers to courses)
    const sampleClasses = [
      {
        course_id: 1, // CS101 - Introduction to Programming
        class_name: 'CS101-A',
        lecturer_id: 2, // John Lecturer
        venue: 'Room 101',
        scheduled_time: '2024-01-15 09:00:00',
        total_registered_students: 30
      },
      {
        course_id: 2, // CS201 - Data Structures
        class_name: 'CS201-B',
        lecturer_id: 2, // John Lecturer
        venue: 'Lab 201',
        scheduled_time: '2024-01-16 13:00:00',
        total_registered_students: 28
      }
    ];

    for (const classData of sampleClasses) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO classes (course_id, class_name, lecturer_id, venue, scheduled_time, total_registered_students) VALUES (?, ?, ?, ?, ?, ?)',
          [classData.course_id, classData.class_name, classData.lecturer_id, classData.venue, classData.scheduled_time, classData.total_registered_students]
        );
      } catch (error) {
        console.log('Class insertion error:', error.message);
      }
    }

    console.log('✅ Sample classes inserted');

    // Insert sample ratings for testing
    const sampleRatings = [
      {
        student_id: 4, // Jane Student
        lecturer_name: 'John Lecturer',
        course_name: 'Introduction to Programming',
        rating: 5,
        review: 'Excellent teaching style and clear explanations!'
      },
      {
        student_id: 4, // Jane Student
        lecturer_name: 'John Lecturer',
        course_name: 'Data Structures',
        rating: 4,
        review: 'Good course content, but could use more practical examples.'
      }
    ];

    for (const rating of sampleRatings) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO ratings (student_id, lecturer_name, course_name, rating, review) VALUES (?, ?, ?, ?, ?)',
          [rating.student_id, rating.lecturer_name, rating.course_name, rating.rating, rating.review]
        );
      } catch (error) {
        console.log('Rating insertion error:', error.message);
      }
    }

    console.log('✅ Sample ratings inserted');

    connection.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LUCT Reporting System API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/login, /api/register',
      reports: '/api/reports',
      lectureReports: '/api/lecture-reports',
      ratings: '/api/ratings',
      courses: '/api/courses',
      users: '/api/users'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({ 
      success: true, 
      message: 'Server is running',
      database: dbStatus ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed: ' + error.message
    });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  let connection;
  try {
    const { name, email, password, role, studentNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (role === 'student' && !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Student number is required for students'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    connection = await pool.getConnection();

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password and insert user
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, student_number)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, studentNumber || null]
    );

    // Get the newly created user
    const [users] = await connection.execute(
      `SELECT user_id, full_name, email, role, student_number, created_at
       FROM users WHERE user_id = ?`,
      [result.insertId]
    );

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    connection = await pool.getConnection();

    // Find user by email
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        student_number: user.student_number,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT user_id, full_name, email, role, student_number, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get users with role 'lecturer'
app.get('/api/users/lecturers', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT user_id, full_name, email, role, student_number, created_at FROM users WHERE role = ? ORDER BY created_at DESC',
      ['lecturer']
    );
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get lecturers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecturers: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get users with role 'lecturer' or 'principal-lecturer'
app.get('/api/lecturers-users', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT user_id, full_name, email, role, student_number, created_at FROM users WHERE role IN (?, ?) ORDER BY created_at DESC',
      ['lecturer', 'principal-lecturer']
    );
    res.json({
      success: true,
      lecturers: users
    });
  } catch (error) {
    console.error('Get lecturers-users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecturers: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== REPORTS ROUTES ====================

// Get all reports
app.get('/api/reports', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [reports] = await connection.execute(
      'SELECT r.*, u.full_name as reviewer_name FROM reports r LEFT JOIN users u ON r.reviewer_id = u.user_id ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create new report
app.post('/api/reports', async (req, res) => {
  let connection;
  try {
    const { title, content, authorId, authorName, status } = req.body;

    if (!title || !content || !authorId || !authorName) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, author ID, and author name are required'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO reports (title, content, author_id, author_name, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, content, authorId, authorName, status || 'pending']
    );

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get single report by ID
app.get('/api/reports/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();

    const [reports] = await connection.execute(
      'SELECT r.*, u.full_name as reviewer_name FROM reports r LEFT JOIN users u ON r.reviewer_id = u.user_id WHERE r.id = ?',
      [id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report: reports[0]
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// [Include all your other API routes here - they remain the same]
// ... (all your other routes for lecture-reports, ratings, courses, classes, etc.)

// Welcome endpoint
app.get('/api/welcome', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the LUCT API Service!',
    database: 'test',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Initialize database when server starts
initializeDatabase();

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Handle all other routes - return API info
app.get('*', (req, res) => {
  res.json({
    success: false,
    message: 'API endpoint not found. Please use /api/ endpoints.',
    availableEndpoints: {
      root: '/',
      health: '/api/health',
      auth: ['/api/login', '/api/register'],
      data: ['/api/users', '/api/reports', '/api/lecture-reports', '/api/ratings', '/api/courses']
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Network: http://0.0.0.0:${PORT}`);
  console.log(`📍 Database: ${dbConfig.database}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await pool.end();
  console.log('MySQL connection pool closed.');
  process.exit(0);
});