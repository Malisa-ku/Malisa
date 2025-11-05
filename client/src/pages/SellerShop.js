import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, UserCircle2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function SellerShop() {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) {
        setLoading(false);
        setError('ไม่พบข้อมูลผู้ขาย');
        return;
      }
      try {
        // Fetch seller's public profile
        const sellerRes = await axios.get(`${API_BASE_URL}/api/users/${sellerId}/public`);
        setSeller(sellerRes.data.user);

        // Fetch the seller's products
        const productsRes = await axios.get(`${API_BASE_URL}/api/products/seller/${sellerId}`);
        setProducts(productsRes.data.products);

      } catch (err) {
        console.error("Error fetching seller data:", err);
        setError("ไม่สามารถดึงข้อมูลร้านค้าได้");
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, [sellerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FCECF0] p-4">
        <p className="text-gray-500 text-lg">กำลังโหลดข้อมูลร้านค้า...</p>
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

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FCECF0] p-4 text-center">
        <p className="text-red-500 text-lg">ไม่พบร้านค้า</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FCECF0] min-h-screen pt-12 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Seller Shop Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex items-center space-x-6 mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft size={32} />
          </button>
          <img 
            src={seller.profile_image_url ? `${BACKEND_URL}/${seller.profile_image_url}` : 'https://placehold.co/150x150/9333ea/ffffff?text=No+Image'}
            alt={`${seller.profile_name}'s profile`}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-pink-300"
          />
          <div>
            <h1 className="text-4xl font-extrabold text-pink-700">{seller.profile_name}</h1>
            <p className="text-gray-500 mt-1">ผู้ขาย</p>
            <div className="flex items-center text-gray-600 mt-2">
              <UserCircle2 size={18} className="mr-2" />
              <span>{seller.full_name}</span>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">สินค้าทั้งหมดจาก {seller.profile_name}</h2>
          {products.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 text-xl py-12">
              ร้านค้านี้ยังไม่มีสินค้าในขณะนี้
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {products.map(product => {
                const isOutOfStock = product.stock_quantity <= 0;
                
                const productCard = (
                  <div className={`bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform ${isOutOfStock ? 'opacity-50' : 'hover:scale-105'}`}>
                      {isOutOfStock && (
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
                              <span className="text-white text-lg font-bold">สินค้าหมด</span>
                          </div>
                      )}
                      <img
                          src={`${BACKEND_URL}/${product.image_url_1}` || 'https://placehold.co/600x400/F5A6B4/FFFFFF?text=No+Image'}
                          alt={product.name}
                          className="w-full h-40 md:h-48 object-cover"
                      />
                      <div className="p-3 text-center">
                          <h3 className="text-sm md:text-md font-medium text-pink-800 truncate">{product.name}</h3>
                          {/* ใช้ formatNumberWithCommas สำหรับราคา */}
                          <p className="text-pink-600 font-bold mt-1 text-base">฿{formatNumberWithCommas(product.price)}</p>
                      </div>
                  </div>
                );

                if (isOutOfStock) {
                    return (
                        <div key={product.id} className="relative block">
                            {productCard}
                        </div>
                    );
                }

                return (
                    <Link 
                        key={product.id} 
                        to={`/product/${product.id}`}
                        className="block"
                    >
                        {productCard}
                    </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerShop;