# CR de slice — Sprint 1 / S2 : Design system & fondations frontend

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé et mergé sur `main` (dépôt **frontend**) · **Date** : 2026-06-21
> **Spec** : [../superpowers/specs/2026-06-21-sprint1-s2-design-system.md](../superpowers/specs/2026-06-21-sprint1-s2-design-system.md)
> **Plan** : [../superpowers/plans/2026-06-21-sprint1-s2-design-system.md](../superpowers/plans/2026-06-21-sprint1-s2-design-system.md)

## Livré (dépôt `frontend`)

- **Tailwind CSS v4** (config CSS-first `@theme`) + **design tokens** en variables CSS dérivés du logo (orange, rouge, or, encre, crème, sémantiques) ; gradient de marque tokenisé.
- **Typographie** : Poppins (titres) + Inter (corps) via `next/font` (auto-hébergées).
- **Client axios** (`lib/api/client.ts`) : `withCredentials`, intercepteur CSRF (via `/auth/csrf/`), refresh-sur-401 avec rejeu et **garde anti-récursion** ; `ApiError`. Remplace le wrapper `fetch` de S0.
- **9 composants accessibles** : Button, Spinner, Badge, Link, Field, Alert, Container, Section, Card.
- **Layout public** : Header responsive (logo, nav, menu burger) + Footer ; page `/` déplacée sous le groupe de routes `(public)`.

## Développement (méthode)

Subagent-driven : 6 tâches en TDD + revue par tâche + revue finale de branche. Incidents traités : (a) bug de **récursion infinie** de l'intercepteur refresh détecté et corrigé dans le plan avant impl (garde `isRefreshCall`) ; (b) alias `@/*` ajouté à `vitest.config.ts` ; (c) **corrections d'accessibilité AA** post-revue finale.

## Corrections d'accessibilité (revue finale)

La revue a mesuré des contrastes sous le seuil **WCAG AA** (contrainte de la spec) :
- Boutons pleins : `primary-600` (4,02:1) → **`primary-700` #b5410c (5,64:1)**.
- Texte sémantique sur teinte (warning 2,03:1, etc.) → **tokens de texte dédiés** assombris (`--color-{success,warning,danger,info}-text`).
- `Field` : ajout de `"use client"` (utilise `useId`) pour éviter un crash en Server Component.

## Commits (branche `feat/s2-design-system` → fast-forward sur `main`)

| SHA | Sujet |
|---|---|
| `fc08d37` | feat(frontend): Tailwind v4 + design tokens + polices Poppins/Inter |
| `b5b4d91` | feat(frontend): client axios (intercepteurs CSRF + refresh sur 401) remplace fetch |
| `4c03c39` | feat(frontend): composants Button, Spinner, Badge, Link |
| `ed015da` | feat(frontend): composants Field et Alert (accessibles) |
| `a4212e7` | feat(frontend): primitives Container, Section, Card |
| `f585e03` | feat(frontend): layout public (header responsive + footer) |
| `63ab037` | fix(frontend): contraste AA (boutons primary-700, texte sémantique) + Field client + gradient tokenisé |

## Tests

- Suite `vitest` : **17/17**, `npm run build` OK (route `/` statique sous le layout public).
- Couvre : client axios (CSRF, refresh+rejeu, refresh échoué, non-401), Button (variant + loading), Badge, Field (label↔input, erreur), Alert (role), primitives layout, Header (logo, nav, burger), Footer (année).

## Points reportés (non bloquants)

- **Mode sombre** (tokens prêts) ; **primitives complexes** (dropdown/modale/tooltip → Radix) — S3/S4.
- **Branchement réel de la redirection login** sur échec de refresh → S4.
- **Client axios** : invalidation du cache CSRF + **mutex** anti-refresh concurrents.
- **UX/DA** : label « Fermer » sur le burger ouvert ; **icônes** dans Alert ; sous-parties **Card** (header/body/footer) ; **tokens d'ombre** chauds ; passthrough `...rest` uniforme sur toutes les primitives.
- `apiFetch` (fetch) retiré au profit de `api` (axios) — aucun appelant restant.

## Definition of Done — atteinte

- [x] Tailwind v4 + tokens (variables CSS) ; Poppins/Inter via next/font.
- [x] Client axios (CSRF + refresh-sur-401) remplace fetch ; tests verts.
- [x] Composants de base accessibles, testés (contraste AA corrigé).
- [x] Layout public (header responsive + burger + footer) ; page `/` sous `(public)`.
- [x] `npm run test` (17/17) + `npm run build` OK ; mergé sur `main`.
