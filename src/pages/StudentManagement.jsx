import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Users, Search, Trash2, Edit2, Save, X, UserPlus, BookOpen, FileSpreadsheet, Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

export default function StudentManagement() {
    const { user, isAdmin } = useAuth();

    // Lớp của giảng viên (admin thấy tất cả)
    const myCourses = useLiveQuery(
        () => isAdmin ? db.courses.toArray() : db.courses.where({ teacherId: user?.id }).toArray(),
        [isAdmin, user?.id]
    ) || [];

    // Enrollments trong lớp của giảng viên
    const myEnrollments = useLiveQuery(async () => {
        if (!myCourses.length) return [];
        const ids = myCourses.map(c => c.id);
        return db.enrollments.where('courseId').anyOf(ids).toArray();
    }, [myCourses]) || [];

    // Chỉ load sinh viên thuộc lớp của giảng viên
    const myStudentIds = useMemo(
        () => [...new Set(myEnrollments.map(e => e.studentId))],
        [myEnrollments]
    );
    const students = useLiveQuery(async () => {
        if (isAdmin) return db.users.where({ role: 'student' }).toArray();
        if (!myStudentIds.length) return [];
        return db.users.where('id').anyOf(myStudentIds).toArray();
    }, [isAdmin, myStudentIds]) || [];

    // Filter UI
    const [search, setSearch] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');

    // Form chỉnh sửa
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');

    // Form thêm sinh viên
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newCourseId, setNewCourseId] = useState('');

    // Import Excel – chọn lớp trước
    const [importCourseId, setImportCourseId] = useState('');

    // Danh sách hiển thị sau khi lọc
    const filtered = useMemo(() => {
        let base = students;
        if (selectedCourseId !== 'all') {
            const cid = parseInt(selectedCourseId, 10);
            const inClass = new Set(myEnrollments.filter(e => e.courseId === cid).map(e => e.studentId));
            base = base.filter(s => inClass.has(s.id));
        }
        const q = search.toLowerCase();
        if (!q) return base;
        return base.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            (s.email && s.email.toLowerCase().includes(q))
        );
    }, [students, selectedCourseId, myEnrollments, search]);

    const getEnrolledInMyCourses = (studentId) => {
        const myIds = new Set(myCourses.map(c => c.id));
        return myEnrollments
            .filter(e => e.studentId === studentId && myIds.has(e.courseId))
            .map(e => myCourses.find(c => c.id === e.courseId)?.name)
            .filter(Boolean);
    };

    const startEdit = (st) => { setEditingId(st.id); setEditName(st.name); setEditEmail(st.email || ''); };
    const saveEdit = async (id) => {
        if (!editName.trim()) return toast.error('Họ tên không được để trống!');
        await db.users.update(id, { name: editName.trim(), email: editEmail.trim() });
        toast.success('Đã cập nhật thông tin sinh viên');
        setEditingId(null);
    };

    // Xóa sinh viên khỏi lớp (không xóa tài khoản)
    const handleRemoveFromCourse = async (student) => {
        if (selectedCourseId !== 'all') {
            const cid = parseInt(selectedCourseId, 10);
            const course = myCourses.find(c => c.id === cid);
            if (!window.confirm(`Xóa "${student.name}" (${student.code}) khỏi lớp "${course?.name}"?`)) return;
            const enr = myEnrollments.find(e => e.studentId === student.id && e.courseId === cid);
            if (enr) await db.enrollments.delete(enr.id);
            toast.success(`Đã xóa khỏi lớp ${course?.name}`);
        } else {
            const myIds = new Set(myCourses.map(c => c.id));
            const toDelete = myEnrollments.filter(e => e.studentId === student.id && myIds.has(e.courseId));
            if (!window.confirm(`Xóa "${student.name}" (${student.code}) khỏi tất cả lớp của bạn (${toDelete.length} lớp)?`)) return;
            for (const e of toDelete) await db.enrollments.delete(e.id);
            toast.success(`Đã xóa khỏi ${toDelete.length} lớp`);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const code = newCode.trim().toUpperCase();
        if (!code || !newName.trim()) return toast.error('Vui lòng nhập mã SV và họ tên!');
        let targetUser = await db.users.where('code').equals(code).first();
        if (!targetUser) {
            const id = await db.users.add({
                code, username: code.toLowerCase(), password: '123',
                role: 'student', name: newName.trim(), email: newEmail.trim(),
                phone: '', avatar: null, createdAt: new Date().toISOString()
            });
            targetUser = { id };
            toast.success(`Đã tạo tài khoản sinh viên ${code}`);
        } else {
            toast(`Tài khoản ${code} đã tồn tại, tiến hành ghi danh.`, { icon: 'ℹ️' });
        }
        if (newCourseId) {
            const cid = parseInt(newCourseId, 10);
            const existing = await db.enrollments.where({ studentId: targetUser.id, courseId: cid }).first();
            if (!existing) {
                await db.enrollments.add({ studentId: targetUser.id, courseId: cid });
                const cname = myCourses.find(c => c.id === cid)?.name;
                toast.success(`Đã ghi danh vào lớp "${cname}"`);
            } else {
                toast('Sinh viên đã có trong lớp này rồi.', { icon: 'ℹ️' });
            }
        }
        setNewCode(''); setNewName(''); setNewEmail(''); setNewCourseId('');
        setShowAddForm(false);
    };

    const handleResetPassword = async (st) => {
        if (!window.confirm(`Đặt lại mật khẩu của "${st.name}" về "123"?`)) return;
        await db.users.update(st.id, { password: '123' });
        toast.success(`Đã đặt lại mật khẩu về "123"`);
    };

    // Import Excel → ghi danh thẳng vào lớp được chọn
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!importCourseId) return toast.error('Vui lòng chọn lớp muốn import vào!');
        const cid = parseInt(importCourseId, 10);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1).filter(r => r[0] || r[1]);
                let added = 0, enrolled = 0, skipped = 0;
                for (const row of rows) {
                    const code = String(row[0] || '').trim().toUpperCase();
                    const name = String(row[1] || '').trim();
                    const email = String(row[2] || '').trim();
                    if (!code || !name) { skipped++; continue; }
                    let student = await db.users.where('code').equals(code).first();
                    if (!student) {
                        const id = await db.users.add({
                            code, username: code.toLowerCase(), password: '123',
                            role: 'student', name, email, phone: '', avatar: null,
                            createdAt: new Date().toISOString()
                        });
                        student = { id };
                        added++;
                    }
                    const existing = await db.enrollments.where({ studentId: student.id, courseId: cid }).first();
                    if (!existing) {
                        await db.enrollments.add({ studentId: student.id, courseId: cid });
                        enrolled++;
                    }
                }
                const cname = myCourses.find(c => c.id === cid)?.name;
                toast.success(`Lớp "${cname}": Tạo mới ${added} SV, ghi danh ${enrolled} SV. Bỏ qua ${skipped} dòng lỗi.`);
            } catch {
                toast.error('File không đúng định dạng!');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const exportTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Mã SV', 'Họ và Tên', 'Email'],
            ['SV001', 'Nguyễn Văn A', 'sva@school.edu.vn'],
            ['SV002', 'Trần Thị B', 'svb@school.edu.vn'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachSV');
        XLSX.writeFile(wb, 'Mau-DanhSach-SinhVien.xlsx');
    };

    const currentCourse = myCourses.find(c => c.id === parseInt(selectedCourseId));

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="flx flx-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} color="var(--primary)" /> Quản Lý Sinh Viên
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {selectedCourseId === 'all'
                            ? <><strong>{filtered.length}</strong> sinh viên trong {isAdmin ? 'toàn hệ thống' : 'các lớp của bạn'}</>
                            : <><strong>{filtered.length}</strong> sinh viên — Lớp: <strong>{currentCourse?.name}</strong></>}
                    </p>
                </div>
                <div className="flx gap-2" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={exportTemplate} style={{ fontSize: '0.85rem' }}>
                        <Download size={16} /> Tải mẫu Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                        <UserPlus size={18} /> Thêm Sinh Viên
                    </button>
                </div>
            </div>

            {/* Import Excel card */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <FileSpreadsheet size={20} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Import Excel vào lớp:</span>
                <select
                    className="input-field"
                    style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
                    value={importCourseId}
                    onChange={e => setImportCourseId(e.target.value)}
                >
                    <option value="">-- Chọn lớp --</option>
                    {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <label
                    className={`btn ${importCourseId ? 'btn-primary' : 'btn-outline'}`}
                    style={{ cursor: importCourseId ? 'pointer' : 'not-allowed', opacity: importCourseId ? 1 : 0.5, fontSize: '0.85rem' }}
                >
                    <FileSpreadsheet size={16} /> Chọn file Excel
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportExcel} disabled={!importCourseId} />
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cột: Mã SV | Họ Tên | Email</span>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="glass-card animate-in" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Thêm Sinh Viên Vào Lớp</h3>
                    <form style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }} onSubmit={handleAddStudent}>
                        <div style={{ minWidth: 120 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã SV *</label>
                            <input className="input-field" placeholder="SV010" value={newCode} onChange={e => setNewCode(e.target.value)} required />
                        </div>
                        <div style={{ flex: 2, minWidth: 200 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Họ và Tên *</label>
                            <input className="input-field" placeholder="Nguyễn Văn A" value={newName} onChange={e => setNewName(e.target.value)} required />
                        </div>
                        <div style={{ flex: 2, minWidth: 180 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" className="input-field" placeholder="sv@school.edu.vn" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        </div>
                        <div style={{ minWidth: 200 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ghi danh vào lớp</label>
                            <select className="input-field" value={newCourseId} onChange={e => setNewCourseId(e.target.value)}>
                                <option value="">-- Không chọn --</option>
                                {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flx gap-2">
                            <button type="submit" className="btn btn-primary"><Save size={16} /> Lưu</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}><X size={16} /></button>
                        </div>
                    </form>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                        Nếu mã SV đã tồn tại, sinh viên sẽ được ghi danh thẳng vào lớp (không tạo tài khoản mới). Mật khẩu mặc định: <strong>"123"</strong>.
                    </p>
                </div>
            )}

            {/* Filter bar */}
            <div className="flx gap-3" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
                    <Search size={16} style={{ position: 'absolute', top: '50%', left: '0.8rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        className="input-field"
                        placeholder="Tìm theo mã SV, tên, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.4rem' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={16} color="var(--text-muted)" />
                    <select className="input-field" style={{ minWidth: 200 }} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                        <option value="all">Tất cả lớp của tôi</option>
                        {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Cảnh báo khi chưa có lớp */}
            {myCourses.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p>Bạn chưa có lớp học nào. Hãy tạo lớp trước, sau đó thêm sinh viên vào lớp.</p>
                </div>
            )}

            {/* Table */}
            {myCourses.length > 0 && (
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {search
                                ? `Không tìm thấy sinh viên khớp với "${search}".`
                                : selectedCourseId !== 'all'
                                    ? `Lớp "${currentCourse?.name}" chưa có sinh viên nào. Hãy thêm hoặc import Excel.`
                                    : 'Chưa có sinh viên trong các lớp của bạn.'}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.04)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>MSSV</th>
                                    <th style={{ padding: '1rem' }}>Họ Tên</th>
                                    <th style={{ padding: '1rem' }}>Email</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Số lớp đang học</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(st => {
                                    const enrolledNames = getEnrolledInMyCourses(st.id);
                                    return (
                                        <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{st.code}</td>
                                            <td style={{ padding: '1rem' }}>
                                                {editingId === st.id
                                                    ? <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} autoFocus />
                                                    : st.name}
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {editingId === st.id
                                                    ? <input className="input-field" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email..." style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} />
                                                    : st.email || <span style={{ opacity: 0.4 }}>—</span>}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span title={enrolledNames.join(', ') || 'Chưa ghi danh lớp nào'}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.6rem', borderRadius: '1rem', background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'help' }}>
                                                    <BookOpen size={13} /> {enrolledNames.length}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div className="flx gap-2" style={{ justifyContent: 'flex-end' }}>
                                                    {editingId === st.id ? (
                                                        <>
                                                            <button onClick={() => saveEdit(st.id)} className="btn btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}><Save size={14} /> Lưu</button>
                                                            <button onClick={() => setEditingId(null)} className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}><X size={14} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(st)} title="Chỉnh sửa" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.3rem' }}><Edit2 size={16} /></button>
                                                            <button onClick={() => handleResetPassword(st)} title="Đặt lại mật khẩu về 123" style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>🔑</button>
                                                            <button
                                                                onClick={() => handleRemoveFromCourse(st)}
                                                                title={selectedCourseId !== 'all' ? 'Xóa khỏi lớp này' : 'Xóa khỏi tất cả lớp của bạn'}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.3rem' }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}