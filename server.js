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

// Serve Qlik Dashboard at ROOT
app.use(express.static(path.join(__dirname, 'embedded_analytics')));

// Also serve public folder if needed (optional)
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'embedded_analytics', 'index.html'));
});

// Backward compatibility (optional)
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
// Qlik OAuth Token Exchange Proxy (Bypasses CORS & IPv6 Timeouts)
const fs = require('fs');
const REFRESH_TOKEN_FILE = path.join(__dirname, 'qlik_refresh_token.txt');

app.post('/api/qlik/token', (req, res) => {
    const { code, clientId, clientSecret, host, redirectUri } = req.body;
    console.log('🔄 Exchanging Qlik Token for host:', host);

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
                    const json = JSON.parse(data);

                    // SAVE REFRESH TOKEN PERMANENTLY
                    if (json.refresh_token) {
                        fs.writeFileSync(REFRESH_TOKEN_FILE, json.refresh_token);
                        console.log('💾 Refresh Token Saved for Guest Access!');
                    }

                    res.json(json);
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

// GUEST ACCESS ENDPOINT (For Recruiters)
app.post('/api/qlik/guest', (req, res) => {
    if (!fs.existsSync(REFRESH_TOKEN_FILE)) {
        return res.status(404).json({ error: 'No Guest Session Available. Owner must login once first.' });
    }

    const refreshToken = fs.readFileSync(REFRESH_TOKEN_FILE, 'utf8').trim();
    const { clientId, clientSecret, host } = req.body;

    console.log('🎫 Guest Access Requested. Using saved Refresh Token...');

    const payload = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
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

    const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', (chunk) => data += chunk);
        tokenRes.on('end', () => {
            if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
                console.log('✅ Guest Access Token Generated');
                res.json(JSON.parse(data));
            } else {
                console.error(`❌ Guest Access Failed (${tokenRes.statusCode}):`, data);
                res.status(tokenRes.statusCode).send(data);
            }
        });
    });

    tokenReq.on('error', (err) => res.status(500).json({ error: err.message }));
    tokenReq.write(payload);
    tokenReq.end();
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
        console.log('🔄 Proxying WebSocket to:', targetHost);

        // Parse URL to extract token and params
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const accessToken = requestUrl.searchParams.get('access_token');
        const clientId = requestUrl.searchParams.get('qlik-client-id');

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

        // INJECT HEADERS (Auth + Integration ID)
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (clientId) {
            headers['Qlik-Web-Integration-Id'] = clientId; // Attempting to use ClientID as Web Integration ID
        }

        // Clean Path: Remove query params entirely to avoid conflicts
        // We only need the /app/{id} part.
        const targetPath = requestUrl.pathname.replace('/qlik-ws', '');

        console.log('🔗 Upstream Path:', targetPath);
        console.log('📤 Sending Headers:', JSON.stringify(headers)); // Debug

        const proxyReq = https.request({
            hostname: targetHost,
            port: 443,
            path: targetPath, // Sending clean path without query params
            method: 'GET',
            headers: headers,
            family: 4, // Force IPv4 to avoid potential IPv6 timeouts
            rejectUnauthorized: false // Permissive SSL for proxy stability
        });

        proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
            console.log('✅ WS Handshake Proxy Successful');

            // Prevent Crashes on Socket Errors (ECONNRESET)
            proxySocket.on('error', (err) => console.error('❌ Proxy Socket Error:', err.message));
            socket.on('error', (err) => console.error('❌ Client Socket Error:', err.message));

            // Reconstruct handshake response
            const responseHeaders = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                'Sec-WebSocket-Accept: ' + proxyRes.headers['sec-websocket-accept']
            ];

            if (proxyRes.headers['sec-websocket-protocol']) {
                responseHeaders.push('Sec-WebSocket-Protocol: ' + proxyRes.headers['sec-websocket-protocol']);
            }

            socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

            // Pipe data
            proxySocket.pipe(socket);
            socket.pipe(proxySocket);
        });

        // Handle HTTP errors (e.g., 401, 403, 400) - Qlik rejected the connection
        proxyReq.on('response', (res) => {
            console.error(`❌ Qlik Rejected Connection. Status: ${res.statusCode}`);
            console.error('Headers:', JSON.stringify(res.headers));

            // Forward the error to the client
            if (!socket.destroyed) {
                socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n\r\n`);
                socket.end();
            }
        });

        proxyReq.on('error', (err) => {
            console.error('❌ Proxy Request Error:', err.message);
            if (!socket.destroyed) {
                socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                socket.end();
            }
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
