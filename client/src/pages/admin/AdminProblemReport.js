import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API Base URL - ควรแก้ไขเป็น URL ของเซิร์ฟเวอร์จริง
const ADMIN_API_BASE_URL = 'http://localhost:3000/api/admin';

// Replaced external icon libraries with inline SVGs for better compatibility in a single-file app.
const icons = {
  Mail: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  CheckCircle: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.8"/><path d="M22 4 12 14.01l-3-3"/></svg>,
  Clock: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  XCircle: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  // *** เปลี่ยน Trash เป็น RotateCw ***
  RotateCw: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-7.7 3.5"/><path d="M4 5v4h4"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 7.7-3.5"/><path d="M20 19v-4h-4"/></svg>,
  BellRing: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.36 17.57a2 2 0 1 0 3.28 0"/><path d="M12 22v-2"/></svg>,
  Eye: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  AlertTriangle: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14c-.45-.82-1.28-1.28-2.18-1.28s-1.73.46-2.18 1.28l-8 14c-.45.82-.45 1.79 0 2.61.45.82 1.28 1.28 2.18 1.28h16c.9 0 1.73-.46 2.18-1.28.45-.82.45-1.79 0-2.61Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  ChevronLeft: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
};

const Mail = icons.Mail;
const CheckCircle = icons.CheckCircle;
const Clock = icons.Clock;
const XCircle = icons.XCircle;
// const Trash = icons.Trash; // นำ Trash ออก
const RotateCw = icons.RotateCw; // ใช้ RotateCw แทน
const BellRing = icons.BellRing;
const Eye = icons.Eye;
const AlertTriangle = icons.AlertTriangle;
const ChevronLeft = icons.ChevronLeft;


function AdminProblemReport() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [sellerProblemCounts, setSellerProblemCounts] = useState({});
  const [selectedWarningCount, setSelectedWarningCount] = useState(1);
  const [isSending, setIsSending] = useState(false); 

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
      // เรียกใช้ API endpoint ใหม่
      const response = await axios.get(`${ADMIN_API_BASE_URL}/problems/full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allProblems = response.data.problems;
      
      // *** 🚨 การกรอง: เอาปัญหาที่มาจากผู้ขายที่ถูกระงับออกไป (สมมติว่า status ของผู้ใช้เป็น 'ถูกระงับ') ***
      // NOTE: ในการใช้งานจริง API ควร join ข้อมูลสถานะผู้ขาย (u.status หรือ s.status) มาด้วย
      // เนื่องจาก API /problems/full ที่ให้มาไม่ได้ดึง status ของผู้ขายมาโดยตรง
      // ผมจะสมมติว่าถ้าปัญหาถูกแก้ไขแล้ว (closed) หรือผู้ขายถูกระงับ (ซึ่งไม่มีข้อมูลในตอนนี้) จะถูกกรองออกไป 
      // เพื่อให้เป็นไปตามโจทย์ "เอาออกจากหน้าการแจ้งเตือน"
      
      // ปัญหาจะถูกแสดงถ้าสถานะไม่ใช่ 'closed'
      const problemsToDisplay = allProblems.filter(problem => problem.status !== 'closed');
      
      setProblems(problemsToDisplay);
      
      // คำนวณจำนวนปัญหาต่อผู้ขาย
      const counts = problemsToDisplay.reduce((acc, problem) => {
        const sellerName = problem.seller_profile_name;
        acc[sellerName] = (acc[sellerName] || 0) + 1;
        return acc;
      }, {});
      setSellerProblemCounts(counts);

    } catch (err) {
      console.error('Error fetching problems:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลปัญหาได้ กรุณาตรวจสอบการเชื่อมต่อและข้อมูลจากเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (problemId, newStatus) => {
    const token = localStorage.getItem('admin_token');
    try {
      setStatusMessage('');
      await axios.put(`${ADMIN_API_BASE_URL}/problems/${problemId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage(`อัปเดตสถานะปัญหาเรียบร้อยแล้ว`);
      fetchProblems(); // ดึงข้อมูลใหม่เพื่อซ่อนรายการที่สถานะเป็น closed
    } catch (err) {
      console.error('Error updating status:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถอัปเดตสถานะปัญหาได้');
    }
  };

  const handleDeleteReport = (problem) => {
    setReportToDelete(problem);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('admin_token');
    setShowConfirmModal(false);
    try {
      setStatusMessage('');
      await axios.delete(`${ADMIN_API_BASE_URL}/problems/${reportToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage('ลบรายงานปัญหาเรียบร้อยแล้ว');
      fetchProblems();
    } catch (err) {
      console.error('Error deleting report:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถลบรายงานปัญหาได้');
    }
  };

  const handleShowDetails = (problem) => {
    setSelectedProblem(problem);
    setShowDetailModal(true);
  };

  const handleShowWarningModal = (problem) => {
    console.log("กำลังเปิด Modal สำหรับรายงานปัญหา:", problem);
    setSelectedProblem(problem);
    // ตั้งค่าข้อความเริ่มต้นสำหรับการแจ้งเตือนเป็นสาเหตุจากปัญหา
    setWarningMessage(`สาเหตุ: ${problem.problem_type}, รายละเอียด: ${problem.description}`);
    // NOTE: ในการใช้งานจริงควรดึง Warning count ปัจจุบันของผู้ขายคนนี้มาแสดง
    setShowWarningModal(true);
  };
  
  const sendWarningToSeller = async () => {
    const token = localStorage.getItem('admin_token');
    if (isSending || !selectedProblem || !selectedProblem.seller_id) {
        console.error("Seller ID หรือข้อมูลอื่น ๆ ที่จำเป็นขาดหายไป");
        setStatusMessage('ไม่สามารถส่งคำเตือนได้: ข้อมูลผู้ขายไม่สมบูรณ์');
        setIsSending(false);
        setShowWarningModal(false);
        return;
    }
    if (!warningMessage.trim()) {
        setStatusMessage('ข้อความแจ้งเตือนไม่สามารถเป็นค่าว่างได้');
        return;
    }

    setIsSending(true);
    setStatusMessage('');
    
    try {
      const payload = { 
        seller_id: selectedProblem.seller_id,
        message: warningMessage, // ใช้ข้อความที่ถูกแก้ไขแล้ว
        warning_count: selectedWarningCount
      };

      await axios.post(`${ADMIN_API_BASE_URL}/warnings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatusMessage(`ส่งคำเตือนไปยังร้านค้า ${selectedProblem.seller_profile_name} เรียบร้อยแล้ว`);
      
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการส่งคำเตือน:', err.response?.data || err.message);
      setStatusMessage(`ไม่สามารถส่งคำเตือนไปยังร้านค้า ${selectedProblem.seller_profile_name} ได้: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSending(false);
      setShowWarningModal(false);
      fetchProblems(); // Refresh the list to show updated warning counts
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const buddhistYear = String(date.getFullYear() + 543).slice(-2);
    return `${day}/${month}/${buddhistYear}`;
  };

  const getSellerProblemCount = (sellerName) => {
    return sellerProblemCounts[sellerName] || 0;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-[#E9F3F1] p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <a href="#" className="flex items-center text-[#36A897] hover:text-[#2a8779]">
            <ChevronLeft className="mr-2 h-6 w-6" />
          </a>
          <div className="flex items-center text-gray-700">
            <Mail className="mr-3 h-6 w-6" />
            <h1 className="text-xl font-bold">รายงานปัญหาร้านค้า</h1>
          </div>
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
              {problems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">ไม่พบรายงานปัญหาที่ถูกส่งเข้ามา</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      {/* ส่วนของหัวตารางที่ถูกปรับปรุงใหม่ */}
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อบัญชี (ผู้ซื้อ)</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อบัญชี (ผู้ขาย)</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สาเหตุ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รูปภาพหลักฐาน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แก้ไข/ปฏิเสธ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {problems.map((problem, index) => (
                      <tr key={problem.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        {/* แสดงชื่อผู้ซื้อ */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{problem.buyer_profile_name}</td>
                        {/* แสดงชื่อผู้ขาย */}
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{problem.seller_profile_name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{problem.problem_type}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{problem.description}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center">
                          {problem.image_url && (
                            <img src={`${ADMIN_API_BASE_URL.replace('/api/admin', '')}/${problem.image_url}`} alt="หลักฐาน" className="h-12 w-12 object-cover rounded-md" />
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(problem.reported_at)}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleShowDetails(problem)}
                            className="text-blue-600 hover:text-blue-900"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {getSellerProblemCount(problem.seller_profile_name) >= 3 && (
                            <button
                              onClick={() => handleShowWarningModal(problem)}
                              className="text-pink-600 hover:text-pink-800"
                              title="แจ้งเตือนร้านค้า"
                            >
                              <BellRing className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReport(problem)}
                            className="text-red-600 hover:text-red-900"
                            title="ลบ/ปฏิเสธ"
                          >
                            <RotateCw className="w-5 h-5" />
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
      {/* Modals remain unchanged for now */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-center mb-4">ยืนยันการลบรายงาน</h3>
            <p className="text-center">คุณต้องการลบรายงานปัญหาเรื่อง "<span className="font-semibold">{reportToDelete?.description}</span>" ใช่หรือไม่? (การลบจะนำรายการนี้ออกจากฐานข้อมูล)</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={confirmDelete}
                // *** เปลี่ยนสีปุ่มให้สอดคล้องกับการปฏิเสธ/ยกเลิก (RotateCw) ***
                className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700"
              >
                ยืนยันการลบ
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedProblem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">รายละเอียดรายงานปัญหา</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">ID ปัญหา:</p>
                <p className="text-lg text-gray-900">{selectedProblem.id}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">ID คำสั่งซื้อ:</p>
                <p className="text-lg text-gray-900">{selectedProblem.order_id}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">ประเภทปัญหา:</p>
                <p className="text-lg text-gray-900">{selectedProblem.problem_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">ร้านค้า:</p>
                <p className="text-lg text-gray-900">{selectedProblem.seller_profile_name}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-600">คำอธิบาย:</p>
                <p className="text-lg text-gray-900">{selectedProblem.description}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-600">ภาพประกอบ:</p>
                {selectedProblem.image_url ? (
                  <img src={`${ADMIN_API_BASE_URL.replace('/api/admin', '')}/${selectedProblem.image_url}`} alt="Problem" className="mt-2 rounded-lg max-w-full h-auto" />
                ) : (
                  <p className="text-gray-500">- ไม่มีภาพประกอบ -</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">สถานะ:</p>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  selectedProblem.status === 'closed' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedProblem.status === 'closed' ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">วันที่แจ้ง:</p>
                <p className="text-lg text-gray-900">{formatDateTime(selectedProblem.reported_at)}</p>
              </div>
              <div className="md:col-span-2 mt-4 flex justify-between space-x-2">
                <button
                  onClick={() => handleUpdateStatus(selectedProblem.id, selectedProblem.status === 'closed' ? 'open' : 'closed')}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition ${
                    selectedProblem.status === 'closed' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {selectedProblem.status === 'closed' ? <><XCircle className="w-4 h-4 mr-2" /> ตั้งค่าเป็นรอดำเนินการ</> : <><CheckCircle className="w-4 h-4 mr-2" /> ตั้งค่าเป็นแก้ไขแล้ว</>}
                </button>
                <button
                  onClick={() => handleDeleteReport(selectedProblem)}
                  className="flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition bg-red-50 text-red-700 hover:bg-red-100"
                >
                  {/* *** เปลี่ยนไอคอนเป็น RotateCw *** */}
                  <RotateCw className="w-4 h-4 mr-2" /> ลบรายงาน
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-300 text-gray-800 font-medium rounded-md shadow-sm hover:bg-gray-400"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal (for sending warnings) */}
      {showWarningModal && selectedProblem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-6 bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="bg-[#E9F3F1] py-4 px-6 rounded-t-lg flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">แจ้งเตือนผู้ใช้</h3>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-4">
                <div className="flex items-center">
                  <input id="warning-1" name="warning-count" type="radio" className="form-radio text-[#36A897] h-4 w-4" onChange={() => setSelectedWarningCount(1)} checked={selectedWarningCount === 1} />
                  <label htmlFor="warning-1" className="ml-2 text-gray-700">แจ้งเตือนครั้งที่ 1</label>
                </div>
                <div className="flex items-center">
                  <input id="warning-2" name="warning-count" type="radio" className="form-radio text-[#36A897] h-4 w-4" onChange={() => setSelectedWarningCount(2)} checked={selectedWarningCount === 2} />
                  <label htmlFor="warning-2" className="ml-2 text-gray-700">แจ้งเตือนครั้งที่ 2</label>
                </div>
                <div className="flex items-center">
                  <input id="warning-3" name="warning-count" type="radio" className="form-radio text-[#36A897] h-4 w-4" onChange={() => setSelectedWarningCount(3)} checked={selectedWarningCount === 3} />
                  <label htmlFor="warning-3" className="ml-2 text-gray-700">แจ้งเตือนครั้งที่ 3</label>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="warningReason" className="block text-sm font-bold text-gray-700 mb-1">สาเหตุการเตือน <span className="text-red-500">*</span></label>
                <textarea
                  id="warningReason"
                  rows="4"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring focus:ring-pink-200 focus:ring-opacity-50"
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                ></textarea>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพหลักฐาน <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-500">(แนบได้สูงสุด 3 รูปภาพ)</span></label>
                {selectedProblem.image_url ? (
                  <img src={`${ADMIN_API_BASE_URL.replace('/api/admin', '')}/${selectedProblem.image_url}`} alt="หลักฐาน" className="mt-2 rounded-lg h-24 w-24 object-cover" />
                ) : (
                  <p className="text-gray-500">- ไม่มีภาพประกอบ -</p>
                )}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={sendWarningToSeller}
                  className="px-6 py-2 bg-[#81D89D] text-white font-medium rounded-lg shadow-md hover:bg-[#68b881] transition-colors"
                  disabled={isSending}
                >
                  {isSending ? 'กำลังส่ง...' : 'แจ้งเตือน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProblemReport;