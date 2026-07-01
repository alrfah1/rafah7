// ============ نظام التحقق من صلاحيات المكاتب والتواريخ ============

window.isOfficeAccessAllowed = function(user) {
    // استثناء المدير العام دائماً من التحقق من الصلاحية
    if (!user || user.role === 'admin' || user.username === 'alrfah') return true;
    
    if (user.role !== 'office') return true;
    
    // الحصول على قائمة المكاتب من التخزين المحلي
    const rawOffices = localStorage.getItem('alrefah_offices_list');
    const offices = rawOffices ? JSON.parse(rawOffices) : [];
    const office = offices.find(o => o.id === user.officeId || o.username === user.username);
    
    if (!office) return false;
    if (office.status === 'blocked') return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    
    // تحويل التاريخ الحالي وتواريخ الصلاحية إلى أرقام للمقارنة السهلة (السنة * 100 + الشهر)
    const currentTimeValue = currentYear * 100 + currentMonth;
    const startTimeValue = parseInt(office.startYear) * 100 + parseInt(office.startMonth);
    const endTimeValue = parseInt(office.endYear) * 100 + parseInt(office.endMonth);
    
    // السماح بالدخول إذا كان الوقت الحالي بين وقت البدء ووقت الانتهاء (شاملاً)
    return currentTimeValue >= startTimeValue && currentTimeValue <= endTimeValue;
};

window.checkAndForceLogoutIfExpired = function() {
    if (typeof currentUser !== 'undefined' && currentUser) {
        // لا نتحقق من انتهاء الصلاحية للمدير العام
        if (currentUser.role === 'admin' || currentUser.username === 'alrfah') return true;

        if (currentUser.role === 'office') {
            if (!window.isOfficeAccessAllowed(currentUser)) {
                Swal.fire({
                    title: 'انتهت صلاحية الحساب',
                    text: 'عذراً، انتهت الفترة الزمنية المحددة لصلاحية هذا المكتب. يرجى التواصل مع الإدارة للتجديد.',
                    icon: 'error',
                    confirmButtonColor: '#c8963e',
                    allowOutsideClick: false
                }).then(() => {
                    if (typeof handleLogout === 'function') {
                        handleLogout();
                    } else {
                        location.reload();
                    }
                });
                return false;
            }
        }
    }
    return true;
};

// تفعيل التحقق التلقائي عند كل عملية انتقال في النظام
(function() {
    const originalNavigateTo = window.navigateTo;
    window.navigateTo = function(page) {
        if (window.checkAndForceLogoutIfExpired()) {
            if (typeof originalNavigateTo === 'function') {
                originalNavigateTo(page);
            }
        }
    };
})();
