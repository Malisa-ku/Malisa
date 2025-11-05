import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock } from 'lucide-react';
import { useUser } from '../../contexts/UserContext'; 

const API_BASE_URL = 'http://localhost:3000';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState(null);
  const navigate = useNavigate();

  const { login } = useUser();

  // ดึง URL โลโก้จาก API เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setSiteLogoUrl(`${API_BASE_URL}${response.data.logoUrl}`);
      } catch (error) {
        console.error('Error fetching site logo:', error);
        // ในกรณีที่เกิดข้อผิดพลาด ให้ใช้รูปภาพสำรองที่อยู่ในโฟลเดอร์ public
        setSiteLogoUrl('https://placehold.co/100x100/A3E6B4/1E6B3E?text=Logo'); 
      }
    };
    fetchLogo();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, { email, password });
      
      const { token, user } = response.data;
      
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      
      login(user, token);
      
      navigate('/admin/dashboard');

    } catch (err) {
      console.error('Admin login error:', err.response?.data?.message || err.message);
      setError(err.response?.data?.message || 'การเข้าสู่ระบบล้มเหลว. โปรดตรวจสอบข้อมูลอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#9AE0C6] p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-transparent">
        <div className="flex justify-center mb-6">
            {siteLogoUrl ? (
                <img
                    src={siteLogoUrl}
                    alt="Admin Logo"
                    // ปรับขนาดโลโก้ให้มีความกว้างใกล้เคียงกับปุ่ม Login
                    className="w-full max-w-[300px] h-auto"
                />
            ) : (
                <div className="w-full max-w-[300px] h-auto flex items-center justify-center min-h-[96px] text-gray-500">
                    <p>Loading logo...</p>
                </div>
            )}
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-8 bg-white text-[#B2EBCF] font-bold text-lg rounded-full shadow-lg border-2 border-white transition-transform duration-200 transform hover:scale-105"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
            <p className="font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLoginPage;