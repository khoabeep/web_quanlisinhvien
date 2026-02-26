import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

// Plugin siêu nhỏ gọn đóng vai trò cầu nối (Backend) giữa điện thoại và máy chiếu
const qrScannerPlugin = () => {
  let activeScans = {}; // Lưu trữ tạm thời các lượt quét { [sessionId]: [ { studentCode, timestamp } ] }
  let closedSessions = new Set(); // Track các phiên đã chốt
  let sessionSettings = {}; // GPS settings cho mỗi phiên { [sessionId]: { lat, lng, radius } }

  // Tính khoảng cách Haversine (mét)
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return {
    name: 'qr-scanner-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // API 1: Điện thoại gọi vào để ghi nhận điểm danh
        if (req.url === '/api/scan' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString() });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sessionId, studentCode, latitude, longitude } = data;

              if (!sessionId || !studentCode) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, message: 'Thiếu thông tin sessionId hoặc mã sinh viên.' }));
              }

              // Kiểm tra phiên có đang mở không
              if (closedSessions.has(String(sessionId))) {
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, message: 'Phiên điểm danh đã kết thúc. Vui lòng liên hệ giảng viên.' }));
              }

              // Tính năng #6: Kiểm tra GPS nếu phiên có cài GPS
              const settings = sessionSettings[String(sessionId)];
              if (settings && settings.lat && settings.lng && latitude && longitude) {
                const dist = haversineDistance(settings.lat, settings.lng, parseFloat(latitude), parseFloat(longitude));
                if (dist > (settings.radius || 100)) {
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, message: `Vị trí của bạn cách lớp học ${Math.round(dist)}m. Vui lòng đến đúng phòng học.` }));
                }
              }

              if (!activeScans[sessionId]) activeScans[sessionId] = [];

              // Nếu bạn này chưa được quét trong phiên này, thêm vào
              if (!activeScans[sessionId].find(s => s.studentCode === studentCode)) {
                activeScans[sessionId].push({ studentCode, timestamp: new Date().toISOString() });
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, message: 'Điểm danh thành công!' }));
              } else {
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, message: 'Bạn đã điểm danh rồi!' }));
              }
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'Dữ liệu không hợp lệ' }));
            }
          });
          return;
        }

        // API 2: Máy tính thầy giáo hỏi xem có ai vừa quét mã chưa
        if (req.url.startsWith('/api/get-scans') && req.method === 'GET') {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const sessionId = url.searchParams.get('sessionId');

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(activeScans[sessionId] || []));
          return;
        }

        // API 3: Lưu cài đặt GPS cho phiên
        if (req.url === '/api/session-settings' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString() });
          req.on('end', () => {
            try {
              const { sessionId, lat, lng, radius } = JSON.parse(body);
              if (sessionId) sessionSettings[String(sessionId)] = { lat, lng, radius: radius || 100 };
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false }));
            }
          });
          return;
        }

        // API 3.5: Giáo viên chốt phiên -> đánh dấu closed
        if (req.url.startsWith('/api/close-session') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString() });
          req.on('end', () => {
            try {
              const { sessionId } = JSON.parse(body);
              if (sessionId) closedSessions.add(String(sessionId));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false }));
            }
          });
          return;
        }

        // API 4: Lấy địa chỉ IP mạng LAN của máy giáo viên để làm Link QR Code
        if (req.url === '/api/get-ip' && req.method === 'GET') {
          const nets = os.networkInterfaces();
          let localIp = 'localhost';
          for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
              // Skip over non-IPv4 and internal (i.e. 127.0.0.1)
              if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
              }
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ip: localIp }));
          return;
        }

        next();
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    qrScannerPlugin()
  ],
  base: process.env.VITE_BASE || '/',
  server: {
    host: '0.0.0.0', // Mở mạng LAN để điện thoại quét được (local dev)
    port: 5173
  }
})
