import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Scan, MapPin, Loader } from 'lucide-react';
import { db as firebaseDb } from '../firebase';
import { ref, get, set, child } from 'firebase/database';

// Haversine distance (metres) — client-side GPS validation
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MobileScan() {
    const { sessionId, classId } = useParams();
    const [studentCode, setStudentCode] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    // GPS
    const [gpsStatus, setGpsStatus] = useState('idle');
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        if ('geolocation' in navigator) {
            setGpsStatus('loading');
            navigator.geolocation.getCurrentPosition(
                (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('done'); },
                () => setGpsStatus('denied'),
                { timeout: 8000 }
            );
        } else {
            setGpsStatus('denied');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const code = studentCode.trim().toUpperCase();
        if (!code) return;
        setStatus('loading');

        try {
            const sessionRef = ref(firebaseDb, `sessions/${sessionId}`);
            const snapshot = await get(sessionRef);

            if (!snapshot.exists()) {
                setStatus('error'); setMessage('Phiên điểm danh không tồn tại.'); return;
            }

            const sessionData = snapshot.val();

            // Kiểm tra phiên còn mở không
            if (sessionData.status === 'closed') {
                setStatus('error'); setMessage('Phiên điểm danh đã kết thúc. Vui lòng liên hệ giảng viên.'); return;
            }

            // Kiểm tra đã điểm danh chưa (dùng studentCode làm key → tự nhiên chặn trùng)
            const safeCode = code.replace(/[.#$[\]/]/g, '_');
            if (sessionData.scans?.[safeCode]) {
                setStatus('error'); setMessage('Bạn đã điểm danh rồi! ✅'); return;
            }

            // Kiểm tra GPS nếu phiên có cài
            const settings = sessionData.settings;
            if (settings?.lat && settings?.lng && userLocation) {
                const dist = haversineDistance(settings.lat, settings.lng, userLocation.lat, userLocation.lng);
                if (dist > (settings.radius || 100)) {
                    setStatus('error'); setMessage(`Vị trí của bạn cách lớp học ${Math.round(dist)}m. Vui lòng đến đúng phòng học.`); return;
                }
            }

            // Ghi điểm danh vào Firebase
            await set(child(sessionRef, `scans/${safeCode}`), {
                studentCode: code,
                timestamp: new Date().toISOString(),
                lat: userLocation?.lat || null,
                lng: userLocation?.lng || null,
            });

            setStatus('success');
            setMessage('Điểm danh thành công! ✅');
            setStudentCode('');
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Không thể kết nối. Kiểm tra internet và thử lại.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--bg-main)'
        }}>
            <div className="glass-card animate-in" style={{ width: '100%', maxWidth: 400, padding: '2rem' }}>
                <div className="flx flx-center" style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    <Scan size={48} />
                </div>

                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Điểm Danh Lớp Học</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Nhập mã sinh viên của bạn để xác nhận có mặt
                </p>

                {/* Trạng thái GPS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.82rem', background: gpsStatus === 'done' ? 'rgba(16,185,129,0.08)' : gpsStatus === 'denied' ? 'rgba(245,158,11,0.08)' : 'rgba(79,70,229,0.06)' }}>
                    {gpsStatus === 'loading' && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} color="var(--primary)" />}
                    {gpsStatus === 'done' && <MapPin size={14} color="var(--success)" />}
                    {gpsStatus === 'denied' && <MapPin size={14} color="var(--warning)" />}
                    <span style={{ color: gpsStatus === 'done' ? 'var(--success)' : gpsStatus === 'denied' ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {gpsStatus === 'loading' && 'Đang lấy vị trí GPS...'}
                        {gpsStatus === 'done' && 'Đã ghi nhận vị trí GPS'}
                        {gpsStatus === 'denied' && 'GPS không khả dụng — vẫn có thể điểm danh'}
                        {gpsStatus === 'idle' && 'Kiểm tra GPS...'}
                    </span>
                </div>

                {status === 'success' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={20} />
                        <strong>{message}</strong>
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} />
                        <strong>{message}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flx flx-col gap-4">
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Ví dụ: SV001"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        style={{ fontSize: '1.25rem', padding: '1rem', textAlign: 'center' }}
                        required
                        autoFocus
                    />

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={status === 'loading' || !studentCode.trim()}
                        style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}
                    >
                        {status === 'loading' ? 'Đang gửi...' : 'Xác nhận Điểm Danh'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hệ thống Điểm danh Nội bộ &bull; IP: {window.location.hostname}
                </div>
            </div>
        </div>
    );
}
