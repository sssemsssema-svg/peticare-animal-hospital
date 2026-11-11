/**
 * Cloudflare Pages Function: 11:00 PM Radar Scheduled Trigger (v49 Safeguard 1 & 4)
 * Uses Africa/Cairo local date string to accurately match tomorrow's follow-up appointments
 * Checks tomorrow's due follow-up patients and alerts the Doctor's personal WhatsApp
 */

function getCairoDateString(dateObj = new Date()) {
    try {
        return new Date(dateObj).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    } catch (e) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

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

export async function onRequest(context) {
    try {
        const env = context.env || {};
        const SUPABASE_URL = env.SUPABASE_URL || 'https://fbetvfdmoyfdyctmmodl.supabase.co';
        const SUPABASE_KEY = env.SUPABASE_KEY || 'sb_publishable_El3H_v_leeMy-RaB9kKFaQ_FleDmH4w';
        const PHONE_ID = env.META_PHONE_ID || '100647892348572';
        const ACCESS_TOKEN = env.META_ACCESS_TOKEN || '';
        const DOCTOR_FORWARD_PHONE = env.DOCTOR_FORWARD_PHONE || '201555345999';

        // Calculate tomorrow's date string YYYY-MM-DD in Africa/Cairo timezone
        const nowCairo = new Date();
        const tomorrowCairo = new Date(nowCairo.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = getCairoDateString(tomorrowCairo);

        // Fetch active patients from Supabase
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/patients?deleted=eq.false`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!resp.ok) {
            return new Response(JSON.stringify({ error: 'Supabase fetch failed' }), { status: 500 });
        }

        const patients = await resp.json();
        const duePatients = [];

        (patients || []).forEach(p => {
            if (!Array.isArray(p.visits)) return;
            const hasTomorrowVisit = p.visits.some(v => v.followUpDate === tomorrowStr);
            if (hasTomorrowVisit) {
                duePatients.push({
                    name: p.name || 'أليف',
                    ownerName: p.owner_name || p.ownerName || 'عميل',
                    phone: p.phone || ''
                });
            }
        });

        const count = duePatients.length;
        if (count > 0 && ACCESS_TOKEN) {
            const patientNamesList = duePatients.slice(0, 8).map((p, i) => `${i + 1}. ${p.name} (${p.ownerName})`).join('\n');
            const alertMsg = `📡 *رادار بيتي كير الذكي (تذكير الساعة 11 مساءً)*\nأهلاً دكتور شريف، يوجد غداً بإذن الله عدد (${count}) حالات مستحقة لكشف الإعادة والمتابعة:\n${patientNamesList}\n\n🔗 *اضغط هنا لفتح الرادار ومراجعتهم أو إرسال التذكير لهم جميعاً بضغطة واحدة:*\nhttps://peticare-animal-hospital.pages.dev/doctor.html?open_radar=1#radar`;

            const targetDoctorPhone = normalizeEgyptPhone(DOCTOR_FORWARD_PHONE);

            await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: targetDoctorPhone,
                    type: "text",
                    text: { preview_url: true, body: alertMsg }
                })
            });
        }

        return new Response(JSON.stringify({ status: 'ok', count, tomorrowDate: tomorrowStr, duePatients }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
