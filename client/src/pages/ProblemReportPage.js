import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { X, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/users/problems';
const PRODUCTS_API_URL = 'http://localhost:3000/api/products';
const BACKEND_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function ProblemReportPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const { orderId, productId } = location.state || {};
    
    // State สำหรับการแจ้งปัญหา
    const [product, setProduct] = useState(null);
    const [problemType, setProblemType] = useState('สินค้าไม่ตรงปก');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!orderId || !productId) {
            setError('ไม่พบข้อมูลคำสั่งซื้อหรือสินค้า กรุณาลองใหม่อีกครั้ง');
            return;
        }

        const fetchProductData = async () => {
            try {
                // สมมติว่า Backend มี Endpoint /api/products/:id ที่คืนค่าราคาสินค้า
                const response = await axios.get(`${PRODUCTS_API_URL}/${productId}`);
                setProduct(response.data.product);
            } catch (err) {
                console.error("Error fetching product data:", err);
                setError('ไม่สามารถดึงข้อมูลสินค้าที่เกี่ยวข้องได้');
            }
        };

        fetchProductData();
    }, [orderId, productId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (!user || !user.token) {
            setError('คุณต้องเข้าสู่ระบบเพื่อแจ้งปัญหา');
            setLoading(false);
            return;
        }

        if (!orderId || !productId) {
            setError('ไม่พบข้อมูลคำสั่งซื้อหรือสินค้า กรุณาลองใหม่อีกครั้ง');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('product_id', productId);
        formData.append('problem_type', problemType);
        formData.append('description', description);
        // NOTE: Backend Endpoint (7) ใน users.js ไม่ได้ใช้ product_id ในการ INSERT
        // แต่การส่งข้อมูลนี้มีประโยชน์ในการดีบัก/ตรวจสอบ
        // formData.append('product_id', productId); 
        
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const response = await axios.post(
                API_URL, 
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );
            setMessage(response.data.message);
            // Clear form
            setProblemType('สินค้าไม่ตรงปก');
            setDescription('');
            setImageFile(null);
            document.getElementById('image-upload').value = '';
        } catch (err) {
            console.error('Error reporting problem:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแจ้งปัญหา');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="bg-[#FCECF0] min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                >
                    <X size={24} />
                </button>
                <div className="text-center pb-4 border-b border-gray-200 mb-6">
                    <h2 className="text-xl font-bold text-gray-800">ข้อมูลการแจ้งปัญหา</h2>
                </div>

                {message && (
                    <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm text-center">
                        <p>{message}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
                        <p>{error}</p>
                    </div>
                )}

                {product && (
                    <div className="mb-6 flex items-center space-x-4 border-b pb-4">
                        <img 
                            src={`${BACKEND_URL}/${product.image_url_1}`}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-md border border-gray-200"
                        />
                        <div>
                            <p className="font-semibold text-gray-800">{product.name}</p>
                            <p className="text-sm text-gray-500">Order ID: {orderId}</p>
                            {/* แสดงราคาสินค้าพร้อมคอมม่า */}
                            <p className="text-md font-bold text-pink-600">
                                {formatNumberWithCommas(product.price)} บาท
                            </p>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">ประเภทปัญหา</h4>
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="problemType"
                                    value="สินค้าไม่ตรงปก"
                                    checked={problemType === 'สินค้าไม่ตรงปก'}
                                    onChange={(e) => setProblemType(e.target.value)}
                                    className="form-radio h-4 w-4 text-pink-600 border-gray-300"
                                />
                                <span className="text-gray-700">สินค้าไม่ตรงปก</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="problemType"
                                    value="สินค้ามีตำหนิ"
                                    checked={problemType === 'สินค้ามีตำหนิ'}
                                    onChange={(e) => setProblemType(e.target.value)}
                                    className="form-radio h-4 w-4 text-pink-600 border-gray-300"
                                />
                                <span className="text-gray-700">สินค้ามีตำหนิ</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="problemType"
                                    value="ไม่จัดส่งสินค้า"
                                    checked={problemType === 'ไม่จัดส่งสินค้า'}
                                    onChange={(e) => setProblemType(e.target.value)}
                                    className="form-radio h-4 w-4 text-pink-600 border-gray-300"
                                />
                                <span className="text-gray-700">ไม่จัดส่งสินค้า</span>
                            </label>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">
                            รายละเอียด <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="image-upload" className="block text-gray-700 font-semibold mb-2">
                            รูปภาพหลักฐาน <span className="text-red-500">*</span>
                            <span className="text-sm text-gray-500 font-normal ml-2">(แนบได้สูงสุด 3 รูปภาพ)</span>
                        </label>
                        <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files[0])}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-lg transition duration-300 ${
                            loading ? 'bg-pink-300 text-white cursor-not-allowed' : 'bg-pink-200 hover:bg-pink-300 text-pink-600'
                        }`}
                    >
                        {loading ? 'กำลังแจ้ง...' : 'แจ้งปัญหา'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ProblemReportPage;