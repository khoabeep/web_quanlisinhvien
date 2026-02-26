import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, X, CheckCircle } from 'lucide-react';
import { db } from '../db';
import { useFaceApi } from '../hooks/useFaceApi';

export default function FaceRegistrationModal({ student, onClose, onComplete }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { modelsLoaded, modelsError } = useFaceApi();
    const [status, setStatus] = useState('Khởi động Camera...');
    const [success, setSuccess] = useState(false);
    const [stream, setStream] = useState(null);

    useEffect(() => {
        let activeStream = null;
        if (modelsLoaded) {
            startVideo();
        }
        async function startVideo() {
            try {
                setStatus('Đang kết nối Camera...');
                activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                    setStream(activeStream);
                    setStatus('Vui lòng nhìn thẳng vào Camera');
                }
            } catch (err) {
                setStatus('Lỗi: Không thể truy cập Camera. Hãy cấp quyền.');
            }
        }

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [modelsLoaded]);

    const handleCapture = async () => {
        if (!videoRef.current) return;
        setStatus('Đang phân tích khuôn mặt bằng AI...');

        // Create a canvas to capture the current frame
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);

        // Detect face
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setStatus('Không phát hiện thấy khuôn mặt. Thử lại sau 2 giây.');
            setTimeout(() => setStatus('Vui lòng nhìn thẳng vào Camera'), 2000);
            return;
        }

        // Convert Float32Array to standard array for saving in Dexie
        const descriptorArray = Array.from(detection.descriptor);

        try {
            await db.users.update(student.id, {
                faceData: descriptorArray
            });
            setStatus('Khớp nối thành công! Đã đăng ký.');
            setSuccess(true);
            if (stream) stream.getTracks().forEach(t => t.stop());
            setTimeout(() => {
                onComplete();
                onClose();
            }, 1500);
        } catch (err) {
            setStatus('Lỗi khi lưu dữ liệu. Thử lại.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-card flx flx-col gap-4 animate-in" style={{ width: 500, maxWidth: '90%', position: 'relative', background: 'var(--bg-secondary)' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={24} />
                </button>

                <h3 className="flx gap-2"><Camera size={24} color="var(--primary)" /> Đăng ký khuôn mặt AI</h3>
                <p style={{ color: 'var(--text-muted)' }}>Sinh viên: <strong>{student.name} ({student.code})</strong></p>

                {modelsError && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{modelsError}</div>}

                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {!modelsLoaded && !modelsError && <div className="flx flx-center" style={{ position: 'absolute', inset: 0, color: '#fff' }}>Đang nạp AI Models (sẽ mất vài giây)...</div>}
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: success ? 0.3 : 1 }} />
                    {success && <div className="flx flx-center flx-col" style={{ position: 'absolute', inset: 0, color: 'var(--success)' }}>
                        <CheckCircle size={64} style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: 0 }}>Thành công!</h3>
                    </div>}
                </div>

                <div className="flx flx-between">
                    <span style={{ fontSize: '0.9rem', color: success ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>{status}</span>
                    <button className="btn btn-primary" onClick={handleCapture} disabled={!modelsLoaded || success}>
                        Chụp và Phân tích
                    </button>
                </div>
            </div>
        </div>
    );
}
