import { findGuides } from './fake-api.js';
const form = document.querySelector('#search-form');
const input = document.querySelector('#query');
const heading = document.querySelector('#results-heading');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
let latestRequest = 0;
function stateCard(title, detail, kind = 'initial') {
    const card = document.createElement('div');
    card.className = `state ${kind}`;
    const icon = document.createElement('span');
    icon.className = kind === 'pending' ? 'spinner' : 'state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'pending' ? '' : kind === 'error' ? '!' : '❧';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = detail;
    card.append(icon, h3, p);
    return card;
}
function guideCard(guide, index) {
    const card = document.createElement('article');
    card.className = 'guide';
    const number = document.createElement('span');
    number.className = 'guide-number';
    number.textContent = `FIELD GUIDE / ${String(index + 1).padStart(2, '0')}`;
    const title = document.createElement('h3');
    title.textContent = guide.title;
    const meta = document.createElement('div');
    meta.className = 'guide-meta';
    const habitat = document.createElement('span');
    habitat.className = 'habitat';
    habitat.textContent = guide.habitat;
    const pages = document.createElement('span');
    pages.textContent = `${guide.pages} pages`;
    meta.append(habitat, pages);
    card.append(number, title, meta);
    return card;
}
async function search(query) {
    const requestId = ++latestRequest;
    heading.textContent = 'Your discoveries';
    status.textContent = `Searching for “${query}”…`;
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren(stateCard('Looking a little closer…', 'You can start another search while we find your guides.', 'pending'));
    try {
        const response = await findGuides(query);
        if (requestId !== latestRequest)
            return;
        results.setAttribute('aria-busy', 'false');
        const count = response.guides.length;
        status.textContent = `${count} ${count === 1 ? 'guide' : 'guides'} found for “${query}”.`;
        if (count === 0) {
            results.replaceChildren(stateCard('No guides found this time.', `Try a broader term or a different plant or place. Your search was “${query}”.`, 'empty'));
        }
        else {
            const grid = document.createElement('div');
            grid.className = 'grid';
            grid.append(...response.guides.map(guideCard));
            results.replaceChildren(grid);
        }
    }
    catch (error) {
        if (requestId !== latestRequest)
            return;
        results.setAttribute('aria-busy', 'false');
        status.textContent = `Search for “${query}” failed.`;
        const card = stateCard('We couldn’t load your guides.', error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'retry';
        retry.textContent = 'Retry';
        retry.setAttribute('aria-label', `Retry search for ${query}`);
        retry.addEventListener('click', () => {
            input.value = query;
            input.focus();
            void search(query);
        });
        card.append(retry);
        results.replaceChildren(card);
    }
}
form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
        input.setCustomValidity('Enter something you’d like to explore.');
        input.reportValidity();
        return;
    }
    input.setCustomValidity('');
    void search(query);
});
input.addEventListener('input', () => input.setCustomValidity(''));
results.replaceChildren(stateCard('Your next discovery starts here.', 'Enter a search above to browse our collection of field guides.'));
