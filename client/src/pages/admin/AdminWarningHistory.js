import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, RotateCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'; 

const API_BASE_URL = 'http://localhost:3000/api/admin';

function AdminWarningHistory() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchWarnings();
  }, []);

  const fetchWarnings = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      // Endpoint /warnings ที่ถูกแก้ไขใน admin.js จะส่งข้อมูล profile_name, full_name และ user_status มาแล้ว
      const response = await axios.get(`${API_BASE_URL}/warnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.warnings;
      if (Array.isArray(data)) {
        
        // *** 🚨 Logic การกรอง: นำรายการออกจากหน้าถ้าผู้ขายถูก 'ระงับ' แล้ว ***
        // สมมติว่าสถานะผู้ใช้ที่ถูกส่งมาจาก Backend คือ 'user_status'
        const activeWarnings = data.filter(warning => warning.user_status !== 'ถูกระงับ');
        
        setWarnings(activeWarnings);
      } else {
        throw new Error('Data format from API is incorrect.');
      }
      
    } catch (err) {
      console.error('Error fetching warnings:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลประวัติการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (warningId) => {
    const token = localStorage.getItem('admin_token');
    // NOTE: โดยปกติควรใช้ Custom Modal/MessageBox แทน window.confirm()
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการแจ้งเตือนนี้? (การลบถือเป็นการจัดการรายการ)')) {
      try {
        await axios.delete(`${API_BASE_URL}/warnings/${warningId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatusMessage('ลบ/จัดการการแจ้งเตือนเรียบร้อยแล้ว');
        fetchWarnings(); // โหลดข้อมูลใหม่เพื่ออัปเดตรายการ
      } catch (err) {
        console.error('Error deleting warning:', err.response?.data?.message || err.message);
        setStatusMessage('ไม่สามารถลบ/จัดการการแจ้งเตือนได้');
      }
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543} ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  // Helper สำหรับการแสดงสถานะ
  const getStatusTag = (warningCount, userStatus) => {
    if (userStatus === 'ถูกระงับ') {
        return <span className="flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><XCircle size={14} className="mr-1"/> ถูกระงับ</span>;
    }
    if (warningCount >= 3) {
        // สถานะเตือนครบ 3 ครั้ง รอการดำเนินการ
        return <span className="flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-800"><AlertTriangle size={14} className="mr-1"/> ครบ 3 ครั้ง</span>;
    }
    if (warningCount > 0) {
        return <span className="flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"><AlertTriangle size={14} className="mr-1"/> เตือน ({warningCount})</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">ปกติ</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-[#E9F3F1] p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <FileText className="text-gray-600 mr-3" size={24} />
          <h1 className="text-xl font-bold text-gray-700">ประวัติการแจ้งเตือนผู้ใช้</h1>
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
              {warnings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีประวัติการแจ้งเตือน</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อร้านค้า</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ขาย</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะเตือน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อความแจ้งเตือน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ/ยกเลิก</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warnings.map((warning, index) => (
                      <tr key={warning.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{warning.seller_name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warning.full_name}</td>
                        {/* *** แสดงสถานะเตือน/ถูกระงับ *** */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getStatusTag(warning.warning_count, warning.user_status)}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{warning.message}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(warning.created_at)}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleDelete(warning.id)}
                            className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                            title="ลบ/ยกเลิกการแจ้งเตือน"
                          >
                            <RotateCw size={20} />
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

export default AdminWarningHistory;