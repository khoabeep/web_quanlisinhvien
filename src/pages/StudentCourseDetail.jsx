import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, FileText, Link as LinkIcon, Calendar, UploadCloud, CheckCircle, ClipboardList, TrendingUp, Megaphone, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Discussion from '../components/Discussion';

export default function StudentCourseDetail() {
    const { id } = useParams();
    const courseId = parseInt(id, 10);
    const { user } = useAuth();

    const cls = useLiveQuery(() => db.courses.get(courseId));
    const materials = useLiveQuery(() => db.materials.where({ courseId }).toArray()) || [];
    const assignments = useLiveQuery(() => db.assignments.where({ courseId }).toArray()) || [];
    const submissions = useLiveQuery(() => db.submissions.where({ studentId: user?.id }).toArray()) || [];
    const grade = useLiveQuery(() => db.grades.where('[courseId+studentId]').equals([courseId, user?.id]).first());
    const announcements = useLiveQuery(() => db.announcements.where({ courseId }).toArray()) || [];

    const [activeTab, setActiveTab] = useState('materials'); // materials, assignments, grade
    const [submittingAsmId, setSubmittingAsmId] = useState(null);
    const [submitLink, setSubmitLink] = useState('');

    if (cls === undefined) return <div className="animate-in">Đang tải dữ liệu...</div>;
    if (cls === null) return <div className="animate-in text-danger">Môn học không tồn tại.</div>;

    const handleSubmitAssignment = async (e, assignmentId) => {
        e.preventDefault();
        if (!submitLink.trim()) return;

        // Xóa bài nộp cũ nếu có (Cơ chế nộp lại thắt chặt hơn sẽ làm sau)
        const oldSub = submissions.find(s => s.assignmentId === assignmentId);
        if (oldSub) await db.submissions.delete(oldSub.id);

        await db.submissions.add({
            assignmentId,
            studentId: user.id,
            content: 'Nộp bài qua link',
            fileUrl: submitLink,
            submittedAt: new Date().toISOString(),
            score: null
        });

        toast.success("Nộp bài thành công!");
        setSubmittingAsmId(null);
        setSubmitLink('');
    };

    return (
        <div className="animate-in">
            <div className="flx gap-2" style={{ marginBottom: '2rem', alignItems: 'center' }}>
                <Link to="/student" className="btn btn-outline" style={{ padding: '0.4rem' }}><ArrowLeft size={18} /></Link>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>{cls.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{cls.description}</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flx gap-2" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button
                    className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('materials')}
                >
                    <FileText size={18} /> Học Liệu & Bài Giảng
                </button>
                <button
                    className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('assignments')}
                >
                    <ClipboardList size={18} /> Bài Tập
                </button>
                <button
                    className={`btn ${activeTab === 'grade' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('grade')}
                >
                    <TrendingUp size={18} /> Bảng Điểm
                </button>
                <button
                    className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('announcements')}
                >
                    <Megaphone size={18} /> Thông Báo {announcements.length > 0 && <span style={{ marginLeft: '2px', background: 'var(--danger)', color: '#fff', borderRadius: '1rem', padding: '0 6px', fontSize: '0.75rem' }}>{announcements.length}</span>}
                </button>
                <button
                    className={`btn ${activeTab === 'discussion' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('discussion')}
                >
                    💬 Thảo Luận
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'materials' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {materials.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Môn học này chưa có tài liệu nào.</div>
                    ) : (
                        materials.map(mat => (
                            <div key={mat.id} className="glass-card animate-in-up flx flx-col flx-between" style={{ padding: '1.2rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {mat.type === 'link' ? <LinkIcon size={18} color="var(--primary)" /> : <FileText size={18} color="var(--success)" />}
                                        {mat.title}
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ngày đăng: {new Date(mat.uploadDate).toLocaleDateString()}</p>
                                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                        {mat.type === 'link' ? (
                                            <a href={mat.content} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Truy cập tài liệu →</a>
                                        ) : (
                                            <span>{mat.content}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'assignments' && (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {assignments.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có bài tập nào được giao.</div>
                    ) : (
                        assignments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)).map(asm => {
                            const mySub = submissions.find(s => s.assignmentId === asm.id);
                            const isOverdue = new Date(asm.dueDate) < new Date();

                            return (
                                <div key={asm.id} className="glass-card animate-in-up" style={{ padding: '1.5rem' }}>
                                    <div className="flx flx-between" style={{ alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{asm.title}</h3>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Calendar size={14} /> Hạn chót: <strong style={{ color: isOverdue ? 'var(--danger)' : 'var(--text)' }}>{new Date(asm.dueDate).toLocaleString()}</strong>
                                            </p>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600 }}>Thang điểm: {asm.maxScore}</div>
                                    </div>

                                    <div style={{ background: 'rgba(79, 70, 229, 0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                                        {asm.description || 'Không có mô tả chi tiết yêu cầu.'}
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                        {mySub ? (
                                            <div className="flx flx-between" style={{ alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                                <div>
                                                    <strong style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} /> Đã nộp bài</strong>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào lúc: {new Date(mySub.submittedAt).toLocaleString()}</span>
                                                </div>
                                                <button onClick={() => setSubmittingAsmId(asm.id)} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>Nộp lại</button>
                                            </div>
                                        ) : (
                                            <div>
                                                {isOverdue ? (
                                                    <span style={{ color: 'var(--danger)', fontWeight: 500 }}>Đã hết hạn nộp bài.</span>
                                                ) : (
                                                    <button onClick={() => setSubmittingAsmId(asm.id)} className="btn btn-primary">
                                                        <UploadCloud size={18} /> Nhấn để Nộp Bài
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {submittingAsmId === asm.id && (
                                            <form className="animate-in" style={{ marginTop: '1rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }} onSubmit={(e) => handleSubmitAssignment(e, asm.id)}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>Dán Link Bài Làm (Google Drive, Github, PDF URL...)</label>
                                                <div className="flx gap-2">
                                                    <input
                                                        className="input-field"
                                                        style={{ flex: 1 }}
                                                        placeholder="https://..."
                                                        value={submitLink}
                                                        onChange={e => setSubmitLink(e.target.value)}
                                                        required
                                                        autoFocus
                                                    />
                                                    <button type="submit" className="btn btn-primary">Gửi</button>
                                                    <button type="button" className="btn btn-outline" onClick={() => setSubmittingAsmId(null)}>Hủy</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {activeTab === 'grade' && (
                <div className="glass-card animate-in-up" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>Bảng Điểm Cá Nhân</h3>

                    {grade ? (
                        <div className="flx flx-col gap-4">
                            <div className="flx flx-between" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <span>Điểm Quá trình (40%)</span>
                                <strong>{grade.midtermScore !== undefined ? grade.midtermScore : '-'}</strong>
                            </div>
                            <div className="flx flx-between" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <span>Điểm Thi (60%)</span>
                                <strong>{grade.finalScore !== undefined ? grade.finalScore : '-'}</strong>
                            </div>
                            <div className="flx flx-between" style={{ padding: '1.5rem 1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '8px', color: 'var(--primary)', marginTop: '1rem' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tổng Điểm Học Phần</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{grade.totalScore ? grade.totalScore.toFixed(1) : '-'}</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                            <p>Giảng viên chưa công bố điểm cho môn học này.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'announcements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {announcements.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Megaphone size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                            <p>Giảng viên chưa có thông báo nào cho lớp này.</p>
                        </div>
                    ) : (
                        [...announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(ann => {
                            const colorMap = { urgent: 'var(--danger)', important: 'var(--warning)', normal: 'var(--primary)' };
                            const labelMap = { urgent: 'Khẩn cấp', important: 'Quan trọng', normal: 'Thông thường' };
                            const color = colorMap[ann.priority] || 'var(--primary)';
                            return (
                                <div key={ann.id} className="glass-card animate-in-up" style={{ padding: '1.25rem', borderLeft: `4px solid ${color}` }}>
                                    <div className="flx flx-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div className="flx gap-2" style={{ alignItems: 'center' }}>
                                            <Megaphone size={18} color={color} />
                                            <strong style={{ fontSize: '1.05rem' }}>{ann.title}</strong>
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: `${color}22`, color, fontWeight: 600 }}>
                                                {labelMap[ann.priority] || 'Thông thường'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(ann.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ann.content}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {activeTab === 'discussion' && <Discussion courseId={courseId} />}
        </div>
    );
}
