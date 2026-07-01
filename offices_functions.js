
    // ============ دوال إدارة المكاتب ============
    
    const OFFICES_KEY = 'alrefah_offices_list';

    function getOffices() {
        const raw = localStorage.getItem(OFFICES_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function saveOffices(offices) {
        // حفظ في localStorage
        localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
        
        // محاولة حفظ في Firebase إذا كان متاحاً
        if (typeof saveCloudOffices === 'function' && firebaseInitialized) {
            saveCloudOffices(offices).then(() => {
                console.log('✅ تم حفظ المكاتب في Firebase بنجاح');
            }).catch(error => {
                console.warn('⚠️ فشل حفظ المكاتب في Firebase:', error.message);
            });
        }
    }

    function generateOfficeId() {
        return 'office_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

        // التحقق من عدم تكرار اسم المستخدم
        if (!editId && users.find(u => u.username === username)) {
            return Swal.fire({ title: 'اسم المستخدم موجود بالفعل', icon: 'error' });
        }

        if (editId) {
            // تعديل مكتب موجود
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

                // تحديث بيانات المستخدم إذا تغير الاسم
                const userIndex = users.findIndex(u => u.username === oldUsername);
                if (userIndex !== -1) {
                    users[userIndex].username = username;
                    users[userIndex].password = password;
                }

                saveOffices(offices);
                saveUsers(users);
                addAuditEntry('تعديل', `تعديل بيانات المكتب: ${name}`, `المدير: ${managerName}`);
                showToast('✅ تم تحديث بيانات المكتب بنجاح');
            }
        } else {
            // إضافة مكتب جديد
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

            // إضافة المستخدم الجديد
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
            
            // رسالة تأكيد مع حالة Firebase
            if (firebaseInitialized) {
                showToast('✅ تم إنشاء المكتب وحفظه في Firebase');
            } else {
                showToast('⚠️ تم إنشاء المكتب محلياً (لا يوجد اتصال Firebase)');
            }
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
                    // حذف المستخدم المرتبط
                    users = users.filter(u => u.username !== office.username);
                    
                    // حذف المكتب
                    offices = offices.filter(o => o.id !== officeId);
                    
                    saveOffices(offices);
                    saveUsers(users);
                    addAuditEntry('حذف', `حذف المكتب: ${office.name}`, `المدير: ${office.managerName}`);
                    showToast('✅ تم حذف المكتب بنجاح');
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
            
            // تحديث حالة المستخدم المرتبط
            let users = getUsers();
            const user = users.find(u => u.username === office.username);
            if (user) {
                user.status = newStatus;
            }
            
            saveOffices(offices);
            saveUsers(users);
            addAuditEntry('إدارة', `${newStatus === 'blocked' ? 'حظر' : 'تفعيل'} المكتب: ${office.name}`);
            showToast(newStatus === 'blocked' ? '🔒 تم حظر المكتب' : '✅ تم تفعيل المكتب');
            renderOffices();
        }
    };

    async function renderOffices() {
        // تحميل البيانات من Firebase إذا كانت متاحة
        let offices = getOffices();
        if (firebaseInitialized && typeof getCloudOffices === 'function') {
            try {
                offices = await getCloudOffices();
                localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
                console.log('✅ تم تحميل المكاتب من Firebase في renderOffices');
            } catch (error) {
                console.warn('⚠️ فشل تحميل المكاتب من Firebase، استخدام البيانات المحلية');
            }
        }
        
        const tbody = document.getElementById('officesTableBody');
        const emptyState = document.getElementById('officesEmpty');

        if (offices.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        const monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        
        tbody.innerHTML = offices.map(office => `
            <tr data-office-id="${office.id}" data-firebase-synced="${firebaseInitialized ? 'yes' : 'no'}">
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
