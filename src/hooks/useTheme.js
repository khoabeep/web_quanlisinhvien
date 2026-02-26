import { useState, useEffect } from 'react';

export function useTheme() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('lms_theme');
        return saved === 'dark';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('lms_theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('lms_theme', 'light');
        }
    }, [isDark]);

    const toggle = () => setIsDark(prev => !prev);

    return { isDark, toggle };
}
