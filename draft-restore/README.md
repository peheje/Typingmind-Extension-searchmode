# TypingMind Extension: Restore New-Chat Draft

TypingMind's built-in draft system works for existing chats but not for new (unsaved) chats. This extension fills that gap by saving and restoring the textarea content when no chat ID is present in the URL.

## What it does

- Saves the textarea to `localStorage` (debounced) while typing in a **new chat** only.
- Restores the saved draft when TypingMind reloads or re-renders and the textarea is empty.
- Clears the draft when the message is sent or the user navigates to an existing chat.
- Does **not** touch `TM_useDraftContent` — existing-chat drafts are left to TypingMind.

## Install as a TypingMind Extension

1. Host `draft-restore/restore-draft.js` at a public URL.
2. In TypingMind, go to `Preferences -> Advanced Settings -> Extensions`.
3. Paste the script URL and install it.
4. Restart TypingMind.

## Notes

- Storage key: `TM_chatInputDraft`.
- If the app becomes unusable, open TypingMind with `?safe_mode=1` to disable extensions temporarily.
