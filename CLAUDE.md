# CLAUDE.md — Règles du projet BAMFA

Ce fichier définit les conventions que l'assistant (et les contributeurs) doivent suivre sur ce projet.

## Git / Commits

- **Ne jamais mentionner Claude, l'IA ou un assistant dans les messages de commit.** Pas de ligne `Co-Authored-By: Claude`, pas de mention « Generated with… », rien.
- Messages de commit en **français**, clairs et concis.
- Format : ligne de résumé courte (type `docs:`, `feat:`, `fix:`, `chore:`, `refactor:`, `test:`) + corps explicatif si nécessaire.
- Une branche par slice / fonctionnalité (`feat/<module>`), PR + revue avant merge sur `main`.

## Langue

- **Français** pour toute l'UI, les contenus, la documentation et les commits.

## Stack & architecture

- Voir [docs/superpowers/specs/2026-06-20-architecture-socle-technique-design.md](docs/superpowers/specs/2026-06-20-architecture-socle-technique-design.md) — document de référence.
- Backend : **Django + DRF** · Frontend public + admin : **Next.js (App Router, TS)** · BDD : **PostgreSQL**.
- Découpage en **slices verticales** par module (une app Django isolée + une zone Next.js isolée).

## Méthodologie

- Cycle par module : mini-spec → plan d'implémentation → code (TDD) → revue → merge.
- Priorisation stricte **P0 → P1 → P2**.
