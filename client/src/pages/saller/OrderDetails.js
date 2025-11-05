// File: OrderDetails.js (ฉบับปรับปรุง)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import {
    ChevronLeft,
    User,
    ClipboardList,
    DollarSign,
    AlertCircle,
    CheckCircle,
    XCircle,
    Truck,
    Clock,
    FileText,
    MessageSquare, 
    Send 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';
const PAYMENT_TIMEOUT_HOURS = 24;

// ***************************************************************
// ** Helper Function: Format Number with Comma **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน (เช่น 1,000.00)
    // ใช้ toFixed(2) เพื่อให้มีทศนิยม 2 ตำแหน่งเสมอ
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

// ***************************************************************
// ** NEW Component: Simple Alert/Error Modal **
// ***************************************************************
const SimpleMessageModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all text-center">
                <h2 className={`text-xl font-bold mb-3 ${title.includes('ผิดพลาด') ? 'text-red-600' : 'text-pink-600'}`}>
                    <AlertCircle size={24} className="inline mr-2" /> {title}
                </h2>
                <p className="text-gray-700 mb-6">{message}</p>
                
                <button
                    onClick={onClose}
                    className="py-2 px-6 rounded-xl bg-pink-600 text-white hover:bg-pink-700 transition font-medium"
                >
                    ตกลง
                </button>
            </div>
        </div>
    );
};


// ***************************************************************
// ** Component: Payment Countdown **
// ***************************************************************
const PaymentCountdown = React.memo(({ createdAt, onTimeout }) => {
    const creationTime = new Date(createdAt).getTime();
    const expiryTime = creationTime + PAYMENT_TIMEOUT_HOURS * 60 * 60 * 1000;
    const [timeLeft, setTimeLeft] = useState(null);
    const [isTimeout, setIsTimeout] = useState(false);

    const calculateTimeLeft = useCallback(() => {
        const now = new Date().getTime();
        const distance = expiryTime - now;

        if (distance < 0) {
            setTimeLeft('หมดเวลาชำระเงิน');
            setIsTimeout(true);
            if (!isTimeout) onTimeout(); 
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, [expiryTime, onTimeout, isTimeout]);

    useEffect(() => {
        calculateTimeLeft();
        if (isTimeout) return; 

        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft, isTimeout]);

    if (!timeLeft) return null;

    return (
        <div className={`text-center p-3 rounded-lg font-bold transition-colors ${isTimeout ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {isTimeout ? (
                <span><AlertCircle size={16} className="inline mr-2" /> {timeLeft}</span>
            ) : (
                <span><Clock size={16} className="inline mr-2" /> เหลือเวลาชำระเงิน: {timeLeft}</span>
            )}
        </div>
    );
});

// ***************************************************************
// ** Component: Cancellation Modal **
// ***************************************************************
// 💡 แก้ไข: รับ prop สำหรับแสดงข้อความ Error
const CancellationModal = ({ isOpen, onClose, onConfirm, orderId, isSubmitting, setAlertMessage }) => { 
    const [reason, setReason] = useState('timeout'); 
    const [customReason, setCustomReason] = useState('');
    
    const reasons = [
        { key: 'timeout', text: 'ผู้ซื้อไม่ชำระเงินเกิน 24 ชั่วโมง' },
        { key: 'invalid_payment', text: 'ชำระเงินไม่ครบ / สลิปปลอม' },
        { key: 'stock_issue', text: 'สินค้าสูญหาย/สภาพไม่สมบูรณ์ (ต้องแจ้งลูกค้าเรื่องคืนเงิน)' },
        { key: 'other', text: 'เหตุผลอื่นๆ' },
    ];

    const handleSubmit = () => {
        const selectedReason = reasons.find(r => r.key === reason);
        let finalReason;

        if (reason === 'other') {
            finalReason = customReason;
        } else {
            finalReason = selectedReason ? selectedReason.text : reason;
        }

        if (!finalReason || (reason === 'other' && customReason.trim() === '')) {
             // 💡 FIX: ใช้ setAlertMessage แทน alert()
             setAlertMessage({ title: 'ข้อผิดพลาด', message: 'กรุณาเลือกหรือระบุเหตุผลการยกเลิก' });
             return;
        }
        onConfirm(finalReason);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
                <h2 className="text-2xl font-bold text-red-600 mb-4">ยกเลิกคำสั่งซื้อ #{orderId}</h2>
                <p className="text-gray-600 mb-4">กรุณาเลือกเหตุผลในการยกเลิกคำสั่งซื้อ:</p>
                
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                    {reasons.map((r) => (
                        <div key={r.key} className="flex items-center">
                            <input
                                id={r.key}
                                name="cancelReason"
                                type="radio"
                                value={r.key}
                                checked={reason === r.key}
                                onChange={(e) => { setReason(e.target.value); if(e.target.value !== 'other') setCustomReason(''); }}
                                className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                            />
                            <label htmlFor={r.key} className="ml-3 text-gray-700 text-base">
                                {r.text}
                            </label>
                        </div>
                    ))}
                </div>

                {reason === 'other' && (
                    <div className="mb-4">
                        <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="ระบุเหตุผลอื่นๆ..."
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500 resize-none"
                        />
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-5">
                    <button
                        onClick={onClose}
                        className="py-2 px-4 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                        disabled={isSubmitting}
                    >
                        ปิด
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`py-2 px-4 rounded-lg font-medium transition ${isSubmitting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        disabled={isSubmitting || (reason === 'other' && customReason.trim() === '')}
                    >
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการยกเลิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ***************************************************************
// ** Main Component: OrderDetails **
// ***************************************************************
function OrderDetails() {
    const { orderId } = useParams();
    const { user } = useUser();
    const [order, setOrder] = useState(null);
    const [messages, setMessages] = useState([]); // NEW: State สำหรับข้อความสนทนา
    const [newMessage, setNewMessage] = useState(''); // NEW: State สำหรับข้อความใหม่
    const messagesEndRef = useRef(null); // NEW: สำหรับ Scroll อัตโนมัติ

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [problemUpdating, setProblemUpdating] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    
    // 💡 NEW: State สำหรับ Simple Alert Modal
    const [alertMessage, setAlertMessage] = useState(null);


    // ***************************************************************
    // ** Status Helper (ใช้สถานะภาษาไทยจาก DB) **
    // ***************************************************************
    const getStatusText = (status) => {
        switch (status) {
            case 'รอดำเนินการ': return { text: 'รอดำเนินการ', key: 'pending', icon: <Clock size={18} className="text-gray-500 mr-2" />, className: 'text-gray-500' };
            case 'ชำระเงินแล้ว': return { text: 'ชำระเงินแล้ว', key: 'paid', icon: <CheckCircle size={18} className="text-green-600 mr-2" />, className: 'text-green-600' };
            case 'จัดส่งแล้ว': return { text: 'จัดส่งแล้ว', key: 'shipped', icon: <Truck size={18} className="text-blue-600 mr-2" />, className: 'text-blue-600' };
            case 'จัดส่งสำเร็จ': return { text: 'จัดส่งสำเร็จ', key: 'delivered', icon: <CheckCircle size={18} className="text-green-700 mr-2" />, className: 'text-green-700' };
            case 'มีปัญหา': return { text: 'มีปัญหา', key: 'problem', icon: <AlertCircle size={18} className="text-red-700 mr-2" />, className: 'text-red-700' };
            case 'ยกเลิกแล้ว': return { text: 'ยกเลิกแล้ว', key: 'cancelled', icon: <XCircle size={18} className="text-gray-600 mr-2" />, className: 'text-gray-600' };
            default: return { text: status, key: status, icon: null, className: 'text-gray-800' };
        }
    };
    // ***************************************************************

    // 💡 NEW: ฟังก์ชันดึงข้อความสนทนาของปัญหา (ปรับให้รับ problemId อย่างเดียว)
    const fetchProblemMessages = useCallback(async (problemId) => {
        if (!problemId || !user.token) return;
        try {
            // เรียกใช้ Endpoint (10) GET /problems/:id 
            const response = await axios.get(`${API_BASE_URL}/api/sellers/problems/${problemId}`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            
            // Endpoint (10) คืนค่า { ..., messages: [...] }
            setMessages(response.data.messages || []);
            
            // 💡 สำคัญ: อัปเดตสถานะปัญหาใน State หลักเท่านั้น
            setOrder(prev => {
                if (!prev || !prev.problem) return prev;
                return {
                    ...prev,
                    problem: {
                        ...prev.problem,
                        status: response.data.status || prev.problem.status, // อัปเดตสถานะปัญหา
                        description: response.data.description || prev.problem.description,
                    },
                    // 💡 อัปเดตข้อมูลผู้ซื้อที่ถูกส่งกลับมาใน Endpoint (10) ด้วย
                    full_name: response.data.buyer_name || prev.full_name
                };
            });

        } catch (err) {
            console.error('Error fetching problem messages:', err);
            // ไม่ต้องแสดง error รุนแรง เพราะอาจไม่มีข้อความ
        }
    }, [user.token]);


    // 💡 NEW: fetchOrderDetails ต้องมี Dependency Array ที่สมบูรณ์
    const fetchOrderDetails = useCallback(async () => {
        if (!user || !user.token) {
            setLoading(false);
            setError('คุณต้องเข้าสู่ระบบในฐานะผู้ขาย');
            return;
        }
        
        // 💡 แก้ไข: ตั้งค่า Loading เป็น true เมื่อเริ่มเรียก (แก้ไขบั๊กสถานะค้าง)
        setLoading(true); 

        try {
            // Endpoint (7) GET /orders/:id ที่ถูกแก้ไขใน Backend
            const response = await axios.get(`${API_BASE_URL}/api/sellers/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            
            const fetchedOrder = response.data;
            setOrder(fetchedOrder); // <--- อัปเดต Order State ที่นี่

            // 💡 ถ้ามีปัญหา ให้ไปดึงข้อความปัญหาด้วย
            if (fetchedOrder.problem && fetchedOrder.problem.id) {
                // เรียก fetchProblemMessages เพื่อโหลดข้อความและอัปเดตสถานะปัญหาใน State
                fetchProblemMessages(fetchedOrder.problem.id); 
            } else {
                 setMessages([]); // เคลียร์ข้อความหากไม่มีปัญหา
            }

        } catch (err) {
            console.error('Error fetching order details:', err);
            // 💡 CRITICAL FIX: จัดการ Error จาก Axios ให้แสดงผลชัดเจน
            const errorMessage = err.response?.data?.message || `ไม่พบคำสั่งซื้อ #${orderId} หรือไม่ได้รับอนุญาตให้เข้าถึง`;
            setError(errorMessage);
            setOrder(null); // เคลียร์ Order State
        } finally {
            setLoading(false);
        }
    }, [orderId, user, fetchProblemMessages]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]); 
    
    // Scroll to bottom เมื่อข้อความเปลี่ยนแปลง
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);


    // ***************************************************************
    // ** Handle Send Message (NEW) **
    // ***************************************************************
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !order || !order.problem || !order.problem.id) return;
        
        const problemId = order.problem.id;
        setProblemUpdating(true);
        setError(null);
        
        try {
            // Endpoint (23) POST /problems/:id/messages (seller.js)
            await axios.post(`${API_BASE_URL}/api/sellers/problems/${problemId}/messages`, { message_text: newMessage.trim() }, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            
            setNewMessage('');
            setSuccessMessage('ตอบกลับลูกค้าเรียบร้อยแล้ว');
            
            // 💡 สำคัญ: ดึงข้อมูลปัญหาและข้อความใหม่เพื่ออัปเดต Chat
            await fetchProblemMessages(problemId); 
            
        } catch (err) {
            console.error('Error sending problem message:', err);
            setAlertMessage({ title: 'ข้อผิดพลาด', message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งข้อความ' }); // 💡 FIX: ใช้ Modal แทน alert()
        } finally {
            setProblemUpdating(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };
    // ***************************************************************


    // ฟังก์ชันหลักสำหรับอัปเดตสถานะ (ส่งสถานะภาษาไทยกลับไป Backend)
    const handleUpdateStatus = async (newStatusText) => {
        // 💡 FIX: ใช้ Confirmation Modal แทน window.confirm
        const onConfirm = async () => {
            setStatusUpdating(true);
            try {
                // ส่ง Text ภาษาไทย (เช่น 'จัดส่งแล้ว')
                await axios.put(`${API_BASE_URL}/api/sellers/orders/${orderId}/status`, { status: newStatusText }, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setSuccessMessage(`อัปเดตสถานะเป็น '${newStatusText}' เรียบร้อยแล้ว!`);
                await fetchOrderDetails(); 
            } catch (err) {
                console.error('Error updating order status:', err);
                 setAlertMessage({ title: 'ข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' }); // 💡 FIX: ใช้ Modal แทน alert()
            } finally {
                setStatusUpdating(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        };

        // แสดง Confirmation Modal (ไม่ต้องทำอะไรเพราะปุ่ม Action ถูกเปลี่ยนไปเรียก Confirmation Modal แล้ว)
        // Note: Logic นี้ควรถูกย้ายไปที่ SellerOrderManagement.js/renderActionButtons หากเป็นหน้ารวม
        // แต่ใน OrderDetails เราจะใช้ ConfirmationModal ภายในนี้
        // เนื่องจากโครงสร้างเดิมใช้ window.confirm ซึ่งเราเปลี่ยนมาใช้ Modal แทน
        // ในโค้ดจริง ปุ่มใน OrderDetails ควรเรียก ConfirmationModal โดยตรง
        
        // เราจะใช้ ConfirmationModal ที่อยู่ด้านล่างของ Component แทน window.confirm 
        
        setAlertMessage({ 
            title: 'ยืนยันการเปลี่ยนแปลงสถานะ', 
            message: `คุณแน่ใจหรือไม่ที่จะอัปเดตสถานะคำสั่งซื้อเป็น '${newStatusText}'?`, 
            onConfirm: onConfirm,
            isConfirm: true
        });
    };
    
    // ฟังก์ชันสำหรับเรียกใช้การยกเลิก (จาก Modal)
    const handleCancelOrderWithReason = async (reason) => {
        setStatusUpdating(true);
        setIsCancelModalOpen(false);
        try {
            // เรียกใช้ API ยกเลิกใหม่ (Endpoint 21: /orders/:id/cancel)
            await axios.post(`${API_BASE_URL}/api/sellers/orders/${orderId}/cancel`, { reason }, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setSuccessMessage(`คำสั่งซื้อถูกยกเลิกเรียบร้อยแล้ว! (เหตุผล: ${reason})`);
            await fetchOrderDetails(); // 💡 สำคัญ: เรียก fetchOrderDetails
        } catch (err) {
            console.error('Error cancelling order:', err);
            // 💡 CRITICAL FIX: ดึง error message จาก response
             setAlertMessage({ title: 'ข้อผิดพลาด', message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ' }); // 💡 FIX: ใช้ Modal แทน alert()
        } finally {
            setStatusUpdating(false);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    // ฟังก์ชันสำหรับปิดปัญหา (Problem Close)
    const handleCloseProblem = async () => {
         // 💡 FIX: ใช้ Confirmation Modal แทน window.confirm
        const onConfirm = async () => {
            setProblemUpdating(true);
            try {
                // Endpoint (24) POST /problems/:id/close (seller.js)
                await axios.post(`${API_BASE_URL}/api/sellers/problems/${order.problem.id}/close`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setSuccessMessage('ปัญหาถูกปิดเรียบร้อยแล้ว!');
                await fetchOrderDetails(); // 💡 สำคัญ: เรียก fetchOrderDetails
            } catch (err) {
                console.error('Error closing problem:', err);
                setAlertMessage({ title: 'ข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการปิดปัญหา' }); // 💡 FIX: ใช้ Modal แทน alert()
            } finally {
                setProblemUpdating(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        };

        setAlertMessage({ 
            title: 'ยืนยันการปิดปัญหา', 
            message: "คุณแน่ใจหรือไม่ที่จะ 'ปิดปัญหา' นี้? การดำเนินการนี้จะสิ้นสุดการสนทนาในหัวข้อนี้", 
            onConfirm: onConfirm,
            isConfirm: true
        });
    };
    
    // 💡 NEW: Confirmation Modal Component (รองรับทั้ง Alert และ Confirm)
    const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isConfirm, isSubmitting }) => {
        if (!isOpen) return null;

        const handlePrimaryAction = () => {
            if (isConfirm && onConfirm) {
                onConfirm();
            }
            onClose();
        };

        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all text-center">
                    <h2 className={`text-xl font-bold mb-3 ${isConfirm ? 'text-red-600' : 'text-pink-600'} flex items-center justify-center`}>
                        {isConfirm ? <AlertCircle size={24} className="inline mr-2" /> : <MessageSquare size={24} className="inline mr-2" />} {title}
                    </h2>
                    <p className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</p>
                    
                    <div className="flex justify-center space-x-3">
                        {isConfirm && (
                             <button
                                onClick={onClose}
                                className="py-2 px-4 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </button>
                        )}
                        <button
                            onClick={handlePrimaryAction}
                            className={`py-2 px-6 rounded-xl font-bold transition ${isConfirm ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            disabled={isSubmitting}
                        >
                            {isConfirm ? (isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน') : 'ตกลง'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-white">
                <p>กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
            </div>
        );
    }

    if (error) {
        // 💡 แสดงผล Error ที่ได้รับ
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                {/* 💡 FIX: แสดง Error ที่ชัดเจน */}
                <p className="text-red-500 mb-4 text-lg">⚠️ ไม่สามารถโหลดรายละเอียดคำสั่งซื้อได้: {error}</p> 
                <Link to="/seller/orders" className="flex items-center text-pink-600 hover:underline">
                    <ChevronLeft size={16} className="mr-2" /> กลับไปรายการคำสั่งซื้อ
                </Link>
            </div>
        );
    }

    if (!order) {
        // ควรจะไม่ถึงตรงนี้ถ้า Error Handling ทำงาน แต่ใส่ไว้เพื่อความชัวร์
        return <div className="text-center p-8">ไม่พบข้อมูลคำสั่งซื้อ</div>;
    }
    
    // สถานะปัจจุบันเป็นภาษาไทย
    const currentStatus = getStatusText(order.status);
    const isOrderFinal = currentStatus.key === 'delivered' || currentStatus.key === 'cancelled';
    const isPaid = currentStatus.key === 'paid';
    const isPending = currentStatus.key === 'pending';
    const isShipped = currentStatus.key === 'shipped';
    // 💡 แก้ไข: ตรวจสอบสถานะ 'มีปัญหา' จาก order status หลัก
    const isProblemStatus = currentStatus.key === 'problem'; 

    const problem = order.problem || {};
    const isProblemOpen = problem.id && problem.status !== 'closed';


    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <Link to="/seller/orders" className="text-pink-600 hover:underline flex items-center mb-6 font-medium">
                <ChevronLeft size={20} className="mr-2" /> กลับไปรายการคำสั่งซื้อ
            </Link>
            
            {/* Header and Current Status */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-lg mb-6 border-b-4 border-pink-500">
                <h1 className="text-3xl font-extrabold text-gray-800">รายละเอียดคำสั่งซื้อ <span className="text-pink-600">#{order.id}</span></h1>
                <div className="flex flex-col items-end">
                    <span className="font-semibold text-lg mr-2 text-gray-700">สถานะปัจจุบัน:</span>
                    <span className={`flex items-center font-bold text-xl ${currentStatus.className}`}>
                        {currentStatus.icon}
                        {currentStatus.text}
                    </span>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}
            
            {/* -------------------- Problem Management Section (Full Width) -------------------- */}
            {/* 💡 แสดงเมื่อมีปัญหา (problem.id ถูกดึงมาโดย Endpoint 7) */}
            {problem.id && (
                <div id={`problem-section-${problem.id}`} className="bg-white p-6 rounded-2xl shadow-lg border border-red-200 mb-6">
                    <h2 className="text-xl font-bold text-red-700 flex items-center mb-4 pb-2 border-b border-red-100">
                        <AlertCircle size={24} className="mr-2 text-red-600" /> การจัดการปัญหาจากผู้ซื้อ #{problem.id}
                        <span className={`ml-4 px-3 py-1 text-sm rounded-full font-semibold ${isProblemOpen ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'}`}>
                            {problem.status === 'seller_replied' ? 'รอผู้ซื้อตอบกลับ' : problem.status === 'closed' ? 'ปิดแล้ว' : 'รอการดำเนินการ'}
                        </span>
                    </h2>

                    {/* Chat/Message Area */}
                    <div className="h-80 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-100 mb-4">
                        {messages.length === 0 ? (
                             <p className="text-center text-gray-500 pt-10">ยังไม่มีการสนทนา</p>
                        ) : (
                            messages.map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${msg.sender_role === 'seller' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-md ${
                                        msg.sender_role === 'seller' 
                                            ? 'bg-blue-100 text-gray-800' // ผู้ขาย (ร้านค้า)
                                            : 'bg-white border text-gray-800' // ผู้ซื้อ
                                    }`}>
                                        <p className={`font-semibold text-xs mb-1 ${msg.sender_role === 'seller' ? 'text-blue-700' : 'text-pink-600'}`}>
                                            {/* 💡 FIX: ใช้ชื่อผู้ซื้อที่ดึงมา */}
                                            {msg.sender_role === 'seller' ? 'คุณ (ร้านค้า)' : order.full_name || 'ผู้ซื้อ'}
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

                    {/* Input and Close Button */}
                    <form onSubmit={handleSendMessage} className="flex space-x-3">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={problem.status === 'closed' ? "ปัญหานี้ถูกปิดแล้ว" : "พิมพ์ข้อความตอบกลับลูกค้า..."}
                            rows="2"
                            disabled={problemUpdating || problem.status === 'closed'}
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-200"
                        ></textarea>
                        <button
                            type="submit"
                            disabled={problemUpdating || problem.status === 'closed' || !newMessage.trim()}
                            className={`w-24 flex items-center justify-center font-bold py-2 rounded-lg transition duration-300 ${
                                problemUpdating || problem.status === 'closed' || !newMessage.trim()
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            <Send size={20} />
                        </button>
                        
                        {/* ปุ่มปิดปัญหา */}
                        {isProblemOpen && (
                             <button
                                onClick={handleCloseProblem}
                                type='button'
                                disabled={problemUpdating}
                                className={`w-32 flex items-center justify-center font-bold py-2 rounded-lg transition duration-300 ${
                                    problemUpdating ? 'bg-red-300 text-white cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                <XCircle size={18} className='mr-2' /> ปิดปัญหา
                            </button>
                        )}
                    </form>
                </div>
            )}


            {/* Main Content Grid: Buyer Info, Summary, and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* -------------------- COL 1: Buyer Info -------------------- */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 col-span-1">
                    <h2 className="text-xl font-bold text-gray-700 flex items-center mb-4 pb-2 border-b">
                        <User size={24} className="mr-2 text-pink-600" /> ข้อมูลผู้ซื้อ
                    </h2>
                    <div className="space-y-3 text-gray-700 text-sm">
                        <p><strong>ชื่อผู้รับ:</strong> {order.full_name}</p>
                        <p><strong>อีเมล:</strong> {order.email}</p>
                        <p><strong>เบอร์โทร:</strong> {order.phone_number}</p>
                        <div className='pt-2 border-t mt-3'>
                            <p className='font-bold text-pink-600 mb-1'>ที่อยู่จัดส่ง:</p>
                            <p className='text-gray-600'>{order.address}</p>
                        </div>
                    </div>
                </div>


                {/* -------------------- COL 2: Items Summary -------------------- */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-700 flex items-center mb-4 pb-2 border-b">
                        <ClipboardList size={24} className="mr-2 text-pink-600" /> รายการสินค้า
                    </h2>
                    <ul className="space-y-4 max-h-96 overflow-y-auto pr-3">
                        {order.items.map((item, index) => (
                            <li key={index} className="flex items-start space-x-4 border-b pb-3">
                                <img
                                    src={`${API_BASE_URL}/${item.image_url_1}`}
                                    alt={item.product_name}
                                    className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{item.product_name}</p>
                                    <p className="text-xs text-gray-500">
                                        ขนาด: {item.size} / อก: {formatNumberWithCommas(item.chest)} / เอว: {formatNumberWithCommas(item.waist)} / สะโพก: {formatNumberWithCommas(item.hip)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">จำนวน: **{formatNumberWithCommas(item.quantity)}**</p>
                                </div>
                                {/* แสดงราคาต่อหน่วย x จำนวน พร้อมคอมม่า */}
                                <p className="font-bold text-pink-600 text-lg flex-shrink-0">
                                    {formatNumberWithCommas(item.price_at_purchase * item.quantity)}
                                </p>
                            </li>
                        ))}
                    </ul>
                    
                    {/* Cancellation Reason (ถ้ามี) */}
                    {order.cancellation_reason && (
                         <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                            <p className="font-bold text-red-700 flex items-center mb-1">
                                <XCircle size={16} className="mr-2" /> เหตุผลการยกเลิก:
                            </p>
                            <p className="text-sm text-red-600">{order.cancellation_reason}</p>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="flex justify-between font-bold text-xl text-gray-800">
                            <span>ราคารวมทั้งหมด:</span>
                            <span className="text-pink-600">{formatNumberWithCommas(order.total_price)}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* -------------------- COL 3 (Full Width): Actions and Problem Management -------------------- */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mt-6">
                <h2 className="text-xl font-bold text-gray-700 flex items-center mb-4 pb-2 border-b">
                    <DollarSign size={24} className="mr-2 text-pink-600" /> การดำเนินการสำหรับคำสั่งซื้อ
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* 1. Timer / Payment Slip (แสดงเฉพาะเมื่อเกี่ยวข้อง) */}
                    <div className='col-span-1 flex flex-col space-y-3'>
                        {(isPending || isPaid) && (
                            <div className="flex-grow">
                                {isPending && <PaymentCountdown createdAt={order.created_at} onTimeout={() => { /* Logic alert timeout */ }} />}
                                
                                {order.payment_slip_url && (
                                    <div className="mt-2 bg-pink-50 p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm font-medium text-pink-700">หลักฐานการโอนเงิน</span>
                                        <a
                                            href={`${API_BASE_URL}/${order.payment_slip_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-pink-600 hover:text-pink-800 hover:underline flex items-center font-semibold"
                                        >
                                            <FileText size={16} className="mr-1" /> ดูสลิป
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* 2. ปุ่ม Action หลัก (เรียงตามขั้นตอน) */}
                    <div className={`col-span-${isPending || isPaid ? 2 : 4} flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3`}>

                        {/* A. ยืนยันสลิป: ชำระเงินแล้ว */}
                        {isPending && (
                            <button
                                onClick={() => handleUpdateStatus('ชำระเงินแล้ว')} // ส่ง Text ภาษาไทย
                                disabled={statusUpdating}
                                className={`flex items-center justify-center flex-grow py-3 px-4 rounded-xl font-bold transition shadow-md ${statusUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            >
                                {statusUpdating ? 'กำลังยืนยัน...' : <><CheckCircle size={18} className="mr-2" /> ยืนยัน: "ชำระเงินแล้ว"</>}
                            </button>
                        )}
                        
                        {/* B. จัดส่งแล้ว */}
                        {isPaid && (
                            <button
                                onClick={() => handleUpdateStatus('จัดส่งแล้ว')} // ส่ง Text ภาษาไทย
                                disabled={statusUpdating}
                                className={`flex items-center justify-center flex-grow py-3 px-4 rounded-xl font-bold transition shadow-md ${statusUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {statusUpdating ? 'กำลังจัดส่ง...' : <><Truck size={18} className="mr-2" /> อัปเดต: "จัดส่งแล้ว"</>}
                            </button>
                        )}
                        
                        {/* C. จัดส่งสำเร็จ */}
                        {isShipped && (
                            <button
                                onClick={() => handleUpdateStatus('จัดส่งสำเร็จ')} // ส่ง Text ภาษาไทย
                                disabled={statusUpdating}
                                className={`flex items-center justify-center flex-grow py-3 px-4 rounded-xl font-bold transition shadow-md ${statusUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
                            >
                                {statusUpdating ? 'กำลังยืนยัน...' : <><CheckCircle size={18} className="mr-2" /> อัปเดต: "จัดส่งสำเร็จ"</>}
                            </button>
                        )}

                        {/* D. จัดการปัญหา (ถ้ามีสถานะ 'มีปัญหา' และปัญหายังไม่ถูกปิด) */}
                         {isProblemStatus && problem.id && problem.status !== 'closed' && (
                            <button
                                // 💡 ปุ่มนี้จะ Scroll ไปที่ส่วน Problem Chat ด้านบน
                                onClick={() => {
                                    document.getElementById(`problem-section-${problem.id}`).scrollIntoView({ behavior: 'smooth' });
                                }}
                                disabled={problemUpdating}
                                className={`flex items-center justify-center flex-grow py-3 px-4 rounded-xl font-bold transition shadow-md ${problemUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                            >
                                {problemUpdating ? 'กำลังแก้ไข...' : <><MessageSquare size={18} className="mr-2" /> จัดการปัญหาจากผู้ซื้อ</>}
                            </button>
                        )}

                        {/* E. ปุ่มยกเลิก (แสดงเสมอเมื่อยังไม่สิ้นสุด) */}
                        {!isOrderFinal && !isProblemStatus && (
                             <button
                                onClick={() => setIsCancelModalOpen(true)}
                                disabled={statusUpdating}
                                className={`flex items-center justify-center flex-grow py-3 px-4 rounded-xl font-bold transition shadow-md ${statusUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}
                            >
                                {statusUpdating ? 'กำลังยกเลิก...' : <><XCircle size={18} className="mr-2" /> ยกเลิก (ระบุเหตุผล)</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modal Component */}
            <CancellationModal 
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleCancelOrderWithReason}
                orderId={order.id}
                isSubmitting={statusUpdating}
                setAlertMessage={setAlertMessage} // 💡 NEW: ส่ง setAlertMessage ไปให้ Modal
            />

            {/* 💡 NEW: Simple Alert Modal */}
            {alertMessage && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setAlertMessage(null)}
                    title={alertMessage.title}
                    message={alertMessage.message}
                    isConfirm={alertMessage.isConfirm}
                    onConfirm={alertMessage.onConfirm}
                    isSubmitting={statusUpdating || problemUpdating}
                />
            )}
        </div>
    );
}

export default OrderDetails;