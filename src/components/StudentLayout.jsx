import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, Clock, Settings, GraduationCap, Moon, Sun, CalendarDays } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from './NotificationBell';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <aside style={{
                width: 250, background: 'var(--surface)', borderRight: '1px solid var(--border)',
                padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column'
            }}>
                <div className="flx gap-2" style={{ alignItems: 'center', marginBottom: '3rem', padding: '0 0.5rem', justifyContent: 'space-between' }}>
                    <div className="flx gap-2" style={{ alignItems: 'center' }}>
                        <div style={{ background: 'var(--primary)', color: '#fff', padding: '0.4rem', borderRadius: 8 }}>
                            <GraduationCap size={24} />
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cổng Sinh Viên</span>
                    </div>
                    <NotificationBell />
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavLink to="/student" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} /> Tổng Quan
                    </NavLink>
                    <NavLink to="/student/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Clock size={20} /> Báo Cáo Chuyên Cần
                    </NavLink>
                    <NavLink to="/student/schedule" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <CalendarDays size={20} /> Thời Khóa Biểu
                    </NavLink>
                    <NavLink to="/student/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Settings size={20} /> Cài Đặt Hồ Sơ
                    </NavLink>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div className="flx gap-2" style={{ padding: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.code}</div>
                        </div>
                    </div>
                    <button
                        onClick={toggle}
                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.6rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
                    </button>
                    <button className="nav-link w-100" onClick={handleLogout} style={{ color: 'var(--danger)', background: 'transparent' }}>
                        <LogOut size={20} /> Đăng xuất
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, padding: '2rem', height: '100vh', overflowY: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
}

// Giả lập icon User vì trên không import, có thể bị lỗi cú pháp nhỏ
const User = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
