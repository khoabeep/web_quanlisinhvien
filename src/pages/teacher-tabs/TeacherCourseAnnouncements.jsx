import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Megaphone, Plus, Trash2, AlertCircle, Info, CheckCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITIES = [
    { value: 'normal', label: 'Thông thường', color: 'var(--primary)', icon: Info },
    { value: 'important', label: 'Quan trọng', color: 'var(--warning)', icon: AlertCircle },
    { value: 'urgent', label: 'Khẩn cấp', color: 'var(--danger)', icon: AlertCircle },
];

export default function TeacherCourseAnnouncements({ courseId }) {
    const announcements = useLiveQuery(() =>
        db.announcements.where({ courseId }).toArray()
    ) || [];

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('normal');
    const [notifyEmail, setNotifyEmail] = useState(false);

    const sorted = [...announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        await db.announcements.add({
            courseId,
            title: title.trim(),
            content: content.trim(),
            priority,
            createdAt: new Date().toISOString()
        });

        // Tính năng #18: Gửi thông báo qua In-App cho tất cả sinh viên trong lớp
        const enrollments = await db.enrollments.where({ courseId }).toArray();
        for (const enr of enrollments) {
            await db.notifications.add({
                userId: enr.studentId,
                type: priority === 'urgent' ? 'warning' : 'info',
                title: `[Thông báo lớp] ${title.trim()}`,
                message: content.trim().slice(0, 120) + (content.length > 120 ? '…' : ''),
                isRead: false,
                createdAt: new Date().toISOString(),
                link: null
            });
        }

        // Tính năng #18: Email stub — mở mailto nếu bật
        if (notifyEmail) {
            const course = await db.courses.get(courseId);
            const emails = await Promise.all(enrollments.map(async e => {
                const u = await db.users.get(e.studentId);
                return u?.email || '';
            }));
            const validEmails = emails.filter(Boolean).join(',');
            if (validEmails) {
                const subject = encodeURIComponent(`[${course?.name || 'LMS'}] ${title.trim()}`);
                const body = encodeURIComponent(content.trim());
                window.open(`mailto:${validEmails}?subject=${subject}&body=${body}`, '_blank');
            }
        }

        toast.success('Đã đăng thông báo!' + (notifyEmail ? ' Mở email client để gửi mail.' : ''));
        setTitle(''); setContent(''); setPriority('normal'); setNotifyEmail(false);
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa thông báo này?')) return;
        await db.announcements.delete(id);
        toast.success('Đã xóa thông báo.');
    };

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Megaphone size={20} color="var(--primary)" /> Thông Báo Lớp Học
                </h3>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '0.4rem 1rem' }}>
                    <Plus size={18} /> Đăng Thông Báo
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <form className="flx flx-col gap-4" onSubmit={handleAdd}>
                        <h4>Thông Báo Mới</h4>
                        <div className="flx gap-4">
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tiêu đề thông báo *</label>
                                <input className="input-field" placeholder="VD: Lịch thi giữa kỳ, Nghỉ học buổi..." value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mức độ</label>
                                <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nội dung thông báo *</label>
                            <textarea className="input-field" rows={4} placeholder="Nhập nội dung chi tiết..." value={content} onChange={e => setContent(e.target.value)} required />
                        </div>
                        <div className="flx gap-2" style={{ alignItems: 'center' }}>
                            <button type="submit" className="btn btn-primary">Đăng</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                            {/* Tính năng #18: Gửi mail */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}>
                                <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} />
                                <Mail size={14} /> Gửi email cho sinh viên</label>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sorted.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Megaphone size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                        <p>Chưa có thông báo nào được đăng.</p>
                        <p style={{ fontSize: '0.85rem' }}>Hãy đăng thông báo để sinh viên nắm bắt thông tin lớp học.</p>
                    </div>
                ) : (
                    sorted.map(ann => {
                        const p = PRIORITIES.find(x => x.value === ann.priority) || PRIORITIES[0];
                        const Icon = p.icon;
                        return (
                            <div key={ann.id} className="glass-card animate-in-up" style={{ padding: '1.25rem', borderLeft: `4px solid ${p.color}` }}>
                                <div className="flx flx-between" style={{ marginBottom: '0.75rem' }}>
                                    <div className="flx gap-2" style={{ alignItems: 'center' }}>
                                        <Icon size={18} color={p.color} />
                                        <strong style={{ fontSize: '1.05rem' }}>{ann.title}</strong>
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: `${p.color}22`, color: p.color, fontWeight: 600 }}>
                                            {p.label}
                                        </span>
                                    </div>
                                    <div className="flx gap-2" style={{ alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(ann.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                        <button onClick={() => handleDelete(ann.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ann.content}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
