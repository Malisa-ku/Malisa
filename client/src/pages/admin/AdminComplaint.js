import React, { useState, useEffect } from 'react';
import axios from 'axios';
// *** เปลี่ยนการนำเข้า: เพิ่ม RotateCw และนำ Trash2 ออก ***
import { ChevronLeft, MessageSquare, Loader, AlertCircle, XCircle, CheckCircle, RotateCw } from 'lucide-react'; 

const API_BASE_URL = 'http://localhost:3000/api/admin';

// Custom Message Box component (instead of alert and confirm)
const MessageBox = ({ title, text, onClose, onConfirm, showConfirmButton = false }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[99]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-105">
        <h2 className="text-xl font-bold mb-2 text-pink-600">{title}</h2>
        <p className="text-gray-700 mb-6">{text}</p>
        <div className="flex justify-center space-x-4">
          {showConfirmButton && (
            <button
              onClick={onConfirm}
              className="bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 hover:bg-red-600"
            >
              ยืนยัน
            </button>
          )}
          <button
            onClick={onClose}
            className={`font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 ${
              showConfirmButton ? 'bg-gray-300 text-gray-700 hover:bg-gray-400' : 'bg-pink-600 text-white hover:bg-pink-700'
            }`}
          >
            {showConfirmButton ? 'ยกเลิก' : 'ตกลง'}
          </button>
        </div>
      </div>
    </div>
  );
};

function AdminComplaint() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [appealToDelete, setAppealToDelete] = useState(null);
  const [users, setUsers] = useState({}); // เก็บไว้เผื่อใช้

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // NOTE: API /warnings ถูกแก้ไขใน Backend ให้ดึง Full Name, Profile Name และ Appeal Details มาแล้ว
      const warningsResponse = await axios.get(`${API_BASE_URL}/warnings`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      
      const fetchedWarnings = warningsResponse.data.warnings;

      if (!Array.isArray(fetchedWarnings)) {
        throw new Error('Data format from API is incorrect.');
      }

      // Filter for warnings that have an appeal details (appeal_details !== null)
      const filteredAppeals = fetchedWarnings
        .filter(warning => warning.appeal_details !== null)
        
      setAppeals(filteredAppeals);
      
    } catch (err) {
      console.error('Error fetching data:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลการยื่นอุทธรณ์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppeal = (appealId) => {
    setAppealToDelete(appealId);
    setStatusMessage({
      title: 'ยืนยันการลบ/จัดการ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบการอุทธรณ์นี้? (เป็นการนำรายการออกจากประวัติ)',
      showConfirmButton: true
    });
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      await axios.delete(`${API_BASE_URL}/warnings/${appealToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage({ title: 'ดำเนินการสำเร็จ', text: 'ลบรายการอุทธรณ์เรียบร้อยแล้ว' });
      fetchData(); // Refresh data after deletion
    } catch (err) {
      console.error('Error deleting appeal:', err.response?.data?.message || err.message);
      setStatusMessage({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบรายการอุทธรณ์ได้' });
    } finally {
      setAppealToDelete(null);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return formatter.format(date).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$1/$2/$3');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center mb-6">
          <a href="#" className="flex items-center text-[#36A897] hover:text-[#2a8779]">
            <ChevronLeft size={24} className="mr-2" />
          </a>
          <h1 className="text-xl font-bold text-gray-700">ข้อมูลการยื่นอุทธรณ์ปัญหาหลังการขาย</h1>
        </div>
        
        {statusMessage && (
          <MessageBox
            title={statusMessage.title}
            text={statusMessage.text}
            onClose={() => setStatusMessage(null)}
            onConfirm={statusMessage.showConfirmButton ? confirmDelete : null}
            showConfirmButton={statusMessage.showConfirmButton}
          />
        )}

        {loading && (
          <div className="flex justify-center items-center h-64 w-full">
            <Loader size={32} className="animate-spin text-pink-600" />
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
              <MessageSquare className="text-gray-600 mr-2" size={24} />
              <h2 className="text-xl font-bold text-gray-700">ข้อมูลการยื่นอุทธรณ์ปัญหาหลังการขาย</h2>
            </div>
            
            {/* Table */}
            <div className="p-4 md:p-6 overflow-x-auto">
              {appeals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลการยื่นอุทธรณ์</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อบัญชีร้านค้า</th>
                      {/* *** NEW: คอลัมน์ชื่อผู้ขาย (Full Name) *** */}
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ขาย</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเลขคำสั่งซื้อ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียดอุทธรณ์</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ/ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appeals.map((appeal, index) => (
                      <tr key={appeal.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{appeal.seller_name}</td>
                        {/* *** NEW: แสดงชื่อผู้ขาย (Full Name) *** */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appeal.full_name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-pink-600 font-medium">
                          {appeal.order_id ? `#${appeal.order_id}` : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appeal.appeal_status === 'pending' && <span className="flex items-center text-yellow-600 font-bold"> <AlertCircle size={16} className="mr-1"/> รอดำเนินการ</span>}
                          {appeal.appeal_status === 'approved' && <span className="flex items-center text-green-600 font-bold"> <CheckCircle size={16} className="mr-1"/> อนุมัติแล้ว</span>}
                          {appeal.appeal_status === 'rejected' && <span className="flex items-center text-red-600 font-bold"> <XCircle size={16} className="mr-1"/> ไม่อนุมัติ</span>}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{appeal.appeal_details || '-'}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(appeal.created_at)}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleDeleteAppeal(appeal.id)}
                            className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                            title="ลบรายการอุทธรณ์"
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

export default AdminComplaint;