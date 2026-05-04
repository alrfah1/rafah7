// ============ Firebase Configuration ============
// تم تحديث هذا الملف بالبيانات الجديدة لنظام مكتب الرفاه
// البيانات السحابية: المكاتب والمستخدمين فقط
// البيانات المحلية: المعاملات والعملاء والأرباح

const firebaseConfig = {
    apiKey: "AIzaSyDUDHGhGdM-jcNYnS9tZJuFnYJxcuv8E9o",
    authDomain: "al-rafah-system.firebaseapp.com",
    projectId: "al-rafah-system",
    storageBucket: "al-rafah-system.firebasestorage.app",
    messagingSenderId: "12037502402",
    appId: "1:12037502402:web:f68fc375275879942f125b",
    measurementId: "G-7TBZFQT2QS"
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
    const USERS_KEY = 'alrefah_users_list';
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
    const USERS_KEY = 'alrefah_users_list';
    if (!firebaseDb) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return;
    }
    
    try {
        const usersObj = {};
        users.forEach((user) => {
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
    const OFFICES_KEY = 'alrefah_offices_list';
    if (!firebaseDb) {
        // استخدام localStorage كـ fallback
        const raw = localStorage.getItem(OFFICES_KEY);
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
    const OFFICES_KEY = 'alrefah_offices_list';
    if (!firebaseDb) {
        localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
        return;
    }
    
    try {
        const officesObj = {};
        offices.forEach((office) => {
            officesObj[office.id] = office;
        });
        await firebaseDb.ref('offices').set(officesObj);
        console.log('✅ Offices saved to Firebase');
    } catch (error) {
        console.error('Error saving offices to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
    }
}

// ============ Delete Office by ID ============
async function deleteCloudOffice(officeId) {
    try {
        const offices = await getCloudOffices();
        const filteredOffices = offices.filter(o => o.id !== officeId);
        await saveCloudOffices(filteredOffices);
        
        // حذف المستخدمين المرتبطين بهذا المكتب
        const users = await getCloudUsers();
        const filteredUsers = users.filter(u => u.officeId !== officeId);
        await saveCloudUsers(filteredUsers);
        
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

// ============ Initialize on Page Load ===========
document.addEventListener('DOMContentLoaded', () => {
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js';
    firebaseScript.onload = () => {
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js';
        dbScript.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js';
            authScript.onload = () => {
                initializeFirebase();
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(dbScript);
    };
    document.head.appendChild(firebaseScript);
});
