import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ClipboardList, Plus, Trash2, Calendar, ClipboardCheck, X, ExternalLink, CheckCircle, XCircle, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherCourseAssignments({ courseId }) {
    const assignments = useLiveQuery(() => db.assignments.where({ courseId }).toArray()) || [];
    const submissions = useLiveQuery(() => db.submissions.toArray()) || [];
    const enrollments = useLiveQuery(() => db.enrollments.where({ courseId }).toArray()) || [];
    const allStudents = useLiveQuery(() => db.users.where({ role: 'student' }).toArray()) || [];

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [maxScore, setMaxScore] = useState(10);
    const [dueDate, setDueDate] = useState('');

    // Tính năng #14: State chấm điểm
    const [gradingAsmId, setGradingAsmId] = useState(null);
    const [scores, setScores] = useState({}); // { submissionId: scoreValue }

    const handleAddAssignment = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) return;
        await db.assignments.add({
            courseId, title, description,
            maxScore: parseFloat(maxScore),
            dueDate: new Date(dueDate).toISOString(),
            createdAt: new Date().toISOString()
        });
        toast.success("Đã tạo Bài kiểm tra / Bài tập mới!");
        setTitle(''); setDescription(''); setMaxScore(10); setDueDate('');
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Xóa bài đánh giá này? Tất cả bài nộp của SV cũng sẽ mất!")) {
            await db.assignments.delete(id);
            toast.success("Đã xóa Bài tập.");
        }
    };

    // Tính năng #14: Mở panel chấm điểm — khởi tạo scores từ dữ liệu hiện có
    const openGrading = (asm) => {
        const subsForAsm = submissions.filter(s => s.assignmentId === asm.id);
        const initScores = {};
        subsForAsm.forEach(s => { initScores[s.id] = s.score !== undefined ? s.score : ''; });
        setScores(initScores);
        setGradingAsmId(asm.id);
    };

    // Lưu điểm cho tất cả bài nộp trong một lần
    const handleSaveScores = async (asm) => {
        let saved = 0;
        for (const [subId, score] of Object.entries(scores)) {
            const s = parseFloat(score);
            if (!isNaN(s) && s >= 0 && s <= asm.maxScore) {
                await db.submissions.update(parseInt(subId), { score: s });
                saved++;
            }
        }
        toast.success(`Đã lưu điểm cho ${saved} bài nộp!`);
        setGradingAsmId(null);
    };

    const gradingAsm = assignments.find(a => a.id === gradingAsmId);
    const enrolledStudents = allStudents.filter(s => enrollments.some(e => e.studentId === s.id));

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '1.5rem' }}>
                <h3>Bài Tập & Đánh Giá</h3>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '0.4rem 1rem' }}>
                    <Plus size={18} /> Tạo Bài Tập
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <form className="flx flx-col gap-4" onSubmit={handleAddAssignment}>
                        <h4>Thêm Bài Đánh Giá Mới</h4>
                        <div className="flx gap-4">
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tiêu đề</label>
                                <input className="input-field" placeholder="VD: Giữa kỳ, Bài tập về nhà..." value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thang điểm</label>
                                <input type="number" step="0.5" className="input-field" value={maxScore} onChange={e => setMaxScore(e.target.value)} required />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hạn chót (Deadline)</label>
                            <input type="datetime-local" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mô tả thêm / Yêu cầu đề bài</label>
                            <textarea className="input-field" placeholder="Giáo viên nhập yêu cầu..." value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
                        </div>
                        <div className="flx gap-2">
                            <button type="submit" className="btn btn-primary">Lưu Bài Tập</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tính năng #14: Panel chấm điểm */}
            {gradingAsm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                    <div className="flx flx-between" style={{ marginBottom: '1.25rem', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={18} color="var(--primary)" /> Chấm Điểm: {gradingAsm.title}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Thang {gradingAsm.maxScore} điểm)</span>
                        </h4>
                        <button onClick={() => setGradingAsmId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.04)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>MSSV</th>
                                    <th style={{ padding: '0.75rem' }}>Họ Tên</th>
                                    <th style={{ padding: '0.75rem' }}>Trạng Thái</th>
                                    <th style={{ padding: '0.75rem' }}>Link Bài Làm</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Điểm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrolledStudents.map(st => {
                                    const sub = submissions.find(s => s.assignmentId === gradingAsm.id && s.studentId === st.id);
                                    return (
                                        <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{st.code}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{st.name}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {sub
                                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: '0.82rem' }}>
                                                        <CheckCircle size={13} /> Đã nộp {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                        <XCircle size={13} /> Chưa nộp
                                                    </span>}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {sub?.link
                                                    ? <a href={sub.link} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: 'var(--primary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <ExternalLink size={12} /> Xem bài
                                                    </a>
                                                    : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                {sub ? (
                                                    <input
                                                        type="number" min={0} max={gradingAsm.maxScore} step={0.5}
                                                        value={scores[sub.id] ?? ''}
                                                        onChange={e => setScores(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                        style={{ width: 70, padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-main)', textAlign: 'center', fontSize: '0.9rem' }}
                                                        placeholder={`/${gradingAsm.maxScore}`}
                                                    />
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button className="btn btn-outline" onClick={() => setGradingAsmId(null)}>Hủy</button>
                        <button className="btn btn-primary" onClick={() => handleSaveScores(gradingAsm)}>
                            <ClipboardCheck size={16} /> Lưu Điểm
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                {assignments.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>Các bài kiểm tra hoặc bài tập điểm thành phần sẽ hiển thị ở đây.</p>
                    </div>
                ) : (
                    assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(asm => {
                        const subsForAsm = submissions.filter(s => s.assignmentId === asm.id);
                        const gradedCount = subsForAsm.filter(s => s.score !== undefined && s.score !== null).length;

                        return (
                            <div key={asm.id} className="glass-card flx flx-col flx-between" style={{ padding: '1.2rem', border: gradingAsmId === asm.id ? '2px solid var(--primary)' : undefined }}>
                                <div>
                                    <div className="flx flx-between" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>{asm.title}</h4>
                                        <button onClick={() => handleDelete(asm.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} /> Hạn chót: {new Date(asm.dueDate).toLocaleString('vi-VN')}
                                    </p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                                        {asm.description || 'Không có mô tả chi tiết.'}
                                    </p>
                                </div>
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                                    <div className="flx flx-between" style={{ alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Đã nộp: </span>
                                            <strong style={{ color: 'var(--success)' }}>{subsForAsm.length}</strong>
                                            <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>|</span>
                                            <span style={{ color: 'var(--text-muted)' }}>Đã chấm: </span>
                                            <strong style={{ color: gradedCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{gradedCount}</strong>
                                            <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>|</span>
                                            <span style={{ color: 'var(--text-muted)' }}>Thang: </span>
                                            <strong>{asm.maxScore}</strong>
                                        </div>
                                        <button
                                            className={`btn ${gradingAsmId === asm.id ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={() => gradingAsmId === asm.id ? setGradingAsmId(null) : openGrading(asm)}
                                        >
                                            <ClipboardCheck size={14} /> {gradingAsmId === asm.id ? 'Đang chấm…' : 'Chấm bài'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
