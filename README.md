# Plateforme BAMFA — Workspace

Dépôt d'**orchestration et de documentation** de la plateforme **BAMFA** (Benin Association of the Mastercard Foundation Alumni). Il centralise la documentation du projet (architecture, specs, plans, comptes-rendus) et l'infrastructure de développement local.

## Contenu

```
.
├── docs/
│   ├── superpowers/
│   │   ├── specs/     # architecture + overviews de sprint + specs de slice
│   │   └── plans/     # plans d'implémentation
│   └── done/          # comptes-rendus des slices terminées
├── docker-compose.yml # PostgreSQL + Redis pour le développement local
└── CLAUDE.md          # conventions du projet
```

## Infrastructure de développement local

Le `docker-compose.yml` fournit les services de base (PostgreSQL 16 + Redis 7) via des volumes Docker nommés (données persistantes) :

```bash
docker compose up -d        # démarre PostgreSQL + Redis
docker compose ps           # état des services
docker compose down         # arrêt (données conservées)
docker compose down -v      # arrêt + suppression des données
```

## Organisation de la documentation

Trois dossiers **à plat**, avec un **nommage unifié** `YYYY-MM-DD-sprintN-sX-<nom>.md` (même basename réutilisé dans `specs/`, `plans/`, `done/` pour tracer une slice d'un coup d'œil) :

| Niveau | Emplacement | Cadence |
|---|---|---|
| Architecture (référence) | `docs/superpowers/specs/…-architecture-…` | une fois |
| Overview de sprint | `docs/superpowers/specs/…-sprintN-overview` | 1 par sprint |
| Spec de slice (si complexe) | `docs/superpowers/specs/` | selon besoin |
| Plan d'implémentation | `docs/superpowers/plans/` | 1 par slice |
| Compte-rendu de slice | `docs/done/` | 1 par slice mergée |

Chaque document commence par une ligne d'auteur : `> **Auteur** : <nom du rédacteur>`.

## Méthodologie

- Cycle par slice : (mini-)spec → plan d'implémentation → code (TDD) → revue → merge → CR.
- Priorisation stricte **P0 → P1 → P2**.
- Détails et règles complètes : voir **`CLAUDE.md`**.

## Conventions

- Documentation, contenus et messages de commit en **français**, **sans mention d'IA/assistant**.
- Une branche par slice/fonctionnalité, PR + revue avant merge sur `main`.
