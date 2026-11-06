export interface InvitationCopyOptions {
  url: string;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  /** Optional host integration; defaults to navigator.clipboard.writeText. */
  copy?: (text: string) => Promise<void>;
}

let nextId = 0;

/** Mount any number of independent invitation controls. Call destroy on removal. */
export function createInvitationCopy(options: InvitationCopyOptions) {
  const root = document.createElement('div');
  root.className = 'invitation-copy';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'invitation-copy__button';
  const message = document.createElement('p');
  message.id = `invitation-copy-status-${++nextId}`;
  message.className = 'invitation-copy__status';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.setAttribute('aria-atomic', 'true');
  button.setAttribute('aria-describedby', message.id);
  root.append(button, message);

  const label = options.label ?? 'Copy invitation link';
  let pending = false;
  let disposed = false;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  button.textContent = label;

  async function activate() {
    if (pending || disposed) return;
    clearTimeout(resetTimer);
    pending = true;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
    button.textContent = options.pendingLabel ?? 'Copying…';
    root.dataset.state = 'pending';
    message.textContent = options.pendingLabel ?? 'Copying invitation link…';
    try {
      const copy = options.copy ?? ((text: string) => {
        if (!navigator.clipboard?.writeText) {
          return Promise.reject(new Error('Clipboard unavailable'));
        }
        return navigator.clipboard.writeText(text);
      });
      await copy(options.url);
      if (disposed) return;
      button.textContent = options.successLabel ?? 'Link copied';
      message.textContent = options.successLabel ?? 'Link copied';
      root.dataset.state = 'success';
      resetTimer = setTimeout(() => {
        if (disposed) return;
        button.textContent = label;
        message.textContent = '';
        root.dataset.state = 'idle';
      }, 2000);
    } catch {
      if (disposed) return;
      button.textContent = label;
      message.textContent = `Couldn’t copy the link. Allow clipboard access and try again, or copy this address manually: ${options.url}`;
      root.dataset.state = 'error';
    } finally {
      pending = false;
      button.removeAttribute('aria-disabled');
      button.removeAttribute('aria-busy');
    }
  }

  button.addEventListener('click', activate);
  return {
    element: root,
    destroy() {
      disposed = true;
      clearTimeout(resetTimer);
      button.removeEventListener('click', activate);
      root.remove();
    },
  };
}
