# CatalogPilot AI — Monorepo

## Directory layout

- `apps/api/` — Express + TypeScript backend
- `apps/web/` — React + Vite + TypeScript frontend
- `packages/shared/` — Zod schemas shared between api and web

## Quick start

```bash
cp apps/api/.env.example apps/api/.env
npm install
npm run dev          # starts both API (3001) and Web (5173)
```
