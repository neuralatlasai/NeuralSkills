import { findGuides, type Guide } from './fake-api.js';

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const outcome = document.querySelector<HTMLElement>('#outcome')!;
const status = document.querySelector<HTMLElement>('#status')!;
const results = document.querySelector<HTMLElement>('#results')!;
const count = document.querySelector<HTMLElement>('#count')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;
let submission = 0;
let failedQuery: string | null = null;
outcome.dataset.state = 'initial';

function renderCards(guides: Guide[]): void {
  results.replaceChildren(...guides.map((guide, index) => {
    const card = document.createElement('article'); card.className = 'guide';
    const number = document.createElement('span'); number.className = 'number'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
    const title = document.createElement('h3'); title.textContent = guide.title;
    const meta = document.createElement('div'); meta.className = 'meta';
    const habitat = document.createElement('span'); habitat.className = 'habitat'; habitat.textContent = guide.habitat;
    const pages = document.createElement('span'); pages.textContent = `${guide.pages} pages`;
    meta.append(habitat, pages); card.append(number, title, meta); return card;
  }));
}

async function search(query: string): Promise<void> {
  const request = ++submission;
  failedQuery = null;
  retry.hidden = true;
  outcome.dataset.state = 'loading';
  // Keep the live status outside the busy result list so pending feedback is announced now.
  results.setAttribute('aria-busy', 'true');
  results.replaceChildren(); count.textContent = '';
  status.textContent = `Searching for “${query}”… You can search again while we look.`;
  try {
    const response = await findGuides(query);
    if (request !== submission) return;
    results.setAttribute('aria-busy', 'false');
    const total = response.guides.length;
    outcome.dataset.state = total ? 'success' : 'empty';
    count.textContent = `${total} ${total === 1 ? 'GUIDE' : 'GUIDES'}`;
    status.textContent = total ? `${total} ${total === 1 ? 'guide' : 'guides'} found for “${query}”.` : `No guides found for “${query}”. Try a broader subject, such as cedar or moss.`;
    renderCards(response.guides);
  } catch {
    if (request !== submission) return;
    results.setAttribute('aria-busy', 'false');
    outcome.dataset.state = 'failure'; failedQuery = query;
    status.textContent = `We couldn’t find guides for “${query}” because the guide service is temporarily unavailable. Please try again.`;
    retry.hidden = false;
  }
}
form.addEventListener('submit', event => { event.preventDefault(); const query = input.value.trim(); if (!query) { input.setCustomValidity('Enter a subject to explore.'); input.reportValidity(); return; } input.setCustomValidity(''); void search(query); });
input.addEventListener('input', () => input.setCustomValidity(''));
retry.addEventListener('click', () => { if (failedQuery !== null) { const query = failedQuery; input.focus(); void search(query); } });
