# Private Checklist PWA v4

This is the v4 upgraded Android-friendly Progressive Web App checklist.

## New in v4

- Notification permission button
- Test notification button
- Per-task reminders
- Reminder options: due time, 5 min, 15 min, 30 min, 1 hour, 1 day
- Notification click opens/focuses the app
- Quick add panel
- Quick today/tomorrow/high-priority task shortcuts
- Dashboard stat buttons that switch views
- Template checklists:
  - Daily routine
  - Work block
  - Game dailies
  - Errands
- Auto-reset recurring tasks when day/week/month changes
- Default list setting
- Default reminder setting
- Default sort setting
- Sunset theme
- Focus today button
- Finish visible button
- Manual move up/down controls
- Energy labels: Easy, Normal, Hard
- Better subtask progress text
- Notification/privacy panel

## Notification limitations

This is still a no-server, local-only PWA.

Local reminders work best when the app is open, recently active, or running as an installed PWA/browser session.

Fully reliable background notifications when the app is completely closed for long periods usually require Web Push plus a server/service such as Firebase Cloud Messaging.

## Privacy

Your checklist data is stored locally in the browser using `localStorage`.

That means:
- Your tasks are not uploaded to GitHub.
- Your tasks are not public on GitHub Pages.
- Other people opening your public app link will not see your tasks.
- Each device/browser has its own separate checklist.
- Clearing browser site data can delete your checklist.
- Use Export Backup before major changes or before clearing browser data.

## Updating GitHub Pages

Upload/replace these files in your GitHub repository:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `icons/icon-192.png`
- `icons/icon-512.png`

After replacing files, open the GitHub Pages link on your phone and refresh. If the old version still appears, close Chrome and reopen, or clear site data for the page.

## Install on Android

Open your GitHub Pages link in Chrome, then:

Menu ⋮ → Add to Home screen / Install app
