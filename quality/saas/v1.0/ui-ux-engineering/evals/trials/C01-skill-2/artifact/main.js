import { createInvitationCopy } from './invitation-copy.js';
const container = document.querySelector('#copy-example');
if (container)
    createInvitationCopy(container, { url: 'https://example.test/invite/team-river' });
