const https = require('node:https');
const dns = require('node:dns');

async function fetchTheseus(path, token) {
    let ip = 'mail.hackclub.com';
    try {
        const addrs = await dns.promises.resolve4('mail.hackclub.com');
        if (!addrs || !addrs[0] || addrs[0] === '0.0.0.0' || addrs[0].startsWith('127.')) {
            ip = '104.18.28.137';
        } else {
            ip = addrs[0];
        }
    } catch (e) {
        ip = '104.18.28.137';
    }

    return new Promise((resolve, reject) => {
        const req = https.request({
            host: ip,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Host': 'mail.hackclub.com',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'EasyThere/1.0',
                'Accept': 'application/json'
            },
            servername: 'mail.hackclub.com',
            timeout: 6000
        }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(raw) });
                } catch (err) {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('Request timeout'));
        });
        req.end();
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ error: 'Hack Club Mail API Key is required' });
    }

    const cleanToken = token.trim();

    try {
        const meRes = await fetchTheseus('/api/public/v1/me', cleanToken);
        if (meRes.status === 401 || meRes.status === 403) {
            return res.status(401).json({ error: 'Invalid or revoked Hack Club Mail API Key' });
        }
        if (meRes.status !== 200 || !meRes.data) {
            return res.status(502).json({ error: 'Failed to authenticate with Hack Club Mail' });
        }

        const [mailRes, pkgRes] = await Promise.all([
            fetchTheseus('/api/public/v1/mail', cleanToken).catch(() => ({ status: 500, data: { mail: [] } })),
            fetchTheseus('/api/public/v1/packages', cleanToken).catch(() => ({ status: 500, data: { packages: [] } }))
        ]);

        return res.status(200).json({
            ok: true,
            user: meRes.data.user || null,
            mail: (mailRes.data && Array.isArray(mailRes.data.mail)) ? mailRes.data.mail : [],
            packages: (pkgRes.data && Array.isArray(pkgRes.data.packages)) ? pkgRes.data.packages : []
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to communicate with Hack Club Mail service' });
    }
};
