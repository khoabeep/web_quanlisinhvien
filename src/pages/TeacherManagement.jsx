// Tính năng #2 & #13: Quản lý Giảng Viên (Admin / Teacher Manager)
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Users, UserPlus, Trash2, Edit2, Save, X, Search, BookOpen, RefreshCw, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function TeacherManagement() {
    const { isAdmin } = useAuth();
    const teachers = useLiveQuery(() => db.users.where('role').anyOf(['teacher', 'admin']).toArray()) || [];
    const courses = useLiveQuery(() => db.courses.toArray()) || [];

    // --- Access guard ---
    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
                <ShieldOff size={48} />
                <h2 style={{ color: 'var(--text)' }}>Không có quyền truy cập</h2>
                <p>Trang này chỉ dành cho Quản Trị Viên.</p>
            </div>
        );
    }

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('teacher');

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return teachers.filter(t =>
            t.name?.toLowerCase().includes(q) ||
            t.code?.toLowerCase().includes(q) ||
            t.email?.toLowerCase().includes(q)
        );
    }, [teachers, search]);

    const getCourseCount = (teacherId) => courses.filter(c => c.teacherId === teacherId).length;

    const handleAdd = async (e) => {
        e.preventDefault();
        const code = newCode.trim().toUpperCase();
        if (!code || !newName.trim()) return;
        const exists = await db.users.where('code').equals(code).first();
        if (exists) return toast.error(`Mã ${code} đã tồn tại!`);
        await db.users.add({
            code,
            username: code.toLowerCase(),
            password: '123',
            role: newRole,
            name: newName.trim(),
            email: newEmail.trim(),
            phone: '',
            avatar: null,
            createdAt: new Date().toISOString()
        });
        toast.success(`Đã tạo tài khoản giảng viên ${code}`);
        setNewCode(''); setNewName(''); setNewEmail(''); setNewRole('teacher');
        setShowForm(false);
    };

    const handleDelete = async (t) => {
        if (!window.confirm(`Xóa tài khoản giảng viên "${t.name}" (${t.code})?\n\nCác lớp học của GV này sẽ không bị xóa.`)) return;
        await db.users.delete(t.id);
        toast.success(`Đã xóa tài khoản ${t.code}`);
    };

    const saveEdit = async (id) => {
        if (!editName.trim()) return;
        await db.users.update(id, { name: editName.trim(), email: editEmail.trim() });
        toast.success('Đã cập nhật');
        setEditingId(null);
    };

    const resetPassword = async (t) => {
        if (!window.confirm(`Đặt lại mật khẩu của "${t.name}" về "123"?`)) return;
        await db.users.update(t.id, { password: '123' });
        toast.success('Đã đặt lại mật khẩu về "123"');
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} color="var(--primary)" /> Quản Lý Giảng Viên
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {teachers.length} tài khoản giảng viên trong hệ thống
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <UserPlus size={18} /> Thêm Giảng Viên
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Tạo Tài Khoản Giảng Viên Mới</h3>
                    <form className="flx gap-4" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={handleAdd}>
                        <div style={{ minWidth: 120 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã GV *</label>
                            <input className="input-field" placeholder="GV001" value={newCode} onChange={e => setNewCode(e.target.value)} required />
                        </div>
                        <div style={{ flex: 2, minWidth: 200 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Họ và Tên *</label>
                            <input className="input-field" placeholder="Nguyễn Văn A" value={newName} onChange={e => setNewName(e.target.value)} required />
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        </div>
                        <div style={{ minWidth: 140 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vai trò</label>
                            <select className="input-field" value={newRole} onChange={e => setNewRole(e.target.value)}>
                                <option value="teacher">Giảng viên</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>
                        <div className="flx gap-2">
                            <button type="submit" className="btn btn-primary">Lưu</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
                        </div>
                    </form>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Mật khẩu mặc định: <strong>123</strong></p>
                </div>
            )}

            <div style={{ position: 'relative', maxWidth: 400, marginBottom: '1.5rem' }}>
                <Search size={16} style={{ position: 'absolute', top: '50%', left: '0.8rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="input-field" placeholder="Tìm theo mã, tên, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.4rem' }} />
            </div>

            <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Mã GV</th>
                            <th style={{ padding: '1rem' }}>Họ Tên</th>
                            <th style={{ padding: '1rem' }}>Email</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Lớp dạy</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Vai trò</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{t.code}</td>
                                <td style={{ padding: '1rem' }}>
                                    {editingId === t.id ? (
                                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '0.4rem 0.6rem' }} />
                                    ) : t.name}
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {editingId === t.id ? (
                                        <input className="input-field" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: '0.4rem 0.6rem' }} />
                                    ) : (t.email || '—')}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 500 }}>
                                        <BookOpen size={14} />{getCourseCount(t.id)}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '1rem', background: t.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)', color: t.role === 'admin' ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>
                                        {t.role === 'admin' ? 'Admin' : 'Giảng viên'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {editingId === t.id ? (
                                        <div className="flx gap-2" style={{ justifyContent: 'flex-end' }}>
                                            <button onClick={() => saveEdit(t.id)} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}><Save size={16} /></button>
                                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flx gap-2" style={{ justifyContent: 'flex-end' }}>
                                            <button onClick={() => { setEditingId(t.id); setEditName(t.name); setEditEmail(t.email || ''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} title="Sửa"><Edit2 size={16} /></button>
                                            <button onClick={() => resetPassword(t)} style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer' }} title="Đặt lại mật khẩu"><RefreshCw size={16} /></button>
                                            <button onClick={() => handleDelete(t)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Xóa tài khoản"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {search ? `Không tìm thấy giảng viên với từ khóa "${search}"` : 'Chưa có giảng viên nào'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
