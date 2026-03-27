// == TypingMind Extension: Restore new-chat draft ===========================
// Install in TypingMind using a pinned jsDelivr commit URL, for example:
// https://cdn.jsdelivr.net/gh/peheje/Typingmind-Extension-searchmode@COMMIT_SHA/draft-restore/restore-draft.js
// v0.4 - 2026-03-27
(() => {
  const STORAGE_KEY = 'TM_chatInputDraft';
  const TEXTAREA_SELECTOR = '[data-element-id="chat-input-textbox"]';
  const BOUND_ATTRIBUTE = 'data-tm-draft-restore-bound';
  const SAVE_DELAY_MS = 300;
  const CHAT_COMPLETIONS_URL_PATTERN = /\/chat\/completions(?:[/?#]|$)/;

  let saveTimerId = null;
  let lastBoundTextarea = null;
  let lastSentDraft = '';

  const log = (...messages) => console.log('[TM Draft Restore]', ...messages);

  function isNewChat() {
    const hash = window.location.hash || '';
    return !hash.startsWith('#chat=');
  }

  function readDraft() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      log('storage read error', error);
      return '';
    }
  }

  function writeDraft(value) {
    try {
      const normalized = typeof value === 'string' && value.trim() ? value : '';

      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      log('storage write error', error);
    }
  }

  function getTextarea() {
    const textarea = document.querySelector(TEXTAREA_SELECTOR);
    return textarea instanceof HTMLTextAreaElement ? textarea : null;
  }

  function setTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (setter) {
      setter.call(textarea, value);
    } else {
      textarea.value = value;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function isStaleTextarea(textarea) {
    return Boolean(textarea && textarea !== getTextarea() && !textarea.isConnected);
  }

  function persistTextareaValue(textarea = getTextarea()) {
    if (!textarea || isStaleTextarea(textarea)) return;
    if (!isNewChat()) return;

    if (saveTimerId) {
      window.clearTimeout(saveTimerId);
      saveTimerId = null;
    }

    const value = textarea.value;
    if (lastSentDraft && value.trim() === lastSentDraft.trim()) return;

    lastSentDraft = '';
    writeDraft(value);
  }

  function schedulePersist(textarea) {
    if (!isNewChat()) return;

    if (saveTimerId) {
      window.clearTimeout(saveTimerId);
    }

    if (!textarea.value.trim()) {
      persistTextareaValue(textarea);
      return;
    }

    saveTimerId = window.setTimeout(() => {
      saveTimerId = null;
      if (!isStaleTextarea(textarea)) persistTextareaValue(textarea);
    }, SAVE_DELAY_MS);
  }

  function restoreDraft(textarea = getTextarea()) {
    if (!textarea || textarea.value.length > 0) return;
    if (!isNewChat()) return;

    const draft = readDraft();
    if (!draft) return;

    setTextareaValue(textarea, draft);

    try {
      textarea.setSelectionRange(draft.length, draft.length);
    } catch (_error) {
      // Ignore selection errors.
    }
  }

  function bindTextarea(textarea) {
    if (!textarea) return;

    if (textarea.getAttribute(BOUND_ATTRIBUTE) === 'true') {
      lastBoundTextarea = textarea;
      return;
    }

    textarea.setAttribute(BOUND_ATTRIBUTE, 'true');
    textarea.addEventListener('input', () => schedulePersist(textarea));
    textarea.addEventListener('blur', () => persistTextareaValue(textarea));

    restoreDraft(textarea);
    lastBoundTextarea = textarea;
    log('textarea bound');
  }

  // --- Fetch intercept: clear draft on send ----------------------------------

  function getRequestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function getTextFromContentPart(part) {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    if (typeof part.text === 'string') return part.text;
    if (typeof part.content === 'string') return part.content;
    return '';
  }

  function getTextFromMessageContent(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map(getTextFromContentPart).filter(Boolean).join('\n');
  }

  function getLastUserMessageText(body) {
    if (!body || !Array.isArray(body.messages)) return '';

    for (let index = body.messages.length - 1; index >= 0; index -= 1) {
      const message = body.messages[index];

      if (message && message.role === 'user') {
        return getTextFromMessageContent(message.content).trim();
      }
    }

    return '';
  }

  function maybeClearDraftOnSend(bodyText) {
    const savedDraft = readDraft();
    if (!savedDraft || !savedDraft.trim()) return;

    const body = JSON.parse(bodyText);
    const lastUserMessage = getLastUserMessageText(body);

    if (lastUserMessage && lastUserMessage === savedDraft.trim()) {
      lastSentDraft = savedDraft;
      writeDraft('');
      log('cleared draft after send');
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    try {
      if (CHAT_COMPLETIONS_URL_PATTERN.test(getRequestUrl(input)) && init && typeof init.body === 'string') {
        maybeClearDraftOnSend(init.body);
      }
    } catch (error) {
      log('fetch patch error', error);
    }

    return nativeFetch(input, init);
  };

  // --- Lifecycle -------------------------------------------------------------

  const observer = new MutationObserver(() => {
    bindTextarea(getTextarea());
  });

  function handlePageHide() {
    const textarea = getTextarea() || (lastBoundTextarea && lastBoundTextarea.isConnected ? lastBoundTextarea : null);
    persistTextareaValue(textarea);
  }

  function handleHashChange() {
    // When navigating to a new chat, try to restore the draft into the textarea.
    // Clearing happens only on send (fetch intercept) or when the user empties the textarea.
    if (isNewChat()) {
      restoreDraft();
    }
  }

  function start() {
    bindTextarea(getTextarea());

    if (document.body) {
      observer.observe(document.body, { subtree: true, childList: true });
    }

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handlePageHide();
    });

    log('extension loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    return;
  }

  start();
})();
