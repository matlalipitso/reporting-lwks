import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'matlali@123',
  database: process.env.DB_NAME || 'luct',
  port: process.env.DB_PORT || 3306,
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("✅ MySQL connected successfully!");
  }
});

export default db;
