import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext'; 
import { ListChecks, AlertTriangle, MessageSquare, CornerUpLeft, XCircle, CheckCircle, Loader, History } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

// ***************************************************************
// ** Helper Function: Format Number with Comma (Global) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return '-';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


/**
 * Custom Message Box component (instead of alert)
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.text
 * @param {function} props.onClose
 * @returns {JSX.Element}
 */
const MessageBox = ({ title, text, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[99]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-105">
        <h2 className="text-xl font-bold mb-2 text-pink-600">{title}</h2>
        <p className="text-gray-700 mb-6">{text}</p>
        <button
          onClick={onClose}
          className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
        >
          ตกลง
        </button>
      </div>
    </div>
  );
};

function SellerWarningHistory() {
  const { user } = useUser();
  const [warnings, setWarnings] = useState([]);
  const [warningCount, setWarningCount] = useState(0); // State สำหรับนับจำนวนการแจ้งเตือนใน 6 เดือน
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [currentWarning, setCurrentWarning] = useState(null);
  const [appealDetails, setAppealDetails] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const [message, setMessage] = useState(null); // State for custom message box

  const fetchSellerWarnings = useCallback(async () => {
    if (!user || !user.token) {
      setLoading(false);
      setError('คุณต้องเข้าสู่ระบบในฐานะผู้ขายเพื่อดูประวัติการแจ้งเตือน');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      // Endpoint (17) GET /warnings
      const response = await axios.get(`${API_BASE_URL}/sellers/warnings`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      const fetchedWarnings = response.data.warnings;
      
      // 1. Calculate the cutoff date (6 months ago) using native Date
      const sixMonthsAgoDate = new Date();
      // ตั้งค่าเดือนให้ย้อนกลับไป 6 เดือน (JavaScript จะจัดการเรื่องการเปลี่ยนปีให้โดยอัตโนมัติ)
      sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6); 
      
      // 2. Filter warnings within the last 6 months (Policy check)
      // การนับตามนโยบาย: นับเฉพาะการแจ้งเตือนที่เกิดขึ้นในช่วง 6 เดือนล่าสุด
      const recentWarnings = fetchedWarnings.filter(warning => {
          const warningDate = new Date(warning.created_at);
          // ตรวจสอบว่าวันที่แจ้งเตือน (created_at) มีค่ามากกว่า (เกิดหลัง) 6 เดือนที่แล้วหรือไม่
          return warningDate.getTime() > sixMonthsAgoDate.getTime();
      });
      
      // 3. Update the calculated count
      const count = recentWarnings.length;
      setWarningCount(count); 

      // 4. Sort all warnings for the display table
      const sortedWarnings = fetchedWarnings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setWarnings(sortedWarnings);
      
    } catch (err) {
      console.error('Error fetching seller warnings:', err.response?.data?.message || err.message);
      setError('ไม่สามารถดึงข้อมูลการแจ้งเตือนได้ โปรดลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSellerWarnings();
  }, [fetchSellerWarnings]);

  const handleAppealClick = (warning) => {
    setCurrentWarning(warning);
    setShowAppealForm(true);
    setAppealDetails(''); // Clear previous form data
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealDetails.trim()) {
      setMessage({
        title: "เกิดข้อผิดพลาด!",
        text: "กรุณากรอกรายละเอียดการอุทธรณ์"
      });
      return;
    }
    if (!currentWarning) {
      return;
    }

    setAppealLoading(true);

    try {
      // Endpoint (18) POST /warnings/:id/appeal
      await axios.post(`${API_BASE_URL}/sellers/warnings/${currentWarning.id}/appeal`, {
        appeal_details: appealDetails
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setMessage({
        title: "ส่งเรื่องสำเร็จ!",
        text: "คำขออุทธรณ์ของคุณถูกส่งเรียบร้อยแล้ว"
      });

      setShowAppealForm(false);
      setAppealDetails('');
      fetchSellerWarnings(); // Refresh data after successful appeal
    } catch (err) {
      console.error('Error submitting appeal:', err.response?.data?.message || err.message);
      setMessage({
        title: "เกิดข้อผิดพลาด!",
        text: err.response?.data?.message || 'ไม่สามารถยื่นอุทธรณ์ได้ โปรดลองใหม่อีกครั้ง'
      });
    } finally {
      setAppealLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-7xl flex items-center bg-white p-4 rounded-lg mb-6 shadow-md border border-gray-200">
          <History className="text-pink-600 mr-3" size={24} />
          <h1 className="text-xl font-bold text-gray-700">ประวัติการแจ้งเตือน</h1>
        </div>

        {/* --- Shop Management Policy Section --- */}
        <div className="w-full max-w-7xl mb-6 p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md">
            <h2 className="text-lg font-bold text-red-700 flex items-center mb-3">
                <AlertTriangle size={20} className="mr-2" /> นโยบายการจัดการร้านค้า (Seller Policy)
            </h2>
            
            {/* Display Current Count */}
            <div className="mb-4 p-3 bg-red-100 rounded-lg text-center font-bold text-red-800 text-lg">
                จำนวนการแจ้งเตือนสะสมใน 6 เดือน: 
                <span className="text-2xl ml-2">{warningCount}</span> ครั้ง 
                {/* แสดงสถานะปัจจุบัน (เช่น นับครั้งที่ 1, 2, หรือ 3) */}
                <span className={`ml-4 px-3 py-1 rounded-full text-sm font-semibold 
                    ${warningCount === 0 ? 'bg-green-200 text-green-800' : warningCount === 1 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
                    {warningCount === 0 && 'ปลอดการเตือน'}
                    {warningCount === 1 && 'เสี่ยง (ครั้งที่ 1)'}
                    {warningCount === 2 && 'เสี่ยงสูง (ครั้งที่ 2)'}
                    {warningCount >= 3 && 'เสี่ยงสูงสุด (ครั้งที่ 3+)'}
                </span>
            </div>

            <p className="text-sm text-gray-700 mb-4">
                ร้านค้าจะถูกนับ **"การแจ้งเตือน" (Warnings)** ที่ได้รับภายในระยะเวลา **6 เดือน** เพื่อประเมินมาตรการลงโทษตามลำดับดังนี้:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-800 font-medium">
                <li className="text-red-600">
                    <span className="font-bold">การเตือนครั้งที่ 1:</span> งดการขายสินค้าเป็นเวลา 7 วัน
                </li>
                <li className="text-red-700">
                    <span className="font-bold">การเตือนครั้งที่ 2:</span> งดการขายสินค้าเป็นเวลา 1 เดือน
                </li>
                <li className="text-red-800">
                    <span className="font-bold">การเตือนครั้งที่ 3:</span> ลบบัญชีร้านค้าถาวร (ถูกระงับตลอดไป)
                </li>
            </ul>
            <p className="text-xs text-red-500 mt-4">
                <span className="font-bold">หมายเหตุ:</span> หากคุณเชื่อว่าการแจ้งเตือนนี้ไม่ถูกต้อง โปรดใช้แบบฟอร์ม "ยื่นอุทธรณ์" ด้านล่างเพื่อส่งหลักฐานการคัดค้านต่อผู้ดูแลระบบ
            </p>
        </div>
        {/* --- END POLICY SECTION --- */}

        {loading && (
          <div className="flex justify-center items-center h-64 w-full">
            <Loader className="animate-spin h-8 w-8 text-pink-600" />
            <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
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
                <p className="text-center text-gray-500 py-8">ไม่มีการแจ้งเตือนปัญหาหลังการขาย</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเลขคำสั่งซื้อ</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อความแจ้งเตือน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่แจ้งเตือน</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะการอุทธรณ์</th>
                      <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warnings.map((warning) => (
                      <tr key={warning.id}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-pink-600 font-medium">
                          {/* หมายเลขคำสั่งซื้อ */}
                          {warning.order_id ? (
                            <a href={`/orders/${warning.order_id}`} className="hover:underline">
                              #{warning.order_id} 
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-700 max-w-sm overflow-hidden text-ellipsis">{warning.message}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(warning.created_at).toLocaleDateString()}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center">
                          {warning.appeal_status === 'pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <MessageSquare size={12} className="mr-1" />
                              รอดำเนินการ
                            </span>
                          ) : warning.appeal_status === 'approved' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle size={12} className="mr-1" />
                              อุทธรณ์สำเร็จ
                            </span>
                          ) : warning.appeal_status === 'rejected' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle size={12} className="mr-1" />
                              อุทธรณ์ไม่สำเร็จ
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                          {warning.appeal_status ? (
                            <span className="text-gray-400" title="ยื่นอุทธรณ์ไปแล้ว">
                              <CornerUpLeft size={20} />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAppealClick(warning)}
                              className="text-pink-600 hover:text-pink-800 transition-colors duration-200"
                              title="ยื่นอุทธรณ์"
                            >
                              <CornerUpLeft size={20} />
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

      {/* Appeal Form Modal */}
      {showAppealForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden mx-4">
            {/* Form Header */}
            <div className="relative bg-gray-100 rounded-t-2xl text-gray-800 p-6 text-center">
              <button
                onClick={() => {
                  setShowAppealForm(false);
                  setAppealDetails('');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
              <h2 className="text-2xl font-bold">แบบฟอร์มการยื่นอุทธรณ์</h2>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAppealSubmit} className="p-8">
              {/* Order ID Display */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  หมายเลขคำสั่งซื้อ
                </label>
                <input
                  type="text"
                  // ใช้ currentWarning?.order_id โดยไม่ต้อง format สำหรับ ID
                  value={currentWarning?.order_id || ''} 
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Warning Message Display */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  รายละเอียดการแจ้งเตือน
                </label>
                <textarea
                  value={currentWarning?.message || ''}
                  readOnly
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed resize-none"
                ></textarea>
              </div>

              {/* Appeal Details Textarea */}
              <div className="mb-8">
                <label htmlFor="appeal-details" className="block text-gray-700 font-semibold mb-2">
                  เหตุผลในการอุทธรณ์ <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="appeal-details"
                  value={appealDetails}
                  onChange={(e) => setAppealDetails(e.target.value)}
                  required
                  rows="8"
                  placeholder="กรุณาอธิบายเหตุผลในการยื่นอุทธรณ์อย่างละเอียด"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition duration-200"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAppealForm(false)}
                  className="w-1/2 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={appealLoading}
                  className={`w-1/2 font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform ${
                    appealLoading ? 'bg-pink-300 text-white cursor-not-allowed' : 'bg-pink-600 text-white hover:bg-pink-700 hover:scale-105'
                  }`}
                >
                  {appealLoading ? 'กำลังส่ง...' : 'ยืนยันการยื่นอุทธรณ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Custom Message Box */}
      {message && <MessageBox title={message.title} text={message.text} onClose={() => setMessage(null)} />}
    </div>
  );
}

export default SellerWarningHistory;
