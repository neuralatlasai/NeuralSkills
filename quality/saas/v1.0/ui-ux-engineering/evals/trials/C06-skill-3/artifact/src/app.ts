import { findGuides, type Guide } from './fake-api.js';
const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#query')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const results = document.querySelector<HTMLDivElement>('#results')!;
const heading = document.querySelector<HTMLHeadingElement>('#results-heading')!;
const count = document.querySelector<HTMLSpanElement>('#count')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;
let generation = 0;
let failedQuery: string | null = null;
let pending = false;
function card(guide: Guide): HTMLElement {
  const article = document.createElement('article');
  article.className = 'guide';
  const title = document.createElement('h3');
  title.textContent = guide.title;
  const details = document.createElement('p');
  details.textContent = `${guide.habitat} · ${guide.pages} pages`;
  const mark = document.createElement('span');
  mark.className = 'guide-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '↟';
  article.append(mark, title, details);
  return article;
}
async function search(rawQuery: string, isRetry = false): Promise<void> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    input.focus();
    return;
  }
  const current = ++generation;
  pending = true;
  failedQuery = null;
  retry.hidden = !isRetry;
  retry.setAttribute('aria-disabled', 'true');
  heading.textContent = `Searching for “${query}”`;
  status.textContent = `Searching for “${query}”… You can submit another topic while you wait.`;
  results.replaceChildren();
  results.setAttribute('aria-busy', 'true');
  count.hidden = true;
  try {
    const response = await findGuides(query);
    if (current !== generation) return;
    heading.textContent = `Guides for “${query}”`;
    const total = response.guides.length;
    status.textContent = total ? `Found ${total} ${total === 1 ? 'guide' : 'guides'} for “${query}”.` : `No guides found for “${query}”. Try a broader topic, such as cedar or moss.`;
    count.textContent = String(total);
    count.hidden = false;
    results.replaceChildren(...response.guides.map(card));
    retry.hidden = true;
  } catch {
    if (current !== generation) return;
    failedQuery = query;
    heading.textContent = `Couldn’t search for “${query}”`;
    status.textContent = `The field guide service is temporarily unavailable. Retry “${query}”, or search for another topic.`;
    retry.hidden = false;
    retry.setAttribute('aria-label', `Retry search for ${query}`);
    retry.setAttribute('aria-disabled', 'false');
  } finally {
    if (current === generation) {
      pending = false;
      results.setAttribute('aria-busy', 'false');
    }
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!input.value.trim()) {
    input.setCustomValidity('Enter a topic to search.');
    input.reportValidity();
    return;
  }
  void search(input.value);
});
input.addEventListener('input', () => input.setCustomValidity(''));
retry.addEventListener('click', () => {
  if (pending || failedQuery === null) return;
  void search(failedQuery, true);
});
