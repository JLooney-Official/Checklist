# Private Checklist PWA v3

This is an upgraded Android-friendly Progressive Web App checklist.

## New in v3

- Larger check-off button on every task
- Dedicated Done/Reopen button
- Progress bar
- Open, done, today, and overdue dashboard stats
- Custom app title in settings
- Theme options
- Custom lists/categories
- Priority levels: Low, Normal, High, Urgent
- Due date and due time
- Recurring tasks: daily, weekly, monthly
- Reset repeating tasks
- Important flag
- Pin to top
- Tags
- Subtasks/steps
- Search across title, notes, tags, subtasks
- Filters: today, overdue, important, pinned, recurring, completed, everything
- Sort modes
- Duplicate task
- Snooze task +1 day
- Export backup JSON
- Import backup JSON
- Share/copy open checklist as text
- Local-only privacy message
- Offline service worker
- PWA manifest for Android install

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

