import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:3000';

// ***************************************************************
// ** Helper Function: Format Number with Comma (for Money) **
// ***************************************************************
const formatNumberWithCommas = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    // ใช้ 'en-US' เพื่อให้แสดงคอมม่าสำหรับหลักพัน และกำหนดทศนิยม 2 ตำแหน่ง
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

// ***************************************************************
// ** NEW: Helper Function to Dispatch Cart Update Event **
// ***************************************************************
const dispatchCartUpdateEvent = () => {
    // ยิง Custom Event 'cartUpdated' เพื่อแจ้งเตือน Header ให้คำนวณจำนวนสินค้าใหม่
    window.dispatchEvent(new Event('cartUpdated'));
};


function CartPage() {
  const [cart, setCart] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedItems, setSelectedItems] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // ดึงข้อมูลตะกร้าสินค้าจาก localStorage
    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    const cleanedCart = storedCart.map(item => ({
      ...item,
      price: parseFloat(item.price)
    }));
    setCart(cleanedCart);

    // เช็คว่ามีรายการสินค้าที่ถูกเลือกจาก sessionStorage ที่ยังค้างอยู่หรือไม่
    const storedCheckoutItems = JSON.parse(sessionStorage.getItem('checkoutItems')) || [];
    const initialSelection = cleanedCart.reduce((acc, item) => {
      // ตรวจสอบว่าสินค้าปัจจุบันอยู่ในรายการที่กำลังจะชำระเงินหรือไม่
      const isSelectedForCheckout = storedCheckoutItems.some(checkoutItem => checkoutItem.id === item.id);
      acc[item.id] = isSelectedForCheckout;
      return acc;
    }, {});

    // หากไม่มีสินค้าที่เลือกมาก่อน ให้เลือกทั้งหมดเป็นค่าเริ่มต้น
    if (Object.keys(initialSelection).every(key => initialSelection[key] === false)) {
        cleanedCart.forEach(item => {
            initialSelection[item.id] = true;
        });
    }

    setSelectedItems(initialSelection);
    
    calculateTotalPrice(cleanedCart, initialSelection);
    // 💡 ควรแจ้งเตือน Header ให้ดึงข้อมูลตะกร้าล่าสุดเมื่อ Component โหลด
    dispatchCartUpdateEvent(); 
  }, []);

  useEffect(() => {
    calculateTotalPrice(cart, selectedItems);
  }, [cart, selectedItems]);

  const calculateTotalPrice = (items, selection) => {
    const total = items.reduce((sum, item) => {
      if (selection[item.id]) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
    setTotalPrice(total);
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    const updatedCart = cart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: quantity };
      }
      return item;
    });
    
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    // 📢 แจ้งเตือน Header เมื่อมีการเปลี่ยนแปลงจำนวน
    dispatchCartUpdateEvent();
  };

  const handleRemoveItem = (productId) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));

    const updatedSelection = { ...selectedItems };
    delete updatedSelection[productId];
    setSelectedItems(updatedSelection);
    
    // 📢 แจ้งเตือน Header เมื่อมีการลบสินค้า
    dispatchCartUpdateEvent();
  };

  const handleToggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const newSelection = cart.reduce((acc, item) => {
      acc[item.id] = isChecked;
      return acc;
    }, {});
    setSelectedItems(newSelection);
  };

  const handleToggleSelectItem = (productId) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleCheckout = () => {
    const itemsToCheckout = cart.filter(item => selectedItems[item.id]);
    if (itemsToCheckout.length > 0) {
      sessionStorage.setItem('checkoutItems', JSON.stringify(itemsToCheckout));
      navigate('/checkout');
    } else {
      alert('กรุณาเลือกสินค้าที่คุณต้องการชำระเงิน');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const allSelected = cart.length > 0 && cart.every(item => selectedItems[item.id]);
  const hasSelectedItems = cart.some(item => selectedItems[item.id]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 flex items-start justify-center">
      <div className="w-full max-w-4xl mt-12">
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 flex items-center text-pink-700 hover:text-pink-900 font-semibold"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          กลับ
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-10">
          <h2 className="text-3xl font-bold text-pink-700 mb-6 flex items-center">
            <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            ตะกร้าสินค้า
          </h2>

          {cart.length === 0 ? (
            <div className="text-center text-gray-500 text-xl p-8 border rounded-lg bg-pink-50">
              ตะกร้าสินค้าของคุณว่างเปล่า
            </div>
          ) : (
            <div>
              {/* Select All Checkbox */}
              <div className="flex items-center mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-pink-600 rounded mr-3"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                />
                <span className="text-pink-800 font-semibold">เลือกทั้งหมด</span>
              </div>

              {/* Cart Items List */}
              <ul className="space-y-4 mb-8">
                {cart.map(item => (
                  <li key={item.id} className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-pink-100">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-pink-600 rounded mr-4 flex-shrink-0"
                      checked={selectedItems[item.id] || false}
                      onChange={() => handleToggleSelectItem(item.id)}
                    />
                    <img 
                      src={`${BACKEND_URL}/${item.image_url_1}` || 'https://placehold.co/80x80?text=No+Image'} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded-lg mr-4 flex-shrink-0"
                    />
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                                ขนาด: {item.size || 'F'} 
                                {item.chest && ` | อก: ${item.chest}"`}
                                {item.waist && ` | เอว: ${item.waist}"`}
                            </p>
                            {/* ใช้ formatNumberWithCommas สำหรับราคาต่อหน่วย */}
                            <p className="text-sm text-gray-600">ราคา: {formatNumberWithCommas(item.price)} บาท</p>
                        </div>
                        <div className="flex items-center justify-start md:justify-end mt-2 md:mt-0 space-x-3">
                            <label htmlFor={`quantity-${item.id}`} className="sr-only">จำนวน</label>
                            <input
                              id={`quantity-${item.id}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                              className="w-20 text-center border border-gray-300 rounded-lg px-2 py-1 text-gray-700 focus:ring-pink-500 focus:border-pink-500"
                            />
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition duration-200 p-2 rounded-full hover:bg-red-50"
                              aria-label={`ลบ ${item.name}`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Summary and Action Buttons */}
              <div className="bg-pink-50 p-6 rounded-lg shadow-inner flex flex-col items-end">
                <div className="w-full max-w-sm text-right space-y-2 mb-6">
                  {cart.filter(item => selectedItems[item.id]).map(item => (
                    <p key={`summary-${item.id}`} className="text-gray-700">
                      {item.name} ({item.quantity} ชิ้น): <span className="font-medium">{ formatNumberWithCommas(item.price * item.quantity) } บาท</span>
                    </p>
                  ))}
                  <p className="text-gray-700 font-semibold border-t pt-2 border-pink-300">
                    ยอดรวมสินค้า: <span className="text-xl text-pink-700">{ formatNumberWithCommas(totalPrice) } บาท</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full max-w-sm justify-end">
                  <button
                    onClick={handleCheckout}
                    disabled={!hasSelectedItems}
                    className={`w-full sm:w-auto py-3 px-6 rounded-lg font-bold transition duration-300 transform hover:scale-105
                      ${hasSelectedItems ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-pink-200 text-pink-800 cursor-not-allowed'}
                    `}
                  >
                    ชำระเงิน
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartPage;