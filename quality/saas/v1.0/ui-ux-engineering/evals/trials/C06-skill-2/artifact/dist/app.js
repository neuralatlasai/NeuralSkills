import { findGuides } from './fake-api.js';
const form = document.querySelector('#search-form');
const input = document.querySelector('#query');
const status = document.querySelector('#status');
const title = document.querySelector('#results-title');
const content = document.querySelector('#content');
const retry = document.querySelector('#retry');
let latestRequest = 0;
let failedQuery = null;
function cards(guides) {
    const list = document.createElement('ul');
    list.className = 'guide-list';
    for (const guide of guides) {
        const item = document.createElement('li');
        const article = document.createElement('article');
        const heading = document.createElement('h3');
        const meta = document.createElement('p');
        heading.textContent = guide.title;
        meta.textContent = `${guide.habitat} · ${guide.pages} pages`;
        article.append(heading, meta);
        item.append(article);
        list.append(item);
    }
    content.replaceChildren(list);
}
async function search(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
        input.setCustomValidity('Enter a subject to search for.');
        input.reportValidity();
        input.focus();
        return;
    }
    const request = ++latestRequest;
    failedQuery = null;
    retry.hidden = true;
    title.textContent = `Searching for “${query}”`;
    status.textContent = `Searching for “${query}”… You can start another search while you wait.`;
    content.setAttribute('aria-busy', 'true');
    content.replaceChildren();
    const pending = document.createElement('p');
    pending.className = 'pending';
    pending.textContent = 'Looking through the field library…';
    content.append(pending);
    try {
        const response = await findGuides(query);
        if (request !== latestRequest)
            return;
        title.textContent = `Guides for “${query}”`;
        status.textContent = response.guides.length
            ? `${response.guides.length} ${response.guides.length === 1 ? 'guide' : 'guides'} found for “${query}”.`
            : `No guides found for “${query}”.`;
        if (response.guides.length)
            cards(response.guides);
        else {
            const message = document.createElement('p');
            message.className = 'empty';
            message.textContent = 'Try a broader subject, check your spelling, or explore cedar or moss.';
            content.replaceChildren(message);
        }
    }
    catch {
        if (request !== latestRequest)
            return;
        failedQuery = query;
        title.textContent = `Couldn’t search for “${query}”`;
        status.textContent = `The field guide service is temporarily unavailable. Retry your search for “${query}”, or search for another subject.`;
        const message = document.createElement('p');
        message.className = 'error';
        message.textContent = 'Your search is saved. You can try again.';
        content.replaceChildren(message);
        retry.hidden = false;
    }
    finally {
        if (request === latestRequest)
            content.setAttribute('aria-busy', 'false');
    }
}
form.addEventListener('submit', (event) => {
    event.preventDefault();
    void search(input.value);
});
input.addEventListener('input', () => input.setCustomValidity(''));
retry.addEventListener('click', () => {
    if (failedQuery === null)
        return;
    const query = failedQuery;
    input.focus({ preventScroll: true });
    void search(query);
});
