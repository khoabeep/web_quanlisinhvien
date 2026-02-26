import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BookOpen, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
    const { user } = useAuth();

    // Load khóa học đã đăng ký
    const enrollments = useLiveQuery(() => db.enrollments.where({ studentId: user?.id }).toArray()) || [];
    const courses = useLiveQuery(() => db.courses.toArray()) || [];
    const sessions = useLiveQuery(() => db.attendanceSessions.toArray()) || [];
    const records = useLiveQuery(() => db.attendanceRecords.where({ studentId: user?.id }).toArray()) || [];

    const myCourses = courses.filter(c => enrollments.some(e => e.courseId === c.id));

    // Thống kê chuyên cần của toàn môn
    const totalSessions = sessions.filter(ss => enrollments.some(e => e.courseId === ss.courseId)).length;
    const presentSessions = records.length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    return (
        <div className="animate-in">
            <h1 style={{ marginBottom: '0.5rem' }}>Xin chào, {user?.name}!</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>MSSV: {user?.code}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Đang theo học</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{myCourses.length} Lớp</div>
                    </div>
                </div>

                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px' }}>
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tỉ lệ Điểm Danh</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{attendanceRate}%</div>
                    </div>
                </div>

                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px' }}>
                        <Clock size={32} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Có mặt</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{presentSessions} / {totalSessions}</div>
                    </div>
                </div>
            </div>

            <h3 style={{ marginBottom: '1.5rem' }}>Các lớp đang học</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {myCourses.length === 0 ? (
                    <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                        Bạn chưa được xếp vào lớp học nào.
                    </div>
                ) : (
                    myCourses.map(course => (
                        <div key={course.id} className="glass-card animate-in-up flx flx-col flx-between" style={{ padding: '1.5rem' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{course.name}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{course.description}</p>
                            </div>
                            <Link to={`/student/classes/${course.id}`} className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
                                Truy cập Lớp học <ChevronRight size={18} />
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
