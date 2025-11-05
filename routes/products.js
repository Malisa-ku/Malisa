const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to authenticate any logged-in user
const authenticateUser = (req, res, next) => {
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
// 1.3.1 Category-specific features
// ===========================================

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM categories');
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ===========================================
// 1.3.2 Product-specific features
// ===========================================

// **Endpoint ใหม่สำหรับดึงสินค้าทั้งหมดของผู้ขาย**
router.get('/seller/:id', async (req, res) => {
    const sellerId = parseInt(req.params.id);
    const connection = await db.getConnection();
    try {
        const [products] = await connection.query('SELECT * FROM products WHERE seller_id = ? AND is_available = 1', [sellerId]);
        res.status(200).json({ message: 'Products fetched successfully.', products });
    } catch (err) {
        console.error('Error fetching seller products:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});


// Search for products with filters (IMPROVED: Check for Pending Orders)
router.get('/search', async (req, res) => {
    const { query, category_id, min_price, max_price, size, hip, length } = req.query;
    let sql = `
        SELECT 
            p.*,
            -- ตรวจสอบว่ามี Order ที่ 'รอดำเนินการ' (Pending) หรือ 'ชำระเงินแล้ว' (Paid) อยู่หรือไม่
            (SELECT COUNT(oi.id) FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.product_id = p.id 
             AND (o.status = 'รอดำเนินการ' OR o.status = 'ชำระเงินแล้ว')) AS reserved_stock_count
        FROM products p
        WHERE 1=1
    `;
    const params = [];

    if (query) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
    }

    if (category_id && !isNaN(parseInt(category_id))) {
        sql += ' AND p.category_id = ?';
        params.push(parseInt(category_id));
    }

    if (min_price && !isNaN(parseFloat(min_price))) {
        sql += ' AND p.price >= ?';
        params.push(parseFloat(min_price));
    }
    if (max_price && !isNaN(parseFloat(max_price))) {
        sql += ' AND p.price <= ?';
        params.push(parseFloat(max_price));
    }
    if (size) {
        sql += ' AND p.size = ?';
        params.push(size);
    }
    if (hip && !isNaN(parseFloat(hip))) {
        sql += ' AND p.hip = ?';
        params.push(parseFloat(hip));
    }
    if (length && !isNaN(parseFloat(length))) {
        sql += ' AND p.length = ?';
        params.push(parseFloat(length));
    }
    
    sql += ' ORDER BY p.id DESC';

    try {
        const [rows] = await db.query(sql, params);
        
        const productsWithStatus = rows.map(p => {
            const currentStock = p.stock_quantity;
            const reservedStock = parseInt(p.reserved_stock_count);
            
            // Logic: ถ้าสต็อกปัจจุบัน (ที่ตัดแล้ว) เป็น 0 หรือมี Order รอดำเนินการอยู่ (สำหรับสินค้า 1 ชิ้น) ให้ถือว่าหมด
            const isOutOfStockPending = currentStock <= 0 || reservedStock > 0;
            
            return {
                ...p,
                is_out_of_stock_pending: isOutOfStockPending // NEW FIELD for Frontend
            };
        });

        res.status(200).json({ message: 'Products retrieved successfully!', products: productsWithStatus });
    } catch (err) {
        console.error('Error searching products with pending status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json({ message: 'Product retrieved successfully!', product: rows[0] });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Add products to cart (a temporary, session-like API)
router.post('/cart/add', authenticateUser, async (req, res) => {
    const { items } = req.body; // items is an array of { productId, quantity }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'No items provided for cart.' });
    }

    const productDetails = [];
    try {
        for (const item of items) {
            if (!item.productId || !item.quantity || isNaN(parseInt(item.quantity))) {
                return res.status(400).json({ message: 'Invalid product or quantity format.' });
            }
            const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [item.productId]);
            if (rows.length === 0) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            productDetails.push({ ...rows[0], quantity: item.quantity });
        }
        res.status(200).json({ message: 'Products added to cart successfully!', cart: productDetails });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Checkout and create a new order
router.post('/checkout', authenticateUser, async (req, res) => {
    const { cart_items, total_price, seller_id, user_address, user_phone } = req.body;
    const buyer_id = req.user.id;

    if (!cart_items || !Array.isArray(cart_items) || !total_price || isNaN(parseFloat(total_price)) || !seller_id || !user_address || !user_phone) {
        return res.status(400).json({ message: 'Missing or invalid checkout information.' });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if there is enough stock before creating the order
        for (const item of cart_items) {
            const [productRows] = await connection.query('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE', [item.productId]);
            if (productRows.length === 0 || productRows[0].stock_quantity < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ message: `สินค้า ${item.productId} มีสต็อกไม่พอ` });
            }
        }
        
        // 1. Create the new order
        // NOTE: สถานะเริ่มต้นควรเป็น "รอดำเนินการ" เพื่อรอสลิป (ตาม Logic ของ users.js)
        const [orderResult] = await connection.query(
            'INSERT INTO orders (buyer_id, seller_id, total_price, status, user_address, user_phone) VALUES (?, ?, ?, "รอดำเนินการ", ?, ?)',
            [buyer_id, seller_id, total_price, user_address, user_phone]
        );
        const orderId = orderResult.insertId;

        // 2. Insert items into order_items table and update product stock
        for (const item of cart_items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.price]
            );

            // Update the product's stock quantity (ตัดสต็อกทันที)
            await connection.query(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Order created successfully!', orderId });
    } catch (err) {
        await connection.rollback();
        console.error('Error during checkout:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        connection.release();
    }
});

// Report a problem with an order
router.post('/report-problem', authenticateUser, async (req, res) => {
    const { orderId, description } = req.body;
    const buyerId = req.user.id;
    
    if (!orderId || !description) {
        return res.status(400).json({ message: 'Missing required problem information.' });
    }
    
    try {
        const [orderRows] = await db.query('SELECT buyer_id FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0 || orderRows[0].buyer_id !== buyerId) {
            return res.status(403).json({ message: 'Unauthorized action or order not found.' });
        }
        
        const [result] = await db.query(
            'INSERT INTO problems (order_id, description, status) VALUES (?, ?, "open")',
            [orderId, description]
        );
        res.status(201).json({ message: 'Problem reported successfully!', problemId: result.insertId });
    } catch (err) {
        console.error('Error reporting problem:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;