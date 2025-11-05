import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { FileText, Image, Clock } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (Global) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    // ฟังก์ชันนี้จะถูกใช้หากมีการดึงข้อมูลราคามาแสดงใน Component นี้ในภายหลัง
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function ProblemReportPage() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useUser();

    useEffect(() => {
        const fetchProblems = async () => {
            if (!user || !user.id) {
                setLoading(false);
                setError('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }
                
                // เรียก API เพื่อดึงประวัติการร้องเรียนของผู้ใช้
                const response = await axios.get(`${API_BASE_URL}/api/users/${user.id}/problems`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // โค้ด Backend (users.js) คืนค่าเป็น Array โดยตรง (Endpoint 8)
                // if (Array.isArray(response.data.problems)) {
                //     setProblems(response.data.problems);
                // } else {
                //     setProblems([]);
                // }
                
                // แก้ไขตามโครงสร้างของ Backend Endpoint (8) ที่ส่ง Array กลับมาโดยตรง
                if (Array.isArray(response.data)) {
                     setProblems(response.data);
                } else {
                     setProblems([]);
                }
            } catch (err) {
                console.error('Error fetching problems:', err);
                setError('ไม่สามารถดึงประวัติการร้องเรียนได้');
            } finally {
                setLoading(false);
            }
        };

        fetchProblems();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-500 text-lg">กำลังโหลดประวัติการร้องเรียน...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-full text-center p-4">
                <p className="text-red-500 text-lg">{error}</p>
            </div>
        );
    }
    
    if (problems.length === 0) {
        return (
            <div className="flex justify-center items-center h-full text-center p-4">
                <p className="text-gray-500 text-lg">คุณยังไม่เคยแจ้งปัญหา</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">ประวัติการร้องเรียน</h2>
            <div className="space-y-6">
                {problems.map((problem) => (
                    <div key={problem.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <FileText size={24} className="text-pink-500" />
                                <h3 className="text-xl font-bold text-gray-700">แจ้งปัญหา #{problem.id}</h3>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                <Clock size={16} className="mr-1" />
                                {new Date(problem.created_at).toLocaleDateString('th-TH')}
                            </span>
                        </div>
                        
                        <div className="space-y-4 text-gray-700 border-t border-gray-200 pt-4">
                            <p>
                                <span className="font-semibold">ประเภทปัญหา:</span> {problem.problem_type}
                            </p>
                            <p>
                                <span className="font-semibold">คำอธิบาย:</span> {problem.description}
                            </p>
                            {/* NOTE: หากมีการแสดงราคารวมของ order_id สามารถใช้ formatNumberWithCommas ได้ดังนี้:
                            <p>
                                <span className="font-semibold">ราคารวม:</span> {formatNumberWithCommas(problem.order_total_price)} บาท
                            </p>
                            */}
                            {problem.image_url && (
                                <div>
                                    <span className="font-semibold block mb-2">รูปภาพที่แนบ:</span>
                                    <a 
                                        href={`${API_BASE_URL}/${problem.image_url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-pink-600 hover:underline"
                                    >
                                        <Image size={18} className="mr-1" />
                                        ดูรูปภาพ
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProblemReportPage;