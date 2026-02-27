import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // Tab State: 'teacher' | 'student'
    const [role, setRole] = useState('student');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Nếu đã đăng nhập thì tự chuyển trang
    if (isAuthenticated) {
        return <Navigate to={user?.role === 'teacher' ? '/teacher' : '/student'} />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const loggedInUser = await login(code, password);
        setIsLoading(false);
        if (loggedInUser) {
            if (loggedInUser.role === 'admin' || loggedInUser.role === 'teacher') {
                navigate('/teacher');
            } else {
                navigate('/student');
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations */}
            <div className="bg-shape shadow-primary" style={{ top: '10%', left: '10%', width: 300, height: 300 }} />
            <div className="bg-shape shadow-secondary" style={{ bottom: '10%', right: '10%', width: 400, height: 400 }} />

            <div className="glass-card animate-in" style={{ width: '100%', maxWidth: 420, padding: '3rem 2rem', position: 'relative', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: 64, height: 64, margin: '0 auto 1rem', background: 'var(--primary)',
                        borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.4)'
                    }}>
                        <ShieldCheck size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontWeight: 700 }}>Mini LMS V8</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Cổng Đăng Nhập Hệ Thống</p>
                </div>

                {/* Role Switcher */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <button
                        type="button"
                        onClick={() => setRole('student')}
                        style={{
                            flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: role === 'student' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: role === 'student' ? 'var(--text)' : 'var(--text-muted)',
                            fontWeight: role === 'student' ? 600 : 400,
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Sinh Viên
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        style={{
                            flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: role === 'teacher' ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                            color: role === 'teacher' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: role === 'teacher' ? 600 : 400,
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Giảng Viên
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flx flx-col gap-4">
                    <div style={{ position: 'relative' }}>
                        <User size={20} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            required
                            className="input-field"
                            placeholder={role === 'teacher' ? "Tên đăng nhập (VD: admin)" : "Mã Sinh Viên (VD: SV001)"}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            style={{ paddingLeft: '3rem', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={20} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            required
                            className="input-field"
                            placeholder={role === 'teacher' ? "Mật khẩu quản trị" : "Mật khẩu (mặc định: 123)"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ paddingLeft: '3rem', fontSize: '1rem' }}
                        />
                    </div>

                    {role === 'teacher' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '-0.5rem 0 0.5rem' }}>
                            Thông tin mặc định: admin / 123
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !code.trim() || !password.trim()}
                        style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                        {isLoading ? 'Đang xác thực...' : 'Đăng Nhập'} <ArrowRight size={20} />
                    </button>
                </form>

            </div>
        </div>
    );
}
