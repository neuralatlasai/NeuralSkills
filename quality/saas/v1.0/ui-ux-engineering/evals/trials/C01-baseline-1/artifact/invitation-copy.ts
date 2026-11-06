(() => {
  let nextId = 0;

  /** Reuse with <invitation-copy link="…" label="…"></invitation-copy>. */
  class InvitationCopy extends HTMLElement {
    private button!: HTMLButtonElement;
    private status!: HTMLParagraphElement;
    private error!: HTMLParagraphElement;
    private pending = false;
    private resetTimer: ReturnType<typeof setTimeout> | undefined;

    connectedCallback(): void {
      if (this.button) return;
      const id = `invitation-copy-${++nextId}`;
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = 'invitation-copy__button';
      this.button.textContent = this.label;
      this.button.setAttribute('aria-describedby', `${id}-status ${id}-error`);

      this.status = document.createElement('p');
      this.status.id = `${id}-status`;
      this.status.className = 'invitation-copy__status';
      this.status.setAttribute('role', 'status');
      this.status.setAttribute('aria-atomic', 'true');

      this.error = document.createElement('p');
      this.error.id = `${id}-error`;
      this.error.className = 'invitation-copy__error';
      this.error.setAttribute('role', 'alert');
      this.error.setAttribute('aria-atomic', 'true');

      this.append(this.button, this.status, this.error);
      this.button.addEventListener('click', () => { void this.copy(); });
    }

    private get label(): string {
      return this.getAttribute('label') || 'Copy invitation link';
    }

    private async copy(): Promise<void> {
      if (this.pending) return;
      const hadFocus = document.activeElement === this.button;
      this.pending = true;
      clearTimeout(this.resetTimer);
      this.button.disabled = true;
      this.button.setAttribute('aria-busy', 'true');
      this.button.textContent = 'Copying…';
      this.error.textContent = '';
      this.status.textContent = 'Copying invitation link…';

      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(
          this.getAttribute('link') || 'https://example.test/invite/team-river'
        );
        this.button.textContent = 'Link copied';
        this.status.textContent = 'Link copied';
        this.resetTimer = setTimeout(() => {
          this.button.textContent = this.label;
          this.status.textContent = '';
        }, 2000);
      } catch {
        this.button.textContent = this.label;
        this.status.textContent = '';
        this.error.textContent = 'Couldn’t copy the link. Check your browser’s clipboard permission, then try again.';
      } finally {
        this.pending = false;
        this.button.disabled = false;
        this.button.removeAttribute('aria-busy');
        // Disabling a native button can move focus to the document in Chrome.
        if (hadFocus && document.activeElement === document.body) {
          this.button.focus({ preventScroll: true });
        }
      }
    }
  }

  if (!customElements.get('invitation-copy')) {
    customElements.define('invitation-copy', InvitationCopy);
  }
})();
