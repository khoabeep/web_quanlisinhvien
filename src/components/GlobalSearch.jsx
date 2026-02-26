// Tính năng #21: Tìm kiếm toàn cục
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Search, X, User, BookOpen, GraduationCap } from 'lucide-react';

export default function GlobalSearch({ role = 'teacher' }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            const q = query.toLowerCase();
            const [students, courses] = await Promise.all([
                db.users.where('role').equals('student').toArray(),
                db.courses.toArray(),
            ]);
            const res = [];

            students
                .filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
                .slice(0, 4)
                .forEach(s => res.push({ type: 'student', label: s.name, sub: s.code, icon: 'student', link: role === 'teacher' ? '/teacher/students' : null }));

            courses
                .filter(c => c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q)))
                .slice(0, 4)
                .forEach(c => res.push({ type: 'course', label: c.name, sub: c.code || '', icon: 'course', link: role === 'teacher' ? `/teacher/classes/${c.id}` : `/student/classes/${c.id}` }));

            setResults(res);
            setLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [query, role]);

    const handleSelect = (item) => {
        if (item.link) navigate(item.link);
        setQuery('');
        setIsOpen(false);
    };

    // Keyboard shortcut Ctrl+K
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            <div
                onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.8rem',
                    background: 'var(--bg-main)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)', cursor: 'text', color: 'var(--text-muted)', fontSize: '0.85rem'
                }}
            >
                <Search size={14} />
                <span>Tìm kiếm... <kbd style={{ fontSize: '0.7rem', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '0 4px' }}>Ctrl K</kbd></span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh'
                }}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <Search size={20} color="var(--primary)" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Tìm sinh viên, lớp học, môn học..."
                                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '1.1rem', fontFamily: 'var(--font-body)' }}
                                autoFocus
                            />
                            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>}
                        </div>

                        <div style={{ padding: '0.5rem', maxHeight: 400, overflowY: 'auto' }}>
                            {loading && <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tìm...</div>}
                            {!loading && query && results.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy kết quả cho "{query}"</div>
                            )}
                            {!query && (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Gõ tên sinh viên, mã SV, hoặc tên lớp học để tìm kiếm
                                </div>
                            )}
                            {results.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(item)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer', transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.type === 'student' ? 'rgba(79,70,229,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.type === 'student' ? <GraduationCap size={18} color="var(--primary)" /> : <BookOpen size={18} color="var(--success)" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{item.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.type === 'student' ? 'Sinh viên' : 'Lớp học'} • {item.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
