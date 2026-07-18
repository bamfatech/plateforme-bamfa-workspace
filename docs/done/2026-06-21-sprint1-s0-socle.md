# CR de slice — Sprint 1 / S0 : Socle technique

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé et mergé sur `main` · **Date** : 2026-06-21
> **Plan** : [docs/superpowers/plans/2026-06-21-sprint1-s0-socle.md](../superpowers/plans/2026-06-21-sprint1-s0-socle.md)
> **Overview** : [docs/superpowers/specs/2026-06-21-sprint1-overview.md](../superpowers/specs/2026-06-21-sprint1-overview.md)

## Livré

- **Docker Compose** : PostgreSQL 16 + Redis 7 (volumes nommés `postgres_data` / `redis_data`).
- **Backend** (dépôt `backend`) : socle Django 5.2 / DRF, settings séparés `base`/`dev`, endpoint `GET /api/v1/health/`, schéma OpenAPI (`/api/v1/schema/`, docs Swagger `/api/v1/docs/`).
- **Frontend** (dépôt `frontend`) : socle Next.js 15 / TypeScript (App Router), layout `lang="fr"`, composant `Brand`, client API typé (`apiFetch` + `ApiError`), types générés depuis OpenAPI (`schema.d.ts`).
- **CI** : GitHub Actions répartie — `backend/.github/workflows/ci.yml` (ruff + pytest + service PostgreSQL) et `frontend/.github/workflows/ci.yml` (vitest + build).
- **Structure** : séparation en 3 dépôts (workspace / backend / frontend) ; le workspace ignore `backend/` et `frontend/`.

## Développement (méthode)

Exécution subagent-driven : 6 tâches en TDD, chacune avec test rouge → implémentation → test vert → commit, puis revue par tâche + revue finale de branche.

## Commits (branche `feat/s0-socle`, mergée en fast-forward sur `main`)

| SHA | Sujet |
|---|---|
| `8e1a729` | chore: ajout docker compose (postgres + redis) |
| `519837a` | feat(backend): socle Django/DRF + endpoint de sante |
| `9f091df` | feat(backend): exposition du schema OpenAPI |
| `1faecb8` | feat(frontend): socle Next.js + composant Brand |
| `4063c99` | feat(frontend): client API type + generation des types OpenAPI |
| `2d70da1` | fix(frontend): test client avec Response neuf par appel et code de production restaure |
| `ff7c34b` | ci: integration continue backend (pytest) et frontend (vitest + build) |

*(Note : après le split en 3 dépôts, le code backend/frontend vit désormais dans ses propres dépôts ; l'historique granulaire par tâche ci-dessus reste consultable dans l'historique du workspace jusqu'au commit `ff7c34b`.)*

## Tests

- Backend : `pytest` → **2/2** (health + schema), `ruff check` propre.
- Frontend : `vitest` → **3/3** (Brand + client API), `npm run build` réussi.

## Points reportés (non bloquants)

- **S1 (Auth)** : ajouter `CORS_ALLOW_CREDENTIALS=True` + `CSRF_TRUSTED_ORIGINS` pour l'auth par cookie httpOnly.
- **Déploiement** : introduire `config/settings/prod.py` (`DEBUG=False`, `SECRET_KEY` obligatoire sans défaut).
- **Polish** : `pytest --strict-markers` ; épingler la version de Python (`.python-version` / `requires-python`).
- **Sécurité deps** : 9 vulnérabilités dev-only (jsdom/vitest) à surveiller.

## Definition of Done — atteinte

- [x] Socle backend/frontend opérationnel.
- [x] Endpoint de santé + schéma OpenAPI + client API typé.
- [x] CI en place (par dépôt).
- [x] Tests verts, revue finale « Ready to merge ».
- [x] Mergé sur `main`.
