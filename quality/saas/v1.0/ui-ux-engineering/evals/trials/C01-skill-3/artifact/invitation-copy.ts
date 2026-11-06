export interface InvitationCopyOptions {
  url?: string;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  errorMessage?: string;
  /** Optional adapter for another clipboard service or deterministic testing. */
  writeText?: (text: string) => Promise<void>;
}

/** Mount one independent, keyboard-native copy control. Call destroy on removal. */
export function mountInvitationCopy(host: HTMLElement, options: InvitationCopyOptions = {}) {
  const url = options.url ?? 'https://example.test/invite/team-river';
  const label = options.label ?? 'Copy invitation link';
  const group = document.createElement('div');
  group.className = 'invitation-copy';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'invitation-copy__button';
  button.textContent = label;
  const status = document.createElement('p');
  status.className = 'invitation-copy__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const fallback = document.createElement('p');
  fallback.className = 'invitation-copy__fallback';
  fallback.hidden = true;
  fallback.textContent = url;
  group.append(button, status, fallback);
  host.append(group);

  let pending = false;
  let destroyed = false;
  let resetTimer: number | undefined;
  const writeText = options.writeText ?? ((text: string) => {
    if (!navigator.clipboard?.writeText) {
      return Promise.reject(new Error('Clipboard unavailable'));
    }
    return navigator.clipboard.writeText(text);
  });

  async function copy() {
    if (pending || destroyed) return;
    window.clearTimeout(resetTimer);
    pending = true;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
    button.dataset.state = 'pending';
    button.textContent = options.pendingLabel ?? 'Copying…';
    status.textContent = 'Copying invitation link…';
    status.dataset.state = 'pending';
    fallback.hidden = true;
    try {
      await writeText(url);
      if (destroyed) return;
      button.textContent = options.successLabel ?? 'Link copied';
      button.dataset.state = 'success';
      status.dataset.state = 'success';
      status.textContent = options.successLabel ?? 'Link copied';
      resetTimer = window.setTimeout(() => {
        button.textContent = label;
        button.dataset.state = 'idle';
        status.textContent = '';
      }, 2000);
    } catch {
      if (destroyed) return;
      button.textContent = label;
      button.dataset.state = 'error';
      status.dataset.state = 'error';
      status.textContent = options.errorMessage ?? 'Couldn’t copy the link. Try again, or select and copy the link below.';
      fallback.hidden = false;
    } finally {
      pending = false;
      if (!destroyed) {
        button.removeAttribute('aria-disabled');
        button.removeAttribute('aria-busy');
      }
    }
  }
  button.addEventListener('click', copy);
  return {
    button,
    destroy() {
      destroyed = true;
      window.clearTimeout(resetTimer);
      button.removeEventListener('click', copy);
      group.remove();
    },
  };
}
