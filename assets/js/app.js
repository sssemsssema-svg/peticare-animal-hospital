function escapeHtml(str) {

    if (str === null || str === undefined) return '';

    return String(str)

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#039;');

}

if (typeof window !== 'undefined') window.escapeHtml = escapeHtml;



/**

 * PetiCare Animal Hospital - Client Portal Logic (client.html)

 * Dr. Sherif Diab Official Edition

 * - Smooth Fly-to-Header Logo Animation from Center

 * - AI Talking Vet & Live Audio Waveform

 * - Interactive Medication Pills with Sound & Vibrate

 * - Pet Bravery Certificate with Dr. Sherif Diab Endorsement

 * - 24/7 Organized Emergency Consultation & Official Clinic Contacts

 */



document.addEventListener('DOMContentLoaded', () => {

  initClientPortal();

});



let currentClientData = null;

let isPlayingClientVoice = false;



function initClientPortal() {

  initClientSplashFlyAnimation();

  currentClientData = PetiCareDB.parseClientUrl();

  renderClientPage(currentClientData);

  initPrescriptionActions();

  initEmergencyModal();

  initSocialMediaHub();

  initLiveSyncListener();

  renderEmergencyQR(currentClientData);

  renderBeforeAfterAlbum(currentClientData);

  initClientPetShop();

  initPetProfileEditor();

  initClientNavTabs();

}



// ----------------------------------------------------

// 1. Splash Screen & Smooth Fly-to-Header Animation

// ----------------------------------------------------

function dismissClientSplash() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.transition = 'opacity 0.4s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      splash.classList.add('hidden');
    }, 400);
  }
}
window.dismissClientSplash = dismissClientSplash;

function initClientSplashFlyAnimation() {
  const splash = document.getElementById('splash-screen');
  const splashImg = document.getElementById('splash-logo-img');
  const enterBtn = document.getElementById('btn-splash-enter');
  const targetHeaderLogo = document.getElementById('client-header-logo');

  if (!splash) return;

  let hasFlown = false;

  function flyLogoToHeader() {
    if (hasFlown) return;
    hasFlown = true;

    try {
      if (typeof window.playMeowSound === 'function') window.playMeowSound();
      else if (window.PetiCareDB && typeof window.PetiCareDB.playMeow === 'function') window.PetiCareDB.playMeow();
    } catch(e) {}

    try {
      if (splashImg && targetHeaderLogo) {
        const startRect = splashImg.getBoundingClientRect();
        const endRect = targetHeaderLogo.getBoundingClientRect();

        const clone = document.createElement('img');
        clone.src = splashImg.src;
        clone.className = 'flying-logo-clone';
        clone.style.top = `${startRect.top}px`;
        clone.style.left = `${startRect.left}px`;
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;
        document.body.appendChild(clone);

        splash.style.transition = 'opacity 0.5s ease';
        splash.style.opacity = '0';

        requestAnimationFrame(() => {
          clone.style.top = `${endRect.top}px`;
          clone.style.left = `${endRect.left}px`;
          clone.style.width = `${endRect.width}px`;
          clone.style.height = `${endRect.height}px`;
        });

        setTimeout(() => {
          splash.style.display = 'none';
          splash.classList.add('hidden');
          clone.remove();
          targetHeaderLogo.src = 'assets/images/splash-logo.gif';
          targetHeaderLogo.style.opacity = '1';
        }, 800);
      } else {
        splash.style.display = 'none';
        splash.classList.add('hidden');
      }
    } catch(err) {
      splash.style.display = 'none';
      splash.classList.add('hidden');
    }
  }

  // Click on enter button
  if (enterBtn) enterBtn.addEventListener('click', flyLogoToHeader);

  // Click ANYWHERE on splash screen to dismiss immediately
  splash.addEventListener('click', flyLogoToHeader);

  // Auto-dismiss after 1.5 seconds if user didn't tap
  setTimeout(() => {
    if (!hasFlown && splash && !splash.classList.contains('hidden')) {
      flyLogoToHeader();
    }
  }, 1500);
}

function renderClientPage(data) {

  if (!data) {

    const petNameEl = document.getElementById('client-pet-name');

    if (petNameEl) petNameEl.textContent = 'لا توجد بيانات مسجلة حالياً';

    const petSubEl = document.getElementById('client-pet-sub');

    if (petSubEl) petSubEl.textContent = 'يرجى تسجيل الدخول برقم ملف الأليف الممنوح من العيادة';

    const greetEl = document.getElementById('client-greeting');

    if (greetEl) greetEl.textContent = 'مرحباً بكم في PetiCare Animal Hospital 🐾';

    const diagEl = document.getElementById('client-diagnosis-text');

    if (diagEl) diagEl.textContent = 'لا يوجد كشف مسجل حتى الآن.';

    const docMsgEl = document.getElementById('client-doctor-msg');

    if (docMsgEl) docMsgEl.textContent = 'أهلاً بكم في عيادة د. شريف دياب. ستظهر روشتة وتعليمات الأليف فور اعتمادها.';

    const dietEl = document.getElementById('client-diet-text');

    if (dietEl) dietEl.textContent = '—';

    const revisitEl = document.getElementById('client-revisit-text');

    if (revisitEl) revisitEl.textContent = '—';

    const tblPetName = document.getElementById('client-table-pet-name');

    if (tblPetName) tblPetName.textContent = '—';

    const tblRx = document.getElementById('client-table-rx');

    if (tblRx) tblRx.textContent = 'لا توجد أدوية مسجلة';

    renderClientPrescriptions([]);

    return;

  }



  const pName = data.name || data.petName || 'بطلنا الجميل';

  const pSpecies = data.species || data.speciesName || 'أليف PetiCare';

  const pOwner = data.owner || data.ownerName || 'العزيز';



  const petNameEl = document.getElementById('client-pet-name');

  if (petNameEl) petNameEl.textContent = pName;



  const petSubEl = document.getElementById('client-pet-sub');

  if (petSubEl) petSubEl.textContent = `${pSpecies} • رعاية د. شريف دياب`;



  const greetEl = document.getElementById('client-greeting');

  if (greetEl) greetEl.textContent = `أهلاً بك يا أستاذ ${pOwner} 🐾`;



  const diagEl = document.getElementById('client-diagnosis-text');

  if (diagEl) diagEl.textContent = data.diagnosis || 'فحص شامل ومتابعة دورية.';



  const docMsg = data.doctorMsg || data.doctorMessage || 'حمد لله على سلامة أليفنا البطل!';

  const docMsgEl = document.getElementById('client-doctor-msg');

  if (docMsgEl) docMsgEl.textContent = docMsg;



  const dietEl = document.getElementById('client-diet-text');

  if (dietEl) dietEl.textContent = data.feedingDiet || 'وجبات خفيفة وسهلة الهضم مع ماء وفير.';



  const revisitEl = document.getElementById('client-revisit-text');

  if (revisitEl) {

    const days = String(data.revisitDays || '3');

    if (days === '1') {

      revisitEl.textContent = 'غداً (خلال 24 ساعة)';

    } else if (days === '2') {

      revisitEl.textContent = 'بعد يومين (48 ساعة)';

    } else {

      revisitEl.textContent = `بعد ${days} أيام`;

    }

  }



  const tblPetName = document.getElementById('client-table-pet-name');

  if (tblPetName) tblPetName.textContent = `${pName} (${pSpecies})`;



  const tblRx = document.getElementById('client-table-rx');

  if (tblRx) {

    if (data.rxSummary) {

      tblRx.textContent = data.rxSummary;

    } else if (data.meds || data.medications) {

      const list = data.meds || data.medications;

      tblRx.textContent = list.map(m => `• ${m.name} (${m.dose})`).join('\n') || 'لا توجد أدوية حالياً';

    }

  }



  const surgeryNotice = document.getElementById('client-surgery-notice');

  if (surgeryNotice) {

    surgeryNotice.style.display = (data.followUp && data.followUp.surgeryType) ? 'block' : 'none';

  }



  renderGroomingStatus(data.groomingStatus || 'ready');

  renderClientPrescriptions(data.meds || data.medications || []);

  renderClientVideo(data);

}



// ----------------------------------------------------

// 3. Live Grooming & Boarding Progress

// ----------------------------------------------------

function renderGroomingStatus(status) {

  const container = document.getElementById('client-grooming-tracker');

  if (!container) return;



  let text = "✨ الأليف جاهز ومفحوص تماماً وزي القمر";

  let stepIdx = 3;



  if (status === 'bathing') {

    text = "🛁 الأليف حالياً في حوض الشاور بالشامبو المخصص";

    stepIdx = 1;

  } else if (status === 'drying') {

    text = "✂️ جاري التجفيف والتمشيط وقص الشعر والأظافر";

    stepIdx = 2;

  }



  container.innerHTML = `

    <div style="background:rgba(255,255,255,0.85); border:1px solid var(--border-glass); border-radius:16px; padding:16px; box-shadow:var(--shadow-sm);">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">

        <h4 style="font-size:14px; font-weight:800; color:var(--secondary); display:flex; align-items:center; gap:8px;">

          <img src="assets/images/paw-icon.jpg" style="width:20px; height:20px;">

          <span>متابعة حالة الشاور والفندقة لايف:</span>

        </h4>

        <span style="font-size:11px; background:#E0F2FE; color:#0369A1; padding:3px 10px; border-radius:20px; font-weight:bold;">تحديث فوري 🟢</span>

      </div>

      <div style="background:rgba(248, 250, 252, 0.9); border-radius:12px; padding:10px 14px; font-size:13px; font-weight:700; color:var(--secondary); border:1px solid #CBD5E1;">

        ${text}

      </div>

      <div style="display:flex; gap:6px; margin-top:10px;">

        <div style="flex:1; height:6px; border-radius:4px; background:${stepIdx >= 1 ? 'var(--primary)' : '#E2E8F0'};"></div>

        <div style="flex:1; height:6px; border-radius:4px; background:${stepIdx >= 2 ? 'var(--primary)' : '#E2E8F0'};"></div>

        <div style="flex:1; height:6px; border-radius:4px; background:${stepIdx >= 3 ? 'var(--success)' : '#E2E8F0'};"></div>

      </div>

    </div>

  `;

}



// ----------------------------------------------------

// 4. Talking Vet Voice Synthesis in Client Screen

// ----------------------------------------------------

function initPrescriptionActions() {

  const btnPlayVoice = document.getElementById('btn-client-talking-vet');

  const avatar = document.getElementById('client-talking-avatar');

  const wave = document.getElementById('client-voice-waveform');



  if (btnPlayVoice) {

    btnPlayVoice.addEventListener('click', () => {

      if (isPlayingClientVoice) {

        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        isPlayingClientVoice = false;

        if (avatar) avatar.classList.remove('speaking');

        if (wave) wave.classList.remove('playing');

        btnPlayVoice.innerHTML = `<span>▶</span> استمع لشرح د. شريف دياب الصوتي للحالة`;

        return;

      }



      const pName = currentClientData.name || currentClientData.petName || 'بطلنا';

      const textToSpeak = `أهلاً بحضرتك يا فندم! 🐾 معاك دكتور شريف دياب من مستشفى بيتيكير. بخصوص بطلنا ${pName}، بعد الفحص الطبي: ${currentClientData.diagnosis || ''}. التقرير الطبي هو: ${currentClientData.doctorMsg || currentClientData.doctorMessage || ''}. والتغذية المسموحة: ${currentClientData.feedingDiet || ''}. ألف سلامة عليه ونحن في خدمتكم دائماً على مدار 24 ساعة!`;



      isPlayingClientVoice = true;

      if (avatar) avatar.classList.add('speaking');

      if (wave) wave.classList.add('playing');

      btnPlayVoice.innerHTML = `<span>⏹️</span> إيقاف الشرح الصوتي`;



      if ('speechSynthesis' in window) {

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        utterance.lang = 'ar-SA';

        utterance.rate = 0.95;

        utterance.onend = () => {

          isPlayingClientVoice = false;

          if (avatar) avatar.classList.remove('speaking');

          if (wave) wave.classList.remove('playing');

          btnPlayVoice.innerHTML = `<span>▶</span> استمع لشرح د. شريف دياب الصوتي للحالة`;

        };

        window.speechSynthesis.speak(utterance);

      } else {

        PetiCareDB.playSync();

        setTimeout(() => {

          isPlayingClientVoice = false;

          if (avatar) avatar.classList.remove('speaking');

          if (wave) wave.classList.remove('playing');

          btnPlayVoice.innerHTML = `<span>▶</span> استمع لشرح د. شريف دياب الصوتي للحالة`;

        }, 3000);

      }

    });

  }

}



// ----------------------------------------------------

// 5. Interactive Prescriptions (pill-icon.jpg + Vibrate + Meow)

// ----------------------------------------------------

function renderClientPrescriptions(medications) {

  const container = document.getElementById('client-meds-container');

  if (!container) return;



  if (medications.length === 0) {

    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:16px;">لا توجد أدوية مسجلة - أليفكم بأفضل صحة وسلامة! ✨</p>`;

    return;

  }



  container.innerHTML = medications.map(med => `

    <div class="med-card" id="med-card-${med.id}">

      <div class="med-header">

        <div class="med-name">

          <img src="assets/images/pill-icon.jpg" class="icon-img-md" alt="Pill">

          <div>

            <span>${med.name}</span>

            <div style="font-size:12px; color:var(--text-muted); font-weight:normal;">${med.dose} • ${med.period}</div>

          </div>

        </div>

        <span style="font-size:11px; background:#E8F5E9; color:#0F9F90; padding:2px 8px; border-radius:6px; font-weight:bold;">معتمد ✓</span>

      </div>



      <div class="med-times">

        ${med.morning ? `

          <button class="time-slot-btn ${med.morningTaken ? 'taken' : ''}" onclick="toggleMedDose('${med.id}', 'morning')">

            <span>☀️ الجرعة الصباحية</span>

            <span>${med.morningTaken ? '✓ تم الإعطاء' : '○ اضغط للتأكيد'}</span>

          </button>

        ` : ''}



        ${med.night ? `

          <button class="time-slot-btn ${med.nightTaken ? 'taken' : ''}" onclick="toggleMedDose('${med.id}', 'night')">

            <span>🌙 الجرعة المسائية</span>

            <span>${med.nightTaken ? '✓ تم الإعطاء' : '○ اضغط للتأكيد'}</span>

          </button>

        ` : ''}

      </div>

    </div>

  `).join('');



  checkAllDosesCompletion(medications);

}



window.toggleMedDose = function(medId, timeSlot) {

  PetiCareDB.playMeow();



  const meds = currentClientData.meds || currentClientData.medications || [];

  const med = meds.find(m => m.id === medId);

  if (med) {

    if (timeSlot === 'morning') med.morningTaken = !med.morningTaken;

    if (timeSlot === 'night') med.nightTaken = !med.nightTaken;

  }



  if (currentClientData.id) {

    PetiCareDB.toggleMedicationTaken(currentClientData.id, medId, timeSlot);

  }



  renderClientPrescriptions(meds);



  const isTaken = (timeSlot === 'morning' ? med.morningTaken : med.nightTaken);

  showToast(isTaken ? 'شاطر جداً! تم تأكيد إعطاء الجرعة بنجاح 🐾✨' : 'تم إلغاء تحديد الجرعة.');

};



// ----------------------------------------------------

// 6. Pet Bravery Certificate

// ----------------------------------------------------

function checkAllDosesCompletion(medications) {

  if (!medications || medications.length === 0) return;



  const allTaken = medications.every(m => {

    const morningOk = !m.morning || m.morningTaken;

    const nightOk = !m.night || m.nightTaken;

    return morningOk && nightOk;

  });



  if (allTaken) {

    showBraveryCertificate();

  }

}



function showBraveryCertificate() {

  let modal = document.getElementById('bravery-cert-modal');

  if (!modal) {

    modal = document.createElement('div');

    modal.id = 'bravery-cert-modal';

    modal.className = 'modal-backdrop';

    document.body.appendChild(modal);

  }



  const pName = currentClientData.name || currentClientData.petName || 'بطلنا الجميل';

  const pSpecies = currentClientData.species || currentClientData.speciesName || 'أليف PetiCare';



  modal.innerHTML = `

    <div class="modal-dialog">

      <div style="background: radial-gradient(circle at center, #FFFDF8 0%, #FFF5D6 100%); border: 8px double var(--primary); border-radius: var(--radius-lg); padding: 24px; text-align: center; position: relative;">

        <img src="assets/images/logo.jpg" style="width:70px; height:70px; border-radius:18px; margin-bottom:10px; border:2px solid var(--primary);" alt="Logo">

        <h2 style="font-size:22px; font-weight:900; color:var(--secondary);">🎉 شهادة شجاعة وتخرج طبي 🎓</h2>

        <p style="font-size:13px; color:var(--primary-hover); font-weight:800; margin-top:2px;">اعتماد: د. شريف دياب - PetiCare Animal Hospital</p>



        <div style="background:#FFF; padding:16px; border-radius:16px; margin:16px 0; border:1px solid #FFE4A0; box-shadow:var(--shadow-sm);">

          <p style="font-size:14px; color:var(--text-main); line-height:1.7;">

            يشهد فريق دكتور عيادة <strong>PetiCare</strong> بأن البطل الشجاع:

          </p>

          <h3 style="font-size:22px; font-weight:900; color:#E63946; margin:8px 0;">🐾 ${pName} (${pSpecies}) 🐾</h3>

          <p style="font-size:13px; color:var(--text-muted); line-height:1.6;">

            قد أتم جميع جرعات العلاج الموصوفة بنجاح وبسالة واستعاد كامل صحته ونشاطه!

          </p>

        </div>



        <div style="display:flex; justify-content:center; gap:8px;">

          <button onclick="shareCertificate()" class="btn-action btn-primary" style="font-size:13px;">

            <span>📸</span> مشاركة الشهادة على تيك توك وإنستجرام

          </button>

          <button onclick="closeBraveryModal()" class="btn-action btn-secondary" style="font-size:13px;">إغلاق</button>

        </div>

      </div>

    </div>

  `;



  modal.classList.remove('hidden');

  PetiCareDB.playSync();

}



window.closeBraveryModal = function() {

  const m = document.getElementById('bravery-cert-modal');

  if (m) m.classList.add('hidden');

};



window.shareCertificate = function() {

  showToast('تم نسخ نص الشهادة لمشاركتها والاحتفال بالبطل على تيك توك وإنستجرام! 🎓✨');

  PetiCareDB.playMeow();

};



// ----------------------------------------------------

// 7. Educational Video with Dr. Sherif TikTok Link

// ----------------------------------------------------

function renderClientVideo(data) {

  const container = document.getElementById('client-video-section');

  if (!container) return;



  const vTitle = data.videoTitle || "فيديو توضيحي لتعليمات الرعاية والعلاج - د. شريف دياب";

  const vLink = data.videoLink || CLINIC_INFO.tiktokUrl;



  container.innerHTML = `

    <a href="${vLink}" target="_blank" style="display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.85); border:1px solid var(--border-glass); border-radius:16px; padding:12px; text-decoration:none; color:inherit; box-shadow:var(--shadow-sm); transition:var(--transition);">

      <div style="position:relative; width:80px; height:80px; border-radius:12px; overflow:hidden; flex-shrink:0;">

        <img src="assets/images/default-avatar.jpg" style="width:100%; height:100%; object-fit:cover;">

        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">

          <img src="assets/images/play-button.jpg" class="icon-img-md" alt="Play">

        </div>

      </div>

      <div style="flex:1;">

        <span style="font-size:11px; background:#FFECCC; color:#B45309; padding:2px 8px; border-radius:6px; font-weight:bold;">تيك توك د. شريف دياب الرسمي 🎬</span>

        <h4 style="font-size:13px; font-weight:800; color:var(--secondary); margin-top:4px; line-height:1.4;">${vTitle}</h4>

        <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">اضغط لمشاهدة الفيديو على تيك توك العيادة @sheriffdiab</p>

      </div>

    </a>

  `;

}



// ----------------------------------------------------

// 8. 24/7 Organized Emergency Consultation

// ----------------------------------------------------

function initEmergencyModal() {

  const openBtns = document.querySelectorAll('.trigger-emergency-modal');

  const modal = document.getElementById('emergency-modal');

  const closeBtn = document.getElementById('btn-close-emergency');

  const sendBtn = document.getElementById('btn-send-emergency-wa');



  openBtns.forEach(btn => {

    btn.addEventListener('click', (e) => {

      e.preventDefault();

      PetiCareDB.playMeow();

      if (modal) modal.classList.remove('hidden');

    });

  });



  if (closeBtn && modal) {

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  }



  if (sendBtn) {

    sendBtn.addEventListener('click', () => {

      const selectedSymptoms = [];

      document.querySelectorAll('input[name="symptom"]:checked').forEach(cb => {

        selectedSymptoms.push(cb.value);

      });



      const notes = document.getElementById('emergency-notes') ? document.getElementById('emergency-notes').value.trim() : '';

      const pName = currentClientData.name || currentClientData.petName || 'أليفي';

      const pOwner = currentClientData.owner || currentClientData.ownerName || 'العميل';



      let msg = `🚨 *طلب استشارة طوارئ عاجلة - PetiCare Animal Hospital* 🚨\n\n`;

      msg += `🐾 *اسم الأليف:* ${pName}\n`;

      msg += `👤 *ولي الأمر:* ${pOwner}\n`;

      msg += `🩺 *الأعراض الملاحظة:*\n${selectedSymptoms.length > 0 ? selectedSymptoms.map(s => `• ${s}`).join('\n') : '• لم يتم تحديد خيارات محددة'}\n\n`;

      if (notes) msg += `📝 *ملاحظات إضافية من البيت:*\n"${notes}"\n\n`;

      msg += `نرجو التوجيه الطبي الفوري يا دكتور! 🙏\n(طوارئ 24/7: ${CLINIC_INFO.emergencyPhone})`;



      const waLink = `https://wa.me/201555345999?text=${encodeURIComponent(msg)}`;

      PetiCareDB.playSync();

      window.open(waLink, '_blank');

      modal.classList.add('hidden');

    });

  }

}



// Official Clinic Information & Social Media Channels (Dr. Sherif Diab)

const CLINIC_INFO = (typeof window !== 'undefined' && window.CLINIC_INFO) ? window.CLINIC_INFO : {

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



// ----------------------------------------------------

// 9. Official Social Hub

// ----------------------------------------------------

function initSocialMediaHub() {

  const box = document.getElementById('client-social-hub');

  if (!box) return;



  const info = (typeof window !== 'undefined' && window.CLINIC_INFO) ? window.CLINIC_INFO : CLINIC_INFO;



  box.innerHTML = `

    <div style="background:rgba(255,255,255,0.92); border:1px solid var(--border-glass); border-radius:18px; padding:18px; text-align:center; box-shadow:var(--shadow-sm);">

      <h4 style="font-size:15px; font-weight:900; color:var(--secondary); margin-bottom:4px;">تواصل وتابع عيادة د. شريف دياب 🐾</h4>

      <p style="font-size:11px; color:var(--text-muted); margin-bottom:14px;">PetiCare Animal Hospital - رعاية بيطرية متكاملة طوارئ 24/7</p>

      

      <!-- Contact Badges -->

      <div style="display:flex; justify-content:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">

        <a href="${info.primaryCallUrl}" class="btn-action" style="background:#E0F2FE; color:#0369A1; font-size:12px; padding:8px 12px; border-radius:12px; text-decoration:none; font-weight:800;">📞 د. شريف: ${info.phone1}</a>

        <a href="${info.secondaryCallUrl}" class="btn-action" style="background:#F0FDF4; color:#15803D; font-size:12px; padding:8px 12px; border-radius:12px; text-decoration:none; font-weight:800;">📞 عيادة: ${info.phone2}</a>

        <a href="${info.landlineCallUrl}" class="btn-action" style="background:#F1F5F9; color:#334155; font-size:12px; padding:8px 12px; border-radius:12px; text-decoration:none; font-weight:800;">☎️ أرضي: ${info.landline}</a>

      </div>



      <!-- Social Hub Image Banner -->

      <a href="${info.tiktokUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-bottom:12px;">

        <img src="assets/images/social-hub.jpg" style="max-width:100%; max-height:85px; border-radius:12px;" alt="Social Hub">

      </a>



      <!-- Official Social Channels -->

      <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">

        <a href="${info.facebookUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-secondary" style="font-size:12px; background:#1877F2; color:#FFF; padding:8px 14px; border-radius:12px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px;">

          <span>Facebook</span> <span>💙</span>

        </a>

        <a href="${info.instagramUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-secondary" style="font-size:12px; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color:#FFF; padding:8px 14px; border-radius:12px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px;">

          <span>Instagram</span> <span>📸</span>

        </a>

        <a href="${info.tiktokUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-secondary" style="font-size:12px; background:#000000; color:#FFF; padding:8px 14px; border-radius:12px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px;">

          <span>TikTok @sheriffdiab</span> <span>🎬</span>

        </a>

        <a href="${info.primaryWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn-action btn-secondary" style="font-size:12px; background:#25D366; color:#FFF; padding:8px 14px; border-radius:12px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px;">

          <span>WhatsApp 01555345999</span> <span>💬</span>

        </a>

        <a href="${info.secondaryWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn-action btn-secondary" style="font-size:12px; background:#128C7E; color:#FFF; padding:8px 14px; border-radius:12px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px;">

          <span>WhatsApp 01555345999</span> <span>💬</span>

        </a>

      </div>

    </div>

  `;

}



function showToast(message) {

  let toast = document.getElementById('global-toast');

  if (!toast) {

    toast = document.createElement('div');

    toast.id = 'global-toast';

    toast.className = 'toast-notice';

    document.body.appendChild(toast);

  }

  toast.innerHTML = `<img src="assets/images/paw-icon.jpg" style="width:20px; height:20px;"> <span>${message}</span>`;

  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), 3500);

}



// ----------------------------------------------------

// 10. REAL-TIME LIVE SYNC LISTENER

// ----------------------------------------------------

function initLiveSyncListener() {

  const syncBanner = document.getElementById('live-sync-banner');



  function triggerLiveUpdate(patientId) {

    if (!currentClientData) return;

    if (patientId && currentClientData.id && patientId !== currentClientData.id) return;



    // Reload latest from PetiCareDB

    const updated = PetiCareDB.getPatientById(currentClientData.id);

    if (updated) {

      currentClientData = updated;

      renderClientPage(currentClientData);

      renderEmergencyQR(currentClientData);

      renderBeforeAfterAlbum(currentClientData);

      

      PetiCareDB.playSync();



      if (syncBanner) {

        syncBanner.classList.add('active');

        setTimeout(() => syncBanner.classList.remove('active'), 4500);

      }

      showToast('تم استلام تحديث كشف الطبيب فورياً! ⚡🐾');

    }

  }



  // 1. BroadcastChannel API

  try {

    const channel = new BroadcastChannel('peticare_live_sync');

    channel.onmessage = (event) => {

      if (event.data && event.data.type === 'PATIENT_UPDATED') {

        triggerLiveUpdate(event.data.patientId);

      }

    };

  } catch (e) {}



  // 2. Storage event fallback

  window.addEventListener('storage', (e) => {

    if (e.key === 'peticare_sync_ping') {

      try {

        const payload = JSON.parse(e.newValue);

        triggerLiveUpdate(payload.patientId);

      } catch (err) {}

    }

  });

}



// ----------------------------------------------------

// 11. EMERGENCY MEDICAL QR CARD

// ----------------------------------------------------

function renderEmergencyQR(data) {

  const qrImg = document.getElementById('client-emergency-qr');

  const btnHistory = document.getElementById('client-view-history-btn');

  if (!qrImg || !data) return;



  const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

  const targetUrl = `${baseUrl}patient.html?id=${encodeURIComponent(data.id || 'PT-101')}`;

  

  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(targetUrl)}`;

  

  if (btnHistory) {

    btnHistory.href = `patient.html?id=${encodeURIComponent(data.id || 'PT-101')}`;

  }

}



// ----------------------------------------------------

// 12. BEFORE & AFTER MEDICAL ALBUM

// ----------------------------------------------------

function renderBeforeAfterAlbum(data) {

  const beforeImg = document.getElementById('client-album-before');

  const afterImg = document.getElementById('client-album-after');

  if (!beforeImg || !afterImg || !data) return;



  beforeImg.src = (data.photos && data.photos.before) ? data.photos.before : 'assets/images/default-avatar.jpg';

  afterImg.src = (data.photos && data.photos.after) ? data.photos.after : 'assets/images/default-avatar.jpg';

}



// ----------------------------------------------------

// 13. CLIENT PET SHOP & WHATSAPP CHECKOUT

// ----------------------------------------------------

let clientCart = {};



function initClientPetShop() {

  const shopGrid = document.getElementById('client-shop-grid');

  const cartBar = document.getElementById('client-floating-cart');

  const cartCount = document.getElementById('cart-items-count');

  const cartTotal = document.getElementById('cart-total-price');

  const btnCheckout = document.getElementById('btn-checkout-whatsapp');



  if (!shopGrid) return;



  const items = PetiCareDB.getShopItems();



  shopGrid.innerHTML = items.map(item => `

    <div class="shop-card">

      <span class="shop-stock-badge" style="${item.stock < 5 ? 'background:#D90429;' : ''}">

        ${item.stock > 0 ? `متاح: ${item.stock}` : 'نفد المخزون'}

      </span>

      <img src="${item.image}" class="shop-card-img" alt="${item.title}">

      <h4 class="shop-card-title">${item.title}</h4>

      <span style="font-size:10px; color:var(--text-muted); font-weight:800; display:block; margin-bottom:4px;">${item.category}</span>

      <div class="shop-card-price">${item.price} ج.م</div>

      <button onclick="addToCart('${item.id}')" class="btn" style="background:linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); color:#FFF; font-size:12px; font-weight:800; padding:8px 12px; border-radius:10px; border:none; cursor:pointer; width:100%;">

        + أضف للسلة 🛒

      </button>

    </div>

  `).join('');



  window.addToCart = function(itemId) {

    const product = items.find(i => i.id === itemId);

    if (!product) return;



    if (!clientCart[itemId]) {

      clientCart[itemId] = { product, qty: 1 };

    } else {

      clientCart[itemId].qty += 1;

    }



    updateCartUI();

    showToast(`تمت إضافة ${product.title} للسلة! 🛒`);

    PetiCareDB.playMeow();

  };



  function updateCartUI() {

    let totalItems = 0;

    let totalPrice = 0;



    Object.values(clientCart).forEach(c => {

      totalItems += c.qty;

      totalPrice += (c.product.price * c.qty);

    });



    if (totalItems > 0 && cartBar) {

      cartBar.style.display = 'flex';

      if (cartCount) cartCount.textContent = totalItems;

      if (cartTotal) cartTotal.textContent = totalPrice;

    } else if (cartBar) {

      cartBar.style.display = 'none';

    }

  }



  if (btnCheckout) {

    btnCheckout.addEventListener('click', () => {

      let totalItems = 0;

      let totalPrice = 0;

      let orderLines = [];



      Object.values(clientCart).forEach(c => {

        totalItems += c.qty;

        const lineTotal = c.product.price * c.qty;

        totalPrice += lineTotal;

        orderLines.push(`• ${c.qty}x ${c.product.title} (${lineTotal} ج)`);

      });



      if (totalItems === 0) return;



      const pName = currentClientData ? (currentClientData.name || currentClientData.petName || 'أليفنا') : 'أليفنا';

      const pOwner = currentClientData ? (currentClientData.owner || currentClientData.ownerName || 'عميل العيادة') : 'عميل العيادة';



      const waOrderMsg = `أهلاً عيادة PetiCare Animal Hospital (د. شريف دياب) 🐾\nأرغب في حجز الأوردر التالي من متجر العيادة لبطلنا (${pName}):\n\n${orderLines.join('\n')}\n\nالإجمالي المطلوب: ${totalPrice} جنيه مصري\nاسم المربي: ${pOwner}\n\nبرجاء تأكيد جاهزية الطلب وموعد الاستلام / التوصيل وشكراً جزيلاً! ❤️`;



      const clinicPhone = (window.petiCareData && typeof window.petiCareData.getClinicPhone === 'function') ? window.petiCareData.getClinicPhone() : '201555345999';

      const waLink = `https://wa.me/${clinicPhone}?text=${encodeURIComponent(waOrderMsg)}`;

      window.open(waLink, '_blank');

      PetiCareDB.playSync();

    });

  }

}



// ----------------------------------------------------

// 10. Client Pet Profile Editor (Name, Age, Avatar)

// ----------------------------------------------------

function initPetProfileEditor() {

  const btnOpen = document.getElementById('btn-open-edit-pet');

  const modal = document.getElementById('modal-edit-pet');

  const btnClose = document.getElementById('btn-close-edit-pet');

  const form = document.getElementById('form-edit-pet');



  const nameInput = document.getElementById('edit-pet-name');

  const speciesInput = document.getElementById('edit-pet-species');

  const ageInput = document.getElementById('edit-pet-age');

  const avatarVal = document.getElementById('edit-pet-avatar-val');

  const choiceBtns = document.querySelectorAll('.avatar-choice-btn');



  if (btnOpen && modal) {

    btnOpen.addEventListener('click', () => {

      const pid = currentClientData ? (currentClientData.id || 'PT-101') : 'PT-101';

      const p = PetiCareDB.getPatientById(pid) || currentClientData;



      if (nameInput) nameInput.value = p.petName || p.name || '';

      if (speciesInput) speciesInput.value = p.speciesName || p.breed || '';

      if (ageInput) ageInput.value = p.age || '';

      if (avatarVal) avatarVal.value = p.avatar || 'assets/images/avatar-cat.svg';



      choiceBtns.forEach(b => {

        if (b.dataset.avatar === avatarVal.value) {

          b.classList.add('selected');

        } else {

          b.classList.remove('selected');

        }

      });



      modal.classList.add('open');

      PetiCareDB.playMeow();

    });

  }



  if (btnClose && modal) {

    btnClose.addEventListener('click', () => {

      modal.classList.remove('open');

    });

  }



  choiceBtns.forEach(btn => {

    btn.addEventListener('click', () => {

      choiceBtns.forEach(b => b.classList.remove('selected'));

      btn.classList.add('selected');

      if (avatarVal) avatarVal.value = btn.dataset.avatar;

    });

  });



  if (form) {

    form.addEventListener('submit', (e) => {

      e.preventDefault();

      const pid = currentClientData ? (currentClientData.id || '') : '';

      if (!pid) return;



      const updated = {

        petName: nameInput ? nameInput.value.trim() : '',

        name: nameInput ? nameInput.value.trim() : '',

        speciesName: speciesInput ? speciesInput.value.trim() : '',

        breed: speciesInput ? speciesInput.value.trim() : '',

        age: ageInput ? ageInput.value.trim() : '',

        avatar: avatarVal ? avatarVal.value : 'assets/images/avatar-cat.svg'

      };



      const newPassInput = document.getElementById('edit-client-new-pass');

      if (newPassInput && newPassInput.value.trim().length > 0) {

        PetiCareDB.updateClientCredentials(pid, newPassInput.value.trim(), updated.avatar);

      }



      PetiCareDB.updatePatient(pid, updated);

      currentClientData = { ...currentClientData, ...updated };



      // Update UI elements immediately

      const elName = document.getElementById('client-pet-name');

      const elSub = document.getElementById('client-pet-sub');

      const elAvatar = document.getElementById('client-avatar-img');



      if (elName) elName.textContent = updated.petName;

      if (elSub) elSub.textContent = `${updated.speciesName} • رعاية د. شريف دياب`;

      if (elAvatar) elAvatar.src = updated.avatar;



      if (modal) modal.classList.remove('open');

      PetiCareDB.playSync();

      PetiCareDB.notifyLiveSync(pid);



      let banner = document.getElementById('live-sync-banner');

      if (banner) {

        banner.innerHTML = '<span>✨</span> تم حفظ وتحديث بيانات أليفك وكلمة المرور بنجاح!';

        banner.classList.add('active');

        setTimeout(() => banner.classList.remove('active'), 3500);

      }

    });

  }

}



// ----------------------------------------------------

// 11. Client Navigation Tabs & Standalone Dashboard Buttons

// ----------------------------------------------------

function initClientNavTabs() {

  const btnHealth = document.getElementById('nav-btn-health');

  const btnShop = document.getElementById('nav-btn-shop');

  const shopSection = document.getElementById('client-shop-section');



  const btnDashShop = document.getElementById('btn-dashboard-shop');

  const btnDashProfile = document.getElementById('btn-dashboard-profile');

  const btnOpenEdit = document.getElementById('btn-open-edit-pet');



  if (btnDashShop) {

    btnDashShop.addEventListener('click', () => {

      if (btnShop) btnShop.click();

      if (shopSection) shopSection.scrollIntoView({ behavior: 'smooth' });

    });

  }



  if (btnDashProfile) {

    btnDashProfile.addEventListener('click', () => {

      if (btnOpenEdit) btnOpenEdit.click();

    });

  }



  if (btnHealth && btnShop) {

    btnHealth.addEventListener('click', () => {

      btnHealth.style.background = 'var(--primary)';

      btnHealth.style.color = '#FFF';

      btnHealth.style.border = 'none';



      btnShop.style.background = '#F1F5F9';

      btnShop.style.color = 'var(--secondary)';

      btnShop.style.border = '1px solid #CBD5E1';



      window.scrollTo({ top: 120, behavior: 'smooth' });

    });



    btnShop.addEventListener('click', () => {

      btnShop.style.background = 'var(--primary)';

      btnShop.style.color = '#FFF';

      btnShop.style.border = 'none';



      btnHealth.style.background = '#F1F5F9';

      btnHealth.style.color = 'var(--secondary)';

      btnHealth.style.border = '1px solid #CBD5E1';



      if (shopSection) {

        shopSection.scrollIntoView({ behavior: 'smooth' });

      }

    });

  }

}





