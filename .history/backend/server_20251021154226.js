



import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const PORT = process.env.PORT || 8081;

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
app.use(express.static(path.join(__dirname, 'build')));

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'matlali@123',
  database: process.env.DB_NAME || 'luct'
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

    // Create ratings table
    const createRatingsTable = `
      CREATE TABLE IF NOT EXISTS ratings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        lecturer_name VARCHAR(255) NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_lecturer_name (lecturer_name),
        INDEX idx_course_name (course_name)
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

    connection.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ==================== ROUTES ====================

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
    const { title, content, authorId, authorName } = req.body;

    if (!title || !content || !authorId || !authorName) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, author ID, and author name are required'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO reports (title, content, author_id, author_name)
       VALUES (?, ?, ?, ?)`,
      [title, content, authorId, authorName]
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

// Submit feedback on a report (principal-lecturer only)
app.put('/api/reports/:id/feedback', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { feedback, status } = req.body;

    if (req.user.role !== 'principal-lecturer') {
      return res.status(403).json({
        success: false,
        message: 'Only principal-lecturers can submit feedback on reports'
      });
    }

    if (!feedback || !status) {
      return res.status(400).json({
        success: false,
        message: 'Feedback and status are required'
      });
    }

    if (!['approved', 'rejected', 'reviewed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved, rejected, or reviewed'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      'UPDATE reports SET reviewer_id = ?, reviewer_feedback = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id, feedback, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== RATINGS ROUTES ====================

// Get all ratings
app.get('/api/ratings', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [ratings] = await connection.execute(
      'SELECT * FROM ratings ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      ratings: ratings
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create new rating
app.post('/api/ratings', async (req, res) => {
  let connection;
  try {
    const { studentId, lecturerName, courseName, rating, review } = req.body;

    if (!studentId || !lecturerName || !courseName || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, lecturer name, course name, and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO ratings (student_id, lecturer_name, course_name, rating, review)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, lecturerName, courseName, rating, review || null]
    );

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== COURSES ROUTES ====================

// Get all courses
app.get('/api/courses', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [courses] = await connection.execute(`
      SELECT c.*, f.faculty_name 
      FROM courses c 
      LEFT JOIN faculties f ON c.faculty_id = f.faculty_id
      ORDER BY c.created_at DESC
    `);
    res.json({
      success: true,
      courses: courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create new course
app.post('/api/courses', async (req, res) => {
  let connection;
  try {
    const { courseCode, courseName, description, facultyId, credits } = req.body;

    if (!courseCode || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Course code and name are required'
      });
    }

    connection = await pool.getConnection();

    // Check if course code already exists
    const [existingCourses] = await connection.execute(
      'SELECT course_id FROM courses WHERE course_code = ?',
      [courseCode]
    );

    if (existingCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO courses (course_code, course_name, description, faculty_id, credits)
       VALUES (?, ?, ?, ?, ?)`,
      [courseCode, courseName, description || null, facultyId || null, credits || 3]
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== CLASSES ROUTES ====================

// Get all classes
app.get('/api/classes', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [classes] = await connection.execute(`
      SELECT c.*, co.course_name, co.course_code, u.full_name as lecturer_name
      FROM classes c
      JOIN courses co ON c.course_id = co.course_id
      JOIN users u ON c.lecturer_id = u.user_id
      ORDER BY c.scheduled_time ASC
    `);
    res.json({
      success: true,
      classes: classes
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create new class
app.post('/api/classes', async (req, res) => {
  let connection;
  try {
    const { courseId, className, lecturerId, venue, scheduledTime, totalRegisteredStudents } = req.body;

    if (!courseId || !className || !lecturerId || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, class name, lecturer ID, and scheduled time are required'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO classes (course_id, class_name, lecturer_id, venue, scheduled_time, total_registered_students)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, className, lecturerId, venue || null, scheduledTime, totalRegisteredStudents || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create class: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== FEEDBACK ROUTES ====================

// Get all feedback
app.get('/api/feedback', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [feedback] = await connection.execute(`
      SELECT f.*, r.title as report_title, u.full_name as reviewer_name
      FROM feedback f
      JOIN reports r ON f.report_id = r.id
      JOIN users u ON f.reviewer_id = u.user_id
      ORDER BY f.created_at DESC
    `);
    res.json({
      success: true,
      feedback: feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create new feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { reportId, feedbackText, actionItems, priority } = req.body;

    if (!reportId || !feedbackText) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and feedback text are required'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO feedback (report_id, reviewer_id, feedback_text, action_items, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [reportId, req.user.id, feedbackText, actionItems || null, priority || 'medium']
    );

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== STUDENT ENROLLMENT ROUTES ====================

// Get student's enrolled classes
app.get('/api/student/enrollments/:studentId', async (req, res) => {
  let connection;
  try {
    const { studentId } = req.params;
    connection = await pool.getConnection();

    const [enrollments] = await connection.execute(`
      SELECT se.*, c.class_name, co.course_name, co.course_code, u.full_name as lecturer_name
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.class_id
      JOIN courses co ON c.course_id = co.course_id
      JOIN users u ON c.lecturer_id = u.user_id
      WHERE se.student_id = ?
      ORDER BY se.enrollment_date DESC
    `, [studentId]);

    res.json({
      success: true,
      enrollments: enrollments
    });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student enrollments: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Enroll student in class
app.post('/api/student/enroll', async (req, res) => {
  let connection;
  try {
    const { studentId, classId } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and class ID are required'
      });
    }

    connection = await pool.getConnection();

    // Check if already enrolled
    const [existingEnrollment] = await connection.execute(
      'SELECT enrollment_id FROM student_enrollments WHERE student_id = ? AND class_id = ?',
      [studentId, classId]
    );

    if (existingEnrollment.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this class'
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO student_enrollments (student_id, class_id)
       VALUES (?, ?)`,
      [studentId, classId]
    );

    // Update enrolled count in classes table
    await connection.execute(
      'UPDATE classes SET enrolled_count = enrolled_count + 1 WHERE class_id = ?',
      [classId]
    );

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll student: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== MONITORING ROUTES ====================

// Get monitoring data
app.get('/api/monitoring', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Get basic monitoring statistics
    const [userStats] = await connection.execute('SELECT COUNT(*) as total_users FROM users');
    const [courseStats] = await connection.execute('SELECT COUNT(*) as total_courses FROM courses');
    const [classStats] = await connection.execute('SELECT COUNT(*) as total_classes FROM classes');
    const [reportStats] = await connection.execute('SELECT COUNT(*) as total_reports FROM reports');

    const monitoringData = {
      totalUsers: userStats[0].total_users,
      totalCourses: courseStats[0].total_courses,
      totalClasses: classStats[0].total_classes,
      totalReports: reportStats[0].total_reports,
      systemStatus: 'Operational',
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      monitoring: monitoringData
    });
  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring data: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== LECTURERS ROUTES ====================

// Get all lecturers
app.get('/api/lecturers', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [lecturers] = await connection.execute(`
      SELECT l.*, u.full_name, u.email, u.role
      FROM lecturers l
      JOIN users u ON l.user_id = u.user_id
      ORDER BY u.full_name ASC
    `);
    res.json({
      success: true,
      lecturers: lecturers
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

// ==================== FACULTIES ROUTES ====================

// Get all faculties
app.get('/api/faculties', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [faculties] = await connection.execute('SELECT * FROM faculties ORDER BY faculty_name ASC');
    res.json({
      success: true,
      faculties: faculties
    });
  } catch (error) {
    console.error('Get faculties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculties: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Welcome endpoint
app.get('/api/welcome', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the LUCT API Service!',
    database: 'luct',
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

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

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