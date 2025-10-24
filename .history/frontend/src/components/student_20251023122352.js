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

