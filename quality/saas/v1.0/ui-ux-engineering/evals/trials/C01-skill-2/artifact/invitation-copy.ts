export interface InvitationCopyOptions {
  url: string;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  errorMessage?: string;
  /** Defaults to the browser clipboard. Supply this for host integrations/tests. */
  writeText?: (text: string) => Promise<void>;
  successDuration?: number;
}

/** Mount one independent, keyboard-native copy control. Return cleanup for removal. */
export function createInvitationCopy(container: HTMLElement, options: InvitationCopyOptions): () => void {
  const label = options.label ?? 'Copy invitation link';
  const pendingLabel = options.pendingLabel ?? 'Copying link…';
  const successLabel = options.successLabel ?? 'Link copied';
  const errorMessage = options.errorMessage ?? 'Could not copy the link. Please try again, or select and copy the invitation link below.';
  const root = document.createElement('div');
  root.className = 'invitation-copy';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'invitation-copy__button';
  button.textContent = label;
  // Keep a persistent, initially empty live region so changes are announced.
  const status = document.createElement('p');
  status.className = 'invitation-copy__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const fallback = document.createElement('p');
  fallback.className = 'invitation-copy__fallback';
  fallback.hidden = true;
  fallback.textContent = options.url;
  root.append(button, status, fallback);
  container.append(root);
  let pending = false;
  let disposed = false;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const copy = async () => {
    if (pending || disposed) return;
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    pending = true;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
    button.textContent = pendingLabel;
    root.dataset.state = 'pending';
    status.textContent = pendingLabel;
    fallback.hidden = true;
    try {
      const write = options.writeText ?? ((text: string) => {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        return navigator.clipboard.writeText(text);
      });
      await write(options.url);
      if (disposed) return;
      root.dataset.state = 'success';
      button.textContent = successLabel;
      status.textContent = successLabel;
      resetTimer = setTimeout(() => {
        if (disposed) return;
        button.textContent = label;
        status.textContent = '';
        root.dataset.state = 'idle';
      }, options.successDuration ?? 2000);
    } catch {
      if (disposed) return;
      button.textContent = label;
      status.textContent = errorMessage;
      root.dataset.state = 'error';
      fallback.hidden = false;
    } finally {
      pending = false;
      if (!disposed) {
        button.removeAttribute('aria-disabled');
        button.removeAttribute('aria-busy');
      }
    }
  };
  button.addEventListener('click', copy);
  return () => {
    disposed = true;
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    button.removeEventListener('click', copy);
    root.remove();
  };
}
