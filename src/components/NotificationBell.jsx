// Tính năng #17: Chuông thông báo hệ thống
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    const notifications = useLiveQuery(
        () => user ? db.notifications.where({ userId: user.id }).reverse().sortBy('createdAt') : [],
        [user?.id]
    ) || [];

    const unread = notifications.filter(n => !n.isRead).length;

    const markAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        await Promise.all(unreadIds.map(id => db.notifications.update(id, { isRead: true })));
    };

    const markRead = async (id) => {
        await db.notifications.update(id, { isRead: true });
    };

    const deleteNotif = async (id, e) => {
        e.stopPropagation();
        await db.notifications.delete(id);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} color="var(--success)" />;
            case 'warning': return <AlertTriangle size={16} color="var(--warning)" />;
            case 'error': return <AlertTriangle size={16} color="var(--danger)" />;
            default: return <Info size={16} color="var(--primary)" />;
        }
    };

    const timeAgo = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Vừa xong';
        if (m < 60) return `${m} phút trước`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} giờ trước`;
        return `${Math.floor(h / 24)} ngày trước`;
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
                style={{ position: 'relative', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Thông báo"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -6, right: -6,
                        background: 'var(--danger)', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute', top: '110%', right: 0, zIndex: 999,
                        background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-lg)', width: 360, maxHeight: 480,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong>Thông báo</strong>
                            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCheck size={14} /> Đọc tất cả
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Bell size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                                    <p>Không có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => markRead(n.id)}
                                        style={{
                                            padding: '1rem 1.25rem',
                                            borderBottom: '1px solid var(--glass-border)',
                                            background: n.isRead ? 'transparent' : 'rgba(79,70,229,0.05)',
                                            cursor: 'pointer',
                                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                        onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(79,70,229,0.05)'}
                                    >
                                        <div style={{ marginTop: 2 }}>{getIcon(n.type)}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{n.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{n.message}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{timeAgo(n.createdAt)}</div>
                                        </div>
                                        <button onClick={(e) => deleteNotif(n.id, e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper: gửi thông báo tới user
export async function pushNotification(userId, { type = 'info', title, message, link = null }) {
    await db.notifications.add({ userId, type, title, message, isRead: false, createdAt: new Date().toISOString(), link });
}
