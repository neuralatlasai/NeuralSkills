import { createInvitationCopy } from './copy-invitation.js';
const invitation = createInvitationCopy({
    url: 'https://example.test/invite/team-river',
});
document.querySelector('#example').append(invitation.element);
