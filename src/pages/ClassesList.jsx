import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ClassesList() {
    const { user, isAdmin } = useAuth();
    // Admin xem tất cả, teacher chỉ xem lớp của mình
    const classes = useLiveQuery(
        () => isAdmin
            ? db.courses.toArray()
            : db.courses.where({ teacherId: user?.id }).toArray(),
        [isAdmin, user?.id]
    );
    const allTeachers = useLiveQuery(() => db.users.where({ role: 'teacher' }).toArray()) || [];
    const adminUsers = useLiveQuery(() => db.users.where({ role: 'admin' }).toArray()) || [];
    const teacherMap = useMemo(() => {
        const m = {};
        [...allTeachers, ...adminUsers].forEach(t => { m[t.id] = t.name; });
        return m;
    }, [allTeachers, adminUsers]);
    const [showForm, setShowForm] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassDesc, setNewClassDesc] = useState('');
    const [search, setSearch] = useState('');

    const filteredClasses = useMemo(() => {
        if (!classes) return [];
        if (!search.trim()) return classes;
        const q = search.toLowerCase();
        return classes.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.description && c.description.toLowerCase().includes(q))
        );
    }, [classes, search]);

    const handleAddClass = async (e) => {
        e.preventDefault();
        if (!newClassName.trim()) return;
        await db.courses.add({
            name: newClassName,
            description: newClassDesc,
            teacherId: user.id,
            createdAt: new Date().toISOString()
        });
        setNewClassName('');
        setNewClassDesc('');
        setShowForm(false);
    };

    const handleDeleteClass = async (cls) => {
        if (!isAdmin && cls.teacherId !== user.id) return;
        if (window.confirm(`Xóa lớp "${cls.name}"? Mọi dữ liệu sinh viên sẽ bị mất.`)) {
            await db.courses.delete(cls.id);
        }
    };

    return (
        <div className="animate-in">
            <div className="flx flx-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Danh sách Lớp Học</h2>
                <div className="flx gap-2" style={{ flex: 1, maxWidth: 420, minWidth: 200 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', top: '50%', left: '0.8rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            className="input-field"
                            placeholder="Tìm kiếm lớp học..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '2.4rem' }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        <Plus size={20} />
                        Thêm Lớp
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <form className="flx flx-col gap-4" onSubmit={handleAddClass}>
                        <h3>Tạo Lớp Học Mới</h3>
                        <input
                            className="input-field"
                            placeholder="Tên lớp (ví dụ: Lập trình Web - K46)"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            autoFocus
                        />
                        <input
                            className="input-field"
                            placeholder="Mô tả ngắn gọn"
                            value={newClassDesc}
                            onChange={(e) => setNewClassDesc(e.target.value)}
                        />
                        <div className="flx gap-2" style={{ alignSelf: 'flex-start' }}>
                            <button type="submit" className="btn btn-primary">Lưu Lại</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            {classes && classes.length === 0 && !showForm && (
                <div className="glass-card flx flx-col flx-center gap-4" style={{ minHeight: 300, textAlign: 'center' }}>
                    <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Plus size={48} />
                    </div>
                    <div>
                        <h3>Chưa có lớp học nào</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Hãy tạo mới một lớp để bắt đầu quản lý sinh viên và điểm danh.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>Tạo Lớp Học Đầu Tiên</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {filteredClasses.length === 0 && search && (
                    <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Không tìm thấy lớp học nào khớp với "<strong>{search}</strong>".
                    </div>
                )}
                {filteredClasses?.map(cls => (
                    <div key={cls.id} className="glass-card flx flx-col flx-between" style={{ alignItems: 'flex-start', minHeight: 180 }}>
                        <div style={{ width: '100%' }}>
                            <div className="flx flx-between" style={{ marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{cls.name}</h3>
                                {(isAdmin || cls.teacherId === user?.id) && (
                                    <button
                                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                        onClick={() => handleDeleteClass(cls)}
                                        title="Xóa lớp này"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                            {isAdmin && cls.teacherId && cls.teacherId !== user?.id && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ShieldCheck size={12} color="var(--primary)" />
                                    GV: {teacherMap[cls.teacherId] || 'Không rõ'}
                                </div>
                            )}
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{cls.description || 'Không có mô tả'}</p>
                        </div>
                        <Link to={`/teacher/classes/${cls.id}`} className="btn btn-outline" style={{ width: '100%' }}>
                            Quản lý Lớp <ArrowRight size={18} />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
