// Configuration
const CONFIG = {
    url: 'flo13jpumt442e8.in.qlikcloud.com',
    clientId: '019b758d9a44d2ab60270d035c71e171',
    // WARNING: Storing secret in frontend is only for local dev/demo. Never do this in production.
    clientSecret: '6fb1ef439ea0f128670a6a65e8f3b0b791567c8b48120cc27e73ffee5d746919',
    appId: '56fa0d58-a8db-4dc8-8ab7-0c9d5ba0dab0'
};

let app = null;

function log(msg) {
    const el = document.getElementById('ui-log'); // Updated to Sidebar Log
    if (el) { el.innerHTML += `> ${msg}<br>`; el.scrollTop = el.scrollHeight; }
    console.log(msg);
}

function authenticate() {
    // Dynamic Redirect URL (Works for Localhost AND Online/Render)
    const redirectUrl = window.location.origin + '/qlik/';
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://${CONFIG.url}/oauth/authorize?client_id=${CONFIG.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=user_default%20offline_access&state=${state}`;

    log('🔄 Redirecting to Login...');
    window.location.href = authUrl;
}

async function connectToQlik() {
    log('🚀 Connecting to Qlik Cloud...');

    // 1. Check for Authorization Code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    let accessToken = sessionStorage.getItem('qlik_token'); // Use stored token if available

    try {
        // If we have a new Code, exchange it for a Token
        if (authCode) {
            log('🔑 Exchanging Code for Token...');

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Use Local Proxy (Bypasses CORS)
            const tokenResponse = await fetch('/api/qlik/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: CONFIG.url,
                    clientId: CONFIG.clientId,
                    clientSecret: CONFIG.clientSecret,
                    code: authCode,
                    redirectUri: window.location.origin + '/qlik/' // Send dynamic URI
                })
            });

            if (!tokenResponse.ok) throw new Error('Token Exchange Failed: ' + tokenResponse.statusText);

            const tokens = await tokenResponse.json();
            accessToken = tokens.access_token;
            sessionStorage.setItem('qlik_token', accessToken);
            log('✅ Access Token Acquired!');
            console.log('DEBUG_TOKEN:', accessToken); // Print for inspection
        }

        if (!accessToken) {
            log('🔒 No Token found. Redirecting to Login...');
            setTimeout(authenticate, 1000);
            return;
        }

        // 2. Connect using the Access Token
        const schema = await fetch('https://unpkg.com/enigma.js@2.4.0/schemas/12.170.2.json').then(r => r.json());

        // Pass token in URL (Standard Qlik Cloud JWT behavior)
        // STRATEGY: Use Local WebSocket Proxy to bypass Browser Origin Blocks
        // We connect to 'ws://localhost:3000/qlik-ws/...' and the Node server tunnels to Qlik.
        // Also remove 'qlik-web-integration-id' since we are proxied.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/qlik-ws/app/${CONFIG.appId}?qlik-client-id=${CONFIG.clientId}&access_token=${accessToken}`;

        log(`🔗 Dialing Local Proxy: ${wsUrl}...`);
        const session = enigma.create({ schema, url: wsUrl });

        // Debugging Session Events
        session.on('notification', (e) => log('🔔 Notification: ' + JSON.stringify(e)));
        session.on('closed', (e) => log('🚫 Session Closed: ' + JSON.stringify(e)));
        session.on('opened', () => log('🔓 Socket Connection Opened via Proxy'));

        const global = await session.open();
        log('✅ Session Established via Proxy!');

        log(`📂 Opening App (Implicit in Proxy URL): ${CONFIG.appId}...`);
        app = await global.openDoc(CONFIG.appId);
        log(`🎉 App Connected: ${app.id}`);

    } catch (err) {
        // Safe Error Handling
        const msg = err ? (err.message || JSON.stringify(err)) : 'Unknown Error';
        log('❌ Error: ' + msg);
        console.error(err);

        // If 401 or Token issue, try generic retry
        if (msg && (msg.includes('Token') || msg.includes('401') || msg.includes('Socket'))) {
            log('♻️ Auth issue detected. Retrying in 3s...');
            sessionStorage.removeItem('qlik_token');
            // setTimeout(authenticate, 3000); // Do not auto-redirect for Socket errors yet, just wait.
        }
        return app;
    }
}