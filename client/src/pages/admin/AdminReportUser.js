import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Store, ShoppingBag } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

// URL สำหรับ Admin API
const ADMIN_API_BASE_URL = 'http://localhost:3000/api/admin';

function AdminUserManagement() {
  const [approvedSellers, setApprovedSellers] = useState([]);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${ADMIN_API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allUsers = response.data.users;

      const filteredApprovedSellers = allUsers
        .filter(user => user.role === 'seller' && user.status === 'อนุมัติแล้ว')
        .sort((a, b) => a.profile_name.localeCompare(b.profile_name, 'th'));

      const filteredPendingSellers = allUsers
        .filter(user => user.role === 'seller' && user.status === 'รอดำเนินการ')
        .sort((a, b) => a.profile_name.localeCompare(b.profile_name, 'th'));

      const filteredBuyers = allUsers
        .filter(user => user.role === 'buyer')
        .sort((a, b) => a.profile_name.localeCompare(b.profile_name, 'th'));

      setApprovedSellers(filteredApprovedSellers);
      setPendingSellers(filteredPendingSellers);
      setBuyers(filteredBuyers);

    } catch (err) {
      console.error('Error fetching users:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543; // แปลงเป็นปีพ.ศ.
    return `${day}/${month}/${year}`;
  };

  const renderUserTable = (usersList, title, icon) => {
    // ✅ เพิ่มเงื่อนไขเพื่อตรวจสอบว่าตารางที่กำลัง render เป็นของ "ผู้ซื้อ" หรือไม่
    const isBuyerTable = title.includes("ผู้ซื้อ");

    return (
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg border border-gray-200 mt-8">
        <div className="bg-[#E9F3F1] p-4 flex items-center rounded-t-lg">
          {icon}
          <h2 className="text-xl font-bold text-gray-700 ml-2">{title}</h2>
        </div>
        
        <div className="p-4 md:p-6 overflow-x-auto">
          {usersList.length === 0 ? (
            <p className="text-center text-gray-500 py-8">ไม่มีผู้ใช้ประเภทนี้ในระบบ</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับ</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อโปร์ไฟล์</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สมัคร</th>
                  {/* ✅ ซ่อนคอลัมน์สถานะสำหรับผู้ซื้อ */}
                  {!isBuyerTable && (
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersList.map((user, index) => (
                  <tr key={user.id}>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.profile_name}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
                    {/* ✅ ซ่อนข้อมูลสถานะสำหรับผู้ซื้อ */}
                    {!isBuyerTable && (
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {user.status === 'อนุมัติแล้ว' && <span className="text-green-500">อนุมัติแล้ว</span>}
                        {user.status === 'รอดำเนินการ' && <span className="text-yellow-500">รอดำเนินการ</span>}
                        {user.status === 'ถูกระงับ' && <span className="text-red-500">ถูกระงับ</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-4xl flex items-center mb-6">
          <a href="#" className="flex items-center text-[#36A897] hover:text-[#2a8779]">
            <ArrowLeft size={24} className="mr-2" />
          </a>
          <h1 className="text-xl font-bold text-gray-700">รายงานสมาชิกและร้านค้า</h1>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64 w-full">
            <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {error && (
          <div className="w-full max-w-4xl mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <span className="block">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {renderUserTable(approvedSellers, "ร้านค้าที่ได้รับการอนุมัติ", <Store size={24} className="text-gray-600" />)}
            {renderUserTable(pendingSellers, "ร้านค้าที่รอการอนุมัติ", <Store size={24} className="text-gray-600" />)}
            {renderUserTable(buyers, "สมาชิกทั่วไป (ผู้ซื้อ)", <ShoppingBag size={24} className="text-gray-600" />)}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminUserManagement;