import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { MdPerson, MdEmail, MdLock } from 'react-icons/md'; // ต้องติดตั้ง react-icons

// Base URL for API calls. Change this to match your backend API base URL.
const API_BASE_URL = 'http://localhost:3000'; // แก้ไขเพื่อให้ใช้ baseURL ได้ง่ายขึ้น

function RegisterPage() {
  const [profileName, setProfileName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer'); // default role
  const [message, setMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState(null);
  const navigate = useNavigate();

  // Function to handle the registration form submission
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');

    // Check if terms and conditions are accepted
    if (!termsAccepted) {
      setMessage('กรุณายอมรับข้อกำหนดและเงื่อนไขก่อนลงทะเบียน');
      return;
    }

    // สร้าง payload สำหรับส่งไปที่ API
    const payload = {
      profile_name: profileName,
      full_name: fullName,
      email,
      password,
      role
    };

    // **ส่วนที่แก้ไข: ถ้าบทบาทเป็น 'seller' ให้เพิ่ม status เป็น 'pending'**
    if (role === 'seller') {
      payload.status = 'pending';
    }

    try {
      // Send a POST request to the registration endpoint
      const response = await axios.post(`${API_BASE_URL}/api/users/register`, payload);

      if (response.status === 201 || response.status === 200) {
        // **ส่วนที่แก้ไข: แสดงข้อความตามบทบาทที่เลือก**
        if (role === 'seller') {
          setMessage('ลงทะเบียนสำเร็จ! บัญชีของคุณอยู่ระหว่างการตรวจสอบ โปรดรอการอนุมัติ');
        } else {
          setMessage('ลงทะเบียนสำเร็จ! โปรดเข้าสู่ระบบ');
        }
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      // Handle different types of errors from the backend
      if (error.response) {
        setMessage(`ลงทะเบียนไม่สำเร็จ: ${error.response.data.message || 'เกิดข้อผิดพลาด'}`);
      } else if (error.request) {
        setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        console.error('Error request:', error.request);
      } else {
        setMessage('เกิดข้อผิดพลาดในการลงทะเบียน');
        console.error('Error message:', error.message);
      }
      console.error('Error during registration:', error);
    }
  };

  // ดึง URL โลโก้จาก API เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
        setSiteLogoUrl(response.data.logoUrl);
      } catch (error) {
        console.error('Error fetching site logo:', error);
      }
    };
    fetchLogo();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9E9EC] p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-transparent">
        <div className="flex justify-center mb-6">
          {siteLogoUrl ? (
            <img
              // แก้ไขจาก 'http://localhost:3000/${siteLogoUrl}'
              src={`${API_BASE_URL}${siteLogoUrl}`}
              alt="Shop Shield Logo"
              className="h-24 w-auto"
            />
          ) : (
            <div className="h-24 w-auto flex items-center justify-center">
              <p>Loading logo...</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-center text-3xl font-extrabold text-pink-800">
            สมัครสมาชิก
          </h2>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ชื่อโปรไฟล์"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          <div className="relative">
            <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          <div className="relative">
            <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-12 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
              required
            />
          </div>
          <div className="flex items-center justify-center space-x-4 p-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={role === 'buyer'}
                onChange={(e) => setRole(e.target.value)}
                className="form-radio text-pink-600 focus:ring-pink-500"
              />
              <span className="ml-2 text-pink-700">ผู้ซื้อ</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="role"
                value="seller"
                checked={role === 'seller'}
                onChange={(e) => setRole(e.target.value)}
                className="form-radio text-pink-600 focus:ring-pink-500"
              />
              <span className="ml-2 text-pink-700">ผู้ขาย</span>
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="terms-acceptance"
              name="terms-acceptance"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-pink-300 rounded"
            />
            <label htmlFor="terms-acceptance" className="ml-2 block text-sm text-pink-900">
              ฉันยอมรับ
              <span onClick={() => setShowTermsPopup(true)} className="text-pink-600 hover:text-pink-500 font-medium cursor-pointer">
                ข้อกำหนดและเงื่อนไข
              </span>
            </label>
          </div>
          <div>
            <button
              type="submit"
              className={`w-full py-3 mt-8 text-lg font-bold rounded-full shadow-lg border-2 transition-transform duration-200 transform hover:scale-105
                ${termsAccepted ? 'bg-white text-[#F75271] border-white' : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'}`}
              disabled={!termsAccepted}
            >
              ลงทะเบียน
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
            <p className="font-medium">{message}</p>
          </div>
        )}

        <div className="mt-6 text-sm text-[#F75271] font-bold text-center">
          <Link to="/login" className="hover:underline">
            มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      {/* Terms and Conditions Popup */}
      {showTermsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4 text-pink-800">ข้อกำหนดและเงื่อนไข</h3>
            <div className="text-pink-700 space-y-4 text-sm">
              <p className="font-bold">1. คำจำกัดความ</p>
              <p>
                "บริการ" หมายถึง เว็บไซต์, แอปพลิเคชัน, และบริการต่างๆ ที่เราจัดหาให้<br />
                "ผู้ใช้" หมายถึง บุคคลหรือนิติบุคคลที่เข้าถึงหรือใช้บริการของเรา<br />
                "ข้อมูลส่วนบุคคล" หมายถึง ข้อมูลที่ระบุตัวตนของผู้ใช้ได้
              </p>

              <p className="font-bold">2. การยอมรับข้อกำหนด</p>
              <p>การเข้าถึงหรือใช้บริการของเราถือว่าคุณได้อ่าน เข้าใจ และยอมรับที่จะปฏิบัติตามข้อกำหนดและเงื่อนไขเหล่านี้ หากคุณไม่ยอมรับ โปรดงดใช้บริการ</p>

              <p className="font-bold">3. การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล</p>
              <p>เราจะเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณเพื่อวัตถุประสงค์ดังต่อไปนี้:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>เพื่อให้บริการและปรับปรุงคุณภาพของบริการ</li>
                  <li>เพื่อสื่อสารกับคุณเกี่ยวกับบริการและข้อเสนอต่างๆ</li>
                  <li>เพื่อการวิเคราะห์และปรับปรุงประสบการณ์การใช้งานของผู้ใช้</li>
                  <li>เพื่อปฏิบัติตามข้อบังคับทางกฎหมาย</li>
                </ul>
                เราจะรักษาความปลอดภัยของข้อมูลของคุณอย่างดีที่สุด
              </p>

              <p className="font-bold">4. สิทธิและความรับผิดชอบของผู้ใช้</p>
              <p>
                คุณมีสิทธิ์ในการเข้าถึง แก้ไข และลบข้อมูลส่วนบุคคลของคุณได้<br />
                คุณต้องรับผิดชอบต่อการรักษาความลับของรหัสผ่านและข้อมูลบัญชีของคุณ<br />
                คุณตกลงที่จะไม่ใช้บริการในทางที่ผิดกฎหมาย หรือก่อให้เกิดความเสียหายต่อผู้อื่น
              </p>

              <p className="font-bold">5. การจำกัดความรับผิดชอบ</p>
              <p>เราจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดขึ้นจากการใช้บริการของเรา รวมถึงการสูญเสียข้อมูลหรือกำไร</p>

              <p className="font-bold">6. การเปลี่ยนแปลงข้อกำหนดและเงื่อนไข</p>
              <p>เราขอสงวนสิทธิ์ในการเปลี่ยนแปลงข้อกำหนดและเงื่อนไขเหล่านี้ได้ทุกเมื่อ การเปลี่ยนแปลงจะมีผลทันทีที่ประกาศบนเว็บไซต์</p>

              <p className="font-bold">7. การยกเลิกบัญชี</p>
              <p>เราอาจยกเลิกบัญชีของคุณได้ทันทีหากคุณละเมิดข้อกำหนดและเงื่อนไขเหล่านี้</p>

              <p className="font-bold">8. กฎหมายที่ใช้บังคับ</p>
              <p>ข้อกำหนดและเงื่อนไขเหล่านี้อยู่ภายใต้และตีความตามกฎหมายของประเทศไทย</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTermsPopup(false);
                  setTermsAccepted(true);
                }}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              >
                ตกลงและยอมรับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterPage;