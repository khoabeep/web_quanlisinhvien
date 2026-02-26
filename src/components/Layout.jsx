import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, FileBarChart2, Settings, Moon, Sun, GraduationCap, CalendarDays, UsersRound, ShieldCheck } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

export default function Layout() {
    const { isDark, toggle } = useTheme();
    const { user, isAdmin } = useAuth();
    return (
        <div className="app-layout">
            {/* Sidebar 2026 Style */}
            <aside className="sidebar">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <h2 className="text-gradient" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <UserCheck size={28} color="var(--primary)" />
                            LMS V8
                        </h2>
                        <NotificationBell />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hệ thống quản lý điểm danh</p>
                    <GlobalSearch role="teacher" />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <NavLink to="/teacher" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                        <LayoutDashboard size={20} />
                        Tổng Quan
                    </NavLink>

                    <NavLink to="/teacher/classes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        Lớp Học
                    </NavLink>

                    <NavLink to="/teacher/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <GraduationCap size={20} />
                        Sinh Viên
                    </NavLink>

                    <NavLink to="/teacher/schedule" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <CalendarDays size={20} />
                        Thời Khóa Biểu
                    </NavLink>

                    {isAdmin && (
                        <NavLink to="/teacher/teachers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <UsersRound size={20} />
                            Giảng Viên
                        </NavLink>
                    )}

                    <NavLink to="/teacher/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <FileBarChart2 size={20} />
                        Báo Cáo
                    </NavLink>

                    <NavLink to="/teacher/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        Cài Đặt
                    </NavLink>
                </nav>

                <div style={{ marginTop: 'auto', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    {isAdmin && (
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <ShieldCheck size={14} /> Quản Trị Viên
                        </p>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Môi trường Local</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                        Hệ thống ổn định
                    </p>
                </div>

                <div className="flx gap-2" style={{ marginTop: '1rem' }}>
                    <button
                        onClick={toggle}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.6rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                        title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        {isDark ? 'Sáng' : 'Tối'}
                    </button>
                    <button className="nav-item" onClick={() => { localStorage.removeItem('lms_auth_user'); window.location.href = "/"; }} style={{ flex: 1, background: 'transparent', color: 'var(--danger)', justifyContent: 'center', margin: 0 }}>Đăng xuất</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
