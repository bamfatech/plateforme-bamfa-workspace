# Sprint 1 / S2 — Design system & fondations frontend : Spec détaillée

> **Auteur** : Charlot DEDINOU
> **Type** : Spec de slice (niveau 3 — slice à forte composante design → spec avant plan).
> **Sprint** : 1 · **Slice** : S2 · **Dépôt** : `frontend` · **Priorité** : P0
> **Références** : [architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md) · [overview sprint 1](2026-06-21-sprint1-overview.md)

---

## 1. Objectif

Poser les **fondations frontend** de la plateforme BAMFA : un **design system** aligné sur l'identité de marque (dérivé du logo), le **client HTTP axios** (avec intercepteurs auth/CSRF, en remplacement du `fetch` du socle S0), un **jeu de composants de base** accessibles, et le **layout public** (header/footer responsive). À la fin de S2, l'équipe peut construire les pages (S3) et l'espace admin (S4) sur des bases visuelles et techniques cohérentes.

## 2. Périmètre

**Inclus :**
- Configuration **Tailwind CSS v4** + **design tokens** (couleurs, typo, espacement, rayons, ombres) en variables CSS.
- **Typographie** : Poppins (titres) + Inter (corps) via `next/font`.
- **Client axios** (`lib/api/client.ts`) avec intercepteurs CSRF + refresh-sur-401, `withCredentials`, `ApiError`. Remplace le wrapper `fetch` de S0.
- **Composants de base** : Button, Link, Field (Input/label/erreur), Card, Badge, Alert, Container/Section, Spinner.
- **Layout public** : Header (logo + nav + burger mobile) + Footer, responsive, appliqué à la zone `(public)`.

**Exclus (→ autres slices) :**
- Contenu des pages publiques (Accueil, À propos…) → **S3**.
- UI de connexion et shell back-office → **S4**.
- Mode sombre (tokens pensés pour, mais non livré) → ultérieur.
- Primitives complexes (dropdown, modale, tooltip accessibles) → au besoin dans les slices suivantes (option Radix UI).

## 3. Décisions de design (validées)

| Sujet | Décision |
|---|---|
| Styling | **Tailwind CSS v4** (config CSS-first `@theme` dans `globals.css`) |
| Thème | **Clair d'abord** ; tokens en variables CSS prêts pour un thème sombre ultérieur |
| Typographie | **Poppins** (titres) + **Inter** (corps), auto-hébergées via `next/font/google` |
| Client HTTP | **axios** (remplace `fetch`), intercepteurs CSRF + refresh-sur-401 |
| Composants | Faits maison avec Tailwind, accessibles ; Radix réservé aux primitives complexes futures |

## 4. Design tokens

### 4.1 Couleurs de marque (dérivées du logo)
| Rôle | Hex |
|---|---|
| Primaire — Orange BAMFA | `#F26522` |
| Accent — Rouge | `#E11B22` |
| Accent — Or / Ambre | `#FBB040` |
| Encre (texte) | `#17181B` |
| Crème (surface chaleureuse) | `#FAF6F0` |

- **Dégradé signature** : `linear-gradient(135deg, #E11B22, #F26522, #FBB040)` — réservé aux éléments forts (hero, CTA majeurs, accents).
- **Échelle primaire (50→900)** dérivée de l'orange : les fonds **interactifs** (boutons) utilisent une teinte foncée (**primary-600**, ~`#DA5312`) pour garantir un contraste **AA ≥ 4.5:1** avec du texte blanc ; `#F26522` (primary-500) reste la couleur de marque d'accent.

### 4.2 Neutres
Échelle de gris chauds (stone-like) : `#FAFAF9 · #F5F5F4 · #E7E5E4 · #D6D3D1 · #A8A29E · #78716C · #57534E · #292524 · #17181B`. Fond par défaut : blanc ; sections alternées : crème `#FAF6F0`.

### 4.3 Sémantique (états)
| État | Hex |
|---|---|
| Succès | `#1E9E5A` |
| Info | `#2563EB` |
| Alerte | `#F5A623` |
| Erreur | `#DC2626` (rouge distinct du rouge de marque pour éviter la confusion) |

### 4.4 Autres tokens
- **Rayons** : `sm 4px · md 8px · lg 12px · xl 16px · full 9999px`.
- **Ombres** : échelle douce (`sm/md/lg`) teintée chaud.
- **Espacement** : échelle Tailwind par défaut (base 4px).
- **Conteneur** : largeur max lisible (`max-w-7xl`), gouttières responsives.

## 5. Typographie

- **Poppins** : titres (`h1`–`h4`), poids 500/600/700.
- **Inter** : corps, labels, UI, poids 400/500/600.
- Exposées en variables (`--font-poppins`, `--font-inter`) et mappées dans Tailwind (`font-heading`, `font-sans`).
- Échelle typographique responsive (ex. `h1` ~ 2.5–3.5rem, corps 1rem/1.6). Hauteurs de ligne confortables.

## 6. Client axios (`lib/api/client.ts`)

Remplace le wrapper `fetch` de S0 (même rôle, superset de fonctionnalités).

- Instance axios : `baseURL = NEXT_PUBLIC_API_BASE_URL`, `withCredentials: true` (cookies httpOnly).
- **Intercepteur requête** : pour les méthodes non sûres (POST/PUT/PATCH/DELETE), ajoute l'en-tête `X-CSRFToken`. Le token est obtenu via `GET /api/v1/auth/csrf/` (mis en cache côté client, rafraîchi si absent).
- **Intercepteur réponse** : sur **401**, tente **une seule fois** `POST /api/v1/auth/refresh/` puis rejoue la requête initiale ; en cas d'échec du refresh, propage une `ApiError` et déclenche le nettoyage de l'état d'authentification (redirection vers la connexion — le hook réel de redirection sera branché en S4).
- **Erreurs** : classe `ApiError` (`status`, `message`, détails par champ) pour une gestion uniforme côté UI.
- **Types** : les types générés depuis OpenAPI (`lib/api/schema.d.ts`, S0) restent la source de vérité des payloads.

*Migration :* le test `lib/api/client.test.ts` de S0 (basé sur `fetch`) est réécrit pour l'instance axios (mock d'axios) ; l'API publique `apiFetch`/`ApiError` conserve une signature équivalente pour les appelants existants.

## 7. Composants de base

Chacun : accessible (HTML sémantique, focus visibles, `aria-*` au besoin), typé, testé, responsive.

| Composant | Rôle / variants |
|---|---|
| **Button** | `primary` (fond primary-600, texte blanc), `secondary` (contour), `ghost`, `gradient` (dégradé signature) ; tailles sm/md/lg ; états hover/focus/disabled/loading |
| **Link** | lien stylé (interne Next `Link` / externe), état focus |
| **Field** | label + input + message d'aide/erreur, `aria-invalid`/`aria-describedby` |
| **Card** | conteneur surface (padding, rayon, ombre) + sous-parties (header/body/footer) |
| **Badge** | pastille de statut (neutre + sémantiques) |
| **Alert** | message contextuel (succès/info/alerte/erreur) avec icône |
| **Container / Section** | largeur max + rythme vertical cohérent |
| **Spinner** | indicateur de chargement accessible (`role="status"`) |

## 8. Layout public (`app/(public)/layout.tsx`)

- **Header** : logo BAMFA (image `public/logo.jpg`), navigation principale (liens vers les futures pages S3), menu **burger** en mobile, CTA (ex. « Nous soutenir »). Sticky, responsive.
- **Footer** : liens institutionnels, mentions, réseaux sociaux, année dynamique.
- Applique polices + tokens + conteneur. Le contenu des pages est injecté via `children` (rempli en S3).

## 9. Accessibilité & qualité

- Contrastes **WCAG AA** (d'où le primary-600 pour les boutons).
- Focus visibles au clavier, navigation cohérente, HTML sémantique (`header`/`nav`/`main`/`footer`).
- Images avec `alt` ; `next/image` pour le logo.
- Responsive mobile/tablette/desktop (le cahier des charges l'exige).

## 10. Stratégie de tests (TDD)

- **Composants** (Vitest + Testing Library) : rendu des variants/états, attributs d'accessibilité clés (ex. Button `disabled`/`aria-busy`, Field liaison label↔erreur, Alert `role`).
- **Client axios** : l'intercepteur ajoute `X-CSRFToken` sur une requête non sûre ; un 401 déclenche un refresh puis un rejeu (mock) ; échec de refresh → `ApiError`.
- **Layout** : le header rend le logo + la nav ; le burger bascule le menu mobile.

## 11. Definition of Done

- [ ] Tailwind v4 configuré, tokens (couleurs/typo/rayons/ombres) en variables CSS.
- [ ] Poppins + Inter chargées via `next/font`, mappées dans Tailwind.
- [ ] Client axios avec intercepteurs CSRF + refresh-sur-401 (tests verts) ; ancien wrapper `fetch` remplacé.
- [ ] Composants de base livrés, accessibles, testés.
- [ ] Layout public (header responsive + footer) intégré.
- [ ] `npm run test` vert, `npm run build` OK, contrastes AA respectés.

## 12. Points reportés (hors S2)

- **Mode sombre** (tokens prêts, thème à livrer plus tard).
- **Primitives complexes** (dropdown/modale/tooltip) → Radix au besoin dans S3/S4.
- **Branchement réel de la redirection login** sur échec de refresh → S4 (dépend du store d'auth / des routes admin).
- **Contenu des pages** (Accueil, À propos, etc.) → S3.
