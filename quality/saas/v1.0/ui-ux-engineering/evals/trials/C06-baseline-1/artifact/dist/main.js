import { findGuides } from './fake-api.js';
const form = document.querySelector('#search-form');
const input = document.querySelector('#query');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const count = document.querySelector('#count');
const failure = document.querySelector('#failure');
const error = document.querySelector('#error');
const retry = document.querySelector('#retry');
let latestRequest = 0;
let failedQuery = '';
async function search(query) {
    const request = ++latestRequest;
    failedQuery = '';
    failure.hidden = true;
    error.textContent = '';
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    count.hidden = true;
    status.dataset.state = 'pending';
    status.textContent = `Searching for “${query}”…`;
    try {
        const response = await findGuides(query);
        if (request !== latestRequest)
            return;
        results.setAttribute('aria-busy', 'false');
        status.dataset.state = 'success';
        const total = response.guides.length;
        count.hidden = false;
        count.textContent = `${total} ${total === 1 ? 'guide' : 'guides'}`;
        status.textContent = total ? `${total} ${total === 1 ? 'guide' : 'guides'} found for “${query}”.` : `No guides found for “${query}”. Try another plant or place, such as cedar or moss.`;
        for (const guide of response.guides) {
            const card = document.createElement('article');
            card.className = 'guide';
            const icon = document.createElement('span');
            icon.className = 'book';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '↟';
            const text = document.createElement('div');
            const title = document.createElement('h3');
            title.textContent = guide.title;
            const detail = document.createElement('p');
            detail.textContent = `${guide.habitat} · ${guide.pages} pages`;
            text.append(title, detail);
            card.append(icon, text);
            results.append(card);
        }
    }
    catch {
        if (request !== latestRequest)
            return;
        results.setAttribute('aria-busy', 'false');
        status.dataset.state = 'failure';
        status.textContent = `Search for “${query}” failed.`;
        failedQuery = query;
        failure.hidden = false;
        error.textContent = 'The field guide service is temporarily unavailable. Please try again.';
    }
}
form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
        input.setCustomValidity('Enter a plant or place to explore.');
        input.reportValidity();
        return;
    }
    void search(query);
});
input.addEventListener('input', () => input.setCustomValidity(''));
retry.addEventListener('click', () => {
    const query = failedQuery;
    if (!query)
        return;
    input.value = query;
    input.focus();
    void search(query);
});
