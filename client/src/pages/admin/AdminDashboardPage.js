import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, FileWarning, AlertTriangle, XCircle, ShoppingBag, MessageSquare, Briefcase, DollarSign, Package } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/admin';

// ***************************************************************
// ** Helper Function: Format Integer with Comma **
// ***************************************************************
const formatIntegerWithCommas = (number) => {
    if (number === null || number === undefined || isNaN(number)) return 0;
    // ใช้ 'en-US' สำหรับจำนวนเต็มที่มีคอมม่า
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number);
};


function AdminDashboardPage() {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        users: 0, 
        problems: 0,
        complaints: 0,
        warnings: 0,
        bannedSellers: 0,
        products: 0,
        reviews: 0,
        orders: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/admin/login');
        } else {
            fetchStats();
        }
    }, [user, navigate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('admin_token');

            const [
                userRes,
                problemRes,
                complaintRes,
                warningRes,
                bannedSellerRes,
                productRes,
                reviewRes,
                orderRes
            ] = await Promise.allSettled([
                axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/problems`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/complaints`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/warnings`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/banned-sellers`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setStats({
                // ใช้ .length ในการนับจำนวน (เป็นจำนวนเต็ม)
                users: userRes.status === 'fulfilled' ? userRes.value.data.users.length : 0,
                problems: problemRes.status === 'fulfilled' ? problemRes.value.data.problems.length : 0,
                complaints: complaintRes.status === 'fulfilled' ? complaintRes.value.data.complaints.length : 0,
                warnings: warningRes.status === 'fulfilled' ? warningRes.value.data.warnings.length : 0,
                bannedSellers: bannedSellerRes.status === 'fulfilled' ? bannedSellerRes.value.data.bannedSellers.length : 0,
                products: productRes.status === 'fulfilled' ? productRes.value.data.products.length : 0,
                reviews: reviewRes.status === 'fulfilled' ? reviewRes.value.data.reviews.length : 0,
                orders: orderRes.status === 'fulfilled' ? orderRes.value.data.orders.length : 0
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
            setError('Failed to load dashboard data. Please check the API endpoints.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const StatsCard = ({ title, value, icon, bgColor, onClick, textColor, iconColor }) => (
        <div 
            className={`bg-white rounded-lg shadow-sm p-4 md:p-6 flex items-center space-x-4 transition-all duration-300 hover:shadow-lg cursor-pointer transform hover:translate-y-[-4px]`}
            onClick={onClick}
        >
            <div className={`p-3 rounded-full flex-shrink-0 ${bgColor}`}>
                {React.cloneElement(icon, { className: `h-8 w-8 ${iconColor}` })}
            </div>
            <div className="flex-1">
                {/* ใช้ formatIntegerWithCommas ในการแสดงผล */}
                <p className="text-xl font-bold text-gray-900 leading-tight">{formatIntegerWithCommas(value)}</p>
                <h3 className="text-sm text-gray-500 font-medium mt-1">{title}</h3>
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-gray-700 text-lg bg-gray-50">กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center min-h-screen text-red-600 font-medium bg-gray-50">{error}</div>;
    }

    return (
        <main className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 md:mb-8">ภาพรวมผู้ดูแลระบบ</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatsCard
                    title="ผู้ใช้ทั้งหมด"
                    value={stats.users}
                    icon={<Users />}
                    bgColor="bg-blue-100"
                    iconColor="text-blue-600"
                    onClick={() => navigate('/admin/report-users')}
                />
                <StatsCard
                    title="รายงานปัญหา"
                    value={stats.problems}
                    icon={<FileWarning />}
                    bgColor="bg-red-100"
                    iconColor="text-red-600"
                    onClick={() => navigate('/admin/problems')}
                />
                <StatsCard
                    title="ยื่นอุทธรณ์"
                    value={stats.complaints}
                    icon={<AlertTriangle />}
                    bgColor="bg-yellow-100"
                    iconColor="text-yellow-600"
                    onClick={() => navigate('/admin/complaints')}
                />
                <StatsCard
                    title="ประวัติการแจ้งเตือน"
                    value={stats.warnings}
                    icon={<FileText />}
                    bgColor="bg-purple-100"
                    iconColor="text-purple-600"
                    onClick={() => navigate('/admin/warnings-history')}
                />
                 <StatsCard
                    title="ผู้ขายที่ถูกระงับ"
                    value={stats.bannedSellers}
                    icon={<XCircle />}
                    bgColor="bg-gray-200"
                    iconColor="text-gray-600"
                    onClick={() => navigate('/admin/banned-sellers')}
                />
                {/* ตัวอย่างการเพิ่ม StatsCard ที่เหลือ (ถ้าต้องการแสดง) */}
                 <StatsCard
                    title="สินค้าทั้งหมด"
                    value={stats.products}
                    icon={<Package />}
                    bgColor="bg-green-100"
                    iconColor="text-green-600"
                    onClick={() => navigate('/admin/products')}
                />
                 <StatsCard
                    title="คำสั่งซื้อทั้งหมด"
                    value={stats.orders}
                    icon={<ShoppingBag />}
                    bgColor="bg-pink-100"
                    iconColor="text-pink-600"
                    onClick={() => navigate('/admin/orders')}
                />
                 <StatsCard
                    title="รีวิวทั้งหมด"
                    value={stats.reviews}
                    icon={<MessageSquare />}
                    bgColor="bg-cyan-100"
                    iconColor="text-cyan-600"
                    onClick={() => navigate('/admin/reviews')}
                />
            </div>
        </main>
    );
}

export default AdminDashboardPage;