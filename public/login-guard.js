(function () {
  if (window.__lawyerLoginGuardLoaded) return;
  window.__lawyerLoginGuardLoaded = true;

  function hasRequiredLoginFields() {
    return !!(
      document.getElementById('lawyer-user') &&
      document.getElementById('lawyer-pass') &&
      document.getElementById('client-user') &&
      document.getElementById('client-pass')
    );
  }

  function ensureFirebaseInitialization() {
    if (window.firebaseApp && window.firebaseAuth && window.firebaseDb) {
      return true;
    }

    if (typeof initializeApp === 'function' && typeof firebaseConfig !== 'undefined') {
      try {
        const app = initializeApp(firebaseConfig);
        const auth = typeof getAuth === 'function' ? getAuth(app) : null;
        const db = typeof getFirestore === 'function' ? getFirestore(app) : null;
        window.firebaseApp = app;
        if (auth) window.firebaseAuth = auth;
        if (db) window.firebaseDb = db;
        console.info('[login-guard] Firebase initialized successfully');
        return true;
      } catch (e) {
        console.warn('[login-guard] Firebase init failed', e);
        return false;
      }
    }

    if (window.firebase && typeof window.firebase.initializeApp === 'function') {
      try {
        if (!window.firebase.apps || !window.firebase.apps.length) {
          window.firebase.initializeApp(window.firebaseConfig || {});
        }
        window.firebaseApp = window.firebase.app();
        try { window.firebaseAuth = window.firebase.auth(); } catch (e) {}
        try { window.firebaseDb = window.firebase.firestore(); } catch (e) {}
        console.info('[login-guard] Namespaced Firebase initialized successfully');
        return true;
      } catch (e) {
        console.warn('[login-guard] Namespaced Firebase init failed', e);
        return false;
      }
    }

    console.warn('[login-guard] Firebase not available yet. Login checks will continue but the app may fail silently until SDK loads.');
    return false;
  }

  window.assertLoginReady = function () {
    const missing = [];
    ['lawyer-user', 'lawyer-pass', 'client-user', 'client-pass'].forEach((id) => {
      if (!document.getElementById(id)) missing.push(id);
    });

    if (missing.length) {
      console.warn('[login-guard] Missing login inputs:', missing);
      return false;
    }

    return true;
  };

  window.safeLoginGuard = function () {
    if (!hasRequiredLoginFields()) {
      console.warn('[login-guard] Login form not ready yet.');
      return false;
    }

    const fbReady = ensureFirebaseInitialization();
    if (!fbReady) {
      console.warn('[login-guard] Firebase was not ready; the app will continue with a warning instead of failing silently.');
    }

    return true;
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.assertLoginReady()) {
      window.safeLoginGuard();
    }
  });
})();
