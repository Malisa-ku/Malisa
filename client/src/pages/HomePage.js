import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

const API_BASE_URL = 'http://localhost:3000/api/products';
const BACKEND_URL = 'http://localhost:3000'; 

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // *** ฟังก์ชันหลักในการดึงสินค้า (ใช้ useCallback เพื่อให้ฟังก์ชันเสถียร) ***
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/search?query=${debouncedSearchQuery}`;
      if (categoryFilter) {
        url += `&category_id=${categoryFilter}`;
      }
      
      const response = await axios.get(url);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]); 
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, categoryFilter]); // Depend on filter states
  // ******************************


  // Fetch products based on filters AND listen for stock updates
  useEffect(() => {
    fetchProducts();
    
    // ฟัง Custom Event ที่ถูกส่งมาจาก CheckoutPage เมื่อมีการซื้อ/อัปเดตสต็อก
    window.addEventListener('stockUpdated', fetchProducts);
    window.addEventListener('cartUpdated', fetchProducts); 

    return () => {
        window.removeEventListener('stockUpdated', fetchProducts);
        window.removeEventListener('cartUpdated', fetchProducts);
    };
  }, [fetchProducts]);


  // ฟังก์ชันนี้ไม่จำเป็นต้องมีการดำเนินการใดๆ เนื่องจากใช้ Link component ครอบอยู่แล้ว
  const handleViewProduct = (product) => {
    console.log('กำลังนำทางไปที่:', `/product/${product.id}`);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-xl font-semibold text-pink-600">
        กำลังโหลดสินค้า...
      </div>
    );
  }

  return (
    <div className="bg-[#FCECF0] min-h-screen pt-12 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Title Section */}
        <div className="flex justify-center mb-10">
          <div className="bg-white px-8 py-3 rounded-full shadow-md">
            <h2 className="text-3xl font-bold text-pink-800 text-center">
              รายการสินค้าทั้งหมด
            </h2>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row justify-center items-center mb-10 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative w-full sm:w-80">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.313 0 6 2.687 6 6s-2.687 6-6 6-6-2.687-6-6 2.687-6 6-6z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom placeholder:text-gray-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-64 px-4 py-3 border-2 border-white rounded-full bg-white/50 focus:outline-none focus:ring-0 shadow-inner-custom text-gray-700"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Product Grid - ปรับให้เหลือ 5 คอลัมน์สูงสุด เพื่อเพิ่มพื้นที่การ์ด */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 text-xl py-12">
              ไม่พบสินค้าที่ตรงกับเงื่อนไข
            </div>
          ) : (
            products.map(product => {
                // *** Logic: ถ้าสต็อกเป็น 0 หรือน้อยกว่า 0 ให้ถือว่าหมด ***
                const isOutOfStock = product.stock_quantity <= 0;
                
                const productCard = (
                    <div className={`relative flex flex-col bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform ${isOutOfStock ? 'opacity-50' : 'hover:scale-105'}`}>
                        {isOutOfStock && (
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
                                <span className="text-white text-lg font-bold">สินค้าหมด</span>
                            </div>
                        )}
                        <img
                            src={`${BACKEND_URL}/${product.image_url_1}` || 'https://placehold.co/600x400/F5A6B4/FFFFFF?text=No+Image'}
                            alt={product.name}
                            className="w-full h-40 md:h-48 object-cover rounded-t-xl"
                        />
                        <div className="p-3 flex-grow flex flex-col justify-between">
                            <div className='flex-grow'>
                                {/* ปรับ: ขยายขนาดข้อความชื่อ และใช้ truncate น้อยลง */}
                                <h3 className="text-md md:text-lg font-semibold text-pink-800 mb-1 leading-tight line-clamp-2">{product.name}</h3>
                                
                                {/* 🌟 NEW: เพิ่มรายละเอียดสินค้าให้อ่านง่ายขึ้นเมื่อค้นหา 🌟 */}
                                {(product.size || product.chest) && (
                                    <div className="text-sm text-gray-600 mb-1">
                                        {product.size && <span>ขนาด: {product.size}</span>}
                                        {product.chest && <span> | อก: {product.chest}"</span>}
                                    </div>
                                )}
                                
                                {/* ใช้ formatNumberWithCommas สำหรับราคา */}
                                <p className="text-pink-600 font-bold text-lg mt-1">฿{formatNumberWithCommas(product.price)}</p>
                            </div>
                            
                            {!isOutOfStock && (
                                <button
                                    onClick={(e) => {
                                        // ป้องกันการนำทางของ Link
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        // นำทางไปยังหน้า Product Detail
                                        window.location.href = `/product/${product.id}`;
                                    }}
                                    className="w-full py-2 mt-3 bg-[#F75271] text-white font-bold rounded-full shadow-lg hover:bg-pink-700 transition-colors"
                                >
                                    <span className="flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                                            <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.75 3.75 0 0 0 3.694 2.46l4.243.084a3.75 3.75 0 0 0 3.694-2.46l2.558-9.592a.75.75 0 0 0-.362-.278h1.386a.75.75 0 0 0 0-1.5H2.25Zm0 1.5l.692 2.915a.75.75 0 0 0 1.488-.354L3.75 3.75h-.375ZM12 7.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 12 7.5Zm0 3a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Zm-5.25-3a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75ZM7.5 17.25a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 1 3 0Zm7.5 0a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                        </svg>
                                        เพิ่มลงในตะกร้า
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                );

                // สำหรับสินค้าที่หมดสต็อก ให้แสดงการ์ดอย่างเดียว (ไม่มี Link)
                if (isOutOfStock) {
                    return (
                        <div key={product.id} className="relative block">
                            {productCard}
                        </div>
                    );
                }

                return (
                    // สำหรับสินค้าที่มีสต็อก ให้คลิกที่การ์ดเพื่อไปยังหน้าสินค้า
                    <Link 
                        key={product.id} 
                        to={`/product/${product.id}`}
                        className="block"
                    >
                        {productCard}
                    </Link>
                );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;