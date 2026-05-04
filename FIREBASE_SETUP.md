# إعداد Firebase للنظام المحاسبي

## 📋 الخطوات:

### 1. إنشاء مشروع Firebase مجاني

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. انقر على "Create Project"
3. أدخل اسم المشروع (مثل: alrefah-accounting)
4. اختر "Create project"

### 2. إضافة Realtime Database

1. في لوحة التحكم، اذهب إلى "Realtime Database"
2. انقر على "Create Database"
3. اختر "Start in test mode" (للتطوير)
4. اختر المنطقة الجغرافية الأقرب إليك

### 3. الحصول على بيانات الاتصال

1. في لوحة التحكم، اذهب إلى "Project Settings"
2. اختر "Service Accounts"
3. انقر على "Database Secrets"
4. انسخ بيانات الاتصال

### 4. تحديث firebase-config.js

افتح ملف `firebase-config.js` وقم بتحديث البيانات:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 5. تعيين قواعد الأمان (Security Rules)

في Firebase Console:
1. اذهب إلى "Realtime Database"
2. انقر على "Rules"
3. استبدل القواعد بـ:

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "offices": {
      ".read": true,
      ".write": true
    }
  }
}
```

⚠️ **ملاحظة**: هذه القواعس للتطوير فقط. في الإنتاج، استخدم قواعس أكثر أماناً.

## 🔐 ملاحظات الأمان:

- البيانات السحابية: **المكاتب والمستخدمين فقط**
- البيانات المحلية: **المعاملات والعملاء والأرباح** (تُحفظ في جهاز المستخدم)
- إذا لم تقم بإعداد Firebase، سيستخدم النظام localStorage تلقائياً

## ✅ اختبار الاتصال:

1. افتح المتصفح وانقر على F12
2. افتح Console
3. يجب أن ترى رسالة: "✅ Firebase initialized successfully"

إذا رأيت: "⚠️ Firebase initialization failed"، فسيستخدم النظام localStorage كـ fallback.

## 📱 الاستخدام:

- **المدير العام**: يمكنه إضافة مكاتب جديدة
- **المكاتب الفرعية**: تسجيل دخول من أي جهاز باستخدام بيانات المكتب
- **البيانات المحلية**: تُحفظ في كل جهاز بشكل منفصل

---

**تم التحديث**: 2026-05-03
