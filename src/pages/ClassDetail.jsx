import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, UserPlus, Trash2, QrCode, FileSpreadsheet, Upload, Camera } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import TeacherCourseMaterials from './teacher-tabs/TeacherCourseMaterials';
import TeacherCourseAssignments from './teacher-tabs/TeacherCourseAssignments';
import TeacherCourseGrades from './teacher-tabs/TeacherCourseGrades';
import TeacherCourseAnnouncements from './teacher-tabs/TeacherCourseAnnouncements';
import FaceRegistrationModal from '../components/FaceRegistrationModal';
import Discussion from '../components/Discussion';

export default function ClassDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const courseId = parseInt(id, 10);
    const { user, isAdmin } = useAuth();

    const cls = useLiveQuery(() => db.courses.get(courseId));
    const enrollments = useLiveQuery(() => db.enrollments.where({ courseId }).toArray()) || [];
    const sessions = useLiveQuery(() => db.attendanceSessions.where({ courseId }).toArray()) || [];

    // Chúng ta phải load users thủ công thay vì useLiveQuery vì nó cần async lookup
    const [students, setStudents] = useState([]);

    useEffect(() => {
        const loadStudents = async () => {
            if (enrollments && enrollments.length > 0) {
                const studentIds = enrollments.map(e => e.studentId);
                const users = await db.users.where('id').anyOf(studentIds).toArray();
                setStudents(users);
            } else {
                setStudents([]);
            }
        };
        loadStudents();
    }, [enrollments]);

    const [showAddStudent, setShowAddStudent] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentCode, setNewStudentCode] = useState('');
    const [activeTab, setActiveTab] = useState('students');
    const [registerFaceStudent, setRegisterFaceStudent] = useState(null);

    if (cls === undefined) return <div className="animate-in">Đang tải dữ liệu...</div>;
    if (cls === null) return <div className="animate-in text-danger">Không tìm thấy Lớp học này!</div>;

    // Ownership guard: teacher có thể XEM nhưng không phải của mình thì redirect về danh sách lớp
    if (!isAdmin && cls.teacherId && cls.teacherId !== user?.id) {
        return <Navigate to="/teacher/classes" replace />;
    }

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const code = newStudentCode.trim().toUpperCase();
        if (!newStudentName.trim() || !code) return;

        // Kiểm tra Sinh viên này trong hệ thống có chưa
        let user = await db.users.where('code').equals(code).first();

        // Nêu chưa thì tạo User mới
        if (!user) {
            const newUserId = await db.users.add({
                code: code,
                username: code.toLowerCase(),
                password: '123', // Default
                role: 'student',
                name: newStudentName,
                createdAt: new Date().toISOString()
            });
            user = { id: newUserId, code, name: newStudentName };
        }

        // Kiểm tra xem đã enroll chưa
        const isEnrolled = await db.enrollments.where('[courseId+studentId]').equals([courseId, user.id]).first();
        if (!isEnrolled) {
            await db.enrollments.add({
                courseId,
                studentId: user.id,
                status: 'active',
                enrolledAt: new Date().toISOString()
            });
            toast.success(`Đã thêm SV ${code} vào lớp thành công!`);
        } else {
            toast.error('Sinh viên này đã có trong lớp rồi!');
        }

        setNewStudentName('');
        setNewStudentCode('');
        setShowAddStudent(false);
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm("Xác nhận xóa sinh viên này khỏi lớp? (Chỉ xóa khỏi danh sách điểm danh môn này)")) {
            // Xóa ở bảng enrollments
            const enrollment = await db.enrollments.where('[courseId+studentId]').equals([courseId, studentId]).first();
            if (enrollment) {
                await db.enrollments.delete(enrollment.id);
                toast.success('Đã xóa khỏi lớp');
            }
        }
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // Parse theo Array các Objects. Excel cột A: MSSV, B: Họ Tên
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: ["code", "name"] });

                // Bỏ dòng tiêu đề nếu dòng 1 là Header
                const dataRows = jsonData.filter((r, idx) => idx > 0 || (r.code && r.code.toUpperCase() !== 'MSSV' && r.code.toUpperCase() !== 'MÃ SV'));

                let addedCount = 0;
                for (const row of dataRows) {
                    if (!row.code || !row.name) continue;

                    const code = String(row.code).trim().toUpperCase();
                    const name = String(row.name).trim();

                    let user = await db.users.where('code').equals(code).first();
                    if (!user) {
                        const newUserId = await db.users.add({
                            code: code,
                            username: code.toLowerCase(),
                            password: '123',
                            role: 'student',
                            name: name,
                            createdAt: new Date().toISOString()
                        });
                        user = { id: newUserId };
                    }

                    const isEnrolled = await db.enrollments.where('[courseId+studentId]').equals([courseId, user.id]).first();
                    if (!isEnrolled) {
                        await db.enrollments.add({ courseId, studentId: user.id, status: 'active', enrolledAt: new Date().toISOString() });
                        addedCount++;
                    }
                }
                toast.success(`Nhập thành công ${addedCount} sinh viên!`);
            } catch (err) {
                console.error(err);
                toast.error('Lỗi khi đọc file Excel! Hãy đảm bảo Cột 1 là MSSV, Cột 2 là Họ Tên.');
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset file input
        e.target.value = null;
    };

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
                <div className="flx gap-2" style={{ alignItems: 'center' }}>
                    <button onClick={() => navigate('/teacher/classes')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>{cls.name}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{cls.description}</p>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flx gap-2" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button
                    className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('students')}
                >Sinh viên & Điểm danh</button>
                <button
                    className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('materials')}
                >Học Liệu</button>
                <button
                    className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('assignments')}
                >Bài Tập</button>
                <button
                    className={`btn ${activeTab === 'grades' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('grades')}
                >Bảng Điểm</button>
                <button
                    className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('announcements')}
                >📢 Thông Báo</button>
                <button
                    className={`btn ${activeTab === 'discussion' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('discussion')}
                >💬 Thảo Luận</button>
            </div>

            {activeTab === 'students' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 2fr) 1fr', gap: '2rem' }}>
                    <div>
                        <div className="flx flx-between" style={{ marginBottom: '1rem' }}>
                            <h3>Danh sách Sinh Viên ({students.length})</h3>
                            <div className="flx gap-2">
                                {/* Nút giả làm label để chọc vào file input ẩn */}
                                <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1rem' }}>
                                    <FileSpreadsheet size={18} /> Import Excel
                                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} style={{ display: 'none' }} />
                                </label>

                                <button className="btn btn-primary" onClick={() => setShowAddStudent(!showAddStudent)} style={{ padding: '0.5rem 1rem' }}>
                                    <UserPlus size={18} /> Thêm Bằng Tay
                                </button>
                            </div>
                        </div>

                        {showAddStudent && (
                            <div className="glass-card animate-in" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                                <form className="flx gap-4" style={{ alignItems: 'flex-end' }} onSubmit={handleAddStudent}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mã SV</label>
                                        <input className="input-field" placeholder="VD: SV009" value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value)} />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Họ Tên</label>
                                        <input className="input-field" placeholder="Nguyễn Văn A" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                                    </div>
                                    <div className="flx gap-2">
                                        <button type="submit" className="btn btn-primary">Lưu</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {students.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>MSSV</th>
                                            <th style={{ padding: '1rem' }}>Họ Tên</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(st => (
                                            <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 500 }}>{st.code}</td>
                                                <td style={{ padding: '1rem' }}>{st.name}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button onClick={() => setRegisterFaceStudent(st)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginRight: '0.8rem' }} title="Đăng ký Khuôn mặt AI">
                                                        <Camera size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteStudent(st.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Xóa khỏi lớp">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Upload size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Chưa có sinh viên nào trong lớp.</p>
                                    <p style={{ fontSize: '0.85rem' }}>Hãy Import danh sách từ file Excel để tiết kiệm thời gian.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="glass-card flx flx-col gap-4" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(236, 72, 153, 0.1))' }}>
                            <h3>Bắt đầu Điểm danh</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hệ thống sẽ mở Mã QR trên màn hình. Sinh viên dùng điện thoại quét mã để điểm danh trực tiếp.</p>
                            <Link to={`/teacher/classes/${courseId}/attendance`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1.1rem', padding: '1rem' }}>
                                <QrCode size={24} /> Phát Mã QR Điểm Danh
                            </Link>
                        </div>

                        <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Các phiên gần đây</h3>
                            {sessions.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {sessions.map(ss => (
                                        <li key={ss.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                                            <div className="flx flx-between">
                                                <strong>{new Date(ss.date).toLocaleDateString()}</strong>
                                                <span style={{ color: ss.status === 'closed' ? 'var(--text-muted)' : 'var(--success)' }}>
                                                    {ss.status === 'closed' ? 'Đã chốt' : 'Đang mở'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có buổi điểm danh nào.</p>
                            )}
                            <Link to="/teacher/reports" className="btn btn-outline" style={{ width: '100%', marginTop: '1rem', fontSize: '0.9rem' }}>Xem toàn bộ Lịch sử</Link>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'materials' && <TeacherCourseMaterials courseId={courseId} />}
            {activeTab === 'assignments' && <TeacherCourseAssignments courseId={courseId} />}
            {activeTab === 'grades' && <TeacherCourseGrades courseId={courseId} />}
            {activeTab === 'announcements' && <TeacherCourseAnnouncements courseId={courseId} />}
            {activeTab === 'discussion' && <Discussion courseId={courseId} />}

            {registerFaceStudent && (
                <FaceRegistrationModal
                    student={registerFaceStudent}
                    onClose={() => setRegisterFaceStudent(null)}
                    onComplete={() => toast.success("Đã cài đặt FaceID xong!")}
                />
            )}
        </div>
    );
}
