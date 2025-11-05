import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MdEmail, MdLock } from 'react-icons/md';

// Base URL ของ API ของคุณ
const API_BASE_URL = 'http://localhost:3000';

function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [siteLogoUrl, setSiteLogoUrl] = useState(null);
  const navigate = useNavigate();

  // ดึง URL โลโก้
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setSiteLogoUrl(response.data.logoUrl);
      } catch (error) {
        console.error('Error fetching site logo:', error);
      }
    };
    fetchLogo();
  }, []);

  const handleDirectPasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน โปรดตรวจสอบอีกครั้ง');
      setLoading(false);
      return;
    }

    try {
      // ส่งคำขอไปยัง Back-end ด้วยอีเมลและรหัสผ่านใหม่โดยตรง
      await axios.post(`${API_BASE_URL}/api/users/auth/reset-password-direct`, { 
        email, 
        newPassword: password 
      });

      setSuccess('รีเซ็ตรหัสผ่านสำเร็จแล้ว! คุณสามารถเข้าสู่ระบบได้ด้วยรหัสผ่านใหม่');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Direct password reset error:', err.response?.data?.message || err.message);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน โปรดลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9E9EC] p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-transparent">
        <div className="flex justify-center mb-6">
          {siteLogoUrl ? (
            <img
              src={`${API_BASE_URL}${siteLogoUrl}`}
              alt="Shop Shield Logo"
              className="w-full max-w-[300px] h-auto"
            />
          ) : (
            <div className="w-full max-w-[300px] h-auto flex items-center justify-center min-h-[96px] text-gray-500">
              <p>Loading logo...</p>
            </div>
          )}
        </div>

        {/* ฟอร์มสำหรับการรีเซ็ตรหัสผ่านโดยตรง */}
        <form onSubmit={handleDirectPasswordReset} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-700 text-center">รีเซ็ตรหัสผ่าน</h2>
          <p className="text-sm text-gray-600 text-center">
            โปรดกรอกอีเมลและรหัสผ่านใหม่ที่คุณต้องการ
          </p>
          {/* Email input */}
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
          {/* Password input */}
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="รหัสผ่านใหม่"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          {/* Confirm Password input */}
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 mt-8 bg-white text-[#F75271] font-bold text-lg rounded-full shadow-lg border-2 border-white transition-transform duration-200 transform hover:scale-105"
            disabled={loading}
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>

        {/* แสดงผลข้อความแจ้งเตือน */}
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

        {/* ส่วนลิงก์ด้านล่าง */}
        <div className="mt-6 text-sm text-[#F75271] font-bold text-center flex justify-between">
          <Link to="/login" className="hover:underline">
            กลับสู่หน้า Login
          </Link>
          <span className="text-gray-400">|</span>
          <Link to="/register" className="hover:underline">
            สมัครสมาชิก
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
