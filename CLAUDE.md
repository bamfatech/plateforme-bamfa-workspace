# CLAUDE.md — Règles du projet BAMFA (dépôt workspace)

Ce fichier définit les conventions que l'assistant (et les contributeurs) doivent suivre sur ce projet.

## Structure des dépôts

Le projet est réparti en **trois dépôts git indépendants** :

- **workspace** (ce dépôt) : orchestration et documentation — `docs/`, `docker-compose.yml`, specs & plans. Il **ignore** `backend/` et `frontend/`.
- **backend** : application Django + DRF (dossier `backend/`, son propre dépôt).
- **frontend** : application Next.js (dossier `frontend/`, son propre dépôt).

Les dossiers `backend/` et `frontend/` vivent physiquement sous ce workspace mais sont des dépôts autonomes (leur `.git` leur appartient) et sont exclus du suivi du workspace.

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

## Organisation de la documentation

- **Niveau 1 — architecture** (une seule fois, tout le projet) : `docs/superpowers/specs/2026-06-20-architecture-socle-technique-design.md`.
- **Niveau 2 — overview de sprint** (1 par sprint, léger : slices + dépendances) : `docs/superpowers/specs/sprint-<n>/_sprint-<n>-overview.md`.
- **Niveau 3 — par slice** :
  - **1 plan d'implémentation par slice** (toujours) : `docs/superpowers/plans/`.
  - **1 spec détaillée** uniquement si la slice est complexe/ambiguë (ex. paiement, auth, finances).
- **`docs/done/` — compte-rendu par slice** : à la fin de **chaque slice mergée** (DoD atteinte), écrire un court CR dans `docs/done/` (ce qui est livré, commits, résumé des tests, points reportés). C'est la trace durable et versionnée des livrables.
