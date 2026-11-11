/**
 * Node.js / Express Webhook Server for Meta WhatsApp Cloud API (v49 Safeguard 3)
 * Environment Variable based configuration (no localStorage)
 * Infinite-loop protection and 5-minute client cooldown auto-responder
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'peticare_webhook_secret_2026';
const PHONE_ID = process.env.META_PHONE_ID || '100647892348572';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const DOCTOR_FORWARD_PHONE = process.env.DOCTOR_FORWARD_PHONE || '201555345999';

// In-memory cooldown cache for client auto-replies (5 minutes = 300,000 ms)
const recentAutoReplies = new Map();

function normalizeEgyptPhone(rawPhone) {
    if (!rawPhone) return '';
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0020')) {
        clean = '20' + clean.slice(4);
    }
    if (clean.startsWith('01') && clean.length === 11) {
        clean = '2' + clean;
    }
    if (clean.length < 10) return '';
    return clean;
}

function sendWhatsAppText(to, text) {
    if (!ACCESS_TOKEN) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { preview_url: true, body: text }
        });

        const req = https.request({
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v20.0/${PHONE_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // 1. Webhook Verification (GET)
    if (req.method === 'GET' && parsedUrl.pathname === '/webhook') {
        const mode = parsedUrl.query['hub.mode'];
        const token = parsedUrl.query['hub.verify_token'];
        const challenge = parsedUrl.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(challenge);
        } else {
            res.writeHead(403);
            res.end('Forbidden');
        }
        return;
    }

    // 2. Incoming Notification / Message (POST)
    if (req.method === 'POST' && parsedUrl.pathname === '/webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const entry = payload.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;

                // Loop & Receipt Filtering: Ignore delivery receipts, sent statuses, or empty events
                if (!value || !Array.isArray(value.messages) || value.messages.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'OK' }));
                    return;
                }

                const msg = value.messages[0];
                const fromRaw = msg.from;
                const normalizedFrom = normalizeEgyptPhone(fromRaw);
                const normalizedDoctor = normalizeEgyptPhone(DOCTOR_FORWARD_PHONE);

                // Infinite-loop prevention: Do not forward if sender is the doctor or the bot itself
                if (!normalizedFrom || normalizedFrom === normalizedDoctor || msg.from_me) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'OK' }));
                    return;
                }

                const contactName = value?.contacts?.[0]?.profile?.name || 'عميل';
                let bodyText = msg.text?.body || '';

                if (msg.type === 'image') bodyText = '[صورة مرفقة] ' + (msg.image?.caption || '');
                else if (msg.type === 'document') bodyText = '[مستند/ملف مرفق] ' + (msg.document?.filename || '');
                else if (msg.type === 'audio') bodyText = '[رسالة صوتية مسجلة]';

                // 1. ALWAYS forward message to Doctor's personal WhatsApp
                const forwardMessage = `📩 *رسالة محولة تلقائياً من عميل*\n👤 الاسم: ${contactName}\n📞 الرقم: +${normalizedFrom}\n💬 الرسالة: ${bodyText}\n\n🔗 *للرد على العميل من رقمك الخاص:*\nhttps://wa.me/${normalizedFrom}`;
                await sendWhatsAppText(normalizedDoctor, forwardMessage);

                // 2. Automated Auto-Reply to Client with 5-minute cooldown guard
                const now = Date.now();
                const lastReplyTime = recentAutoReplies.get(normalizedFrom) || 0;
                const COOLDOWN_MS = 5 * 60 * 1000;

                if (now - lastReplyTime > COOLDOWN_MS) {
                    recentAutoReplies.set(normalizedFrom, now);
                    const clientAutoReply = `🤖 أهلاً بك في مستشفى بيتي كير البيطري 🐾\nهذا الرقم مخصص لإرسال التقارير الطبية آلياً فقط ولا يستقبل محادثات.\n\nتم تحويل رسالتك للطبيب المختص، وللتواصل والاستفسار المباشر يرجى مراسلة واتساب العيادة الرسمي:\nhttps://wa.me/${normalizedDoctor}`;
                    await sendWhatsAppText(normalizedFrom, clientAutoReply);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Meta WhatsApp Forwarder Webhook listening on port ${PORT}`);
    });
}

module.exports = { server, sendWhatsAppText, normalizeEgyptPhone };
