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

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors());
app.use(express.json());

// Database configuration
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
    if (!connected) return;

    const connection = await pool.getConnection();

    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'lecturer', 'principal-lecturer', 'project-manager') NOT NULL DEFAULT 'student',
        student_number VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )`,
      `CREATE TABLE IF NOT EXISTS faculties (
        faculty_id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_name VARCHAR(100) NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_code VARCHAR(50) NOT NULL UNIQUE,
        course_name VARCHAR(255) NOT NULL,
        description TEXT,
        faculty_id INT,
        credits INT DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_course_code (course_code)
      )`,
      `CREATE TABLE IF NOT EXISTS classes (
        class_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        lecturer_id INT NOT NULL,
        venue VARCHAR(100),
        scheduled_time DATETIME NOT NULL,
        total_registered_students INT,
        INDEX idx_course_id (course_id)
      )`,
      `CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INT NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        reviewer_id INT,
        reviewer_feedback TEXT,
        status ENUM('pending','reviewed','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_author_id (author_id)
      )`,
      `CREATE TABLE IF NOT EXISTS lecture_reports (
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
        status ENUM('pending','reviewed','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_author_id (author_id)
      )`,
      `CREATE TABLE IF NOT EXISTS ratings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        lecturer_name VARCHAR(255) NULL,
        course_name VARCHAR(255) NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id)
      )`
    ];

    for (let i = 0; i < tables.length; i++) {
      await connection.execute(tables[i]);
      console.log(`✅ Table ${i + 1} ready`);
    }

    // Insert sample data
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
        console.log(`User ${user.email} already exists`);
      }
    }

    console.log('✅ Test users inserted');
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
      message: 'Health check failed'
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
      `INSERT INTO users (full_name, email, password_hash, role, student_number) VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, studentNumber || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email: email, role: role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        student_number: user.student_number
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
      message: 'Failed to fetch users'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [reports] = await connection.execute(
      'SELECT * FROM reports ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
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
      `INSERT INTO reports (title, content, author_id, author_name) VALUES (?, ?, ?, ?)`,
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
      message: 'Failed to create report'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get all lecture reports
app.get('/api/lecture-reports', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [reports] = await connection.execute(
      'SELECT * FROM lecture_reports ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('Get lecture reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecture reports'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create lecture report
app.post('/api/lecture-reports', async (req, res) => {
  let connection;
  try {
    const {
      facultyName,
      className,
      weekOfReporting,
      dateOfLecture,
      courseName,
      courseCode,
      lecturerName,
      actualStudentsPresent,
      totalRegisteredStudents,
      topicTaught,
      learningOutcomes,
      authorId
    } = req.body;

    if (!facultyName || !className || !weekOfReporting || !dateOfLecture || !courseName || !courseCode || !lecturerName || !actualStudentsPresent || !totalRegisteredStudents || !topicTaught || !learningOutcomes || !authorId) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO lecture_reports (
        faculty_name, class_name, week_of_reporting, date_of_lecture,
        course_name, course_code, lecturer_name, actual_students_present,
        total_registered_students, topic_taught, learning_outcomes, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        facultyName, className, weekOfReporting, dateOfLecture,
        courseName, courseCode, lecturerName, actualStudentsPresent,
        totalRegisteredStudents, topicTaught, learningOutcomes, authorId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Lecture report created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create lecture report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lecture report'
    });
  } finally {
    if (connection) connection.release();
  }
});

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
      message: 'Failed to fetch ratings'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Create rating
app.post('/api/ratings', async (req, res) => {
  let connection;
  try {
    const { studentId, lecturerName, rating, review } = req.body;

    if (!studentId || !lecturerName || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, lecturer name, and rating are required'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `INSERT INTO ratings (student_id, lecturer_name, rating, review) VALUES (?, ?, ?, ?)`,
      [studentId, lecturerName, rating, review || null]
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
      message: 'Failed to submit rating'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Handle all other routes
app.get('*', (req, res) => {
  res.json({
    success: false,
    message: 'API endpoint not found. Please use /api/ endpoints.',
    availableEndpoints: [
      '/api/health',
      '/api/register',
      '/api/login', 
      '/api/users',
      '/api/reports',
      '/api/lecture-reports',
      '/api/ratings'
    ]
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await pool.end();
  process.exit(0);
});