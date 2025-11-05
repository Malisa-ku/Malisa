import React, { useState, useEffect } from 'react';
import axios from 'axios';
// *** เปลี่ยนการนำเข้า: นำ Trash2 ออก และใช้ RotateCw แทน ***
import { VscChevronLeft } from 'react-icons/vsc';
import { FileText, Edit, RotateCw, AlertCircle, MessageSquare } from 'lucide-react';

// URL for Admin API
const API_BASE_URL = 'http://localhost:3000/api/admin'; // เปลี่ยนจาก /api เป็น /api/admin ตามโครงสร้างอื่น

function AdminComplaintHistory() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // เพิ่ม state สำหรับข้อความสถานะ

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // NOTE: สมมติว่า Backend Endpoint /admin/complaints ถูกแก้ไขให้ JOIN ชื่อผู้ขาย (full_name) มาแล้ว
      const response = await axios.get(`${API_BASE_URL}/complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // ตรวจสอบโครงสร้างข้อมูลที่ส่งกลับมา
      const data = response.data.complaints || response.data; 
      
      if (Array.isArray(data)) {
        setComplaints(data);
      } else {
        throw new Error('Data format from API is incorrect.');
      }
      
    } catch (err) {
      console.error('Error fetching complaints:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลร้องเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (complaintId) => {
    const token = localStorage.getItem('admin_token');
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการร้องเรียนนี้?')) {
      try {
        await axios.delete(`${API_BASE_URL}/complaints/${complaintId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatusMessage('ลบรายการร้องเรียนเรียบร้อยแล้ว');
        fetchComplaints(); // Reload data after successful deletion
      } catch (err) {
        console.error('Error deleting complaint:', err.response?.data?.message || err.message);
        setStatusMessage('ไม่สามารถลบรายการร้องเรียนได้');
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    // ใช้getFullYear() + 543 เพื่อแสดง พ.ศ.
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-[#E9F3F1] p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <a href="#" className="flex items-center text-[#36A897] hover:text-[#2a8779]">
            <VscChevronLeft size={24} className="mr-2" />
          </a>
          <MessageSquare className="text-gray-600 mr-3" size={24} />
          <h1 className="text-xl font-bold text-gray-700">ประวัติการร้องเรียนทั้งหมด</h1>
        </div>
        
        {statusMessage && (
            <div className="w-full max-w-7xl mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
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
            {/* Table Header with Title */}
            <div className="bg-[#E9F3F1] p-4 flex items-center rounded-t-lg">
              <FileText className="text-gray-600 mr-2" size={24} />
              <h2 className="text-xl font-bold text-gray-700">รายการร้องเรียน</h2>
            </div>
            
            {/* Table */}
            <div className="p-4 md:p-6 overflow-x-auto">
              {complaints.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลการร้องเรียน</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อบัญชี (ร้านค้า)</th>
                      {/* *** NEW: คอลัมน์ชื่อผู้ขาย (Full Name) *** */}
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ขาย (Full Name)</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเลขคำสั่งซื้อ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ/ยกเลิก</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((complaint, index) => (
                      <tr key={complaint.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        {/* สมมติว่า complaint.seller_name คือชื่อโปรไฟล์ร้านค้า */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{complaint.seller_name}</td> 
                        {/* *** NEW: แสดงชื่อผู้ขาย (Full Name) - ต้องแก้ไข Backend ให้ส่งค่านี้มาด้วย *** */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{complaint.full_name || '-'}</td> 
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{complaint.order_id}</td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{complaint.description}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(complaint.created_at)}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => console.log('Edit complaint ID:', complaint.id)}
                            className="text-[#36A897] hover:text-[#2a8779] transition-colors duration-200 mr-2"
                            title="แก้ไขสถานะ"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(complaint.id)}
                            className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                            title="ลบ/ยกเลิกรายการ"
                          >
                            {/* *** เปลี่ยนจาก Trash2 เป็น RotateCw *** */}
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

export default AdminComplaintHistory;