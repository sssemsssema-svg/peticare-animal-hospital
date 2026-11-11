
/**
 * PetiCare Cryptographic Security & Anti-Tampering Engine (v49)
 */
async function computeSha256Hex(str) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch(e) {}
    }
    // Node.js crypto fallback
    if (typeof require !== 'undefined') {
        try {
            const c = require('crypto');
            return c.createHash('sha256').update(str).digest('hex');
        } catch(e) {}
    }
    // Deterministic fallback for restricted environments
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

const SESSION_HMAC_SALT = 'peticare_production_vault_salt_2026_x89';

async function createSignedSessionToken(user) {
    const raw = `${user.id || user.username}:${user.role}:${user.username}:${SESSION_HMAC_SALT}`;
    return await computeSha256Hex(raw);
}

async function verifySignedSession(session) {
    if (!session || !session.role || !session.sig) return false;
    const raw = `${session.id || session.username}:${session.role}:${session.username}:${SESSION_HMAC_SALT}`;
    const expected = await computeSha256Hex(raw);
    return session.sig === expected;
}


function generateVisitId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID().split('-')[0].toUpperCase() 
        : Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VIS-${ts}-${rand}`;
}

/**
 * PetiCare Animal Hospital - Data Management & LocalStorage
 * Assets / JS / data.js
 */
const STORAGE_KEYS = {
    PATIENTS: 'peticare_patients_v2',
    PRODUCTS: 'peticare_products_v1',
    USERS: 'peticare_users_v1',
    SESSION: 'peticare_session_v1',
    CLINIC_PHONE: 'peticare_clinic_phone',
    SETTINGS: 'peticare_clinic_settings',
    CATEGORIES: 'peticare_store_categories'
};

// Official Clinic Information & Social Media Channels (Dr. Sherif Diab)
const CLINIC_INFO = {
    name: 'PetiCare Animal Hospital',
    doctorName: 'د. شريف دياب',
    phone1: '01555345999',
    phone2: '0502383139',
    landline: '050 2383139',
    landlineClean: '0502383139',
    phone1Clean: '201555345999',
    phone2Clean: '20502383139',
    primaryPhone: '01555345999',
    secondaryPhone: '0502383139',
    primaryWhatsApp: 'https://wa.me/201555345999',
    secondaryWhatsApp: '',
    primaryCallUrl: 'tel:01555345999',
    secondaryCallUrl: 'tel:0502383139',
    landlineCallUrl: 'tel:0502383139',
    facebookUrl: 'https://www.facebook.com/peticareanimalhoslital?mibextid=ZbWKwL',
    instagramUrl: 'https://www.instagram.com/peticare_animal_hospital?dlrf=M3IxeG92eG81YnA1',
    tiktokUrl: 'https://www.tiktok.com/@sheriffdiab?_r=1&_t=ZS-9AuMBYtCVnN',
    emergencyPhone: '01555345999',
    emergencyCallUrl: 'tel:01555345999'
};
if (typeof window !== 'undefined') {
    window.CLINIC_INFO = CLINIC_INFO;
}
const INITIAL_USERS = [
    {
        username: 'admin',
        passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin'
        role: 'admin',
        name: 'د. شريف دياب (المدير العام)'
    },
    {
        username: 'sherif',
        passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
        role: 'admin',
        name: 'د. شريف دياب (المدير العام)'
    },
    {
        username: 'doc',
        passwordHash: '161b369cc06ebddf17734ea0c2c2bf3bbf8780287515b2e597523098f9ae3d15', // 'doc'
        role: 'doc',
        name: 'دكتور العيادة'
    },
    {
        username: 'doc1',
        passwordHash: 'c5166f7f6a7071be21df4c6b81591f81cf8a0ad1464c126ec07c4d51b329486c', // 'doc1'
        role: 'doc',
        name: 'دكتور 1'
    },
    {
        username: 'doc2',
        passwordHash: '368e77a28424263f9ebbaee2e0575dff252eb61361e6c38221c97a5e0031802d', // 'doc2'
        role: 'doc',
        name: 'دكتور 2'
    },
    {
        username: 'doc3',
        passwordHash: '00cfc22b9c7bf7c541539bc7eead46369165b53fe7cb78f69e6b54a559869a23', // 'doc3'
        role: 'doc',
        name: 'دكتور 3'
    }
];
const DEFAULT_STORE_CATEGORIES = [
    { name: 'أغذية ودراي فود', icon: '🥫' },
    { name: 'عناية ونظافة', icon: '🛁' },
    { name: 'أدوية وعلاجات', icon: '💊' },
    { name: 'مكملات وفيتامينات', icon: '🧪' },
    { name: 'مستلزمات وإكسسوارات', icon: '🎀' },
    { name: 'عام / أخرى', icon: '📦' }
];
// اسم من قام بالإدخال/التعديل (يُسجَّل على كل كشف، كل ملف مريض، وكل منتج في الماركت)
function pcActorLabel(session) {
    try {
        const s = session || JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || 'null');
        if (!s) return 'طاقم العيادة';
        const u = String(s.username || '').toLowerCase();
        if (u === 'doc1' || u === 'doctor1') return 'دكتور 1';
        if (u === 'doc2' || u === 'doctor2') return 'دكتور 2';
        if (u === 'doc3' || u === 'doctor3') return 'دكتور 3';
        if (u === 'admin' || u === 'sherif' || s.role === 'admin') return 'د. شريف دياب (المدير العام)';
        return s.name || s.username || 'طاقم العيادة';
    } catch (e) { return 'طاقم العيادة'; }
}
function maskPhoneNumber(phone) {
    if (!phone) return '010****0000';
    let s = String(phone).trim().replace(/[^0-9]/g, '');
    if (s.startsWith('20')) s = s.substring(2);
    if (s.length >= 10) {
        return s.substring(0, 3) + '****' + s.substring(s.length - 4);
    }
    if (s.length >= 7) {
        return s.substring(0, 2) + '****' + s.substring(s.length - 2);
    }
    return '010****' + (s.slice(-4) || '4049');
}
const INITIAL_PRODUCTS = [
    {
        id: 'PRD-101',
        name: 'دراي فود رويال كانين للقطط (2 كجم)',
        price: 520,
        category: 'أغذية ودراي فود',
        image: '',
        createdAt: '2026-10-10'
    },
    {
        id: 'PRD-102',
        name: 'شامبو طبي دراي كلين مطهر ومضاد حشرات',
        price: 250,
        category: 'عناية ونظافة',
        image: '',
        createdAt: '2026-10-11'
    },
    {
        id: 'PRD-103',
        name: 'فيتامينات ومكمل غذائي كانفيت للكلاب',
        price: 340,
        category: 'مكملات وفيتامينات',
        image: '',
        createdAt: '2026-10-12'
    }
];
function getRelativeDateStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
// Initial Seed Data - المريض مشمش برقم ملف 101 كما طلب المستخدم بدقة
const INITIAL_PATIENTS = [];
class PetiCareData {
    constructor() {
        this.init();
    }
    init() {
        const stored = localStorage.getItem(STORAGE_KEYS.PATIENTS);
        if (!stored) {
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify([]));
        } else {
            try {
                let pts = JSON.parse(stored);
                let changed = false;
                if (Array.isArray(pts)) {
                    let maxNumeric = 100;
                    pts.forEach(p => {
                        if (p && p.id && /^\d+$/.test(String(p.id).trim())) {
                            const n = parseInt(String(p.id).trim(), 10);
                            if (n > maxNumeric && n < 1000000) maxNumeric = n;
                        }
                    });
                    pts.forEach(p => {
                        if (!p) return;
                        if (p.chronicNotes && (p.chronicNotes.includes('اضغط') || p.chronicNotes.includes('المايك') || p.chronicNotes.includes('تحدث') || p.chronicNotes.trim() === 'ضغط')) {
                            p.chronicNotes = '';
                            changed = true;
                        }
                        const idStr = String(p.id || '').trim();
                        if (!/^\d+$/.test(idStr)) {
                            const digits = idStr.replace(/[^0-9]/g, '');
                            if (digits && digits.length >= 3 && parseInt(digits, 10) >= 101 && parseInt(digits, 10) < 10000) {
                                p.id = String(parseInt(digits, 10));
                            } else {
                                maxNumeric += 1;
                                p.id = String(maxNumeric);
                            }
                            changed = true;
                        }
                    });
                    if (changed) {
                        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(pts));
                    }
                }
            } catch(e) {}
        }
        const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (!storedProducts) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        }
        const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (!storedCategories) {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_STORE_CATEGORIES));
        }
        const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (!storedUsers) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        } else {
            try {
                let users = JSON.parse(storedUsers);
                if (!Array.isArray(users)) users = [...INITIAL_USERS];
                // Ensure admin exists
                let adminUser = users.find(u => u.username === 'admin');
                if (!adminUser) {
                    users.unshift({
                        username: 'admin',
                        password: 'admin',
                        role: 'admin',
                        name: 'د. شريف دياب (المدير العام)'
                    });
                } else {
                    adminUser.name = 'د. شريف دياب (المدير العام)';
                    adminUser.role = 'admin';
                    if (!adminUser.password) adminUser.password = 'admin';
                }
                // Ensure 3 doctors exist
                const defaultDocs = [
                    { username: 'doc1', password: 'doc1', role: 'doc', name: 'دكتور 1' },
                    { username: 'doc2', password: 'doc2', role: 'doc', name: 'دكتور 2' },
                    { username: 'doc3', password: 'doc3', role: 'doc', name: 'دكتور 3' },
                    { username: 'doc', password: 'doc', role: 'doc', name: 'دكتور العيادة (doc)' },
                    { username: 'assistant', password: '1234', role: 'doc', name: 'المساعد الطبي' }
                ];
                defaultDocs.forEach(d => {
                    const existing = users.find(u => u.username.toLowerCase() === d.username.toLowerCase());
                    if (!existing) {
                        users.push(d);
                    } else {
                        existing.name = d.name;
                    }
                });
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            } catch(e) {
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
            }
        }
        // Validate active session if present (DO NOT force auto-login if null)
        try {
            const s = this.getCurrentSession();
            if (s && s.username) {
                const u = String(s.username).toLowerCase();
                if (u === 'admin' || u.includes('sherif')) {
                    s.username = 'admin';
                    s.role = 'admin';
                    s.name = 'د. شريف دياب (المدير العام)';
                    this.setSession(s);
                } else if (u === 'doc1' || u === 'doctor1') {
                    s.username = 'doc1';
                    s.name = 'دكتور 1';
                    this.setSession(s);
                } else if (u === 'doc2' || u === 'doctor2') {
                    s.username = 'doc2';
                    s.name = 'دكتور 2';
                    this.setSession(s);
                } else if (u === 'doc3' || u === 'doctor3') {
                    s.username = 'doc3';
                    s.name = 'دكتور 3';
                    this.setSession(s);
                }
            }
        } catch(e) {}
    }
    getPatients(includeDeleted = false) {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
            const list = data ? JSON.parse(data) : [...INITIAL_PATIENTS];
            if (!includeDeleted) {
                return list.filter(p => !p.deleted);
            }
            return list;
        } catch (e) {
            console.error('Error loading patients:', e);
            return [...INITIAL_PATIENTS];
        }
    }
    savePatients(patients, skipCloudPush = false) {
        try {
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
            if (!skipCloudPush && window.PetiCareCloud && typeof window.PetiCareCloud.pushCloudPatients === 'function') {
                window.PetiCareCloud.pushCloudPatients();
            }
            return true;
        } catch (e) {
            console.error('Error saving patients:', e);
            if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.number === -2147024882)) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ تحذير: امتلاء مساحة التخزين المحلية (Quota Exceeded)!', 'error');
                }
            }
            return false;
        }
    }
        deletePatient(patientId) {
        let list = this.getPatients(true);
        const p = list.find(x => String(x.id) === String(patientId) || String(x.id).replace(/[^0-9]/g, '') === String(patientId).replace(/[^0-9]/g, ''));
        if (p) {
            p.deleted = true;
            p.updatedAt = Date.now();
            p._dirty = true;

            // Track in local tombstones so it never resurrects from cloud
            try {
                const tombstones = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]');
                const pidStr = String(p.id);
                if (!tombstones.includes(pidStr)) {
                    tombstones.push(pidStr);
                    localStorage.setItem('peticare_tombstones', JSON.stringify(tombstones));
                }
            } catch(eTomb) { console.warn('Tombstone save error:', eTomb); }

            this.savePatients(list);

            // Trigger immediate cloud deletion if sync is online
            if (window.PetiCareCloud && typeof window.PetiCareCloud.deleteCloudPatient === 'function') {
                window.PetiCareCloud.deleteCloudPatient(p.id);
            }
            return true;
        }
        return false;
    }
    getPatientById(id) {
        if (!id) return null;
        const cleanId = String(id).replace(/[^0-9]/g, '');
        const list = this.getPatients();
        return list.find(p => {
            const pClean = String(p.id).replace(/[^0-9]/g, '');
            return pClean === cleanId || String(p.id).toLowerCase() === String(id).toLowerCase();
        });
    }
    findPatientByNameOrId(query) {
        if (!query) return null;
        let str = String(query).trim().toLowerCase();
        // Convert Eastern Arabic digits ٠-٩ to 0-9
        str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        // Normalize Arabic letters
        str = str.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
        // Spoken number words mapping for patients
        if (str.includes('ميه وواحد') || str.includes('مية وواحد') || str.includes('مائة وواحد') || str.includes('واحد صفر واحد')) {
            str = '101';
        } else if (str.includes('ميه واثنين') || str.includes('مية واثنين') || str.includes('مائة واثنين') || str.includes('ميه وتنين')) {
            str = '102';
        } else if (str.includes('ميه وثلاثة') || str.includes('مية وثلاثة') || str.includes('مائة وثلاثة') || str.includes('ميه وتلاته')) {
            str = '103';
        }
        const cleanDigits = str.replace(/[^0-9]/g, '');
        const list = this.getPatients();
        // 1. Exact or partial Match on clean ID digits (e.g. "101")
        if (cleanDigits) {
            const foundById = list.find(p => String(p.id).replace(/[^0-9]/g, '') === cleanDigits);
            if (foundById) return foundById;
        }
        // 2. Exact match on Pet Name
        const foundByName = list.find(p => {
            const normPName = p.name.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
            return normPName === str;
        });
        if (foundByName) return foundByName;
        // 3. Partial match on Pet Name or Owner
        return list.find(p => {
            const normPName = p.name.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
            const normOwner = p.ownerName.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
            return normPName.includes(str) || str.includes(normPName) || normOwner.includes(str);
        });
    }
    generatePatientId() {
        try {
            const list = this.getPatients(true);
            let maxNum = 100;
            if (Array.isArray(list)) {
                list.forEach(p => {
                    if (!p || !p.id) return;
                    const clean = String(p.id).replace(/[^0-9]/g, '');
                    const num = parseInt(clean, 10);
                    if (!isNaN(num) && num > maxNum && num < 1000000) {
                        maxNum = num;
                    }
                });
            }
            return String(maxNum + 1);
        } catch (e) {
            return '101';
        }
    }
    addPatient(patientData) {
        const list = this.getPatients(true);
        const newPatient = {
            id: String(patientData.id || this.generatePatientId()),
            name: (patientData.name || '').trim(),
            type: (patientData.type || '').trim(),
            age: (patientData.age || '').trim(),
            weight: patientData.weight ? patientData.weight.trim() : '',
            ownerName: (patientData.ownerName || '').trim(),
            phone: (patientData.phone || '').trim(),
            chronicNotes: (patientData.chronicNotes || '').trim(),
            createdBy: patientData.createdBy || pcActorLabel(),
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: Date.now(),
            deleted: false,
            visits: []
        };
        list.unshift(newPatient);
        this.savePatients(list);
        return newPatient;
    }
    updatePatient(patientId, updatedFields) {
        const list = this.getPatients();
        const patient = this.getPatientById(patientId);
        if (!patient) return null;
        const cleanId = String(patient.id).replace(/[^0-9]/g, '');
        const index = list.findIndex(p => String(p.id).replace(/[^0-9]/g, '') === cleanId || String(p.id) === String(patient.id));
        if (index === -1) return null;
        list[index] = { ...list[index], ...updatedFields, updatedAt: Date.now(), updatedBy: pcActorLabel() };
        this.savePatients(list);
        return list[index];
    }
    addVisitToPatient(patientId, visitData) {
        const list = this.getPatients();
        const patient = this.getPatientById(patientId);
        if (!patient) return null;
        const index = list.findIndex(p => p.id === patient.id);
        if (index === -1) return null;
        const newVisit = {
            id: generateVisitId(),
            visitType: visitData.visitType || 'كشف عام',
            chiefComplaint: visitData.chiefComplaint || '',
            fee: Number(visitData.fee) || 0,
            paid: Number(visitData.paid) || 0,
            remaining: Number(visitData.remaining) !== undefined ? Number(visitData.remaining) : (Number(visitData.fee || 0) - Number(visitData.paid || 0)),
            status: visitData.status || 'مكتملة',
            date: visitData.date || new Date().toISOString().split('T')[0],
            diagnosis: visitData.diagnosis || '',
            treatment: visitData.treatment || '',
            dosage: visitData.dosage || '',
            prescriptionImage: visitData.prescriptionImage || '',
            labs: visitData.labs || '',
            labImages: Array.isArray(visitData.labImages) ? visitData.labImages : (visitData.labImage ? [visitData.labImage] : []),
            followUpDays: visitData.followUpDays || 0,
            followUpDate: visitData.followUpDate || '',
            caseImage: visitData.caseImage || '',
            clientImage: visitData.clientImage || '',
            chronicNotes: visitData.chronicNotes || '',
            doctorName: visitData.doctorName || pcActorLabel(),
            doctorUsername: visitData.doctorUsername || '',
            updatedAt: Date.now()
        };
        list[index].updatedAt = Date.now();
        if (visitData.clientImage) {
            list[index].ownerPhoto = visitData.clientImage;
        }
        if (!list[index].visits) {
            list[index].visits = [];
        }
        list[index].visits.unshift(newVisit);
        this.savePatients(list);
        return { patient: list[index], visit: newVisit };
    }

    updateVisitInPatient(patientId, visitId, updatedFields) {
        const list = this.getPatients();
        const pIndex = list.findIndex(p => String(p.id) === String(patientId) || String(p.id).replace(/[^0-9]/g, '') === String(patientId).replace(/[^0-9]/g, ''));
        if (pIndex === -1) return null;

        const patient = list[pIndex];
        if (!Array.isArray(patient.visits)) patient.visits = [];

        const vIndex = patient.visits.findIndex(v => String(v.id) === String(visitId));
        if (vIndex === -1) return null;

        const currentVisit = patient.visits[vIndex];
        const updatedVisit = {
            ...currentVisit,
            ...updatedFields,
            updated_at: Date.now(),
            updatedAt: Date.now()
        };

        // Recalculate debt balance
        const fee = Number(updatedVisit.fee) || 0;
        const paid = Number(updatedVisit.paid) || 0;
        updatedVisit.fee = fee;
        updatedVisit.paid = paid;
        updatedVisit.remaining = Math.max(0, fee - paid);

        patient.visits[vIndex] = updatedVisit;
        patient.updatedAt = Date.now();
        patient.updated_at = new Date().toISOString();

        this.savePatients(list);
        return { patient, visit: updatedVisit };
    }

    settleVisitDebt(patientId, visitId) {
        const list = this.getPatients();
        const pIndex = list.findIndex(p => String(p.id) === String(patientId) || String(p.id).replace(/[^0-9]/g, '') === String(patientId).replace(/[^0-9]/g, ''));
        if (pIndex === -1) return false;

        const patient = list[pIndex];
        if (!Array.isArray(patient.visits)) return false;

        const vIndex = patient.visits.findIndex(v => String(v.id) === String(visitId));
        if (vIndex === -1) return false;

        const v = patient.visits[vIndex];
        const fee = Number(v.fee) || 0;
        v.paid = fee;
        v.remaining = 0;
        v.settledAt = new Date().toISOString();
        v.updated_at = Date.now();
        v.updatedAt = Date.now();

        patient.updatedAt = Date.now();
        patient.updated_at = new Date().toISOString();

        this.savePatients(list);
        return true;
    }

    getRadarFollowUps(filterType = 'tomorrow') {
        const list = this.getPatients();
        const tomorrowStr = getRelativeDateStr(1);
        const todayStr = getRelativeDateStr(0);
        if (filterType === 'month') {
            const today = new Date();
            const monthCases = [];
            list.forEach(patient => {
                if (!patient.visits || patient.visits.length === 0) return;
                const sortedVisits = [...patient.visits].sort((a, b) => new Date(b.date) - new Date(a.date));
                const latestVisit = sortedVisits[0];
                if (!latestVisit || !latestVisit.date) return;
                const visitDate = new Date(latestVisit.date);
                const diffTime = today - visitDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 20) {
                    monthCases.push({
                        patient,
                        visit: latestVisit,
                        diffDays: diffDays > 0 ? diffDays : 30,
                        isMonthCheckin: true,
                        isTomorrow: false,
                        isToday: false
                    });
                }
            });
            if (monthCases.length === 0) {
                list.forEach(patient => {
                    if (!patient.visits || patient.visits.length === 0) return;
                    const latestVisit = patient.visits[0];
                    if (!latestVisit || !latestVisit.date) return;
                    monthCases.push({
                        patient,
                        visit: latestVisit,
                        diffDays: 30,
                        isMonthCheckin: true,
                        isTomorrow: false,
                        isToday: false
                    });
                });
            }
            monthCases.sort((a, b) => b.diffDays - a.diffDays);
            return monthCases;
        }
        const results = [];
        list.forEach(patient => {
            if (!patient.visits || patient.visits.length === 0) return;
            const latestVisit = patient.visits.find(v => v.followUpDate);
            if (!latestVisit || !latestVisit.followUpDate) return;
            let matches = false;
            if (filterType === 'tomorrow' && latestVisit.followUpDate === tomorrowStr) {
                matches = true;
            } else if (filterType === 'today' && latestVisit.followUpDate === todayStr) {
                matches = true;
            } else if (filterType === 'upcoming' && latestVisit.followUpDate >= todayStr) {
                matches = true;
            }
            if (matches) {
                results.push({
                    patient,
                    visit: latestVisit,
                    isTomorrow: latestVisit.followUpDate === tomorrowStr,
                    isToday: latestVisit.followUpDate === todayStr
                });
            }
        });
        return results;
    }
    getProducts(includeDeleted = false) {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
            const list = data ? JSON.parse(data) : [...INITIAL_PRODUCTS];
            if (!includeDeleted) {
                return list.filter(p => !p.deleted);
            }
            return list;
        } catch (e) {
            console.error('Error loading products:', e);
            return [...INITIAL_PRODUCTS];
        }
    }
    saveProducts(products, skipCloudPush = false) {
        try {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            if (!skipCloudPush && window.PetiCareCloud && typeof window.PetiCareCloud.pushCloudProducts === 'function') {
                window.PetiCareCloud.pushCloudProducts();
            }
            return true;
        } catch (e) {
            console.error('Error saving products:', e);
            return false;
        }
    }
    addProduct(productData) {
        const list = this.getProducts();
        const newProduct = {
            id: productData.id || `PRD-${Date.now().toString().slice(-4)}`,
            name: (productData.name || '').trim(),
            price: parseFloat(productData.price) || 0,
            category: (productData.category || 'عام / أخرى').trim(),
            image: productData.image || '',
            createdBy: pcActorLabel(),
            createdAt: new Date().toISOString().split('T')[0]
        };
        list.unshift(newProduct);
        this.saveProducts(list);
        return newProduct;
    }
    deleteProduct(id) {
        let list = this.getProducts(true);
        const item = list.find(p => String(p.id) === String(id));
        if (item) {
            item.deleted = true;
            item.updatedAt = Date.now();
            item.updatedBy = pcActorLabel();
            this.saveProducts(list);
        }
        return this.getProducts(false);
    }
    // Dynamic Store Categories Management
    getCategories() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_STORE_CATEGORIES));
        return [...DEFAULT_STORE_CATEGORIES];
    }
    saveCategories(categories) {
        try {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
            if (window.PetiCareCloud && typeof window.PetiCareCloud.pushCloudProducts === 'function') {
                window.PetiCareCloud.pushCloudProducts();
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    addCategory(name, icon = '📦') {
        const cats = this.getCategories();
        const cleanName = String(name || '').trim();
        if (!cleanName) return false;
        if (cats.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) return false;
        cats.push({ name: cleanName, icon: icon || '📦' });
        this.saveCategories(cats);
        return true;
    }
    updateCategory(oldName, newName, newIcon) {
        const cats = this.getCategories();
        const idx = cats.findIndex(c => c.name === oldName);
        if (idx === -1) return false;
        const cleanNew = String(newName || oldName).trim();
        if (!cleanNew) return false;
        cats[idx].name = cleanNew;
        if (newIcon) cats[idx].icon = newIcon;
        this.saveCategories(cats);
        // Sync products with old category name
        const products = this.getProducts(true);
        let changed = false;
        products.forEach(p => {
            if (p.category === oldName) {
                p.category = cleanNew;
                changed = true;
            }
        });
        if (changed) this.saveProducts(products);
        return true;
    }
    deleteCategory(catName) {
        if (catName === 'عام / أخرى') return false; // Default fallback cannot be deleted
        let cats = this.getCategories();
        cats = cats.filter(c => c.name !== catName);
        this.saveCategories(cats);
        // Re-assign products belonging to deleted category
        const products = this.getProducts(true);
        let changed = false;
        products.forEach(p => {
            if (p.category === catName) {
                p.category = 'عام / أخرى';
                changed = true;
            }
        });
        if (changed) this.saveProducts(products);
        return true;
    }
    getUsers() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.USERS);
            return data ? JSON.parse(data) : [...INITIAL_USERS];
        } catch (e) {
            return [...INITIAL_USERS];
        }
    }
    saveUsers(users, skipCloudPush = false) {
        try {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            if (!skipCloudPush && window.PetiCareCloud && typeof window.PetiCareCloud.saveCloudAuth === 'function') {
                window.PetiCareCloud.saveCloudAuth();
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    async authenticateClient(identifier, password) {
        if (!identifier || !String(identifier).trim() || !password || !String(password).trim()) return null;
        const cleanId = String(identifier).trim().toLowerCase();
        const cleanDigits = cleanId.replace(/[^0-9]/g, '');
        let cleanPass = String(password).trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        if (!cleanPass) return null;
        const patients = this.getPatients();
        const matches = patients.filter(p => {
            const pIdClean = String(p.id).replace(/[^0-9]/g, '');
            const pPhoneClean = String(p.phone || '').replace(/[^0-9]/g, '');
            return pIdClean === cleanDigits || 
                   (cleanDigits.length >= 7 && pPhoneClean.includes(cleanDigits)) ||
                   (p.name && p.name.toLowerCase() === cleanId);
        });
        if (!matches || matches.length === 0) return null;
        const authenticated = matches.filter(p => {
            const validPass = p.customPassword ? String(p.customPassword).trim() : String(p.id).trim();
            return cleanPass === validPass;
        });
        if (authenticated.length === 0) return null;
        return authenticated.length === 1 ? authenticated[0] : authenticated;
    }
        async authenticate(username, password) {
        if (!username || !String(username).trim() || !password || !String(password).trim()) return null;
        const uRaw = String(username || '').trim();
        let uLower = uRaw.toLowerCase();
        let pRaw = String(password || '').trim();
        pRaw = pRaw.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        if (!uLower || !pRaw) return null;

        const inputHash = await computeSha256Hex(pRaw);

        // 1. Try Supabase Auth if client is active
        if (typeof supabase !== 'undefined' && supabase.auth && typeof supabase.auth.signInWithPassword === 'function') {
            try {
                const email = uLower.includes('@') ? uLower : `${uLower}@peticare.clinic`;
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pRaw });
                if (!error && data && data.user) {
                    const role = (data.user.user_metadata && data.user.user_metadata.role) || (uLower === 'admin' ? 'admin' : 'doc');
                    const session = {
                        id: data.user.id,
                        username: uLower,
                        role: role,
                        name: (data.user.user_metadata && data.user.user_metadata.name) || (role === 'admin' ? 'د. شريف دياب (المدير العام)' : 'طبيب بيتي كير'),
                        loginTime: Date.now(),
                        expires: Date.now() + 24 * 60 * 60 * 1000
                    };
                    session.sig = await createSignedSessionToken(session);
                    this.setSession(session);
                    return session;
                }
            } catch(eAuth) {
                console.warn('Supabase auth fallback to local:', eAuth);
            }
        }

        // 2. Local Fallback Verification via SHA-256 Hash
        // Known fallback map
        const knownAccounts = {
            'admin': { role: 'admin', name: 'د. شريف دياب (المدير العام)', hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }, // 'admin'
            'sherif': { role: 'admin', name: 'د. شريف دياب (المدير العام)', hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
            'doc': { role: 'doc', name: 'دكتور العيادة (doc)', hash: '161b369cc06ebddf17734ea0c2c2bf3bbf8780287515b2e597523098f9ae3d15' }, // 'doc'
            'doc1': { role: 'doc', name: 'دكتور 1', hash: 'c5166f7f6a7071be21df4c6b81591f81cf8a0ad1464c126ec07c4d51b329486c' }, // 'doc1'
            'doc2': { role: 'doc', name: 'دكتور 2', hash: '368e77a28424263f9ebbaee2e0575dff252eb61361e6c38221c97a5e0031802d' }, // 'doc2'
            'doc3': { role: 'doc', name: 'دكتور 3', hash: '00cfc22b9c7bf7c541539bc7eead46369165b53fe7cb78f69e6b54a559869a23' }, // 'doc3'
            'assistant': { role: 'assistant', name: 'المساعد الطبي', hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' } // '1234'
        };

        const isAdminAlias = ['admin', 'sherif', 'ادمن', 'أدمن', 'شريف', 'د. شريف', 'د/شريف', 'مدير'].includes(uLower);
        const lookupUser = isAdminAlias ? 'admin' : uLower;

        let acc = knownAccounts[lookupUser];
        let users = this.getUsers();
        let stored = users.find(u => u.username.toLowerCase() === lookupUser);

        let matchOk = false;
        let role = acc ? acc.role : 'doc';
        let name = acc ? acc.name : 'طبيب بيتي كير';

        if (stored) {
            role = stored.role || role;
            name = stored.name || name;
            if (stored.passwordHash && stored.passwordHash === inputHash) matchOk = true;
            else if (stored.password && (stored.password === pRaw || stored.password === inputHash)) matchOk = true;
        } else if (acc) {
            if (acc.hash === inputHash || pRaw === lookupUser) matchOk = true;
        }

        if (matchOk) {
            const session = {
                username: lookupUser,
                role: role,
                name: name,
                loginTime: Date.now(),
                expires: Date.now() + (24 * 60 * 60 * 1000)
            };
            session.sig = await createSignedSessionToken(session);
            this.setSession(session);
            return session;
        }

        return null;
    }
    changePassword(username, newPass) {
        const users = this.getUsers();
        let cleanNew = String(newPass || '').trim();
        cleanNew = cleanNew.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        const uLower = String(username).toLowerCase();
        const idx = users.findIndex(u => u.username.toLowerCase() === uLower);
        if (idx !== -1) {
            users[idx].password = cleanNew;
        } else {
            const role = (uLower === 'admin' || uLower === 'sherif') ? 'admin' : 'doc';
            const name = role === 'admin' ? 'د. شريف دياب (المدير العام)' : 'المساعد الطبي';
            users.push({
                username: uLower,
                password: cleanNew,
                role: role,
                name: name
            });
        }
        this.saveUsers(users);
        // Cloud synchronization across all devices
        if (window.PetiCareCloud && typeof window.PetiCareCloud.saveCloudAuth === 'function') {
            if (uLower === 'admin') {
                window.PetiCareCloud.saveCloudAuth(cleanNew, null);
            } else if (uLower === 'doc' || uLower === 'assistant') {
                window.PetiCareCloud.saveCloudAuth(null, cleanNew);
            }
        }
        return true;
    }
    getCurrentSession() {
        try {
            const s = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!s) return null;
            const session = JSON.parse(s);
            if (session && session.expires && Date.now() > session.expires) {
                this.clearSession();
                return null;
            }
            return session;
        } catch(e) {
            return null;
        }
    }
    setSession(session) {
        if (session && !session.expires) {
            session.expires = Date.now() + (24 * 60 * 60 * 1000);
        }
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    }
    clearSession() {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
    getClinicPhone() {
        const stored = localStorage.getItem(STORAGE_KEYS.CLINIC_PHONE);
        if (!stored || stored === '201012345678' || stored === '201555345999') {
            return '201555345999';
        }
        return stored;
    }
    setClinicPhone(phone) {
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.startsWith('01')) clean = '2' + clean;
        localStorage.setItem(STORAGE_KEYS.CLINIC_PHONE, clean);
    }
    resetToCleanClinic() {
        // Clears all demo data so the clinic can start fresh with real data
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.CLINIC_PHONE, '201555345999');
        return true;
    }
    resetToSeed() {
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_PATIENTS;
    }
}
// Global instance
window.petiCareData = new PetiCareData();
// Backward compatibility & auxiliary pages support (login.html, client-login.html)
if (window.petiCareData) { window.petiCareData.playMeow = playMeowSoundSafe; window.petiCareData.playSync = playSyncSoundSafe; }
window.PetiCareDB = window.petiCareData;
PetiCareData.prototype.setRole = function(role) {
    const r = (role === 'admin') ? 'admin' : 'doc';
    const session = {
        username: r,
        role: r,
        name: r === 'admin' ? 'د. شريف دياب (المدير العام)' : 'المساعد الطبي',
        loginTime: Date.now()
    };
    this.setSession(session);
    return session;
};
PetiCareData.prototype.updateClientCredentials = function(patientId, newPassword, avatar) {
    const patients = this.getPatients();
    const p = patients.find(x => String(x.id) === String(patientId));
    if (p) {
        p.customPassword = newPassword;
        p.passwordChanged = true;
        if (avatar) p.avatar = avatar;
        this.savePatients(patients);
        return true;
    }
    return false;
};
PetiCareData.prototype.savePatient = function(patient) {
    if (!patient) return false;
    patient.updatedAt = patient.updatedAt || Date.now();
    const list = this.getPatients(true);
    const idx = list.findIndex(p => String(p.id).toLowerCase() === String(patient.id).toLowerCase());
    if (idx >= 0) {
        list[idx] = patient;
    } else {
        list.push(patient);
    }
    return this.savePatients(list);
};
PetiCareData.prototype.exportDatabaseJSON = function() {
    const patients = this.getPatients(true);
    const products = this.getProducts(true);
    const categories = this.getCategories();
    const users = this.getUsers();
    const settings = { clinicPhone: this.getClinicPhone() };
    return {
        appName: 'PetiCare Animal Hospital',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        patients: patients,
        products: products,
        categories: categories,
        users: users,
        settings: settings
    };
};
if (typeof window !== 'undefined') {
    window.exportDatabaseJSON = function() {
        try {
            const db = window.petiCareData || new PetiCareData();
            const exportData = db.exportDatabaseJSON();
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const nowStr = new Date().toISOString().split('T')[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = `PetiCare_Database_Backup_${nowStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (typeof showToast === 'function') {
                showToast('💾 تم تصدير وتحميل قاعدة البيانات بنجاح!', 'success');
            }
            return true;
        } catch(e) {
            console.error('Export DB Error:', e);
            if (typeof showToast === 'function') {
                showToast('❌ تعذر تصدير قاعدة البيانات', 'error');
            }
            return false;
        }
    };
}

// Safe Sound Effects Helpers
function playMeowSoundSafe() {
    try {
        const audio = new Audio('assets/audio/meow-sound.mp3');
        audio.play().catch(() => {});
    } catch(e) {}
}
function playSyncSoundSafe() {
    try {
        const audio = new Audio('assets/audio/sync-sound.mp3');
        audio.play().catch(() => {});
    } catch(e) {}
}
if (typeof window !== 'undefined') {
    window.playMeowSound = playMeowSoundSafe;
    window.playSyncSound = playSyncSoundSafe;
}

PetiCareData.prototype.getPendingChangesCount = function() {
    try {
        const list = this.getPatients(true) || [];
        const dirtyPatients = list.filter(p => p._dirty).length;
        const tombstones = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]').length;
        return dirtyPatients + tombstones;
    } catch(e) {
        return 0;
    }
};
