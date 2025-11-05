// File: SellerDashboard.js (ปรับปรุง)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext'; 
import {
    Package,
    ShoppingBag,
    DollarSign,
    ClipboardList,
    AlertCircle,
    Truck,
    Clock,
    CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom'; 

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
// ** Helper Function: Format Integer with Comma **
// ***************************************************************
const formatIntegerWithCommas = (number) => {
    if (number === null || number === undefined || isNaN(number)) return 0;
    // ใช้ 'en-US' สำหรับจำนวนเต็ม
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number);
};


function SellerDashboard() {
    const { user } = useUser(); 
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        if (!user || !user.token) {
            setLoading(false);
            setError('คุณต้องเข้าสู่ระบบในฐานะผู้ขายเพื่อดูข้อมูล');
            return;
        }

        try {
            // Endpoint (1) GET /api/sellers/dashboard
            const response = await axios.get(`${API_BASE_URL}/api/sellers/dashboard`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setDashboardData(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'รอดำเนินการ':
            case 'pending':
                return <Clock size={16} className="text-pink-500 mr-2" />;
            case 'ชำระเงินแล้ว':
            case 'paid':
                return <CheckCircle size={16} className="text-green-500 mr-2" />;
            case 'จัดส่งแล้ว':
            case 'shipped':
                return <Truck size={16} className="text-blue-500 mr-2" />;
            case 'จัดส่งสำเร็จ':
            case 'delivered':
                return <CheckCircle size={16} className="text-green-500 mr-2" />;
            case 'มีปัญหา':
            case 'problem':
            case 'open':
            case 'seller_replied': // 💡 FIX: สีแดงสำหรับปัญหาที่ยังไม่ปิด
                return <AlertCircle size={16} className="text-red-500 mr-2" />;
            default:
                return null;
        }
    };

    const stats = dashboardData?.stats;

    return (
        <div className="min-h-screen bg-white p-6">
            <h1 className="text-3xl font-bold text-pink-600 mb-6">ภาพรวมร้านค้า</h1>
            <p className="text-gray-500 mb-8">ข้อมูลล่าสุดสำหรับร้านค้าของคุณ</p>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Products Card */}
                <div className="bg-pink-50/50 rounded-2xl p-6 shadow-sm flex items-center">
                    <div className="bg-pink-100/70 p-3 rounded-full mr-4">
                        <Package size={24} className="text-pink-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">จำนวนสินค้าทั้งหมด</p>
                        <p className="text-3xl font-bold text-pink-800">
                            {formatIntegerWithCommas(stats?.totalProducts || 0)}
                        </p>
                    </div>
                </div>

                {/* New Orders Card */}
                <div className="bg-pink-50/50 rounded-2xl p-6 shadow-sm flex items-center">
                    <div className="bg-pink-100/70 p-3 rounded-full mr-4">
                        <ShoppingBag size={24} className="text-pink-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">คำสั่งซื้อใหม่</p>
                        <p className="text-3xl font-bold text-pink-800">
                            {formatIntegerWithCommas(stats?.newOrders || 0)}
                        </p>
                    </div>
                </div>

                {/* Total Revenue Card */}
                <div className="bg-pink-50/50 rounded-2xl p-6 shadow-sm flex items-center">
                    <div className="bg-pink-100/70 p-3 rounded-full mr-4">
                        <DollarSign size={24} className="text-pink-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">รายได้รวม</p>
                        <p className="text-3xl font-bold text-pink-800">
                            {formatNumberWithCommas(stats?.totalRevenue || 0)}
                        </p>
                    </div>
                </div>

                {/* Total Items Sold Card */}
                <div className="bg-pink-50/50 rounded-2xl p-6 shadow-sm flex items-center">
                    <div className="bg-pink-100/70 p-3 rounded-full mr-4">
                        <ShoppingBag size={24} className="text-pink-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">สินค้าที่ขายได้</p>
                        <p className="text-3xl font-bold text-pink-800">
                            {formatIntegerWithCommas(stats?.totalItemsSold || 0)}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Recent Orders and Problems */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders Table */}
                <div className="bg-gray-50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center mb-4">
                        <ClipboardList size={24} className="text-pink-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-800">คำสั่งซื้อล่าสุด</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg">
                            <thead className="bg-pink-100">
                                <tr className="text-left text-pink-700">
                                    <th className="py-3 px-4 rounded-tl-lg">รหัส</th>
                                    <th className="py-3 px-4">วันที่</th>
                                    <th className="py-3 px-4">สถานะ</th>
                                    <th className="py-3 px-4 rounded-tr-lg">ราคารวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.recentOrders?.length > 0 ? (
                                    dashboardData.recentOrders.map((order) => (
                                        <tr 
                                            key={order.id} 
                                            className="border-b border-gray-100 hover:bg-pink-50/50 cursor-pointer"
                                            // 💡 ใช้ Link สำหรับการนำทาง
                                        >
                                            <td className="py-3 px-4 text-gray-700">
                                                <Link to={`/seller/orders/${order.id}`} className="text-gray-700 hover:text-pink-600 font-medium">
                                                    {order.id}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500">
                                                <Link to={`/seller/orders/${order.id}`} className="text-gray-500 hover:text-pink-600">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700 flex items-center">
                                                <Link to={`/seller/orders/${order.id}`} className="text-gray-700 hover:text-pink-600 flex items-center">
                                                    {getStatusIcon(order.status)}
                                                    {order.status}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">
                                                <Link to={`/seller/orders/${order.id}`} className="text-gray-700 hover:text-pink-600">
                                                    {formatNumberWithCommas(order.total_price)}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-4 text-center text-gray-500">
                                            ไม่มีคำสั่งซื้อล่าสุด
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Problems Table (Now Clickable) */}
                <div className="bg-gray-50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center mb-4">
                        <AlertCircle size={24} className="text-pink-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-800">ปัญหาล่าสุด</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg">
                            <thead className="bg-pink-100">
                                <tr className="text-left text-pink-700">
                                    <th className="py-3 px-4 rounded-tl-lg">รหัสปัญหา</th>
                                    <th className="py-3 px-4">คำสั่งซื้อ</th>
                                    <th className="py-3 px-4 rounded-tr-lg">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.recentProblems?.length > 0 ? (
                                    dashboardData.recentProblems.map((problem) => (
                                        // 💡 FIX: ใช้ Link Component นำทางไปยังหน้า Order Details 
                                        <tr 
                                            key={problem.id} 
                                            className="border-b border-gray-100 hover:bg-red-50/50 cursor-pointer"
                                            // onClick event removed, relying on Link inside td
                                        >
                                            <td className="py-3 px-4 text-gray-700">
                                                <Link to={`/seller/orders/${problem.order_id}`} className="text-gray-700 hover:text-pink-600 font-medium">
                                                    {problem.id}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-red-600 font-medium">
                                                <Link to={`/seller/orders/${problem.order_id}`} className="text-red-600 hover:text-pink-600 font-medium">
                                                    #{problem.order_id}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700 max-w-xs truncate">
                                                <Link to={`/seller/orders/${problem.order_id}`} className="text-gray-700 hover:text-pink-600">
                                                    {problem.description}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-4 text-center text-gray-500">
                                            ไม่มีปัญหาล่าสุดที่ต้องจัดการ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SellerDashboard;