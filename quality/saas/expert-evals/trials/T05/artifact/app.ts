export function mount(root: HTMLElement) {
  const panel = root.querySelector<HTMLDialogElement>('#panel')!;
  const open = root.querySelector<HTMLButtonElement>('#open')!;
  const input = root.querySelector<HTMLInputElement>('#displayName')!;
  const saved = root.querySelector<HTMLOutputElement>('#saved')!;
  const count = root.querySelector<HTMLOutputElement>('#saveCount')!;
  const cancel = root.querySelector<HTMLButtonElement>('#cancel')!;
  const save = root.querySelector<HTMLButtonElement>('#save')!;
  let previousOverflow: string | null = null;

  function cleanup() {
    input.value = saved.value;
    if (previousOverflow !== null) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = null;
      if (open.isConnected) open.focus();
    }
  }
  function show() {
    if (panel.open) return;
    input.value = saved.value;
    panel.showModal();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.focus({preventScroll: true});
    panel.scrollTop = 0;
  }
  function close() {
    if (panel.open) panel.close();
    cleanup();
  }
  function commit() {
    if (!panel.open) return;
    saved.value = input.value;
    count.value = String(Number(count.value) + 1);
    close();
  }
  function escape(event: Event) {
    event.preventDefault();
    close();
  }
  function closed() {
    // A queued close event from the previous cycle must not reset a new draft.
    if (!panel.open) cleanup();
  }
  open.addEventListener('click', show);
  cancel.addEventListener('click', close);
  save.addEventListener('click', commit);
  panel.addEventListener('cancel', escape);
  panel.addEventListener('close', closed);
  return {
    dispose() {
      close();
      open.removeEventListener('click', show);
      cancel.removeEventListener('click', close);
      save.removeEventListener('click', commit);
      panel.removeEventListener('cancel', escape);
      panel.removeEventListener('close', closed);
    }
  };
}

