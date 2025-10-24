// StudentDashboard.jsx
import React, { useState, useEffect } from 'react';

function StudentDashboard() {
    const [lecturers, setLecturers] = useState([]);
    const [selectedLecturer, setSelectedLecturer] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [message, setMessage] = useState('');
    const [alreadyRated, setAlreadyRated] = useState([]);

    // Get current student ID from authentication
    const currentStudentId = 1; // Replace with actual auth user ID

    useEffect(() => {
        fetchLecturers();
    }, []);

    useEffect(() => {
        if (selectedLecturer) {
            checkIfAlreadyRated(selectedLecturer);
        }
    }, [selectedLecturer]);

    const fetchLecturers = async () => {
        try {
            const response = await fetch('/api/lecturers');
            const data = await response.json();
            setLecturers(data);
        } catch (error) {
            console.error('Error fetching lecturers:', error);
        }
    };

    const checkIfAlreadyRated = async (lecturerId) => {
        try {
            const response = await fetch(`/api/ratings/check?lecturer_id=${lecturerId}&student_id=${currentStudentId}`);
            const data = await response.json();
            
            if (data.alreadyRated) {
                setAlreadyRated(prev => [...prev, lecturerId]);
            }
        } catch (error) {
            console.error('Error checking rating:', error);
        }
    };

    const submitRating = async () => {
        if (!selectedLecturer) {
            setMessage('Please select a lecturer');
            return;
        }

        if (rating === 0) {
            setMessage('Please select a rating');
            return;
        }

        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lecturer_id: selectedLecturer,
                    student_id: currentStudentId,
                    rating_value: rating,
                    comment: comment
                })
            });

            const result = await response.json();

            if (response.ok) {
                setMessage('Rating submitted successfully!');
                setAlreadyRated(prev => [...prev, selectedLecturer]);
                resetForm();
            } else {
                setMessage(result.error || 'Error submitting rating');
            }
        } catch (error) {
            setMessage('Error submitting rating');
            console.error('Error:', error);
        }
    };

    const resetForm = () => {
        setSelectedLecturer('');
        setRating(0);
        setComment('');
    };

    const getSelectedLecturerName = () => {
        const lecturer = lecturers.find(l => l.id == selectedLecturer);
        return lecturer ? lecturer.name : '';
    };

    return (
        <div className="student-dashboard">
            <h2>Rate Lecturers</h2>
            
            {message && (
                <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="rating-form">
                <div className="form-group">
                    <label htmlFor="lecturer-select">Select Lecturer:</label>
                    <select 
                        id="lecturer-select"
                        value={selectedLecturer}
                        onChange={(e) => setSelectedLecturer(e.target.value)}
                        className="lecturer-dropdown"
                    >
                        <option value="">Choose a lecturer...</option>
                        {lecturers.map(lecturer => (
                            <option 
                                key={lecturer.id} 
                                value={lecturer.id}
                                disabled={alreadyRated.includes(lecturer.id.toString())}
                            >
                                {lecturer.name} {alreadyRated.includes(lecturer.id.toString()) ? '(Already Rated)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedLecturer && !alreadyRated.includes(selectedLecturer) && (
                    <>
                        <div className="form-group">
                            <label>Rating:</label>
                            <div className="rating-stars">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span 
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={star <= rating ? 'active' : ''}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <div className="rating-text">
                                {rating > 0 && `Selected: ${rating} star${rating > 1 ? 's' : ''}`}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="comment">Comment (optional):</label>
                            <textarea 
                                id="comment"
                                placeholder="Add your comments about this lecturer..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows="4"
                            />
                        </div>

                        <button 
                            onClick={submitRating}
                            className="submit-btn"
                            disabled={rating === 0}
                        >
                            Submit Rating
                        </button>
                    </>
                )}

                {selectedLecturer && alreadyRated.includes(selectedLecturer) && (
                    <div className="already-rated">
                        <p>You have already rated {getSelectedLecturerName()}.</p>
                    </div>
                )}
            </div>

            {/* Display lecturers that haven't been rated yet */}
            <div className="lecturers-to-rate">
                <h3>Lecturers Available for Rating</h3>
                {lecturers.filter(lecturer => !alreadyRated.includes(lecturer.id.toString())).length === 0 ? (
                    <p>You have rated all available lecturers!</p>
                ) : (
                    <div className="lecturer-list">
                        {lecturers
                            .filter(lecturer => !alreadyRated.includes(lecturer.id.toString()))
                            .map(lecturer => (
                                <div key={lecturer.id} className="lecturer-item">
                                    {lecturer.name} - {lecturer.email}
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentDashboard;