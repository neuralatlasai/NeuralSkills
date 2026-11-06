const dialog = document.querySelector('#reservation-dialog');
const opener = document.querySelector('#new-reservation');
const form = document.querySelector('#reservation-form');
const workshop = document.querySelector('#workshop');
const attendee = document.querySelector('#attendee');
function validate(field) {
  const valid = field.value.trim().length > 0;
  field.setAttribute('aria-invalid', String(!valid));
  document.querySelector(`#${field.id}-error`).hidden = valid;
  return valid;
}
opener.addEventListener('click', () => {
  form.reset();
  for (const field of [workshop, attendee]) {
    field.removeAttribute('aria-invalid');
    document.querySelector(`#${field.id}-error`).hidden = true;
  }
  dialog.showModal();
});
document.querySelector('.close').addEventListener('click', () => dialog.close());
document.querySelector('#cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener.focus());
for (const field of [workshop, attendee]) field.addEventListener('input', () => {
  if (field.hasAttribute('aria-invalid')) validate(field);
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const validWorkshop = validate(workshop);
  const validAttendee = validate(attendee);
  if (!validWorkshop || !validAttendee) {
    (!validWorkshop ? workshop : attendee).focus();
    return;
  }
  const entry = document.createElement('li');
  entry.textContent = `${attendee.value.trim()} — ${workshop.value}`;
  document.querySelector('.local-reservations').hidden = false;
  document.querySelector('#local-list').append(entry);
  document.querySelector('#confirmation').textContent = `Reservation added for ${attendee.value.trim()}.`;
  dialog.close();
});

dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button, select, input')].filter(element => !element.disabled);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});