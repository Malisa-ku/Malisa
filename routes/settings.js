const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); 

// --- Middleware ---
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

const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

// --- การตั้งค่า Multer สำหรับอัปโหลดโลโก้ ---
const uploadDir = 'uploads/logo';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // แก้ไข: ใช้ชื่อไฟล์ที่ไม่ซ้ำกันเพื่อป้องกันการเขียนทับ
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = 'shop-logo-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.'));
    }
});

// --- API Endpoints ---
/**
 * @route POST /api/settings/logo
 * @desc อัปโหลดและอัปเดตโลโก้เว็บไซต์ (สำหรับ Admin)
 * @access Private (Admin only)
 */
router.post('/logo', [authenticateToken, checkAdmin, upload.single('logo')], async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        
        const logoUrl = path.join(uploadDir, req.file.filename).replace(/\\/g, '/');

        // ตรวจสอบและลบไฟล์เก่าก่อนบันทึกไฟล์ใหม่
        const [oldLogoRows] = await connection.query('SELECT setting_value FROM settings WHERE setting_name = ?', ['site_logo']);
        if (oldLogoRows.length > 0) {
            const oldLogoPath = path.join(__dirname, '..', oldLogoRows[0].setting_value);
            if (fs.existsSync(oldLogoPath)) {
                fs.unlinkSync(oldLogoPath);
            }
        }

        await connection.query(
            'INSERT INTO settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['site_logo', logoUrl, logoUrl]
        );
        
        res.status(200).json({ message: 'Logo uploaded and saved successfully!', logoUrl: `/${logoUrl}` });
    } catch (err) {
        console.error('Error uploading logo:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @route GET /api/settings/logo
 * @desc ดึง URL โลโก้เว็บไซต์ (สาธารณะ)
 * @access Public
 */
router.get('/logo', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query('SELECT setting_value FROM settings WHERE setting_name = ?', ['site_logo']);
        
        if (rows.length > 0) {
            // ส่งค่า path ที่ได้จากฐานข้อมูลกลับไป
            res.status(200).json({ logoUrl: rows[0].setting_value.replace(/\\/g, '/') });
        } else {
            res.status(404).json({ message: 'Logo not found.' });
        }
    } catch (err) {
        console.error('Error fetching logo:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;