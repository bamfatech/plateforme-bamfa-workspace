# Sprint 2 — Overview (Modules fonctionnels — cœur de la Phase 1)

> **Auteur** : Charlot DEDINOU
> **Type** : Doc de sprint (niveau 2 — léger). Liste les slices et leurs dépendances.
> **Période** : Semaines 3-4 · **Phase** : 1 · **Priorité** : Haute
> **Référence** : [Document d'architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md) · [Overview Sprint 1](2026-06-21-sprint1-overview.md)

---

## Objectif du sprint

Livrer le **cœur fonctionnel de la Phase 1** : les modules métier qui rendent BAMFA visible et gérable en ligne — contenus éditoriaux, alumni + annuaire, événements, opportunités, formulaires, newsletter, programmes/projets (P0), puis réalisations, blogs/commentaires, partenaires, dons, messaging/stats (P1). Chaque module = une **slice verticale** (app Django + CRUD admin + page(s) publique(s)).

À la fin du Sprint 2, BAMFA doit pouvoir **publier et gérer ses contenus sans développeur**, **centraliser ses alumni**, et **communiquer** (contact, newsletter, opportunités ciblées) — prêt pour la recette et la mise en production V1 (Sprint 3).

## Definition of Done du sprint

- [ ] Les modules **P0** sont livrés (contenus, alumni+annuaire+validation, événements, opportunités, contact/forms, newsletter, programmes/projets) avec back-office + pages publiques.
- [ ] Les modules **P1** sont livrés (réalisations, blogs/commentaires, partenaires, dons, messaging/stats).
- [ ] Les intégrations externes (email, paiement) sont **branchables** via une abstraction ; le repli manuel/console fonctionne en attendant les clés.
- [ ] Client API TypeScript régénéré à chaque évolution du schéma ; conventions API/erreurs respectées.

---

## Principe de découpage

- **Slice verticale par module** : une app Django (`models / serializers / views / permissions / services / tests`) + le **CRUD admin** (rôle concerné) + la/les **page(s) publique(s)** (SSR/ISR pour le SEO).
- **P0 d'abord, puis P1** (priorisation stricte du découpage).
- **Intégrations externes derrière une interface** (aucun compte prêt au démarrage) :
  - **Email** : interface `EmailService` → impl. **console/dev** maintenant, **Brevo** branchable plus tard (une classe).
  - **Paiement** : interface `PaymentProvider` → impl. **manuelle** maintenant, **FedaPay/Kkiapay** + webhook branchables plus tard.
  - **Plateformes tierces** (Transition, Baobab, ACN) : **liens sortants** uniquement (déjà amorcés au footer).
- **Modèles transverses** posés tôt (S5) : `PublishableMixin` (brouillon/publié/dépublié), `Payment` de base — pour que les slices suivantes démarrent sans friction.

---

## Découpage en slices verticales

```
S5 — SOCLE MÉTIER S2  (séquentiel, débloque tout le monde)
   │  (email abstrait, PublishableMixin, Payment/PaymentProvider, Celery/Redis, seed)
   │
   ├── P0 ───────────────────────────────────────────────┐
   ▼                                                      ▼
S6 CONTENUS   S7 ALUMNI*   S8 ÉVÉNEMENTS   S10 FORMS   S11 NEWSLETTER*   S12 PROGRAMMES/PROJETS
                  │                                                            │
                  ▼                                                            ▼
              S9 OPPORTUNITÉS*  (ciblage ⇐ alumni)                    S13 RÉALISATIONS (P1)
   │
   └── P1 ── S14 BLOGS/COMMENTAIRES ⇐ S6 · S15 PARTENAIRES · S16 DONS* · S17 MESSAGING/STATS ⇐ S7
```
`*` = slice complexe → **spec dédiée** avant le plan.

### P0 — cœur mise en ligne

| Slice | Contenu | Dépend de | Spec ? | Profil |
|---|---|---|---|---|
| **S5 — Socle métier S2** | Celery/Redis, **`EmailService`** (repli console), **`PublishableMixin`** + **`Payment`/`PaymentProvider`** (stub), pagination/filtres/erreurs DRF standardisés, commande **seed** de démo, régé client OpenAPI | S1 | ❌ plan | back (+front léger) |
| **S6 — Contenus / Actualités** (`cms`) | `Article` + `Category` (PublishableMixin), CRUD admin (Rédacteur), pages publiques liste/détail (SSR/ISR), SEO | S5 | ❌ plan | back + front |
| **S7 — Alumni** (`alumni`) | Inscription en ligne → **validation admin** (email) → profil éditable ; **annuaire** (public/connecté) ; espace `(alumni)` ; statut de complétude | S5 | ✅ **spec** | back + front |
| **S8 — Événements** (`events`) | Événements (PublishableMixin) + **inscriptions publiques** + email de confirmation ; CRUD admin ; page publique liste/détail + inscription | S5 | ❌ plan | back + front |
| **S9 — Opportunités** (`opportunities`) | Opportunités + inscriptions + **partage ciblé** (email vers une sélection d'alumni, Celery) ; CRUD admin ; page publique | S5 + S7 | ✅ **spec** | back + front |
| **S10 — Formulaires & Contact** (`forms`) | **Contact** (branche le POST du formulaire S3), suggestion, « Souvenir BAMFA » ; réception admin + email transactionnel | S5 | ❌ plan | back + front |
| **S11 — Newsletter & Campagnes** (`newsletter`) | Abonnement public + **campagnes** (`EmailService` + Celery) + gestion admin | S5 | ✅ **spec** | back + front |
| **S12 — Programmes & Projets** (`programs`, `projects`) | Contenus publiés (PublishableMixin), CRUD admin + pages publiques | S5 | ❌ plan | back + front |

### P1 — visibilité renforcée

| Slice | Contenu | Dépend de | Spec ? | Profil |
|---|---|---|---|---|
| **S13 — Réalisations & Succès alumni** (`realisations`) | Réalisations liées aux programmes + succès alumni ; CRUD admin + page publique | S12 + S7 | ❌ plan | back + front |
| **S14 — Blogs & Commentaires** (`cms` blogs, `comments`) | Blogposts + **commentaires** + modération (Rédacteur) | S6 | ❌ plan | back + front |
| **S15 — Partenaires** (`partners`) | Partenaires (logos publics) + **demandes de partenariat** (formulaire + réception admin) | S5 | ❌ plan | back + front |
| **S16 — Dons & Sponsoring** (`donations`) | Dons + sponsoring + **paiement** (`PaymentProvider` manuel, FedaPay/Kkiapay branchable) + webhook + reçu email | S5 | ✅ **spec** | back + front |
| **S17 — Messaging admin & Stats** (`messaging`, `stats`) | Envoi d'emails **ciblés** depuis l'admin (sélection d'alumni) + **vraies statistiques** du dashboard admin | S7 + contenus | ❌ plan | back + front |
| **Redirections tierces** | Liens sortants Transition MCF / Baobab / ACN | — | intégré (nav/pages, déjà amorcé) | front |

---

## Ordre d'exécution retenu

1. **S5** (socle métier) — débloque toutes les slices suivantes.
2. **P0** : **S6** (contenus) → **S7** (alumni)\* → **S8** (événements) → **S9** (opportunités)\* → **S10** (forms/contact) → **S11** (newsletter)\* → **S12** (programmes/projets).
3. **P1** : **S13** (réalisations) → **S14** (blogs/commentaires) → **S15** (partenaires) → **S16** (dons)\* → **S17** (messaging/stats).

`*` slices complexes : **spec détaillée** (brainstorm → spec → plan) avant l'implémentation. Les autres vont **directement au plan** (le socle étant posé et les patterns répétitifs).

## Dépendances clés

- **S5 d'abord** : fournit `EmailService`, `PublishableMixin`, `Payment/PaymentProvider`, Celery/Redis, seed → **tout en dépend**.
- **S7 (alumni)** alimente le **ciblage** de S9 (opportunités) et de S17 (messaging), et les **succès alumni** de S13.
- **S6 (contenus)** alimente **S14** (blogs/commentaires réutilisent le socle CMS).
- **Email** (S5) est requis par S7 (validation), S8 (confirmation), S9/S11/S17 (envois), S10 (accusé), S16 (reçu).
- Design system + shell back-office (Sprint 1 / refonte DA) sont **déjà en place** → les slices se concentrent sur le métier.

## Intégrations externes — stratégie « branchable »

| Intégration | Maintenant | Plus tard |
|---|---|---|
| **Email** (Brevo) | `EmailService` → impl. **console/dev** (logue le mail) | Ajouter `BrevoEmailService` (clé API), aucun changement d'appelant |
| **Paiement** (FedaPay/Kkiapay) | `PaymentProvider` → impl. **manuelle** (marque « à confirmer ») + endpoint webhook prêt | Ajouter l'impl. agrégateur, source de vérité = webhook |
| **Plateformes tierces** | Liens sortants (footer/nav) | Éventuelle synchro alumni par import CSV |

---

## Hors périmètre Sprint 2 (rappel)

- **P2 — Phase 2 (Sprints 4-6)** : `secretariat`, `documents` (GED/archives), `pm` (projets/tâches/réunions internes), `finance` (trésorerie/budgets/justificatifs), `reporting` (stats avancées, bilans, exports PDF/Excel), journal d'activité. Les rôles **Secrétaire**/**Trésorier** existent (posés en S1) mais leurs **modules** n'arrivent qu'en Phase 2.
- **Sprint 3** : tests/recette, responsive final, emails, **mise en production V1**.
- **Branchement réel** des services externes (clés Brevo / FedaPay-Kkiapay) : dès qu'ils sont disponibles — l'abstraction rend l'opération triviale.

## Prochaine étape

Rédiger le **plan d'implémentation de S5 (socle métier Sprint 2)**, puis démarrer par **S6 (contenus / actualités)**.
