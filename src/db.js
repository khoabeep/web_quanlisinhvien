import Dexie from 'dexie';

export const db = new Dexie('V8LMSDatabase');

// Version 2: schema cũ (giữ nguyên để migration)
db.version(2).stores({
  users: '++id, username, &code, role, name, dob, email, phone, avatar, password',
  courses: '++id, code, name, description, teacherId, status, createdAt',
  enrollments: '++id, courseId, studentId, [courseId+studentId], status, enrolledAt',
  attendanceSessions: '++id, courseId, date, status',
  attendanceRecords: '++id, sessionId, studentId, courseId, [sessionId+studentId], status, timestamp, bonusPoints',
  materials: '++id, courseId, title, type, content, uploadDate',
  assignments: '++id, courseId, title, description, maxScore, dueDate, createdAt',
  submissions: '++id, assignmentId, studentId, [assignmentId+studentId], content, fileUrl, submittedAt, score, feedback',
  grades: '++id, courseId, studentId, [courseId+studentId], midtermScore, finalScore, totalScore',
  announcements: '++id, courseId, title, content, createdAt, priority'
});

// Version 3: bổ sung các bảng mới
db.version(3).stores({
  // Người dùng hệ thống: role = 'teacher' | 'student' | 'admin'
  users: '++id, username, &code, role, name, dob, email, phone, avatar, password',

  // Khóa học / Lớp học
  courses: '++id, code, name, description, teacherId, status, createdAt',

  // Ghi danh môn học
  enrollments: '++id, courseId, studentId, [courseId+studentId], status, enrolledAt',

  // Phiên điểm danh — thêm expiryMinutes, lat, lng cho tính năng GPS + hẹn giờ
  attendanceSessions: '++id, courseId, date, status, expiryMinutes, latitude, longitude',

  // Bản ghi điểm danh — thêm method: 'qr' | 'face' | 'manual'
  attendanceRecords: '++id, sessionId, studentId, courseId, [sessionId+studentId], status, timestamp, bonusPoints, method',

  // Tài liệu học tập
  materials: '++id, courseId, title, type, content, uploadDate',

  // Bài tập / Đánh giá
  assignments: '++id, courseId, title, description, maxScore, dueDate, createdAt',

  // Nộp bài tập
  submissions: '++id, assignmentId, studentId, [assignmentId+studentId], content, fileUrl, submittedAt, score, feedback',

  // Điểm số tổng quát
  grades: '++id, courseId, studentId, [courseId+studentId], midtermScore, finalScore, totalScore',

  // Thông báo lớp học
  announcements: '++id, courseId, title, content, createdAt, priority',

  // [MỚI #15] Lịch học: dayOfWeek: 0=CN,1=T2...6=T7
  schedules: '++id, courseId, dayOfWeek, startTime, endTime, room, createdAt',

  // [MỚI #16] Thảo luận / Bình luận trong lớp
  discussions: '++id, courseId, userId, parentId, content, createdAt',

  // [MỚI #17] Thông báo hệ thống cho từng user
  notifications: '++id, userId, type, title, message, isRead, createdAt, link',
});

// Seed Initial Admin (Teacher) Account if not exists
db.on('populate', async () => {
  await db.users.add({
    code: 'admin',
    username: 'admin',
    password: '123', // Mật khẩu mặc định có thể đổi sau
    role: 'teacher',
    name: 'Giảng viên (Quản trị)',
    email: 'admin@school.edu.vn',
    phone: '0123456789',
    avatar: null
  });
});
