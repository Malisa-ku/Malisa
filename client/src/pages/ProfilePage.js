import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext'; 
import { ArrowLeft, Edit, Lock, User, Mail, Phone, MapPin } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/users';
const BACKEND_URL = 'http://localhost:3000';

function Profile() {
  const { user, login } = useUser();
  const { userId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const navigate = useNavigate();

  // ตรวจสอบว่าเป็น Seller หรือไม่
  const isSeller = user && user.role === 'seller';
  // ตรวจสอบว่ามีการแก้ไข profile_name หรือไม่
  const isProfileNameModified = formData.profile_name && user.profile_name && formData.profile_name !== user.profile_name;


  useEffect(() => {
    if (!user) {
        setLoading(false);
        navigate('/login');
        return;
    }

    if (parseInt(user.id) !== parseInt(userId)) {
        navigate('/');
        return;
    }

    // โหลดข้อมูลผู้ใช้ปัจจุบันเข้าสู่ฟอร์ม
    setFormData(user);
    setLoading(false);
  }, [user, userId, navigate]);

  // ฟังก์ชันใหม่: จัดการการส่งคำขอเปลี่ยนชื่อร้านค้า
  const handleRequestShopNameChange = async () => {
    setMessage('');
    
    try {
      // *** Endpoint นี้ต้องถูกสร้างขึ้นเพื่อจัดการการบันทึกชื่อใหม่ลงใน pending_profile_name และตั้งค่า profile_name_status เป็น 'pending_approval' ที่ Backend ***
      const response = await axios.post(`${API_BASE_URL}/${user.id}/request-shop-name-change`, 
        { newProfileName: formData.profile_name }, 
        {
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        }
      );
      
      // การดำเนินการสำเร็จ
      setMessage('ส่งคำขอเปลี่ยนชื่อร้านค้าสำเร็จ กรุณารอผู้ดูแลระบบอนุมัติ');
      // รีเซ็ต profile_name ในฟอร์มกลับไปเป็นชื่อเดิมที่อนุมัติแล้ว เพื่อให้ UI สอดคล้องกับชื่อที่ใช้งานจริง
      setFormData(prevData => ({ ...prevData, profile_name: user.profile_name }));
      setIsEditing(false); // ปิดโหมดแก้ไข
      
    } catch (error) {
      console.error('Error requesting shop name change:', error);
      setMessage(error.response?.data?.message || 'การส่งคำขอเปลี่ยนชื่อร้านค้าล้มเหลว');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // 1. Logic พิเศษสำหรับ Seller ที่เปลี่ยน Profile Name (ชื่อร้านค้า)
    if (isSeller && isProfileNameModified) {
        // ถ้าเป็น Seller และมีการเปลี่ยนชื่อโปรไฟล์ ให้ส่งเป็นคำขอเท่านั้น
        handleRequestShopNameChange();
        
        // หลังจากส่งคำขอชื่อร้านค้าแล้ว ตรวจสอบว่ามีข้อมูลอื่นที่ต้องการอัปเดตหรือไม่
        // (ในตัวอย่างนี้จะถือว่าการ submit ครั้งนี้มีวัตถุประสงค์หลักเพื่อเปลี่ยนชื่อร้านค้า)
        // ถ้าต้องการรวมการอัปเดตข้อมูลอื่นในครั้งเดียว Backend ต้องถูกออกแบบให้จัดการทั้งสองอย่าง
        
        // ถ้าต้องการให้อัปเดตข้อมูลอื่น (ที่ไม่ใช่ profile_name) ด้วยพร้อมกัน
        // เราสามารถอัปเดตฟิลด์อื่น ๆ (full_name, last_name, phone_number, address)
        // แต่ในโค้ดนี้เราจะเน้นที่การแยกการทำงานเพื่อความชัดเจน
        
        // ถ้า Seller เปลี่ยนแค่ชื่อร้านค้า จะจบที่ handleRequestShopNameChange
        // ถ้า Seller เปลี่ยนทั้งชื่อร้านค้าและข้อมูลอื่น จะต้องแยก formData ออกมา
        const { profile_name, ...otherFormData } = formData;
        
        // ตรวจสอบว่ามีการเปลี่ยนแปลงข้อมูลอื่น ๆ หรือไม่
        const hasOtherChanges = Object.keys(otherFormData).some(key => 
            otherFormData[key] !== user[key] && key !== 'token'
        );
        
        if (hasOtherChanges) {
             // ถ้ามีการเปลี่ยนแปลงข้อมูลอื่น ๆ ด้วย ให้อัปเดตข้อมูลอื่น
             try {
                // อัปเดตข้อมูลอื่น ๆ ผ่าน endpoint เดิม
                await axios.put(`${API_BASE_URL}/${user.id}`, otherFormData, {
                    headers: {
                      Authorization: `Bearer ${user.token}`,
                    },
                });
                // ไม่ต้อง login ใหม่ เพราะ profile_name ยังไม่เปลี่ยน
                setMessage(prev => prev + ' และบันทึกข้อมูลส่วนตัวอื่น ๆ สำเร็จ');
            } catch (error) {
                setMessage(prev => prev + ' แต่การบันทึกข้อมูลส่วนตัวอื่น ๆ ล้มเหลว');
                console.error('Error updating other profile data:', error);
            }
        }
        setIsEditing(false);
        return;
    }
    
    // 2. Logic สำหรับ Buyer หรือ Seller ที่แก้ไขเฉพาะฟิลด์อื่น ๆ (Non-profile_name)
    try {
      const response = await axios.put(`${API_BASE_URL}/${user.id}`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      // อัปเดตข้อมูลผู้ใช้ใน Context
      login(response.data.user, user.token);
      setMessage(response.data.message);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage(error.response?.data?.message || 'Failed to update profile.');
    }
  };


  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    
    try {
      const response = await axios.put(`${API_BASE_URL}/${user.id}/change-password`, { newPassword }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setMessage(response.data.message);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage(error.response?.data?.message || 'Failed to change password.');
    }
  };

  const handleUploadImage = async () => {
    setMessage('');
    if (!user || !user.token) {
        navigate('/login');
        return;
    }
    const formDataImage = new FormData();
    formDataImage.append('profileImage', profileImageFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/${user.id}/upload-profile-image`, formDataImage, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);
      login(response.data.user, user.token);
      setProfileImageFile(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage(error.response?.data?.message || 'Failed to upload image.');
    }
  };

  const handleImageFileChange = (e) => {
    setProfileImageFile(e.target.files[0]);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleCancelEdit = () => {
    setFormData(user); 
    setIsEditing(false); 
  };

  if (loading) {
    return <div className="p-8 text-center text-xl">กำลังโหลด...</div>;
  }
  
  const profileImageUrl = user?.profile_image_url ? `${BACKEND_URL}/${user.profile_image_url}` : 'https://via.placeholder.com/150';

  return (
    <div className="bg-[#FCECF0] min-h-screen flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-pink-600 hover:text-pink-800 transition-colors mr-4">
            <ArrowLeft size={28} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">ข้อมูลส่วนตัว</h2>
        </div>
        
        {message && <div className={`p-4 rounded-lg mb-4 ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <img 
              src={profileImageUrl} 
              alt="รูปโปรไฟล์" 
              className="w-28 h-28 rounded-full object-cover shadow-md border-2 border-pink-200" 
            />
            <div className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                <label htmlFor="profile-image-upload" className="cursor-pointer">
                    <Edit size={16} className="text-pink-600" />
                    <input 
                      type="file" 
                      id="profile-image-upload" 
                      className="hidden" 
                      onChange={handleImageFileChange} 
                      accept="image/*"
                    />
                </label>
            </div>
          </div>
          {profileImageFile && (
            <button onClick={handleUploadImage} className="mt-2 text-pink-600 font-semibold text-sm hover:text-pink-800">
              อัปโหลดรูปภาพใหม่
            </button>
          )}
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label htmlFor="profile_name" className="block text-gray-700 font-semibold mb-1">
              ชื่อโปรไฟล์ {isSeller && <span className="text-red-500 text-sm">(ชื่อร้านค้า, ต้องอนุมัติโดย Admin)</span>}
            </label>
            <div className="flex items-center border-b border-gray-300 py-2">
              <User size={20} className="text-pink-500 mr-2" />
              <input 
                type="text" 
                id="profile_name" 
                name="profile_name" 
                className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                value={formData.profile_name || ''} 
                onChange={handleInputChange} 
                readOnly={!isEditing} // ล็อกฟิลด์ถ้าไม่อยู่ในโหมดแก้ไข
              />
              <button 
                type="button" 
                onClick={() => setIsEditing(!isEditing)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <Edit size={16} />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label htmlFor="full_name" className="block text-gray-700 font-semibold mb-1">ชื่อ</label>
            <div className="flex items-center py-2">
              <User size={20} className="text-pink-500 mr-2" />
              <input 
                type="text" 
                id="full_name" 
                name="full_name" 
                className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                value={formData.full_name || ''} 
                onChange={handleInputChange} 
                readOnly={!isEditing} 
              />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label htmlFor="last_name" className="block text-gray-700 font-semibold mb-1">นามสกุล</label>
            <div className="flex items-center py-2">
              <User size={20} className="text-pink-500 mr-2" />
              <input 
                type="text" 
                id="last_name" 
                name="last_name" 
                className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                // สมมติว่า last_name มีใน formData
                value={formData.last_name || ''} 
                onChange={handleInputChange} 
                readOnly={!isEditing} 
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-1">อีเมล</label>
            <div className="flex items-center py-2">
              <Mail size={20} className="text-pink-500 mr-2" />
              <input 
                type="email" 
                id="email" 
                name="email" 
                className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                value={formData.email || ''} 
                readOnly 
              />
            </div>
          </div>
          
          {isEditing && (
            <button type="submit" className="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-lg transition duration-300">
              {isSeller && isProfileNameModified ? 'ส่งคำขอเปลี่ยนชื่อร้านค้า' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          )}
          {isEditing && (
            <button type="button" onClick={handleCancelEdit} className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg transition duration-300">
              ยกเลิก
            </button>
          )}
        </form>

        {/* Change Password Form */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">เปลี่ยนรหัสผ่าน</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <label htmlFor="new-password" className="block text-gray-700 font-semibold mb-1">รหัสผ่านใหม่</label>
              <div className="flex items-center py-2">
                <Lock size={20} className="text-pink-500 mr-2" />
                <input 
                  type="password" 
                  id="new-password" 
                  className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <label htmlFor="confirm-password" className="block text-gray-700 font-semibold mb-1">ยืนยันรหัสผ่านใหม่</label>
              <div className="flex items-center py-2">
                <Lock size={20} className="text-pink-500 mr-2" />
                <input 
                  type="password" 
                  id="confirm-password" 
                  className="w-full px-2 py-1 bg-transparent border-none focus:outline-none" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-lg transition duration-300">
              เปลี่ยนรหัสผ่าน
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;