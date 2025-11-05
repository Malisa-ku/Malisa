import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, RotateCcw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/admin';

function AdminBannedSellers() {
  const [bannedSellers, setBannedSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchBannedSellers();
  }, []);

  const fetchBannedSellers = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/banned-sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.bannedSellers;

      if (Array.isArray(data)) {
        setBannedSellers(data);
      } else {
        throw new Error('Data format from API is incorrect.');
      }

    } catch (err) {
      console.error('Error fetching banned sellers:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลร้านค้าที่ถูกยกเลิกสถานะได้');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanSeller = async (sellerId, sellerName) => {
    const token = localStorage.getItem('admin_token');
    if (window.confirm(`คุณต้องการคืนสถานะให้กับร้านค้า "${sellerName}" หรือไม่?`)) {
      try {
        await axios.put(`${API_BASE_URL}/users/${sellerId}/status`, { status: 'approved' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatusMessage(`คืนสถานะร้านค้า "${sellerName}" เรียบร้อยแล้ว`);
        fetchBannedSellers(); // Reload the list
      } catch (err) {
        console.error('Error unbanning seller:', err.response?.data?.message || err.message);
        setStatusMessage('ไม่สามารถคืนสถานะร้านค้าได้');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-[#E9F3F1] p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <Users className="text-gray-600 mr-3" size={24} />
          <h1 className="text-xl font-bold text-gray-700">รายชื่อสมาชิกที่ถูกยกเลิก</h1>
        </div>

        {statusMessage && (
          <div className="w-full max-w-7xl mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
            <span className="block">{statusMessage}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center h-64 w-full">
            <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {error && (
          <div className="w-full max-w-7xl mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <span className="block">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="w-full max-w-7xl bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-4 md:p-6 overflow-x-auto">
              {bannedSellers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีร้านค้าที่ถูกยกเลิกสถานะ</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อร้านค้า</th>
                      {/* สลับหัวข้อ: Email ก่อน ชื่อผู้ใช้ */}
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">คืนสถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bannedSellers.map((seller) => (
                      <tr key={seller.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.profile_name}</td>
                        {/* สลับข้อมูล: Email ก่อน ชื่อผู้ใช้ */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.email}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.full_name || seller.profile_name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-[#F75271] font-semibold">ถูกยกเลิก</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleUnbanSeller(seller.id, seller.profile_name)}
                            className="text-green-600 hover:text-green-800 transition-colors duration-200"
                            title="คืนสถานะ"
                          >
                            <RotateCcw size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminBannedSellers;