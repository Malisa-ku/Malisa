import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import { PlusCircle, Edit, Trash2, XCircle, ShoppingBag, Loader, ArrowLeft, Image } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money & Specs) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return '-';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

/**
 * Custom Message Box component (instead of alert and confirm)
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.text
 * @param {function} props.onClose - The function to call when the user clicks "OK" or "Cancel"
 * @param {function} [props.onConfirm] - Optional function to call on "Confirm"
 * @param {boolean} [props.showConfirmButton=false] - Optional prop to show a confirmation button
 * @returns {JSX.Element}
 */
const MessageBox = ({ title, text, onClose, onConfirm, showConfirmButton = false }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[99]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-105">
                <h2 className="text-xl font-bold mb-2 text-pink-600">{title}</h2>
                <p className="text-gray-700 mb-6">{text}</p>
                <div className="flex justify-center space-x-4">
                    {showConfirmButton && (
                        <button
                            onClick={onConfirm}
                            className="bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 hover:bg-red-600"
                        >
                            ยืนยัน
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 ${showConfirmButton ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
                    >
                        {showConfirmButton ? 'ยกเลิก' : 'ตกลง'}
                    </button>
                </div>
            </div>
        </div>
    );
};

function SellerProductManagement() {
    const { user } = useUser();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formInput, setFormInput] = useState({
        name: '',
        price: '',
        description: '',
        category_id: '',
        size: '',
        chest: '',
        waist: '',
        hip: '',
        length: '',
        // กำหนดค่าเริ่มต้นเป็น 1
        stock_quantity: 1, 
    });
    const [imagesToUpload, setImagesToUpload] = useState([]); 
    const [existingImages, setExistingImages] = useState([]); 
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchProducts = useCallback(async () => {
        if (!user || !user.token) {
            setLoading(false);
            setError('คุณต้องเข้าสู่ระบบในฐานะผู้ขายเพื่อจัดการสินค้า');
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/api/sellers/products`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setProducts(response.data.products);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลสินค้าได้ โปรดลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sellers/categories`);
            setCategories(response.data.categories);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormInput(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setImagesToUpload(prev => [...prev, ...newFiles]);
        e.target.value = null;
    };

    const handleRemoveImage = (indexToRemove, isExisting) => {
        if (isExisting) {
            setExistingImages(prev => prev.filter((_, index) => index !== indexToRemove));
        } else {
            setImagesToUpload(prev => prev.filter((_, index) => index !== indexToRemove));
        }
    };

    const handleAddProductClick = () => {
        setCurrentProduct(null);
        setFormInput({
            name: '',
            price: '',
            description: '',
            category_id: '',
            size: '',
            chest: '',
            waist: '',
            hip: '',
            length: '',
            // กำหนดค่าเริ่มต้นเป็น 1 และถูกล็อค
            stock_quantity: 1, 
        });
        setImagesToUpload([]);
        setExistingImages([]);
        setShowForm(true);
    };

    const handleEditProductClick = (product) => {
        setCurrentProduct(product);
        setFormInput({
            name: product.name,
            price: product.price,
            description: product.description,
            category_id: product.category_id || '',
            size: product.size || '',
            chest: product.chest || '',
            waist: product.waist || '',
            hip: product.hip || '',
            length: product.length || '',
            // ใช้ stock_quantity จาก product เดิม (0 หรือ 1) แต่จะถูกล็อคในฟอร์ม
            stock_quantity: product.stock_quantity, 
        });
        
        const existingUrls = [];
        for (let i = 1; i <= 5; i++) {
            if (product[`image_url_${i}`]) {
                existingUrls.push(product[`image_url_${i}`]);
            }
        }
        setExistingImages(existingUrls);
        setImagesToUpload([]);
        setShowForm(true);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError(null);

        const formData = new FormData();
        
        // **สำคัญ:** หากเป็นการเพิ่มสินค้าใหม่/แก้ไขสินค้าที่มี stock เป็น 0 ให้บังคับส่งค่า 1 
        // หรือคงค่าเดิมไว้ (stock_quantity ถูกล็อคในฟอร์มแล้ว)
        // สำหรับการเพิ่มสินค้าใหม่ เราส่งค่า 1 ตาม state เริ่มต้น
        // สำหรับการแก้ไขสินค้า เราใช้ค่าที่โหลดมา (0 หรือ 1)
        formData.append('stock_quantity', parseInt(formInput.stock_quantity, 10));


        // Append required fields
        if (formInput.name) formData.append('name', formInput.name);
        if (formInput.price !== '') formData.append('price', parseFloat(formInput.price));
        if (formInput.category_id) formData.append('category_id', formInput.category_id);
        
        // Append optional fields only if they have a value
        if (formInput.description) formData.append('description', formInput.description);
        if (formInput.size) formData.append('size', formInput.size);
        if (formInput.chest !== '') formData.append('chest', parseFloat(formInput.chest));
        if (formInput.waist !== '') formData.append('waist', parseFloat(formInput.waist));
        if (formInput.hip !== '') formData.append('hip', parseFloat(formInput.hip));
        if (formInput.length !== '') formData.append('length', parseFloat(formInput.length));

        // ✅ เพิ่มรูปภาพใหม่ที่เลือกทั้งหมดลงใน FormData
        imagesToUpload.forEach((file, index) => {
            formData.append(`image_url_${existingImages.length + index + 1}`, file);
        });

        // ✅ เพิ่ม URL ของรูปภาพเดิมที่ยังคงอยู่
        formData.append('existing_images', JSON.stringify(existingImages));

        try {
            if (currentProduct) {
                await axios.put(`${API_BASE_URL}/api/sellers/products/${currentProduct.id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                setMessage({ 
                title: 'สำเร็จ', 
                text: 'อัปเดตสินค้าเรียบร้อยแล้ว', 
                onClose: () => { 
                    setMessage(null); 
                    fetchProducts(); 
                }
            });
            } else {
                await axios.post(`${API_BASE_URL}/api/sellers/products`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                setMessage({ 
                title: 'สำเร็จ', 
                text: 'เพิ่มสินค้าใหม่เรียบร้อยแล้ว', 
                onClose: () => { 
                    setMessage(null); 
                    fetchProducts(); 
                }
            });
            }
            setShowForm(false);
        } catch (err) {
            console.error('Error submitting form:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteProduct = (productId) => {
        setMessage({
            title: 'ยืนยันการลบ',
            text: 'คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?',
            onClose: () => setMessage(null),
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/api/sellers/products/${productId}`, {
                        headers: { Authorization: `Bearer ${user.token}` }
                    });
                    setMessage({ title: 'สำเร็จ', text: 'ลบสินค้าเรียบร้อยแล้ว', onClose: () => { setMessage(null); fetchProducts(); } });
                } catch (err) {
                    console.error('Error deleting product:', err);
                    setMessage({ title: 'ผิดพลาด', text: err.response?.data?.message || 'ไม่สามารถลบสินค้าได้', onClose: () => setMessage(null) });
                }
            },
            showConfirmButton: true
        });
    };

    const allImages = [...existingImages, ...imagesToUpload.map(file => URL.createObjectURL(file))];

    return (
        <div className="min-h-screen bg-[#FCECF0] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">
                        <ShoppingBag className="inline-block mr-2 text-pink-600" size={28} />
                        จัดการสินค้า
                    </h2>
                    <button
                        onClick={handleAddProductClick}
                        className="bg-white hover:bg-gray-100 text-pink-600 font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center shadow"
                    >
                        <PlusCircle className="mr-2" size={20} />
                        เพิ่มสินค้า
                    </button>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader className="animate-spin text-pink-600" size={40} />
                            <p className="ml-4 text-gray-500 text-lg">กำลังโหลดสินค้า...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-20">
                            <p>{error}</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">
                            <p>คุณยังไม่มีสินค้าในร้าน</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transform transition-transform duration-300 hover:scale-105">
                                    <div className="relative">
                                        {/* แสดงรูปภาพแรกของสินค้า */}
                                        {product.image_url_1 ? (
                                            <img
                                                src={`${API_BASE_URL}/${product.image_url_1}`}
                                                alt={product.name}
                                                className="w-full h-48 object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                                <Image size={48} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex space-x-1">
                                            <button
                                                onClick={() => handleEditProductClick(product)}
                                                className="bg-white p-1 rounded-full text-gray-600 hover:text-pink-600 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="bg-white p-1 rounded-full text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                                        {/* ใช้ formatNumberWithCommas สำหรับราคา */}
                                        <p className="text-lg font-bold text-pink-600 mt-1">{formatNumberWithCommas(product.price)} บาท</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {/* แสดงสถานะสินค้า: ถ้า stock_quantity เป็น 0 ถือว่าสินค้าหมดแล้ว */}
                                            {product.stock_quantity > 0 ? (
                                                <span className="text-green-600">สินค้าพร้อมจำหน่าย (1)</span>
                                            ) : (
                                                <span className="text-red-500">สินค้าหมดแล้ว</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-[#FCECF0] flex flex-col items-center justify-start p-4 md:p-8 z-50">
                        {/* Modal Header */}
                        <div className="w-full max-w-2xl flex items-center mb-6">
                            <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-800 transition-colors mr-4">
                                <ArrowLeft size={28} />
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800">{currentProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
                        </div>
                        
                        <div className="bg-white rounded-xl p-8 w-full max-w-2xl relative shadow-md overflow-y-auto max-h-[80vh]">
                            <form onSubmit={handleSubmitForm} className="space-y-6">
                                {/* Image Upload Section */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">รูปภาพสินค้า <span className="text-red-500">*</span></label>
                                    <p className="text-sm text-gray-500 mb-2">(แนบได้สูงสุด 5 รูปภาพ)</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {/* Display all images (existing and new) */}
                                        {allImages.map((image, index) => (
                                            <div key={index} className="relative border-2 border-gray-300 rounded-lg overflow-hidden h-32 w-full">
                                                <img 
                                                    src={image.startsWith('blob:') ? image : `${API_BASE_URL}/${image}`} 
                                                    alt={`Product Image ${index + 1}`} 
                                                    className="w-full h-full object-cover" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index, index < existingImages.length)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Add more image button */}
                                        {allImages.length < 5 && (
                                            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 transition-colors h-32 w-full flex items-center justify-center">
                                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer">
                                                    <PlusCircle size={32} className="text-gray-400" />
                                                    <span className="text-sm text-gray-500 mt-2">เพิ่มรูปภาพ</span>
                                                    <input
                                                        type="file"
                                                        id="image-upload"
                                                        onChange={handleFileChange}
                                                        accept="image/*"
                                                        multiple 
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Fields Section */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-1">ชื่อสินค้า <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formInput.name}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-1">รายละเอียดสินค้า <span className="text-red-500">*</span></label>
                                        <textarea
                                            name="description"
                                            value={formInput.description}
                                            onChange={handleFormChange}
                                            rows="3"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                            required
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-1">ราคา <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formInput.price}
                                            onChange={handleFormChange}
                                            step="0.01"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {/* Product Specs Section */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">คุณสมบัติสินค้า (หน่วยเป็น นิ้ว)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <input type="text" name="size" value={formInput.size} onChange={handleFormChange} placeholder="SIZE" className="w-full px-4 py-2 border rounded-lg" />
                                        <input type="number" name="chest" value={formInput.chest} onChange={handleFormChange} placeholder="รอบอก" step="0.01" className="w-full px-4 py-2 border rounded-lg" />
                                        <input type="number" name="waist" value={formInput.waist} onChange={handleFormChange} placeholder="เอว" step="0.01" className="w-full px-4 py-2 border rounded-lg" />
                                        <input type="number" name="hip" value={formInput.hip} onChange={handleFormChange} placeholder="สะโพก" step="0.01" className="w-full px-4 py-2 border rounded-lg" />
                                        <input type="number" name="length" value={formInput.length} onChange={handleFormChange} placeholder="ความยาว" step="0.01" className="w-full px-4 py-2 border rounded-lg" />
                                        
                                        {/* *** แก้ไข: ล็อค Stock Quantity ให้เป็น 1 และอ่านอย่างเดียว *** */}
                                        <div className="md:col-span-1">
                                            <label className="block text-gray-700 font-semibold mb-1 text-sm">จำนวนสินค้า (ล็อค)</label>
                                            <input 
                                                type="number" 
                                                name="stock_quantity" 
                                                value={formInput.stock_quantity} 
                                                onChange={handleFormChange} 
                                                placeholder="1" 
                                                className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                                required
                                                readOnly // ล็อคไม่ให้แก้ไข
                                            />
                                        </div>
                                        {/* ****************************************************** */}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        * ระบบกำหนดให้จำนวนสินค้าเป็น **1 ชิ้น** เสมอ หากมีผู้ซื้อสินค้าชิ้นนี้ไปแล้ว ระบบจะถือว่าสินค้า **หมดแล้ว**
                                    </p>
                                </div>
                                
                                {/* Category Section */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">หมวดหมู่สินค้า <span className="text-red-500">*</span></label>
                                    <select
                                        name="category_id"
                                        value={formInput.category_id}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    >
                                        <option value="" disabled>เลือกประเภทสินค้า</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {error && <p className="text-red-500 text-center">{error}</p>}

                                {/* Buttons Section */}
                                <div className="flex justify-end space-x-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg transition duration-300"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className={`py-2 px-6 rounded-lg font-bold transition duration-300 ${
                                            formLoading ? 'bg-pink-300 text-white cursor-not-allowed' : 'bg-pink-500 hover:bg-pink-600 text-white'
                                        }`}
                                    >
                                        {formLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            {message && (
                <MessageBox
                    title={message.title}
                    text={message.text}
                    onClose={message.onClose}
                    onConfirm={message.onConfirm}
                    showConfirmButton={message.showConfirmButton}
                />
            )}
        </div>
    );
}

export default SellerProductManagement;