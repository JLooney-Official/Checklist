# Private Checklist PWA v5.0

Android-friendly local checklist app.

## v5.0 changes

- Removed Quick Add
- Reorganized the app into clear tabs:
  - Tasks
  - Add Task
  - Reminders
  - Templates
  - Settings
- Added a dedicated Reminders setup screen
- Added notification status diagnostics
- Added easier notification setup/testing
- Added a one-minute test reminder creator
- Added notification troubleshooting steps inside the app
- Improved layout and reduced all-in-one-page clutter
- Updated service worker cache to v5
- Kept footer version info

## Reminder notes

Local reminders need notification permission, a due date, a due time, and a reminder setting.

For best results, use the installed Android home-screen app and open it regularly. Fully reliable always-on background push notifications need a server-based web push setup.

## Privacy

Checklist data is stored locally in the browser using localStorage.

Your tasks are not uploaded to GitHub and are not public on GitHub Pages. Each device/browser has its own separate checklist. Export a backup before clearing browser data.

## Updating GitHub Pages

Upload/replace these files in your repository:

- index.html
- style.css
- app.js
- manifest.json
- service-worker.js
- README.md
- icons/icon-192.png
- icons/icon-512.png
