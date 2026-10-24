# Kayenat Ki Birthday Story

A lightweight, no-build birthday story in Hinglish. It uses plain HTML, CSS, and JavaScript, so it can be hosted on GitHub Pages, Netlify, or Vercel without a server or account system.

## Personalise it

- Edit the name, birthday, jokes, quiz questions, comparison captions, final message, and memory list in [`content.js`](content.js).
- Put your own photos in `images/`, then add entries to `memories`, for example: `{ src: "images/november-walk.jpg", alt: "The two of us outdoors", caption: "A note you want to remember" }`.
- Use photos you have permission to share. Keep captions true to your own memories; the starter project does not invent any.
- Progress is stored in the visitor's browser. The size-comparison love story unlocks after the four main activities. The Cuttyyy interaction and runaway-heart game are optional.
- The comparison illustrations are original inline SVGs in `app.js`; the sequence is manually controlled and supports previous, next, and restart.

## Run locally

Open `index.html` directly, or start any static file server from this folder. No package installation, build command, or environment variables are needed.

## Publish

**GitHub Pages:** Create a GitHub repository, add these files, then open Settings → Pages. Select “Deploy from a branch”, choose the `main` branch and `/ (root)`, and save. The public URL appears in that Pages panel after publishing.

**Vercel:** Import the repository and use the “Other” framework preset, with no build command and `.` as the output directory. No secrets or environment variables are required. Connect a custom domain later from the project's Domains settings; follow the DNS records Vercel provides.

This workspace has no existing Git remote or deployment credentials configured, so publishing must be connected from the owner's GitHub/Vercel account. Confirm the resulting public URL in a fresh browser session before sharing it.