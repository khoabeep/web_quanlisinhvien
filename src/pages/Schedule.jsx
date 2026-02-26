// Tính năng #15: Lịch học cho Giáo viên
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const HOURS = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

export default function Schedule() {
    const courses = useLiveQuery(() => db.courses.toArray()) || [];
    const schedules = useLiveQuery(() => db.schedules.toArray()) || [];

    const [showForm, setShowForm] = useState(false);
    const [selCourse, setSelCourse] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('09:00');
    const [room, setRoom] = useState('');

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!selCourse) return toast.error('Vui lòng chọn lớp học!');
        await db.schedules.add({
            courseId: parseInt(selCourse),
            dayOfWeek: parseInt(dayOfWeek),
            startTime,
            endTime,
            room: room.trim(),
            createdAt: new Date().toISOString()
        });
        toast.success('Đã thêm lịch học!');
        setShowForm(false);
        setRoom('');
    };

    const handleDelete = async (id) => {
        await db.schedules.delete(id);
        toast.success('Đã xóa lịch học');
    };

    // Nhóm lịch theo ngày
    const byDay = Array.from({ length: 7 }, (_, day) => ({
        day,
        items: schedules
            .filter(s => s.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));

    // Ngày hiện tại (0-6)
    const today = new Date().getDay();

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={24} color="var(--primary)" /> Thời Khóa Biểu
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Lịch giảng dạy theo tuần</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={18} /> Thêm Lịch
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Thêm Lịch Học Mới</h3>
                    <form className="flx gap-4" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={handleAdd}>
                        <div style={{ flex: '2 1 200px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lớp học *</label>
                            <select className="input-field" value={selCourse} onChange={e => setSelCourse(e.target.value)} required>
                                <option value="">— Chọn lớp —</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 130px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thứ *</label>
                            <select className="input-field" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 110px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Giờ bắt đầu</label>
                            <input type="time" className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)} />
                        </div>
                        <div style={{ flex: '1 1 110px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Giờ kết thúc</label>
                            <input type="time" className="input-field" value={endTime} onChange={e => setEndTime(e.target.value)} />
                        </div>
                        <div style={{ flex: '1 1 130px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phòng học</label>
                            <input className="input-field" placeholder="VD: P.301" value={room} onChange={e => setRoom(e.target.value)} />
                        </div>
                        <div className="flx gap-2">
                            <button type="submit" className="btn btn-primary">Lưu</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Grid thời khóa biểu */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {byDay.map(({ day, items }) => (
                    <div key={day} className="glass-card" style={{ padding: '1rem', border: day === today ? '2px solid var(--primary)' : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, color: day === today ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.95rem' }}>
                                {DAY_NAMES[day]}
                            </h4>
                            {day === today && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '1rem' }}>Hôm nay</span>}
                        </div>

                        {items.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>Không có lịch</p>
                        ) : (
                            items.map(s => {
                                const course = courses.find(c => c.id === s.courseId);
                                return (
                                    <div key={s.id} style={{ padding: '0.6rem 0.75rem', background: 'rgba(79,70,229,0.08)', borderRadius: '8px', marginBottom: '0.5rem', borderLeft: '3px solid var(--primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>{course?.name || 'Lớp đã xóa'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                    <Clock size={11} /> {s.startTime} – {s.endTime}
                                                    {s.room && <span style={{ marginLeft: 4 }}>• {s.room}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ))}
            </div>

            {schedules.length === 0 && !showForm && (
                <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p>Chưa có lịch học nào. Nhấn "Thêm Lịch" để bắt đầu.</p>
                </div>
            )}
        </div>
    );
}
