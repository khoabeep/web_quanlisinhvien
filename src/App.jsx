import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { db } from './db';

// Providers & Auth
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import Layout from './components/Layout'; // Teacher Layout
import StudentLayout from './components/StudentLayout'; // Student Layout

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassesList from './pages/ClassesList';
import ClassDetail from './pages/ClassDetail';
import AttendancePanel from './pages/AttendancePanel';
import Reports from './pages/Reports';
import MobileScan from './pages/MobileScan';
import StudentManagement from './pages/StudentManagement';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourseDetail from './pages/StudentCourseDetail';
import StudentHistory from './pages/StudentHistory';
import StudentSettings from './pages/StudentSettings';
import TeacherSettings from './pages/TeacherSettings';
import Schedule from './pages/Schedule';
import StudentSchedule from './pages/StudentSchedule';
import TeacherManagement from './pages/TeacherManagement';

export default function App() {

  useEffect(() => {
    const seedAdmin = async () => {
      try {
        const adminExists = await db.users.where('code').equals('admin').first();
        if (!adminExists) {
          await db.users.add({
            code: 'admin',
            username: 'admin',
            password: '123',
            role: 'admin',
            name: 'Quản Trị Viên',
            email: 'admin@school.edu.vn',
            phone: '0123456789',
            avatar: null
          });
          console.log('Admin account seeded!');
        } else if (adminExists.role === 'teacher') {
          // Migration: cập nhật tài khoản admin cũ sang role đúng
          await db.users.update(adminExists.id, { role: 'admin' });
        }

        // Đưa việc khởi tạo sinh viên ra block độc lập, kiểm tra riêng
        const studentExists = await db.users.where('code').equals('SV001').first();
        if (!studentExists) {
          await db.users.bulkAdd([
            {
              code: 'SV001',
              username: 'sv001',
              password: '123',
              role: 'student',
              name: 'Nguyễn Văn Sinh Viên 1',
              email: 'sv001@school.edu.vn',
              phone: '0901234567',
              avatar: null
            },
            {
              code: 'SV002',
              username: 'sv002',
              password: '123',
              role: 'student',
              name: 'Trần Thị Học Viên 2',
              email: 'sv002@school.edu.vn',
              phone: '0901234568',
              avatar: null
            }
          ]);
          console.log('Fake Students seeded!');
        }
      } catch (err) {
        console.error("DB Seed Error", err);
      }
    };
    seedAdmin();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/scan/:classId/:sessionId" element={<MobileScan />} />

          {/* Teacher Routes (Protected) */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="classes" element={<ClassesList />} />
            <Route path="classes/:id" element={<ClassDetail />} />
            <Route path="classes/:id/attendance" element={<AttendancePanel />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="teachers" element={<TeacherManagement />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<TeacherSettings />} />
          </Route>

          {/* Student Routes (Protected) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="classes/:id" element={<StudentCourseDetail />} />
            <Route path="history" element={<StudentHistory />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="settings" element={<StudentSettings />} />
          </Route>

          {/* Root Redirect: Mặc định chuyển về Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
