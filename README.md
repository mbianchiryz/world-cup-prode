# World Cup 2026 — Office Pool (Prode)

Predicción de resultados del Mundial 2026. Stack: **Vite + React + Tailwind + shadcn/ui** (frontend) y **Express + node:sqlite** (backend).

## Estructura

```
.
├── server/        Express API + SQLite (node:sqlite)
│   ├── lib/       Auto-sync con ESPN, scoring, schema
│   └── src/
│       ├── index.js
│       └── routes/
└── client/        Vite + React + Tailwind + shadcn
    └── src/
        ├── pages/        Login, Predictions, Groups, Leaderboard, Admin
        ├── components/   ui/ (shadcn), Navbar
        └── lib/          api, utils, matches-data
```

## Correr local

```bash
# Backend (puerto 4000)
cd server && npm install && npm start

# Frontend (puerto 5173) — en otra terminal
cd client && npm install && npm run dev
```

Vite proxea `/api/*` → Express en `:4000`.

## Features

- **104 partidos** completos del Mundial 2026
- **Auto-sync cada 60 s** con [ESPN public API](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard)
- **Predicciones** por partido + pick de campeón
- **Standings**: tabla de grupos en vivo + leaderboard de jugadores
- **Admin**: edición manual + force-sync con ESPN
- **Dark mode** persistente
- **Scoring**: +7 score exacto · +5 ganador + un equipo · +3 ganador · +1 dirección

## Stack

| Capa | Tech |
|---|---|
| Frontend | Vite, React 18, React Router 6, Tailwind 3, shadcn/ui, Radix UI, lucide-react |
| Backend | Express 4, cookie-parser, cors |
| DB | node:sqlite (built-in en Node 22+) |
| Data | [ESPN public API](https://site.api.espn.com) (sin API key) |
