(() => {
	'use strict';
	const $ = (s) => document.querySelector(s);
	const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
	const C = { muscat: [23.59, 58.38], dhofar: [17.02, 54.09], musandam: [26.18, 56.25], buraimi: [24.25, 55.79], dakhiliyah: [22.93, 57.53], dhahirah: [23.22, 56.51], 'north-batinah': [24.34, 56.71], 'south-batinah': [23.39, 57.42], 'north-sharqiyah': [22.69, 58.53], 'south-sharqiyah': [22.57, 59.53], wusta: [19.67, 57.7] };
	const R = {};
	document.querySelectorAll('[data-region]').forEach((c) => {
		R[c.dataset.region] = { n: c.querySelector('strong').textContent, p: c.querySelector('.destination-places').textContent.split(' · ') };
	});
	const ST = { pending: 'بانتظار المرشد', confirmed: 'مؤكدة', declined: 'مرفوضة', completed: 'مكتملة', cancelled: 'ملغاة', open: 'مفتوحة', accepted: 'مقبول', rejected: 'مرفوض' };
	const S = { uid: null, role: null, name: '', admin: false, guides: [], rev: {}, reviewed: {}, mine: [], offers: [], joins: [], gTrips: [], gJoins: [], pending: [] };
	const today = () => new Date().toISOString().slice(0, 10);
	const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };
	const svc = async () => { const s = await getFirebaseServices(); return { db: s.db, f: s.firestoreSdk }; };
	const regionOpts = () => Object.entries(R).map(([k, v]) => `<option value="${k}">${E(v.n)}</option>`).join('');
	const realGuides = () => S.guides.filter((g) => g.price > 0 && g.zones && g.zones.length);
	const avg = (id) => { const r = S.rev[id]; return r ? { rating: (r.s / r.n).toFixed(1), count: r.n } : null; };

	function guideCard(g) {
		const a = avg(g.id);
		const regs = (g.zones || []).slice(0, 3).map((z) => R[z] && R[z].n).filter(Boolean);
		return `<article class="guide-card"><div class="g-av" aria-hidden="true">${E(g.name[0])}</div><div class="guide-info"><div class="guide-name-row"><span class="guide-name">${E(g.name)}</span><span class="rating"><span>★</span> ${a ? a.rating + ' (' + a.count + ')' : 'جديد'}</span></div><div class="guide-specialty">${E(g.specialty || '')}</div><div class="guide-tags">${(g.langs || []).slice(0, 4).map((l) => `<span>${E(l)}</span>`).join('')}</div><div class="guide-tags">${regs.map((r) => `<span>${E(r)}</span>`).join('')}</div><div class="guide-footer"><span class="price">${E(g.price)} ر.ع <small>/ اليوم</small></span><button class="book-button" data-pick="${E(g.id)}">اطلب رحلة</button></div></div></article>`;
	}

	function renderGuides() {
		const reg = $('#destination-filter').value;
		const L = realGuides().filter((g) => reg === 'all' || g.zones.includes(reg));
		$('#guide-list').innerHTML = L.length ? L.map(guideCard).join('') : `<p class="section-desc">${S.uid ? 'لا يوجد مرشدون معتمدون في هذه المحافظة بعد.' : 'سجّل الدخول لعرض المرشدين المعتمدين وأسعارهم وتقييماتهم.'}</p>`;
		$('#guides-note').textContent = 'حسابات حقيقية لمرشدين اعتمدت الإدارة تراخيصهم.';
		showInfo();
	}

	const OUT = [[59.8, 22.5], [59.53, 22.57], [58.92, 23.26], [58.55, 23.62], [58.19, 23.68], [56.75, 24.35], [56.47, 24.74], [56.37, 24.97], [56.1, 24.75], [55.78, 24.22], [55.55, 23.95], [55.2, 22.7], [55.67, 22.0], [55.0, 20.0], [52.0, 19.0], [52.8, 17.3], [53.1, 16.65], [54.1, 17.0], [54.7, 17.0], [55.3, 17.4], [56.0, 17.9], [57.0, 18.5], [57.8, 19.0], [57.7, 19.65], [58.8, 20.5]];
	const MUS = [[56.05, 25.95], [56.25, 26.4], [56.5, 26.1], [56.35, 25.85]];
	const OFF = { muscat: [10, -8, 'start'], 'north-batinah': [8, -10, 'start'], buraimi: [-10, 4, 'end'], dhahirah: [-10, 4, 'end'], 'south-batinah': [-10, -8, 'end'], dakhiliyah: [-10, 4, 'end'], 'north-sharqiyah': [0, 24, 'middle'], 'south-sharqiyah': [6, 38, 'middle'], wusta: [10, 4, 'start'], dhofar: [10, 4, 'start'], musandam: [10, 4, 'start'] };
	const P = ([lo, la]) => [Math.round(20 + (lo - 52) * 65), Math.round(20 + (26.6 - la) * 70)];
	const poly = (pts) => pts.map((p) => P(p).join(',')).join(' ');
	let sel = null;
	function showInfo(k) {
		if (k) sel = k;
		const box = $('#map-info');
		if (!box || !sel) return;
		document.querySelectorAll('.mk').forEach((g) => g.classList.toggle('on', g.dataset.m === sel));
		const n = realGuides().filter((g) => g.zones.includes(sel)).length;
		box.innerHTML = `<b>${E(R[sel].n)}</b><p>${E(R[sel].p.join(' · '))}</p><p>${S.uid ? 'المرشدون المعتمدون: ' + n : 'سجّل الدخول لعرض المرشدين.'}</p><button type="button" class="book-button" data-reg="${sel}">عرض المحافظة</button>`;
	}
	function initMap() {
		const dots = Object.entries(C).map(([k, [la, lo]]) => {
			const [x, y] = P([lo, la]), [dx, dy, an] = OFF[k];
			return `<g class="mk" data-m="${k}" tabindex="0" role="button" aria-label="${E(R[k].n)}"><circle cx="${x}" cy="${y}" r="9"/><text x="${x + dx}" y="${y + dy}" text-anchor="${an}">${E(R[k].n)}</text></g>`;
		}).join('');
		const t = (txt, lo, la) => { const [x, y] = P([lo, la]); return `<text class="nb" x="${x}" y="${y}" text-anchor="middle">${txt}</text>`; };
		$('#map').innerHTML = `<svg viewBox="0 0 560 760" role="img" aria-label="خريطة تقريبية لمحافظات عُمان"><rect width="560" height="760" class="sea"/><polygon class="land" points="${poly(OUT)}"/><polygon class="land" points="${poly(MUS)}"/>${t('خليج عُمان', 58.9, 24.9)}${t('بحر العرب', 56.2, 16.9)}${t('الإمارات', 55.2, 25.4)}${t('السعودية', 53.8, 21.6)}${dots}</svg><div id="map-info" class="map-info" aria-live="polite">اضغط على محافظة لعرض أماكنها.</div>`;
	}

	const fillPlaces = (rs, ps) => { $(ps).innerHTML = (R[$(rs).value]?.p || []).map((p) => `<option>${E(p)}</option>`).join(''); };
	function fillGuides() {
		const reg = $('#rq-region').value, L = realGuides().filter((g) => g.zones.includes(reg));
		$('#rq-guide').innerHTML = L.length ? L.map((g) => `<option value="${E(g.id)}">${E(g.name)} · ${E(g.price)} ر.ع</option>`).join('') : '<option value="">لا يوجد مرشد معتمد في هذه المحافظة بعد</option>';
	}
	const tripRow = (t, extra) => `<div class="li"><div><b>${E(R[t.region]?.n)} · ${E(t.place)}</b><div class="mut">${E(t.date)} · ${E(t.seats)} ${t.kind === 'offer' ? 'مقعد' : 'شخص'} · المرشد ${E(t.guideName)}${t.kind === 'offer' ? ' · ' + E(t.quote) + ' ر.ع للشخص' : ''}</div></div><div class="li-end"><span class="badge">${ST[t.status] || ''}</span>${extra || ''}</div></div>`;
	const btn = (act, label, attrs, cls) => `<button type="button" class="${cls || 'outline-button'} sm" data-act="${act}" ${attrs}>${label}</button>`;

	function touristHTML() {
		const joined = S.offers.filter((o) => (o.members || []).includes(S.uid));
		const mine = [...S.mine, ...joined].map((t) => {
			let x = '';
			if (t.kind === 'req' && ['pending', 'confirmed'].includes(t.status)) x = btn('cancel', 'إلغاء', `data-id="${t.id}"`);
			if (t.status === 'completed' && !S.reviewed[t.id]) x = `<select id="rv-${t.id}" aria-label="التقييم">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join('')}</select>` + btn('review', 'قيّم', `data-id="${t.id}" data-g="${E(t.guideId)}"`, 'solid-button');
			return tripRow(t, x);
		}).join('') || '<p class="mut">لا رحلات بعد.</p>';
		const offers = S.offers.filter((o) => o.status === 'open' && !(o.members || []).includes(S.uid)).map((o) => {
			const j = S.joins.find((x) => x.tripId === o.id), left = o.seats - (o.members || []).length;
			const x = j ? `<span class="badge">${ST[j.status]}</span>` : left > 0 ? btn('join', 'اطلب الانضمام', `data-id="${o.id}"`, 'solid-button') : '<span class="badge">مكتملة العدد</span>';
			return tripRow(o, x);
		}).join('') || '<p class="mut">لا رحلات مفتوحة الآن.</p>';
		return `<h2>لوحة السائح</h2><div class="grid2"><form class="panel" id="req-form"><h3>اطلب رحلة إلى مكان تحدده</h3><label>المحافظة<select id="rq-region">${regionOpts()}</select></label><label>المكان<select id="rq-place"></select></label><label>التاريخ<input id="rq-date" type="date" min="${today()}" required></label><label>عدد الأشخاص<input id="rq-seats" type="number" min="1" max="50" value="2" required></label><label>المرشد<select id="rq-guide"></select></label><label>ملاحظات<textarea id="rq-notes" maxlength="300" rows="2"></textarea></label><button class="solid-button modal-submit" type="submit">إرسال الطلب للمرشد</button></form><div class="panel"><h3>رحلاتي</h3>${mine}</div></div><div class="panel"><h3>رحلات مفتوحة ينظمها المرشدون</h3>${offers}</div>`;
	}

	function guideHTML() {
		const p = S.guides.find((g) => g.id === S.uid) || {};
		const zones = Object.entries(R).map(([k, v]) => `<label class="chk"><input type="checkbox" name="zone" value="${k}" ${(p.zones || []).includes(k) ? 'checked' : ''}>${E(v.n)}</label>`).join('');
		const reqs = S.gTrips.filter((t) => t.kind === 'req').map((t) => tripRow(t, (t.status === 'pending' ? btn('trip', 'قبول', `data-id="${t.id}" data-s="confirmed"`, 'solid-button') + btn('trip', 'رفض', `data-id="${t.id}" data-s="declined"`) : '') + (t.status === 'confirmed' ? btn('trip', 'تمت الرحلة', `data-id="${t.id}" data-s="completed"`, 'solid-button') : ''))).join('') || '<p class="mut">لا طلبات واردة.</p>';
		const offers = S.gTrips.filter((t) => t.kind === 'offer').map((t) => {
			const js = S.gJoins.filter((j) => j.tripId === t.id).map((j) => `<div class="li sub"><span>${E(j.touristName)} <span class="badge">${ST[j.status]}</span></span><span>${j.status === 'pending' ? btn('jn', 'قبول', `data-id="${j.id}" data-s="accepted" data-t="${t.id}" data-u="${E(j.touristId)}"`, 'solid-button') + btn('jn', 'رفض', `data-id="${j.id}" data-s="rejected" data-t="${t.id}" data-u="${E(j.touristId)}"`) : ''}</span></div>`).join('');
			return tripRow(t, t.status === 'open' ? btn('trip', 'تمت', `data-id="${t.id}" data-s="completed"`) + btn('trip', 'إلغاء', `data-id="${t.id}" data-s="cancelled"`) : '') + `<div class="mut">المقاعد المؤكدة: ${(t.members || []).length}/${E(t.seats)}</div>` + js;
		}).join('') || '<p class="mut">لم تنشئ رحلات بعد.</p>';
		return `<h2>لوحة المرشد</h2><div class="grid2"><form class="panel" id="pf-form"><h3>ملفي (ظاهر للسياح)</h3><label>نبذة<textarea id="pf-bio" maxlength="600" rows="3">${E(p.bio)}</textarea></label><label>اللغات (افصل بفاصلة)<input id="pf-langs" maxlength="100" value="${E((p.langs || []).join('، '))}"></label><label>التخصص<input id="pf-spec" maxlength="80" value="${E(p.specialty)}"></label><label>السعر لليوم (ر.ع)<input id="pf-price" type="number" min="1" max="2000" value="${p.price > 0 ? E(p.price) : ''}" required></label><fieldset class="zones"><legend>المناطق التي أعمل فيها</legend>${zones}</fieldset><button class="solid-button modal-submit" type="submit">حفظ الملف</button></form><form class="panel" id="of-form"><h3>أنشئ رحلة وانتقِ سياحها</h3><label>المحافظة<select id="of-region">${regionOpts()}</select></label><label>المكان<select id="of-place"></select></label><label>التاريخ<input id="of-date" type="date" min="${today()}" required></label><label>عدد المقاعد<input id="of-seats" type="number" min="1" max="30" value="6" required></label><label>السعر للشخص (ر.ع)<input id="of-price" type="number" min="0" max="5000" value="25" required></label><label>وصف<textarea id="of-notes" maxlength="300" rows="2"></textarea></label><button class="solid-button modal-submit" type="submit">نشر الرحلة</button></form></div><div class="grid2"><div class="panel"><h3>الطلبات الواردة من السياح</h3>${reqs}</div><div class="panel"><h3>رحلاتي المنشورة وطلبات الانضمام</h3>${offers}</div></div>`;
	}

	const adminHTML = () => `<div class="panel"><h3>الإدارة: طلبات المرشدين المعلقة</h3>${S.pending.map((r) => `<div class="li"><div><b>${E(r.fullName)}</b><div class="mut">ترخيص: ${E(r.licenseNumber)} · ${E(r.phone)}</div></div><div class="li-end">${btn('approve', 'اعتماد', `data-id="${E(r.id)}"`, 'solid-button')}${btn('reject', 'رفض', `data-id="${E(r.id)}"`)}</div></div>`).join('') || '<p class="mut">لا طلبات معلقة.</p>'}</div>`;

	function render() {
		renderGuides();
		const d = $('#dashboard');
		if (!S.uid) { d.hidden = true; d.innerHTML = ''; return; }
		d.hidden = false;
		d.innerHTML = (S.role === 'guide' ? guideHTML() : touristHTML()) + (S.admin ? adminHTML() : '');
		if (S.role === 'tourist') { fillPlaces('#rq-region', '#rq-place'); fillGuides(); } else { fillPlaces('#of-region', '#of-place'); }
	}

	async function refresh() {
		const { db, f } = await svc();
		const col = (n) => f.collection(db, n), arr = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
		const q = (n, k, v) => f.getDocs(f.query(col(n), f.where(k, '==', v)));
		const [g, rv] = await Promise.all([f.getDocs(col('guides')), f.getDocs(col('reviews'))]);
		S.guides = arr(g); S.rev = {}; S.reviewed = {};
		arr(rv).forEach((r) => { const x = S.rev[r.guideId] || (S.rev[r.guideId] = { s: 0, n: 0 }); x.s += r.rating; x.n++; if (r.touristId === S.uid) S.reviewed[r.tripId] = 1; });
		if (S.role === 'tourist') {
			const [m, o, j] = await Promise.all([q('trips', 'ownerId', S.uid), q('trips', 'kind', 'offer'), q('joins', 'touristId', S.uid)]);
			S.mine = arr(m); S.offers = arr(o); S.joins = arr(j);
		} else {
			const [t, j] = await Promise.all([q('trips', 'guideId', S.uid), q('joins', 'guideId', S.uid)]);
			S.gTrips = arr(t); S.gJoins = arr(j);
		}
		if (S.admin) S.pending = arr(await q('registrationRequests', 'status', 'pending'));
		render();
	}

	async function act(a, d) {
		const { db, f } = await svc(), ref = (c, id) => f.doc(db, c, id);
		if (a === 'join') {
			const t = S.offers.find((x) => x.id === d.id);
			await f.setDoc(ref('joins', d.id + '_' + S.uid), { tripId: d.id, guideId: t.guideId, touristId: S.uid, touristName: S.name, status: 'pending', createdAt: f.serverTimestamp() });
		} else if (a === 'cancel') await f.updateDoc(ref('trips', d.id), { status: 'cancelled' });
		else if (a === 'trip') await f.updateDoc(ref('trips', d.id), { status: d.s });
		else if (a === 'jn') {
			const b = f.writeBatch(db);
			b.update(ref('joins', d.id), { status: d.s });
			if (d.s === 'accepted') b.update(ref('trips', d.t), { members: f.arrayUnion(d.u) });
			await b.commit();
		} else if (a === 'review') {
			await f.setDoc(ref('reviews', d.id + '_' + S.uid), { tripId: d.id, guideId: d.g, touristId: S.uid, rating: parseInt($('#rv-' + d.id).value, 10), text: '', createdAt: f.serverTimestamp() });
		} else if (a === 'approve') {
			const r = S.pending.find((x) => x.id === d.id), b = f.writeBatch(db);
			b.set(ref('users', d.id), { role: 'guide', status: 'active', guideStatus: 'approved', createdAt: f.serverTimestamp() });
			b.set(ref('guides', d.id), { name: r.fullName, bio: '', langs: ['العربية'], zones: [], price: 0, specialty: '', active: true, createdAt: f.serverTimestamp() });
			b.update(ref('registrationRequests', d.id), { status: 'approved' });
			await b.commit();
		} else if (a === 'reject') await f.updateDoc(ref('registrationRequests', d.id), { status: 'rejected' });
		toast('تم تنفيذ العملية');
		await refresh();
	}

	async function submitForm(id) {
		const { db, f } = await svc(), v = (s) => $(s).value.trim();
		const base = () => ({ ownerId: S.uid, ownerName: S.name.slice(0, 120), status: 'pending', members: [], createdAt: f.serverTimestamp() });
		if (id === 'req-form') {
			const g = realGuides().find((x) => x.id === v('#rq-guide'));
			if (!g) return toast('اختر مرشداً معتمداً.');
			if (v('#rq-date') < today()) return toast('اختر تاريخاً قادماً.');
			await f.addDoc(f.collection(db, 'trips'), { ...base(), kind: 'req', guideId: g.id, guideName: g.name, region: v('#rq-region'), place: v('#rq-place'), date: v('#rq-date'), seats: parseInt(v('#rq-seats'), 10), notes: v('#rq-notes'), quote: g.price });
		} else if (id === 'of-form') {
			if (v('#of-date') < today()) return toast('اختر تاريخاً قادماً.');
			const me = S.guides.find((x) => x.id === S.uid);
			await f.addDoc(f.collection(db, 'trips'), { ...base(), status: 'open', kind: 'offer', guideId: S.uid, guideName: me ? me.name : S.name, region: v('#of-region'), place: v('#of-place'), date: v('#of-date'), seats: parseInt(v('#of-seats'), 10), notes: v('#of-notes'), quote: Number(v('#of-price')) });
		} else {
			const zones = [...document.querySelectorAll('[name=zone]:checked')].map((x) => x.value);
			if (!zones.length) return toast('اختر منطقة واحدة على الأقل.');
			await f.updateDoc(f.doc(db, 'guides', S.uid), { bio: v('#pf-bio'), langs: v('#pf-langs').split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 8), specialty: v('#pf-spec'), price: Number(v('#pf-price')), zones });
		}
		toast('تم الحفظ');
		await refresh();
	}

	document.addEventListener('click', async (e) => {
		const b = e.target.closest('[data-pick],[data-reg],[data-act],[data-m]');
		if (!b) return;
		try {
			if (b.dataset.m) { showInfo(b.dataset.m); return; }
			if (b.dataset.reg) { applyRegionFilter(b.dataset.reg); return; }
			if (b.dataset.pick) {
				if (S.role !== 'tourist') { toast('سجّل الدخول كسائح لطلب رحلة.'); openAuth('tourist'); return; }
				const g = S.guides.find((x) => x.id === b.dataset.pick);
				$('#rq-region').value = g.zones[0]; fillPlaces('#rq-region', '#rq-place'); fillGuides(); $('#rq-guide').value = g.id;
				$('#dashboard').scrollIntoView({ behavior: 'smooth' });
			} else await act(b.dataset.act, b.dataset);
		} catch (err) { toast('تعذّر تنفيذ العملية. تحقق من الصلاحيات وحاول مجدداً.'); }
	});
	document.addEventListener('keydown', (e) => {
		const g = e.target.closest && e.target.closest('.mk');
		if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showInfo(g.dataset.m); }
	});
	document.addEventListener('change', (e) => {
		if (e.target.id === 'destination-filter') renderGuides();
		if (e.target.id === 'rq-region') { fillPlaces('#rq-region', '#rq-place'); fillGuides(); }
		if (e.target.id === 'of-region') fillPlaces('#of-region', '#of-place');
	});
	document.addEventListener('submit', async (e) => {
		if (!['req-form', 'of-form', 'pf-form'].includes(e.target.id)) return;
		e.preventDefault();
		try { await submitForm(e.target.id); } catch (err) { toast('تعذّر الحفظ. تحقق من البيانات والصلاحيات.'); }
	});

	window.DaleelFeatures = {
		region: () => renderGuides(),
		async signedIn(user, profile) {
			const first = S.uid !== user.uid;
			S.uid = user.uid; S.role = profile.role; S.name = user.displayName || (profile.role === 'guide' ? 'مرشد' : 'سائح');
			try {
				const { db, f } = await svc();
				S.admin = (await f.getDoc(f.doc(db, 'admins', S.uid))).exists();
				await refresh();
				if (first) $('#dashboard').scrollIntoView({ behavior: 'smooth' });
			} catch (err) { toast('تعذّر تحميل بياناتك.'); }
		},
		signedOut() { Object.assign(S, { uid: null, role: null, admin: false, guides: [], rev: {}, reviewed: {}, mine: [], offers: [], joins: [], gTrips: [], gJoins: [], pending: [] }); render(); }
	};
	initMap();
	renderGuides();
})();
