import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Khôi phục phiên đăng nhập từ Local Storage
        const savedUserId = localStorage.getItem('lms_auth_user');
        if (savedUserId) {
            db.users.get(parseInt(savedUserId, 10)).then(foundUser => {
                if (foundUser) setUser(foundUser);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (code, password) => {
        const cleanCode = String(code).trim().toLowerCase();
        const cleanPass = String(password).trim();

        // Lấy tất cả user ra tìm tay cho chắc ăn (vì Local DB cực nhanh) và bỏ qua in hoa/hoa thường
        const allUsers = await db.users.toArray();
        const foundUser = allUsers.find(u => u.code.toLowerCase() === cleanCode);

        if (foundUser && foundUser.password === cleanPass) {
            setUser(foundUser);
            localStorage.setItem('lms_auth_user', foundUser.id.toString());
            toast.success(`Đăng nhập thành công! Chào ${foundUser.name}`);
            return foundUser; // trả về object để dùng ngay, không chờ state update
        }
        console.error("Login failed. Details:", { submittedCode: code, foundUserPassword: foundUser?.password });
        toast.error('Sai mã đăng nhập hoặc mật khẩu!');
        return null;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('lms_auth_user');
        toast.success('Đã đăng xuất!');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
};
