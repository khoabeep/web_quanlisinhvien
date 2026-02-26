@echo off
title He Thong Quan Ly Hoc Tap LMS V8 (2026)
color 0A

echo ========================================================
echo        LMS V8 DANG KHOI DONG - VUI LONG CHO...
echo ========================================================
echo.
echo [1/2] Dang mo Local Server ^& LAN Network (Cho phep dien thoai quet QR)...

:: Chay NPM DEV trong background
start /min cmd /c "npm run dev"

echo [2/2] Dang khoi dong Giao dien Quan tri Vien...
timeout /t 5 /nobreak >nul

:: Mở web trên trình duyệt mặc định
start http://localhost:5173

echo.
echo ========================================================
echo        HE THONG DA SAN SANG HOAT DONG!
echo        Ban co the an cua so nay xuong (Khong nen tat).
echo ========================================================
pause
