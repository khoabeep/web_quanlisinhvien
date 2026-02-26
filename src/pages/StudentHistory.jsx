import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { History, CheckCircle, XCircle, Filter, Download, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StudentHistory() {
    const { user } = useAuth();

    // Tính năng #10: Bộ lọc
    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all'); // all, present, absent
    const [filterMonth, setFilterMonth] = useState('all');

    const enrollments = useLiveQuery(() => db.enrollments.where({ studentId: user?.id }).toArray()) || [];
    const courses = useLiveQuery(() => db.courses.toArray()) || [];
    const sessions = useLiveQuery(() => db.attendanceSessions.toArray()) || [];
    const records = useLiveQuery(() => db.attendanceRecords.where({ studentId: user?.id }).toArray()) || [];

    const myCourseIds = enrollments.map(e => e.courseId);
    const myCourses = courses.filter(c => myCourseIds.includes(c.id));
    const mySessions = sessions.filter(ss => myCourseIds.includes(ss.courseId));

    // Các tháng có dữ liệu
    const months = useMemo(() => {
        const set = new Set(mySessions.map(ss => ss.date?.slice(0, 7)));
        return Array.from(set).sort().reverse();
    }, [mySessions]);

    // Áp dụng bộ lọc
    const filteredSessions = useMemo(() => {
        return mySessions
            .filter(ss => filterCourse === 'all' || ss.courseId === parseInt(filterCourse))
            .filter(ss => filterMonth === 'all' || ss.date?.startsWith(filterMonth))
            .filter(ss => {
                if (filterStatus === 'all') return true;
                const hasRecord = records.some(r => r.sessionId === ss.id);
                return filterStatus === 'present' ? hasRecord : !hasRecord;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [mySessions, records, filterCourse, filterMonth, filterStatus]);

    // Tỷ lệ điểm danh
    const totalSessions = mySessions.length;
    const presentCount = records.length;
    const absentCount = totalSessions - presentCount;
    const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

    const pieData = [
        { name: 'Có mặt', value: presentCount, color: 'var(--success)' },
        { name: 'Vắng', value: absentCount, color: 'var(--danger)' },
    ];

    // Xuất CSV
    const exportCSV = () => {
        let csv = 'Ngày,Môn học,Giờ điểm danh,Trạng thái\n';
        filteredSessions.forEach(ss => {
            const course = courses.find(c => c.id === ss.courseId);
            const record = records.find(r => r.sessionId === ss.id);
            csv += `${new Date(ss.date).toLocaleDateString('vi-VN')},"${course?.name || ''}",${record ? new Date(record.timestamp).toLocaleTimeString('vi-VN') : '-'},${record ? 'Có mặt' : 'Vắng'}\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Diem-Danh-CaNhan-${user?.code}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <History size={24} color="var(--primary)" /> Lịch Sử Điểm Danh
                </h2>
                <button className="btn btn-outline" onClick={exportCSV} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <Download size={16} /> Xuất CSV
                </button>
            </div>

            {/* Tính năng #8: Cảnh báo vắng nhiều */}
            {rate < 80 && totalSessions > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)' }}>
                    <AlertTriangle size={20} />
                    <div>
                        <strong>⚠️ Cảnh báo chuyên cần!</strong>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                            Tỷ lệ điểm danh của bạn là <strong>{rate}%</strong>, thấp hơn ngưỡng quy định 80%. Bạn cần cải thiện chuyên cần để đủ điều kiện thi.
                        </p>
                    </div>
                </div>
            )}

            {/* Thống kê nhanh + biểu đồ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 200px', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)' }}>{totalSessions}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng buổi học</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>{presentCount}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Có mặt</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: rate < 80 ? 'var(--danger)' : 'var(--warning)' }}>{rate}%</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tỷ lệ</div>
                </div>
                {totalSessions > 0 && (
                    <div className="glass-card" style={{ padding: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={100}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={40} paddingAngle={2}>
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v} buổi`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Tính năng #10: Bộ lọc */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={16} color="var(--text-muted)" />
                <select className="input-field" style={{ maxWidth: 200 }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                    <option value="all">— Tất cả môn —</option>
                    {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input-field" style={{ maxWidth: 160 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                    <option value="all">— Tất cả tháng —</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="input-field" style={{ maxWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="present">Có mặt</option>
                    <option value="absent">Vắng</option>
                </select>
                {(filterCourse !== 'all' || filterMonth !== 'all' || filterStatus !== 'all') && (
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => { setFilterCourse('all'); setFilterMonth('all'); setFilterStatus('all'); }}>
                        ✕ Xóa bộ lọc
                    </button>
                )}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {filteredSessions.length} buổi
                </span>
            </div>

            <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                {filteredSessions.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Không có dữ liệu phù hợp với bộ lọc.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Ngày Học</th>
                                <th style={{ padding: '1rem' }}>Môn Học</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Giờ Điểm Danh</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSessions.map(ss => {
                                const course = courses.find(c => c.id === ss.courseId);
                                const record = records.find(r => r.sessionId === ss.id);
                                return (
                                    <tr key={ss.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>
                                            {new Date(ss.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--primary)' }}>
                                            {course ? course.name : 'Môn học đã xóa'}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {record ? new Date(record.timestamp).toLocaleTimeString('vi-VN') : '—'}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {record ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', fontWeight: 500, fontSize: '0.85rem' }}>
                                                    <CheckCircle size={16} /> Có mặt
                                                    {record.method && record.method !== 'qr' && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({record.method === 'face' ? 'AI' : 'thủ công'})</span>}
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontWeight: 500, fontSize: '0.85rem' }}>
                                                    <XCircle size={16} /> Vắng
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
