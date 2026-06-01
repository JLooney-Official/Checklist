# Josh's Checklist PWA

This is a rough-draft installable checklist app for Android.

## Features in this draft

- Add checklist tasks
- Mark tasks done/open
- Edit tasks
- Delete tasks
- Notes
- Lists/categories
- Priority
- Due dates
- Search
- Filters
- Daily reset tasks
- Saves locally on the phone/browser
- PWA manifest
- Offline service worker

## Important

The app stores tasks in the browser using `localStorage`.

That means:
- No account is required.
- No server is required.
- Tasks stay on the device/browser where you use the app.
- Clearing browser site data can delete tasks.

## How to test on your computer

Open `index.html` in your browser.

The app will work, but PWA install/offline behavior works best when hosted at an HTTPS URL.

## How to test on Android like an app

The easiest free options are:

1. Upload this folder to GitHub Pages, Netlify, or Cloudflare Pages.
2. Open the hosted link in Chrome on Android.
3. Tap the three-dot menu.
4. Tap "Add to Home screen" or "Install app."

## Files

- `index.html` - app screen
- `style.css` - design
- `app.js` - checklist logic
- `manifest.json` - Android install metadata
- `service-worker.js` - offline caching
- `icons/` - app icons

## Good next features

- Multiple checklist templates
- Morning/night mode
- Drag-and-drop sorting
- Export/import backup file
- Real reminders/notifications
- Cloud sync
- Password/PIN lock
- Streak tracking
