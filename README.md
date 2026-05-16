# YouTube Clone (Angular)

This repository was converted from a static HTML/CSS/JS page into an Angular application.

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Run locally

```bash
npm start
```

Open `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

Run in watch mode:

```bash
npm run test:watch
```

## Migration notes

- Main template moved to `src/app/app.html`.
- Global styles moved to `src/styles.css`.
- Sidebar toggle logic moved to `src/app/app.ts` (`toggleSidebar()`).
- `profile.png` is served from `public/profile.png`.
