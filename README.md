# Cesar Espitia — About Me Website

This is a six-page personal website built with HTML, CSS, client-side JavaScript, and an Express server:

- `index.html` — home, biography, social links, and contact form
- `media.html` — nine-card media gallery with image, video, and GitHub social media content
- `future.html` — five-year plan and long-term goal
- `hobbies.html` — interests and personal development
- `projects.html` — projects and experience
- `admin.html` — password-protected contact dashboard

## Run

```bash
npm install
npm start
```

The website is served by `server.js`, so it can be published as a Replit app with a server-side JavaScript runtime.

## Replit setup

Set these values in Replit Secrets before using the admin dashboard:

- `ADMIN_PASSWORD` — the password checked by the server
- `SESSION_SECRET` — a long random value used to sign admin sessions

Contact submissions are stored in Replit App Storage at `data/contactReceived.json`. The server creates that object with `[]` the first time it is needed, appends valid submissions, and updates the same stored JSON when an admin marks a message as replied.