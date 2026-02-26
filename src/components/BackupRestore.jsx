// Tính năng #19: Backup & Restore toàn bộ dữ liệu IndexedDB
import React, { useState } from 'react';
import { db } from '../db';
import { Download, Upload, AlertTriangle, CheckCircle, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BackupRestore() {
    const [restoring, setRestoring] = useState(false);

    const handleBackup = async () => {
        try {
            const tables = ['users', 'courses', 'enrollments', 'attendanceSessions',
                'attendanceRecords', 'materials', 'assignments', 'submissions',
                'grades', 'announcements', 'schedules', 'discussions', 'notifications'];

            const backup = { version: 3, exportedAt: new Date().toISOString(), data: {} };

            for (const table of tables) {
                try {
                    backup.data[table] = await db[table].toArray();
                } catch {
                    backup.data[table] = [];
                }
            }

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LMS_Backup_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Đã xuất file backup thành công!');
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi tạo backup!');
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.confirm('⚠️ KHÔI PHỤC sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay bằng dữ liệu từ file backup.\n\nBạn có chắc chắn muốn tiếp tục?')) {
            e.target.value = null;
            return;
        }

        setRestoring(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const backup = JSON.parse(evt.target.result);
                if (!backup.data) throw new Error('File backup không hợp lệ');

                const tables = Object.keys(backup.data);
                for (const table of tables) {
                    if (db[table]) {
                        await db[table].clear();
                        if (backup.data[table].length > 0) {
                            await db[table].bulkAdd(backup.data[table]);
                        }
                    }
                }

                toast.success('Khôi phục dữ liệu thành công! Tải lại trang để áp dụng.');
                setTimeout(() => window.location.reload(), 2000);
            } catch (err) {
                console.error(err);
                toast.error('Lỗi khi đọc file backup: ' + err.message);
            } finally {
                setRestoring(false);
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={20} /> Sao Lưu & Khôi Phục Dữ Liệu
            </h3>

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--warning)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Dữ liệu được lưu cục bộ trong trình duyệt (IndexedDB). Hãy xuất file backup thường xuyên để tránh mất dữ liệu khi xóa cache.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                    <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
                    <h4 style={{ marginBottom: '0.5rem' }}>Xuất Backup</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Lưu toàn bộ dữ liệu ra file JSON</p>
                    <button className="btn btn-primary" onClick={handleBackup} style={{ width: '100%', justifyContent: 'center' }}>
                        <Download size={18} /> Tải Xuống Backup
                    </button>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                    <Upload size={32} color="var(--danger)" style={{ marginBottom: '0.75rem' }} />
                    <h4 style={{ marginBottom: '0.5rem' }}>Khôi Phục</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Nạp lại từ file JSON đã backup</p>
                    <label className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                        {restoring ? 'Đang khôi phục...' : <><Upload size={18} /> Chọn File Backup</>}
                        <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} disabled={restoring} />
                    </label>
                </div>
            </div>
        </div>
    );
}
