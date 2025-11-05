import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { MdEmail, MdLock } from 'react-icons/md';

// Base URL ของ API ของคุณ
const API_BASE_URL = 'http://localhost:3000'; // ใช้ URL เดียวกันกับใน Header

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [siteLogoUrl, setSiteLogoUrl] = useState(null); 
  const navigate = useNavigate();
  const { login } = useUser();

  // ดึง URL โลโก้จาก API เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setSiteLogoUrl(response.data.logoUrl);
      } catch (error) {
        console.error('Error fetching site logo:', error);
        // สามารถตั้งค่า URL รูปภาพสำรองในกรณีที่ดึงข้อมูลไม่ได้
        // setSiteLogoUrl('/path/to/default/logo.png'); 
      }
    };
    fetchLogo();
  }, []); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // ขั้นตอนที่ 1: ส่งข้อมูลเพื่อเข้าสู่ระบบไปยัง API
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      if (response.status === 200) {
        const { user, token } = response.data;
        
        // **ขั้นตอนที่ 2: ตรวจสอบสถานะ (status) ของผู้ใช้**
        
        if (user.status === 'pending') {
          // หากสถานะเป็น 'pending' (สำหรับผู้ขายที่ยังไม่ได้รับการอนุมัติ)
          setError('บัญชีของคุณอยู่ระหว่างการตรวจสอบและรอการอนุมัติจากผู้ดูแลระบบ');
          return; // หยุดการเข้าสู่ระบบ
        }

        if (user.status === 'banned') {
          // หากสถานะเป็น 'banned' (โดนแบน)
          setError('บัญชีของคุณถูกระงับการใช้งาน');
          return; // หยุดการเข้าสู่ระบบ
        }
        
        // หากสถานะเป็น 'approved' หรือ role เป็น buyer/admin (ซึ่งปกติจะ approved ทันที)
        setSuccess('เข้าสู่ระบบสำเร็จ!');
        login(user, token);

        // ขั้นตอนที่ 3: นำทางไปยัง Dashboard ที่เหมาะสม
        switch (user.role) {
          case 'buyer':
            navigate(`/profile/${user.id}`);
            break;
          case 'seller':
            // ผู้ขายที่ status เป็น 'approved' เท่านั้นจึงจะมาถึงตรงนี้
            navigate('/seller-dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/');
        }
      }
    } catch (err) {
      console.error('Login error:', err.response?.data?.message || err.message);
      // ถ้า Backend API ส่งข้อความเฉพาะเจาะจงมา (เช่น 'Invalid credentials')
      setError(err.response?.data?.message || 'การเข้าสู่ระบบล้มเหลว. โปรดตรวจสอบข้อมูลอีกครั้ง');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9E9EC] p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-transparent">
        <div className="flex justify-center mb-6">
          {/* อัปเดตการแสดงผลรูปภาพให้ดึงจาก state */}
          {siteLogoUrl ? (
            <img
              src={`${API_BASE_URL}${siteLogoUrl}`}
              alt="Shop Shield Logo"
              // ปรับขนาดรูปภาพให้กว้างขึ้นและรักษาสัดส่วน
              className="w-full max-w-[300px] h-auto" // เพิ่ม max-w เป็น 300px
            />
          ) : (
            // แสดงข้อความในขณะที่กำลังโหลดรูปภาพ
            // ปรับ class ให้จัดกึ่งกลางและมีขนาดที่สมดุลขึ้น
            <div className="w-full max-w-[300px] h-auto flex items-center justify-center min-h-[96px] text-gray-500">
              <p>Loading logo...</p>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>

          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
            {/* ปุ่ม "ลืมรหัสผ่าน?" ยังคงอยู่ เพื่อให้ผู้ใช้กดได้ง่าย */}
            <Link
              to="/forgot-password"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-8 bg-white text-[#F75271] font-bold text-lg rounded-full shadow-lg border-2 border-white transition-transform duration-200 transform hover:scale-105"
          >
            Login
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-center">
            <p className="font-medium">{success}</p>
          </div>
        )}

        <div className="mt-6 text-sm text-[#F75271] font-bold text-center flex justify-between">
          <Link to="/register" className="hover:underline">
            สมัครสมาชิก
          </Link>
          <span className="text-gray-400">|</span> 
          {/* เปลี่ยนจาก "ช่วยเหลือ" เป็น "รีเซ็ตรหัสผ่าน" */}
          <Link to="/forgot-password" className="hover:underline">
            รีเซ็ตรหัสผ่าน
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;