// server.js - Backend server setup
const express = require('express');
const cors = require('cors'); 
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ตั้งค่าให้ Express สามารถเสิร์ฟไฟล์ในโฟลเดอร์ 'uploads' ผ่าน URL ที่มี prefix '/uploads'
app.use('/uploads', express.static('uploads')); 

const db = require('./db'); 
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Database connected successfully!');
    connection.release();
});

const usersRoute = require('./routes/users');
const productsRoute = require('./routes/products');
const sellerRoute = require('./routes/seller');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth'); 
const settingsRoute = require('./routes/settings');

app.use('/api/users', usersRoute);
app.use('/api/products', productsRoute);
app.use('/api/sellers', sellerRoute);
app.use('/api/admin', adminRoute);
app.use('/api/auth', authRoute); 
app.use('/api/settings', settingsRoute);

app.get('/', (req, res) => {
    res.send('Welcome to the Shop Chill API!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
