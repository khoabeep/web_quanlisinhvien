import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, UserCheck, StopCircle, QrCode, Camera, MapPin, Clock, Edit3, CheckCircle, XCircle, Scan } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import FaceAttendanceModal from '../components/FaceAttendanceModal';
import toast from 'react-hot-toast';
import { db as firebaseDb } from '../firebase';
import { ref, set, onValue, off } from 'firebase/database';

export default function AttendancePanel() {
    const { id } = useParams();
    const courseId = parseInt(id, 10);
    const navigate = useNavigate();

    const cls = useLiveQuery(() => db.courses.get(courseId));

    // Load enrolled students
    const enrollments = useLiveQuery(() => db.enrollments.where({ courseId }).toArray());
    const [students, setStudents] = useState([]);

    useEffect(() => {
        const loadStudents = async () => {
            if (enrollments && enrollments.length > 0) {
                const sIds = enrollments.map(e => e.studentId);
                const users = await db.users.where('id').anyOf(sIds).toArray();
                setStudents(users);
            } else {
                setStudents([]);
            }
        };
        loadStudents();
    }, [enrollments]);

    const [session, setSession] = useState(null);
    const [records, setRecords] = useState([]); // Chứa danh sách { studentId, studentCode, time }
    const [isRunning, setIsRunning] = useState(false);
    const [scanUrl, setScanUrl] = useState('');

    // Tính năng #3: Hẹn giờ tự động đóng phiên
    const [expiryMinutes, setExpiryMinutes] = useState(15);
    const [timeLeft, setTimeLeft] = useState(null); // giây còn lại
    const timerRef = useRef(null);

    // Tính năng #4: Điểm danh khuôn mặt
    const [showFaceModal, setShowFaceModal] = useState(false);

    // Tính năng #5: Chỉnh sửa thủ công sau khi chốt
    const [manualEditing, setManualEditing] = useState(false);

    // Tính năng #6: GPS - lấy vị trí giáo viên khi bắt đầu
    const [useGPS, setUseGPS] = useState(false);
    const [teacherLocation, setTeacherLocation] = useState(null);
    const [gpsRadius, setGpsRadius] = useState(100); // mét

    // Khởi tạo Phiên Điểm Danh
    const startAttendanceSession = async () => {
        if (!session) {
            // Tính năng #6: GPS - lấy vị trí giáo viên
            let lat = null, lng = null;
            if (useGPS) {
                try {
                    const pos = await new Promise((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                    );
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                    setTeacherLocation({ lat, lng });
                    toast.success('Đã ghi nhận vị trí lớp học!');
                } catch {
                    toast.error('Không lấy được GPS. Điểm danh không kiểm tra vị trí.');
                }
            }

            const newSessionId = await db.attendanceSessions.add({
                courseId,
                date: new Date().toISOString(),
                status: 'active',
                expiryMinutes,
                latitude: lat,
                longitude: lng,
            });
            const sess = { id: newSessionId, courseId, date: new Date().toISOString(), status: 'active', expiryMinutes, latitude: lat, longitude: lng };
            setSession(sess);

            // Tạo phiên trên Firebase Realtime DB (hoạt động mọi nơi, không cần LAN)
            await set(ref(firebaseDb, `sessions/${newSessionId}`), {
                status: 'active',
                settings: (lat && lng) ? { lat, lng, radius: gpsRadius } : null,
                scans: null,
            });

            // Xây dựng URL cho QR Code:
            // - Nếu đang chạy localhost → dùng IP LAN để điện thoại cùng WiFi quét được
            // - Nếu đang production (GitHub Pages) → dùng origin + base path
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            let baseUrl = window.location.origin + import.meta.env.BASE_URL;
            if (isLocal) {
                try {
                    const res = await fetch('/api/get-ip');
                    const data = await res.json();
                    if (data.ip) baseUrl = `http://${data.ip}:5173/`;
                } catch {
                    toast.error('Không lấy được IP LAN. Hãy deploy lên GitHub Pages để dùng mọi nơi.');
                }
            }
            const scanLink = `${baseUrl.replace(/\/$/, '')}/scan/${courseId}/${newSessionId}`;
            setScanUrl(scanLink);

            // Tính năng #3: Khởi động đếm ngược
            const totalSecs = expiryMinutes * 60;
            setTimeLeft(totalSecs);
        }
        setIsRunning(true);
    };

    const stopAttendanceSession = async () => {
        setIsRunning(false);
        setTimeLeft(null);
        if (timerRef.current) clearInterval(timerRef.current);
        if (session) {
            await db.attendanceSessions.update(session.id, { status: 'closed' });
            setSession({ ...session, status: 'closed' });
            // Đánh dấu phiên đóng trên Firebase để từ chối quét mới
            try {
                await set(ref(firebaseDb, `sessions/${session.id}/status`), 'closed');
            } catch (e) { console.warn('Firebase close-session error', e); }
        }
    };

    // Tính năng #3: Bộ đếm ngược tự động đóng
    useEffect(() => {
        if (!isRunning || timeLeft === null) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    stopAttendanceSession();
                    toast('⏱️ Phiên điểm danh đã tự động đóng!', { icon: '🔔' });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const formatTime = (secs) => {
        if (secs === null) return '';
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Tính năng #5: Điểm danh thủ công
    const handleManualToggle = async (student) => {
        if (!session) return;
        const existing = records.find(r => r.studentId === student.id);
        if (existing) {
            // Xóa khỏi có mặt -> vắng
            await db.attendanceRecords.where('[sessionId+studentId]').equals([session.id, student.id]).delete();
            setRecords(prev => prev.filter(r => r.studentId !== student.id));
            toast(`${student.name} đã được đánh dấu Vắng`, { icon: '❌' });
        } else {
            // Thêm vào có mặt
            const now = new Date().toISOString();
            await db.attendanceRecords.add({
                sessionId: session.id,
                studentId: student.id,
                courseId,
                status: 'present',
                timestamp: now,
                bonusPoints: 0,
                method: 'manual'
            });
            setRecords(prev => [...prev, { studentId: student.id, studentCode: student.code, time: now }]);
            toast.success(`${student.name} đã được đánh dấu Có Mặt`);
        }
    };

    // Firebase real-time listener — nhận điểm danh ngay khi sinh viên quét QR
    useEffect(() => {
        if (!isRunning || !session || students.length === 0) return;

        const scansRef = ref(firebaseDb, `sessions/${session.id}/scans`);
        const unsubscribe = onValue(scansRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const scansData = snapshot.val(); // { safeCode: { studentCode, timestamp, lat, lng } }

            Object.values(scansData).forEach(async (scan) => {
                const st = students.find(s => s.code.toLowerCase() === scan.studentCode.toLowerCase());
                if (!st) return;

                setRecords(prev => {
                    if (prev.find(r => r.studentId === st.id)) return prev; // đã có
                    // Lưu vào Dexie
                    db.attendanceRecords.add({
                        sessionId: session.id,
                        studentId: st.id,
                        courseId: courseId,
                        status: 'present',
                        timestamp: scan.timestamp,
                        bonusPoints: 0,
                        method: 'qr'
                    }).catch(() => {}); // ignore nếu đã có
                    return [...prev, { studentId: st.id, studentCode: st.code, time: scan.timestamp }];
                });
            });
        });

        return () => off(scansRef, 'value', unsubscribe);
    }, [isRunning, session, students, courseId]);

    if (!cls) return <div className="animate-in">Đang tải...</div>;

    return (
        <div className="animate-in">
            <div className="flx gap-2" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
                <button onClick={() => navigate(`/teacher/classes/${cls.id}`)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={20} /> Quay lại
                </button>
                <div>
                    <h2 style={{ margin: 0 }}>Điểm Danh: {cls.name}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Chiếu mã QR này lên màn hình hoặc dùng điểm danh AI</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.5fr) 1fr', gap: '2rem' }}>
                <div className="glass-card flx flx-col flx-center" style={{ minHeight: '60vh', background: 'var(--bg-secondary)', position: 'relative' }}>

                    {!isRunning ? (
                        <div className="flx flx-center flx-col gap-4" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
                            <QrCode size={64} color="var(--primary)" style={{ opacity: 0.5 }} />
                            <h3>Phiên điểm danh chưa bắt đầu</h3>

                            {/* Tính năng #3: Cấu hình hẹn giờ */}
                            <div style={{ width: '100%' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>⏱️ Tự động đóng sau (phút)</label>
                                <select className="input-field" value={expiryMinutes} onChange={e => setExpiryMinutes(parseInt(e.target.value))} style={{ marginTop: '0.25rem' }}>
                                    {[5, 10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} phút</option>)}
                                </select>
                            </div>

                            {/* Tính năng #6: GPS */}
                            <div style={{ width: '100%' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={useGPS} onChange={e => setUseGPS(e.target.checked)} />
                                    <MapPin size={16} color="var(--primary)" />
                                    Xác minh vị trí GPS sinh viên
                                </label>
                                {useGPS && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bán kính cho phép (mét)</label>
                                        <input type="number" className="input-field" value={gpsRadius} onChange={e => setGpsRadius(parseInt(e.target.value))} min={20} max={1000} style={{ marginTop: '0.25rem' }} />
                                    </div>
                                )}
                            </div>

                            <button className="btn btn-primary" onClick={startAttendanceSession} style={{ padding: '1rem 2rem', fontSize: '1.2rem', width: '100%', justifyContent: 'center', boxShadow: '0 10px 30px rgba(79,70,229,0.5)' }}>
                                <QrCode size={20} /> Tạo Thẻ QR & Bắt Đầu
                            </button>
                        </div>
                    ) : (
                        <div className="flx flx-col flx-center animate-in" style={{ gap: '1.5rem' }}>
                            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                                <QRCodeSVG value={scanUrl} size={260} level="H" includeMargin={false} />
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Sinh viên quét mã để điểm danh</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Phiên sẽ tự đóng khi hết giờ hoặc GV nhấn Chốt</p>
                            </div>

                            {/* Tính năng #3: Hiển thị đếm ngược */}
                            {timeLeft !== null && (
                                <div style={{ padding: '0.75rem 1.5rem', background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: timeLeft < 60 ? 'var(--danger)' : 'var(--success)', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.2rem' }}>
                                    <Clock size={20} />
                                    {formatTime(timeLeft)}
                                </div>
                            )}

                            <div style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, fontSize: '0.9rem' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1s infinite' }}></span>
                                {scanUrl ? `Đang mở tại: ${new URL(scanUrl).hostname}` : 'Đang mở'}
                                {useGPS && teacherLocation && <span style={{ marginLeft: 4 }}><MapPin size={14} /> GPS bật</span>}
                            </div>

                            {/* Tính năng #4: Nút điểm danh khuôn mặt */}
                            <button className="btn btn-outline" onClick={() => setShowFaceModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Camera size={18} /> Điểm Danh Khuôn Mặt AI
                            </button>
                        </div>
                    )}

                    <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '0.5rem' }}>
                        {session && (
                            <button
                                className="btn btn-outline"
                                onClick={() => setManualEditing(!manualEditing)}
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                title="Điểm danh thủ công"
                            >
                                <Edit3 size={16} /> Thủ Công
                            </button>
                        )}
                        {isRunning && (
                            <button
                                className="btn btn-danger"
                                onClick={stopAttendanceSession}
                            >
                                <StopCircle size={20} /> Chốt Sĩ Số
                            </button>
                        )}
                    </div>
                </div>

                {/* Panel danh sách sinh viên */}
                <div className="glass-card flx flx-col" style={{ gap: '1rem', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>
                            {manualEditing ? '✏️ Chỉnh Sửa Điểm Danh' : `Đã Có Mặt (${records.length}/${students.length || 0})`}
                        </h3>
                        {manualEditing && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setManualEditing(false)}>✕ Đóng</span>
                        )}
                    </div>

                    {students.length === 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>Lớp chưa có sinh viên.</div>
                    )}

                    {records.length === 0 && students.length > 0 && isRunning && !manualEditing && (
                        <div className="flx flx-center flx-col" style={{ color: 'var(--text-muted)', height: '100%', textAlign: 'center', opacity: 0.7 }}>
                            Đang chờ sinh viên quét mã đầu tiên...
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Tính năng #5: Chế độ chỉnh sửa thủ công */}
                        {manualEditing ? (
                            students.map(st => {
                                const isPresent = records.find(r => r.studentId === st.id);
                                return (
                                    <div key={st.id} style={{ padding: '0.75rem 1rem', background: isPresent ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${isPresent ? 'var(--success)' : 'var(--danger)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.95rem' }}>{st.name}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>{st.code}</span>
                                        </div>
                                        <button
                                            onClick={() => handleManualToggle(st)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPresent ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}
                                        >
                                            {isPresent ? <><XCircle size={18} /> Xóa</> : <><CheckCircle size={18} /> Thêm</>}
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            records.map((rec, idx) => {
                                const st = students.find(s => s.id === rec.studentId);
                                if (!st) return null;
                                return (
                                    <div key={idx} className="animate-in" style={{ padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1.05rem' }}>{st.name}</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{st.code}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 500 }}>
                                                <UserCheck size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                                {rec.method === 'face' ? 'Khuôn mặt' : rec.method === 'manual' ? 'Thủ công' : 'QR Code'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rec.time).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Tính năng #4: Modal điểm danh khuôn mặt */}
            {showFaceModal && session && (
                <FaceAttendanceModal
                    courseId={courseId}
                    sessionId={session.id}
                    onClose={() => setShowFaceModal(false)}
                    onSuccess={(student) => {
                        setRecords(prev => [...prev, { studentId: student.id, studentCode: student.code, time: new Date().toISOString(), method: 'face' }]);
                    }}
                />
            )}
        </div>
    );
}
