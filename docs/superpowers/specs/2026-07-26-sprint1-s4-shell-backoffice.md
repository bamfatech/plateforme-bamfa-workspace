# Sprint 1 / S4 — Shell back-office & connexion : Spec détaillée

> **Auteur** : Charlot DEDINOU
> **Type** : Spec de slice (niveau 3 — slice complexe : intégration auth frontend → spec avant plan).
> **Sprint** : 1 · **Slice** : S4 · **Dépôt** : `frontend` · **Priorité** : P0
> **Références** : [architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md) · [overview sprint 1](2026-06-21-sprint1-overview.md) · [spec S1 auth](2026-06-21-sprint1-s1-auth-roles.md) · [spec S2 design system](2026-06-21-sprint1-s2-design-system.md)

---

## 1. Objectif

Relier l'**authentification backend (S1)** au **frontend (S2)** : page de **connexion**, gestion de l'**état d'authentification**, **protection des routes** admin, et le **shell du back-office** (sidebar / topbar / déconnexion) avec un **dashboard placeholder**. À la fin de S4, un administrateur peut se connecter, accéder à un espace protégé, voir son profil/rôle et se déconnecter — prêt à accueillir les modules métier du Sprint 2.

## 2. Périmètre

**Inclus :**
- Dépendance **`@tanstack/react-query`** + `Providers` (QueryClientProvider) dans le layout racine.
- Hook **`useAuth`** (query `/me` + mutations `login`/`logout`).
- **Page de connexion** `/connexion` (plein écran, formulaire, gestion d'erreurs).
- **Protection des routes** : middleware Next (présence cookie sur `/admin/*`) + garde client dans le layout `(admin)`.
- **Layout admin** (sidebar + topbar + déconnexion) et **dashboard** `/admin` (placeholder).
- Branchement de la note reportée S2 : **redirection vers la connexion sur échec de refresh**.

**Exclus (→ Sprint 2 ou autres slices) :**
- Modules métier du back-office (CRUD contenus, alumni, événements, finances…) → **Sprint 2**.
- Inscription alumni + validation → **Sprint 2**.
- Réinitialisation de mot de passe, MFA → ultérieur.
- Gestion fine des permissions par écran (les modules apportent leurs permissions) → Sprint 2.

## 3. Décisions de design (validées)

| Sujet | Décision |
|---|---|
| État auth | **TanStack Query** : `useAuth` = `useQuery(["me"])` + mutations `login`/`logout` |
| Tokens | Restent en **cookies httpOnly** (jamais lus en JS) ; l'état = résultat de `/me` |
| Protection routes | **Double barrière** : middleware Next (cookie) + garde client (layout admin, `/me`) |
| Routes | **`/connexion`** (plein écran) + **`(admin)/admin`** (dashboard sous layout admin) |
| Client HTTP | Réutilise l'instance **axios** de S2 (CSRF + refresh-sur-401 déjà en place) |

## 4. État d'authentification

- **`components/providers/Providers.tsx`** (`"use client"`) : instancie un `QueryClient` et enveloppe `children` d'un `QueryClientProvider`. Ajouté dans `app/layout.tsx` (racine) autour de `children`. Les pages restent des Server Components (enfants d'un Client Component).
- **`lib/auth/useAuth.ts`** (`"use client"`) :
  - `meQuery = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me/").then(r => r.data), retry: false })`.
  - Expose `{ user, isLoading, isAuthenticated }` (`isAuthenticated = !!user`).
  - `login(email, password)` : `useMutation` → `POST /auth/login/` → `queryClient.invalidateQueries(["me"])`.
  - `logout()` : `useMutation` → `POST /auth/logout/` → `queryClient.setQueryData(["me"], null)` + redirection `/connexion`.
- Le type `User` provient du serializer S1 (`id, email, first_name, last_name, is_staff, is_superuser, roles`).

## 5. Protection des routes (double barrière)

- **`middleware.ts`** (racine `frontend/`) :
  - `matcher: ["/admin/:path*"]`.
  - Si la requête vers `/admin/*` n'a **pas** le cookie `bamfa_refresh` → `NextResponse.redirect('/connexion')`.
  - Barrière edge rapide (constate la présence du cookie, pas sa validité).
  - Logique de décision extraite dans une fonction testable (`shouldRedirectToLogin(pathname, hasSessionCookie)`).
- **Garde client** dans **`app/(admin)/layout.tsx`** (`"use client"`) :
  - `const { isLoading, isAuthenticated } = useAuth()`.
  - `isLoading` → affiche un `Spinner` plein écran.
  - `!isAuthenticated` → `router.replace('/connexion')` (via `useEffect`) + rien rendu.
  - authentifié → rend le shell admin + `children`.
  - Couvre la **validité réelle** du token (via `/me`) et la redirection sur échec de refresh.

## 6. Routes & structure

```
app/
├── layout.tsx                    # racine : + <Providers>
├── (public)/…                    # site public (S3)
├── connexion/
│   └── page.tsx                  # page de connexion plein écran (hors layouts)
└── (admin)/
    ├── layout.tsx                # garde client + shell (sidebar/topbar)
    └── admin/
        └── page.tsx              # dashboard placeholder
middleware.ts                     # barrière /admin/*
```

- `/connexion` n'hérite ni du layout public ni du layout admin (page autonome, centrée).

## 7. Page de connexion (`/connexion`)

- Design soigné, cohérent avec l'identité : panneau/emblème de marque + carte de connexion centrée.
- Formulaire (client) : `Field` e-mail + `Field` mot de passe (`type="password"`), `Button` « Se connecter », `Alert` pour l'erreur globale.
- Validation client (champs requis) ; à la soumission → `login`.
- **Succès** → redirection `/admin`. **401** → `Alert` « Identifiants invalides ». Autre erreur → message générique.
- Si déjà authentifié (au montage) → redirection `/admin`.

## 8. Shell du back-office (`(admin)/layout.tsx`)

- **Sidebar** : logo BAMFA + navigation. Entrées : **Tableau de bord** (actif), puis entrées **« à venir »** pour les futurs modules (contenus, alumni, événements…) affichées désactivées. Filtrage **selon le rôle** (via `user.roles` / `is_superuser`).
- **Topbar** : titre de section + **menu utilisateur** (nom/prénom, e-mail, **rôle**) + bouton **Déconnexion**.
- Responsive : sidebar repliable en mobile (menu burger).

## 9. Dashboard placeholder (`(admin)/admin/page.tsx`)

- Accueil : « Bonjour {prénom} », rappel des **rôles**, et **cartes de statistiques** placeholder (« à venir au Sprint 2 »). Utilise `Card`, `Badge` (S2).

## 10. Sécurité & accessibilité

- Tokens jamais exposés au JS (cookies httpOnly) — le front ne manipule que le résultat de `/me`.
- Déconnexion : blackliste le refresh côté serveur (S1) + efface les cookies + vide le cache query.
- Formulaire accessible (labels liés, erreurs `aria`), focus visibles, contrastes AA (tokens S2).

## 11. Stratégie de tests (Vitest + Testing Library + axios-mock-adapter)

- **Formulaire de connexion** : champs présents ; soumission vide → erreurs ; identifiants valides (mock 200) → appelle la redirection ; 401 → `Alert` « Identifiants invalides ».
- **`useAuth`** : `/me` 200 → `isAuthenticated=true` + user ; `/me` 401 → `isAuthenticated=false` (rendu via un composant de test enveloppé d'un `QueryClientProvider`).
- **Garde admin** : `isLoading` → spinner ; non authentifié → déclenche la redirection ; authentifié → rend les enfants (avec `useAuth` mocké).
- **Middleware** : test unitaire de `shouldRedirectToLogin(pathname, hasSessionCookie)` (protégé sans cookie → true ; avec cookie → false ; hors `/admin` → false).

## 12. Definition of Done

- [ ] `@tanstack/react-query` + `Providers` en place ; `useAuth` opérationnel.
- [ ] `/connexion` : connexion fonctionnelle (succès → `/admin`, 401 → erreur).
- [ ] Middleware protège `/admin/*` (cookie absent → `/connexion`).
- [ ] Layout `(admin)` : garde client (spinner / redirection / rendu) + shell (sidebar/topbar/déconnexion).
- [ ] Dashboard placeholder affiche l'utilisateur + ses rôles.
- [ ] Déconnexion fonctionnelle (serveur + cache) ; redirection connexion sur échec de refresh.
- [ ] `npm run test` vert, `npm run build` OK, contrastes AA.

## 13. Points reportés (hors S4)

- **Modules métier** du back-office (CRUD contenus, alumni, événements, finances, stats réelles…) → **Sprint 2**.
- Remplacement des entrées de nav « à venir » par les vrais modules.
- Permissions fines par écran (apportées avec chaque module).
- Réinitialisation de mot de passe, MFA → ultérieur.
