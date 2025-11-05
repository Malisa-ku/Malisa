import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Gift,
  LogOut,
  FileBarChart,
  History,
  MessageSquare,
  BellRing,
  UserX,
  UserCheck
} from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';

function AdminSidebar() {
  const { logout } = useUser();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { name: 'แดชบอร์ด', path: '/admin/dashboard', icon: LayoutDashboard },
    {
      name: 'การจัดการผู้ใช้',
      subItems: [
        { name: 'การสมัครสมาชิกร้านค้า', path: '/admin/pending-sellers', icon: UserCheck },
        { name: 'รายชื่อสมาชิกที่มีการแจ้งเตือนครบ 3 ครั้ง', path: '/admin/warning-list', icon: BellRing },
        { name: 'รายชื่อสมาชิกที่ถูกยกเลิก', path: '/admin/banned-sellers', icon: UserX },
      ],
    },
    {
      name: 'การจัดการรายงาน',
      subItems: [
        { name: 'รายชื่อสมาชิกร้านค้า', path: '/admin/report-users', icon: FileBarChart },
        { name: 'รายงานสินค้า', path: '/admin/problems', icon: History },
        { name: 'ประวัติการแจ้งเตือนผู้ร้านค้า', path: '/admin/warnings-history', icon: FileText },
        { name: 'ข้อมูลการยื่นอุทธรณ์', path: '/admin/complaints', icon: MessageSquare },
      ],
    },
    { name: 'ตั้งค่าโลโก้', path: '/admin/Settings', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-[#F0F4F7] border-r border-[#B3E5C3] p-4 space-y-2 sticky top-0 h-screen">
      <div className="flex flex-col space-y-2 font-medium">
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.subItems ? (
              <>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mt-4 mb-2">
                  {item.name}
                </h3>
                {item.subItems.map((subItem, subIndex) => (
                  <Link
                    key={subIndex}
                    to={subItem.path}
                    className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${
                      location.pathname === subItem.path
                        ? 'bg-[#B3E5C3] text-[#3A6060]'
                        : 'hover:bg-[#B3E5C3]'
                    }`}
                  >
                    <subItem.icon size={20} />
                    <span>{subItem.name}</span>
                  </Link>
                ))}
              </>
            ) : (
              <Link
                to={item.path}
                className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition duration-300 ${
                  location.pathname === item.path ? 'bg-[#B3E5C3] text-[#3A6060]' : 'hover:bg-[#B3E5C3]'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex-1"></div>
      
      <button
        onClick={handleLogout}
        className="flex items-center space-x-2 py-2 px-4 w-full rounded-lg bg-[#70B99B] text-white hover:bg-[#5A947B] transition duration-300 font-bold"
      >
        <LogOut size={20} />
        <span>ออกจากระบบ</span>
      </button>
    </aside>
  );
}

export default AdminSidebar;