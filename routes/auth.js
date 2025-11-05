const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ===========================================
// 1.1.2 User authentication features
// ===========================================

// Handle user registration
router.post('/register', async (req, res) => {
    const { profile_name, full_name, email, password, role } = req.body;
    
    // Simple validation
    if (!profile_name || !full_name || !email || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if the email already exists
        const [existingUsers] = await connection.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Email already exists.' });
        }

        // Insert new user into the database
        const [result] = await connection.query(
            'INSERT INTO users (profile_name, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [profile_name, full_name, email, hashedPassword, role]
        );
        
        await connection.commit();
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (err) {
        await connection.rollback();
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

// Handle generic login for all user types (buyer, seller, admin)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query('SELECT id, password, role, profile_name, full_name, email, profile_image_url FROM users WHERE email = ?', [email]);
        
        // If user not found or password doesn't match
        if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const user = rows[0];

        // ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'สำหรับ Admin กรุณาใช้หน้า Login เฉพาะ' });
        }
        
        // Create a JWT token with user's ID and role
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Respond with the token and complete user data
        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                profile_name: user.profile_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                profile_image_url: user.profile_image_url
            },
        });

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

// **เพิ่ม** endpoint เฉพาะสำหรับ Admin Login
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query('SELECT id, password, role, profile_name, full_name, email FROM users WHERE email = ?', [email]);
        
        // If user not found or password doesn't match
        if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const user = rows[0];

        // **ตรวจสอบให้แน่ใจว่าเป็น Admin เท่านั้น**
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
        
        // Create a JWT token with user's ID and role
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Respond with the token and complete user data
        res.status(200).json({
            message: 'Admin login successful!',
            token,
            user: {
                id: user.id,
                profile_name: user.profile_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

// **เพิ่ม** endpoint สำหรับการรีเซ็ตรหัสผ่านโดยตรง
router.post('/reset-password-direct', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if the email exists
        const [existingUsers] = await connection.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบอีเมลในระบบ' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const [result] = await connection.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        await connection.commit();
        res.status(200).json({ message: 'รหัสผ่านถูกรีเซ็ตสำเร็จแล้ว' });

    } catch (err) {
        await connection.rollback();
        console.error('Error during password reset:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
