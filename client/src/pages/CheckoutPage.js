import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { ArrowLeft } from 'lucide-react';
import MessageBox from '../components/MessageBox';

// กำหนด BASE URL ของ API เพื่อให้สอดคล้องกับ server.js
const API_BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3000'; 

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


// *****************************************************************
// ** 1. PaymentCountdown Component **
// *****************************************************************
const PaymentCountdown = ({ expiryTimestamp, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const difference = new Date(expiryTimestamp) - new Date();
    
    if (difference <= 1000) { // น้อยกว่าหรือเท่ากับ 1 วินาที ถือว่าหมดอายุ
      setIsExpired(true);
      onExpire();
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { hours, minutes, seconds };
  }, [expiryTimestamp, onExpire]);

  useEffect(() => {
    if (!expiryTimestamp) return;

    setTimeLeft(calculateTimeLeft());
    
    // ตั้งค่า Interval ให้รันทุก 1 วินาที
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Cleanup function: เคลียร์ interval เมื่อ component ถูกถอดออก
    return () => clearInterval(timer);
  }, [expiryTimestamp, calculateTimeLeft]);

  // ฟอร์แมตเวลาให้เป็น "00"
  const formatTime = (time) => String(time).padStart(2, '0');

  if (!expiryTimestamp) return null;

  if (isExpired) {
    return <div className="text-center text-red-600 font-bold text-lg">หมดเวลาชำระเงินแล้ว</div>;
  }

  return (
    <div className="text-center mb-6">
      <p className="text-sm text-gray-700 font-semibold mb-2">เวลาที่เหลือสำหรับแนบสลิป:</p>
      <div className="text-3xl font-extrabold text-[#F75271] tracking-wider">
        <span>{formatTime(timeLeft.hours)}</span>:
        <span>{formatTime(timeLeft.minutes)}</span>:
        <span>{formatTime(timeLeft.seconds)}</span>
      </div>
    </div>
  );
};
// *****************************************************************
// ** End PaymentCountdown Component **
// *****************************************************************

function CheckoutPage() {
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDetails] = useState({
    bank_name: 'KBank', 
    account_number: '130152xxxx', 
  });
  // ***************************************************************
  // ** เพิ่ม State สำหรับเวลานับถอยหลัง **
  // ***************************************************************
  const [expiryTime, setExpiryTime] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useUser();
  const [message, setMessage] = useState(null);

  // ***************************************************************
  // ** ฟังก์ชันจัดการเมื่อเวลานับถอยหลังหมดอายุ **
  // ***************************************************************
  const handleCountdownExpire = () => {
    setMessage({
        title: 'หมดเวลา',
        text: 'เกินกำหนดเวลา 24 ชั่วโมงในการชำระเงิน รายการสั่งซื้อนี้จะถูกยกเลิก',
        onClose: () => {
          setMessage(null);
          localStorage.removeItem('paymentExpiryTime');
          sessionStorage.removeItem('checkoutItems');
          // *** ส่ง Custom Event เมื่อหมดอายุ ***
          window.dispatchEvent(new Event('cartUpdated')); 
          window.dispatchEvent(new Event('stockUpdated')); // ส่งสัญญาณอัปเดตสต็อกใน HomePage ด้วย
          navigate('/my-orders'); 
        }
    });
  };
  // ***************************************************************

  useEffect(() => {
    // 1. ดึงข้อมูลสินค้า และคำนวณราคา (โค้ดเดิม)
    const storedItems = JSON.parse(sessionStorage.getItem('checkoutItems')) || [];
    if (storedItems.length === 0) {
      // ... (โค้ดแสดง MessageBox และ navigate)
      setMessage({
        title: 'ไม่มีสินค้า',
        text: 'ไม่มีสินค้าที่ต้องชำระเงิน กรุณาเลือกสินค้าในตะกร้าก่อน',
        onClose: () => {
          setMessage(null);
          navigate('/cart');
        }
      });
      return;
    }

    const total = storedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    setCheckoutItems(storedItems);
    setTotalPrice(total);
    
    // 2. จัดการเวลาสิ้นสุดการชำระเงิน
    let storedExpiry = localStorage.getItem('paymentExpiryTime');

    if (!storedExpiry) {
      // หากไม่มีเวลาสิ้นสุดเดิม ให้กำหนดเวลาใหม่เป็น 24 ชั่วโมงจากตอนนี้
      const newExpiry = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('paymentExpiryTime', newExpiry);
      storedExpiry = newExpiry;
    } 
    
    // ตรวจสอบว่าเวลาที่จัดเก็บยังไม่หมดอายุ
    if (new Date(storedExpiry) > new Date()) {
        setExpiryTime(storedExpiry);
    } else {
        // หากหมดอายุแล้ว ให้เรียกฟังก์ชันจัดการหมดอายุ
        handleCountdownExpire();
    }
  }, [navigate]); // ไม่จำเป็นต้องใส่ handleCountdownExpire ใน dependencies เพราะมันจัดการสถานะของ component

  const handleFileChange = (e) => {
    setPaymentSlip(e.target.files[0]);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!paymentSlip) {
      setMessage({
        title: 'ผิดพลาด',
        text: 'กรุณาแนบสลิปการโอนเงิน',
        onClose: () => setMessage(null)
      });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('paymentSlip', paymentSlip);
    formData.append('totalPrice', totalPrice);
    formData.append('items', JSON.stringify(checkoutItems));
    
    // ลบเวลาที่หมดอายุออกก่อนส่งข้อมูล (เพราะถือว่าชำระเงินสำเร็จแล้ว)
    localStorage.removeItem('paymentExpiryTime'); 

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // ... (โค้ดแสดง MessageBox และ navigate)
        setMessage({
          title: 'ข้อผิดพลาด',
          text: 'กรุณาเข้าสู่ระบบก่อนทำรายการ',
          onClose: () => {
            setMessage(null);
            navigate('/login');
          }
        });
        setIsSubmitting(false);
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/users/orders/checkout`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Payment confirmation successful:', response.data);

      // 1. ลบสินค้าที่ชำระเงินแล้วออกจากตะกร้าหลัก
      const allCartItems = JSON.parse(localStorage.getItem('cart')) || [];
      const itemsToKeep = allCartItems.filter(cartItem => {
        return !checkoutItems.some(checkoutItem => checkoutItem.id === cartItem.id);
      });
      localStorage.setItem('cart', JSON.stringify(itemsToKeep));
      sessionStorage.removeItem('checkoutItems');
      
      // *** สำคัญ: ส่ง Custom Event เพื่ออัปเดต Header และ HOME PAGE ทันที ***
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('stockUpdated')); // <-- บอก HomePage ให้โหลดใหม่

      setMessage({
        title: 'สำเร็จ',
        text: 'ยืนยันการชำระเงินเรียบร้อยแล้ว',
        onClose: () => {
          setMessage(null);
          navigate('/my-orders');
        }
      });
    } catch (error) {
      console.error('Error confirming payment:', error.response?.data?.message || error.message);
      
      // หากเกิดข้อผิดพลาดในการส่งข้อมูล ให้บันทึกเวลาสิ้นสุดกลับไปอีกครั้ง
      localStorage.setItem('paymentExpiryTime', expiryTime); 
      
      setMessage({
        title: 'ข้อผิดพลาด',
        text: 'จำนวนสินค้าในสต็อกสินค้ามีจำนวนไม่เพียงพอ',
        onClose: () => setMessage(null)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FCECF0] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-pink-600 hover:text-pink-800 transition-colors">
            <ArrowLeft size={36} />
          </button>
        </div>
        
        <h2 className="text-2xl font-bold text-pink-800 mb-6 text-center">
          การชำระเงิน
        </h2>

        {/* *************************************************************** */}
        {/* ** ตำแหน่งแสดง Countdown ** */}
        {/* *************************************************************** */}
        <PaymentCountdown 
            expiryTimestamp={expiryTime} 
            onExpire={handleCountdownExpire} 
        />
        
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
          
          {/* ข้อมูลบัญชีธนาคาร */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center space-x-4">
            <img 
              src={`${BACKEND_URL}/uploads/bank/Kasikornbank_Logo.png`} 
              alt="KBank Logo" 
              className="h-10 w-auto" 
            />
            <div>
              <p className="text-lg font-bold text-gray-800">เลขที่บัญชี {paymentDetails.account_number}</p>
            </div>
          </div>

          {/* อัปโหลดสลิป */}
          <form onSubmit={handleConfirmPayment} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="payment-slip" className="text-sm text-gray-700">
                แนบสลิป*
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={paymentSlip ? paymentSlip.name : 'Choose File'}
                  className="flex-grow py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-pointer"
                  onClick={() => document.getElementById('fileInput').click()}
                />
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('fileInput').click()}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Choose
                </button>
              </div>
            </div>

            {/* สรุปยอดที่ต้องชำระ */}
            <div className="bg-[#F9E9EC] p-4 rounded-lg flex justify-between items-center text-gray-800 font-semibold">
              <span>สรุปยอดทั้งหมด</span>
              {/* ใช้ formatNumberWithCommas สำหรับราคารวมทั้งหมด */}
              <span className="text-xl font-bold">{formatNumberWithCommas(totalPrice)} บาท</span>
            </div>

            <button
              type="submit"
              // ปิดปุ่มหากหมดอายุด้วยการตรวจสอบ expiryTime เทียบกับเวลาปัจจุบัน
              disabled={isSubmitting || !paymentSlip || (expiryTime && new Date(expiryTime) < new Date())}
              className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 transform hover:scale-105 shadow-lg
                ${(isSubmitting || !paymentSlip || (expiryTime && new Date(expiryTime) < new Date()))
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-[#F75271] border-2 border-white'
                }
              `}
              style={{
                boxShadow: (isSubmitting || !paymentSlip || (expiryTime && new Date(expiryTime) < new Date())) 
                  ? 'none' 
                  : '0 4px 6px -1px rgb(247 82 113 / 0.1), 0 2px 4px -2px rgb(247 82 113 / 0.1)',
                backgroundColor: (isSubmitting || !paymentSlip || (expiryTime && new Date(expiryTime) < new Date())) ? '' : '#F9F1F3',
                color: (isSubmitting || !paymentSlip || (expiryTime && new Date(expiryTime) < new Date())) ? '' : '#F75271'
              }}
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการสั่งซื้อสินค้า'}
            </button>
          </form>
        </div>
      </div>
      {/* เพิ่ม MessageBox component ที่จะแสดงเมื่อ message state มีค่า */}
      {message && (
        <MessageBox
          title={message.title}
          text={message.text}
          onClose={message.onClose}
        />
      )}
    </div>
  );
}

export default CheckoutPage;