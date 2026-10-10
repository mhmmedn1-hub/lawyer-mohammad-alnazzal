const LAWYER_LOGIN_ALIASES = [
  'محمدالنزال',
  'محمد النزال',
  'محمد النزال المحامي',
  'محمد النزال المحامى',
  'mohammad',
  'mohammad alnazzal',
  'mohammad al nazzal',
  'mohammadalnazzal',
  'alnazzal',
  'admin'
];

function normalizeLoginAlias(value) {
  return (normalizeLoginValue(value || '') || '').replace(/\s+/g, '').trim();
}

function matchesLawyerLoginIdentifier(inputValue, aliasValue) {
  const inputKey = normalizeLoginAlias(inputValue);
  const aliasKey = normalizeLoginAlias(aliasValue);

  if (!inputKey || !aliasKey) return false;

  return (
    inputKey === aliasKey ||
    inputKey.includes(aliasKey) ||
    aliasKey.includes(inputKey) ||
    inputKey.replace(/ال/g, '') === aliasKey.replace(/ال/g, '')
  );
}

window.handleLawyerLogin = function() {
  const userVal = document.getElementById('lawyer-user')?.value || '';
  const passVal = document.getElementById('lawyer-pass')?.value || '';
  const remember = document.getElementById('lawyer-remember')?.checked;

  const normalizedInput = normalizeLoginValue(userVal);
  const normalizedPassword = normalizeLoginValue(passVal);

  const aliasMatch = LAWYER_LOGIN_ALIASES.some(alias => matchesLawyerLoginIdentifier(normalizedInput, alias));
  const isLawyerUser = aliasMatch || normalizedInput === 'admin';
  const isCorrectPassword = normalizedPassword === normalizeLoginValue('6503536');

  console.info('[login-debug] lawyer login attempt', {
    user: userVal,
    normalizedInput,
    passwordLength: passVal.trim().length,
    aliasMatch,
    isLawyerUser,
    isCorrectPassword
  });

  if (isLawyerUser && isCorrectPassword) {
    if (remember) {
      localStorage.setItem('lawyer_user', userVal.trim());
      localStorage.setItem('lawyer_pass', passVal.trim());
      localStorage.setItem('lawyer_remember', 'true');
    } else {
      localStorage.removeItem('lawyer_user');
      localStorage.removeItem('lawyer_pass');
      localStorage.setItem('lawyer_remember', 'false');
    }
    document.body.classList.add('in-dashboard');
    document.getElementById('login-page').style.display = 'none';
    showSection('dashboard-overview-section');
    return;
  }

  const debugUser = userVal || '(فارغ)';
  const debugPass = passVal ? '●●●●●●●' : '(فارغ)';
  console.warn('Failed lawyer login', { debugUser, debugPass, normalizedInput, aliasMatch, isCorrectPassword });
  alert('خطأ في بيانات الدخول. يرجى التأكد من صحة اسم المستخدم وكلمة المرور.\n\nالاسم المقبول عادةً: محمد النزال / محمدالنزال / admin');
};

window.handleClientLogin = function() {
  const rawUserInput = document.getElementById('client-user').value;
  const passInput = document.getElementById('client-pass').value.trim();
  const userInput = normalizeLoginValue(rawUserInput);

  if (window.allClients.length === 0) {
    alert('لم تُحمَّل بيانات الموكلين بعد. يرجى الانتظار قليلاً وإعادة المحاولة.');
    return;
  }

  const client = window.allClients.find(c => {
    const username = normalizeLoginValue(c.username);
    const fullname = normalizeLoginValue(c.fullname);
    const email = normalizeLoginValue(c.email);
    const phone = normalizeLoginValue(c.phone);
    const fileNumber = normalizeLoginValue(c.fileNumber);
    const clientId = normalizeLoginValue(c.id);

    const matchesUser = [username, fullname, email, phone, fileNumber, clientId].some(value => value && value === userInput);
    return matchesUser && c.password === passInput;
  });

  if (client) {
    window.currentClient = client;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('client-dashboard-ui').style.display = 'block';
    document.getElementById('display-client-name').textContent = client.fullname;
    loadClientPortalData(client);
  } else {
    alert('خطأ في بيانات الموكل. تأكد من اسم المستخدم أو رقم الملف وكلمة المرور.');
  }
};
