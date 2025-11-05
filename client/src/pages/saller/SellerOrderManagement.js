import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import {
    DollarSign,
    Package,
    AlertCircle,
    CheckCircle,
    Truck,
    Clock,
    XCircle,
    FileText,
    ArrowLeft,
    ChevronDown,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar, // 💡 NEW: Import Calendar
    ClipboardList 
} from 'lucide-react';
import MessageBox from '../../components/MessageBox'; // สมมติว่า MessageBox พร้อมใช้งาน
import { Link } from 'react-router-dom'; // 💡 ต้อง Import Link เพื่อใช้ในการจัดการปัญหา

const API_BASE_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


// ***************************************************************
// ** Status Helper Functions (CRITICAL FIX) **
// ***************************************************************

// 💡 CRITICAL FIX: ฟังก์ชันนี้ต้องส่ง Key ภาษาอังกฤษกลับมาเพื่อให้ renderActionButtons ทำงานได้
const getStatusKey = (status) => {
    switch(status) {
        case 'รอดำเนินการ': return 'pending';
        case 'ชำระเงินแล้ว': return 'paid';
        case 'จัดส่งแล้ว': return 'shipped';
        case 'จัดส่งสำเร็จ': return 'delivered';
        case 'มีปัญหา': return 'problem';
        case 'ยกเลิกแล้ว': return 'cancelled';
        default: return status;
    }
};

const getStatusText = (status) => {
     // ใช้ getStatusKey เพื่อแปลงสถานะเป็น Key ก่อน
    const key = getStatusKey(status); 
    switch(key) {
        case 'pending': return 'รอดำเนินการ';
        case 'paid': return 'ชำระเงินแล้ว';
        case 'shipped': return 'จัดส่งแล้ว';
        case 'delivered': return 'จัดส่งสำเร็จ';
        case 'problem': return 'มีปัญหา';
        case 'cancelled': return 'ยกเลิกแล้ว';
        default: return status;
    }
};

const getStatusColorClass = (status) => {
    const key = getStatusKey(status);
    switch (key) {
        case 'pending': return 'text-orange-600 bg-orange-100';
        case 'paid': return 'text-green-600 bg-green-100';
        case 'shipped': return 'text-blue-600 bg-blue-100';
        case 'delivered': return 'text-pink-700 bg-pink-100';
        case 'problem': return 'text-red-600 bg-red-100';
        case 'cancelled': return 'text-gray-600 bg-gray-100';
        default: return 'text-gray-600 bg-gray-200';
    }
};


// ***************************************************************
// ** Component: Generic Confirmation Modal (แทน window.confirm) **
// ***************************************************************
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isSubmitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
                <h2 className="text-xl font-bold text-pink-600 mb-4 flex items-center">
                    <AlertCircle size={24} className="mr-2 text-pink-500" /> {title}
                </h2>
                <p className="text-gray-700 mb-6">{message}</p>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="py-2 px-4 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                        disabled={isSubmitting}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`py-2 px-4 rounded-xl font-bold transition ${isSubmitting ? 'bg-pink-300 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ***************************************************************
// ** Component: Cancellation Modal (จัดการการยกเลิกพร้อมเหตุผล) **
// ***************************************************************
const CancellationModal = ({ isOpen, onClose, onConfirm, orderId, isSubmitting }) => {
    const [reason, setReason] = useState('timeout'); // ตั้งค่าเริ่มต้น
    const [customReason, setCustomReason] = useState('');
    
    // เหตุผลการยกเลิกตามเงื่อนไขทางธุรกิจ
    const reasons = [
        { key: 'timeout', text: 'ผู้ซื้อไม่ชำระเงินเกิน 24 ชั่วโมง' },
        { key: 'invalid_payment', text: 'ชำระเงินไม่ครบ / สลิปปลอม' },
        { key: 'stock_issue', text: 'สินค้าสูญหาย/สภาพไม่สมบูรณ์' },
        { key: 'other', text: 'เหตุผลอื่นๆ' },
    ];

    const handleSubmit = () => {
        let finalReason;
        if (reason === 'other') {
            finalReason = customReason;
        } else {
            finalReason = reasons.find(r => r.key === reason)?.text || reason;
        }

        if (!finalReason || (reason === 'other' && customReason.trim() === '')) {
             alert('กรุณาเลือกหรือระบุเหตุผลการยกเลิก');
             return;
        }
        onConfirm(orderId, finalReason);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                <h2 className="text-2xl font-bold text-red-600 mb-4">ยกเลิกคำสั่งซื้อ #{orderId}</h2>
                <p className="text-gray-600 mb-4">กรุณาเลือกเหตุผลในการยกเลิกคำสั่งซื้อ:</p>
                
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                    {reasons.map((r) => (
                        <div key={r.key} className="flex items-center">
                            <input
                                id={`cancel-${r.key}`}
                                name="cancelReason"
                                type="radio"
                                value={r.key}
                                checked={reason === r.key}
                                onChange={(e) => { setReason(e.target.value); if(e.target.value !== 'other') setCustomReason(''); }}
                                className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                            />
                            <label htmlFor={`cancel-${r.key}`} className="ml-3 text-gray-700 text-base">
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
                        className="py-2 px-4 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                        disabled={isSubmitting}
                    >
                        ปิด
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`py-2 px-4 rounded-xl font-bold transition ${isSubmitting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        disabled={isSubmitting || !reason || (reason === 'other' && customReason.trim() === '')}
                    >
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการยกเลิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ***************************************************************
// ** Main Component: SellerOrderManagement **
// ***************************************************************

function SellerOrderManagement() {
    const { user } = useUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedOrderIds, setExpandedOrderIds] = useState([]);
    const [message, setMessage] = useState(null); 
    const [showSlip, setShowSlip] = useState(false);
    const [slipUrl, setSlipUrl] = useState('');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState(null);
    
    // 💡 NEW: State สำหรับ Date Filter
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // สถานะสำหรับ Confirmation Modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ orderId: null, newStatusText: '' });
    
    // สถานะสำหรับ Filter (ใช้ English Key ใน State แต่แสดงผลเป็น Thai Text)
    const statusFilters = [
        { key: 'all', text: 'ทั้งหมด' },
        { key: 'pending', text: 'รอดำเนินการ' }, 
        { key: 'paid', text: 'ชำระเงินแล้ว' },   
        { key: 'shipped', text: 'จัดส่งแล้ว' },   
        { key: 'delivered', text: 'จัดส่งสำเร็จ' }, 
        { key: 'problem', text: 'มีปัญหา' },     
        { key: 'cancelled', text: 'ยกเลิกแล้ว' },
    ];


    const fetchOrders = useCallback(async () => {
        if (!user || !user.token) {
            setLoading(false);
            setMessage({title: 'ข้อผิดพลาด', text: 'คุณต้องเข้าสู่ระบบในฐานะผู้ขายเพื่อดูข้อมูล'});
            return;
        }

        setLoading(true);

        try {
            // *** ส่ง filterStatus และ Date Filter ไปให้ Backend ***
            const params = {
                ...(filterStatus !== 'all' && { status: filterStatus }),
                ...(startDate && { startDate: startDate }),
                ...(endDate && { endDate: endDate }),
            };
            
            // Endpoint (6) GET /api/sellers/orders
            const response = await axios.get(`${API_BASE_URL}/api/sellers/orders`, {
                headers: { Authorization: `Bearer ${user.token}` },
                params,
            });
            setOrders(response.data.orders);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setMessage({
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ',
                onClose: () => setMessage(null)
            });
            setLoading(false);
        }
    }, [user, filterStatus, startDate, endDate]); // 💡 เพิ่ม Date State ใน Dependency


    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    // 💡 NEW: ฟังก์ชันสำหรับรีเซ็ตฟิลเตอร์วันที่
    const handleClearDateFilter = () => {
        setStartDate('');
        setEndDate('');
    };


    // 1. เปิด Confirmation Modal ก่อนการอัปเดตสถานะทั่วไป
    const handleOpenConfirmUpdateStatus = (orderId, newStatusText) => {
        setConfirmAction({ orderId, newStatusText });
        setIsConfirmModalOpen(true);
    };

    // 2. ฟังก์ชันหลักสำหรับอัปเดตสถานะ (ถูกเรียกเมื่อยืนยันจาก Modal)
    const handleConfirmUpdateStatus = async () => {
        const { orderId, newStatusText } = confirmAction;
        if (!orderId) return;

        setIsConfirmModalOpen(false); // ปิด Modal ทันที
        setStatusUpdating(true);
        try {
            // ส่งสถานะเป็นภาษาไทย
            const response = await axios.put(
                `${API_BASE_URL}/api/sellers/orders/${orderId}/status`,
                { status: newStatusText }, 
                {
                    headers: { Authorization: `Bearer ${user.token}` },
                }
            );
            setMessage({
                title: 'สำเร็จ',
                text: response.data.message,
                onClose: () => {
                    setMessage(null);
                    fetchOrders();
                }
            });
        } catch (err) {
            console.error('Error updating status:', err);
            setMessage({
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
                onClose: () => setMessage(null)
            });
        } finally {
            setStatusUpdating(false);
            setConfirmAction({ orderId: null, newStatusText: '' });
        }
    };
    
    // 3. ยกเลิกคำสั่งซื้อพร้อมเหตุผล (เรียกจาก Modal)
    const handleCancelOrderWithReason = async (orderId, reason) => {
        setStatusUpdating(true);
        setIsCancelModalOpen(false);
        try {
            // ใช้ API POST /cancel (Endpoint 21)
            const response = await axios.post(
                `${API_BASE_URL}/api/sellers/orders/${orderId}/cancel`, 
                { reason: reason },
                {
                    headers: { Authorization: `Bearer ${user.token}` },
                }
            );
            setMessage({
                title: 'สำเร็จ',
                text: response.data.message,
                onClose: () => {
                    setMessage(null);
                    fetchOrders();
                }
            });
        } catch (err) {
            console.error('Error cancelling order:', err);
            setMessage({
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ',
                onClose: () => setMessage(null)
            });
        } finally {
            setStatusUpdating(false);
        }
    };
    
    const openCancelModal = (orderId) => {
        setOrderToCancel(orderId);
        setIsCancelModalOpen(true);
    };

    const handleViewSlip = (url) => {
        setSlipUrl(url);
        setShowSlip(true);
    };

    const toggleExpand = (orderId) => {
        setExpandedOrderIds(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };
    
    // ***************************************************************
    // ** Render Status Actions (CRITICAL FIX) **
    // ***************************************************************

    const renderActionButtons = (order) => {
        // 💡 CRITICAL FIX: ใช้ getStatusKey เพื่อรับ Key ภาษาอังกฤษที่ถูกต้อง
        const currentStatusKey = getStatusKey(order.status);
        const disabled = statusUpdating;

        const isPending = currentStatusKey === 'pending';
        const isPaid = currentStatusKey === 'paid';
        const isShipped = currentStatusKey === 'shipped';
        const isProblem = currentStatusKey === 'problem';
        const isFinal = currentStatusKey === 'delivered' || currentStatusKey === 'cancelled';
        
        // 1. จัดการสถานะหลัก
        if (isPending) {
             return (
                 <>
                    <button
                        onClick={() => handleOpenConfirmUpdateStatus(order.id, 'ชำระเงินแล้ว')}
                        disabled={disabled || !order.payment_slip_url} // ปุ่มนี้ใช้ได้เมื่อมีสลิป
                        className={`w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center ${disabled || !order.payment_slip_url ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        <CheckCircle size={18} className="mr-2" /> {'ยืนยันการชำระเงิน'}
                    </button>
                    <button
                        onClick={() => openCancelModal(order.id)}
                        disabled={disabled}
                        className={`w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center mt-2 ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                    >
                        <XCircle size={18} className="mr-2" /> ยกเลิก (ระบุเหตุผล)
                    </button>
                 </>
             );
        } else if (isPaid) {
            return (
                <>
                    <button
                        onClick={() => handleOpenConfirmUpdateStatus(order.id, 'จัดส่งแล้ว')}
                        disabled={disabled}
                        className={`w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        <Truck size={18} className="mr-2" /> {'อัปเดต: จัดส่งแล้ว'}
                    </button>
                    <button
                        onClick={() => openCancelModal(order.id)}
                        disabled={disabled}
                        className={`w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center mt-2 ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                    >
                        <XCircle size={18} className="mr-2" /> ยกเลิก (สินค้ามีปัญหา)
                    </button>
                </>
            );
        } else if (isShipped) {
            return (
                <button
                    onClick={() => handleOpenConfirmUpdateStatus(order.id, 'จัดส่งสำเร็จ')}
                    disabled={disabled}
                    className={`w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
                >
                    <CheckCircle size={18} className="mr-2" /> {'อัปเดต: จัดส่งสำเร็จ'}
                </button>
            );
        } else if (isProblem) {
             // 💡 FIX: ปุ่มจัดการปัญหา นำทางไปยัง Order Details (ซึ่งจะแสดงส่วน Chat)
            return (
                 <Link
                    to={`/seller/orders/${order.id}`}
                    className="w-full py-2 px-4 rounded-xl font-bold transition shadow-md flex items-center justify-center bg-red-500 hover:bg-red-600 text-white"
                >
                    <AlertCircle size={18} className="mr-2" /> จัดการปัญหา
                </Link>
            );
        } else if (isFinal) {
            return (
                <span className="text-sm text-gray-500 italic font-medium flex items-center justify-center">
                    <CheckCircle size={16} className="mr-1" /> สิ้นสุดรายการแล้ว
                </span>
            );
        }
        return (
             <span className="text-sm text-gray-500 italic font-medium flex items-center justify-center">
                    <Clock size={16} className="mr-1" /> ไม่มี Actions
                </span>
        );
    };
    
    // ***************************************************************
    // ** Render **
    // ***************************************************************

    return (
        <div className="min-h-screen bg-[#FCECF0] p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={() => window.history.back()} className="text-gray-600 hover:text-gray-800 transition-colors mr-4">
                        <ArrowLeft size={28} />
                    </button>
                    <h1 className="text-3xl font-extrabold text-pink-600">
                        การจัดการคำสั่งซื้อสำหรับผู้ขาย
                    </h1>
                </div>

                 {/* 💡 NEW: Date Range Filter Section */}
                <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-center space-x-3 space-y-2">
                    <span className="font-semibold text-gray-700 flex items-center flex-shrink-0">
                        <Calendar size={18} className="mr-2" /> กรองตามวันที่:
                    </span>
                    
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="เริ่มต้น"
                    />
                    <span className="text-gray-500">ถึง</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="สิ้นสุด"
                    />
                    <button
                        onClick={handleClearDateFilter}
                        disabled={!startDate && !endDate}
                        className={`py-2 px-3 rounded-full text-sm font-semibold transition ${(!startDate && !endDate) ? 'bg-gray-200 text-gray-500' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                    >
                        รีเซ็ต
                    </button>
                    <button
                        onClick={() => fetchOrders()}
                        disabled={loading || (!startDate && endDate) || (startDate && !endDate)}
                        className={`py-2 px-3 rounded-full text-sm font-bold transition ${loading ? 'bg-pink-300' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
                    >
                        {loading ? 'กำลังโหลด...' : 'ค้นหา'}
                    </button>
                </div>


                {/* Status Filter Tabs - ปรับปรุงการจัดวางให้สวยงามและจัดกลาง */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-wrap justify-center items-center space-x-2 md:space-x-3 p-3 bg-white rounded-2xl shadow-xl border-b-4 border-pink-100 overflow-x-auto">
                        <span className="text-sm font-semibold text-gray-600 py-2 px-1 flex-shrink-0">สถานะ:</span>
                        {/* แท็บเมนูสถานะครบถ้วน */}
                        {statusFilters.map(tab => (
                             <button
                                key={tab.key}
                                // ใช้ tab.key (English Key) ในการตั้งค่า State
                                onClick={() => {
                                    setFilterStatus(tab.key);
                                    // ไม่ต้องเรียก fetchOrders ตรงนี้ เพราะ useEffect จะจัดการให้
                                }}
                                className={`py-2 px-4 rounded-full font-bold text-sm transition-all flex-shrink-0 whitespace-nowrap
                                    ${filterStatus === tab.key 
                                        ? 'bg-pink-600 text-white shadow-md transform scale-105' 
                                        : 'text-gray-600 hover:bg-pink-50'
                                    }
                                `}
                            >
                                {tab.text}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-lg text-gray-600">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-lg">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-lg">ไม่พบคำสั่งซื้อในสถานะ "{getStatusText(filterStatus)}"</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white p-5 rounded-2xl shadow-xl border border-pink-100 transform transition duration-300 hover:shadow-2xl"
                            >
                                {/* Order Header & Status */}
                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center space-x-2">
                                        <Package size={20} className="text-pink-600" />
                                        <h2 className="text-lg font-bold text-gray-800">
                                            คำสั่งซื้อ #{order.id}
                                        </h2>
                                    </div>
                                    <p className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColorClass(order.status)}`}>
                                        {getStatusText(order.status)}
                                    </p>
                                </div>

                                {/* Order Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    
                                    {/* Item Info (Col 1-2) */}
                                    <div className="md:col-span-2 flex items-start space-x-4">
                                        {order.items.length > 0 ? (
                                            <>
                                                <img
                                                    src={`${API_BASE_URL}/${order.items[0].image_url_1}`}
                                                    alt={order.items[0].product_name}
                                                    className="w-20 h-20 object-cover rounded-xl shadow-md flex-shrink-0"
                                                />
                                                <div className="flex flex-col">
                                                    <p className="font-semibold text-gray-800">{order.items[0].product_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        จำนวน: {order.items[0].quantity} รายการ
                                                    </p>
                                                    {order.items.length > 1 && (
                                                        <p className="text-sm text-pink-600 font-medium mt-1">+ {order.items.length - 1} รายการ</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">ไม่พบรายการสินค้า</p>
                                        )}
                                    </div>

                                    {/* Buyer & Price Info (Col 3) */}
                                    <div className="flex flex-col space-y-1 text-sm text-gray-600 border-l pl-4">
                                        <p className="font-medium text-gray-800">ผู้ซื้อ: {order.buyer?.full_name || 'ไม่ระบุ'}</p>
                                        <p>วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                                        <p className="font-bold text-xl text-pink-600 mt-2">
                                            {/* ใช้ formatNumberWithCommas */}
                                            {formatNumberWithCommas(order.total_price)}
                                        </p>
                                    </div>

                                    {/* Actions (Col 4) */}
                                    <div className="flex flex-col space-y-2 pl-4 border-l">
                                        {renderActionButtons(order)}
                                    </div>
                                </div>
                                
                                {/* Toggle Full Details */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => toggleExpand(order.id)}
                                        className="flex items-center text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
                                    >
                                        ดูรายละเอียดผู้ซื้อและสินค้าทั้งหมด
                                        <ChevronDown size={16} className={`ml-1 transform transition-transform ${expandedOrderIds.includes(order.id) ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                
                                {/* Expanded Details Section */}
                                {expandedOrderIds.includes(order.id) && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
                                        {/* รายละเอียดผู้ซื้อ */}
                                        <h4 className="font-bold text-md text-gray-700 mb-3 flex items-center"><User size={18} className="mr-2" /> ข้อมูลผู้รับและที่อยู่</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 border-b pb-3 mb-3">
                                            <p className="flex items-center"><Mail size={14} className="mr-2" /> {order.buyer.email}</p>
                                            <p className="flex items-center"><Phone size={14} className="mr-2" /> {order.buyer.phone_number}</p>
                                            <p className="flex items-start col-span-1 md:col-span-3"><MapPin size={14} className="mr-2 mt-1" /> {order.buyer.address}</p>
                                        </div>
                                        
                                        {/* รายละเอียดสินค้าทั้งหมด */}
                                        <h4 className="font-bold text-md text-gray-700 mb-3 flex items-center"><ClipboardList size={18} className="mr-2" /> รายการสินค้าทั้งหมด</h4>
                                        <div className="space-y-2">
                                            {order.items.map((item, index) => (
                                                <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border">
                                                    <div className="flex items-center space-x-3">
                                                        <img
                                                            src={`${API_BASE_URL}/${item.image_url_1}`}
                                                            alt={item.product_name}
                                                            className="w-10 h-10 object-cover rounded-md"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">{item.product_name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                ขนาด: {item.size || '-'} | จำนวน: {item.quantity}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* 💡 FIX: ใช้ item.price_at_purchase แทน item.price */}
                                                    <p className="text-sm font-bold text-pink-600">
                                                        {formatNumberWithCommas(item.price_at_purchase * item.quantity)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {order.payment_slip_url && (
                                            <div className="mt-4 pt-3 border-t border-gray-200">
                                                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center"><FileText size={16} className="mr-2 text-pink-600" /> หลักฐานการชำระเงิน</h4>
                                                <button
                                                    onClick={() => handleViewSlip(order.payment_slip_url)}
                                                    className="text-sm font-medium text-pink-600 underline hover:text-pink-700"
                                                >
                                                    คลิกเพื่อดูสลิป
                                                </button>
                                            </div>
                                        )}
                                        {order.cancellation_reason && (
                                            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                                <p className="font-bold text-red-700 flex items-center mb-1">
                                                    <XCircle size={16} className="mr-2" /> เหตุผลการยกเลิก:
                                                </p>
                                                <p className="text-sm text-red-600">{order.cancellation_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Slip Modal */}
            {showSlip && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={() => setShowSlip(false)}>
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowSlip(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-600 transition"
                        >
                            <XCircle size={28} />
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-center text-pink-600">สลิปการโอนเงิน</h3>
                        <div className="flex justify-center">
                            <img src={`${API_BASE_URL}/${slipUrl}`} alt="Payment Slip" className="max-w-full h-auto rounded-lg border-2 border-gray-100" />
                        </div>
                    </div>
                </div>
            )}
            
            {/* Message Box */}
            {message && (
                <MessageBox
                    title={message.title}
                    text={message.text}
                    onConfirm={message.onConfirm}
                    onClose={message.onClose}
                />
            )}
            
            {/* Cancellation Modal */}
            {isCancelModalOpen && (
                <CancellationModal 
                    isOpen={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    onConfirm={handleCancelOrderWithReason}
                    orderId={orderToCancel}
                    isSubmitting={statusUpdating}
                />
            )}
            
            {/* Generic Confirmation Modal (สำหรับยืนยันสถานะอื่นๆ) */}
            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleConfirmUpdateStatus}
                    title="ยืนยันการเปลี่ยนแปลงสถานะ"
                    message={`คุณต้องการเปลี่ยนสถานะคำสั่งซื้อ #${confirmAction.orderId} เป็น "${confirmAction.newStatusText}" ใช่หรือไม่?`}
                    isSubmitting={statusUpdating}
                />
            )}
        </div>
    );
}

export default SellerOrderManagement;