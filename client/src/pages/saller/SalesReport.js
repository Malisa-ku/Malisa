import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

// ***************************************************************
// ** Helper Function: Format Number with Comma **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


// ฟังก์ชันแปลงวันที่ให้อยู่ในรูปแบบ YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

// --- (Custom Tooltip) ---
const CustomTooltip = ({ active, payload, label, reportType }) => {
    if (active && payload && payload.length) {
        const dateLabel = reportType === 'monthly' ? `เดือน: ${label}` : `วันที่: ${label}`;
        const salesAmount = payload[0].value;
        return (
            <div className="p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-800">{dateLabel}</p>
                {/* ใช้ฟังก์ชันใหม่ในการแสดงผลยอดขายใน Tooltip */}
                <p className="text-pink-600 font-bold">{`ยอดขาย: ${formatNumberWithCommas(salesAmount)} บาท`}</p>
            </div>
        );
    }
    return null;
};

const API_BASE_URL = 'http://localhost:3000';

function SalesReport() {
    const { user } = useUser();
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('monthly'); // 'monthly', 'daily', หรือ 'custom'
    
    // States สำหรับ Daily Report
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    
    // States สำหรับ Custom Report
    const today = formatDate(new Date());
    const [startDate, setStartDate] = useState(formatDate(new Date(new Date().setDate(new Date().getDate() - 30)))); // เริ่มต้น 30 วันที่แล้ว
    const [endDate, setEndDate] = useState(today);

    const fetchSalesReport = async () => {
        if (!user || !user.token) {
            setLoading(false);
            setError('คุณต้องเข้าสู่ระบบในฐานะผู้ขายเพื่อดูรายงานการขาย');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let response;
            let endpoint = '';
            let params = {};
            let dataKey = '';

            if (reportType === 'monthly') {
                endpoint = `${API_BASE_URL}/api/sellers/monthly-sales-report`;
                dataKey = 'monthlySales';
            } else if (reportType === 'daily') {
                endpoint = `${API_BASE_URL}/api/sellers/daily-sales-report`;
                params = { month: selectedMonth, year: selectedYear };
                dataKey = 'dailySales';
            } else if (reportType === 'custom') {
                // *** สมมติว่ามี Endpoint ใหม่สำหรับ Custom Range และดึงข้อมูลรายวัน ***
                endpoint = `${API_BASE_URL}/api/sellers/daily-sales-report-custom`; 
                params = { startDate, endDate };
                dataKey = 'dailySales'; 
            }
            
            response = await axios.get(endpoint, {
                params: params,
                headers: { Authorization: `Bearer ${user.token}` },
            });
            
            // ใช้ dataKey ที่กำหนดตาม Report Type เพื่อเข้าถึงข้อมูล
            setSalesData(response.data[dataKey] || response.data.dailySales || []);
            setLoading(false);
            
        } catch (err) {
            console.error(`Error fetching ${reportType} sales report:`, err);
            setError(`เกิดข้อผิดพลาดในการดึงรายงานยอดขาย`);
            setLoading(false);
        }
    };

    // ใช้ fetchSalesReport เมื่อมีการเปลี่ยน reportType หรือพารามิเตอร์วันที่
    useEffect(() => {
        // ตรวจสอบความถูกต้องของวันที่สำหรับ Custom Report ก่อนเรียก API
        if (reportType === 'custom' && (!startDate || !endDate || new Date(startDate) > new Date(endDate))) {
             if (startDate && endDate) setError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
             else setError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
             setSalesData([]);
             return;
        }
        
        fetchSalesReport();
    }, [user, reportType, selectedMonth, selectedYear, startDate, endDate]);

    // การกำหนด DataKey สำหรับ XAxis
    const getDataKey = () => {
        if (reportType === 'monthly') return 'month';
        // daily และ custom จะแสดงผลเป็นรายวัน
        return 'date'; 
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#FCECF0]">
                <p>กำลังโหลดรายงานการขาย...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#FCECF0]">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (salesData.length === 0) {
        return (
            <div className="min-h-screen bg-[#FCECF0] p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">รายงานการสั่งซื้อสินค้า</h1>
                    <div className="flex space-x-2 mb-6">
                        {/* Buttons for selecting report type */}
                        <button
                            onClick={() => setReportType('monthly')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'monthly' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            รายเดือน
                        </button>
                        <button
                            onClick={() => setReportType('daily')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'daily' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            รายวัน (ตามเดือน)
                        </button>
                        <button
                            onClick={() => setReportType('custom')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'custom' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            กำหนดเอง
                        </button>
                    </div>
                    <p className="text-gray-500">ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCECF0] p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
                {/* Header Section */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-800">รายงานการสั่งซื้อสินค้า</h1>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setReportType('monthly')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'monthly' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            รายเดือน
                        </button>
                        <button
                            onClick={() => setReportType('daily')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'daily' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            รายวัน (ตามเดือน)
                        </button>
                         <button
                            onClick={() => setReportType('custom')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                reportType === 'custom' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            กำหนดเอง
                        </button>
                    </div>
                </div>

                {/* Date Filters */}
                <div className="p-6">
                    {/* Filter for Daily (by Month/Year) */}
                    {reportType === 'daily' && (
                        <div className="flex space-x-4">
                             <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border rounded-md px-3 py-2"
                            >
                                {/* แสดงปีปัจจุบันและปีย้อนหลัง 4 ปี */}
                                {[...Array(5)].map((_, i) => (
                                    <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                                        ปี {new Date().getFullYear() - i}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="border rounded-md px-3 py-2"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        เดือน {i + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {/* Filter for Custom Date Range */}
                    {reportType === 'custom' && (
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
                            <label className="font-semibold text-gray-700">จากวันที่:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border rounded-md px-3 py-2 w-full md:w-auto"
                            />
                            <label className="font-semibold text-gray-700">ถึงวันที่:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border rounded-md px-3 py-2 w-full md:w-auto"
                            />
                        </div>
                    )}
                </div>
                
                {/* Chart Section */}
                <div className="p-6">
                    <div className="bg-white rounded-lg p-6 border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            {reportType === 'daily' || reportType === 'custom' ? 'ยอดขายรายวัน (บาท)' : 'ยอดขายรายเดือน (บาท)'}
                            {reportType === 'custom' && ` (ช่วง ${startDate} ถึง ${endDate})`}
                        </h2>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={salesData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey={getDataKey()} axisLine={false} tickLine={false} />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip reportType={reportType} />} />
                                    <Legend />
                                    <Bar dataKey="totalSales" fill="#db2777" name="ยอดขายรวม" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Data Table Section */}
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">
                        รายละเอียด{reportType === 'daily' || reportType === 'custom' ? 'รายวัน' : 'รายเดือน'}
                    </h2>
                    <table className="min-w-full bg-white rounded-lg overflow-hidden border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6">{reportType === 'daily' || reportType === 'custom' ? 'วันที่' : 'เดือน'}</th>
                                <th className="py-3 px-6">ยอดขายรวม</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm font-light">
                            {salesData.map((row, index) => (
                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="py-3 px-6 whitespace-nowrap">{row[getDataKey()]}</td>
                                    {/* ใช้ฟังก์ชันใหม่ในการแสดงผลยอดขายในตาราง */}
                                    <td className="py-3 px-6">{formatNumberWithCommas(row.totalSales)} บาท</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SalesReport;