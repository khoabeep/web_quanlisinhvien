import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Download, FileText, Users, Search, CheckCircle, XCircle, BarChart2, AlertTriangle, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

export default function Reports() {
    const { user, isAdmin } = useAuth();
    const classes = useLiveQuery(
        () => isAdmin ? db.courses.toArray() : db.courses.where({ teacherId: user?.id }).toArray(),
        [isAdmin, user?.id]
    );
    const allSessions = useLiveQuery(() => db.attendanceSessions.toArray());
    const sessions = useMemo(() => {
        if (!allSessions || !classes) return [];
        const ids = new Set(classes.map(c => c.id));
        return allSessions.filter(ss => ids.has(ss.courseId));
    }, [allSessions, classes]);
    const allRecords = useLiveQuery(() => db.attendanceRecords.toArray());
    const records = useMemo(() => {
        if (!allRecords || !sessions) return [];
        const ids = new Set(sessions.map(ss => ss.id));
        return allRecords.filter(r => ids.has(r.sessionId));
    }, [allRecords, sessions]);
    const students = useLiveQuery(() => db.users.where({ role: 'student' }).toArray());
    const enrollments = useLiveQuery(() => db.enrollments.toArray());

    const [activeTab, setActiveTab] = useState('sessions');
    const [search, setSearch] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [chartView, setChartView] = useState('weekly'); // weekly | monthly | course

    // Tính năng #8: Số lượng sinh viên dưới 80%
    const alertCount = useMemo(() => {
        if (!students || !sessions || !records || !enrollments) return 0;
        return students.filter(st => {
            const myEnrs = enrollments.filter(e => e.studentId === st.id);
            const mySessions = sessions.filter(ss => myEnrs.some(e => e.courseId === ss.courseId));
            if (mySessions.length === 0) return false;
            const myRecords = records.filter(r => r.studentId === st.id && mySessions.some(ss => ss.id === r.sessionId));
            return (myRecords.length / mySessions.length) < 0.8;
        }).length;
    }, [students, sessions, records, enrollments]);

    // Tính năng #7: Dữ liệu biểu đồ theo tuần/tháng/môn
    const chartData = useMemo(() => {
        if (!sessions || !records) return [];
        if (chartView === 'weekly') {
            const map = {};
            sessions.forEach(ss => {
                const d = new Date(ss.date);
                // ISO week
                const day = d.getDay() || 7;
                const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
                const key = mon.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                if (!map[key]) map[key] = { label: key, sessions: 0, attendances: 0 };
                map[key].sessions++;
                map[key].attendances += records.filter(r => r.sessionId === ss.id).length;
            });
            return Object.values(map).slice(-8);
        }
        if (chartView === 'monthly') {
            const map = {};
            sessions.forEach(ss => {
                const key = ss.date?.slice(0, 7) || '?';
                const label = key.split('-').reverse().join('/');
                if (!map[key]) map[key] = { label, sessions: 0, attendances: 0 };
                map[key].sessions++;
                map[key].attendances += records.filter(r => r.sessionId === ss.id).length;
            });
            return Object.values(map).slice(-6);
        }
        if (chartView === 'course') {
            return (classes || []).map(c => {
                const cSessions = sessions.filter(ss => ss.courseId === c.id);
                const cRecords = records.filter(r => cSessions.some(ss => ss.id === r.sessionId));
                return { label: c.name.length > 16 ? c.name.slice(0, 14) + '…' : c.name, sessions: cSessions.length, attendances: cRecords.length };
            }).filter(c => c.sessions > 0);
        }
        return [];
    }, [sessions, records, classes, chartView]);

    // Xuat CSV cho 1 phien diem danh cu the
    const exportSessionCSV = (sessionId) => {
        if (!records || !students) return;
        const sessionRecords = records.filter(r => r.sessionId === sessionId);
        let csv = 'Mã SV,Họ Tên,Trạng Thái,Thời Gian Điểm Danh\n';
        sessionRecords.forEach(rec => {
            const student = students.find(s => s.id === rec.studentId);
            if (student) {
                csv += `${student.code},"${student.name}",Co Mat,${new Date(rec.timestamp).toLocaleString('vi-VN')}\n`;
            }
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Diem-Danh-Phien-${sessionId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Xuat Excel tong hop chuyen can toan bo sinh vien
    const exportStudentReportExcel = () => {
        if (!students || !sessions || !records) return;
        const rows = students.map(st => {
            const myEnrs = (enrollments || []).filter(e => e.studentId === st.id);
            const mySessions = (sessions || []).filter(ss => myEnrs.some(e => e.courseId === ss.courseId));
            const myRecords = (records || []).filter(r => r.studentId === st.id);
            const rate = mySessions.length > 0 ? Math.round((myRecords.length / mySessions.length) * 100) : 100;
            return {
                'MSSV': st.code,
                'Họ Tên': st.name,
                'Số buổi học': mySessions.length,
                'Số buổi có mặt': myRecords.length,
                'Số buổi vắng': mySessions.length - myRecords.length,
                'Tỉ lệ (%)': rate,
                'Đạt chuẩn (>=80%)': rate >= 80 ? 'Đạt' : 'Không đạt'
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Chuyên Cần Sinh Viên');
        XLSX.writeFile(wb, 'Bao-Cao-Chuyen-Can-Sinh-Vien.xlsx');
    };

    // Tinh bao cao chuyen can tung sinh vien (co filter lop & tim kiem)
    const studentReport = useMemo(() => {
        if (!students || !sessions || !records || !enrollments) return [];
        return students.map(st => {
            const myEnrs = enrollments.filter(e => e.studentId === st.id);
            const filteredCourseIds = selectedCourse === 'all'
                ? myEnrs.map(e => e.courseId)
                : myEnrs.filter(e => e.courseId === parseInt(selectedCourse)).map(e => e.courseId);
            const mySessions = sessions.filter(ss => filteredCourseIds.includes(ss.courseId));
            const myRecords = records.filter(r => r.studentId === st.id && mySessions.some(ss => ss.id === r.sessionId));
            const rate = mySessions.length > 0 ? Math.round((myRecords.length / mySessions.length) * 100) : null;
            return {
                ...st,
                totalSessions: mySessions.length,
                presentCount: myRecords.length,
                absentCount: mySessions.length - myRecords.length,
                rate
            };
        }).filter(st => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return st.name.toLowerCase().includes(q) || st.code.toLowerCase().includes(q);
        }).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
    }, [students, sessions, records, enrollments, search, selectedCourse]);

    // Tính năng #9: Xuất PDF bằng window.print()
    const exportPDF = () => {
        window.print();
    };

    return (
        <div className="animate-in">
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Báo Cáo Hệ Thống</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Thống kê điểm danh, biểu đồ xu hướng và xuất báo cáo.
                    </p>
                </div>
                {/* Tính năng #8: Badge cảnh báo */}
                {alertCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                        <AlertTriangle size={18} />
                        <span style={{ fontWeight: 600 }}>{alertCount} sinh viên</span>
                        <span style={{ fontSize: '0.85rem' }}>dưới 80% chuyên cần</span>
                    </div>
                )}
            </div>

            {/* Tính năng #7: Tab biểu đồ */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={18} color="var(--primary)" /> Biểu Đồ Xu Hướng Điểm Danh
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[['weekly', 'Theo tuần'], ['monthly', 'Theo tháng'], ['course', 'Theo môn']].map(([v, l]) => (
                            <button key={v} className={`btn ${chartView === v ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                onClick={() => setChartView(v)}>{l}</button>
                        ))}
                        <button className="btn btn-outline" onClick={exportPDF} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            <Printer size={14} /> In PDF
                        </button>
                    </div>
                </div>
                {chartData.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Chưa có dữ liệu để vẽ biểu đồ.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData} barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="sessions" name="Tổng buổi" fill="var(--primary)" radius={[4,4,0,0]} />
                            <Bar dataKey="attendances" name="Lượt có mặt" fill="var(--success)" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Tab chon loai bao cao */}
            <div className="flx gap-2" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <button
                    className={`btn ${activeTab === 'sessions' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    <FileText size={18} /> Theo Phiên Điểm Danh
                </button>
                <button
                    className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('students')}
                >
                    <Users size={18} /> Theo Sinh Viên
                </button>
            </div>

            {/* ===== TAB 1: THEO PHIEN ===== */}
            {activeTab === 'sessions' && (
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        Lịch Sử Điểm Danh Theo Phiên
                    </h3>

                    {(!sessions || sessions.length === 0) ? (
                        <p style={{ color: 'var(--text-muted)' }}>Chưa có phiên điểm danh nào.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem' }}>Thời Gian</th>
                                        <th style={{ padding: '1rem' }}>Lớp Học</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>SV Có Mặt</th>
                                        <th style={{ padding: '1rem' }}>Trạng Thái</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...sessions]
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(ss => {
                                            const cls = classes?.find(c => c.id === ss.courseId);
                                            const recCount = records?.filter(r => r.sessionId === ss.id).length || 0;
                                            return (
                                                <tr key={ss.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                                        {new Date(ss.date).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {cls
                                                            ? cls.name
                                                            : <span style={{ color: 'var(--text-muted)' }}>Lớp đã xóa</span>}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>
                                                        {recCount}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {ss.status === 'closed'
                                                            ? <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Đã chốt</span>
                                                            : <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 500 }}>🟢 Đang mở</span>}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            onClick={() => exportSessionCSV(ss.id)}
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                        >
                                                            <Download size={14} /> Xuất CSV
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB 2: THEO SINH VIEN ===== */}
            {activeTab === 'students' && (
                <div>
                    {/* Bo loc & nut xuat */}
                    <div className="flx flx-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div className="flx gap-2" style={{ flex: 1, flexWrap: 'wrap' }}>
                            <select
                                className="input-field"
                                style={{ maxWidth: 220 }}
                                value={selectedCourse}
                                onChange={e => setSelectedCourse(e.target.value)}
                            >
                                <option value="all">— Tất cả lớp học —</option>
                                {(classes || []).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                                <Search
                                    size={15}
                                    style={{
                                        position: 'absolute', top: '50%', left: '0.8rem',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
                                    }}
                                />
                                <input
                                    className="input-field"
                                    placeholder="Tìm sinh viên theo tên, mã SV..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ paddingLeft: '2.4rem' }}
                                />
                            </div>
                        </div>
                        <button className="btn btn-outline" onClick={exportStudentReportExcel}>
                            <Download size={16} /> Xuất Excel
                        </button>
                    </div>

                    {/* Bang du lieu */}
                    <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                        {studentReport.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Chưa có dữ liệu sinh viên để hiển thị.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem' }}>MSSV</th>
                                        <th style={{ padding: '1rem' }}>Họ Tên</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Tổng Buổi</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Có Mặt</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Vắng</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Tỉ Lệ</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Đạt Chuẩn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentReport.map(st => {
                                        const rate = st.rate;
                                        const isPassing = rate === null || rate >= 80;
                                        const isAlert = rate !== null && rate < 80;
                                        return (
                                            <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)', background: isAlert ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>
                                                    {isAlert && <AlertTriangle size={13} color="var(--danger)" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                                                    {st.code}
                                                </td>
                                                <td style={{ padding: '1rem' }}>{st.name}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{st.totalSessions}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                                                    {st.presentCount}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: st.absentCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                    {st.absentCount}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    {rate !== null ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: `${rate}%`, height: '100%',
                                                                    background: rate >= 80 ? 'var(--success)' : 'var(--danger)',
                                                                    borderRadius: 3
                                                                }} />
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: rate >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                                                                {rate}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    {rate !== null ? (
                                                        isPassing
                                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 500, fontSize: '0.85rem' }}>
                                                                <CheckCircle size={14} /> Đạt
                                                            </span>
                                                            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontWeight: 500, fontSize: '0.85rem' }}>
                                                                <XCircle size={14} /> Không đạt
                                                            </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có buổi</span>
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
            )}
        </div>
    );
}
