# Sprint 1 — Overview (Cadrage, socle technique, auth & premières pages)

> **Type** : Doc de sprint (niveau 2 — léger). Liste les slices et leurs dépendances.
> **Période** : Semaines 1-2 · **Phase** : 1 · **Priorité** : Très haute
> **Référence** : [Document d'architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md)

---

## Objectif du sprint

Mettre en place les **fondations** du projet : monorepo opérationnel, authentification admin, design system, et premières pages publiques statiques. À la fin du sprint, l'équipe doit pouvoir développer les modules métier (Sprint 2) **en parallèle sans se gêner**.

## Definition of Done du sprint (critères de validation du découpage)

- [ ] Le socle frontend/backend est fonctionnel.
- [ ] L'authentification admin fonctionne.
- [ ] Les premières pages publiques sont intégrées.
- [ ] Le document de référence d'architecture est validé. ✅ (déjà fait)

---

## Découpage en slices verticales

```
S0 — SOCLE  (séquentiel, débloque tout le monde)
   │
   ├───────────────┬───────────────────────────┐
   ▼               ▼                           
S1 — AUTH       S2 — DESIGN SYSTEM
& RÔLES           │
   │              ├──────────────┐
   │              ▼              ▼
   └────────▶  S4 — SHELL     S3 — PAGES PUBLIQUES
              BACK-OFFICE       STATIQUES
```

| Slice | Contenu | Dépend de | Spec détaillée ? | Profil |
|---|---|---|---|---|
| **S0 — Socle** | Monorepo, Docker Compose, squelette Django/DRF + PostgreSQL, squelette Next.js, client API généré, CI de base | — | ❌ (plan direct) | 1 back + 1 front |
| **S1 — Auth & rôles** | App `accounts` : modèle `User`, rôles/permissions, JWT en cookies httpOnly, endpoints `login`/`logout`/`me`, modèles transverses (`Mandate`, `PublishableMixin`). **Backend uniquement** ; l'intégration frontend (UI de login, intercepteurs) arrive avec S2/S4 | S0 | ❌ (plan direct) | back |
| **S2 — Design system & fondations frontend** | Tailwind CSS + config, tokens (couleurs, typo, espacements), **client HTTP axios** (intercepteurs JWT/refresh — remplace le `fetch` du socle), composants de base, layout responsive | S0 | ❌ (plan direct) | front |
| **S3 — Pages publiques statiques** | Accueil, À propos, Vision/mission/valeurs, Fonctionnement, Organigramme, Contact | S2 | ❌ (plan direct) | front |
| **S4 — Shell back-office** | Layout admin authentifié, navigation, protection des routes par rôle, page de login | S1 + S2 | ❌ (plan direct) | front |

> Aucune slice du Sprint 1 n'est « complexe/ambiguë » → on va **directement au plan d'implémentation** pour chacune (pas de spec détaillée intermédiaire). Les slices complexes (paiement, mails ciblés, finances) viendront aux Sprints 2 et 5 et auront, elles, leur spec dédiée.

## Statut des slices

- **S0 — Socle** : ✅ terminée et mergée (voir [docs/done/2026-06-21-sprint1-s0-socle.md](../../done/2026-06-21-sprint1-s0-socle.md)). *Le socle frontend livre un client `fetch` minimal, remplacé par axios en S2.*
- **S1 — Auth & rôles** : ⏳ prochaine (en cours de planification).
- **S2, S3, S4** : à venir.

## Dépendances clés

- **S0 d'abord** : ✅ fait.
- **S1 (auth)** : backend autonome (ne dépend que de S0) → peut démarrer immédiatement.
- **S2 (design system & fondations front)** fournit **Tailwind, le thème et le client axios** → alimente **S3**, **S4** et l'intégration frontend de l'auth.
- **S4 (shell back-office + login UI)** dépend de **S1** (API auth) **et S2** (axios + design system).
- Les **modèles transverses** (`User`, `Mandate`, `PublishableMixin`) sont posés en S0/S1 — volontairement tôt, pour que le Sprint 2 démarre sans friction.

## Ordre d'exécution retenu

1. **S0** (socle) → ✅ mergé sur `main`.
2. **S1** (auth, backend) → **en cours**.
3. **S2** (design system & fondations frontend : Tailwind, thème, axios, composants).
4. **S3** (pages publiques) + **S4** (shell back-office + login UI).

## Hors périmètre Sprint 1 (rappel)

CRUD des contenus, modules métier, alumni dynamique, formulaires, paiement → **Sprint 2 et au-delà**. Le Sprint 1 ne livre que le **socle + auth + design + pages statiques**.
