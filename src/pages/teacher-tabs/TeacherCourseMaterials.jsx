import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { FileDown, FileText, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherCourseMaterials({ courseId }) {
    const materials = useLiveQuery(() => db.materials.where({ courseId }).toArray()) || [];
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('link'); // 'link', 'document'
    const [content, setContent] = useState('');

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        await db.materials.add({
            courseId,
            title,
            type,
            content,
            uploadDate: new Date().toISOString()
        });

        toast.success("Đã thêm tài liệu mới!");
        setTitle('');
        setContent('');
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Xóa tài liệu này?")) {
            await db.materials.delete(id);
            toast.success("Đã xóa tài liệu.");
        }
    };

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '1.5rem' }}>
                <h3>Học Liệu & Tài Liệu Tham Khảo</h3>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '0.4rem 1rem' }}>
                    <Plus size={18} /> Đăng Tài liệu
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <form className="flx flx-col gap-4" onSubmit={handleAddMaterial}>
                        <h4>Thêm Tài Liệu Mới</h4>
                        <input className="input-field" placeholder="Tên tài liệu (VD: Slide Bài 1, Link Google Drive...)" value={title} onChange={e => setTitle(e.target.value)} autoFocus required />

                        <div className="flx gap-4">
                            <label className="flx gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                <input type="radio" value="link" checked={type === 'link'} onChange={e => setType(e.target.value)} /> Link chia sẻ (Drive, Web)
                            </label>
                            <label className="flx gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                <input type="radio" value="document" checked={type === 'document'} onChange={e => setType(e.target.value)} /> Ghi chú (Văn bản)
                            </label>
                        </div>

                        {type === 'link' ? (
                            <input className="input-field" placeholder="Dán đường dẫn (URL) vào đây..." value={content} onChange={e => setContent(e.target.value)} required />
                        ) : (
                            <textarea className="input-field" placeholder="Nội dung ghi chú..." value={content} onChange={e => setContent(e.target.value)} rows={4} required></textarea>
                        )}

                        <div className="flx gap-2">
                            <button type="submit" className="btn btn-primary">Lưu Tài Liệu</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {materials.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <FileDown size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>Chưa có tài liệu nào được tải lên cho lớp này.</p>
                    </div>
                ) : (
                    materials.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(mat => (
                        <div key={mat.id} className="glass-card flx flx-col flx-between" style={{ padding: '1.2rem' }}>
                            <div>
                                <div className="flx flx-between" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {mat.type === 'link' ? <LinkIcon size={18} color="var(--primary)" /> : <FileText size={18} color="var(--success)" />}
                                        {mat.title}
                                    </h4>
                                    <button onClick={() => handleDelete(mat.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ngày đăng: {new Date(mat.uploadDate).toLocaleDateString()}</p>

                                <div style={{ background: 'rgba(0,0,0,0.05)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                    {mat.type === 'link' ? (
                                        <a href={mat.content} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Truy cập liên kết →</a>
                                    ) : (
                                        <span style={{ color: 'var(--text)' }}>{mat.content}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
