# Sprint 1 / S1 — Auth & rôles : Spec détaillée

> **Type** : Spec de slice (niveau 3 — slice complexe → spec avant plan).
> **Sprint** : 1 · **Slice** : S1 · **Dépôt** : `backend` · **Priorité** : P0
> **Références** : [architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md) · [overview sprint 1](2026-06-21-sprint1-overview.md)

---

## 1. Objectif

Poser l'**authentification des comptes internes (staff/admin)** et la **fondation des rôles/permissions** de la plateforme BAMFA, plus les **modèles transverses** dont dépendront tous les modules du Sprint 2. Tout est backend (Django/DRF) ; l'intégration frontend (UI de login, intercepteurs axios) arrive en S2/S4.

## 2. Périmètre

**Inclus :**
- Modèle `User` personnalisé (email comme identifiant, pas de `username`).
- Authentification **JWT en cookies httpOnly** via `djangorestframework-simplejwt` + vues custom.
- Endpoints : `login`, `logout`, `refresh`, `me`.
- Protection **CSRF** des requêtes non sûres (cookies → double-submit / header).
- Fondation **rôles = Groupes Django** (5 groupes seedés) + helpers de vérification.
- Modèles transverses : `Mandate` (mandats/périodes) et `PublishableMixin` (statut de publication).

**Exclus (→ Sprint 2 ou autres slices) :**
- Inscription alumni (self-register) + validation admin → **Sprint 2 (slice alumni)**.
- UI de login et intercepteurs axios → **S2 / S4**.
- Réinitialisation de mot de passe par email, MFA → ultérieur.
- Attribution fine des permissions par module (les permissions concrètes arrivent avec chaque module en Sprint 2).

## 3. Décisions de design (validées)

| Sujet | Décision |
|---|---|
| Modèle utilisateur | `User` custom : `AbstractBaseUser` + `PermissionsMixin`, `email` unique = `USERNAME_FIELD`, manager custom |
| Auth | `djangorestframework-simplejwt` + vues custom posant les tokens en **cookies httpOnly** |
| Tokens | Access court (15 min) + Refresh long (7 j), **rotation + blacklist** activées |
| Transport | Cookies `HttpOnly`, `Secure` (prod), `SameSite=Lax` (dev) / configurable ; jamais de token dans le localStorage |
| CSRF | Endpoints non sûrs protégés par CSRF (cookie `csrftoken` lisible + header `X-CSRFToken`) |
| Rôles | **Groupes Django natifs** (5 groupes) + `is_superuser` pour Super-admin |
| Autorisation | Permissions DRF par endpoint ; l'autorité reste côté backend |

### ⚠️ Contrainte critique — modèle User custom et migrations

Django exige que `AUTH_USER_MODEL` soit défini **avant la première migration**. Le socle S0 a migré avec le `auth.User` par défaut. Comme la base de dev ne contient **aucune donnée réelle** :

1. Créer l'app `accounts` avec le `User` custom et positionner `AUTH_USER_MODEL = "accounts.User"`.
2. **Réinitialiser la base de dev** : `docker compose down -v` (supprime le volume `postgres_data`).
3. `makemigrations accounts` puis `migrate` à neuf.

La CI repart d'une base vierge à chaque exécution → aucun impact. Cette étape figurera explicitement dans le plan.

## 4. Modèle de données

### 4.1 `accounts.User`
- `email` : `EmailField`, unique, requis → `USERNAME_FIELD`.
- `first_name`, `last_name` : `CharField`.
- `is_active` (défaut `True`), `is_staff` (défaut `False`), `is_superuser` (via `PermissionsMixin`).
- `date_joined` : `DateTimeField(auto_now_add=True)`.
- `REQUIRED_FIELDS = []` (email + password suffisent à `createsuperuser`).
- Manager `UserManager` : `create_user(email, password, **extra)` et `create_superuser(...)` (normalisent l'email, hashent le mot de passe).
- Hérite de `PermissionsMixin` → accès natif aux `groups` et `user_permissions`.

### 4.2 `accounts.Mandate` (mandats / périodes)
- `label` : `CharField` (ex. « Mandat 2024-2026 »).
- `start_date`, `end_date` : `DateField` (`end_date` nullable si mandat en cours).
- `is_current` : `BooleanField` (un seul courant à la fois — validé).
- Servira à « l'équipe BAMFA par mandat » (slice équipe, Sprint 2).

### 4.3 `common.PublishableMixin` (abstrait, dans `apps/common`)
- `status` : choix `brouillon` / `publie` / `depublie` (défaut `brouillon`).
- `published_at` : `DateTimeField` nullable.
- Helpers : `publish()`, `unpublish()`, propriété `is_published`.
- **Abstrait** (pas de table) → hérité par les contenus du Sprint 2 (articles, événements, etc.).

## 5. Rôles (Groupes Django)

Groupes seedés (commande idempotente `seed_roles` + appelée par une data migration) :

| Groupe | Rôle métier |
|---|---|
| `Alumni` | Membre validé |
| `Rédacteur de contenu` | CRUD contenus + modération |
| `Secrétaire` | Secrétariat + documents (P2) |
| `Trésorier` | Finances + dons (P2) |
| `Administrateur` | Gestion globale, validation, mails ciblés, stats |

- **Visiteur public** = non authentifié (pas de groupe).
- **Super-admin** = `is_superuser=True` (pas un groupe).
- Les **permissions concrètes** sont attachées aux groupes **au fur et à mesure** que les modules existent (Sprint 2). En S1 : création des groupes + helper `user_has_role(user, "Administrateur")` et permissions DRF de base.

## 6. API (endpoints)

Base : `/api/v1/auth/`

| Méthode | Endpoint | Rôle | Comportement |
|---|---|---|---|
| POST | `login/` | public | `{email, password}` → pose cookies `access` + `refresh` (httpOnly) + cookie `csrftoken` ; renvoie l'utilisateur (`id, email, prénom, nom, rôles`) |
| POST | `logout/` | authentifié | efface les cookies ; blackliste le refresh |
| POST | `refresh/` | cookie refresh | lit le refresh cookie, **rotation**, repose un nouvel `access` (+ refresh) |
| GET | `me/` | authentifié | renvoie l'utilisateur courant + ses groupes/permissions |

- Authentification DRF via une classe custom `CookieJWTAuthentication` (lit l'access token dans le cookie, applique la vérification CSRF sur les méthodes non sûres, à la manière de `SessionAuthentication`).
- Réponses d'erreur normalisées (401 non authentifié, 403 CSRF/permission).

## 7. Configuration (settings)

- `AUTH_USER_MODEL = "accounts.User"`.
- `INSTALLED_APPS` += `rest_framework_simplejwt`, `rest_framework_simplejwt.token_blacklist`, `apps.accounts`.
- `SIMPLE_JWT` : durées (access 15 min, refresh 7 j), `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`.
- Noms/attributs des cookies : `AUTH_COOKIE="bamfa_access"`, `AUTH_COOKIE_REFRESH="bamfa_refresh"`, `HttpOnly=True`, `Secure` piloté par env (False en dev), `SameSite="Lax"`.
- `REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = ["...CookieJWTAuthentication"]`.
- **Note reportée S0 traitée ici** : `CORS_ALLOW_CREDENTIALS = True` et `CSRF_TRUSTED_ORIGINS` (défaut `http://localhost:3000`), pour préparer le front cross-origin.

## 8. Sécurité

- Mots de passe hashés (défaut Django, validators déjà en place).
- Tokens **jamais** exposés au JS (httpOnly) → mitige le XSS.
- CSRF sur les méthodes non sûres → mitige le CSRF malgré les cookies.
- Refresh **rotation + blacklist** → limite le rejeu d'un refresh volé.
- `Secure` + `SameSite` durcis en prod (via env).

## 9. Stratégie de tests (TDD)

Chaque comportement est couvert par un test qui échoue d'abord :

1. `User` : création via email (pas de username), `create_superuser` a `is_staff`/`is_superuser`, email normalisé/unique.
2. `login/` : identifiants valides → 200 + cookies `access`/`refresh` posés (`HttpOnly`) + user renvoyé ; identifiants invalides → 401.
3. `me/` : sans cookie → 401 ; avec cookie access valide → 200 + email + groupes.
4. `refresh/` : refresh cookie valide → 200 + nouveau access ; ancien refresh blacklisté après rotation.
5. `logout/` : cookies effacés + refresh blacklisté.
6. CSRF : POST sans header CSRF → 403 ; avec header valide → OK.
7. `seed_roles` : idempotente, crée les 5 groupes ; relancée = pas de doublon.
8. `Mandate` : un seul `is_current=True` à la fois.
9. `PublishableMixin` : `publish()` passe `status=publie` + `published_at` renseigné.

## 10. Definition of Done

- [ ] `User` custom opérationnel, base migrée à neuf, `createsuperuser` fonctionne.
- [ ] `login`/`logout`/`refresh`/`me` fonctionnent avec cookies httpOnly + CSRF.
- [ ] Rotation + blacklist du refresh actives.
- [ ] 5 groupes seedés (commande idempotente).
- [ ] `Mandate` et `PublishableMixin` en place avec leurs tests.
- [ ] Tests verts (TDD), `ruff` propre.
- [ ] `CORS_ALLOW_CREDENTIALS` + `CSRF_TRUSTED_ORIGINS` configurés.

## 11. Points reportés (hors S1)

- Attribution fine des permissions par groupe → à mesure des modules (Sprint 2).
- Inscription alumni + validation → Sprint 2 (slice alumni).
- Réinitialisation de mot de passe par email, MFA → ultérieur.
