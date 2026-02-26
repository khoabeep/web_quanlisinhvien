// Tính năng #15: Thời khóa biểu cho Sinh viên
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, BookOpen } from 'lucide-react';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export default function StudentSchedule() {
    const { user } = useAuth();

    const enrollments = useLiveQuery(() => user ? db.enrollments.where({ studentId: user.id }).toArray() : [], [user?.id]) || [];
    const courses = useLiveQuery(() => db.courses.toArray()) || [];
    const schedules = useLiveQuery(() => db.schedules.toArray()) || [];

    const myCourseIds = enrollments.map(e => e.courseId);
    const mySchedules = schedules.filter(s => myCourseIds.includes(s.courseId));

    const today = new Date().getDay();
    const todaySchedules = mySchedules
        .filter(s => s.dayOfWeek === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const byDay = Array.from({ length: 7 }, (_, day) => ({
        day,
        items: mySchedules
            .filter(s => s.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));

    return (
        <div className="animate-in">
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={24} color="var(--primary)" /> Thời Khóa Biểu
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Lịch học của bạn trong tuần</p>

            {/* Lịch hôm nay */}
            {todaySchedules.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>📅 Hôm Nay — {DAY_NAMES[today]}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {todaySchedules.map(s => {
                            const course = courses.find(c => c.id === s.courseId);
                            return (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(79,70,229,0.08)', borderRadius: '10px' }}>
                                    <div style={{ background: 'var(--primary)', color: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
                                        <BookOpen size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{course?.name || 'Lớp không tồn tại'}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={13} /> {s.startTime} – {s.endTime}
                                            {s.room && <span>• Phòng {s.room}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Toàn bộ tuần */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                {byDay.map(({ day, items }) => (
                    <div key={day} className="glass-card" style={{ padding: '1rem', border: day === today ? '2px solid var(--primary)' : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: day === today ? 'var(--primary)' : 'var(--text-main)' }}>
                                {DAY_NAMES[day]}
                            </h4>
                            {day === today && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '1rem' }}>Hôm nay</span>}
                        </div>

                        {items.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '0.75rem 0' }}>Nghỉ học</p>
                        ) : (
                            items.map(s => {
                                const course = courses.find(c => c.id === s.courseId);
                                return (
                                    <div key={s.id} style={{ padding: '0.5rem 0.65rem', background: 'rgba(79,70,229,0.08)', borderRadius: '8px', marginBottom: '0.5rem', borderLeft: '3px solid var(--primary)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>{course?.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {s.startTime} – {s.endTime}{s.room ? ` • ${s.room}` : ''}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ))}
            </div>

            {mySchedules.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p>Giáo viên chưa cập nhật thời khóa biểu cho lớp của bạn.</p>
                </div>
            )}
        </div>
    );
}
