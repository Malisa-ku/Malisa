const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt'); // สำหรับการเปรียบเทียบรหัสผ่าน

// Middleware to authenticate and authorize for Admin role
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
        req.user = user;
        next();
    });
};

// ===========================================
// File upload configurations using Multer
// ===========================================
const uploadDir = 'uploads/logo';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|svg/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('File upload only supports the following filetypes: ' + filetypes));
    }
});

// ===========================================
// NEW: API endpoints for Authentication
// ===========================================
// Admin login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // สร้าง Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token หมดอายุใน 1 ชั่วโมง
        );

        res.status(200).json({ message: 'Login successful!', token });

    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// ===========================================
// API endpoints for Admin Dashboard
// ===========================================

// === 1. User Management ===
// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, profile_name, full_name, email, role, created_at, status FROM users ORDER BY created_at DESC');
        res.status(200).json({ message: 'List of all users.', users: rows });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// *** ENDPOINT: Get list of sellers with pending shop name changes ***
router.get('/users/pending-name-change', authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                id, profile_name, pending_profile_name, profile_name_status, full_name, email, role, status
            FROM users
            WHERE role = 'seller'
              AND profile_name_status = 'pending_approval'
              AND pending_profile_name IS NOT NULL
            ORDER BY created_at ASC
        `;
        const [rows] = await db.query(query);
        res.status(200).json({ message: 'List of sellers with pending name change requests.', users: rows });
    } catch (err) {
        console.error('Error fetching pending name changes:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// *** ENDPOINT: Approve Shop Name Change ***
router.put('/users/:id/approve-name-change', authenticateAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. ดึงชื่อใหม่ที่รอดำเนินการ
        const [userRows] = await connection.query(
            'SELECT pending_profile_name FROM users WHERE id = ? AND profile_name_status = "pending_approval"', 
            [userId]
        );

        if (userRows.length === 0 || !userRows[0].pending_profile_name) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pending name change request not found or already processed.' });
        }
        
        const newName = userRows[0].pending_profile_name;

        // 2. อัปเดต profile_name ด้วยชื่อใหม่ และรีเซ็ตสถานะ/ชื่อที่รอดำเนินการ
        const [result] = await connection.query(
            'UPDATE users SET profile_name = ?, pending_profile_name = NULL, profile_name_status = "approved" WHERE id = ?',
            [newName, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        await connection.commit();
        res.status(200).json({ message: `Shop name successfully changed to ${newName}.` });

    } catch (err) {
        await connection.rollback();
        console.error('Error approving shop name change:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// *** ENDPOINT: Cancel Shop Name Change ***
router.put('/users/:id/cancel-name-change', authenticateAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { reason } = req.body; 

    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }
    
    // 1. รีเซ็ตสถานะ profile_name_status และล้าง pending_profile_name
    try {
        const [result] = await db.query(
            'UPDATE users SET pending_profile_name = NULL, profile_name_status = "approved" WHERE id = ? AND profile_name_status = "pending_approval"',
            [userId]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: `Shop name change request cancelled. Reason logged: ${reason || 'No reason provided'}.` });
        } else {
            res.status(404).json({ message: 'Pending name change request not found or already processed.' });
        }
    } catch (err) {
        console.error('Error cancelling shop name change:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Get a list of sellers who have received 3 or more warnings
router.get('/bannable-sellers', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                u.id, u.profile_name, u.email, COUNT(w.id) as warning_count
            FROM users u
            JOIN warnings w ON u.id = w.seller_id
            WHERE u.role = 'seller'
            GROUP BY u.id
            HAVING warning_count >= 3
            ORDER BY warning_count DESC
        `);
        res.status(200).json({ message: 'List of bannable sellers.', bannableSellers: rows });
    } catch (err) {
        console.error('Error fetching bannable sellers:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get a list of banned sellers
router.get('/banned-sellers', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                id, profile_name, email, created_at, status
            FROM users
            WHERE status = 'ถูกระงับ'
            ORDER BY created_at DESC
        `);
        res.status(200).json({ message: 'List of banned sellers.', bannedSellers: rows });
    } catch (err) {
        console.error('Error fetching banned sellers:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update a user's status and/or role
router.put('/users/:id/status', authenticateAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { status, role } = req.body;
    
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }
    
    if (!status && !role) {
        return res.status(400).json({ message: 'Status or role is required.' });
    }

    try {
        let query = 'UPDATE users SET ';
        const params = [];
        
        if (status) {
            query += 'status = ?';
            params.push(status);
        }
        
        if (role) {
            if (params.length > 0) {
                query += ', ';
            }
            query += 'role = ?';
            params.push(role);
        }
        
        query += ' WHERE id = ?';
        params.push(userId);
        
        const [result] = await db.query(query, params);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'User status and/or role updated successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error updating user status/role:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a user
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }
    
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'User deleted successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 2. Problem Report Management (สำหรับหน้า AdminReportHistory) ===
// Get all problems and join with users and orders for seller_name and order details
router.get('/problems', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id, p.description, p.status, p.reported_at, p.problem_type, p.image_url,
                o.id AS order_id, o.buyer_id, o.seller_id,
                u.profile_name AS buyer_name,
                s.profile_name AS seller_name
            FROM problems p
            JOIN orders o ON p.order_id = o.id
            JOIN users u ON o.buyer_id = u.id
            JOIN users s ON o.seller_id = s.id
            ORDER BY p.reported_at DESC
        `);
        // ส่ง Array ของข้อมูลกลับไปในรูปแบบ object
        res.status(200).json({ problems: rows });
    } catch (err) {
        console.error('Error fetching problems:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update a problem's status
router.put('/problems/:id/status', authenticateAdmin, async (req, res) => {
    const problemId = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(problemId) || !status) {
        return res.status(400).json({ message: 'Invalid problem ID or status.' });
    }
    
    try {
        const [result] = await db.query('UPDATE problems SET status = ? WHERE id = ?', [status, problemId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Problem status updated successfully.' });
        } else {
            res.status(404).json({ message: 'Problem not found.' });
        }
    } catch (err) {
        console.error('Error updating problem status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a problem report
router.delete('/problems/:id', authenticateAdmin, async (req, res) => {
    const problemId = parseInt(req.params.id);
    if (isNaN(problemId)) {
        return res.status(400).json({ message: 'Invalid Problem ID.' });
    }
    
    try {
        const [result] = await db.query('DELETE FROM problems WHERE id = ?', [problemId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Problem report deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Problem report not found.' });
        }
    } catch (err) {
        console.error('Error deleting problem report:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 3. Complaint Management (สำหรับหน้า AdminComplaint) ===
// Get all complaints
router.get('/complaints', authenticateAdmin, async (req, res) => {
    try {
        // *** 🚨 การแก้ไขที่จำเป็น: JOIN users เพื่อดึง Full Name ***
        const [rows] = await db.query(`
            SELECT
                c.id, c.order_id, c.description, c.created_at,
                c.seller_name, /* ชื่อร้านค้าถูกเก็บไว้ในตาราง complaints */
                u.full_name, /* <--- ดึงชื่อผู้ขาย (Full Name) จากตาราง users */
                u.status AS user_status /* <--- ดึงสถานะผู้ขาย */
            FROM complaints c
            JOIN orders o ON c.order_id = o.id
            JOIN users u ON o.seller_id = u.id /* เชื่อมโยงผ่าน order ไปยัง user เพื่อดึง full_name */
            ORDER BY c.created_at DESC
        `);
        // ส่ง Array ของข้อมูลกลับไปในรูปแบบ object
        res.status(200).json({ complaints: rows });
    } catch (err) {
        console.error('Error fetching complaints:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a complaint
router.delete('/complaints/:id', authenticateAdmin, async (req, res) => {
    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
        return res.status(400).json({ message: 'Invalid Complaint ID.' });
    }
    
    try {
        const [result] = await db.query('DELETE FROM complaints WHERE id = ?', [complaintId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Complaint deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Complaint not found.' });
        }
    } catch (err) {
        console.error('Error deleting complaint:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 4. Warning Management (NEW) ===
// Get all warnings
router.get('/warnings', authenticateAdmin, async (req, res) => {
    try {
        // *** 🚨 การแก้ไขที่จำเป็น: เพิ่มการ SELECT u.status AS user_status ***
        const [rows] = await db.query(`
            SELECT
                w.id, w.message, w.created_at, w.warning_count, w.appeal_status, w.appeal_details, w.order_id,
                u.id AS seller_id, 
                u.full_name, /* ชื่อผู้ขายจริง */
                u.email, 
                u.profile_name AS seller_name, /* ชื่อร้านค้า */
                u.status AS user_status /* <--- สถานะผู้ใช้ (เพื่อการกรอง/แสดงสถานะถูกระงับ) */
            FROM warnings w
            JOIN users u ON w.seller_id = u.id
            ORDER BY w.created_at DESC
        `);
        res.status(200).json({ warnings: rows });
    } catch (err) {
        console.error('Error fetching warnings:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/warnings', authenticateAdmin, async (req, res) => {
    // แก้ไข: เปลี่ยนชื่อตัวแปรที่รับจาก req.body ให้ตรงกับ frontend
    const { seller_id, message, warning_count } = req.body;

    if (!seller_id || !message || !warning_count) {
        return res.status(400).json({ message: 'Seller ID, message, and warning count are required.' });
    }

    try {
        // Verify that the seller_id exists
        const [userRows] = await db.query('SELECT id FROM users WHERE id = ?', [seller_id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        const [result] = await db.query(
            'INSERT INTO warnings (seller_id, message, warning_count, created_at) VALUES (?, ?, ?, NOW())',
            [seller_id, message, warning_count]
        );

        res.status(201).json({ message: 'Warning sent successfully!', warningId: result.insertId });
    } catch (err) {
        console.error('Error sending warning:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a warning
router.delete('/warnings/:id', authenticateAdmin, async (req, res) => {
    const warningId = parseInt(req.params.id);
    if (isNaN(warningId)) {
        return res.status(400).json({ message: 'Invalid Warning ID.' });
    }

    try {
        const [result] = await db.query('DELETE FROM warnings WHERE id = ?', [warningId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Warning deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Warning not found.' });
        }
    } catch (err) {
        console.error('Error deleting warning:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 5. Product Management ===
// Get all products
router.get('/products', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id, p.name, p.price, p.stock_quantity, p.image_url_1, p.created_at,
                u.profile_name AS seller_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.status(200).json({ message: 'List of all products.', products: rows });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a product
router.delete('/products/:id', authenticateAdmin, async (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
    }
    
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [productId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Product deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Product not found.' });
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 6. Order Management ===
// Get all orders
router.get('/orders', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                o.id, o.total_price, o.status, o.created_at, o.payment_slip_url,
                u_buyer.profile_name AS buyer_name,
                u_seller.profile_name AS seller_name
            FROM orders o
            JOIN users u_buyer ON o.buyer_id = u_buyer.id
            JOIN users u_seller ON o.seller_id = u_seller.id
            ORDER BY o.created_at DESC
        `);
        res.status(200).json({ message: 'List of all orders.', orders: rows });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update an order's status
router.put('/orders/:id/status', authenticateAdmin, async (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(orderId) || !status) {
        return res.status(400).json({ message: 'Invalid order ID or status.' });
    }
    
    try {
        const [result] = await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Order status updated successfully.' });
        } else {
            res.status(404).json({ message: 'Order not found.' });
        }
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 7. Settings Management ===
// Get all settings
router.get('/settings', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_name, setting_value FROM settings');
        
        const settings = rows.reduce((obj, row) => {
            obj[row.setting_name] = row.setting_value;
            return obj;
        }, {});

        res.status(200).json({ message: 'System settings retrieved successfully.', settings });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update a specific setting
router.put('/settings', authenticateAdmin, async (req, res) => {
    const { setting_name, setting_value } = req.body;
    if (!setting_name || setting_value === undefined) {
        return res.status(400).json({ message: 'Missing required fields: setting_name and setting_value.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [setting_name, setting_value, setting_value]
        );

        res.status(200).json({ message: 'Setting updated successfully.' });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ---

// === 8. File Upload for Settings ===
// API Endpoint สำหรับอัปโหลดโลโก้ (สำหรับ Admin)
router.post('/upload/logo', authenticateAdmin, upload.single('logo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    // Path ที่จะบันทึกลงในฐานข้อมูล (Relative path)
    const logoUrl = path.join('uploads', 'logo', req.file.filename).replace(/\\/g, '/');

    try {
        await db.query(
            'INSERT INTO settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['site_logo', logoUrl, logoUrl]
        );
        
        res.status(200).json({ message: 'Logo uploaded and saved successfully!', url: `/${logoUrl}` });
    } catch (err) {
        console.error('Error uploading logo:', err);
        // หากเกิดข้อผิดพลาด ให้ลบไฟล์ที่เพิ่งอัปโหลด
        fs.unlinkSync(req.file.path); 
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// NEW: Endpoint to get all problem reports with joined user data
router.get('/problems/full', authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT
                p.*,
                b.profile_name AS buyer_profile_name,
                s.profile_name AS seller_profile_name,
                o.seller_id
            FROM problems AS p
            JOIN orders AS o ON p.order_id = o.id
            JOIN users AS b ON o.buyer_id = b.id
            JOIN users AS s ON o.seller_id = s.id
            ORDER BY p.reported_at DESC
        `;
        const [problems] = await db.query(query);
        res.status(200).json({ problems });
    } catch (err) {
        console.error('Error fetching problems:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;