const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

const saltRounds = 10;

// ===========================================
// Middleware for JWT authentication
// ===========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// ===========================================
// File upload configurations using Multer
// ===========================================

// ตั้งค่าการอัปโหลดรูปโปรไฟล์
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // req.user ถูกกำหนดโดย authenticateToken
        cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadProfileImage = multer({ storage: profileStorage });

// ตั้งค่าการอัปโหลดรูปสำหรับแจ้งปัญหา
const problemStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/problems/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});
const uploadProblemImage = multer({ storage: problemStorage });

// ตั้งค่า Multer สำหรับการอัปโหลดสลิปการชำระเงิน
const paymentSlipStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/slips/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const uploadSlip = multer({ storage: paymentSlipStorage });

// ===========================================
// User Authentication and Management
// ===========================================

// (1) User Registration - NEW
router.post('/register', async (req, res) => {
    const { profile_name, full_name, email, password, role } = req.body;

    if (!profile_name || !full_name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [existingUser] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await db.query(
            'INSERT INTO users (profile_name, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [profile_name, full_name, email, hashedPassword, role]
        );

        if (result.affectedRows === 1) {
            res.status(201).json({ message: 'User registered successfully!' });
        } else {
            res.status(500).json({ message: 'Failed to register user.' });
        }
    } catch (err) {
        console.error('Database error during registration:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (2) Update user profile (ปรับปรุง: Seller ไม่สามารถอัปเดต profile_name โดยตรงได้)
router.put('/:id', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);
    let { profile_name, full_name, email, phone_number, address } = req.body;

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized action.' });
    }
    
    // ป้องกันไม่ให้ Seller แก้ไข profile_name ผ่านช่องทางนี้
    if (req.user.role === 'seller' && profile_name !== undefined) {
        console.log(`[Warning] Seller (ID: ${userId}) attempted to update profile_name directly. Ignoring and processing other fields.`);
        profile_name = undefined; // ลบออกจากตัวแปรที่ใช้ในการ Query
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const fieldsToUpdate = [];
        const updateValues = [];

        // Buyer หรือ Admin สามารถอัปเดต profile_name ได้ตามปกติ
        if (profile_name !== undefined) { 
            fieldsToUpdate.push('profile_name = ?');
            updateValues.push(profile_name);
        }

        if (full_name !== undefined) {
            fieldsToUpdate.push('full_name = ?');
            updateValues.push(full_name);
        }
        if (email !== undefined) {
            fieldsToUpdate.push('email = ?');
            updateValues.push(email);
        }
        if (phone_number !== undefined) {
            fieldsToUpdate.push('phone_number = ?');
            updateValues.push(phone_number);
        }
        if (address !== undefined) {
            fieldsToUpdate.push('address = ?');
            updateValues.push(address);
        }

        if (fieldsToUpdate.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'No fields to update or profile_name update must use the dedicated endpoint.' });
        }

        const updateQuery = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        updateValues.push(userId);

        const [result] = await connection.query(updateQuery, updateValues);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        const [updatedUserRows] = await connection.query(
            'SELECT id, profile_name, full_name, email, phone_number, address, role, profile_image_url, profile_name_status, pending_profile_name FROM users WHERE id = ?',
            [userId]
        );

        await connection.commit();
        res.status(200).json({ message: 'Profile updated successfully!', user: updatedUserRows[0] });

    } catch (err) {
        await connection.rollback();
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (2.1) NEW: Endpoint สำหรับ Seller ส่งคำขอเปลี่ยนชื่อร้านค้า
router.post('/:id/request-shop-name-change', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { newProfileName } = req.body;

    if (req.user.id !== userId || req.user.role !== 'seller') {
        return res.status(403).json({ message: 'Access denied. Only the authenticated seller can request a name change.' });
    }

    if (!newProfileName || newProfileName.trim() === '') {
        return res.status(400).json({ message: 'New shop name is required.' });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. ดึงชื่อโปรไฟล์ปัจจุบันเพื่อเปรียบเทียบ
        const [userRows] = await connection.query('SELECT profile_name FROM users WHERE id = ?', [userId]);
        const currentProfileName = userRows[0]?.profile_name;
        
        if (newProfileName.trim() === currentProfileName) {
            await connection.rollback();
            return res.status(400).json({ message: 'The new shop name is the same as the current one.' });
        }
        
        // 2. บันทึกชื่อใหม่ใน pending_profile_name และเปลี่ยนสถานะ
        const [result] = await connection.query(
            'UPDATE users SET pending_profile_name = ?, profile_name_status = "pending_approval" WHERE id = ? AND role = "seller"',
            [newProfileName.trim(), userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Seller not found or not authorized.' });
        }

        // 3. ดึงข้อมูลผู้ใช้ที่อัปเดตแล้วกลับไป
        const [updatedUserRows] = await connection.query(
            'SELECT id, profile_name, full_name, email, role, profile_image_url, profile_name_status, pending_profile_name FROM users WHERE id = ?',
            [userId]
        );

        await connection.commit();
        res.status(200).json({ 
            message: 'Shop name change request submitted successfully. Waiting for admin approval.', 
            user: updatedUserRows[0]
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error requesting shop name change:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (3) Change user password
router.put('/:id/change-password', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { currentPassword, newPassword } = req.body;

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized action.' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    const connection = await db.getConnection();
    try {
        // First, verify the current password
        const [userRows] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }
        
        // Then, hash and update the new password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        const [result] = await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Password changed successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (4) Upload profile image
router.post('/:id/upload-profile-image', authenticateToken, uploadProfileImage.single('profileImage'), async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized action.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const filePath = `uploads/${req.file.filename}`;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'UPDATE users SET profile_image_url = ? WHERE id = ?',
            [filePath, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const [updatedUserRows] = await connection.query(
            'SELECT id, profile_name, full_name, email, role, profile_image_url, profile_name_status, pending_profile_name FROM users WHERE id = ?',
            [userId]
        );

        await connection.commit();
        res.status(200).json({
            message: 'Profile image uploaded successfully.',
            filePath,
            user: updatedUserRows[0]
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error uploading profile image:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (5) Get user's orders (UPDATED: เพิ่มข้อมูลปัญหาและเหตุผลการยกเลิก)
router.get('/:id/orders', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized access.' });
    }

    const connection = await db.getConnection();
    try {
        // 💡 แก้ไข: เพิ่ม LEFT JOIN problems เพื่อดึงข้อมูลสถานะปัญหา (problem_id, problem_status, cancellation_reason)
        const [orders] = await connection.query(
            `SELECT 
                o.id, o.total_price, o.status, o.payment_slip_url, o.created_at, o.seller_id, o.cancellation_reason,
                u.profile_name AS seller_profile_name,
                p.id AS problem_id, p.status AS problem_status
            FROM orders o 
            JOIN users u ON o.seller_id = u.id 
            LEFT JOIN problems p ON o.id = p.order_id 
            WHERE o.buyer_id = ? 
            ORDER BY o.created_at DESC`,
            [userId]
        );

        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const [items] = await connection.query(
                    `SELECT 
                        oi.product_id, oi.quantity, oi.price_at_purchase,
                        p.name, p.image_url_1, p.seller_id, p.size, p.chest, p.waist, p.hip, p.length
                     FROM order_items oi 
                     JOIN products p ON oi.product_id = p.id 
                     WHERE oi.order_id = ?`,
                    [order.id]
                );
                
                // Group problem details if present
                const problem = order.problem_id ? { id: order.problem_id, status: order.problem_status } : null;
                
                // Remove redundant fields from the main order object before returning
                const { problem_id, problem_status, ...restOfOrder } = order;
                
                return { ...restOfOrder, items, problem };
            })
        );
        
        res.status(200).json({ message: `Orders for user ID ${userId}.`, orders: ordersWithItems });

    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// ===========================================
// **Endpoint ใหม่สำหรับดึงข้อมูลผู้ขายแบบสาธารณะ**
// ===========================================
router.get('/:id/public', async (req, res) => {
    const userId = parseInt(req.params.id);

    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, profile_name, full_name, role, profile_image_url, created_at FROM users WHERE id = ? AND role = "seller"',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        res.status(200).json({ message: `Public user details for ID ${userId}.`, user: rows[0] });

    } catch (err) {
        console.error('Error fetching public user details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (6) Get user details (ปรับปรุง: เพิ่มฟิลด์สถานะชื่อร้านค้า)
router.get('/:id', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized access.' });
    }

    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, profile_name, full_name, email, phone_number, address, role, status, profile_image_url, profile_name_status, pending_profile_name FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: `User details for ID ${userId}.`, user: rows[0] });

    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (7) Report a post-sale problem (แก้ไข: เพิ่ม status ลงในฐานข้อมูล)
router.post('/problems', authenticateToken, uploadProblemImage.single('image'), async (req, res) => {
    const { order_id, problem_type, description } = req.body;
    const image_url = req.file ? `uploads/problems/${req.file.filename}` : null;

    if (!order_id || !problem_type || !description) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Order ID, problem type, and description are required.' });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.query('SELECT buyer_id FROM orders WHERE id = ?', [order_id]);
        if (orderRows.length === 0 || orderRows[0].buyer_id !== req.user.id) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized access.' });
        }
        
        // 1. ตรวจสอบว่าเคยมีการแจ้งปัญหานี้แล้วหรือไม่ (ป้องกันการแจ้งซ้ำ)
        const [existingProblem] = await connection.query('SELECT id FROM problems WHERE order_id = ?', [order_id]);
        if (existingProblem.length > 0) {
             await connection.rollback();
             return res.status(400).json({ message: 'You have already reported a problem for this order.' });
        }
        
        // 2. สร้าง Report ใหม่และตั้งค่าเริ่มต้นเป็น 'open'
        const [result] = await connection.query(
            'INSERT INTO problems (order_id, problem_type, description, image_url, status) VALUES (?, ?, ?, ?, ?)', 
            [order_id, problem_type, description, image_url, 'open']
        );
        const problemId = result.insertId;
        
        // 3. สร้างข้อความเริ่มต้น (เป็นการแจ้งปัญหาครั้งแรก)
        await connection.query(
            'INSERT INTO problem_messages (problem_id, sender_id, message_text) VALUES (?, ?, ?)',
            [problemId, req.user.id, `แจ้งปัญหาใหม่: ${problem_type}. รายละเอียด: ${description}`]
        );

        // 4. อัปเดตสถานะของคำสั่งซื้อหลัก
        await connection.query('UPDATE orders SET status = "มีปัญหา" WHERE id = ?', [order_id]);

        await connection.commit();
        res.status(201).json({ message: 'Problem reported successfully!', problemId: problemId });
    } catch (err) {
        await connection.rollback();
        console.error('Error reporting problem:', err);
        // หากเกิดข้อผิดพลาดในการบันทึก ให้ลบไฟล์รูปที่เพิ่งอัปโหลดทิ้ง
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (11) NEW: Get a single problem with details and messages for Buyer
router.get('/problems/:problemId', authenticateToken, async (req, res) => {
    const problemId = req.params.problemId;
    const buyerId = req.user.id;

    try {
        // 1. ดึงรายละเอียดปัญหาและตรวจสอบสิทธิ์
        const [[problemRows], [messagesRows]] = await Promise.all([
            db.query(`
                SELECT 
                    p.id, p.problem_type, p.description, p.status, p.created_at, p.image_url,
                    o.id AS order_id, o.buyer_id, u.profile_name AS seller_name, u.id AS seller_id,
                    oi.product_id
                FROM problems p
                JOIN orders o ON p.order_id = o.id
                JOIN users u ON o.seller_id = u.id
                JOIN order_items oi ON o.id = oi.order_id 
                WHERE p.id = ? AND o.buyer_id = ? 
            `, [problemId, buyerId]),

            // 2. ดึงข้อความสนทนาทั้งหมด
            db.query(`
                SELECT 
                    pm.id, pm.message_text, pm.sent_at, pm.sender_id, u.role AS sender_role
                FROM problem_messages pm
                JOIN users u ON pm.sender_id = u.id
                WHERE pm.problem_id = ?
                ORDER BY pm.sent_at ASC
            `, [problemId])
        ]);

        if (problemRows.length === 0) {
            return res.status(404).json({ message: 'Problem not found or unauthorized.' });
        }
        
        // 3. ส่งข้อมูลกลับ
        res.status(200).json({
            ...problemRows[0],
            messages: messagesRows
        });

    } catch (err) {
        console.error('Error fetching buyer problem detail:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// (12) NEW: Buyer Send Message to Problem Thread
router.post('/problems/:problemId/messages', authenticateToken, async (req, res) => {
    const problemId = req.params.problemId;
    const buyerId = req.user.id;
    const { message_text } = req.body;

    if (!message_text) {
        return res.status(400).json({ message: 'Message text is required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. ตรวจสอบสิทธิ์และสถานะปัญหา
        const [problemRows] = await connection.query(`
            SELECT p.status 
            FROM problems p
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = ? AND o.buyer_id = ?
        `, [problemId, buyerId]);

        if (problemRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized action or problem not found.' });
        }
        if (problemRows[0].status === 'closed') {
            await connection.rollback();
            return res.status(400).json({ message: 'This problem thread is closed and cannot receive new messages.' });
        }

        // 2. บันทึกข้อความใหม่
        const [messageResult] = await connection.query(
            'INSERT INTO problem_messages (problem_id, sender_id, message_text) VALUES (?, ?, ?)',
            [problemId, buyerId, message_text]
        );

        // 3. อัปเดตสถานะปัญหาเป็น 'open' หรือ 'pending_seller_reply' 
        // เพื่อแจ้งเตือนร้านค้าว่าลูกค้าตอบกลับแล้ว
        const newStatus = 'open'; // หรือ 'pending_seller_reply'
        await connection.query('UPDATE problems SET status = ? WHERE id = ?', [newStatus, problemId]);
        
        await connection.commit();
        
        res.status(201).json({ 
            message: 'Message sent successfully. Status updated to pending seller reply.',
            messageId: messageResult.insertId,
            newStatus: newStatus
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error sending buyer message:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    } finally {
        connection.release();
    }
});


// (13) NEW: Buyer Problem Management: Close problem (สำหรับผู้ซื้อปิดปัญหาที่แก้ไขแล้ว)
router.post('/problems/:problemId/close-by-buyer', authenticateToken, async (req, res) => {
    const problemId = req.params.problemId;
    const buyerId = req.user.id;
    const closedStatus = 'closed';

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของปัญหา) และสถานะปัญหา (ต้องยังไม่ถูกปิด)
        const [problemRows] = await connection.query(`
            SELECT o.buyer_id, p.status 
            FROM problems p 
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = ?
        `, [problemId]);

        if (problemRows.length === 0 || problemRows[0].buyer_id !== buyerId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized action or problem not found.' });
        }
        
        if (problemRows[0].status === closedStatus) {
            await connection.rollback();
            return res.status(400).json({ message: 'This problem is already closed.' });
        }

        // 2. อัปเดตสถานะของปัญหาเป็น 'closed'
        const [result] = await connection.query('UPDATE problems SET status = ? WHERE id = ?', [closedStatus, problemId]);
        
        // 3. เพิ่มข้อความแจ้งว่าผู้ซื้อปิดปัญหาแล้ว
        const closingMessage = "ผู้ซื้อได้ยืนยันการปิดปัญหาและยอมรับการแก้ไขแล้ว";
        await connection.query(
            'INSERT INTO problem_messages (problem_id, sender_id, message_text) VALUES (?, ?, ?)',
            [problemId, buyerId, closingMessage]
        );

        if (result.affectedRows > 0) {
            await connection.commit();
            res.status(200).json({ 
                message: `Problem #${problemId} closed successfully by buyer.`,
                newStatus: closedStatus
            });
        } else {
            await connection.rollback();
            res.status(404).json({ message: 'Problem not found.' });
        }

    } catch (err) {
        await connection.rollback();
        console.error('Error closing problem by buyer:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (8) Get user's problem reports (แก้ไข: ดึงข้อมูล status และใช้ reported_at)
router.get('/:id/problems', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized access.' });
    }

    const connection = await db.getConnection();
    try {
        const [problems] = await connection.query(`
            SELECT
                p.id,
                p.problem_type,
                p.description,
                p.image_url,
                p.status,
                p.reported_at AS created_at,
                p.order_id
            FROM problems p
            JOIN orders o ON p.order_id = o.id
            WHERE o.buyer_id = ?
            ORDER BY p.reported_at DESC
        `, [userId]);

        res.status(200).json(problems); // ส่งข้อมูลกลับเป็น array โดยตรง

    } catch (err) {
        console.error('Error fetching user problems:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (9) API Endpoint สำหรับการชำระเงินและสร้างคำสั่งซื้อ
// URL จะเป็น POST /api/users/orders/checkout
router.post('/orders/checkout', authenticateToken, uploadSlip.single('paymentSlip'), async (req, res) => {
    const { totalPrice, items } = req.body;
    const { id: buyer_id } = req.user;
    const payment_slip_url = req.file ? `uploads/slips/${req.file.filename}` : null;

    if (!payment_slip_url || !items || !totalPrice) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Missing payment slip or item information.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const parsedItems = JSON.parse(items);
        if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
            throw new Error('Invalid items data.');
        }

        // 1. ตรวจสอบว่าสินค้าทั้งหมดมาจากผู้ขายคนเดียวกันหรือไม่ และตรวจสอบสต็อก
        const sellerIds = [];
        for (const item of parsedItems) {
            const [sellerRows] = await connection.query('SELECT seller_id FROM products WHERE id = ?', [item.id]);
            if (sellerRows.length === 0) {
                throw new Error(`Product with ID ${item.id} not found.`);
            }
            
            // *** 1A. ตรวจสอบสต็อก (สำคัญสำหรับสินค้าชิ้นเดียว) ***
            const [stockRows] = await connection.query('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE', [item.id]);
             if (stockRows[0].stock_quantity < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ message: `สินค้า ${item.id} มีสต็อกไม่พอ` });
            }
            // ********************************************************
            sellerIds.push(sellerRows[0].seller_id);
        }

        // หากสินค้ามาจากผู้ขายหลายคน จะไม่สามารถสร้างคำสั่งซื้อได้
        const uniqueSellers = [...new Set(sellerIds)];
        if (uniqueSellers.length > 1) {
            throw new Error('All items in an order must be from the same seller. Please create separate orders.');
        }

        const seller_id = uniqueSellers[0];
        
        // 2. สร้างคำสั่งซื้อใหม่ในตาราง orders
        // *** แก้ไข: เปลี่ยนสถานะเริ่มต้นจาก 'pending' เป็น 'รอดำเนินการ' ***
        const [orderResult] = await connection.query(
            'INSERT INTO orders (buyer_id, seller_id, total_price, payment_slip_url, status) VALUES (?, ?, ?, ?, ?)', 
            [buyer_id, seller_id, parseFloat(totalPrice), payment_slip_url, 'รอดำเนินการ']
        );
        const orderId = orderResult.insertId;

        // 3. สร้างรายการสินค้าในตาราง order_items (แก้ไข: ลบ seller_id ออกจาก query)
        for (const item of parsedItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
                [orderId, item.id, item.quantity, parseFloat(item.price)]
            );
            
            // *** 3A. ตัดสต็อกสินค้า (สำคัญ) ***
            // ใช้ item.id (product_id) และ item.quantity
            await connection.query(
                'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
                [item.quantity, item.id] 
            );
            // ************************************
        }

        await connection.commit();
        res.status(201).json({ message: 'Order created and payment submitted successfully!', orderId: orderId });
    } catch (err) {
        await connection.rollback();
        console.error('Error during checkout process:', err);
        // หากเกิดข้อผิดพลาด ให้ลบไฟล์ที่อัปโหลดไปแล้วทิ้ง
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    } finally {
        connection.release();
    }
});


// (10) NEW: Endpoint for Direct Password Reset (FOR TESTING ONLY)
router.post('/auth/reset-password-direct', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required.' });
    }

    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: 'Password has been successfully updated.' });

    } catch (err) {
        console.error('Direct password reset error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;