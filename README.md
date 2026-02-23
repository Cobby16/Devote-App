# Devote V1 MVP

Devote is a Christian short-form video app prototype focused on daily faith habits.

## V1 scope implemented

- Vertical short-video feed (link-based videos)
- Like, save, follow, comment, share
- Report content and block user
- Create/post short videos (URL + title + tags)
- Daily verse screen with streak check-in
- Profile summary + basic admin moderation queue

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- This repository currently uses frontend-only state in `app.js` (no backend yet).
- This is designed as a rapid MVP scaffold before introducing backend services.
