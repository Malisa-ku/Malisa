import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Ban } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

function AdminWarningHistory() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [warningToDelete, setWarningToDelete] = useState(null);
  const [sellerToSuspend, setSellerToSuspend] = useState(null);

  useEffect(() => {
    fetchAllWarnings();
  }, []);

  const fetchAllWarnings = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setStatusMessage({ type: '', message: '' });
      
      // แก้ไข: ดึงข้อมูล warnings ที่มีการ join กับ users
      const response = await axios.get(`${API_BASE_URL}/admin/warnings`, { // สมมติว่ามี endpoint ใหม่ที่ Join ข้อมูลให้
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.warnings;
      
      // กรอง warnings ที่มี warning_count เป็น 3
      const filteredWarnings = data.filter(warning => warning.warning_count === 3);

      setWarnings(filteredWarnings);
      
    } catch (err) {
      console.error('Error fetching warnings:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลประวัติการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendSeller = (sellerId, sellerName) => {
    setSellerToSuspend({ id: sellerId, name: sellerName });
    setShowSuspendModal(true);
  };
  
  const confirmSuspend = async () => {
    const token = localStorage.getItem('admin_token');
    setShowSuspendModal(false);
    if (!sellerToSuspend) return;

    try {
      await axios.put(
        `${API_BASE_URL}/admin/users/${sellerToSuspend.id}/status`,
        // ✅ แก้ไข: เปลี่ยนค่า status เป็น 'ถูกระงับ'
        { status: 'ถูกระงับ' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMessage({ type: 'success', message: 'ระงับบัญชีผู้ขายสำเร็จแล้ว' });
      fetchAllWarnings(); // Refresh the list
    } catch (err) {
      console.error('Error suspending seller:', err.response?.data?.message || err.message);
      setStatusMessage({ type: 'error', message: 'ไม่สามารถระงับบัญชีผู้ขายได้' });
    } finally {
      setSellerToSuspend(null);
    }
  };

  const handleDeleteWarning = (warning) => {
    setWarningToDelete(warning);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('admin_token');
    setShowDeleteModal(false);
    if (!warningToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/admin/warnings/${warningToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage({ type: 'success', message: 'ลบรายการแจ้งเตือนสำเร็จแล้ว' });
      fetchAllWarnings(); // Refresh the list
    } catch (err) {
      console.error('Error deleting warning:', err.response?.data?.message || err.message);
      setStatusMessage({ type: 'error', message: 'ไม่สามารถลบรายการแจ้งเตือนได้' });
    } finally {
      setWarningToDelete(null);
    }
  };

  const getAccountStatusColor = (status) => {
    return status === 'ถูกระงับ' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800 font-inter">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-[#E9F3F1] p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <h1 className="text-xl font-bold text-gray-700">ประวัติการแจ้งเตือนครบ 3 ครั้ง</h1>
        </div>

        {/* Status Message */}
        {statusMessage.message && (
          <div className={`w-full max-w-7xl mb-4 p-4 rounded-lg text-center ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className="block">{statusMessage.message}</span>
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
            {/* Table */}
            <div className="p-4 md:p-6 overflow-x-auto">
              {warnings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีร้านค้าที่ถูกแจ้งเตือนครบ 3 ครั้ง</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะบัญชี</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warnings.map((warning) => (
                      <tr key={warning.id}>
                        {/* แก้ไข: ดึงข้อมูลชื่อผู้ใช้จาก warning.full_name */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warning.full_name}</td>
                        {/* แก้ไข: ดึงข้อมูลอีเมลจาก warning.email */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warning.email}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAccountStatusColor(warning.status)}`}>
                            {/* แก้ไข: แสดง status จากข้อมูลที่ดึงมา */}
                            {warning.status === 'ถูกระงับ' ? 'ถูกระงับ' : 'ปกติ'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteWarning(warning)}
                              className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                              title="ลบรายการแจ้งเตือน"
                            >
                              <Trash2 size={20} />
                            </button>
                            {/* ✅ แก้ไข: ตรวจสอบสถานะว่า 'ถูกระงับ' หรือไม่ ก่อนแสดงปุ่ม */}
                            {warning.status !== 'ถูกระงับ' && (
                              <button
                                onClick={() => handleSuspendSeller(warning.seller_id, warning.profile_name)}
                                className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                                title="ระงับบัญชีผู้ขาย"
                              >
                                <Ban size={20} />
                              </button>
                            )}
                          </div>
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

      {/* Confirmation Modal - Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-center mb-4">ยืนยันการลบรายการแจ้งเตือน</h3>
            <p className="text-center">
              คุณแน่ใจหรือไม่ที่ต้องการลบรายการแจ้งเตือนของร้านค้า
              "**{warningToDelete?.profile_name}**" นี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Suspend */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-center mb-4">ยืนยันการระงับบัญชี</h3>
            <p className="text-center">
              คุณแน่ใจหรือไม่ที่ต้องการระงับบัญชีผู้ขาย
              "**{sellerToSuspend?.name}**" นี้? การกระทำนี้จะส่งผลให้ผู้ขายไม่สามารถเข้าถึงระบบได้
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={confirmSuspend}
                className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWarningHistory;