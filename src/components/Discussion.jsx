// Tính năng #16: Thảo luận / Bình luận trong lớp học
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Trash2, Reply } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Discussion({ courseId }) {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [replyTo, setReplyTo] = useState(null); // { id, name }
    const [submitting, setSubmitting] = useState(false);

    const discussions = useLiveQuery(
        () => db.discussions.where({ courseId }).sortBy('createdAt'),
        [courseId]
    ) || [];

    const users = useLiveQuery(() => db.users.toArray()) || [];
    const getUserName = (id) => users.find(u => u.id === id)?.name || 'Người dùng';
    const getUserRole = (id) => users.find(u => u.id === id)?.role || 'student';

    const topLevel = discussions.filter(d => !d.parentId);
    const getReplies = (parentId) => discussions.filter(d => d.parentId === parentId);

    const timeAgo = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Vừa xong';
        if (m < 60) return `${m} phút trước`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} giờ trước`;
        return new Date(iso).toLocaleDateString('vi-VN');
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            await db.discussions.add({
                courseId,
                userId: user.id,
                parentId: replyTo?.id || null,
                content: content.trim(),
                createdAt: new Date().toISOString()
            });
            setContent('');
            setReplyTo(null);
            toast.success('Đã đăng bình luận!');
        } catch (err) {
            toast.error('Lỗi khi đăng!');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa bình luận này?')) return;
        // Xóa cả replies
        const replies = await db.discussions.where({ parentId: id }).toArray();
        await Promise.all(replies.map(r => db.discussions.delete(r.id)));
        await db.discussions.delete(id);
        toast.success('Đã xóa bình luận');
    };

    const CommentItem = ({ d, isReply = false }) => {
        const isOwner = d.userId === user?.id || user?.role === 'teacher' || user?.role === 'admin';
        const role = getUserRole(d.userId);
        return (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: isReply ? '0.75rem' : '1.25rem' }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: role === 'teacher' ? 'rgba(79,70,229,0.15)' : 'rgba(16,185,129,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 700,
                    color: role === 'teacher' ? 'var(--primary)' : 'var(--success)'
                }}>
                    {getUserName(d.userId).charAt(0)}
                </div>
                <div style={{ flex: 1, background: 'var(--bg-main)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '0.9rem' }}>{getUserName(d.userId)}</strong>
                            {role === 'teacher' && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: '1rem' }}>GV</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(d.createdAt)}</span>
                            {!isReply && (
                                <button onClick={() => setReplyTo({ id: d.id, name: getUserName(d.userId) })} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px' }} title="Trả lời">
                                    <Reply size={14} />
                                </button>
                            )}
                            {isOwner && (
                                <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }} title="Xóa">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.content}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} color="var(--primary)" /> Thảo Luận ({discussions.length})
            </h3>

            {/* Form đăng */}
            <form onSubmit={handlePost} style={{ marginBottom: '2rem' }}>
                {replyTo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(79,70,229,0.08)', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)' }}>
                        <Reply size={14} /> Đang trả lời <strong>{replyTo.name}</strong>
                        <button type="button" onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <textarea
                        className="input-field"
                        placeholder="Viết bình luận hoặc đặt câu hỏi..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={2}
                        style={{ flex: 1, resize: 'vertical', minHeight: 60 }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!content.trim() || submitting} style={{ padding: '0.75rem', flexShrink: 0 }}>
                        <Send size={18} />
                    </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Enter để gửi, Shift+Enter để xuống dòng</p>
            </form>

            {/* Danh sách bình luận */}
            {topLevel.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p>Hãy là người đầu tiên đặt câu hỏi hoặc bình luận!</p>
                </div>
            ) : (
                topLevel.map(d => (
                    <div key={d.id}>
                        <CommentItem d={d} />
                        {getReplies(d.id).map(r => (
                            <div key={r.id} style={{ marginLeft: '3rem' }}>
                                <CommentItem d={r} isReply />
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
