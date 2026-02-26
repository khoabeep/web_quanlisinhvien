import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Users, UserCheck, Activity, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user, isAdmin } = useAuth();

    // Admin xem toàn bộ, teacher chỉ xem lớp của mình
    const myCourses = useLiveQuery(
        () => isAdmin ? db.courses.toArray() : db.courses.where({ teacherId: user?.id }).toArray(),
        [isAdmin, user?.id]
    ) || [];

    const myCourseIds = useMemo(() => myCourses.map(c => c.id), [myCourses]);

    const studentsCount = useLiveQuery(() => db.users.where({ role: 'student' }).count()) || 0;
    const allSessions = useLiveQuery(() => db.attendanceSessions.toArray()) || [];
    const allRecords = useLiveQuery(() => db.attendanceRecords.toArray()) || [];

    // Lọc phiên và bản ghi theo lớp của giảng viên
    const sessions = useMemo(() => allSessions.filter(ss => myCourseIds.includes(ss.courseId)), [allSessions, myCourseIds]);
    const records = useMemo(() => allRecords.filter(r => sessions.some(ss => ss.id === r.sessionId)), [allRecords, sessions]);

    const classesCount = myCourses.length;
    const sessionsCount = sessions.length;

    // Chart data thực tế: thống kê số sinh viên có mặt theo 7 ngày gần nhất
    const chartData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const dayEnd = dayStart + 86400000;

            const sessionsOnDay = sessions.filter(ss => {
                const t = new Date(ss.date).getTime();
                return t >= dayStart && t < dayEnd;
            });
            const presentCount = records.filter(r => {
                const t = new Date(r.timestamp).getTime();
                return t >= dayStart && t < dayEnd;
            }).length;

            days.push({
                name: dateStr,
                'Có mặt': presentCount,
                'Phiên': sessionsOnDay.length
            });
        }
        return days;
    }, [sessions, records]);

    // Tỉ lệ điểm danh tổng thể
    const overallRate = useMemo(() => {
        if (!sessions.length) return 0;
        const uniqueStudentsInSessions = studentsCount;
        const totalExpected = sessions.length * uniqueStudentsInSessions;
        if (!totalExpected) return 0;
        return Math.round((records.length / totalExpected) * 100);
    }, [sessions, records, studentsCount]);

    return (
        <div className="animate-in">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {isAdmin
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={28} color="var(--primary)" /> Tổng Quan Quản Trị</span>
                        : 'Chào mừng trở lại! 👋'}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    {isAdmin
                        ? 'Bảng điều khiển toàn hệ thống — xem tổng quan tất cả giảng viên.'
                        : `Đang hiển thị dữ liệu cho ${classesCount} lớp học của bạn.`}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{studentsCount}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Tổng số Sinh viên</p>
                    </div>
                </div>

                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
                        <UserCheck size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{classesCount}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{isAdmin ? 'Tổng số Lớp học' : 'Lớp học của bạn'}</p>
                    </div>
                </div>

                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: 'var(--radius-md)' }}>
                        <Activity size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{sessionsCount}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{isAdmin ? 'Tổng phiên điểm danh' : 'Phiên điểm danh của bạn'}</p>
                    </div>
                </div>

                <div className="glass-card flx gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: 'var(--radius-md)' }}>
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{overallRate}%</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Tỉ lệ chuyên cần</p>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ height: 380, paddingTop: '1rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Thống kê điểm danh 7 ngày gần nhất</h3>
                {records.length === 0 ? (
                    <div className="flx flx-center" style={{ height: '80%', color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem' }}>
                        <Activity size={48} style={{ opacity: 0.2 }} />
                        <p>Chưa có dữ liệu điểm danh.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }} />
                            <Bar dataKey="Có mặt" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Phiên" fill="rgba(236,72,153,0.5)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div style={{ marginTop: '2.5rem' }}>
                <Link to="/teacher/classes" className="btn btn-primary">Bắt Đầu Điểm Danh Ngay →</Link>
            </div>
        </div>
    );
}
