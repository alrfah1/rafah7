
    // ============ نظام التحقق من صلاحيات المكاتب والتواريخ ============

    function isOfficeAccessAllowed(user) {
        if (!user || user.role !== 'office') return true;
        
        // البحث عن المكتب المرتبط بهذا المستخدم
        const offices = getOffices();
        const office = offices.find(o => o.username === user.username);
        
        if (!office) return false;
        
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        // التحقق من تاريخ البدء
        const startDate = new Date(office.startYear, office.startMonth - 1, 1);
        const endDate = new Date(office.endYear, office.endMonth, 0);
        
        return now >= startDate && now <= endDate;
    }

    function checkOfficeAccessOnLogin() {
        if (!currentUser || currentUser.role !== 'office') return true;
        
        if (!isOfficeAccessAllowed(currentUser)) {
            Swal.fire({
                title: 'انتهت صلاحية الوصول',
                text: 'انتهت فترة الوصول المسموح بها لهذا المكتب',
                icon: 'error',
                confirmButtonColor: '#c8963e'
            }).then(() => {
                handleLogout();
            });
            return false;
        }
        return true;
    }

    // إضافة التحقق عند كل عملية للمستخدم من نوع office
    const originalNavigateTo = window.navigateTo;
    window.navigateTo = function(page) {
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
        originalNavigateTo(page);
    };
