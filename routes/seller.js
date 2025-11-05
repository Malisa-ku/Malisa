// File: seller.js (ฉบับเต็มที่แก้ไขล่าสุด)
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destination folders for uploads
const destinationFolder = path.join(__dirname, '..', 'uploads', 'products');
const problemsFolder = path.join(__dirname, '..', 'uploads', 'problems');
const slipsFolder = path.join(__dirname, '..', 'uploads', 'slips');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the directory exists
        fs.mkdirSync(destinationFolder, { recursive: true });
        cb(null, destinationFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

// Use .fields() to accept multiple files with specific field names
const upload = multer({ storage: storage });

// Middleware to authenticate and authorize for Seller role
const authenticateSeller = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        if (user.role !== 'seller') {
            return res.status(403).json({ message: 'Access denied. Seller role required.' });
        }
        req.user = user;
        next();
    });
};

// ===========================================
// Helper function to delete image files
// ===========================================
const deleteImageFile = (imageUrl) => {
    if (imageUrl) {
        const imagePath = path.join(__dirname, '..', imageUrl);
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, err => {
                if (err) console.error("Failed to delete old image:", err);
            });
        }
    }
};

// ===========================================
// 1.3.4 Seller-specific features
// ===========================================

// (1) Dashboard: Get seller's dashboard data (CRITICAL FIX for recentProblems)
router.get('/dashboard', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    try {
        // Use Promise.all to fetch data concurrently for better performance
        const [[statsRows], [recentOrders], [recentProblems]] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(DISTINCT p.id) AS totalProducts,
                    COALESCE(SUM(CASE WHEN o.status != 'ยกเลิกแล้ว' THEN oi.quantity ELSE 0 END), 0) AS totalItemsSold,
                    COALESCE(COUNT(DISTINCT CASE WHEN o.status = 'ชำระเงินแล้ว' THEN o.id ELSE NULL END), 0) AS newOrders,
                    COALESCE(SUM(CASE WHEN o.status != 'ยกเลิกแล้ว' THEN o.total_price ELSE 0 END), 0) AS totalRevenue
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE p.seller_id = ?
            `, [sellerId]),
            db.query(`
                SELECT id, total_price, status, created_at 
                FROM orders 
                WHERE seller_id = ?
                ORDER BY created_at DESC 
                LIMIT 5
            `, [sellerId]),
            // 💡 CRITICAL FIX: ดึงปัญหาที่สถานะเป็น 'open' หรือ 'seller_replied' (รอผู้ซื้อตอบ)
            db.query(`
                SELECT p.id, p.description, o.id as order_id
                FROM problems p
                JOIN orders o ON p.order_id = o.id
                WHERE o.seller_id = ? AND p.status IN ('open', 'seller_replied')
                ORDER BY p.id DESC
                LIMIT 5
            `, [sellerId])
        ]);

        const stats = statsRows[0];
        if (!stats.totalProducts) stats.totalProducts = 0; // Ensure stats are not null

        res.status(200).json({
            stats,
            recentOrders,
            recentProblems,
        });

    } catch (err) {
        console.error('Error fetching seller dashboard data:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (2) Manage Products: View all products for the authenticated seller
router.get('/products', authenticateSeller, async (req, res) => {
    try {
        const sellerId = req.user.id;
        const [products] = await db.query(`
            SELECT 
                p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.seller_id = ? 
            ORDER BY p.id DESC
        `, [sellerId]);
        res.status(200).json({ products });
    } catch (err) {
        console.error('Error fetching seller products:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (3) Manage Products: Add a new product
// Changed to .fields() to handle multiple image uploads
router.post('/products', authenticateSeller, upload.fields([{ name: 'image_url_1', maxCount: 1 }, { name: 'image_url_2', maxCount: 1 }, { name: 'image_url_3', maxCount: 1 }]), async (req, res) => {
    const { name, price, description, category_id, size, chest, waist, hip, length, stock_quantity } = req.body;
    const seller_id = req.user.id;

    // Get file paths from the uploaded files
    const imageUrls = {
        image_url_1: req.files && req.files['image_url_1'] ? path.join('uploads', 'products', req.files['image_url_1'][0].filename).replace(/\\/g, '/') : null,
        image_url_2: req.files && req.files['image_url_2'] ? path.join('uploads', 'products', req.files['image_url_2'][0].filename).replace(/\\/g, '/') : null,
        image_url_3: req.files && req.files['image_url_3'] ? path.join('uploads', 'products', req.files['image_url_3'][0].filename).replace(/\\/g, '/') : null,
    };
    
    // Validate required fields and ensure numeric values are valid numbers
    if (!name || !price || !category_id || !stock_quantity || isNaN(parseFloat(price)) || isNaN(parseInt(stock_quantity)) || !isFinite(parseFloat(price)) || !isFinite(parseInt(stock_quantity))) {
        // If price or stock_quantity are not valid numbers, return an error
        return res.status(400).json({ message: 'Missing or invalid required product information.' });
    }

    try {
        const sql = `
            INSERT INTO products (seller_id, name, price, description, category_id, image_url_1, image_url_2, image_url_3, size, chest, waist, hip, length, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [
            seller_id, name, parseFloat(price), description, parseInt(category_id), 
            imageUrls.image_url_1, imageUrls.image_url_2, imageUrls.image_url_3,
            size, parseFloat(chest) || null, parseFloat(waist) || null, parseFloat(hip) || null, parseFloat(length) || null, parseInt(stock_quantity)
        ]);

        res.status(201).json({ 
            message: 'Product added successfully!', 
            productId: result.insertId 
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (4) Manage Products: Update a product
// Changed to .fields() to handle multiple image uploads
router.put('/products/:id', authenticateSeller, upload.fields([{ name: 'image_url_1', maxCount: 1 }, { name: 'image_url_2', maxCount: 1 }, { name: 'image_url_3', maxCount: 1 }]), async (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
    }

    const { name, price, description, category_id, size, chest, waist, hip, length, stock_quantity } = req.body;

    // Validate required fields and ensure numeric values are valid numbers
    if (!name || !price || !category_id || !stock_quantity || isNaN(parseFloat(price)) || isNaN(parseInt(stock_quantity)) || !isFinite(parseFloat(price)) || !isFinite(parseInt(stock_quantity))) {
        return res.status(400).json({ message: 'Missing or invalid required product information.' });
    }

    try {
        // Get existing product and image URLs
        const [productRows] = await db.query('SELECT seller_id, image_url_1, image_url_2, image_url_3 FROM products WHERE id = ?', [productId]);
        if (productRows.length === 0 || productRows[0].seller_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized action or product not found.' });
        }

        const existingImages = productRows[0];
        const newImages = req.files;
        let imageUrls = {
            image_url_1: existingImages.image_url_1,
            image_url_2: existingImages.image_url_2,
            image_url_3: existingImages.image_url_3,
        };

        // Update image URLs and delete old files if a new one is uploaded for that field
        ['image_url_1', 'image_url_2', 'image_url_3'].forEach(key => {
            if (newImages && newImages[key]) {
                deleteImageFile(existingImages[key]); // Delete old image
                imageUrls[key] = path.join('uploads', 'products', newImages[key][0].filename).replace(/\\/g, '/');
            } else if (req.body[key] === '') {
                 // If the frontend sends an empty string for an image, it means it's a removal
                deleteImageFile(existingImages[key]);
                imageUrls[key] = null;
            }
        });

        const sql = `
            UPDATE products 
            SET name = ?, price = ?, description = ?, category_id = ?, 
                image_url_1 = ?, image_url_2 = ?, image_url_3 = ?,
                size = ?, chest = ?, waist = ?, hip = ?, length = ?, stock_quantity = ?
            WHERE id = ? AND seller_id = ?
        `;
        const [result] = await db.query(sql, [
            name, parseFloat(price), description, parseInt(category_id),
            imageUrls.image_url_1, imageUrls.image_url_2, imageUrls.image_url_3,
            size, parseFloat(chest) || null, parseFloat(waist) || null, parseFloat(hip) || null, parseFloat(length) || null, parseInt(stock_quantity),
            productId, req.user.id
        ]);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Product updated successfully!' });
        } else {
            res.status(404).json({ message: 'Product not found.' });
        }
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (5) Manage Products: Delete a product
router.delete('/products/:id', authenticateSeller, async (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
    }

    try {
        // Get all image URLs before deleting the product
        const [productRows] = await db.query('SELECT seller_id, image_url_1, image_url_2, image_url_3 FROM products WHERE id = ?', [productId]);
        if (productRows.length === 0 || productRows[0].seller_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized action or product not found.' });
        }

        const imageUrls = [productRows[0].image_url_1, productRows[0].image_url_2, productRows[0].image_url_3];
        
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [productId]);
        
        if (result.affectedRows > 0) {
            // Delete all associated image files after successful database deletion
            imageUrls.forEach(url => deleteImageFile(url));
            res.status(200).json({ message: 'Product deleted successfully!' });
        } else {
            res.status(404).json({ message: 'Product not found.' });
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (6) Seller Order Management: Get all orders for the authenticated seller (CRITICAL FIX for Date Filter)
router.get('/orders', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    // 💡 NEW: รับค่า status, startDate, และ endDate
    const { status, startDate, endDate } = req.query; 

    // *** แก้ไข: Map English Key เป็น Thai Text สำหรับ Query ***
    const statusMap = {
        'pending': 'รอดำเนินการ',
        'paid': 'ชำระเงินแล้ว',
        'shipped': 'จัดส่งแล้ว',
        'delivered': 'จัดส่งสำเร็จ',
        'problem': 'มีปัญหา',
        'cancelled': 'ยกเลิกแล้ว',
    };
    
    // แปลง English Key ที่รับมาจาก Frontend ให้เป็น Thai Text ที่อยู่ใน DB
    const thaiStatus = statusMap[status]; 

    try {
        // 💡 CRITICAL FIX: ใช้ LEFT JOIN เพื่อดึงปัญหาทั้งหมดที่ผูกกับ Order ID
        let sqlQuery = `
            SELECT 
                o.id, o.total_price, o.status, o.payment_slip_url, o.created_at, o.cancellation_reason,
                u.email, u.id as buyer_id, u.full_name as buyer_name, u.phone_number, u.address,
                oi.id AS item_id, oi.quantity, oi.price_at_purchase, p.name AS product_name, p.image_url_1, p.image_url_2, p.image_url_3, p.price,
                p.size, p.chest, p.waist, p.hip, p.length,
                pr.id AS problem_id, pr.problem_type AS problem_type, pr.description AS problem_description, pr.status AS problem_status
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN users u ON o.buyer_id = u.id
            LEFT JOIN problems pr ON o.id = pr.order_id
            WHERE o.seller_id = ?
        `;

        const queryParams = [sellerId];

        // *** Logic การ Filter ***
        if (status && status !== 'all') {
            if (status === 'problem') {
                 // 💡 FIX: กรองเฉพาะ Order ที่มีสถานะ 'มีปัญหา'
                sqlQuery += ` AND o.status = 'มีปัญหา'`;
            } else if (thaiStatus) {
                sqlQuery += ` AND o.status = ?`;
                queryParams.push(thaiStatus); 
            }
        }
        
        // 💡 NEW: เพิ่มการกรองตามช่วงวันที่
        if (startDate && endDate) {
             sqlQuery += ` AND DATE(o.created_at) BETWEEN ? AND ?`;
             queryParams.push(startDate, endDate);
        }

        sqlQuery += ` ORDER BY o.created_at DESC`;

        const [orders] = await db.query(sqlQuery, queryParams);

        const groupedOrders = {};
        orders.forEach(row => {
            const { id, total_price, status, payment_slip_url, created_at, buyer_name, email, phone_number, address, cancellation_reason, ...itemData } = row;
            if (!groupedOrders[id]) {
                groupedOrders[id] = {
                    id,
                    total_price,
                    status,
                    payment_slip_url,
                    created_at,
                    cancellation_reason, // เพิ่มเหตุผลการยกเลิก
                    buyer: { full_name: buyer_name, email, phone_number, address },
                    items: [],
                    // 💡 CRITICAL FIX: Group problem details. 
                    problem: itemData.problem_id ? { id: itemData.problem_id, type: itemData.problem_type, description: itemData.problem_description, status: itemData.problem_status } : null
                };
            }
            if (itemData.item_id) { // Only push if there are actual items
                groupedOrders[id].items.push({
                    id: itemData.item_id,
                    quantity: itemData.quantity,
                    price_at_purchase: itemData.price_at_purchase, // 💡 FIX: ดึง price_at_purchase มาใช้
                    product_name: itemData.product_name,
                    image_url_1: itemData.image_url_1,
                    image_url_2: itemData.image_url_2,
                    image_url_3: itemData.image_url_3,
                    price: itemData.price, // price (current product price)
                    size: itemData.size,
                    chest: itemData.chest,
                    waist: itemData.waist,
                    hip: itemData.hip,
                    length: itemData.length,
                });
            }
        });

        res.status(200).json({ orders: Object.values(groupedOrders) });
    } catch (err) {
        console.error('Error fetching seller orders:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// (7) Seller Order Management: Get a single order with details (CRITICAL FIX for Problem Chat)
router.get('/orders/:id', authenticateSeller, async (req, res) => {
    const orderId = req.params.id;
    const sellerId = req.user.id;

    try {
        // Use Promise.all to fetch order, items, and problem concurrently
        const [[orderRows], [itemsRows], [problemRows]] = await Promise.all([
            // 💡 CRITICAL FIX: ดึงข้อมูลผู้ซื้อครบถ้วน
            db.query(`
                SELECT 
                    o.id, o.total_price, o.status, o.payment_slip_url, o.created_at, o.cancellation_reason,
                    u.full_name, u.email, u.phone_number, u.address
                FROM orders o
                LEFT JOIN users u ON o.buyer_id = u.id 
                WHERE o.id = ? AND o.seller_id = ?
            `, [orderId, sellerId]),
            db.query(`
                SELECT 
                    oi.quantity, oi.price_at_purchase,
                    p.name AS product_name,
                    p.image_url_1, p.image_url_2, p.image_url_3,
                    p.price,
                    p.size,
                    p.chest,
                    p.waist,
                    p.hip,
                    p.length
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [orderId]),
            // 💡 ดึงข้อมูลปัญหาทั้งหมด
            db.query(`
                SELECT id, problem_type, description, status 
                FROM problems 
                WHERE order_id = ?
            `, [orderId]) 
        ]);

        if (orderRows.length === 0) {
            // 💡 ถ้า Order ID ไม่ถูกต้องหรือผู้ขายไม่มีสิทธิ์ จะคืนค่า 404
            return res.status(404).json({ message: 'Order not found or not authorized.' });
        }

        const order = orderRows[0];
        
        res.status(200).json({
            ...order,
            items: itemsRows,
            // 💡 สำคัญ: ใช้ข้อมูลปัญหาที่ได้จาก problemRows (ถ้ามี)
            problem: problemRows.length > 0 ? problemRows[0] : null
        });

    } catch (err) {
        console.error('Error fetching single order details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// (8) Seller Order Management: Update order status and decrease/increase stock
router.put('/orders/:id/status', authenticateSeller, async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const sellerId = req.user.id;

    if (!status) {
        return res.status(400).json({ message: 'Missing status in request body.' });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.query('SELECT seller_id, status FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0 || orderRows[0].seller_id !== sellerId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized action or order not found.' });
        }
        
        const oldStatus = orderRows[0].status;

        // Use a whitelist for valid statuses and allow both English and Thai
        const validStatuses = ['paid', 'shipped', 'delivered', 'cancelled', 'ชำระเงินแล้ว', 'จัดส่งแล้ว', 'จัดส่งสำเร็จ', 'ยกเลิกแล้ว'];
        if (!validStatuses.includes(status)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid status provided.' });
        }
        
        const [orderItems] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);

        // Logic to update stock based on status change
        if (status === 'ยกเลิกแล้ว' || status === 'cancelled') {
            // Restore stock for cancelled orders
            for (const item of orderItems) {
                await connection.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        } else if ((status === 'shipped' || status === 'delivered' || status === 'จัดส่งแล้ว' || status === 'จัดส่งสำเร็จ') && oldStatus !== status) {
            // Decrease stock for shipped/delivered orders only if the status changed
            for (const item of orderItems) {
                await connection.query('UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?', [item.quantity, item.product_id]);
            }
        }

        // Update the order status in the database (ล้าง cancellation_reason หากไม่ใช่สถานะยกเลิก)
        const [result] = await connection.query('UPDATE orders SET status = ?, cancellation_reason = NULL WHERE id = ?', [status, orderId]);
        
        if (result.affectedRows > 0) {
            await connection.commit();
            res.status(200).json({ message: `อัปเดตสถานะคำสั่งซื้อเป็น '${status}' สำเร็จ!` });
        } else {
            await connection.rollback();
            res.status(404).json({ message: 'Order not found.' });
        }
    } catch (err) {
        await connection.rollback();
        console.error('Error updating order status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// (21) Seller Order Management: Cancel Order with Reason (New Logic)
router.post('/orders/:id/cancel', authenticateSeller, async (req, res) => {
    const orderId = req.params.id;
    const sellerId = req.user.id;
    const { reason } = req.body; 

    if (!reason) {
        return res.status(400).json({ message: 'Missing cancellation reason.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. ตรวจสอบความเป็นเจ้าของและสถานะเดิม
        const [orderRows] = await connection.query('SELECT seller_id, status FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0 || orderRows[0].seller_id !== sellerId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized action or order not found.' });
        }
        
        const oldStatus = orderRows[0].status;
        if (oldStatus === 'ยกเลิกแล้ว' || oldStatus === 'cancelled' || oldStatus === 'จัดส่งสำเร็จ' || oldStatus === 'delivered') {
            await connection.rollback();
            // 💡 ส่งข้อมูลสถานะปัจจุบันกลับไปใน message เพื่อให้ Frontend แสดงผลได้ชัดเจน
            return res.status(400).json({ message: `Order cannot be cancelled in its current state (${oldStatus}).` });
        }

        // 2. ดึงรายการสินค้าเพื่อคืนสต็อก
        const [orderItems] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);

        // 3. คืนสต็อกสินค้า
        if (orderItems.length > 0) {
            for (const item of orderItems) {
                await connection.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        }

        // 4. อัปเดตสถานะเป็น 'ยกเลิกแล้ว' และบันทึกเหตุผล
        const newStatus = 'ยกเลิกแล้ว';
        const [result] = await db.query('UPDATE orders SET status = ?, cancellation_reason = ? WHERE id = ?', [newStatus, reason, orderId]);
        
        if (result.affectedRows > 0) {
            await connection.commit();
            res.status(200).json({ 
                message: `คำสั่งซื้อ #${orderId} ถูกยกเลิกโดยผู้ขายสำเร็จ! (เหตุผล: ${reason})`,
                status: newStatus
            });
        } else {
            await connection.rollback();
            res.status(404).json({ message: 'Order not found.' });
        }
    } catch (err) {
        await connection.rollback();
        console.error('Error cancelling order:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// (9) Seller Order Management: Get all problems for the authenticated seller's orders
router.get('/problems', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    try {
        const [problems] = await db.query(`
            SELECT 
                p.id, p.description, p.status, p.created_at, p.subject,
                o.id AS order_id, o.total_price, o.status AS order_status
            FROM problems p
            JOIN orders o ON p.order_id = o.id
            WHERE o.seller_id = ?
            ORDER BY p.id DESC
        `, [sellerId]);
        res.status(200).json({ problems });
    } catch (err) {
        console.error('Error fetching seller problems:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// (10) Seller Order Management: Get a single problem with details (CRITICAL FIX for Problem Chat)
router.get('/problems/:id', authenticateSeller, async (req, res) => {
    const problemId = req.params.id;
    const sellerId = req.user.id;

    try {
        // Use Promise.all to fetch problem details AND all related messages
        const [[problemRows], [messagesRows]] = await Promise.all([
            db.query(`
                SELECT 
                    p.id, p.problem_type, p.description, p.status, p.created_at, p.image_url, p.order_id,
                    o.total_price, o.status AS order_status,
                    u.full_name AS buyer_name, u.email AS buyer_email, u.phone_number AS buyer_phone, u.id AS buyer_id
                FROM problems p
                LEFT JOIN orders o ON p.order_id = o.id
                LEFT JOIN users u ON o.buyer_id = u.id
                WHERE p.id = ? AND o.seller_id = ?
            `, [problemId, sellerId]),
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
            return res.status(404).json({ message: 'Problem not found or not authorized.' });
        }
        
        const problem = problemRows[0];
        
        res.status(200).json({
            ...problem,
            messages: messagesRows 
        });

    } catch (err) {
        console.error('Error fetching single problem details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (23) NEW: Seller Problem Management: Send a reply/message
router.post('/problems/:id/messages', authenticateSeller, async (req, res) => {
    const problemId = req.params.id;
    const sellerId = req.user.id;
    const { message_text } = req.body;

    if (!message_text) {
        return res.status(400).json({ message: 'Message text is required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. ตรวจสอบความเป็นเจ้าของปัญหา
        const [problemRows] = await connection.query(`
            SELECT o.seller_id 
            FROM problems p 
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = ?
        `, [problemId]);

        if (problemRows.length === 0 || problemRows[0].seller_id !== sellerId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Unauthorized action or problem not found.' });
        }
        
        // 2. บันทึกข้อความใหม่ลงในตาราง problem_messages
        const [messageResult] = await connection.query(
            'INSERT INTO problem_messages (problem_id, sender_id, message_text) VALUES (?, ?, ?)',
            [problemId, sellerId, message_text]
        );

        // 3. อัปเดตสถานะของปัญหาเป็น 'seller_replied' (เพื่อบ่งชี้ว่าร้านค้าได้ตอบกลับแล้ว)
        const newStatus = 'seller_replied'; 
        await connection.query('UPDATE problems SET status = ? WHERE id = ?', [newStatus, problemId]);
        
        await connection.commit();
        
        res.status(201).json({ 
            message: 'Message sent and problem status updated to seller_replied.',
            messageId: messageResult.insertId,
            newStatus: newStatus
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error sending problem message:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    } finally {
        connection.release();
    }
});

// (24) NEW: Seller Problem Management: Close problem
router.post('/problems/:id/close', authenticateSeller, async (req, res) => {
    const problemId = req.params.id;
    const sellerId = req.user.id;
    const closedStatus = 'closed';

    try {
        // 1. ตรวจสอบความเป็นเจ้าของปัญหา
        const [problemRows] = await db.query(`
            SELECT o.seller_id 
            FROM problems p 
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = ?
        `, [problemId]);

        if (problemRows.length === 0 || problemRows[0].seller_id !== sellerId) {
            return res.status(403).json({ message: 'Unauthorized action or problem not found.' });
        }

        // 2. อัปเดตสถานะของปัญหาเป็น 'closed'
        const [result] = await db.query('UPDATE problems SET status = ? WHERE id = ?', [closedStatus, problemId]);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ 
                message: `Problem #${problemId} closed successfully.`,
                newStatus: closedStatus
            });
        } else {
             res.status(404).json({ message: 'Problem not found or already closed.' });
        }

    } catch (err) {
        console.error('Error closing problem:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// (11) Seller Order Management: Update problem status (เก่า - ถูกแทนที่ด้วย (23) และ (24) แต่ยังคงไว้หากมี Use Case อื่น)
router.put('/problems/:id/status', authenticateSeller, async (req, res) => {
    const { status } = req.body;
    const problemId = req.params.id;
    const sellerId = req.user.id;
    
    if (!status) {
        return res.status(400).json({ message: 'Missing status in request body.' });
    }

    try {
        const [problemRows] = await db.query('SELECT o.seller_id FROM problems p JOIN orders o ON p.order_id = o.id WHERE p.id = ?', [problemId]);
        if (problemRows.length === 0 || problemRows[0].seller_id !== sellerId) {
            return res.status(403).json({ message: 'Unauthorized action or problem not found.' });
        }

        const [result] = await db.query('UPDATE problems SET status = ? WHERE id = ?', [status, problemId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: `Problem status updated to '${status}' successfully!` });
        } else {
            res.status(404).json({ message: 'Problem not found.' });
        }
    } catch (err) {
        console.error('Error updating problem status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (12) Get Sales Report Data for Seller
router.get('/daily-sales-report', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required query parameters.' });
    }

    try {
        const [dailySales] = await db.query(
            `SELECT DATE(created_at) AS date, SUM(total_price) AS totalSales
             FROM orders
             WHERE seller_id = ? AND status IN ('จัดส่งสำเร็จ', 'ชำระเงินแล้ว') AND YEAR(created_at) = ? AND MONTH(created_at) = ?
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [sellerId, year, month]
        );
        
        // Convert date objects to strings for better JSON serialization
        const formattedSales = dailySales.map(item => ({
            date: new Date(item.date).toISOString().split('T')[0],
            totalSales: item.totalSales,
        }));

        res.status(200).json({ dailySales: formattedSales });
    } catch (err) {
        console.error('Error fetching daily sales report:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (20) Get Aggregated Monthly Sales Report for Seller
router.get('/monthly-sales-report', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    try {
        const [monthlySales] = await db.query(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month, 
                SUM(total_price) AS totalSales
             FROM orders
             WHERE seller_id = ? AND status IN ('จัดส่งสำเร็จ', 'ชำระเงินแล้ว')
             GROUP BY month
             ORDER BY month ASC`,
            [sellerId]
        );
        
        res.status(200).json({ monthlySales });
    } catch (err) {
        console.error('Error fetching monthly sales report:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (13) Endpoint to get monthly sales report details for a specific month
router.get('/sales-report/monthly-details', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    const { month } = req.query; // Expecting 'YYYY-MM' format, e.g., '2025-08'

    if (!month) {
        return res.status(400).json({ message: 'Missing month parameter.' });
    }

    try {
        const [items] = await db.query(`
            SELECT 
                p.name AS product_name,
                p.image_url_1, p.image_url_2, p.image_url_3,
                SUM(oi.quantity) AS total_quantity,
                SUM(oi.quantity * oi.price_at_purchase) AS total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.seller_id = ? 
            AND o.status IN ('delivered', 'shipped')
            AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
            GROUP BY p.id
            ORDER BY total_revenue DESC
        `, [sellerId, month]);

        res.status(200).json({ items });
    } catch (err) {
        console.error('Error fetching monthly sales details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// (22) NEW: Endpoint for Daily Sales Report by Custom Date Range
// URL: GET /api/sellers/daily-sales-report-custom?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/daily-sales-report-custom', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    const { startDate, endDate } = req.query; // รับค่าเป็น YYYY-MM-DD

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required query parameters.' });
    }
    
    // ตรวจสอบความถูกต้องของวันที่ (Start date cannot be after end date)
    if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    try {
        const [dailySales] = await db.query(
            `SELECT DATE(created_at) AS date, SUM(total_price) AS totalSales
             FROM orders
             WHERE seller_id = ? 
             AND status IN ('จัดส่งสำเร็จ', 'ชำระเงินแล้ว') 
             AND DATE(created_at) BETWEEN ? AND ?
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [sellerId, startDate, endDate]
        );
        
        // แปลง Date object ให้เป็น string YYYY-MM-DD
        const formattedSales = dailySales.map(item => ({
            date: new Date(item.date).toISOString().split('T')[0], 
            totalSales: item.totalSales,
        }));

        res.status(200).json({ dailySales: formattedSales }); // ใช้ 'dailySales' เป็น key
    } catch (err) {
        console.error('Error fetching custom sales report:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// (14) Endpoint to handle seller complaints
router.post('/complaints', authenticateSeller, async (req, res) => {
    const { order_id, description } = req.body;
    const seller_id = req.user.id;

    if (!order_id || !description) {
        return res.status(400).json({ message: 'Missing order_id or description.' });
    }

    try {
        // Validate that the order ID belongs to the authenticated seller
        const [orderRows] = await db.query('SELECT id FROM orders WHERE id = ? AND seller_id = ?', [order_id, seller_id]);
        if (orderRows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized action or order not found.' });
        }

        const [result] = await db.query(
            'INSERT INTO complaints (seller_id, order_id, description, status) VALUES (?, ?, ?, ?)',
            [seller_id, order_id, description, 'pending']
        );
        
        res.status(201).json({ 
            message: 'Complaint submitted successfully!',
            complaintId: result.insertId 
        });

    } catch (err) {
        console.error('Error submitting complaint:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// (15) Endpoint to get a list of all complaints for the authenticated seller
router.get('/complaints', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;

    try {
        const [complaints] = await db.query(
            `SELECT id, order_id, description, status, created_at
             FROM complaints
             WHERE seller_id = ?
             ORDER BY created_at DESC`,
            [sellerId]
        );

        res.status(200).json({ complaints });
    } catch (err) {
        console.error('Error fetching seller complaints:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// (16) Endpoint to get a single complaint detail
router.get('/complaints/:id', authenticateSeller, async (req, res) => {
    const complaintId = req.params.id;
    const sellerId = req.user.id;

    try {
        const [complaint] = await db.query(
            `SELECT c.id, c.order_id, c.description, c.status, c.created_at, o.total_price, o.buyer_id
             FROM complaints c
             JOIN orders o ON c.order_id = o.id
             WHERE c.id = ? AND c.seller_id = ?`,
            [complaintId, sellerId]
        );

        if (complaint.length === 0) {
            return res.status(404).json({ message: 'Complaint not found or not authorized.' });
        }

        res.status(200).json(complaint[0]);
    } catch (err) {
        console.error('Error fetching single complaint:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// (17) Endpoint to get a list of all warnings for the authenticated seller
router.get('/warnings', authenticateSeller, async (req, res) => {
    const sellerId = req.user.id;
    try {
        const [warnings] = await db.query(
            `SELECT 
                w.id, w.message, w.created_at, w.appeal_status, w.order_id
             FROM warnings w
             WHERE w.seller_id = ?
             ORDER BY w.created_at DESC`,
            [sellerId]
        );
        res.status(200).json({ warnings });
    } catch (err) {
        console.error('Error fetching seller warnings:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

// (18) Endpoint to handle an appeal for a warning
router.post('/warnings/:id/appeal', authenticateSeller, async (req, res) => {
    const warningId = req.params.id;
    const { appeal_details } = req.body;
    const sellerId = req.user.id;

    if (!appeal_details) {
        return res.status(400).json({ message: 'Appeal details are required.' });
    }

    try {
        // Find the warning and ensure it belongs to the seller
        const [warningRows] = await db.query('SELECT seller_id FROM warnings WHERE id = ?', [warningId]);
        if (warningRows.length === 0 || warningRows[0].seller_id !== sellerId) {
            return res.status(403).json({ message: 'Unauthorized action or warning not found.' });
        }

        // Update the warning's appeal status
        const [result] = await db.query(
            'UPDATE warnings SET appeal_status = ?, appeal_details = ? WHERE id = ?',
            ['pending', appeal_details, warningId]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Appeal submitted successfully.' });
        } else {
            res.status(404).json({ message: 'Warning not found.' });
        }

    } catch (err) {
        console.error('Error submitting appeal:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// (19) Endpoint to get all product categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
        res.status(200).json({ categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;