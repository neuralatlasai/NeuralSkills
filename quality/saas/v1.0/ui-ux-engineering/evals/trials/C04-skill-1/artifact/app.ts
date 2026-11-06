type SavedPreferences = { email: string; categories: string[] };

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

const form = element<HTMLFormElement>('preferences-form');
const email = element<HTMLInputElement>('email');
const error = element<HTMLParagraphElement>('email-error');
const choices = [
  { input: element<HTMLInputElement>('updates'), label: 'Email updates' },
  { input: element<HTMLInputElement>('research'), label: 'Product research' },
  { input: element<HTMLInputElement>('partners'), label: 'Partner offers' },
];
let saved: SavedPreferences | null = null;
let saveCount = 0;

function draft(): SavedPreferences {
  return { email: email.value.trim(), categories: choices.filter(choice => choice.input.checked).map(choice => choice.label) };
}

function showEmailError(): boolean {
  const message = email.validity.valueMissing ? 'Enter your email address.' : email.validity.typeMismatch ? 'Enter a valid email address, such as name@example.com.' : '';
  error.textContent = message;
  error.hidden = !message;
  if (message) email.setAttribute('aria-invalid', 'true');
  else email.removeAttribute('aria-invalid');
  return !message;
}

function updateDirtyState(): void {
  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(draft());
  element('edit-status').hidden = !dirty;
  if (dirty) element('save-status').textContent = '';
}

form.addEventListener('input', () => {
  if (!error.hidden) showEmailError();
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
  const list = element<HTMLUListElement>('saved-categories');
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
