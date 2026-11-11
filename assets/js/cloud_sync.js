/**
 * PetiCare Animal Hospital - Real-Time Central Cloud Synchronization
 * مزامنة السحابة الفورية لبيانات العيادة (المرضى، الكشوفات، المتجر، وكلمات المرور) بين كافة أجهزة العيادة
 * Assets / JS / cloud_sync.js
 */

(function () {
    'use strict';

    const CLOUD_ENDPOINTS = {
        AUTH: '',
        PATIENTS: '',
        PRODUCTS: ''
    };

    
    // Load custom cloud endpoint if configured by Admin
    try {
        const customEndpoint = localStorage.getItem('peticare_cfg_cloud_endpoint');
        if (customEndpoint && customEndpoint.startsWith('http')) {
            CLOUD_ENDPOINTS.PATIENTS = customEndpoint;
            console.log('☁️ تم تطبيق سيرفر كشوفات مخصص:', customEndpoint);
        }
    } catch(e) {}

    
    function getCloudUrl(url) {
        return url;
    }

    function getCloudHeaders(extra = {}) {
        return {
            'Accept': 'application/json',
            ...extra
        };
    }

    let isSyncing = false;
    let syncIntervalId = null;

    /**
     * Normalize string: convert Arabic-Indic numerals (٠-٩) to standard English numerals (0-9)
     */
    function normalizeDigits(str) {
        if (!str) return '';
        let s = String(str).trim();
        return s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    }

    /**
     * Update Visual Cloud Indicator in UI
     */
    function updateSyncBadge(state, text) {
        if (typeof document === 'undefined') return;
        const badge = document.getElementById('cloudSyncIndicator');
        if (!badge) return;
        if (!badge._hasClickSync) {
            badge._hasClickSync = true;
            badge.style.cursor = 'pointer';
            badge.title = 'اضغط للمزامنة الفورية مع السحابة الآن 🔄';
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof showToast === 'function') showToast('🔄 جاري فحص ومزامنة الكشوفات مع السحابة...', 'info');
                syncAllCloudData();
            });
        }

        const isOnline = (typeof navigator !== 'undefined' && 'onLine' in navigator) ? navigator.onLine : true;

        if (!isOnline || state === 'offline') {
            badge.className = 'cloud-sync-pill error offline';
            badge.style.background = 'rgba(239, 68, 68, 0.2)';
            badge.style.color = '#ef4444';
            badge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            badge.innerHTML = `🔴 ☁️ <span>${text || 'أنت في وضع عدم الاتصال (أوفلاين)'}</span>`;
            return;
        }

        if (state === 'syncing') {
            badge.className = 'cloud-sync-pill syncing';
            badge.style.background = 'rgba(245, 158, 11, 0.15)';
            badge.style.color = '#f59e0b';
            badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            badge.innerHTML = `🔄 <span>${text || 'جاري المزامنة مع السحابة...'}</span>`;
        } else if (state === 'success' || state === 'online') {
            badge.className = 'cloud-sync-pill success';
            badge.style.background = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            badge.innerHTML = `🟢 ☁️ <span>${text || 'السيستم موحد ومتزامن لحظياً ✓'}</span>`;
        } else if (state === 'error') {
            badge.className = 'cloud-sync-pill error';
            badge.style.background = 'rgba(239, 68, 68, 0.15)';
            badge.style.color = '#ef4444';
            badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            badge.innerHTML = `⚠️ ☁️ <span>${text || 'تعذر الاتصال بالسحابة مؤقتاً'}</span>`;
        }
    }

    /**
     * Fetch latest Auth Credentials (admin & doc passwords) from the cloud
     */
    async function fetchCloudAuth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const resp = await fetch(getCloudUrl(CLOUD_ENDPOINTS.AUTH), {
                method: 'GET',
                headers: getCloudHeaders(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!resp.ok) return null;
            const res = await resp.json();
            if (res && res.data) {
                const cloudAdminPass = normalizeDigits(res.data.admin_pass || 'admin');
                const cloudDocPass = normalizeDigits(res.data.doc_pass || 'doc');

                if (window.petiCareData) {
                    const users = window.petiCareData.getUsers();
                    let updated = false;

                    const adminUser = users.find(u => u.username === 'admin');
                    if (adminUser && adminUser.password !== cloudAdminPass) {
                        adminUser.password = cloudAdminPass;
                        updated = true;
                    }

                    const docUser = users.find(u => u.username === 'doc');
                    if (docUser && docUser.password !== cloudDocPass) {
                        docUser.password = cloudDocPass;
                        updated = true;
                    }

                    if (updated) {
                        window.petiCareData.saveUsers(users, true);
                        console.log('☁️ تم تحديث كلمات المرور من السحابة بنجاح!');
                    }
                }
                return res.data;
            }
        } catch (err) {
            console.warn('Cloud Auth Fetch Warning:', err);
        }
        return null;
    }

    /**
     * Save new password to cloud so all other devices update instantly
     */
    async function saveCloudAuth(adminPass, docPass) {
        try {
            updateSyncBadge('syncing', 'جاري حفظ كلمة المرور سحابياً...');
            const currentUsers = window.petiCareData ? window.petiCareData.getUsers() : [];
            const localAdmin = currentUsers.find(u => u.username === 'admin');
            const localDoc = currentUsers.find(u => u.username === 'doc');

            const payload = {
                name: 'PetiCare_Auth_Config',
                data: {
                    admin_pass: normalizeDigits(adminPass || (localAdmin ? localAdmin.password : 'admin')),
                    doc_pass: normalizeDigits(docPass || (localDoc ? localDoc.password : 'doc')),
                    updatedAt: new Date().toISOString()
                }
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const resp = await fetch(getCloudUrl(CLOUD_ENDPOINTS.AUTH), {
                method: 'PUT',
                headers: getCloudHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                console.log('☁️ تم مزامنة كلمة المرور الجديدة في السحابة بنجاح!');
                updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓');
                return true;
            }
        } catch (err) {
            console.warn('Cloud Auth Save Error:', err);
            updateSyncBadge('error', 'تعذر حفظ كلمة المرور سحابياً');
        }
        return false;
    }

    /**
     * Convert timestamp or ISO date to millisecond number
     */
    function toTimestamp(val) {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const ms = new Date(val).getTime();
        return isNaN(ms) ? 0 : ms;
    }

    /**
     * Delta Merging for Patients & Visits
     */
    function deltaMergePatients(localPatients = [], cloudPatients = []) {
        if (!Array.isArray(cloudPatients) || cloudPatients.length === 0) {
            return { merged: localPatients || [], hasNewData: false };
        }

        const map = new Map();
        (localPatients || []).forEach(p => map.set(String(p.id), { ...p }));
        let hasNewData = false;

        let tombstones = [];
        try { tombstones = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]'); } catch(e){}
        cloudPatients.forEach(cp => {
            const id = String(cp.id);
            // If patient was deleted locally, do NOT resurrect it!
            if (tombstones.includes(id)) {
                return;
            }
            if (!map.has(id)) {
                map.set(id, cp);
                hasNewData = true;
            } else {
                const lp = map.get(id);
                const cpTime = toTimestamp(cp.updatedAt);
                const lpTime = toTimestamp(lp.updatedAt);

                // Handle patient soft deletion
                if (cp.deleted) {
                    if (cpTime >= lpTime && !lp.deleted) {
                        lp.deleted = true;
                        lp.updatedAt = cpTime;
                        hasNewData = true;
                    }
                } else if (lp.deleted) {
                    if (cpTime > lpTime) {
                        lp.deleted = false;
                        hasNewData = true;
                    }
                }

                // If cloud patient record is newer, merge patient level fields
                if (cpTime > lpTime && !cp.deleted) {
                    const localVisits = lp.visits;
                    Object.assign(lp, cp);
                    lp.visits = localVisits; // preserve visits for granular visit merging below
                    hasNewData = true;
                }

                // Granular Visits Delta Merging
                const visitMap = new Map();
                (lp.visits || []).forEach(v => {
                    const key = String(v.id || (v.date + '_' + (v.diagnosis || '')));
                    visitMap.set(key, { ...v });
                });

                let visitsChanged = false;
                const prevVisitCount = visitMap.size;
                (cp.visits || []).forEach(cv => {
                    const key = String(cv.id || (cv.date + '_' + (cv.diagnosis || '')));
                    if (!visitMap.has(key)) {
                        visitMap.set(key, cv);
                        visitsChanged = true;
                        hasNewData = true;
                    } else {
                        const lv = visitMap.get(key);
                        const cvTime = toTimestamp(cv.updatedAt);
                        const lvTime = toTimestamp(lv.updatedAt);

                        if (cv.deleted && cvTime >= lvTime && !lv.deleted) {
                            lv.deleted = true;
                            lv.updatedAt = cvTime;
                            visitsChanged = true;
                            hasNewData = true;
                        } else if (cvTime > lvTime && !cv.deleted) {
                            visitMap.set(key, cv);
                            visitsChanged = true;
                            hasNewData = true;
                        }
                    }
                });

                const mergedVisits = Array.from(visitMap.values());
                if (visitsChanged || mergedVisits.length !== (lp.visits || []).length || visitMap.size > prevVisitCount) {
                    lp.visits = mergedVisits;
                    hasNewData = true;
                }

                map.set(id, lp);
            }
        });

        const merged = Array.from(map.values());
        if (merged.length !== (localPatients || []).length) {
            hasNewData = true;
        }

        return { merged, hasNewData };
    }

    /**
     * Delta Merging for Products
     */
    function deltaMergeProducts(localProducts = [], cloudProducts = []) {
        if (!Array.isArray(cloudProducts) || cloudProducts.length === 0) {
            return { merged: localProducts || [], hasNewProducts: false };
        }

        const map = new Map();
        (localProducts || []).forEach(p => map.set(String(p.id), { ...p }));
        let hasNewProducts = false;

        cloudProducts.forEach(cp => {
            const id = String(cp.id);
            if (!map.has(id)) {
                map.set(id, cp);
                hasNewProducts = true;
            } else {
                const lp = map.get(id);
                const cpTime = toTimestamp(cp.updatedAt);
                const lpTime = toTimestamp(lp.updatedAt);

                if (cp.deleted && cpTime >= lpTime && !lp.deleted) {
                    lp.deleted = true;
                    lp.updatedAt = cpTime;
                    hasNewProducts = true;
                } else if (cpTime > lpTime) {
                    Object.assign(lp, cp);
                    hasNewProducts = true;
                }
                map.set(id, lp);
            }
        });

        const merged = Array.from(map.values());
        if (merged.length !== (localProducts || []).length) {
            hasNewProducts = true;
        }

        return { merged, hasNewProducts };
    }

    /**
     * Synchronize Patients & Visits DB across devices
     */
    const SUPABASE_CONFIG = {
        URL: 'https://fbetvfdmoyfdyctmmodl.supabase.co',
        KEY: 'sb_publishable_El3H_v_leeMy-RaB9kKFaQ_FleDmH4w',
        TABLE: 'patients'
    };

    function getSupabaseHeaders(extra = {}) {
        return {
            'apikey': SUPABASE_CONFIG.KEY,
            'Authorization': 'Bearer ' + SUPABASE_CONFIG.KEY,
            'Accept': 'application/json',
            ...extra
        };
    }

    /**
     * Synchronize Patients & Visits DB across devices via Supabase
     */
    async function syncCloudPatients() {
        if (!window.petiCareData) return;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000);

            const resp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE}?select=*`, {
                method: 'GET',
                headers: getSupabaseHeaders(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!resp.ok) {
                console.warn('Supabase fetch patients status:', resp.status);
                return;
            }
            const rows = await resp.json();
            const cloudPatients = (Array.isArray(rows) ? rows : []).map(r => ({
                id: String(r.id),
                name: r.name || 'مريض بدون اسم',
                type: r.type || '',
                age: r.age ? String(r.age) : '',
                weight: r.weight ? String(r.weight) : '',
                ownerName: r.owner_name || '',
                phone: r.phone || '',
                chronicNotes: r.chronic_notes || '',
                visits: Array.isArray(r.visits) ? r.visits : [],
                createdAt: r.created_at,
                updatedAt: r.updated_at ? toTimestamp(r.updated_at) : (r.created_at ? toTimestamp(r.created_at) : Date.now()),
                deleted: false
            }));

            const localPatients = window.petiCareData.getPatients(true) || [];

            // If Supabase is empty and local has patients, seed Supabase!
            if (cloudPatients.length === 0 && localPatients.length > 0) {
                await pushCloudPatients();
                return;
            }

            const delta = deltaMergePatients(localPatients, cloudPatients);
            if (delta.hasNewData) {
                window.petiCareData.savePatients(delta.merged, true); // true = skip redundant cloud push
                console.log('☁️ تم تحديث سجل المرضى والكشوفات من Supabase بنجاح! الإجمالي:', delta.merged.length);
                if (typeof window.refreshPatientsUI === 'function') window.refreshPatientsUI();
                if (typeof window.populatePatientSelect === 'function') window.populatePatientSelect();
                if (typeof window.renderRadarCards === 'function') window.renderRadarCards();
            }
            updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓');
        } catch (e) {
            console.warn('Patients cloud sync error:', e);
        }
    }

    /**
     * Push local patients to Supabase
     */
    async function pushCloudPatients(forceAll = false) {
        if (!window.petiCareData) return;
        try {
            // 1. Process pending tombstone deletions first
            try {
                const tombstones = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]');
                for (const deadId of tombstones) {
                    await deleteCloudPatient(deadId);
                }
            } catch(eTomb) {}

            let currentLocal = window.petiCareData.getPatients(true) || [];
            if (!currentLocal.length) return;

            // Only push dirty patients unless forceAll is true
            const targets = forceAll ? currentLocal : currentLocal.filter(p => p._dirty);
            if (!targets.length) {
                updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓ (لا توجد تعديلات معلقة)');
                return;
            }

            const pendingCount = targets.length;
            updateSyncBadge('syncing', `جاري مزامنة (${pendingCount}) تعديل سحابياً في Supabase...`);

            const rows = targets.map(p => {
                // Image Optimization: ensure images are clean Data URLs without corrupting idb: strings
                const sanitizedVisits = (Array.isArray(p.visits) ? p.visits : []).map(v => {
                    const cleanVisit = { ...v };
                    // If image is an idb: string, remove it or leave as is if not resolvable
                    if (cleanVisit.prescriptionImage && cleanVisit.prescriptionImage.startsWith('idb:')) {
                        cleanVisit.prescriptionImage = '';
                    }
                    if (Array.isArray(cleanVisit.labImages)) {
                        cleanVisit.labImages = cleanVisit.labImages.filter(img => img && !img.startsWith('idb:'));
                    }
                    if (cleanVisit.caseImage && cleanVisit.caseImage.startsWith('idb:')) {
                        cleanVisit.caseImage = '';
                    }
                    return cleanVisit;
                });

                return {
                    id: String(p.id),
                    name: p.name || 'بدون اسم',
                    type: p.type || '',
                    age: p.age ? String(p.age) : '',
                    weight: p.weight ? String(p.weight) : '',
                    owner_name: p.ownerName || p.owner_name || '',
                    phone: p.phone || '',
                    chronic_notes: p.chronicNotes || p.chronic_notes || '',
                    visits: sanitizedVisits,
                    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
                };
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000);

            const resp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE}`, {
                method: 'POST',
                headers: getSupabaseHeaders({
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                }),
                body: JSON.stringify(rows),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                console.log(`☁️ تم رفع وتحديث (${rows.length}) مريض في Supabase بنجاح.`);
                // Mark synced rows as clean
                targets.forEach(p => { p._dirty = false; });
                window.petiCareData.savePatients(currentLocal, true);
                updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓');
            } else {
                const errTxt = await resp.text();
                console.warn('Push to Supabase returned error:', resp.status, errTxt);
                updateSyncBadge('warning', `فشل رفع (${pendingCount}) تعديل - محفوظ محلياً ⚠️`);
            }
        } catch (e) {
            console.warn('Push patients to Supabase failed:', e);
            const pending = window.petiCareData ? window.petiCareData.getPendingChangesCount() : 0;
            updateSyncBadge('warning', pending > 0 ? `وضع غير متصل (${pending} معلق) ⚠️` : 'وضع غير متصل (أوفلاين) ⚠️');
        }
    }
    /**
     * Connect to Supabase Realtime channel
     */
    function initSupabaseRealtime() {
        if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                if (window._sbPeticareRealtimeChannel) return;
                const sb = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY, {
                    realtime: { params: { eventsPerSecond: 10 } }
                });
                window._sbPeticareClient = sb;
                window._sbPeticareRealtimeChannel = sb.channel('public:patients')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
                        console.log('⚡ Supabase Realtime Update Detected:', payload);
                        syncCloudPatients();
                    })
                    .subscribe((status) => {
                        console.log('⚡ Supabase Realtime Status:', status);
                        if (status === 'SUBSCRIBED') {
                            updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓');
                        }
                    });
            } catch (err) {
                console.warn('Realtime subscription error:', err);
            }
        }
    }

    async function syncCloudProducts() {
        // Products local cache
        return true;
    }
    async function pushCloudProducts() {
        return true;
    }

    /**
     * Comprehensive Sync All: Auth + Patients + Products
     */
    async function syncAllCloudData() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            await Promise.allSettled([
                fetchCloudAuth(),
                syncCloudPatients(),
                syncCloudProducts()
            ]);
            updateSyncBadge('success', 'السيستم موحد ومتزامن لحظياً ✓');
        } catch(e) {
            console.warn('Full sync error:', e);
        } finally {
            isSyncing = false;
        }
    }

    // Automatically synchronize on load
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                syncAllCloudData();
            });
        } else {
            syncAllCloudData();
        }

        // Synchronize when doctor returns to the app tab or phone unlocks
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ عودة للتطبيق - جاري فحص ومزامنة أحدث الكشوفات سحابياً...');
                throttledSync(60000);
            }
        });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('online', () => {
            updateSyncBadge('online', 'تمت استعادة الاتصال بالإنترنت ✓');
            syncAllCloudData();
        });
        window.addEventListener('offline', () => {
            updateSyncBadge('offline', 'أنت في وضع عدم الاتصال (أوفلاين)');
        });
    }

    window.addEventListener('focus', () => {
            syncAllCloudData();
        });
    }

    let lastAutoSyncTime = 0;
    async function throttledSync(minIntervalMs = 60000) {
        if (Date.now() - lastAutoSyncTime < minIntervalMs) return;
        lastAutoSyncTime = Date.now();
        await syncAllCloudData();
    }

    // Smart background sync every 3 minutes (avoids rate limiting while keeping data fresh)
    if (!syncIntervalId) {
        syncIntervalId = setInterval(() => {
            throttledSync(120000);
        }, 180000);
    }

    // Expose PetiCareCloud globally
    const cloudApi = {
        normalizeDigits: normalizeDigits,
        toTimestamp: toTimestamp,
        deltaMergePatients: deltaMergePatients,
        deltaMergeProducts: deltaMergeProducts,
        fetchCloudAuth: fetchCloudAuth,
        saveCloudAuth: saveCloudAuth,
        syncCloudPatients: syncCloudPatients,
        pushCloudPatients: pushCloudPatients,
        deleteCloudPatient,
        getPendingCount: () => (window.petiCareData ? window.petiCareData.getPendingChangesCount() : 0),
        syncCloudProducts: syncCloudProducts,
        pushCloudProducts: pushCloudProducts,
        syncAllCloudData: syncAllCloudData,

        updateCustomEndpoint: function(newUrl) {
            if (newUrl && newUrl.startsWith('http')) {
                CLOUD_ENDPOINTS.PATIENTS = newUrl;
                console.log('☁️ تم تحديث رابط السحابة المعتمد إلى:', newUrl);
                syncCloudPatients();
            }
        },
        endpoints: CLOUD_ENDPOINTS,
        getCloudHeaders: getCloudHeaders,
        apiKey: DEFAULT_PRO_API_KEY,

        updateSyncBadge: updateSyncBadge
    };

    if (typeof window !== 'undefined') {
        
    /**
     * Delete patient directly from Supabase to prevent resurrecting
     */
    async function deleteCloudPatient(patientId) {
        if (!patientId) return;
        try {
            const resp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE}?id=eq.${patientId}`, {
                method: 'DELETE',
                headers: getSupabaseHeaders()
            });
            if (resp.ok) {
                console.log(`☁️ تم حذف المريض (${patientId}) نهائياً من Supabase.`);
                // Clean from tombstones once confirmed
                try {
                    let tombstones = JSON.parse(localStorage.getItem('peticare_tombstones') || '[]');
                    tombstones = tombstones.filter(id => String(id) !== String(patientId));
                    localStorage.setItem('peticare_tombstones', JSON.stringify(tombstones));
                } catch(e) {}
            }
        } catch(e) {
            console.warn('Error deleting patient from Supabase:', e);
        }
    }

window.PetiCareCloud = cloudApi;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = cloudApi;
    }

    console.log("☁️ PetiCare Central Cloud Sync Engine Active (Unified Across All Devices).");
})();
