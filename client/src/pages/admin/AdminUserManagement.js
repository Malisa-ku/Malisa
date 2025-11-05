import React, { useState, useEffect } from 'react';
import axios from 'axios';
// *** เปลี่ยนการ import: นำ Trash ออก และใช้ RotateCw สำหรับการยกเลิก/ปฏิเสธทั้งหมด ***
import { CheckCircle, User, RotateCw } from 'lucide-react'; 
import { VscChevronLeft } from 'react-icons/vsc';

// URL สำหรับ Admin API
const ADMIN_API_BASE_URL = 'http://localhost:3000/api/admin';

function AdminUserManagement() {
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingNameChanges, setPendingNameChanges] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  
  // States สำหรับ Modal ยืนยัน
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // เพิ่ม 'cancel_seller' สำหรับการปฏิเสธผู้สมัครใหม่
  const [modalAction, setModalAction] = useState(''); 
  const [userToProcess, setUserToProcess] = useState(null);
  const [cancellationReason, setCancellationReason] = useState(''); 

  // States สำหรับ Checkbox
  const [selectedUserIds, setSelectedUserIds] = useState(new Set()); 

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([
          fetchPendingSellers(),
          fetchPendingNameChanges()
        ]);
      } catch (e) {
        console.error("Error during initial data fetch:", e);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลเริ่มต้น");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // *** ฟังก์ชันดึงผู้สมัครร้านค้าใหม่ (คงเดิม) ***
  const fetchPendingSellers = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return; 
    try {
      const response = await axios.get(`${ADMIN_API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filteredUsers = response.data.users.filter(user => user.role === 'seller' && user.status === 'รอดำเนินการ');
      
      const sortedUsers = filteredUsers.sort((a, b) => {
        const nameA = a.profile_name.toLowerCase();
        const nameB = b.profile_name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setPendingSellers(sortedUsers);
      setSelectedUserIds(new Set());
    } catch (err) {
      console.error('Error fetching new sellers:', err.response?.data?.message || err.message);
    }
  };

  // *** ฟังก์ชันสำหรับดึงคำขอเปลี่ยนชื่อร้านค้า (คงเดิม) ***
  const fetchPendingNameChanges = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      // NOTE: ต้องมั่นใจว่า Backend มี Endpoint นี้และส่งข้อมูลถูกต้อง (ตามที่ได้แก้ไขใน admin.js ก่อนหน้านี้)
      const response = await axios.get(`${ADMIN_API_BASE_URL}/users/pending-name-change`, { 
        headers: { Authorization: `Bearer ${token}` }
      });

      // ใช้ response.data.users โดยตรง เพราะ Backend ควรกรองมาให้แล้ว
      setPendingNameChanges(response.data.users); 

    } catch (err) {
      console.error('Error fetching pending name changes:', err.response?.data?.message || err.message);
    }
  };

  // *** ฟังก์ชันอัปเดตสถานะผู้สมัครใหม่ (ใช้ 'approved' แทน 'รอดำเนินการ') ***
  const handleUpdateStatus = async (userId, newStatus) => {
    const token = localStorage.getItem('admin_token');
    try {
      // NOTE: newStatus จะเป็น 'approved' สำหรับการอนุมัติ หรือ 'ถูกปฏิเสธ' สำหรับการยกเลิก/ปฏิเสธ
      await axios.put(`${ADMIN_API_BASE_URL}/users/${userId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage(`อัปเดตสถานะผู้ใช้ ${userToProcess?.profile_name} เป็น ${newStatus} เรียบร้อยแล้ว`);
      fetchPendingSellers();
    } catch (err) {
      console.error('Error updating status:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถอัปเดตสถานะผู้ใช้ได้');
    } finally {
      setShowConfirmModal(false);
    }
  };

  // *** ลบ handleDeletUser เดิม และเปลี่ยนเป็นการปฏิเสธ (Reject) ***
  const handleRejectUser = async (user) => {
    // ใช้ handleUpdateStatus เพื่อเปลี่ยน status เป็น 'ถูกปฏิเสธ' (สมมติว่า DB รองรับสถานะนี้)
    handleUpdateStatus(user.id, 'ถูกปฏิเสธ'); 
  };

  const handleApproveNameChange = async (user) => {
    const token = localStorage.getItem('admin_token');
    try {
      await axios.put(`${ADMIN_API_BASE_URL}/users/${user.id}/approve-name-change`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage(`อนุมัติการเปลี่ยนชื่อร้านค้าเป็น "${user.pending_profile_name}" ให้กับผู้ใช้ ${user.profile_name} เรียบร้อยแล้ว`);
      fetchPendingNameChanges();
    } catch (err) {
      console.error('Error approving name change:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถอนุมัติการเปลี่ยนชื่อร้านค้าได้');
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleCancelNameChange = async (user, reason) => {
    const token = localStorage.getItem('admin_token');
    try {
      await axios.put(`${ADMIN_API_BASE_URL}/users/${user.id}/cancel-name-change`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMessage(`ยกเลิกคำขอเปลี่ยนชื่อร้านค้าเป็น "${user.pending_profile_name}" ของผู้ใช้ ${user.profile_name} เรียบร้อยแล้ว. เหตุผล: ${reason}`);
      fetchPendingNameChanges();
    } catch (err) {
      console.error('Error cancelling name change:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถยกเลิกการเปลี่ยนชื่อร้านค้าได้');
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleCheckboxChange = (userId, isChecked) => {
    setSelectedUserIds(prevIds => {
      const newIds = new Set(prevIds);
      if (isChecked) {
        newIds.add(userId);
      } else {
        newIds.delete(userId);
      }
      return newIds;
    });
  };

  const handleSelectAllChange = (isChecked) => {
    if (isChecked) {
      const allIds = new Set(pendingSellers.map(user => user.id));
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  // *** คงฟังก์ชัน Batch Action ไว้ แต่ปุ่มถูกลบใน JSX ***
  const handleApproveSelected = () => {
    if (selectedUserIds.size === 0) {
      setStatusMessage('กรุณาเลือกผู้ใช้ที่ต้องการอนุมัติ');
      return;
    }
    setModalAction('approve_selected');
    setShowConfirmModal(true);
  };

  const confirmApproveSelected = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      for (const userId of selectedUserIds) {
        await axios.put(`${ADMIN_API_BASE_URL}/users/${userId}/status`, { status: 'approved' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setStatusMessage(`อนุมัติผู้ใช้ที่เลือก ${selectedUserIds.size} รายการเรียบร้อยแล้ว`);
      fetchPendingSellers();
    } catch (err) {
      console.error('Error approving users:', err.response?.data?.message || err.message);
      setStatusMessage('ไม่สามารถอนุมัติผู้ใช้ที่เลือกได้');
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleCancelSelected = () => {
    setSelectedUserIds(new Set());
    setStatusMessage('ยกเลิกการเลือกทั้งหมดแล้ว');
  };
  // *** สิ้นสุดฟังก์ชัน Batch Action ***

  const showApprovalModal = (user) => {
    setUserToProcess(user);
    setModalAction('approve');
    setShowConfirmModal(true);
  };
  
  // *** ฟังก์ชันแสดง Modal ปฏิเสธ/ยกเลิกผู้สมัครใหม่ ***
  const showRejectSellerModal = (user) => {
    setUserToProcess(user);
    setModalAction('cancel_seller'); // ใช้ 'cancel_seller' แทน 'delete'
    setShowConfirmModal(true);
  };
  
  const showNameChangeApprovalModal = (user) => {
    setUserToProcess(user);
    setModalAction('approve_name_change');
    setShowConfirmModal(true);
    setCancellationReason('');
  };
  
  const showNameChangeCancelModal = (user) => {
    setUserToProcess(user);
    setModalAction('cancel_name_change');
    setShowConfirmModal(true);
    setCancellationReason('');
  };
  
  const handleModalConfirm = () => {
    setStatusMessage('');
    if (modalAction === 'approve' && userToProcess) {
      handleUpdateStatus(userToProcess.id, 'approved'); 
    } else if (modalAction === 'cancel_seller' && userToProcess) { // *** เปลี่ยนจาก delete เป็น cancel_seller ***
       // หากต้องการเหตุผลในการปฏิเสธ สามารถเพิ่ม Modal Input ได้ แต่ในที่นี้จะปฏิเสธโดยตรง
       handleRejectUser(userToProcess);
    } else if (modalAction === 'approve_selected') {
      confirmApproveSelected();
    } else if (modalAction === 'approve_name_change' && userToProcess) {
      handleApproveNameChange(userToProcess); 
    } else if (modalAction === 'cancel_name_change' && userToProcess) {
       if (!cancellationReason.trim()) {
         setStatusMessage('กรุณาใส่เหตุผลในการยกเลิก');
         return; 
       }
      handleCancelNameChange(userToProcess, cancellationReason); 
    }
  };

  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setUserToProcess(null);
    setModalAction('');
    setCancellationReason('');
  };

  // Helper function สำหรับข้อความใน Modal
  const getModalContent = () => {
    switch (modalAction) {
      case 'approve':
        return {
          title: 'ยืนยันการอนุมัติ',
          message: `คุณต้องการอนุมัติผู้ใช้ชื่อ ${userToProcess?.profile_name} ใช่หรือไม่?`,
          confirmText: 'อนุมัติ',
          cancelText: 'ยกเลิก',
          confirmClass: 'bg-[#36A897] hover:bg-[#2a8779]',
          cancelClass: 'bg-gray-300 hover:bg-gray-400',
          showReasonInput: false
        };
      // *** Case ใหม่สำหรับการปฏิเสธผู้สมัครใหม่ ***
      case 'cancel_seller':
        return {
          title: 'ยืนยันการปฏิเสธผู้สมัคร',
          message: `คุณต้องการปฏิเสธการสมัครร้านค้าของผู้ใช้ชื่อ ${userToProcess?.profile_name} ใช่หรือไม่? สถานะจะถูกเปลี่ยนเป็น "ถูกปฏิเสธ"`,
          confirmText: 'ปฏิเสธ',
          cancelText: 'ยกเลิก',
          confirmClass: 'bg-[#F75271] hover:bg-[#d34761]',
          cancelClass: 'bg-gray-300 hover:bg-gray-400',
          showReasonInput: false
        };
      case 'approve_selected':
        return {
          title: 'ยืนยันการอนุมัติทั้งหมด',
          message: `คุณต้องการอนุมัติผู้ใช้ที่เลือก ${selectedUserIds.size} รายการใช่หรือไม่?`,
          confirmText: 'อนุมัติทั้งหมด',
          cancelText: 'ยกเลิก',
          confirmClass: 'bg-[#36A897] hover:bg-[#2a8779]',
          cancelClass: 'bg-gray-300 hover:bg-gray-400',
          showReasonInput: false
        };
      case 'approve_name_change':
        return {
          title: 'ยืนยันการเปลี่ยนชื่อร้านค้า',
          message: `คุณต้องการอนุมัติให้ผู้ใช้ ${userToProcess?.profile_name} เปลี่ยนชื่อร้านเป็น "${userToProcess?.pending_profile_name}" ใช่หรือไม่?`,
          confirmText: 'อนุมัติเปลี่ยนชื่อ',
          cancelText: 'ยกเลิก',
          confirmClass: 'bg-[#36A897] hover:bg-[#2a8779]',
          cancelClass: 'bg-gray-300 hover:bg-gray-400',
          showReasonInput: false
        };
      case 'cancel_name_change':
        return {
          title: 'ยืนยันการยกเลิกคำขอเปลี่ยนชื่อ',
          message: `คุณต้องการ **ยกเลิก** คำขอเปลี่ยนชื่อร้านค้าเป็น "${userToProcess?.pending_profile_name}" ของผู้ใช้ ${userToProcess?.profile_name} ใช่หรือไม่?`,
          confirmText: 'ยืนยันยกเลิก',
          cancelText: 'ไม่ยกเลิก',
          confirmClass: 'bg-[#F75271] hover:bg-[#d34761]',
          cancelClass: 'bg-gray-300 hover:bg-gray-400',
          showReasonInput: true 
        };
      default:
        return {};
    }
  };

  const modalContent = getModalContent();

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {statusMessage && (
          <div className="w-full max-w-4xl mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
            {statusMessage}
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
          <div className="w-full max-w-4xl mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <span className="block">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* *** ส่วนที่ 1: คำขอเปลี่ยนชื่อร้านค้า *** */}
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
              <div className="bg-[#E9F3F1] p-4 flex items-center rounded-t-lg">
                <RotateCw className="text-gray-600 mr-2" size={24} />
                <h2 className="text-xl font-bold text-gray-700">คำขอเปลี่ยนชื่อร้านค้า</h2>
              </div>
              
              <div className="p-4 md:p-6 overflow-x-auto">
                {pendingNameChanges.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">ไม่มีคำขอเปลี่ยนชื่อร้านค้าที่รอการอนุมัติ</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับ</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อร้านเดิม</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อร้านใหม่ที่ขอ</th>
                        <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อนุมัติ</th>
                        <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ยกเลิก/ปฏิเสธ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingNameChanges.map((user, index) => (
                        <tr key={user.id}>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.profile_name}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                            {user.pending_profile_name}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => showNameChangeApprovalModal(user)}
                              className="text-[#36A897] hover:text-[#2a8779] transition-colors duration-200"
                              title="อนุมัติการเปลี่ยนชื่อ"
                            >
                              <CheckCircle size={20} />
                            </button>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => showNameChangeCancelModal(user)}
                              className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                              title="ปฏิเสธ/ยกเลิกคำขอ"
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

            {/* *** ส่วนที่ 2: การสมัครสมาชิกร้านค้าใหม่ *** */}
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="bg-[#E9F3F1] p-4 flex items-center rounded-t-lg">
                <User className="text-gray-600 mr-2" size={24} />
                <h2 className="text-xl font-bold text-gray-700">การสมัครสมาชิกร้านค้า</h2>
              </div>
              
              <div className="p-4 md:p-6 overflow-x-auto">
                {pendingSellers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">ไม่มีผู้ใช้ที่รอการอนุมัติ</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับ</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <input
                            type="checkbox"
                            onChange={(e) => handleSelectAllChange(e.target.checked)}
                            checked={selectedUserIds.size === pendingSellers.length && pendingSellers.length > 0}
                            className="mr-2 rounded-full text-pink-500 focus:ring-0"
                          />
                          ชื่อร้าน
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                        <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อนุมัติ</th>
                        {/* *** เปลี่ยนหัวตารางจาก 'ลบ' เป็น 'ปฏิเสธ' *** */}
                        <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ปฏิเสธ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingSellers.map((user, index) => (
                        <tr key={user.id}>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.has(user.id)}
                              onChange={(e) => handleCheckboxChange(user.id, e.target.checked)}
                              className="mr-2 rounded-full text-pink-500 focus:ring-0"
                            />
                            {user.profile_name}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => showApprovalModal(user)} 
                              className="text-[#36A897] hover:text-[#2a8779] transition-colors duration-200"
                              title="อนุมัติ"
                            >
                              <CheckCircle size={20} />
                            </button>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => showRejectSellerModal(user)} 
                              // *** เปลี่ยนไอคอนเป็น RotateCw ***
                              className="text-[#F75271] hover:text-[#d34761] transition-colors duration-200"
                              title="ปฏิเสธการสมัคร"
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
              
              {/* *** โค้ดสำหรับปุ่ม Batch Action ด้านล่าง (คงไว้เพื่อรองรับฟังก์ชัน confirmApproveSelected แต่ไม่แสดงผล) *** */}
              <div className="p-6 flex justify-end space-x-4 border-t border-gray-200">
                <button
                  onClick={handleCancelSelected}
                  className="px-6 py-2 rounded-full font-bold text-[#F75271] border-2 border-[#F75271] hover:bg-[#F75271] hover:text-white transition-colors"
                >
                  ยกเลิกการเลือก
                </button>
                <button
                  onClick={handleApproveSelected} 
                  className="px-6 py-2 rounded-full font-bold text-white bg-[#36A897] border-2 border-[#36A897] hover:bg-[#2a8779] transition-colors"
                >
                  อนุมัติที่เลือก
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* *** Modal ยืนยัน/แจ้งเตือน (Popup) *** */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative p-6 bg-white rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold text-center mb-4">{modalContent.title}</h3>
            <p className="text-center text-gray-700">
              {modalContent.message}
            </p>
            
            {/* *** เพิ่มช่องใส่เหตุผลสำหรับการยกเลิกคำขอเปลี่ยนชื่อ *** */}
            {modalContent.showReasonInput && (
              <div className="mt-4">
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  เหตุผลในการยกเลิก:
                </label>
                <textarea
                  id="cancel-reason"
                  rows="3"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  placeholder="กรุณาใส่เหตุผลในการยกเลิก"
                />
                {!cancellationReason.trim() && modalAction === 'cancel_name_change' && (
                  <p className="text-sm text-red-500 mt-1">กรุณากรอกเหตุผล</p>
                )}
              </div>
            )}
            {/* *** สิ้นสุดช่องใส่เหตุผล *** */}

            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={handleModalConfirm}
                className={`px-6 py-2 rounded-full text-white font-medium transition-colors ${modalContent.confirmClass}`}
                disabled={modalAction === 'cancel_name_change' && !cancellationReason.trim()}
              >
                {modalContent.confirmText}
              </button>
              <button
                onClick={handleModalCancel}
                className={`px-6 py-2 rounded-full text-gray-800 font-medium transition-colors ${modalContent.cancelClass}`}
              >
                {modalContent.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;