# CR de slice — Sprint 1 / S1 : Auth & rôles

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé et mergé sur `main` (dépôt **backend**) · **Date** : 2026-06-21
> **Spec** : [../superpowers/specs/2026-06-21-sprint1-s1-auth-roles.md](../superpowers/specs/2026-06-21-sprint1-s1-auth-roles.md)
> **Plan** : [../superpowers/plans/2026-06-21-sprint1-s1-auth-roles.md](../superpowers/plans/2026-06-21-sprint1-s1-auth-roles.md)

## Livré (dépôt `backend`)

- **Modèle `User` personnalisé** : email comme identifiant (pas de username), manager custom, `PermissionsMixin` (groupes natifs). Base de dev réinitialisée pour l'introduire proprement.
- **Authentification JWT en cookies httpOnly** (SimpleJWT + `CookieJWTAuthentication`) : access 15 min + refresh 7 j, **rotation + blacklist**, protection **CSRF** sur les requêtes authentifiées non sûres.
- **Endpoints** `/api/v1/auth/` : `login`, `logout`, `refresh`, `me`, **`csrf`** (récupération du token pour SPA cross-origin).
- **Rôles = 5 groupes Django** seedés (Alumni, Rédacteur de contenu, Secrétaire, Trésorier, Administrateur) via commande idempotente `seed_roles` + data migration ; helper `user_has_role`. Super-admin = `is_superuser`.
- **Modèles transverses** : `Mandate` (un seul mandat courant) + `PublishableMixin` (statut de publication, abstrait).
- **Config** : `CORS_ALLOW_CREDENTIALS`, `CSRF_TRUSTED_ORIGINS`, cookies pilotés par env (`AUTH_COOKIE_SECURE`/`AUTH_COOKIE_SAMESITE`), `.env.example` complété (12 variables), clé secrète dev/CI ≥ 32 octets.

## Addendum post-fusion (2026-06-21)

- **Clé de signature JWT dédiée** (`12cc944`) : `SIMPLE_JWT["SIGNING_KEY"] = env("JWT_SIGNING_KEY", default=SECRET_KEY)`. Par défaut, les JWT restent signés avec `DJANGO_SECRET_KEY` (HS256) ; définir `JWT_SIGNING_KEY` (ajouté à `.env.example`) permet de roter la clé des tokens indépendamment des sessions/reset Django, et prépare un éventuel passage en asymétrique (RS256). Test `tests/test_jwt_config.py`. Suite : **21/21**, ruff propre.

## Développement (méthode)

Subagent-driven : 7 tâches en TDD + revue par tâche + revue finale de branche. Fixes intermédiaires : clé secrète (sortie de tests propre), nettoyage ruff (exclusion des migrations auto-générées), endpoint `/auth/csrf/`, complétion de `.env.example`.

## Commits (branche `feat/s1-auth-roles` → fast-forward sur `main`)

| SHA | Sujet |
|---|---|
| `20feb42` | feat(accounts): modèle User personnalisé + base migrée à neuf |
| `75c053a` | feat(accounts): fondation JWT (simplejwt, cookies, CSRF, CORS) |
| `2102bb8` | fix(backend): clé secrète dev/CI ≥ 32 octets |
| `52e2ea9` | feat(accounts): endpoints login et me |
| `1e3f983` | feat(accounts): endpoints refresh (rotation) et logout (blacklist) + CSRF |
| `f750c12` | feat(accounts): rôles = groupes Django (seed + data migration + helper) |
| `3625493` | feat(accounts): modèle Mandate |
| `f87c96f` | feat(common): PublishableMixin |
| `e1f4317` | chore(backend): exclut les migrations du lint, trie les imports |
| `77616e0` | feat(accounts): endpoint GET /auth/csrf/ |
| `6d90391` | docs(backend): complète .env.example |

## Tests

- Suite `pytest` : **20/20**, 0 warning. `ruff check` : propre.
- Couvre : User (manager/email), auth (login/me/refresh/logout/csrf, CSRF, rotation), rôles (idempotence + helper), Mandate (mandat courant unique), PublishableMixin (états).

## Points reportés (non bloquants)

- **CSRF cross-origin (décision déploiement)** : backend prêt (`/auth/csrf/` renvoie le token). Reste à trancher pour S2 : même domaine racine + `SameSite=Lax`, ou déploiement same-origin (reverse-proxy), ou `SameSite=None; Secure`.
- **RefreshView** : adopter l'idiome SimpleJWT `set_jti/set_exp/set_iat` (au lieu de recopier `user_id`) et enregistrer le nouveau refresh dans `OutstandingToken` (audit). Replay déjà bloqué.
- **Permissions DRF** : acter la politique par défaut (`DEFAULT_PERMISSION_CLASSES`). Reco pour un site public-heavy : `AllowAny` par défaut + `IsAuthenticated` explicite sur les endpoints protégés.
- **`SECRET_KEY`** : rendre obligatoire (sans défaut) quand `DEBUG=False` → slice déploiement.
- **`Mandate`** : contrainte DB (`UniqueConstraint` conditionnel) pour rendre l'unicité du mandat courant race-safe → ultérieur.
- **`config/settings/prod.py`** (hérité de S0) : `DEBUG=False` + secret requis → slice déploiement.

## Definition of Done — atteinte

- [x] `User` custom, base migrée, `createsuperuser` OK.
- [x] `login`/`logout`/`refresh`/`me` (+`csrf`) en cookies httpOnly, CSRF sur requêtes authentifiées non sûres.
- [x] Rotation + blacklist du refresh.
- [x] 5 groupes seedés + helper.
- [x] `Mandate` + `PublishableMixin` avec tests.
- [x] `CORS_ALLOW_CREDENTIALS` + `CSRF_TRUSTED_ORIGINS` configurés.
- [x] Suite verte, ruff propre, mergé sur `main`.
