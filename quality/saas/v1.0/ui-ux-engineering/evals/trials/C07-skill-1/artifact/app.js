const copy = await fetch('copy.json').then(r => { if (!r.ok)
    throw new Error('Copy unavailable'); return r.json(); });
const state = { locale: 'en', step: 1, name: '', email: '', location: '', slot: '', consent: false, errors: {} };
const app = document.querySelector('#app');
const escape = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (key) => escape(copy[state.locale][key]);
const error = (id) => state.errors[id] ? `<p class="error" id="${id}-error">${t(state.errors[id])}</p>` : '';
const attrs = (id) => state.errors[id] ? `aria-invalid="true" aria-describedby="${id}-error"` : '';
function choices(id, items) { return `<fieldset><legend>${t(id)}</legend>${items.map((item, i) => `<label class="choice"><input id="${id}-${i}" type="radio" name="${id}" value="${item.id}" required ${state[id] === item.id ? 'checked' : ''} ${attrs(id)}><span>${escape(item[state.locale])}</span></label>`).join('')}${error(id)}</fieldset>`; }
function summary() { const location = copy.locations.find(x => x.id === state.location); const slot = copy.slots.find(x => x.id === state.slot); return `<dl class="summary">${[[t('equipment'), escape(copy.equipment[state.locale])], [t('name'), escape(state.name)], [t('email'), escape(state.email)], [t('location'), escape(location[state.locale])], [t('slot'), escape(slot[state.locale])]].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`; }
function render(focus) {
    document.documentElement.lang = state.locale;
    document.title = copy[state.locale].title;
    app.innerHTML = `<header><div class="language"><label for="language">${t('language')}</label><select id="language"><option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option><option value="de" ${state.locale === 'de' ? 'selected' : ''}>Deutsch</option></select></div><h1>${t('title')}</h1><p>${t('intro')}</p></header>`;
    if (state.step === 1) {
        app.innerHTML += `<div class="step">1 / 2</div><h2>${t('step1')}</h2><form novalidate><div class="field"><label for="name">${t('name')}</label><input id="name" name="name" type="text" autocomplete="name" required value="${escape(state.name)}" ${attrs('name')}>${error('name')}</div><div class="field"><label for="email">${t('email')}</label><input id="email" name="email" type="email" autocomplete="email" required value="${escape(state.email)}" ${attrs('email')}>${error('email')}</div>${choices('location', copy.locations)}${choices('slot', copy.slots)}<div class="actions"><button type="submit">${t('next')}</button></div></form>`;
    }
    if (state.step === 2) {
        app.innerHTML += `<div class="step">2 / 2</div><h2 id="review" tabindex="-1">${t('step2')}</h2>${summary()}<form novalidate><label class="choice"><input type="checkbox" id="consent" required ${state.consent ? 'checked' : ''} ${attrs('consent')}><span>${t('consent')}</span></label>${error('consent')}<div class="actions"><button id="back" type="button" class="secondary">${t('back')}</button><button type="submit">${t('confirm')}</button></div></form>`;
    }
    if (state.step === 3) {
        app.innerHTML += `<section class="success" role="status" aria-atomic="true"><h2 id="success" tabindex="-1">${t('success')}</h2></section><h3>${t('summary')}</h3>${summary()}`;
    }
    document.querySelector('#language').addEventListener('change', e => { state.locale = e.target.value; render('language'); });
    app.querySelectorAll('input').forEach(input => input.addEventListener('input', () => { if (input.name === 'name' || input.name === 'email') {
        state[input.name] = input.value;
    }
    else if (input.name === 'location' || input.name === 'slot') {
        state[input.name] = input.value;
    }
    else if (input.id === 'consent') {
        state.consent = input.checked;
    } }));
    app.querySelector('#back')?.addEventListener('click', () => { state.step = 1; state.errors = {}; render('name'); });
    app.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); state.errors = {}; if (state.step === 1) {
        if (!state.name.trim())
            state.errors.name = 'requiredName';
        const email = app.querySelector('#email');
        if (!state.email.trim() || !email.validity.valid)
            state.errors.email = 'invalidEmail';
        if (!state.location)
            state.errors.location = 'requiredLocation';
        if (!state.slot)
            state.errors.slot = 'requiredSlot';
        if (Object.keys(state.errors).length) {
            const first = Object.keys(state.errors)[0];
            render(first === 'location' || first === 'slot' ? `${first}-0` : first);
            return;
        }
        state.step = 2;
        render('review');
    }
    else {
        if (!state.consent) {
            state.errors.consent = 'requiredConsent';
            render('consent');
            return;
        }
        state.step = 3;
        render('success');
    } });
    if (focus)
        document.getElementById(focus)?.focus();
}
render();
export {};
