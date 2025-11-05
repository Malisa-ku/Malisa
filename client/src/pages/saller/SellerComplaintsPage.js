import React, { useState, useEffect, createContext, useContext } from 'react';

// Since the application is in a single file, we create a mock UserContext here.
// In a real application, this would be a separate file and imported.
const UserContext = createContext(null);

// ***************************************************************
// ** Helper Function: Format Number with Comma (Global) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


// Main Seller Complaints Page component
const SellerComplaintsPage = () => {
    const [message, setMessage] = useState(null);

    // Function to handle form submission
    const handleSubmit = (formData) => {
        // Simulate sending data to a server
        console.log("Simulated data submitted:", formData);

        // Simulate a successful response
        setMessage({
            title: "ส่งเรื่องสำเร็จ!",
            text: "คำขออุทธรณ์ของคุณถูกส่งเรียบร้อยแล้ว"
        });

        // Clear the message after a delay
        setTimeout(() => {
            setMessage(null);
        }, 3000);
    };

    // Render the Complaint Form directly
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
                <ComplaintForm onSubmit={handleSubmit} onCancel={() => {}} />
            </div>
            {message && <MessageBox title={message.title} text={message.text} />}
        </div>
    );
};

// Complaint Form component
const ComplaintForm = ({ onSubmit, onCancel }) => {
    const [orderId, setOrderId] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!orderId || !description) {
            // Use custom message box instead of alert
            // For now, let's keep it simple by showing a message
            // In a full application, this would be a prop or state change to show a modal
            console.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        const formData = {
            seller_name: "เด็กหญิงงสไมล์", // This should be dynamic in a real app
            order_id: orderId,
            description: description,
            created_at: new Date().toISOString()
        };

        onSubmit(formData);
    };

    // ตัวอย่างการใช้งาน formatNumberWithCommas ในกรณีที่ต้องแสดงตัวเลขในฟอร์ม
    // const sampleAmount = 12345.67;
    // console.log(`Sample formatted amount: ${formatNumberWithCommas(sampleAmount)}`);

    return (
        <div className="bg-white rounded-2xl">
            {/* Form Header */}
            <div className="relative bg-gray-100 rounded-t-2xl text-gray-800 p-6 text-center">
                <h2 className="text-2xl font-bold">แบบฟอร์มการยื่นอุทธรณ์</h2>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-8">
                {/* Order ID Input */}
                <div className="mb-6">
                    <label htmlFor="order_id" className="block text-gray-700 font-semibold mb-2">
                        หมายเลขคำสั่งซื้อ <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="order_id"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        required
                        placeholder="กรุณากรอกหมายเลขคำสั่งซื้อ"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition duration-200"
                    />
                </div>

                {/* Description Textarea */}
                <div className="mb-8">
                    <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">
                        รายละเอียด <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows="8"
                        placeholder="กรุณาอธิบายเหตุผลในการยื่นอุทธรณ์อย่างละเอียด"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition duration-200"
                    ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center">
                    <button
                        type="submit"
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
                    >
                        ยืนยันการยื่นอุทธรณ์
                    </button>
                </div>
            </form>
        </div>
    );
};

// Custom Message Box component (instead of alert)
const MessageBox = ({ title, text }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-105">
                <h2 className="text-xl font-bold mb-2 text-pink-600">{title}</h2>
                <p className="text-gray-700 mb-6">{text}</p>
            </div>
        </div>
    );
};

export default SellerComplaintsPage;