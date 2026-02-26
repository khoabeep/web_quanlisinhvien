import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Component tạo vòng bảo vệ cho các trang yêu cầu Đăng Nhập
 * @param {allowedRoles} array - Danh sách phân quyền, ví dụ ['teacher'] hoặc ['student']
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Trong khi đang query db local, có thể render 1 loading cực nhỏ
    if (loading) return null;

    if (!isAuthenticated) {
        // Chưa đăng nhập, ném về mặt cửa trang Login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Có đăng nhập nhưng sai Role
        const dest = user.role === 'student' ? '/student' : '/teacher';
        return <Navigate to={dest} replace />;
    }

    return children;
};
