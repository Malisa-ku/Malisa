import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Import UserProvider และ useUser
import { UserProvider, useUser } from './contexts/UserContext';

// Import Layout Components
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import AdminSidebar from './pages/admin/components/AdminSidebar';
import AdminHeader from './pages/admin/components/AdminHeader'; 
import AdminFooter from './pages/admin/components/AdminFooter'; 

// Import all page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import BuyerDashboard from './pages/BuyerDashboard';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import MyOrdersPage from './pages/MyOrdersPage';
import SellerShop from './pages/SellerShop'; 
import ResetPasswordPage from './pages/ResetPasswordPage'; 

// === Seller Components ===
import SellerProductManagement from './pages/saller/SellerProductManagement';
import SellerOrderManagement from './pages/saller/SellerOrderManagement';
import SalesReport from './pages/saller/SalesReport';
import SellerDashboard from './pages/saller/SellerDashboard';
import SellerComplaintsPage from './pages/saller/SellerComplaintsPage';
import SellerWarningHistory from './pages/saller/SellerWarningHistory';
// 💡 CRITICAL FIX: ใช้พาธนี้สำหรับการ Import OrderDetails (สมมติว่าไฟล์อยู่ใน pages/saller/)
import OrderDetails from './pages/saller/OrderDetails';


// === Admin Components ===
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminReportUser from './pages/admin/AdminReportUser';
import AdminReportHistory from './pages/admin/AdminReportHistory';
import AdminComplaint from './pages/admin/AdminComplaint';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProblemReport from './pages/admin/AdminProblemReport';
import AdminWarningList from './pages/admin/AdminWarningList';
import AdminBannedSellers from './pages/admin/AdminBannedSellers';
import AdminWarningHistory from './pages/admin/AdminWarningHistory';


// Placeholder components for the new routes to prevent errors
const AllProductsPage = () => <div className="p-8 text-center text-xl">หน้าสินค้าทั้งหมด</div>;

// PrivateRoute component ที่แก้ไขแล้ว
const PrivateRoute = ({ children, roles }) => {
  // ดึง user จาก context
  const { user } = useUser();

  // หากไม่มี user ใน context แสดงว่ายังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ตรวจสอบสิทธิ์ (role)
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />; // ส่งกลับไปหน้าหลักหากไม่มีสิทธิ์
  }

  return children;
};

// The main application layout
function MainApp() {
  const location = useLocation();
  // ปรับเส้นทาง /forgot-password และ /reset-password ให้เป็นหน้า Authentication
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/admin/login') || location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password');
  
  const { user } = useUser();
  const headerKey = user ? user.role : 'loggedOut';

  // เพิ่มเงื่อนไขเพื่อเลือกแสดง Sidebar ที่ถูกต้อง
  const renderSidebar = () => {
    if (!user) {
      return null;
    }
    return user.role === 'admin' ? <AdminSidebar /> : <Sidebar />;
  };

  // เพิ่มเงื่อนไขเพื่อเลือกแสดง Header ที่ถูกต้อง
  const renderHeader = () => {
    if (isAuthPage) {
      return null;
    }
    return user && user.role === 'admin' ? <AdminHeader key={headerKey} /> : <Header key={headerKey} />;
  };

  // เพิ่มเงื่อนไขเพื่อเลือกแสดง Footer ที่ถูกต้อง
  const renderFooter = () => {
    if (isAuthPage) {
      return null;
    }
    return user && user.role === 'admin' ? <AdminFooter /> : <Footer />;
  };

  return (
    <div className="flex flex-col min-h-screen">
      {renderHeader()}
      <div className="flex flex-1">
        {!isAuthPage && renderSidebar()}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/HomePage" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* แก้ไข: ใช้คอมโพเนนต์ ResetPasswordPage สำหรับทั้งสองเส้นทาง */}
            <Route path="/forgot-password" element={<ResetPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            
            <Route path="/products" element={<AllProductsPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/seller/:sellerId" element={<SellerShop />} />
            
            {/* Public Routes for all logged-in users */}
            <Route path="/profile/:userId" element={<PrivateRoute><ProfilePage/></PrivateRoute>} />
            <Route path="/cart" element={<PrivateRoute><CartPage /></PrivateRoute>} />
            <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
            
            {/* Buyer Routes */}
            <Route path="/profile/:userId" element={<PrivateRoute><ProfilePage/></PrivateRoute>} />
            <Route path="/buyer-dashboard" element={<PrivateRoute roles={['buyer']}><BuyerDashboard /></PrivateRoute>} />
            <Route path="/my-orders" element={<PrivateRoute roles={['buyer']}><MyOrdersPage /></PrivateRoute>} />
            
            {/* 💡 NEW: Routes สำหรับการแจ้งปัญหาและการติดตามปัญหา */}
            <Route path="/report-problem" element={<PrivateRoute roles={['buyer']}><ProblemDetailPage /></PrivateRoute>} />
            <Route path="/problem-detail/:problemId" element={<PrivateRoute roles={['buyer']}><ProblemDetailPage /></PrivateRoute>} />
            
            {/* Seller Routes */}
            <Route path="/profile/:userId" element={<PrivateRoute><ProfilePage/></PrivateRoute>} />
            <Route path="/seller-dashboard" element={<PrivateRoute roles={['seller']}><SellerDashboard /></PrivateRoute>} />
            <Route path="/seller/SellerProductManagement" element={<PrivateRoute roles={['seller']}><SellerProductManagement /></PrivateRoute>} />
            <Route path="/seller/orders" element={<PrivateRoute roles={['seller']}><SellerOrderManagement /></PrivateRoute>} />
            
            {/* 💡 CRITICAL FIX: เพิ่ม Route สำหรับ Order Details ของผู้ขาย */}
            <Route 
                path="/seller/orders/:orderId" 
                element={<PrivateRoute roles={['seller']}><OrderDetails /></PrivateRoute>} 
            />

            <Route path="/seller/reports" element={<PrivateRoute roles={['seller']}><SalesReport /></PrivateRoute>} />
            <Route path="/seller/SellerComplaintsPage" element={<PrivateRoute roles={['seller']}><SellerComplaintsPage /></PrivateRoute>} />
            <Route path="/seller/warning-history" element={<PrivateRoute roles={['seller']}><SellerWarningHistory /></PrivateRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<PrivateRoute roles={['admin']}><AdminDashboardPage /></PrivateRoute>} />
            
            {/* Admin User Management routes */}
            <Route path="/admin/pending-sellers" element={<PrivateRoute roles={['admin']}><AdminUserManagement /></PrivateRoute>} />
            <Route path="/admin/manage-sellers" element={<PrivateRoute roles={['admin']}><AdminUserManagement /></PrivateRoute>} />
            <Route path="/admin/warning-list" element={<PrivateRoute roles={['admin']}><AdminWarningList /></PrivateRoute>} />
            <Route path="/admin/banned-sellers" element={<PrivateRoute roles={['admin']}><AdminBannedSellers /></PrivateRoute>} />
            
            {/* Admin Report routes */}
            <Route path="/admin/report-users" element={<PrivateRoute roles={['admin']}><AdminReportUser /></PrivateRoute>} />
            <Route path="/admin/problems" element={<PrivateRoute roles={['admin']}><AdminProblemReport /></PrivateRoute>} />
            <Route path="/admin/complaints" element={<PrivateRoute roles={['admin']}><AdminComplaint /></PrivateRoute>} />
            <Route path="/admin/warnings-history" element={<PrivateRoute roles={['admin']}><AdminWarningHistory /></PrivateRoute>} />
            
            <Route path="/admin/Settings" element={<PrivateRoute roles={['admin']}><AdminSettings /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
      {renderFooter()}
    </div>
  );
}

// The main App component that wraps the entire application with Router and UserProvider
function App() {
  return (
    <Router>
      <UserProvider>
        <MainApp />
      </UserProvider>
    </Router>
  );
}

export default App;
