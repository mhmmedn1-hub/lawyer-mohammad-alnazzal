## خطة تحديث الواجهة (فخمة/عصرية/قانونية) — LawAPP

### تم جمعه من الكود الحالي
- ملف الواجهة الرئيسي يحتوي على CSS كبير داخل `index.html` (مكرر/متضارب مع `public/index.html`).
- يوجد `theme/pro.css` لكن لا يتم استخدامه بالكامل داخل الصفحة بسبب وجود CSS مكرر داخل `index.html`.
- المنطق يعمل عبر `public/script.js` (ديناميكية الأقسام + Firebase) ويدعم `window.showSection`.

### هدف التحديث
- توحيد الستايل ليصير حديث/فخم (نمط محاكم/مكاتب قانونية) بدون كسر منطق Firebase أو JS.

### خطوات التنفيذ
1. **توحيد نقطة الدخول**: اعتماد `index.html` واحد فقط (يفضل `public/index.html` كـ SPA entry أو الاحتفاظ بـ root) وإلغاء التكرار.
2. **استخراج الثيم إلى ملف CSS واحد**: نقل CSS داخل `index.html` إلى `public/styles/theme-ui.css` أو تعديل ربط `theme/pro.css` بحيث يغطي كل شيء.
3. **تحسين Glassmorphism بشكل منضبط**: توحيد: ألوان الحدود، الظلال، radius، hover/focus.
4. **توحيد أزرار احترافية**: زر ذهبي/أزرق/أحمر مع states واضحة (hover/active/disabled).
5. **توحيد الجداول**: head gradient ذهبي خفيف + خطوط separation + hover row.
6. **تحسين Modals**: طبقة إغلاق واضحة + زر close متوافق مع RTL + منع scroll bleed.
7. **إضافة Toast/Loading Skeleton خفيف**: بدون أي تغيير في بنية Firebase.
8. **تدقيق RTL**: التأكد من `text-align` و `transform` و alignment في المودال والبطاقات.
9. **تحسينات “هيبة” قانونية**: إضافة عناصر زخرفية subtle (divider ذهبي، shadow halos) بدل عشوائية inline styles.
10. **اختبار سريع**: 
    - تسجيل دخول محامي/موكل
    - تبديل الأقسام
    - فتح مودال
    - تشغيل التصدير PDF

### مخرجات مطلوبة
- ملف CSS موحد
- تعديل ربط CSS في ملف الـ HTML المعتمد
- تنظيف جزء بسيط من CSS داخل الـ HTML (بدون تغيير الـ layout الأساسي)


