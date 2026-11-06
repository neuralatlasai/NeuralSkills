const form = document.querySelector<HTMLFormElement>('#request-form')!;
const amount = document.querySelector<HTMLInputElement>('#amount')!;
const note = document.querySelector<HTMLTextAreaElement>('#note')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;

function setError(field: HTMLInputElement | HTMLTextAreaElement, message: string): void {
  const error = document.getElementById(`${field.id}-error`)!;
  error.textContent = message;
  error.hidden = !message;
  field.setAttribute('aria-invalid', String(Boolean(message)));
}

function showFeedback(title: string, lines: string[] = []): void {
  const heading = document.createElement('h2');
  heading.textContent = title;
  feedback.replaceChildren(heading);
  for (const line of lines) {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    feedback.append(paragraph);
  }
  feedback.hidden = false;
}

for (const field of [amount, note]) {
  field.addEventListener('input', () => {
    setError(field, '');
    feedback.hidden = true;
  });
}

form.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault();
  const value = amount.valueAsNumber;
  const amountError = !Number.isFinite(value) || value <= 0 ? 'Enter an amount greater than zero.' : '';
  const noteError = note.value.trim() ? '' : 'Enter a note for this request.';
  setError(amount, amountError);
  setError(note, noteError);
  feedback.hidden = true;
  if (amountError || noteError) {
    (amountError ? amount : note).focus();
    return;
  }
  showFeedback('Request sent', [`Amount: ${amount.value}`, `Note: ${note.value.trim()}`]);
});

document.getElementById('save-draft')!.addEventListener('click', () => {
  // Local page state only. There is deliberately no API or network request.
  showFeedback('Draft saved');
});
