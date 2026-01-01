const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supply_chain_db',
    port: process.env.DB_PORT || 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

// Middleware to attach database connection to request
app.use(async (req, res, next) => {
    try {
        req.db = pool;
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the Qlik Embedded Analytics demo
app.use('/qlik', express.static(path.join(__dirname, 'embedded_analytics')));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
    }
});

// Qlik OAuth Token Exchange Proxy (Bypasses CORS & IPv6 Timeouts)
app.post('/api/qlik/token', (req, res) => {
    const { code, clientId, clientSecret, host, redirectUri } = req.body;
    console.log('🔄 Exchanging Qlik Token for host:', host);

    // Debug Params (Safe Logging)
    console.log('📝 Params:', { clientId, redirectUri, codeReceived: !!code });

    const payload = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || 'http://localhost:3000/qlik/'
    });

    const options = {
        hostname: host,
        port: 443,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        },
        family: 4, // Force IPv4 to avoid potential IPv6 timeouts (Critical Fix)
        rejectUnauthorized: false
    };

    const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', (chunk) => data += chunk);
        tokenRes.on('end', () => {
            if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
                console.log('✅ Token acquired successfully');
                try {
                    res.json(JSON.parse(data));
                } catch (e) {
                    res.status(500).send('Invalid JSON from Qlik');
                }
            } else {
                console.error(`❌ Qlik Token Error (${tokenRes.statusCode}):`, data);
                res.status(tokenRes.statusCode).send(data);
            }
        });
    });

    tokenReq.on('error', (err) => {
        console.error('❌ Proxy Network Error:', err.message);
        res.status(500).json({ error: err.message });
    });

    tokenReq.write(payload);
    tokenReq.end();
});

// Auto-Login Endpoint using stored Refresh Token
app.get('/api/qlik/auto-login', (req, res) => {
    const refreshToken = process.env.QLIK_REFRESH_TOKEN;

    if (!refreshToken) {
        return res.status(404).json({ error: 'No refresh token configured on server.' });
    }

    console.log('🔄 Attempting Auto-Refresh with Token...');
    const clientId = '019b758d9a44d2ab60270d035c71e171'; // Move to env in future
    const clientSecret = '6fb1ef439ea0f128670a6a65e8f3b0b791567c8b48120cc27e73ffee5d746919';
    const host = 'flo13jpumt442e8.in.qlikcloud.com';

    const payload = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    const options = {
        hostname: host,
        port: 443,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        },
        family: 4,
        rejectUnauthorized: false
    };

    const refreshReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', (chunk) => data += chunk);
        tokenRes.on('end', () => {
            if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
                console.log('✅ Auto-Renewal Successful');
                res.json(JSON.parse(data));
            } else {
                console.error(`❌ Auto-Renewal Failed (${tokenRes.statusCode}):`, data);
                res.status(tokenRes.statusCode).send(data);
            }
        });
    });

    refreshReq.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });

    refreshReq.write(payload);
    refreshReq.end();
});

// Start server with WebSocket Proxy
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Manual WebSocket Proxy (No dependencies required)
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/qlik-ws')) {
        const targetHost = 'flo13jpumt442e8.in.qlikcloud.com';
        console.log('🔄 [Proxy] Incoming Connection:', req.url);

        // Parse URL to extract token and params
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const accessToken = requestUrl.searchParams.get('access_token');

        // Filter headers to avoid conflicts
        const headers = {};
        Object.keys(req.headers).forEach(key => {
            if (key !== 'host' && key !== 'origin' && key !== 'referer' && key !== 'sec-websocket-key' && key !== 'sec-websocket-version' && key !== 'upgrade' && key !== 'connection') {
                headers[key] = req.headers[key];
            }
        });

        // Essential WebSocket Headers
        headers['Host'] = targetHost;
        headers['Origin'] = `https://${targetHost}`;
        headers['Upgrade'] = 'websocket';
        headers['Connection'] = 'Upgrade';
        headers['Sec-WebSocket-Version'] = '13';
        headers['Sec-WebSocket-Key'] = req.headers['sec-websocket-key'];
        if (req.headers['sec-websocket-protocol']) {
            headers['Sec-WebSocket-Protocol'] = req.headers['sec-websocket-protocol'];
        }

        // INJECT HEADERS (Auth Only)
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
            console.error('❌ [Proxy] Missing Access Token in Query Params');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const targetPath = requestUrl.pathname.replace('/qlik-ws', '');
        console.log(`🔗 [Proxy] Upstream: wss://${targetHost}${targetPath}`);

        const proxyReq = https.request({
            hostname: targetHost,
            port: 443,
            path: targetPath,
            method: 'GET',
            headers: headers,
            family: 4,
            rejectUnauthorized: false
        });

        proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
            console.log('✅ [Proxy] Upstream Connected!');
            socket.write([
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                'Sec-WebSocket-Accept: ' + proxyRes.headers['sec-websocket-accept'],
                proxyRes.headers['sec-websocket-protocol'] ? 'Sec-WebSocket-Protocol: ' + proxyRes.headers['sec-websocket-protocol'] : ''
            ].join('\r\n') + '\r\n\r\n');

            proxySocket.pipe(socket);
            socket.pipe(proxySocket);
        });

        proxyReq.on('response', (res) => {
            console.error(`❌ [Proxy] Upstream Rejected: ${res.statusCode} ${res.statusMessage}`);
            // Drain response to avoid memory leaks
            res.on('data', () => { });
            if (!socket.destroyed) {
                socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n\r\n`);
                socket.end();
            }
        });

        proxyReq.on('error', (err) => {
            console.error('❌ [Proxy] Network Error:', err.message);
            if (!socket.destroyed) socket.end();
        });

        proxyReq.end();
    } else {
        socket.destroy();
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});
