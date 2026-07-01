// ============ الميزات الاحترافية المتقدمة لمحلات الحوالات ============

// ============ 1. نظام لوحة التحليلات المتقدمة ============

window.renderAdvancedDashboard = function() {
    const analysis = getPerformanceAnalysis();
    const metrics = calculateAdvancedMetrics();
    
    const dashboardDiv = document.getElementById('advancedDashboardContainer');
    if (!dashboardDiv) return;
    
    const healthColor = analysis.healthScore >= 70 ? 'var(--green)' : analysis.healthScore >= 50 ? 'var(--gold)' : 'var(--red)';
    
    dashboardDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:20px;">
            <!-- Health Score -->
            <div style="background:linear-gradient(135deg, ${healthColor}, rgba(200,150,62,0.2));padding:20px;border-radius:12px;color:white;">
                <div style="font-size:0.9rem;opacity:0.9;margin-bottom:8px;">📊 درجة الصحة</div>
                <div style="font-size:2.5rem;font-weight:900;">${analysis.healthScore}%</div>
                <div style="font-size:0.8rem;opacity:0.8;margin-top:8px;">الاتجاه: ${analysis.trend === 'صاعد' ? '📈' : analysis.trend === 'هابط' ? '📉' : '➡️'} ${analysis.trend}</div>
            </div>
            
            <!-- Profit Margin -->
            <div style="background:linear-gradient(135deg, var(--blue), rgba(52,152,219,0.2));padding:20px;border-radius:12px;color:white;">
                <div style="font-size:0.9rem;opacity:0.9;margin-bottom:8px;">💹 هامش الربح</div>
                <div style="font-size:2.5rem;font-weight:900;">${metrics.profitMargin}%</div>
                <div style="font-size:0.8rem;opacity:0.8;margin-top:8px;">من إجمالي الإيرادات</div>
            </div>
            
            <!-- Daily Average -->
            <div style="background:linear-gradient(135deg, var(--purple), rgba(155,89,182,0.2));padding:20px;border-radius:12px;color:white;">
                <div style="font-size:0.9rem;opacity:0.9;margin-bottom:8px;">📊 المتوسط اليومي</div>
                <div style="font-size:2.5rem;font-weight:900;">${metrics.dailyAverage}</div>
                <div style="font-size:0.8rem;opacity:0.8;margin-top:8px;">معاملات يومياً</div>
            </div>
            
            <!-- Client Debt -->
            <div style="background:linear-gradient(135deg, var(--red), rgba(231,76,60,0.2));padding:20px;border-radius:12px;color:white;">
                <div style="font-size:0.9rem;opacity:0.9;margin-bottom:8px;">💰 الديون المستحقة</div>
                <div style="font-size:2.5rem;font-weight:900;">$${formatNumber(metrics.totalClientDebt)}</div>
                <div style="font-size:0.8rem;opacity:0.8;margin-top:8px;">من العملاء</div>
            </div>
        </div>
        
        <!-- Top Performers -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
            <div style="background:var(--surface-alt);padding:20px;border-radius:12px;border-right:4px solid var(--gold);">
                <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">🏆 أفضل بائع</div>
                <div style="font-size:1.3rem;font-weight:700;color:var(--gold);margin-bottom:8px;">
                    ${analysis.topSeller ? analysis.topSeller[0] : 'لا يوجد'}
                </div>
                <div style="font-size:0.85rem;color:var(--text-secondary);">
                    الربح: $${analysis.topSeller ? formatNumber(analysis.topSeller[1].profit) : '0'}
                </div>
            </div>
            
            <div style="background:var(--surface-alt);padding:20px;border-radius:12px;border-right:4px solid var(--blue);">
                <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">👥 أنشط عميل</div>
                <div style="font-size:1.3rem;font-weight:700;color:var(--blue);margin-bottom:8px;">
                    ${analysis.topClient ? analysis.topClient.name : 'لا يوجد'}
                </div>
                <div style="font-size:0.85rem;color:var(--text-secondary);">
                    معاملات: ${analysis.topClient ? 'متعددة' : '0'}
                </div>
            </div>
        </div>
    `;
};

// ============ 2. نظام إدارة الأداء والتقارير ============

window.openPerformanceReportModal = function() {
    const modal = document.getElementById('performanceReportModalOverlay');
    if (!modal) {
        console.error('Performance Report Modal not found');
        return;
    }
    
    const analysis = getPerformanceAnalysis();
    const metrics = calculateAdvancedMetrics();
    
    document.getElementById('performanceReportContent').innerHTML = `
        <div style="background:var(--surface-alt);padding:16px;border-radius:8px;margin-bottom:16px;">
            <h4 style="margin-bottom:12px;">📊 ملخص الأداء</h4>
            <table style="width:100%;font-size:0.9rem;">
                <tr>
                    <td style="padding:8px;border-bottom:1px solid var(--border);">صافي الربح:</td>
                    <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;color:var(--gold);">$${formatNumber(metrics.netProfit)}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid var(--border);">إجمالي الإيرادات:</td>
                    <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;">$${formatNumber(metrics.totalRevenue)}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid var(--border);">إجمالي التكاليف:</td>
                    <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;color:var(--red);">$${formatNumber(metrics.totalCost + metrics.totalExpenses)}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid var(--border);">هامش الربح:</td>
                    <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;color:var(--blue);">${metrics.profitMargin}%</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid var(--border);">عدد المعاملات:</td>
                    <td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;">${metrics.transactionCount}</td>
                </tr>
                <tr>
                    <td style="padding:8px;">المتوسط اليومي:</td>
                    <td style="padding:8px;font-weight:700;">${metrics.dailyAverage} معاملة/يوم</td>
                </tr>
            </table>
        </div>
        
        <div style="background:var(--surface-alt);padding:16px;border-radius:8px;">
            <h4 style="margin-bottom:12px;">🎯 الاتجاهات والتوصيات</h4>
            <ul style="margin:0;padding-left:20px;font-size:0.9rem;">
                <li style="margin-bottom:8px;">الاتجاه العام: <strong>${analysis.trend === 'صاعد' ? '📈 صاعد - الأداء يتحسن' : analysis.trend === 'هابط' ? '📉 هابط - يحتاج متابعة' : '➡️ مستقر'}</strong></li>
                <li style="margin-bottom:8px;">درجة الصحة: <strong>${analysis.healthScore}% - ${analysis.healthScore >= 70 ? '✅ ممتاز' : analysis.healthScore >= 50 ? '⚠️ جيد' : '❌ يحتاج تحسين'}</strong></li>
                ${metrics.profitMargin < 5 ? '<li style="margin-bottom:8px;">⚠️ هامش الربح منخفض - يرجى مراجعة الأسعار والمصروفات</li>' : ''}
                ${metrics.totalClientDebt > 5000 ? '<li style="margin-bottom:8px;">⚠️ الديون المستحقة مرتفعة - يرجى متابعة العملاء</li>' : ''}
            </ul>
        </div>
    `;
    
    modal.classList.add('show');
};

window.closePerformanceReportModal = function() {
    const modal = document.getElementById('performanceReportModalOverlay');
    if (modal) modal.classList.remove('show');
};

// ============ 3. نظام التنبيهات الذكية المتقدمة ============

window.renderNotificationsPanel = function() {
    const notifications = getNotifications(20);
    const container = document.getElementById('notificationsPanel');
    
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">✅ لا توجد تنبيهات</div>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => {
        const date = new Date(notif.timestamp).toLocaleString('ar-SA');
        const icon = {
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'info': 'ℹ️'
        }[notif.type] || 'ℹ️';
        
        const bgColor = {
            'warning': 'rgba(241,196,15,0.1)',
            'error': 'rgba(231,76,60,0.1)',
            'success': 'rgba(46,204,113,0.1)',
            'info': 'rgba(52,152,219,0.1)'
        }[notif.type] || 'var(--surface-alt)';
        
        return `
            <div style="background:${bgColor};padding:12px;border-radius:8px;margin-bottom:8px;border-right:3px solid ${
                notif.type === 'warning' ? 'var(--gold)' :
                notif.type === 'error' ? 'var(--red)' :
                notif.type === 'success' ? 'var(--green)' :
                'var(--blue)'
            };">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div style="flex:1;">
                        <div style="font-weight:700;margin-bottom:4px;">${icon} ${notif.title}</div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px;">${notif.message}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">${date}</div>
                    </div>
                    <button class="btn btn-outline btn-xs" onclick="markNotificationAsRead('${notif.id}')" style="margin-right:8px;">✓</button>
                </div>
            </div>
        `;
    }).join('');
};

// ============ 4. نظام إدارة النسخ الاحتياطية المتقدمة ============

window.renderSmartBackupsPanel = function() {
    const backups = getSmartBackups();
    const container = document.getElementById('smartBackupsPanel');
    
    if (!container) return;
    
    if (backups.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">لا توجد نسخ احتياطية</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-gold btn-sm" onclick="createSmartBackup()"><i class="fas fa-plus"></i> إنشاء نسخة احتياطية الآن</button>
        </div>
        ${backups.map(backup => {
            const date = new Date(backup.timestamp).toLocaleString('ar-SA');
            const size = (JSON.stringify(backup).length / 1024).toFixed(2);
            
            return `
                <div style="background:var(--surface-alt);padding:12px;border-radius:8px;margin-bottom:8px;border-right:3px solid var(--blue);">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                        <div>
                            <div style="font-weight:700;margin-bottom:4px;">💾 نسخة من ${date}</div>
                            <div style="font-size:0.85rem;color:var(--text-secondary);">بواسطة: ${backup.createdBy}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.8rem;color:var(--text-secondary);">${size} KB</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        <button class="btn btn-primary btn-xs" onclick="restoreFromSmartBackup('${backup.id}')" title="استعادة"><i class="fas fa-redo"></i></button>
                        <button class="btn btn-outline btn-xs" onclick="downloadBackup('${backup.id}')" title="تحميل"><i class="fas fa-download"></i></button>
                    </div>
                </div>
            `;
        }).join('')}
    `;
};

window.downloadBackup = function(backupId) {
    const backups = getSmartBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
        showToast('❌ النسخة الاحتياطية غير موجودة');
        return;
    }
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${backup.timestamp.split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ تم تحميل النسخة الاحتياطية');
};

// ============ 5. نظام تحليل العملاء المتقدم ============

window.renderClientAnalytics = function() {
    const data = getData();
    const container = document.getElementById('clientAnalyticsPanel');
    
    if (!container) return;
    
    if (data.clients.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">لا يوجد عملاء مسجلين</div>';
        return;
    }
    
    const clientStats = data.clients.map(client => {
        const balance = getClientBalance(client.id);
        const totalDebt = (balance.USD || 0) + (balance.TRY || 0) / 30 + (balance.SYP || 0) / 14500;
        const transactions = data.clientTransactions.filter(t => t.clientId === client.id).length;
        
        return {
            ...client,
            balance,
            totalDebt,
            transactions
        };
    }).sort((a, b) => b.totalDebt - a.totalDebt);
    
    container.innerHTML = clientStats.map(client => {
        const debtColor = client.totalDebt > 1000 ? 'var(--red)' : client.totalDebt > 500 ? 'var(--gold)' : 'var(--green)';
        
        return `
            <div style="background:var(--surface-alt);padding:12px;border-radius:8px;margin-bottom:8px;border-right:3px solid ${debtColor};">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div>
                        <div style="font-weight:700;margin-bottom:4px;">👤 ${client.name}</div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">معاملات: ${client.transactions}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700;color:${debtColor};">$${formatNumber(client.totalDebt)}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary);">الرصيد</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// ============ 6. نظام تحليل البائعين والأداء ============

window.renderSellerPerformance = function() {
    const data = getData();
    const container = document.getElementById('sellerPerformancePanel');
    
    if (!container) return;
    
    const sellerStats = {};
    data.profits.forEach(p => {
        if (!sellerStats[p.seller]) {
            sellerStats[p.seller] = {
                count: 0,
                revenue: 0,
                cost: 0,
                expense: 0,
                profit: 0
            };
        }
        sellerStats[p.seller].count++;
        sellerStats[p.seller].revenue += p.sell || 0;
        sellerStats[p.seller].cost += p.buy || 0;
        sellerStats[p.seller].expense += p.expense || 0;
        sellerStats[p.seller].profit += (p.sell || 0) - (p.buy || 0) - (p.expense || 0);
    });
    
    if (Object.keys(sellerStats).length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">لا توجد معاملات مسجلة</div>';
        return;
    }
    
    const sorted = Object.entries(sellerStats).sort((a, b) => b[1].profit - a[1].profit);
    
    container.innerHTML = sorted.map(([seller, stats]) => {
        const profitMargin = stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0;
        
        return `
            <div style="background:var(--surface-alt);padding:12px;border-radius:8px;margin-bottom:8px;border-right:3px solid var(--gold);">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div>
                        <div style="font-weight:700;margin-bottom:4px;">🏪 ${seller}</div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);">معاملات: ${stats.count}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700;color:var(--gold);">$${formatNumber(stats.profit)}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary);">الربح (${profitMargin}%)</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem;">
                    <div>الإيرادات: <strong>$${formatNumber(stats.revenue)}</strong></div>
                    <div>التكاليف: <strong>$${formatNumber(stats.cost + stats.expense)}</strong></div>
                </div>
            </div>
        `;
    }).join('');
};

// ============ 7. نظام التقارير المخصصة ============

window.generateCustomReport = function(reportType) {
    const data = getData();
    const metrics = calculateAdvancedMetrics();
    const timestamp = new Date().toLocaleString('ar-SA');
    
    let officeName = 'مكتب الرفاه المحاسبي';
    if (currentUser && currentUser.role === 'office') {
        const offices = typeof getOffices === 'function' ? getOffices() : [];
        const office = offices.find(o => o.id === currentUser.officeId);
        if (office) officeName = office.name;
    }

    let reportContent = `
        ╔════════════════════════════════════════════════════════════╗
        ║          ${officeName}
        ║          تقرير ${reportType === 'daily' ? 'يومي' : reportType === 'weekly' ? 'أسبوعي' : 'شهري'}
        ║          ${timestamp}
        ╚════════════════════════════════════════════════════════════╝
        
        📊 ملخص الأداء:
        ───────────────────────────────────────────────────────────
        صافي الربح:           $${formatNumber(metrics.netProfit)}
        إجمالي الإيرادات:      $${formatNumber(metrics.totalRevenue)}
        إجمالي التكاليف:       $${formatNumber(metrics.totalCost + metrics.totalExpenses)}
        هامش الربح:           ${metrics.profitMargin}%
        عدد المعاملات:        ${metrics.transactionCount}
        المتوسط اليومي:       ${metrics.dailyAverage} معاملة/يوم
        
        👥 إحصائيات العملاء:
        ───────────────────────────────────────────────────────────
        عدد العملاء:          ${data.clients.length}
        إجمالي الديون:        $${formatNumber(metrics.totalClientDebt)}
        إجمالي الأرصدة:       $${formatNumber(metrics.totalClientCredit)}
        
        🏆 أفضل البائعين:
        ───────────────────────────────────────────────────────────
    `;
    
    const topSellers = Object.entries(metrics.sellerMetrics)
        .sort((a, b) => b[1].profit - a[1].profit)
        .slice(0, 5);
    
    topSellers.forEach((seller, index) => {
        reportContent += `
        ${index + 1}. ${seller[0]}
           الربح: $${formatNumber(seller[1].profit)}
           المعاملات: ${seller[1].count}
           هامش الربح: ${((seller[1].profit / seller[1].revenue) * 100).toFixed(1)}%
        `;
    });
    
    reportContent += `
        
        ═══════════════════════════════════════════════════════════
        تم إنشاء التقرير بواسطة: ${currentUser ? currentUser.username : 'النظام'}
        ═══════════════════════════════════════════════════════════
    `;
    
    return reportContent;
};

window.downloadCustomReport = function(reportType) {
    const reportContent = generateCustomReport(reportType);
    const dataBlob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${reportType}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ تم تحميل التقرير');
};

// ============ 8. نظام المؤشرات الرئيسية KPI ============

window.calculateKPIs = function() {
    const data = getData();
    const metrics = calculateAdvancedMetrics();
    
    return {
        // مؤشرات الربحية
        profitability: {
            netProfit: metrics.netProfit,
            profitMargin: metrics.profitMargin,
            ROI: metrics.totalCost > 0 ? ((metrics.netProfit / metrics.totalCost) * 100).toFixed(2) : 0
        },
        
        // مؤشرات النشاط
        activity: {
            transactionCount: metrics.transactionCount,
            dailyAverage: metrics.dailyAverage,
            clientCount: data.clients.length,
            sellerCount: Object.keys(metrics.sellerMetrics).length
        },
        
        // مؤشرات الديون
        debt: {
            totalDebt: metrics.totalClientDebt,
            averageDebtPerClient: data.clients.length > 0 ? (metrics.totalClientDebt / data.clients.length).toFixed(2) : 0,
            debtRatio: metrics.totalRevenue > 0 ? ((metrics.totalClientDebt / metrics.totalRevenue) * 100).toFixed(2) : 0
        },
        
        // مؤشرات الكفاءة
        efficiency: {
            costRatio: metrics.totalRevenue > 0 ? (((metrics.totalCost + metrics.totalExpenses) / metrics.totalRevenue) * 100).toFixed(2) : 0,
            expenseRatio: metrics.totalRevenue > 0 ? ((metrics.totalExpenses / metrics.totalRevenue) * 100).toFixed(2) : 0,
            operatingDays: metrics.daysActive
        }
    };
};

window.renderKPIDashboard = function() {
    const kpis = calculateKPIs();
    const container = document.getElementById('kpiDashboard');
    
    if (!container) return;
    
    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <!-- Profitability KPIs -->
            <div style="background:linear-gradient(135deg, var(--gold), rgba(200,150,62,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">💰 صافي الربح</div>
                <div style="font-size:1.8rem;font-weight:900;">$${formatNumber(kpis.profitability.netProfit)}</div>
            </div>
            
            <div style="background:linear-gradient(135deg, var(--blue), rgba(52,152,219,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">📊 هامش الربح</div>
                <div style="font-size:1.8rem;font-weight:900;">${kpis.profitability.profitMargin}%</div>
            </div>
            
            <div style="background:linear-gradient(135deg, var(--green), rgba(46,204,113,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">📈 العائد على الاستثمار</div>
                <div style="font-size:1.8rem;font-weight:900;">${kpis.profitability.ROI}%</div>
            </div>
            
            <!-- Activity KPIs -->
            <div style="background:linear-gradient(135deg, var(--purple), rgba(155,89,182,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">📊 المعاملات</div>
                <div style="font-size:1.8rem;font-weight:900;">${kpis.activity.transactionCount}</div>
            </div>
            
            <div style="background:linear-gradient(135deg, var(--red), rgba(231,76,60,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">👥 العملاء</div>
                <div style="font-size:1.8rem;font-weight:900;">${kpis.activity.clientCount}</div>
            </div>
            
            <div style="background:linear-gradient(135deg, #f39c12, rgba(243,156,18,0.2));padding:16px;border-radius:8px;color:white;">
                <div style="font-size:0.8rem;opacity:0.9;margin-bottom:8px;">🏪 البائعون</div>
                <div style="font-size:1.8rem;font-weight:900;">${kpis.activity.sellerCount}</div>
            </div>
        </div>
    `;
};

// ============ 9. نظام التنبيهات الذكية المخصصة ============

window.setupSmartAlerts = function() {
    const kpis = calculateKPIs();
    
    // تنبيه: هامش الربح منخفض
    if (kpis.profitability.profitMargin < 5) {
        createNotification(
            'warning',
            '⚠️ هامش الربح منخفض',
            `هامش الربح الحالي ${kpis.profitability.profitMargin}% أقل من المستهدف`,
            'يرجى مراجعة الأسعار والمصروفات'
        );
    }
    
    // تنبيه: نسبة الديون مرتفعة
    if (kpis.debt.debtRatio > 50) {
        createNotification(
            'warning',
            '⚠️ نسبة الديون مرتفعة',
            `نسبة الديون ${kpis.debt.debtRatio}% من الإيرادات`,
            'يرجى متابعة تحصيل الديون'
        );
    }
    
    // تنبيه: نسبة المصروفات مرتفعة
    if (kpis.efficiency.expenseRatio > 30) {
        createNotification(
            'warning',
            '⚠️ المصروفات مرتفعة',
            `المصروفات تمثل ${kpis.efficiency.expenseRatio}% من الإيرادات`,
            'يرجى تقليل المصروفات غير الضرورية'
        );
    }
    
    // تنبيه: نشاط منخفض
    if (kpis.activity.dailyAverage < 1) {
        createNotification(
            'info',
            'ℹ️ نشاط منخفض',
            'معدل المعاملات اليومي أقل من 1 معاملة',
            'يرجى زيادة الجهود التسويقية'
        );
    }
};

// ============ 10. نظام الإحصائيات المتقدمة ============

window.getAdvancedStatistics = function() {
    const data = getData();
    const kpis = calculateKPIs();
    const metrics = calculateAdvancedMetrics();
    
    return {
        summary: {
            totalRecords: data.profits.length + data.clients.length + data.clientTransactions.length,
            lastUpdated: new Date().toISOString(),
            dataIntegrity: 'سليمة'
        },
        financial: kpis.profitability,
        operational: kpis.activity,
        debtManagement: kpis.debt,
        efficiency: kpis.efficiency,
        trends: {
            profitTrend: metrics.netProfit > 0 ? 'صاعد' : 'هابط',
            activityTrend: metrics.dailyAverage > 1 ? 'مرتفع' : 'منخفض',
            debtTrend: metrics.totalClientDebt > 5000 ? 'مرتفع' : 'منخفض'
        }
    };
};
