// ============ Firebase Configuration ============
// تم تحديث هذا الملف لإضافة دعم Firebase
// البيانات السحابية: المكاتب والمستخدمين فقط
// البيانات المحلية: المعاملات والعملاء والأرباح

const firebaseConfig = {
    apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxx", // استبدل بـ API Key الخاص بك
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

function initializeFirebase() {
    try {
        // تحميل Firebase من CDN
        if (!window.firebase) {
            console.warn('Firebase SDK not loaded. Using local storage only.');
            return false;
        }
        
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database(firebaseApp);
        firebaseAuth = firebase.auth(firebaseApp);
        
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase initialization failed:', error.message);
        console.log('📱 Using local storage as fallback');
        return false;
    }
}

// ============ Cloud Users Management ============
async function getCloudUsers() {
    if (!firebaseDb) {
        // استخدام localStorage كـ fallback
        const raw = localStorage.getItem(USERS_KEY);
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
        return data ? Object.values(data) : [];
    } catch (error) {
        console.error('Error fetching users from Firebase:', error);
        return [];
    }
}

async function saveCloudUsers(users) {
    if (!firebaseDb) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return;
    }
    
    try {
        const usersObj = {};
        users.forEach((user, index) => {
            usersObj[user.username] = user;
        });
        await firebaseDb.ref('users').set(usersObj);
        console.log('✅ Users saved to Firebase');
    } catch (error) {
        console.error('Error saving users to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
}

// ============ Cloud Offices Management ============
async function getCloudOffices() {
    if (!firebaseDb) {
        // استخدام localStorage كـ fallback
        const raw = localStorage.getItem('OFFICES_KEY');
        return raw ? JSON.parse(raw) : [];
    }
    
    try {
        const snapshot = await firebaseDb.ref('offices').once('value');
        const data = snapshot.val();
        return data ? Object.values(data) : [];
    } catch (error) {
        console.error('Error fetching offices from Firebase:', error);
        return [];
    }
}

async function saveCloudOffices(offices) {
    if (!firebaseDb) {
        localStorage.setItem('OFFICES_KEY', JSON.stringify(offices));
        return;
    }
    
    try {
        const officesObj = {};
        offices.forEach((office, index) => {
            officesObj[office.id || index] = office;
        });
        await firebaseDb.ref('offices').set(officesObj);
        console.log('✅ Offices saved to Firebase');
    } catch (error) {
        console.error('Error saving offices to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('OFFICES_KEY', JSON.stringify(offices));
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
            if (firebaseDb) {
                await saveCloudUsers(users);
            }
            
            return { success: true, user: found };
        }
        
        return { success: false, message: 'بيانات الدخول غير صحيحة' };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'حدث خطأ في الدخول' };
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
        console.error('Error adding office:', error);
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
        console.error('Error updating office:', error);
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
        console.error('Error deleting office:', error);
        return { success: false, message: error.message };
    }
}

// ============ Get Office by ID ============
async function getCloudOfficeById(officeId) {
    try {
        const offices = await getCloudOffices();
        return offices.find(o => o.id === officeId) || null;
    } catch (error) {
        console.error('Error fetching office:', error);
        return null;
    }
}

// ============ Initialize on Page Load ============
document.addEventListener('DOMContentLoaded', () => {
    // محاولة تحميل Firebase
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
    firebaseScript.onload = () => {
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';
        dbScript.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
            authScript.onload = () => {
                initializeFirebase();
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(dbScript);
    };
    document.head.appendChild(firebaseScript);
});
