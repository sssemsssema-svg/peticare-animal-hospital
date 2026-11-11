/**
 * PetiCare Animal Hospital - Admin Management & Accounting Engine (v49)
 * Full RBAC Protection, Real-Time Synchronized KPIs & UTF-8 BOM Excel/CSV Export
 */

// --- Safeguard 1: Cairo Timezone Date Helper ---
function getCairoDateString(dateObj = new Date()) {
    try {
        return new Date(dateObj).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }); // Returns YYYY-MM-DD
    } catch (e) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
window.getCairoDateString = getCairoDateString;

(function () {
    'use strict';

    let currentRange = 'today';
    let cachedVisits = [];
    let filteredVisits = [];

    // 1. Session Authentication & Role Guard
    function checkAdminAuth() {
        if (!window.petiCareData) return false;
        const session = window.petiCareData.getSession();
        if (!session || session.role !== 'admin') {
            console.warn('Unauthorized access attempt to Admin Portal.');
            alert('عذراً، هذه الصفحة مخصصة لمدير المستشفى فقط (د. شريف دياب). سيتم تحويلك لصفحة تسجيل الدخول.');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // 2. Load & Flatten Visits from Patients Database
    function loadAllVisits() {
        if (!window.petiCareData) return [];
        const patients = window.petiCareData.getPatients(false) || [];
        const visits = [];

        patients.forEach(p => {
            if (!Array.isArray(p.visits)) return;
            p.visits.forEach(v => {
                const fee = Number(v.fee) || 0;
                const paid = Number(v.paid) || 0;
                const remaining = v.remaining !== undefined ? Number(v.remaining) : Math.max(0, fee - paid);

                visits.push({
                    patientId: p.id,
                    petName: p.name || 'أليف',
                    petType: p.type || '',
                    ownerName: p.ownerName || p.owner_name || 'عميل',
                    phone: p.phone || '',
                    visitId: v.id,
                    date: v.date || (v.created_at ? v.created_at.split('T')[0] : ''),
                    time: v.time || (v.created_at ? new Date(v.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''),
                    created_at: v.created_at || v.date,
                    visitType: v.visitType || 'كشف عام',
                    chiefComplaint: v.chiefComplaint || '',
                    doctorName: v.doctorName || v.doctor || 'طبيب العيادة',
                    diagnosis: v.diagnosis || 'كشف سريري',
                    treatment: v.treatment || 'متابعة طبية',
                    dosage: v.dosage || '',
                    labs: v.labs || '',
                    fee: fee,
                    paid: paid,
                    remaining: remaining,
                    isSettled: remaining <= 0,
                    status: v.status || 'مكتملة'
                });
            });
        });

        // Sort newest first
        visits.sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });

        return visits;
    }

    // 3. Date Range Filter Logic
    function isDateInRange(dateStr, range) {
        if (!dateStr) return false;
        const now = new Date();
        const target = new Date(dateStr);

        const todayStr = getCairoDateString(now);
        
        const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yestStr = getCairoDateString(yest);

        if (range === 'today') {
            return dateStr === todayStr;
        } else if (range === 'yesterday') {
            return dateStr === yestStr;
        } else if (range === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return target >= weekAgo;
        } else if (range === 'month') {
            return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
        } else if (range === 'all') {
            return true;
        }
        return true;
    }

    // 4. Apply All Active Filters & Render
    function applyAdminFilters() {
        const typeFilter = document.getElementById('filterVisitType')?.value || 'all';
        const finFilter = document.getElementById('filterFinancialStatus')?.value || 'all';
        const searchInput = document.getElementById('adminSearchInput')?.value.trim().toLowerCase() || '';

        filteredVisits = cachedVisits.filter(v => {
            // Date range
            if (!isDateInRange(v.date, currentRange)) return false;

            // Visit type
            if (typeFilter !== 'all' && v.visitType !== typeFilter) return false;

            // Financial status
            if (finFilter === 'settled' && !v.isSettled) return false;
            if (finFilter === 'debt' && v.isSettled) return false;

            // Search query
            if (searchInput) {
                const match = (v.petName && v.petName.toLowerCase().includes(searchInput)) ||
                              (v.ownerName && v.ownerName.toLowerCase().includes(searchInput)) ||
                              (v.phone && v.phone.includes(searchInput)) ||
                              (v.doctorName && v.doctorName.toLowerCase().includes(searchInput)) ||
                              (v.diagnosis && v.diagnosis.toLowerCase().includes(searchInput)) ||
                              (String(v.patientId).includes(searchInput)) ||
                              (String(v.visitId).includes(searchInput));
                if (!match) return false;
            }

            return true;
        });

        updateAdminKPIs();
        renderAdminTable();
    }

    // 5. Update KPI Dashboard Cards
    function updateAdminKPIs() {
        let totalCollected = 0;
        let totalRemaining = 0;
        let debtorsCount = 0;

        filteredVisits.forEach(v => {
            totalCollected += v.paid;
            totalRemaining += v.remaining;
            if (v.remaining > 0) debtorsCount++;
        });

        const totalPatients = (window.petiCareData && window.petiCareData.getPatients) ? window.petiCareData.getPatients(false).length : 0;

        const elTotalVisits = document.getElementById('statTotalVisits');
        const elTotalCollected = document.getElementById('statTotalCollected');
        const elTotalRemaining = document.getElementById('statTotalRemaining');
        const elTotalPatients = document.getElementById('statTotalPatients');
        const elDebtorsSub = document.getElementById('statDebtorsCount');

        if (elTotalVisits) elTotalVisits.textContent = filteredVisits.length;
        if (elTotalCollected) elTotalCollected.textContent = `${totalCollected.toLocaleString()} ج.م`;
        if (elTotalRemaining) elTotalRemaining.textContent = `${totalRemaining.toLocaleString()} ج.م`;
        if (elTotalPatients) elTotalPatients.textContent = totalPatients;
        if (elDebtorsSub) elDebtorsSub.textContent = `متبقي على ${debtorsCount} عميل`;
    }

    // 6. Render Table Rows
    function renderAdminTable() {
        const tbody = document.getElementById('adminVisitsTableBody');
        if (!tbody) return;

        if (filteredVisits.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: #94a3b8;">
                        لا توجد كشوفات مطابقة لمعايير البحث في هذه الفترة.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredVisits.map(v => {
            return `
                <tr>
                    <td>
                        <strong>${v.date}</strong>
                        <div style="font-size: 11px; color: #94a3b8;">${v.time || ''}</div>
                    </td>
                    <td>
                        <strong style="color: #38bdf8;">${v.petName}</strong>
                        <div style="font-size: 11px; color: #94a3b8;">${v.petType} (#${v.patientId})</div>
                    </td>
                    <td>
                        <strong>${v.ownerName}</strong>
                        <div style="font-size: 11px; color: #cbd5e1;">
                            <a href="tel:${v.phone}" style="color: #38bdf8; text-decoration: none;">${v.phone || 'بدون هاتف'}</a>
                        </div>
                    </td>
                    <td>
                        <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #7dd3fc; font-size: 11px; padding: 3px 8px; border-radius: 6px;">
                            ${v.visitType}
                        </span>
                    </td>
                    <td>
                        <span style="font-size: 12px; color: #cbd5e1;">👨‍⚕️ ${v.doctorName}</span>
                    </td>
                    <td style="max-width: 220px;">
                        <div style="font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${v.diagnosis}">🩺 ${v.diagnosis}</div>
                        <div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${v.treatment}">💊 ${v.treatment}</div>
                    </td>
                    <td><strong style="color: #7dd3fc;">${v.fee} ج.م</strong></td>
                    <td><strong style="color: #10b981;">${v.paid} ج.م</strong></td>
                    <td>
                        ${v.remaining > 0 ? `<strong style="color: #ef4444;">${v.remaining} ج.م</strong>` : '<span style="color:#64748b;">0</span>'}
                    </td>
                    <td>
                        ${v.isSettled
                            ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px; padding:3px 8px; border-radius:12px;">خالص ✓</span>'
                            : `<span class="badge" style="background:#ef4444; color:#fff; font-size:10px; padding:3px 8px; border-radius:12px;">متبقي ${v.remaining} ج.م</span>`
                        }
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${!v.isSettled ? `
                                <button type="button" class="btn btn-sm" onclick="settleAdminDebt('${v.patientId}', '${v.visitId}')" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; font-size: 11px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 700;" title="تسديد المتبقي وتصفية الحساب كاش">
                                    💵 تسديد
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary btn-sm" onclick="openAdminEditModal('${v.patientId}', '${v.visitId}')" style="font-size: 11px; padding: 4px 8px; border-radius: 6px;" title="تعديل الكشف والأتعاب">
                                ✏️ تعديل
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 7. UTF-8 BOM CSV / Excel Accounting Export
    function exportAdminVisitsCSV() {
        if (!filteredVisits || filteredVisits.length === 0) {
            alert('لا توجد بيانات مطابقة لتصديرها.');
            return;
        }

        const headers = [
            'رقم الكشف',
            'التاريخ',
            'الوقت',
            'اسم الأليف',
            'نوع الأليف',
            'رقم الملف',
            'اسم المالك',
            'رقم الهاتف',
            'نوع الكشف',
            'الطبيب الفاحص',
            'التشخيص الطبي',
            'العلاج والروشتة',
            'الأتعاب الإجمالية (ج.م)',
            'المبلغ المدفوع (ج.م)',
            'المتبقي / الآجل (ج.م)',
            'الحالة المالية'
        ];

        function cleanCSVCell(str) {
            if (str === null || str === undefined) return '""';
            const s = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
            return `"${s}"`;
        }

        const rows = filteredVisits.map(v => [
            cleanCSVCell(v.visitId),
            cleanCSVCell(v.date),
            cleanCSVCell(v.time),
            cleanCSVCell(v.petName),
            cleanCSVCell(v.petType),
            cleanCSVCell(v.patientId),
            cleanCSVCell(v.ownerName),
            cleanCSVCell(v.phone),
            cleanCSVCell(v.visitType),
            cleanCSVCell(v.doctorName),
            cleanCSVCell(v.diagnosis),
            cleanCSVCell(v.treatment),
            cleanCSVCell(v.fee),
            cleanCSVCell(v.paid),
            cleanCSVCell(v.remaining),
            cleanCSVCell(v.isSettled ? 'خالص' : `متبقي ${v.remaining} ج.م`)
        ]);

        // Prepend UTF-8 BOM (\uFEFF) so Excel opens Arabic text flawlessly
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nowStr = getCairoDateString();
        a.href = url;
        a.download = `PetiCare_Accounting_Report_${currentRange}_${nowStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 8. Edit Visit Modal Handlers
    function openAdminEditModal(patientId, visitId) {
        if (!window.petiCareData) return;
        const p = window.petiCareData.getPatientById(patientId);
        if (!p || !Array.isArray(p.visits)) return;
        const v = p.visits.find(x => String(x.id) === String(visitId));
        if (!v) return;

        document.getElementById('adminEditPatientId').value = patientId;
        document.getElementById('adminEditVisitId').value = visitId;
        document.getElementById('adminEditDiagnosis').value = v.diagnosis || '';
        document.getElementById('adminEditTreatment').value = v.treatment || '';
        document.getElementById('adminEditDosage').value = v.dosage || '';
        document.getElementById('adminEditLabs').value = (v.labs && v.labs !== 'لا يوجد' && v.labs !== 'لا توجد تحاليل') ? v.labs : '';

        const fee = Number(v.fee) || 0;
        const paid = Number(v.paid) || 0;
        document.getElementById('adminEditFee').value = fee;
        document.getElementById('adminEditPaid').value = paid;
        document.getElementById('adminEditRemaining').value = Math.max(0, fee - paid);

        const sub = document.getElementById('adminEditSubHeader');
        if (sub) sub.textContent = `تعديل كشف: ${p.name} (${p.ownerName || ''}) - كشف #${visitId}`;

        const modal = document.getElementById('modalAdminEditVisit');
        if (modal) modal.style.display = 'flex';
    }

    function closeAdminEditModal() {
        const modal = document.getElementById('modalAdminEditVisit');
        if (modal) modal.style.display = 'none';
    }

    function calculateAdminEditRemaining() {
        const fee = Number(document.getElementById('adminEditFee').value) || 0;
        const paid = Number(document.getElementById('adminEditPaid').value) || 0;
        document.getElementById('adminEditRemaining').value = Math.max(0, fee - paid);
    }

    function saveAdminEditedVisit() {
        const patientId = document.getElementById('adminEditPatientId').value;
        const visitId = document.getElementById('adminEditVisitId').value;
        if (!patientId || !visitId || !window.petiCareData) return;

        const fee = Number(document.getElementById('adminEditFee').value) || 0;
        const paid = Number(document.getElementById('adminEditPaid').value) || 0;

        const updatedFields = {
            diagnosis: document.getElementById('adminEditDiagnosis').value.trim(),
            treatment: document.getElementById('adminEditTreatment').value.trim(),
            dosage: document.getElementById('adminEditDosage').value.trim(),
            labs: document.getElementById('adminEditLabs').value.trim(),
            fee: fee,
            paid: paid,
            remaining: Math.max(0, fee - paid),
            updated_at: Date.now()
        };

        window.petiCareData.updateVisitInPatient(patientId, visitId, updatedFields);
        closeAdminEditModal();
        reloadAdminData();
    }

    // 9. Settle Debt One-Click
    function settleAdminDebt(patientId, visitId) {
        if (!window.petiCareData) return;
        const ok = window.petiCareData.settleVisitDebt(patientId, visitId);
        if (ok) {
            reloadAdminData();
        }
    }

    // 10. Date Filter Helper
    function setAdminDateFilter(range, btn) {
        currentRange = range;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        applyAdminFilters();
    }

    function reloadAdminData() {
        cachedVisits = loadAllVisits();
        applyAdminFilters();
    }

    function logoutAdmin() {
        if (window.petiCareData) {
            window.petiCareData.clearSession();
        }
        window.location.href = 'login.html';
    }

    // 11. Initialization & Real-Time Sync Binding
    document.addEventListener('DOMContentLoaded', () => {
        if (!checkAdminAuth()) return;

        reloadAdminData();

        // Listen for Realtime Supabase changes
        window.addEventListener('peticare-cloud-synced', () => {
            reloadAdminData();
        });

        // Periodic poll every 5s for realtime live stats
        setInterval(() => {
            reloadAdminData();
        }, 5000);
    });

    // Window Exports
    window.setAdminDateFilter = setAdminDateFilter;
    window.applyAdminFilters = applyAdminFilters;
    window.exportAdminVisitsCSV = exportAdminVisitsCSV;
    window.openAdminEditModal = openAdminEditModal;
    window.closeAdminEditModal = closeAdminEditModal;
    window.calculateAdminEditRemaining = calculateAdminEditRemaining;
    window.saveAdminEditedVisit = saveAdminEditedVisit;
    window.settleAdminDebt = settleAdminDebt;
    window.logoutAdmin = logoutAdmin;
})();
