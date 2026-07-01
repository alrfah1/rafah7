// ============ Firebase Configuration ============
// تم تحديث هذا الملف لإضافة دعم Firebase كامل
// البيانات السحابية: المكاتب والمستخدمين فقط
// البيانات المحلية: المعاملات والعملاء والأرباح

const firebaseConfig = {
    apiKey: "AIzaSyCPfcY9vWtwoubuaJLYqbrUIZfkysl3wmA",
    authDomain: "alrfah.firebaseapp.com",
    databaseURL: "https://alrfah-default-rtdb.firebaseio.com",
    projectId: "alrfah",
    storageBucket: "alrfah.firebasestorage.app",
    messagingSenderId: "471068000767",
    appId: "1:471068000767:web:153e0f33e192632188a7ca",
    measurementId: "G-LECK6S5JJY"
};

// Initialize Firebase
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let firebaseInitialized = false;

function initializeFirebase() {
    try {
        // تحميل Firebase من CDN
        if (!window.firebase) {
            console.warn('⚠️ Firebase SDK not loaded. Using local storage only.');
            return false;
        }
        
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database(firebaseApp);
        firebaseAuth = firebase.auth(firebaseApp);
        firebaseInitialized = true;
        
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase initialization failed:', error.message);
        console.log('📱 Using local storage as fallback');
        firebaseInitialized = false;
        return false;
    }
}

// ============ Cloud Users Management ============
async function getCloudUsers() {
    if (!firebaseDb || !firebaseInitialized) {
        // استخدام localStorage كـ fallback
        const raw = localStorage.getItem('alrefah_users_list');
        const defaultUsers = [
            { 
                username: 'alrfah', 
                password: 'Mirage09..', 
                role: 'admin', 
                status: 'active', 
                createdAt: new Date().toISOString(),
                officeId: null
            }
        ];
        return raw ? JSON.parse(raw) : defaultUsers;
    }
    
    try {
        const snapshot = await firebaseDb.ref('users').once('value');
        const data = snapshot.val();
        
        if (!data) {
            // إذا لم تكن هناك بيانات في Firebase، استخدم البيانات الافتراضية
            const defaultUsers = [
                { 
                    username: 'alrfah', 
                    password: 'Mirage09..', 
                    role: 'admin', 
                    status: 'active', 
                    createdAt: new Date().toISOString(),
                    officeId: null
                }
            ];
            // حفظ البيانات الافتراضية في Firebase
            await saveCloudUsers(defaultUsers);
            return defaultUsers;
        }
        
        return Object.values(data);
    } catch (error) {
        console.error('❌ Error fetching users from Firebase:', error);
        // العودة إلى localStorage عند الفشل
        const raw = localStorage.getItem('alrefah_users_list');
        const defaultUsers = [
            { 
                username: 'alrfah', 
                password: 'Mirage09..', 
                role: 'admin', 
                status: 'active', 
                createdAt: new Date().toISOString(),
                officeId: null
            }
        ];
        return raw ? JSON.parse(raw) : defaultUsers;
    }
}

async function saveCloudUsers(users) {
    if (!firebaseDb || !firebaseInitialized) {
        localStorage.setItem('alrefah_users_list', JSON.stringify(users));
        return;
    }
    
    try {
        const usersObj = {};
        users.forEach((user, index) => {
            usersObj[user.username] = user;
        });
        await firebaseDb.ref('users').set(usersObj);
        console.log('✅ Users saved to Firebase');
        // حفظ في localStorage أيضاً كـ backup
        localStorage.setItem('alrefah_users_list', JSON.stringify(users));
    } catch (error) {
        console.error('❌ Error saving users to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('alrefah_users_list', JSON.stringify(users));
    }
}

// ============ Cloud Offices Management ============
async function getCloudOffices() {
    if (!firebaseDb || !firebaseInitialized) {
        // استخدام localStorage كـ fallback
        const raw = localStorage.getItem('alrefah_offices_list');
        return raw ? JSON.parse(raw) : [];
    }
    
    try {
        const snapshot = await firebaseDb.ref('offices').once('value');
        const data = snapshot.val();
        return data ? Object.values(data) : [];
    } catch (error) {
        console.error('❌ Error fetching offices from Firebase:', error);
        // العودة إلى localStorage عند الفشل
        const raw = localStorage.getItem('alrefah_offices_list');
        return raw ? JSON.parse(raw) : [];
    }
}

async function saveCloudOffices(offices) {
    if (!firebaseDb || !firebaseInitialized) {
        localStorage.setItem('alrefah_offices_list', JSON.stringify(offices));
        return;
    }
    
    try {
        const officesObj = {};
        offices.forEach((office, index) => {
            officesObj[office.id || index] = office;
        });
        await firebaseDb.ref('offices').set(officesObj);
        console.log('✅ Offices saved to Firebase');
        // حفظ في localStorage أيضاً كـ backup
        localStorage.setItem('alrefah_offices_list', JSON.stringify(offices));
    } catch (error) {
        console.error('❌ Error saving offices to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('alrefah_offices_list', JSON.stringify(offices));
    }
}

// ============ Add New Office ============
async function addCloudOffice(office) {
    try {
        let offices = await getCloudOffices();
        office.id = office.id || Date.now().toString();
        office.createdAt = new Date().toISOString();
        offices.push(office);
        
        await saveCloudOffices(offices);
        
        // إضافة مستخدم للمكتب الجديد
        let users = await getCloudUsers();
        const newUser = {
            username: office.username,
            password: office.password,
            role: 'office',
            status: 'active',
            officeId: office.id,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        await saveCloudUsers(users);
        
        return { success: true, office };
    } catch (error) {
        console.error('❌ Error adding office:', error);
        return { success: false, message: error.message };
    }
}

// ============ Update Office ============
async function updateCloudOffice(officeId, updates) {
    try {
        let offices = await getCloudOffices();
        const index = offices.findIndex(o => o.id === officeId);
        
        if (index === -1) {
            return { success: false, message: 'المكتب غير موجود' };
        }
        
        offices[index] = { ...offices[index], ...updates, updatedAt: new Date().toISOString() };
        await saveCloudOffices(offices);
        
        return { success: true, office: offices[index] };
    } catch (error) {
        console.error('❌ Error updating office:', error);
        return { success: false, message: error.message };
    }
}

// ============ Delete Office ============
async function deleteCloudOffice(officeId) {
    try {
        let offices = await getCloudOffices();
        offices = offices.filter(o => o.id !== officeId);
        await saveCloudOffices(offices);
        
        // حذف المستخدمين المرتبطين بالمكتب
        let users = await getCloudUsers();
        users = users.filter(u => u.officeId !== officeId);
        await saveCloudUsers(users);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting office:', error);
        return { success: false, message: error.message };
    }
}

// ============ Get Office by ID ============
async function getCloudOfficeById(officeId) {
    try {
        const offices = await getCloudOffices();
        return offices.find(o => o.id === officeId) || null;
    } catch (error) {
        console.error('❌ Error fetching office:', error);
        return null;
    }
}

// ============ Hybrid Login Function ============
async function handleCloudLogin(username, password) {
    try {
        // محاولة الحصول على المستخدمين من السحابة
        let users = await getCloudUsers();
        
        // إذا لم يكن هناك اتصال بـ Firebase، استخدم localStorage
        if (!users || users.length === 0) {
            users = getUsers(); // من script.js
        }
        
        const found = users.find(u => u.username === username && u.password === password);
        
        if (found) {
            if (found.status === 'blocked') {
                return { success: false, message: 'الحساب محظور' };
            }
            
            // تحديث آخر دخول
            found.lastLogin = new Date().toISOString();
            
            // حفظ في السحابة
            if (firebaseDb && firebaseInitialized) {
                await saveCloudUsers(users);
            }
            
            return { success: true, user: found };
        }
        
        return { success: false, message: 'بيانات الدخول غير صحيحة' };
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, message: 'حدث خطأ في الدخول' };
    }
}

// ============ Real-time Sync Listener ============
function setupOfficesListener(callback) {
    if (!firebaseDb || !firebaseInitialized) {
        console.warn('⚠️ Firebase not initialized, cannot setup listener');
        return;
    }
    
    try {
        firebaseDb.ref('offices').on('value', (snapshot) => {
            const data = snapshot.val();
            const offices = data ? Object.values(data) : [];
            console.log('🔄 Offices updated from Firebase:', offices);
            if (callback) callback(offices);
        });
    } catch (error) {
        console.error('❌ Error setting up listener:', error);
    }
}

// ============ Cloud Data Management (Profits, Clients, Transactions) ============
async function getCloudData(officeId) {
    if (!firebaseDb || !firebaseInitialized || !officeId) return null;
    try {
        const snapshot = await firebaseDb.ref(`data/${officeId}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('❌ Error fetching cloud data:', error);
        return null;
    }
}

async function saveCloudData(officeId, data) {
    if (!firebaseDb || !firebaseInitialized || !officeId) return;
    try {
        await firebaseDb.ref(`data/${officeId}`).set(data);
        console.log(`✅ Data for office ${officeId} saved to Firebase`);
    } catch (error) {
        console.error('❌ Error saving cloud data:', error);
    }
}

function setupDataListener(officeId, callback) {
    if (!firebaseDb || !firebaseInitialized || !officeId) return;
    try {
        firebaseDb.ref(`data/${officeId}`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && callback) callback(data);
        });
    } catch (error) {
        console.error('❌ Error setting up data listener:', error);
    }
}

// ============ Initialize on Page Load ============
document.addEventListener('DOMContentLoaded', () => {
    // محاولة تحميل Firebase
    if (window.firebase) {
        initializeFirebase();
    } else {
        console.warn('⚠️ Firebase SDK not available, will use localStorage');
    }
});
