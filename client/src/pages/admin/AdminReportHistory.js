import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { VscChevronLeft } from 'react-icons/vsc';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

// URL สำหรับ API
const API_BASE_URL = 'http://localhost:3000/api';

function AdminReportHistory() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('คุณไม่ได้เข้าสู่ระบบ');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/problems`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // ปรับปรุงการตรวจสอบข้อมูลที่ได้รับ
      if (Array.isArray(response.data)) {
        setProblems(response.data);
      } else if (response.data && response.data.problems) {
        setProblems(response.data.problems);
      } else {
        setProblems([]);
        setError('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Error fetching problems:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลประวัติการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (problemId, newStatus) => {
    const token = localStorage.getItem('admin_token');
    try {
      await axios.put(`${API_BASE_URL}/problems/${problemId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProblems();
    } catch (err) {
      console.error('Error updating problem status:', err.response?.data?.message || err.message);
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center mb-6">
          <a href="#" className="flex items-center text-[#36A897] hover:text-[#2a8779]">
            <VscChevronLeft size={24} className="mr-2" />
          </a>
          <h1 className="text-xl font-bold text-gray-700">ประวัติการแจ้งเตือนร้านค้า</h1>
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
          <div className="w-full max-w-7xl mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <span className="block">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="w-full max-w-7xl bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Table Header with Title */}
            <div className="bg-[#E9F3F1] p-4 flex items-center rounded-t-lg">
              <FileText className="text-gray-600 mr-2" size={24} />
              <h2 className="text-xl font-bold text-gray-700">ประวัติการแจ้งเตือนร้านค้า</h2>
            </div>
            
            {/* Table */}
            <div className="p-4 md:p-6 overflow-x-auto">
              {problems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่มีประวัติการแจ้งเตือน</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเลขคำสั่งซื้อ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สาเหตุ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รูปภาพหลักฐาน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่แจ้ง</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แก้ไขสถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {problems.map((problem, index) => (
                      <tr key={problem.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        {/* ใช้ order_id จากข้อมูล */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{problem.order_id}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{problem.problem_type}</td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{problem.description}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {problem.image_url ? (
                            <a href={`http://localhost:3000/${problem.image_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              ดูรูปภาพ
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(problem.reported_at)}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${problem.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {problem.status === 'open' ? 'รอการแก้ไข' : 'แก้ไขแล้ว'}
                            </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          {problem.status === 'open' ? (
                            <button
                              onClick={() => handleStatusChange(problem.id, 'closed')}
                              className="text-[#36A897] hover:text-[#2a8779] transition-colors duration-200"
                              title="เปลี่ยนเป็นแก้ไขแล้ว"
                            >
                              <CheckCircle size={20} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(problem.id, 'open')}
                              className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                              title="เปลี่ยนเป็นยังไม่แก้ไข"
                            >
                              <XCircle size={20} />
                            </button>
                          )}
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

export default AdminReportHistory;