// db.js - Database connection setup using mysql2/promise

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create the connection pool. This is more efficient for managing connections.
const pool = mysql.createPool({
    // Use the values from your MAMP configuration
    host: '127.0.0.1',
    port: 3306, 
    user: 'root',
    password: '',
    database: 'shoping_cill', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool so other files can use it to run queries
module.exports = pool;

console.log("Database connection pool created successfully.");
