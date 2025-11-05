import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import {
  CheckCircle, Clock, Truck, Package, XCircle, List,
  Calendar, ShoppingBag, ArrowLeft, ChevronRight, AlertTriangle, MessageSquare
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


const statusMap = {
  'all': { label: 'ทั้งหมด', icon: <List size={16} />, color: 'bg-gray-200 text-gray-800' },
  'pending': { label: 'รอการชำระเงิน', icon: <Clock size={16} className="text-yellow-500" />, color: 'bg-yellow-100 text-yellow-800' },
  'paid': { label: 'ชำระเงินเรียบร้อย', icon: <Package size={16} className="text-blue-500" />, color: 'bg-blue-100 text-blue-800' },
  'shipped': { label: 'กำลังจัดส่ง', icon: <Truck size={16} className="text-pink-500" />, color: 'bg-pink-100 text-pink-800' },
  'delivered': { label: 'จัดส่งสำเร็จ', icon: <CheckCircle size={16} className="text-green-500" />, color: 'bg-green-100 text-green-800' },
  'cancelled': { label: 'ถูกยกเลิก', icon: <XCircle size={16} className="text-red-500" />, color: 'bg-red-100 text-red-800' },
};

function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const { user } = useUser();
  const navigate = useNavigate();

  const fetchOrders = async () => {
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

      // 💡 NOTE: API นี้คาดว่า Backend (users.js) ได้แก้ไขให้ JOIN ตาราง problems 
      // เพื่อดึง problem_id และ problem_status มาใน object order แล้ว
      const response = await axios.get(`${API_BASE_URL}/api/users/${user.id}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data.orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('ไม่สามารถดึงข้อมูลคำสั่งซื้อได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter(order => {
    let orderKey = '';
    switch (order.status) {
      case 'รอดำเนินการ': orderKey = 'pending'; break;
      case 'ชำระเงินแล้ว': orderKey = 'paid'; break;
      case 'จัดส่งแล้ว': orderKey = 'shipped'; break;
      case 'จัดส่งสำเร็จ': orderKey = 'delivered'; break;
      case 'ยกเลิกแล้ว': orderKey = 'cancelled'; break;
      case 'มีปัญหา': orderKey = 'shipped'; break; 
      default: orderKey = 'all'; break; 
    }

    return activeStatus === 'all' || orderKey === activeStatus;
  });

  // ************ แก้ไข: นำทางไปยังหน้าสร้าง Report (Report Problem) ************
  const handleReportProblem = (orderId, productId) => {
    navigate('/report-problem', { // ใช้ URL เดิมสำหรับหน้าสร้าง Report ใหม่
      state: { 
        orderId, 
        productId 
      } 
    });
  };
  // *****************************************************************************

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FCECF0] p-4">
        <p className="text-gray-500 text-lg">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FCECF0] p-4 text-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FCECF0] p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <button onClick={() => window.history.back()} className="text-pink-600 hover:text-pink-800 transition-colors mr-4">
              <ArrowLeft size={36} />
            </button>
            <h2 className="text-3xl font-bold text-pink-800 flex items-center">
              คำสั่งซื้อสินค้าของฉัน
            </h2>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {/* Filter Tabs */}
            {Object.keys(statusMap).map(key => {
              const info = statusMap[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveStatus(key)}
                  className={`flex items-center px-3 py-1 whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${
                    activeStatus === key 
                      ? 'bg-pink-600 text-white shadow-md' 
                      : `${info.color} hover:bg-gray-300`
                  }`}
                >
                  {info.icon && <span className="mr-1">{info.icon}</span>}
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-10">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 text-xl py-12">
              ไม่พบคำสั่งซื้อในสถานะนี้
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                let orderKey = '';
                switch (order.status) {
                  case 'รอดำเนินการ': orderKey = 'pending'; break;
                  case 'ชำระเงินแล้ว': orderKey = 'paid'; break;
                  case 'จัดส่งแล้ว': orderKey = 'shipped'; break;
                  case 'จัดส่งสำเร็จ': orderKey = 'delivered'; break;
                  case 'ยกเลิกแล้ว': orderKey = 'cancelled'; break;
                  default: orderKey = 'all'; break;
                }
                
                const statusInfo = statusMap[orderKey] || statusMap['all'];
                const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

                const isCancelled = orderKey === 'cancelled';
                const cancellationReason = order.cancellation_reason;

                // 💡 ข้อมูลปัญหาที่ถูกดึงมาจาก Backend
                const hasProblem = order.problem && order.problem.id;
                const problemStatus = order.problem?.status; // เช่น 'open', 'seller_replied', 'closed'

                return (
                  <div key={order.id} className="bg-white rounded-lg shadow-md border-2 border-[#FCECF0] p-6">
                    {/* Order Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-2 text-pink-700 font-bold">
                        <ShoppingBag size={20} className="text-pink-500" />
                        <Link to={`/seller/${order.seller_id}`} className="flex items-center space-x-2 hover:text-pink-800 transition-colors">
                          <p>{order.seller_profile_name || 'ไม่ระบุผู้ขาย'}</p>
                          <ChevronRight size={16} className="text-gray-400" />
                        </Link>
                      </div>
                      {/* แสดงสถานะปัจจุบัน */}
                      <p className={`px-3 py-1 text-xs font-bold rounded-full ${statusInfo.color} flex items-center`}>
                        {statusInfo.icon}
                        <span className="ml-1">{order.status}</span>
                      </p>
                    </div>
                    
                    {/* 2. แสดงเหตุผลการยกเลิก */}
                    {isCancelled && cancellationReason && (
                        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700">
                            <p className="font-bold flex items-center mb-1">
                                <XCircle size={18} className="mr-2" />
                                คำสั่งซื้อถูกยกเลิกเนื่องจาก:
                            </p>
                            <p className="text-sm ml-6">{cancellationReason}</p>
                        </div>
                    )}


                    {/* Order Item */}
                    {order.items.map((item) => (
                      <div key={item.product_id} className="flex flex-col md:flex-row items-start md:items-center justify-between mt-4 border-b border-gray-100 pb-3">
                        <div className="flex items-start space-x-4 w-full md:w-2/3">
                          <img 
                            src={`${API_BASE_URL}/${item.image_url_1}`} 
                            alt={item.name} 
                            className="w-16 h-16 object-cover rounded-md border border-gray-200 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{item.name}</p>
                            <p className="text-sm text-gray-500">ขนาด: {item.size || 'M'}</p>
                            <p className="text-sm text-gray-500">จำนวน: {item.quantity} ชิ้น</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-start md:items-end mt-2 md:mt-0 w-full md:w-1/3">
                          {/* ราคาและวันที่ */}
                          <p className="text-lg font-bold text-pink-700">
                            {formatNumberWithCommas(item.price_at_purchase)} บาท
                          </p>
                          <p className="text-xs text-gray-500 font-medium mb-2">
                            <Calendar size={14} className="inline-block mr-1 text-gray-400" />
                            วันที่สั่งซื้อ {new Date(order.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>

                           {/* 1. ปุ่มแจ้งปัญหา/ติดตามปัญหา ที่เปลี่ยนไปตามสถานะ */}
                           {/* A: แสดงปุ่มติดตามปัญหา (เมื่อเคยแจ้งแล้ว) */}
                           {hasProblem ? (
                                <Link 
                                    to={`/problem-detail/${order.problem.id}`} 
                                    className={`flex items-center px-4 py-2 text-white font-bold text-sm rounded-full shadow-md transition-all transform hover:scale-105 mt-2
                                        ${problemStatus === 'seller_replied' 
                                            ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' // สีน้ำเงินเมื่อร้านค้าตอบกลับ
                                            : problemStatus === 'closed'
                                            ? 'bg-gray-500 hover:bg-gray-600'
                                            : 'bg-yellow-600 hover:bg-yellow-700'} // สีเหลืองเมื่อเปิดปัญหาแต่ยังไม่ตอบ
                                    `}
                                    title="ติดตามสถานะปัญหา"
                                >
                                    {problemStatus === 'seller_replied' && <MessageSquare size={16} className="mr-2" />}
                                    {problemStatus === 'seller_replied' ? 'ร้านค้าตอบกลับแล้ว! (ดู)' : 
                                     problemStatus === 'closed' ? 'ปัญหานี้ถูกปิดแล้ว' :
                                     'ดู/ติดตามปัญหา'}
                                </Link>
                           ) : (
                               // B: แสดงปุ่มแจ้งปัญหา (เมื่อยังไม่เคยแจ้งและได้รับสินค้าแล้ว)
                               orderKey === 'delivered' && ( 
                                    <button 
                                        onClick={() => handleReportProblem(order.id, item.product_id)}
                                        className="flex items-center px-4 py-2 bg-red-500 text-white font-bold text-sm rounded-full shadow-md hover:bg-red-600 transition-all transform hover:scale-105"
                                        title="แจ้งปัญหาเกี่ยวกับสินค้านี้"
                                    >
                                        <AlertTriangle size={16} className="mr-2" />
                                        แจ้งปัญหา/ขอคืนเงิน
                                    </button>
                               )
                           )}
                           
                        </div>
                      </div>
                    ))}
                    
                    {/* Order Summary Footer */}
                    <div className="flex justify-end mt-4 pt-4">
                      <p className="text-gray-700 font-semibold">
                        สินค้ารวม {totalQuantity} รายการ: 
                        <span className="text-pink-700 text-xl font-bold ml-2">{formatNumberWithCommas(order.total_price)} บาท</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyOrdersPage;