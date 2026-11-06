import { createInvitationCopy } from './invitation-copy.js';
const germanLabel = new URLSearchParams(location.search).get('lang') === 'de';
const invitation = createInvitationCopy({
    url: 'https://example.test/invite/team-river',
    label: germanLabel ? 'Einladungslink für das Projektteam kopieren' : undefined,
});
if (germanLabel)
    invitation.element.querySelector('button')?.setAttribute('lang', 'de');
document.querySelector('#invitation').append(invitation.element);
