(function() {
    'use strict';

    const STORAGE_KEY = 'alrefah_accounting_data';
    const SETTINGS_KEY = 'alrefah_settings';
    const THEME_KEY = 'alrefah_theme';
    const USERS_KEY = 'alrefah_users_list';
    const AUDIT_KEY = 'alrefah_audit_log';
    const RATES_KEY = 'alrefah_exchange_rates';
    const OFFICES_KEY = 'alrefah_offices_list';

    let currentPage = 'dashboard';
    let selectedClientId = null;
    let profitChart = null;
    let currentUser = null;

    function getData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        const allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [] };
        
        // إذا كان المستخدم "مدير عام" يرى كل شيء
        if (!currentUser || currentUser.role === 'admin') return allData;
        
        // إذا كان "مكتب"، نقوم بتصفية البيانات الخاصة به فقط
        const officeId = currentUser.officeId;
        return {
            profits: allData.profits.filter(p => p.officeId === officeId),
            clients: allData.clients.filter(c => c.officeId === officeId),
            clientTransactions: allData.clientTransactions.filter(t => t.officeId === officeId)
        };
    }

    function saveData(data) {
        const raw = localStorage.getItem(STORAGE_KEY);
        let allData = raw ? JSON.parse(raw) : { profits: [], clients: [], clientTransactions: [] };
        
        if (!currentUser || currentUser.role === 'admin') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return;
        }
        
        const officeId = currentUser.officeId;
        
        // تحديث الأرباح: إزالة بيانات المكتب القديمة وإضافة الجديدة
        allData.profits = allData.profits.filter(p => p.officeId !== officeId).concat(data.profits.map(p => ({...p, officeId})));
        
        // تحديث العملاء
        allData.clients = allData.clients.filter(c => c.officeId !== officeId).concat(data.clients.map(c => ({...c, officeId})));
        
        // تحديث العمليات
        allData.clientTransactions = allData.clientTransactions.filter(t => t.officeId !== officeId).concat(data.clientTransactions.map(t => ({...t, officeId})));
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
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

    function showToast(msg, icon = '✅') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `${icon} ${msg}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        document.getElementById('themeIcon').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        if (profitChart) updateChart();
    }

    function applyTheme() {
        if (localStorage.getItem(THEME_KEY) === 'dark') {
            document.body.classList.add('dark-mode');
            const themeIcon = document.getElementById('themeIcon');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
        }
    }

    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarBackdrop').classList.toggle('show');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarBackdrop').classList.remove('show');
    }

    function navigateTo(page) {
        if (currentUser && currentUser.role === 'office') {
            if (!isOfficeAccessAllowed(currentUser)) {
                Swal.fire({
                    title: 'انتهت صلاحية الوصول',
                    text: 'انتهت فترة الوصول المسموح بها لهذا المكتب',
                    icon: 'error',
                    confirmButtonColor: '#c8963e'
                }).then(() => {
                    handleLogout();
                });
                return;
            }
        }
        currentPage = page;
        selectedClientId = null;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) targetPage.classList.add('active');
        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        const targetNavLink = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
        if (targetNavLink) targetNavLink.classList.add('active');
        
        const titleElem = document.getElementById('pageTitle');
        if (titleElem) {
            titleElem.textContent = {
                dashboard: 'لوحة التحكم',
                profits: 'الأرباح والمصروفات',
                clients: 'العملاء',
                reports: 'التقارير المحاسبية',
                settings: 'الإعدادات',
                tools: 'أدوات متقدمة',
                audit: 'سجل النشاطات',
                offices: 'إدارة المكاتب'
            }[page];
        }
        
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) globalSearch.value = '';
        closeSidebar();
        const contentScroll = document.getElementById('contentScroll');
        if (contentScroll) contentScroll.scrollTop = 0;
        refreshPage();
    }

    function refreshPage() {
        switch (currentPage) {
            case 'dashboard': renderDashboard(); break;
            case 'profits': renderProfits(); break;
            case 'clients': renderClients(); break;
            case 'reports': renderReports(); break;
            case 'settings': renderSettings(); break;
            case 'tools': renderTools(); break;
            case 'audit': renderAudit(); break;
            case 'offices': renderOffices(); break;
        }
    }

    function handleGlobalSearch() {
        const q = document.getElementById('globalSearch').value.trim().toLowerCase();
        if (currentPage === 'clients') renderClients(q);
        if (currentPage === 'profits') renderProfits(q);
    }

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
        
        const statsElem = document.getElementById('dashboardStats');
        if (statsElem) {
            statsElem.innerHTML = `
                <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-info"><h4>صافي الربح الكلي</h4><div class="value">${formatNumber(netProfit)}</div></div></div>
                <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h4>إجمالي الإيرادات</h4><div class="value">${formatNumber(totalRevenue)}</div></div></div>
                <div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><h4>إجمالي التكاليف</h4><div class="value">${formatNumber(totalCost + totalExpenses)}</div></div></div>
                <div class="stat-card"><div class="stat-icon purple">👥</div><div class="stat-info"><h4>عدد العملاء</h4><div class="value">${data.clients.length}</div></div></div>
            `;
        }
        
        const sellers = {};
        data.profits.forEach(p => {
            if (!sellers[p.seller]) sellers[p.seller] = { count: 0, profit: 0 };
            sellers[p.seller].count++;
            sellers[p.seller].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
        });
        
        const top = Object.entries(sellers).sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);
        const topSellersElem = document.getElementById('topSellersTable');
        if (topSellersElem) {
            topSellersElem.innerHTML = top.length ? top.map(([n, i]) => `
                <tr><td><strong>${n}</strong></td><td>${i.count}</td><td>${formatNumber(i.profit)}</td></tr>`).join('') :
                '<tr><td colspan="3">لا توجد سجلات كافية بعد</td></tr>';
        }
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
        if (preview) {
            preview.textContent = `صافي الربح: ${formatNumber(net)}`;
            preview.className = 'profit-preview ' + (net >= 0 ? 'positive' : 'negative');
        }
    };

    window.saveProfit = function() {
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
            data.profits.push({ id: newId, seller, buy, sell, expense, currency, date: new Date().toISOString().split('T')[0], officeId: currentUser ? currentUser.officeId : null });
            addAuditEntry('إضافة', `إضافة عملية جديدة لـ ${seller}`, `المبلغ: ${sell} ${currency}`);
        }
        saveData(data);
        closeProfitModal();
        renderProfits();
        showToast(editId ? 'تم تعديل العملية' : 'تمت إضافة العملية بنجاح');
    };

    window.deleteProfit = function(id) {
        Swal.fire({ title: 'هل ترغب بحذف هذه العملية؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(r => {
            if (r.isConfirmed) {
                const data = getData();
                const p = data.profits.find(x => x.id === id);
                addAuditEntry('حذف', `حذف عملية لـ ${p.seller}`, `المبلغ: ${p.sell} ${p.currency}`);
                data.profits = data.profits.filter(p => p.id !== id);
                saveData(data);
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
        
        const tableElem = document.getElementById('profitsTable');
        if (tableElem) {
            tableElem.innerHTML = list.length ? list.map(p => {
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
        }
        
        const emptyElem = document.getElementById('profitsEmpty');
        if (emptyElem) emptyElem.style.display = list.length ? 'none' : 'block';
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

    window.saveClient = function() {
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
            data.clients.push({ id: 'c' + Date.now(), name, phone, officeId: currentUser ? currentUser.officeId : null });
            addAuditEntry('إضافة', `إضافة عميل جديد: ${name}`);
        }
        saveData(data);
        closeClientModal();
        renderClients();
        showToast('تم حفظ بيانات العميل');
    };

    window.deleteClient = function(id) {
        Swal.fire({ title: 'هل أنت متأكد من حذف العميل؟', text: 'سيؤدي هذا إلى حذف جميع معاملاته المسجلة بشكل نهائي!', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(r => {
            if (r.isConfirmed) {
                const data = getData();
                const c = data.clients.find(x => x.id === id);
                addAuditEntry('حذف', `حذف العميل ${c.name}`);
                data.clients = data.clients.filter(c => c.id !== id);
                data.clientTransactions = data.clientTransactions.filter(t => t.clientId !== id);
                saveData(data);
                if (selectedClientId === id) { selectedClientId = null; document.getElementById('clientDetailCard').style.display = 'none'; }
                renderClients();
                showToast('تم حذف العميل');
            }
        });
    };

    window.selectClient = function(id) {
        selectedClientId = id;
        renderClients();
        const detailCard = document.getElementById('clientDetailCard');
        if (detailCard) {
            detailCard.style.display = 'block';
            renderClientDetail();
            detailCard.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.closeClientDetail = function() { 
        selectedClientId = null; 
        const detailCard = document.getElementById('clientDetailCard');
        if (detailCard) detailCard.style.display = 'none'; 
        renderClients(); 
    };

    window.openWhatsApp = function(clientId) {
        const data = getData();
        const client = data.clients.find(c => c.id === clientId);
        if (!client || !client.phone) return Swal.fire({ title: 'يرجى إدخال رقم الواتساب أولاً', icon: 'warning' });
        const bal = getClientBalance(clientId);
        const parts = [];
        if (bal.USD) parts.push(`💵 دولار أمريكي ${Math.abs(bal.USD).toFixed(2)} ${bal.USD > 0 ? 'دائن لنا' : 'دائن لكم'}`);
        if (bal.TRY) parts.push(`🇹🇷 ليرة تركية ${Math.abs(bal.TRY).toFixed(2)} ${bal.TRY > 0 ? 'دائن لنا' : 'دائن لكم'}`);
        if (bal.SYP) parts.push(`🇸🇾 ليرة سورية ${Math.abs(bal.SYP).toFixed(2)} ${bal.SYP > 0 ? 'دائن لنا' : 'دائن لكم'}`);
        const plainMsg = [
            `*مكتب الرفاه*`,
            `💵💵💵💵💵💵💵💵`,
            `*الحساب:*`,
            `*${client.name}*`,
            parts.length ? parts.join('\n') : `💵 الرصيد متوازن (0)`,
            `💵💵💵💵💵💵💵💵`,
            `💰💰💰💰💰💰💰💰`,
            `يرجى مطابقة هذه الأرصدة`
        ].join('\n');
        window.open(`https://wa.me/${client.phone.replace(/\D/g,'')}?text=${encodeURIComponent(plainMsg)}`, '_blank');
        addAuditEntry('واتساب', `إرسال كشف حساب للعميل ${client.name}`);
    };

    function renderClients(search = '') {
        const data = getData();
        let clients = data.clients;
        if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search) || (c.phone && c.phone.includes(search)));
        
        const cardsElem = document.getElementById('clientCards');
        if (cardsElem) {
            cardsElem.innerHTML = clients.length ? clients.map(c => {
                const bal = getClientBalance(c.id);
                const balStr = [bal.USD && `💵${formatNumber(bal.USD)}`, bal.TRY && `🇹🇷${formatNumber(bal.TRY)}`, bal.SYP && `🇸🇾${formatNumber(bal.SYP)}`].filter(Boolean).join(' | ') || '0.00';
                return `<div class="client-card ${selectedClientId===c.id?'selected':''}" onclick="selectClient('${c.id}')">
                    <button class="whatsapp-btn" onclick="event.stopPropagation();openWhatsApp('${c.id}')"><i class="fab fa-whatsapp"></i></button>
                    <h4>${c.name}</h4><div class="phone">📱 ${c.phone||'-'}</div>
                    <div class="balance-row"><span>الرصيد</span><span>${balStr}</span></div>
                    <div style="margin-top:10px;display:flex;gap:4px;">
                        <button class="btn btn-outline btn-xs" onclick="event.stopPropagation();openClientModal('${c.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteClient('${c.id}')"><i class="fas fa-trash"></i></button>
                    </div></div>`;
            }).join('') : '';
        }
        
        const emptyElem = document.getElementById('clientsEmpty');
        if (emptyElem) emptyElem.style.display = clients.length ? 'none' : 'block';
        if (selectedClientId && document.getElementById('clientDetailCard')?.style.display === 'block') renderClientDetail();
    }

    function renderClientDetail() {
        if (!selectedClientId) return;
        const data = getData();
        const client = data.clients.find(c => c.id === selectedClientId);
        if (!client) return closeClientDetail();
        document.getElementById('clientDetailTitle').textContent = `معاملات العميل: ${client.name}`;
        const bal = getClientBalance(selectedClientId);
        
        const summaryElem = document.getElementById('clientBalanceSummary');
        if (summaryElem) {
            summaryElem.innerHTML = ['USD', 'TRY', 'SYP'].map(cur => {
                const v = bal[cur] || 0;
                const cls = v > 0 ? 'badge-success' : v < 0 ? 'badge-danger' : 'badge-info';
                return `<span class="badge ${cls}">${cur}: ${formatNumber(Math.abs(v))} ${v>0?'لنا':v<0?'لكم':'متوازن'}</span>`;
            }).join(' ');
        }
        
        const trans = data.clientTransactions.filter(t => t.clientId === selectedClientId).sort((a, b) => b.date.localeCompare(a.date));
        const transTable = document.getElementById('clientTransactionsTable');
        if (transTable) {
            transTable.innerHTML = trans.length ? trans.map(t => `
                <tr><td>${t.date}</td><td><span class="badge ${t.type==='لنا'?'badge-success':'badge-danger'}">${t.type}</span></td><td>${formatNumber(t.amount)}</td><td>${t.currency}</td>
                <td><button class="btn btn-outline btn-xs" onclick="editClientTransaction('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-xs" onclick="deleteClientTransaction('${t.id}')"><i class="fas fa-trash"></i></button></td></tr>`).join('') : '';
        }
    }

    window.openClientTransactionModal = function(editId = null) {
        const data = getData();
        const sel = document.getElementById('clientTransClient');
        if (sel) {
            sel.innerHTML = data.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            if (editId) {
                const t = data.clientTransactions.find(x => x.id === editId);
                if (t) { sel.value = t.clientId; document.getElementById('clientTransType').value = t.type; document.getElementById('clientTransCurrency').value = t.currency; document.getElementById('clientTransAmount').value = t.amount; }
            } else { if (selectedClientId) sel.value = selectedClientId; document.getElementById('clientTransAmount').value = ''; }
        }
        document.getElementById('clientTransEditId').value = editId || '';
        document.getElementById('clientTransModalOverlay').classList.add('show');
    };

    window.closeClientTransModal = () => document.getElementById('clientTransModalOverlay').classList.remove('show');

    window.saveClientTransaction = function() {
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
            data.clientTransactions.push({ id: 'ct' + Date.now(), clientId, type, currency, amount, date: new Date().toISOString().split('T')[0], officeId: currentUser ? currentUser.officeId : null });
            addAuditEntry('إضافة', `إضافة قيد مالي للعميل ${client.name}`, `${amount} ${currency} (${type})`);
        }
        saveData(data);
        closeClientTransModal();
        if (selectedClientId) renderClientDetail();
        renderClients();
        showToast('تم حفظ المعاملة المالية');
    };

    window.editClientTransaction = (id) => openClientTransactionModal(id);

    window.deleteClientTransaction = (id) => {
        Swal.fire({ title: 'هل أنت متأكد من حذف هذه المعاملة؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(r => {
            if (r.isConfirmed) { 
                const data = getData(); 
                const t = data.clientTransactions.find(x => x.id === id);
                const client = data.clients.find(c => c.id === t.clientId);
                addAuditEntry('حذف', `حذف قيد مالي للعميل ${client.name}`, `${t.amount} ${t.currency}`);
                data.clientTransactions = data.clientTransactions.filter(t => t.id !== id); 
                saveData(data); 
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
        
        const statsElem = document.getElementById('reportStats');
        if (statsElem) {
            statsElem.innerHTML = `
                <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-info"><h4>صافي الربح</h4><div class="value">${formatNumber(net)}</div></div></div>
                <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h4>إجمالي الإيرادات</h4><div class="value">${formatNumber(totalRevenue)}</div></div></div>
                <div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><h4>إجمالي التكاليف</h4><div class="value">${formatNumber(totalCost+totalExpenses)}</div></div></div>`;
        }
        
        const sum = {};
        data.profits.forEach(p => { 
            if (!sum[p.currency]) sum[p.currency] = { count: 0, buy: 0, sell: 0, expense: 0, profit: 0 };
            sum[p.currency].count++; sum[p.currency].buy += p.buy || 0; sum[p.currency].sell += p.sell || 0; sum[p.currency].expense += p.expense || 0;
            sum[p.currency].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0); 
        });
        
        const currencyTable = document.getElementById('currencySummaryTable');
        if (currencyTable) {
            currencyTable.innerHTML = Object.entries(sum).map(([cur, s]) => `
                <tr><td><strong>${cur}</strong></td><td>${s.count}</td><td>${formatNumber(s.buy)}</td><td>${formatNumber(s.sell)}</td><td>${formatNumber(s.expense)}</td><td>${formatNumber(s.profit)}</td></tr>`).join('') || '<tr><td colspan="6">لا توجد سجلات حالية</td></tr>';
        }
    }

    window.exportToExcel = () => {
        const data = getData();
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.profits.map(p => ({ ...p, netProfit: (p.sell||0)-(p.buy||0)-(p.expense||0) }))), 'الأرباح');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.clients.map(c => { const b = getClientBalance(c.id); return { ...c, ...b }; })), 'العملاء');
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
            if (office) {
                officeName = office.name;
                managerName = office.managerName;
            }
        } else if (currentUser && currentUser.role === 'admin') {
            officeName = 'مكتب الرفاه الرئيسي';
            managerName = 'المدير: ' + currentUser.username;
        }

        doc.setFontSize(22);
        doc.setTextColor(200, 150, 62);
        doc.text(officeName, 148, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text(managerName, 148, 28, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text('تاريخ التصدير: ' + dateStr + ' | ' + timeStr, 280, 35, { align: 'right' });
        
        doc.setDrawColor(200, 150, 62);
        doc.setLineWidth(0.5);
        doc.line(20, 38, 280, 38);
        
        const tableData = data.profits.map(p => [
            p.date,
            p.seller,
            formatNumber(p.buy||0),
            formatNumber(p.sell||0),
            formatNumber(p.expense||0),
            formatNumber((p.sell||0)-(p.buy||0)-(p.expense||0)),
            p.currency
        ]);
        
        doc.autoTable({
            head: [['التاريخ', 'البائع / الجهة', 'الشراء', 'البيع', 'المصروفات', 'الصافي', 'العملة']],
            body: tableData,
            startY: 45,
            theme: 'grid',
            styles: { font: 'Amiri', fontSize: 10, halign: 'right', cellPadding: 3 },
            headStyles: { fillColor: [200, 150, 62], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' }
            },
            margin: { left: 20, right: 20 }
        });
        
        const summaryY = doc.lastAutoTable.finalY + 15;
        const finalY = summaryY > 180 ? 20 : summaryY;
        if (summaryY > 180) doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        
        const totalRevenue = data.profits.reduce((s, p) => s + (p.sell || 0), 0);
        const totalCost = data.profits.reduce((s, p) => s + (p.buy || 0), 0);
        const totalExpenses = data.profits.reduce((s, p) => s + (p.expense || 0), 0);
        const netProfit = totalRevenue - totalCost - totalExpenses;

        doc.text('ملخص التقرير المالي:', 280, finalY, { align: 'right' });
        doc.setFontSize(11);
        doc.text('إجمالي الإيرادات: ' + formatNumber(totalRevenue), 280, finalY + 10, { align: 'right' });
        doc.text('إجمالي التكاليف والمصروفات: ' + formatNumber(totalCost + totalExpenses), 280, finalY + 18, { align: 'right' });
        
        doc.setFontSize(13);
        doc.setTextColor(200, 150, 62);
        doc.text('صافي الأرباح الكلي: ' + formatNumber(netProfit), 280, finalY + 28, { align: 'right' });
        
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
                reader.onload = (ev) => { 
                    try { 
                        const d = JSON.parse(ev.target.result); 
                        if (d.profits && d.clients && d.clientTransactions) { 
                            saveData(d); 
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
        const s = getSettings();
        document.getElementById('settingsUser').value = s.user;
        document.getElementById('settingsPass').value = '********';
    }

    window.resetAllData = () => {
        Swal.fire({ title: 'حذف جميع البيانات؟', text: 'لن تتمكن من استعادة البيانات المحذوفة نهائياً!', icon: 'error', showCancelButton: true, confirmButtonText: 'نعم، حذف الكل', cancelButtonText: 'إلغاء', confirmButtonColor: '#e74c3c' }).then(r => { 
            if (r.isConfirmed) { 
                saveData({ profits: [], clients: [], clientTransactions: [] }); 
                localStorage.removeItem(AUDIT_KEY);
                addAuditEntry('تصفير', 'حذف جميع بيانات النظام وتصفير الحسابات');
                selectedClientId = null; 
                refreshPage(); 
                showToast('تم تصفير جميع القيود والحسابات'); 
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
        if (resDiv) {
            resDiv.style.display = 'block';
            resDiv.innerHTML = `النتيجة: <span style="color:var(--gold);">${formatNumber(result)}</span> ${to}`;
        }
    };

    function renderSmartStats() {
        const data = getData();
        const statsDiv = document.getElementById('smartStats');
        if (!statsDiv) return;
        
        let totalDebtUsd = 0;
        data.clients.forEach(c => {
            const b = getClientBalance(c.id);
            totalDebtUsd += b.USD || 0;
        });

        statsDiv.innerHTML = `
            <div style="padding:15px;background:var(--surface-alt);border-radius:10px;border-right:4px solid var(--gold);">
                <div style="font-size:0.8rem;color:var(--text-secondary);">إجمالي الديون المستحقة (لنا)</div>
                <div style="font-size:1.2rem;font-weight:800;">$ ${formatNumber(totalDebtUsd)}</div>
            </div>
            <div style="padding:15px;background:var(--surface-alt);border-radius:10px;border-right:4px solid var(--blue);">
                <div style="font-size:0.8rem;color:var(--text-secondary);">أكثر العملاء نشاطاً</div>
                <div style="font-size:1.1rem;font-weight:700;">${data.clients.length ? data.clients[0].name : '-'}</div>
            </div>
        `;
    }

    function renderAudit() {
        const logs = getAuditLog();
        const tbody = document.getElementById('auditTableBody');
        if (!tbody) return;
        document.getElementById('auditEmpty').style.display = logs.length ? 'none' : 'block';
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-size:0.75rem;color:var(--text-secondary);">${new Date(l.timestamp).toLocaleString('ar-SA')}</td>
                <td><span class="badge badge-info">${l.user}</span></td>
                <td><span class="badge ${l.type==='حذف'?'badge-danger':l.type==='إضافة'?'badge-success':'badge-gold'}">${l.type}</span></td>
                <td>${l.description}</td>
                <td style="font-size:0.8rem;">${l.details}</td>
            </tr>
        `).join('');
    }

    // ============ نظام إدارة المستخدمين والمصادقة المحدث والمضمون ============

    window.handleLogin = function() {
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value.trim();

        if (!user || !pass) {
            Swal.fire({ title: 'يرجى ملء كافة الحقول', icon: 'warning' });
            return;
        }

        // 1. تجاوز مباشر وصارم لحساب المدير العام لضمان الدخول في كافة الحالات
        if (user === 'alrfah' && pass === 'Mirage09..') {
            currentUser = {
                username: 'alrfah',
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            };

            addAuditEntry('دخول', 'تسجيل دخول ناجح للمدير العام (تجاوز الأخطاء)');
            
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('appShell').style.display = 'flex';
            
            const settingsBtn = document.querySelector('.sidebar-nav a[data-page="settings"]');
            const auditBtn = document.querySelector('.sidebar-nav a[data-page="audit"]');
            const officesBtn = document.querySelector('.sidebar-nav a[data-page="offices"]');
            
            if (settingsBtn) settingsBtn.style.display = 'flex';
            if (auditBtn) auditBtn.style.display = 'flex';
            if (officesBtn) officesBtn.style.display = 'flex';
            
            refreshPage();
            showToast(`مرحباً بك ${currentUser.username} 👋`);
            return;
        }

        // 2. التحقق من بقية الحسابات المخزنة محلياً
        const users = getUsers();
        const found = users.find(u => u.username === user && u.password === pass);
        
        if (found) {
            if (found.status === 'blocked') {
                return Swal.fire({ title: 'حساب محظور', text: 'تم حظر هذا الحساب من قبل الإدارة', icon: 'error' });
            }
            
            currentUser = found;
            
            // التحقق من صلاحية تاريخ المكاتب الفرعية
            if (found.role === 'office') {
                if (typeof isOfficeAccessAllowed === 'function' && !isOfficeAccessAllowed(found)) {
                    Swal.fire({
                        title: 'انتهت صلاحية الوصول',
                        text: 'انتهت فترة الوصول المسموح بها لهذا المكتب أو الحساب محظور',
                        icon: 'error',
                        confirmButtonColor: '#c8963e'
                    }).then(() => {
                        currentUser = null;
                        document.getElementById('loginOverlay').classList.remove('hidden');
                        document.getElementById('appShell').style.display = 'none';
                    });
                    return;
                }
            }

            addAuditEntry('دخول', `تسجيل دخول ناجح للمستخدم: ${found.username}`);
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('appShell').style.display = 'flex';
            
            const settingsBtn = document.querySelector('.sidebar-nav a[data-page="settings"]');
            const auditBtn = document.querySelector('.sidebar-nav a[data-page="audit"]');
            const officesBtn = document.querySelector('.sidebar-nav a[data-page="offices"]');
            
            if (found.role !== 'admin') {
                if (settingsBtn) settingsBtn.style.display = 'none';
                if (auditBtn) auditBtn.style.display = 'none';
                if (officesBtn) officesBtn.style.display = 'none';
            } else {
                if (settingsBtn) settingsBtn.style.display = 'flex';
                if (auditBtn) auditBtn.style.display = 'flex';
                if (officesBtn) officesBtn.style.display = 'flex';
            }
            
            refreshPage();
            showToast(`مرحباً بك ${found.username} 👋`);
        } else {
            Swal.fire({ title: 'بيانات الدخول غير صحيحة', icon: 'error' });
        }
    };

    window.handleLogout = function() {
        Swal.fire({ title: 'تسجيل الخروج', icon: 'question', showCancelButton: true, confirmButtonText: 'خروج', cancelButtonText: 'إلغاء' }).then(r => { 
            if (r.isConfirmed) { 
                addAuditEntry('خروج', 'تسجيل خروج من النظام');
                document.getElementById('loginOverlay').classList.remove('hidden'); 
                document.getElementById('appShell').style.display = 'none'; 
                currentUser = null;
            } 
        });
    };

    window.openUsersModal = function() {
        if (currentUser?.role !== 'admin') return;
        document.getElementById('usersModalOverlay').classList.add('show');
        renderUsersList();
    };

    window.closeUsersModal = () => document.getElementById('usersModalOverlay').classList.remove('show');

    function renderUsersList() {
        const users = getUsers();
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.username}</strong> ${u.role === 'admin' ? '<span class="badge badge-info">مدير</span>' : ''}</td>
                <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status === 'active' ? 'نشط' : 'محظور'}</span></td>
                <td>${new Date(u.createdAt).toLocaleDateString('ar-SA')}</td>
                <td>
                    ${u.role !== 'admin' ? `
                        <button class="btn btn-outline btn-xs" onclick="toggleUserStatus('${u.username}')"><i class="fas fa-ban"></i></button>
                        <button class="btn btn-danger btn-xs" onclick="deleteUser('${u.username}')"><i class="fas fa-trash"></i></button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    }

    window.addNewUser = function() {
        const user = document.getElementById('newUsername').value.trim();
        const pass = document.getElementById('newUserPassword').value.trim();
        if (!user || !pass) return;
        const users = getUsers();
        if (users.find(u => u.username === user)) return Swal.fire({ title: 'المستخدم موجود', icon: 'error' });
        users.push({ username: user, password: pass, role: 'user', status: 'active', createdAt: new Date().toISOString() });
        saveUsers(users);
        addAuditEntry('إدارة', `إنشاء مستخدم جديد: ${user}`);
        renderUsersList();
        showToast('تم إضافة المستخدم');
        document.getElementById('newUsername').value = '';
        document.getElementById('newUserPassword').value = '';
    };

    window.toggleUserStatus = function(username) {
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (u) {
            u.status = u.status === 'active' ? 'blocked' : 'active';
            saveUsers(users);
            addAuditEntry('إدارة', `تغيير حالة المستخدم ${username} إلى ${u.status}`);
            renderUsersList();
        }
    };

    window.deleteUser = function(username) {
        Swal.fire({ title: 'حذف؟', icon: 'warning', showCancelButton: true }).then(r => {
            if (r.isConfirmed) {
                let users = getUsers();
                users = users.filter(u => u.username !== username);
                saveUsers(users);
                addAuditEntry('إدارة', `حذف المستخدم ${username}`);
                renderUsersList();
            }
        });
    };

    // ============ نظام التحقق من صلاحيات المكاتب والتواريخ ============

    function isOfficeAccessAllowed(user) {
        if (!user || user.role !== 'office') return true;
        
        const offices = getOffices();
        const office = offices.find(o => o.username === user.username);
        
        if (!office) return false;
        
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;
        
        const startY = parseInt(office.startYear);
        const startM = parseInt(office.startMonth);
        const endY = parseInt(office.endYear);
        const endM = parseInt(office.endMonth);

        const currentTotal = curY * 12 + curM;
        const startTotal = startY * 12 + startM;
        const endTotal = endY * 12 + endM;
        
        return currentTotal >= startTotal && currentTotal <= endTotal;
    }

    function generateOfficeId() {
        return 'office_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getOffices() {
        const raw = localStorage.getItem(OFFICES_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function saveOffices(offices) {
        localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
    }

    window.openOfficeModal = function(editId = null) {
        document.getElementById('officeModalOverlay').classList.add('show');
        document.getElementById('officeEditId').value = editId || '';
        document.getElementById('officeModalTitle').textContent = editId ? '✏️ تعديل المكتب' : '➕ إضافة مكتب جديد';
        
        if (editId) {
            const office = getOffices().find(o => o.id === editId);
            if (office) {
                document.getElementById('officeName').value = office.name;
                document.getElementById('officeManagerName').value = office.managerName;
                document.getElementById('officeUsername').value = office.username;
                document.getElementById('officePassword').value = office.password;
                document.getElementById('officeStartMonth').value = office.startMonth;
                document.getElementById('officeStartYear').value = office.startYear;
                document.getElementById('officeEndMonth').value = office.endMonth;
                document.getElementById('officeEndYear').value = office.endYear;
            }
        } else {
            document.getElementById('officeName').value = '';
            document.getElementById('officeManagerName').value = '';
            document.getElementById('officeUsername').value = '';
            document.getElementById('officePassword').value = '';
            const now = new Date();
            document.getElementById('officeStartMonth').value = now.getMonth() + 1;
            document.getElementById('officeStartYear').value = now.getFullYear();
            document.getElementById('officeEndMonth').value = 12;
            document.getElementById('officeEndYear').value = now.getFullYear() + 1;
        }
    };

    window.closeOfficeModal = () => document.getElementById('officeModalOverlay').classList.remove('show');

    window.saveOffice = function() {
        const name = document.getElementById('officeName').value.trim();
        const managerName = document.getElementById('officeManagerName').value.trim();
        const username = document.getElementById('officeUsername').value.trim();
        const password = document.getElementById('officePassword').value.trim();
        const startMonth = document.getElementById('officeStartMonth').value;
        const startYear = document.getElementById('officeStartYear').value;
        const endMonth = document.getElementById('officeEndMonth').value;
        const endYear = document.getElementById('officeEndYear').value;
        const editId = document.getElementById('officeEditId').value;

        if (!name || !managerName || !username || !password || !startYear || !endYear) {
            return Swal.fire({ title: 'جميع الحقول مطلوبة', icon: 'error' });
        }

        let offices = getOffices();
        let users = getUsers();

        if (!editId && users.find(u => u.username === username)) {
            return Swal.fire({ title: 'اسم المستخدم موجود بالفعل', icon: 'error' });
        }

        if (editId) {
            const officeIndex = offices.findIndex(o => o.id === editId);
            if (officeIndex !== -1) {
                const oldUsername = offices[officeIndex].username;
                offices[officeIndex] = {
                    id: editId,
                    name,
                    managerName,
                    username,
                    password,
                    startMonth,
                    startYear,
                    endMonth,
                    endYear,
                    status: offices[officeIndex].status,
                    createdAt: offices[officeIndex].createdAt,
                    updatedAt: new Date().toISOString()
                };

                const userIndex = users.findIndex(u => u.username === oldUsername);
                if (userIndex !== -1) {
                    users[userIndex].username = username;
                    users[userIndex].password = password;
                }

                saveOffices(offices);
                saveUsers(users);
                addAuditEntry('تعديل', `تعديل بيانات المكتب: ${name}`, `المدير: ${managerName}`);
                showToast('تم تحديث بيانات المكتب بنجاح');
            }
        } else {
            const newOffice = {
                id: generateOfficeId(),
                name,
                managerName,
                username,
                password,
                startMonth,
                startYear,
                endMonth,
                endYear,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            offices.push(newOffice);

            users.push({
                username,
                password,
                role: 'office',
                status: 'active',
                officeId: newOffice.id,
                createdAt: new Date().toISOString()
            });

            saveOffices(offices);
            saveUsers(users);
            addAuditEntry('إضافة', `إنشاء مكتب جديد: ${name}`, `المدير: ${managerName}, اليوزر: ${username}`);
            showToast('تم إنشاء المكتب بنجاح');
        }

        closeOfficeModal();
        renderOffices();
    };

    window.deleteOffice = function(officeId) {
        Swal.fire({
            title: 'حذف المكتب؟',
            text: 'سيتم حذف المكتب وحساب المستخدم التابع له',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#e74c3c'
        }).then(r => {
            if (r.isConfirmed) {
                let offices = getOffices();
                let users = getUsers();
                
                const office = offices.find(o => o.id === officeId);
                if (office) {
                    users = users.filter(u => u.username !== office.username);
                    offices = offices.filter(o => o.id !== officeId);
                    
                    saveOffices(offices);
                    saveUsers(users);
                    addAuditEntry('حذف', `حذف المكتب: ${office.name}`, `المدير: ${office.managerName}`);
                    showToast('تم حذف المكتب بنجاح');
                    renderOffices();
                }
            }
        });
    };

    window.toggleOfficeStatus = function(officeId) {
        let offices = getOffices();
        const office = offices.find(o => o.id === officeId);
        
        if (office) {
            const newStatus = office.status === 'active' ? 'blocked' : 'active';
            office.status = newStatus;
            office.updatedAt = new Date().toISOString();
            
            let users = getUsers();
            const user = users.find(u => u.username === office.username);
            if (user) {
                user.status = newStatus;
            }
            
            saveOffices(offices);
            saveUsers(users);
            addAuditEntry('إدارة', `${newStatus === 'blocked' ? 'حظر' : 'تفعيل'} المكتب: ${office.name}`);
            showToast(newStatus === 'blocked' ? 'تم حظر المكتب' : 'تم تفعيل المكتب');
            renderOffices();
        }
    };

    function renderOffices() {
        const offices = getOffices();
        const tbody = document.getElementById('officesTableBody');
        const emptyState = document.getElementById('officesEmpty');

        if (!tbody) return;

        if (offices.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        
        const monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        
        tbody.innerHTML = offices.map(office => `
            <tr>
                <td><strong>${office.name}</strong></td>
                <td>${office.managerName}</td>
                <td><code style="background:var(--surface-alt);padding:4px 8px;border-radius:4px;font-size:0.85rem;">${office.username}</code></td>
                <td><span class="badge ${office.status === 'active' ? 'badge-success' : 'badge-danger'}">${office.status === 'active' ? 'نشط' : 'محظور'}</span></td>
                <td style="font-size:0.9rem;">${monthNames[parseInt(office.startMonth)]} ${office.startYear}</td>
                <td style="font-size:0.9rem;">${monthNames[parseInt(office.endMonth)]} ${office.endYear}</td>
                <td style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-xs" onclick="openOfficeModal('${office.id}')" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline btn-xs" onclick="toggleOfficeStatus('${office.id}')" title="${office.status === 'active' ? 'حظر' : 'تفعيل'}"><i class="fas fa-${office.status === 'active' ? 'ban' : 'check'}"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="deleteOffice('${office.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // ============ الاستماع للأحداث (Event Listeners) ============
    document.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape') { 
            closeProfitModal(); 
            closeClientModal(); 
            closeClientTransModal(); 
            closeSidebar(); 
            closeUsersModal(); 
            closeOfficeModal(); 
        } 
    });

    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', function(e) { 
            if (e.target === this) this.classList.remove('show'); 
        });
    });

    const loginPassElem = document.getElementById('loginPass');
    if (loginPassElem) {
        loginPassElem.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') handleLogin(); 
        });
    }

    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;
    window.navigateTo = navigateTo;
    window.toggleTheme = toggleTheme;
    window.handleGlobalSearch = handleGlobalSearch;

    applyTheme();
})();
