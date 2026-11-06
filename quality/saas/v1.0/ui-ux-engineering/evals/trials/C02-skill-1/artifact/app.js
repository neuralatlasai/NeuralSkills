const dialog = document.querySelector('dialog');
const opener = document.querySelector('.header .create-workspace');
const input = document.querySelector('#workspace-name');
const error = document.querySelector('#name-error');
const success = document.querySelector('#success');
opener.addEventListener('click', () => { success.hidden = true; error.hidden = true; input.removeAttribute('aria-invalid'); dialog.showModal(); input.focus(); });
document.querySelector('.cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener.focus());
input.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
document.querySelector('#workspace-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = input.value.trim();
  if (!name) { error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'name-error'); input.focus(); return; }
  dialog.close();
  success.textContent = `Workspace “${name}” created. This is a local demo.`;
  success.hidden = false;
  input.value = '';
});
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('nav a').forEach(item => { item.classList.remove('active'); item.removeAttribute('aria-current'); });
  link.classList.add('active'); link.setAttribute('aria-current', 'location');
}));
document.querySelector('nav a').setAttribute('aria-current', 'location');
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('input, button')].filter(el => !el.disabled);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
