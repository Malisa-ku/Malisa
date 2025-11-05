// File: ProblemDetailPage.js (Modified)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { X, ArrowLeft, Send, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react'; // 💡 Import CheckCircle
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// 💡 NOTE: สมมติว่ามี Router สำหรับปัญหาที่ลูกค้าเรียกได้ (เช่น users.js)
const BASE_API_URL = 'http://localhost:3000/api'; 
const PROBLEM_API_URL = `${BASE_API_URL}/users/problems`; // URL สำหรับสร้าง/จัดการปัญหาของลูกค้า
const PRODUCTS_API_URL = `${BASE_API_URL}/products`;
const BACKEND_URL = 'http://localhost:3000';

// ... (formatNumberWithCommas เหมือนเดิม)
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function ProblemDetailPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const { problemId } = useParams(); 
    const { orderId, productId } = location.state || {}; 

    // State สำหรับการสร้าง Report (ใช้เมื่อไม่มี problemId)
    const [problemType, setProblemType] = useState('สินค้าไม่ตรงปก');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [product, setProduct] = useState(null);
    
    // State สำหรับการสนทนา (ใช้เมื่อมี problemId)
    const [problemDetail, setProblemDetail] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmittingClose, setIsSubmittingClose] = useState(false); // 💡 NEW: State สำหรับปุ่มปิดปัญหา

    const isCreateMode = !problemId; 
    
    // **********************************************
    // ** 1. FETCH DATA (Detail Mode) **
    // **********************************************
    const fetchProblemDetail = useCallback(async () => {
        if (!problemId || !user.token) return;

        setLoading(true);
        try {
            // Endpoint (11) GET /users/problems/:id
            const response = await axios.get(`${PROBLEM_API_URL}/${problemId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const detail = response.data;
            setProblemDetail(detail);

            // Fetch Product Detail 
            const productResponse = await axios.get(`${PRODUCTS_API_URL}/${detail.product_id}`); 
            setProduct(productResponse.data.product);

        } catch (err) {
            console.error("Error fetching problem detail:", err);
            setError(err.response?.data?.message || 'ไม่สามารถดึงรายละเอียดปัญหาได้');
        } finally {
            setLoading(false);
        }
    }, [problemId, user]);


    // **********************************************
    // ** 2. USE EFFECT & SCROLL **
    // **********************************************
    useEffect(() => {
        if (user.token && problemId) {
            fetchProblemDetail();
        } else if (isCreateMode && (orderId && productId)) {
            // โหมดสร้าง Report: ดึงข้อมูลสินค้าที่เกี่ยวข้อง
             const fetchProductDataForCreate = async () => {
                try {
                    const response = await axios.get(`${PRODUCTS_API_URL}/${productId}`);
                    setProduct(response.data.product);
                } catch (err) {
                    console.error("Error fetching product data:", err);
                    setError('ไม่สามารถดึงข้อมูลสินค้าที่เกี่ยวข้องได้');
                }
            };
            fetchProductDataForCreate();
        } else if (isCreateMode && (!orderId || !productId)) {
            // 💡 CRITICAL FIX: หากเข้าโหมดสร้างแต่ไม่มี ID ให้ออกไปหน้า MyOrders
            setError('ไม่พบข้อมูลคำสั่งซื้อหรือสินค้า กรุณาลองใหม่อีกครั้ง');
            setTimeout(() => navigate('/my-orders'), 2000);
        }
    }, [isCreateMode, problemId, user, orderId, productId, fetchProblemDetail, navigate]);
    
    useEffect(() => {
        // Scroll to the bottom of the chat box
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [problemDetail]);


    // **********************************************
    // ** 3. HANDLE CREATE REPORT (Initial Submit) **
    // **********************************************
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (!description || !imageFile) {
             setError('กรุณากรอกรายละเอียดและแนบรูปภาพหลักฐาน');
             setLoading(false);
             return;
        }
        if (!user.token) {
            setError('คุณต้องเข้าสู่ระบบเพื่อแจ้งปัญหา');
            setLoading(false);
            return;
        }
        if (isCreateMode && (!orderId || !productId)) {
            setError('ไม่พบข้อมูลคำสั่งซื้อหรือสินค้า กรุณาลองใหม่อีกครั้ง');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('problem_type', problemType); 
        formData.append('description', description);
        formData.append('image', imageFile); 

        try {
            const response = await axios.post(
                PROBLEM_API_URL, 
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );
            setMessage('แจ้งปัญหาสำเร็จ! กำลังนำทางไปหน้าติดตามปัญหา');
            
            setTimeout(() => {
                navigate(`/problem-detail/${response.data.problemId}`, { replace: true });
            }, 1500);

        } catch (err) {
            console.error('Error reporting problem:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแจ้งปัญหา');
        } finally {
            setLoading(false);
        }
    };

    // **********************************************
    // ** 4. HANDLE SEND MESSAGE (Reply Mode) **
    // **********************************************
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !problemId || !user.token) return;

        setLoading(true);
        try {
            // Endpoint (12) POST /users/problems/:id/messages
            await axios.post(
                `${PROBLEM_API_URL}/${problemId}/messages`, 
                { message_text: newMessage },
                {
                    headers: { Authorization: `Bearer ${user.token}` }
                }
            );
            setNewMessage('');
            await fetchProblemDetail(); 
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.response?.data?.message || 'ไม่สามารถส่งข้อความได้');
        } finally {
            setLoading(false);
        }
    };

    // **********************************************
    // ** 5. HANDLE CLOSE PROBLEM (Buyer) **
    // **********************************************
    const handleCloseProblemByBuyer = async () => {
        if (!problemId || !user.token) return;
        
        if (!window.confirm("คุณแน่ใจหรือไม่ที่จะปิดปัญหานี้? การดำเนินการนี้หมายความว่าปัญหาได้รับการแก้ไขแล้ว")) {
            return;
        }
        
        setIsSubmittingClose(true);
        setError('');
        try {
            // 💡 NEW Endpoint (13) POST /users/problems/:problemId/close-by-buyer
            await axios.post(
                `${PROBLEM_API_URL}/${problemId}/close-by-buyer`, 
                {},
                {
                    headers: { Authorization: `Bearer ${user.token}` }
                }
            );
            setMessage('ปัญหาถูกปิดเรียบร้อยแล้ว! ขอบคุณที่ใช้บริการ');
            // รีโหลดข้อมูลเพื่ออัปเดตสถานะ
            await fetchProblemDetail();

        } catch (err) {
            console.error('Error closing problem by buyer:', err);
            setError(err.response?.data?.message || 'ไม่สามารถปิดปัญหาได้');
        } finally {
            setIsSubmittingClose(false);
        }
    };

    // **********************************************
    // ** 6. RENDER LOGIC **
    // **********************************************
    
    if (loading && !problemDetail && !product) { // ปรับปรุง Loading state
         return (
            <div className="bg-[#FCECF0] min-h-screen flex items-center justify-center p-4">
                <p className="text-gray-500 text-lg">กำลังโหลด...</p>
            </div>
        );
    }
    
    // ----------------------------------------------
    // RENDER: CREATE REPORT MODE 
    // ----------------------------------------------
    if (isCreateMode) {
        // ... (Render logic for Create Mode is complete and remains as in the previous response)
        return (
            <div className="bg-[#FCECF0] min-h-screen flex items-center justify-center p-4">
                 <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
                    <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close"><X size={24} /></button>
                    <div className="text-center pb-4 border-b border-gray-200 mb-6">
                        <h2 className="text-xl font-bold text-gray-800">แจ้งปัญหาใหม่</h2>
                    </div>
                    {product && (
                        <div className="mb-6 flex items-center space-x-4 border-b pb-4">
                            <img src={`${BACKEND_URL}/${product.image_url_1}`} alt={product.name} className="w-20 h-20 object-cover rounded-md border border-gray-200"/>
                            <div>
                                <p className="font-semibold text-gray-800">{product.name}</p>
                                <p className="text-sm text-gray-500">Order ID: {orderId}</p>
                                <p className="text-md font-bold text-pink-600">{formatNumberWithCommas(product.price)} บาท</p>
                            </div>
                        </div>
                    )}
                    {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm text-center"><p>{message}</p></div>}
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center"><p>{error}</p></div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-6"> 
                        <div>
                        <h4 className="font-semibold text-gray-800 mb-2">ประเภทปัญหา</h4>
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2"><input type="radio" name="problemType" value="สินค้าไม่ตรงปก" checked={problemType === 'สินค้าไม่ตรงปก'} onChange={(e) => setProblemType(e.target.value)} className="form-radio h-4 w-4 text-pink-600 border-gray-300"/><span className="text-gray-700">สินค้าไม่ตรงปก</span></label>
                            <label className="flex items-center space-x-2"><input type="radio" name="problemType" value="สินค้ามีตำหนิ" checked={problemType === 'สินค้ามีตำหนิ'} onChange={(e) => setProblemType(e.target.value)} className="form-radio h-4 w-4 text-pink-600 border-gray-300"/><span className="text-gray-700">สินค้ามีตำหนิ</span></label>
                            <label className="flex items-center space-x-2"><input type="radio" name="problemType" value="ไม่จัดส่งสินค้า" checked={problemType === 'ไม่จัดส่งสินค้า'} onChange={(e) => setProblemType(e.target.value)} className="form-radio h-4 w-4 text-pink-600 border-gray-300"/><span className="text-gray-700">ไม่จัดส่งสินค้า</span></label>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">รายละเอียด <span className="text-red-500">*</span></label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" required></textarea>
                    </div>

                    <div>
                        <label htmlFor="image-upload" className="block text-gray-700 font-semibold mb-2">รูปภาพหลักฐาน <span className="text-red-500">*</span><span className="text-sm text-gray-500 font-normal ml-2">(แนบได้สูงสุด 1 รูปภาพ)</span></label>
                        <input type="file" id="image-upload" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"/>
                    </div>
                        
                        <button type="submit" disabled={loading} className={`w-full font-bold py-3 rounded-lg transition duration-300 ${loading ? 'bg-pink-300 text-white cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}>
                            {loading ? 'กำลังแจ้ง...' : 'แจ้งปัญหา'}
                        </button>
                    </form>
                 </div>
            </div>
        );
    }
    
    // ----------------------------------------------
    // RENDER: PROBLEM DETAIL / CHAT MODE (แก้ไขใหม่)
    // ----------------------------------------------
    if (problemId && problemDetail) {
        const isClosed = problemDetail.status === 'closed';

        return (
            <div className="bg-[#FCECF0] min-h-screen p-4 md:p-8">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-auto p-6">
                    <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-pink-600 hover:text-pink-800 font-semibold">
                        <ArrowLeft size={24} className="mr-2" /> กลับไปรายการคำสั่งซื้อ
                    </button>
                    
                    <h2 className="text-2xl font-bold text-pink-700 mb-2">ติดตามปัญหา #{problemId}: {problemDetail.problem_type}</h2>
                    <p className={`px-3 py-1 text-sm font-bold rounded-full inline-flex ${isClosed ? 'bg-gray-200 text-gray-700' : problemDetail.status === 'seller_replied' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        สถานะ: {problemDetail.status === 'seller_replied' ? 'ร้านค้าตอบกลับแล้ว' : isClosed ? 'ปิดแล้ว' : 'รอร้านค้าดำเนินการ'}
                    </p>
                    {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mt-4 text-sm text-center"><p>{message}</p></div>}
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mt-4 text-sm text-center"><p>{error}</p></div>}
                    
                    <div className="mt-6 border p-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                           <p className="font-semibold text-gray-700">สินค้าที่เกี่ยวข้อง:</p>
                           {product && (
                                <div className="flex items-center space-x-2">
                                    <img 
                                        src={`${BACKEND_URL}/${product.image_url_1}`} 
                                        alt={product.name} 
                                        className="w-10 h-10 object-cover rounded-md"
                                    />
                                    <span className="text-sm font-medium">{product.name}</span>
                                </div>
                            )}
                        </div>
                        <p className="font-semibold text-gray-700">รายละเอียดปัญหาที่แจ้ง:</p>
                        <p className="text-gray-600 ml-4 mb-2">{problemDetail.description}</p>
                        {problemDetail.image_url && (
                             <p className="text-xs text-gray-500">มีรูปภาพหลักฐานแนบมา</p>
                        )}
                    </div>
                    
                    {/* 💡 NEW: ปุ่มปิดการแจ้งปัญหา */}
                    {!isClosed && (
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleCloseProblemByBuyer}
                                disabled={isSubmittingClose || loading}
                                className={`flex items-center px-6 py-2 font-bold rounded-lg shadow-md transition duration-300 
                                    ${isSubmittingClose || loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}
                                `}
                            >
                                <CheckCircle size={20} className="mr-2" />
                                {isSubmittingClose ? 'กำลังดำเนินการ...' : 'ปิดการแจ้งปัญหา (ได้รับการแก้ไขแล้ว)'}
                            </button>
                        </div>
                    )}


                    {/* Chat/Message Area */}
                    <div className="mt-6 h-96 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-100">
                        {problemDetail.messages.length === 0 ? (
                            <p className="text-center text-gray-500 pt-10">ยังไม่มีการสนทนา เริ่มต้นโดยคุณได้เลย</p>
                        ) : (
                            problemDetail.messages.map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${msg.sender_role === 'buyer' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-md ${
                                        msg.sender_role === 'buyer' 
                                            ? 'bg-pink-100 text-gray-800' 
                                            : 'bg-white border border-blue-200 text-gray-800' 
                                    }`}>
                                        <p className={`font-semibold text-xs mb-1 ${msg.sender_role === 'seller' ? 'text-blue-600' : 'text-pink-600'}`}>
                                            {msg.sender_role === 'seller' ? problemDetail.seller_name || 'ร้านค้า' : 'คุณ'}
                                        </p>
                                        <p>{msg.message_text}</p>
                                        <p className="text-xs text-gray-500 text-right mt-1">
                                            {new Date(msg.sent_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="mt-4 flex space-x-3">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isClosed ? "ปัญหานี้ถูกปิดแล้ว ไม่สามารถตอบกลับได้" : "ตอบกลับร้านค้า..."}
                            rows="2"
                            disabled={loading || isClosed || isSubmittingClose}
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none disabled:bg-gray-200"
                        ></textarea>
                        <button
                            type="submit"
                            disabled={loading || isClosed || !newMessage.trim() || isSubmittingClose}
                            className={`w-24 flex items-center justify-center font-bold py-2 rounded-lg transition duration-300 ${
                                loading || isClosed || !newMessage.trim() || isSubmittingClose
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                            }`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                    {loading && <p className="text-pink-600 text-sm mt-2">กำลังโหลด/ส่งข้อความ...</p>}
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-[#FCECF0] min-h-screen flex items-center justify-center p-4">
            <p className="text-gray-500 text-lg">กำลังโหลด...</p>
        </div>
    );
}

export default ProblemDetailPage;