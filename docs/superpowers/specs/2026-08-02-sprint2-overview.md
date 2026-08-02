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

| Slice | Contenu | Dépend de | Spec ? | Vague · Dev |
|---|---|---|---|---|
| **S5 — Socle métier S2** | Celery/Redis, **`EmailService`** (repli console), **`PublishableMixin`** + **`Payment`/`PaymentProvider`** (stub), pagination/filtres/erreurs DRF standardisés, commande **seed** de démo, régé client OpenAPI | S1 | ❌ plan | **V0 · A+B** |
| **S6 — Contenus / Actualités** (`cms`) | `Article` + `Category` (PublishableMixin), CRUD admin (Rédacteur), pages publiques liste/détail (SSR/ISR), SEO | S5 | ❌ plan | **V1 · A** |
| **S7 — Alumni** (`alumni`) | Inscription en ligne → **validation admin** (email) → profil éditable ; **annuaire** (public/connecté) ; espace `(alumni)` ; statut de complétude | S5 | ✅ **spec** | **V1 · B** |
| **S8 — Événements** (`events`) | Événements (PublishableMixin) + **inscriptions publiques** + email de confirmation ; CRUD admin ; page publique liste/détail + inscription | S5 | ❌ plan | **V2 · A** |
| **S9 — Opportunités** (`opportunities`) | Opportunités + inscriptions + **partage ciblé** (email vers une sélection d'alumni, Celery) ; CRUD admin ; page publique | S5 + S7 | ✅ **spec** | **V3 · A** |
| **S10 — Formulaires & Contact** (`forms`) | **Contact** (branche le POST du formulaire S3), suggestion, « Souvenir BAMFA » ; réception admin + email transactionnel | S5 | ❌ plan | **V3 · B** |
| **S11 — Newsletter & Campagnes** (`newsletter`) | Abonnement public + **campagnes** (`EmailService` + Celery) + gestion admin | S5 | ✅ **spec** | **V4 · A** |
| **S12 — Programmes & Projets** (`programs`, `projects`) | Contenus publiés (PublishableMixin), CRUD admin + pages publiques | S5 | ❌ plan | **V2 · B** |

### P1 — visibilité renforcée

| Slice | Contenu | Dépend de | Spec ? | Vague · Dev |
|---|---|---|---|---|
| **S13 — Réalisations & Succès alumni** (`realisations`) | Réalisations liées aux programmes + succès alumni ; CRUD admin + page publique | S12 + S7 | ❌ plan | **V4 · B** |
| **S14 — Blogs & Commentaires** (`cms` blogs, `comments`) | Blogposts + **commentaires** + modération (Rédacteur) | S6 | ❌ plan | **V5 · A** |
| **S15 — Partenaires** (`partners`) | Partenaires (logos publics) + **demandes de partenariat** (formulaire + réception admin) | S5 | ❌ plan | **V5 · B** |
| **S16 — Dons & Sponsoring** (`donations`) | Dons + sponsoring + **paiement** (`PaymentProvider` manuel, FedaPay/Kkiapay branchable) + webhook + reçu email | S5 | ✅ **spec** | **V6 · A** |
| **S17 — Messaging admin & Stats** (`messaging`, `stats`) | Envoi d'emails **ciblés** depuis l'admin (sélection d'alumni) + **vraies statistiques** du dashboard admin | S7 + contenus | ❌ plan | **V6 · B** |
| **Redirections tierces** | Liens sortants Transition MCF / Baobab / ACN | — | intégré (nav/pages, déjà amorcé) | au fil de l'eau |

---

## Exécution parallèle — 2 développeurs (Dev A / Dev B)

**Équipe : 2 développeurs.** Chaque slice = une app Django + des pages dédiées → conflits minimes. **Contrainte dure : S5 (socle) est fait en premier et seul** (il pose `EmailService`, `PublishableMixin`, `Payment`, Celery, seed → tout en dépend). Ensuite, le travail se répartit en **vagues parallèles** :

| Vague | **Dev A** | **Dev B** |
|---|---|---|
| **V0** | **S5 — Socle métier** (en binôme, puis merge sur `main`) | ↳ (idem, binôme) |
| **V1** | **S6** — Contenus / Actualités | **S7** — Alumni \* *(lancé tôt : débloque S9, S13, S17)* |
| **V2** | **S8** — Événements | **S12** — Programmes & Projets |
| **V3** | **S9** — Opportunités \* *(S7 ✔)* | **S10** — Formulaires & Contact |
| **V4** | **S11** — Newsletter \* | **S13** — Réalisations *(S12 + S7 ✔)* |
| **V5** | **S14** — Blogs & Commentaires *(S6 ✔)* | **S15** — Partenaires |
| **V6** | **S16** — Dons & Sponsoring \* | **S17** — Messaging admin & Stats *(S7 ✔)* |

`*` = slice complexe → **spec détaillée** (brainstorm → spec → plan) avant l'implémentation. Les autres vont **directement au plan** (socle posé, patterns répétitifs).

**Dépendances inter-pistes à respecter** (une seule règle : ne pas démarrer une slice avant que son prérequis soit mergé) :
- **S9** (Dev A, V3) ⇐ **S7** (Dev B, V1) · **S13** (Dev B, V4) ⇐ **S12** (Dev B, V2) + **S7** · **S14** (Dev A, V5) ⇐ **S6** (Dev A, V1) · **S17** (Dev B, V6) ⇐ **S7**.

### Règles de coordination (peu, mais réelles)

- **Branche par slice** (`feat/<slice>`) + PR + revue + **merges fréquents** sur `main` (petits lots).
- **`Sidebar` admin** : chaque module ajoute son entrée de nav → source de petits conflits ; merger souvent, ou centraliser les entrées dans un registre partagé posé en S5.
- **Client OpenAPI** (`frontend/lib/api/schema.d.ts`) : régénérer (`npm run generate:api`) **après** le merge d'un backend qui change le schéma, pour repartir d'un client à jour.
- **`common` backend + tokens front** : figés en S5, réutilisés partout (ne pas les diverger par piste).
- **Répartition indicative** : Dev B prend **S7 (alumni)** tôt car c'est la slice qui débloque le plus ; Dev A avance sur la chaîne contenus. Les profils back/front étant mixtes par slice, chaque dev fait sa slice de bout en bout (backend + admin + public).

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
