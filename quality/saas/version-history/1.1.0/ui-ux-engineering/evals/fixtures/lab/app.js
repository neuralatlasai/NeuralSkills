import { createLatestLoader, createSubmitGate } from './state.js';
const source = [
    { id: 'REQ-028', title: 'Refresh the onboarding experience', project: 'Product design', status: 'In progress', priority: 'High', owner: 'Alex Lee', initials: 'AL', color: 'purple', updated: 'Just now' },
    { id: 'REQ-027', title: 'Landing page illustration set', project: 'Brand & marketing', status: 'In review', priority: 'Medium', owner: 'Maya Chen', initials: 'MC', color: 'orange', updated: '12 min ago' },
    { id: 'REQ-026', title: 'Q4 customer insights report', project: 'Customer experience', status: 'In progress', priority: 'High', owner: 'Sam Wilson', initials: 'SW', color: 'green', updated: '38 min ago' },
    { id: 'REQ-025', title: 'Design system — form components', project: 'Product design', status: 'In review', priority: 'Medium', owner: 'Jamie Park', initials: 'JP', color: 'blue', updated: '1 hour ago' },
    { id: 'REQ-024', title: 'Update help center navigation', project: 'Customer experience', status: 'Backlog', priority: 'Low', owner: 'Maya Chen', initials: 'MC', color: 'orange', updated: '2 hours ago' },
    { id: 'REQ-023', title: 'Welcome email improvements', project: 'Brand & marketing', status: 'Backlog', priority: 'Low', owner: 'Alex Lee', initials: 'AL', color: 'purple', updated: '3 hours ago' }
];
function element(id) { const node = document.getElementById(id); if (!node)
    throw new Error(`Missing #${id}`); return node; }
const search = element('search');
const status = element('status-filter');
const failNext = element('fail-next');
const query = () => ({ search: search.value.trim().toLowerCase(), status: status.value });
const delay = (milliseconds, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
});
const consumeFailure = () => { const shouldFail = failNext.checked; failNext.checked = false; return shouldFail; };
const model = createLatestLoader(async (intent, signal) => {
    const fail = consumeFailure();
    await delay(320, signal);
    if (fail)
        throw new Error('The demo connection was interrupted. Your existing requests are still here.');
    return source.filter(item => (!intent.search || `${item.title} ${item.id} ${item.project}`.toLowerCase().includes(intent.search)) && (intent.status === 'all' || item.status === intent.status));
});
const make = (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined)
    node.textContent = text; return node; };
function render(state) {
    const busy = state.phase === 'loading' || state.phase === 'refreshing';
    const rows = element('rows');
    rows.replaceChildren(...state.items.map(item => {
        const row = document.createElement('tr');
        const title = document.createElement('td');
        const titleWrap = make('div', 'request-title');
        titleWrap.append(make('span', 'request-icon', '▧'), make('strong', '', item.title));
        title.append(titleWrap, make('span', 'request-meta', `${item.id} · ${item.project}`));
        const stateCell = document.createElement('td');
        const badge = make('span', `status-badge ${item.status.toLowerCase().replace(' ', '-')}`);
        badge.append(make('i', ''), document.createTextNode(item.status));
        stateCell.append(badge);
        const priority = document.createElement('td');
        priority.append(make('span', `priority priority-${item.priority.toLowerCase()}`, `${item.priority === 'High' ? '▰' : item.priority === 'Medium' ? '▥' : '▱'} ${item.priority}`));
        const owner = document.createElement('td');
        const avatar = make('span', `avatar avatar-${item.color}`, item.initials);
        avatar.setAttribute('aria-label', item.owner);
        owner.append(avatar);
        const updated = make('td', 'updated', item.updated);
        row.append(title, stateCell, priority, owner, updated);
        return row;
    }));
    const count = state.items.length;
    element('result-count').textContent = String(count);
    element('visible-count').textContent = `${count} request${count === 1 ? '' : 's'}`;
    element('empty-state').hidden = count !== 0 || state.phase !== 'success';
    element('stale').hidden = !state.stale;
    element('error-panel').hidden = state.phase !== 'error';
    element('error-message').textContent = state.error ?? '';
    element('refresh').disabled = busy;
    element('cancel-load').hidden = !busy;
    rows.parentElement?.setAttribute('aria-busy', String(busy));
    const announcement = state.phase === 'loading' ? 'Loading requests…' : state.phase === 'refreshing' ? 'Refreshing requests. Previous results remain visible.' : state.phase === 'error' ? 'Update failed. Previous results remain visible. Try again.' : state.stale ? 'Refresh stopped. Previous results remain visible.' : `${count} request${count === 1 ? '' : 's'} shown.`;
    element('load-status').textContent = announcement;
    element('open-count').textContent = String(source.length).padStart(2, '0');
    element('progress-count').textContent = String(source.filter(item => item.status === 'In progress').length).padStart(2, '0');
    element('review-count').textContent = String(source.filter(item => item.status === 'In review').length).padStart(2, '0');
    const navCount = document.querySelector('.nav-count');
    if (navCount)
        navCount.textContent = String(source.length);
}
model.subscribe(render);
const reload = () => model.load(query());
search.addEventListener('input', reload);
status.addEventListener('change', reload);
element('filters').addEventListener('submit', event => { event.preventDefault(); reload(); });
element('refresh').addEventListener('click', reload);
element('retry').addEventListener('click', reload);
element('cancel-load').addEventListener('click', () => model.cancel());
element('clear-filters').addEventListener('click', () => { search.value = ''; status.value = 'all'; reload(); search.focus(); });
const dialog = element('create-dialog');
const form = element('create-form');
const submitButton = element('submit-request');
const cancelButton = element('cancel-create');
const mutation = createSubmitGate(async (title) => {
    const fail = consumeFailure();
    await delay(500);
    if (fail)
        throw new Error('Your request was not created. Try again.');
    source.unshift({ id: `REQ-${String(29 + source.length - 6).padStart(3, '0')}`, title, project: 'Product design', status: 'Backlog', priority: 'Medium', owner: 'Alex Lee', initials: 'AL', color: 'purple', updated: 'Just now' });
});
element('new-request').addEventListener('click', () => { form.reset(); element('submit-error').hidden = true; dialog.showModal(); });
cancelButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => { if (mutation.busy)
    event.preventDefault(); });
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (mutation.busy || !form.reportValidity())
        return;
    const title = element('request-title').value.trim();
    if (!title) {
        element('request-title').setCustomValidity('Enter a request title.');
        form.reportValidity();
        return;
    }
    submitButton.disabled = true;
    cancelButton.disabled = true;
    submitButton.textContent = 'Creating…';
    element('submit-error').hidden = true;
    try {
        await mutation.submit(title);
        dialog.close();
        await reload();
    }
    catch (error) {
        element('submit-error').textContent = error instanceof Error ? error.message : 'Try again.';
        element('submit-error').hidden = false;
    }
    finally {
        submitButton.disabled = false;
        cancelButton.disabled = false;
        submitButton.textContent = 'Create request';
    }
});
element('request-title').addEventListener('input', event => event.target.setCustomValidity(''));
reload();
