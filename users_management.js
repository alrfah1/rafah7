// ============ نظام إدارة المستخدمين والميزات الاحترافية ============

// ============ دوال إدارة المستخدمين ============

window.openUsersModal = function() {
    document.getElementById('usersModalOverlay').classList.add('show');
    renderUsersTable();
};

window.closeUsersModal = function() {
    document.getElementById('usersModalOverlay').classList.remove('show');
};

window.renderUsersTable = function() {
    const users = getUsers();
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = users.map(user => {
        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 'غير محدد';
        const roleText = {
            'admin': '👨‍💼 مدير عام',
            'office': '🏢 مكتب',
            'user': '👤 مستخدم'
        }[user.role] || user.role;
        
        const statusBadge = user.status === 'active' 
            ? '<span class="badge badge-success">✅ نشط</span>'
            : '<span class="badge badge-danger">🔒 محظور</span>';
        
        return `
            <tr>
                <td><strong>${user.username}</strong><br><small style="color:var(--text-secondary);">${roleText}</small></td>
                <td>${statusBadge}</td>
                <td style="font-size:0.85rem;">${createdDate}</td>
                <td style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${user.username !== 'alrfah' ? `
                        <button class="btn btn-primary btn-xs" onclick="openChangePasswordModal('${user.username}')" title="تغيير كلمة المرور">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn btn-outline btn-xs" onclick="toggleUserStatus('${user.username}')" title="${user.status === 'active' ? 'حظر' : 'تفعيل'}">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn btn-danger btn-xs" onclick="deleteUser('${user.username}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span style="color:var(--text-secondary);font-size:0.8rem;">مدير النظام الرئيسي</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');
};

window.addNewUser = function() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    
    if (!username || !password) {
        return Swal.fire({ title: 'خطأ', text: 'يرجى إدخال اسم المستخدم وكلمة المرور', icon: 'warning' });
    }
    
    if (username.length < 3) {
        return Swal.fire({ title: 'خطأ', text: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل', icon: 'warning' });
    }
    
    if (password.length < 6) {
        return Swal.fire({ title: 'خطأ', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', icon: 'warning' });
    }
    
    let users = getUsers();
    
    if (users.find(u => u.username === username)) {
        return Swal.fire({ title: 'خطأ', text: 'اسم المستخدم موجود بالفعل', icon: 'error' });
    }
    
    users.push({
        username,
        password,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
    });
    
    saveUsers(users);
    addAuditEntry('إضافة', `إضافة مستخدم جديد: ${username}`, `الدور: مستخدم عادي`);
    
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    
    renderUsersTable();
    showToast('✅ تم إضافة المستخدم بنجاح');
};

window.toggleUserStatus = function(username) {
    let users = getUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    user.status = newStatus;
    user.updatedAt = new Date().toISOString();
    
    saveUsers(users);
    addAuditEntry('إدارة', `${newStatus === 'blocked' ? 'حظر' : 'تفعيل'} المستخدم: ${username}`);
    
    renderUsersTable();
    showToast(newStatus === 'blocked' ? '🔒 تم حظر المستخدم' : '✅ تم تفعيل المستخدم');
};

window.deleteUser = function(username) {
    Swal.fire({
        title: 'حذف المستخدم؟',
        text: `سيتم حذف المستخدم ${username} بشكل نهائي`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#e74c3c'
    }).then(r => {
        if (r.isConfirmed) {
            let users = getUsers().filter(u => u.username !== username);
            saveUsers(users);
            addAuditEntry('حذف', `حذف المستخدم: ${username}`);
            renderUsersTable();
            showToast('✅ تم حذف المستخدم بنجاح');
        }
    });
};

// ============ ميزة تغيير كلمة المرور ============

window.openChangePasswordModal = function(username) {
    const modal = document.getElementById('changePasswordModalOverlay');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    document.getElementById('changePasswordUsername').textContent = username;
    document.getElementById('changePasswordUsername').dataset.username = username;
    document.getElementById('currentPasswordField').value = '';
    document.getElementById('newPasswordField').value = '';
    document.getElementById('confirmPasswordField').value = '';
    
    modal.classList.add('show');
};

window.closeChangePasswordModal = function() {
    const modal = document.getElementById('changePasswordModalOverlay');
    if (modal) modal.classList.remove('show');
};

window.changePassword = function() {
    const username = document.getElementById('changePasswordUsername').dataset.username;
    const currentPassword = document.getElementById('currentPasswordField').value;
    const newPassword = document.getElementById('newPasswordField').value;
    const confirmPassword = document.getElementById('confirmPasswordField').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return Swal.fire({ title: 'خطأ', text: 'يرجى إدخال جميع الحقول', icon: 'warning' });
    }
    
    if (newPassword.length < 6) {
        return Swal.fire({ title: 'خطأ', text: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', icon: 'warning' });
    }
    
    if (newPassword !== confirmPassword) {
        return Swal.fire({ title: 'خطأ', text: 'كلمات المرور غير متطابقة', icon: 'error' });
    }
    
    let users = getUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return Swal.fire({ title: 'خطأ', text: 'المستخدم غير موجود', icon: 'error' });
    }
    
    if (user.password !== currentPassword) {
        return Swal.fire({ title: 'خطأ', text: 'كلمة المرور الحالية غير صحيحة', icon: 'error' });
    }
    
    if (newPassword === currentPassword) {
        return Swal.fire({ title: 'تنبيه', text: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية', icon: 'warning' });
    }
    
    user.password = newPassword;
    user.passwordChangedAt = new Date().toISOString();
    
    saveUsers(users);
    addAuditEntry('تحديث', `تغيير كلمة مرور المستخدم: ${username}`);
    
    closeChangePasswordModal();
    renderUsersTable();
    showToast('✅ تم تغيير كلمة المرور بنجاح');
};

// ============ ميزة تغيير كلمة المرور من الإعدادات الشخصية ============

window.openMyPasswordModal = function() {
    if (!currentUser) return;
    
    const modal = document.getElementById('myPasswordModalOverlay');
    if (!modal) {
        console.error('My Password Modal not found');
        return;
    }
    
    document.getElementById('myCurrentPasswordField').value = '';
    document.getElementById('myNewPasswordField').value = '';
    document.getElementById('myConfirmPasswordField').value = '';
    
    modal.classList.add('show');
};

window.closeMyPasswordModal = function() {
    const modal = document.getElementById('myPasswordModalOverlay');
    if (modal) modal.classList.remove('show');
};

window.changeMyPassword = function() {
    if (!currentUser) return;
    
    const currentPassword = document.getElementById('myCurrentPasswordField').value;
    const newPassword = document.getElementById('myNewPasswordField').value;
    const confirmPassword = document.getElementById('myConfirmPasswordField').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return Swal.fire({ title: 'خطأ', text: 'يرجى إدخال جميع الحقول', icon: 'warning' });
    }
    
    if (newPassword.length < 6) {
        return Swal.fire({ title: 'خطأ', text: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', icon: 'warning' });
    }
    
    if (newPassword !== confirmPassword) {
        return Swal.fire({ title: 'خطأ', text: 'كلمات المرور غير متطابقة', icon: 'error' });
    }
    
    if (currentPassword !== currentUser.password) {
        return Swal.fire({ title: 'خطأ', text: 'كلمة المرور الحالية غير صحيحة', icon: 'error' });
    }
    
    if (newPassword === currentPassword) {
        return Swal.fire({ title: 'تنبيه', text: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية', icon: 'warning' });
    }
    
    let users = getUsers();
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    
    if (userIndex === -1) {
        return Swal.fire({ title: 'خطأ', text: 'المستخدم غير موجود', icon: 'error' });
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].passwordChangedAt = new Date().toISOString();
    currentUser.password = newPassword;
    
    saveUsers(users);
    addAuditEntry('تحديث', `تغيير كلمة المرور الشخصية للمستخدم: ${currentUser.username}`);
    
    closeMyPasswordModal();
    showToast('✅ تم تغيير كلمة المرور بنجاح');
};

window.changeSecurityPassword = function() {
    const currentPass = document.getElementById('secCurrentPass').value;
    const newPass = document.getElementById('secNewPass').value;
    const confirmPass = document.getElementById('secConfirmPass').value;
    
    if (!currentPass || !newPass || !confirmPass) {
        Swal.fire({ title: 'يرجى ملء جميع الحقول', icon: 'warning', confirmButtonColor: '#c8963e' });
        return;
    }
    
    if (newPass !== confirmPass) {
        Swal.fire({ title: 'كلمات المرور الجديدة غير متطابقة', icon: 'error', confirmButtonColor: '#c8963e' });
        return;
    }
    
    if (newPass.length < 6) {
        Swal.fire({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', icon: 'warning', confirmButtonColor: '#c8963e' });
        return;
    }
    
    if (currentPass !== currentUser.password) {
        Swal.fire({ title: 'كلمة المرور الحالية غير صحيحة', icon: 'error', confirmButtonColor: '#c8963e' });
        return;
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    
    if (userIndex !== -1) {
        users[userIndex].password = newPass;
        saveUsers(users);
        currentUser.password = newPass;
        
        Swal.fire({ title: 'تم تغيير كلمة المرور بنجاح', icon: 'success', confirmButtonColor: '#c8963e' });
        
        // تصفير الحقول
        document.getElementById('secCurrentPass').value = '';
        document.getElementById('secNewPass').value = '';
        document.getElementById('secConfirmPass').value = '';
        
        // تسجيل في سجل النشاطات
        if (typeof addAuditEntry === 'function') {
            addAuditEntry('أمان', 'تغيير كلمة المرور من صفحة الأمان');
        }
    }
};

// ============ الميزات الاحترافية لمحلات الحوالات ============

// ============ 1. نظام الإشعارات والتنبيهات ============

window.createNotification = function(type, title, message, details = '') {
    const notifications = JSON.parse(localStorage.getItem('alrefah_notifications') || '[]');
    
    const notification = {
        id: 'notif_' + Date.now(),
        type,
        title,
        message,
        details,
        timestamp: new Date().toISOString(),
        read: false,
        userId: currentUser ? currentUser.username : 'system'
    };
    
    notifications.unshift(notification);
    localStorage.setItem('alrefah_notifications', JSON.stringify(notifications.slice(0, 100)));
    
    return notification;
};

window.getNotifications = function(limit = 10) {
    const notifications = JSON.parse(localStorage.getItem('alrefah_notifications') || '[]');
    return notifications.slice(0, limit);
};

window.markNotificationAsRead = function(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('alrefah_notifications') || '[]');
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        localStorage.setItem('alrefah_notifications', JSON.stringify(notifications));
    }
};

window.getUnreadNotificationsCount = function() {
    const notifications = JSON.parse(localStorage.getItem('alrefah_notifications') || '[]');
    return notifications.filter(n => !n.read).length;
};

// ============ 2. نظام المؤشرات والتحليلات المتقدمة ============

window.calculateAdvancedMetrics = function() {
    const data = getData();
    const rates = getExchangeRates();
    
    const totalRevenue = data.profits.reduce((s, p) => s + (p.sell || 0), 0);
    const totalCost = data.profits.reduce((s, p) => s + (p.buy || 0), 0);
    const totalExpenses = data.profits.reduce((s, p) => s + (p.expense || 0), 0);
    const netProfit = totalRevenue - totalCost - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;
    
    const transactionCount = data.profits.length;
    const daysActive = data.profits.length > 0 
        ? Math.floor((new Date() - new Date(data.profits[0].date)) / (1000 * 60 * 60 * 24)) + 1
        : 1;
    const dailyAverage = (transactionCount / daysActive).toFixed(2);
    
    let totalClientDebt = 0;
    let totalClientCredit = 0;
    data.clientTransactions.forEach(t => {
        if (t.type === 'لنا') totalClientDebt += t.amount;
        else totalClientCredit += t.amount;
    });
    
    const sellerMetrics = {};
    data.profits.forEach(p => {
        if (!sellerMetrics[p.seller]) {
            sellerMetrics[p.seller] = {
                count: 0,
                revenue: 0,
                cost: 0,
                expense: 0,
                profit: 0
            };
        }
        sellerMetrics[p.seller].count++;
        sellerMetrics[p.seller].revenue += p.sell || 0;
        sellerMetrics[p.seller].cost += p.buy || 0;
        sellerMetrics[p.seller].expense += p.expense || 0;
        sellerMetrics[p.seller].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
    });
    
    return {
        totalRevenue,
        totalCost,
        totalExpenses,
        netProfit,
        profitMargin,
        transactionCount,
        dailyAverage,
        totalClientDebt,
        totalClientCredit,
        sellerMetrics,
        daysActive
    };
};

// ============ 3. نظام التقارير المتقدمة ============

window.generateAdvancedReport = function(type = 'daily') {
    const data = getData();
    const metrics = calculateAdvancedMetrics();
    const timestamp = new Date().toLocaleString('ar-SA');
    
    let report = {
        id: 'report_' + Date.now(),
        type,
        timestamp,
        generatedBy: currentUser ? currentUser.username : 'system',
        data: {
            metrics,
            profitsByDate: {},
            profitsBySeller: {},
            clientTransactionsSummary: {}
        }
    };
    
    data.profits.forEach(p => {
        const date = p.date || new Date().toISOString().split('T')[0];
        if (!report.data.profitsByDate[date]) {
            report.data.profitsByDate[date] = {
                revenue: 0,
                cost: 0,
                expense: 0,
                profit: 0,
                count: 0
            };
        }
        report.data.profitsByDate[date].revenue += p.sell || 0;
        report.data.profitsByDate[date].cost += p.buy || 0;
        report.data.profitsByDate[date].expense += p.expense || 0;
        report.data.profitsByDate[date].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
        report.data.profitsByDate[date].count++;
    });
    
    report.data.profitsBySeller = metrics.sellerMetrics;
    
    const reports = JSON.parse(localStorage.getItem('alrefah_advanced_reports') || '[]');
    reports.unshift(report);
    localStorage.setItem('alrefah_advanced_reports', JSON.stringify(reports.slice(0, 50)));
    
    addAuditEntry('تقرير', `إنشاء تقرير متقدم من نوع: ${type}`, `عدد المعاملات: ${metrics.transactionCount}`);
    
    return report;
};

window.getAdvancedReports = function(limit = 20) {
    const reports = JSON.parse(localStorage.getItem('alrefah_advanced_reports') || '[]');
    return reports.slice(0, limit);
};

// ============ 4. نظام إدارة الأرصدة والديون المتقدم ============

window.getDetailedClientBalance = function(clientId) {
    const data = getData();
    const client = data.clients.find(c => c.id === clientId);
    const transactions = data.clientTransactions.filter(t => t.clientId === clientId);
    
    const balance = {
        USD: 0,
        TRY: 0,
        SYP: 0
    };
    
    const history = [];
    
    transactions.forEach(t => {
        const amount = t.type === 'لنا' ? t.amount : -t.amount;
        balance[t.currency] += amount;
        
        history.push({
            date: t.date || new Date().toISOString(),
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            description: t.description || '',
            balanceAfter: { ...balance }
        });
    });
    
    return {
        client,
        currentBalance: balance,
        history: history.reverse(),
        totalTransactions: transactions.length,
        lastTransaction: transactions.length > 0 ? transactions[0].date : null
    };
};

// ============ 5. نظام التنبيهات الذكية ============

window.checkAndCreateAlerts = function() {
    const data = getData();
    const metrics = calculateAdvancedMetrics();
    
    data.clients.forEach(client => {
        const balance = getClientBalance(client.id);
        const totalDebt = (balance.USD || 0) + (balance.TRY || 0) / 30 + (balance.SYP || 0) / 14500;
        
        if (totalDebt > 1000) {
            createNotification(
                'warning',
                '⚠️ رصيد عميل مرتفع',
                `العميل ${client.name} لديه رصيد مرتفع`,
                `الرصيد بالدولار: $${totalDebt.toFixed(2)}`
            );
        }
    });
    
    if (metrics.profitMargin < 5 && metrics.transactionCount > 10) {
        createNotification(
            'warning',
            '📉 انخفاض هامش الربح',
            'هامش الربح أقل من 5%',
            `هامش الربح الحالي: ${metrics.profitMargin}%`
        );
    }
    
    if (metrics.transactionCount === 0) {
        createNotification(
            'info',
            'ℹ️ لا توجد معاملات',
            'لم يتم تسجيل أي معاملات حتى الآن',
            'ابدأ بإضافة معاملة جديدة'
        );
    }
};

// ============ 6. نظام النسخ الاحتياطية الذكية ============

window.createSmartBackup = function() {
    const data = getData();
    const users = getUsers();
    const offices = JSON.parse(localStorage.getItem('alrefah_offices_list') || '[]');
    const settings = JSON.parse(localStorage.getItem('alrefah_settings') || '{}');
    
    const backup = {
        id: 'backup_' + Date.now(),
        timestamp: new Date().toISOString(),
        createdBy: currentUser ? currentUser.username : 'system',
        version: '4.1',
        data: {
            profits: data.profits,
            clients: data.clients,
            clientTransactions: data.clientTransactions,
            users,
            offices,
            settings
        },
        statistics: {
            totalProfits: data.profits.length,
            totalClients: data.clients.length,
            totalTransactions: data.clientTransactions.length,
            totalUsers: users.length,
            totalOffices: offices.length
        }
    };
    
    const backups = JSON.parse(localStorage.getItem('alrefah_smart_backups') || '[]');
    backups.unshift(backup);
    localStorage.setItem('alrefah_smart_backups', JSON.stringify(backups.slice(0, 20)));
    
    addAuditEntry('نسخة احتياطية', 'إنشاء نسخة احتياطية ذكية', `حجم البيانات: ${JSON.stringify(backup).length} بايت`);
    
    return backup;
};

window.getSmartBackups = function() {
    return JSON.parse(localStorage.getItem('alrefah_smart_backups') || '[]');
};

window.restoreFromSmartBackup = function(backupId) {
    const backups = getSmartBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
        return Swal.fire({ title: 'خطأ', text: 'النسخة الاحتياطية غير موجودة', icon: 'error' });
    }
    
    Swal.fire({
        title: 'استعادة النسخة الاحتياطية؟',
        text: `سيتم استعادة البيانات من ${new Date(backup.timestamp).toLocaleString('ar-SA')}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، استعد',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#3498db'
    }).then(r => {
        if (r.isConfirmed) {
            localStorage.setItem('alrefah_accounting_data', JSON.stringify({
                profits: backup.data.profits,
                clients: backup.data.clients,
                clientTransactions: backup.data.clientTransactions
            }));
            
            addAuditEntry('استعادة', 'استعادة من نسخة احتياطية', `معرف النسخة: ${backupId}`);
            showToast('✅ تم استعادة البيانات بنجاح');
            refreshPage();
        }
    });
};

// ============ 7. نظام تحليل الأداء ============

window.getPerformanceAnalysis = function() {
    const data = getData();
    const metrics = calculateAdvancedMetrics();
    
    const profitsByDay = {};
    data.profits.forEach(p => {
        const date = p.date || new Date().toISOString().split('T')[0];
        if (!profitsByDay[date]) profitsByDay[date] = 0;
        profitsByDay[date] += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
    });
    
    const sortedDays = Object.entries(profitsByDay).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const trend = sortedDays.length > 1 
        ? sortedDays[sortedDays.length - 1][1] > sortedDays[sortedDays.length - 2][1] 
            ? 'صاعد' 
            : 'هابط'
        : 'مستقر';
    
    return {
        trend,
        metrics,
        topSeller: Object.entries(metrics.sellerMetrics).sort((a, b) => b[1].profit - a[1].profit)[0],
        topClient: data.clients.length > 0 ? data.clients[0] : null,
        healthScore: calculateHealthScore(metrics)
    };
};

function calculateHealthScore(metrics) {
    let score = 50;
    
    if (metrics.netProfit > 0) score += 20;
    if (metrics.profitMargin > 10) score += 15;
    if (metrics.dailyAverage > 1) score += 15;
    
    return Math.min(100, score);
}
