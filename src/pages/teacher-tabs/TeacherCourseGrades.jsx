import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherCourseGrades({ courseId }) {
    // Tải dữ liệu cần thiết
    const enrollments = useLiveQuery(() => db.enrollments.where({ courseId }).toArray()) || [];
    const sessions = useLiveQuery(() => db.attendanceSessions.where({ courseId }).toArray()) || [];
    const records = useLiveQuery(() => db.attendanceRecords.where({ courseId }).toArray()) || [];
    const allGrades = useLiveQuery(() => db.grades.where({ courseId }).toArray()) || [];

    const [students, setStudents] = useState([]);
    const [editingGrades, setEditingGrades] = useState({});

    // Load học sinh
    useEffect(() => {
        const loadStudents = async () => {
            if (enrollments.length > 0) {
                const sIds = enrollments.map(e => e.studentId);
                const users = await db.users.where('id').anyOf(sIds).toArray();
                setStudents(users);
            } else {
                setStudents([]);
            }
        };
        loadStudents();
    }, [enrollments]);

    // Khởi tạo state edit từ db.grades
    useEffect(() => {
        const initialEdits = {};
        allGrades.forEach(g => {
            initialEdits[g.studentId] = { midtermScore: g.midtermScore || '', finalScore: g.finalScore || '' };
        });
        setEditingGrades(initialEdits);
    }, [allGrades]);

    const handleGradeChange = (studentId, field, value) => {
        setEditingGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSaveRow = async (studentId) => {
        const gradeObj = editingGrades[studentId] || { midtermScore: '', finalScore: '' };
        const mid = parseFloat(gradeObj.midtermScore) || 0;
        const fin = parseFloat(gradeObj.finalScore) || 0;
        const sum = (mid * 0.4) + (fin * 0.6); // Trọng số mặc định: QT 40%, Thi 60%

        let existGrade = await db.grades.where('[courseId+studentId]').equals([courseId, studentId]).first();

        if (existGrade) {
            await db.grades.update(existGrade.id, {
                midtermScore: mid,
                finalScore: fin,
                totalScore: sum
            });
        } else {
            await db.grades.add({
                courseId,
                studentId,
                midtermScore: mid,
                finalScore: fin,
                totalScore: sum
            });
        }
        toast.success("Đã cập nhật điểm");
    };

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '1.5rem' }}>
                <h3>Bảng Điểm Môn Học</h3>
            </div>

            <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                {students.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>MSSV</th>
                                <th style={{ padding: '1rem' }}>Họ Tên</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Chuyên cần</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Điểm Quá trình</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Điểm Thi</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Tổng Kết</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(st => {
                                // Tính điểm chuyên cần
                                const totalSessions = sessions.length;
                                const presentCount = records.filter(r => r.studentId === st.id).length;
                                const attendancePercent = totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 100);

                                // Điểm đã lưu trong DB
                                const dbGrade = allGrades.find(g => g.studentId === st.id);
                                // Điểm đang sửa trên Form
                                const editState = editingGrades[st.id] || { midtermScore: '', finalScore: '' };

                                // Kiểm tra xem có chỉnh sửa chưa lưu không
                                const isDirty = (parseFloat(editState.midtermScore || 0) !== (dbGrade?.midtermScore || 0)) ||
                                    (parseFloat(editState.finalScore || 0) !== (dbGrade?.finalScore || 0));

                                return (
                                    <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{st.code}</td>
                                        <td style={{ padding: '1rem' }}>{st.name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: attendancePercent >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: attendancePercent >= 80 ? 'var(--success)' : 'var(--danger)'
                                            }}>
                                                {presentCount}/{totalSessions} ({attendancePercent}%)
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <input
                                                type="number" step="0.5" min="0" max="10"
                                                className="input-field"
                                                style={{ width: '60px', padding: '0.4rem', textAlign: 'center' }}
                                                value={editState.midtermScore}
                                                onChange={e => handleGradeChange(st.id, 'midtermScore', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <input
                                                type="number" step="0.5" min="0" max="10"
                                                className="input-field"
                                                style={{ width: '60px', padding: '0.4rem', textAlign: 'center' }}
                                                value={editState.finalScore}
                                                onChange={e => handleGradeChange(st.id, 'finalScore', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {dbGrade ? dbGrade.totalScore.toFixed(1) : '-'}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {isDirty ? (
                                                <button onClick={() => handleSaveRow(st.id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                                                    <Save size={14} /> Lưu
                                                </button>
                                            ) : (
                                                <button disabled className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', opacity: 0.5 }}>
                                                    <CheckCircle size={14} /> Đã lưu
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Danh sách sinh viên trống. Hãy thêm sinh viên vào lớp trước khi nhập điểm.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
