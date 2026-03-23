# TypingMind Extension: Restore Chat Draft

This TypingMind extension saves the current contents of the main chat textarea and restores it after a reload.

It targets the textarea with `data-element-id="chat-input-textbox"`.

## What it does

- Saves the current draft to `localStorage` with a short debounce while you type.
- Restores the draft when TypingMind reloads, as long as the textbox is empty.
- Clears the saved draft when TypingMind sends that same text to `/chat/completions`.
- Rebinds itself automatically if TypingMind re-renders the page.

## Install as a TypingMind Extension

1. Host `draft-restore/restore-draft.js` at a public URL.
2. Make sure the file is served with `application/javascript` or `text/javascript` and allows TypingMind to fetch it with CORS.
3. In TypingMind, go to `Preferences -> Advanced Settings -> Extensions`.
4. Paste the script URL and install it.
5. Restart TypingMind.

## Notes

- The draft is stored in `localStorage` under `TM_chatInputDraft`.
- TypingMind loads extensions once when the app starts.
- If the app becomes unusable, open TypingMind with `?safe_mode=1` to disable extensions temporarily.
