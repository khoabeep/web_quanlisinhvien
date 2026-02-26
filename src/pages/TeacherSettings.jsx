import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../db';
import { Settings as SettingsIcon, Save, User, Lock, AlertTriangle, Camera, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import BackupRestore from '../components/BackupRestore';

export default function TeacherSettings() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatar, setAvatar] = useState(user?.avatar || null);
    const avatarInputRef = useRef();

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            setAvatar(base64);
            await db.users.update(user.id, { avatar: base64 });
            const updated = await db.users.get(user.id);
            localStorage.setItem('lms_auth_user', JSON.stringify(updated));
            toast.success('Cập nhật ảnh đại diện thành công!');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await db.users.update(user.id, { name, email, phone });
            const updatedUser = await db.users.get(user.id);
            localStorage.setItem('lms_auth_user', JSON.stringify(updatedUser));
            toast.success("Cập nhật thông tin Quản trị thành công! Tải lại trang để áp dụng.");
        } catch (err) {
            toast.error("Lỗi khi cập nhật!");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (password !== user.password) {
            toast.error("Mật khẩu hiện tại không đúng!");
            return;
        }
        if (newPassword.length < 3) {
            toast.error("Mật khẩu mới quá ngắn!");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp!");
            return;
        }
        try {
            await db.users.update(user.id, { password: newPassword });
            toast.success("Đổi mật khẩu thành công!");
            setPassword('');
            setNewPassword('');
            const updatedUser = await db.users.get(user.id);
            localStorage.setItem('lms_auth_user', JSON.stringify(updatedUser));
        } catch (err) {
            toast.error("Trục trặc hệ thống khi đổi mật khẩu.");
        }
    };

    return (
        <div className="animate-in">
            <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SettingsIcon size={24} color="var(--primary)" /> Hồ Sơ & Cài Đặt Quản Trị
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                {/* Cập nhật thông tin */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={20} /> Hồ Sơ Giảng Viên
                    </h3>

                    {/* Tính năng #12: Avatar upload */}
                    <div className="flx flx-col flx-center" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '2px dashed var(--primary)', overflow: 'hidden' }}>
                            {avatar
                                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <User size={40} color="var(--primary)" style={{ opacity: 0.5 }} />}
                            <button onClick={() => avatarInputRef.current?.click()}
                                style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Camera size={14} />
                            </button>
                        </div>
                        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nhấp biểu tượng camera để thay ảnh</div>
                    </div>

                    <form className="flx flx-col gap-4" onSubmit={handleSaveProfile}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mã Giảng Viên (Username đăng nhập)</label>
                            <input className="input-field" value={user?.code} disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Họ và Tên</label>
                            <input className="input-field" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email liên hệ</label>
                            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Số điện thoại</label>
                            <input type="tel" className="input-field" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                            <Save size={18} /> Lưu Thông Tin
                        </button>
                    </form>
                </div>

                {/* Đổi mật khẩu */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={20} /> Bảo Mật Quản Trị
                    </h3>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Xin lưu ý tài khoản giảng viên có quyền quyết định toàn bộ máy chủ. Vui lòng sử dụng mật khẩu mạnh cho tài khoản này.</span>
                    </div>

                    <form className="flx flx-col gap-4" onSubmit={handleChangePassword}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mật khẩu hiện tại</label>
                            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mật khẩu mới</label>
                            <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Xác nhận mật khẩu mới</label>
                            <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Nhập lại mật khẩu mới" />
                        </div>
                        <button type="submit" className="btn btn-danger" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                            Đổi Mật Khẩu
                        </button>
                    </form>
                </div>
            </div>

            {/* Tính năng #19: Sao lưu & Phục hồi */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={20} color="var(--primary)" /> Sao Lưu & Phục Hồi Dữ Liệu
                </h3>
                <BackupRestore />
            </div>
        </div>
    );
}
