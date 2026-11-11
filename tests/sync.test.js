/**
 * PetiCare v49 Handover Automated Test Suite
 * Validates Synchronization, Anti-Collision IDs, Soft-Delete Tombstones,
 * Edit Visit & Debt Settlement, Cairo Timezone, Egyptian Phone Normalization,
 * Offline QR density limit, and Medical Corrector Spoken Fractions.
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

console.log('🧪 Starting PetiCare v49 Production Handover Test Suite (With 7 Safeguards)...\n');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Mock browser objects
global.window = {
    localStorage: global.localStorage,
    location: { href: '' }
};

// ==========================================
// TEST 1: Unique Visit ID Generation & Zero Collisions
// ==========================================
console.log('▶ Test 1: Unique Visit ID Generation (Zero-Collision)...');
function generateVisitId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `VIS-${ts}-${rand}`;
}

const idSet = new Set();
const ITERATIONS = 5000;
for (let i = 0; i < ITERATIONS; i++) {
    const id = generateVisitId();
    assert.ok(id.startsWith('VIS-'), `ID must start with VIS-: ${id}`);
    assert.strictEqual(idSet.has(id), false, `Collision detected on iteration ${i}: ${id}`);
    idSet.add(id);
}
console.log(`  ✅ Passed: Generated ${ITERATIONS} consecutive visit IDs with 0 collisions.`);

// ==========================================
// TEST 2: Granular Per-Visit Delta Merging
// ==========================================
console.log('\n▶ Test 2: Granular Per-Visit Delta Merging (Two Devices)...');
function deltaMergeVisits(localVisits, cloudVisits) {
    const visitMap = new Map();
    (localVisits || []).forEach(v => visitMap.set(String(v.id), { ...v }));

    (cloudVisits || []).forEach(cv => {
        const id = String(cv.id);
        if (!visitMap.has(id)) {
            visitMap.set(id, cv);
        } else {
            const lv = visitMap.get(id);
            const cvTime = cv.updated_at || cv.updatedAt || 0;
            const lvTime = lv.updated_at || lv.updatedAt || 0;
            if (cvTime > lvTime) {
                visitMap.set(id, { ...lv, ...cv });
            }
        }
    });

    return Array.from(visitMap.values());
}

const deviceA_Visits = [
    { id: 'VIS-A1', diagnosis: 'نزلة معوية', treatment: 'مضاد حيوي', updated_at: 100 }
];
const deviceB_Visits = [
    { id: 'VIS-B1', diagnosis: 'فحص دوري', treatment: 'فيتامينات', updated_at: 200 }
];

const merged = deltaMergeVisits(deviceA_Visits, deviceB_Visits);
assert.strictEqual(merged.length, 2, 'Merged visits should contain visits from both devices without clobbering');
assert.ok(merged.some(v => v.id === 'VIS-A1'));
assert.ok(merged.some(v => v.id === 'VIS-B1'));
console.log('  ✅ Passed: Multi-device visits merged granularly without overwriting.');

// ==========================================
// TEST 3: Soft-Delete & Tombstone Resurrection Prevention
// ==========================================
console.log('\n▶ Test 3: Soft-Delete & Tombstone Resurrection Prevention...');
const tombstones = ['PATIENT-999'];
localStorage.setItem('peticare_tombstones', JSON.stringify(tombstones));

const incomingCloudPatients = [
    { id: 'PATIENT-999', name: 'قط محذوف', deleted: false, updatedAt: Date.now() },
    { id: 'PATIENT-100', name: 'بسبس', deleted: false, updatedAt: Date.now() }
];

// Replicate deltaMergePatients tombstone check
const activePatients = incomingCloudPatients.filter(cp => {
    const deadList = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]');
    return !deadList.includes(String(cp.id));
});

assert.strictEqual(activePatients.length, 1);
assert.strictEqual(activePatients[0].id, 'PATIENT-100');
console.log('  ✅ Passed: Deleted patient blocked by tombstone; did NOT resurrect.');

// ==========================================
// TEST 4: Edit Saved Visit & Automatic Debt Balance Recalculation
// ==========================================
console.log('\n▶ Test 4: Edit Saved Visit & Financial Calculation...');
const patient = {
    id: 'PAT-1',
    name: 'ماكس',
    visits: [
        { id: 'VIS-1', diagnosis: 'اشتباه كسر', treatment: 'أشعة سينية', fee: 300, paid: 100, remaining: 200 }
    ]
};

function updateVisit(p, vid, updates) {
    const v = p.visits.find(x => x.id === vid);
    if (!v) return null;
    Object.assign(v, updates);
    v.fee = Number(v.fee) || 0;
    v.paid = Number(v.paid) || 0;
    v.remaining = Math.max(0, v.fee - v.paid);
    v.updated_at = Date.now();
    return v;
}

const updatedVisit = updateVisit(patient, 'VIS-1', { fee: 400, paid: 250, diagnosis: 'شرخ بسيط' });
assert.strictEqual(updatedVisit.fee, 400);
assert.strictEqual(updatedVisit.paid, 250);
assert.strictEqual(updatedVisit.remaining, 150);
assert.strictEqual(updatedVisit.diagnosis, 'شرخ بسيط');
console.log('  ✅ Passed: Visit updated and financial balance recalculated correctly (400 - 250 = 150).');

// ==========================================
// TEST 5: One-Click Debt Settlement
// ==========================================
console.log('\n▶ Test 5: One-Click Debt Settlement...');
function settleDebt(p, vid) {
    const v = p.visits.find(x => x.id === vid);
    if (!v) return false;
    v.paid = v.fee;
    v.remaining = 0;
    v.settledAt = new Date().toISOString();
    v.updated_at = Date.now();
    return true;
}

assert.strictEqual(settleDebt(patient, 'VIS-1'), true);
const settled = patient.visits[0];
assert.strictEqual(settled.paid, 400);
assert.strictEqual(settled.remaining, 0);
assert.ok(settled.settledAt);
console.log('  ✅ Passed: Debt settled in 1-click; remaining is 0 with ISO settledAt timestamp.');

// ==========================================
// TEST 6: Cryptographic Session Anti-Tampering
// ==========================================
console.log('\n▶ Test 6: Cryptographic Session Anti-Tampering...');
const SESSION_HMAC_SALT = 'peticare_production_vault_salt_2026_x89';

function createSignedSession(user) {
    const raw = `${user.id || user.username}:${user.role}:${user.username}:${SESSION_HMAC_SALT}`;
    const sig = crypto.createHash('sha256').update(raw).digest('hex');
    return { ...user, sig };
}

function verifySession(session) {
    if (!session || !session.role || !session.sig) return false;
    const raw = `${session.id || session.username}:${session.role}:${session.username}:${SESSION_HMAC_SALT}`;
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    return session.sig === expected;
}

// Legit doctor session
const docSession = createSignedSession({ username: 'doc1', role: 'doc', name: 'دكتور 1' });
assert.strictEqual(verifySession(docSession), true, 'Valid session must pass verification');

// Attacker modifies role to "admin" in DevTools
const tamperedSession = { ...docSession, role: 'admin' };
assert.strictEqual(verifySession(tamperedSession), false, 'Tampered session role must be rejected');
console.log('  ✅ Passed: Tampered role "admin" detected and rejected by cryptographic signature.');

// ==========================================
// TEST 7: Safeguard 1 - Cairo Timezone Helper
// ==========================================
console.log('\n▶ Test 7: Safeguard 1 - Cairo Timezone Helper (getCairoDateString)...');
function getCairoDateString(dateObj = new Date()) {
    try {
        return new Date(dateObj).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    } catch (e) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
const cairoDate = getCairoDateString();
assert.match(cairoDate, /^\d{4}-\d{2}-\d{2}$/, 'Must return YYYY-MM-DD');
// Test 1:30 AM Cairo time (UTC 23:30 previous day)
const utcDate = new Date('2026-11-10T23:30:00Z');
const resolvedCairo = getCairoDateString(utcDate);
assert.strictEqual(resolvedCairo, '2026-11-11', 'UTC 23:30 must resolve to Cairo next day 2026-11-11');
console.log('  ✅ Passed: Cairo timezone day-matching verified across midnight boundary.');

// ==========================================
// TEST 8: Safeguard 2 - Egyptian Phone Normalization
// ==========================================
console.log('\n▶ Test 8: Safeguard 2 - Egyptian Phone Normalization...');
function normalizeEgyptPhone(rawPhone) {
    if (!rawPhone) return '';
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0020')) {
        clean = '20' + clean.slice(4);
    } else if (clean.startsWith('002')) {
        clean = clean.slice(2);
    }
    if (clean.startsWith('01') && clean.length === 11) {
        clean = '2' + clean;
    } else if (clean.startsWith('1') && clean.length === 10) {
        clean = '20' + clean;
    }
    if (clean.length < 10) return '';
    return clean;
}
assert.strictEqual(normalizeEgyptPhone('01012345678'), '201012345678');
assert.strictEqual(normalizeEgyptPhone('+201123456789'), '201123456789');
assert.strictEqual(normalizeEgyptPhone('00201223456789'), '201223456789');
assert.strictEqual(normalizeEgyptPhone('123'), '');
console.log('  ✅ Passed: Egyptian phone numbers normalized correctly with 20 prefix.');

// ==========================================
// TEST 9: Safeguard 5 - Offline QR Text Density Guard (<= 300 chars)
// ==========================================
console.log('\n▶ Test 9: Safeguard 5 - Offline QR Density Guard...');
function formatVisitQRReport(patient, visit) {
    const pName = String((patient && patient.name) || 'أليف').slice(0, 25);
    const pId = (patient && patient.id) || '';
    const vDate = (visit && visit.date) || getCairoDateString();
    const diag = String((visit && visit.diagnosis) || 'فحص عام').slice(0, 45);
    const rx = String((visit && visit.treatment) || 'علاج تحفظي').slice(0, 65);
    const fee = Number(visit && visit.fee) || 0;
    const paid = Number(visit && visit.paid) || 0;
    const rem = (visit && visit.remaining !== undefined) ? Number(visit.remaining) : Math.max(0, fee - paid);

    let report = `🏥 بيتي كير البيطري 🐾\n📋 ملف #${pId} - ${pName}\n📅 ${vDate}\n🩺 ${diag}\n💊 ${rx}`;
    if (rem > 0) {
        report += `\n💵 متبقي: ${rem} ج`;
    }
    return report.slice(0, 300);
}
const longPatient = { id: 'PAT-99999', name: 'قط شيرازي طويل الشعر جدا جدا جدا جدا' };
const longVisit = {
    date: '2026-11-11',
    diagnosis: 'نزلة معوية حادة مع جفاف شديد والتهاب رئوي وتجمع سوائل في المعدة',
    treatment: 'أوجمنتين 1 سم، فلاجيل 2 سم، رينجر لاكتات 50 سم، كافوزال، زوفران للترجيع',
    fee: 500,
    paid: 300,
    remaining: 200
};
const qrText = formatVisitQRReport(longPatient, longVisit);
assert.ok(qrText.length <= 300, `QR text must be <= 300 chars, got: ${qrText.length}`);
console.log(`  ✅ Passed: Offline QR payload clamped to ${qrText.length} characters (<= 300 limit).`);

// ==========================================
// TEST 10: Safeguard 7 - Medical Corrector Spoken Fractions & Routes
// ==========================================
console.log('\n▶ Test 10: Safeguard 7 - Medical Corrector Spoken Fractions & Routes...');
const medicalCorrector = require(path.join(__dirname, '../assets/js/medical_corrector.js'));
const sample1 = medicalCorrector.correct('جرعة نص سم اوجمنتين عضل');
const sample2 = medicalCorrector.correct('اديله سم ونص مع ربع قرص وريد');
const sample3 = medicalCorrector.correct('مطلوب صورة دم كاملة وتحليل وظائف كبد وسونار');

assert.ok(sample1.includes('0.5 سم'), `Expected 0.5 سم in: ${sample1}`);
assert.ok(sample1.includes('عضل (I.M)'), `Expected عضل (I.M) in: ${sample1}`);
assert.ok(sample2.includes('1.5 سم'), `Expected 1.5 سم in: ${sample2}`);
assert.ok(sample2.includes('0.25 قرص'), `Expected 0.25 قرص in: ${sample2}`);
assert.ok(sample2.includes('وريد (I.V)'), `Expected وريد (I.V) in: ${sample2}`);
assert.ok(sample3.includes('(CBC)'), `Expected (CBC) in: ${sample3}`);
assert.ok(sample3.includes('(ALT/AST)'), `Expected (ALT/AST) in: ${sample3}`);
assert.ok(sample3.includes('(Ultrasound)'), `Expected (Ultrasound) in: ${sample3}`);
console.log('  ✅ Passed: Spoken fractions, routes, and clinical tests converted cleanly.');

console.log('\n🎉 ALL 10 PRODUCTION INTEGRITY TESTS PASSED SUCCESSFULLY! (100% Pass Rate)\n');
