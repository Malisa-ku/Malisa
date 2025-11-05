import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Store, Users, Package, FileText, BarChart, Gift, FileWarning, User, History } from 'lucide-react';
import { useUser } from '../contexts/UserContext'; 

function Sidebar() {
  const { user, logout } = useUser();
  const isLoggedIn = !!user;
  const userRole = user ? user.role : null;
  const userId = user ? user.id : null;
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const renderNavLinks = () => {
    if (!isLoggedIn) {
      return null;
    }

    const profileLink = (
      <Link 
        to={`/profile/${userId}`} 
        className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname.startsWith('/profile') ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
      >
        <User size={20} />
        <span>โปรไฟล์</span>
      </Link>
    );

    switch (userRole) {
      case 'buyer':
        return (
          <>
            {profileLink}
            <Link to="/HomePage" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/HomePage' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <Store size={20} />
              <span>สินค้าทั้งหมด</span>
            </Link>
            <Link to="/my-orders" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/my-orders' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <FileText size={20} />
              <span>คำสั่งซื้อของฉัน</span>
            </Link>
          </>
        );
      case 'seller':
        return (
          <>
            {profileLink}
            <Link to="/seller-dashboard" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/seller-dashboard' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <LayoutDashboard size={20} />
              <span>แดชบอร์ด</span>
            </Link>
            <Link to="/seller/SellerProductManagement" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/seller/SellerProductManagement' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <Package size={20} />
              <span>จัดการสินค้า</span>
            </Link>
            <Link to="/seller/orders" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/seller/orders' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <FileText size={20} />
              <span>จัดการคำสั่งซื้อ</span>
            </Link>
            <Link to="/seller/reports" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/seller/reports' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <BarChart size={20} />
              <span>รายงานการขาย</span>
            </Link>
            <Link to="/seller/warning-history" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/seller/warning-history' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <History size={20} />
              <span>ประวัติการแจ้งเตือน</span>
            </Link>
          </>
        );
      case 'admin':
        return (
          <>
            <Link to="/admin/dashboard" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/dashboard' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/users" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/users' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <Users size={20} />
              <span>User Management</span>
            </Link>
            <Link to="/admin/products" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/products' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <Package size={20} />
              <span>Product Management</span>
            </Link>
            <Link to="/admin/orders" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/orders' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <FileText size={20} />
              <span>Order Management</span>
            </Link>
            <Link to="/admin/warnings" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/warnings' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <FileWarning size={20} />
              <span>Warnings</span>
            </Link>
            <Link to="/admin/complaints" className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${location.pathname === '/admin/complaints' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}>
              <Gift size={20} />
              <span>Complaints</span>
            </Link>
          </>
        );
    }
  };

  return (
    <aside className="bg-gray-100 text-gray-700 w-64 p-4 space-y-2 sticky top-0 h-screen overflow-y-auto">
      <div className="flex flex-col space-y-2 font-medium">
        {renderNavLinks()}
      </div>
      {isLoggedIn && (
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition duration-300">
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      )}
    </aside>
  );
}

export default Sidebar;