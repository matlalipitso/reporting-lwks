import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: process.env.DB_USER || '46uLvdkuDn4vp8d.root',
  password: process.env.DB_PASSWORD || '1S6GYMwJsPF6nbT6',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT || 4000,
});
db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("✅ MySQL connected successfully!");
  }
});

export default db;
