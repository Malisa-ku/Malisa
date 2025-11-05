import React, { createContext, useContext, useState, useEffect } from 'react';

// สร้าง Context
const UserContext = createContext(null);

// สร้าง Hook เพื่อให้คอมโพเนนต์อื่น ๆ เรียกใช้ได้ง่าย
export const useUser = () => {
  return useContext(UserContext);
};

// สร้าง Provider ที่จะห่อหุ้ม App ทั้งหมด
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // อ่านข้อมูลผู้ใช้และโทเคนจาก Local Storage เมื่อโหลดหน้าเว็บครั้งแรก
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        // เก็บทั้งข้อมูลผู้ใช้และโทเคนไว้ใน state
        setUser({ ...userData, token: storedToken });
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        // หากข้อมูลเสียหาย ให้ลบข้อมูลทั้งหมดทิ้ง
        localStorage.removeItem('user'); 
        localStorage.removeItem('token');
      }
    }
  }, []);

  // ฟังก์ชัน login ที่รับข้อมูลผู้ใช้และโทเคนมาเก็บ
  const login = (userData, token) => {
    setUser({ ...userData, token });
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = { user, login, logout };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};