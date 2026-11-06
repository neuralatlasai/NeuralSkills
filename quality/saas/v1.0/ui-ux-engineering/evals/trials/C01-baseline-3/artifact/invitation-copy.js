/** Attach to a native button. Call destroy() before removing the component. */
export function attachInvitationCopy(button, status, fallback, options) {
    const originalLabel = options.label ?? 'Copy invitation link';
    let pending = false;
    let destroyed = false;
    let resetTimer;
    button.type = 'button';
    button.textContent = originalLabel;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const restore = () => {
        button.textContent = originalLabel;
        status.textContent = '';
        delete status.dataset.state;
    };
    const copy = async () => {
        if (pending || destroyed)
            return;
        clearTimeout(resetTimer);
        pending = true;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = options.pendingLabel ?? 'Copying…';
        status.dataset.state = 'pending';
        status.textContent = options.messages?.pending ?? 'Copying invitation link…';
        fallback.hidden = true;
        let unavailable = false;
        try {
            if (!navigator.clipboard?.writeText) {
                unavailable = true;
                throw new Error('Clipboard unavailable');
            }
            await navigator.clipboard.writeText(options.url);
            if (destroyed)
                return;
            button.textContent = options.successLabel ?? 'Link copied';
            status.dataset.state = 'success';
            status.textContent = options.messages?.success ?? 'Invitation link copied. Ready to paste.';
            resetTimer = setTimeout(restore, options.successDurationMs ?? 2000);
        }
        catch {
            if (destroyed)
                return;
            button.textContent = originalLabel;
            status.dataset.state = 'error';
            status.textContent = unavailable
                ? options.messages?.unavailable ?? 'Copying is unavailable in this browser. Select and copy the invitation link below, or try again.'
                : options.messages?.failure ?? 'The link could not be copied. Try again, or select and copy the invitation link below.';
            fallback.hidden = false;
        }
        finally {
            pending = false;
            if (!destroyed) {
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        }
    };
    button.addEventListener('click', copy);
    return {
        destroy() {
            destroyed = true;
            clearTimeout(resetTimer);
            button.removeEventListener('click', copy);
            button.disabled = false;
            button.removeAttribute('aria-busy');
        },
    };
}
