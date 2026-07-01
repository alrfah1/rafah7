(function() {
    'use strict';

    const STORAGE_KEY = 'alrefah_accounting_data';
    const SETTINGS_KEY = 'alrefah_settings';
    const THEME_KEY = 'alrefah_theme';
    const USERS_KEY = 'alrefah_users_list';
    const AUDIT_KEY = 'alrefah_audit_log';
    const RATES_KEY = 'alrefah_exchange_rates';

    function getData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        const allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [], sellCut: [] };
        if (!allData.sellCut) allData.sellCut = [];
        
        if (!currentUser) return { profits: [], clients: [], clientTransactions: [], sellCut: [] };
        if (currentUser.role === 'admin') return allData;
        
        const officeId = currentUser.officeId;
        // التأكد من وجود البيانات وتصفيتها للمكتب الحالي
        return {
            profits: (allData.profits || []).filter(p => p.officeId === officeId),
            clients: (allData.clients || []).filter(c => c.officeId === officeId),
            clientTransactions: (allData.clientTransactions || []).filter(t => t.officeId === officeId),
            sellCut: (allData.sellCut || []).filter(s => s.officeId === officeId)
        };
    }

    async function saveData(data) {
        const raw = localStorage.getItem(STORAGE_KEY);
        let allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [], sellCut: [] };
        
        if (!currentUser) return;

        if (currentUser.role === 'admin') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return;
        }
        
        const officeId = currentUser.officeId;
        // تحديث بيانات المكتب الحالي في المجموعة الكلية
        allData.profits = (allData.profits || []).filter(p => p.officeId !== officeId).concat(data.profits.map(p => ({...p, officeId})));
        allData.clients = (allData.clients || []).filter(c => c.officeId !== officeId).concat(data.clients.map(c => ({...c, officeId})));
        allData.clientTransactions = (allData.clientTransactions || []).filter(t => t.officeId !== officeId).concat(data.clientTransactions.map(t => ({...t, officeId})));
        allData.sellCut = (allData.sellCut || []).filter(s => s.officeId !== officeId).concat(data.sellCut.map(s => ({...s, officeId})));
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

        // مزامنة مع السحابة إذا كان مكتباً
        if (typeof saveCloudData === 'function' && firebaseInitialized && officeId) {
            try {
                // نرفع فقط البيانات الخاصة بهذا المكتب لضمان عدم تضخم قاعدة البيانات
                const cloudDataToSave = {
                    profits: data.profits || [],
                    clients: data.clients || [],
                    clientTransactions: data.clientTransactions || [],
                    sellCut: data.sellCut || []
                };
                await saveCloudData(officeId, cloudDataToSave);
                console.log('✅ تم مزامنة البيانات مع السحابة لهذا المكتب');
            } catch (error) {
                console.warn('⚠️ فشل المزامنة السحابية:', error.message);
            }
        }
    }

    function getSettings() {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : { user: 'alrfah', pass: 'Mirage09..' };
    }

    function getUsers() {
        const raw = localStorage.getItem(USERS_KEY);
        const defaultUsers = [{ username: 'alrfah', password: 'Mirage09..', role: 'admin', status: 'active', createdAt: new Date().toISOString() }];
        return raw ? JSON.parse(raw) : defaultUsers;
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        if (typeof saveCloudUsers === 'function' && firebaseInitialized) {
            saveCloudUsers(users).then(() => {
                console.log('✅ تم حفظ المستخدمين في Firebase بنجاح');
            }).catch(error => {
                console.warn('⚠️ فشل حفظ المستخدمين في Firebase:', error.message);
            });
        }
    }

    function getAuditLog() {
        const raw = localStorage.getItem(AUDIT_KEY);
        const allLogs = raw ? JSON.parse(raw) : [];
        if (!currentUser || currentUser.role === 'admin') return allLogs;
        return allLogs.filter(l => l.officeId === currentUser.officeId || l.user === currentUser.username);
    }

    function addAuditEntry(type, description, details = '') {
        const logs = localStorage.getItem(AUDIT_KEY) ? JSON.parse(localStorage.getItem(AUDIT_KEY)) : [];
        logs.unshift({
            timestamp: new Date().toISOString(),
            user: currentUser ? currentUser.username : 'System',
            officeId: currentUser ? currentUser.officeId : null,
            type,
            description,
            details
        });
        localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
    }

    function getExchangeRates() {
        const raw = localStorage.getItem(RATES_KEY);
        return raw ? JSON.parse(raw) : { usdToTry: 30, usdToSyp: 14500 };
    }

    function saveExchangeRatesToStorage(rates) {
        localStorage.setItem(RATES_KEY, JSON.stringify(rates));
        addAuditEntry('تحديث', 'تحديث أسعار الصرف', `USD/TRY: ${rates.usdToTry}, USD/SYP: ${rates.usdToSyp}`);
    }

    let currentPage = 'dashboard';
    let selectedClientId = null;
    let profitChart = null;
    let currentUser = null;

    function showToast(msg, icon = '✅') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `${icon} ${msg}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    window.toggleTheme = function() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        document.getElementById('themeIcon').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        if (profitChart) updateChart();
    };

    function applyTheme() {
        if (localStorage.getItem(THEME_KEY) === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeIcon').className = 'fas fa-sun';
        }
    }

    window.toggleSidebar = function() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarBackdrop').classList.toggle('show');
    };

    window.closeSidebar = function() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarBackdrop').classList.remove('show');
    };

    window.navigateTo = function(page) {
        currentPage = page;
        selectedClientId = null;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        const targetNavLink = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
        if (targetNavLink) targetNavLink.classList.add('active');
        
        document.getElementById('pageTitle').textContent = {
            dashboard: 'لوحة التحكم',
            profits: 'الأرباح والمصروفات',
            clients: 'العملاء',
            reports: 'التقارير المحاسبية',
            analytics: 'التحليلات المتقدمة',
            backups: 'النسخ الاحتياطية',
            security: 'الأمان وكلمة المرور',
            settings: 'الإعدادات',
            tools: 'أدوات متقدمة',
            audit: 'سجل النشاطات',
            offices: 'إدارة المكاتب',
            'sell-cut': 'بيع وقص'
        }[page];
        
        document.getElementById('globalSearch').value = '';
        closeSidebar();
        document.getElementById('contentScroll').scrollTop = 0;
        refreshPage();
    };

    function refreshPage() {
        switch (currentPage) {
            case 'dashboard': 
                renderDashboard(); 
                if (typeof renderNotificationsPanel === 'function') renderNotificationsPanel();
                break;
            case 'profits': renderProfits(); break;
            case 'clients': renderClients(); break;
            case 'reports': renderReports(); break;
            case 'analytics': 
                if (typeof renderAdvancedDashboard === 'function') renderAdvancedDashboard();
                if (typeof renderSellerPerformance === 'function') renderSellerPerformance();
                if (typeof renderClientAnalytics === 'function') renderClientAnalytics();
                if (typeof renderKPIDashboard === 'function') renderKPIDashboard();
                break;
            case 'backups':
                if (typeof renderSmartBackupsPanel === 'function') renderSmartBackupsPanel();
                break;
            case 'security':
                // صفحة الأمان لا تحتاج رندر خاص حالياً
                break;
            case 'settings': renderSettings(); break;
            case 'tools': renderTools(); break;
            case 'audit': renderAudit(); break;
            case 'offices': renderOffices(); break;
            case 'sell-cut': renderSellCut(); break;
        }
    }

    window.handleGlobalSearch = function() {
        const q = document.getElementById('globalSearch').value.trim().toLowerCase();
        if (currentPage === 'clients') renderClients(q);
        if (currentPage === 'profits') renderProfits(q);
    };

    function formatNumber(num) {
        return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getClientBalance(clientId) {
        const data = getData();
        const trans = data.clientTransactions.filter(t => t.clientId === clientId);
        const bal = { USD: 0, TRY: 0, SYP: 0 };
        trans.forEach(t => { bal[t.currency] = (bal[t.currency] || 0) + (t.type === 'لنا' ? 1 : -1) * t.amount; });
        return bal;
    }

    function renderDashboard() {
        const data = getData();
        const totalRevenue = data.profits.reduce((s, p) => s + (p.sell || 0), 0);
        const totalCost = data.profits.reduce((s, p) => s + (p.buy || 0), 0);
        const totalExpenses = data.profits.reduce((s, p) => s + (p.expense || 0), 0);
        const netProfit = totalRevenue - totalCost - totalExpenses;
        
        document.getElementById('dashboardStats').innerHTML = `
            <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-info"><h4>صافي الربح الكلي</h4><div class="value">${formatNumber(netProfit)}</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h4>إجمالي الإيرادات</h4><div class="value">${formatNumber(totalRevenue)}</div></div></div>
            <div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><h4>إجمالي التكاليف</h4><div class="value">${formatNumber(totalCost + totalExpenses)}</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">👥</div><div class="stat-info"><h4>عدد العملاء</h4><div class="value">${data.clients.length}</div></div></div>
        `;
        
        const sellers = {};
        data.profits.forEach(p => {
            if (!sellers[p.seller]) sellers[p.seller] = { count: 0, profit: 0 };
            sellers[p.seller].count++;
            sellers[p.seller].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
        });
        
        const top = Object.entries(sellers).sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);
        document.getElementById('topSellersTable').innerHTML = top.length ? top.map(([n, i]) => `
            <tr><td><strong>${n}</strong></td><td>${i.count}</td><td>${formatNumber(i.profit)}</td></tr>`).join('') :
            '<tr><td colspan="3">لا توجد سجلات كافية بعد</td></tr>';
        updateChart();
    }

    function updateChart() {
        const data = getData();
        const now = new Date();
        const labels = [], values = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            labels.push(ds.slice(5));
            const dayOps = data.profits.filter(p => p.date === ds);
            values.push(dayOps.reduce((s, p) => s + (p.sell || 0) - (p.buy || 0) - (p.expense || 0), 0));
        }
        const ctx = document.getElementById('profitChart')?.getContext('2d');
        if (!ctx) return;
        if (profitChart) profitChart.destroy();
        const isDark = document.body.classList.contains('dark-mode');
        profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'صافي الربح اليومي',
                    data: values,
                    backgroundColor: values.map(v => v >= 0 ? 'rgba(200,150,62,0.7)' : 'rgba(231,76,60,0.7)'),
                    borderColor: values.map(v => v >= 0 ? '#c8963e' : '#e74c3c'),
                    borderWidth: 1,
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: isDark ? '#e8eaef' : '#1a1a2e', font: { family: 'Tajawal' } } } },
                scales: {
                    x: { ticks: { color: isDark ? '#9ca3b4' : '#5a6070' }, grid: { color: isDark ? '#2a3040' : '#e2e6ef' } },
                    y: { ticks: { color: isDark ? '#9ca3b4' : '#5a6070' }, grid: { color: isDark ? '#2a3040' : '#e2e6ef' } },
                },
            },
        });
    }

    window.openProfitModal = function(editId = null) {
        document.getElementById('profitModalOverlay').classList.add('show');
        document.getElementById('profitEditId').value = editId || '';
        document.getElementById('profitModalTitle').textContent = editId ? '✏️ تعديل العملية' : '➕ إضافة عملية';
        if (editId) {
            const p = getData().profits.find(x => x.id === editId);
            if (p) {
                document.getElementById('profitSeller').value = p.seller;
                document.getElementById('profitBuy').value = p.buy || '';
                document.getElementById('profitSell').value = p.sell || '';
                document.getElementById('profitExpense').value = p.expense || '';
                document.getElementById('profitCurrency').value = p.currency;
            }
        } else {
            document.getElementById('profitSeller').value = '';
            document.getElementById('profitBuy').value = '';
            document.getElementById('profitSell').value = '';
            document.getElementById('profitExpense').value = '';
        }
        calcProfitPreview();
    };

    window.closeProfitModal = () => document.getElementById('profitModalOverlay').classList.remove('show');

    window.calcProfitPreview = () => {
        const buy = +document.getElementById('profitBuy').value || 0;
        const sell = +document.getElementById('profitSell').value || 0;
        const expense = +document.getElementById('profitExpense').value || 0;
        const net = sell - buy - expense;
        const preview = document.getElementById('profitPreview');
        preview.textContent = `صافي الربح: ${formatNumber(net)}`;
        preview.className = 'profit-preview ' + (net >= 0 ? 'positive' : 'negative');
    };

    window.saveProfit = async function() {
        const seller = document.getElementById('profitSeller').value.trim();
        const buy = +document.getElementById('profitBuy').value || 0;
        const sell = +document.getElementById('profitSell').value || 0;
        const expense = +document.getElementById('profitExpense').value || 0;
        const currency = document.getElementById('profitCurrency').value;
        if (!seller) return Swal.fire({ title: 'الرجاء إدخال اسم البائع', icon: 'warning', confirmButtonColor: '#c8963e' });
        const data = getData();
        const editId = document.getElementById('profitEditId').value;
        if (editId) {
            const idx = data.profits.findIndex(p => p.id === editId);
            if (idx >= 0) {
                const old = { ...data.profits[idx] };
                Object.assign(data.profits[idx], { seller, buy, sell, expense, currency });
                addAuditEntry('تعديل', `تعديل عملية لـ ${seller}`, `من: ${old.sell} إلى: ${sell} ${currency}`);
            }
        } else {
            const newId = 'p' + Date.now();
            data.profits.push({ 
                id: newId, 
                seller, 
                buy, 
                sell, 
                expense, 
                currency, 
                date: new Date().toISOString().split('T')[0],
                officeId: currentUser.officeId 
            });
            addAuditEntry('إضافة', `إضافة عملية جديدة لـ ${seller}`, `المبلغ: ${sell} ${currency}`);
        }
        await saveData(data);
        closeProfitModal();
        renderProfits();
        showToast(editId ? 'تم تعديل العملية' : 'تمت إضافة العملية بنجاح');
    };

    window.deleteProfit = function(id) {
        Swal.fire({ title: 'هل ترغب بحذف هذه العملية؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(async r => {
            if (r.isConfirmed) {
                const data = getData();
                const p = data.profits.find(x => x.id === id);
                addAuditEntry('حذف', `حذف عملية لـ ${p.seller}`, `المبلغ: ${p.sell} ${p.currency}`);
                data.profits = data.profits.filter(p => p.id !== id);
                await saveData(data);
                renderProfits();
                showToast('تم حذف العملية');
            }
        });
    };

    function renderProfits(search = '') {
        const data = getData();
        const fc = document.getElementById('filterCurrency')?.value || 'all';
        const df = document.getElementById('filterDateFrom')?.value || '';
        const dt = document.getElementById('filterDateTo')?.value || '';
        let list = data.profits.filter(p => (fc === 'all' || p.currency === fc) && (!df || p.date >= df) && (!dt || p.date <= dt));
        if (search) list = list.filter(p => p.seller.toLowerCase().includes(search));
        list.sort((a, b) => b.date.localeCompare(a.date));
        const sym = { USD: '💵', TRY: '🇹🇷', SYP: '🇸🇾' };
        document.getElementById('profitsTable').innerHTML = list.length ? list.map(p => {
            const net = (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
            return `<tr>
                <td>${p.date}</td><td><strong>${p.seller}</strong></td>
                <td>${formatNumber(p.buy||0)}</td><td>${formatNumber(p.sell||0)}</td><td>${formatNumber(p.expense||0)}</td>
                <td><span class="badge ${net>=0?'badge-success':'badge-danger'}">${formatNumber(net)}</span></td>
                <td>${sym[p.currency]||p.currency}</td>
                <td>
                    <button class="btn btn-outline btn-xs" onclick="openProfitModal('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="deleteProfit('${p.id}')"><i class="fas fa-trash"></i></button>
                </td></tr>`;
        }).join('') : '';
        document.getElementById('profitsEmpty').style.display = list.length ? 'none' : 'block';
    }

    window.openClientModal = function(editId = null) {
        document.getElementById('clientModalOverlay').classList.add('show');
        document.getElementById('clientEditId').value = editId || '';
        document.getElementById('clientModalTitle').textContent = editId ? '✏️ تعديل بيانات العميل' : '➕ إضافة عميل جديد';
        if (editId) {
            const c = getData().clients.find(x => x.id === editId);
            if (c) { document.getElementById('clientName').value = c.name; document.getElementById('clientPhone').value = c.phone || ''; }
        } else { document.getElementById('clientName').value = ''; document.getElementById('clientPhone').value = ''; }
    };

    window.closeClientModal = () => document.getElementById('clientModalOverlay').classList.remove('show');

    window.saveClient = async function() {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        if (!name) return Swal.fire({ title: 'الاسم مطلوب', icon: 'warning', confirmButtonColor: '#c8963e' });
        const data = getData();
        const editId = document.getElementById('clientEditId').value;
        if (editId) {
            const c = data.clients.find(x => x.id === editId);
            if (c) { c.name = name; c.phone = phone; }
            addAuditEntry('تعديل', `تعديل بيانات العميل ${name}`);
        } else {
            data.clients.push({ 
                id: 'c' + Date.now(), 
                name, 
                phone,
                officeId: currentUser.officeId 
            });
            addAuditEntry('إضافة', `إضافة عميل جديد: ${name}`);
        }
        await saveData(data);
        closeClientModal();
        renderClients();
        showToast('تم حفظ بيانات العميل');
    };

    window.deleteClient = function(id) {
        Swal.fire({ title: 'حذف العميل؟', text: 'سيتم حذف كل المعاملات المالية المرتبطة به!', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(async r => {
            if (r.isConfirmed) {
                const data = getData();
                const c = data.clients.find(x => x.id === id);
                addAuditEntry('حذف', `حذف العميل ${c.name}`);
                data.clients = data.clients.filter(x => x.id !== id);
                data.clientTransactions = data.clientTransactions.filter(t => t.clientId !== id);
                await saveData(data);
                renderClients();
                showToast('تم حذف العميل');
            }
        });
    };

    function renderClients(search = '') {
        const data = getData();
        let list = data.clients;
        if (search) list = list.filter(c => c.name.toLowerCase().includes(search));
        document.getElementById('clientCards').innerHTML = list.map(c => {
            const b = getClientBalance(c.id);
            return `<div class="client-card ${selectedClientId === c.id ? 'selected' : ''}" onclick="selectClient('${c.id}')">
                <h4>${c.name}</h4><div class="phone">${c.phone || 'بدون هاتف'}</div>
                <div class="balance-row"><span>USD: ${formatNumber(b.USD)}</span><span>TRY: ${formatNumber(b.TRY)}</span><span>SYP: ${formatNumber(b.SYP)}</span></div>
                <div style="margin-top:10px;display:flex;gap:5px;">
                    <button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); openClientModal('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="event.stopPropagation(); deleteClient('${c.id}')"><i class="fas fa-trash"></i></button>
                </div></div>`;
        }).join('');
        document.getElementById('clientsEmpty').style.display = list.length ? 'none' : 'block';
    }

    window.selectClient = (id) => { selectedClientId = id; renderClientDetail(); };

    function renderClientDetail() {
        const c = getData().clients.find(x => x.id === selectedClientId);
        if (!c) return;
        document.getElementById('clientDetailCard').style.display = 'block';
        document.getElementById('clientDetailTitle').textContent = `📂 معاملات العميل: ${c.name}`;
        const b = getClientBalance(c.id);
        document.getElementById('clientBalanceSummary').innerHTML = `
            <div class="badge badge-info">USD: ${formatNumber(b.USD)}</div>
            <div class="badge badge-info">TRY: ${formatNumber(b.TRY)}</div>
            <div class="badge badge-info">SYP: ${formatNumber(b.SYP)}</div>`;
        const trans = getData().clientTransactions.filter(t => t.clientId === selectedClientId).sort((a, b) => b.date.localeCompare(a.date));
        document.getElementById('clientTransactionsTable').innerHTML = trans.map(t => `
            <tr><td>${t.date}</td><td><span class="badge ${t.type==='لنا'?'badge-success':'badge-danger'}">${t.type}</span></td>
            <td><strong>${formatNumber(t.amount)}</strong></td><td>${t.currency}</td>
            <td>
                <button class="btn btn-outline btn-xs" onclick="editClientTransaction('${t.id}')" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-success btn-xs" onclick="shareTransactionViaWhatsApp('${t.id}')" title="واتساب"><i class="fab fa-whatsapp"></i></button>
                <button class="btn btn-danger btn-xs" onclick="deleteClientTransaction('${t.id}')" title="حذف"><i class="fas fa-trash"></i></button>
            </td></tr>`).join('');
        renderClients();
        document.getElementById('contentScroll').scrollTo({ top: document.getElementById('clientDetailCard').offsetTop - 20, behavior: 'smooth' });
    }

    window.closeClientDetail = () => { selectedClientId = null; document.getElementById('clientDetailCard').style.display = 'none'; renderClients(); };

    window.shareTransactionViaWhatsApp = function(transId) {
        const data = getData();
        const t = data.clientTransactions.find(x => x.id === transId);
        if (!t) return;
        const c = data.clients.find(x => x.id === t.clientId);
        if (!c) return;

        const b = getClientBalance(c.id);
        
        // الحصول على اسم المكتب الحالي
        let officeName = 'مكتب الرفاه';
        if (currentUser && currentUser.role === 'office') {
            const office = getOffices().find(o => o.id === currentUser.officeId);
            if (office) officeName = office.name;
        }

        const liraBalance = b.TRY || 0;
        const dollarBalance = b.USD || 0;
        
        const liraStatus = liraBalance >= 0 ? `دائن علينا` : `دائن لكم`;
        const dollarStatus = dollarBalance >= 0 ? `دائن علينا` : `دائن لكم`;

        const text = `*${officeName}*
💵💵💵💵💵💵💵💵
*الحساب:*
*${c.name}*
*الرصيد:*
*ليرة تركي  ${formatNumber(Math.abs(liraBalance))} ${liraStatus}*
*دولار امريكي  ${formatNumber(Math.abs(dollarBalance))} ${dollarStatus}*
💵💵💵💵💵💵💵💵
💰💰💰💰💰💰💰💰
يرجى مطابقة هذه الأرصدة`;

        const url = `https://wa.me/${c.phone || ''}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    window.openClientTransactionModal = function(editId = null) {
        const clientSelect = document.getElementById('clientTransClient');
        if (!clientSelect) return;
        
        const clients = getData().clients;
        clientSelect.innerHTML = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('clientTransModalOverlay').classList.add('show');
        document.getElementById('clientTransEditId').value = editId || '';
        
        if (selectedClientId) {
            clientSelect.value = selectedClientId;
        }

        if (editId) {
            const t = getData().clientTransactions.find(x => x.id === editId);
            if (t) { 
                clientSelect.value = t.clientId;
                document.getElementById('clientTransType').value = t.type; 
                document.getElementById('clientTransCurrency').value = t.currency; 
                document.getElementById('clientTransAmount').value = t.amount; 
            }
        } else { 
            document.getElementById('clientTransAmount').value = ''; 
        }
    };

    window.closeClientTransModal = () => document.getElementById('clientTransModalOverlay').classList.remove('show');

    window.saveClientTransaction = async function() {
        const clientId = document.getElementById('clientTransClient').value;
        const type = document.getElementById('clientTransType').value;
        const currency = document.getElementById('clientTransCurrency').value;
        const amount = +document.getElementById('clientTransAmount').value;
        if (!clientId || isNaN(amount) || amount <= 0) return Swal.fire({ title: 'بيانات المبلغ غير صحيحة', icon: 'warning', confirmButtonColor: '#c8963e' });
        const data = getData();
        const client = data.clients.find(c => c.id === clientId);
        const editId = document.getElementById('clientTransEditId').value;
        if (editId) { 
            const t = data.clientTransactions.find(x => x.id === editId); 
            if (t) Object.assign(t, { clientId, type, currency, amount }); 
            addAuditEntry('تعديل', `تعديل قيد مالي للعميل ${client.name}`, `${amount} ${currency} (${type})`);
        }
        else {
            data.clientTransactions.push({ 
                id: 'ct' + Date.now(), 
                clientId, 
                type, 
                currency, 
                amount, 
                date: new Date().toISOString().split('T')[0], 
                officeId: currentUser.officeId 
            });
            addAuditEntry('إضافة', `إضافة قيد مالي للعميل ${client.name}`, `${amount} ${currency} (${type})`);
        }
        await saveData(data);
        closeClientTransModal();
        if (selectedClientId) renderClientDetail();
        renderClients();
        showToast('تم حفظ المعاملة المالية');
    };

    window.editClientTransaction = (id) => openClientTransactionModal(id);

    window.deleteClientTransaction = (id) => {
        Swal.fire({ title: 'هل أنت متأكد من حذف هذه المعاملة؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(async r => {
            if (r.isConfirmed) { 
                const data = getData(); 
                const t = data.clientTransactions.find(x => x.id === id);
                const client = data.clients.find(c => c.id === t.clientId);
                addAuditEntry('حذف', `حذف قيد مالي للعميل ${client.name}`, `${t.amount} ${t.currency}`);
                data.clientTransactions = data.clientTransactions.filter(t => t.id !== id); 
                await saveData(data); 
                if (selectedClientId) renderClientDetail(); 
                showToast('تم حذف المعاملة'); 
            }
        });
    };

    function renderReports() {
        const data = getData();
        const totalRevenue = data.profits.reduce((s, p) => s + (p.sell || 0), 0);
        const totalCost = data.profits.reduce((s, p) => s + (p.buy || 0), 0);
        const totalExpenses = data.profits.reduce((s, p) => s + (p.expense || 0), 0);
        const net = totalRevenue - totalCost - totalExpenses;
        document.getElementById('reportStats').innerHTML = `
            <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-info"><h4>صافي الربح</h4><div class="value">${formatNumber(net)}</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h4>الإيرادات</h4><div class="value">${formatNumber(totalRevenue)}</div></div></div>
            <div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><h4>إجمالي التكاليف</h4><div class="value">${formatNumber(totalCost+totalExpenses)}</div></div></div>`;
        const sum = {};
        data.profits.forEach(p => { 
            if (!sum[p.currency]) sum[p.currency] = { count: 0, buy: 0, sell: 0, expense: 0, profit: 0 };
            sum[p.currency].count++; sum[p.currency].buy += p.buy || 0; sum[p.currency].sell += p.sell || 0; sum[p.currency].expense += p.expense || 0;
            sum[p.currency].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0); 
        });
        document.getElementById('currencySummaryTable').innerHTML = Object.entries(sum).map(([cur, s]) => `
            <tr><td><strong>${cur}</strong></td><td>${s.count}</td><td>${formatNumber(s.buy)}</td><td>${formatNumber(s.sell)}</td><td>${formatNumber(s.expense)}</td><td>${formatNumber(s.profit)}</td></tr>`).join('') || '<tr><td colspan="6">لا توجد سجلات حالية</td></tr>';
    }

    window.exportToExcel = () => {
        const data = getData();
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.profits.map(p => ({ ...p, netProfit: (p.sell||0)-(p.buy||0)-(p.expense||0) }))), 'الأرباح');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.clients.map(c => { const b = getClientBalance(c.id); return { ...c, ...b }; })), 'العملاء');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.sellCut.map(s => ({ ...s, profitDisplay: formatNumber(s.profit) }))), 'بيع وقص');
        XLSX.writeFile(wb, 'تقرير_محاسبي_الرفاه.xlsx');
        showToast('تم التصدير إلى Excel');
        addAuditEntry('تصدير', 'تصدير البيانات إلى ملف Excel');
    };

    window.exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('ar-SA');
        const data = getData();
        const offices = getOffices();
        let officeName = 'مكتب الرفاه المحاسبي';
        let managerName = 'المدير العام';
        if (currentUser && currentUser.role === 'office') {
            const office = offices.find(o => o.id === currentUser.officeId);
            if (office) { officeName = office.name; managerName = office.managerName; }
        } else if (currentUser && currentUser.role === 'admin') {
            officeName = 'مكتب الرفاه الرئيسي';
            managerName = 'المدير: ' + currentUser.username;
        }
        doc.setFontSize(22); doc.setTextColor(200, 150, 62); doc.text(officeName, 148, 20, { align: 'center' });
        doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text(managerName, 148, 28, { align: 'center' });
        doc.setFontSize(10); doc.text('تاريخ التصدير: ' + dateStr + ' | ' + timeStr, 280, 35, { align: 'right' });
        doc.setDrawColor(200, 150, 62); doc.setLineWidth(0.5); doc.line(20, 38, 280, 38);
        const tableData = data.profits.map(p => [p.date, p.seller, formatNumber(p.buy||0), formatNumber(p.sell||0), formatNumber(p.expense||0), formatNumber((p.sell||0)-(p.buy||0)-(p.expense||0)), p.currency]);
        doc.autoTable({
            head: [['التاريخ', 'البائع / الجهة', 'الشراء', 'البيع', 'المصروفات', 'الصافي', 'العملة']],
            body: tableData,
            startY: 45,
            theme: 'grid',
            styles: { font: 'Amiri', fontSize: 10, halign: 'right', cellPadding: 3 },
            headStyles: { fillColor: [200, 150, 62], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
            margin: { left: 20, right: 20 }
        });
        let summaryY = doc.lastAutoTable.finalY + 15;
        if (data.sellCut && data.sellCut.length > 0) {
            if (summaryY > 160) { doc.addPage(); summaryY = 20; }
            doc.setFontSize(12); doc.setTextColor(200, 150, 62); doc.text('جدول عمليات البيع والقص', 280, summaryY, { align: 'right' });
            const sellCutTableData = data.sellCut.map(s => [s.date, s.clientName, s.currency, formatNumber(s.amount), s.buyPrice, s.sellPrice, formatNumber(s.profit)]);
            doc.autoTable({
                head: [['التاريخ', 'العميل', 'العملة', 'المبلغ', 'سعر الشراء', 'سعر البيع', 'الربح ($)']],
                body: sellCutTableData,
                startY: summaryY + 8,
                theme: 'grid',
                styles: { font: 'Amiri', fontSize: 9, halign: 'right', cellPadding: 2 },
                headStyles: { fillColor: [200, 150, 62], textColor: 255, fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
                margin: { left: 20, right: 20 }
            });
            summaryY = doc.lastAutoTable.finalY + 15;
        }
        const finalY = summaryY > 180 ? 20 : summaryY;
        if (summaryY > 180) doc.addPage();
        doc.setFontSize(14); doc.setTextColor(0, 0, 0);
        const totalRevenue = data.profits.reduce((s, p) => s + (p.sell || 0), 0);
        const totalCost = data.profits.reduce((s, p) => s + (p.buy || 0), 0);
        const totalExpenses = data.profits.reduce((s, p) => s + (p.expense || 0), 0);
        const totalSellCutProfit = data.sellCut.reduce((s, sc) => s + (sc.profit || 0), 0);
        const netProfit = totalRevenue - totalCost - totalExpenses + totalSellCutProfit;
        doc.text('ملخص التقرير المالي:', 280, finalY, { align: 'right' });
        doc.setFontSize(11); doc.text('إجمالي الإيرادات: ' + formatNumber(totalRevenue), 280, finalY + 10, { align: 'right' });
        doc.text('إجمالي التكاليف والمصروفات: ' + formatNumber(totalCost + totalExpenses), 280, finalY + 18, { align: 'right' });
        if (totalSellCutProfit !== 0) doc.text('أرباح البيع والقص: ' + formatNumber(totalSellCutProfit), 280, finalY + 26, { align: 'right' });
        doc.setFontSize(13); doc.setTextColor(200, 150, 62); doc.text('صافي الأرباح الكلي: ' + formatNumber(netProfit), 280, finalY + 34, { align: 'right' });
        doc.save('تقرير_' + officeName.replace(/ /g, '_') + '_' + now.toISOString().slice(0, 10) + '.pdf');
        showToast('تم تصدير التقرير باللغة العربية بنجاح');
        addAuditEntry('تصدير', 'تصدير تقرير PDF باللغة العربية');
    };

    window.exportBackup = () => {
        const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'backup_alrefah_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        addAuditEntry('نسخ احتياطي', 'تصدير نسخة احتياطية كاملة');
    };

    window.importBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Swal.fire({ title: 'استيراد البيانات', text: 'سيتم استبدال كل البيانات الحالية للمنظومة بالكامل!', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، استبدل', cancelButtonText: 'إلغاء', confirmButtonColor: '#c8963e' }).then(r => {
            if (r.isConfirmed) {
                const reader = new FileReader();
                reader.onload = async (ev) => { 
                    try { 
                        const d = JSON.parse(ev.target.result); 
                        if (d.profits && d.clients && d.clientTransactions) { 
                            await saveData(d); 
                            addAuditEntry('استيراد', 'استيراد نسخة احتياطية للبيانات');
                            refreshPage(); 
                            showToast('تم استيراد البيانات بنجاح'); 
                        } 
                        else throw new Error(); 
                    } catch { Swal.fire({ title: 'ملف البيانات المرفق غير صالح', icon: 'error', confirmButtonColor: '#c8963e' }); } 
                };
                reader.readAsText(file);
            }
        });
        e.target.value = '';
    };

    function renderSettings() {
        if (currentUser) {
            document.getElementById('settingsUser').value = currentUser.username;
            const adminSection = document.getElementById('adminOnlySettings');
            if (adminSection) {
                adminSection.style.display = currentUser.role === 'admin' ? 'block' : 'none';
            }
        }
    }

    window.resetAllData = () => {
        Swal.fire({ title: 'حذف جميع البيانات؟', text: 'لن تتمكن من استعادة البيانات المحذوفة نهائياً!', icon: 'error', showCancelButton: true, confirmButtonText: 'نعم، حذف الكل', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(async r => { 
            if (r.isConfirmed) { 
                await saveData({ profits: [], clients: [], clientTransactions: [] }); 
                localStorage.removeItem(AUDIT_KEY);
                addAuditEntry('تصفير', 'تصفير كافة البيانات من المنظومة');
                refreshPage();
                showToast('تم تصفير البيانات');
            }
        });
    };

    function renderTools() {
        const rates = getExchangeRates();
        document.getElementById('usdToTryRate').value = rates.usdToTry;
        document.getElementById('usdToSypRate').value = rates.usdToSyp;
        renderSmartStats();
    }

    window.saveExchangeRates = function() {
        const usdToTry = +document.getElementById('usdToTryRate').value;
        const usdToSyp = +document.getElementById('usdToSypRate').value;
        if (usdToTry <= 0 || usdToSyp <= 0) return Swal.fire({ title: 'أسعار الصرف غير صحيحة', icon: 'error' });
        saveExchangeRatesToStorage({ usdToTry, usdToSyp });
        showToast('تم حفظ أسعار الصرف بنجاح');
    };

    window.convertCurrency = function() {
        const amount = +document.getElementById('convertAmount').value;
        const from = document.getElementById('convertFrom').value;
        const to = document.getElementById('convertTo').value;
        if (!amount) return;
        const rates = getExchangeRates();
        let amountInUsd = amount;
        if (from === 'TRY') amountInUsd = amount / rates.usdToTry;
        if (from === 'SYP') amountInUsd = amount / rates.usdToSyp;
        let result = amountInUsd;
        if (to === 'TRY') result = amountInUsd * rates.usdToTry;
        if (to === 'SYP') result = amountInUsd * rates.usdToSyp;
        const resDiv = document.getElementById('conversionResult');
        resDiv.style.display = 'block';
        resDiv.innerHTML = `النتيجة: <span style="color:var(--gold);">${formatNumber(result)}</span> ${to}`;
    };

    function renderSmartStats() {
        const data = getData();
        const statsDiv = document.getElementById('smartStats');
        let totalDebtUsd = 0;
        data.clients.forEach(c => { const b = getClientBalance(c.id); totalDebtUsd += b.USD || 0; });
        statsDiv.innerHTML = `
            <div style="padding:15px;background:var(--surface-alt);border-radius:10px;border-right:4px solid var(--gold);">
                <div style="font-size:0.8rem;color:var(--text-secondary);">إجمالي الديون المستحقة (لنا)</div>
                <div style="font-size:1.2rem;font-weight:800;">$ ${formatNumber(totalDebtUsd)}</div>
            </div>
            <div style="padding:15px;background:var(--surface-alt);border-radius:10px;border-right:4px solid var(--blue);">
                <div style="font-size:0.8rem;color:var(--text-secondary);">أكثر العملاء نشاطاً</div>
                <div style="font-size:1.1rem;font-weight:700;">${data.clients.length ? data.clients[0].name : '-'}</div>
            </div>`;
    }

    function renderAudit() {
        const logs = getAuditLog();
        const tbody = document.getElementById('auditTableBody');
        document.getElementById('auditEmpty').style.display = logs.length ? 'none' : 'block';
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-size:0.75rem;color:var(--text-secondary);">${new Date(l.timestamp).toLocaleString('ar-SA')}</td>
                <td><span class="badge badge-info">${l.user}</span></td>
                <td><span class="badge ${l.type==='حذف'?'badge-danger':l.type==='إضافة'?'badge-success':'badge-gold'}">${l.type}</span></td>
                <td>${l.description}</td>
                <td style="font-size:0.8rem;">${l.details}</td>
            </tr>`).join('');
    }

    window.handleLogin = async function() {
        const userField = document.getElementById('loginUser');
        const passField = document.getElementById('loginPass');
        const user = userField.value.trim();
        const pass = passField.value.trim();
        if (!user || !pass) return Swal.fire({ title: 'خطأ', text: 'يرجى إدخال اسم المستخدم وكلمة المرور', icon: 'warning' });
        Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        let users = getUsers();
        if (firebaseInitialized && typeof getCloudUsers === 'function') {
            try { users = await getCloudUsers(); localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
            catch (error) { console.warn('⚠️ فشل تحميل المستخدمين من Firebase'); }
        }
        console.log('Attempting login for:', user);
        let found = users.find(u => u.username === user && u.password === pass);
        
        // Fallback checks (Super Admin)
        if (!found && user === 'alrfah' && pass === 'Mirage09..') found = { username: 'alrfah', password: 'Mirage09..', role: 'admin', status: 'active' };
        
        Swal.close();
        if (found) {
            console.log('User found:', found.username);
            if (found.status === 'blocked') return Swal.fire({ title: 'حساب محظور', icon: 'error' });
            currentUser = found;
            
            // محاولة تحميل بيانات المكتب من السحابة عند الدخول
            if (found.role === 'office' && firebaseInitialized && typeof getCloudData === 'function') {
                try {
                    const cloudData = await getCloudData(found.officeId);
                    if (cloudData) {
                        const raw = localStorage.getItem(STORAGE_KEY);
                        let allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [] };
                        
                        // التأكد من أن البيانات السحابية تحتوي على مصفوفات
                        const safeCloudProfits = cloudData.profits || [];
                        const safeCloudClients = cloudData.clients || [];
                        const safeCloudTransactions = cloudData.clientTransactions || [];

                        // دمج البيانات السحابية مع المحلية (استبدال بيانات المكتب الحالي بالبيانات السحابية الأحدث)
                        allData.profits = (allData.profits || []).filter(p => p.officeId !== found.officeId).concat(safeCloudProfits.map(p => ({...p, officeId: found.officeId})));
                        allData.clients = (allData.clients || []).filter(c => c.officeId !== found.officeId).concat(safeCloudClients.map(c => ({...c, officeId: found.officeId})));
                        allData.clientTransactions = (allData.clientTransactions || []).filter(t => t.officeId !== found.officeId).concat(safeCloudTransactions.map(t => ({...t, officeId: found.officeId})));
                        
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
                        console.log('✅ تم تحميل بيانات المكتب من السحابة:', cloudData);
                    } else {
                        console.log('ℹ️ لا توجد بيانات سحابية لهذا المكتب بعد');
                    }
                } catch (error) {
                    console.error('❌ خطأ في تحميل البيانات السحابية:', error);
                }
            }

            addAuditEntry('دخول', 'تسجيل دخول ناجح للنظام');
            
            // إعداد مستمع للمزامنة الحية إذا كان مكتباً
            if (found.role === 'office' && firebaseInitialized && typeof setupDataListener === 'function') {
                setupDataListener(found.officeId, (cloudData) => {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    let allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [] };
                    
                    // تحديث البيانات المحلية بالبيانات القادمة من السحابة
                    allData.profits = (allData.profits || []).filter(p => p.officeId !== found.officeId).concat((cloudData.profits || []).map(p => ({...p, officeId: found.officeId})));
                    allData.clients = (allData.clients || []).filter(c => c.officeId !== found.officeId).concat((cloudData.clients || []).map(c => ({...c, officeId: found.officeId})));
                    allData.clientTransactions = (allData.clientTransactions || []).filter(t => t.officeId !== found.officeId).concat((cloudData.clientTransactions || []).map(t => ({...t, officeId: found.officeId})));
                    
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
                    console.log('🔄 تم تحديث البيانات حياً من السحابة');
                    
                    // إعادة رندر الصفحة الحالية لتظهر التغييرات فوراً
                    refreshPage();
                });
            }

            if (found.role === 'admin' && firebaseInitialized) { try { await loadOfficesFromFirebase(); } catch (e) {} }
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('appShell').style.display = 'flex';
            const settingsBtn = document.querySelector('.sidebar-nav a[data-page="settings"]');
            const auditBtn = document.querySelector('.sidebar-nav a[data-page="audit"]');
            const officesBtn = document.querySelector('.sidebar-nav a[data-page="offices"]');
            const analyticsBtn = document.querySelector('.sidebar-nav a[data-page="analytics"]');
            const backupsBtn = document.querySelector('.sidebar-nav a[data-page="backups"]');
            const securityBtn = document.querySelector('.sidebar-nav a[data-page="security"]');
            
            // السماح للمكاتب والمدير بالوصول للصفحات الجديدة
            const hasAccess = found.role === 'admin' || found.role === 'office';
            
            if (settingsBtn) settingsBtn.style.display = hasAccess ? 'flex' : 'none';
            if (securityBtn) securityBtn.style.display = hasAccess ? 'flex' : 'none';
            if (analyticsBtn) analyticsBtn.style.display = hasAccess ? 'flex' : 'none';
            if (backupsBtn) backupsBtn.style.display = hasAccess ? 'flex' : 'none';
            
            if (auditBtn) auditBtn.style.display = found.role === 'admin' ? 'flex' : 'none';
            if (officesBtn) officesBtn.style.display = found.role === 'admin' ? 'flex' : 'none';
            if (found.role === 'office') {
                if (officesBtn) officesBtn.style.display = 'none';
                if (typeof isOfficeAccessAllowed === 'function' && !isOfficeAccessAllowed(found)) {
                    Swal.fire({ title: 'انتهت صلاحية الوصول', text: 'انتهت فترة الوصول المسموح بها لهذا المكتب', icon: 'error', confirmButtonColor: '#c8963e' }).then(() => { handleLogout(); });
                    return;
                }
            } else { if (officesBtn) officesBtn.style.display = 'flex'; }
            // تحديث عرض اسم المستخدم/المكتب
            let displayName = found.username;
            if (found.role === 'office') {
                const offices = getOffices();
                const office = offices.find(o => o.id === found.officeId);
                if (office) displayName = office.name;
            } else if (found.username === 'alrfah') {
                displayName = 'المدير العام';
            }
            document.getElementById('currentUserNameDisplay').textContent = displayName;
            
            navigateTo('dashboard');
        } else { 
            console.log('Login failed for:', user);
            Swal.fire({ 
                title: 'خطأ في الدخول', 
                text: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مرة أخرى.', 
                icon: 'error',
                footer: `المستخدم المحاول: ${user}`
            }); 
        }
    };

    window.handleLogout = function() {
        currentUser = null;
        document.getElementById('loginOverlay').classList.remove('hidden');
        document.getElementById('appShell').style.display = 'none';
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
    };

    const OFFICES_KEY = 'alrefah_offices_list';
    function getOffices() { const raw = localStorage.getItem(OFFICES_KEY); return raw ? JSON.parse(raw) : []; }
    function saveOffices(offices) {
        localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
        if (typeof saveCloudOffices === 'function' && firebaseInitialized) {
            saveCloudOffices(offices).then(() => console.log('✅ تم حفظ المكاتب في Firebase')).catch(e => console.warn('⚠️ فشل حفظ المكاتب في Firebase'));
        }
    }
    async function loadOfficesFromFirebase() {
        if (typeof getCloudOffices === 'function' && firebaseInitialized) {
            try { const offices = await getCloudOffices(); localStorage.setItem(OFFICES_KEY, JSON.stringify(offices)); return offices; }
            catch (e) { return getOffices(); }
        }
        return getOffices();
    }
    async function loadUsersFromFirebase() {
        if (typeof getCloudUsers === 'function' && firebaseInitialized) {
            try { const users = await getCloudUsers(); localStorage.setItem(USERS_KEY, JSON.stringify(users)); return users; }
            catch (e) { return getUsers(); }
        }
        return getUsers();
    }

    window.renderOffices = function() {
        const offices = getOffices();
        const tbody = document.getElementById('officesTableBody');
        if (!tbody) return;
        document.getElementById('officesEmpty').style.display = offices.length ? 'none' : 'block';
        tbody.innerHTML = offices.map(o => `
            <tr>
                <td><strong>${o.name}</strong></td><td>${o.managerName}</td><td>${o.username}</td>
                <td><span class="badge ${o.status==='active'?'badge-success':'badge-danger'}">${o.status==='active'?'نشط':'محظور'}</span></td>
                <td>${o.startYear}-${o.startMonth}</td><td>${o.endYear}-${o.endMonth}</td>
                <td>
                    <button class="btn btn-outline btn-xs" onclick="openOfficeModal('${o.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="deleteOffice('${o.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
    };

    window.openOfficeModal = function(editId = null) {
        const modalOverlay = document.getElementById('officeModalOverlay');
        if (!modalOverlay) return;
        modalOverlay.classList.add('show');
        document.getElementById('officeEditId').value = editId || '';
        document.getElementById('officeModalTitle').textContent = editId ? '✏️ تعديل بيانات المكتب' : '➕ إضافة مكتب جديد';
        if (editId) {
            const o = getOffices().find(x => x.id === editId);
            if (o) {
                document.getElementById('officeName').value = o.name;
                document.getElementById('officeManagerName').value = o.managerName;
                document.getElementById('officeUsername').value = o.username;
                document.getElementById('officePassword').value = o.password;
                document.getElementById('officeStartMonth').value = o.startMonth;
                document.getElementById('officeStartYear').value = o.startYear;
                document.getElementById('officeEndMonth').value = o.endMonth;
                document.getElementById('officeEndYear').value = o.endYear;
            }
        } else {
            document.getElementById('officeName').value = '';
            document.getElementById('officeManagerName').value = '';
            document.getElementById('officeUsername').value = '';
            document.getElementById('officePassword').value = '';
            document.getElementById('officeStartMonth').value = 1;
            document.getElementById('officeStartYear').value = 2026;
            document.getElementById('officeEndMonth').value = 12;
            document.getElementById('officeEndYear').value = 2026;
        }
    };

    window.closeOfficeModal = () => {
        const modalOverlay = document.getElementById('officeModalOverlay');
        if (modalOverlay) modalOverlay.classList.remove('show');
    };

    window.saveOffice = async function() {
        const id = document.getElementById('officeEditId').value;
        const office = {
            id: id || 'off' + Date.now(),
            name: document.getElementById('officeName').value.trim(),
            managerName: document.getElementById('officeManagerName').value.trim(),
            username: document.getElementById('officeUsername').value.trim(),
            password: document.getElementById('officePassword').value.trim(),
            startMonth: +document.getElementById('officeStartMonth').value,
            startYear: +document.getElementById('officeStartYear').value,
            endMonth: +document.getElementById('officeEndMonth').value,
            endYear: +document.getElementById('officeEndYear').value,
            status: 'active'
        };
        if (!office.name || !office.username || !office.password) return Swal.fire({ title: 'الرجاء إكمال كافة الحقول', icon: 'warning' });
        let offices = getOffices();
        if (id) { const idx = offices.findIndex(o => o.id === id); if (idx >= 0) offices[idx] = office; }
        else offices.push(office);
        saveOffices(offices);
        
        let users = getUsers();
        const userIdx = users.findIndex(u => u.username === office.username);
        const newUser = { username: office.username, password: office.password, role: 'office', officeId: office.id, status: 'active' };
        if (userIdx >= 0) users[userIdx] = newUser; else users.push(newUser);
        saveUsers(users);
        
        closeOfficeModal();
        renderOffices();
        showToast('تم حفظ بيانات المكتب والمستخدم بنجاح');
    };

    window.deleteOffice = function(id) {
        Swal.fire({ title: 'حذف المكتب؟', text: 'سيتم حذف المكتب وكل المستخدمين المرتبطين به!', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', confirmButtonColor: '#e74c3c' }).then(async r => {
            if (r.isConfirmed) {
                const office = getOffices().find(o => o.id === id);
                let offices = getOffices().filter(o => o.id !== id);
                saveOffices(offices);
                if (office) {
                    let users = getUsers().filter(u => u.username !== office.username);
                    saveUsers(users);
                }
                renderOffices();
                showToast('تم حذف المكتب');
            }
        });
    };

    window.syncAllDataToFirebase = async function() {
        if (!firebaseInitialized) return showToast('❌ Firebase غير متصل');
        try {
            await saveCloudUsers(getUsers());
            await saveCloudOffices(getOffices());
            showToast('✅ تمت مزامنة جميع البيانات بنجاح');
        } catch (e) { showToast('❌ فشلت المزامنة'); }
    };

    window.addEventListener('load', async () => {
        if (firebaseInitialized) {
            try { 
                await loadUsersFromFirebase(); 
                await loadOfficesFromFirebase(); 
            }
            catch (e) {}
        }
        applyTheme();
        
        // تحديث اسم المستخدم المعروض إذا كان مسجلاً للدخول
        if (currentUser) {
            let displayName = currentUser.username;
            if (currentUser.role === 'office') {
                const offices = getOffices();
                const office = offices.find(o => o.id === currentUser.officeId);
                if (office) displayName = office.name;
            } else if (currentUser.username === 'alrfah') {
                displayName = 'المدير العام';
            }
            const displayElem = document.getElementById('currentUserNameDisplay');
            if (displayElem) displayElem.textContent = displayName;
        }

        // تحقق من الصلاحية عند تحميل الصفحة
        if (typeof window.checkAndForceLogoutIfExpired === 'function') {
            window.checkAndForceLogoutIfExpired();
        }
    });
})();

    // ==========================================
    // --- Sell and Cut Functions (New Section) ---
    // ==========================================
    window.calculateSellCutProfit = function() {
        const amount = parseFloat(document.getElementById('sellCutAmount').value) || 0;
        const buyPrice = parseFloat(document.getElementById('sellCutBuyPrice').value) || 0;
        const sellPrice = parseFloat(document.getElementById('sellCutSellPrice').value) || 0;
        let profit = 0;
        if (amount > 0 && buyPrice > 0 && sellPrice > 0) {
            // العملية: (المبلغ / سعر البيع) - (المبلغ / سعر الشراء)
            // مثال: (4000 / 45.9) - (4000 / 46) = 87.146 - 86.956 = 0.19 دولار
            profit = (amount / sellPrice) - (amount / buyPrice);
        }
        const liveProfitElem = document.getElementById('sellCutLiveProfit');
        if (liveProfitElem) {
            liveProfitElem.innerHTML = `الربح المتوقع: <span style="color:var(--gold); font-size:1.2rem;">${formatNumber(profit)} $</span>`;
        }
        return profit;
    };

    window.openSellCutModal = function(editId = null) {
        const data = getData();
        const clientSelect = document.getElementById('sellCutClient');
        if (clientSelect) {
            clientSelect.innerHTML = data.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('') || '<option value="">لا يوجد عملاء</option>';
        }
        
        const modalOverlay = document.getElementById('sellCutModalOverlay');
        if (modalOverlay) modalOverlay.classList.add('show');
        
        const editIdInput = document.getElementById('sellCutEditId');
        if (editIdInput) editIdInput.value = editId || '';
        
        const titleElem = document.getElementById('sellCutModalTitle');
        if (titleElem) titleElem.textContent = editId ? '✏️ تعديل عملية بيع وقص' : '➕ إضافة عملية بيع وقص';
        
        if (editId) {
            const s = data.sellCut.find(x => x.id === editId);
            if (s) {
                if (document.getElementById('sellCutClient')) document.getElementById('sellCutClient').value = s.clientId;
                if (document.getElementById('sellCutCurrency')) document.getElementById('sellCutCurrency').value = s.currency;
                if (document.getElementById('sellCutAmount')) document.getElementById('sellCutAmount').value = s.amount;
                if (document.getElementById('sellCutBuyPrice')) document.getElementById('sellCutBuyPrice').value = s.buyPrice;
                if (document.getElementById('sellCutSellPrice')) document.getElementById('sellCutSellPrice').value = s.sellPrice;
                calculateSellCutProfit();
            }
        } else {
            if (document.getElementById('sellCutAmount')) document.getElementById('sellCutAmount').value = '';
            if (document.getElementById('sellCutBuyPrice')) document.getElementById('sellCutBuyPrice').value = '';
            if (document.getElementById('sellCutSellPrice')) document.getElementById('sellCutSellPrice').value = '';
            const liveProfitElem = document.getElementById('sellCutLiveProfit');
            if (liveProfitElem) liveProfitElem.textContent = 'الربح المتوقع: 0.00 $';
        }
    };

    window.closeSellCutModal = function() { 
        const modalOverlay = document.getElementById('sellCutModalOverlay');
        if (modalOverlay) modalOverlay.classList.remove('show'); 
    };

    window.quickAddClient = async function() {
        const { value: name } = await Swal.fire({
            title: 'إضافة عميل سريع', input: 'text', inputLabel: 'اسم العميل', showCancelButton: true, confirmButtonText: 'إضافة', cancelButtonText: 'إلغاء'
        });
        if (name) {
            const data = getData();
            const newClient = { id: Date.now().toString(), name, phone: '', address: '', createdAt: new Date().toISOString() };
            data.clients.push(newClient);
            await saveData(data);
            const editId = document.getElementById('sellCutEditId') ? document.getElementById('sellCutEditId').value : null;
            openSellCutModal(editId);
            showToast('تم إضافة العميل بنجاح');
        }
    };

    window.saveSellCut = async function() {
        const clientId = document.getElementById('sellCutClient').value;
        const currency = document.getElementById('sellCutCurrency').value;
        const amountInput = document.getElementById('sellCutAmount');
        const buyPriceInput = document.getElementById('sellCutBuyPrice');
        const sellPriceInput = document.getElementById('sellCutSellPrice');
        const amount = parseFloat(amountInput.value);
        const buyPrice = parseFloat(buyPriceInput.value);
        const sellPrice = parseFloat(sellPriceInput.value);
        const editId = document.getElementById('sellCutEditId').value;
        
        if (!clientId || isNaN(amount) || isNaN(buyPrice) || isNaN(sellPrice)) return Swal.fire('تنبيه', 'يرجى إكمال جميع الحقول بأرقام صحيحة', 'warning');
        
        const data = getData();
        const profit = (amount / sellPrice) - (amount / buyPrice);
        const entry = {
            id: editId || Date.now().toString(), clientId,
            clientName: data.clients.find(c => c.id === clientId)?.name || 'غير معروف',
            currency, amount, buyPrice, sellPrice, profit,
            date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString()
        };
        
        if (editId) {
            const idx = data.sellCut.findIndex(x => x.id === editId);
            if (idx !== -1) data.sellCut[idx] = { ...data.sellCut[idx], ...entry };
        } else {
            data.sellCut.unshift(entry);
        }
        
        await saveData(data);
        closeSellCutModal(); renderSellCut();
        showToast(editId ? 'تم تعديل العملية' : 'تم إضافة العملية بنجاح');
        addAuditEntry(editId ? 'تعديل' : 'إضافة', `عملية بيع وقص للعميل ${entry.clientName}`, `المبلغ: ${amount} ${currency}`);
    };

    window.deleteSellCut = async function(id) {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟', text: 'سيتم حذف هذه العملية نهائياً', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء'
        });
        if (result.isConfirmed) {
            const data = getData();
            data.sellCut = data.sellCut.filter(x => x.id !== id);
            await saveData(data); renderSellCut();
            showToast('تم حذف العملية');
        }
    };

    window.renderSellCut = function() {
        const data = getData();
        const yearFilter = document.getElementById('sellCutFilterYear');
        const monthFilterElem = document.getElementById('sellCutFilterMonth');
        const dateFilterElem = document.getElementById('sellCutFilterDate');
        
        if (!yearFilter || !monthFilterElem || !dateFilterElem) return;
        
        const monthFilter = monthFilterElem.value;
        const dateFilter = dateFilterElem.value;
        
        if (yearFilter.options.length === 0) {
            const years = [...new Set(data.sellCut.map(s => s.date.split('-')[0]))];
            if (years.length === 0) years.push(new Date().getFullYear().toString());
            yearFilter.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
            yearFilter.value = new Date().getFullYear().toString();
        }
        
        const selectedYear = yearFilter.value;
        let filtered = data.sellCut.filter(s => {
            const [y, m] = s.date.split('-');
            return y === selectedYear && (monthFilter === 'all' || parseInt(m) === parseInt(monthFilter)) && (!dateFilter || s.date === dateFilter);
        });
        
        const table = document.getElementById('sellCutTable');
        const empty = document.getElementById('sellCutEmpty');
        if (table) {
            if (filtered.length === 0) {
                table.innerHTML = ''; if (empty) empty.style.display = 'block';
            } else {
                if (empty) empty.style.display = 'none';
                table.innerHTML = filtered.map(s => `
                    <tr>
                        <td>${s.date}</td><td><strong>${s.clientName}</strong></td><td>${s.currency}</td>
                        <td>${formatNumber(s.amount)}</td><td>${s.buyPrice}</td><td>${s.sellPrice}</td>
                        <td style="color:var(--gold); font-weight:bold;">${formatNumber(s.profit)}</td>
                        <td>
                            <button class="btn btn-outline btn-xs" onclick="openSellCutModal('${s.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline btn-xs text-danger" onclick="deleteSellCut('${s.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        const summaryElem = document.getElementById('sellCutSummary');
        if (summaryElem) {
            const totalProfit = filtered.reduce((sum, s) => sum + s.profit, 0);
            const totalAmount = filtered.reduce((sum, s) => sum + s.amount, 0);
            summaryElem.innerHTML = `
                <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-info"><h4>إجمالي أرباح القص</h4><div class="value" style="color:var(--gold);">${formatNumber(totalProfit)} $</div></div></div>
                <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h4>إجمالي المبالغ</h4><div class="value">${formatNumber(totalAmount)}</div></div></div>
                <div class="stat-card"><div class="stat-icon purple">📊</div><div class="stat-info"><h4>عدد العمليات</h4><div class="value">${filtered.length}</div></div></div>
            `;
        }
    };

    window.exportSellCutPDF = function() {
        if (!window.jspdf) return Swal.fire('خطأ', 'مكتبة PDF غير محملة', 'error');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        
        if (window.amiriFont) { 
            doc.addFileToVFS('Amiri-Regular.ttf', window.amiriFont); 
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal'); 
            doc.setFont('Amiri'); 
        }
        
        const data = getData();
        const year = document.getElementById('sellCutFilterYear').value;
        const month = document.getElementById('sellCutFilterMonth').value;
        const date = document.getElementById('sellCutFilterDate').value;
        
        let filtered = data.sellCut.filter(s => {
            const [y, m] = s.date.split('-');
            return y === year && (month === 'all' || parseInt(m) === parseInt(month)) && (!date || s.date === date);
        });
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        
        doc.setFontSize(22); doc.setTextColor(200, 150, 62); doc.text('تقرير عمليات البيع والقص', 297, 40, { align: 'center' });
        doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text('مكتب الرفاه المحاسبي', 297, 55, { align: 'center' });
        doc.setFontSize(10); doc.text('تاريخ التصدير: ' + dateStr, 550, 70, { align: 'right' });
        
        const head = [['التاريخ', 'العميل', 'العملة', 'المبلغ', 'سعر الشراء', 'سعر البيع', 'الربح ($)']];
        const body = filtered.map(s => [s.date, s.clientName, s.currency, formatNumber(s.amount), s.buyPrice, s.sellPrice, formatNumber(s.profit)]);
        
        doc.autoTable({
            head: head,
            body: body,
            startY: 80,
            theme: 'grid',
            styles: { font: 'Amiri', fontSize: 10, halign: 'right', cellPadding: 5 },
            headStyles: { fillColor: [200, 150, 62], textColor: 255, fontStyle: 'bold', halign: 'center' },
            margin: { left: 40, right: 40 }
        });
        
        const totalProfit = filtered.reduce((sum, s) => sum + s.profit, 0);
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(14); doc.setTextColor(200, 150, 62);
        doc.text(`إجمالي أرباح القص: ${formatNumber(totalProfit)} $`, 550, finalY, { align: 'right' });
        
        doc.save(`تقرير_بيع_وقص_${now.toISOString().slice(0, 10)}.pdf`);
    };
