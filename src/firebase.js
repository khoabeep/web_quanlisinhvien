// ============================================================
// HƯỚNG DẪN CẤU HÌNH FIREBASE:
// 1. Vào https://console.firebase.google.com  → tạo Project mới
// 2. Trong Project → Build → Realtime Database → Tạo database (chọn vùng nào cũng được)
//    → Start in test mode (sau này có thể đặt rules chặt hơn)
// 3. Trong Project Settings (⚙️) → General → "Your apps" → Web app (</>)
//    → Đăng ký app → Copy đoạn firebaseConfig bên dưới và thay vào
// ============================================================

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = { 
  apiKey : "AIzaSyDjitk4aBoIYQByI6az6D7TK6jf31vqKfk" , 
  authDomain : "web-diemdanh-8302e.firebaseapp.com" , 
  databaseURL : "https://web-diemdanh-8302e-default-rtdb.asia-southeast1.firebasedatabase.app" , 
  projectId : "web-diemdanh-8302e" , 
  storageBucket : "web-diemdanh-8302e.firebasestorage.app" , 
  messagingSenderId : "795680345548" , 
  appId : "1:795680345548:web:c4b3f234c6046de20c6169" 
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
