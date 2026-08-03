# CR de slice — Sprint 2 / S5 : Socle métier

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé (fusionné sur `main` du dépôt **backend**) · **Date** : 2026-08-03
> **Plan** : [../superpowers/plans/2026-08-02-sprint2-s5-socle-metier.md](../superpowers/plans/2026-08-02-sprint2-s5-socle-metier.md)
> **Overview** : [../superpowers/specs/2026-08-02-sprint2-overview.md](../superpowers/specs/2026-08-02-sprint2-overview.md)

## Contexte

**Vague V0** du Sprint 2 (à faire en premier — débloque toutes les slices modules). Complète le socle S1 (`PublishableMixin`, `Mandate`, drf-spectacular déjà en place) avec les enablers transverses.

## Livré (dépôt `backend`)

- **Conventions DRF** : `DefaultPagination`, filtres `django-filter` (+ Search/Ordering), **format d'erreur normalisé** `bamfa_exception_handler` → `{error:{code,message,details}}`.
- **Abstraction email** : `send_templated_email` (backend email Django, **console** en dev) + **`send_templated_email_task`** (envoi asynchrone via Celery). **SMTP branchable** en dev par simple `.env` (défauts Mailpit `localhost:1025`).
- **Celery + Redis** : app Celery, `CELERY_*` réglages, **eager pilotable par env** (True hôte/tests, False en conteneur) ; tâche `ping`.
- **Base paiement** (`apps/payments`) : `Payment` + interface `PaymentProvider` + `ManualPaymentProvider` + `get_payment_provider()` (FedaPay/Kkiapay branchables) + migration.
- **Commande `seed_demo`** : rôles + utilisateurs de démo (admin superuser, rédacteur, alumni) + mandat courant, **idempotente**.
- **Conteneurisation dev** : `Dockerfile` backend + `docker-compose` (workspace) enrichi — services **web**, **worker** (Celery), **mailpit** (email dev), en plus de db/redis.

## Développement (méthode)

- **Subagent-driven** : 5 tâches TDD, un implémenteur frais par tâche + revue par tâche.
- **Revue finale de branche** (opus) → **« Ready to merge: Yes »**, aucun critique/important.
- **Renforts post-revue** (demandés par le porteur, tous re-revus) : réglages SMTP (Mailpit/Mailtrap/Brevo branchables), retours cosmétiques (handler liste, `PAGE_SIZE`, `is_staff` du seed, docstrings), Dockerfile + eager env, et surtout **test du vrai chemin async** (worker Celery en mémoire, hors eager) — comblant l'angle mort « tâche testée seulement en eager ».

## Commits (sur `main`, backend)

De `89ef496` à `dcdea94` (9 commits) :
`89ef496` conventions DRF · `e8433ee` abstraction email · `73cd965` Celery/Redis · `665064e` base paiement · `59312c4` seed_demo · `0d84b7b` réglages SMTP · `1565b80` retours cosmétiques · `f8edc31` Dockerfile + eager env · `dcdea94` task email async + test non-eager.
(Workspace : `009559a` docker-compose web/worker/mailpit.)

## Tests

- `pytest` : **34/34**, ruff propre, `makemigrations --check` propre. Chemin async validé **hors eager** (non-flaky, vérifié sur plusieurs runs).

## Points reportés (hors S5 → Sprint 3 / backlog)

- **Durcissement prod** : `config/settings/prod.py` (DEBUG off, cookies sécurisés, ALLOWED_HOSTS), **Dockerfile prod** (gunicorn, utilisateur non-root, sans deps de dev), **nginx** + conteneurisation frontend.
- **Observabilité** : logging structuré + hook Sentry + request-id (le socle en serait le bon endroit — à poser au Sprint 3).
- **Vérifier la CI GitHub** avec les nouvelles deps (celery, django-filter) — constaté vert en local.
- Impl. **Brevo** (email) / **FedaPay-Kkiapay** (paiement) : quand les clés seront dispo (branchement d'une classe, sans toucher les appelants).
- Test factory `PaymentProvider` non-défaut : à ajouter avec le vrai agrégateur (S16).

## Definition of Done — atteinte

- [x] Conventions DRF (pagination, filtres, erreurs).
- [x] Abstraction email (sync + task async ; SMTP/Mailpit branchable).
- [x] Celery + Redis (eager pilotable, chemin non-eager testé).
- [x] Base paiement (`Payment` + provider manuel branchable) + migration.
- [x] `seed_demo` idempotente.
- [x] Conteneurisation dev (Dockerfile + compose web/worker/mailpit).
- [x] `pytest` (34/34) vert, ruff propre, migrations à jour.
