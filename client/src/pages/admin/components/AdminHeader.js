import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { LogOut } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

function AdminHeader() {
  const { logout } = useUser();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setLogoUrl(response.data.logoUrl);
      } catch (error) {
        console.error('Error fetching logo:', error);
        // กำหนด URL ของรูปสำรองในกรณีที่เกิดข้อผิดพลาด
        setLogoUrl('https://placehold.co/40x40/B3E5C3/3A6060?text=Logo');
      }
    };
    fetchLogo();
  }, []);

  return (
    <header className="bg-[#70B99B] text-white p-4 shadow-md sticky top-0 z-50">
      <nav className="flex items-center justify-between">
        <Link to="/admin/dashboard" className="flex items-center space-x-2">
          {logoUrl ? (
            <img
              src={`${API_BASE_URL}${logoUrl}`}
              alt="Admin Logo"
              // ปรับขนาดโลโก้ให้พอดีกับ Header
              className="h-10 w-auto md:h-12"
            />
          ) : (
            <span className="text-xl md:text-2xl font-bold tracking-tight">
              Admin Panel
            </span>
          )}
        </Link>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-[#B3E5C3] hover:text-[#3A6060] transition-colors duration-300"
          >
            <LogOut size={20} />
            <span className="font-medium hidden md:inline">ออกจากระบบ</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

export default AdminHeader;