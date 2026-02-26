// Tính năng #4: Điểm danh bằng nhận diện khuôn mặt AI
import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, X, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { db } from '../db';
import { useFaceApi } from '../hooks/useFaceApi';
import toast from 'react-hot-toast';

export default function FaceAttendanceModal({ courseId, sessionId, onClose, onSuccess }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { modelsLoaded, modelsError } = useFaceApi();
    const [stream, setStream] = useState(null);
    const [status, setStatus] = useState('Đang khởi động camera...');
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState([]); // { student, confidence, matched }
    const intervalRef = useRef(null);

    // Load danh sách sinh viên có faceData trong lớp
    const [studentsWithFace, setStudentsWithFace] = useState([]);
    const [alreadyPresent, setAlreadyPresent] = useState([]);

    useEffect(() => {
        const load = async () => {
            const enrollments = await db.enrollments.where({ courseId }).toArray();
            const studentIds = enrollments.map(e => e.studentId);
            const users = await db.users.where('id').anyOf(studentIds).toArray();
            const withFace = users.filter(u => u.faceData && u.faceData.length > 0);
            setStudentsWithFace(withFace);

            const records = await db.attendanceRecords.where({ sessionId }).toArray();
            setAlreadyPresent(records.map(r => r.studentId));
        };
        load();
    }, [courseId, sessionId]);

    useEffect(() => {
        let activeStream = null;
        if (modelsLoaded) {
            const start = async () => {
                try {
                    setStatus('Đang kết nối camera...');
                    activeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = activeStream;
                        setStream(activeStream);
                        setStatus('Camera sẵn sàng. Nhấn Bắt Đầu Quét để điểm danh tự động.');
                    }
                } catch (err) {
                    setStatus('Lỗi: Không thể truy cập camera. Hãy cấp quyền trình duyệt.');
                }
            };
            start();
        }
        return () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
    }, [modelsLoaded]);

    const startScanning = () => {
        if (!stream || !modelsLoaded || studentsWithFace.length === 0) {
            toast.error('Chưa có sinh viên nào đăng ký khuôn mặt trong lớp này!');
            return;
        }
        setScanning(true);
        setStatus('🔄 Đang quét khuôn mặt liên tục...');

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            try {
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) return;

                const descriptor = detection.descriptor;

                // So sánh với tất cả sinh viên có face data
                let bestMatch = null;
                let bestDist = 0.55; // Ngưỡng nhận diện

                for (const student of studentsWithFace) {
                    if (alreadyPresent.includes(student.id)) continue;
                    const saved = new Float32Array(student.faceData);
                    const dist = faceapi.euclideanDistance(descriptor, saved);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestMatch = student;
                    }
                }

                if (bestMatch) {
                    const confidence = Math.round((1 - bestDist) * 100);

                    // Ghi nhận điểm danh
                    const alreadyRecorded = await db.attendanceRecords
                        .where('[sessionId+studentId]').equals([sessionId, bestMatch.id]).first();

                    if (!alreadyRecorded) {
                        await db.attendanceRecords.add({
                            sessionId,
                            studentId: bestMatch.id,
                            courseId,
                            status: 'present',
                            timestamp: new Date().toISOString(),
                            bonusPoints: 0,
                            method: 'face'
                        });

                        setAlreadyPresent(prev => [...prev, bestMatch.id]);
                        setResults(prev => [...prev, { student: bestMatch, confidence }]);
                        toast.success(`✅ ${bestMatch.name} (${confidence}% khớp)`);

                        if (onSuccess) onSuccess(bestMatch);
                    }
                }

                // Vẽ hộp nhận diện lên canvas
                if (canvasRef.current && videoRef.current) {
                    faceapi.matchDimensions(canvasRef.current, { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    faceapi.draw.drawDetections(canvasRef.current, [detection]);
                }
            } catch { /* Bỏ qua lỗi khi đóng */ }
        }, 1200);
    };

    const stopScanning = () => {
        setScanning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus(`Đã dừng. Đã điểm danh được ${results.length} sinh viên.`);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleClose = () => {
        stopScanning();
        if (stream) stream.getTracks().forEach(t => t.stop());
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: 800, background: 'var(--bg-secondary)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={handleClose} style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', zIndex: 1 }}>
                    <X size={24} />
                </button>

                <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={22} color="var(--primary)" /> Điểm Danh Bằng Khuôn Mặt AI
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    {studentsWithFace.length} sinh viên đã đăng ký khuôn mặt trong lớp này
                </p>

                {modelsError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
                        <AlertTriangle size={16} style={{ marginRight: 8 }} />{modelsError}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Camera feed */}
                    <div>
                        <div style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3' }}>
                            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                            {scanning && (
                                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(16,185,129,0.9)', color: '#fff', padding: '4px 10px', borderRadius: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></span>
                                    Đang quét...
                                </div>
                            )}
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>{status}</p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            {!scanning ? (
                                <button className="btn btn-primary" onClick={startScanning} disabled={!modelsLoaded} style={{ flex: 1, justifyContent: 'center' }}>
                                    <Zap size={18} /> Bắt Đầu Quét
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={stopScanning} style={{ flex: 1, justifyContent: 'center' }}>
                                    Dừng Quét
                                </button>
                            )}
                            <button className="btn btn-outline" onClick={handleClose} style={{ flex: 1, justifyContent: 'center' }}>
                                Đóng
                            </button>
                        </div>
                    </div>

                    {/* Kết quả nhận diện */}
                    <div>
                        <h4 style={{ marginBottom: '1rem' }}>Đã Nhận Diện ({results.length})</h4>
                        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {results.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Chưa nhận diện được ai. Đưa khuôn mặt vào camera.
                                </div>
                            ) : (
                                results.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', borderLeft: '3px solid var(--success)' }}>
                                        <CheckCircle size={20} color="var(--success)" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.student.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.student.code} • Khớp {r.confidence}%</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
