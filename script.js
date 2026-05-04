// استيراد المكتبات المطلوبة من Firebase Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// إعدادات Firebase الخاصة بالمشروع
const firebaseConfig = {
  apiKey: "AIzaSyDUDHGhGdM-jcNYnS9tZJuFnYJxcuv8E9o",
  authDomain: "al-rafah-system.firebaseapp.com",
  databaseURL: "https://al-rafah-system-default-rtdb.firebaseio.com",
  projectId: "al-rafah-system",
  storageBucket: "al-rafah-system.firebasestorage.app",
  messagingSenderId: "12037502402",
  appId: "1:12037502402:web:f68fc375275879942f125b",
  measurementId: "G-7TBZFQT2QS"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// كائنات التخزين المحلي والذاكرة المؤقتة لمزامنة قاعدة البيانات
let appState = {
  activeUser: null,
  config: { exUSDToTRY: 32.50, exUSDToSYP: 14850 },
  transactions: {},
  customers: {},
  customerLedgers: {},
  activityLogs: {},
  offices: {}
};

// تهيئة الحساب الافتراضي للمسؤول (Admin)
const defaultAdmin = {
  id: "admin-root",
  officeName: "الإدارة العامة",
  managerName: "المدير العام",
  username: "admin",
  password: "123",
  isAdmin: true,
  validFromMonth: 1, validFromYear: 2026,
  validToMonth: 12, validToYear: 2030
};

// دالة البدء الرئيسية لمزامنة البيانات سحابياً
function initializeSyncAndListen() {
  const rootRef = ref(db);
  
  onValue(rootRef, (snapshot) => {
    if (snapshot.exists()) {
      const serverData = snapshot.val();
      appState.config = serverData.config || { exUSDToTRY: 32.50, exUSDToSYP: 14850 };
      appState.transactions = serverData.transactions || {};
      appState.customers = serverData.customers || {};
      appState.customerLedgers = serverData.customerLedgers || {};
      appState.activityLogs = serverData.activityLogs || {};
      appState.offices = serverData.offices || {};
      
      // التأكد من وجود حساب المسؤول في قائمة المكاتب
      if (!appState.offices["admin-root"]) {
        set(ref(db, 'offices/admin-root'), defaultAdmin);
      }
    } else {
      // إعداد قاعدة البيانات لأول مرة
      set(ref(db, 'offices/admin-root'), defaultAdmin);
      set(ref(db, 'config'), appState.config);
    }
    
    // تحديث واجهات الاستخدام إذا كان المستخدم مسجلاً دخوله
    if (appState.activeUser) {
      updateUIElements();
    }
  });
}

// تشغيل المزامنة الفورية
initializeSyncAndListen();

// دوال حفظ البيانات إلى Firebase بدلاً من الذاكرة المحلية
function syncWrite(path, data) {
  return set(ref(db, path), data);
}

function logToActivity(type, description, details) {
  const logId = "log-" + Date.now();
  const logObj = {
    id: logId,
    timestamp: new Date().toLocaleString("ar-EG"),
    user: appState.activeUser ? appState.activeUser.username : "غير معروف",
    type: type,
    description: description,
    details: details
  };
  syncWrite('activityLogs/' + logId, logObj);
}

// تبديل التبويبات والصفحات
window.switchTab = function(tabName) {
  document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-brand-600', 'bg-brand-50', 'dark:text-brand-400', 'dark:bg-brand-500/10');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
  });
  
  const targetTab = document.getElementById('tab-' + tabName);
  const targetBtn = document.getElementById('btn-tab-' + tabName);
  if (targetTab) targetTab.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('active', 'text-brand-600', 'bg-brand-50', 'dark:text-brand-400', 'dark:bg-brand-500/10');
  }
};

// تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  
  let validUser = null;
  const currentYear = 2026;
  const currentMonth = 5;

  // البحث في المكاتب المخزنة سحابياً
  for (let id in appState.offices) {
    const office = appState.offices[id];
    if (office.username === u && office.password === p) {
      // التحقق من فترة الصلاحية للمكاتب الفرعية
      if (!office.isAdmin) {
        if (currentYear < office.validFromYear || (currentYear === office.validFromYear && currentMonth < office.validFromMonth)) {
          alert("فترة صلاحية حساب هذا المكتب لم تبدأ بعد!");
          return;
        }
        if (currentYear > office.validToYear || (currentYear === office.validToYear && currentMonth > office.validToMonth)) {
          alert("عذراً، انتهت صلاحية حساب هذا المكتب!");
          return;
        }
      }
      validUser = office;
      break;
    }
  }

  if (validUser) {
    appState.activeUser = validUser;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    document.getElementById('currentUserBadge').textContent = validUser.officeName;
    document.getElementById('adminSidebarLinks').classList.toggle('hidden', !validUser.isAdmin);
    document.getElementById('adminControlsResetArea').classList.toggle('hidden', !validUser.isAdmin);
    
    // تعبئة البيانات في شاشات الإعدادات
    document.getElementById('adminCurrentUsernameInput').value = validUser.username;
    document.getElementById('adminCurrentPasswordInput').value = validUser.password;
    
    document.getElementById('configExUSDToTRY').value = appState.config.exUSDToTRY;
    document.getElementById('configExUSDToSYP').value = appState.config.exUSDToSYP;

    logToActivity("تسجيل دخول", "المستخدم قام بتسجيل الدخول إلى النظام", validUser.officeName);
    updateUIElements();
    switchTab('dashboard');
  } else {
    alert("اسم المستخدم أو كلمة المرور خاطئة!");
  }
});

// تسجيل الخروج
window.logout = function() {
  logToActivity("تسجيل خروج", "المستخدم سجل خروجه", appState.activeUser ? appState.activeUser.officeName : "");
  appState.activeUser = null;
  document.getElementById('loginForm').reset();
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
};

// تحديث كافة عناصر واجهة الاستخدام بمجرد جلب البيانات الجديدة من Firebase
function updateUIElements() {
  document.getElementById('currentDateTimeDisplay').textContent = new Date().toLocaleString("ar-EG");
  
  loadDashboardData();
  loadTransactions();
  loadCustomersList();
  loadOverallReportsSummary();
  loadOffices();
  loadActivityLogs();
}

// ----------------- لوحة التحكم (Dashboard) -----------------
function loadDashboardData() {
  let netUSD = 0, netTRY = 0, netSYP = 0;
  
  // تجميع الصافي لليوم الحالي فقط
  const todayDateStr = new Date().toLocaleDateString("ar-EG");
  
  Object.values(appState.transactions).forEach(tx => {
    if (tx.createdAtDay === todayDateStr) {
      if (tx.currency === "USD") netUSD += Number(tx.netProfit);
      if (tx.currency === "TRY") netTRY += Number(tx.netProfit);
      if (tx.currency === "SYP") netSYP += Number(tx.netProfit);
    }
  });

  document.getElementById('statNetDayUSD').innerHTML = `${netUSD.toFixed(2)} <span class="text-sm font-medium opacity-70">USD</span>`;
  document.getElementById('statNetDayTRY').innerHTML = `${netTRY.toFixed(2)} <span class="text-sm font-medium opacity-70">TRY</span>`;
  document.getElementById('statNetDaySYP').innerHTML = `${netSYP.toFixed(2)} <span class="text-sm font-medium opacity-70">SYP</span>`;

  // تحويل كافة الأرباح اليومية لـ USD لتقديم مجموع عام
  const convertedTRYToUSD = netTRY / appState.config.exUSDToTRY;
  const convertedSYPToUSD = netSYP / appState.config.exUSDToSYP;
  const combinedTotalNetUSD = netUSD + convertedTRYToUSD + convertedSYPToUSD;

  document.getElementById('statNetDayAll').innerHTML = `${combinedTotalNetUSD.toFixed(2)} <span class="text-sm font-medium opacity-70">USD</span>`;

  // ملخص الأرباح لآخر 30 يوم
  const thirtyDaysTableBody = document.getElementById('statDashboardDaily30List');
  thirtyDaysTableBody.innerHTML = '';
  
  // تجميع الأرباح باليوم
  let groupedDailyNet = {};
  Object.values(appState.transactions).forEach(tx => {
    let conv = 0;
    if (tx.currency === "USD") conv = Number(tx.netProfit);
    if (tx.currency === "TRY") conv = Number(tx.netProfit) / appState.config.exUSDToTRY;
    if (tx.currency === "SYP") conv = Number(tx.netProfit) / appState.config.exUSDToSYP;
    
    groupedDailyNet[tx.createdAtDay] = (groupedDailyNet[tx.createdAtDay] || 0) + conv;
  });

  Object.entries(groupedDailyNet).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 30).forEach(([day, sum]) => {
    thirtyDaysTableBody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-all">
        <td class="p-3 font-medium">${day}</td>
        <td class="p-3 font-bold text-brand-600 dark:text-brand-400">${sum.toFixed(2)} USD</td>
      </tr>
    `;
  });

  // أعلى البائعين ربحية
  const topSellersTableBody = document.getElementById('statDashboardTopSellersList');
  topSellersTableBody.innerHTML = '';
  
  let sellerMetrics = {};
  Object.values(appState.transactions).forEach(tx => {
    let conv = 0;
    if (tx.currency === "USD") conv = Number(tx.netProfit);
    if (tx.currency === "TRY") conv = Number(tx.netProfit) / appState.config.exUSDToTRY;
    if (tx.currency === "SYP") conv = Number(tx.netProfit) / appState.config.exUSDToSYP;

    if (!sellerMetrics[tx.name]) {
      sellerMetrics[tx.name] = { count: 0, sum: 0 };
    }
    sellerMetrics[tx.name].count += 1;
    sellerMetrics[tx.name].sum += conv;
  });

  Object.entries(sellerMetrics).sort((a,b) => b[1].sum - a[1].sum).slice(0, 10).forEach(([name, data]) => {
    topSellersTableBody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-all">
        <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${name}</td>
        <td class="p-3 text-slate-500">${data.count} معاملة</td>
        <td class="p-3 font-bold text-brand-600 dark:text-brand-400">${data.sum.toFixed(2)} USD</td>
      </tr>
    `;
  });
}

// ----------------- الأرباح والمصروفات (Transactions) -----------------
window.openTransactionModal = function(txId = '') {
  document.getElementById('modalTransaction').classList.remove('hidden');
  const modalTitle = document.getElementById('txModalTitle');
  const txForm = document.getElementById('txForm');
  txForm.reset();
  
  if (txId && appState.transactions[txId]) {
    const editObj = appState.transactions[txId];
    modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-brand-500"></i> تعديل المعاملة المالية`;
    document.getElementById('txId').value = editObj.id;
    document.getElementById('txName').value = editObj.name;
    document.getElementById('txPurchaseAmount').value = editObj.purchaseAmount;
    document.getElementById('txSellAmount').value = editObj.sellAmount;
    document.getElementById('txExpenses').value = editObj.expenses;
    document.getElementById('txCurrency').value = editObj.currency;
    document.getElementById('liveProfitLabelDisplay').textContent = editObj.netProfit;
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-cash-register text-brand-500"></i> إضافة عملية جديدة`;
    document.getElementById('txId').value = '';
    document.getElementById('liveProfitLabelDisplay').textContent = "0.00";
  }
};

window.closeTransactionModal = function() {
  document.getElementById('modalTransaction').classList.add('hidden');
};

window.calculateTxProfitLive = function() {
  const p = Number(document.getElementById('txPurchaseAmount').value) || 0;
  const s = Number(document.getElementById('txSellAmount').value) || 0;
  const e = Number(document.getElementById('txExpenses').value) || 0;
  const net = s - (p + e);
  document.getElementById('liveProfitLabelDisplay').textContent = net.toFixed(2);
};

document.getElementById('txForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const txId = document.getElementById('txId').value || "tx-" + Date.now();
  const n = document.getElementById('txName').value.trim();
  const p = Number(document.getElementById('txPurchaseAmount').value) || 0;
  const s = Number(document.getElementById('txSellAmount').value) || 0;
  const exp = Number(document.getElementById('txExpenses').value) || 0;
  const cur = document.getElementById('txCurrency').value;
  const net = s - (p + exp);

  const txObj = {
    id: txId,
    name: n,
    purchaseAmount: p,
    sellAmount: s,
    expenses: exp,
    netProfit: net,
    currency: cur,
    createdBy: appState.activeUser.officeName,
    createdAtDay: new Date().toLocaleDateString("ar-EG"),
    createdAtTime: new Date().toLocaleTimeString("ar-EG")
  };

  syncWrite('transactions/' + txId, txObj).then(() => {
    logToActivity("تعديل/إضافة عملية", `تم حفظ المعاملة ${n} بالمبلغ الصافي ${net} ${cur}`, txId);
    closeTransactionModal();
  });
});

window.deleteTransaction = function(txId) {
  if (confirm("هل أنت متأكد من رغبتك في حذف هذه العملية بشكل نهائي؟")) {
    remove(ref(db, 'transactions/' + txId)).then(() => {
      logToActivity("حذف عملية", `تم حذف المعاملة من النظام تماماً`, txId);
    });
  }
};

window.loadTransactions = function() {
  const txCurrencyFilter = document.getElementById('filterTxCurrency').value;
  const tableBody = document.getElementById('transactionsList');
  tableBody.innerHTML = '';

  const txList = Object.values(appState.transactions);
  if (txList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-light select-none">📭 لا توجد أي بيانات مدخلة بعد</td></tr>`;
    return;
  }

  txList.reverse().forEach(tx => {
    if (txCurrencyFilter !== "ALL" && tx.currency !== txCurrencyFilter) return;

    tableBody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-100 dark:border-slate-800/60">
        <td class="p-4"><span class="block font-bold text-slate-700 dark:text-slate-300">${tx.createdAtDay}</span><span class="text-[10px] text-slate-400 font-light">${tx.createdAtTime}</span></td>
        <td class="p-4 font-bold text-slate-900 dark:text-white">${tx.name}</td>
        <td class="p-4 text-red-600 dark:text-red-400/80 font-medium">${Number(tx.purchaseAmount).toFixed(2)}</td>
        <td class="p-4 text-emerald-600 dark:text-emerald-400 font-bold">${Number(tx.sellAmount).toFixed(2)}</td>
        <td class="p-4 text-slate-400 font-light">${Number(tx.expenses).toFixed(2)}</td>
        <td class="p-4 font-bold ${tx.netProfit >= 0 ? 'text-brand-600' : 'text-rose-600'}">${Number(tx.netProfit).toFixed(2)}</td>
        <td class="p-4"><span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-lg text-[10px]">${tx.currency}</span></td>
        <td class="p-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openTransactionModal('${tx.id}')" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-150"><i class="fa-solid fa-pen text-xs"></i></button>
            <button onclick="deleteTransaction('${tx.id}')" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-all duration-150"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>
    `;
  });
}

// ----------------- العملاء (Customers) -----------------
window.openCustomerModal = function(id = '') {
  document.getElementById('modalCustomer').classList.remove('hidden');
  const modalTitle = document.getElementById('customerModalTitle');
  const cForm = document.getElementById('customerForm');
  cForm.reset();

  if (id && appState.customers[id]) {
    const editC = appState.customers[id];
    modalTitle.innerHTML = `<i class="fa-solid fa-user-pen text-brand-500"></i> تعديل بيانات العميل`;
    document.getElementById('customerFormId').value = editC.id;
    document.getElementById('customerFormName').value = editC.name;
    document.getElementById('customerFormWhatsapp').value = editC.whatsapp || '';
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-user-plus text-brand-500"></i> إضافة عميل جديد`;
    document.getElementById('customerFormId').value = '';
  }
};

window.closeCustomerModal = function() {
  document.getElementById('modalCustomer').classList.add('hidden');
};

document.getElementById('customerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const cId = document.getElementById('customerFormId').value || "cust-" + Date.now();
  const n = document.getElementById('customerFormName').value.trim();
  const wa = document.getElementById('customerFormWhatsapp').value.trim();

  const custObj = { id: cId, name: n, whatsapp: wa };
  
  syncWrite('customers/' + cId, custObj).then(() => {
    logToActivity("إدارة عملاء", `تم حفظ بيانات العميل ${n}`, cId);
    closeCustomerModal();
  });
});

window.deleteCustomer = function(cId) {
  if (confirm("سيتم حذف هذا العميل وجميع كشوفات الحسابات المرتبطة به. هل أنت متأكد؟")) {
    remove(ref(db, 'customers/' + cId)).then(() => {
      // حذف قيود هذا العميل أيضاً
      const ledgerList = Object.values(appState.customerLedgers).filter(l => l.customerId === cId);
      ledgerList.forEach(l => {
        remove(ref(db, 'customerLedgers/' + l.id));
      });
      logToActivity("حذف عميل", `تم مسح العميل بالكامل`, cId);
      document.getElementById('noCustomerSelectedState').classList.remove('hidden');
    });
  }
};

function loadCustomersList() {
  const container = document.getElementById('customersListContainer');
  container.innerHTML = '';
  const custList = Object.values(appState.customers);

  if (custList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 font-light p-4 text-center select-none">👤 لا يوجد عملاء مسجلين</p>`;
    return;
  }

  custList.forEach(c => {
    container.innerHTML += `
      <div class="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-xl transition-all duration-200">
        <div onclick="selectCustomerToViewLedger('${c.id}')" class="flex-1 cursor-pointer select-none">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-0.5">${c.name}</h4>
          <span class="text-[10px] text-slate-400 font-light flex items-center gap-1">
            <i class="fa-brands fa-whatsapp text-emerald-500"></i> ${c.whatsapp ? c.whatsapp : "غير متصل"}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="openCustomerModal('${c.id}')" class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
          <button onclick="deleteCustomer('${c.id}')" class="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 text-red-600 dark:text-red-400 flex items-center justify-center transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>
      </div>
    `;
  });
}

// ----------------- كشف حسابات العميل (Customer Ledgers) -----------------
let currentSelectedCustomerId = null;

window.selectCustomerToViewLedger = function(id) {
  currentSelectedCustomerId = id;
  const cObj = appState.customers[id];
  if (!cObj) return;

  document.getElementById('noCustomerSelectedState').classList.add('hidden');
  document.getElementById('selectedCustomerNameTitle').innerHTML = `<i class="fa-solid fa-user-circle text-brand-500"></i> كشف معاملات: ${cObj.name}`;
  document.getElementById('selectedCustomerWhatsappTitle').innerHTML = cObj.whatsapp ? `<i class="fa-brands fa-whatsapp"></i> ${cObj.whatsapp}` : `<i class="fa-solid fa-link-slash"></i> بدون رقم تواصل`;

  loadCustomerLedgerTable(id);
};

function loadCustomerLedgerTable(cId) {
  const listBody = document.getElementById('customerSingleLedgerList');
  listBody.innerHTML = '';
  
  const singleLedgerItems = Object.values(appState.customerLedgers).filter(l => l.customerId === cId);
  
  let subUSD = 0, subTRY = 0, subSYP = 0;
  
  if (singleLedgerItems.length === 0) {
    listBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 select-none">📭 لا يوجد أي معاملات مسجلة بعد لهذا العميل</td></tr>`;
  } else {
    singleLedgerItems.reverse().forEach(l => {
      const isLana = l.type === "لنا";
      const amtVal = Number(l.amount);

      if (l.currency === "USD") subUSD += isLana ? amtVal : -amtVal;
      if (l.currency === "TRY") subTRY += isLana ? amtVal : -amtVal;
      if (l.currency === "SYP") subSYP += isLana ? amtVal : -amtVal;

      listBody.innerHTML += `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-100 dark:border-slate-800/60">
          <td class="p-3 font-semibold text-slate-400">${l.createdAtDay}</td>
          <td class="p-3"><span class="px-2 py-1 ${isLana ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'} font-bold rounded-lg select-none">${l.type}</span></td>
          <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${amtVal.toFixed(2)}</td>
          <td class="p-3"><span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-lg select-none">${l.currency}</span></td>
          <td class="p-3 text-center">
            <button onclick="deleteCustomerLedgerRow('${l.id}')" class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center m-auto transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
          </td>
        </tr>
      `;
    });
  }

  document.getElementById('customerSubTotalUSD').textContent = subUSD.toFixed(2) + " USD";
  document.getElementById('customerSubTotalTRY').textContent = subTRY.toFixed(2) + " TRY";
  document.getElementById('customerSubTotalSYP').textContent = subSYP.toFixed(2) + " SYP";

  document.getElementById('customerSubTotalUSD').className = `text-sm md:text-base font-bold ${subUSD >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`;
  document.getElementById('customerSubTotalTRY').className = `text-sm md:text-base font-bold ${subTRY >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`;
  document.getElementById('customerSubTotalSYP').className = `text-sm md:text-base font-bold ${subSYP >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`;
}

window.openCustomerLedgerModal = function() {
  if (!currentSelectedCustomerId) return;
  document.getElementById('modalCustomerLedger').classList.remove('hidden');
  const modalTitle = document.getElementById('customerLedgerModalTitle');
  document.getElementById('customerLedgerForm').reset();
  
  document.getElementById('customerLedgerFormId').value = '';
  document.getElementById('customerLedgerFormName').value = appState.customers[currentSelectedCustomerId].name;
};

window.closeCustomerLedgerModal = function() {
  document.getElementById('modalCustomerLedger').classList.add('hidden');
};

document.getElementById('customerLedgerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const lid = "ldg-" + Date.now();
  const cId = currentSelectedCustomerId;
  const typ = document.getElementById('customerLedgerFormType').value;
  const cur = document.getElementById('customerLedgerFormCurrency').value;
  const amt = Number(document.getElementById('customerLedgerFormAmount').value) || 0;

  const ledgerObj = {
    id: lid,
    customerId: cId,
    type: typ,
    amount: amt,
    currency: cur,
    createdAtDay: new Date().toLocaleDateString("ar-EG"),
    createdAtTime: new Date().toLocaleTimeString("ar-EG")
  };

  syncWrite('customerLedgers/' + lid, ledgerObj).then(() => {
    logToActivity("إضافة قيد ذمم", `تم تسجيل قيد ${typ} بقيمة ${amt} ${cur}`, cId);
    closeCustomerLedgerModal();
    selectCustomerToViewLedger(cId);
  });
});

window.deleteCustomerLedgerRow = function(ledgerId) {
  if (confirm("هل تريد إزالة هذا القيد نهائياً من ذمم العميل؟")) {
    remove(ref(db, 'customerLedgers/' + ledgerId)).then(() => {
      logToActivity("حذف قيد ذمم", "تم إزالة القيد المالي", ledgerId);
      if (currentSelectedCustomerId) {
        selectCustomerToViewLedger(currentSelectedCustomerId);
      }
    });
  }
};

// ----------------- التقارير المحاسبية (Reports) -----------------
function loadOverallReportsSummary() {
  const tableBody = document.getElementById('reportsOverallSummaryList');
  tableBody.innerHTML = '';

  let usdCount = 0, tryCount = 0, sypCount = 0;
  let usdPurch = 0, tryPurch = 0, sypPurch = 0;
  let usdSell = 0, trySell = 0, sypSell = 0;
  let usdExp = 0, tryExp = 0, sypExp = 0;
  let usdNet = 0, tryNet = 0, sypNet = 0;

  Object.values(appState.transactions).forEach(tx => {
    const p = Number(tx.purchaseAmount);
    const s = Number(tx.sellAmount);
    const e = Number(tx.expenses);
    const n = Number(tx.netProfit);

    if (tx.currency === "USD") {
      usdCount++; usdPurch += p; usdSell += s; usdExp += e; usdNet += n;
    }
    if (tx.currency === "TRY") {
      tryCount++; tryPurch += p; trySell += s; tryExp += e; tryNet += n;
    }
    if (tx.currency === "SYP") {
      sypCount++; sypPurch += p; sypSell += s; sypExp += e; sypNet += n;
    }
  });

  const rowTemplate = (cur, count, p, s, e, n) => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-100 dark:border-slate-800/60 font-medium">
      <td class="p-4 font-bold text-slate-900 dark:text-white">${cur}</td>
      <td class="p-4 text-slate-500">${count} معاملة</td>
      <td class="p-4 text-red-600 dark:text-red-400/80">${p.toFixed(2)}</td>
      <td class="p-4 text-emerald-600 dark:text-emerald-400">${s.toFixed(2)}</td>
      <td class="p-4 text-slate-400">${e.toFixed(2)}</td>
      <td class="p-4 font-bold text-brand-600 dark:text-brand-400">${n.toFixed(2)}</td>
    </tr>
  `;

  tableBody.innerHTML += rowTemplate("دولار أمريكي (USD)", usdCount, usdPurch, usdSell, usdExp, usdNet);
  tableBody.innerHTML += rowTemplate("ليرة تركية (TRY)", tryCount, tryPurch, trySell, tryExp, tryNet);
  tableBody.innerHTML += rowTemplate("ليرة سورية (SYP)", sypCount, sypPurch, sypSell, sypExp, sypNet);
}

window.exportReportsToExcel = function() {
  const summaryData = [
    ["العملة", "عدد العمليات", "إجمالي الشراء", "إجمالي البيع", "إجمالي المصروفات", "صافي الربح"]
  ];

  document.querySelectorAll('#reportsOverallSummaryList tr').forEach(tr => {
    let row = [];
    tr.querySelectorAll('td').forEach(td => row.push(td.innerText));
    summaryData.push(row);
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص الميزانية");

  // تصدير جميع المعاملات في شيت آخر
  const rawTxData = [["التاريخ", "البائع", "الشراء", "البيع", "المصروفات", "الصافي", "العملة"]];
  Object.values(appState.transactions).reverse().forEach(tx => {
    rawTxData.push([tx.createdAtDay, tx.name, tx.purchaseAmount, tx.sellAmount, tx.expenses, tx.netProfit, tx.currency]);
  });
  const wsTx = XLSX.utils.aoa_to_sheet(rawTxData);
  XLSX.utils.book_append_sheet(wb, wsTx, "سجل العمليات");

  XLSX.writeFile(wb, `AlRafah-Financial-Report-${new Date().toISOString().split('T')[0]}.xlsx`);
};

window.exportReportsToPDF = function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  doc.text("AL-RAFAH SYSTEM FINANCIAL SUMMARY", 10, 10);
  
  let offset = 25;
  document.querySelectorAll('#reportsOverallSummaryList tr').forEach(tr => {
    let rTxt = '';
    tr.querySelectorAll('td').forEach(td => rTxt += ' ' + td.innerText + ' |');
    doc.text(rTxt, 10, offset);
    offset += 10;
  });

  doc.save(`AlRafah-Report-${Date.now()}.pdf`);
};

// ----------------- سجل النشاطات (Activity) -----------------
function loadActivityLogs() {
  const tableBody = document.getElementById('activityLogsList');
  tableBody.innerHTML = '';
  const logsList = Object.values(appState.activityLogs);

  if (logsList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 select-none font-light">لا توجد نشاطات مسجلة بعد</td></tr>`;
    return;
  }

  logsList.reverse().slice(0, 50).forEach(log => {
    tableBody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-100 dark:border-slate-800/60 font-medium">
        <td class="p-4 text-slate-400 font-normal whitespace-nowrap">${log.timestamp}</td>
        <td class="p-4 font-bold text-slate-800 dark:text-slate-200">${log.user}</td>
        <td class="p-4"><span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-bold">${log.type}</span></td>
        <td class="p-4 text-slate-700 dark:text-slate-300 font-light">${log.description}</td>
        <td class="p-4 text-slate-400 font-light">${log.details || ""}</td>
      </tr>
    `;
  });
}

// ----------------- المكاتب (Offices) -----------------
window.openOfficeModal = function(officeId = '') {
  document.getElementById('modalOffice').classList.remove('hidden');
  const modalTitle = document.getElementById('officeModalTitle');
  const oForm = document.getElementById('officeForm');
  oForm.reset();

  if (officeId && appState.offices[officeId]) {
    const editO = appState.offices[officeId];
    modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-brand-500"></i> تعديل بيانات المكتب`;
    document.getElementById('officeIdForm').value = editO.id;
    document.getElementById('officeNameForm').value = editO.officeName;
    document.getElementById('officeManagerForm').value = editO.managerName;
    document.getElementById('officeUsernameForm').value = editO.username;
    document.getElementById('officePasswordForm').value = editO.password;
    document.getElementById('officeValidFromMonth').value = editO.validFromMonth;
    document.getElementById('officeValidFromYear').value = editO.validFromYear;
    document.getElementById('officeValidToMonth').value = editO.validToMonth;
    document.getElementById('officeValidToYear').value = editO.validToYear;
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-plus text-brand-500"></i> إضافة مكتب جديد`;
    document.getElementById('officeIdForm').value = '';
    document.getElementById('officeValidFromMonth').value = "1";
    document.getElementById('officeValidFromYear').value = "2026";
    document.getElementById('officeValidToMonth').value = "12";
    document.getElementById('officeValidToYear').value = "2027";
  }
};

window.closeOfficeModal = function() {
  document.getElementById('modalOffice').classList.add('hidden');
};

document.getElementById('officeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const oId = document.getElementById('officeIdForm').value || "office-" + Date.now();
  const on = document.getElementById('officeNameForm').value.trim();
  const om = document.getElementById('officeManagerForm').value.trim();
  const ou = document.getElementById('officeUsernameForm').value.trim();
  const op = document.getElementById('officePasswordForm').value.trim();
  const vfm = Number(document.getElementById('officeValidFromMonth').value);
  const vfy = Number(document.getElementById('officeValidFromYear').value);
  const vtm = Number(document.getElementById('officeValidToMonth').value);
  const vty = Number(document.getElementById('officeValidToYear').value);

  const offObj = {
    id: oId,
    officeName: on,
    managerName: om,
    username: ou,
    password: op,
    isAdmin: false,
    validFromMonth: vfm,
    validFromYear: vfy,
    validToMonth: vtm,
    validToYear: vty
  };

  syncWrite('offices/' + oId, offObj).then(() => {
    logToActivity("إدارة المكاتب", `تم حفظ حساب المكتب ${on} من قبل المسؤول`, oId);
    closeOfficeModal();
  });
});

window.deleteOffice = function(id) {
  if (id === "admin-root") return alert("لا يمكنك إزالة الحساب الرئيسي للنظام");
  if (confirm("هل أنت متأكد من حذف حساب هذا المكتب تماماً؟")) {
    remove(ref(db, 'offices/' + id)).then(() => {
      logToActivity("حذف مكتب", `تم إزالة حساب المكتب ${id}`, id);
    });
  }
};

function loadOffices() {
  const tableBody = document.getElementById('officesList');
  tableBody.innerHTML = '';
  const offList = Object.values(appState.offices);

  if (offList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 select-none">🏢 لا توجد مكاتب مسجلة بعد</td></tr>`;
    return;
  }

  offList.forEach(o => {
    const currentYear = 2026;
    const currentMonth = 5;
    
    // فحص الصلاحية وحالة المكتب
    let isValidRange = true;
    if (!o.isAdmin) {
      if (currentYear < o.validFromYear || (currentYear === o.validFromYear && currentMonth < o.validFromMonth)) {
        isValidRange = false;
      }
      if (currentYear > o.validToYear || (currentYear === o.validToYear && currentMonth > o.validToMonth)) {
        isValidRange = false;
      }
    }

    tableBody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-100 dark:border-slate-800/60 font-medium">
        <td class="p-4 font-bold text-slate-900 dark:text-white">${o.officeName}</td>
        <td class="p-4 text-slate-600 dark:text-slate-400">${o.managerName}</td>
        <td class="p-4 text-slate-500 font-mono text-xs">${o.username}</td>
        <td class="p-4">
          <span class="px-2 py-1 ${isValidRange ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'} font-bold rounded-lg text-xs select-none">
            ${isValidRange ? "نشط" : "متوقف / منتهي"}
          </span>
        </td>
        <td class="p-4 text-slate-400 font-light text-xs">${o.validFromMonth}/${o.validFromYear}</td>
        <td class="p-4 text-slate-400 font-light text-xs">${o.validToMonth}/${o.validToYear}</td>
        <td class="p-4 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="openOfficeModal('${o.id}')" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-150"><i class="fa-solid fa-pen text-xs"></i></button>
            <button onclick="deleteOffice('${o.id}')" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-all duration-150 ${o.id === 'admin-root' ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>
    `;
  });
}

// ----------------- الإعدادات العامة (Settings) -----------------
document.getElementById('updateAdminSettingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) return;
  
  const u = document.getElementById('adminCurrentUsernameInput').value.trim();
  const p = document.getElementById('adminCurrentPasswordInput').value.trim();
  
  appState.activeUser.username = u;
  appState.activeUser.password = p;

  syncWrite('offices/' + appState.activeUser.id, appState.activeUser).then(() => {
    alert("تم تعديل بيانات حساب الدخول الخاص بك بنجاح!");
    logToActivity("تعديل حساب المدير", "تغيير إعدادات الحساب وكلمة السر", appState.activeUser.username);
  });
});

window.saveExchangeRates = function() {
  const tryRate = Number(document.getElementById('configExUSDToTRY').value) || 32.50;
  const sypRate = Number(document.getElementById('configExUSDToSYP').value) || 14850;

  appState.config.exUSDToTRY = tryRate;
  appState.config.exUSDToSYP = sypRate;

  syncWrite('config', appState.config).then(() => {
    alert("تم حفظ أسعار الصرف الجديدة في السيرفر بنجاح!");
    logToActivity("تحديث أسعار الصرف", `تم تعديل الأسعار لـ: USD->TRY: ${tryRate}, USD->SYP: ${sypRate}`, "");
  });
};

window.calculateLiveConvertResult = function() {
  const amount = Number(document.getElementById('converterAmount').value) || 0;
  const fCur = document.getElementById('converterFromCurrency').value;
  const tCur = document.getElementById('converterToCurrency').value;

  // تحويل المبلغ لـ USD أولاً
  let inUSD = amount;
  if (fCur === "TRY") inUSD = amount / appState.config.exUSDToTRY;
  if (fCur === "SYP") inUSD = amount / appState.config.exUSDToSYP;

  // تحويل من USD للعملة المستهدفة
  let outVal = inUSD;
  if (tCur === "TRY") outVal = inUSD * appState.config.exUSDToTRY;
  if (tCur === "SYP") outVal = inUSD * appState.config.exUSDToSYP;

  document.getElementById('liveConvertResultsDisplay').textContent = `${outVal.toFixed(2)} ${tCur}`;
};

window.resetAllDataAndFlush = function() {
  if (confirm("هل أنت متأكد تماماً من رغبتك في مسح كافة الحسابات، المكاتب والعمليات؟ هذه الخطوة لا يمكن التراجع عنها.")) {
    const rootRef = ref(db);
    set(rootRef, {
      config: { exUSDToTRY: 32.50, exUSDToSYP: 14850 },
      offices: { "admin-root": defaultAdmin }
    }).then(() => {
      alert("تمت تهيئة قاعدة البيانات السحابية وحذف كافة السجلات بنجاح!");
      logout();
    });
  }
};

// ----------------- تصدير واستيراد البيانات (Data Utilities) -----------------
window.exportData = function() {
  const dataToExport = {
    config: appState.config,
    transactions: appState.transactions,
    customers: appState.customers,
    customerLedgers: appState.customerLedgers,
    offices: appState.offices
  };

  const str = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AlRafah-CloudBackup-${Date.now()}.json`;
  a.click();
};

window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.transactions || imported.customers || imported.offices) {
        
        if (confirm("هل تريد دمج البيانات المستوردة مع البيانات الحالية على السيرفر؟")) {
          const mergedTransactions = { ...appState.transactions, ...(imported.transactions || {}) };
          const mergedCustomers = { ...appState.customers, ...(imported.customers || {}) };
          const mergedCustomerLedgers = { ...appState.customerLedgers, ...(imported.customerLedgers || {}) };
          const mergedOffices = { ...appState.offices, ...(imported.offices || {}) };

          syncWrite('transactions', mergedTransactions);
          syncWrite('customers', mergedCustomers);
          syncWrite('customerLedgers', mergedCustomerLedgers);
          syncWrite('offices', mergedOffices).then(() => {
            alert("تم استيراد ودمج البيانات سحابياً بنجاح!");
            logToActivity("استيراد بيانات", "تم دمج بيانات خارجية مع قاعدة البيانات الحالية", "");
          });
        }
      } else {
        alert("ملف JSON غير صالح أو لا يحتوي على بيانات نظام الرفاه.");
      }
    } catch (err) {
      alert("فشل في قراءة ملف JSON المستورد.");
    }
  };
  reader.readAsText(file);
};

// ----------------- ميزة الوضع المظلم (Dark Mode) -----------------
const toggleDarkBtn = document.getElementById('toggleDarkMode');
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

toggleDarkBtn.addEventListener('click', () => {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
});