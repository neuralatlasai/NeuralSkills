import { attachInvitationCopy } from './invitation-copy.js';

attachInvitationCopy(
  document.querySelector<HTMLButtonElement>('#copy-invitation')!,
  document.querySelector<HTMLElement>('#copy-status')!,
  document.querySelector<HTMLElement>('#manual-copy')!,
  { url: 'https://example.test/invite/team-river' },
);
