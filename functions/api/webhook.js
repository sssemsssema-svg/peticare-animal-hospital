/**
 * Cloudflare Pages Function: Meta WhatsApp Cloud API Webhook (v49 Safeguard 3)
 * Handles webhook verification (GET) and incoming message auto-forwarding & auto-reply (POST)
 * Serverless Environment: No localStorage used, reads context.env exclusively
 * Infinite-loop protection and 5-minute cooldown auto-responder guard
 */

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

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const env = context.env || {};
    const VERIFY_TOKEN = env.META_VERIFY_TOKEN || 'peticare_webhook_secret_2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }
    return new Response('Verification failed', { status: 403 });
}

export async function onRequestPost(context) {
    try {
        const payload = await context.request.json();
        const env = context.env || {};
        const PHONE_ID = env.META_PHONE_ID || '100647892348572';
        const ACCESS_TOKEN = env.META_ACCESS_TOKEN || '';
        const DOCTOR_FORWARD_PHONE = env.DOCTOR_FORWARD_PHONE || '201555345999';

        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Loop & Receipt Filtering: Ignore delivery receipts, sent statuses, or empty events
        if (!value || !Array.isArray(value.messages) || value.messages.length === 0) {
            return new Response('OK', { status: 200 });
        }

        const msg = value.messages[0];
        const fromRaw = msg.from;
        const normalizedFrom = normalizeEgyptPhone(fromRaw);
        const normalizedDoctor = normalizeEgyptPhone(DOCTOR_FORWARD_PHONE);

        // Infinite-loop prevention: Do not forward if sender is the doctor or the bot itself
        if (!normalizedFrom || normalizedFrom === normalizedDoctor || msg.from_me) {
            return new Response('OK', { status: 200 });
        }

        const contactName = value?.contacts?.[0]?.profile?.name || 'عميل';
        let bodyText = msg.text?.body || '';

        if (msg.type === 'image') bodyText = '[صورة مرفقة] ' + (msg.image?.caption || '');
        else if (msg.type === 'document') bodyText = '[مستند/ملف مرفق] ' + (msg.document?.filename || '');
        else if (msg.type === 'audio') bodyText = '[رسالة صوتية مسجلة]';

        if (ACCESS_TOKEN) {
            // 1. ALWAYS forward incoming message to Doctor's personal WhatsApp
            const forwardMessage = `📩 *رسالة محولة تلقائياً من عميل*\n👤 الاسم: ${contactName}\n📞 الرقم: +${normalizedFrom}\n💬 الرسالة: ${bodyText}\n\n🔗 *للرد على العميل من رقمك الخاص:*\nhttps://wa.me/${normalizedFrom}`;

            await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: normalizedDoctor,
                    type: "text",
                    text: { preview_url: true, body: forwardMessage }
                })
            });

            // 2. Automated Auto-Reply to Client with 5-minute cooldown guard
            const now = Date.now();
            const lastReplyTime = recentAutoReplies.get(normalizedFrom) || 0;
            const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

            if (now - lastReplyTime > COOLDOWN_MS) {
                recentAutoReplies.set(normalizedFrom, now);

                const clientAutoReply = `🤖 أهلاً بك في مستشفى بيتي كير البيطري 🐾\nهذا الرقم مخصص لإرسال التقارير الطبية آلياً فقط ولا يستقبل محادثات.\n\nتم تحويل رسالتك للطبيب المختص، وللتواصل والاستفسار المباشر يرجى مراسلة واتساب العيادة الرسمي:\nhttps://wa.me/${normalizedDoctor}`;

                await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizedFrom,
                        type: "text",
                        text: { preview_url: true, body: clientAutoReply }
                    })
                });
            }
        }

        return new Response(JSON.stringify({ status: 'success' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
