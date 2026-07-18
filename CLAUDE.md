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

Trois dossiers, **tous à plat** (pas de sous-dossiers), avec un **nommage unifié** :

- `docs/superpowers/specs/` — specs (architecture + overviews de sprint + specs de slice complexes)
- `docs/superpowers/plans/` — plans d'implémentation
- `docs/done/` — comptes-rendus de slices terminées

### En-tête des documents (obligatoire)

Chaque document (`specs/`, `plans/`, `done/`) commence, juste après le titre `#`, par une ligne d'auteur — **le nom du rédacteur du document** (pas un nom figé) :

```markdown
> **Auteur** : <Nom du rédacteur>
```

Chaque contributeur met **son propre nom** sur les documents qu'il rédige. C'est valable pour les documents existants **et** à venir.

### Convention de nommage (unique)

Format : **`YYYY-MM-DD-sprintN-sX-<nom>.md`**, à plat, avec le **même basename** réutilisé dans `specs/`, `plans/` et `done/` pour tracer une slice d'un coup d'œil. Segments omis quand ils n'ont pas de sens :

| Type de doc | Nommage | Exemple |
|---|---|---|
| Niveau 1 — architecture (hors sprint) | `YYYY-MM-DD-architecture-<nom>.md` | `2026-06-20-architecture-socle-technique-design.md` |
| Niveau 2 — overview de sprint (pas de slice) | `YYYY-MM-DD-sprintN-overview.md` | `2026-06-21-sprint1-overview.md` |
| Niveau 3 — slice (spec/plan/done) | `YYYY-MM-DD-sprintN-sX-<nom>.md` | `2026-06-21-sprint1-s0-socle.md` |

### Cadence de production

- **Niveau 1 — architecture** : une seule fois, tout le projet.
- **Niveau 2 — overview de sprint** : 1 par sprint (léger : slices + dépendances).
- **Niveau 3 — par slice** :
  - **1 plan d'implémentation par slice** (toujours).
  - **1 spec détaillée** uniquement si la slice est complexe/ambiguë (ex. paiement, auth, finances).
- **`docs/done/` — 1 CR par slice** : à la fin de **chaque slice mergée** (DoD atteinte), un court CR (livré, commits, résumé des tests, points reportés). Trace durable et versionnée des livrables.
