const AUTH_MESSAGES = {
	'auth/email-already-in-use': 'هذا البريد مسجل مسبقاً. اختر تسجيل الدخول.',
	'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
	'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
	'auth/weak-password': 'اختر كلمة مرور أقوى وفق إعدادات Firebase.',
	'auth/user-disabled': 'هذا الحساب معطّل. تواصل مع الإدارة.',
	'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
	'auth/network-request-failed': 'تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً.',
	'auth/operation-not-allowed': 'تسجيل البريد وكلمة المرور غير مفعّل. فعّله من Firebase: Authentication ثم Sign-in method.',
	'auth/configuration-not-found': 'خدمة Authentication غير مفعّلة في المشروع. افتحها في Firebase واضغط Get started.',
	'auth/operation-not-supported-in-this-environment': 'افتح الموقع عبر رابط http أو https أو خادم محلي، لا مباشرة من الملف.',
	'auth/unauthorized-domain': 'هذا النطاق غير مضاف: Authentication ثم Settings ثم Authorized domains.',
	'auth/invalid-api-key': 'مفتاح API غير صحيح أو مقيّد بنطاق آخر. راجع firebase-config.js.',
	'permission-denied': 'قواعد Firestore تمنع العملية. انشر ملف firestore.rules ثم أعد المحاولة.',
	'unavailable': 'خدمة قاعدة البيانات غير متاحة الآن. حاول بعد قليل.'
};
const jsWarning = document.querySelector('#js-warning');
if (jsWarning) {
	if (location.protocol === 'file:') jsWarning.textContent = 'أنت تفتح الملف مباشرة من الجهاز، وتسجيل الدخول لا يعمل هكذا. شغّل خادماً محلياً أو افتح الرابط المنشور.';
	else jsWarning.hidden = true;
}
const destinationFilter = document.querySelector('#destination-filter');
const regionCards = [...document.querySelectorAll('[data-region]')];
const authModal = document.querySelector('#auth-modal');
const authForm = document.querySelector('#auth-form');
const authError = document.querySelector('#auth-error');
const guestActions = document.querySelector('#guest-actions');
const signedInActions = document.querySelector('#signed-in-actions');
let selectedRole = 'tourist';
let selectedMode = 'signin';
let firebaseServices;

function applyRegionFilter(region) {
	destinationFilter.value = region;
	regionCards.forEach((card) => { card.hidden = region !== 'all' && card.dataset.region !== region; });
	window.DaleelFeatures?.region(region);
	document.querySelector('#destinations').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('#search-form').addEventListener('submit', (event) => {
	event.preventDefault();
	applyRegionFilter(destinationFilter.value);
});
regionCards.forEach((card) => {
	const choose = () => applyRegionFilter(card.dataset.region);
	card.addEventListener('click', choose);
	card.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
	});
});
document.querySelector('#show-all').addEventListener('click', () => applyRegionFilter('all'));

function updateAuthForm() {
	const isSignup = selectedMode === 'signup';
	document.querySelectorAll('[data-signup-only]').forEach((field) => {
		field.hidden = !isSignup;
		field.required = isSignup && field.id === 'auth-name';
	});
	document.querySelectorAll('[data-guide-only]').forEach((field) => {
		field.hidden = !(isSignup && selectedRole === 'guide');
		field.required = isSignup && selectedRole === 'guide';
	});
	document.querySelector('#auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
			document.querySelector('#forgot-password').hidden = isSignup;
	document.querySelector('#auth-submit').textContent = isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول';
	document.querySelectorAll('[data-role]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.role === selectedRole)));
	document.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === selectedMode)));
	authError.textContent = '';
}

function openAuth(role = 'tourist') {
	selectedRole = role;
	selectedMode = 'signin';
	updateAuthForm();
	authModal.classList.add('open');
	document.querySelector('#auth-email').focus();
}

function showSignedInAccount(user, profile) {
	const roleName = profile.role === 'guide' ? 'مرشد سياحي' : 'سائح';
	document.querySelector('#account-label').textContent = `${user.displayName || user.email} · ${roleName}`;
	guestActions.hidden = true;
	signedInActions.hidden = false;
	authModal.classList.remove('open');
	window.DaleelFeatures?.signedIn(user, profile);
}

function showSignedOutAccount() {
	signedInActions.hidden = true;
	guestActions.hidden = false;
	window.DaleelFeatures?.signedOut();
}

document.querySelectorAll('[data-open-auth]').forEach((button) => button.addEventListener('click', () => openAuth(button.dataset.openAuth)));
document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', () => {
	selectedRole = button.dataset.role;
	updateAuthForm();
}));
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
	selectedMode = button.dataset.mode;
	updateAuthForm();
}));
document.querySelector('#close-auth').addEventListener('click', () => authModal.classList.remove('open'));
document.querySelector('#browse-public').addEventListener('click', () => authModal.classList.remove('open'));
authModal.addEventListener('click', (event) => { if (event.target === authModal) authModal.classList.remove('open'); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') authModal.classList.remove('open'); });
document.querySelector('#signout-button').addEventListener('click', async () => {
	try {
		const { auth, authSdk } = await getFirebaseServices();
		await authSdk.signOut(auth);
		showSignedOutAccount();
	} catch (error) {
		openAuth();
		authError.textContent = error.message || 'تعذر تسجيل الخروج.';
	}
});

async function getFirebaseServices() {
	if (firebaseServices) return firebaseServices;
	const config = window.DALEEL_FIREBASE_CONFIG;
	if (!config || !config.apiKey || !config.projectId || !config.authDomain) {
		throw new Error('يلزم إعداد مشروع Firebase أولاً. لم يتم حفظ أي بيانات.');
	}
	const version = '11.10.0';
	const [appSdk, authSdk, firestoreSdk] = await Promise.all([
		import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
		import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
		import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
	]);
	const app = appSdk.initializeApp(config);
	firebaseServices = {
		auth: authSdk.initializeAuth(app, { persistence: [authSdk.indexedDBLocalPersistence, authSdk.browserLocalPersistence] }),
		authSdk,
		db: firestoreSdk.getFirestore(app),
		firestoreSdk
	};
	return firebaseServices;
}

async function validateSession(user, auth, authSdk, db, firestoreSdk) {
	if (!user) {
		showSignedOutAccount();
		return;
	}
	try {
		const profile = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'users', user.uid));
		const data = profile.exists() ? profile.data() : null;
		const validRole = data && ['tourist', 'guide'].includes(data.role);
		const approvedGuide = data?.role !== 'guide' || data?.guideStatus === 'approved';
		if (!validRole || !approvedGuide) {
			await authSdk.signOut(auth);
			showSignedOutAccount();
			openAuth(data?.role === 'guide' ? 'guide' : 'tourist');
			authError.textContent = 'الحساب غير معتمد أو لا يملك ملفاً صالحاً.';
			return;
		}
		showSignedInAccount(user, data);
	} catch {
		await authSdk.signOut(auth);
		showSignedOutAccount();
	}
}

if (window.DALEEL_FIREBASE_CONFIG?.apiKey) {
	getFirebaseServices().then(({ auth, authSdk, db, firestoreSdk }) => {
		authSdk.onAuthStateChanged(auth, (user) => validateSession(user, auth, authSdk, db, firestoreSdk));
	}).catch(() => {});
}

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!authForm.reportValidity()) return;
	const submitButton = document.querySelector('#auth-submit');
	const email = document.querySelector('#auth-email').value.trim();
	const password = document.querySelector('#auth-password').value;
	const name = document.querySelector('#auth-name').value.trim();
	const phone = document.querySelector('#auth-phone').value.trim();
	const licenseNumber = document.querySelector('#auth-license').value.trim();
	submitButton.disabled = true;
	authError.textContent = '';
	let activeAuth;
	let activeAuthSdk;
	let createdAccount = false;
	try {
		const { auth, authSdk, db, firestoreSdk } = await getFirebaseServices();
		activeAuth = auth;
		activeAuthSdk = authSdk;
		if (selectedMode === 'signup') {
			const credential = await authSdk.createUserWithEmailAndPassword(auth, email, password);
			createdAccount = true;
			await authSdk.updateProfile(credential.user, { displayName: name });
			if (selectedRole === 'guide') {
				await firestoreSdk.setDoc(firestoreSdk.doc(db, 'registrationRequests', credential.user.uid), {
					uid: credential.user.uid,
					requestedRole: selectedRole,
					fullName: name,
					phone,
					licenseNumber,
					status: 'pending',
					submittedAt: firestoreSdk.serverTimestamp()
				});
			} else {
				await firestoreSdk.setDoc(firestoreSdk.doc(db, 'users', credential.user.uid), {
					role: 'tourist',
					status: 'active',
					createdAt: firestoreSdk.serverTimestamp()
				});
			}
			await authSdk.signOut(auth);
			createdAccount = false;
			authError.textContent = selectedRole === 'guide'
				? 'تم استلام طلب المرشد. لا يُفعّل الحساب قبل مراجعة الترخيص من الإدارة.'
				: 'تم إنشاء حساب السائح. سجّل الدخول للمتابعة.';
		} else {
			const credential = await authSdk.signInWithEmailAndPassword(auth, email, password);
			const profile = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'users', credential.user.uid));
			if (!profile.exists() || profile.data().role !== selectedRole) {
				await authSdk.signOut(auth);
				throw new Error('تعذر التحقق من نوع الحساب. تأكد من الاختيار أو تواصل مع الإدارة.');
			}
			if (selectedRole === 'guide' && profile.data().guideStatus !== 'approved') {
				await authSdk.signOut(auth);
				throw new Error('حساب المرشد بانتظار اعتماد الترخيص من الإدارة.');
			}
			showSignedInAccount(credential.user, profile.data());
		}
	} catch (error) {
		if (createdAccount && activeAuth?.currentUser && activeAuthSdk) {
			await activeAuthSdk.signOut(activeAuth).catch(() => {});
		}
		const messages = AUTH_MESSAGES;
		authError.textContent = messages[error.code] || (/dynamically imported|Failed to fetch/i.test(error.message || '') ? 'تعذر تحميل مكتبة Firebase. تحقق من الإنترنت ومن أن ترويسات الأمان في firebase.json لم تُعدَّل.' : error.message) || 'تعذر إكمال العملية. حاول مرة أخرى.';
	} finally {
		document.querySelector('#auth-password').value = '';
		submitButton.disabled = false;
	}
});
	
document.querySelector('#forgot-password').addEventListener('click', async () => {
	const email = document.querySelector('#auth-email').value.trim();
	if (!email) { authError.textContent = 'اكتب بريدك الإلكتروني أولاً.'; return; }
	try {
		const { auth, authSdk } = await getFirebaseServices();
		await authSdk.sendPasswordResetEmail(auth, email);
	} catch (error) {
		if (error.code !== 'auth/user-not-found') { authError.textContent = AUTH_MESSAGES[error.code] || error.message || 'تعذر الإرسال.'; return; }
	}
	authError.textContent = 'إن كان البريد مسجلاً فسيصلك رابط لإعادة تعيين كلمة المرور.';
});
