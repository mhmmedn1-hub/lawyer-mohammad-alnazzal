import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db; // Make db globally accessible

// Global State for UI (using window object to make them globally accessible)
window.allClients = [];
window.allInvestigations = [];
window.allReferrals = [];
window.allExecutions = [];
window.allSessions = [];
window.allMessages = [];
window.allPayments = [];
window.allAdminTasks = [];
window.allPotentialClients = [];
window.allSeparatedCases = [];
window.allAgencies = [];
window.allGeneralCases = [];
window.allCaseStudies = [];
window.currentViewingSepId = null;
window.currentViewingCaseId = null;
window.currentViewingCaseType = null;
window.editingId = null;
window.currentClient = null;
window.clientViewMode = 'active'; // 'active' or 'archived'

// Eye icons for password visibility toggle
const eyeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const eyeOffIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

// Helper functions
window.normalizeArabic = function(text) {
  if (!text) return "";
  return text.toString()
    .trim()
    .replace(/[\u064B-\u0652\u0670\u0674\u06D6-\u06ED]/g, '') // remove Arabic diacritics
    .replace(/ـ/g, '') // remove tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
};

window.normalizeLoginValue = function(value) {
  if (!value) return '';
  return value.toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0674\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660))
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z0-9]/g, '');
};

window.togglePasswordVisibility = function(inputId, iconEl) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  iconEl.innerHTML = input.type === 'password' ? eyeIcon : eyeOffIcon;
};

// دالة تعبئة قائمة الموكلين (Datalist) لضمان ظهور الأسماء في القوائم المنسدلة
window.populateClientsDatalist = function() {
  const datalist = document.getElementById('clients-datalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  window.allClients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.fullname;
    datalist.appendChild(option);
  });
};

// Firebase Listeners for real-time updates
function setupFirebaseListeners() {
  onSnapshot(collection(db, "clients"), (snap) => {
    window.allClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateClientsTable();
    window.populateClientsDatalist();
    updateGlobalFeesSummary();
  });
  onSnapshot(collection(db, "messages"), (snap) => {
    window.allMessages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateMessagesTable();
  });
  onSnapshot(collection(db, "sessions"), (snap) => {
    window.allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDashboardData();
    updateSessionsTable(); // Ensure sessions table is updated
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "investigations"), (snap) => {
    window.allInvestigations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDashboardData();
    updateInvestigationTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "referrals"), (snap) => {
    window.allReferrals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDashboardData();
    updateReferralTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "executions"), (snap) => {
    window.allExecutions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDashboardData();
    updateExecutionTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "agencies"), (snap) => {
    window.allAgencies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateAgenciesTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "generalCases"), (snap) => {
    window.allGeneralCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDashboardData();
    updateGeneralCasesTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "payments"), (snap) => {
    window.allPayments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if(window.currentClient) loadClientPortalData(window.currentClient);
    updateGlobalFeesSummary();
  });
  onSnapshot(collection(db, "adminTasks"), (snap) => {
    window.allAdminTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateAdminTasksUI();
  });
  onSnapshot(collection(db, "potentialClients"), (snap) => {
    window.allPotentialClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updatePotentialClientsTable();
  });
  onSnapshot(collection(db, "separatedCases"), (snap) => {
    window.allSeparatedCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateSeparatedCasesTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
  onSnapshot(collection(db, "caseStudies"), (snap) => {
    window.allCaseStudies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateCaseStudiesTable();
    if(window.currentClient) loadClientPortalData(window.currentClient);
  });
}

// Login functions
window.handleLawyerLogin = function() {
  const userVal = document.getElementById('lawyer-user').value.trim();
  const passVal = document.getElementById('lawyer-pass').value.trim();
  const remember = document.getElementById('lawyer-remember').checked;

  // normalizeArabic برای توحيد الكتابة العربية (مثلاً: محمد النزال / محمدالنزال)
  // normalizeLoginValue للتوحيد اللاتيني/الأرقام وما شابه.
  const normalizedInputAr = normalizeArabic(userVal);
  const normalizedInput = normalizeLoginValue(userVal);

  const validLawyerNames = [
    // Arabic variants
    'محمدالنزال',
    'محم النزال',
    'محمدالنزال',
    'محمالنزال',
    'محمد',
    'النزال',

    // Arabic without spaces (post-normalization)
    'محمدالنزال',
    'النزال',

    // Latin variants
    'mohammad',
    'mohammadalnazzal',
    'alnazzal',

    // Admin shortcut
    'admin'
  ];

  // ملاحظة: تسجيل دخول المحامي حاليًا يعتمد على قائمة أسماء داخل الكود (لا يعتمد على Firestore).
  // إضافة أي اسم محامٍ لا يستطيع الدخول هنا سيحل المشكلة فورًا.
  // مثال:
  // validLawyerNames.push('اسم_المحامي');

  const matchesSpecialCase = normalizedInput.includes('محم') && normalizedInput.includes('النزال');

  // دعم حالات الإدخال مع/بدون مسافات حتى بعد normalizeArabic
  const isLawyerUser =
    validLawyerNames.includes(normalizedInput) ||
    validLawyerNames.includes(normalizedInputAr.replace(/\s+/g, '')) ||
    matchesSpecialCase ||
    normalizedInput === 'admin';
  const isCorrectPassword = passVal === '6503536';

  if (isLawyerUser && isCorrectPassword) {
    if (remember) {
      localStorage.setItem('lawyer_user', userVal);
      localStorage.setItem('lawyer_pass', passVal);
      localStorage.setItem('lawyer_remember', 'true');
    } else {
      localStorage.removeItem('lawyer_user');
      localStorage.removeItem('lawyer_pass');
      localStorage.setItem('lawyer_remember', 'false');
    }
    document.body.classList.add('in-dashboard');
    document.getElementById('login-page').style.display = 'none';
    showSection('dashboard-overview-section');
  } else {
    const debugUser = userVal || '(فارغ)';
    const debugPass = passVal ? '●●●●●●●●' : '(فارغ)';
    console.warn('Failed lawyer login', { debugUser, debugPass, normalizedInput });
    alert('خطأ في بيانات الدخول. يرجى التأكد من صحة اسم المستخدم وكلمة المرور.');
  }
};

window.handleClientLogin = function() {
  const rawUserInput = document.getElementById('client-user').value;
  const passInput = document.getElementById('client-pass').value.trim();
  const userInput = normalizeLoginValue(rawUserInput);

  if (window.allClients.length === 0) {
    alert('لم تُحمَّل بيانات الموكلين بعد. يرجى الانتظار قليلاً وإعادة المحاولة.');
    return;
  }

  const client = window.allClients.find(c => {
    const username = normalizeLoginValue(c.username);
    const fullname = normalizeLoginValue(c.fullname);
    const email = normalizeLoginValue(c.email);
    const phone = normalizeLoginValue(c.phone);
    const fileNumber = normalizeLoginValue(c.fileNumber);
    const clientId = normalizeLoginValue(c.id);

    const matchesUser = [username, fullname, email, phone, fileNumber, clientId].some(value => value && value === userInput);
    return matchesUser && c.password === passInput;
  });

  if (client) {
    window.currentClient = client;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('client-dashboard-ui').style.display = 'block';
    document.getElementById('display-client-name').textContent = client.fullname;
    loadClientPortalData(client);
  } else {
    alert('خطأ في بيانات الموكل. تأكد من اسم المستخدم أو رقم الملف وكلمة المرور.');
  }
};

// Client Management functions
window.addClient = async function() {
  try {
    const fullname = document.getElementById('c-fullname').value.trim();
    const address = document.getElementById('c-address').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const phone = document.getElementById('c-phone').value.trim();
    const whatsapp = document.getElementById('c-whatsapp').value.trim();
    const username = document.getElementById('c-username').value.trim();
    const password = document.getElementById('c-password').value.trim();
    const privateNotes = document.getElementById('c-notes').value.trim();

    if (!fullname || !username || !password) {
      alert("يرجى ملء الخانات الإلزامية (الاسم، اسم المستخدم، كلمة المرور).");
      return;
    }

    const clientData = {
      fullname, 
      address, 
      email, 
      phone, 
      whatsapp, 
      username, 
      password,
      privateNotes,
      updatedAt: Date.now()
    };

    if (window.editingId) {
      await updateDoc(doc(db, "clients", window.editingId), clientData);
      alert("تم تحديث بيانات الموكل بنجاح ✅");
    } else {
      await addDoc(collection(db, "clients"), { ...clientData, createdAt: Date.now() });
      alert("تم إضافة الموكل بنجاح في قاعدة البيانات ✅");
    }
    resetClientForm();
  } catch (error) {
    console.error("Error adding/updating client: ", error);
    alert("حدث خطأ أثناء حفظ البيانات. يرجى التحقق من الاتصال بالإنترنت.");
  }
};

window.updateClientsTable = function() {
  const searchTerm = (document.getElementById('client-search')?.value || "").toLowerCase();
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allClients.filter(c =>
    normalizeArabic(c.fullname).toLowerCase().includes(searchTerm) ||
    c.phone.includes(searchTerm) ||
    normalizeArabic(c.username).toLowerCase().includes(searchTerm)
  ).forEach(client => {
    tbody.innerHTML += `<tr>
      <td><a href="#" style="color:var(--accent-gold); font-weight:bold; text-decoration:none;" onclick="viewClientProfile('${client.id}'); return false;">${client.fullname}</a></td>
      <td>${client.address || '-'}</td>
      <td>${client.phone || '-'}</td>
      <td>${client.username}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewClientProfile('${client.id}')">الملف 👁️</button>
        <button class="action-btn" style="background: var(--accent-blue);" onclick="editClient('${client.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteClient('${client.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.editClient = function(id) {
  const client = window.allClients.find(c => c.id === id);
  if (!client) return;
  window.editingId = id;
  document.getElementById('c-fullname').value = client.fullname;
  document.getElementById('c-address').value = client.address || '';
  document.getElementById('c-email').value = client.email || '';
  document.getElementById('c-phone').value = client.phone || '';
  document.getElementById('c-whatsapp').value = client.whatsapp || '';
  document.getElementById('c-username').value = client.username;
  document.getElementById('c-password').value = client.password; // Note: In a real app, passwords should not be re-populated
  document.getElementById('c-notes').value = client.privateNotes || '';
  document.querySelector('#client-form .action-btn').textContent = "تحديث البيانات 💾";
  document.getElementById('client-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteClient = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذا الموكل نهائياً؟")) {
    await deleteDoc(doc(db, "clients", id));
    alert("تم حذف الموكل بنجاح!");
  }
};

window.resetClientForm = function() {
  window.editingId = null;
  document.getElementById('client-form').reset();
  document.getElementById('c-password').type = 'password';
  const toggleBtn = document.querySelector('#client-form .toggle-password');
  if (toggleBtn) toggleBtn.innerHTML = eyeIcon;
  document.querySelector('#client-form .action-btn').textContent = "إضافة موكل";
};

// Agency Management functions
window.toggleAgencyFields = function() {
  const type = document.getElementById('agency-type').value;
  const judicial = document.getElementById('judicial-fields');
  const notary = document.getElementById('notary-fields');

  judicial.style.display = 'none';
  notary.style.display = 'none';

  if (type === 'قضائية') {
    judicial.style.display = 'grid';
  } else if (type === 'عدلية') {
    notary.style.display = 'grid';
    notary.style.gridTemplateColumns = 'repeat(3, 1fr)'; // Ensure correct grid layout
  }
};

window.saveAgency = async function() {
  const clientName = document.getElementById('agency-client-name').value.trim();
  const scope = document.getElementById('agency-scope').value;
  const type = document.getElementById('agency-type').value;
  const date = document.getElementById('agency-date').value;
  const place = document.getElementById('agency-place').value.trim();
  const fileInput = document.getElementById('agency-file');
  const file = fileInput.files[0];

  if (!clientName || !scope || !type || !date || !place) {
    alert("يرجى ملء كافة الخانات الأساسية للوكالة.");
    return;
  }

  let details = "";
  if (type === 'قضائية') {
    const serial = document.getElementById('j-serial').value.trim();
    const record = document.getElementById('j-record').value.trim();
    details = `سجل: ${record} / متسلسل: ${serial}`;
  } else {
    const year = document.getElementById('n-year').value.trim();
    const priv = document.getElementById('n-private').value.trim();
    const record = document.getElementById('n-record').value.trim();
    details = `عام: ${year} / خاص: ${priv} / سجل: ${record}`;
  }

  let imageData = null;
  if (file) {
    imageData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  const agencyData = {
    clientName, scope, type, date, place, details,
    image: imageData,
    timestamp: Date.now()
  };

  if (window.editingId) {
    await updateDoc(doc(db, "agencies", window.editingId), agencyData);
    alert("تم تحديث بيانات الوكالة بنجاح!");
  } else {
    await addDoc(collection(db, "agencies"), { ...agencyData, createdAt: Date.now() });
    alert("تم إضافة الوكالة بنجاح!");
  }
  resetAgencyForm();
};

window.updateAgenciesTable = function() {
  const searchTerm = (document.getElementById('agency-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('agencies-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  window.allAgencies.filter(a =>
    normalizeArabic(a.clientName).toLowerCase().includes(searchTerm) ||
    normalizeArabic(a.place).toLowerCase().includes(searchTerm) ||
    normalizeArabic(a.details).toLowerCase().includes(searchTerm)
  ).forEach(a => {
    tbody.innerHTML += `<tr>
      <td>${a.clientName}</td>
      <td>${a.type}</td>
      <td>${a.scope}</td>
      <td>${a.date}</td>
      <td>${a.details}</td>
      <td>${a.place}</td>
      <td>
        ${a.image ? `<button class="action-btn" style="background: var(--accent-green); margin-left: 5px;" onclick="openImageModal('${a.image}')">عرض صورة</button>` : ''}
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editAgency('${a.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteAgency('${a.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.editAgency = function(id) {
  const a = window.allAgencies.find(item => item.id === id);
  if (!a) return;
  window.editingId = id;
  document.getElementById('agency-client-name').value = a.clientName;
  document.getElementById('agency-scope').value = a.scope;
  document.getElementById('agency-type').value = a.type;
  document.getElementById('agency-date').value = a.date;
  document.getElementById('agency-place').value = a.place;
  toggleAgencyFields(); // To show/hide judicial/notary fields
  // Populate specific fields if needed (e.g., from 'details' string)
  if (a.type === 'قضائية') {
    const match = a.details.match(/سجل:\s(.*?)\s\/\sمتسلسل:\s(.*?)$/);
    if (match) {
      document.getElementById('j-record').value = match[1];
      document.getElementById('j-serial').value = match[2];
    }
  } else if (a.type === 'عدلية') {
    const match = a.details.match(/عام:\s(.*?)\s\/\sخاص:\s(.*?)\s\/\sسجل:\s(.*?)$/);
    if (match) {
      document.getElementById('n-year').value = match[1];
      document.getElementById('n-private').value = match[2];
      document.getElementById('n-record').value = match[3];
    }
  }
  document.querySelector('#agency-form .action-btn').textContent = "تحديث الوكالة";
  document.getElementById('agency-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteAgency = async function(id) {
  if (confirm("هل أنت متأكد من حذف بيانات هذه الوكالة؟")) {
    await deleteDoc(doc(db, "agencies", id));
    alert("تم حذف الوكالة بنجاح!");
  }
};

window.resetAgencyForm = function() {
  window.editingId = null;
  document.getElementById('agency-form').reset();
  document.getElementById('judicial-fields').style.display = 'none';
  document.getElementById('notary-fields').style.display = 'none';
  document.querySelector('#agency-form .action-btn').textContent = "إضافة وكالة";
};

// Investigation Cases functions
window.saveInvestigationCase = async function() {
  const clientName = document.getElementById('inv-client').value.trim();
  const clientObj = window.allClients.find(c => c.fullname === clientName);
  const isSeparated = document.getElementById('inv-is-separated').checked;

  if (isSeparated) {
    const decisionNum = document.getElementById('inv-sep-decision-num').value.trim();
    const sepDate = document.getElementById('inv-sep-date').value;
    const sepResult = document.getElementById('inv-sep-result').value.trim();

    if (!clientName || !decisionNum) {
      alert("يرجى إكمال بيانات الفصل (اسم الموكل ورقم القرار).");
      return;
    }

    const separatedData = {
      client: clientName,
      clientId: clientObj ? clientObj.id : null,
      opponent: document.getElementById('inv-opponent').value.trim(),
      decisionNum: decisionNum,
      base: document.getElementById('inv-base').value.trim() + '/' + document.getElementById('inv-year').value.trim(),
      court: document.getElementById('inv-dept').value.trim(),
      result: sepResult,
      separationDate: sepDate,
      subject: document.getElementById('inv-subject').value.trim(),
      category: 'تحقيق',
      timestamp: Date.now()
    };

    await addDoc(collection(db, "separatedCases"), separatedData);

    if (window.editingId) {
      await deleteDoc(doc(db, "investigations", window.editingId));
    }

    alert("تم فصل قضية التحقيق ونقلها للأرشيف بنجاح! ✅");
    resetInvestigationForm();
    return;
  }

  const caseData = {
    client: clientName,
    clientId: clientObj ? clientObj.id : null,
    clientRole: document.getElementById('inv-client-role').value,
    clientStatus: document.getElementById('inv-client-status').value,
    opponent: document.getElementById('inv-opponent').value.trim(),
    opponentRole: document.getElementById('inv-opponent-role').value,
    opponentStatus: document.getElementById('inv-opponent-status').value,
    base: document.getElementById('inv-base').value.trim(),
    year: document.getElementById('inv-year').value.trim(),
    dept: document.getElementById('inv-dept').value.trim(),
    city: document.getElementById('inv-city').value.trim(),
    crime: document.getElementById('inv-crime').value.trim(),
    subject: document.getElementById('inv-subject').value.trim(),
    recNum: document.getElementById('inv-rec-num').value.trim(),
    recDate: document.getElementById('inv-rec-date').value,
    recPlace: document.getElementById('inv-rec-place').value.trim(),
    prosNum: document.getElementById('inv-pros-num').value.trim(),
    remindDate: document.getElementById('inv-remind-date').value,
    remindAction: document.getElementById('inv-remind-action').value.trim(),
    updatedAt: Date.now()
  };
  if (!caseData.client || !caseData.base || !caseData.year) {
    alert("يرجى إكمال البيانات الأساسية (الموكل، رقم الأساس، العام)");
    return;
  }
  if (window.editingId) {
    await updateDoc(doc(db, "investigations", window.editingId), caseData);
    alert("تم تحديث قضية التحقيق بنجاح!");
  } else {
    await addDoc(collection(db, "investigations"), { ...caseData, createdAt: Date.now() });
    alert("تم حفظ قضية التحقيق بنجاح!");
  }
  resetInvestigationForm();
};

window.updateInvestigationTable = function() {
  const searchTerm = (document.getElementById('investigation-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('investigation-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allInvestigations.filter(c =>
    normalizeArabic(c.client).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.opponent).toLowerCase().includes(searchTerm) ||
    c.base.includes(searchTerm)
  ).forEach(c => {
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:600;">${c.client} (${c.clientRole || ''})</td>
      <td>${c.opponent || '-'}</td>
      <td>${c.base}/${c.year}</td>
      <td>${c.crime}</td>
      <td>${c.dept} / ${c.city}</td>
      <td style="font-size:0.8rem; color:var(--accent-blue)">${c.remindDate ? `📅 ${c.remindDate}<br>` : ''}${c.remindAction || ''}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewInvestigationCase('${c.id}')">عرض 👁️</button>
        <button class="action-btn" style="background: var(--accent-green); margin-left: 5px;" onclick="printCaseReceipt('investigation', '${c.id}')">طباعة وصل</button>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editInvestigationCase('${c.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteInvestigationCase('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.populateViewCaseSummary = function(details) {
  document.getElementById('view-case-opponent').textContent = details.opponent || '-';
  document.getElementById('view-case-client-role').textContent = details.clientRole || '-';
  document.getElementById('view-case-client-status').textContent = details.clientStatus || '-';
  document.getElementById('view-case-opponent-role').textContent = details.opponentRole || '-';
  document.getElementById('view-case-opponent-status').textContent = details.opponentStatus || '-';
  document.getElementById('view-case-type').textContent = details.caseType || '-';
  document.getElementById('view-case-crime').textContent = details.crime || details.subject || '-';
  document.getElementById('view-case-action-next').textContent = details.actionNext || details.remindAction || '-';
  document.getElementById('view-case-remind-date').textContent = details.remindDate || '-';
  document.getElementById('view-case-notes').textContent = details.notes || '-';
};

window.viewInvestigationCase = function(id) {
  const c = window.allInvestigations.find(item => item.id === id);
  if (!c) return;
  window.currentViewingCaseId = id;
  window.currentViewingCaseType = 'investigation';
  
  document.getElementById('view-case-title').textContent = `متابعة جلسات الموكل (تحقيق): ${c.client}`;
  document.getElementById('view-case-base').textContent = `${c.base}/${c.year}`;
  document.getElementById('view-case-court').textContent = c.dept;
  document.getElementById('case-session-outcome').value = c.lastSessionOutcome || '';
  document.getElementById('case-next-date').value = c.nextSessionDate || '';
  document.getElementById('case-postpone-reason').value = c.postponementReason || '';
  document.getElementById('case-session-update-section').style.display = 'block';
  window.populateViewCaseSummary({
    opponent: c.opponent,
    clientRole: c.clientRole,
    clientStatus: c.clientStatus,
    opponentRole: c.opponentRole,
    opponentStatus: c.opponentStatus,
    caseType: 'تحقيق',
    crime: c.crime,
    actionNext: c.remindAction,
    remindDate: c.remindDate,
    notes: c.subject
  });
  document.getElementById('general-case-view-modal').style.display = 'flex';
};

window.editInvestigationCase = function(id) {
  const c = window.allInvestigations.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  document.getElementById('inv-client').value = c.client;
  document.getElementById('inv-client-role').value = c.clientRole;
  document.getElementById('inv-client-status').value = c.clientStatus;
  document.getElementById('inv-opponent').value = c.opponent;
  document.getElementById('inv-opponent-role').value = c.opponentRole;
  document.getElementById('inv-opponent-status').value = c.opponentStatus;
  document.getElementById('inv-base').value = c.base;
  document.getElementById('inv-year').value = c.year;
  document.getElementById('inv-dept').value = c.dept;
  document.getElementById('inv-city').value = c.city;
  document.getElementById('inv-crime').value = c.crime;
  document.getElementById('inv-subject').value = c.subject;
  document.getElementById('inv-rec-num').value = c.recNum;
  document.getElementById('inv-rec-date').value = c.recDate;
  document.getElementById('inv-rec-place').value = c.recPlace;
  document.getElementById('inv-pros-num').value = c.prosNum;
  document.getElementById('inv-remind-date').value = c.remindDate || '';
  document.getElementById('inv-remind-action').value = c.remindAction || '';
  document.querySelector('#investigation-form .action-btn').textContent = "تحديث قضية التحقيق";
  document.getElementById('investigation-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteInvestigationCase = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذه القضية؟")) {
    await deleteDoc(doc(db, "investigations", id));
    alert("تم الحذف بنجاح");
  }
};

window.resetInvestigationForm = function() {
  window.editingId = null;
  document.getElementById('investigation-form').reset();
  document.getElementById('inv-separated-fields').style.display = 'none';
  document.querySelector('#investigation-form .action-btn').textContent = "إضافة قضية تحقيق";
};

window.toggleInvSeparatedFields = function() {
  document.getElementById('inv-separated-fields').style.display = document.getElementById('inv-is-separated').checked ? 'grid' : 'none';
};

// Referral Cases functions
window.saveReferralCase = async function() {
  const clientName = document.getElementById('ref-client').value.trim();
  const clientObj = window.allClients.find(c => c.fullname === clientName);
  const isSeparated = document.getElementById('ref-is-separated').checked;

  if (isSeparated) {
    const decisionNum = document.getElementById('ref-sep-decision-num').value.trim();
    const sepDate = document.getElementById('ref-sep-date').value;
    const sepResult = document.getElementById('ref-sep-result').value.trim();

    if (!clientName || !decisionNum) {
      alert("يرجى إكمال بيانات الفصل (اسم الموكل ورقم القرار).");
      return;
    }

    const separatedData = {
      client: clientName,
      clientId: clientObj ? clientObj.id : null,
      opponent: document.getElementById('ref-opponent').value.trim(),
      decisionNum: decisionNum,
      base: document.getElementById('ref-base').value.trim() + '/' + document.getElementById('ref-year').value.trim(),
      court: document.getElementById('ref-dept').value.trim(),
      result: sepResult,
      separationDate: sepDate,
      subject: document.getElementById('ref-subject').value.trim(),
      category: 'إحالة',
      timestamp: Date.now()
    };

    await addDoc(collection(db, "separatedCases"), separatedData);

    if (window.editingId) {
      await deleteDoc(doc(db, "referrals", window.editingId));
    }

    alert("تم فصل قضية الإحالة ونقلها للأرشيف بنجاح! ✅");
    resetReferralForm();
    return;
  }

  const caseData = {
    client: clientName,
    clientId: clientObj ? clientObj.id : null,
    clientRole: document.getElementById('ref-client-role').value,
    clientStatus: document.getElementById('ref-client-status').value,
    opponent: document.getElementById('ref-opponent').value.trim(),
    opponentRole: document.getElementById('ref-opponent-role').value,
    opponentStatus: document.getElementById('ref-opponent-status').value,
    base: document.getElementById('ref-base').value.trim(),
    year: document.getElementById('ref-year').value.trim(),
    dept: document.getElementById('ref-dept').value.trim(),
    city: document.getElementById('ref-city').value.trim(),
    crime: document.getElementById('ref-crime').value.trim(),
    subject: document.getElementById('ref-subject').value.trim(),
    remindDate: document.getElementById('ref-remind-date').value,
    remindAction: document.getElementById('ref-remind-action').value.trim(),
    updatedAt: Date.now()
  };
  if (!caseData.client || !caseData.base || !caseData.year) {
    alert("يرجى إكمال البيانات الأساسية (الموكل، رقم الأساس، العام)");
    return;
  }
  if (window.editingId) {
    await updateDoc(doc(db, "referrals", window.editingId), caseData);
    alert("تم تحديث قضية الإحالة بنجاح!");
  } else {
    await addDoc(collection(db, "referrals"), { ...caseData, createdAt: Date.now() });
    alert("تم حفظ قضية الإحالة بنجاح!");
  }
  resetReferralForm();
};

window.updateReferralTable = function() {
  const searchTerm = (document.getElementById('referral-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('referral-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allReferrals.filter(c =>
    normalizeArabic(c.client).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.opponent).toLowerCase().includes(searchTerm) ||
    c.base.includes(searchTerm)
  ).forEach(c => {
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:600;">${c.client} (${c.clientRole || ''})</td>
      <td>${c.opponent || '-'}</td>
      <td>${c.base}/${c.year}</td>
      <td>${c.crime}</td>
      <td style="font-size:0.8rem; color:var(--accent-blue)">${c.remindDate ? `📅 ${c.remindDate}<br>` : ''}${c.remindAction || ''}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewReferralCase('${c.id}')">عرض 👁️</button>
        <button class="action-btn" style="background: var(--accent-green); margin-left: 5px;" onclick="printCaseReceipt('referral', '${c.id}')">طباعة وصل</button>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editReferralCase('${c.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteReferralCase('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.viewReferralCase = function(id) {
  const c = window.allReferrals.find(item => item.id === id);
  if (!c) return;
  window.currentViewingCaseId = id;
  window.currentViewingCaseType = 'referral';
  
  document.getElementById('view-case-title').textContent = `متابعة جلسات الموكل (إحالة): ${c.client}`;
  document.getElementById('view-case-base').textContent = `${c.base}/${c.year}`;
  document.getElementById('view-case-court').textContent = c.dept;
  document.getElementById('case-session-outcome').value = c.lastSessionOutcome || '';
  document.getElementById('case-next-date').value = c.nextSessionDate || '';
  document.getElementById('case-postpone-reason').value = c.postponementReason || '';
  document.getElementById('case-session-update-section').style.display = 'block';
  window.populateViewCaseSummary({
    opponent: c.opponent,
    clientRole: c.clientRole,
    clientStatus: c.clientStatus,
    opponentRole: c.opponentRole,
    opponentStatus: c.opponentStatus,
    caseType: 'إحالة',
    crime: c.crime,
    actionNext: c.remindAction,
    remindDate: c.remindDate,
    notes: c.subject
  });
  document.getElementById('general-case-view-modal').style.display = 'flex';
};

window.editReferralCase = function(id) {
  const c = window.allReferrals.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  document.getElementById('ref-client').value = c.client;
  document.getElementById('ref-client-role').value = c.clientRole;
  document.getElementById('ref-client-status').value = c.clientStatus;
  document.getElementById('ref-opponent').value = c.opponent;
  document.getElementById('ref-opponent-role').value = c.opponentRole;
  document.getElementById('ref-opponent-status').value = c.opponentStatus;
  document.getElementById('ref-base').value = c.base;
  document.getElementById('ref-year').value = c.year;
  document.getElementById('ref-dept').value = c.dept;
  document.getElementById('ref-city').value = c.city;
  document.getElementById('ref-crime').value = c.crime;
  document.getElementById('ref-subject').value = c.subject;
  document.getElementById('ref-remind-date').value = c.remindDate || '';
  document.getElementById('ref-remind-action').value = c.remindAction || '';
  document.querySelector('#referral-form .action-btn').textContent = "تحديث قضية الإحالة";
  document.getElementById('referral-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteReferralCase = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذه القضية؟")) {
    await deleteDoc(doc(db, "referrals", id));
    alert("تم الحذف بنجاح");
  }
};

window.resetReferralForm = function() {
  window.editingId = null;
  document.getElementById('referral-form').reset();
  document.getElementById('ref-separated-fields').style.display = 'none';
  document.querySelector('#referral-form .action-btn').textContent = "إضافة قضية إحالة";
};

window.toggleRefSeparatedFields = function() {
  document.getElementById('ref-separated-fields').style.display = document.getElementById('ref-is-separated').checked ? 'grid' : 'none';
};

// Execution Management functions
window.saveExecutionCase = async function() {
  const clientName = document.getElementById('exe-client').value.trim();
  const clientObj = window.allClients.find(c => c.fullname === clientName);
  const caseData = {
    client: clientName,
    clientId: clientObj ? clientObj.id : null,
    clientRole: document.getElementById('exe-client-role').value,
    base: document.getElementById('exe-base').value.trim(),
    year: document.getElementById('exe-year').value.trim(),
    type: document.getElementById('exe-type').value,
    opponent: document.getElementById('exe-opponent').value.trim(),
    opponentRole: document.getElementById('exe-opponent-role').value,
    actionTaken: document.getElementById('exe-action-taken').value.trim(),
    actionNext: document.getElementById('exe-action-next').value.trim(),
    notes: document.getElementById('exe-notes').value.trim(),
    remindDate: document.getElementById('exe-remind-date').value,
    remindAction: document.getElementById('exe-remind-action').value.trim(),
    updatedAt: Date.now()
  };
  if (!caseData.client || !caseData.base || !caseData.year) {
    alert("يرجى إكمال البيانات الأساسية (الموكل، رقم الأساس، العام)");
    return;
  }
  if (window.editingId) {
    await updateDoc(doc(db, "executions", window.editingId), caseData);
    alert("تم تحديث ملف التنفيذ بنجاح!");
  } else {
    await addDoc(collection(db, "executions"), { ...caseData, createdAt: Date.now() });
    alert("تم حفظ ملف التنفيذ بنجاح!");
  }
  resetExecutionForm();
};

window.updateExecutionTable = function() {
  const searchTerm = (document.getElementById('execution-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('execution-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allExecutions.filter(c =>
    normalizeArabic(c.client).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.opponent).toLowerCase().includes(searchTerm) ||
    c.base.includes(searchTerm)
  ).forEach(c => {
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:600;">${c.client}<br><small style="color:var(--gray-silver)">${c.clientRole || ''}</small></td>
      <td>${c.base}/${c.year}</td>
      <td><span class="status-badge status-active">${c.type}</span></td>
      <td>${c.opponent}</td>
      <td style="color:var(--accent-blue); font-size:0.85rem;">${c.remindDate ? `📅 ${c.remindDate}<br>` : ''}${c.remindAction || c.actionNext || '-'}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editExecutionCase('${c.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteExecutionCase('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.editExecutionCase = function(id) {
  const c = window.allExecutions.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  document.getElementById('exe-client').value = c.client;
  document.getElementById('exe-client-role').value = c.clientRole;
  document.getElementById('exe-base').value = c.base;
  document.getElementById('exe-year').value = c.year;
  document.getElementById('exe-type').value = c.type;
  document.getElementById('exe-opponent').value = c.opponent;
  document.getElementById('exe-opponent-role').value = c.opponentRole;
  document.getElementById('exe-action-taken').value = c.actionTaken;
  document.getElementById('exe-action-next').value = c.actionNext;
  document.getElementById('exe-notes').value = c.notes;
  document.getElementById('exe-remind-date').value = c.remindDate || '';
  document.getElementById('exe-remind-action').value = c.remindAction || '';
  document.querySelector('#execution-form .action-btn').textContent = "تحديث ملف التنفيذ";
  document.getElementById('execution-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteExecutionCase = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذا الملف؟")) {
    await deleteDoc(doc(db, "executions", id));
    alert("تم الحذف بنجاح");
  }
};

window.resetExecutionForm = function() {
  window.editingId = null;
  document.getElementById('execution-form').reset();
  document.querySelector('#execution-form .action-btn').textContent = "حفظ ملف التنفيذ";
};

// Messages Management functions
window.updateMessagesTable = function() {
  const tbody = document.getElementById('messages-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allMessages.sort((a,b) => b.timestamp - a.timestamp).forEach(m => {
    const statusBadge = m.status === 'new'
      ? '<span class="status-badge status-new">جديدة</span>'
      : '<span class="status-badge status-active">مقروءة</span>';
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:600;">${m.from}</td>
      <td style="font-size:0.85rem">${new Date(m.timestamp).toLocaleString('ar-EG')}</td>
      <td style="white-space: normal; max-width: 400px; line-height: 1.5;">
        ${m.message}
        ${m.reply ? `<div style="margin-top:5px; color:var(--accent-gold); font-size:0.8rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:3px;"><strong>ردك:</strong> ${m.reply}</div>` : ''}
      </td>
      <td>${statusBadge}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="replyToMessage('${m.id}')">رد</button>
        ${m.status === 'new' ? `<button class="action-btn" style="background: var(--accent-green); margin-left: 5px;" onclick="markMessageRead('${m.id}')">مقروءة</button>` : ''}
        <button class="action-btn" style="background: #ef4444;" onclick="deleteMessage('${m.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.replyToMessage = async function(id) {
  const msg = window.allMessages.find(m => m.id === id);
  if (!msg) return;
  const replyText = prompt(`الرد على استفسار ${msg.from}:`, msg.reply || "");
  if (replyText !== null && replyText.trim() !== "") {
    await updateDoc(doc(db, "messages", id), {
      reply: replyText,
      replyDate: new Date().toLocaleString('ar-EG'),
      status: 'read',
      updatedAt: Date.now()
    });
    alert("تم إرسال الرد بنجاح.");
  }
};

window.markMessageRead = async function(id) {
  await updateDoc(doc(db, "messages", id), { status: 'read', updatedAt: Date.now() });
};

window.deleteMessage = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذه الرسالة؟")) {
    await deleteDoc(doc(db, "messages", id));
    alert("تم الحذف بنجاح!");
  }
};

// Sessions Management functions
window.populateAllCasesDatalist = function() {
  const datalist = document.getElementById('all-cases-datalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  const combined = [
    ...window.allInvestigations.map(c => `${c.client} - تحقيق: ${c.base}/${c.year}`),
    ...window.allReferrals.map(c => `${c.client} - إحالة: ${c.base}/${c.year}`),
    ...window.allGeneralCases.map(c => `${c.client} - عامة: ${c.base}/${c.year}`),
    ...window.allExecutions.map(c => `${c.client} - تنفيذ: ${c.base}/${c.year}`)
  ];
  [...new Set(combined)].forEach(item => {
    const option = document.createElement('option'); option.value = item;
    datalist.appendChild(option);
  });
};

window.saveSession = async function() {
  const sessionData = {
    caseRef: document.getElementById('sess-case-ref').value.trim(),
    court: document.getElementById('sess-court').value.trim(),
    date: document.getElementById('sess-date').value,
    time: document.getElementById('sess-time').value,
    notes: document.getElementById('sess-notes').value.trim(),
    updatedAt: Date.now()
  };
  if (!sessionData.caseRef || !sessionData.date) {
    alert("يرجى إدخال اسم الموكل/القضية وتاريخ الجلسة");
    return;
  }
  if (window.editingId) {
    await updateDoc(doc(db, "sessions", window.editingId), sessionData);
    alert("تم تحديث بيانات الجلسة!");
  } else {
    await addDoc(collection(db, "sessions"), { ...sessionData, createdAt: Date.now() });
    alert("تم جدولة الجلسة بنجاح!");
  }
  resetSessionForm();
};

window.updateSessionsTable = function() {
  const searchTerm = (document.getElementById('session-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('sessions-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];

  window.allSessions.sort((a,b) => new Date(a.date) - new Date(b.date))
  .filter(s =>
    normalizeArabic(s.caseRef).toLowerCase().includes(searchTerm) ||
    normalizeArabic(s.court).toLowerCase().includes(searchTerm)
  ).forEach(s => {
    const isToday = s.date === today;
    const rowClass = isToday ? 'class="session-today"' : '';
    tbody.innerHTML += `<tr ${rowClass}>
      <td style="color:var(--accent-gold); font-weight:600;">${s.caseRef}</td>
      <td><span style="color:${isToday ? 'var(--accent-gold)' : 'var(--accent-green)'}; font-weight:${isToday ? 'bold' : 'normal'}">${s.date}</span> ${s.time ? `| ${s.time}` : ''}</td>
      <td>${s.court}</td>
      <td style="font-size:0.85rem; color:var(--gray-silver)">${s.notes}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editSession('${s.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteSession('${s.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.editSession = function(id) {
  const s = window.allSessions.find(item => item.id === id);
  if (!s) return;
  window.editingId = id;
  document.getElementById('sess-case-ref').value = s.caseRef;
  document.getElementById('sess-court').value = s.court;
  document.getElementById('sess-date').value = s.date;
  document.getElementById('sess-time').value = s.time;
  document.getElementById('sess-notes').value = s.notes;
  document.querySelector('#session-form .action-btn').textContent = "تحديث بيانات الجلسة";
  document.getElementById('session-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteSession = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذه الجلسة؟")) {
    await deleteDoc(doc(db, "sessions", id));
    alert("تم حذف الجلسة بنجاح!");
  }
};

window.resetSessionForm = function() {
  window.editingId = null;
  document.getElementById('session-form').reset();
  document.querySelector('#session-form .action-btn').textContent = "حفظ وجدولة الجلسة";
};

// وظائف جلسة عمل اليومية
window.refreshDailyWorkData = function() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // 1. جلسات المحاكم اليوم
  const sessBody = document.getElementById('today-court-sessions-body');
  if(sessBody) {
    sessBody.innerHTML = '';
    const todaySessions = window.allSessions.filter(s => s.date === today);
    if(todaySessions.length === 0) sessBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--gray-silver)">لا توجد جلسات مجدولة لهذا اليوم.</td></tr>';
    todaySessions.forEach(s => {
      sessBody.innerHTML += `<tr><td style="color:var(--accent-gold); font-weight:600;">${s.caseRef}</td><td>${s.court}</td><td>${s.notes || '-'}</td></tr>`;
    });
  }

  // 2. تذكيرات المتابعة (تحقيق، إحالة، تنفيذ)
  const remBody = document.getElementById('today-reminders-body');
  if(remBody) {
    remBody.innerHTML = '';
    const invs = window.allInvestigations.filter(c => c.remindDate === today).map(c => ({...c, typeLabel: 'تحقيق'}));
    const refs = window.allReferrals.filter(c => c.remindDate === today).map(c => ({...c, typeLabel: 'إحالة'}));
    const exes = window.allExecutions.filter(c => c.remindDate === today).map(c => ({...c, typeLabel: 'تنفيذ', base: `${c.base}/${c.year}`}));
    
    const allReminders = [...invs, ...refs, ...exes];
    if(allReminders.length === 0) remBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--gray-silver)">لا توجد تذكيرات متابعة لليوم.</td></tr>';
    allReminders.forEach(c => {
      remBody.innerHTML += `<tr>
        <td><span class="status-badge status-active">${c.typeLabel}</span></td>
        <td style="font-weight:600;">${c.client}</td>
        <td>${c.base || ''}</td>
        <td style="color:var(--accent-blue)">${c.remindAction || '-'}</td>
      </tr>`;
    });
  }
};

window.updateAdminTasksUI = function() {
  const container = document.getElementById('admin-tasks-container');
  if (!container) return;
  container.innerHTML = '';
  // ترتيب: غير المكتمل أولاً ثم المكتمل، ثم الأحدث للأقدم
  window.allAdminTasks.sort((a,b) => (a.completed === b.completed) ? (b.timestamp - a.timestamp) : (a.completed ? 1 : -1)).forEach(task => {
    container.innerHTML += `
      <div class="admin-task-square ${task.completed ? 'completed' : ''}">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <input type="checkbox" class="admin-task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleAdminTask('${task.id}', this.checked)">
          <span style="font-weight:500; font-size:0.95rem;">${task.text}</span>
        </div>
        <div style="text-align:left; margin-top:10px;">
          <button onclick="deleteAdminTask('${task.id}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem;">حذف 🗑️</button>
        </div>
      </div>
    `;
  });
};

window.addAdminTask = async function() {
  const input = document.getElementById('new-admin-task');
  const text = input.value.trim();
  if (!text) return;
  await addDoc(collection(db, "adminTasks"), {
    text,
    completed: false,
    timestamp: Date.now()
  });
  input.value = '';
};

window.toggleAdminTask = async function(id, status) {
  await updateDoc(doc(db, "adminTasks", id), { completed: status });
};

window.deleteAdminTask = async function(id) {
  if (confirm("حذف هذه المهمة الإدارية؟")) await deleteDoc(doc(db, "adminTasks", id));
};

// وظائف الموكل المحتمل
window.savePotentialClient = async function() {
  const potData = {
    name: document.getElementById('pot-name').value.trim(),
    phone: document.getElementById('pot-phone').value.trim(),
    date: document.getElementById('pot-date').value,
    time: document.getElementById('pot-time').value,
    notes: document.getElementById('pot-notes').value.trim(),
    timestamp: Date.now()
  };

  if (!potData.name || !potData.date || !potData.phone) return alert("يرجى إكمال البيانات الأساسية (الاسم، الهاتف، التاريخ)");

  try {
    if (window.editingId) {
      await updateDoc(doc(db, "potentialClients", window.editingId), potData);
      alert("تم تحديث الموعد بنجاح!");
    } else {
      await addDoc(collection(db, "potentialClients"), potData);
      alert("تم حفظ الموعد في دفتر المواعيد بنجاح!");
    }
    resetPotentialClientForm();
  } catch (e) { alert("خطأ في الحفظ"); }
};

window.updatePotentialClientsTable = function() {
  const tbody = document.getElementById('potential-clients-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  window.allPotentialClients.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(c => {
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:bold;">${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.date} ${c.time ? `| ${c.time}` : ''}</td>
      <td style="font-size:0.85rem; color:var(--gray-silver)">${c.notes || '-'}</td>
      <td>
        <button class="action-btn" style="background:#25D366" onclick="sendAppointmentWhatsApp('${c.id}')">تأكيد الموعد 📱</button>
        <button class="action-btn" style="background:var(--accent-blue); margin-right:5px;" onclick="editPotentialClient('${c.id}')">تعديل</button>
        <button class="action-btn" style="background:#ef4444; margin-right:5px;" onclick="deletePotentialClient('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.sendAppointmentWhatsApp = function(id) {
  const c = window.allPotentialClients.find(item => item.id === id);
  if (!c || !c.phone) return alert("لا يوجد رقم هاتف لهذا الموكل.");

  let phone = c.phone.replace(/\D/g, '');
  if (phone.startsWith('09')) phone = '963' + phone.substring(1);

  let msg = `*مكتب المحامي محمد النزال*\n\nالسيد/ة *${c.name}* المحترم/ة،\nنحيطكم علماً بأنه تم تأكيد موعد استشارتكم القانونية يوم *${c.date}* في تمام الساعة *${c.time || 'غير محدد'}*.\n\nيرجى الحضور في الموعد المحدد. نقدر ثقتكم.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.editPotentialClient = function(id) {
  const c = window.allPotentialClients.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  document.getElementById('pot-name').value = c.name;
  document.getElementById('pot-phone').value = c.phone;
  document.getElementById('pot-date').value = c.date;
  document.getElementById('pot-time').value = c.time || '';
  document.getElementById('pot-notes').value = c.notes || '';
  document.querySelector('#potential-client-form .action-btn').textContent = "تحديث الموعد 💾";
  document.getElementById('potential-client-form').scrollIntoView({behavior:'smooth'});
};

window.deletePotentialClient = async function(id) {
  if (confirm("هل تريد حذف هذا الموعد؟")) {
    await deleteDoc(doc(db, "potentialClients", id));
  }
};

window.resetPotentialClientForm = function() {
  window.editingId = null;
  document.getElementById('potential-client-form').reset();
  document.querySelector('#potential-client-form .action-btn').textContent = "حفظ الموعد ✅";
};

// وظائف التحكم في حقول القضايا المدنية والعقارية
window.toggleCaseTypeFields = function() {
  const type = document.getElementById('case-type').value;
  const row = document.getElementById('notation-trigger-row');
  row.style.display = 'flex'; // يظهر دائماً لاحتوائه على خيار "فصلت" المتاح للجميع

  const notationCheck = document.getElementById('has-notation').parentElement;
  const taxCheck = document.getElementById('has-tax').parentElement;

  if (type === 'مدني' || type === 'عقاري') {
    notationCheck.style.display = 'flex';
    taxCheck.style.display = 'flex';
  } else {
    notationCheck.style.display = 'none';
    taxCheck.style.display = 'none';
  }
};

window.toggleNotationFields = function() {
  document.getElementById('notation-fields').style.display = document.getElementById('has-notation').checked ? 'grid' : 'none';
};

window.toggleTaxFields = function() {
  document.getElementById('tax-fields').style.display = document.getElementById('has-tax').checked ? 'grid' : 'none';
};

window.toggleSeparatedFields = function() {
  document.getElementById('separated-fields').style.display = document.getElementById('is-separated').checked ? 'grid' : 'none';
};

// General Case Management functions
window.saveGeneralCase = async function() {
  try {
    const clientName = document.getElementById('client-full-name').value.trim();
    const clientObj = window.allClients.find(c => c.fullname === clientName);
    const isSeparated = document.getElementById('is-separated').checked;

    if (isSeparated) {
      const decisionNum = document.getElementById('gen-sep-decision-num').value.trim();
      const sepDate = document.getElementById('gen-sep-date').value;
      const sepResult = document.getElementById('gen-sep-result').value.trim();

      if (!clientName || !decisionNum) {
        alert("يرجى إكمال بيانات الفصل (اسم الموكل ورقم القرار).");
        return;
      }

      const separatedData = {
        client: clientName,
        clientId: clientObj ? clientObj.id : null,
        opponent: document.getElementById('opponent').value.trim(),
        decisionNum: decisionNum,
        base: document.getElementById('case-number').value.trim() + '/' + document.getElementById('case-year').value.trim(),
        court: document.getElementById('court').value.trim(),
        result: sepResult,
        separationDate: sepDate,
        subject: document.getElementById('case-subject').value.trim(),
        timestamp: Date.now()
      };

      await addDoc(collection(db, "separatedCases"), separatedData);

      if (window.editingId) {
        await deleteDoc(doc(db, "generalCases", window.editingId));
      }

      alert("تم فصل الدعوى ونقلها إلى أرشيف القضايا المفصولة بنجاح! ✅");
      resetGeneralCaseForm();
      return;
    }

    const caseData = {
      court: document.getElementById('court').value.trim(),
      base: document.getElementById('case-number').value.trim(),
      year: document.getElementById('case-year').value.trim(),
      city: document.getElementById('city').value.trim(),
      type: document.getElementById('case-type').value.trim(),
      subject: document.getElementById('case-subject').value.trim(),
      opponent: document.getElementById('opponent').value.trim(),
      opponentRole: document.getElementById('opponent-role').value,
      client: clientName,
      clientId: clientObj ? clientObj.id : null,
      clientRole: document.getElementById('client-role').value,
      firstSession: document.getElementById('first-session-date').value,
      clientStatus: 'نشطة',
      typeLabel: 'عامة',
      hasNotation: document.getElementById('has-notation').checked,
      notationNum: document.getElementById('notation-num').value.trim(),
      propertyNum: document.getElementById('property-num').value.trim(),
      inFavorOf: document.getElementById('in-favor-of').value.trim(),
      againstShareOf: document.getElementById('against-share-of').value.trim(),
      hasTax: document.getElementById('has-tax').checked,
      taxNum: document.getElementById('tax-num').value.trim(),
      updatedAt: Date.now()
    };

    if (!caseData.client || !caseData.base || !caseData.year) {
      alert("يرجى إكمال البيانات الأساسية (الموكل، رقم الأساس، العام)");
      return;
    }

    if (window.editingId) {
      await updateDoc(doc(db, "generalCases", window.editingId), caseData);
      alert("تم تحديث بيانات القضية بنجاح! ✅");
    } else {
      await addDoc(collection(db, "generalCases"), { ...caseData, createdAt: Date.now() });
      alert('تم حفظ القضية بنجاح وربطها بالموكل! ✅');
    }
    resetGeneralCaseForm();
  } catch (error) {
    console.error("Error saving case: ", error);
    alert("فشل في حفظ القضية. يرجى التأكد من صلاحيات Firebase.");
  }
};

window.updateGeneralCasesTable = function() {
  const searchTerm = (document.getElementById('general-case-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('general-cases-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allGeneralCases.filter(c =>
    normalizeArabic(c.client).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.opponent).toLowerCase().includes(searchTerm) ||
    c.base.includes(searchTerm)
  ).forEach(c => {
    tbody.innerHTML += `<tr>
      <td style="color:var(--accent-gold); font-weight:600;">${c.client} (${c.clientRole || ''})</td>
      <td>${c.opponent || '-'}</td>
      <td>${c.base}/${c.year}</td>
      <td>${c.type}</td>
      <td>${c.court} / ${c.city}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewGeneralCase('${c.id}')">عرض 👁️</button>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editGeneralCase('${c.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteGeneralCase('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.viewGeneralCase = function(id) {
  const c = window.allGeneralCases.find(item => item.id === id);
  if (!c) return;
  window.currentViewingCaseId = id;
  window.currentViewingCaseType = 'general';
  
  document.getElementById('view-case-title').textContent = `متابعة جلسات الموكل: ${c.client}`;
  document.getElementById('view-case-base').textContent = `${c.base}/${c.year}`;
  document.getElementById('view-case-court').textContent = c.court;
  document.getElementById('case-session-outcome').value = c.lastSessionOutcome || '';
  document.getElementById('case-next-date').value = c.nextSessionDate || '';
  document.getElementById('case-postpone-reason').value = c.postponementReason || '';
  document.getElementById('case-session-update-section').style.display = 'block';
  window.populateViewCaseSummary({
    opponent: c.opponent,
    clientRole: c.clientRole,
    clientStatus: c.clientStatus,
    opponentRole: c.opponentRole,
    opponentStatus: c.opponentStatus,
    caseType: c.type || 'عامة',
    crime: c.crime || c.subject,
    actionNext: c.actionNext || c.remindAction,
    remindDate: c.remindDate,
    notes: c.notes
  });
  document.getElementById('general-case-view-modal').style.display = 'flex';
};

window.viewExecutionCase = function(id) {
  const c = window.allExecutions.find(item => item.id === id);
  if (!c) return;
  window.currentViewingCaseId = id;
  window.currentViewingCaseType = 'execution';

  document.getElementById('view-case-title').textContent = `متابعة ملف التنفيذ: ${c.client}`;
  document.getElementById('view-case-base').textContent = `${c.base}/${c.year}`;
  document.getElementById('view-case-court').textContent = c.type || c.court || '';
  document.getElementById('case-session-outcome').value = c.notes || '';
  document.getElementById('case-next-date').value = c.remindDate || '';
  document.getElementById('case-postpone-reason').value = c.actionNext || '';
  document.getElementById('case-session-update-section').style.display = 'block';
  window.populateViewCaseSummary({
    opponent: c.opponent,
    clientRole: c.clientRole,
    clientStatus: '',
    opponentRole: c.opponentRole,
    opponentStatus: '',
    caseType: 'تنفيذ',
    crime: c.notes,
    actionNext: c.actionNext,
    remindDate: c.remindDate,
    notes: c.notes
  });
  document.getElementById('general-case-view-modal').style.display = 'flex';
};

window.closeGeneralCaseViewModal = function() {
  document.getElementById('general-case-view-modal').style.display = 'none';
};

window.saveCaseSessionUpdate = async function() {
  const outcome = document.getElementById('case-session-outcome').value.trim();
  const nextDate = document.getElementById('case-next-date').value;
  const reason = document.getElementById('case-postpone-reason').value.trim();
  const shouldSendWhatsapp = document.getElementById('send-whatsapp-update').checked;

  if (!window.currentViewingCaseId) return;

  const collectionName = window.currentViewingCaseType === 'investigation' ? "investigations" : 
                         window.currentViewingCaseType === 'referral' ? "referrals" : "generalCases";

  const caseTypeLabel = window.currentViewingCaseType === 'investigation' ? "تحقيق" : 
                        window.currentViewingCaseType === 'referral' ? "إحالة" : "عامة";

  const sourceList = window.currentViewingCaseType === 'investigation' ? window.allInvestigations : 
                     window.currentViewingCaseType === 'referral' ? window.allReferrals : window.allGeneralCases;
  const c = sourceList.find(item => item.id === window.currentViewingCaseId);

  try {
    const caseRef = doc(db, collectionName, window.currentViewingCaseId);
    await updateDoc(caseRef, {
      lastSessionOutcome: outcome,
      nextSessionDate: nextDate,
      postponementReason: reason,
      updatedAt: Date.now()
    });

    if (nextDate) {
      await addDoc(collection(db, "sessions"), {
        caseRef: `${c.client} - ${caseTypeLabel}: ${c.base}/${c.year}`,
        court: c.court || c.dept,
        date: nextDate,
        time: "",
        notes: reason || outcome,
        createdAt: Date.now()
      });
    }

    // إرسال رسالة واتساب تلقائية للموكل تحتوي على مستجدات الجلسة
    const clientInfo = window.allClients.find(cl => cl.id === c.clientId || normalizeArabic(cl.fullname) === normalizeArabic(c.client));
    if (shouldSendWhatsapp && clientInfo && (clientInfo.whatsapp || clientInfo.phone)) {
      let phone = clientInfo.whatsapp || clientInfo.phone;
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('09')) phone = '963' + phone.substring(1);

      const todayStr = new Date().toLocaleDateString('ar-EG');
      const nextDateFormatted = nextDate ? new Date(nextDate).toLocaleDateString('ar-EG') : 'سيتم تحديده لاحقاً';

      let message = `تحية طيبة وبعد\n`;
      message += `نود إعلامك بآخر مستجدات الدعوى وفق التفاصيل التالية: \n`;
      message += `_ رقم أساس الدعوى: ${c.base}${c.year ? '/' + c.year : ''}\n`;
      message += `_ المحكمة: ${c.court || c.dept || ''} ${c.city || ''}\n\n`;
      message += `*ملخص الجلسة:* \n`;
      message += `عقدت جلسة الدعوى بتاريخ ${todayStr}م وقد تقرر تأجيل النظر في الدعوى وذلك بسبب: \n`;
      message += `${reason || outcome || 'متابعة الإجراءات القانونية'}\n\n`;
      message += `*موعد الجلسة القادمة:* \n`;
      message += `تم تحديد الجلسة القادمة بتاريخ ${nextDateFormatted}م\n\n`;
      message += `سنوافيكم بأي مستجدات تطرأ على الدعوى، وفي حال وجود أي استفسار لا تتردوا في التواصل معنا\n`;
      message += `وتفضلوا بقبول فائق الاحترام\n`;
      message += `دمتم بخير`;

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }

    alert("تم تحديث بيانات الجلسة وإبلاغ الموكل بنجاح! ✅");
    closeGeneralCaseViewModal();
  } catch (e) {
    alert("خطأ أثناء الحفظ");
  }
};

window.editGeneralCase = function(id) {
  const c = window.allGeneralCases.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  document.getElementById('court').value = c.court;
  document.getElementById('case-number').value = c.base;
  document.getElementById('case-year').value = c.year;
  document.getElementById('city').value = c.city;
  document.getElementById('case-type').value = c.type;
  document.getElementById('case-subject').value = c.subject;
  document.getElementById('opponent').value = c.opponent;
  document.getElementById('opponent-role').value = c.opponentRole;
  document.getElementById('client-full-name').value = c.client;
  document.getElementById('client-role').value = c.clientRole;
  document.getElementById('first-session-date').value = c.firstSession;

  // تحميل الحقول المدنية/العقارية
  document.getElementById('has-notation').checked = c.hasNotation || false;
  document.getElementById('notation-num').value = c.notationNum || '';
  document.getElementById('property-num').value = c.propertyNum || '';
  document.getElementById('in-favor-of').value = c.inFavorOf || '';
  document.getElementById('against-share-of').value = c.againstShareOf || '';
  document.getElementById('has-tax').checked = c.hasTax || false;
  document.getElementById('tax-num').value = c.taxNum || '';

  toggleCaseTypeFields();
  toggleNotationFields();
  toggleTaxFields();

  document.querySelector('#case-management-section .action-btn').textContent = "تحديث بيانات القضية 💾";
  document.getElementById('case-management-section').scrollIntoView({ behavior: 'smooth' });
};

window.deleteGeneralCase = async function(id) {
  if (confirm("هل أنت متأكد من حذف هذه القضية نهائياً؟")) {
    try {
      await deleteDoc(doc(db, "generalCases", id));
      alert("تم حذف القضية بنجاح!");
    } catch (error) {
      alert("حدث خطأ أثناء الحذف.");
    }
  }
};

window.resetGeneralCaseForm = function() {
  window.editingId = null;
  const form = document.querySelector('#case-management-section form');
  if (form) form.reset();
  document.getElementById('notation-trigger-row').style.display = 'none';
  document.getElementById('notation-fields').style.display = 'none';
  document.getElementById('tax-fields').style.display = 'none';
  document.getElementById('separated-fields').style.display = 'none';
  document.querySelector('#case-management-section .action-btn').textContent = "حفظ القضية";
};

// Fees & Payments Management functions
window.handleFeeClientChange = function() {
  const name = document.getElementById('fee-client-name').value.trim();
  const client = window.allClients.find(c => c.fullname === name);
  if (client) {
    document.getElementById('fee-total-agreed').value = client.agreedFee || 0;
    updateFeesTable(name);
  } else {
    document.getElementById('fee-total-agreed').value = '';
    document.getElementById('payments-table-body').innerHTML = '';
  }
};

window.saveFeePayment = async function() {
  const name = document.getElementById('fee-client-name').value.trim();
  const totalAgreed = parseFloat(document.getElementById('fee-total-agreed').value) || 0;
  const payAmt = parseFloat(document.getElementById('fee-payment-amount').value) || 0;
  const payDate = document.getElementById('fee-payment-date').value;

  const client = window.allClients.find(c => c.fullname === name);
  if (!client) return alert("يرجى اختيار موكل صحيح.");

  try {
    // تحديث إجمالي الأتعاب في مستند الموكل
    await updateDoc(doc(db, "clients", client.id), { agreedFee: totalAgreed });

    // إضافة دفعة جديدة إذا وجدت
    if (payAmt > 0 && payDate) {
      await addDoc(collection(db, "payments"), {
        clientId: client.id,
        clientName: name,
        amount: payAmt,
        date: payDate,
        timestamp: Date.now()
      });

      // حساب إجمالي المدفوعات الحالي للموكل (تنبيه اكتمال السداد)
      const currentPayments = window.allPayments.filter(p => p.clientName === name);
      const totalPaidSoFar = currentPayments.reduce((sum, p) => sum + p.amount, 0) + payAmt;

      document.getElementById('fee-payment-amount').value = '';
      document.getElementById('fee-payment-date').value = '';

      if (totalPaidSoFar >= totalAgreed && totalAgreed > 0) {
        alert(`✅ تم تسجيل الدفعة بنجاح.\n\n🎊 تنبيه: الموكل ${name} قد سدد كامل المبلغ المتفق عليه (${totalAgreed.toLocaleString()} ل.س).`);
      } else {
        alert("تم تسجيل الدفعة وتحديث الأتعاب بنجاح!");
      }
    } else {
      alert("تم تحديث إجمالي الأتعاب بنجاح!");
    }
    updateFeesTable(name);
    updateGlobalFeesSummary();
  } catch (e) { alert("خطأ في الحفظ"); }
};

window.updateFeesTable = function(clientName) {
  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const client = window.allClients.find(c => c.fullname === clientName);
  const payments = window.allPayments.filter(p => p.clientName === clientName).sort((a,b) => new Date(b.date) - new Date(a.date));
  
  let totalPaid = 0;
  payments.forEach(p => {
    totalPaid += p.amount;
    tbody.innerHTML += `<tr>
      <td>${p.date}</td>
      <td style="color:var(--accent-green); font-weight:bold;">${p.amount.toLocaleString()} ل.س</td>
      <td><button class="action-btn" style="background:#ef4444" onclick="deletePayment('${p.id}', '${clientName}')">حذف</button></td>
    </tr>`;
  });

  const agreed = client ? (client.agreedFee || 0) : 0;
  document.getElementById('fee-table-title').innerHTML = `سجل دفعات الموكل (المسدد: ${totalPaid.toLocaleString()} | المتبقي: ${(agreed - totalPaid).toLocaleString()} ل.س)`;
};

// وظيفة عرض ملف الموكل الشامل للأستاذ محمد
window.viewClientProfile = function(id) {
  const client = window.allClients.find(c => c.id === id);
  if (!client) return;
  const normClient = normalizeArabic(client.fullname);

  document.getElementById('p-client-name').textContent = `ملف الموكل الشامل: ${client.fullname}`;
  
  // المعلومات الشخصية
  document.getElementById('p-client-info').innerHTML = `
      <div class="info-row"><span class="info-label">الهاتف:</span><span class="info-value">${client.phone || '-'}</span></div>
      <div class="info-row"><span class="info-label">واتساب:</span><span class="info-value">${client.whatsapp || '-'}</span></div>
      <div class="info-row"><span class="info-label">العنوان:</span><span class="info-value">${client.address || '-'}</span></div>
      <div class="info-row"><span class="info-label">اسم المستخدم:</span><span class="info-value">${client.username}</span></div>
  `;

  // الحالة المالية
  const myPayments = window.allPayments.filter(p => p.clientId === client.id);
  const totalPaid = myPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const agreed = parseFloat(client.agreedFee) || 0;
  document.getElementById('p-client-finance').innerHTML = `
      <div class="info-row"><span class="info-label">إجمالي الأتعاب المتفق عليها:</span><span class="info-value">${agreed.toLocaleString()} ل.س</span></div>
      <div class="info-row"><span class="info-label">إجمالي المسدد:</span><span class="info-value" style="color:var(--accent-green)">${totalPaid.toLocaleString()} ل.س</span></div>
      <div class="info-row"><span class="info-label">المبلغ المتبقي:</span><span class="info-value" style="color:#ef4444">${(agreed - totalPaid).toLocaleString()} ل.س</span></div>
  `;

  // وظيفة فلترة موحدة تعتمد على ID الموكل أولاً لضمان الدقة
  const filterByClient = (caseItem) => {
      if (caseItem.clientId) return caseItem.clientId === client.id;
      if (!caseItem.client) return false;
      return normalizeArabic(caseItem.client) === normClient;
  };

  // جلب كافة القضايا (تحقيق، إحالة، تنفيذ، عامة، مفصولة)
  const invCases = window.allInvestigations.filter(filterByClient).map(c => ({...c, cat: 'تحقيق'}));
  const refCases = window.allReferrals.filter(filterByClient).map(c => ({...c, cat: 'إحالة'}));
  const exeCases = window.allExecutions.filter(filterByClient).map(c => ({...c, cat: 'تنفيذ', base: `${c.base}/${c.year}`}));
  const genCases = window.allGeneralCases.filter(filterByClient).map(c => ({...c, cat: 'عامة', base: `${c.base}/${c.year}`}));
  const sepCases = window.allSeparatedCases.filter(filterByClient).map(c => ({...c, cat: 'مفصولة', base: `قرار: ${c.decisionNum}`}));
  const studyCases = window.allCaseStudies.filter(filterByClient).map(c => ({...c, cat: 'دراسة شرعية', base: c.date || '', year: '', dept: c.court || ''}));
  
  const allMyCases = [...invCases, ...refCases, ...exeCases, ...genCases, ...sepCases, ...studyCases];
  
  let casesHtml = '';
  if (allMyCases.length === 0) {
      casesHtml = '<p style="text-align:center; color:var(--gray-silver); padding:10px;">لا توجد قضايا مسجلة لهذا الموكل.</p>';
  } else {
      casesHtml = '<table class="data-table" style="font-size:0.9rem;"><thead><tr><th>النوع</th><th>رقم الأساس/القرار</th><th>الخصم</th><th>الحالة / النتيجة</th></tr></thead><tbody>';
      allMyCases.forEach(c => {
          const status = c.result || c.clientStatus || c.actionNext || 'نشطة';
          const baseStr = c.cat === 'تحقيق' || c.cat === 'إحالة' ? `${c.base}/${c.year}` : c.base;
          casesHtml += `<tr>
            <td><span class="status-badge status-active">${c.cat}</span></td>
            <td>${baseStr}</td>
            <td>${c.opponent || '-'}</td>
            <td>${status}</td>
          </tr>`;
      });
      casesHtml += '</tbody></table>';
  }
  document.getElementById('p-client-cases').innerHTML = casesHtml;

  // الوكالات
  const agencies = window.allAgencies.filter(a => normalizeArabic(a.clientName) === normClient);
  let agenciesHtml = '';
  if (agencies.length === 0) {
      agenciesHtml = '<p style="text-align:center; color:var(--gray-silver); padding:10px;">لا توجد وكالات مسجلة.</p>';
  } else {
      agenciesHtml = '<table class="data-table" style="font-size:0.9rem;"><thead><tr><th>النوع</th><th>النطاق</th><th>التاريخ</th><th>التفاصيل</th></tr></thead><tbody>';
      agencies.forEach(a => {
          agenciesHtml += `<tr><td>${a.type}</td><td>${a.scope}</td><td>${a.date}</td><td>${a.details}</td></tr>`;
      });
      agenciesHtml += '</tbody></table>';
  }
  document.getElementById('p-client-agencies').innerHTML = agenciesHtml;

  // عرض الملاحظات الخاصة في ملف الموكل الشامل
  document.getElementById('p-client-private-notes').textContent = client.privateNotes || 'لا توجد ملاحظات خاصة مسجلة لهذا الموكل.';

  document.getElementById('client-profile-modal').style.display = 'flex';
};

window.closeClientProfileModal = function() {
  document.getElementById('client-profile-modal').style.display = 'none';
};

// Separated Cases functions
window.saveSeparatedCase = async function() {
  const clientName = document.getElementById('sep-client').value.trim();
  const clientObj = window.allClients.find(c => c.fullname === clientName);
  const caseData = {
    client: clientName,
    clientId: clientObj ? clientObj.id : null,
    opponent: document.getElementById('sep-opponent').value.trim(),
    decisionNum: document.getElementById('sep-decision-num').value.trim(),
    base: document.getElementById('sep-base').value.trim(),
    court: document.getElementById('sep-court').value.trim(),
    result: document.getElementById('sep-result').value.trim(),
    timestamp: Date.now()
  };

  if (!caseData.client || !caseData.decisionNum) return alert("يرجى إدخال اسم الموكل ورقم القرار.");

  try {
    if (window.editingId) {
      await updateDoc(doc(db, "separatedCases", window.editingId), caseData);
      alert("تم تحديث القرار بنجاح!");
    } else {
      await addDoc(collection(db, "separatedCases"), caseData);
      alert("تم أرشفة القرار بنجاح!");
    }
    resetSeparatedCaseForm();
  } catch (e) { alert("خطأ في الحفظ"); }
};

window.updateSeparatedCasesTable = function() {
  const searchTerm = (document.getElementById('separated-case-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('separated-cases-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  window.allSeparatedCases.filter(c => 
    (c.decisionNum && c.decisionNum.toLowerCase().includes(searchTerm)) ||
    (normalizeArabic(c.client).toLowerCase().includes(searchTerm))
  ).sort((a,b) => b.timestamp - a.timestamp).forEach(c => {
    tbody.innerHTML += `<tr>
      <td><a href="#" style="color:var(--accent-gold); font-weight:bold; text-decoration:none;" onclick="viewSeparatedCase('${c.id}'); return false;">${c.client}</a><br><small>${c.opponent}</small></td>
      <td>قرار: ${c.decisionNum}<br>أساس: ${c.base}</td>
      <td>${c.court}</td>
      <td style="color:var(--accent-green)">${c.result}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewSeparatedCase('${c.id}')">عرض 👁️</button>
        <button class="action-btn" style="background:#25D366" onclick="sendSeparatedWhatsApp('${c.id}')">واتساب 📱</button>
        <button class="action-btn" style="background:var(--accent-gold)" onclick="printSeparatedCase('${c.id}')">طباعة 🖨️</button>
        <button class="action-btn" style="background:var(--accent-blue)" onclick="editSeparatedCase('${c.id}')">تعديل</button>
        <button class="action-btn" style="background:#ef4444" onclick="deleteSeparatedCase('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.generateCaseStudyPreviewHtml = function(data) {
  return `
    <div style="direction:rtl; font-family:Tahoma; color:#fff; line-height:1.7;">
      <h2 style="text-align:center; color:var(--accent-gold);">${data.title || 'دراسة الدعوى الشرعية'}</h2>
      <div class="info-row"><span class="info-label">اسم الموكل:</span><span class="info-value">${data.client || '-'}</span></div>
      <div class="info-row"><span class="info-label">اسم الخصم:</span><span class="info-value">${data.opponent || '-'}</span></div>
      <div class="info-row"><span class="info-label">المحكمة / الدائرة:</span><span class="info-value">${data.court || '-'}</span></div>
      <div class="info-row"><span class="info-label">تاريخ الدراسة:</span><span class="info-value">${data.date || '-'}</span></div>
      <div class="info-row"><span class="info-label">الصفة:</span><span class="info-value">${data.clientRole || '-'}</span></div>
      <div style="margin-top: 15px;"><strong>موضوع الدراسة:</strong><p>${data.subject || '-'}</p></div>
      <div style="margin-top: 15px;"><strong>خلاصة وتوصيات:</strong><p>${data.summary || '-'}</p></div>
      <div style="margin-top: 15px;"><strong>ملاحظات إضافية:</strong><p>${data.notes || '-'}</p></div>
    </div>
  `;
};

window.saveCaseStudy = async function() {
  const spouseInfo = gatherSpouseData();
  const husbandName = spouseInfo.husband.name || '';
  const wifeName = spouseInfo.wife.name || '';
  const plaintiff = spouseInfo.plaintiff || 'husband';
  const clientName = plaintiff === 'wife' ? wifeName : husbandName;
  const opponentName = plaintiff === 'wife' ? husbandName : wifeName;
  const title = 'دراسة الدعوى شرعية';

  if (!husbandName && !wifeName) {
    alert('يرجى إدخال بيانات الزوجين للمضي قدماً.');
    return;
  }

  const clientObj = window.allClients.find(c => c.fullname === clientName);
  const caseData = {
    client: clientName || husbandName || wifeName,
    clientId: clientObj ? clientObj.id : null,
    clientRole: 'مدعي',
    opponent: opponentName || '-',
    title,
    subject: '',
    facts: '',
    legal: '',
    summary: '',
    notes: '',
    docxName: document.getElementById('case-study-docx-name')?.value || null,
    docxData: document.getElementById('case-study-docx-data')?.value || null,
    spouses: {
      husband: spouseInfo.husband,
      wife: spouseInfo.wife,
      plaintiff
    },
    studyType: 'شرعية',
    updatedAt: Date.now(),
    timestamp: Date.now()
  };

  try {
    if (window.editingId) {
      await updateDoc(doc(db, 'caseStudies', window.editingId), caseData);
      alert('تم تحديث دراسة الدعوى الشرعية بنجاح.');
    } else {
      const docRef = await addDoc(collection(db, 'caseStudies'), caseData);
      if (clientObj) {
        await updateDoc(doc(db, 'clients', clientObj.id), { caseStudyIds: arrayUnion(docRef.id) });
      }
      alert('تم حفظ دراسة الدعوى الشرعية ضمن معلومات الموكل والدعوى.');
    }
    resetCaseStudyForm();
  } catch (error) {
    console.error('Error saving case study:', error);
    alert('حدث خطأ أثناء حفظ الدراسة.');
  }
};

window.updateCaseStudiesTable = function() {
  const searchTerm = (document.getElementById('case-study-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('case-study-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.allCaseStudies.filter(c =>
    normalizeArabic(c.client).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.opponent).toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.title).toLowerCase().includes(searchTerm)
  ).sort((a,b) => b.timestamp - a.timestamp).forEach(c => {
    tbody.innerHTML += `<tr>
      <td>${c.client}</td>
      <td>${c.opponent || '-'}</td>
      <td>${c.court || '-'}</td>
      <td>${c.date || '-'}</td>
      <td>${c.title}</td>
      <td>
        <button class="action-btn" style="background: var(--accent-gold); margin-left: 5px;" onclick="viewCaseStudy('${c.id}')">عرض</button>
        <button class="action-btn" style="background: var(--accent-blue); margin-left: 5px;" onclick="editCaseStudy('${c.id}')">تعديل</button>
        <button class="action-btn" style="background: #ef4444;" onclick="deleteCaseStudy('${c.id}')">حذف</button>
      </td>
    </tr>`;
  });
};

window.resetCaseStudyForm = function() {
  window.editingId = null;
  document.getElementById('case-study-form').reset();
  document.getElementById('plaintiff-husband').checked = true;
  document.getElementById('plaintiff-wife').checked = false;
};

// Sync plaintiff selection; table display uses spouse data directly
window.syncPlaintiffSelection = function() {
  const selected = document.querySelector('input[name="case-plaintiff"]:checked')?.value;
  if (!selected) return;
};

// Gather spouse objects from the form
function gatherSpouseData() {
  const husband = {
    name: document.getElementById('husband-name')?.value.trim() || null,
    father: document.getElementById('husband-father')?.value.trim() || null,
    mother: document.getElementById('husband-mother')?.value.trim() || null,
    birth: document.getElementById('husband-birth')?.value.trim() || null,
    nid: document.getElementById('husband-nid')?.value.trim() || null,
    job: document.getElementById('husband-job')?.value.trim() || null,
    phone: document.getElementById('husband-phone')?.value.trim() || null,
    health: document.getElementById('husband-health')?.value.trim() || null,
    finance: document.getElementById('husband-finance')?.value.trim() || null,
    address: document.getElementById('husband-address')?.value.trim() || null
  };
  const wife = {
    name: document.getElementById('wife-name')?.value.trim() || null,
    father: document.getElementById('wife-father')?.value.trim() || null,
    mother: document.getElementById('wife-mother')?.value.trim() || null,
    birth: document.getElementById('wife-birth')?.value.trim() || null,
    nid: document.getElementById('wife-nid')?.value.trim() || null,
    job: document.getElementById('wife-job')?.value.trim() || null,
    phone: document.getElementById('wife-phone')?.value.trim() || null,
    health: document.getElementById('wife-health')?.value.trim() || null,
    finance: document.getElementById('wife-finance')?.value.trim() || null,
    address: document.getElementById('wife-address')?.value.trim() || null
  };
  const plaintiff = document.querySelector('input[name="case-plaintiff"]:checked')?.value || null;
  return { husband, wife, plaintiff };
}

// Import .docx and map to form fields using Mammoth
window.importCaseStudyDocx = async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const caseStudyDocxNameInput = document.getElementById('case-study-docx-name');
  if (caseStudyDocxNameInput) caseStudyDocxNameInput.value = file.name;

  // Read as data URL to store original file if needed
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const caseStudyDocxDataInput = document.getElementById('case-study-docx-data');
  if (caseStudyDocxDataInput) caseStudyDocxDataInput.value = dataUrl;

  // Convert docx to HTML using mammoth (browser bundle loaded in head)
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';

    const sections = extractSectionsFromText(text);

    // Map extracted sections into form fields
    if (sections.client) {
      const el = document.getElementById('case-study-client');
      if (el) el.value = sections.client;
    }
    if (sections.opponent) {
      const el = document.getElementById('case-study-opponent');
      if (el) el.value = sections.opponent;
    }
    if (sections.court) {
      const el = document.getElementById('case-study-court');
      if (el) el.value = sections.court;
    }
    if (sections.title) {
      const el = document.getElementById('case-study-title');
      if (el) el.value = sections.title;
    }
    if (sections.date) {
      const el = document.getElementById('case-study-date');
      if (el) el.value = sections.date;
    }
    if (sections.facts) {
      const el = document.getElementById('case-study-facts');
      if (el) el.value = sections.facts;
    }
    if (sections.legal) {
      const el = document.getElementById('case-study-legal');
      if (el) el.value = sections.legal;
    }
    if (sections.summary) {
      const el = document.getElementById('case-study-summary');
      if (el) el.value = sections.summary;
    }
    if (sections.notes) {
      const el = document.getElementById('case-study-notes');
      if (el) el.value = sections.notes;
    }

    // Fallback: put full text into subject if subject empty
    const caseStudySubject = document.getElementById('case-study-subject');
    if (caseStudySubject && !caseStudySubject.value.trim()) {
      caseStudySubject.value = text.substring(0, 2000);
    }

    alert('تم استيراد ملف الـ .docx تلقائياً. يرجى مراجعة الحقول وتعديلها حسب الحاجة.');
  } catch (err) {
    console.error('Import docx error:', err);
    alert('حدث خطأ أثناء تحويل الملف. تأكد أن الملف بصيغة DOCX صحيحة.');
  }
};

// Heuristic extraction of Arabic-labeled sections from plain text
function extractSectionsFromText(text) {
  const sections = { title: null, client: null, opponent: null, court: null, date: null, facts: null, legal: null, summary: null, notes: null };
  if (!text) return sections;

  // Normalize line breaks
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Join into single text for searches
  const joined = lines.join('\n');

  // Simple patterns
  const findAfter = (keywords) => {
    for (const kw of keywords) {
      const idx = joined.indexOf(kw);
      if (idx !== -1) {
        const tail = joined.substring(idx + kw.length).trim();
        const nextBreak = tail.indexOf('\n\n');
        return nextBreak === -1 ? tail.trim() : tail.substring(0, nextBreak).trim();
      }
    }
    return null;
  };

  sections.title = findAfter(['دراسة', 'عنوان الدراسة', 'عنوان:']) || lines[0] || null;
  sections.client = findAfter(['اسم الموكل', 'الموكل', 'اسم الموكّل']) || null;
  sections.opponent = findAfter(['اسم الخصم', 'الخصم']) || null;
  sections.court = findAfter(['المحكمة', 'الدائرة', 'محكمة']) || null;
  sections.date = findAfter(['تاريخ', 'التاريخ']) || null;
  sections.facts = findAfter(['وقائع', 'وقائع القضية', 'الوقائع', 'الوقائع:']) || null;
  sections.legal = findAfter(['الأساس', 'الأدلّة', 'الدعوى', 'الأدلّة:','الأساس الشرعي']) || null;
  sections.summary = findAfter(['خلاصة', 'التوصيات', 'الاستنتاج']) || null;
  sections.notes = findAfter(['ملاحظات', 'مراجع']) || null;

  // If no structured sections, fallback to first paragraphs
  if (!sections.facts && lines.length > 2) sections.facts = lines.slice(1,4).join('\n');
  if (!sections.legal && lines.length > 4) sections.legal = lines.slice(4,7).join('\n');

  return sections;
}

window.openCaseStudyForm = function() {
  document.getElementById('case-study-entry-card').style.display = 'none';
  document.getElementById('case-study-form-wrapper').style.display = 'block';
  resetCaseStudyForm();
  document.getElementById('plaintiff-husband').checked = true;
  document.getElementById('plaintiff-wife').checked = false;
  document.getElementById('case-study-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.viewCaseStudy = function(id) {
  const c = window.allCaseStudies.find(item => item.id === id);
  if (!c) return;
  window.editingId = null;
  const spouseData = c.spouses || {};
  const husband = spouseData.husband || {};
  const wife = spouseData.wife || {};
  const plaintiff = spouseData.plaintiff || 'husband';

  document.getElementById('husband-name').value = husband.name || '';
  document.getElementById('husband-father').value = husband.father || '';
  document.getElementById('husband-mother').value = husband.mother || '';
  document.getElementById('husband-birth').value = husband.birth || '';
  document.getElementById('husband-nid').value = husband.nid || '';
  document.getElementById('husband-job').value = husband.job || '';
  document.getElementById('husband-phone').value = husband.phone || '';
  document.getElementById('husband-health').value = husband.health || '';
  document.getElementById('husband-finance').value = husband.finance || '';
  document.getElementById('husband-address').value = husband.address || '';

  document.getElementById('wife-name').value = wife.name || '';
  document.getElementById('wife-father').value = wife.father || '';
  document.getElementById('wife-mother').value = wife.mother || '';
  document.getElementById('wife-birth').value = wife.birth || '';
  document.getElementById('wife-nid').value = wife.nid || '';
  document.getElementById('wife-job').value = wife.job || '';
  document.getElementById('wife-phone').value = wife.phone || '';
  document.getElementById('wife-health').value = wife.health || '';
  document.getElementById('wife-finance').value = wife.finance || '';
  document.getElementById('wife-address').value = wife.address || '';

  document.getElementById('plaintiff-husband').checked = plaintiff === 'husband';
  document.getElementById('plaintiff-wife').checked = plaintiff === 'wife';

  openCaseStudyPreview();
};

window.editCaseStudy = function(id) {
  const c = window.allCaseStudies.find(item => item.id === id);
  if (!c) return;
  window.editingId = id;
  const spouseData = c.spouses || {};
  const husband = spouseData.husband || {};
  const wife = spouseData.wife || {};
  const plaintiff = spouseData.plaintiff || 'husband';

  document.getElementById('husband-name').value = husband.name || '';
  document.getElementById('husband-father').value = husband.father || '';
  document.getElementById('husband-mother').value = husband.mother || '';
  document.getElementById('husband-birth').value = husband.birth || '';
  document.getElementById('husband-nid').value = husband.nid || '';
  document.getElementById('husband-job').value = husband.job || '';
  document.getElementById('husband-phone').value = husband.phone || '';
  document.getElementById('husband-health').value = husband.health || '';
  document.getElementById('husband-finance').value = husband.finance || '';
  document.getElementById('husband-address').value = husband.address || '';

  document.getElementById('wife-name').value = wife.name || '';
  document.getElementById('wife-father').value = wife.father || '';
  document.getElementById('wife-mother').value = wife.mother || '';
  document.getElementById('wife-birth').value = wife.birth || '';
  document.getElementById('wife-nid').value = wife.nid || '';
  document.getElementById('wife-job').value = wife.job || '';
  document.getElementById('wife-phone').value = wife.phone || '';
  document.getElementById('wife-health').value = wife.health || '';
  document.getElementById('wife-finance').value = wife.finance || '';
  document.getElementById('wife-address').value = wife.address || '';

  document.getElementById('plaintiff-husband').checked = plaintiff === 'husband';
  document.getElementById('plaintiff-wife').checked = plaintiff === 'wife';

  document.querySelector('#case-study-form .action-btn').textContent = 'تحديث الدراسة';
  document.getElementById('case-study-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteCaseStudy = async function(id) {
  if (!confirm('هل تريد حذف هذه الدراسة؟')) return;
  await deleteDoc(doc(db, 'caseStudies', id));
};

window.openCaseStudyPreview = function() {
  const spouseInfo = gatherSpouseData();
  const husbandName = spouseInfo.husband.name || '';
  const wifeName = spouseInfo.wife.name || '';
  const plaintiff = spouseInfo.plaintiff || 'husband';
  const clientName = plaintiff === 'wife' ? wifeName : husbandName;
  const opponentName = plaintiff === 'wife' ? husbandName : wifeName;

  const data = {
    title: 'دراسة الدعوى الشرعية',
    client: clientName,
    opponent: opponentName,
    court: '',
    date: '',
    clientRole: 'مدعي',
    subject: '',
    summary: '',
    notes: '',
    spouses: spouseInfo
  };
  document.getElementById('case-study-preview-content').innerHTML = window.generateCaseStudyPreviewHtml(data);
  document.getElementById('case-study-preview-modal').style.display = 'flex';
};

// Open case-study and show basics for a specific type (for الآن فقط شرعية)
window.openCaseStudyPreviewAndBasics = function(studyType) {
  if (!studyType) studyType = 'شرعية';

  // Only 'شرعية' is implemented with existing form fields.
  if (studyType !== 'شرعية') {
    alert('تم تنفيذ نموذج دراسة الدعوى الشرعية فقط حالياً.');
    studyType = 'شرعية';
  }

  // Ensure the case-study form container exists and scroll it into view.
  const wrapper = document.getElementById('case-study-form-wrapper');
  const entryCard = document.getElementById('case-study-entry-card');
  if (entryCard) entryCard.style.display = 'none';
  if (wrapper) {
    wrapper.style.display = 'block';
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Reset form for a fresh entry (except when editing)
  if (typeof window.resetCaseStudyForm === 'function') window.resetCaseStudyForm();
  if (document.getElementById('plaintiff-husband')) document.getElementById('plaintiff-husband').checked = true;
  if (document.getElementById('plaintiff-wife')) document.getElementById('plaintiff-wife').checked = false;

  openCaseStudyPreview();
};


window.closeCaseStudyPreviewModal = function() {
  document.getElementById('case-study-preview-modal').style.display = 'none';
};

window.downloadCaseStudyAsWord = function() {
  const content = document.getElementById('case-study-preview-content').innerHTML;
  const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>';
  const footer = '</body></html>';
  const blob = new Blob([header + content + footer], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `دراسة_الدعوى_الشرعية.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.downloadCaseStudyAsPDF = function() {
  const element = document.getElementById('case-study-preview-content');
  const opt = {
    margin: 0.5,
    filename: `دراسة_الدعوى_الشرعية.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
};

window.printCaseStudy = function() {
  const content = document.getElementById('case-study-preview-content').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<html><head><title>طباعة دراسة الدعوى الشرعية</title><meta charset="utf-8"></head><body style="direction:rtl; font-family:Tahoma; padding:20px; background:#fff; color:#000;">${content}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

window.viewSeparatedCase = function(id) {
  const c = window.allSeparatedCases.find(item => item.id === id);
  if (!c) return;
  window.currentViewingSepId = id;
  
  const content = document.getElementById('sep-case-details-content');
  content.innerHTML = `
    <div class="info-row"><span class="info-label">اسم الموكل:</span><span class="info-value">${c.client}</span></div>
    <div class="info-row"><span class="info-label">اسم الخصم:</span><span class="info-value">${c.opponent || '-'}</span></div>
    <div class="info-row"><span class="info-label">رقم القرار:</span><span class="info-value" style="color:var(--accent-gold); font-weight:bold;">${c.decisionNum}</span></div>
    <div class="info-row"><span class="info-label">رقم الأساس:</span><span class="info-value">${c.base}</span></div>
    <div class="info-row"><span class="info-label">المحكمة:</span><span class="info-value">${c.court || '-'}</span></div>
    <div class="info-row"><span class="info-label">التصنيف:</span><span class="info-value">${c.category || 'قضية عامة'}</span></div>
    <div class="info-row"><span class="info-label">تاريخ الفصل:</span><span class="info-value">${c.separationDate || '-'}</span></div>
    <div class="info-row"><span class="info-label">تاريخ الأرشفة:</span><span class="info-value">${new Date(c.timestamp).toLocaleDateString('ar-EG')}</span></div>
  `;

  document.getElementById('sep-display-subject').textContent = c.subject || 'لم يتم تسجيل وصف لموضوع الدعوى.';
  document.getElementById('sep-display-result').textContent = c.result || 'لم يتم تسجيل نتيجة القرار.';

  document.getElementById('separated-case-view-modal').style.display = 'flex';
};

window.closeSeparatedCaseModal = function() {
  document.getElementById('separated-case-view-modal').style.display = 'none';
};

window.sendSeparatedWhatsApp = function(id) {
  const c = window.allSeparatedCases.find(item => item.id === id);
  const clientInfo = window.allClients.find(cl => cl.fullname.trim() === c.client.trim());

  if (!clientInfo || (!clientInfo.whatsapp && !clientInfo.phone)) return alert("لا يتوفر رقم واتساب لهذا الموكل.");

  let phone = clientInfo.whatsapp || clientInfo.phone;
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('09')) phone = '963' + phone.substring(1);

  let msg = `*مكتب المحامي محمد النزال*\n\nالسيد/ة *${c.client}* المحترم/ة،\nنحيطكم علماً بصدور قرار في قضيتكم المنظورة أمام *${c.court}*:\n\n⚖️ *رقم القرار:* ${c.decisionNum}\n🔢 *رقم الأساس:* ${c.base}\n👤 *الخصم:* ${c.opponent}\n📝 *النتيجة:* ${c.result}\n\nللمراجعة والاستفسار يرجى التواصل مع المكتب.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.printSeparatedCase = function(id) {
  const c = window.allSeparatedCases.find(item => item.id === id);
  const printWindow = window.open('', '_blank');
  const html = `
    <div style="direction:rtl; font-family:Tahoma; padding:40px; border:2px solid #333; border-radius:15px; max-width:700px; margin:20px auto;">
      <h1 style="text-align:center; color:#c5a059;">مكتب المحامي محمد النزال</h1>
      <h2 style="text-align:center; border-bottom:1px solid #ddd; padding-bottom:10px;">إشعار صدور قرار قضائي</h2>
      <p><b>اسم الموكل:</b> ${c.client}</p>
      <p><b>الخصم:</b> ${c.opponent}</p>
      <p><b>رقم القرار:</b> ${c.decisionNum}</p>
      <p><b>رقم الأساس:</b> ${c.base}</p>
      <p><b>المحكمة:</b> ${c.court}</p>
      <p><b>النتيجة النهائية:</b> ${c.result}</p>
      <p style="margin-top:50px; text-align:left;">تحريراً في: ${new Date().toLocaleDateString('ar-EG')}</p>
    </div>`;
  printWindow.document.write(`<html><body onload="window.print(); window.close();">${html}</body></html>`);
  printWindow.document.close();
};

window.editSeparatedCase = function(id) {
  const c = window.allSeparatedCases.find(item => item.id === id);
  window.editingId = id;
  document.getElementById('sep-client').value = c.client;
  document.getElementById('sep-opponent').value = c.opponent;
  document.getElementById('sep-decision-num').value = c.decisionNum;
  document.getElementById('sep-base').value = c.base;
  document.getElementById('sep-court').value = c.court;
  document.getElementById('sep-result').value = c.result;
  document.getElementById('separated-case-form').scrollIntoView({behavior:'smooth'});
};

window.deleteSeparatedCase = async function(id) {
  if (confirm("هل تريد حذف هذا القرار من الأرشيف؟")) {
    await deleteDoc(doc(db, "separatedCases", id));
  }
};

window.resetSeparatedCaseForm = function() {
  window.editingId = null;
  document.getElementById('separated-case-form').reset();
};

window.updateGlobalFeesSummary = function() {
  const el = document.getElementById('global-total-agreed');
  if (!el) return;
  
  const totalAgreed = window.allClients.reduce((sum, c) => sum + (parseFloat(c.agreedFee) || 0), 0);
  const totalPaid = window.allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  
  document.getElementById('global-total-agreed').textContent = totalAgreed.toLocaleString() + " ل.س";
  document.getElementById('global-total-paid').textContent = totalPaid.toLocaleString() + " ل.س";
  document.getElementById('global-total-remaining').textContent = (totalAgreed - totalPaid).toLocaleString() + " ل.س";
  document.getElementById('global-payments-count').textContent = window.allPayments.length;
};

window.deletePayment = async function(id, clientName) {
  if (confirm("هل تريد حذف هذه الدفعة؟")) {
    await deleteDoc(doc(db, "payments", id));
    updateFeesTable(clientName);
    updateGlobalFeesSummary();
  }
};

// Dashboard functions
window.refreshDashboardData = function() {
  const invCases = window.allInvestigations.map(c => ({...c, typeLabel: 'تحقيق'}));
  const refCases = window.allReferrals.map(c => ({...c, typeLabel: 'إحالة'}));
  const genCases = window.allGeneralCases.map(c => ({...c, typeLabel: 'عامة'}));
  const exeCases = window.allExecutions.map(c => ({...c, typeLabel: 'تنفيذ', dept: c.type, crime: 'أساس: ' + c.base}));
  const sepCases = window.allSeparatedCases.map(c => ({
    ...c,
    typeLabel: 'مفصولة',
    dept: c.court || '',
    crime: '',
    base: c.decisionNum || '',
    year: ''
  }));

  const allCases = [...invCases, ...refCases, ...genCases, ...exeCases, ...sepCases].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const stats = document.querySelectorAll('.stat-card .number');
  if (stats.length >= 4) {
    stats[0].textContent = allCases.length;
    stats[1].textContent = allCases.filter(c => c.clientStatus === 'موقوف').length;
    const today = new Date().toISOString().split('T')[0];
    stats[2].textContent = window.allSessions.filter(s => s.date === today).length;
    stats[3].textContent = window.allClients.filter(c => !c.isArchived).length;
  }

  const tbody = document.getElementById('dashboard-updates-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchTerm = (document.getElementById('dashboard-update-search')?.value || '').toLowerCase();
  const filteredCases = allCases.filter(c =>
    normalizeArabic(c.client || '').toLowerCase().includes(searchTerm) ||
    normalizeArabic(c.clientName || '').toLowerCase().includes(searchTerm)
  );

  filteredCases.slice(0, 5).forEach(c => {
    const statusClass = (c.clientStatus === 'موقوف' || c.result === 'موقوف') ? 'status-new' : 'status-active';
    tbody.innerHTML += `
      <tr>
        <td>${c.base}/${c.year}</td>
        <td style="font-weight:600;">${c.client}</td>
        <td>${c.typeLabel} - ${c.crime || c.type || ''}</td>
        <td>${c.dept || c.court || ''}</td>
        <td><span class="status-badge ${statusClass}">${c.clientStatus || 'نشطة'}</span></td>
        <td>
          <button class="action-btn" style="background:none; border:1px solid var(--accent-blue); color:var(--accent-blue);"
            onclick="openDashboardCase('${c.typeLabel}', '${c.id}')">
            تفاصيل
          </button>
        </td>
      </tr>
    `;
  });
};

window.openDashboardCase = function(typeLabel, id) {
  if (typeLabel === 'تحقيق') return viewInvestigationCase(id);
  if (typeLabel === 'إحالة') return viewReferralCase(id);
  if (typeLabel === 'عامة') return viewGeneralCase(id);
  if (typeLabel === 'تنفيذ') return viewExecutionCase(id);
  if (typeLabel === 'مفصولة') return viewSeparatedCase(id);
  return showSection('case-management-section');
};

// Navigation and UI functions
window.showSection = function(sectionId) {
  document.querySelectorAll('.main-content section').forEach(s => s.style.display = 'none');
  if(document.getElementById(sectionId)) document.getElementById(sectionId).style.display = 'block';

  const loaders = {
    'dashboard-overview-section': refreshDashboardData,
    'daily-work-section': refreshDailyWorkData,
    'potential-clients-section': updatePotentialClientsTable,
    'clients-management-section': updateClientsTable,
    'agencies-management-section': updateAgenciesTable,
    'investigation-cases-section': updateInvestigationTable,
    'fees-management-section': () => { updateGlobalFeesSummary(); const cn = document.getElementById('fee-client-name').value; if(cn) updateFeesTable(cn); },
    'referral-cases-section': updateReferralTable,
    'case-study-section': () => { resetCaseStudyForm(); updateCaseStudiesTable(); document.getElementById('case-study-entry-card').style.display = 'flex'; document.getElementById('case-study-form-wrapper').style.display = 'none'; },
    'sessions-management-section': () => { populateAllCasesDatalist(); updateSessionsTable(); },
    'execution-management-section': updateExecutionTable,
    'separated-cases-section': updateSeparatedCasesTable,
    'messages-management-section': updateMessagesTable,
    'case-management-section': () => { resetGeneralCaseForm(); updateGeneralCasesTable(); }
  };

  if (loaders[sectionId] && typeof loaders[sectionId] === 'function') loaders[sectionId]();

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
  if (activeNav) activeNav.classList.add('active');
};

window.setupNavigation = function() {
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) showSection(target);
    });
  });
};

// Client Portal Data Loading
window.loadClientPortalData = function(client) {
  const normClient = normalizeArabic(client.fullname);
  document.getElementById('client-personal-info').innerHTML = `
    <div class="info-row"><span class="info-label">الهاتف:</span><span class="info-value">${client.phone || '-'}</span></div>
    <div class="info-row"><span class="info-label">واتساب:</span><span class="info-value">${client.whatsapp || '-'}</span></div>
    <div class="info-row"><span class="info-label">البريد الإلكتروني:</span><span class="info-value">${client.email || '-'}</span></div>
    <div class="info-row"><span class="info-label">العنوان:</span><span class="info-value">${client.address || '-'}</span></div>
  `;

  // قسم التنبيهات بصدور القرارات
  const notifyArea = document.getElementById('client-notifications-area');
  
  // وظيفة فلترة موحدة لضمان مطابقة الأسماء بشكل مرن أو عبر ID
  const filterByClient = (caseItem) => {
    // الربط عبر ID هو الأولوية لضمان دقة 100%
    if (caseItem.clientId) return caseItem.clientId === client.id;
    
    // التراجع للمطابقة عبر الاسم للسجلات القديمة
    if (!caseItem.client) return false;
    const caseClient = normalizeArabic(caseItem.client);
    return caseClient.includes(normClient) || normClient.includes(caseClient);
  };

  const myDecisions = window.allSeparatedCases.filter(filterByClient);
  
  notifyArea.innerHTML = '';
  myDecisions.forEach(dec => {
    notifyArea.innerHTML += `
      <div class="decision-alert">
        <div style="font-size: 2rem;">📜</div>
        <div style="flex:1">
          <h3 style="margin:0; color:var(--accent-gold); font-size:1.1rem;">إشعار بصدور قرار قضائي جديد</h3>
          <p style="margin:5px 0 0 0; color:#fff; line-height:1.4;">نود إبلاغكم بصدور القرار رقم <b>${dec.decisionNum}</b> في قضيتكم المنظورة أمام <b>${dec.court}</b>. النتيجة: <span style="color:var(--accent-green); font-weight:bold;">${dec.result}</span></p>
        </div>
      </div>
    `;
  });

  // جلب كافة أنواع القضايا المرتبطة بالموكل
  const invCases = window.allInvestigations.filter(filterByClient).map(c => ({...c, category: 'تحقيق'}));
  const refCases = window.allReferrals.filter(filterByClient).map(c => ({...c, category: 'إحالة'}));
  const exeCases = window.allExecutions.filter(filterByClient).map(c => ({...c, category: 'تنفيذ', dept: c.type}));
  const genCases = window.allGeneralCases.filter(filterByClient).map(c => ({...c, category: 'عامة'}));
  const sepCases = window.allSeparatedCases.filter(filterByClient).map(c => ({...c, category: 'مفصولة', base: `قرار رقم: ${c.decisionNum} / أساس: ${c.base}`, year: ''}));
  const studyCases = window.allCaseStudies.filter(filterByClient).map(c => ({...c, category: 'دراسة شرعية', base: c.date || '', year: '', dept: c.court || ''}));
  
  const allMyCases = [...invCases, ...refCases, ...exeCases, ...genCases, ...sepCases, ...studyCases];

  const caseContainer = document.getElementById('client-case-details');
  caseContainer.innerHTML = allMyCases.length ? '' : '<p style="text-align:center; color:var(--gray-silver);">لا توجد دعوى نشطة حالياً</p>';
  allMyCases.forEach(c => { 
    const basicInfo = (c.category === 'مفصولة' || !c.year) ? (c.base || '') : `${c.base}/${c.year}`;

    // تحديد اللون بناءً على نوع القضية لتمييزها بصرياً للموكل
    let catColor = 'var(--accent-gold)'; 
    if (c.category === 'تحقيق') catColor = '#ef4444'; // أحمر للتحقيق
    else if (c.category === 'تنفيذ') catColor = 'var(--accent-green)'; // أخضر للتنفيذ
    else if (c.category === 'إحالة') catColor = 'var(--accent-blue)'; // أزرق للإحالة
    else if (c.category === 'مفصولة') catColor = 'var(--gray-silver)'; // رمادي للمفصولة

    caseContainer.innerHTML += `
      <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; border-right: 4px solid ${catColor}; padding-right: 12px;">
        <h4 style="color:${catColor}; margin-bottom:5px;">📦 ${c.category} | ${basicInfo}</h4>
        <div class="info-row"><span class="info-label">المحكمة/الدائرة:</span><span class="info-value">${c.dept || c.court || ''}</span></div>
        ${c.result ? `<div class="info-row"><span class="info-label">النتيجة:</span><span class="info-value" style="color:var(--accent-green)">${c.result}</span></div>` : ''}
        ${c.lastSessionOutcome ? `<div class="info-row"><span class="info-label">ما تم في الجلسة:</span><span class="info-value">${c.lastSessionOutcome}</span></div>` : ''}
        ${c.postponementReason ? `<div class="info-row"><span class="info-label">سبب التأجيل:</span><span class="info-value">${c.postponementReason}</span></div>` : ''}
        ${c.nextSessionDate ? `<div class="info-row"><span class="info-label">الجلسة القادمة:</span><span class="info-value" style="color:var(--accent-gold)">${c.nextSessionDate}</span></div>` : ''}
      </div>`; 
  });


  // تحميل البيانات المالية للموكل
  const myPayments = window.allPayments.filter(p => p.clientId === client.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const totalPaid = myPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const agreed = client.agreedFee || 0;

  if(document.getElementById('c-total-fees')) document.getElementById('c-total-fees').textContent = agreed.toLocaleString() + " ل.س";
  if(document.getElementById('c-paid-fees')) document.getElementById('c-paid-fees').textContent = totalPaid.toLocaleString() + " ل.س";
  if(document.getElementById('c-remaining-fees')) document.getElementById('c-remaining-fees').textContent = (agreed - totalPaid).toLocaleString() + " ل.س";

  const payTbody = document.getElementById('client-payments-history');
  if(payTbody) {
    payTbody.innerHTML = '';
    myPayments.forEach(p => {
      payTbody.innerHTML += `<tr><td>${p.date}</td><td style="color:var(--accent-green)">${p.amount.toLocaleString()} ل.س</td></tr>`;
    });
  }

  const sessionTbody = document.getElementById('client-sessions-table');
  sessionTbody.innerHTML = '';
  window.allSessions.filter(s => normalizeArabic(s.caseRef).includes(normClient)).forEach(s => { sessionTbody.innerHTML += `<tr><td>${s.date}</td><td>${s.court}</td><td>${s.notes || '-'}</td></tr>`; });

  updateClientMessagesList(client.fullname, window.allMessages.filter(m => normalizeArabic(m.from) === normClient).sort((a,b) => b.timestamp - a.timestamp));
};

window.updateClientMessagesList = function(clientName, myMessages) {
  const list = document.getElementById('client-messages-list');
  if (!list) return;
  list.innerHTML = '';
  myMessages.forEach(m => { list.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; border-right:3px solid var(--accent-blue);"><div style="color:var(--gray-silver); font-size:0.75rem;">${new Date(m.timestamp).toLocaleString('ar-EG')}</div><div>${m.message}</div>${m.reply ? `<div style="color:var(--accent-gold); font-size:0.85rem; margin-top:5px;"><strong>الرد:</strong> ${m.reply}</div>`: ''}</div>`; });
};

window.sendInquiry = async function() {
  const text = document.getElementById('client-inquiry-text').value;
  if (!text.trim()) {
    alert("يرجى كتابة نص الاستفسار أولاً.");
    return;
  }

  const clientName = document.getElementById('display-client-name').textContent;

  const newMessage = {
    from: clientName,
    message: text,
    timestamp: Date.now(),
    status: 'new',
    reply: ''
  };

  await addDoc(collection(db, "messages"), newMessage);

  document.getElementById('client-inquiry-text').value = '';
  alert("تم إرسال استفسارك للمكتب بنجاح. سنرد عليك في أقرب وقت.");
};

// PDF/Excel Export functions
window.exportClientCasePDF = function() {
  const clientName = document.getElementById('display-client-name').textContent;
  const element = document.getElementById('client-dashboard-ui');

  const opt = {
    margin: 0.5,
    filename: `قضية_${clientName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  const buttons = document.querySelectorAll('.client-actions, .action-btn');
  buttons.forEach(b => b.style.visibility = 'hidden');

  html2pdf().set(opt).from(element).save().then(() => {
    buttons.forEach(b => b.style.visibility = 'visible');
  });
};

window.exportToExcel = function() {
  if (window.allClients.length === 0) {
    alert("لا توجد بيانات موكلين لتصديرها.");
    return;
  }

  const data = window.allClients.map(c => ({
    "الاسم الكامل": c.fullname,
    "محل الإقامة": c.address || '',
    "البريد الإلكتروني": c.email || 'غير محدد',
    "الهاتف": c.phone || '',
    "واتساب": c.whatsapp || '',
    "اسم المستخدم": c.username
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "قائمة الموكلين");
  XLSX.writeFile(wb, "الموكلين_مكتب_النزال.xlsx");
};

window.exportFeesToExcel = function() {
  if (window.allClients.length === 0) {
    alert("لا توجد بيانات مالية لتصديرها.");
    return;
  }

  const data = window.allClients.map(c => {
    const payments = window.allPayments.filter(p => p.clientId === c.id);
    const paid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const agreed = parseFloat(c.agreedFee) || 0;
    return {
      "اسم الموكل": c.fullname,
      "الأتعاب المتفق عليها": agreed,
      "المبلغ المسدد": paid,
      "المبلغ المتبقي": agreed - paid,
      "عدد الدفعات": payments.length
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير الأتعاب");
  XLSX.writeFile(wb, "التقرير_المالي_مكتب_النزال.xlsx");
};

window.exportToPDF = function() {
  if (window.allClients.length === 0) {
    alert("لا توجد بيانات موكلين لتصديرها.");
    return;
  }
  const table = document.getElementById('clients-table-body').closest('table');
  const clone = table.cloneNode(true);

  clone.querySelectorAll('tr').forEach(tr => {
    if (tr.lastElementChild) tr.lastElementChild.remove();
    Array.from(tr.cells).forEach(cell => cell.style.color = 'black');
  });

  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.direction = 'rtl';
  container.style.background = 'white';
  container.innerHTML = `<h2 style="text-align:center; color:#2b91da; font-family:sans-serif; margin-bottom:20px;">قائمة الموكلين - مكتب المحامي محمد النزال</h2>`;
  container.appendChild(clone);

  const opt = {
    margin: 0.5,
    filename: 'الموكلين_مكتب_النزال.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save();
};

window.exportExecutionsToExcel = function() {
  if (window.allExecutions.length === 0) {
    alert("لا توجد بيانات قضايا تنفيذية لتصديرها.");
    return;
  }
  const data = window.allExecutions.map(c => ({
    "الموكل": c.client,
    "صفة الموكل": c.clientRole,
    "رقم الأساس": c.base,
    "العام": c.year,
    "نوع الملف": c.type,
    "الخصم": c.opponent,
    "صفة الخصم": c.opponentRole,
    "الإجراء المتخذ": c.actionTaken,
    "الإجراء القادم": c.actionNext,
    "ملاحظات": c.notes
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "القضايا التنفيذية");
  XLSX.writeFile(wb, "القضايا_التنفيذية_مكتب_النزال.xlsx");
};

window.exportExecutionsToPDF = function() {
  if (window.allExecutions.length === 0) {
    alert("لا توجد بيانات قضايا تنفيذية لتصديرها.");
    return;
  }
  const table = document.getElementById('execution-table-body').closest('table');
  const clone = table.cloneNode(true);

  clone.querySelectorAll('tr').forEach(tr => {
    if (tr.lastElementChild) tr.lastElementChild.remove();
    Array.from(tr.cells).forEach(cell => cell.style.color = 'black');
  });

  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.direction = 'rtl';
  container.style.background = 'white';
  container.innerHTML = `<h2 style="text-align:center; color:#2b91da; font-family:sans-serif; margin-bottom:20px;">سجل القضايا التنفيذية - مكتب المحامي محمد النزال</h2>`;
  container.appendChild(clone);

  const opt = {
    margin: 0.5,
    filename: 'القضايا_التنفيذية_مكتب_النزال.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save();
};

// Image Modal functions
let currentZoom = 1;
window.openImageModal = function(imgSrc) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  modal.style.display = "flex";
  modalImg.src = imgSrc;
  resetZoom();
};

window.changeZoom = function(amount) {
  currentZoom += amount;
  if (currentZoom < 0.5) currentZoom = 0.5;
  if (currentZoom > 4) currentZoom = 4;
  document.getElementById('modal-img').style.transform = `scale(${currentZoom})`;
};

window.resetZoom = function() {
  currentZoom = 1;
  document.getElementById('modal-img').style.transform = `scale(1)`;
};

window.closeImageModal = function() {
  document.getElementById('image-modal').style.display = "none";
};

// Print Case Receipt function
window.printCaseReceipt = function(type, docId) {
  const collection = type === 'investigation' ? window.allInvestigations : window.allReferrals;
  const c = collection.find(item => item.id === docId);
  if(!c) return;

  const printWindow = window.open('', '_blank');
  const title = type === 'investigation' ? 'وصل قضية تحقيق' : 'وصل قضية إحالة';

  let detailsHtml = `
    <div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; border: 2px solid #333; border-radius: 15px; max-width: 800px; margin: 20px auto; position: relative; color: #000; background: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #d4af37;">مكتب المحامي محمد النزال</h1>
        <p style="margin: 5px 0;">للمحاماة والاستشارات القانونية</p>
        <h2 style="background: #f4f4f4; display: inline-block; padding: 10px 30px; border-radius: 8px; margin-top: 15px; color: #333; border: 1px solid #ddd;">${title}</h2>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 1.1rem; color: #000;">
        <tr><td style="padding: 12px; font-weight: bold; width: 30%; border-bottom: 1px solid #eee;">اسم الموكل:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.client} (${c.clientRole} - ${c.clientStatus})</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">اسم الخصم:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.opponent || '-'} (${c.opponentRole || '-'} - ${c.opponentStatus || '-'})</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">رقم الأساس / العام:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.base} / ${c.year}</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">الدائرة / المدينة:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.dept} / ${c.city}</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">الجرم:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.crime}</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">موضوع الجرم:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.subject}</td></tr>
  `;

  if (type === 'investigation') {
    detailsHtml += `
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">رقم الضبط / تاريخه:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.recNum} تاريخ ${c.recDate}</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">مكان الضبط:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.recPlace}</td></tr>
        <tr><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #eee;">وارد النيابة العامة:</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${c.prosNum}</td></tr>
    `;
  }

  detailsHtml += `
      </table>

      <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 0.9rem; color: #444;">تحريراً في: ${new Date().toLocaleDateString('ar-EG')}</div>
        <div style="text-align: center; min-width: 200px;">
          <p style="margin-bottom: 40px; font-weight: bold;">ختم وتوقيع المكتب</p>
          <div style="height: 100px; border: 1px dashed #ccc; background: #fafafa;"></div>
        </div>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title} - ${c.client}</title>
        <style>body { margin: 0; padding: 20px; background: #fff; }</style>
      </head>
      <body onload="window.print(); window.onafterprint = () => window.close();">
        ${detailsHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
};

// Send Tomorrow Session Reminders function
window.sendTomorrowSessionReminders = function() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  const sessions = window.allSessions;
  const allCases = [...window.allInvestigations, ...window.allReferrals, ...window.allExecutions, ...window.allGeneralCases];
  const clients = window.allClients;
  const tomorrowSessions = sessions.filter(s => s.date === tomorrowDateString);

  if (tomorrowSessions.length === 0) {
      alert("لا توجد جلسات مجدولة ليوم الغد.");
      return;
  }

  // Group sessions by client
  const clientsWithTomorrowSessions = {};
  tomorrowSessions.forEach(session => {
      const clientNameMatch = session.caseRef.match(/^(.*?)\s-\s(تحقيق|إحالة|عامة|تنفيذ):/);
      const clientName = clientNameMatch ? clientNameMatch[1].trim() : session.caseRef.trim();

      if (!clientsWithTomorrowSessions[clientName]) {
          clientsWithTomorrowSessions[clientName] = [];
      }
      clientsWithTomorrowSessions[clientName].push(session);
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const clientName in clientsWithTomorrowSessions) {
      const clientSessions = clientsWithTomorrowSessions[clientName];
      const clientInfo = clients.find(cl => cl.fullname.trim() === clientName);

      if (!clientInfo || (!clientInfo.whatsapp && !clientInfo.phone)) {
          console.warn(`Client ${clientName} has sessions tomorrow but no contact info.`);
          failedCount++;
          continue;
      }

      let phone = clientInfo.whatsapp || clientInfo.phone;
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('09')) phone = '963' + phone.substring(1);
      else if (phone.startsWith('9') && phone.length === 9) phone = '963' + phone;

      let message = `*مكتب المحامي محمد النزال*\n\n`;
      message += `السيد/ة *${clientName}* المحترم/ة،\n\n`;
      message += `نود تذكيركم بمواعيد جلساتكم القضائية ليوم الغد *${tomorrowDateString}*:\n\n`;

      clientSessions.forEach((session, idx) => {
          message += `*الجلسة رقم ${idx + 1}:*\n`;
          message += `📅 *التاريخ:* ${session.date}\n`;
          if (session.time) message += `⏰ *الوقت:* ${session.time}\n`;
          message += `🏛️ *المكان:* ${session.court}\n`;
          if (session.notes) message += `📝 *الإجراء المتوقع:* ${session.notes}\n`;

          const caseRefParts = session.caseRef.match(/أساس:\s(\d+)\/(\d{4})/);
          const caseDetails = caseRefParts ? allCases.find(c => c.client.trim() === clientName && c.base === caseRefParts[1] && c.year === caseRefParts[2]) : null;
          if (caseDetails) {
              message += `🔢 *رقم الأساس:* ${caseDetails.base} / ${caseDetails.year}\n`;
              message += `⚖️ *نوع القضية:* ${caseDetails.type || caseDetails.crime || 'غير محدد'}\n`;
          }
          message += `\n`; // Add a newline between sessions
      });

      message += `يرجى الحضور في المواعيد المحددة. لا تتردد بالتواصل معنا عند وجود أي استفسار، نقدر ثقتكم.`;

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      sentCount++;
  }

  alert(`تم فتح ${sentCount} نافذة واتساب لإرسال تذكيرات جلسات الغد. ${failedCount > 0 ? `فشل إرسال ${failedCount} تذكير بسبب عدم توفر معلومات الاتصال.` : ''}`);
};

// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Load remembered lawyer login
  if (localStorage.getItem('lawyer_remember') === 'true') {
    document.getElementById('lawyer-user').value = localStorage.getItem('lawyer_user') || '';
    document.getElementById('lawyer-pass').value = localStorage.getItem('lawyer_pass') || '';
    document.getElementById('lawyer-remember').checked = true;
  }

  // Start Firebase listeners
  setupFirebaseListeners();
  // Setup navigation event listeners
  setupNavigation();

  // Initial data load for dashboard (if already logged in or after login)
  // This will be triggered by showSection('dashboard-overview-section') after successful login
});