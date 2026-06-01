# Private Checklist PWA v4.1

Android-friendly local checklist app.

## v4.1 changes

- Added footer version info at the bottom of the app
- Updated service worker cache name so the new build is easier to refresh
- Cleaned up source files and removed unnecessary generated-looking comments
- Backup exports now include version/build metadata

## Included from v4

- Notification permission button
- Test notification button
- Per-task reminders
- Reminder options: due time, 5 min, 15 min, 30 min, 1 hour, 1 day
- Notification click opens/focuses the app
- Quick add panel
- Quick today/tomorrow/high-priority task shortcuts
- Dashboard stat buttons that switch views
- Template checklists
- Auto-reset recurring tasks
- Default list, reminder, and sort settings
- Themes
- Focus Today button
- Finish Visible button
- Manual move up/down controls
- Energy labels
- Subtask progress
- Export/import backup

## Privacy

Checklist data is stored locally in the browser using `localStorage`.

Your tasks are not uploaded to GitHub and are not public on GitHub Pages. Each device/browser has its own separate checklist. Export a backup before clearing browser data.

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

After uploading, refresh your GitHub Pages link. If the old build still appears, close Chrome and reopen it, or clear site data for the page.
