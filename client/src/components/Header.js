import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, LogIn, LogOut } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import axios from 'axios'; 

const API_BASE_URL = 'http://localhost:3000';

function Header() {
  const { user, logout } = useUser();
  const isLoggedIn = !!user;
  const userRole = user ? user.role : null;
  const userId = user ? user.id : null;
  const [logoUrl, setLogoUrl] = useState(null); 
  const [cartTotalQuantity, setCartTotalQuantity] = useState(0); 
  const [profile, setProfile] = useState({});

  const handleLogout = () => {
    logout();
  };

  // *** ฟังก์ชันคำนวณจำนวนสินค้าทั้งหมดในตะกร้า (Quantity Sum) ***
  const calculateTotalQuantity = () => {
    // ดึงข้อมูลจาก localStorage (ซึ่งสอดคล้องกับ CartPage และ CheckoutPage)
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // คำนวณผลรวมของ quantity ในทุกรายการ
    const totalQuantity = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    setCartTotalQuantity(totalQuantity);
  };
  // **************************************************************


  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setLogoUrl(response.data.logoUrl);
      } catch (error) {
        console.error('Error fetching logo:', error);
        setLogoUrl('https://placehold.co/40x40/B3E5C3/3A6060?text=Logo');
      }
    };
    fetchLogo();
    
    // 1. เรียกใช้ครั้งแรก
    calculateTotalQuantity();

    // 2. *** ฟัง Custom Event 'cartUpdated' เพื่ออัปเดตทันที (สำคัญ) ***
    window.addEventListener('cartUpdated', calculateTotalQuantity);

    // 3. ฟัง 'storage' event สำหรับการอัปเดตระหว่างแท็บ 
    window.addEventListener('storage', calculateTotalQuantity);


    return () => {
      window.removeEventListener('cartUpdated', calculateTotalQuantity);
      window.removeEventListener('storage', calculateTotalQuantity);
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isLoggedIn) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setProfile(response.data.user);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchUserProfile();
  }, [isLoggedIn, userId]);

  return (
    <header className="bg-pink-50 text-pink-600 p-4 shadow-md sticky top-0 z-50">
      <nav className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-pink-700 hover:text-pink-800 transition duration-300 flex items-center">
          {logoUrl ? (
            <img 
              src={`${API_BASE_URL}${logoUrl}`} 
              alt="Shop Chill Logo" 
              className="h-10 w-auto md:h-12" 
            />
          ) : (
            <span className="text-3xl font-bold tracking-wider">
              Shop Chill
            </span>
          )}
        </Link>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              {userRole === 'buyer' && (
                <Link to="/cart" className="hover:text-pink-800 transition duration-300 relative">
                  <ShoppingCart size={24} />
                  {/* ใช้ cartTotalQuantity */}
                  {cartTotalQuantity > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartTotalQuantity}
                    </span>
                  )}
                </Link>
              )}
              
              <Link to={`/profile/${userId}`} className="flex items-center space-x-2 p-1 rounded-full hover:bg-pink-100 transition duration-300">
                <img 
                  src={profile.profile_image_url ? `${API_BASE_URL}/${profile.profile_image_url}` : 'https://placehold.co/40x40?text=User'} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
                <span className="hidden md:inline text-gray-700 font-medium">
                  {profile.profile_name || 'ผู้ใช้'}
                </span>
              </Link>

              <button onClick={handleLogout} className="flex items-center space-x-1 text-red-500 hover:text-red-700 transition duration-300 font-bold">
                <LogOut size={20} />
                <span className="hidden md:inline">ออกจากระบบ</span>
              </button>
            </>
          ) : (
            <div className="flex space-x-2">
              <Link to="/login" className="flex items-center space-x-1 hover:text-pink-800 transition duration-300">
                <LogIn size={20} />
                <span className="hidden md:inline">เข้าสู่ระบบ</span>
              </Link>
              <Link to="/register" className="hidden md:flex items-center space-x-1 hover:text-pink-800 transition duration-300">
                <span className="hidden md:inline">สมัครสมาชิก</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;