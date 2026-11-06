export interface InvitationCopyOptions {
  url: string;
  label?: string;
}

let nextId = 0;

/** Native, self-contained control. Append element, then destroy when unmounting. */
export function createInvitationCopy(options: InvitationCopyOptions): {
  element: HTMLElement;
  destroy: () => void;
} {
  const label = options.label ?? 'Copy invitation link';
  const element = document.createElement('div');
  element.className = 'invitation-copy';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'invitation-copy__button';
  button.textContent = label;
  const status = document.createElement('p');
  status.className = 'invitation-copy__status';
  status.id = `invitation-copy-status-${++nextId}`;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  button.setAttribute('aria-describedby', status.id);
  const manual = document.createElement('input');
  manual.className = 'invitation-copy__manual';
  manual.type = 'text';
  manual.readOnly = true;
  manual.value = options.url;
  manual.setAttribute('aria-label', 'Invitation link for manual copying');
  manual.hidden = true;
  manual.addEventListener('focus', () => manual.select());
  element.append(button, status, manual);

  let pending = false;
  let disposed = false;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy(): Promise<void> {
    if (pending || disposed) return;
    pending = true;
    clearTimeout(resetTimer);
    button.textContent = 'Copying…';
    // Keep the button in the tab order and preserve focus while blocking all clicks.
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
    element.dataset.state = 'pending';
    status.textContent = 'Copying invitation link…';
    manual.hidden = true;
    const clipboard = navigator.clipboard;
    const available = Boolean(clipboard && typeof clipboard.writeText === 'function');
    try {
      if (!available) throw new Error('Clipboard unavailable');
      await clipboard.writeText(options.url);
      if (disposed) return;
      element.dataset.state = 'success';
      button.textContent = 'Link copied';
      status.textContent = 'Invitation link copied. It is ready to paste.';
      resetTimer = setTimeout(() => {
        if (disposed) return;
        element.dataset.state = 'idle';
        button.textContent = label;
        status.textContent = '';
      }, 2000);
    } catch {
      if (disposed) return;
      element.dataset.state = 'error';
      button.textContent = label;
      status.textContent = available
        ? 'Copy failed. Check clipboard permissions and try again, or select the link below to copy it manually.'
        : 'Automatic copying is unavailable in this browser. Select the link below to copy it manually, or try again.';
      manual.hidden = false;
    } finally {
      pending = false;
      button.removeAttribute('aria-disabled');
      button.removeAttribute('aria-busy');
    }
  }
  button.addEventListener('click', copy);
  return {
    element,
    destroy() {
      disposed = true;
      clearTimeout(resetTimer);
      button.removeEventListener('click', copy);
      element.remove();
    },
  };
}
