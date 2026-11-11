
// ==============================================================================
// 📝 AUTOMATIC VISIT DRAFT RECOVERY & ANTI-REFRESH SYSTEM (حفظ المسودة التلقائي)
// ==============================================================================
let _draftSaveTimeout = null;

function saveVisitDraft() {
    try {
        const patientSelect = document.getElementById('visitPatientSelect');
        const patientId = (currentSelectedPatient ? currentSelectedPatient.id : '') || (patientSelect ? patientSelect.value : '');
        const diagnosis = document.getElementById('visitDiagnosis') ? document.getElementById('visitDiagnosis').value : '';
        const treatment = document.getElementById('visitTreatment') ? document.getElementById('visitTreatment').value : '';
        const dosage = document.getElementById('visitDosage') ? document.getElementById('visitDosage').value : '';
        const labs = document.getElementById('visitLabs') ? document.getElementById('visitLabs').value : '';
        const followDays = document.getElementById('visitFollowDays') ? document.getElementById('visitFollowDays').value : '';
        const followDate = document.getElementById('visitFollowDate') ? document.getElementById('visitFollowDate').value : '';
        const chronicNotes = document.getElementById('visitChronicNotes') ? document.getElementById('visitChronicNotes').value : '';
        const hasChronic = document.getElementById('chkVisitHasChronic') ? document.getElementById('chkVisitHasChronic').checked : false;

        const hasAnyContent = (patientId && patientId.trim()) ||
                              diagnosis.trim() ||
                              treatment.trim() ||
                              labs.trim() ||
                              chronicNotes.trim() ||
                              (uploadedImages && (uploadedImages.prescriptionImage || uploadedImages.caseImage || (uploadedImages.labImages && uploadedImages.labImages.length > 0)));

        if (!hasAnyContent) {
            localStorage.removeItem('peticare_active_visit_draft');
            const banner = document.getElementById('draftRestoredBanner');
            if (banner) banner.style.display = 'none';
            return;
        }

        const draft = {
            patientId,
            diagnosis,
            treatment,
            dosage,
            labs,
            followDays,
            followDate,
            chronicNotes,
            hasChronic,
            uploadedImages: {
                prescriptionImage: uploadedImages.prescriptionImage || '',
                caseImage: uploadedImages.caseImage || '',
                labImages: (uploadedImages.labImages && Array.isArray(uploadedImages.labImages)) ? [...uploadedImages.labImages] : [],
                clientImage: uploadedImages.clientImage || ''
            },
            updatedAt: Date.now()
        };

        localStorage.setItem('peticare_active_visit_draft', JSON.stringify(draft));
    } catch (e) {
        console.warn('Draft auto-save warning:', e);
    }
}
window.saveVisitDraft = saveVisitDraft;

function debouncedSaveVisitDraft() {
    clearTimeout(_draftSaveTimeout);
    _draftSaveTimeout = setTimeout(saveVisitDraft, 350);
}

function restoreVisitDraft() {
    try {
        const draftStr = localStorage.getItem('peticare_active_visit_draft');
        if (!draftStr) return;
        const draft = JSON.parse(draftStr);
        if (!draft) return;

        // Discard drafts older than 24 hours
        if (draft.updatedAt && (Date.now() - draft.updatedAt > 24 * 60 * 60 * 1000)) {
            localStorage.removeItem('peticare_active_visit_draft');
            return;
        }

        let restoredSomething = false;

        // 1. Patient selection
        if (draft.patientId) {
            const pSel = document.getElementById('visitPatientSelect');
            if (pSel) pSel.value = draft.patientId;
            if (typeof updateSelectedPatientQuickCard === 'function') {
                updateSelectedPatientQuickCard(draft.patientId);
            }
            restoredSomething = true;
        }

        // 2. Text fields
        if (draft.diagnosis) {
            const el = document.getElementById('visitDiagnosis');
            if (el) { el.value = draft.diagnosis; restoredSomething = true; }
        }
        if (draft.treatment) {
            const el = document.getElementById('visitTreatment');
            if (el) { el.value = draft.treatment; restoredSomething = true; }
        }
        if (draft.dosage) {
            const el = document.getElementById('visitDosage');
            if (el) { el.value = draft.dosage; restoredSomething = true; }
        }
        if (draft.labs) {
            const el = document.getElementById('visitLabs');
            if (el) { el.value = draft.labs; restoredSomething = true; }
        }
        if (draft.followDays) {
            const el = document.getElementById('visitFollowDays');
            if (el) { el.value = draft.followDays; restoredSomething = true; }
        }
        if (draft.followDate) {
            const el = document.getElementById('visitFollowDate');
            if (el) { el.value = draft.followDate; restoredSomething = true; }
        }
        if (draft.hasChronic) {
            const chk = document.getElementById('chkVisitHasChronic');
            if (chk) {
                chk.checked = true;
                if (typeof toggleVisitChronicField === 'function') toggleVisitChronicField(true);
            }
        }
        if (draft.chronicNotes) {
            const el = document.getElementById('visitChronicNotes');
            if (el) { el.value = draft.chronicNotes; restoredSomething = true; }
        }

        // 3. Uploaded Attachments
        if (draft.uploadedImages) {
            if (draft.uploadedImages.prescriptionImage) {
                uploadedImages.prescriptionImage = draft.uploadedImages.prescriptionImage;
                const pBox = document.getElementById('prescriptionImgPreview');
                const pImg = document.getElementById('prescriptionPreviewImg');
                if (pBox && pImg) {
                    pImg.src = uploadedImages.prescriptionImage;
                    pBox.style.display = 'flex';
                }
                const btnRx = document.getElementById('btnUploadPrescriptionImg');
                if (btnRx) {
                    btnRx.classList.add('has-file');
                    const lbl = btnRx.querySelector('.btn-label');
                    if (lbl) lbl.textContent = 'تم الرفع ✓';
                }
                restoredSomething = true;
            }
            if (draft.uploadedImages.caseImage) {
                uploadedImages.caseImage = draft.uploadedImages.caseImage;
                const cBox = document.getElementById('caseImgPreview');
                if (cBox) {
                    const cImg = cBox.querySelector('img');
                    if (cImg) cImg.src = uploadedImages.caseImage;
                    cBox.style.display = 'flex';
                }
                restoredSomething = true;
            }
            if (draft.uploadedImages.labImages && draft.uploadedImages.labImages.length > 0) {
                uploadedImages.labImages = [...draft.uploadedImages.labImages];
                if (typeof renderLabThumbsGallery === 'function') {
                    renderLabThumbsGallery();
                }
                restoredSomething = true;
            }
        }

        if (restoredSomething) {
            const banner = document.getElementById('draftRestoredBanner');
            if (banner) banner.style.display = 'flex';
            if (typeof showToast === 'function') {
                showToast('📝 تم استرجاع مسودة كشف غير محفوظة تلقائياً', 'info');
            }
        }
    } catch (e) {
        console.warn('Draft restore error:', e);
    }
}
window.restoreVisitDraft = restoreVisitDraft;

function clearVisitDraft(resetUI = false) {
    localStorage.removeItem('peticare_active_visit_draft');
    const banner = document.getElementById('draftRestoredBanner');
    if (banner) banner.style.display = 'none';

    if (resetUI) {
        const form = document.getElementById('formNewVisit');
        if (form) form.reset();
        if (typeof resetUploaders === 'function') resetUploaders();
        if (typeof updateSelectedPatientQuickCard === 'function') updateSelectedPatientQuickCard('');
        if (typeof showToast === 'function') showToast('تم مسح المسودة والبدء من جديد', 'info');
    }
}
window.clearVisitDraft = clearVisitDraft;

function setupDraftAutoSaveListeners() {
    const inputIds = ['visitDiagnosis', 'visitTreatment', 'visitDosage', 'visitLabs', 'visitFollowDays', 'visitFollowDate', 'visitChronicNotes'];
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', debouncedSaveVisitDraft);
            el.addEventListener('change', debouncedSaveVisitDraft);
        }
    });

    const chk = document.getElementById('chkVisitHasChronic');
    if (chk) {
        chk.addEventListener('change', saveVisitDraft);
    }

    const pSel = document.getElementById('visitPatientSelect');
    if (pSel) {
        pSel.addEventListener('change', saveVisitDraft);
    }
}
window.setupDraftAutoSaveListeners = setupDraftAutoSaveListeners;

// Anti-Accidental Refresh / Close Warning
window.addEventListener('beforeunload', (e) => {
    try {
        const draftStr = localStorage.getItem('peticare_active_visit_draft');
        if (draftStr) {
            const d = JSON.parse(draftStr);
            if (d && (d.diagnosis || d.treatment || d.patientId || (d.uploadedImages && d.uploadedImages.prescriptionImage))) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        }
    } catch(err) {}
});


function confirmDeleteCurrentPatient() {
    if (!isUserAdmin()) {
        alert('عذراً، صلاحية حذف ملف المريض مقتصرة على حساب الأدمن (مدير النظام) فقط.');
        return;
    }
    if (!currentSelectedPatient) return;
    const pName = currentSelectedPatient.name || 'المريض';
    const pId = currentSelectedPatient.id;

    const ok = confirm(`⚠️ تحذير أمني خاص بالأدمن:\nهل أنت متأكد من حذف ملف المريض "${pName}" (رقم #${pId}) وكافة كشوفاته وسجلاته نهائياً؟\nهذا الإجراء سيقوم بحذف الملف ومزامنته سحابياً ولن يظهر لأي مستخدم.`);
    if (ok) {
        window.petiCareData.deletePatient(pId);
        if (typeof showToast === 'function') showToast(`🗑️ تم حذف ملف المريض (${pName}) بنجاح`, 'success');
        currentSelectedPatient = null;
        if (typeof closePatientModal === 'function') closePatientModal();
        if (typeof renderPatientsList === 'function') renderPatientsList();
        if (typeof refreshLiveTodayVisitsUI === 'function') refreshLiveTodayVisitsUI();
        // Initialize Auto-Draft System & Restore if exists
        setTimeout(() => {
            setupDraftAutoSaveListeners();
            restoreVisitDraft();
        }, 300);

        if (typeof switchSection === 'function') switchSection('section-visit');
    }
}
window.confirmDeleteCurrentPatient = confirmDeleteCurrentPatient;

function confirmDeletePatientById(pId) {
    if (!isUserAdmin()) {
        alert('عذراً، صلاحية حذف ملف المريض مقتصرة على حساب الأدمن (مدير النظام) فقط.');
        return;
    }
    const patient = window.petiCareData ? window.petiCareData.getPatientById(pId) : null;
    const pName = (patient && patient.name) ? patient.name : 'المريض';

    const ok = confirm(`⚠️ تحذير أمني خاص بالأدمن:\nهل أنت متأكد من حذف ملف المريض "${pName}" (رقم #${pId}) وكافة كشوفاته وسجلاته نهائياً؟\nهذا الإجراء سيقوم بحذف الملف ومزامنته سحابياً ولن يظهر لأي مستخدم.`);
    if (ok) {
        window.petiCareData.deletePatient(pId);
        if (typeof showToast === 'function') showToast(`🗑️ تم حذف ملف المريض (${pName}) بنجاح`, 'success');
        if (typeof currentSelectedPatient !== 'undefined' && currentSelectedPatient && currentSelectedPatient.id === pId) {
            currentSelectedPatient = null;
        }
        if (typeof closePatientModal === 'function') closePatientModal();
        if (typeof renderPatientsList === 'function') renderPatientsList();
        if (typeof refreshLiveTodayVisitsUI === 'function') refreshLiveTodayVisitsUI();
        if (typeof renderPortalTimeline === 'function') renderPortalTimeline();
    }
}
window.confirmDeletePatientById = confirmDeletePatientById;

function editVisitFromCurrentSheet() {
    if (currentSavedVisitData && currentSavedVisitData.patient && currentSavedVisitData.visit) {
        closeBottomSheet();
        openEditVisitModal(currentSavedVisitData.patient.id, currentSavedVisitData.visit.id);
    }
}
window.editVisitFromCurrentSheet = editVisitFromCurrentSheet;
﻿



// ==============================================================================



// PHONETIC MEDICAL & PHARMACEUTICAL DICTIONARY CLEANER (مصحح الأخطاء الصوتية للأدوية)



// Converts common speech-to-text misrecognitions into clean Arabic drug names



// ==============================================================================



function cleanPhoneticMedications(text) {



    if (!text || typeof text !== 'string') return text || '';



    let t = text;



    const rules = [



        // Amoxicillin



        [/\b(?:اموكس\s*سلم|اموكس\s*سليم|اموكس\s*سلين|اموكس\s*سيلين|اموكسي\s*سيلين|اموكسي\s*سلين|اموكسسلين|اموكسيسلين|امكسيسيلين|اموكسيلين)\b/gi, 'أموكسيسيلين'],



        // Amoxiclav



        [/\b(?:اموكس\s*كلاف|اموكسي\s*كلاف|اموكسكلاف)\b/gi, 'أموكسيكلاف'],



        // Augmentin



        [/\b(?:اوجمانتين|اوجمينتين|اوجمتن|اوجمنتن|اوغمنتين|اوج\s*من\s*تين|اوج\s*منتين|اوجمنتين)\b/gi, 'أوجمنتين'],



        // Clavox



        [/\b(?:كلا\s*فوكس|كلافو\s*كس)\b/gi, 'كلافوكس'],



        // Flagyl



        [/\b(?:فلا\s*جيل)\b/gi, 'فلاجيل'],



        // Antinal



        [/\b(?:انتي\s*نال)\b/gi, 'أنتينال'],



        // Cefotax



        [/\b(?:سيفو\s*تاكس)\b/gi, 'سيفوتاكس'],



        // Ceftriaxone



        [/\b(?:سيفو\s*ترايكسون|سفترياكس\s*ون|سفتر\s*ياكسون)\b/gi, 'سفترياكسون'],



        // Revolution



        [/\b(?:ريفو\s*ليوشن|ريفو\s*لوشن|ريفليوشن)\b/gi, 'ريفولوشن'],



        // Dexamethasone



        [/\b(?:ديكسا\s*ميثازون|دكسا\s*ميثازون|ديكسامتازون|دكسا\s*متازون)\b/gi, 'ديكساميثازون'],



        // Streptomycin



        [/\b(?:ستربتو\s*مايسين|ستربتو\s*ميسين|ستريبين)\b/gi, 'ستربتومايسين'],



        // Gentamicin



        [/\b(?:جنتا\s*مايسين|جنتامايسين|جنتا\s*ميسين)\b/gi, 'جنتاميسين'],



        // Ivermectin



        [/\b(?:ايفر\s*مكتين|ايفرمكتين|ايفرميكتين)\b/gi, 'إيفرمكتين'],



        // Prednisolone



        [/\b(?:بريد\s*نيزولون|بريدنيزلون)\b/gi, 'بريدنيزولون'],



        // Ketofan



        [/\b(?:كيتو\s*فان)\b/gi, 'كيتوفان'],



        // Canvit



        [/\b(?:كان\s*فيت)\b/gi, 'كانفيت'],



        // Ciprofloxacin



        [/\b(?:سيبرو\s*فلوكساسين|سبرو\s*فلوكساسين)\b/gi, 'سيبروفلوكساسين'],



        // Doxycycline



        [/\b(?:دوكسي\s*سيكلين|دوكسيسكلين)\b/gi, 'دوكسيسيكلين'],



        // Panacur



        [/\b(?:بانا\s*كور)\b/gi, 'باناكور'],



        // Drontal



        [/\b(?:درون\s*تال)\b/gi, 'درونتال'],



        // Broadline



        [/\b(?:برود\s*لاين)\b/gi, 'برودلاين'],



        // Advocate



        [/\b(?:ادفيكات|ادفوكات)\b/gi, 'أدفيكات'],



        // Frontline



        [/\b(?:فرونت\s*لاين)\b/gi, 'فرونتلاين'],



        // Cataflam



        [/\b(?:كتا\s*فلام)\b/gi, 'كتافلام'],



        // Otoclean



        [/\b(?:اوتو\s*كلين)\b/gi, 'أوتوكلين'],



        // Surolan



        [/\b(?:سورو\s*لان)\b/gi, 'سورولان'],



        // Zymox



        [/\b(?:زاي\s*موكس)\b/gi, 'زايموكس'],



        // Betadine



        [/\b(?:بيتا\s*دين)\b/gi, 'بيتادين'],



        // Primperan



        [/\b(?:برم\s*بران)\b/gi, 'برمبران'],



        // Ranitidine



        [/\b(?:راني\s*تيدين)\b/gi, 'رانيتيدين'],



        // Omeprazole



        [/\b(?:اومي\s*برازول)\b/gi, 'أوميبرازول']



    ];



    for (let i = 0; i < rules.length; i++) {



        t = t.replace(rules[i][0], rules[i][1]);



    }



    return t;



}



window.cleanPhoneticMedications = cleanPhoneticMedications;







function escapeHtml(str) {



    if (str === null || str === undefined) return '';



    return String(str)



        .replace(/&/g, '&amp;')



        .replace(/</g, '&lt;')



        .replace(/>/g, '&gt;')



        .replace(/"/g, '&quot;')



        .replace(/'/g, '&#039;');



}



window.escapeHtml = escapeHtml;



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

// --- Safeguard 2: Egyptian Phone Normalization ---
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
window.normalizeEgyptPhone = normalizeEgyptPhone;

let isUserDictating = false;



/**



 * PetiCare Animal Hospital - Doctor & Voice Recognition Module



 * Assets / JS / doctor.js



 */



// App State



let speechRecognizer = null;



let isRecognizing = false;



let uploadedImages = {



    caseImage: '',



    clientImage: '',



    prescriptionImage: '',



    labImages: [] // Array of Base64 strings for multiple lab photos



};



let currentSelectedPatient = null;



let currentSavedVisitData = null;



function normalizeDigits(str) {
    if (!str) return '';
    return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}



/**
 * Official Meta WhatsApp Cloud API Integration (v49)
 * Sends automated reports and radar alerts in background via Meta Graph API
 * If credentials are not configured, falls back cleanly to wa.me without data loss
 */
async function sendMetaWhatsAppMessage(toPhone, textBody, templateName = null) {
    const phoneId = localStorage.getItem('peticare_meta_phone_id') || '';
    const token = localStorage.getItem('peticare_meta_access_token') || '';
    const forwardPhone = localStorage.getItem('peticare_doctor_forward_phone') || '201555345999';

    const cleanPhone = normalizeEgyptPhone(toPhone);
    if (!cleanPhone) return { ok: false, error: 'invalid_phone' };

    // Fallback to wa.me if Meta API credentials not provided
    if (!phoneId || !token) {
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textBody)}`;
        window.open(url, '_blank');
        return { ok: true, mode: 'fallback_wame' };
    }

    try {
        let payload;
        if (templateName) {
            const sanitizedSummary = String(textBody || '').replace(/\r?\n+/g, ' | ').trim().slice(0, 900);
            payload = {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "ar" },
                    components: [
                        {
                            type: "body",
                            parameters: [{ type: "text", text: sanitizedSummary }]
                        }
                    ]
                }
            };
        } else {
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: { preview_url: true, body: textBody }
            };
        }

        let resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let resData = await resp.json().catch(() => null);

        // Safeguard 2: If template parameter mismatch (132000 or 132012), retry with 0 parameters (empty components)
        if (resData && resData.error && (resData.error.code === 132000 || resData.error.code === 132012) && payload.type === 'template') {
            payload.template.components = [];
            resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            resData = await resp.json().catch(() => null);
        }

        // Auto retry with template if 24-hour customer window error (131047 / 131026)
        if (resData && resData.error && (resData.error.code === 131047 || resData.error.code === 131026) && !templateName) {
            const fallbackTemplate = localStorage.getItem('peticare_meta_template_name') || 'peticare_report';
            return sendMetaWhatsAppMessage(toPhone, textBody, fallbackTemplate);
        }

        if (resp.ok) {
            return { ok: true, data: resData };
        } else {
            console.warn('Meta API returned error, falling back to wa.me:', resData);
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textBody)}`;
            window.open(url, '_blank');
            return { ok: false, error: resData, mode: 'fallback_wame' };
        }
    } catch (err) {
        console.warn('sendMetaWhatsAppMessage exception:', err);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textBody)}`;
        window.open(url, '_blank');
        return { ok: false, error: err, mode: 'fallback_wame' };
    }
}


function normalizeEgyptianPhone(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && /[🔒xX*]/.test(raw)) return null;

  const arabicIndic  = '٠١٢٣٤٥٦٧٨٩';
  const persianIndic = '۰۱۲۳۴۵۶۷۸۹';
  let s = String(raw)
    .replace(/[٠-٩]/g, d => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(persianIndic.indexOf(d)))
    .replace(/[^\d]/g, '');

  if (!s) return null;
  if (s.startsWith('0020'))  s = s.slice(4);
  else if (s.startsWith('20') && s.length === 12) s = '0' + s.slice(2);

  if (/^01\d{9}$/.test(s))          return '2' + s;
  if (/^1\d{9}$/.test(s))           return '20' + s;
  if (/^201\d{9}$/.test(s))         return s;
  if (/^20[1-9]\d{8}$/.test(s))     return s;
  return null;
}

window.sendVisitViaWhatsAppManual = function(patient, visit) {
  const p = patient || (window.currentSavedVisitData && window.currentSavedVisitData.patient);
  const v = visit   || (window.currentSavedVisitData && window.currentSavedVisitData.visit);
  if (!p) {
    if (typeof showToast === 'function') showToast('⚠️ لم يتم تحديد بيانات المريض', 'warning');
    return;
  }
  const rawPhone = p.ownerPhone || p.phone || p.owner_phone;
  const intlPhone = normalizeEgyptianPhone(rawPhone);

  if (!intlPhone) {
    if (typeof showToast === 'function') showToast('⚠️ رقم الهاتف مخفي أو غير صالح للإرسال', 'warning');
    return;
  }

  const message = (typeof formatVisitWhatsAppText === 'function')
    ? formatVisitWhatsAppText(p, v)
    : (typeof buildVisitWhatsAppMessage === 'function' ? buildVisitWhatsAppMessage(p, v) : '');

  const encoded = encodeURIComponent(message);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const targetUrl = isIOS ? `whatsapp://send?phone=${intlPhone}&text=${encoded}` : `https://wa.me/${intlPhone}?text=${encoded}`;

  if (typeof showToast === 'function') showToast('📲 جاري فتح واتساب...', 'info');
  window.location.href = targetUrl;
};


function formatVisitWhatsAppText(patient, visit) {
    const p = patient || {};
    const v = visit || {};
    const ownerName = p.ownerName || p.owner || 'عميلنا العزيز';
    const petName   = p.name || p.petName || 'الأليف';
    const hasRx = !!(v.prescriptionImage);
    const hasLabs = Array.isArray(v.labImages) && v.labImages.length > 0;

    return `🏥 *مستشفى بيتي كير البيطري - PetiCare Animal Hospital*
----------------------------------------
📋 *تقرير الكشف الطبي والمتابعة المعتمد*
🐾 *اسم الأليف:* ${petName} (${p.type || 'حيوان أليف'})
🏷️ *رقم الملف الطبي:* #${p.id || ''}
👤 *اسم المالك:* ${ownerName}
📅 *تاريخ الزيارة:* ${v.date || getCairoDateString()}

🩺 *التشخيص الطبي:*
${v.diagnosis || 'كشف وفحص سريري معتمد'}

💊 *العلاج المقرر والروشتة:*
${v.treatment || 'متابعة وإرشادات عامة'}${hasRx ? ' (مرفق صورة الروشتة بالتقرير 📑)' : ''}
${v.dosage ? `⏱️ *الجرعة المقررة:* ${v.dosage}` : ''}
${v.labs && v.labs !== 'لا يوجد' && v.labs !== 'لا توجد تحاليل' ? `🔬 *التحاليل والفحوصات:*
${v.labs}${hasLabs ? ` (مرفق ${v.labImages.length} صور تحاليل 📑)` : ''}` : ''}

🗓️ *موعد الإعادة والمتابعة:*
${v.followUpDate ? `${v.followUpDate} (بعد ${v.followUpDays || 0} أيام)` : 'حسب تحسن واستقرار الحالة'}
----------------------------------------
📞 *للتواصل وواتساب العيادة:* 01555345999
☎️ *الخط الأرضي:* 050 2383139
🚨 *طوارئ بيتي كير 24/7:* 01555345999

مع أطيب تمنياتنا لـ "${petName}" بالشفاء العاجل ودوام الصحة! 🐾❤️

----------------------------------------
🤖 *ملاحظة هامة:* هذه الرسالة مرسلة آلياً من نظام التقارير ولا يتم استقبال الردود على هذا الرقم.
📞 *للتواصل المباشر مع الطبيب أو الاستفسار عبر واتساب اضغط هنا:*
https://wa.me/${localStorage.getItem('peticare_doctor_forward_phone') || '201555345999'}`;
}

function initApp() {
    if (window._peticareAppInitialized) { console.log('ℹ️ Already initialized'); return; }
    window._peticareAppInitialized = true;
    console.log("🚀 Initializing PetiCare App...");



    // 0. Ensure data instance exists



    if (!window.petiCareData && typeof PetiCareData !== 'undefined') {



        window.petiCareData = new PetiCareData();



    }



    // 0.1 Check Authentication & Role / Client Portal Routing



    try { checkAuth(); } catch(e) { console.error('Auth error:', e); }



    // 1. Splash Screen



    try { initSplashScreen(); } catch(e) { console.error('Splash error:', e); }



    // 2. Setup Tabs



    try { initTabNavigation(); } catch(e) { console.error('TabNav error:', e); }



    // 3. Populate Patients Selector & Render Patient Cards



    try { refreshPatientsUI(); } catch(e) { console.error('Patients error:', e); }



    // 4. Setup Speech Recognition



    try { initVoiceRecognition(); } catch(e) { console.error('Voice error:', e); }



    // 5. Setup Image Uploaders



    try { initImageUploaders(); } catch(e) { console.error('Uploaders error:', e); }



    // 6. Setup Form Submissions



    try { initFormHandlers(); } catch(e) { console.error('Forms error:', e); }



    // 7. Setup Bottom Sheet & QR Modal



    try { initModalHandlers(); } catch(e) { console.error('Modals error:', e); }



    // 8. Setup WhatsApp Follow-up Radar



    try { initRadarModule(); } catch(e) { console.error('Radar error:', e); }



    // 9. Setup Clinic Store Module



    try { initStoreModule(); } catch(e) { console.error('Store error:', e); }



    // 10. Setup New Patient Voice & Phone Voice



    try { initPetiCareVoiceFillers(); initNewPatientVoice(); } catch(e) { console.error('NewPatientVoice error:', e); }



    // 11. Check Doctor Scan URL Parameter (?doctor_scan=PET-XXX)



    try { checkDoctorScanUrl(); } catch(e) { console.error('DoctorScan error:', e); }



}



// Immediate Execution on any state:



if (document.readyState === 'loading') {



    document.addEventListener('DOMContentLoaded', initApp);



} else {



    initApp();



}



/**



 * Splash Screen Handler



 */



function initSplashScreen() {



    const splash = document.getElementById('splashScreen');



    const appContainer = document.getElementById('appContainer');



    const loginOverlay = document.getElementById('loginScreenOverlay');



    const clientPortal = document.getElementById('clientPortalView');



    setTimeout(() => {



        if (splash) {



            splash.classList.add('splash-fade-out');



            setTimeout(() => {



                splash.style.display = 'none';



                if (clientPortal && clientPortal.style.display !== 'none') {



                    return;



                }



                const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



                if (!session || !session.username) {



                    if (loginOverlay) loginOverlay.style.display = 'flex';



                    if (appContainer) {



                        appContainer.style.display = 'none';



                        appContainer.classList.remove('app-visible');



                    }



                } else {



                    if (loginOverlay) loginOverlay.style.display = 'none';



                    if (appContainer) {



                        appContainer.style.display = 'flex';



                        appContainer.classList.add('app-visible');



                    }



                    applyRolePermissions(session);



                }



            }, 300);



        }



    }, 800);



}



/**



 * Tab Navigation (Bottom Navigation)



 */



let appNavHistory = ['section-visit'];



window.switchSection = function(targetSectionId, isBackNavigation = false) {



    if (!targetSectionId) return;
    if (targetSectionId === 'section-admin-dashboard') {
        if (!isUserAdmin()) {
            showToast('⚠️ لوحة الإدارة متاحة لحساب المدير العام فقط', 'warning');
            return;
        }
        if (window.renderAdminDailyDashboard) {
            window.renderAdminDailyDashboard();
        }
    }



    // سجل المرضى والرادار متاحين لأي حساب مسجل دخول (الأدمن + Doc1/2/3)، وأرقام الهواتف للأدمن فقط



    if ((targetSectionId === 'section-patients' || targetSectionId === 'section-radar') && !isStaffLoggedIn()) {



        showToast('⚠️ سجل الدخول أولاً', 'warning');



        return;



    }



    if (!isBackNavigation) {



        if (appNavHistory[appNavHistory.length - 1] !== targetSectionId) {



            appNavHistory.push(targetSectionId);



            if (appNavHistory.length > 20) appNavHistory.shift();



        }



    }



    const navItems = document.querySelectorAll('.bottom-nav-item');



    const sections = document.querySelectorAll('.app-section');



    navItems.forEach(nav => {



        if (nav.getAttribute('data-target') === targetSectionId) {



            nav.classList.add('active');



        } else {



            nav.classList.remove('active');



        }



    });



    sections.forEach(sec => {



        if (sec.id === targetSectionId) {



            sec.classList.add('active');



            sec.scrollTop = 0;



        } else {



            sec.classList.remove('active');



        }



    });



    // Stop active mic session when switching tabs to prevent cross-tab bleeding



    if (typeof stopVoiceRecognition === 'function') {



        stopVoiceRecognition(true);



    }



    // Re-bind all field-specific mic buttons on the new section



    if (typeof setupFieldSpecificMics === 'function') {



        setupFieldSpecificMics();



    }



    // If switching to visit section, refresh patient dropdown



    if (targetSectionId === 'section-visit') {



        currentSpeechContext = 'visit';



        populatePatientSelect();



    } else if (targetSectionId === 'section-new-patient') {



        currentSpeechContext = 'new_patient';



    } else if (targetSectionId === 'section-patients') {



        currentSpeechContext = 'visit';



        renderPatientsList();



    } else if (targetSectionId === 'section-radar') {



        currentSpeechContext = 'visit';



        if (typeof renderRadarCards === 'function') {



            renderRadarCards(window.currentRadarFilter || 'tomorrow');



        }



    } else if (targetSectionId === 'section-store') {



        currentSpeechContext = 'store';



        if (typeof renderProductsList === 'function') {



            renderProductsList();



        }



    }



};



window.handleAppBackPress = function() {



    // 0. Stop store voice recognizer if listening



    if (isStoreRecognizing && storeVoiceRecognizer) {



        try { storeVoiceRecognizer.stop(); } catch(e) {}



    }



    // 1. Edit Phone Modal



    const phoneModal = document.getElementById('editPhoneModal');



    if (phoneModal && phoneModal.style.display !== 'none') {



        closeEditPhoneModal();



        return true;



    }



    // 2. Patient Full Details Modal



    const patientModal = document.getElementById('patientDetailsModal');



    if (patientModal && patientModal.style.display !== 'none' && patientModal.style.display !== '') {



        closePatientDetailsModal();



        return true;



    }



    // 3. Batch Radar Modal



    const batchModal = document.getElementById('batchRadarModal');



    if (batchModal && batchModal.style.display !== 'none') {



        cancelBatchDispatch();



        return true;



    }



    // 4. Visit Summary Bottom Sheet



    const bottomSheet = document.getElementById('bottomSheetOverlay');



    if (bottomSheet && bottomSheet.classList.contains('open')) {



        closeBottomSheet();



        return true;



    }



    // 5. Navigate to previous screen in history



    if (appNavHistory.length > 1) {



        appNavHistory.pop(); // Remove current screen



        const prevSection = appNavHistory[appNavHistory.length - 1];



        window.switchSection(prevSection, true);



        return true;



    }



    // 6. Return to home tab if on another section



    const currentActiveSec = document.querySelector('.app-section.active');



    if (currentActiveSec && currentActiveSec.id !== 'section-visit') {



        window.switchSection('section-visit', true);



        return true;



    }



    // 7. At home screen with no modals open: double-back to exit cleanly



    return false;



};



function initTabNavigation() {



    const navItems = document.querySelectorAll('.bottom-nav-item');



    navItems.forEach(item => {



        item.addEventListener('click', (e) => {



            e.preventDefault();



            const targetSectionId = item.getAttribute('data-target');



            if (targetSectionId) {



                window.switchSection(targetSectionId);



            }



        });



    });



}



/**



 * Render & Populate Patients



 */



function refreshPatientsUI() {



    populatePatientSelect();



    renderPatientsList();



}



function populatePatientSelect() {



    const select = document.getElementById('visitPatientSelect');



    if (!select) return;



    const patients = window.petiCareData.getPatients();



    const currentVal = select.value;



    select.innerHTML = '<option value="">-- اختر المريض بالاسم أو رقم الملف --</option>';



    patients.forEach(p => {



        const opt = document.createElement('option');



        opt.value = p.id;



        opt.textContent = `${p.name} (${p.type}) - ملف: ${p.id} | المالك: ${p.ownerName}`;



        select.appendChild(opt);



    });



    if (currentVal && patients.some(p => p.id === currentVal)) {



        select.value = currentVal;



    }



    select.onchange = () => {



        const patientId = select.value;



        onPatientSelected(patientId);



    };



}







// ============================================================



// Chronic Condition Toggles (Closed by default)



// ============================================================



window.toggleNewPetChronicField = function(isChecked) {



    const box = document.getElementById('newPetChronicBox');



    const badge = document.getElementById('newPetChronicBadge');



    const textarea = document.getElementById('newPetChronicNotes');



    if (box) box.style.display = isChecked ? 'block' : 'none';



    if (badge) {



        if (isChecked) {



            badge.textContent = '🔓 مفتوحة (جاري التسجيل)';



            badge.style.background = 'rgba(239, 68, 68, 0.2)';



            badge.style.borderColor = '#ef4444';



            badge.style.color = '#fca5a5';



        } else {



            badge.textContent = '🔒 مقفولة (افتراضي)';



            badge.style.background = 'rgba(100, 116, 139, 0.3)';



            badge.style.borderColor = '#64748b';



            badge.style.color = '#94a3b8';



        }



    }



    if (isChecked && textarea) {



        textarea.focus();



    } else if (!isChecked && textarea) {



        textarea.value = '';



    }



};







window.toggleVisitChronicField = function(isChecked) {



    const box = document.getElementById('visitChronicBox');



    const badge = document.getElementById('visitChronicBadge');



    const textarea = document.getElementById('visitChronicNotes');



    if (box) box.style.display = isChecked ? 'block' : 'none';



    if (badge) {



        if (isChecked) {



            badge.textContent = '🔓 مفتوحة';



            badge.style.background = 'rgba(239, 68, 68, 0.2)';



            badge.style.borderColor = '#ef4444';



            badge.style.color = '#fca5a5';



        } else {



            badge.textContent = '🔒 مقفولة (افتراضي)';



            badge.style.background = 'rgba(100, 116, 139, 0.3)';



            badge.style.borderColor = '#64748b';



            badge.style.color = '#94a3b8';



        }



    }



    if (isChecked && textarea) {



        textarea.focus();



    } else if (!isChecked && textarea) {



        textarea.value = '';



    }



};







function onPatientSelected(patientId) {



    const card = document.getElementById('selectedPatientQuickCard');



    const chronicAlert = document.getElementById('patientChronicAlertBanner');



    const chronicAlertText = document.getElementById('chronicAlertText');



    if (!patientId) {



        currentSelectedPatient = null;



        if (card) card.style.display = 'none';



        if (chronicAlert) chronicAlert.style.display = 'none';



        return;



    }



    const patient = window.petiCareData.getPatientById(patientId);



    currentSelectedPatient = patient;



    // Show or hide Chronic Condition Alert Banner & Pre-fill visitChronicNotes



    const visitChronicField = document.getElementById('visitChronicNotes');



    const chkVisitChronic = document.getElementById('chkVisitHasChronic');



    const rawChronic = (patient && patient.chronicNotes) ? String(patient.chronicNotes).trim() : '';



    const isCorrupt = rawChronic.includes('اضغط') || rawChronic.includes('المايك') || rawChronic.includes('تحدث') || rawChronic === 'ضغط';



    const cleanChronic = isCorrupt ? '' : rawChronic;



    if (isCorrupt && patient) {



        patient.chronicNotes = '';



        if (window.petiCareData && window.petiCareData.updatePatient) {



            window.petiCareData.updatePatient(patient.id, { chronicNotes: '' });



        }



    }



    if (cleanChronic) {



        if (chkVisitChronic) chkVisitChronic.checked = true;



        if (window.toggleVisitChronicField) window.toggleVisitChronicField(true);



        if (visitChronicField) visitChronicField.value = cleanChronic;



        if (chronicAlert && chronicAlertText) {



            chronicAlertText.textContent = cleanChronic;



            chronicAlert.style.display = 'flex';



        }



    } else {



        if (chkVisitChronic) chkVisitChronic.checked = false;



        if (window.toggleVisitChronicField) window.toggleVisitChronicField(false);



        if (visitChronicField) visitChronicField.value = '';



        if (chronicAlert) chronicAlert.style.display = 'none';



    }



    const ownerPhotoSrc = uploadedImages.clientImage || (patient ? (patient.ownerPhoto || '') : '');



    if (card && patient) {



        card.style.display = 'block';



        card.innerHTML = `



            <div class="patient-pill-header" style="display: flex; justify-content: space-between; align-items: center;">



                <div>



                    <div>



                        <strong>🐾 ${patient.name}</strong> 



                        <span class="badge-tag">${patient.type}</span>



                        <span class="badge-id">#${patient.id}</span>



                    </div>



                    <div class="patient-owner-mini">



                        👤 ${patient.ownerName} &bull; 📱 ${getDisplayPhoneNumber(patient.phone)}



                        ${isUserAdmin() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="openEditPhoneModal('${patient.id}')" style="font-size:10px; padding:2px 7px; margin-right:6px; border-radius:6px; display:inline-flex; align-items:center;">✏️ تعديل الرقم</button>` : ''}
                        ${isUserAdmin() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="confirmDeleteCurrentPatient()" style="font-size:10px; padding:2px 7px; margin-right:6px; border-radius:6px; display:inline-flex; align-items:center; color:#f87171; border-color:#ef4444; background:rgba(239,68,68,0.15);">🗑️ حذف المريض</button>` : ''}



                    </div>



                </div>



                ${ownerPhotoSrc ? `



                    <div class="owner-avatar-preview" title="صورة العميل">



                        <img src="${ownerPhotoSrc}" alt="صورة العميل" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #10b981; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">



                    </div>



                ` : ''}



            </div>







            ${patient.visits && patient.visits.length > 0 ? `



                <div class="last-visit-notice">



                    <small>آخر زيارة: ${patient.visits[0].date} - ${patient.visits[0].diagnosis}</small>



                </div>



            ` : '<div class="last-visit-notice"><small>ملف جديد - لا توجد زيارات سابقة</small></div>'}



            ${patient.visits && patient.visits.length > 0 ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="showPatientHistory('${patient.id}')" style="margin-top:8px; font-size:12px;">📜 عرض سجل الزيارات السابقة (${patient.visits.length})</button>` : ''}



        `;



    }



}



function renderPatientsList() {



    if (!window.petiCareData) return;



    populatePatientSearchSelect();



    renderFilteredPatients(window.petiCareData.getPatients());



}



window.populatePatientSearchSelect = function() {



    const select = document.getElementById('patientSearchSelect');



    const countBadge = document.getElementById('patientsTotalCountBadge');



    if (!window.petiCareData) return;



    const patients = window.petiCareData.getPatients();



    if (countBadge) countBadge.textContent = `${patients.length} ملف`;



    if (!select) return;



    const currentVal = select.value;



    select.innerHTML = `<option value="">-- كل ملفات المرضى والعملاء (${patients.length}) --</option>`;



    patients.forEach(p => {



        const opt = document.createElement('option');



        opt.value = p.id;



        opt.textContent = `#${p.id} - ${p.name} (${p.ownerName} - ${getDisplayPhoneNumber(p.phone)})`;



        select.appendChild(opt);



    });



    if (currentVal && patients.some(p => p.id === currentVal)) {



        select.value = currentVal;



    }



};



window.filterPatientsBySelect = function(patientId) {



    const searchInput = document.getElementById('patientQuickSearchInput');



    const clearBtn = document.getElementById('btnClearPatientSearch');



    if (searchInput) searchInput.value = '';



    if (!patientId) {



        if (clearBtn) clearBtn.style.display = 'none';



        renderFilteredPatients(window.petiCareData.getPatients());



        return;



    }



    if (clearBtn) clearBtn.style.display = 'block';



    const patient = window.petiCareData.getPatientById(patientId);



    renderFilteredPatients(patient ? [patient] : []);



    // Smoothly scroll down to the card



    setTimeout(() => {



        const card = document.querySelector(`.patient-card-item[data-id="${patientId}"]`);



        if (card) {



            card.scrollIntoView({ behavior: 'smooth', block: 'center' });



            card.style.outline = '2px solid #34d399';



            card.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.4)';



            setTimeout(() => {



                card.style.outline = 'none';



                card.style.boxShadow = '';



            }, 2500);



        }



    }, 100);



};



window.filterPatientsByKeyword = function(rawKeyword) {



    const keyword = (rawKeyword || '').trim().toLowerCase();



    const select = document.getElementById('patientSearchSelect');



    const clearBtn = document.getElementById('btnClearPatientSearch');



    if (select) select.value = '';



    if (!keyword) {



        if (clearBtn) clearBtn.style.display = 'none';



        renderFilteredPatients(window.petiCareData.getPatients());



        return;



    }



    if (clearBtn) clearBtn.style.display = 'block';



    const normalize = (str) => {



        return (str || '').toLowerCase()



            .replace(/[أإآ]/g, 'ا')



            .replace(/[ة]/g, 'ه')



            .replace(/[ى]/g, 'ي')



            .replace(/[^a-zA-Z0-9ء-ي]/g, '');



    };



    const normKw = normalize(keyword);



    const all = window.petiCareData.getPatients();



    const filtered = all.filter(p => {



        const matchId = String(p.id).includes(keyword) || String(p.id).includes(normKw);



        const matchName = normalize(p.name).includes(normKw);



        const matchOwner = normalize(p.ownerName).includes(normKw);



        const matchPhone = isUserAdmin() && (p.phone || '').includes(keyword);



        const matchType = normalize(p.type).includes(normKw);



        return matchId || matchName || matchOwner || matchPhone || matchType;



    });



    renderFilteredPatients(filtered);



};



window.resetPatientsFilter = function() {



    const select = document.getElementById('patientSearchSelect');



    const searchInput = document.getElementById('patientQuickSearchInput');



    const clearBtn = document.getElementById('btnClearPatientSearch');



    if (select) select.value = '';



    if (searchInput) searchInput.value = '';



    if (clearBtn) clearBtn.style.display = 'none';



    renderFilteredPatients(window.petiCareData.getPatients());



};



window.executePatientSearch = function() {



    const input = document.getElementById('patientQuickSearchInput');



    const val = input ? input.value.trim() : '';



    if (!val) {



        showToast('يرجى كتابة رقم ملف المريض أو اسمه للبحث', 'warning');



        if (input) input.focus();



        return;



    }



    window.filterPatientsByKeyword(val);



    const all = window.petiCareData.getPatients();



    const cleanVal = val.replace(/[^0-9]/g, '');



    const exactById = cleanVal ? all.find(p => String(p.id) === String(cleanVal)) : null;



    if (exactById) {



        showToast(`🔍 تم العثور على ملف #${exactById.id} (${exactById.name}) بنجاح!`, 'success');



        setTimeout(() => {



            const card = document.querySelector(`.patient-card-item[data-id="${exactById.id}"]`);



            if (card) {



                card.scrollIntoView({ behavior: 'smooth', block: 'center' });



                card.style.outline = '2px solid #34d399';



                card.style.boxShadow = '0 0 24px rgba(52, 211, 153, 0.6)';



                setTimeout(() => {



                    card.style.outline = 'none';



                    card.style.boxShadow = '';



                }, 3000);



            }



        }, 100);



    }



};



window.quickSearchVisitPatient = function(val, isTriggered) {



    if (!window.petiCareData) return;



    const select = document.getElementById('visitPatientSelect');



    if (!select) return;



    const term = (val || '').trim();



    if (!term) return;



    const patients = window.petiCareData.getPatients();



    const cleanId = term.replace(/[^0-9]/g, '');



    // 1. First attempt exact ID match



    let match = cleanId ? patients.find(p => String(p.id) === String(cleanId)) : null;



    // 2. Second attempt name / phone / owner match



    if (!match) {



        const norm = term.toLowerCase();



        match = patients.find(p => 



            p.name.toLowerCase().includes(norm) || 



            (p.ownerName && p.ownerName.toLowerCase().includes(norm)) ||



            (isUserAdmin() && p.phone && p.phone.includes(term))



        );



    }



    if (match) {



        select.value = match.id;



        onPatientSelected(match.id);



        if (isTriggered) {



            showToast(`✅ تم اختيار ملف #${match.id}: (${match.name} - ${match.ownerName})`, 'success');



        }



    } else if (isTriggered) {



        showToast(`⚠️ لم يتم العثور على ملف برقم أو اسم: "${term}" في قاعدة البيانات`, 'warning');



    }



};



function renderFilteredPatients(patientsList) {



    const container = document.getElementById('patientsListContainer');



    if (!container) return;



    if (!patientsList || patientsList.length === 0) {



        container.innerHTML = `



            <div class="empty-state">



                <div class="empty-icon">🔍</div>



                <p>لا توجد نتائج مطابقة لبحثك</p>



                <button type="button" class="btn btn-outline-glass btn-sm" onclick="resetPatientsFilter()" style="margin-top: 10px;">



                    🔄 عرض كل ملفات المرضى



                </button>



            </div>



        `;



        return;



    }



    container.innerHTML = patientsList.map(p => {



        const visitCount = p.visits ? p.visits.length : 0;



        const lastVisit = visitCount > 0 ? p.visits[0] : null;



        return `



            <div class="glass-card patient-card-item" data-id="${p.id}">



                <div class="patient-card-top">



                    <div class="pet-avatar">



                        ${p.type.includes('قط') ? '🐱' : p.type.includes('كلب') ? '🐶' : '🐾'}



                    </div>



                    <div class="pet-info-main">



                        <div class="pet-title-row">



                            <h3 class="pet-name">${p.name}</h3>



                            <span class="patient-code">${p.id}</span>



                        </div>



                        <p class="pet-details">${p.type} ${p.weight ? '&bull; ' + p.weight : ''}</p>



                        <p class="owner-details">👤 المالك: ${p.ownerName} &bull; 📞 ${getDisplayPhoneNumber(p.phone)} ${p.ownerPhoto ? `<img src="${p.ownerPhoto}" alt="صورة العميل" class="thumb-img" style="width: 22px; height: 22px; border-radius: 50%; vertical-align: middle; margin-right: 6px; border: 1.5px solid #10b981; object-fit: cover;" onclick="openPhotoLightbox('${p.ownerPhoto}', 'صورة العميل (${p.ownerName})')">` : ''}</p>



                        <div class="patient-created-badge" style="font-size: 11px; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 4px;">



                            <span>📝</span>



                            <span>فتح الملف بواسطة: <strong style="color: #cbd5e1;">${escapeHtml(p.createdBy || 'طاقم العيادة')}</strong></span>



                        </div>



                    </div>



                </div>



                <div class="patient-card-body">



                    <div class="visit-stats">



                        <span>إجمالي الزيارات: <strong>${visitCount}</strong></span>



                        ${lastVisit ? `<span>آخر كشف: <strong>${lastVisit.date}</strong></span>` : '<span>ملف مسجل حديثاً</span>'}



                    </div>



                    ${lastVisit && lastVisit.followUpDate ? `



                        <div class="followup-badge">



                            🗓️ موعد الإعادة القادم: <strong>${lastVisit.followUpDate}</strong>



                        </div>



                    ` : ''}



                </div>



                <div class="patient-card-actions">



                    <button class="btn btn-outline-glass btn-sm" onclick="startVisitForPatient('${p.id}')">



                        🩺 كشف جديد



                    </button>



                    <button class="btn btn-outline-glass btn-sm" onclick="showPatientHistory('${p.id}')">



                        📜 سجل الزيارات (${visitCount})



                    </button>



                    ${isUserAdmin() ? `



                    <button class="btn btn-outline-glass btn-sm" onclick="openEditPhoneModal('${p.id}')">



                        ✏️ تعديل الرقم



                    </button>



                    ` : ''}
                    ${isUserAdmin() ? `
                    <button class="btn btn-outline-glass btn-sm" onclick="confirmDeletePatientById('${p.id}')" style="color:#f87171; border-color:#ef4444; background:rgba(239,68,68,0.15);">
                        🗑️ حذف المريض
                    </button>
                    ` : ''}



                    <button class="btn btn-primary-glass btn-sm" onclick="showPatientDetailsModal('${p.id}')">



                        📋 التفاصيل والباركود



                    </button>



                </div>



            </div>



        `;



    }).join('');



}



window.startVisitForPatient = function(patientId) {
    if (!patientId) return;
    const pIdStr = String(patientId);

    // 1. Immediately switch active section to section-visit
    if (typeof window.switchSection === 'function') {
        window.switchSection('section-visit');
    }
    document.querySelectorAll('.app-section').forEach(sec => {
        if (sec.id === 'section-visit') {
            sec.classList.add('active');
            sec.scrollTop = 0;
            void sec.offsetWidth; // Force reflow
        } else {
            sec.classList.remove('active');
        }
    });
    document.querySelectorAll('.bottom-nav-item').forEach(nav => {
        const match = nav.getAttribute('data-target') === 'section-visit' || nav.getAttribute('data-section') === 'section-visit';
        nav.classList.toggle('active', match);
        if (match) nav.setAttribute('aria-current', 'page');
        else nav.removeAttribute('aria-current');
    });

    // 2. Repopulate select options to include newly added patient
    if (typeof populatePatientSelect === 'function') {
        populatePatientSelect();
    }

    // 3. Preselect patient in dropdown & trigger card render
    const select = document.getElementById('visitPatientSelect');
    if (select) {
        select.value = pIdStr;
        if (typeof onPatientSelected === 'function') {
            onPatientSelected(pIdStr);
        }
    }

    // 4. Reset window scroll & focus diagnosis field reliably across mobile browsers
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
        if (select) {
            select.value = pIdStr;
            if (typeof onPatientSelected === 'function') {
                onPatientSelected(pIdStr);
            }
        }
        const diagInput = document.getElementById('visitDiagnosis');
        if (diagInput) {
            try { diagInput.focus({ preventScroll: false }); } catch (_) { diagInput.focus(); }
            if (typeof flashHighlightField === 'function') flashHighlightField(diagInput);
            setTimeout(() => {
                try { diagInput.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
            }, 100);
        }
    }, 80);
};

function startVisitForPatient(patientId) {
    return window.startVisitForPatient(patientId);
}



window.openEditPhoneModal = function(patientId) {



    if (!isUserAdmin()) {



        showToast('⚠️ تعديل أرقام الهواتف متاح لحساب الإدارة (د. شريف) فقط', 'warning');



        return;



    }



    if (!window.petiCareData) return;



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    const modal = document.getElementById('editPhoneModal');



    const idInput = document.getElementById('editPhonePatientId');



    const nameInput = document.getElementById('editOwnerNameInput');



    const phoneInput = document.getElementById('editOwnerPhoneInput');



    const subTitle = document.getElementById('editPhoneModalSub');



    if (idInput) idInput.value = patient.id;



    if (nameInput) nameInput.value = patient.ownerName || '';



    if (phoneInput) phoneInput.value = patient.phone || '';



    if (subTitle) subTitle.textContent = `تحديث بيانات المالك لملف الأليف (${patient.name} #${patient.id})`;



    if (modal) modal.style.display = 'flex';



};



window.closeEditPhoneModal = function() {



    const modal = document.getElementById('editPhoneModal');



    if (modal) modal.style.display = 'none';



};



window.saveEditedClientPhone = function() {



    const idInput = document.getElementById('editPhonePatientId');



    const nameInput = document.getElementById('editOwnerNameInput');



    const phoneInput = document.getElementById('editOwnerPhoneInput');



    if (!idInput || !idInput.value) return;



    const patientId = idInput.value;



    const newOwnerName = nameInput ? nameInput.value.trim() : '';



    let newPhone = phoneInput ? phoneInput.value.trim() : '';



    if (!newPhone) {



        showToast('يرجى كتابة رقم الهاتف / الواتساب', 'warning');



        return;



    }



    let cleanPhone = newPhone.replace(/[^0-9]/g, '');



    if (cleanPhone.startsWith('01')) {



        cleanPhone = '2' + cleanPhone;



    }



    const updated = window.petiCareData.updatePatient(patientId, {



        ownerName: newOwnerName,



        phone: cleanPhone



    });



    if (updated) {



        closeEditPhoneModal();



        showToast(`✅ تم تحديث رقم واتساب العميل بنجاح (${cleanPhone})!`, 'success');



        refreshPatientsUI();



        if (currentSelectedPatient && currentSelectedPatient.id === patientId) {



            onPatientSelected(patientId);



        }



        if (typeof updateRadarBadges === 'function') {



            updateRadarBadges();



            renderRadarCards(window.currentRadarFilter || 'tomorrow');



        }



        const patientModal = document.getElementById('patientDetailsModal');



        if (patientModal && patientModal.style.display !== 'none') {



            showPatientDetailsModal(patientId);



        }



    } else {



        showToast('تعذر حفظ التعديل', 'error');



    }



};



window.openEditChronicModal = function(patientId) {



    if (!isStaffLoggedIn()) {



        showToast('⚠️ سجل الدخول أولاً', 'warning');



        return;



    }



    if (!window.petiCareData) return;



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    const modal = document.getElementById('editChronicModal');



    const idInput = document.getElementById('editChronicPatientId');



    const notesInput = document.getElementById('editChronicNotesInput');



    const subTitle = document.getElementById('editChronicModalSub');



    if (idInput) idInput.value = patient.id;



    if (notesInput) notesInput.value = patient.chronicNotes || '';



    if (subTitle) subTitle.textContent = `تحديث الحالة المزمنة لملف الأليف (${patient.name} #${patient.id})`;



    if (modal) modal.style.display = 'flex';



};



window.closeEditChronicModal = function() {



    const modal = document.getElementById('editChronicModal');



    if (modal) modal.style.display = 'none';



};



window.saveEditedChronicNotes = function() {



    const idInput = document.getElementById('editChronicPatientId');



    const notesInput = document.getElementById('editChronicNotesInput');



    if (!idInput || !idInput.value) return;



    const patientId = idInput.value;



    const newChronicNotes = notesInput ? notesInput.value.trim() : '';



    const updated = window.petiCareData.updatePatient(patientId, {



        chronicNotes: newChronicNotes



    });



    if (updated) {



        closeEditChronicModal();



        showToast('✅ تم حفظ تعديل الحالة المزمنة بنجاح!', 'success');



        refreshPatientsUI();



        if (currentSelectedPatient && currentSelectedPatient.id === patientId) {



            onPatientSelected(patientId);



        }



        const patientModal = document.getElementById('patientDetailsModal');



        if (patientModal && patientModal.style.display !== 'none') {



            showPatientDetailsModal(patientId);



        }



    } else {



        showToast('تعذر حفظ التعديل', 'error');



    }



};



function checkDoctorScanUrl() {



    const urlParams = new URLSearchParams(window.location.search);



    const doctorScanId = urlParams.get('doctor_scan');



    if (doctorScanId) {



        setTimeout(() => {



            handleDoctorScanDirect(doctorScanId);



        }, 400);



    }



}



window.handleDoctorScanDirect = function(patientId) {



    if (!window.petiCareData) return;



    const cleanId = String(patientId).replace(/[^0-9]/g, '');



    const patient = window.petiCareData.getPatientById(cleanId) || window.petiCareData.getPatientById(patientId);



    if (!patient) {



        showToast('⚠️ لم يتم العثور على ملف المريض المطلوب مسحه', 'warning');



        return;



    }



    // Switch to visit section



    if (window.switchSection) {



        window.switchSection('section-visit');



    }



    const navVisit = document.querySelector('.bottom-nav-item[data-target="section-visit"]');



    if (navVisit) navVisit.click();



    setTimeout(() => {



        const select = document.getElementById('visitPatientSelect');



        if (select) {



            select.value = patient.id;



            onPatientSelected(patient.id);



            select.scrollIntoView({ behavior: 'smooth' });



        }



        showToast(`🩺 تم مسح باركود الطبيب وفتح ملف (${patient.name}) لتسجيل الزيارة فوراً!`, 'success');



    }, 200);



};



/**



 * Speech Recognition Engine & Natural Arabic Parsing



 */



let activeFieldMicTarget = null;



let currentSpeechContext = 'visit'; // 'visit' | 'new_patient' | 'new_owner_phone'



/**



 * Universal Medical Text Dissector for PetiCare



 * Guaranteed separation of Diagnosis, Treatment, and Dosage regardless of dictation style.



 * Resolves cases where doctor omits the keyword "العلاج" or speaks medication inside diagnosis.



 */



function intelligentDissectMedicalText(rawText) {



    if (!rawText) return { diag: '', treat: '', dosage: '', followText: '' };



    let text = rawText.trim();



    // Clean leading/trailing punctuation and quotation marks



    text = text.replace(/^[:\-،,\s]+/, '').replace(/[:\-،,\s]+$/, '');



    // 1. If text has linebreaks, check if line 2 onwards is treatment/dosage



    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);



    if (lines.length > 1) {



        const line1 = lines[0];



        const remaining = lines.slice(1).join(' ').trim();



        const remDissect = intelligentDissectMedicalText(remaining);



        if (remDissect.treat || remDissect.dosage) {



            return {



                diag: line1,



                treat: remDissect.treat || remaining,



                dosage: remDissect.dosage || '',



                followText: remDissect.followText || ''



            };



        }



    }



    // Comprehensive list of Egyptian/Veterinary Medication Brand Names



    const knownDrugs = [



        'ايبكوجيل', 'ابيكوجيل', 'ايبيكوجيل', 'ابكوجيل', 'موتيليوم', 'فلاجيل', 'امريزول', 'انتينال', 'دايافورم', 



        'ستربتوكين', 'كابتين', 'ديسفلاتيل', 'دانست', 'زوفران', 'جاستروبرازول', 'كونترولوك', 'انتودين', 'زنتاك', 'رانيتيدين', 'اوميبرازول',



        'اوجمانتين', 'هاي بيوتك', 'كلافوكس', 'ميجاموكس', 'اموكسيل', 'اموكسيسيلين', 'امبيسيلين', 'يوناسين', 'يونيكتام',



        'سيفوتاكس', 'سيفازولين', 'سيفيبيم', 'سيفودوكس', 'سفترياكسون', 'سيفوتاكسيم', 'سيفالكسين',



        'لينكوميسين', 'جنتامايسين', 'تيراميسين', 'دوكسي سيكلين', 'مترونيدازول', 'ستومورجيز', 'سبيراميسين',



        'ديكساميثازون', 'ديكسا', 'بيتافوس', 'فينادون', 'ابيدون', 'بريدسول', 'بريدنيزولون',



        'كيتوفان', 'كيتوبروفين', 'ميبروكين', 'كتافلام', 'فولتارين', 'بانادول', 'باراسيتامول',



        'كلوتريمازول', 'درماتين', 'ميكونازول', 'داكتارين', 'نيستاتين', 'كانستين', 'لاميزيل', 'تيربينافين',



        'بانثينول', 'بيتادين', 'فيوسيدين', 'فيوسيكورت', 'كيناكومب', 'بوليديرم',



        'درونتال', 'ريفوليوشن', 'فرونت لاين', 'ادفوكيت', 'برافيكتو', 'براvecto', 'بروديفندر', 'بارس', 'سترونجهولد', 'افوماك', 'ايفرمكتين',



        'رينجر', 'جلوكوز', 'محلول ملح', 'كافوزال', 'نيوروتون', 'بيكومبلكس', 'كالسيوم'



    ];



    // Medication forms & categories



    const medForms = [



        'امبولات', 'أمبولات', 'امبول', 'أمبول', 'حقنة', 'حقنه', 'حقن', 'حبوب', 'حبة', 'حباية', 



        'اقراص', 'أقراص', 'قرص', 'كبسولات', 'كبسول', 'كبسولة', 'كبسوله', 



        'مرهم', 'كريم', 'لوشن', 'دهان', 'جيل', 'جل', 'سبراي', 'بخاخ', 



        'شراب', 'شرب', 'نقط', 'قطرة', 'قطره', 'شامبو', 'بودرة', 'بودره', 



        'معجون', 'محلول', 'لبوس', 'مضاد حيوي', 'مضاد', 'مطهر', 'مسكن', 'خافض حرارة', 'خافض'



    ];



    // Spoken transitional medication phrases



    const transitionWords = [



        'العلاج المقرر', 'العلاج هو', 'العلاج هي', 'العلاج بتاعه', 'العلاج بتاعها', 'العلاج', 'علاج',



        'وعلاجه', 'وعلاجها', 'علاجه', 'علاجها', 'والعلاج', 'وعلاج',



        'الروشتة', 'الروشته', 'والروشتة', 'والروشته', 'روشتة', 'روشته',



        'الادوية', 'الأدوية', 'والادوية', 'والأدوية', 'ادوية', 'أدوية',



        'هنكتبله', 'هنكتبلها', 'نكتبله', 'نكتبلها',



        'هياخد علاج', 'هتاخد علاج', 'ياخد علاج', 'تاخد علاج',



        'هياخد', 'هتاخد', 'ياخد', 'تاخد', 'ياخذ', 'تاخذ',



        'يمشي على', 'تمشي على', 'هيمشي على', 'هتمشي على',



        'نديله', 'نديها', 'هنديله', 'هنديها', 'يتحطله', 'يتحطلها'



    ];



    // Anatomical location markers in Arabic diagnoses



    const anatomicalEndings = [



        'في المعدة', 'في المعده', 'في البطن', 'في الأمعاء', 'في الامعاء', 'في القولون',



        'في الأذن', 'في الاذن', 'في العين', 'في الجلد', 'في الصدر', 'في الرئة', 'في الرئه',



        'في الساق', 'في الرجل', 'في المفصل', 'في العظام', 'في الحلق', 'في الفم', 'في الأسنان', 'في الاسنان',



        'في مجرى البول', 'في البول', 'في الدم'



    ];



    // Dosage / frequency regex



    const dosageRegex = /(?:(?:ثلاث|اربع|خمس|3|4|5|مرتين|مرة|جرعة|جرعتين)\s*(?:مرات|مرة)?\s*(?:في اليوم|يوميا|كل يوم|صباحا|مساء)?|(?:مرتين|مرة واحدة|مرة)\s*(?:يوميا|في اليوم|كل يوم)|(?:يوميا|كل يوم|صباحا ومساء|صبح وليل|قبل الاكل|بعد الاكل|كل\s*\d+\s*ساعة)|(?:كل\s*(?:اسبوع|شهر|يوم))|(?:امبول|قرص|كبسولة|شرب|نقط|بخاخ|دهان|مرهم|حقنة)\s+(?:كل|يوميا|صباحا|مرتين|مرة|يوم))/i;



    // Follow-up phrase regex



    const followRegex = /(?:(?:وال?اعادة|وال?اعاده|وال?متابعة|وال?متابعه|وال?استشارة|وال?استشاره)\s*(?:بعد\s*)?(?:كل\s*)?(?:شهر(?:ين)?|اسبوع(?:ين)?|\d+\s*ايام?|\d+\s*يوم|يوم(?:ين)?))/i;



    let splitIndex = -1;



    // Priority 1: Spoken transition words



    for (const tw of transitionWords) {



        const regex = new RegExp('(?:^|\\s+)(' + tw + ')(?:\\s+|[:\\-،,]|$)', 'i');



        const m = text.match(regex);



        if (m && m.index !== undefined && m.index > 0) {



            splitIndex = m.index;



            break;



        }



    }



    // Priority 2: Known drug names



    if (splitIndex === -1) {



        for (const drug of knownDrugs) {



            const regex = new RegExp('(?:^|\\s+)(' + drug + ')(?:\\s+|[:\\-،,]|$)', 'i');



            const m = text.match(regex);



            if (m && m.index !== undefined && m.index > 0) {



                splitIndex = m.index;



                break;



            }



        }



    }



    // Priority 3: Medication forms



    if (splitIndex === -1) {



        for (const mf of medForms) {



            const regex = new RegExp('(?:^|\\s+)(' + mf + ')(?:\\s+|[:\\-،,]|$)', 'i');



            const m = text.match(regex);



            if (m && m.index !== undefined && m.index > 0) {



                splitIndex = m.index;



                break;



            }



        }



    }



    // Priority 4: Anatomical ending followed by extra words



    if (splitIndex === -1) {



        for (const anat of anatomicalEndings) {



            const regex = new RegExp('(' + anat + ')(?:\\s+)', 'i');



            const m = text.match(regex);



            if (m && m.index !== undefined) {



                const afterIdx = m.index + m[0].length;



                if (afterIdx < text.length) {



                    splitIndex = afterIdx;



                    break;



                }



            }



        }



    }



    // Priority 5: Dosage pattern inside text (split before medication preceding the dosage)



    if (splitIndex === -1) {



        const dMatch = text.match(dosageRegex);



        if (dMatch && dMatch.index !== undefined && dMatch.index > 0) {



            const beforeDosage = text.substring(0, dMatch.index).trim();



            const words = beforeDosage.split(/\s+/);



            if (words.length > 2) {



                const drugCandidate = words.slice(-1).join(' ');



                splitIndex = beforeDosage.lastIndexOf(drugCandidate);



            } else if (words.length > 1) {



                splitIndex = dMatch.index;



            }



        }



    }



    let diagPart = text;



    let restPart = '';



    if (splitIndex > 0) {



        diagPart = text.substring(0, splitIndex).trim();



        restPart = text.substring(splitIndex).trim();



        // Clean leading transition words from restPart



        restPart = restPart.replace(/^(?:العلاج\s*(?:المقرر|هو|هي|بتاعه|بتاعها|هيكون|هيبقى)?|وعلاجه|وعلاجها|علاجه|علاجها|والعلاج|وعلاج|علاج|الروشت[ةه]|والروشت[ةه]|روشت[ةه]|الادوي[ةه]|الأدوي[ةه]|ادوي[ةه]|أدوي[ةه]|هنكتبل[هه]ا?|ه?ياخ[دذ]\s*علاج|ه?تاخ[دذ]\s*علاج|ه?ياخ[دذ]|ه?تاخ[دذ]|يمشي على|نديل[هه]ا?)\s*[:\-،,\s]*/i, '').trim();



    }



    let treatPart = restPart;



    let dosagePart = '';



    let followPart = '';



    if (restPart) {



        // Extract follow-up if present in restPart



        const fMatch = restPart.match(followRegex);



        if (fMatch && fMatch.index !== undefined) {



            followPart = fMatch[0].trim();



            treatPart = restPart.substring(0, fMatch.index).trim();



        }



        // Extract dosage if present in treatPart



        const dMatch = treatPart.match(dosageRegex);



        if (dMatch && dMatch.index !== undefined) {



            dosagePart = treatPart.substring(dMatch.index).trim();



            treatPart = treatPart.substring(0, dMatch.index).trim();



            dosagePart = dosagePart.replace(/^(?:ال?قرع[ةه]|ال?جرع[ةه]|الجرعات|طريقة الاستخدام|طريقة الاستعمال|ه?ياخ[دذ]|ه?تاخ[دذ])\s*[:\-،,\s]*/i, '').trim();



        }



    }



    diagPart = diagPart.replace(/[:\-،,\s]+$/, '').trim();



    treatPart = treatPart.replace(/[:\-،,\s]+$/, '').trim();



    dosagePart = dosagePart.replace(/[:\-،,\s]+$/, '').trim();



    return {



        diag: diagPart,



        treat: treatPart,



        dosage: dosagePart,



        followText: followPart



    };



}



/**



 * Sequential Voice Parsing for New Patient Registration



 * Order: (الاسم ⬅️ النوع ⬅️ الوزن ⬅️ اسم العميل ⬅️ حالة مزمنة لو متاحة)



 * Stops immediately when doctor utters "تمام"



 */



/**



 * Sequential Voice Parsing for New Patient Registration



 * Order: (الاسم ⬅️ النوع ⬅️ الوزن ⬅️ اسم العميل ⬅️ حالة مزمنة إن وجدت)



 * Stops immediately when doctor utters "تمام"



 */



function parseNewPatientSpeech(spokenText) {



    if (!spokenText) return { name: '', type: '', weight: '', ownerName: '', chronicNotes: '' };



    let text = spokenText.trim();



    // Normalize Arabic digits



    text = text.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632);



    // Remove stop commands



    text = text.replace(/(?:^|\s+)(?:تمام\s*كد[ةه]|تمام|خلاص\s*تمام|خلاص|تم)\s*[.!،؟:]*$/i, '').trim();



    let name = '';



    let type = '';



    let weight = '';



    let ownerName = '';



    let chronicNotes = '';



    const knownTypes = [



        'قطة شيرازي', 'قط شيرازي', 'قطة سيامي', 'قط سيامي', 'قطة بيرشن', 'قط بيرشن',



        'قطة رومي', 'قط رومي', 'قطة بلدي', 'قط بلدي', 'قطة هيمالايا', 'قط هيمالايا',



        'قطة سكوتش', 'قط سكوتش', 'قطة بريطاني', 'قط بريطاني', 'قطة', 'قط', 'قطط',



        'كلب جيرمن', 'كلبة جيرمن', 'كلب بيتبول', 'كلبة بيتبول', 'كلب جولدن', 'كلبة جولدن',



        'كلب هاسكي', 'كلبة هاسكي', 'كلب دوبرمان', 'كلبة دوبرمان', 'كلب لابرادور', 'كلبة لابرادور',



        'كلب روت وايلر', 'كلبة روت وايلر', 'كلب بوكسر', 'كلب مالينو', 'كلب كاني كورسو',



        'كلب شيواوا', 'كلب تشيهواهوا', 'كلب جريت دان', 'كلب بلدي', 'كلب جريفون', 'كلب جريفون فوكس',



        'كلب', 'كلبة', 'كلاب',



        'ببغاء درة', 'ببغاء كاسكو', 'ببغاء مكاو', 'ببغاء كوكاتيل', 'ببغاء كوكوتيل', 'ببغاء',



        'عصفور استرالي', 'عصفور كناري', 'عصفور زيبرا', 'عصفور', 'طائر', 'حمام', 'يمام',



        'هامستر روسي', 'هامستر سوري', 'هامستر',



        'أرنب هولندي', 'ارنب هولندي', 'أرنب بلدي', 'ارنب بلدي', 'أرنب', 'ارنب',



        'سلحفاة برية', 'سلحفاة مائية', 'سلحفاة', 'سنجاب', 'قرد', 'مهر', 'حصان', 'خيل'



    ];



    // 1. Chronic notes extraction (Only explicit chronic diseases or warnings - NEVER triggers on lone 'ضغط' or acute symptoms)



    const chronicKw = /(?:حالة\s*مزمنة|مرض\s*مزمن|تنبيه\s*طبي|مرض\s*(?:السكر|الضغط|الصرع|القلب)|ضغط\s*الدم|حساسية\s*(?:من|ضد)|فشل\s*كلوي)\s*[:=]?\s*/i;



    const cMatch = text.match(chronicKw);



    if (cMatch && cMatch.index !== undefined) {



        chronicNotes = text.substring(cMatch.index).trim();



        text = text.substring(0, cMatch.index).trim();



        chronicNotes = chronicNotes.replace(/^(?:حالة\s*مزمنة|مرض\s*مزمن|تنبيه\s*طبي)\s*[:=]?\s*/i, '').trim();



    }



    // 2. Weight extraction (supports decimals, fractions, word numbers)



    const weightRegex = /(?:(?:الوزن\s*التقريبي|الوزن|وزنه|وزنها)\s*[:=]?\s*)?(\b(?:\d+(?:[\.,]\d+)?\s*(?:كيلو\s*و\s*نص|كيلو\s*ونص|كيلوجرام|كيلو|كجم|جرام|غم|ك|kg)?|(?:نص|نصف|ربع|واحد|اثنين|اتنين|تلاتة|ثلاثة|اربعة|أربعة|خمسة|خمسه|ستة|سته|سبعة|سبعه|تمانية|ثمانية|تسعة|تسعه|عشرة|عشره|كيلوين|كيلو)\s*(?:كيلو\s*و\s*نص|كيلو\s*ونص|كيلوجرام|كيلو|كجم|جرام|غم|ك|kg))\b)/i;



    const wMatch = text.match(weightRegex);



    if (wMatch && wMatch.index !== undefined) {



        weight = wMatch[1].trim();



        text = (text.substring(0, wMatch.index) + ' ' + text.substring(wMatch.index + wMatch[0].length)).replace(/\s+/g, ' ').trim();



    }



    if (weight) {



        weight = weight.replace(/\bواحد\b/g, '1')



                       .replace(/\bاثنين\b|\bاتنين\b/g, '2')



                       .replace(/\bتلاتة\b|\bثلاثة\b/g, '3')



                       .replace(/\bاربعة\b|\bأربعة\b/g, '4')



                       .replace(/\bخمسة\b|\bخمسه\b/g, '5')



                       .replace(/\bستة\b|\bسته\b/g, '6')



                       .replace(/\bسبعة\b|\bسبعه\b/g, '7')



                       .replace(/\bتمانية\b|\bثمانية\b/g, '8')



                       .replace(/\bتسعة\b|\bتسعه\b/g, '9')



                       .replace(/\bعشرة\b|\bعشره\b/g, '10');



        if (!/(?:كيلو|كجم|جرام|kg)/i.test(weight)) {



            weight += ' كجم';



        }



    }



    // 3. Owner name extraction (longest keyword patterns first)



    const ownerRegex = /(?:اسم\s*العميل|اسم\s*المالك|صاحبته|صاحبها|صاحبه|العميل|المالك)\s*[:=]?\s*([^\s,]+(?:\s+[^\s,]+){0,2})/i;



    const oMatch = text.match(ownerRegex);



    if (oMatch && oMatch.index !== undefined) {



        ownerName = oMatch[1].trim();



        text = (text.substring(0, oMatch.index) + ' ' + text.substring(oMatch.index + oMatch[0].length)).replace(/\s+/g, ' ').trim();



    }



    // 4. Type / Species extraction (longest match from knownTypes)



    const sortedTypes = [...knownTypes].sort((a, b) => b.length - a.length);



    for (const kt of sortedTypes) {



        const idx = text.indexOf(kt);



        if (idx !== -1) {



            type = kt;



            text = (text.substring(0, idx) + ' ' + text.substring(idx + kt.length)).replace(/\s+/g, ' ').trim();



            break;



        }



    }



    if (!type) {



        const typeRegex = /(?:النوع\s*والفصيلة|النوع|الفصيلة|نوعها|نوعه)\s*[:=]?\s*([^\s,]+(?:\s+[^\s,]+)?)/i;



        const tMatch = text.match(typeRegex);



        if (tMatch && tMatch.index !== undefined) {



            type = tMatch[1].trim();



            text = (text.substring(0, tMatch.index) + ' ' + text.substring(tMatch.index + tMatch[0].length)).replace(/\s+/g, ' ').trim();



        }



    }



    // 5. Name extraction



    const nameRegex = /(?:اسم\s*الحيوان|اسم\s*الأليف|الاسم|اسمها|اسمه)\s*[:=]?\s*([^\s,]+)/i;



    const nMatch = text.match(nameRegex);



    if (nMatch && nMatch.index !== undefined) {



        name = nMatch[1].trim();



        text = (text.substring(0, nMatch.index) + ' ' + text.substring(nMatch.index + nMatch[0].length)).replace(/\s+/g, ' ').trim();



    }



    // 6. Remaining natural word tokens fallback



    const skipTokens = new Set(['الوزن', 'وزنه', 'وزنها', 'الاسم', 'اسمه', 'اسمها', 'نوعه', 'نوعها', 'النوع', 'العميل', 'صاحبه', 'صاحبها', 'صاحبته', 'المالك']);



    let remaining = text.split(/\s+/).filter(w => w && !skipTokens.has(w));



    if (remaining.length > 0) {



        if (!name) {



            name = remaining[0];



            remaining = remaining.slice(1);



        }



        if (!type && remaining.length > 0) {



            type = remaining[0];



            remaining = remaining.slice(1);



        }



        if (!ownerName && remaining.length > 0) {



            ownerName = remaining.join(' ');



        }



    }



    return { name, type, weight, ownerName, chronicNotes };



}



/**



 * Convert spoken phone numbers in Arabic/digits to clean string



 */



function extractPhoneNumberFromSpeech(spokenText) {



    if (!spokenText) return '';



    let text = spokenText.trim();



    const stopCommandRegex = /(?:^|\s+)(تمام\s*كد[ةه]|تمام|خلاص\s*تمام|خلاص|تم)\s*[:.!،؟]*$/i;



    text = text.replace(stopCommandRegex, '').trim();



    const arabicWordsToDigits = {



        'صفر': '0', 'زيرو': '0',



        'واحد': '1', 'احد': '1',



        'اثنين': '2', 'اتنين': '2',



        'ثلاثة': '3', 'تلاتة': '3', 'تلاته': '3',



        'اربعة': '4', 'أربعة': '4', 'اربعه': '4', 'أربعه': '4',



        'خمسة': '5', 'خمسه': '5',



        'ستة': '6', 'سته': '6',



        'سبعة': '7', 'سبعه': '7',



        'ثمانية': '8', 'تمانية': '8', 'تمانيه': '8',



        'تسعة': '9', 'تسعه': '9'



    };



    for (const [w, d] of Object.entries(arabicWordsToDigits)) {



        const re = new RegExp('\\b' + w + '\\b', 'g');



        text = text.replace(re, d);



    }



    text = text.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632);



    const digitsOnly = text.replace(/[^0-9]/g, '');



    const phoneMatch = digitsOnly.match(/(01[0125][0-9]{8}|201[0125][0-9]{8}|[0-9]{10,12})/);



    if (phoneMatch) {



        return phoneMatch[0];



    }



    return digitsOnly;



}



// =========================================================================



// SECTION 3 & 4: ADVANCED RESILIENT VOICE ENGINE & ANDROID BRIDGE INTEGRATION



// =========================================================================



// ===== voice-core: يستبدل الأقسام 3 و4 في doctor.js =====



const FATAL_WEB = ['not-allowed', 'service-not-allowed', 'audio-capture'];



const MIC_MSG = {



  'not-allowed': 'صلاحية الميكروفون مرفوضة، فعّلها من الإعدادات',



  'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة',



  'audio-capture': 'لا يوجد ميكروفون متاح'



};



const IS_ANDROID_BRIDGE = typeof window.AndroidSpeech !== 'undefined';



let wantListening = false;      // نية المستخدم



let restartTimer = null;



let failCount = 0;



let watchdog = null;



let switching = false;



// UI Cooldown & Transition State Flags



let isNewPatientMicBusy = false;



let newPatientMicCooldownTimer = null;



let isPhoneMicBusy = false;



let phoneMicCooldownTimer = null;



// ---------- حالة الزر والواجهة ----------



function setMicState(state) { // idle | preparing | listening | error



  if (document.body.dataset.micState === state) return;   // لا تعيد الرسم



  document.body.dataset.micState = state;



  const s = document.getElementById('voiceStatusIndicator');



  const btnMic = document.getElementById('btnStartVoice');



  const btnNewPatient = document.getElementById('btnStartNewPatientVoice');



  const btnPhone = document.getElementById('btnMicNewOwnerPhone');



  const waveMeter = document.getElementById('audioWaveMeter');



  if (s) {



    s.textContent = state === 'listening' ? '🎙️ يستمع...' :



                    state === 'preparing' ? '⏳ جاري التحضير...' :



                    state === 'idle' ? '' : s.textContent;



    s.className = state === 'listening' ? 'status-listening' :



                  state === 'error' ? 'status-warning' : 'status-idle';



  }



  if (state === 'listening') {



    if (currentSpeechContext === 'new_patient' && btnNewPatient) {



      btnNewPatient.classList.add('listening-pulse');



      btnNewPatient.innerHTML = '⏹️';



      const npStatus = document.getElementById('newPatientVoiceStatus');



      if (npStatus) {



        npStatus.textContent = '🎙️ يستمع للملف الجديد... اختم بكلمة "تمام"';



        npStatus.className = 'status-listening';



      }



    } else if (currentSpeechContext === 'new_owner_phone' && btnPhone) {



      btnPhone.classList.add('listening-pulse');



      btnPhone.innerHTML = '⏹️ يستمع للرقم...';



      const npStatus = document.getElementById('newPatientVoiceStatus');



      if (npStatus) {



        npStatus.textContent = '🎙️ يستمع لأرقام الواتساب... اختم بـ "تمام"';



        npStatus.className = 'status-listening';



      }



    } else if (activeFieldMicTarget) {



      const activeBtn = document.querySelector(`.btn-field-mic[data-target="${activeFieldMicTarget}"]`);



      if (activeBtn) {



        activeBtn.classList.add('listening');



        activeBtn.textContent = '🔴 جاري الإملاء...';



      }



    } else if (currentSpeechContext === 'store' && !activeFieldMicTarget) {



      const btnStore = document.getElementById('btnStoreVoice');



      const storeIcon = document.getElementById('storeMicIcon');



      const storeLabel = document.getElementById('storeMicLabel');



      const storeStatus = document.getElementById('storeVoiceStatus');



      if (btnStore) btnStore.classList.add('listening-pulse');



      if (storeIcon) storeIcon.textContent = '⏹️';



      if (storeLabel) storeLabel.textContent = '⏹️ إيقاف التسجيل (أو قل "تمام")';



      if (storeStatus) {



        storeStatus.textContent = '🎙️ يستمع للصنف الشامل... انطق: الصنف - السعر - القسم (اختم بـ "تمام")';



        storeStatus.className = 'store-voice-status listening';



      }



    } else if (btnMic) {



      btnMic.classList.add('listening-pulse');



      btnMic.innerHTML = '⏹️';



    }



    if (waveMeter) waveMeter.style.display = 'flex';



  } else {



    if (btnMic) {



      btnMic.classList.remove('listening-pulse');



      btnMic.innerHTML = '🎙️';



    }



    if (btnNewPatient) {



      btnNewPatient.classList.remove('listening-pulse');



      btnNewPatient.innerHTML = '🎙️';



    }



    if (btnPhone) {



      btnPhone.classList.remove('listening-pulse');



      btnPhone.innerHTML = '🎙️ إملاء الرقم';



    }



    const btnStore = document.getElementById('btnStoreVoice');



    const storeIcon = document.getElementById('storeMicIcon');



    const storeLabel = document.getElementById('storeMicLabel');



    const storeStatus = document.getElementById('storeVoiceStatus');



    if (btnStore) btnStore.classList.remove('listening-pulse');



    if (storeIcon) storeIcon.textContent = '🎙️';



    if (storeLabel) storeLabel.textContent = 'اضغط لبدء تسجيل الصنف';



    if (storeStatus && !storeStatus.textContent.startsWith('✅') && !storeStatus.textContent.startsWith('⚠️')) {



      storeStatus.textContent = '⏹️ مايك المتجر في وضع الاستعداد';



      storeStatus.className = 'store-voice-status';



    }



    if (waveMeter) waveMeter.style.display = 'none';



  }



}



function showMicError(msg) {



  setMicState('error');



  const s = document.getElementById('voiceStatusIndicator');



  if (s) s.textContent = '⚠️ ' + msg;



}



function unlockNewPatientMic() {



  if (newPatientMicCooldownTimer) {



    clearTimeout(newPatientMicCooldownTimer);



    newPatientMicCooldownTimer = null;



  }



  isNewPatientMicBusy = false;



  const btn = document.getElementById('btnStartNewPatientVoice');



  if (btn) {



    btn.disabled = false;



    btn.classList.remove('mic-cooldown');



    btn.style.pointerEvents = '';



  }



}



function unlockPhoneMic() {



  if (phoneMicCooldownTimer) {



    clearTimeout(phoneMicCooldownTimer);



    phoneMicCooldownTimer = null;



  }



  isPhoneMicBusy = false;



  const btn = document.getElementById('btnMicNewOwnerPhone');



  if (btn) {



    btn.disabled = false;



    btn.classList.remove('mic-cooldown');



    btn.style.pointerEvents = '';



  }



}



function resetNewPatientMicBtn() {



  const btn = document.getElementById('btnStartNewPatientVoice');



  if (btn) {



    btn.classList.remove('listening-pulse');



    btn.innerHTML = '🎙️';



    btn.title = 'اضغط لبدء إملاء بيانات الملف الجديد';



  }



}



function resetPhoneMicBtn() {



  const btn = document.getElementById('btnMicNewOwnerPhone');



  if (btn) {



    btn.classList.remove('listening-pulse');



    btn.innerHTML = '🎙️ إملاء الرقم';



  }



}



function resetFieldMicButtons() {



  const fieldMics = document.querySelectorAll('.btn-field-mic');



  fieldMics.forEach(btn => {



    btn.classList.remove('listening');



    btn.classList.remove('listening-pulse');



    if (btn.id === 'btnMicNewOwnerPhone') {



      btn.innerHTML = '🎙️ إملاء الرقم';



      return;



    }



    const targetId = btn.getAttribute('data-target');



    btn.textContent = targetId === 'visitDiagnosis' ? '🎙️ إملاء للتشخيص' :



                      targetId === 'visitTreatment' ? '🎙️ إملاء للعلاج' :



                      targetId === 'visitDosage' ? '🎙️ إملاء للجرعة' :



                      targetId === 'visitLabs' ? '🎙️ إملاء للتحاليل' :



                      targetId === 'visitFollowDays' ? '🎙️ إملاء' :



                      targetId === 'visitChronicNotes' ? '🎙️ إملاء الملاحظات' :



                      targetId === 'newPetName' ? '🎙️ إملاء الاسم' :



                      targetId === 'newPetType' ? '🎙️ إملاء النوع' :



                      targetId === 'newPetWeight' ? '🎙️ إملاء الوزن' :



                      targetId === 'newOwnerName' ? '🎙️ إملاء الاسم' :



                      targetId === 'newPetChronicNotes' ? '🎙️ إملاء الملاحظات' :



                      targetId === 'editChronicNotesInput' ? '🎙️ إملاء' :



                      targetId === 'productName' ? '🎙️ إملاء الاسم' :



                      targetId === 'productPrice' ? '🎙️ إملاء السعر' :



                      targetId === 'productCategory' ? '🎙️ إملاء القسم' :



                      targetId === 'visitSearchPatientInput' ? '🎙️ إملاء' : '🎙️ إملاء';



  });



}



function finishSession() {



  wantListening = false;



  isRecognizing = false;



  clearTimeout(restartTimer);



  clearInterval(watchdog);



  if (document.body.dataset.micState !== 'error') setMicState('idle');



  try { unlockNewPatientMic(); } catch (e) {}



  try { unlockPhoneMic(); } catch (e) {}



  try { resetFieldMicButtons(); } catch (e) {}



}



let stopDone = false;           // يتصفّر في بداية startVoice()



function showToastOnce(msg) {



  let t = document.getElementById('pcToast');



  if (!t) { 



    t = document.createElement('div'); 



    t.id = 'pcToast'; 



    t.className = 'toast pc-toast'; 



    document.body.appendChild(t); 



  }



  if (t.textContent === msg && t.classList.contains('show')) return;   // لا تعيد العرض



  t.textContent = msg; 



  t.classList.add('show');



  clearTimeout(t._h); 



  t._h = setTimeout(() => t.classList.remove('show'), 2500);



}



// ---------- تصحيحات صوتية متكررة (ضيف سطر جديد لأي كلمة بتتسمع غلط) ----------



const PC_SPEECH_FIXES = [



  // "التهاب حذف المعدة" / "التهاب حاد المعدة" / "التهاب حاد ف المعدة"  ←  "التهاب حاد في المعدة"



  [/(التهاب(?:ات)?)\s+(?:حذف|حاضر|حادي|حاده|حاد)\s+(?:في\s+|ف\s+)?(ال\S+)/g, '$1 حاد في $2'],



  // "التهاب مزمن المعدة" ← "التهاب مزمن في المعدة"



  [/(التهاب(?:ات)?)\s+(مزمن|مزمنه|مزمنة)\s+(?:في\s+|ف\s+)?(ال\S+)/g, '$1 مزمن في $3'],



];



function pcFixSpeech(text) {



  let t = String(text || '');



  for (const [re, to] of PC_SPEECH_FIXES) t = t.replace(re, to);



  return t;



}



// ---------- أمر الإيقاف الصوتي (آمن) ----------



const STOP_ONLY = /^(?:تمام\s*كد[ةه]|خلاص\s*تمام|خلاص|تمام)\s*[.!،؟:]*$/;



const STOP_TAIL = /\s+(?:تمام\s*كد[ةه]|خلاص\s*تمام)\s*[.!،؟:]*$/;



// ---------- نتائج الصوت (أندرويد + متصفح) ----------



window.onNativeSpeechResult = function (text, isFinal, targetField) {



  if (stopDone) return;



  if (!text) return;



  let clean = String(text).trim();



  let stop = false;



  if (STOP_ONLY.test(clean)) {



    if (!isFinal) return; // انتظر النص النهائي



    stop = true; clean = '';



  } else if (isFinal && STOP_TAIL.test(clean)) {



    stop = true; clean = clean.replace(STOP_TAIL, '').trim();



  }



  clean = pcFixSpeech(clean);



  const effectiveTarget = targetField || activeFieldMicTarget;



  if (clean) {



    if (currentSpeechContext === 'new_patient') {



      handleNewPatientSpeechResult(clean, isFinal, stop, effectiveTarget);



    } else if (currentSpeechContext === 'new_owner_phone') {



      handlePhoneSpeechResult(clean, isFinal, stop);



    } else if (currentSpeechContext === 'store') {



      handleStoreSpeechResult(clean, isFinal, stop, effectiveTarget);



    } else {



      handleVisitSpeechResult(clean, isFinal, stop, effectiveTarget);



    }



  }



  if (stop) {



    if (stopDone) return; // تجاهل أي تكرار



    stopDone = true;



    if (currentSpeechContext === 'new_patient') {



      const transcriptBox = document.getElementById('newPatientTranscriptContent');



      const textToParse = clean || (transcriptBox ? transcriptBox.textContent : '');



      if (textToParse && !textToParse.includes('(اضغط المايك') && !textToParse.includes('(تم مسح')) {



        handleNewPatientSpeechResult(textToParse, true, true);



      }



    } else if (currentSpeechContext === 'store' && !effectiveTarget) {



      handleStoreSpeechResult(clean, true, true, null);



    }



    showToastOnce('🛑 تم إيقاف التسجيل وتفريغ البيانات بنجاح!');



    stopVoiceRecognition();



  }



};



window.onNativeSpeechStatus = function (st) {



  if (st === 'listening') { isRecognizing = true; failCount = 0; setMicState('listening'); }



};



window.onNativeSpeechError = function (msg) {



  wantListening = false;



  finishSession();



  showMicError(msg || 'حدث خطأ في الميكروفون');



};



window.onNativeSpeechEnded = function () {



  isRecognizing = false;



};



// ==========================================



// Handlers for Speech Contexts



// ==========================================



function handleNewPatientSpeechResult(cleanText, isFinal, stop, targetField) {



  const transcriptBox = document.getElementById('newPatientTranscriptContent');



  const statusEl = document.getElementById('newPatientVoiceStatus');



  const fieldId = (targetField || activeFieldMicTarget);



  const isIndividualField = (fieldId && fieldId !== "new_patient" && fieldId !== "visit" && fieldId !== "store");



  if (transcriptBox && cleanText) {



    transcriptBox.textContent = cleanText;



  }



  // A. Individual field mic tapped



  if (isIndividualField) {



    const targetInput = document.getElementById(fieldId);



    if (targetInput && cleanText) {



      let val = cleanText;



      if (fieldId === 'newPetName') {



        // If doctor dictated species instead of name (e.g. 'النوع كلب' or species name)



        const isTypeMention = /^(?:النوع\s*(?:والفصيلة)?|نوعه|نوعها|فصيلته|فصيلتها)\s*/i.test(val) ||



                              /^(?:كلب|كلبة|قطة|قط|ببغاء|عصفور|ارنب|أرنب|هامستر|سلحفاة)/i.test(val);



        if (isTypeMention) {



          const typeInput = document.getElementById('newPetType');



          if (typeInput) {



            let cleanType = val.replace(/^(?:النوع\s*(?:والفصيلة)?|نوعه|نوعها|فصيلته|فصيلتها)\s*[:\-،,\s]*/i, '').trim();



            typeInput.value = cleanType;



            flashHighlightField(typeInput);



            showToast('✓ تم توجيه الكلمة إلى خانة النوع والفصيلة: ' + cleanType, 'info');



          }



          return;



        }



        val = val.replace(/^(?:اسم\s*(?:الأليف|الحيوان|القط|الكلب|الحالة|المريض)?|الاسم|اسمه|اسمها)\s*[:\-،,\s]*/i, '').trim();



      } else if (fieldId === 'newPetType') {



        val = val.replace(/^(?:النوع\s*(?:والفصيلة)?|النوع|الفصيلة|نوعه|نوعها|فصيلته|فصيلتها)\s*[:\-،,\s]*/i, '').trim();



      } else if (fieldId === 'newPetWeight') {



        val = val.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632);



        const wMatch = val.match(/(\d+(?:[\.,]\d+)?\s*(?:كيلو|كجم|جرام|غم|kg)?)/i);



        if (wMatch) val = wMatch[1];



        if (!/(?:كيلو|كجم|جرام|kg)/i.test(val) && /\d+/.test(val)) val += ' كجم';



      } else if (fieldId === 'newOwnerName') {



        val = val.replace(/^(?:اسم\s*(?:المالك|العميل|المربي|صاحب\s*الحالة)?|المالك|العميل|المربي|صاحبه|صاحبها)\s*[:\-،,\s]*/i, '').trim();



      } else if (fieldId === 'newPetChronicNotes' || fieldId === 'editChronicNotesInput') {



        val = val.replace(/^(?:حالة\s*مزمنة|مرض\s*مزمن|ملاحظات\s*هامة|ملاحظات|ملاحظة|تنبيه|يعاني\s*من|عنده|عندها)\s*[:\-،,\s]*/i, '').trim();



      }



      targetInput.value = val;



      flashHighlightField(targetInput);



      if (isFinal || stop) {



        showToast('✓ تم إملاء الخانة: ' + val, 'success');



        document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



      }



    }



    return;



  }



  // B. Full New Patient Voice Banner (#btnStartNewPatientVoice)



  const parsed = parseNewPatientSpeech(cleanText);



  const petNameInput = document.getElementById('newPetName');



  const petTypeInput = document.getElementById('newPetType');



  const petWeightInput = document.getElementById('newPetWeight');



  const ownerNameInput = document.getElementById('newOwnerName');



  const chronicInput = document.getElementById('newPetChronicNotes');



  if (parsed.name && petNameInput) {



    petNameInput.value = parsed.name;



    flashHighlightField(petNameInput);



  }



  if (parsed.type && petTypeInput) {



    petTypeInput.value = parsed.type;



    flashHighlightField(petTypeInput);



  }



  if (parsed.weight && petWeightInput) {



    petWeightInput.value = parsed.weight;



    flashHighlightField(petWeightInput);



  }



  if (parsed.ownerName && ownerNameInput) {



    ownerNameInput.value = parsed.ownerName;



    flashHighlightField(ownerNameInput);



  }



  if (parsed.chronicNotes && chronicInput) {



    const chk = document.getElementById('chkNewPetHasChronic');



    if (chk) chk.checked = true;



    if (window.toggleNewPetChronicField) window.toggleNewPetChronicField(true);



    chronicInput.value = parsed.chronicNotes;



    flashHighlightField(chronicInput);



  }



  // معاينة في شريط الحالة



  if (statusEl && !stop) {



    const previewParts = [];



    if (parsed.name) previewParts.push(`🐾 ${parsed.name}`);



    if (parsed.type) previewParts.push(`🏷️ ${parsed.type}`);



    if (parsed.weight) previewParts.push(`⚖️ ${parsed.weight}`);



    if (parsed.ownerName) previewParts.push(`👤 ${parsed.ownerName}`);



    if (parsed.chronicNotes) previewParts.push(`⚠️ ${parsed.chronicNotes}`);



    if (previewParts.length > 0) {



      statusEl.innerHTML = `🗣️ <strong>تفريغ فوري:</strong> ${previewParts.join(' &bull; ')} <br><span style="color:#10b981; font-size:11px;">👉 الخانات تملا لحظياً! قل "تمام" للإنهاء</span>`;



      statusEl.className = 'status-listening';



    }



  }



  if (stop) {



    const formCard = document.getElementById('formNewPatient');



    if (formCard) flashHighlightField(formCard);



    if (statusEl) {



      statusEl.innerHTML = '🛑 <strong>تم تفريغ كافة بيانات الملف بنجاح!</strong> تفضل بإملاء أو كتابة رقم الواتساب.';



      statusEl.className = 'status-ready';



    }



    try { resetNewPatientMicBtn(); } catch (e) {}



    showToast('✓ تم تفريغ بيانات الملف الجديد بالكامل بنجاح!', 'success');



  }



}



function handlePhoneSpeechResult(cleanText, isFinal, stop) {



  const phone = extractPhoneNumberFromSpeech(cleanText);



  const phoneInput = document.getElementById('newOwnerPhone');



  const statusEl = document.getElementById('newPatientVoiceStatus');



  if (phone && phoneInput) {



    phoneInput.value = phone;



  }



  if (statusEl && phone && !stop) {



    statusEl.innerHTML = `📱 رقم الواتساب المستمع: <strong>${phone}</strong> - قل "تمام" للإنهاء`;



    statusEl.className = 'status-listening';



  }



  if (stop) {



    if (phone && phoneInput) {



      phoneInput.value = phone;



      flashHighlightField(phoneInput);



      showToast(`✓ تم تسجيل وتفريغ رقم الواتساب: ${phone}!`, 'success');



    }



    if (statusEl) {



      statusEl.innerHTML = '✅ تم تسجيل رقم الواتساب بنجاح!';



      statusEl.className = 'status-ready';



    }



    resetPhoneMicBtn();



  }



}



function handleVisitSpeechResult(cleanText, isFinal, stop, targetField) {



  const transcriptContent = document.getElementById('liveTranscriptContent');



  const micStatus = document.getElementById('voiceStatusIndicator');



  if (transcriptContent && cleanText) {



    transcriptContent.textContent = cleanText;



  }



  if (micStatus && cleanText && !micStatus.textContent.startsWith('⚠️')) {



    micStatus.textContent = `🗣️ تم سماع: "${cleanText.slice(-40)}"`;



    micStatus.className = 'status-listening';



  }



  const fieldId = targetField || activeFieldMicTarget;



  const hasMultipleKeywords = /(?:رقم\s*المريض|المريض|مشمش|التشخيص|تشخيص|العلاج|علاج|الروشت[ةه]|الجرع[ةه]|جرع[ةه]|القرع[ةه]|قرع[ةه]|التحاليل|تحاليل|الإعادة|الاعادة|إعادة|اعادة|استشارة)/.test(cleanText);



  // إذا كانت خانة محددة ولم يذكر الطبيب كلمات كشف كاملة



  if (fieldId && !hasMultipleKeywords) {



    if (fieldId === 'visitDiagnosis') {



      const dissected = intelligentDissectMedicalText(cleanText);



      if (dissected.treat || dissected.dosage) {



        const diagInput = document.getElementById('visitDiagnosis');



        const treatInput = document.getElementById('visitTreatment');



        const dosageInput = document.getElementById('visitDosage');



        if (diagInput) {



          diagInput.value = dissected.diag || cleanText;
          flashHighlightField(diagInput);



        }



        if (treatInput && dissected.treat) {



          treatInput.value = dissected.treat;



          flashHighlightField(treatInput);



        }



        if (dosageInput && dissected.dosage) {



          dosageInput.value = dissected.dosage;



          flashHighlightField(dosageInput);



        }



        if (dissected.followText) {



          const days = extractDaysFromArabicText(dissected.followText);



          if (days > 0) updateFollowUpCalculation(days);



        }



        return;



      }



    }



    if (fieldId === 'visitFollowDays') {



      const days = extractDaysFromArabicText(cleanText);



      if (days > 0) {



        updateFollowUpCalculation(days);



      } else {



        const digits = cleanText.replace(/[^0-9]/g, '');



        if (digits) updateFollowUpCalculation(parseInt(digits, 10));



      }



      return;



    }



    if (fieldId === 'visitSearchPatientInput' || fieldId === 'patientQuickSearchInput') {



      let val = cleanText.replace(/^(?:بحث\s*عن|المريض|الملف|رقم)\s*[:\-،,\s]*/i, '').trim();



      const el = document.getElementById(fieldId);



      if (el) el.value = val;



      if (fieldId === 'visitSearchPatientInput' && typeof quickSearchVisitPatient === 'function') {



        quickSearchVisitPatient(val, isFinal || stop);



      } else if (fieldId === 'patientQuickSearchInput' && typeof filterPatientsByKeyword === 'function') {



        filterPatientsByKeyword(val);



      }



      return;



    }



    const targetInput = document.getElementById(fieldId);



    if (targetInput && cleanText) {



      let val = cleanText;



      if (fieldId === 'visitTreatment') {



        val = val.replace(/^(?:العلاج\s*(?:المقرر|هو|هي|بتاعه|بتاعها)?|علاج|الروشت[ةه]|الادوي[ةه]|الأدوي[ةه]|هنكتبل[هه]ا?|ه?ياخ[دذ]|ه?تاخ[دذ])\s*[:\-،,\s]*/i, '').trim();



        val = cleanPhoneticMedications(val);



      } else if (fieldId === 'visitDiagnosis') {



        val = val.replace(/^(?:التشخيص\s*(?:الطبي|هو|هي)?|تشخيص|الكشف|عنده|عندها)\s*[:\-،,\s]*/i, '').trim();



        // Keep doctor's exact trade names and words verbatim



      } else if (fieldId === 'visitDosage') {



        val = val.replace(/^(?:ال?جرع[ةه]\s*(?:وطريقة الاستخدام|وطريقة الاستعمال|هي)?|ال?قرع[ةه]|الجرعات|طريقة الاستخدام|طريقة الاستعمال)\s*[:\-،,\s]*/i, '').trim();



      } else if (fieldId === 'visitLabs') {



        val = val.replace(/^(?:التحاليل\s*(?:والفحوصات|المطلوبة)?|تحاليل|الفحوصات|فحوصات|الاشعة|الأشعة|اشعة|أشعة)\s*[:\-،,\s]*/i, '').trim();



        // Keep doctor's exact trade names and words verbatim



      }



      targetInput.value = val;



      try { targetInput.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}



      flashHighlightField(targetInput);



      if (isFinal) {



        showToast('✓ تم تفريغ الخانة بنجاح: ' + val, 'success');



        document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



      }



    }



  } else {



    // كلام كشف متصل أو المايك الرئيسي للكشف



    if (cleanText) {



      parseDoctorSpeech(cleanText);



    }



  }



  if (stop || isFinal) {



    if (micStatus && !micStatus.textContent.startsWith('⚠️')) {



      micStatus.textContent = stop ? '🛑 تم إيقاف التسجيل بأمر الطبيب ("تمام") وتفريغ البيانات!' : '✅ تم تفريغ وتوزيع بيانات الكشف في الخانات بنجاح!';



      micStatus.className = 'status-ready';



    }



    if (stop) {



      showToast('🛑 تم إيقاف التسجيل وتفريغ الكشف بناءً على أمر الطبيب: "تمام"', 'success');



      document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



    }



  }



}



// ---------- متصفح: Web Speech API (مباشر وفوري متوافق مع كافة المتصفحات والهواتف) ----------



// ---------- إذن الميكروفون: يُطلب مرة واحدة فقط لكل فتح للصفحة ----------



let micPermGranted = false;



let micPermPromise = null;



function ensureMicPermission() {



  if (micPermGranted) return Promise.resolve(true);



  if (micPermPromise) return micPermPromise;



  const p = (async () => {



    try {



      if (navigator.permissions && navigator.permissions.query) {



        const st = await navigator.permissions.query({ name: 'microphone' });



        if (st.state === 'granted') { micPermGranted = true; return true; }



        if (st.state === 'denied') return false;



      }



    } catch (e) { /* بعض المتصفحات لا تدعم الاستعلام عن الميكروفون */ }



    try {



      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;



      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });



      stream.getTracks().forEach(t => t.stop());



      micPermGranted = true;



      return true;



    } catch (e) {



      // رفض صريح فقط يوقف التسجيل. أي خطأ آخر (مثل عدم وجود جهاز) نترك محرك الكلام يقرر



      return !(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError'));



    }



  })();



  micPermPromise = p;



  p.then(() => { micPermPromise = null; }, () => { micPermPromise = null; });



  return p;



}



// إنشاء محرك التعرف مرة واحدة فقط (إنشاء محرك جديد مع كل إعادة تشغيل يجعل المتصفحات الداخلية تسأل عن الإذن من جديد)



function createRecognizer(SR) {



  const rec = new SR();



  rec.lang = 'ar-EG';



  rec.continuous = true;



  rec.interimResults = true;



  rec.maxAlternatives = 1;



  rec.onstart = () => {



    isRecognizing = true;



    failCount = 0;



    setMicState('listening');



  };



  rec.onresult = (ev) => {



    if (!wantListening) return;



    let interim = '', fin = '';



    for (let i = ev.resultIndex; i < ev.results.length; i++) {



      const res = ev.results[i];



      const t = res[0] ? res[0].transcript : '';



      if (res.isFinal) fin += t; else interim += t;



    }



    const textToDeliver = fin || interim;



    if (textToDeliver) {



      window.onNativeSpeechResult(textToDeliver, Boolean(fin), activeFieldMicTarget || '');



    }



  };



  rec.onerror = (ev) => {



    console.warn('Speech error event:', ev.error);



    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {



      micPermGranted = false;



      wantListening = false;



      isRecognizing = false;



      showMicError('يرجى السماح بصلاحية الميكروفون للموقع من إعدادات المتصفح');



      finishSession();



    } else if (FATAL_WEB.includes(ev.error)) {



      wantListening = false;



      isRecognizing = false;



      showMicError(MIC_MSG[ev.error] || 'خطأ في الميكروفون: ' + ev.error);



      finishSession();



    } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {



      failCount++;



    }



  };



  rec.onend = () => {



    isRecognizing = false;



    if (!wantListening) {



      finishSession();



      return;



    }



    if (failCount > 8) {



      showMicError('تعذر الاستمرار في التسجيل، اضغط المايك من جديد');



      finishSession();



      return;



    }



    // المايك يعيد الاستماع تلقائياً طالما الطبيب لم يوقفه



    clearTimeout(restartTimer);



    restartTimer = setTimeout(() => {



      if (!wantListening) return;



      if (!startWebRecognition()) failCount++;



    }, 250);



  };



  return rec;



}



function startWebRecognition() {



  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;



  if (!SR) {



    showMicError('المتصفح لا يدعم التعرف على الصوت. يرجى استخدام متصفح Chrome أو Safari الحديث');



    finishSession();



    return false;



  }



  if (!speechRecognizer) {



    try {



      speechRecognizer = createRecognizer(SR);



    } catch (err) {



      console.error('Error creating SpeechRecognition instance:', err);



      showMicError('تعذر تهيئة محرك الصوت في المتصفح');



      finishSession();



      return false;



    }



  }



  try {



    speechRecognizer.start();



    return true;



  } catch (err) {



    // InvalidStateError = المحرك شغال بالفعل، وده طبيعي



    if (err && err.name === 'InvalidStateError') return true;



    console.warn('speechRecognizer.start error:', err);



    return false;



  }



}



// ---------- نقطة البدء الموحدة ----------



function startVoice(context, target) {



  stopDone = false;



  wantListening = true;



  failCount = 0;



  currentSpeechContext = context || 'visit';



  activeFieldMicTarget = target || null;



  setMicState('preparing');



  if (IS_ANDROID_BRIDGE) {



    try { window.AndroidSpeech.startListening(target || ''); }



    catch (e) { window.onNativeSpeechError('تعذر تشغيل الصوت'); return; }



  } else {



    ensureMicPermission().then((ok) => {



      if (!wantListening) return;



      if (!ok) {



        showMicError('يرجى السماح بصلاحية الميكروفون للموقع من إعدادات المتصفح');



        finishSession();



        return;



      }



      startWebRecognition();



    });



  }



  armWatchdog();



}



// ---------- حارس: إذا بقي المحرك ميتاً أكثر من 4 ثوانٍ أعد التشغيل ----------



function armWatchdog() {



  clearInterval(watchdog);



  let deadSince = 0;



  watchdog = setInterval(() => {



    if (!wantListening) { clearInterval(watchdog); return; }



    if (isRecognizing) { deadSince = 0; return; }



    if (!deadSince) deadSince = Date.now();



    if (Date.now() - deadSince > 4000) {



      deadSince = 0;



      if (IS_ANDROID_BRIDGE) {



        try { window.AndroidSpeech.stopListening(); } catch (e) {}



        setTimeout(() => {



          if (wantListening) try { window.AndroidSpeech.startListening(activeFieldMicTarget || ''); } catch (e) {}



        }, 400);



      } else {



        startWebRecognition();



      }



    }



  }, 2000);



}



function stopVoiceRecognition(silent) {



  wantListening = false;



  isRecognizing = false;



  activeFieldMicTarget = null;



  clearTimeout(restartTimer);



  clearInterval(watchdog);



  document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



  if (IS_ANDROID_BRIDGE) { try { window.AndroidSpeech.stopListening(); } catch (e) {} }



  if (speechRecognizer) {



    try { speechRecognizer.abort(); } catch (e) {}



  }



  if (!silent) finishSession();



}



// إيقاف المايك تلقائياً عند مغادرة الصفحة أو قفل الشاشة



document.addEventListener('visibilitychange', () => { if (document.hidden && wantListening) stopVoiceRecognition(); });



window.addEventListener('pagehide', () => { if (wantListening) stopVoiceRecognition(); });



// لوحة تشخيص (تُفعَّل بـ ?debug=1)



window.__voiceDebug = () => ({



  want: wantListening, recognizing: isRecognizing, ctx: currentSpeechContext,



  target: activeFieldMicTarget, fail: failCount,



  state: document.body.dataset.micState, android: IS_ANDROID_BRIDGE



});



window.handleNewPatientVoiceToggle = function(e) {



  if (e && e.preventDefault) e.preventDefault();



  if (wantListening && currentSpeechContext === 'new_patient' && !activeFieldMicTarget) {



    const transcriptBox = document.getElementById('newPatientTranscriptContent');



    if (transcriptBox && transcriptBox.textContent) {



      handleNewPatientSpeechResult(transcriptBox.textContent, true, true, null);



    }



    stopVoiceRecognition();



  } else {



    if (wantListening) {



      stopVoiceRecognition();



    }



    currentSpeechContext = 'new_patient';



    activeFieldMicTarget = null;



    startVoice('new_patient', null);



  }



};



// ==============================================================================



// PetiCareSpeech VoiceFormFiller Integration (Stage 3)



// ==============================================================================



let patientVoiceFiller = null;



let visitVoiceFiller = null;



function initPetiCareVoiceFillers() {



    // Disabled to prevent duplicate recognizer collisions on mic buttons



    return;



}







function initNewPatientVoice() {



    const btnPhoneMic = document.getElementById('btnMicNewOwnerPhone');



    const btnNewPatientMic = document.getElementById('btnStartNewPatientVoice');



    if (btnNewPatientMic && !btnNewPatientMic.dataset.bound) {



    btnNewPatientMic.dataset.bound = 'true';



    btnNewPatientMic.addEventListener('click', (e) => {



      e.preventDefault();



      if (wantListening && currentSpeechContext === 'new_patient') {



        const transcriptBox = document.getElementById('newPatientTranscriptContent');



        if (transcriptBox && transcriptBox.textContent) {



          handleNewPatientSpeechResult(transcriptBox.textContent, true, true);



        }



        stopVoiceRecognition();



      } else {



        startVoice('new_patient', null);



      }



    });



  }



  if (btnPhoneMic && !btnPhoneMic.dataset.bound) {



    btnPhoneMic.dataset.bound = 'true';



    btnPhoneMic.addEventListener('click', (e) => {



      e.preventDefault();



      if (wantListening && currentSpeechContext === 'new_owner_phone') {



        const phoneInput = document.getElementById('newOwnerPhone');



        if (phoneInput && phoneInput.value) {



          handlePhoneSpeechResult(phoneInput.value, true, true);



        }



        stopVoiceRecognition();



      } else {



        startVoice('new_owner_phone', 'newOwnerPhone');



      }



    });



  }



}



function setupFieldSpecificMics() {



  const fieldMics = document.querySelectorAll('.btn-field-mic');



  fieldMics.forEach(btn => {



    if (!btn.dataset.bound) {



      btn.dataset.bound = 'true';



      btn.addEventListener('click', (e) => {



        e.preventDefault();



        const targetId = btn.getAttribute('data-target');



        if (!targetId) return;



        // إذا كان المايك لنفس الخانة يعمل حالياً، يتم إيقافه



        if (wantListening && activeFieldMicTarget === targetId) {



          stopVoiceRecognition();



          btn.classList.remove('listening');



          return;



        }



        // إضاءة مايك الخانة الحالية



        document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



        btn.classList.add('listening');



        let context = 'visit';



        if (targetId.startsWith('newPet') || targetId.startsWith('newOwner')) {



          context = 'new_patient';



        } else if (targetId === 'productName' || targetId === 'productPrice' || targetId === 'productCategory') {



          context = 'store';



        } else if (targetId === 'patientQuickSearchInput') {



          context = 'patient_search';



        }



        // تشغيل مباشر وفوري داخل لمسة المستخدم



        startVoice(context, targetId);



      });



    }



  });



}



// Bind Main Visit Mic Button



function setupMainVisitMic() {



  const btnMic = document.getElementById('btnStartVoice');



  if (btnMic && !btnMic.dataset.bound) {



    btnMic.dataset.bound = 'true';



    btnMic.addEventListener('click', (e) => {



      e.preventDefault();



      if (wantListening && currentSpeechContext === 'visit' && !activeFieldMicTarget) {



        stopVoiceRecognition();



      } else {



        startVoice('visit', null);



      }



    });



  }



  const googleVoiceBtn = document.getElementById('btnGoogleVoiceModal');



  if (googleVoiceBtn && !googleVoiceBtn.dataset.bound) {



    googleVoiceBtn.dataset.bound = 'true';



    googleVoiceBtn.addEventListener('click', (e) => {



      e.preventDefault();



      if (wantListening) {



        stopVoiceRecognition();



      } else {



        startVoice('visit', null);



      }



    });



  }



}



// تهيئة أزرار المايك



setupMainVisitMic();



setupFieldSpecificMics();



initNewPatientVoice();



// ---------- وظائف التفريغ الشامل للخانات (Clear Forms) ----------



window.resetVisitFieldLocks = function() {};



window.resetStoreFieldLocks = function() {};



window.resetNewPatientFieldLocks = function() {};



window.resetVisitFields = function() {



    const f = document.getElementById('formNewVisit');



    if (f) f.reset();



    ['visitDiagnosis', 'visitTreatment', 'visitDosage', 'visitLabs', 'visitFollowDays', 'visitFollowDate', 'visitSearchPatientInput', 'visitChronicNotes'].forEach(id => {



        const el = document.getElementById(id);



        if (el) el.value = '';



    });



    const sel = document.getElementById('visitPatientSelect');



    if (sel) sel.value = '';



    const chronicBanner = document.getElementById('patientChronicAlertBanner');



    if (chronicBanner) chronicBanner.style.display = 'none';



    const quickCard = document.getElementById('selectedPatientQuickCard');



    if (quickCard) quickCard.innerHTML = '';



    if (typeof resetUploaders === 'function') resetUploaders();



    const transcriptContent = document.getElementById('liveTranscriptContent');



    if (transcriptContent) transcriptContent.textContent = '(تم تفريغ الخانات. اضغط المايك وتحدث...)';



    const calcBadge = document.getElementById('computedDateBadge');



    if (calcBadge) calcBadge.style.display = 'none';



    showToast('🔄 تم تفريغ خانات الكشف بالكامل!', 'info');



};



window.resetNewPatientFields = function() {



    const f = document.getElementById('formNewPatient') || document.getElementById('newPatientForm');



    if (f) f.reset();



    ['newPetName', 'newPetType', 'newPetWeight', 'newOwnerName', 'newOwnerPhone', 'newPetChronicNotes'].forEach(id => {



        const el = document.getElementById(id);



        if (el) el.value = '';



    });



    if (typeof window.toggleNewPetChronicField === 'function') {



        window.toggleNewPetChronicField(false);



    }



    const chk = document.getElementById('chkNewPetHasChronic');



    if (chk) chk.checked = false;



    const transcriptBox = document.getElementById('newPatientTranscriptContent');



    if (transcriptBox) transcriptBox.textContent = '(تم تفريغ الخانات. اضغط المايك وتحدث...)';



    const statusEl = document.getElementById('newPatientVoiceStatus');



    if (statusEl) {



        statusEl.textContent = '🎙️ تحدث بالترتيب: (الاسم - النوع - الوزن - اسم المالك - حالة مزمنة إن وجدت)';



        statusEl.className = 'status-box';



    }



    showToast('🔄 تم تفريغ خانات المريض الجديد بالكامل!', 'info');



};



window.resetStoreFields = function() {



    const form = document.getElementById('formNewProduct');



    if (form) form.reset();



    ['productName', 'productPrice'].forEach(id => {



        const el = document.getElementById(id);



        if (el) el.value = '';



    });



    const catSelect = document.getElementById('productCategory');



    if (catSelect) catSelect.selectedIndex = 0;



    const imgInput = document.getElementById('productImageInput');



    if (imgInput) imgInput.value = '';



    const preview = document.getElementById('productImagePreview');



    if (preview) {



        preview.style.display = 'none';



        preview.src = '';



    }



    const statusEl = document.getElementById('storeVoiceStatus');



    if (statusEl) {



        statusEl.textContent = '💡 يمكنك نطق: (دراي فود رويال كانين والسعر 450 والقسم أغذية) ثم قل "تمام"';



        statusEl.className = 'store-voice-status';



    }



    showToast('🔄 تم تفريغ خانات المنتج بالكامل!', 'info');



};



/**



 * Advanced Multi-Reference Arabic Speech Parser for PetiCare



 * Exactly follows the doctor's real clinical dictation workflow:



 * 1. "رقم المريض [101]" / "المريض [101]" -> Selects patient file



 * 2. "التشخيص ..." -> Fills visitDiagnosis



 * 3. "العلاج ..." -> Fills visitTreatment



 * 4. "الجرعة ..." -> Fills visitDosage



 * 5. "التحاليل ..." -> Fills visitLabs



 * 6. "الإعادة ..." -> Calculates follow-up days & calendar date



 * 7. "حالة مزمنة / ملاحظات ..." -> Fills visitChronicNotes



 */



function parseDoctorSpeech(rawText) {



    if (!rawText) return;



    let text = rawText.trim();



    // Strip trailing doctor confirmation words



    text = text.replace(/(?:^|\s+)(تمام\s*كد[ةه]|تمام|خلاص\s*تمام|خلاص|تم)\s*[:.!،؟]*$/i, '').trim();



    console.log("🎤 جاري تفريغ الصوت الحقيقي للطبيب:", text);



    const normalizedText = normalizeArabic(text);



    // 1. Direct pet check: ONLY if visitPatientSelect has no value currently selected OR if explicit keyword was spoken



    if (window.petiCareData && typeof window.petiCareData.getPatients === 'function') {



        const currentSel = document.getElementById('visitPatientSelect');



        const hasExplicitPatientKw = /(?:رقم\s*المريض|رقم\s*العميل|رقم\s*الملف|المريض\s*رقم|العميل\s*رقم|الملف\s*رقم|المريض|المريضة|العميل|الملف|حالة\s*المريض|حالة)/i.test(normalizedText);



        if (!currentSel || !currentSel.value || hasExplicitPatientKw) {



            const allPatients = window.petiCareData.getPatients();



            for (const p of allPatients) {



                const normName = normalizeArabic(p.name);



                const nameRegex = new RegExp('(?:^|\s)' + normName + '(?:\s|$|[.,:!؟])', 'i');



                if (normName && (nameRegex.test(normalizedText) || normalizedText.includes(' ' + normName))) {



                    if (currentSel && currentSel.value !== p.id) {



                        currentSel.value = p.id;



                        if (typeof onPatientSelected === 'function') onPatientSelected(p.id);



                        flashHighlightField(currentSel);



                    }



                    break;



                }



            }



        }



    }



    // 2. Multi-group keyword definition with non-conflicting patterns



    const keywordGroups = [



        {



            key: 'patient',



            patterns: ['رقم المريض', 'رقم العميل', 'رقم الملف', 'المريض رقم', 'العميل رقم', 'الملف رقم', 'المريض', 'العميل', 'الملف']



        },



        {



            key: 'diag',



            fieldId: 'visitDiagnosis',



            patterns: ['التشخيص الطبي', 'التشخيص هو', 'التشخيص هي', 'التشخيص', 'تشخيص', 'والتشخيص', 'وتشخيص', 'الكشف', 'والكشف', 'بيشتكي من', 'بتشتكي من', 'عنده', 'عندها']



        },



        {



            key: 'treat',



            fieldId: 'visitTreatment',



            patterns: [



                'العلاج المقرر', 'العلاج هو', 'العلاج هي', 'العلاج بتاعه', 'العلاج بتاعها', 'العلاج', 'علاج',



                'والعلاج', 'وعلاج', 'علاجه', 'علاجها', 'وعلاجه', 'وعلاجها',



                'الروشتة', 'الروشته', 'والروشتة', 'والروشته', 'روشتة', 'روشته',



                'الادوية', 'الأدوية', 'والادوية', 'والأدوية', 'ادوية', 'أدوية',



                'هنكتبله علاج', 'هنكتبلها علاج', 'هنكتبله', 'هنكتبلها',



                'وهياخد علاج', 'وهتاخد علاج', 'هياخد علاج', 'هتاخد علاج',



                'وياخد علاج', 'وتاخد علاج', 'ياخد علاج', 'تاخد علاج'



            ]



        },



        {



            key: 'dosage',



            fieldId: 'visitDosage',



            patterns: [



                'الجرعة وطريقة الاستخدام', 'الجرعة وطريقة الاستعمال',



                'الجرعة', 'الجرعه', 'جرعة', 'جرعه', 'والجرعة', 'والجرعه', 'وجرعة', 'وجرعه',



                'القرعة', 'القرعه', 'قرعة', 'قرعه', 'والقرعة', 'والقرعه', 'وقرعة', 'وقرعه',



                'الجرعات', 'والجرعات',



                'طريقة الاستخدام', 'وطريقة الاستخدام', 'طريقة الاستعمال', 'وطريقة الاستعمال',



                'الاستخدام', 'الاستعمال'



            ]



        },



        {



            key: 'labs',



            fieldId: 'visitLabs',



            patterns: [



                'التحاليل والفحوصات', 'التحاليل المطلوبة', 'التحاليل', 'تحاليل', 'التحليل', 'تحليل',



                'والتحاليل', 'وتحاليل', 'والتحليل', 'وتحليل', 'الاشعة', 'الأشعة', 'اشعة', 'أشعة',



                'والاشعة', 'والأشعة', 'الفحوصات', 'والفحوصات', 'فحوصات', 'مسحة', 'سونار'



            ]



        },



        {



            key: 'follow',



            fieldId: 'visitFollowDays',



            patterns: [



                'الاعادة بعد', 'الاعاده بعد', 'الإعادة بعد', 'الإعاده بعد',



                'الاعادة', 'الاعاده', 'الإعادة', 'الإعاده',



                'والاعادة بعد', 'والاعاده بعد', 'والإعادة بعد', 'والإعاده بعد',



                'والاعادة', 'والاعاده', 'والإعادة', 'والإعاده',



                'اعادة بعد', 'اعاده بعد', 'إعادة بعد', 'إعاده بعد',



                'اعادة', 'اعاده', 'إعادة', 'إعاده',



                'المتابعة بعد', 'المتابعه بعد', 'المتابعة', 'المتابعه',



                'الاستشارة بعد', 'الاستشاره بعد', 'الاستشارة', 'الاستشاره'



            ]



        },



        {



            key: 'chronic',



            fieldId: 'visitChronicNotes',



            patterns: [



                'حالة مزمنة', 'مرض مزمن', 'ملاحظات هامة', 'ملاحظات خاصة', 'ملاحظات', 'ملاحظة',



                'وحالة مزمنة', 'ومرض مزمن', 'وملاحظات هامة', 'وملاحظات', 'وملاحظة',



                'تنبيه طبي', 'وتنبيه طبي', 'تنبيه', 'وتنبيه', 'حالة خاصة', 'وحالة خاصة'



            ]



        }



    ];



    const matches = [];



    for (const group of keywordGroups) {



        let bestMatch = null;



        for (const pattern of group.patterns) {



            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');



            const regex = new RegExp('(?:^|\\s+)(' + escaped + ')(?:[:\\-،,\\s]+|$)', 'i');



            const m = text.match(regex);



            if (m && m.index !== undefined) {



                const matchIndex = m.index + (m[0].length - m[1].length - (m[0].endsWith(' ') || m[0].endsWith(':') || m[0].endsWith('-') || m[0].endsWith('،') || m[0].endsWith(',') ? m[0].length - m[0].trimEnd().length : 0));



                const afterIndex = m.index + m[0].length;



                if (!bestMatch || matchIndex < bestMatch.index || (matchIndex === bestMatch.index && pattern.length > bestMatch.pattern.length)) {



                    bestMatch = {



                        key: group.key,



                        pattern: pattern,



                        index: matchIndex,



                        afterIndex: afterIndex,



                        fieldId: group.fieldId



                    };



                }



            }



        }



        if (bestMatch) {



            matches.push(bestMatch);



        }



    }



    matches.sort((a, b) => a.index - b.index);



    const extracted = {};



    for (let i = 0; i < matches.length; i++) {



        const current = matches[i];



        const startIndex = current.afterIndex;



        const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;



        let segment = text.slice(startIndex, endIndex).trim();



        segment = segment.replace(/^[:\-،,\s]+/, '').replace(/[:\-،,\s]+$/, '').trim();



        extracted[current.key] = segment;



    }



    // Patient lookup



    if (extracted['patient'] && window.petiCareData) {



        const found = window.petiCareData.findPatientByNameOrId(extracted['patient']);



        if (found) {



            const select = document.getElementById('visitPatientSelect');



            if (select && select.value !== found.id) {



                select.value = found.id;



                if (typeof onPatientSelected === 'function') onPatientSelected(found.id);



                flashHighlightField(select);



            }



        }



    }



    // Preserves doctor's exact words, diagnosis, and trade names verbatim (no unwanted alterations)



    // Populate Fields Directly in Real-Time



    if (extracted['diag']) {



        const diagField = document.getElementById('visitDiagnosis');



        if (diagField) {



            diagField.value = extracted['diag'];



            flashHighlightField(diagField);



        }



    }



    if (extracted['treat']) {



        extracted['treat'] = cleanPhoneticMedications(extracted['treat']);



        const treatField = document.getElementById('visitTreatment');



        if (treatField) {



            treatField.value = extracted['treat'];



            flashHighlightField(treatField);



        }



    }



    // Clean dosage if it contained follow-up words



    if (extracted['dosage']) {



        const cleanedDosage = extracted['dosage']



            .replace(/(?:وال?اعادة|وال?اعاده|وال?متابعة|وال?متابعه|وال?استشارة|وال?استشاره)\s*(?:بعد\s*)?(?:كل\s*)?(?:شهر(?:ين)?|اسبوع(?:ين)?|\d+\s*ايام?|\d+\s*يوم|يوم(?:ين)?)/gi, '')



            .replace(/[:\-،,\s]+$/, '')



            .trim();



        if (cleanedDosage) {



            extracted['dosage'] = cleanedDosage;



        }



        const dosageField = document.getElementById('visitDosage');



        if (dosageField) {



            dosageField.value = extracted['dosage'];



            flashHighlightField(dosageField);



        }



    }



    if (extracted['labs']) {



        const labsField = document.getElementById('visitLabs');



        if (labsField) {



            labsField.value = extracted['labs'];



            flashHighlightField(labsField);



        }



    }



    // Chronic condition / notes



    if (extracted['chronic']) {



        let chronicVal = extracted['chronic']



            .replace(/^(?:حالة\s*مزمنة|مرض\s*مزمن|ملاحظات\s*هامة|ملاحظات\s*خاصة|ملاحظات|ملاحظة|تنبيه\s*طبي|تنبيه)\s*[:\-،,\s]*/i, '')



            .trim();



        const chronicField = document.getElementById('visitChronicNotes');



        if (chronicField && chronicVal) {



            chronicField.value = chronicVal;



            flashHighlightField(chronicField);



        }



    }



    // Follow-up Days



    if (extracted['follow'] || extracted['dosage'] || extracted['treat']) {



        let detectedDays = 0;



        if (extracted['follow']) {



            detectedDays = extractDaysFromArabicText(extracted['follow']);



        }



        if (!detectedDays || detectedDays <= 0) {



            if (extracted['dosage']) {



                detectedDays = extractDaysFromArabicText(extracted['dosage']);



            }



            if (!detectedDays && extracted['treat']) {



                detectedDays = extractDaysFromArabicText(extracted['treat']);



            }



            if (!detectedDays) {



                detectedDays = extractDaysFromArabicText(text);



            }



        }



        if (detectedDays > 0) {



            updateFollowUpCalculation(detectedDays);



        }



    }



}



function updateFollowUpCalculation(days) {



    const followDaysField = document.getElementById('visitFollowDays');



    const followDateField = document.getElementById('visitFollowDate');



    const calcBadge = document.getElementById('computedDateBadge');



    const numDays = parseInt(days, 10);



    if (isNaN(numDays) || numDays <= 0) {



        if (followDaysField && followDaysField.value !== '') followDaysField.value = '';



        if (followDateField) followDateField.value = '';



        if (calcBadge) calcBadge.style.display = 'none';



        return;



    }



    if (followDaysField) {



        followDaysField.value = numDays;



        flashHighlightField(followDaysField);



    }



    const targetDate = new Date();



    targetDate.setDate(targetDate.getDate() + numDays);



    const yyyy = targetDate.getFullYear();



    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');



    const dd = String(targetDate.getDate()).padStart(2, '0');



    const formattedDate = `${yyyy}-${mm}-${dd}`;



    if (followDateField) {



        followDateField.value = formattedDate;



        flashHighlightField(followDateField);



    }



    if (calcBadge) {



        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };



        const arabicDateString = targetDate.toLocaleDateString('ar-EG', dateOptions);



        calcBadge.innerHTML = `🗓️ موعد الإعادة المحسوب: <strong>${arabicDateString}</strong> (بعد ${numDays} يوماً)`;



        calcBadge.style.display = 'block';



    }



}



/**



 * Normalizes Arabic string (unifies hamzas and taa-marbuta)



 */



function normalizeArabic(str) {



    if (!str) return '';



    return str



        .replace(/[أإآ]/g, 'ا')



        .replace(/ة/g, 'ه')



        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));



}



/**



 * Intelligent Extraction of Follow-up Days from Arabic Speech



 */



function extractDaysFromArabicText(str) {

    if (!str) return 0;

    const normalized = normalizeArabic(str).toLowerCase().trim();



    const wordToNum = {

        'واحد': 1, 'واحده': 1, 'اول': 1,

        'اثنين': 2, 'اتنين': 2, 'اثنان': 2,

        'تلاته': 3, 'ثلاثه': 3, 'تلات': 3, 'ثلاث': 3,

        'اربعه': 4, 'اربع': 4,

        'خمسه': 5, 'خمس': 5,

        'سته': 6, 'ست': 6,

        'سبعه': 7, 'سبع': 7,

        'ثمانيه': 8, 'تمانيه': 8, 'ثمان': 8, 'تمان': 8,

        'تسعه': 9, 'تسع': 9,

        'عشره': 10, 'عشر': 10

    };



    // 1. Check for Weeks (أسابيع / أسبوع / اسبوعين)

    if (normalized.includes('اسبوعين') || normalized.includes('اسبوعان')) {

        if (normalized.includes('نص') || normalized.includes('نصف')) return 17;

        return 14;

    }



    const digitWeeksMatch = normalized.match(/(\d+)\s*(?:اسابيع|اسبوع)/);

    if (digitWeeksMatch) {

        return parseInt(digitWeeksMatch[1], 10) * 7;

    }



    const weekPattern = /(واحد|واحده|اثنين|اتنين|اثنان|ثلاثه|تلاته|ثلاث|تلات|اربعه|اربع|خمسه|خمس|سته|ست|سبعه|سبع|ثمانيه|تمانيه|ثمان|تمان|تسعه|تسع|عشره|عشر)\s*(?:اسابيع|اسبوع)/;

    const wordWeeksMatch = normalized.match(weekPattern);

    if (wordWeeksMatch) {

        const numWord = wordWeeksMatch[1];

        return (wordToNum[numWord] || 1) * 7;

    }



    if (normalized.includes('اسبوع') || normalized.includes('اسبوعيا')) {

        if (normalized.includes('نص') || normalized.includes('نصف')) return 10;

        return 7;

    }



    // 2. Check for Months (شهور / أشهر / شهر / شهرين)

    if (normalized.includes('شهرين') || normalized.includes('شهران')) {

        if (normalized.includes('نص') || normalized.includes('نصف')) return 75;

        return 60;

    }



    const digitMonthsMatch = normalized.match(/(\d+)\s*(?:شهور|اشهر|شهر)/);

    if (digitMonthsMatch) {

        return parseInt(digitMonthsMatch[1], 10) * 30;

    }



    const monthPattern = /(واحد|واحده|اثنين|اتنين|اثنان|ثلاثه|تلاته|ثلاث|تلات|اربعه|اربع|خمسه|خمس|سته|ست|سبعه|سبع|ثمانيه|تمانيه|ثمان|تمان|تسعه|تسع|عشره|عشر)\s*(?:شهور|اشهر|شهر)/;

    const wordMonthsMatch = normalized.match(monthPattern);

    if (wordMonthsMatch) {

        const numWord = wordMonthsMatch[1];

        return (wordToNum[numWord] || 1) * 30;

    }



    if (normalized.includes('شهر') || normalized.includes('شهريا')) {

        if (normalized.includes('نص') || normalized.includes('نصف')) return 45;

        return 30;

    }



    // 3. Check for Days (أيام / ايام / يوم / يومين)

    if (normalized.includes('يومين') || normalized.includes('يومان')) {

        return 2;

    }



    const digitDaysMatch = normalized.match(/(\d+)\s*(?:ايام|أيام|يوم)/);

    if (digitDaysMatch) {

        return parseInt(digitDaysMatch[1], 10);

    }



    const dayPattern = /(واحد|واحده|اثنين|اتنين|اثنان|ثلاثه|تلاته|ثلاث|تلات|اربعه|اربع|خمسه|خمس|سته|ست|سبعه|سبع|ثمانيه|تمانيه|ثمان|تمان|تسعه|تسع|عشره|عشر)\s*(?:ايام|أيام|يوم)/;

    const wordDaysMatch = normalized.match(dayPattern);

    if (wordDaysMatch) {

        const numWord = wordDaysMatch[1];

        return wordToNum[numWord] || 1;

    }



    if (normalized.includes('يوم') || normalized.includes('غدا') || normalized.includes('بكره') || normalized.includes('تانى يوم')) {

        return 1;

    }



    // 4. Standalone word numbers

    for (const [w, n] of Object.entries(wordToNum)) {

        if (new RegExp(`\\b${w}\\b`).test(normalized)) {

            return n;

        }

    }



    // 5. Standalone digits

    const numMatch = normalized.match(/\b(\d+)\b/);

    if (numMatch) {

        const val = parseInt(numMatch[1], 10);

        if (val > 0 && val <= 365) return val;

    }



    return 0;

}



function flashHighlightField(element) {



    if (!element) return;



    element.classList.add('field-glow');



    element.classList.add('voice-field-pulse');



    setTimeout(() => {



        element.classList.remove('voice-field-pulse');



    }, 1200);



}



/**



 * Image Uploaders: Single Case Photo + Multi-Photo Lab Gallery



 */



function initImageUploaders() {



    // 1. Single Case Photo



    setupCaseImagePicker();



    // 2. Client / Owner Photo



    setupClientImagePicker();



    // 3. Multi-Photo Lab Gallery



    setupMultiLabImagePicker();



    // 4. Prescription Photo Picker



    setupPrescriptionImagePicker();



}



function setupCaseImagePicker() {
    const camInput = document.getElementById('caseCameraInput');
    const fileInput = document.getElementById('caseFileInput');
    const legacyInput = document.getElementById('caseImageInput');

    const camBtn = document.getElementById('btnCaseCamera');
    const fileBtn = document.getElementById('btnUploadCaseImg');

    const previewBox = document.getElementById('caseImgPreview');
    const removeBtn = document.getElementById('btnRemoveCaseImg');

    if (camBtn && camInput) camBtn.addEventListener('click', () => camInput.click());
    if (fileBtn) {
        fileBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
            else if (legacyInput) legacyInput.click();
        });
    }

    function handleCaseFile(file) {
        if (!file) return;
        compressImageFile(file, (base64) => {
            uploadedImages.caseImage = base64;
            saveVisitDraft();
            if (previewBox) {
                const imgElem = previewBox.querySelector('img');
                if (imgElem) imgElem.src = base64;
                previewBox.style.display = 'flex';
            }
            [camBtn, fileBtn].forEach(b => {
                if (b) {
                    b.classList.add('has-file');
                    const lbl = b.querySelector('.btn-label');
                    if (lbl) lbl.textContent = 'تم الإرفاق ✓';
                }
            });
        });
    }

    [camInput, fileInput, legacyInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('change', (e) => {
                const file = e.target.files[0];
                handleCaseFile(file);
                inp.value = '';
            });
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedImages.caseImage = '';
            [camInput, fileInput, legacyInput].forEach(inp => { if (inp) inp.value = ''; });
            if (previewBox) previewBox.style.display = 'none';
            if (camBtn) {
                camBtn.classList.remove('has-file');
                const lbl = camBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = 'كاميرا';
            }
            if (fileBtn) {
                fileBtn.classList.remove('has-file');
                const lbl = fileBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = 'من الجهاز';
            }
        });
    }
}

function setupClientImagePicker() {



    const input = document.getElementById('clientImageInput');



    const trigger = document.getElementById('btnUploadClientImg');



    const previewBox = document.getElementById('clientImgPreview');



    const removeBtn = document.getElementById('btnRemoveClientImg');



    if (trigger && input) {



        trigger.addEventListener('click', () => input.click());



    }



    if (input) {



        input.addEventListener('change', (e) => {



            const file = e.target.files[0];



            if (!file) return;



            compressImageFile(file, (base64) => {



                uploadedImages.clientImage = base64;



                if (previewBox) {



                    const imgElem = previewBox.querySelector('img');



                    if (imgElem) imgElem.src = base64;



                    previewBox.style.display = 'flex';



                }



                if (trigger) {



                    trigger.classList.add('has-file');



                    trigger.querySelector('.btn-label').textContent = 'تم الإرفاق ✓';



                }



                if (currentSelectedPatient) {



                    currentSelectedPatient.ownerPhoto = base64;



                    onPatientSelected(currentSelectedPatient.id);



                }



            });



        });



    }



    if (removeBtn) {



        removeBtn.addEventListener('click', (e) => {



            e.stopPropagation();



            uploadedImages.clientImage = '';



            if (input) input.value = '';



            if (previewBox) previewBox.style.display = 'none';



            if (trigger) {



                trigger.classList.remove('has-file');



                trigger.querySelector('.btn-label').textContent = 'صورة العميل';



            }



            if (currentSelectedPatient) {



                currentSelectedPatient.ownerPhoto = '';



                onPatientSelected(currentSelectedPatient.id);



            }



        });



    }



}



function setupMultiLabImagePicker() {
    const camInput = document.getElementById('labCameraInput');
    const fileInput = document.getElementById('labFileInput');
    const legacyInput = document.getElementById('labImageInput');

    const camBtn = document.getElementById('btnLabCamera');
    const fileBtn = document.getElementById('btnUploadLabImg');

    const gallery = document.getElementById('labImgGallery');
    const thumbsList = document.getElementById('labThumbsList');
    const countBadge = document.getElementById('labPhotosCount');
    const clearAllBtn = document.getElementById('btnClearAllLabImgs');

    if (camBtn && camInput) camBtn.addEventListener('click', () => camInput.click());
    if (fileBtn) {
        fileBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
            else if (legacyInput) legacyInput.click();
        });
    }

    function handleLabFiles(files) {
        if (!files || files.length === 0) return;
        files.forEach(file => {
            compressImageFile(file, (base64) => {
                uploadedImages.labImages.push(base64);
                renderLabThumbsGallery();
                saveVisitDraft();
            });
        });
    }

    [camInput, fileInput, legacyInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                handleLabFiles(files);
                inp.value = '';
            });
        }
    });

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            uploadedImages.labImages = [];
            renderLabThumbsGallery();
        });
    }

    function renderLabThumbsGallery() {
        if (!gallery || !thumbsList || !countBadge) return;
        const count = uploadedImages.labImages.length;
        countBadge.textContent = count;
        if (count === 0) {
            gallery.style.display = 'none';
            thumbsList.innerHTML = '';
            if (fileBtn) {
                fileBtn.classList.remove('has-file');
                const lbl = fileBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = '+ من الجهاز';
            }
            if (camBtn) {
                camBtn.classList.remove('has-file');
                const lbl = camBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = 'كاميرا';
            }
            return;
        }
        gallery.style.display = 'block';
        if (fileBtn) {
            fileBtn.classList.add('has-file');
            const lbl = fileBtn.querySelector('.btn-label');
            if (lbl) lbl.textContent = `تم رفع (${count}) ✓`;
        }
        if (camBtn) {
            camBtn.classList.add('has-file');
            const lbl = camBtn.querySelector('.btn-label');
            if (lbl) lbl.textContent = `التقاط (${count})`;
        }
        thumbsList.innerHTML = uploadedImages.labImages.map((src, idx) => `
            <div class="lab-thumb-card">
                <img src="${src}" alt="تحليل #${idx + 1}" class="thumb-img" title="اضغط لتكبير التحليل ملء الشاشة" onclick="openPhotoLightbox('${src}', 'معاينة التحليل الطبية #${idx + 1}')">
                <button type="button" class="btn-remove-thumb" onclick="removeLabImageAtIndex(${idx})">&times;</button>
            </div>
        `).join('');
    }

    window.removeLabImageAtIndex = function(idx) {
        if (idx >= 0 && idx < uploadedImages.labImages.length) {
            uploadedImages.labImages.splice(idx, 1);
            renderLabThumbsGallery();
        }
    };
}

function setupPrescriptionImagePicker() {
    const camInput = document.getElementById('prescriptionCameraInput');
    const fileInput = document.getElementById('prescriptionFileInput');
    const legacyInput = document.getElementById('prescriptionImageInput');

    const camBtn = document.getElementById('btnUploadPrescriptionCamera');
    const fileBtn = document.getElementById('btnUploadPrescriptionImg');
    const camIcon = document.getElementById('btnUploadPrescriptionIcon');
    const fileIcon = document.getElementById('btnUploadPrescriptionFileIcon');

    const previewBox = document.getElementById('prescriptionImgPreview');
    const previewImg = document.getElementById('prescriptionPreviewImg');
    const removeBtn = document.getElementById('btnRemovePrescriptionImg');

    if (camBtn && camInput) camBtn.addEventListener('click', () => camInput.click());
    if (fileBtn) {
        fileBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
            else if (legacyInput) legacyInput.click();
        });
    }

    function handleRxFile(file) {
        if (!file) return;
        compressImageFile(file, (base64) => {
            uploadedImages.prescriptionImage = base64;
            if (previewBox && previewImg) {
                previewImg.src = base64;
                previewBox.style.display = 'flex';
            }
            [camBtn, fileBtn].forEach(btn => {
                if (btn) {
                    btn.classList.add('has-file');
                    const lbl = btn.querySelector('.btn-label');
                    if (lbl) lbl.textContent = 'تم الرفع ✓';
                }
            });
            [camIcon, fileIcon].forEach(ico => {
                if (ico) {
                    ico.classList.add('has-file');
                    ico.textContent = '✓';
                }
            });
            showToast('📷 تم إرفاق صورة الروشتة بنجاح!', 'success');
            saveVisitDraft();
        });
    }

    [camInput, fileInput, legacyInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('change', (e) => {
                const file = e.target.files[0];
                handleRxFile(file);
                inp.value = '';
            });
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedImages.prescriptionImage = '';
            [camInput, fileInput, legacyInput].forEach(inp => { if (inp) inp.value = ''; });
            if (previewBox) previewBox.style.display = 'none';
            if (previewImg) previewImg.src = '';
            if (camBtn) {
                camBtn.classList.remove('has-file');
                const lbl = camBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = 'كاميرا';
            }
            if (fileBtn) {
                fileBtn.classList.remove('has-file');
                const lbl = fileBtn.querySelector('.btn-label');
                if (lbl) lbl.textContent = 'من الجهاز';
            }
            if (camIcon) {
                camIcon.classList.remove('has-file');
                camIcon.textContent = '📷';
            }
            if (fileIcon) {
                fileIcon.classList.remove('has-file');
                fileIcon.textContent = '📁';
            }
            showToast('تم إزالة صورة الروشتة', 'info');
        });
    }

    if (previewBox) {
        previewBox.addEventListener('click', () => {
            if (uploadedImages.prescriptionImage) {
                openPhotoLightbox(uploadedImages.prescriptionImage, 'معاينة صورة الروشتة الطبية');
            }
        });
    }
}

function compressImageFile(file, callback) {
    if (!file) return;

    // Direct support for PDF files without canvas manipulation
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            callback(e.target.result);
        };
        reader.readAsDataURL(file);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.78);
            callback(compressed);
        };
        img.onerror = () => {
            // Fallback raw data url
            callback(event.target.result);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}



/**



 * Forms Submissions: New Patient & Save Visit



 */



function initFormHandlers() {
    if (window._peticareFormsInitialized) return;
    window._peticareFormsInitialized = true;



    // 1. New Patient Form



    const newPatientForm = document.getElementById('formNewPatient');



    if (newPatientForm) {



        newPatientForm.addEventListener('submit', (e) => {



            e.preventDefault();



            e.stopImmediatePropagation();
            const name = document.getElementById('newPetName').value.trim();
            const type = document.getElementById('newPetType').value.trim();
            const weight = document.getElementById('newPetWeight').value.trim();
            const ownerName = document.getElementById('newOwnerName').value.trim();
            const phoneRaw = document.getElementById('newOwnerPhone').value.trim();
            const hasChronic = document.getElementById('chkNewPetHasChronic')?.checked;
            const chronicNotes = (hasChronic && document.getElementById('newPetChronicNotes')) ? document.getElementById('newPetChronicNotes').value.trim() : '';

            if (!name || !type || !ownerName || !phoneRaw) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            // Normalize Arabic digits & clean phone
            let cleanPhone = normalizeDigits(phoneRaw).replace(/[^0-9]/g, '');
            if (cleanPhone.startsWith('01')) {
                cleanPhone = '2' + cleanPhone; // Egypt country code standard
            } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
                cleanPhone = '20' + cleanPhone;
            }



            const newPatient = window.petiCareData.addPatient({



                name,



                type,



                weight,



                ownerName,



                phone: cleanPhone,



                chronicNotes,



                createdBy: getActorLabel()



            });



            newPatientForm.reset();



            if (window.newPatientFieldLocks) {



                window.newPatientFieldLocks = { name: false, type: false, weight: false, ownerName: false, chronicNotes: false };



            }



            const transcriptBox = document.getElementById('newPatientTranscriptContent');



            if (transcriptBox) transcriptBox.textContent = '(تم تفريغ الخانات وحفظ الملف بنجاح)';



            refreshPatientsUI();



            showToast(`✅ تم فتح ملف مريض جديد برقم #${newPatient.id}! جاري فتح الكشف مباشرة... 🩺`, 'success');

            // Switch to visit tab directly with this patient preselected
            if (typeof window.startVisitForPatient === 'function') {
                window.startVisitForPatient(newPatient.id);
            }



        });



    }



    // Clear Visit Form Fields Button



    const btnClearFields = document.getElementById('btnClearVisitFields');



    if (btnClearFields) {



        btnClearFields.addEventListener('click', () => {



            const saveVisitForm = document.getElementById('formNewVisit');



            if (saveVisitForm) saveVisitForm.reset();
            clearVisitDraft(false);



            resetUploaders();



            const transcriptContent = document.getElementById('liveTranscriptContent');



            if (transcriptContent) transcriptContent.textContent = '(تم تفريغ الخانات. اضغط المايك وتحدث...)';



            const calcBadge = document.getElementById('computedDateBadge');



            if (calcBadge) calcBadge.style.display = 'none';



            showToast('تم تفريغ خانات الكشف بنجاح', 'info');



        });



    }



    // 2. Reactive Follow-up Days & Calendar Date Sync



    const followDaysInput = document.getElementById('visitFollowDays');



    const followDateInput = document.getElementById('visitFollowDate');



    if (followDaysInput) {



        followDaysInput.addEventListener('input', () => {



            const days = parseInt(followDaysInput.value, 10);



            if (days > 0) {



                updateFollowUpCalculation(days);



            } else {



                if (followDateInput) followDateInput.value = '';



                const calcBadge = document.getElementById('computedDateBadge');



                if (calcBadge) calcBadge.style.display = 'none';



            }



        });



    }



    if (followDateInput) {



        followDateInput.addEventListener('change', () => {



            if (followDateInput.value) {



                const parts = followDateInput.value.split('-');



                if (parts.length === 3) {



                    const selectedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));



                    const today = new Date();



                    today.setHours(0, 0, 0, 0);



                    selectedDate.setHours(0, 0, 0, 0);



                    const diffTime = selectedDate.getTime() - today.getTime();



                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));



                    if (diffDays >= 0) {



                        if (followDaysInput) followDaysInput.value = diffDays;



                        const calcBadge = document.getElementById('computedDateBadge');



                        if (calcBadge) {



                            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };



                            const arabicDateString = selectedDate.toLocaleDateString('ar-EG', dateOptions);



                            calcBadge.innerHTML = `🗓️ موعد الإعادة المحسوب: <strong>${arabicDateString}</strong> (بعد ${diffDays} يوماً)`;



                            calcBadge.style.display = 'block';



                        }



                    }



                }



            }



        });



    }



    // 2b. Auto-Dissect Diagnosis Field on blur / change



    const diagInputField = document.getElementById('visitDiagnosis');



    if (diagInputField) {



        diagInputField.addEventListener('blur', () => {



            const val = diagInputField.value.trim();



            const dissected = intelligentDissectMedicalText(val);



            if (dissected.treat) {
                diagInputField.value = dissected.diag || 'كشف وفحص سريري معتمد';
                const treatInput = document.getElementById('visitTreatment');



                if (treatInput && !treatInput.value.trim()) {



                    treatInput.value = dissected.treat;



                    flashHighlightField(treatInput);



                }



                const dosageInput = document.getElementById('visitDosage');



                if (dosageInput && !dosageInput.value.trim() && dissected.dosage) {



                    dosageInput.value = dissected.dosage;



                    flashHighlightField(dosageInput);



                }



            }



        });



    }



    // 3. Save Visit Form



    const saveVisitForm = document.getElementById('formNewVisit');
    if (saveVisitForm) {
        let isSubmittingVisit = false;
        saveVisitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();

            // 1. If bottom sheet is already open, suppress duplicate submit
            const bottomSheetOverlay = document.getElementById('bottomSheetOverlay');
            if (bottomSheetOverlay && bottomSheetOverlay.classList.contains('open')) {
                return;
            }

            // 2. Prevent duplicate rapid submissions within 4 seconds of last successful save
            if (window._lastVisitSaveTime && (Date.now() - window._lastVisitSaveTime < 4000)) {
                return;
            }
            e.preventDefault();
            if (isSubmittingVisit) return;
            isSubmittingVisit = true;
            const btnSubmit = document.getElementById('btnSubmitVisit');
            if (btnSubmit) btnSubmit.disabled = true;

            const unlockSubmit = () => {
                setTimeout(() => {
                    isSubmittingVisit = false;
                    if (btnSubmit) btnSubmit.disabled = false;
                }, 1000);
            };



            const patientId = document.getElementById('visitPatientSelect').value;



            let diagnosis = document.getElementById('visitDiagnosis').value.trim();



            let treatment = document.getElementById('visitTreatment').value.trim();



            let dosage = (document.getElementById('visitDosage') ? document.getElementById('visitDosage').value.trim() : '');



            const labs = document.getElementById('visitLabs').value.trim();



            const followDays = parseInt(document.getElementById('visitFollowDays').value, 10) || 0;



            const followDate = document.getElementById('visitFollowDate').value;



            // Preserve exact doctor diagnosis without aggressive truncation



            diagnosis = diagnosis.trim();



            if (!treatment && uploadedImages.prescriptionImage) {



                treatment = 'مرفق صورة الروشتة الطبية 📑';



            }



            if (!dosage && uploadedImages.prescriptionImage) {



                dosage = 'حسب الروشتة المرفقة';



            }



            if (!patientId) {



                if (typeof unlockSubmit === 'function') unlockSubmit();
                showToast('⚠️ يرجى اختيار المريض أولاً أو ذكره صوتياً!', 'warning');



                document.getElementById('visitPatientSelect').focus();



                return;



            }



            // Prevent submitting completely empty consultations
            if (!diagnosis && !treatment && !uploadedImages.prescriptionImage) {
                if (typeof unlockSubmit === 'function') unlockSubmit();
                showToast('⚠️ يرجى كتابة أو إملاء التشخيص والعلاج لإتمام الكشف', 'warning');
                document.getElementById('visitDiagnosis').focus();
                return;
            }

            // Friendly smart fallbacks: Never block the doctor if one field has medical notes
            if (!diagnosis && (treatment || uploadedImages.prescriptionImage)) {
                diagnosis = 'كشف وفحص سريري معتمد';
            }
            if (!treatment && uploadedImages.prescriptionImage) {
                treatment = 'مرفق صورة الروشتة الطبية 📑';
            } else if (!treatment && diagnosis) {
                treatment = 'إرشادات وفحص سريري ومتابعة عامة';
            }



            const chronicNotes = document.getElementById('visitChronicNotes') ? document.getElementById('visitChronicNotes').value.trim() : '';



            // Save Visit



            if (!treatment && uploadedImages.prescriptionImage) {



                treatment = 'مرفق صورة الروشتة الطبية 📑';



            }



            if (!dosage && uploadedImages.prescriptionImage) {



                dosage = 'حسب الروشتة المرفقة';



            }



            const visitId = 'v_' + Date.now();

            const visitPayload = {



                id: visitId,



                date: getCairoDateString(),



                diagnosis,



                treatment: treatment || (uploadedImages.prescriptionImage ? 'مرفق صورة الروشتة الطبية 📑' : 'إرشادات ومتابعة عامة'),



                dosage: dosage || '',



                prescriptionImage: uploadedImages.prescriptionImage || '',



                labs: labs || 'لا توجد تحاليل',



                followUpDays: followDays,



                followUpDate: followDate || '',



                chronicNotes: chronicNotes,



                doctorName: getActorLabel(),



                doctorUsername: ((window.petiCareData.getCurrentSession() || {}).username || ''),



                caseImage: uploadedImages.caseImage,



                clientImage: uploadedImages.clientImage || (currentSelectedPatient ? (currentSelectedPatient.ownerPhoto || '') : ''),



                labImages: [...uploadedImages.labImages]



            };



            // Persist chronic condition to patient profile if updated during visit



            if (patientId && chronicNotes && window.petiCareData && typeof window.petiCareData.updatePatient === 'function') {



                window.petiCareData.updatePatient(patientId, { chronicNotes: chronicNotes });



            }



            const result = window.petiCareData.addVisitToPatient(patientId, visitPayload);



            if (!result) {



                showToast('حدث خطأ أثناء حفظ الزيارة', 'error');



                return;



            }



            currentSavedVisitData = {



                patient: result.patient,



                visit: result.visit



            };



            // Reset Visit Form & uploaded images & field locks



            saveVisitForm.reset();



            resetUploaders();



            refreshPatientsUI();



            window._lastVisitSaveTime = Date.now();

            // Open Bottom Sheet with QR Code & WhatsApp Link
            openVisitSuccessBottomSheet(currentSavedVisitData);

            // AUTO-SEND WHATSAPP REPORT FOR THE "WOW EFFECT"
            try {
                if (currentSavedVisitData && currentSavedVisitData.patient && currentSavedVisitData.visit) {
                    sendVisitViaWhatsApp(currentSavedVisitData.patient, currentSavedVisitData.visit);
                }
            } catch(eAutoWA) {
                console.warn('Auto WhatsApp dispatch error:', eAutoWA);
            }

            showToast('✅ تم تسجيل الزيارة وتحديث حساب العميل وإرسال الواتساب لحظياً! 🐾✨', 'success');



        });



    }



}



function resetUploaders() {
    uploadedImages.caseImage = '';
    uploadedImages.clientImage = '';
    uploadedImages.labImages = [];
    uploadedImages.prescriptionImage = '';

    ['prescriptionCameraInput', 'prescriptionFileInput', 'prescriptionImageInput',
     'labCameraInput', 'labFileInput', 'labImageInput',
     'caseCameraInput', 'caseFileInput', 'caseImageInput'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = '';
    });

    const rxPreview = document.getElementById('prescriptionImgPreview');
    if (rxPreview) rxPreview.style.display = 'none';

    const rxFileTrigger = document.getElementById('btnUploadPrescriptionImg');
    if (rxFileTrigger) {
        rxFileTrigger.classList.remove('has-file');
        const lbl = rxFileTrigger.querySelector('.btn-label');
        if (lbl) lbl.textContent = 'من الجهاز';
    }

    const rxCamTrigger = document.getElementById('btnUploadPrescriptionCamera');
    if (rxCamTrigger) {
        rxCamTrigger.classList.remove('has-file');
        const lbl = rxCamTrigger.querySelector('.btn-label');
        if (lbl) lbl.textContent = 'كاميرا';
    }

    const rxIcon = document.getElementById('btnUploadPrescriptionIcon');
    if (rxIcon) {
        rxIcon.classList.remove('has-file');
        rxIcon.textContent = '📷';
    }

    const rxFileIcon = document.getElementById('btnUploadPrescriptionFileIcon');
    if (rxFileIcon) {
        rxFileIcon.classList.remove('has-file');
        rxFileIcon.textContent = '📁';
    }

    const previews = document.querySelectorAll('.image-mini-preview, .image-inline-preview');
    previews.forEach(p => p.style.display = 'none');

    const labGallery = document.getElementById('labImgGallery');
    if (labGallery) labGallery.style.display = 'none';

    const labThumbsList = document.getElementById('labThumbsList');
    if (labThumbsList) labThumbsList.innerHTML = '';

    const countBadge = document.getElementById('labPhotosCount');
    if (countBadge) countBadge.textContent = '0';

    const triggerCase = document.getElementById('btnUploadCaseImg');
    if (triggerCase) {
        triggerCase.classList.remove('has-file');
        triggerCase.querySelector('.btn-label').textContent = 'من الجهاز';
    }

    const triggerCaseCam = document.getElementById('btnCaseCamera');
    if (triggerCaseCam) {
        triggerCaseCam.classList.remove('has-file');
        triggerCaseCam.querySelector('.btn-label').textContent = 'كاميرا';
    }

    const triggerClient = document.getElementById('btnUploadClientImg');
    if (triggerClient) {
        triggerClient.classList.remove('has-file');
        triggerClient.querySelector('.btn-label').textContent = 'صورة العميل';
    }

    const triggerLab = document.getElementById('btnUploadLabImg');
    if (triggerLab) {
        triggerLab.classList.remove('has-file');
        triggerLab.querySelector('.btn-label').textContent = '+ من الجهاز';
    }

    const triggerLabCam = document.getElementById('btnLabCamera');
    if (triggerLabCam) {
        triggerLabCam.classList.remove('has-file');
        triggerLabCam.querySelector('.btn-label').textContent = 'كاميرا';
    }
}



/**



 * Bottom Sheet Modal & WhatsApp Dispatcher



 */



function initModalHandlers() {



    const overlay = document.getElementById('bottomSheetOverlay');



    const closeBtn = document.getElementById('btnCloseBottomSheet');



    if (closeBtn && overlay) {



        closeBtn.addEventListener('click', closeBottomSheet);



        overlay.addEventListener('click', (e) => {



            if (e.target === overlay) {



                closeBottomSheet();



            }



        });



    }



    // WhatsApp Action Button



    const btnSendWhatsApp = document.getElementById('btnSendWhatsApp');



    if (btnSendWhatsApp) {



        btnSendWhatsApp.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentSavedVisitData) return;
            sendVisitViaWhatsAppManual(currentSavedVisitData.patient, currentSavedVisitData.visit);
        });



    }



}



let currentQRMode = 'data'; // 'data' = Consultation report text, 'url' = Client Portal link



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



function getClientVisitUrl(patient, visit) {



    if (!patient) return window.location.origin + '/visit.html';



    visit = visit || {};



    const origin = window.location.origin;



    let dir = window.location.pathname;



    const lastSlash = dir.lastIndexOf('/');



    dir = (lastSlash >= 0) ? dir.substring(0, lastSlash + 1) : '/';



    



    // Fallback doctor name



    let docName = visit.doctorName;



    if (!docName && window.petiCareData && window.petiCareData.getCurrentSession) {



        const s = window.petiCareData.getCurrentSession();



        if (s && s.name) docName = s.name;



    }



    docName = docName || 'طبيب العيادة';







    const pId = String(patient.id || '101');



    const pName = String(patient.name || '');



    const pType = String(patient.type || '');



    const pOwner = String(patient.ownerName || '');



    const vDate = String(visit.date || getCairoDateString());



    const vDiag = String(visit.diagnosis || 'كشف وفحص بيطري');



    const vTreat = String(visit.treatment || 'متابعة وإرشادات عامة');



    const vDose = String(visit.dosage || '');



    const vLabs = String((visit.labs && visit.labs !== 'لا يوجد' && visit.labs !== 'لا توجد تحاليل') ? visit.labs : '');



    const vfDate = String(visit.followUpDate || '');



    const vfDays = parseInt(visit.followUpDays, 10) || 0;







    const payload = {



        id: pId,



        name: pName,



        type: pType,



        owner: pOwner,



        date: vDate,



        diag: vDiag,



        treat: vTreat,



        dose: vDose,



        labs: vLabs,



        doc: docName,



        fDate: vfDate,



        fDays: vfDays



    };







    let encodedB64 = '';



    try {



        encodedB64 = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));



    } catch(e) {



        console.error('Error encoding visit URL payload:', e);



    }







    // Build URL query with plain readable parameters + encoded v



    const q = new URLSearchParams();



    q.set('id', pId);



    if (visit && visit.id) q.set('visit_id', String(visit.id));



    if (pName) q.set('pet', pName);



    if (pType) q.set('type', pType);



    if (pOwner) q.set('owner', pOwner);



    if (vDate) q.set('date', vDate);



    if (docName) q.set('doc', docName);



    if (vDiag) q.set('diag', vDiag);



    if (vTreat) q.set('treat', vTreat);



    if (vDose) q.set('dose', vDose);



    if (vLabs) q.set('labs', vLabs);



    if (vfDate) q.set('fDate', vfDate);



    if (vfDays) q.set('fDays', String(vfDays));



    if (encodedB64) q.set('v', encodedB64);







    return `${origin}${dir}visit.html?${q.toString()}`;



}







function openVisitSuccessBottomSheet(data) {



    const overlay = document.getElementById('bottomSheetOverlay');



    const sheet = document.getElementById('bottomSheet');



    const petTitle = document.getElementById('sheetPetTitle');



    const visitDate = document.getElementById('sheetVisitDate');



    const diagnosis = document.getElementById('sheetDiagnosis');



    const treatment = document.getElementById('sheetTreatment');



    const followUp = document.getElementById('sheetFollowUp');



    const btnPreview = document.getElementById('btnPreviewVisitReport');



    const mediaBox = document.getElementById('sheetMediaPreviewBox');



    const mediaThumbs = document.getElementById('sheetMediaThumbsList');



    if (!overlay || !sheet) return;



    const patient = data.patient;



    const visit = data.visit;







    if (petTitle) petTitle.textContent = `${patient.name} (${patient.type}) - ملف #${patient.id}`;



    if (visitDate) visitDate.textContent = visit.date;



    if (diagnosis) diagnosis.textContent = visit.diagnosis || 'كشف طبي عام';



    if (treatment) {



        treatment.textContent = visit.dosage 



            ? `${visit.treatment} (الجرعة: ${visit.dosage})`



            : visit.treatment;



    }



    if (followUp) {



        followUp.textContent = visit.followUpDate 



            ? `${visit.followUpDate} (بعد ${visit.followUpDays} أيام)`



            : 'حسب تحسن الحالة واستقرارها';



    }







    // Populate Attached Media (Prescription + Labs)



    if (mediaBox && mediaThumbs) {



        const mediaItems = [];



        if (visit.prescriptionImage) {



            mediaItems.push({ src: visit.prescriptionImage, title: 'صورة الروشتة' });



        }



        if (Array.isArray(visit.labImages) && visit.labImages.length > 0) {



            visit.labImages.forEach((img, i) => mediaItems.push({ src: img, title: `تحليل #${i + 1}` }));



        }



        if (mediaItems.length > 0) {



            mediaBox.style.display = 'block';



            mediaThumbs.innerHTML = mediaItems.map(item => `



                <div style="position: relative; display: inline-block;">



                    <img src="${item.src}" alt="${item.title}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1.5px solid #10b981; cursor: pointer;" title="${item.title}" onclick="openPhotoLightbox('${item.src}', '${item.title}')">



                </div>



            `).join('');



        } else {



            mediaBox.style.display = 'none';



            mediaThumbs.innerHTML = '';



        }



    }







    // Client report is sent as full text via WhatsApp (no link needed)







    overlay.classList.add('open');



    sheet.classList.add('open');



}



window.toggleQRCodeContent = function() {



    if (!currentSavedVisitData) return;



    const qrContainer = document.getElementById('qrCodeContainer');



    const captionText = document.getElementById('qrCaptionText');



    const toggleBtn = document.getElementById('btnToggleQRType');



    if (!qrContainer) return;



    if (currentQRMode === 'url') {



        currentQRMode = 'data';



        const qrContent = formatVisitQRReport(currentSavedVisitData.patient, currentSavedVisitData.visit);



        generateQRCode(qrContainer, qrContent);



        if (captionText) captionText.textContent = '📲 باركود قراءة تقرير الكشف نصياً فوراً';



        if (toggleBtn) toggleBtn.textContent = '🌐 عرض رابط تقرير الكشف أونلاين';



        showToast('تم تحويل الباركود لعرض نص التقرير كاملاً', 'info');



    } else {



        currentQRMode = 'url';



        const visitUrl = getClientVisitUrl(currentSavedVisitData.patient, currentSavedVisitData.visit);



        generateQRCode(qrContainer, visitUrl);



        if (captionText) captionText.textContent = '🌐 باركود فتح تقرير الكشف للعميل مباشرة';



        if (toggleBtn) toggleBtn.textContent = '📄 عرض بيانات الكشف كنص بالباركود';



        showToast('تم تحويل الباركود لرابط تقرير الكشف المباشر', 'info');



    }



};



window.copyVisitSummaryToClipboard = function() {



    if (!currentSavedVisitData) return;



    const text = formatVisitQRReport(currentSavedVisitData.patient, currentSavedVisitData.visit);



    if (navigator.clipboard && navigator.clipboard.writeText) {



        navigator.clipboard.writeText(text).then(() => {



            showToast('📋 تم نسخ تقرير الكشف الطبي للحافظة بنجاح!', 'success');



        }).catch(() => {



            showToast('تم تجهيز التقرير للنسخ', 'info');



        });



    } else {



        showToast('📋 تم تجهيز تقرير الكشف!', 'success');



    }



};



function closeBottomSheet() {
    const overlay = document.getElementById('bottomSheetOverlay');
    const sheet = document.getElementById('bottomSheet');
    if (overlay && sheet) {
        sheet.classList.remove('open');
        setTimeout(() => {
            overlay.classList.remove('open');
            const btnSubmit = document.getElementById('btnSubmitVisit');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.style.pointerEvents = 'auto';
                btnSubmit.style.opacity = '1';
            }
        }, 300);
    }
}



/**



 * Generate WhatsApp Link with Formatted Clinic Report



 * Leaves visit report & QR code open on screen ("ويسيبه عند ارسال الواتساب وقت الكشف")



 */



async function sendVisitViaWhatsApp(patient, visit) {
    if (!patient || !visit) return { ok: false, error: 'no_data' };
    const rawPhone = patient.ownerPhone || patient.phone || patient.owner_phone;
    const intlPhone = normalizeEgyptianPhone(rawPhone);

    if (!intlPhone) {
        console.warn('sendVisitViaWhatsApp: Client phone is missing, masked, or invalid:', rawPhone);
        if (typeof showToast === 'function') showToast('⚠️ هاتف العميل غير مسجل أو مخفي لحماية الخصوصية', 'warning');
        return { ok: false, error: 'invalid_phone' };
    }

    const message = formatVisitWhatsAppText(patient, visit);
    const instanceId = PETICARE_ULTRAMSG.instanceId;
    const token = PETICARE_ULTRAMSG.token;

    try {
        if (typeof showToast === 'function') showToast('🚀 جاري إرسال التقرير الطبي لواتساب العميل تلقائياً...', 'info');
        const payload = new URLSearchParams();
        payload.append('token', token);
        payload.append('to', intlPhone);
        payload.append('body', message);
        payload.append('priority', '10');
        payload.append('referenceId', `peticare-${Date.now()}`);

        const resp = await fetch(PETICARE_ULTRAMSG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        });

        const resData = await resp.json().catch(() => null);
        const sentOk = resData && (
            resData.sent === 'true' ||
            resData.sent === true ||
            (resData.id !== undefined && resData.id !== null && String(resData.id).length > 0 && resData.sent !== 'false' && resData.sent !== false)
        );

        if (sentOk) {
            if (typeof showToast === 'function') showToast('✓ تم إرسال التقرير لواتساب العميل بنجاح! 🐾🎉', 'success');
            const btnWA = document.getElementById('btnSendWhatsApp');
            if (btnWA) {
                btnWA.innerHTML = '<span>✓ تم إرسال التقرير لواتساب العميل تلقائياً (إعادة إرسال)</span>';
                btnWA.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
            }
            return { ok: true, id: resData.id };
        } else {
            console.warn('UltraMsg rejected or pending:', resData);
            if (typeof showToast === 'function') showToast('⚠️ تعذر الإرسال التلقائي، يمكنك الضغط على الزر للإرسال يدوياً', 'warning');
            return { ok: false, error: 'gateway_rejected', raw: resData };
        }
    } catch (errGate) {
        console.warn('Auto-gateway fetch error:', errGate);
        if (typeof showToast === 'function') showToast('⚠️ تعذر الاتصال بالبوابة، يمكنك الضغط على الزر للإرسال مباشرة', 'warning');
        return { ok: false, error: 'network', raw: errGate };
    }
}



function generateQRCode(container, text) {



    if (!container) return;



    container.innerHTML = '';



    if (window.QRCode) {



        try {



            new window.QRCode(container, {



                text: text,



                width: 180,



                height: 180,



                colorDark: "#064e3b",



                colorLight: "#ffffff",



                correctLevel: (window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.L : 1)



            });



            return;



        } catch (e) {



            console.error('QRCode generation error, using fallback:', e);



        }



    }



    // Fail-safe SVG visual renderer



    renderDirectSvgFallbackQR(container, text);



}



function renderDirectSvgFallbackQR(container, text) {



    if (!container) return;



    container.innerHTML = `



        <div style="background:#ffffff; padding:12px; border-radius:12px; display:inline-block; border:2px solid #10b981; box-shadow:0 4px 14px rgba(0,0,0,0.3);">



            <div style="font-size:38px; text-align:center;">📲</div>



            <div style="font-size:11px; font-weight:700; color:#064e3b; margin-top:4px; text-align:center;">كود كشف #${currentSavedVisitData ? currentSavedVisitData.patient.id : ''}</div>



        </div>



    `;



}



/**



 * Toast Notifications



 */



function showToast(message, type = 'info') {



    let container = document.getElementById('toastContainer');



    if (!container) {



        container = document.createElement('div');



        container.id = 'toastContainer';



        container.className = 'toast-container';



        document.body.appendChild(container);



    }



    // Clear any previous toasts to prevent stacking and screen jittering



    container.innerHTML = '';



    const toast = document.createElement('div');



    toast.className = `toast-item toast-${type}`;



    toast.innerHTML = `<span>${message}</span>`;



    container.appendChild(toast);



    setTimeout(() => {



        toast.classList.add('show');



    }, 10);



    setTimeout(() => {



        toast.classList.remove('show');



        setTimeout(() => toast.remove(), 400);



    }, 3500);



}



// Full patient modal viewer



window.showPatientDetailsModal = function(patientId) {



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    const overlay = document.getElementById('patientDetailsModal');



    const content = document.getElementById('patientModalBody');



    if (!overlay || !content) return;



    let visitsHtml = '';



    if (patient.visits && patient.visits.length > 0) {



        visitsHtml = patient.visits.map(v => `



            <div class="mini-visit-card">



                <div class="m-visit-header">



                    <strong>📅 ${v.date}</strong>



                    ${v.followUpDate ? `<span class="badge-tag">إعادة: ${v.followUpDate}</span>` : ''}



                </div>



                <div class="m-visit-diag">🩺 <strong>التشخيص:</strong> ${v.diagnosis}</div>



                <div class="m-visit-treat">💊 <strong>العلاج:</strong> ${v.treatment}</div>



                ${v.dosage ? `<div class="m-visit-dosage">⏱️ <strong>الجرعة:</strong> ${v.dosage}</div>` : ''}



                ${v.labs && v.labs !== 'لا يوجد' ? `<div class="m-visit-labs">🔬 <strong>التحاليل:</strong> ${v.labs}</div>` : ''}



                ${(v.caseImage || v.clientImage || (v.labImages && v.labImages.length > 0) || v.labImage) ? `



                    <div class="m-visit-images">



                        ${v.clientImage ? `<img src="${v.clientImage}" alt="صورة العميل" class="thumb-img" title="صورة العميل" onclick="openPhotoLightbox('${v.clientImage}', 'صورة العميل')">` : ''}



                        ${v.caseImage ? `<img src="${v.caseImage}" alt="صورة الحالة" class="thumb-img" title="صورة الحالة" onclick="openPhotoLightbox('${v.caseImage}', 'صورة الحالة')">` : ''}



                        ${v.prescriptionImage ? `<img src="${v.prescriptionImage}" alt="روشتة" class="thumb-img" title="صورة الروشتة" onclick="openPhotoLightbox('${v.prescriptionImage}', 'صورة الروشتة الطبية')">` : ''}



                        ${v.labImages && v.labImages.length > 0 



                            ? v.labImages.map((imgSrc, i) => `<img src="${imgSrc}" alt="تحليل" class="thumb-img" title="اضغط لتكبير التحليل" onclick="openPhotoLightbox('${imgSrc}', 'صورة التحليل #${i + 1}')">`).join('')



                            : (v.labImage ? `<img src="${v.labImage}" alt="صورة التحليل" class="thumb-img" title="اضغط لتكبير التحليل" onclick="openPhotoLightbox('${v.labImage}', 'صورة التحليل')">` : '')}



                    </div>



                ` : ''}



            </div>



        `).join('');



    } else {



        visitsHtml = '<p class="text-muted text-center py-2">لا توجد زيارات مسجلة لهذا الملف حتى الآن.</p>';



    }



    content.innerHTML = `



        <div class="patient-modal-header-info" style="display: flex; justify-content: space-between; align-items: flex-start;">



            <div>



                <h2>🐾 ${patient.name}</h2>



                <div class="patient-meta-chips">



                    <span class="chip">${patient.type}</span>



                    <span class="chip">${patient.weight || 'الوزن غير محدد'}</span>



                    <span class="chip chip-id">ملف #${patient.id}</span>



                    ${patient.createdBy ? `<span class="chip" style="background: rgba(56, 189, 248, 0.2); border-color: rgba(56, 189, 248, 0.4); color: #bae6fd;">📝 فُتح بواسطة: ${escapeHtml(patient.createdBy)}</span>` : ''}



                </div>



                <p class="owner-line">👤 <strong>المالك:</strong> ${patient.ownerName} &bull; 📱 <strong>واتساب:</strong> ${getDisplayPhoneNumber(patient.phone)} ${isUserAdmin() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="openEditPhoneModal('${patient.id}')" style="font-size:10px; padding:2px 7px; margin-right:6px; border-radius:6px; display:inline-flex; align-items:center;">✏️ تعديل الرقم</button>` : ''}</p>



                <div style="margin-top: 8px;">



                    <a href="print_sheet.html?patient_id=${patient.id}" target="_blank" class="btn btn-outline-glass btn-sm" style="font-size:11px; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; text-decoration:none; color:#a7f3d0; border-color:#34d399; background:rgba(16,185,129,0.15);">



                        <span>🖨️</span> طباعة كشف هذا المريض (A4)



                    </a>
                    ${isUserAdmin() ? `
                    <button type="button" class="btn btn-outline-glass btn-sm" onclick="confirmDeletePatientById('${patient.id}')" style="font-size:11px; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; color:#f87171; border-color:#ef4444; background:rgba(239,68,68,0.15); margin-right:6px;">
                        <span>🗑️</span> حذف ملف المريض نهائياً (للأدمن)
                    </button>
                    ` : ''}



                </div>



            </div>



            ${patient.ownerPhoto ? `



                <div class="owner-modal-avatar" title="صورة العميل" onclick="openPhotoLightbox('${patient.ownerPhoto}', 'صورة العميل: ${patient.ownerName}')" style="cursor: pointer;">



                    <img src="${patient.ownerPhoto}" alt="صورة العميل" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">



                </div>



            ` : ''}



        </div>



        <!-- Chronic Condition Section with Manager Edit Privilege -->



        ${patient.chronicNotes ? `



            <div style="margin: 12px 0; padding: 10px 14px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 12px; color: #fee2e2; font-size: 13px;">



                <div style="display: flex; justify-content: space-between; align-items: center;">



                    <span>⚠️ <strong>حالة مزمنة / ملاحظات هامة:</strong> ${patient.chronicNotes}</span>



                    ${isStaffLoggedIn() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="openEditChronicModal('${patient.id}')" style="font-size:10px; padding:2px 8px; margin-right:8px; border-radius:6px; display:inline-flex; align-items:center;">✏️ تعديل الحالة</button>` : ''}



                </div>



            </div>



        ` : `



            <div style="margin: 12px 0; padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border: 1px dashed rgba(255,255,255,0.2); border-radius: 10px; color: var(--text-muted); font-size: 12px; display: flex; justify-content: space-between; align-items: center;">



                <span>لا توجد حالة مزمنة مسجلة</span>



                ${isStaffLoggedIn() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="openEditChronicModal('${patient.id}')" style="font-size:10px; padding:2px 8px; border-radius:6px;">➕ إضافة حالة مزمنة</button>` : ''}



            </div>



        `}



        <!-- Dual Barcode System: Client Barcode + Clinic Doctor Barcode -->



        <div style="display: flex; justify-content: center; margin: 16px 0;">



            <!-- Single Barcode: Latest Visit Report QR -->



            <div class="qr-box-center" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 14px 16px; margin: 0; max-width: 280px; width: 100%;">



                <div style="font-size: 13px; font-weight: 800; color: #34d399; margin-bottom: 6px;">🌐 باركود أحدث كشف للعميل</div>



                <div id="patientModalClientQR" style="display: flex; justify-content: center;"></div>



                <small style="display: block; font-size: 11px; color: #a7f3d0; margin-top: 6px; line-height: 1.3;">يمسحه العميل بالموبايل لفتح تقرير الكشف الأخير مباشرة بدون دخول</small>



            </div>



        </div>



        <h4 class="section-subheading">سجل الكشوفات والزيارات (${patient.visits ? patient.visits.length : 0})</h4>



        <div class="visits-history-list">



            ${visitsHtml}



        </div>



    `;



    // Generate QR Code for Latest Visit



    // QR in patient details modal removed as per v49 streamlined requirements



    overlay.style.display = 'flex';



};







// ==============================================================================



// سجل الزيارات الكامل للحالة (Patient Visit History)



// ==============================================================================



(function injectHistoryStyles() {



    if (document.getElementById('pcHistoryStyles')) return;



    const st = document.createElement('style');



    st.id = 'pcHistoryStyles';



    st.textContent = `



        .patient-card-actions { flex-wrap: wrap; gap: 8px; }



        .patient-card-actions .btn { flex: 1 1 140px; }



        .hist-summary { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 14px; }



        .hist-summary .chip { font-size:12px; }



        .hist-visit { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:12px; margin-bottom:12px; font-size:13px; line-height:1.7; }



        .hist-visit-head { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; color:#5eead4; margin-bottom:6px; }



        .hist-row b { color:#a7f3d0; }



        .hist-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }



        .hist-actions .btn { flex:1 1 120px; font-size:12px; }



        .hist-imgs { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }



    `;



    document.head.appendChild(st);



})();



function pcSortedVisits(patient) {



    return (patient.visits || []).slice().sort((a, b) => {



        const d = String(b.date || '').localeCompare(String(a.date || ''));



        return d !== 0 ? d : (b.updatedAt || 0) - (a.updatedAt || 0);



    });



}



window.showPatientHistory = function(patientId) {



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    let overlay = document.getElementById('patientHistoryModal');



    if (!overlay) {



        overlay = document.createElement('div');



        overlay.id = 'patientHistoryModal';



        overlay.className = 'full-modal-overlay';



        overlay.innerHTML = '<div class="full-modal-header"><h3 style="font-size:17px; font-weight:800;">📜 سجل الحالة والزيارات</h3><button type="button" class="btn-close-sheet" onclick="closePatientHistory()">&times;</button></div><div id="patientHistoryBody"></div>';



        const host = (document.getElementById('patientDetailsModal') || {}).parentNode || document.getElementById('appContainer') || document.body;



        host.appendChild(overlay);



    }



    const body = document.getElementById('patientHistoryBody');



    const visits = pcSortedVisits(patient);



    const total = visits.length;



    const e = escapeHtml;



    const visitsHtml = total === 0



        ? '<p class="text-muted text-center py-2">لا توجد زيارات مسجلة لهذه الحالة حتى الآن.</p>'



        : visits.map((v, i) => {



            const number = total - i;



            const imgs = [];



            if (v.caseImage) imgs.push({ src: v.caseImage, cap: 'صورة الحالة' });



            if (v.prescriptionImage) imgs.push({ src: v.prescriptionImage, cap: 'صورة الروشتة الطبية' });



            if (v.clientImage) imgs.push({ src: v.clientImage, cap: 'صورة العميل' });



            (Array.isArray(v.labImages) ? v.labImages : (v.labImage ? [v.labImage] : [])).forEach((s, k) => imgs.push({ src: s, cap: 'صورة التحليل #' + (k + 1) }));



            const labs = v.labs && v.labs !== 'لا يوجد' && v.labs !== 'لا توجد تحاليل' ? v.labs : '';



            return `



            <div class="hist-visit">



                <div class="hist-visit-head">



                    <strong>📅 ${e(v.date)} &bull; زيارة رقم ${number}</strong>



                    ${v.doctorName ? `<span class="badge-tag">👨‍⚕️ ${e(v.doctorName)}</span>` : '<span class="badge-tag">👨‍⚕️ غير مسجل</span>'}



                </div>



                <div class="hist-row">🩺 <b>التشخيص:</b> ${e(v.diagnosis) || '-'}</div>



                <div class="hist-row">💊 <b>العلاج:</b> ${e(v.treatment) || '-'}</div>



                ${v.dosage ? `<div class="hist-row">⏱️ <b>الجرعة:</b> ${e(v.dosage)}</div>` : ''}



                ${labs ? `<div class="hist-row">🔬 <b>التحاليل:</b> ${e(labs)}</div>` : ''}



                ${v.chronicNotes ? `<div class="hist-row">⚠️ <b>حالة مزمنة/ملاحظات:</b> ${e(v.chronicNotes)}</div>` : ''}



                ${v.followUpDate ? `<div class="hist-row">🗓️ <b>موعد الإعادة:</b> ${e(v.followUpDate)}${v.followUpDays ? ' (بعد ' + e(v.followUpDays) + ' يوم)' : ''}</div>` : ''}



                ${v.updatedBy ? `<div class="hist-row" style="color:#fcd34d; font-size:11px;">✏️ آخر تعديل بواسطة: ${e(v.updatedBy)}</div>` : ''}



                ${imgs.length ? `<div class="hist-imgs">${imgs.map(im => `<img class="thumb-img" src="${im.src}" alt="${e(im.cap)}" title="${e(im.cap)}" onclick="openPhotoLightbox(this.src, '${e(im.cap)}')">`).join('')}</div>` : ''}



                <div class="hist-actions">



                    <button type="button" class="btn btn-outline-glass btn-sm" onclick="openVisitFromHistory('${e(patient.id)}', '${e(v.id)}')">📤 باركود وواتساب</button>

                    <button type="button" class="btn btn-outline-glass btn-sm" onclick="deleteVisitFromHistory('${e(patient.id)}', '${e(v.id)}')" style="color: #f87171; border-color: rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.1);" title="حذف هذا الكشف">🗑️ حذف</button>



                </div>



            </div>`;



        }).join('');



    const first = total ? visits[total - 1].date : '-';



    const last = total ? visits[0].date : '-';



    body.innerHTML = `



        <div class="patient-modal-header-info" style="text-align:right;">



            <h2>🐾 ${e(patient.name)} <small style="font-size:12px;">#${e(patient.id)}</small></h2>



            <div class="hist-summary">



                <span class="chip">${e(patient.type)}</span>



                <span class="chip">${e(patient.weight || 'الوزن غير محدد')}</span>



                <span class="chip">👤 ${e(patient.ownerName)}</span>



                <span class="chip">📞 ${e(getDisplayPhoneNumber(patient.phone))}</span>



                <span class="chip chip-id">إجمالي الزيارات: ${total}</span>



                <span class="chip">أول زيارة: ${e(first)}</span>



                <span class="chip">آخر زيارة: ${e(last)}</span>



                ${patient.createdBy ? `<span class="chip">فتح الملف: ${e(patient.createdBy)}</span>` : ''}



            </div>



            ${patient.chronicNotes ? `<div style="padding:10px 14px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:12px; color:#fee2e2; font-size:13px;">⚠️ <strong>حالة مزمنة / ملاحظات هامة:</strong> ${e(patient.chronicNotes)}</div>` : ''}



            <div class="hist-actions">



                <button type="button" class="btn btn-primary-glass btn-sm" onclick="closePatientHistory(); startVisitForPatient('${e(patient.id)}')">🩺 كشف جديد</button>



                <a class="btn btn-outline-glass btn-sm" style="text-decoration:none; text-align:center;" target="_blank" href="print_sheet.html?patient_id=${encodeURIComponent(patient.id)}">🖨️ طباعة السجل (A4)</a>



            </div>



        </div>



        <h4 class="section-subheading">كل الزيارات من الأحدث للأقدم (${total})</h4>



        ${visitsHtml}



    `;



    overlay.style.display = 'flex';



};



window.closePatientHistory = function() {



    const overlay = document.getElementById('patientHistoryModal');



    if (overlay) overlay.style.display = 'none';



};



window.openVisitFromHistory = function(patientId, visitId) {



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    const visit = (patient.visits || []).find(v => String(v.id) === String(visitId));



    if (!visit) return;



    closePatientHistory();



    openVisitSuccessBottomSheet({ patient, visit });



};







window.closePatientDetailsModal = function() {



    const overlay = document.getElementById('patientDetailsModal');



    if (overlay) overlay.style.display = 'none';



};



/**



 * ==============================================================================



 * WhatsApp Follow-up Radar Module (رادار رسايل واتساب لمتابعة الحالات)



 * ==============================================================================



 */



window.currentRadarFilter = 'tomorrow';



let radarBatchQueue = [];



let radarBatchIndex = 0;



let isRadarBatchActive = false;



let radarSentPatientIds = new Set();



let radarReturnTimer = null;



function initRadarModule() {



    console.log("📡 Initializing WhatsApp Follow-up Radar Module...");



    // 1. Filter Buttons



    const btnTomorrow = document.getElementById('filterTomorrowBtn');



    const btnToday = document.getElementById('filterTodayBtn');



    const btnUpcoming = document.getElementById('filterUpcomingBtn');



    const btnMonth = document.getElementById('filterMonthBtn');



    if (btnTomorrow) {



        btnTomorrow.addEventListener('click', () => switchRadarFilter('tomorrow'));



    }



    if (btnToday) {



        btnToday.addEventListener('click', () => switchRadarFilter('today'));



    }



    if (btnUpcoming) {



        btnUpcoming.addEventListener('click', () => switchRadarFilter('upcoming'));



    }



    if (btnMonth) {



        btnMonth.addEventListener('click', () => switchRadarFilter('month'));



    }



    // 2. Single-Button Batch Send



    const btnBatch = document.getElementById('btnBatchSendRadar');



    if (btnBatch) {



        btnBatch.addEventListener('click', startBatchWhatsAppDispatch);



    }



    // 3. Test Midnight Notification



    const btnTestNotif = document.getElementById('btnTestRadarNotif');



    if (btnTestNotif) {



        btnTestNotif.addEventListener('click', () => {



            if (window.AndroidRadar && typeof window.AndroidRadar.showTestNotification === 'function') {



                window.AndroidRadar.showTestNotification();



            } else {



                alert('🔔 إشعار تجريبي: تم فحص رادار المتابعة بنجاح! في تطبيق أندرويد يظهر في شريط الإشعارات الساعة 12 منتصف الليل.');



            }



        });



    }



    // 4. Batch Modal Actions



    const btnNextBatch = document.getElementById('btnNextBatchClient');



    if (btnNextBatch) {



        btnNextBatch.addEventListener('click', () => {



            if (radarReturnTimer) clearTimeout(radarReturnTimer);



            advanceBatchToNext();



        });



    }



    const btnCancelBatch = document.getElementById('btnCancelBatch');



    if (btnCancelBatch) {



        btnCancelBatch.addEventListener('click', cancelBatchDispatch);



    }



    // 5. Auto-advance listener when returning from WhatsApp



    window.addEventListener('focus', onReturnFromWhatsAppWindow);



    document.addEventListener('visibilitychange', () => {



        if (!document.hidden) {



            onReturnFromWhatsAppWindow();



        }



    });



    // 6. Schedule Midnight Radar via Native Bridge if available



    try {



        if (window.AndroidRadar && typeof window.AndroidRadar.scheduleMidnightRadar === 'function') {



            window.AndroidRadar.scheduleMidnightRadar();



        }



    } catch (e) {



        console.warn('Native AndroidRadar bridge schedule error:', e);



    }



    // 7. Initial Badge and Cards Render



    updateRadarBadges();



    renderRadarCards(window.currentRadarFilter);



    // 8. Auto-refresh badges every 5 minutes



    setInterval(updateRadarBadges, 300000);



}



function switchRadarFilter(filterType) {



    window.currentRadarFilter = filterType;



    // Update active tab styles



    const filterBtns = document.querySelectorAll('.btn-radar-filter');



    filterBtns.forEach(btn => {



        if (btn.getAttribute('data-filter') === filterType) {



            btn.classList.add('active');



        } else {



            btn.classList.remove('active');



        }



    });



    // Update batch button label based on filter



    const batchMainText = document.getElementById('btnBatchMainText');



    if (batchMainText) {



        if (filterType === 'tomorrow') {



            batchMainText.textContent = 'إرسال كل رسائل متابعة بكرة بزرار واحد';



        } else if (filterType === 'today') {



            batchMainText.textContent = 'إرسال كل رسائل متابعة اليوم بزرار واحد';



        } else if (filterType === 'month') {



            batchMainText.textContent = 'إرسال كل رسائل متابعة الشهر بزرار واحد';



        } else {



            batchMainText.textContent = 'إرسال كل رسائل المتابعة القادمة بزرار واحد';



        }



    }



    renderRadarCards(filterType);



}



function updateRadarBadges() {



    if (!window.petiCareData) return;



    const tomorrowList = window.petiCareData.getRadarFollowUps('tomorrow');



    const todayList = window.petiCareData.getRadarFollowUps('today');



    const upcomingList = window.petiCareData.getRadarFollowUps('upcoming');



    const monthList = window.petiCareData.getRadarFollowUps('month');



    // Update counters in filter buttons



    const countTomorrowEl = document.getElementById('radarCountTomorrow');



    if (countTomorrowEl) countTomorrowEl.textContent = tomorrowList.length;



    const countTodayEl = document.getElementById('radarCountToday');



    if (countTodayEl) countTodayEl.textContent = todayList.length;



    const countUpcomingEl = document.getElementById('radarCountUpcoming');



    if (countUpcomingEl) countUpcomingEl.textContent = upcomingList.length;



    const countMonthEl = document.getElementById('radarCountMonth');



    if (countMonthEl) countMonthEl.textContent = monthList.length;



    // Update Bottom Nav Badge



    const navBadge = document.getElementById('navRadarBadge');



    if (navBadge) {



        if (tomorrowList.length > 0) {



            navBadge.textContent = tomorrowList.length;



            navBadge.style.display = 'block';



        } else {



            navBadge.style.display = 'none';



        }



    }



    // Update Header Top Alert Banner



    const headerAlert = document.getElementById('radarHeaderAlert');



    const alertCountEl = document.getElementById('radarAlertCount');



    if (headerAlert && alertCountEl) {



        if (tomorrowList.length > 0) {



            alertCountEl.textContent = tomorrowList.length;



            headerAlert.style.display = 'flex';



        } else {



            headerAlert.style.display = 'none';



        }



    }



}



function formatWhatsAppReminderMessage(patient, visit, isToday) {



    const timeWord = isToday ? 'اليوم' : 'غداً بإذن الله';



    const petName = patient.name || 'أليفكم';



    const ownerName = patient.ownerName ? `أستاذ/ة ${patient.ownerName}` : 'عزيزنا العميل';



    let msg = `السلام عليكم ورحمة الله 🌸\n`;



    msg += `مرحباً ${ownerName}، مع حضرتك دكتور مستشفى بيتي كير البيطري (PetiCare Animal Hospital) 🐾\n\n`;



    msg += `نود الاطمئنان على صحة البطل (${petName}) ❤️\n`;



    msg += `ونود تذكيركم بموعد كشف الإعادة والمتابعة المحدد ${timeWord} (${visit.followUpDate}).\n\n`;



    if (visit.diagnosis) {



        msg += `🩺 التشخيص السابق: ${visit.diagnosis}\n`;



    }



    if (visit.treatment) {



        msg += `💊 العلاج الموصى به: ${visit.treatment}\n\n`;



    } else {



        msg += `\n`;



    }



    msg += `يسعدنا تشريفكم للمستشفى للاطمئنان التام على حالته والتأكد من تمام شفائه 🏥\n`;



    msg += `دمتم ودام أليفكم بألف صحة وسلامة! ✨`;



    return msg;



}



function formatWhatsAppMonthCheckinMessage(patient, visit, diffDays) {



    const petName = patient.name || 'أليفكم';



    const ownerName = patient.ownerName ? `أستاذ/ة ${patient.ownerName}` : 'عزيزنا العميل';



    let msg = `السلام عليكم ورحمة الله وبركاته 🌸\n`;



    msg += `أهلاً بحضرتك ${ownerName}، مع حضرتك دكتور مستشفى بيتي كير البيطري (PetiCare Animal Hospital) 🐾\n\n`;



    msg += `مر شهر تقريباً على زيارة البطل (${petName}) 🐶🐱 لمستشفانا (${visit.date}).\n`;



    msg += `وحبينا نطمن عليه جداً ونسأل عن أخباره وصحته دلوقتي! ❤️\n\n`;



    if (visit.diagnosis) {



        msg += `🩺 بخصوص الحالة السابقة: (${visit.diagnosis})\n`;



    }



    msg += `يا رب يكون بأفضل صحة وحال دائماً ✨\n`;



    msg += `لو محتاج أي استشارة أو فحص دوري أو تطعيمات، إحنا دايماً في خدمتكم 🏥🐾\n`;



    msg += `مع أطيب تمنياتنا، مستشفى بيتي كير البيطري 💖`;



    return msg;



}



function renderRadarCards(filterType) {



    const container = document.getElementById('radarCardsContainer');



    if (!container) return;



    if (!window.petiCareData) {



        container.innerHTML = '<p class="text-muted text-center py-4">جاري تحميل البيانات...</p>';



        return;



    }



    const items = window.petiCareData.getRadarFollowUps(filterType);



    if (items.length === 0) {



        let label = 'غداً';



        if (filterType === 'today') label = 'اليوم';



        else if (filterType === 'month') label = 'مر عليها شهر (أول زوار الشهر)';



        else if (filterType === 'upcoming') label = 'في الأيام القادمة';



        container.innerHTML = `



            <div style="text-align: center; padding: 40px 20px; background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">



                <div style="font-size: 46px; margin-bottom: 12px;">🌿</div>



                <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">لا توجد حالات مستحقة ${label}</h3>



                <p style="font-size: 12px; color: var(--text-muted); margin: 0;">جميع الحالات متابعة بالكامل ولا توجد زيارات مسجلة لهذه الفئة.</p>



            </div>



        `;



        return;



    }



    container.innerHTML = items.map(item => {



        const p = item.patient;



        const v = item.visit;



        const todayRadarStr = (typeof getRelativeDateStr === 'function') ? getRelativeDateStr(0) : new Date().toISOString().split('T')[0];



        const isSent = (p.lastWhatsAppSentDate === todayRadarStr) || radarSentPatientIds.has(p.id);



        const msgText = item.isMonthCheckin 



            ? formatWhatsAppMonthCheckinMessage(p, v, item.diffDays)



            : formatWhatsAppReminderMessage(p, v, item.isToday);



        const escapedMsg = encodeURIComponent(msgText);



        let badgeClass = 'radar-due-badge';



        let badgeLabel = item.isMonthCheckin 



            ? `🗓️ مر شهر (${item.diffDays} يوم) - أول زوار الشهر`



            : `📅 إعادة: ${v.followUpDate}`;



        if (item.isTomorrow) {



            badgeClass += ' tomorrow';



            badgeLabel = '✨ بكرة إن شاء الله';



        } else if (item.isToday) {



            badgeLabel = '☀️ اليوم!';



        } else if (item.isMonthCheckin) {



            badgeClass += ' tomorrow';



        }



        const avatarContent = p.ownerPhoto



            ? `<img src="${p.ownerPhoto}" alt="${p.name}" class="radar-avatar" style="border-radius: 50%; object-fit: cover;">`



            : `<div class="radar-avatar">🐾</div>`;



        return `



            <div id="radar-card-${p.id}" class="radar-client-card ${isSent ? 'sent' : ''}">



                <div class="radar-client-header">



                    <div class="radar-pet-info">



                        ${avatarContent}



                        <div class="radar-pet-names">



                            <h3>🐾 ${p.name} (${p.type || 'أليف'})</h3>



                            <p>👤 <strong>المالك:</strong> ${p.ownerName || 'غير مسجل'} &bull; 📱 ${p.phone ? getDisplayPhoneNumber(p.phone) : 'بدون هاتف'} ${isUserAdmin() ? `<button type="button" class="btn btn-outline-glass btn-sm" onclick="openEditPhoneModal('${p.id}')" style="font-size:10px; padding:1px 6px; margin-right:6px; border-radius:6px; display:inline-flex; align-items:center;">✏️ تعديل</button>` : ''}</p>



                        </div>



                    </div>



                    <span class="${badgeClass}">${badgeLabel}</span>



                </div>



                <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">



                    🩺 <strong>التشخيص:</strong> ${v.diagnosis || 'فحص عام'} &bull; 💊 <strong>العلاج:</strong> ${v.treatment || 'متابعة'}



                </div>



                <!-- Pre-drafted WhatsApp message preview -->



                <div class="radar-msg-preview-box" id="radar-msg-box-${p.id}">



                    <div style="font-size: 11px; font-weight: 800; color: #5eead4; margin-bottom: 4px;">💬 نص الرسالة المجهز تلقائياً:</div>



                    ${msgText.replace(/\n/g, '<br>')}



                </div>



                <!-- Action Buttons -->



                <div class="radar-actions-row">



                    <button type="button" class="btn-radar-send" onclick="sendSingleWhatsAppRadar('${p.id}', '${v.id}', ${item.isToday ? 'true' : 'false'}, ${item.isMonthCheckin ? 'true' : 'false'}, ${item.diffDays || 30})">



                        <span>${isSent ? '✅ تم الإرسال مسبقاً' : '📲 إرسال واتساب مباشر'}</span>



                    </button>



                    <button type="button" class="btn-radar-copy" onclick="copyRadarMessage('${p.id}', '${escapedMsg}', this)">



                        <span>📋 نسخ النص</span>



                    </button>



                </div>



            </div>



        `;



    }).join('');



}



window.sendSingleWhatsAppRadar = function(patientId, visitId, isToday, isMonthCheckin, diffDays) {



    if (!window.petiCareData) return;



    const patient = window.petiCareData.getPatientById(patientId);



    if (!patient) return;



    const visit = (patient.visits || []).find(v => v.id === visitId) || (patient.visits || [])[0];



    if (!visit) return;



    openWhatsAppForPatient(patient, visit, isToday, isMonthCheckin, diffDays);



};



window.copyRadarMessage = function(patientId, encodedText, btn) {



    try {



        const text = decodeURIComponent(encodedText);



        navigator.clipboard.writeText(text).then(() => {



            const original = btn.innerHTML;



            btn.innerHTML = '<span>✅ تم النسخ</span>';



            setTimeout(() => { btn.innerHTML = original; }, 2000);



        }).catch(() => {



            prompt('انسخ نص الرسالة:', decodeURIComponent(encodedText));



        });



    } catch (e) {



        prompt('انسخ نص الرسالة:', decodeURIComponent(encodedText));



    }



};



function openWhatsAppForPatient(patient, visit, isToday, isMonthCheckin, diffDays) {



    if (!patient || !patient.phone) {



        alert('رقم هاتف المالك غير مسجل في ملف هذا المريض!');



        return false;



    }



    const message = isMonthCheckin 



        ? formatWhatsAppMonthCheckinMessage(patient, visit, diffDays)



        : formatWhatsAppReminderMessage(patient, visit, isToday);



    let cleanPhone = normalizeEgyptPhone(patient.phone);



    // Mark as sent & persist lastWhatsAppSentDate to prevent duplicate sending on same day



    const todayRadarStr = (typeof getRelativeDateStr === 'function') ? getRelativeDateStr(0) : new Date().toISOString().split('T')[0];



    patient.lastWhatsAppSentDate = todayRadarStr;



    if (window.petiCareData && typeof window.petiCareData.savePatient === 'function') {



        window.petiCareData.savePatient(patient);



    }



    radarSentPatientIds.add(patient.id);



    // Update card styling



    const card = document.getElementById(`radar-card-${patient.id}`);



    if (card) {



        card.classList.add('sent');



        const sendBtn = card.querySelector('.btn-radar-send');



        if (sendBtn) {



            sendBtn.innerHTML = '<span>✅ تم الفتح والإرسال</span>';



            sendBtn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';



        }



    }



    // Dispatch via Native Android Bridge or Browser URL



    if (window.AndroidRadar && typeof window.AndroidRadar.openWhatsAppDirect === 'function') {



        window.AndroidRadar.openWhatsAppDirect(cleanPhone, message);



    } else {



        const encoded = encodeURIComponent(message);



        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;



        window.open(url, '_blank');



    }



    return true;



}



/**



 * Single-Button Sequential Dispatch Engine



 * "وبزرار واحد يبعت الرسايل كلها"



 */



async function startBatchWhatsAppDispatch() {
    if (!window.petiCareData) return;
    const items = window.petiCareData.getRadarFollowUps(window.currentRadarFilter || 'tomorrow');
    if (items.length === 0) {
        alert('لا توجد مواعيد إعادة مستحقة للإرسال في هذا التبويب.');
        return;
    }
    const validItems = items.filter(it => it.patient && it.patient.phone && it.patient.phone.trim().length > 5);
    if (validItems.length === 0) {
        alert('جميع العملاء في القائمة ليس لديهم أرقام هواتف مسجلة.');
        return;
    }

    const phoneId = localStorage.getItem('peticare_meta_phone_id') || '';
    const token = localStorage.getItem('peticare_meta_access_token') || '';

    // If Meta Cloud API is configured, run background batch with 350ms throttle delay (Safeguard 4)
    if (phoneId && token) {
        const modal = document.getElementById('batchRadarModal');
        if (modal) modal.style.display = 'flex';
        const pBar = document.getElementById('batchProgressBar');
        const statusEl = document.getElementById('batchModalStatusText');
        const clientInfoEl = document.getElementById('batchClientInfo');

        let sentCount = 0;
        const todayStr = getCairoDateString();

        for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i];
            const p = item.patient;
            const v = item.visit;
            const progress = Math.round(((i + 1) / validItems.length) * 100);

            if (pBar) pBar.style.width = `${progress}%`;
            if (statusEl) statusEl.textContent = `جاري الإرسال عبر السيرفر (${i + 1} من ${validItems.length})...`;
            if (clientInfoEl) clientInfoEl.textContent = `${p.name} (المالك: ${p.ownerName || 'بدون اسم'})`;

            const message = item.isMonthCheckin 
                ? formatWhatsAppMonthCheckinMessage(p, v, item.diffDays || 30)
                : formatWhatsAppReminderMessage(p, v, item.isToday);

            const res = await sendMetaWhatsAppMessage(p.phone, message);
            if (res && res.ok) {
                sentCount++;
                p.lastWhatsAppSentDate = todayStr;
                window.petiCareData.savePatient(p);
                radarSentPatientIds.add(p.id);

                const card = document.getElementById(`radar-card-${p.id}`);
                if (card) {
                    card.classList.add('sent');
                    const sendBtn = card.querySelector('.btn-radar-send');
                    if (sendBtn) {
                        sendBtn.innerHTML = '<span>✅ تم الإرسال آلياً</span>';
                        sendBtn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                    }
                }
            }

            // Safeguard 4: 350ms throttle delay between outbound messages
            if (i < validItems.length - 1) {
                await new Promise(r => setTimeout(r, 350));
            }
        }

        // Trigger multi-device cloud sync
        if (window.PetiCareCloud && typeof window.PetiCareCloud.syncAllCloudData === 'function') {
            window.PetiCareCloud.syncAllCloudData();
        }

        if (statusEl) statusEl.textContent = `🎉 تم إرسال (${sentCount}) رسائل بنجاح عبر السيرفر!`;
        setTimeout(() => {
            if (modal) modal.style.display = 'none';
        }, 1500);
        return;
    }

    // Interactive fallback
    radarBatchQueue = validItems;
    radarBatchIndex = 0;
    isRadarBatchActive = true;
    const modal = document.getElementById('batchRadarModal');
    if (modal) modal.style.display = 'flex';
    dispatchBatchItem(0);
}



function dispatchBatchItem(index) {



    if (index >= radarBatchQueue.length) {



        finishBatchDispatch();



        return;



    }



    const item = radarBatchQueue[index];



    const p = item.patient;



    const v = item.visit;



    // Update modal UI



    const progressPercent = Math.round(((index + 1) / radarBatchQueue.length) * 100);



    const pBar = document.getElementById('batchProgressBar');



    if (pBar) pBar.style.width = `${progressPercent}%`;



    const statusEl = document.getElementById('batchModalStatusText');



    if (statusEl) {



        statusEl.textContent = `جاري فتح محادثة العميل (${index + 1} من ${radarBatchQueue.length})... اضغط إرسال في واتساب ثم ارجع للتطبيق.`;



    }



    const clientInfoEl = document.getElementById('batchClientInfo');



    if (clientInfoEl) {



        clientInfoEl.textContent = `عميل ${index + 1} من ${radarBatchQueue.length}: ${p.name} (المالك: ${p.ownerName || 'بدون اسم'})`;



    }



    // Open WhatsApp for this patient



    openWhatsAppForPatient(p, v, item.isToday, item.isMonthCheckin, item.diffDays || 30);



}



function onReturnFromWhatsAppWindow() {



    if (!isRadarBatchActive) return;



    const statusEl = document.getElementById('batchModalStatusText');



    if (statusEl) {



        statusEl.textContent = '✅ ممتاز! جاري الانتقال للعميل التالي تلقائياً خلال ثانيتين...';



    }



    if (radarReturnTimer) clearTimeout(radarReturnTimer);



    radarReturnTimer = setTimeout(() => {



        advanceBatchToNext();



    }, 1800);



}



function advanceBatchToNext() {



    if (!isRadarBatchActive) return;



    radarBatchIndex++;



    if (radarBatchIndex < radarBatchQueue.length) {



        dispatchBatchItem(radarBatchIndex);



    } else {



        finishBatchDispatch();



    }



}



function finishBatchDispatch() {



    isRadarBatchActive = false;



    if (radarReturnTimer) clearTimeout(radarReturnTimer);



    const statusEl = document.getElementById('batchModalStatusText');



    if (statusEl) {



        statusEl.textContent = '🎉 تم إرسال كافة رسائل المتابعة بنجاح!';



    }



    const clientInfoEl = document.getElementById('batchClientInfo');



    if (clientInfoEl) {



        clientInfoEl.textContent = `تم الانتهاء من جميع العملاء (${radarBatchQueue.length} من ${radarBatchQueue.length}) بنسبة 100% ✨`;



    }



    const pBar = document.getElementById('batchProgressBar');



    if (pBar) pBar.style.width = '100%';



    setTimeout(() => {



        const modal = document.getElementById('batchRadarModal');



        if (modal) modal.style.display = 'none';



        updateRadarBadges();



        renderRadarCards(window.currentRadarFilter);



    }, 2000);



}



function cancelBatchDispatch() {



    isRadarBatchActive = false;



    if (radarReturnTimer) clearTimeout(radarReturnTimer);



    const modal = document.getElementById('batchRadarModal');



    if (modal) modal.style.display = 'none';



    updateRadarBadges();



}



/**



 * ==============================================================================



 * Clinic Store Module (موديول متجر العيادة والمنتجات)



 * ==============================================================================



 */



// ==============================================================================



// CLINIC STORE & PRODUCT CATALOG SYSTEM (متجر وأصناف العيادة)



// ==============================================================================



let isStoreRecognizing = false;



let uploadedProductImage = '';



let currentStoreCategoryFilter = 'all';







function getStoreCategories() {



    if (window.petiCareData && typeof window.petiCareData.getCategories === 'function') {



        return window.petiCareData.getCategories();



    }



    return [



        { name: 'أغذية ودراي فود', icon: '🥫' },



        { name: 'عناية ونظافة', icon: '🛁' },



        { name: 'أدوية وعلاجات', icon: '💊' },



        { name: 'مكملات وفيتامينات', icon: '🧪' },



        { name: 'مستلزمات وإكسسوارات', icon: '🎀' },



        { name: 'عام / أخرى', icon: '📦' }



    ];



}







function matchStoreCategory(text) {



    if (!text) return 'عام / أخرى';



    const t = text.trim().toLowerCase();



    const cats = getStoreCategories();



    for (const cat of cats) {



        if (t.includes(cat.name.toLowerCase())) {



            return cat.name;



        }



    }



    const keywordsMap = {



        'أغذية': ['أغذية', 'اغذية', 'طعام', 'اكل', 'أكل', 'دراي فود', 'درايفود', 'دراي', 'تريتس', 'وجبات', 'معلبات', 'ويت فود', 'رويال'],



        'عناية': ['عناية', 'نظافة', 'شامبو', 'دراي كلين', 'صابون', 'فرشاة', 'منظف', 'رمل', 'ليتر بوكس', 'حشرات', 'سبراي'],



        'أدوية': ['أدوية', 'ادوية', 'علاج', 'علاجات', 'دواء', 'دوا', 'حقن', 'مضاد', 'مرهم', 'قطرة', 'تحصين', 'بنسلين'],



        'مكملات': ['مكملات', 'مكمل', 'فيتامينات', 'فيتامين', 'كالسيوم', 'تونيك', 'منشط', 'اوميجا', 'أوميجا'],



        'مستلزمات': ['مستلزمات', 'إكسسوارات', 'اكسسوارات', 'طوق', 'سلسلة', 'قفص', 'بوكس', 'العاب', 'ألعاب', 'سرير', 'صحن']



    };



    for (const cat of cats) {



        for (const [key, kws] of Object.entries(keywordsMap)) {



            if (cat.name.includes(key)) {



                for (const kw of kws) {



                    if (t.includes(kw)) return cat.name;



                }



            }



        }



    }



    return 'عام / أخرى';



}







function getStoreCategoryIcon(catName) {



    const cats = getStoreCategories();



    const found = cats.find(c => c.name === catName);



    return found ? (found.icon || '📦') : '📦';



}







function populateProductCategorySelect() {



    const select = document.getElementById('productCategory');



    if (!select) return;



    const cats = getStoreCategories();



    const currentVal = select.value;



    select.innerHTML = cats.map(c => `



        <option value="${escapeHtml(c.name)}">${c.icon || '📦'} ${escapeHtml(c.name)}</option>



    `).join('');



    if (currentVal && cats.some(c => c.name === currentVal)) {



        select.value = currentVal;



    }



}



function initStoreModule() {



    console.log("🛒 Initializing Clinic Store Module with Category Support...");



    populateProductCategorySelect();



    setupProductForm();



    setupProductImagePicker();



    initStoreVoice();



    renderProductsList();



}



function setupProductForm() {



    const form = document.getElementById('formNewProduct');



    const saveBtn = document.getElementById('btnSaveProduct');



    if (form) {



        form.onsubmit = window.handleSaveNewProduct;



    }



    if (saveBtn) {



        saveBtn.onclick = window.handleSaveNewProduct;



    }



}



window.handleSaveNewProduct = function(e) {



    if (e && e.preventDefault) e.preventDefault();



    const nameInput = document.getElementById('productName');



    const priceInput = document.getElementById('productPrice');



    const catSelect = document.getElementById('productCategory');



    const name = nameInput ? nameInput.value.trim() : '';



    let rawPrice = priceInput ? priceInput.value.trim() : '';



    const category = catSelect ? catSelect.value.trim() : 'عام / أخرى';



    // Convert Arabic numerals (٠-٩) to Western (0-9)



    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];



    for (let i = 0; i < 10; i++) {



        rawPrice = rawPrice.split(arabicDigits[i]).join(String(i));



    }



    rawPrice = rawPrice.replace(/[^0-9.]/g, '');



    const price = parseFloat(rawPrice);



    if (!name) {



        showToast('يرجى كتابة أو إملاء اسم الصنف أولاً', 'warning');



        if (nameInput) nameInput.focus();



        return;



    }



    if (isNaN(price) || price <= 0) {



        showToast('يرجى إدخال أو إملاء سعر صحيح للصنف (مثال: 450 أو ٤٥٠)', 'warning');



        if (priceInput) priceInput.focus();



        return;



    }



    const newProduct = window.petiCareData.addProduct({



        name: name,



        price: price,



        category: category,



        image: uploadedProductImage || ''



    });



    // Reset inputs



    if (nameInput) nameInput.value = '';



    if (priceInput) priceInput.value = '';



    if (catSelect) catSelect.selectedIndex = 0;



    uploadedProductImage = '';



    const previewBox = document.getElementById('productImgPreview');



    if (previewBox) previewBox.style.display = 'none';



    const label = document.getElementById('btnProductImgLabel');



    if (label) label.textContent = 'رفع صورة الصنف';



    const trigger = document.getElementById('btnUploadProductImg');



    if (trigger) trigger.classList.remove('has-file');



    const statusEl = document.getElementById('storeVoiceStatus');



    if (statusEl) {



        statusEl.textContent = '⏹️ مايك المتجر في وضع الاستعداد';



        statusEl.className = 'store-voice-status';



    }



    // Switch view to 'all' so new item is visible immediately



    currentStoreCategoryFilter = 'all';



    renderProductsList();



    showToast(`✅ تم إضافة "${newProduct.name}" إلى قسم [${newProduct.category}] بنجاح (${newProduct.price} ج.م)!`, 'success');



    // Smoothly scroll down to the new product card



    setTimeout(() => {



        const newCard = document.getElementById(`product-card-${newProduct.id}`);



        if (newCard) {



            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });



            newCard.style.outline = '2px solid #34d399';



            newCard.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.45)';



            setTimeout(() => {



                newCard.style.outline = 'none';



                newCard.style.boxShadow = '';



            }, 2500);



        }



    }, 150);



};



function setupProductImagePicker() {



    const trigger = document.getElementById('btnUploadProductImg');



    const input = document.getElementById('productImageInput');



    const previewBox = document.getElementById('productImgPreview');



    const removeBtn = document.getElementById('btnRemoveProductImg');



    const label = document.getElementById('btnProductImgLabel');



    if (trigger && input) {



        trigger.addEventListener('click', () => input.click());



    }



    if (input) {



        input.addEventListener('change', (e) => {



            const file = e.target.files[0];



            if (!file) return;



            compressImageFile(file, (base64) => {



                uploadedProductImage = base64;



                if (previewBox) {



                    const imgElem = previewBox.querySelector('img');



                    if (imgElem) imgElem.src = base64;



                    previewBox.style.display = 'flex';



                }



                if (label) label.textContent = 'تم إرفاق الصورة ✓';



                if (trigger) trigger.classList.add('has-file');



            });



        });



    }



    if (removeBtn) {



        removeBtn.addEventListener('click', (e) => {



            e.stopPropagation();



            uploadedProductImage = '';



            if (input) input.value = '';



            if (previewBox) previewBox.style.display = 'none';



            if (label) label.textContent = 'رفع صورة الصنف';



            if (trigger) trigger.classList.remove('has-file');



        });



    }



}



/**



 * Intelligent Store Voice Dictation & Parser



 * Supports: "اسم الصنف [الاسم] والسعر [السعر] والقسم [القسم]"



 */



function parseStoreSpeech(rawText) {



    if (!rawText) return { name: '', price: '', category: 'عام / أخرى' };



    let text = rawText.trim();



    // Normalize Eastern Arabic numbers ٠-٩ to 0-9



    text = text.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));



    // 1. Extract explicit category if mentioned: والقسم كذا / قسم كذا / تصنيف كذا / في قسم كذا



    let explicitCatText = '';



    let textWithoutCat = text;



    const catMatch = text.match(/(?:و?القسم|و?قسم(?:ه|ها)?|و?تصنيف(?:ه|ها)?|في\s*قسم)\s*[:\-،,\s]+([^\d]+?)(?:\s*(?:و?السعر|و?سعره|و?صنف|و?منتج|تمام|$))/i);



    if (catMatch) {



        explicitCatText = catMatch[1].trim();



        textWithoutCat = text.slice(0, catMatch.index) + ' ' + text.slice(catMatch.index + catMatch[0].length);



    } else {



        const endCatMatch = text.match(/(?:و?القسم|و?قسم(?:ه|ها)?|و?تصنيف)\s*[:\-،,\s]+(.+)$/i);



        if (endCatMatch) {



            explicitCatText = endCatMatch[1].trim();



            textWithoutCat = text.slice(0, endCatMatch.index);



        }



    }



    // 2. Extract Price



    let productPrice = '';



    let textWithoutPrice = textWithoutCat;



    const priceMatch = textWithoutCat.match(/(?:و?سعره|و?سعر|و?سعرو|و?ثمنه|و?قيمته|و?بمبلغ|و?بـ|و?السعر)\s*[:\-،,\s]*(?:هو|هي|حوالي)?\s*(\d+(?:\.\d+)?)/i);



    if (priceMatch) {



        productPrice = priceMatch[1];



        textWithoutPrice = textWithoutCat.slice(0, priceMatch.index) + ' ' + textWithoutCat.slice(priceMatch.index + priceMatch[0].length);



    } else {



        const numMatch = textWithoutCat.match(/\b(\d+(?:\.\d+)?)\s*(?:ج\.م|جنيه|جنية)?\b/);



        if (numMatch) {



            productPrice = numMatch[1];



            textWithoutPrice = textWithoutCat.slice(0, numMatch.index) + ' ' + textWithoutCat.slice(numMatch.index + numMatch[0].length);



        } else {



            productPrice = parseArabicPriceWords(textWithoutCat);



        }



    }



    // 3. Extract Product Name



    let productName = textWithoutPrice.trim();



    productName = productName.replace(/^(?:اسم\s*الصنف|اسم\s*المنتج|الصنف|صنف|منتج|المنتج|سجل\s*صنف|سجل\s*منتج|اضف\s*منتج|أضف\s*صنف|أضف\s*منتج)\s*[:\-،,\s]*/i, '');



    productName = productName.replace(/(?:جنيه|جنية|ج\.م)\s*/gi, '');



    productName = productName.replace(/^(?:و|مع|في)\s+/, '').trim();



    productName = productName.replace(/\s+ب(?:ـ)?$/, '').trim();



    productName = productName.replace(/^[:\-،,\s]+/, '').replace(/[:\-،,\s]+$/, '').trim();



    // Determine category



    let finalCat = 'عام / أخرى';



    if (explicitCatText) {



        finalCat = matchStoreCategory(explicitCatText);



    }



    if (finalCat === 'عام / أخرى' && productName) {



        finalCat = matchStoreCategory(productName);



    }



    // Populate form fields directly in real-time



    const nameInput = document.getElementById('productName');



    const priceInput = document.getElementById('productPrice');



    const catSelect = document.getElementById('productCategory');



    if (nameInput && productName) {



        nameInput.value = productName;



        flashHighlightField(nameInput);



    }



    if (priceInput && productPrice) {



        priceInput.value = productPrice;



        flashHighlightField(priceInput);



    }



    if (catSelect && finalCat && finalCat !== 'عام / أخرى') {



        catSelect.value = finalCat;



        flashHighlightField(catSelect);



    } else if (catSelect && finalCat) {



        catSelect.value = finalCat;



    }



    return {



        name: productName,



        price: productPrice,



        category: finalCat



    };



}



function handleStoreSpeechResult(cleanText, isFinal, stop, targetField) {



    const statusEl = document.getElementById('storeVoiceStatus');



    const fieldId = targetField || activeFieldMicTarget;



    // A. Specific field mic tapped



    if (fieldId) {



        if (fieldId === 'productName') {



            let val = cleanText.replace(/^(?:اسم\s*الصنف|اسم\s*المنتج|الصنف|صنف|منتج|المنتج)\s*[:\-،,\s]*/i, '').trim();



            val = val.replace(/^(?:و|مع|في)\s+/, '').trim();



            val = val.replace(/^[:\-،,\s]+/, '').replace(/[:\-،,\s]+$/, '').trim();



            const nameInput = document.getElementById('productName');



            if (nameInput && val) {



                nameInput.value = val;



                flashHighlightField(nameInput);



            }



            if (isFinal || stop) {



                showToast('✓ تم إملاء اسم الصنف: ' + val, 'success');



                document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



            }



            return;



        }



        if (fieldId === 'productPrice') {



            let p = cleanText.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));



            const numMatch = p.match(/(\d+(?:\.\d+)?)/);



            let val = numMatch ? numMatch[1] : parseArabicPriceWords(p);



            const priceInput = document.getElementById('productPrice');



            if (priceInput && val) {



                priceInput.value = val;



                flashHighlightField(priceInput);



            }



            if (isFinal || stop) {



                showToast('✓ تم إملاء سعر الصنف: ' + val + ' ج.م', 'success');



                document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



            }



            return;



        }



        if (fieldId === 'productCategory') {



            const cat = matchStoreCategory(cleanText);



            const catSelect = document.getElementById('productCategory');



            if (catSelect) {



                catSelect.value = cat;



                flashHighlightField(catSelect);



            }



            if (isFinal || stop) {



                showToast('✓ تم تحديد قسم الصنف: ' + cat, 'success');



                document.querySelectorAll('.btn-field-mic.listening').forEach(b => b.classList.remove('listening'));



            }



            return;



        }



    }



    // B. Full Store Voice Banner (#btnStoreVoice)



    if (statusEl && cleanText && !statusEl.textContent.startsWith('⚠️')) {



        statusEl.textContent = `🗣️ تم سماع: "${cleanText}"`;



        statusEl.className = 'store-voice-status listening';



    }



    const parsed = parseStoreSpeech(cleanText);



    if (stop || isFinal) {



        if (statusEl && parsed.name) {



            statusEl.innerHTML = `✅ <strong>تم تفريغ الصنف:</strong> ${parsed.name} &bull; <strong>السعر:</strong> ${parsed.price || '0'} ج.م &bull; <strong>القسم:</strong> ${parsed.category}`;



            statusEl.className = 'store-voice-status';



        }



        if (stop) {



            showToast(`✅ تم استخراج وتفريغ بيانات الصنف: ${parsed.name || ''} (${parsed.price || 0} ج.م - ${parsed.category})`, 'success');



        }



    }



}



window.handleStoreVoiceToggle = function(e) {



    if (e && e.preventDefault) e.preventDefault();



    if (wantListening && currentSpeechContext === 'store' && !activeFieldMicTarget) {



        stopVoiceRecognition();



    } else {



        if (wantListening) {



            stopVoiceRecognition();



        }



        currentSpeechContext = 'store';



        activeFieldMicTarget = null;



        startVoice('store', null);



    }



};



function initStoreVoice() {



    const btnSimulate = document.getElementById('btnSimulateStoreVoice');



    const statusEl = document.getElementById('storeVoiceStatus');



    if (btnSimulate) {



        btnSimulate.addEventListener('click', (e) => {



            e.preventDefault();



            const sampleText = "اسم الصنف دراي فود رويال كانين للقطط والسعر 450 والقسم أغذية";



            if (statusEl) {



                statusEl.textContent = `🗣️ تم نطق (محاكاة): "${sampleText}"`;



                statusEl.className = 'store-voice-status listening';



            }



            setTimeout(() => {



                parseStoreSpeech(sampleText);



                showToast('🧪 تم محاكاة صوت المتجر وتفريغ الاسم والسعر والقسم بالخانات بنجاح!', 'success');



            }, 300);



        });



    }



}



window.filterStoreByCategory = function(category) {



    currentStoreCategoryFilter = category;



    renderProductsList();



};



function renderProductsList() {



    const container = document.getElementById('productsGridContainer');



    const filterContainer = document.getElementById('storeCategoryFilters');



    const badge = document.getElementById('storeCountBadge');



    if (!container) return;



    if (!window.petiCareData) {



        container.innerHTML = '<p class="text-muted text-center py-4">جاري تحميل المنتجات...</p>';



        return;



    }



    const allProducts = window.petiCareData.getProducts();



    if (badge) badge.textContent = `${allProducts.length} صنف`;



    // Render Category Filter Tabs / Pills with live counters



    if (filterContainer) {



        const counts = { 'all': allProducts.length };



        const cats = getStoreCategories();



        cats.forEach(c => {



            counts[c.name] = allProducts.filter(p => (p.category || 'عام / أخرى') === c.name).length;



        });



        const filterPills = [



            { id: 'all', label: '🌟 كل الأقسام', count: counts['all'] },



            ...cats.map(c => ({



                id: c.name,



                label: `${c.icon || '📦'} ${c.name}`,



                count: counts[c.name] || 0



            }))



        ];



        filterContainer.innerHTML = filterPills.map(f => `



            <button type="button" class="cat-filter-btn ${currentStoreCategoryFilter === f.id ? 'active' : ''}" 



                    onclick="filterStoreByCategory('${f.id}')">



                <span>${f.label}</span>



                <span class="cat-filter-count">${f.count}</span>



            </button>



        `).join('');



    }



    // Filter products by selected category



    const displayProducts = currentStoreCategoryFilter === 'all'



        ? allProducts



        : allProducts.filter(p => (p.category || 'عام / أخرى') === currentStoreCategoryFilter);



    if (displayProducts.length === 0) {



        const catLabel = currentStoreCategoryFilter === 'all' ? 'المتجر' : `قسم ${currentStoreCategoryFilter}`;



        container.innerHTML = `



            <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">



                <div style="font-size: 42px; margin-bottom: 10px;">🛍️</div>



                <h3 style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">لا توجد أصناف في ${catLabel} حالياً</h3>



                <p style="font-size: 12px; color: var(--text-muted); margin: 0;">أضف أول صنف بالصوت أو بالنموذج أعلاه في هذا القسم!</p>



            </div>



        `;



        return;



    }



    container.innerHTML = displayProducts.map(p => {



        const cat = p.category || 'عام / أخرى';



        const icon = getStoreCategoryIcon(cat);



        return `



        <div class="product-card" id="product-card-${p.id}">



            <div class="product-img-wrapper">



                ${p.image 



                    ? `<img src="${p.image}" alt="${p.name}" class="product-img" style="cursor: pointer;" title="اضغط لتكبير صورة الصنف" onclick="openPhotoLightbox('${p.image}', '${p.name}')">` 



                    : `<span class="product-placeholder-icon">${icon}</span>`}



            </div>



            <div class="product-body">



                <div>



                    <span class="product-category-badge">${icon} ${cat}</span>



                    <h4 class="product-title" title="${p.name}">${p.name}</h4>



                </div>



                <div class="product-price-row">



                    <span class="product-price-tag">${p.price} ج.م</span>



                    <button type="button" class="btn-delete-product" onclick="deleteStoreProduct('${p.id}')" title="حذف الصنف">



                        🗑️ حذف



                    </button>



                </div>



                <div class="product-meta-author" style="font-size: 11px; color: #94a3b8; margin-top: 5px; padding-top: 5px; border-top: 1px dashed rgba(255,255,255,0.08); display: flex; align-items: center; gap: 4px;">



                    <span>👤</span>



                    <span>أضيف بواسطة: <strong style="color: #cbd5e1;">${escapeHtml(p.createdBy || 'طاقم العيادة')}</strong></span>



                </div>



            </div>



        </div>



        `;



    }).join('');



}



window.deleteStoreProduct = function(productId) {



    if (!window.petiCareData) return;



    if (confirm('هل أنت متأكد من حذف هذا الصنف من المتجر؟')) {



        window.petiCareData.deleteProduct(productId);



        renderProductsList();



        showToast('🗑️ تم حذف الصنف من المتجر بنجاح', 'info');



    }



};



/**



 * ==============================================================================



 * ROLE-BASED ACCESS CONTROL (RBAC) & CLIENT PORTAL SYSTEM



 * ==============================================================================



 */



// Helper functions for roles & phone masking



function getCurrentUserRole() {



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    return session ? session.role : null;



}



function isUserAdmin() {



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    if (!session) return false;



    return session.role === 'admin' || session.username === 'admin' || session.username === 'sherif';



}



function isStaffLoggedIn() {



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    return !!(session && session.username);



}



// الأدمن فقط يرى الرقم الحقيقي. باقي الحسابات المسجلة (Doc1/2/3) ترى "مخفي"



function getDisplayPhoneNumber(phone) {



    if (!phone) return '';



    if (isUserAdmin()) return phone;



    if (isStaffLoggedIn()) return '🔒 مخفي';



    return phone;



}



function getActorLabel() {



    return (typeof pcActorLabel === 'function') ? pcActorLabel() : '';



}



/**



 * Authentication and Screen Routing Check



 */



function checkAuth() {



    // 1. If opened with any patient id (from client scan or link) - strictly redirect to visit.html



    const urlParams = new URLSearchParams(window.location.search);



    const clientId = urlParams.get('client_id') || urlParams.get('patient_id') || urlParams.get('id');



    if (clientId && !urlParams.get('doctor_scan')) {



        window.location.replace('visit.html' + window.location.search);



        return;



    }



    // 2. Hide Client Portal if open



    const clientView = document.getElementById('clientPortalView');



    if (clientView) clientView.style.display = 'none';



    // 3. Check active session (Strict - No forced auto-login)



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    const loginOverlay = document.getElementById('loginScreenOverlay');



    const appContainer = document.getElementById('appContainer');



    if (session && session.username) {



        if (loginOverlay) loginOverlay.style.display = 'none';



        if (appContainer) {



            appContainer.style.display = 'flex';



            appContainer.classList.add('app-visible');



        }



        applyRolePermissions(session);



    } else {



        if (loginOverlay) loginOverlay.style.display = 'flex';



        if (appContainer) {



            appContainer.style.display = 'none';



            appContainer.classList.remove('app-visible');



        }



    }



}



/**



 * ==============================================================================



 * UNIFIED PREMIUM LOGIN & REGISTRATION SYSTEM (بوابة الدخول الموحدة والتسجيل)



 * ==============================================================================



 */



window.handleUnifiedLogin = async function(e) {



    if (e && e.preventDefault) e.preventDefault();



    const errBanner = document.getElementById('loginErrorMsg');



    const uInput = document.getElementById('unifiedUsername');



    const pInput = document.getElementById('unifiedPassword');



    const username = uInput ? uInput.value.trim() : '';



    const password = pInput ? pInput.value.trim() : '';



    if (!username || !password) {



        if (errBanner) {



            errBanner.innerHTML = '⚠️ يرجى إدخال اسم المستخدم وكلمة المرور.';



            errBanner.style.display = 'block';



        }



        return;



    }



    if (!window.petiCareData && typeof PetiCareData !== 'undefined') {



        window.petiCareData = new PetiCareData();



    }



    // 1. Try Staff / Admin / Doctor Authentication



    let session = window.petiCareData ? await window.petiCareData.authenticate(username, password) : null;



    // 2. If not staff, try Client / Patient Authentication (by phone, pet ID, or owner name)



    let clientPatient = null;



    if (!session && window.petiCareData) {



        clientPatient = await window.petiCareData.authenticateClient(username, password);



        if (clientPatient) {



            const primaryPatient = Array.isArray(clientPatient) ? clientPatient[0] : clientPatient;



            session = {



                username: primaryPatient.id,



                role: 'client',



                name: primaryPatient.ownerName || primaryPatient.name,



                patientId: primaryPatient.id,



                patients: Array.isArray(clientPatient) ? clientPatient : [primaryPatient],



                loginTime: Date.now()



            };



            window.petiCareData.setSession(session);



        }



    }



    if (session) {



        if (errBanner) errBanner.style.display = 'none';



        const loginOverlay = document.getElementById('loginScreenOverlay');



        if (loginOverlay) loginOverlay.style.display = 'none';



        if (session.role === 'client') {



            // Client / Patient Portal View



            if (typeof initClientPortal === 'function') {



                initClientPortal(session.patientId || session.username);



            }



            showToast('أهلاً بك يا ' + session.name + ' 🐾', 'success');



        } else {



            // Staff / Doctor / Admin View



            const appContainer = document.getElementById('appContainer');



            if (appContainer) {



                appContainer.style.display = 'flex';



                appContainer.classList.add('app-visible');



            }



            if (typeof applyRolePermissions === 'function') {



                applyRolePermissions(session);



            }



            if (typeof refreshPatientsUI === 'function') {



                refreshPatientsUI();



            }



            if (typeof renderProductsList === 'function') {



                renderProductsList();



            }



            showToast('مرحباً بك ' + session.name + '! 👋', 'success');



        }



    } else {



        if (errBanner) {



            errBanner.innerHTML = '❌ بيانات الدخول غير صحيحة! تأكد من اسم المستخدم أو رقم الهاتف / الملف وكلمة المرور.';



            errBanner.style.display = 'block';



        }



    }



};



// Compatibility aliases



window.handleLogin = function(e) { window.handleUnifiedLogin(e); };



window.handleStaffLoginSubmit = function(type, e) { window.handleUnifiedLogin(e); };



window.handleClientLoginSubmit = function(e) { window.handleUnifiedLogin(e); };



window.switchLoginPortalTab = function(tabName) {};



window.selectDoctorAccount = function(docId, docName) {



    const uInput = document.getElementById('unifiedUsername');



    const pInput = document.getElementById('unifiedPassword');



    if (uInput) uInput.value = docId;



    if (pInput) pInput.value = docId;



};



/**



 * Register New Account Modal & Handler



 */



window.openRegisterModal = function() {



    const modal = document.getElementById('modalRegisterAccount');



    if (modal) modal.style.display = 'flex';



};



window.closeRegisterModal = function() {



    const modal = document.getElementById('modalRegisterAccount');



    if (modal) modal.style.display = 'none';



};



window.handleRegisterNewSubmit = function(e) {



    if (e && e.preventDefault) e.preventDefault();



    const ownerNameInput = document.getElementById('regOwnerName');



    const ownerPhoneInput = document.getElementById('regOwnerPhone');



    const petNameInput = document.getElementById('regPetName');



    const petTypeInput = document.getElementById('regPetType');



    const passInput = document.getElementById('regPassword');



    const ownerName = ownerNameInput ? ownerNameInput.value.trim() : '';



    const phone = ownerPhoneInput ? ownerPhoneInput.value.trim() : '';



    const petName = petNameInput ? petNameInput.value.trim() : '';



    const petType = petTypeInput ? petTypeInput.value.trim() : 'قط';



    const password = passInput ? passInput.value.trim() : '';



    if (!ownerName || !phone || !petName || !password) {



        showToast('⚠️ يرجى ملء جميع الحقول المطلوبة للتسجيل', 'warning');



        return;



    }



    if (!window.petiCareData && typeof PetiCareData !== 'undefined') {



        window.petiCareData = new PetiCareData();



    }



    if (window.petiCareData) {



        const patients = window.petiCareData.getPatients() || [];



        const nextId = 'PET-' + String(patients.length + 1).padStart(3, '0');



        const newPatient = {



            id: nextId,



            name: petName,



            species: petType,



            breed: '',



            age: '',



            gender: 'ذكر',



            ownerName: ownerName,



            phone: phone,



            customPassword: password,



            created: Date.now(),



            visits: []



        };



        if (typeof window.petiCareData.savePatient === 'function') {



            window.petiCareData.savePatient(newPatient);



        } else {



            const list = window.petiCareData.getPatients() || [];



            list.push(newPatient);



            window.petiCareData.savePatients(list);



        }



        if (window.PetiCareCloud && typeof window.PetiCareCloud.syncAllCloudData === 'function') {



            window.PetiCareCloud.syncAllCloudData();



        }



        window.closeRegisterModal();



        // Auto login the newly registered client



        const session = {



            username: newPatient.id,



            role: 'client',



            name: ownerName,



            patientId: newPatient.id,



            loginTime: Date.now()



        };



        window.petiCareData.setSession(session);



        const loginOverlay = document.getElementById('loginScreenOverlay');



        if (loginOverlay) loginOverlay.style.display = 'none';



        if (typeof initClientPortal === 'function') {



            initClientPortal(newPatient.id);



        }



        showToast('🎉 تم إنشاء الحساب بنجاح! مرحباً بك يا ' + ownerName + ' 🐾 (رقم ملفك: ' + newPatient.id + ')', 'success');



    }



};



window.fillQuickLogin = function(username, password) {



    const uInput = document.getElementById('unifiedUsername');



    const pInput = document.getElementById('unifiedPassword');



    if (uInput) uInput.value = username || 'admin';



    if (pInput) pInput.value = password || 'admin';



    window.handleUnifiedLogin();



};



window.togglePasswordVisibility = function(inputId, btn) {



    const el = document.getElementById(inputId);



    if (!el) return;



    if (el.type === 'password') {



        el.type = 'text';



        if (btn) btn.textContent = '🔒';



    } else {



        el.type = 'password';



        if (btn) btn.textContent = '👁️';



    }



};



// ==========================================



// Forgot Password via WhatsApp Flow



// ==========================================



window.openForgotPasswordWhatsAppModal = function() {



    const modal = document.getElementById('modalForgotPasswordWhatsApp');



    if (!modal) return;



    // Auto-detect typed username if any



    const userInput = document.getElementById('loginUsername');



    const typed = userInput ? userInput.value.trim().toLowerCase() : '';



    const userSelect = document.getElementById('forgotPassUserSelect');



    if (userSelect) {



        if (typed === 'doc') {



            userSelect.value = 'doc';



        } else {



            userSelect.value = 'admin';



        }



    }



    // Pre-fill phone number



    const phoneInput = document.getElementById('forgotPassPhone');



    if (phoneInput && window.petiCareData) {



        let phone = window.petiCareData.getClinicPhone() || '01012345678';



        if (phone.startsWith('20')) phone = '0' + phone.substring(2);



        phoneInput.value = phone;



    }



    modal.style.display = 'flex';



};



window.closeForgotPasswordWhatsAppModal = function() {



    const modal = document.getElementById('modalForgotPasswordWhatsApp');



    if (modal) modal.style.display = 'none';



};



window.submitForgotPasswordWhatsApp = async function() {



    const userSelect = document.getElementById('forgotPassUserSelect');



    const phoneInput = document.getElementById('forgotPassPhone');



    const username = userSelect ? userSelect.value : 'admin';



    const rawPhone = phoneInput ? phoneInput.value.trim() : '';



    if (!rawPhone) {



        alert('يرجى إدخال رقم الهاتف لاستلام كلمة المرور عبر واتساب');



        return;



    }



    // Clean phone number for WhatsApp



    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');



    if (cleanPhone.startsWith('01')) {



        cleanPhone = '2' + cleanPhone; // Egypt country code



    } else if (cleanPhone.startsWith('002')) {



        cleanPhone = cleanPhone.substring(2);



    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10 && cleanPhone.startsWith('1')) {



        cleanPhone = '20' + cleanPhone;



    }



    // Save phone in clinic settings



    if (window.petiCareData) {



        window.petiCareData.setClinicPhone(cleanPhone);



    }



    // Generate new random 5-digit PIN / password



    const newPass = String(Math.floor(10000 + Math.random() * 90000));



    // Get user details



    const users = window.petiCareData.getUsers();



    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());



    const userName = targetUser ? targetUser.name : (username === 'admin' ? 'د. شريف دياب' : 'المساعد الطبي');



    // Update password locally



    window.petiCareData.changePassword(username, newPass);



    // Sync to Cloud



    if (window.PetiCareCloud && typeof window.PetiCareCloud.saveCloudAuth === 'function') {



        try {



            await window.PetiCareCloud.saveCloudAuth();



        } catch (e) {



            console.warn('Cloud sync error on password reset:', e);



        }



    }



    // Update login inputs on screen



    const loginUser = document.getElementById('loginUsername');



    const loginPass = document.getElementById('loginPassword');



    const errBanner = document.getElementById('loginErrorMsg');



    if (loginUser) loginUser.value = username;



    if (loginPass) loginPass.value = newPass;



    if (errBanner) errBanner.style.display = 'none';



    // WhatsApp Message



    const msg = `🏥 *مستشفى بيتي كير البيطرية - PetiCare Animal Hospital*



🔐 *طلب استعادة كلمة المرور*



👤 الحساب: *${userName}* (${username})



🔑 كلمة المرور الجديدة: *${newPass}*



📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}



تم تحديث كلمة المرور في النظام ويمكنك تسجيل الدخول بها فوراً.`;



    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;



    window.open(waUrl, '_blank');



    window.closeForgotPasswordWhatsAppModal();



    showToast(`✅ تم توليد كلمة مرور جديدة (${newPass}) وتحديث الحساب وفتح واتساب!`, 'success');



};



/**



 * Quick Login Shortcut Buttons



 */



window.fillQuickLogin = function(username, password) {



    const userInput = document.getElementById('loginUsername');



    const passInput = document.getElementById('loginPassword');



    if (userInput) userInput.value = username || 'admin';



    if (passInput) passInput.value = password || 'admin';



    window.handleLogin();



};



/**



 * Handle Logout



 */



window.handleLogout = function() {



    try {



        if (window.petiCareData) {



            window.petiCareData.clearSession();



        }



        localStorage.removeItem('peticare_session_v1');



        sessionStorage.clear();



    } catch(e) {



        console.error('Logout clear error:', e);



    }



    try {



        if (window.history && window.history.replaceState) {



            window.history.replaceState({}, document.title, window.location.pathname);



        }



    } catch(e) {}



    const uInput = document.getElementById('unifiedUsername');



    const pInput = document.getElementById('unifiedPassword');



    if (uInput) uInput.value = '';



    if (pInput) pInput.value = '';



    const userMenu = document.getElementById('userDropdownMenu');



    if (userMenu) userMenu.style.display = 'none';



    const clientPortal = document.getElementById('clientPortalView');



    if (clientPortal) clientPortal.style.display = 'none';



    const appContainer = document.getElementById('appContainer');



    if (appContainer) {



        appContainer.style.display = 'none';



        appContainer.classList.remove('app-visible');



    }



    const loginOverlay = document.getElementById('loginScreenOverlay');



    if (loginOverlay) {



        loginOverlay.style.display = 'flex';



        const errBanner = document.getElementById('loginErrorMsg');



        if (errBanner) errBanner.style.display = 'none';



    }



    const splash = document.getElementById('splashScreen');



    if (splash) splash.style.display = 'none';



    showToast('🚪 تم تسجيل الخروج بنجاح 👋', 'info');



};



window.openAdminDashboardSection = function() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.style.display = 'none';
    if (!isUserAdmin()) {
        showToast('⚠️ لوحة الإدارة متاحة لحساب المدير العام فقط', 'warning');
        return;
    }
    if (window.switchSection) {
        window.switchSection('section-admin-dashboard');
    }
    if (window.renderAdminDailyDashboard) {
        window.renderAdminDailyDashboard();
    }
    showToast('📊 تم فتح لوحة متابعة حالات اليوم المباشرة بنجاح', 'success');
};



/**



 * User Dropdown Menu Handlers



 */



window.toggleUserDropdown = function(e) {
    if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
    }
    const menu = document.getElementById('userDropdownMenu');
    const btn = document.getElementById('headerUserBtn');
    if (!menu || !btn) return;

    if (menu.parentNode !== document.body) {
        document.body.appendChild(menu);
    }

    const isHidden = (menu.style.display === 'none' || !menu.style.display || window.getComputedStyle(menu).display === 'none');

    if (isHidden) {
        const rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = Math.round(rect.bottom + 6) + 'px';
        const menuWidth = 230;
        let leftPos = Math.round(rect.left);
        if (leftPos + menuWidth > window.innerWidth - 10) {
            leftPos = window.innerWidth - menuWidth - 10;
        }
        if (leftPos < 10) leftPos = 10;
        menu.style.left = leftPos + 'px';
        menu.style.right = 'auto';
        menu.style.zIndex = '999999';
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
};

document.addEventListener('click', (e) => {
    const userSection = document.getElementById('headerUserSection');
    const btn = document.getElementById('headerUserBtn');
    const menu = document.getElementById('userDropdownMenu');
    if (!menu || menu.style.display === 'none') return;
    if ((userSection && userSection.contains(e.target)) || (btn && btn.contains(e.target))) return;
    if (menu.contains(e.target)) {
        if (e.target.closest && e.target.closest('.dropdown-item')) {
            menu.style.display = 'none';
        }
        return;
    }
    menu.style.display = 'none';
});



/**



 * Apply Role Permissions



 */



function applyRolePermissions(session) {



    if (!session) return;



    const headerName = document.getElementById('headerUserName');



    const headerAvatar = document.getElementById('headerUserAvatar');



    const dropdownName = document.getElementById('dropdownUserFullName');



    const dropdownRole = document.getElementById('dropdownUserRole');



    const btnAdminDash = document.getElementById('btnAdminDashboard');
    const btnCloudWhatsApp = document.getElementById('btnCloudWhatsAppSettings');



    const btnChangePass = document.getElementById('btnOpenChangePass');



    const navRadarItem = document.querySelector('.bottom-nav-item[data-target="section-radar"]');



    const radarAlert = document.getElementById('radarHeaderAlert');



    const u = (session.username || '').toLowerCase();



    const isAdmin = (session.role === 'admin') || u === 'admin' || u === 'sherif';



    if (isAdmin) {



        session.role = 'admin'; // Guarantee consistency



        if (headerAvatar) headerAvatar.textContent = '👨‍⚕️';



        if (headerName) headerName.textContent = 'د. شريف';



        if (dropdownName) dropdownName.textContent = 'د. شريف دياب (المدير العام)';



        if (dropdownRole) {



            dropdownRole.textContent = '⭐ مدير النظام (كامل الصلاحيات)';



            dropdownRole.style.color = '#34d399';



        }



        const navPatientsItem = document.querySelector('.bottom-nav-item[data-target="section-patients"]');



        const btnPrintSheet = document.getElementById('btnDropdownPrintSheet');



        if (btnAdminDash) btnAdminDash.style.display = 'flex';
        const bottomNavAdmin = document.getElementById('bottomNavAdminTab');
        if (bottomNavAdmin) bottomNavAdmin.style.display = 'flex';
        if (btnCloudWhatsApp) btnCloudWhatsApp.style.display = 'flex';



        if (btnChangePass) btnChangePass.style.display = 'flex';



        if (btnPrintSheet) btnPrintSheet.style.display = 'flex';



        if (navRadarItem) navRadarItem.style.display = 'flex';



        if (navPatientsItem) navPatientsItem.style.display = 'flex'; // Dr. Sherif Only



        if (typeof updateRadarBadges === 'function') updateRadarBadges();



    } else {



        // Assistant role ('doc')



        if (headerAvatar) headerAvatar.textContent = '🩺';



        if (headerName) headerName.textContent = getActorLabel() || 'الطبيب';



        if (dropdownName) dropdownName.textContent = getActorLabel() || 'الطبيب';



        if (dropdownRole) {



            dropdownRole.textContent = '🩺 طبيب (كل الصلاحيات ما عدا أرقام الهواتف)';



            dropdownRole.style.color = '#93c5fd';



        }



        const navPatientsItem = document.querySelector('.bottom-nav-item[data-target="section-patients"]');



        const btnPrintSheet = document.getElementById('btnDropdownPrintSheet');



        if (btnAdminDash) btnAdminDash.style.display = 'none';
        const bottomNavAdmin = document.getElementById('bottomNavAdminTab'); if (bottomNavAdmin) bottomNavAdmin.style.display = 'none';
        if (btnCloudWhatsApp) btnCloudWhatsApp.style.display = 'none';



        const btnExportDB = document.getElementById('btnExportDatabase');



        if (btnExportDB) btnExportDB.style.display = 'none';



        if (btnChangePass) btnChangePass.style.display = 'flex'; // Assistant can change his password!



        if (btnPrintSheet) btnPrintSheet.style.display = 'flex';



        if (navRadarItem) navRadarItem.style.display = 'flex';



        if (navPatientsItem) navPatientsItem.style.display = 'flex';



        if (typeof updateRadarBadges === 'function') updateRadarBadges();



    }



}



/**



 * User Password Change Functions (Works for Admin & Doctor/Assistant)



 */



window.openChangePasswordModal = function() {



    const menu = document.getElementById('userDropdownMenu');



    if (menu) menu.style.display = 'none';



    const modal = document.getElementById('changePasswordModal');



    const err = document.getElementById('changePassError');



    if (err) err.style.display = 'none';



    const cur = document.getElementById('currentPassInput');



    const nw = document.getElementById('newPassInput');



    const cf = document.getElementById('confirmPassInput');



    if (cur) cur.value = '';



    if (nw) nw.value = '';



    if (cf) cf.value = '';



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    const label = document.getElementById('changePassUserLabel');



    if (label && session) {



        label.textContent = session.name || (session.username === 'admin' ? 'د. شريف دياب (المدير العام)' : 'المساعد الطبي');



    }



    if (modal) modal.style.display = 'flex';



};



window.closeChangePasswordModal = function() {



    const modal = document.getElementById('changePasswordModal');



    if (modal) modal.style.display = 'none';



};



window.saveNewAdminPassword = function() {



    const cur = document.getElementById('currentPassInput').value.trim();



    const newP = document.getElementById('newPassInput').value.trim();



    const conf = document.getElementById('confirmPassInput').value.trim();



    const err = document.getElementById('changePassError');



    const session = window.petiCareData ? window.petiCareData.getCurrentSession() : null;



    const currentUsername = session ? session.username : 'admin';



    const users = window.petiCareData.getUsers();



    const currentUser = users.find(u => u.username.toLowerCase() === currentUsername.toLowerCase());



    if (!cur || !newP || !conf) {



        if (err) { err.textContent = 'يرجى ملء جميع الحقول المطلوبة'; err.style.display = 'block'; }



        return;



    }



        const expectedPass = currentUser ? currentUser.password : (currentUsername === 'admin' ? 'admin' : (currentUsername === 'assistant' ? '1234' : 'doc'));



    if (expectedPass !== cur) {



        if (err) { err.textContent = 'كلمة المرور الحالية غير صحيحة'; err.style.display = 'block'; }



        return;



    }



    if (newP.length < 3) {



        if (err) { err.textContent = 'كلمة المرور يجب أن تكون 3 أحرف/أرقام على الأقل'; err.style.display = 'block'; }



        return;



    }



    if (newP !== conf) {



        if (err) { err.textContent = 'كلمتا المرور غير متطابقتين'; err.style.display = 'block'; }



        return;



    }



    window.petiCareData.changePassword(currentUsername, newP);



    closeChangePasswordModal();



    const userName = currentUser ? currentUser.name : currentUsername;



    showToast(`🔑 تم تحديث كلمة المرور لحساب (${userName}) بنجاح!`, 'success');



};



/**



 * ==============================================================================



 * CLIENT PORTAL LOGIC & SHOPPING CART MODULE



 * ==============================================================================



 */



let currentClientPatient = null;



let clientCart = [];



function initClientPortal(rawClientId) {



    console.log("🐾 Opening Client Portal for ID:", rawClientId);



    const splash = document.getElementById('splashScreen');



    if (splash) splash.style.display = 'none';



    const appContainer = document.getElementById('appContainer');



    if (appContainer) appContainer.style.display = 'none';



    const loginOverlay = document.getElementById('loginScreenOverlay');



    if (loginOverlay) loginOverlay.style.display = 'none';



    const portalView = document.getElementById('clientPortalView');



    if (portalView) portalView.style.display = 'flex';



    // Find patient by ID



    let cleanId = String(rawClientId).replace(/[^0-9]/g, '');



    let patient = window.petiCareData.getPatientById(cleanId);



    if (!patient) {



        const all = window.petiCareData.getPatients();



        patient = all.find(p => p.id === rawClientId || p.id === cleanId) || all[0];



    }



    currentClientPatient = patient;



    clientCart = [];



    renderClientPortal(patient);



}



function renderClientPortal(patient) {



    if (!patient) return;



    // Badges & Labels



    const petBadge = document.getElementById('portalPetTypeBadge');



    const idBadge = document.getElementById('portalPatientIdBadge');



    const petName = document.getElementById('portalPetName');



    const ownerName = document.getElementById('portalOwnerName');



    const ownerPhone = document.getElementById('portalOwnerPhone');



    const avatarImg = document.getElementById('portalClientAvatar');



    const avatarFallback = document.getElementById('portalAvatarFallback');



    if (petBadge) petBadge.textContent = `${patient.name} (${patient.type})`;



    if (idBadge) idBadge.textContent = `#PET-${patient.id}`;



    if (petName) petName.textContent = `🐾 ${patient.name}`;



    if (ownerName) ownerName.textContent = patient.ownerName;



    if (ownerPhone) ownerPhone.textContent = patient.phone;



    const photoSrc = patient.ownerPhoto || '';



    if (photoSrc) {



        if (avatarImg) {



            avatarImg.src = photoSrc;



            avatarImg.style.display = 'block';



        }



        if (avatarFallback) avatarFallback.style.display = 'none';



    } else {



        if (avatarImg) avatarImg.style.display = 'none';



        if (avatarFallback) avatarFallback.style.display = 'flex';



    }



    // Render Previous Medical Visits



    renderClientPortalVisits(patient);



    // Render Store Products



    renderClientPortalProducts();



    // Update Cart Status



    updateClientCartUI();



}



function renderClientPortalVisits(patient) {



    const container = document.getElementById('portalVisitsTimeline');



    const countBadge = document.getElementById('portalVisitsCountBadge');



    if (!container) return;



    const visits = patient.visits || [];



    if (countBadge) countBadge.textContent = `${visits.length} كشف وزيارة`;



    if (visits.length === 0) {



        container.innerHTML = `



            <div style="text-align: center; padding: 24px; color: var(--text-muted);">



                <div style="font-size: 32px; margin-bottom: 6px;">📂</div>



                <p>لا توجد زيارات سابقة مسجلة حتى الآن لهذا الملف.</p>



            </div>



        `;



        return;



    }



    container.innerHTML = visits.map((v, idx) => `



        <div class="portal-visit-item">



            <div class="portal-visit-date-badge">



                <span>📅 زيارة ${visits.length - idx} &bull; ${v.date}</span>



                ${v.followUpDate ? `<span class="badge-tag" style="font-size: 10px;">إعادة: ${v.followUpDate}</span>` : ''}



            </div>



            <div style="margin-bottom: 6px;">🩺 <strong>التشخيص:</strong> ${v.diagnosis}</div>



            <div style="margin-bottom: 6px;">💊 <strong>العلاج:</strong> ${v.treatment}</div>



            ${v.dosage ? `<div style="margin-bottom: 6px; font-size: 12px; color: #a7f3d0;">⏱️ <strong>الجرعة:</strong> ${v.dosage}</div>` : ''}



            ${v.labs && v.labs !== 'لا يوجد' ? `<div style="margin-bottom: 6px; font-size: 12px; color: #93c5fd;">🔬 <strong>الفحوصات:</strong> ${v.labs}</div>` : ''}



            <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
                ${Number(v.remaining || 0) > 0 ? `
                    <button type="button" class="btn btn-sm" onclick="settleVisitDebt('${patient.id}', '${v.id}')" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 700;">
                        💵 تسديد المتبقي
                    </button>
                ` : ''}
                <button type="button" class="btn btn-secondary btn-sm" onclick="openEditVisitModal('${patient.id}', '${v.id}')" style="font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc; background: rgba(56, 189, 248, 0.15); cursor: pointer; font-weight: 700;">
                    ✏️ تعديل الكشف
                </button>
            </div>
            ${(v.clientImage || v.caseImage || (v.labImages && v.labImages.length > 0)) ? `



                <div style="display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; padding-bottom: 4px;">



                    ${v.clientImage ? `<img src="${v.clientImage}" alt="صورة المالك" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #10b981; cursor: pointer;" title="اضغط للتكبير" onclick="openPhotoLightbox('${v.clientImage}', 'صورة المالك')">` : ''}



                    ${v.caseImage ? `<img src="${v.caseImage}" alt="صورة الحالة" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #3b82f6; cursor: pointer;" title="اضغط للتكبير" onclick="openPhotoLightbox('${v.caseImage}', 'صورة الحالة')">` : ''}



                    ${v.labImages && v.labImages.length > 0 ? v.labImages.map((img, i) => `<img src="${img}" alt="تحليل" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #f59e0b; cursor: pointer;" title="اضغط لتكبير التحليل" onclick="openPhotoLightbox('${img}', 'صورة التحليل #${i + 1}')">`).join('') : ''}



                </div>



            ` : ''}



        </div>



    `).join('');



}



function renderClientPortalProducts() {



    const container = document.getElementById('portalProductsGrid');



    const storeCountBadge = document.getElementById('portalStoreCount');



    if (!container) return;



    const products = window.petiCareData.getProducts();



    if (storeCountBadge) storeCountBadge.textContent = products.length;



    if (products.length === 0) {



        container.innerHTML = `



            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">



                <div style="font-size: 32px; margin-bottom: 6px;">🛍️</div>



                <p>لا توجد منتجات معروضة حالياً في متجر العيادة.</p>



            </div>



        `;



        return;



    }



    container.innerHTML = products.map(p => `



        <div class="portal-product-card">



            <div class="portal-prod-img-box">



                ${p.image ? `<img src="${p.image}" alt="${p.name}" class="portal-prod-img" style="cursor: pointer;" title="اضغط لتكبير الصورة" onclick="openPhotoLightbox('${p.image}', '${p.name}')">` : '<span style="font-size: 32px;">🛍️</span>'}



            </div>



            <div class="portal-prod-info">



                <div class="portal-prod-name" title="${p.name}">${p.name}</div>



                <div class="portal-prod-bottom">



                    <span class="portal-prod-price">${p.price} ج.م</span>



                    <button type="button" class="btn-add-to-cart" onclick="addToClientCart('${p.id}')">



                        ➕ أضف



                    </button>



                </div>



            </div>



        </div>



    `).join('');



}



window.handleClientPhotoUpload = function(e) {



    const file = e.target.files && e.target.files[0];



    if (!file || !currentClientPatient) return;



    const reader = new FileReader();



    reader.onload = function(evt) {



        const base64 = evt.target.result;



        currentClientPatient.ownerPhoto = base64;



        window.petiCareData.updatePatient(currentClientPatient.id, { ownerPhoto: base64 });



        const avatarImg = document.getElementById('portalClientAvatar');



        const fallback = document.getElementById('portalAvatarFallback');



        if (avatarImg) {



            avatarImg.src = base64;



            avatarImg.style.display = 'block';



        }



        if (fallback) fallback.style.display = 'none';



        showToast('📷 تم تحديث صورتك الشخصية بنجاح!', 'success');



    };



    reader.readAsDataURL(file);



};



window.toggleClientProfileEditForm = function() {



    const form = document.getElementById('portalProfileEditForm');



    if (!form || !currentClientPatient) return;



    if (form.style.display === 'none') {



        form.style.display = 'block';



        document.getElementById('portalEditOwnerName').value = currentClientPatient.ownerName || '';



        document.getElementById('portalEditPhone').value = currentClientPatient.phone || '';



    } else {



        form.style.display = 'none';



    }



};



window.saveClientPortalProfile = function(e) {



    if (e && e.preventDefault) e.preventDefault();



    if (!currentClientPatient) return;



    const name = document.getElementById('portalEditOwnerName').value.trim();



    let phone = document.getElementById('portalEditPhone').value.trim();



    if (!name || !phone) {



        showToast('يرجى ملء جميع البيانات', 'warning');



        return;



    }



    let clean = phone.replace(/[^0-9]/g, '');



    if (clean.startsWith('01')) clean = '2' + clean;



    currentClientPatient.ownerName = name;



    currentClientPatient.phone = clean;



    window.petiCareData.updatePatient(currentClientPatient.id, { ownerName: name, phone: clean });



    document.getElementById('portalOwnerName').textContent = name;



    document.getElementById('portalOwnerPhone').textContent = clean;



    document.getElementById('portalProfileEditForm').style.display = 'none';



    showToast('✅ تم حفظ بياناتك بنجاح!', 'success');



};



window.switchPortalTab = function(tabName) {



    const tabMed = document.getElementById('tabBtnMedical');



    const tabStr = document.getElementById('tabBtnStore');



    const paneMed = document.getElementById('portalTabMedical');



    const paneStr = document.getElementById('portalTabStore');



    if (tabName === 'medical') {



        if (tabMed) tabMed.classList.add('active');



        if (tabStr) tabStr.classList.remove('active');



        if (paneMed) paneMed.style.display = 'block';



        if (paneStr) paneStr.style.display = 'none';



    } else {



        if (tabMed) tabMed.classList.remove('active');



        if (tabStr) tabStr.classList.add('active');



        if (paneMed) paneMed.style.display = 'none';



        if (paneStr) paneStr.style.display = 'block';



    }



};



window.addToClientCart = function(productId) {



    const products = window.petiCareData.getProducts();



    const product = products.find(p => String(p.id) === String(productId));



    if (!product) return;



    const existing = clientCart.find(item => String(item.product.id) === String(productId));



    if (existing) {



        existing.qty += 1;



    } else {



        clientCart.push({ product, qty: 1 });



    }



    updateClientCartUI();



    showToast(`🛒 تمت إضافة "${product.name}" إلى السلة`, 'info');



};



window.updateClientCartQty = function(productId, delta) {



    const idx = clientCart.findIndex(item => String(item.product.id) === String(productId));



    if (idx !== -1) {



        clientCart[idx].qty += delta;



        if (clientCart[idx].qty <= 0) {



            clientCart.splice(idx, 1);



        }



    }



    updateClientCartUI();



};



function updateClientCartUI() {



    const stickyBar = document.getElementById('portalStickyCartBar');



    const badge = document.getElementById('portalCartBadge');



    const totalEl = document.getElementById('portalCartTotal');



    const modalTotal = document.getElementById('portalCartModalTotal');



    const listContainer = document.getElementById('portalCartItemsList');



    const totalCount = clientCart.reduce((sum, item) => sum + item.qty, 0);



    const totalPrice = clientCart.reduce((sum, item) => sum + (item.qty * item.product.price), 0);



    if (badge) badge.textContent = totalCount;



    if (totalEl) totalEl.textContent = totalPrice;



    if (modalTotal) modalTotal.textContent = totalPrice;



    if (totalCount > 0) {



        if (stickyBar) stickyBar.style.display = 'flex';



    } else {



        if (stickyBar) stickyBar.style.display = 'none';



        const modal = document.getElementById('portalCartModal');



        if (modal) modal.style.display = 'none';



    }



    if (listContainer) {



        if (clientCart.length === 0) {



            listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">السلة فارغة</p>';



        } else {



            listContainer.innerHTML = clientCart.map(item => `



                <div class="portal-cart-item">



                    <div>



                        <div class="cart-item-name">${item.product.name}</div>



                        <div class="cart-item-sub">${item.product.price} ج.م &bull; الإجمالي: ${item.qty * item.product.price} ج.م</div>



                    </div>



                    <div class="cart-qty-controls">



                        <button type="button" class="btn-qty" onclick="updateClientCartQty('${item.product.id}', 1)">+</button>



                        <span class="cart-qty-number">${item.qty}</span>



                        <button type="button" class="btn-qty" onclick="updateClientCartQty('${item.product.id}', -1)">-</button>



                    </div>



                </div>



            `).join('');



        }



    }



}



window.togglePortalCartModal = function() {



    const modal = document.getElementById('portalCartModal');



    if (!modal) return;



    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';



};



window.sendClientOrderWhatsApp = function() {



    if (clientCart.length === 0) {



        showToast('السلة فارغة! أضف منتجات أولاً', 'warning');



        return;



    }



    const patient = currentClientPatient || { name: 'عميل', ownerName: 'عميل بيتي كير', id: '101' };



    const clinicPhone = window.petiCareData.getClinicPhone();



    const totalPrice = clientCart.reduce((sum, item) => sum + (item.qty * item.product.price), 0);



    let itemsText = clientCart.map(item => 



        `- *${item.product.name}* × ${item.qty} = ${item.qty * item.product.price} ج.م`



    ).join('\n');



    const message = 



`مرحباً مستشفى بيتي كير البيطري 🐾



أنا *${patient.ownerName}*، مالك الأليف (*${patient.name}* - ملف #${patient.id})



أود طلب المنتجات التالية من متجر العيادة:



${itemsText}



-----------------------------



💰 *إجمالي الطلب:* ${totalPrice} ج.م



يرجى تأكيد تجهيز الطلب والتنسيق للاستلام أو التوصيل 🌸`;



    const encoded = encodeURIComponent(message);



    const url = `https://api.whatsapp.com/send?phone=${clinicPhone}&text=${encoded}`;



    window.open(url, '_blank');



};



window.exitClientPortal = function() {



    // Clear URL param



    window.history.pushState({}, '', window.location.pathname);



    const portal = document.getElementById('clientPortalView');



    if (portal) portal.style.display = 'none';



    checkAuth();



};



/**



 * ==============================================================================



 * FULL-SCREEN IMAGE LIGHTBOX & ZOOM CONTROLLER (تكبير صور التحاليل والفحوصات)



 * ==============================================================================



 */



let currentLightboxZoom = 1;



window.openPhotoLightbox = function(src, caption) {



    if (!src) return;



    const modal = document.getElementById('photoLightboxModal');



    const targetImg = document.getElementById('lightboxTargetImg');



    const captionEl = document.getElementById('lightboxCaption');



    if (!modal || !targetImg) return;



    currentLightboxZoom = 1;



    targetImg.style.transform = `scale(${currentLightboxZoom})`;



    targetImg.style.cursor = 'zoom-in';



    targetImg.src = src;



    if (captionEl) {



        captionEl.textContent = caption || '🔬 معاينة الفحص الطبي';



    }



    modal.style.display = 'flex';



    document.body.style.overflow = 'hidden';



};



window.closePhotoLightbox = function(e) {



    if (e && e.target && e.target.id !== 'photoLightboxModal' && !e.target.classList.contains('btn-lightbox-close')) {



        return;



    }



    const modal = document.getElementById('photoLightboxModal');



    const targetImg = document.getElementById('lightboxTargetImg');



    if (modal) modal.style.display = 'none';



    if (targetImg) {



        targetImg.src = '';



        currentLightboxZoom = 1;



        targetImg.style.transform = 'scale(1)';



    }



    document.body.style.overflow = '';



};



window.zoomLightbox = function(delta) {



    const targetImg = document.getElementById('lightboxTargetImg');



    if (!targetImg) return;



    currentLightboxZoom = Math.min(Math.max(0.6, currentLightboxZoom + delta), 4.0);



    targetImg.style.transform = `scale(${currentLightboxZoom.toFixed(2)})`;



    targetImg.style.cursor = currentLightboxZoom > 1 ? 'zoom-out' : 'zoom-in';



};



window.resetLightboxZoom = function() {



    const targetImg = document.getElementById('lightboxTargetImg');



    if (!targetImg) return;



    currentLightboxZoom = 1;



    targetImg.style.transform = 'scale(1)';



    targetImg.style.cursor = 'zoom-in';



};



// Add tap-to-zoom on the lightbox image itself



document.addEventListener('DOMContentLoaded', () => {



    const targetImg = document.getElementById('lightboxTargetImg');



    if (targetImg) {



        targetImg.addEventListener('click', (e) => {



            e.stopPropagation();



            if (currentLightboxZoom <= 1.2) {



                window.zoomLightbox(1.0); // zoom in to ~2x



            } else {



                window.resetLightboxZoom(); // reset to 1x



            }



        });



    }



});



// ===== Live Voice Diagnostic HUD (Activated via ?debug=1) =====



if (new URLSearchParams(location.search).get('debug') === '1') {



  const d = document.createElement('pre');



  d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:30vh;overflow:auto;margin:0;padding:6px;background:#000c;color:#0f0;font:11px monospace;z-index:99999;direction:ltr';



  document.body.appendChild(d);



  setInterval(() => { d.textContent = JSON.stringify(window.__voiceDebug ? window.__voiceDebug() : {}, null, 1); }, 500);



}











// ==============================================================================



// CLINIC STORE CATEGORIES MANAGEMENT MODAL & ACTIONS



// ==============================================================================



window.openManageCategoriesModal = function() {



    const modal = document.getElementById('modalManageCategories');



    if (!modal) return;



    const nameInput = document.getElementById('newCategoryNameInput');



    const iconInput = document.getElementById('newCategoryIconInput');



    if (nameInput) nameInput.value = '';



    if (iconInput) iconInput.value = '📦';



    window.renderCategoriesManageList();



    modal.style.display = 'flex';



};







window.closeManageCategoriesModal = function() {



    const modal = document.getElementById('modalManageCategories');



    if (modal) modal.style.display = 'none';



};







window.selectCategoryEmoji = function(emoji) {



    const iconInput = document.getElementById('newCategoryIconInput');



    if (iconInput) {



        iconInput.value = emoji;



        iconInput.focus();



    }



};







window.renderCategoriesManageList = function() {



    const container = document.getElementById('manageCategoriesListContainer');



    const badge = document.getElementById('manageCategoriesCountBadge');



    if (!container || !window.petiCareData) return;



    const cats = window.petiCareData.getCategories();



    const products = window.petiCareData.getProducts();



    if (badge) badge.textContent = `${cats.length} قسم`;







    container.innerHTML = cats.map(c => {



        const prodCount = products.filter(p => (p.category || 'عام / أخرى') === c.name).length;



        const isGeneral = (c.name === 'عام / أخرى');



        return `



            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">



                <div style="display: flex; align-items: center; gap: 8px;">



                    <span style="font-size: 20px;">${escapeHtml(c.icon || '📦')}</span>



                    <div>



                        <strong style="font-size: 13px; color: #ffffff;">${escapeHtml(c.name)}</strong>



                        <div style="font-size: 11px; color: #94a3b8;">${prodCount} منتج مسجل</div>



                    </div>



                </div>



                <div style="display: flex; gap: 6px; align-items: center;">



                    <button type="button" class="btn btn-outline-glass btn-xs" onclick="window.handleEditCategory('${escapeHtml(c.name)}')" style="font-size: 11px; padding: 4px 8px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);" title="تعديل اسم أو أيقونة القسم">



                        ✏️ تعديل



                    </button>



                    ${!isGeneral ? `



                    <button type="button" class="btn btn-outline-glass btn-xs" onclick="window.handleDeleteCategory('${escapeHtml(c.name)}')" style="font-size: 11px; padding: 4px 8px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" title="حذف هذا القسم">



                        🗑️ حذف



                    </button>



                    ` : ''}



                </div>



            </div>



        `;



    }).join('');



};







window.handleAddNewCategoryFromModal = function() {



    const nameInput = document.getElementById('newCategoryNameInput');



    const iconInput = document.getElementById('newCategoryIconInput');



    const name = nameInput ? nameInput.value.trim() : '';



    const icon = iconInput ? (iconInput.value.trim() || '📦') : '📦';







    if (!name) {



        showToast('يرجى كتابة اسم القسم أولاً', 'warning');



        if (nameInput) nameInput.focus();



        return;



    }







    if (!window.petiCareData) return;



    const ok = window.petiCareData.addCategory(name, icon);



    if (!ok) {



        showToast(`⚠️ القسم "${name}" موجود بالفعل بالمتجر!`, 'warning');



        return;



    }







    if (nameInput) nameInput.value = '';



    if (iconInput) iconInput.value = '📦';



    populateProductCategorySelect();



    renderProductsList();



    window.renderCategoriesManageList();



    showToast(`✅ تم إضافة قسم [${icon} ${name}] بنجاح!`, 'success');



};







window.handleEditCategory = function(oldCatName) {



    if (!window.petiCareData) return;



    const cats = window.petiCareData.getCategories();



    const existing = cats.find(c => c.name === oldCatName);



    const oldIcon = existing ? (existing.icon || '📦') : '📦';







    const newName = prompt(`تعديل اسم القسم:`, oldCatName);



    if (newName === null) return;



    const cleanNewName = newName.trim();



    if (!cleanNewName) {



        showToast('⚠️ لا يمكن ترك اسم القسم فارغاً', 'warning');



        return;



    }







    const newIcon = prompt(`تعديل أيقونة القسم (${cleanNewName}):`, oldIcon);



    const cleanNewIcon = (newIcon === null || !newIcon.trim()) ? oldIcon : newIcon.trim();







    const ok = window.petiCareData.updateCategory(oldCatName, cleanNewName, cleanNewIcon);



    if (ok) {



        populateProductCategorySelect();



        renderProductsList();



        window.renderCategoriesManageList();



        showToast(`✅ تم تحديث قسم [${cleanNewIcon} ${cleanNewName}] بنجاح!`, 'success');



    } else {



        showToast('تعذر تعديل القسم', 'error');



    }



};







window.handleDeleteCategory = function(catName) {



    if (!window.petiCareData) return;



    if (catName === 'عام / أخرى') {



        showToast('⚠️ قسم "عام / أخرى" هو القسم الافتراضي ولا يمكن حذفه', 'warning');



        return;



    }



    const confirmed = confirm(`هل أنت متأكد من حذف قسم "${catName}"؟\n(ملاحظة: سيتم نقل جميع الأصناف التابعة لهذا القسم تلقائياً إلى قسم "عام / أخرى" ولن تضيع).`);



    if (!confirmed) return;







    const ok = window.petiCareData.deleteCategory(catName);



    if (ok) {



        populateProductCategorySelect();



        if (currentStoreCategoryFilter === catName) {



            currentStoreCategoryFilter = 'all';



        }



        renderProductsList();



        window.renderCategoriesManageList();



        showToast(`🗑️ تم حذف قسم "${catName}" ونقل أصنافه بنجاح`, 'info');



    } else {



        showToast('تعذر حذف القسم', 'error');



    }



};





window.deleteVisitFromHistory = function(patientId, visitId) {

    if (!confirm('هل أنت متأكد من حذف هذا الكشف نهائياً من سجل المريض؟')) return;

    try {

        const patient = window.petiCareData.getPatientById(patientId);

        if (patient && Array.isArray(patient.visits)) {

            patient.visits = patient.visits.filter(v => String(v.id) !== String(visitId));

            window.petiCareData.updatePatient(patientId, { visits: patient.visits });

            showToast('🗑️ تم حذف الكشف من سجل المريض بنجاح', 'info');

            openPatientHistory(patientId);

            refreshPatientsUI();

        }

    } catch(e) {

        console.error('Error deleting visit:', e);

        showToast('تعذر حذف الكشف', 'error');

    }

};



// ==========================================
// Cloud & WhatsApp Admin Settings Handlers
// ==========================================
window.openCloudWhatsAppSettingsModal = function() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.style.display = 'none';

    const modal = document.getElementById('modalCloudWhatsAppSettings');
    if (!modal) {
        console.error('modalCloudWhatsAppSettings element not found');
        return;
    }

    try {
        const savedNum = localStorage.getItem('peticare_cfg_whatsapp_num') || '01555345999';
        const savedBridge = localStorage.getItem('peticare_cfg_whatsapp_bridge') || 'https://api.ultramsg.com/instance195707/';
        const savedToken = localStorage.getItem('peticare_cfg_whatsapp_token') || '';
        const savedApiKey = localStorage.getItem('peticare_cfg_cloud_apikey') || '';
        
        const savedEndpoint = localStorage.getItem('peticare_cfg_cloud_endpoint') || '';
        const savedImages = localStorage.getItem('peticare_cfg_cloud_images') || 'Google Drive / Local Storage';

        const numInput = document.getElementById('cfgWhatsAppNumber');
        const bridgeInput = document.getElementById('cfgWhatsAppBridgeUrl');
        const endpointInput = document.getElementById('cfgCloudPatientsEndpoint');
        const imagesInput = document.getElementById('cfgCloudImagesEndpoint');

        if (numInput) numInput.value = savedNum;
        if (bridgeInput) bridgeInput.value = savedBridge;
        if (endpointInput) endpointInput.value = savedEndpoint;
        if (imagesInput) imagesInput.value = savedImages;

        const statusEl = document.getElementById('cfgSettingsStatusMsg');
        if (statusEl) statusEl.style.display = 'none';
    } catch (err) {
        console.warn('Error reading cloud settings:', err);
    }

    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
};

window.closeCloudWhatsAppSettingsModal = function() {
    const modal = document.getElementById('modalCloudWhatsAppSettings');
    if (modal) modal.style.display = 'none';
};

window.saveCloudWhatsAppSettings = function() {
    if (!isUserAdmin()) return;
    const numInput = document.getElementById('cfgWhatsAppNumber');
    const bridgeInput = document.getElementById('cfgWhatsAppBridgeUrl');
    const endpointInput = document.getElementById('cfgCloudPatientsEndpoint');
    const imagesInput = document.getElementById('cfgCloudImagesEndpoint');
    const statusEl = document.getElementById('cfgSettingsStatusMsg');

    const numVal = (numInput?.value || '').trim() || '01555345999';
    const bridgeVal = (bridgeInput?.value || '').trim();
    const endpointVal = (endpointInput?.value || '').trim();
    const imagesVal = (imagesInput?.value || '').trim();

    localStorage.setItem('peticare_cfg_whatsapp_num', numVal);
    localStorage.setItem('peticare_cfg_whatsapp_bridge', bridgeVal);
    if (endpointVal) localStorage.setItem('peticare_cfg_cloud_endpoint', endpointVal);
    if (imagesVal) localStorage.setItem('peticare_cfg_cloud_images', imagesVal);

    if (window.PetiCareCloud && endpointVal) {
        window.PetiCareCloud.updateCustomEndpoint(endpointVal);
    }

    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(16, 185, 129, 0.2)';
        statusEl.style.border = '1px solid #10b981';
        statusEl.style.color = '#6ee7b7';
        statusEl.textContent = '✓ تم حفظ وتحديث إعدادات السحابة والواتساب بنجاح.';
    }

    showToast('✓ تم تفعيل الإعدادات السحابية الجديدة فورياً.', 'success');
    setTimeout(() => {
        closeCloudWhatsAppSettingsModal();
    }, 1200);
};

window.testCloudConnection = async function() {
    const statusEl = document.getElementById('cfgSettingsStatusMsg');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(56, 189, 248, 0.2)';
        statusEl.style.border = '1px solid #38bdf8';
        statusEl.style.color = '#7dd3fc';
        statusEl.textContent = '⏳ جاري فحص الاتصال بالسحابة ومزامنة الكشوفات...';
    }

    try {
        if (window.PetiCareCloud && typeof window.PetiCareCloud.syncAllCloudData === 'function') {
            await window.PetiCareCloud.syncAllCloudData();
            if (statusEl) {
                statusEl.style.background = 'rgba(16, 185, 129, 0.2)';
                statusEl.style.border = '1px solid #10b981';
                statusEl.style.color = '#6ee7b7';
                statusEl.textContent = '✓ الاتصال بالسحابة ممتاز! السيستم متزامن لحظياً بين كافة الأجهزة.';
            }
        } else {
            throw new Error('محرك السحابة غير جاهز');
        }
    } catch (e) {
        if (statusEl) {
            statusEl.style.background = 'rgba(239, 68, 68, 0.2)';
            statusEl.style.border = '1px solid #ef4444';
            statusEl.style.color = '#fca5a5';
            statusEl.textContent = '⚠️ تنبيه في الاتصال: ' + (e.message || 'فشل فحص السحابة');
        }
    }
};

window.showWhatsAppQrCodeModal = function() {
    const bridgeUrl = localStorage.getItem('peticare_cfg_whatsapp_bridge');
    if (!bridgeUrl) {
        alert('يرجى أولاً إدخال رابط خادم الواتساب المعتمد للعيادة، أو الاعتماد على وضع الربط الافتراضي.');
        return;
    }
    window.open(bridgeUrl + '/qr', '_blank', 'width=450,height=550');
};

window.unlinkWhatsAppSession = function() {
    if (!confirm('هل أنت متأكد من فك ارتباط جلسة الواتساب الحالية؟ ستحتاج لمسح الباركود مجدداً.')) return;
    localStorage.removeItem('peticare_cfg_whatsapp_bridge');
    showToast('تم فك ارتباط الواتساب. يمكنك ربط رقم جديد في أي وقت.', 'info');
    const bridgeInput = document.getElementById('cfgWhatsAppBridgeUrl');
    if (bridgeInput) bridgeInput.value = '';
};


/**
 * PetiCare v49 Handover Features: Live Today Feed, Edit Visit, Debt Settlement & 11PM Radar
 */

// --- A) Meta WhatsApp Settings Manager ---
function openCloudWhatsAppSettingsModal() {
    const modal = document.getElementById('modalCloudWhatsAppSettings');
    if (!modal) return;
    const phoneIdInput = document.getElementById('cfgMetaPhoneId');
    const tokenInput = document.getElementById('cfgMetaAccessToken');
    const templateInput = document.getElementById('cfgMetaTemplateName');
    const doctorPhoneInput = document.getElementById('cfgDoctorForwardPhone');

    if (phoneIdInput) phoneIdInput.value = localStorage.getItem('peticare_meta_phone_id') || '';
    if (tokenInput) tokenInput.value = localStorage.getItem('peticare_meta_access_token') || '';
    if (templateInput) templateInput.value = localStorage.getItem('peticare_meta_template_name') || 'peticare_report';
    if (doctorPhoneInput) doctorPhoneInput.value = localStorage.getItem('peticare_doctor_forward_phone') || '201555345999';

    modal.style.display = 'flex';
}

function closeCloudWhatsAppSettingsModal() {
    const modal = document.getElementById('modalCloudWhatsAppSettings');
    if (modal) modal.style.display = 'none';
}

function saveMetaWhatsAppSettings() {
    const phoneIdInput = document.getElementById('cfgMetaPhoneId');
    const tokenInput = document.getElementById('cfgMetaAccessToken');
    const templateInput = document.getElementById('cfgMetaTemplateName');
    const doctorPhoneInput = document.getElementById('cfgDoctorForwardPhone');

    if (phoneIdInput) localStorage.setItem('peticare_meta_phone_id', phoneIdInput.value.trim());
    if (tokenInput) localStorage.setItem('peticare_meta_access_token', tokenInput.value.trim());
    if (templateInput) localStorage.setItem('peticare_meta_template_name', templateInput.value.trim() || 'peticare_report');
    if (doctorPhoneInput) localStorage.setItem('peticare_doctor_forward_phone', doctorPhoneInput.value.trim() || '201555345999');

    closeCloudWhatsAppSettingsModal();
    if (typeof showToast === 'function') showToast('✅ تم حفظ إعدادات Meta WhatsApp Cloud API بنجاح!', 'success');
}

// --- B) Streamlined Bottom Sheet Offline QR Code Toggle ---
function toggleOfflineVisitQR() {
    const box = document.getElementById('offlineVisitQRContainer');
    const qrDiv = document.getElementById('offlineVisitQRCodeBox');
    if (!box || !qrDiv) return;

    if (box.style.display === 'none' || !box.style.display) {
        if (currentSavedVisitData && currentSavedVisitData.patient && currentSavedVisitData.visit) {
            qrDiv.innerHTML = '';
            const reportText = formatVisitQRReport(currentSavedVisitData.patient, currentSavedVisitData.visit);
            if (window.QRCode) {
                new window.QRCode(qrDiv, {
                    text: reportText,
                    width: 220,
                    height: 220,
                    colorDark: "#064e3b",
                    colorLight: "#ffffff",
                    correctLevel: (window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.L : 1)
                });
            }
        }
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

function sendVisitReportViaWhatsApp() {
    if (currentSavedVisitData && currentSavedVisitData.patient && currentSavedVisitData.visit) {
        sendVisitViaWhatsApp(currentSavedVisitData.patient, currentSavedVisitData.visit);
    }
}

// --- C) Live "Today's Consultations" Feed Modal & Realtime Binding ---
let allTodayVisitsCache = [];

function openLiveTodayVisitsModal() {
    const modal = document.getElementById('modalLiveTodayVisits');
    if (!modal) return;
    refreshLiveTodayVisitsUI();
    modal.style.display = 'flex';
}

function closeLiveTodayVisitsModal() {
    const modal = document.getElementById('modalLiveTodayVisits');
    if (modal) modal.style.display = 'none';
}

function refreshLiveTodayVisitsUI() {
    if (!window.petiCareData) return;
    const todayStr = getCairoDateString();

    const patients = window.petiCareData.getPatients(false) || [];
    const todayVisits = [];

    patients.forEach(p => {
        if (!Array.isArray(p.visits)) return;
        p.visits.forEach(v => {
            const vDate = v.date || (v.created_at ? v.created_at.split('T')[0] : '');
            if (vDate === todayStr) {
                todayVisits.push({
                    patientId: p.id,
                    petName: p.name || 'أليف',
                    petType: p.type || '',
                    ownerName: p.ownerName || p.owner_name || 'عميل',
                    phone: p.phone || '',
                    visit: v
                });
            }
        });
    });

    // Sort newest first by timestamp or id
    todayVisits.sort((a, b) => {
        const timeA = a.visit.created_at ? new Date(a.visit.created_at).getTime() : (a.visit.id || 0);
        const timeB = b.visit.created_at ? new Date(b.visit.created_at).getTime() : (b.visit.id || 0);
        return timeB - timeA;
    });

    allTodayVisitsCache = todayVisits;

    // Update Header Badge
    const badge = document.getElementById('liveTodayVisitsCount');
    if (badge) badge.textContent = todayVisits.length;

    // Calculate Top KPI Counters
    let totalFees = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    todayVisits.forEach(item => {
        const v = item.visit;
        const fee = Number(v.fee) || 0;
        const paid = Number(v.paid) || 0;
        const rem = v.remaining !== undefined ? Number(v.remaining) : Math.max(0, fee - paid);
        totalFees += fee;
        totalPaid += paid;
        totalRemaining += rem;
    });

    const statTotal = document.getElementById('liveStatTotal');
    const statCollected = document.getElementById('liveStatCollected');
    const statRemaining = document.getElementById('liveStatRemaining');

    if (statTotal) statTotal.textContent = todayVisits.length;
    if (statCollected) statCollected.textContent = `${totalPaid.toLocaleString()} ج.م`;
    if (statRemaining) statRemaining.textContent = `${totalRemaining.toLocaleString()} ج.م`;

    renderLiveTodayVisitsList(todayVisits);
}

function filterLiveTodayVisits(q) {
    if (!q || !q.trim()) {
        renderLiveTodayVisitsList(allTodayVisitsCache);
        return;
    }
    const term = q.trim().toLowerCase();
    const filtered = allTodayVisitsCache.filter(item => {
        return (item.petName && item.petName.toLowerCase().includes(term)) ||
               (item.ownerName && item.ownerName.toLowerCase().includes(term)) ||
               (item.phone && item.phone.includes(term)) ||
               (item.visit.diagnosis && item.visit.diagnosis.toLowerCase().includes(term)) ||
               (item.visit.doctorName && item.visit.doctorName.toLowerCase().includes(term));
    });
    renderLiveTodayVisitsList(filtered);
}

function renderLiveTodayVisitsList(visitsList) {
    const container = document.getElementById('liveTodayVisitsList');
    if (!container) return;

    if (!visitsList || visitsList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #94a3b8;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">🐾</span>
                <strong>لا توجد كشوفات مسجلة اليوم حتى الآن</strong>
                <p style="font-size: 11px; margin-top: 4px;">أي كشف يتم حفظه في أي غرفة كشف بالعيادة سيظهر هنا فورياً.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visitsList.map(item => {
        const v = item.visit;
        const fee = Number(v.fee) || 0;
        const paid = Number(v.paid) || 0;
        const rem = v.remaining !== undefined ? Number(v.remaining) : Math.max(0, fee - paid);
        const isSettled = rem <= 0;
        const docName = v.doctorName || v.doctor || 'طبيب العيادة';
        const vTime = v.created_at ? new Date(v.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : (v.time || 'اليوم');
        const vType = v.visitType || 'كشف عام';

        return `
            <div class="glass-card" style="padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(30, 41, 59, 0.7); display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">🐾</span>
                        <div>
                            <strong style="color: #f8fafc; font-size: 14px;">${item.petName}</strong>
                            <span style="font-size: 11px; color: #94a3b8;">(${item.petType}) - ملف #${item.patientId}</span>
                            <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
                                👤 ${item.ownerName} - 📞 <a href="tel:${item.phone}" style="color: #38bdf8; text-decoration: none;">${item.phone || 'بدون هاتف'}</a>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #7dd3fc; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${vType}</span>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">⏰ ${vTime} | 👨‍⚕️ ${docName}</div>
                    </div>
                </div>

                <div style="background: rgba(15, 23, 42, 0.5); padding: 8px 12px; border-radius: 8px; font-size: 11px; color: #cbd5e1;">
                    <div>🩺 <strong>التشخيص:</strong> ${v.diagnosis || 'كشف سريري'}</div>
                    <div style="margin-top: 3px;">💊 <strong>العلاج:</strong> ${v.treatment || 'متابعة طبية'}</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
                    <div style="font-size: 12px;">
                        <span>الأتعاب: <strong style="color: #7dd3fc;">${fee} ج.م</strong></span>
                        <span style="margin: 0 6px; color: #64748b;">|</span>
                        <span>المدفوع: <strong style="color: #10b981;">${paid} ج.م</strong></span>
                        <span style="margin: 0 6px; color: #64748b;">|</span>
                        ${isSettled 
                            ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px; padding:2px 8px; border-radius:10px;">خالص ✓</span>'
                            : `<span style="color: #ef4444; font-weight: 800;">متبقي: ${rem} ج.م</span>`
                        }
                    </div>

                    <div style="display: flex; gap: 6px;">
                        ${!isSettled ? `
                            <button type="button" class="btn btn-sm" onclick="settleVisitDebt('${item.patientId}', '${v.id}')" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 700;">
                                💵 تسديد المتبقي
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openEditVisitModal('${item.patientId}', '${v.id}')" style="font-size: 11px; padding: 4px 10px; border-radius: 6px;">
                            ✏️ تعديل
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let editVisitAttachments = {
    prescriptionImage: '',
    labImages: [],
    caseImage: ''
};

function renderEditAttachmentsUI() {
    // 1. Prescription
    const rxBox = document.getElementById('editPrescriptionPreviewBox');
    if (rxBox) {
        if (editVisitAttachments.prescriptionImage) {
            const isPdf = editVisitAttachments.prescriptionImage.startsWith('data:application/pdf');
            if (isPdf) {
                rxBox.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: #7dd3fc;">
                        <span>📄 ملف PDF روشتة مرفق</span>
                        <button type="button" onclick="openPhotoLightbox('${editVisitAttachments.prescriptionImage}', 'الروشتة')" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:10px;">👁️ عرض</button>
                    </div>`;
            } else {
                rxBox.innerHTML = `
                    <img src="${editVisitAttachments.prescriptionImage}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid #38bdf8; cursor: pointer;" onclick="openPhotoLightbox('${editVisitAttachments.prescriptionImage}', 'الروشتة')" title="اضغط للتكبير">
                `;
            }
        } else {
            rxBox.innerHTML = `<span style="font-size: 11px; color: #64748b;">لا توجد روشتة مرفقة</span>`;
        }
    }

    // 2. Labs
    const labsBox = document.getElementById('editLabsPreviewBox');
    if (labsBox) {
        if (Array.isArray(editVisitAttachments.labImages) && editVisitAttachments.labImages.length > 0) {
            labsBox.innerHTML = editVisitAttachments.labImages.map((img, i) => {
                const isPdf = img.startsWith('data:application/pdf');
                if (isPdf) {
                    return `
                        <div style="display: flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 6px; border-radius: 6px; font-size: 10px; color: #fcd34d;">
                            <span>📄 PDF تحليل #${i + 1}</span>
                            <button type="button" onclick="removeEditAttachment('lab', ${i})" style="background:none; border:none; color:#fca5a5; cursor:pointer; font-size:11px; padding:0 2px;">✕</button>
                        </div>
                    `;
                }
                return `
                    <div style="position: relative; display: inline-block;">
                        <img src="${img}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid #f59e0b; cursor: pointer;" onclick="openPhotoLightbox('${img}', 'تحليل #${i + 1}')">
                        <button type="button" onclick="removeEditAttachment('lab', ${i})" style="position: absolute; top: -4px; left: -4px; background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>
                `;
            }).join('');
        } else {
            labsBox.innerHTML = `<span style="font-size: 11px; color: #64748b;">لا توجد تحاليل مرفقة</span>`;
        }
    }

    // 3. Case
    const caseBox = document.getElementById('editCasePreviewBox');
    if (caseBox) {
        if (editVisitAttachments.caseImage) {
            caseBox.innerHTML = `
                <img src="${editVisitAttachments.caseImage}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid #10b981; cursor: pointer;" onclick="openPhotoLightbox('${editVisitAttachments.caseImage}', 'صورة الحالة')">
            `;
        } else {
            caseBox.innerHTML = `<span style="font-size: 11px; color: #64748b;">لا توجد صورة للحالة</span>`;
        }
    }
}

async function handleEditAttachmentUpload(type, file) {
    if (!file) return;

    if (file.type === 'application/pdf') {
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم ملف الـ PDF كبير جداً. الحد الأقصى 5 ميجابايت.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            if (type === 'prescription') editVisitAttachments.prescriptionImage = dataUrl;
            else if (type === 'lab') editVisitAttachments.labImages.push(dataUrl);
            renderEditAttachmentsUI();
        };
        reader.readAsDataURL(file);
    } else {
        // Compress image to 1000px, quality 0.72 (~50KB)
        const reader = new FileReader();
        reader.onload = async function(e) {
            let compressed = e.target.result;
            if (window.PetiCareImages && typeof window.PetiCareImages.compressImage === 'function') {
                compressed = await window.PetiCareImages.compressImage(e.target.result, 1000, 1000, 0.72);
            }
            if (type === 'prescription') editVisitAttachments.prescriptionImage = compressed;
            else if (type === 'case') editVisitAttachments.caseImage = compressed;
            else if (type === 'lab') editVisitAttachments.labImages.push(compressed);
            renderEditAttachmentsUI();
        };
        reader.readAsDataURL(file);
    }
}
window.handleEditAttachmentUpload = handleEditAttachmentUpload;

function removeEditAttachment(type, index = null) {
    if (type === 'prescription') {
        editVisitAttachments.prescriptionImage = '';
    } else if (type === 'case') {
        editVisitAttachments.caseImage = '';
    } else if (type === 'lab' && index !== null) {
        editVisitAttachments.labImages.splice(index, 1);
    }
    renderEditAttachmentsUI();
}
window.removeEditAttachment = removeEditAttachment;

// --- D) Enhanced Edit Saved Visit Modal Logic ---
function openEditVisitModal(patientId, visitId) {
    if (!window.petiCareData) return;
    const p = window.petiCareData.getPatientById(patientId);
    if (!p || !Array.isArray(p.visits)) return;
    const v = p.visits.find(x => String(x.id) === String(visitId));
    if (!v) return;

    document.getElementById('editVisitPatientId').value = patientId;
    document.getElementById('editVisitId').value = visitId;
    document.getElementById('editVisitDiagnosis').value = v.diagnosis || '';
    document.getElementById('editVisitTreatment').value = v.treatment || '';
    document.getElementById('editVisitDosage').value = v.dosage || '';
    document.getElementById('editVisitLabs').value = (v.labs && v.labs !== 'لا يوجد' && v.labs !== 'لا توجد تحاليل') ? v.labs : '';
    document.getElementById('editVisitFollowDays').value = v.followUpDays || '';

    const fee = Number(v.fee) || 0;
    const paid = Number(v.paid) || 0;
    document.getElementById('editVisitFee').value = fee;
    document.getElementById('editVisitPaid').value = paid;
    document.getElementById('editVisitRemaining').value = Math.max(0, fee - paid);

    const sub = document.getElementById('editVisitSubHeader');
    if (sub) {
        sub.textContent = `تعديل كشف: ${p.name || 'أليف'} (ملف #${p.id}) - بتاريخ ${v.date}`;
    }

    // Load existing attachments
    editVisitAttachments = {
        prescriptionImage: v.prescriptionImage || '',
        labImages: Array.isArray(v.labImages) ? [...v.labImages] : (v.labImage ? [v.labImage] : []),
        caseImage: v.caseImage || ''
    };
    renderEditAttachmentsUI();

    const modal = document.getElementById('modalEditVisit');
    if (modal) modal.style.display = 'flex';
}

function closeEditVisitModal() {
    const modal = document.getElementById('modalEditVisit');
    if (modal) modal.style.display = 'none';
}

function calculateEditVisitRemaining() {
    const fee = Number(document.getElementById('editVisitFee').value) || 0;
    const paid = Number(document.getElementById('editVisitPaid').value) || 0;
    document.getElementById('editVisitRemaining').value = Math.max(0, fee - paid);
}

function saveEditedVisit() {
    if (!window.petiCareData) return;
    const patientId = document.getElementById('editVisitPatientId').value;
    const visitId = document.getElementById('editVisitId').value;

    const fee = Number(document.getElementById('editVisitFee').value) || 0;
    const paid = Number(document.getElementById('editVisitPaid').value) || 0;
    const followDays = parseInt(document.getElementById('editVisitFollowDays').value, 10) || 0;
    
    let followUpDate = '';
    if (followDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + followDays);
        followUpDate = getCairoDateString(d);
    }

    const updatedFields = {
        diagnosis: document.getElementById('editVisitDiagnosis').value.trim(),
        treatment: document.getElementById('editVisitTreatment').value.trim(),
        dosage: document.getElementById('editVisitDosage').value.trim(),
        labs: document.getElementById('editVisitLabs').value.trim(),
        fee: fee,
        paid: paid,
        remaining: Math.max(0, fee - paid),
        followUpDays: followDays,
        followUpDate: followUpDate,
        prescriptionImage: editVisitAttachments.prescriptionImage || '',
        labImages: [...editVisitAttachments.labImages],
        caseImage: editVisitAttachments.caseImage || '',
        updated_at: Date.now()
    };

    const res = window.petiCareData.updateVisitInPatient(patientId, visitId, updatedFields);
    if (res) {
        closeEditVisitModal();
        if (typeof refreshLiveTodayVisitsUI === 'function') refreshLiveTodayVisitsUI();
        if (typeof showPatientHistory === 'function' && currentSelectedPatient && String(currentSelectedPatient.id) === String(patientId)) {
            showPatientHistory(patientId);
        }
        if (currentSavedVisitData && currentSavedVisitData.visit && String(currentSavedVisitData.visit.id) === String(visitId)) {
            currentSavedVisitData.visit = res.visit;
            if (typeof renderSheetSummary === 'function') {
                renderSheetSummary(currentSavedVisitData.patient, currentSavedVisitData.visit);
            }
        }
        if (typeof showToast === 'function') showToast('✅ تم حفظ التعديلات والمرفقات وتحديث السحابة بنجاح!', 'success');
    } else {
        alert('حدث خطأ أثناء حفظ التعديل، يرجى المحاولة مرة أخرى.');
    }
}

// --- E) One-Click Debt Settlement ---
function settleVisitDebt(patientId, visitId) {
    if (!window.petiCareData) return;
    const ok = window.petiCareData.settleVisitDebt(patientId, visitId);
    if (ok) {
        refreshLiveTodayVisitsUI();
        if (typeof showPatientHistory === 'function' && currentSelectedPatient && currentSelectedPatient.id === patientId) {
            showPatientHistory(patientId);
        }
        if (typeof showToast === 'function') showToast('💵 تم تسديد المتبقي بالكامل وتحديث الحساب لحظياً!', 'success');
    }
}

// --- F) 11:00 PM Smart Follow-Up Radar Alert to Doctor ---
function checkDoctor11PMRadarAlert() {
    try {
        const now = new Date();
        const cairoHour = Number(now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false, hour: 'numeric' }));
        const todayStr = getCairoDateString(now);
        const lastAlertDate = localStorage.getItem('peticare_last_doctor_radar_alert');

        if (cairoHour >= 23 && lastAlertDate !== todayStr) {
            if (!window.petiCareData) return;
            const dueTomorrow = window.petiCareData.getRadarFollowUps('tomorrow') || [];
            if (dueTomorrow.length > 0) {
                const count = dueTomorrow.length;
                const namesList = dueTomorrow.slice(0, 8).map((p, i) => `${i + 1}. ${p.name || 'أليف'} (${p.ownerName || 'عميل'})`).join('\n');
                const forwardPhone = localStorage.getItem('peticare_doctor_forward_phone') || '201555345999';

                const alertMsg = `📡 *رادار بيتي كير الذكي (تذكير الساعة 11 مساءً)*\nأهلاً دكتور شريف، يوجد غداً بإذن الله عدد (${count}) حالات مستحقة لكشف الإعادة والمتابعة:\n${namesList}\n\n🔗 *اضغط هنا لفتح الرادار ومراجعتهم أو إرسال التذكير لهم جميعاً بضغطة واحدة:*\nhttps://peticare-animal-hospital.pages.dev/doctor.html?open_radar=1#radar`;

                sendMetaWhatsAppMessage(forwardPhone, alertMsg).then(res => {
                    if (res && res.ok) {
                        localStorage.setItem('peticare_last_doctor_radar_alert', todayStr);
                        console.log('📡 11 PM Radar alert dispatched successfully to doctor personal WhatsApp.');
                    }
                });
            }
        }
    } catch (e) {
        console.warn('checkDoctor11PMRadarAlert error:', e);
    }
}

// Check on page load for ?open_radar=1 or #radar
document.addEventListener('DOMContentLoaded', () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('open_radar') === '1' || window.location.hash === '#radar') {
            setTimeout(() => {
                if (typeof switchTab === 'function') switchTab('radar');
                else if (typeof switchSection === 'function') switchSection('section-radar');
                const tomorrowBtn = document.getElementById('btnRadarTomorrow');
                if (tomorrowBtn) tomorrowBtn.click();
            }, 600);
        }

        // Initialize Live Today Consultations counter on load
        setTimeout(() => {
            refreshLiveTodayVisitsUI();
            checkDoctor11PMRadarAlert();
        }, 1200);
    } catch(e) {}
});
