"use strict";
function element(id) {
    const node = document.getElementById(id);
    if (!node)
        throw new Error(`Missing element: ${id}`);
    return node;
}
const form = element('preferences-form');
const email = element('email');
const error = element('email-error');
const choices = [
    { input: element('updates'), label: 'Email updates' },
    { input: element('research'), label: 'Product research' },
    { input: element('partners'), label: 'Partner offers' },
];
let saved = null;
let saveCount = 0;
function draft() {
    return { email: email.value.trim(), categories: choices.filter(choice => choice.input.checked).map(choice => choice.label) };
}
function showEmailError() {
    const message = email.validity.valueMissing ? 'Enter your email address.' : email.validity.typeMismatch ? 'Enter a valid email address, such as name@example.com.' : '';
    error.textContent = message;
    error.hidden = !message;
    if (message)
        email.setAttribute('aria-invalid', 'true');
    else
        email.removeAttribute('aria-invalid');
    return !message;
}
function updateDirtyState() {
    const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(draft());
    element('edit-status').hidden = !dirty;
    if (dirty)
        element('save-status').textContent = '';
}
form.addEventListener('input', () => {
    if (!error.hidden)
        showEmailError();
    updateDirtyState();
});
form.addEventListener('submit', event => {
    event.preventDefault();
    email.value = email.value.trim();
    if (!showEmailError()) {
        email.focus();
        return;
    }
    saved = draft();
    element('saved-email').textContent = saved.email;
    const list = element('saved-categories');
    list.replaceChildren(...saved.categories.map(category => {
        const item = document.createElement('li');
        item.textContent = category;
        return item;
    }));
    list.hidden = saved.categories.length === 0;
    element('no-categories').hidden = saved.categories.length !== 0;
    element('saved-summary').hidden = false;
    element('edit-status').hidden = true;
    saveCount += 1;
    element('save-status').textContent = saveCount === 1 ? 'Preferences saved on this page.' : `Preferences saved on this page. Save ${saveCount}.`;
});
