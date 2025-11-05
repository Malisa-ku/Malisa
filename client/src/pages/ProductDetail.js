import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '../contexts/UserContext'; 
// Import the custom MessageBox component from its new location
import MessageBox from '../components/MessageBox';

const API_BASE_URL = 'http://localhost:3000/api/products';
const USERS_API_URL = 'http://localhost:3000/api/users';
const BACKEND_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money & Specs) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const { user } = useUser();

  // New state to manage the currently displayed image
  const [mainImage, setMainImage] = useState('');
  // New state for the custom message box
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProductAndSeller = async () => {
      try {
        const productRes = await fetch(`${API_BASE_URL}/${id}`);
        const productData = await productRes.json();

        if (!productRes.ok) {
          setError(productData.message || 'ไม่พบสินค้า');
          setLoading(false);
          return;
        }

        setProduct(productData.product);
        // Set the initial main image to the first available image
        setMainImage(`${BACKEND_URL}/${productData.product.image_url_1}`);

        const sellerRes = await fetch(`${USERS_API_URL}/${productData.product.seller_id}/public`);
        
        const sellerData = await sellerRes.json();

        if (sellerRes.ok) {
          setSeller(sellerData.user);
        } else {
          console.error('Failed to fetch seller:', sellerData.message);
          setSeller(null);
        }

      } catch (err) {
        console.error('Error fetching product or seller:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า');
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndSeller();
  }, [id]);

  const handleAddToCart = () => {
    if (!user) {
      // Use custom message box instead of alert for login prompt
      setMessage({
        title: 'เข้าสู่ระบบ',
        text: 'กรุณาเข้าสู่ระบบเพื่อเพิ่มสินค้าลงในตะกร้า',
        onClose: () => {
          setMessage(null);
          navigate('/login');
        }
      });
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    
    // *** สำคัญ: ส่ง Custom Event เพื่ออัปเดต Header ทันที ***
    window.dispatchEvent(new Event('cartUpdated'));


    // Use custom message box instead of alert for success message
    setMessage({
      title: 'สำเร็จ',
      text: `${quantity} ชิ้นของ ${product.name} ถูกเพิ่มลงในตะกร้าสินค้าแล้ว`,
      onClose: () => {
        setMessage(null);
        navigate('/cart');
      }
    });
  };

  // Function to create an array of all product image URLs
  const getProductImages = () => {
    const images = [];
    for (let i = 1; i <= 5; i++) { // Assuming a maximum of 5 images
        if (product[`image_url_${i}`]) {
            images.push(`${BACKEND_URL}/${product[`image_url_${i}`]}`);
        }
    }
    return images;
  };

  if (loading) {
    return <div className="text-center text-lg p-8">กำลังโหลดข้อมูลสินค้า...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-xl p-8">{error}</div>;
  }

  const allImages = getProductImages();

  return (
    <div className="container mx-auto p-4 md:p-8 bg-pink-50 min-h-screen">
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row">
        
        {/* ปุ่มย้อนกลับ */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition duration-300 z-10"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Product Image Gallery */}
        <div className="md:w-1/2 p-4 flex flex-col items-center">
          {/* Main Display Image */}
          <div className="w-full mb-4 rounded-lg shadow-md overflow-hidden">
            <img
              src={mainImage || 'https://placehold.co/600x600/CCCCCC/000000?text=No+Image'}
              alt={product.name}
              className="w-full max-h-96 object-contain"
            />
          </div>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto w-full justify-center">
              {allImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setMainImage(image)}
                  className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-md border-2 cursor-pointer overflow-hidden transition-all duration-300 ${
                    mainImage === image ? 'border-pink-600' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-600 mb-4">{product.category}</p>
            {/* ใช้ formatNumberWithCommas สำหรับราคา */}
            <p className="text-xl font-semibold text-pink-600 mb-6">฿{formatNumberWithCommas(product.price)}</p>
            <p className="text-gray-700 mb-6 leading-relaxed">{product.description}</p>
            
            <div className="mb-6 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">ข้อมูลผู้ขาย</h3>
              {seller ? (
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-lg font-medium text-gray-800">{seller.profile_name}</p>
                    <p className="text-sm text-gray-500">{seller.full_name}</p>
                    <p className="text-sm text-gray-500">สมัครเมื่อ: {new Date(seller.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">ไม่พบข้อมูลผู้ขาย</p>
              )}
            </div>

            {/* Size & Dimensions (if applicable) */}
            {(product.size || product.chest || product.waist || product.hip || product.length) && (
              <div className="mb-6 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">ข้อมูลขนาด</h3>
                <ul className="text-gray-700">
                  {product.size && <li><strong>ขนาด:</strong> {product.size}</li>}
                  {/* ใช้ formatNumberWithCommas สำหรับสเปคสินค้า */}
                  {product.chest && <li><strong>รอบอก:</strong> {formatNumberWithCommas(product.chest)} นิ้ว</li>}
                  {product.waist && <li><strong>รอบเอว:</strong> {formatNumberWithCommas(product.waist)} นิ้ว</li>}
                  {product.hip && <li><strong>รอบสะโพก:</strong> {formatNumberWithCommas(product.hip)} นิ้ว</li>}
                  {product.length && <li><strong>ความยาว:</strong> {formatNumberWithCommas(product.length)} นิ้ว</li>}
                </ul>
              </div>
            )}
          </div>
          
          {/* Add to Cart Section */}
          <div className="mt-8 flex items-center space-x-4">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-3 py-2 border rounded-lg text-center border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
            <button
              onClick={handleAddToCart}
              className="flex-grow bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
            >
              เพิ่มลงในตะกร้า
            </button>
          </div>
        </div>
      </div>
      {/* Render the custom MessageBox component if the message state is not null */}
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

export default ProductDetail;