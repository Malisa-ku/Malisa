import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import { Upload, X, Check } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/admin';

function AdminSettings() {
    const { user } = useUser();
    const [logoFile, setLogoFile] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setLogoFile(e.target.files[0]);
    };

    const handleUploadLogo = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (!logoFile) {
            setMessage({ text: 'กรุณาเลือกไฟล์โลโก้ที่ต้องการอัปโหลด', type: 'error' });
            return;
        }

        setLoading(true);
        
        const formData = new FormData();
        formData.append('logo', logoFile);

        try {
            const token = localStorage.getItem('admin_token');
            const uploadRes = await axios.post(
                `${API_BASE_URL}/upload/logo`, 
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const logoUrl = uploadRes.data.url;

            await axios.put(
                `${API_BASE_URL}/settings`,
                {
                    // แก้ไขชื่อคีย์จาก 'setting_key' เป็น 'setting_name'
                    setting_name: 'site_logo',
                    setting_value: logoUrl,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setMessage({ text: 'อัปโหลดและบันทึกโลโก้เรียบร้อยแล้ว', type: 'success' });
        } catch (error) {
            console.error('Error uploading logo:', error);
            setMessage({ 
                text: error.response?.data?.message || 'ไม่สามารถอัปโหลดโลโก้ได้', 
                type: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const messageStyles = message.type === 'success' 
        ? "bg-green-100 border border-green-400 text-green-700"
        : "bg-red-100 border border-red-400 text-red-700";

    return (
        <div className="min-h-screen bg-[#F0F4F7] p-8 font-sans text-[#3A6060]">
            <div className="bg-white p-6 rounded-xl shadow-md border border-[#B3E5C3]">
                <h2 className="text-3xl font-bold mb-6">การตั้งค่าระบบ</h2>
                
                {/* Status Message */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${messageStyles}`}>
                        {message.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                )}
                
                <div className="border-b border-[#B3E5C3] pb-4 mb-6">
                    <h3 className="text-xl font-semibold">โลโก้เว็บไซต์</h3>
                    <p className="text-sm mt-1">อัปโหลดโลโก้ใหม่สำหรับแสดงผลบนหน้าเว็บไซต์</p>
                </div>
                
                <form onSubmit={handleUploadLogo} className="max-w-xl mx-auto">
                    <div className="mb-4">
                        <label className="block font-semibold mb-2">
                            เลือกไฟล์โลโก้:
                        </label>
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/svg+xml" 
                            onChange={handleFileChange}
                            className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#B3E5C3] file:text-[#3A6060] hover:file:bg-[#70B99B] hover:file:text-white transition-colors"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-colors duration-200 flex items-center justify-center space-x-2
                            ${loading ? 'bg-[#5A947B] cursor-not-allowed' : 'bg-[#70B99B] hover:bg-[#5A947B]'}
                        `}
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                <span>อัปโหลดและบันทึก</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminSettings;