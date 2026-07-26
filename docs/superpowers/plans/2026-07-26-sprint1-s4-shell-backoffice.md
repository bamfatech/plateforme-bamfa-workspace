# Plan d'implémentation — Sprint 1 / S4 : Shell back-office & connexion

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Spec** : [../specs/2026-07-26-sprint1-s4-shell-backoffice.md](../specs/2026-07-26-sprint1-s4-shell-backoffice.md)

**Goal:** Relier l'auth backend (S1) au frontend : connexion, état d'authentification via TanStack Query, protection des routes `/admin`, shell back-office (sidebar/topbar/déconnexion) et dashboard placeholder.

**Architecture:** `useAuth` (TanStack Query) interroge `GET /auth/me/` et expose des mutations `login`/`logout` (`POST /auth/login/`, `/auth/logout/`) sur l'instance axios existante (S2). Double barrière de protection : middleware Next (présence du cookie `bamfa_refresh` sur `/admin/*`) + garde client dans le layout `(admin)` (validité réelle via `/me`). Les tokens restent en cookies httpOnly, jamais lus en JS.

**Tech Stack:** Next.js 15 (App Router, TS), React 19, `@tanstack/react-query` v5, axios (instance `api` de S2), Tailwind v4, Vitest + Testing Library + axios-mock-adapter.

## Global Constraints

- **Langue** : tout le contenu, l'UI et les messages de commit en **français**.
- **Commits** : ne **jamais** mentionner Claude / IA / assistant. Format `type: résumé` (`feat:`, `test:`, `chore:`, `docs:`).
- **Dépôt** : tout se passe dans `frontend/` (dépôt git autonome).
- **Tokens jamais exposés au JS** : le front ne manipule que le résultat de `/me` (cookies httpOnly).
- **Design system S2** : réutiliser `Field`, `Button`, `Alert`, `Spinner`, `Container`, `Card`, `Badge` ; tokens (`primary-700`, `bg-brand-gradient`, `ink`, `cream`) ; contrastes AA.
- **Alias** : `@/*` → racine `frontend/` (configuré dans `tsconfig` et `vitest.config.ts`).
- **Endpoints backend** (S1, préfixe `NEXT_PUBLIC_API_BASE_URL` = `http://localhost:8000/api/v1`) :
  - `POST /auth/login/` — body `{ email, password }` → `200` renvoie l'objet **User** ; `401` → `{ detail: "Identifiants invalides." }`.
  - `POST /auth/logout/` → `{ detail }` (efface les cookies, blackliste le refresh).
  - `GET /auth/me/` → objet **User** (nécessite l'auth ; `401` sinon).
- **Forme de l'objet User** (serializer S1) : `{ id: number; email: string; first_name: string; last_name: string; is_staff: boolean; is_superuser: boolean; roles: string[] }`. `roles` = noms des groupes Django (`Alumni`, `Rédacteur de contenu`, `Secrétaire`, `Trésorier`, `Administrateur`).
- **Cookie de session** (pour le middleware) : `bamfa_refresh`.
- **Pattern de test axios** (établi dans `lib/api/client.test.ts`) : instancier `new MockAdapter(api)` **et** `new MockAdapter(axios)` avec `axiosMock.onGet(/\/auth\/csrf\/$/).reply(200, { csrfToken: "tok123" })` (le `fetchCsrfToken` du client utilise l'axios global sur les requêtes POST).

## File Structure

- `lib/auth/types.ts` — type `User` (source unique).
- `lib/auth/useAuth.ts` — hook `useAuth` (query `/me` + mutations login/logout).
- `lib/auth/route-guard.ts` — fonction pure `shouldRedirectToLogin` (partagée middleware + test).
- `lib/test-utils.tsx` — `renderWithClient` / `createTestQueryClient` (helpers de test react-query).
- `components/providers/Providers.tsx` — `QueryClientProvider` (client).
- `components/auth/LoginForm.tsx` — formulaire de connexion (client).
- `components/admin/Sidebar.tsx` — navigation latérale (client).
- `components/admin/Topbar.tsx` — barre supérieure + déconnexion (client).
- `middleware.ts` — barrière edge sur `/admin/*`.
- `app/layout.tsx` — **modifié** : enveloppe `children` dans `<Providers>`.
- `app/connexion/page.tsx` — page de connexion plein écran (client).
- `app/(admin)/layout.tsx` — garde client + shell.
- `app/(admin)/admin/page.tsx` — dashboard placeholder.

---

## Task 1 : Dépendance react-query, type User & Providers

**Files:**
- Modify: `frontend/package.json` (ajout `@tanstack/react-query`)
- Create: `frontend/lib/auth/types.ts`
- Create: `frontend/components/providers/Providers.tsx`
- Modify: `frontend/app/layout.tsx`
- Test: `frontend/components/providers/Providers.test.tsx`

**Interfaces:**
- Produces: `User` (interface, depuis `@/lib/auth/types`) ; `Providers` (composant `{ children: ReactNode }`, depuis `@/components/providers/Providers`).

- [ ] **Step 1 : Installer la dépendance**

Run: `npm install @tanstack/react-query`
Expected: `package.json` liste `@tanstack/react-query` (v5.x) dans `dependencies`.

- [ ] **Step 2 : Créer le type User**

`frontend/lib/auth/types.ts` :

```ts
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: string[];
}
```

- [ ] **Step 3 : Écrire le test Providers (échec attendu)**

`frontend/components/providers/Providers.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "./Providers";

describe("Providers", () => {
  it("rend ses enfants", () => {
    render(
      <Providers>
        <p>contenu</p>
      </Providers>,
    );
    expect(screen.getByText("contenu")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4 : Lancer le test (échec)**

Run: `npm run test -- Providers`
Expected: FAIL (`Providers` introuvable).

- [ ] **Step 5 : Créer Providers**

`frontend/components/providers/Providers.tsx` :

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 6 : Brancher Providers dans le layout racine**

Dans `frontend/app/layout.tsx`, importer et envelopper `children` :

```tsx
import type { ReactNode } from "react";
import { Inter, Poppins } from "next/font/google";

import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "BAMFA",
  description: "Plateforme de la Benin Association of the Mastercard Foundation Alumni",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7 : Lancer le test (succès) + build**

Run: `npm run test -- Providers`
Expected: PASS.
Run: `npm run build`
Expected: build OK (pages publiques inchangées, restent des Server Components).

- [ ] **Step 8 : Commit**

```bash
git add package.json package-lock.json lib/auth/types.ts components/providers/ app/layout.tsx
git commit -m "feat: ajoute react-query (Providers) et le type User"
```

---

## Task 2 : Hook useAuth & helpers de test

**Files:**
- Create: `frontend/lib/test-utils.tsx`
- Create: `frontend/lib/auth/useAuth.ts`
- Test: `frontend/lib/auth/useAuth.test.tsx`

**Interfaces:**
- Consumes: `User` (`@/lib/auth/types`), `api` (`@/lib/api/client`).
- Produces:
  - `createTestQueryClient(): QueryClient` et `renderWithClient(ui: ReactElement)` (depuis `@/lib/test-utils`) ; `Wrapper` de test `queryWrapper()` renvoyant un composant `{ children }`.
  - `useAuth()` (depuis `@/lib/auth/useAuth`) → `{ user: User | null; isLoading: boolean; isAuthenticated: boolean; login: UseMutationResult; logout: UseMutationResult }`. `login.mutateAsync({ email, password })` résout l'objet `User`. `logout.mutateAsync()` résout `void`.

- [ ] **Step 1 : Créer les helpers de test**

`frontend/lib/test-utils.tsx` :

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function queryWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

export function renderWithClient(ui: ReactElement) {
  const client = createTestQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

- [ ] **Step 2 : Écrire le test useAuth (échec attendu)**

`frontend/lib/auth/useAuth.test.tsx` :

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { queryWrapper } from "@/lib/test-utils";

import { useAuth } from "./useAuth";

let apiMock: MockAdapter;
let axiosMock: MockAdapter;

const USER = {
  id: 1,
  email: "admin@bamfa.org",
  first_name: "Ada",
  last_name: "Lovelace",
  is_staff: true,
  is_superuser: true,
  roles: ["Administrateur"],
};

beforeEach(() => {
  apiMock = new MockAdapter(api);
  axiosMock = new MockAdapter(axios);
  axiosMock.onGet(/\/auth\/csrf\/$/).reply(200, { csrfToken: "tok123" });
});

afterEach(() => {
  apiMock.restore();
  axiosMock.restore();
});

describe("useAuth", () => {
  it("expose l'utilisateur quand /me répond 200", async () => {
    apiMock.onGet("/auth/me/").reply(200, USER);
    const { result } = renderHook(() => useAuth(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.email).toBe("admin@bamfa.org");
  });

  it("n'authentifie pas quand /me échoue (401 persistant)", async () => {
    apiMock.onGet("/auth/me/").reply(401);
    apiMock.onPost("/auth/refresh/").reply(401);
    const { result } = renderHook(() => useAuth(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("login renvoie l'utilisateur et l'authentifie", async () => {
    apiMock.onGet("/auth/me/").reply(401);
    apiMock.onPost("/auth/refresh/").reply(401);
    apiMock.onPost("/auth/login/").reply(200, USER);
    const { result } = renderHook(() => useAuth(), { wrapper: queryWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.login.mutateAsync({ email: "admin@bamfa.org", password: "x" });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.email).toBe("admin@bamfa.org");
  });
});
```

- [ ] **Step 3 : Lancer le test (échec)**

Run: `npm run test -- useAuth`
Expected: FAIL (`useAuth` introuvable).

- [ ] **Step 4 : Implémenter useAuth**

`frontend/lib/auth/useAuth.ts` :

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { User } from "./types";

interface Credentials {
  email: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me/");
      return data;
    },
  });

  const login = useMutation({
    mutationFn: async (credentials: Credentials) => {
      const { data } = await api.post<User>("/auth/login/", credentials);
      return data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout/");
    },
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
    },
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    login,
    logout,
  };
}
```

- [ ] **Step 5 : Lancer le test (succès)**

Run: `npm run test -- useAuth`
Expected: PASS (3 tests).

- [ ] **Step 6 : Commit**

```bash
git add lib/test-utils.tsx lib/auth/useAuth.ts lib/auth/useAuth.test.tsx
git commit -m "feat: ajoute le hook useAuth (me/login/logout) et les helpers de test"
```

---

## Task 3 : Page de connexion `/connexion`

**Files:**
- Create: `frontend/components/auth/LoginForm.tsx`
- Create: `frontend/app/connexion/page.tsx`
- Test: `frontend/components/auth/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/lib/auth/useAuth`), `ApiError` (`@/lib/api/client`), `Field`/`Button`/`Alert` (S2), `useRouter` (`next/navigation`).
- Produces: `LoginForm` (composant sans props, depuis `@/components/auth/LoginForm`).

- [ ] **Step 1 : Écrire le test LoginForm (échec attendu)**

`frontend/components/auth/LoginForm.test.tsx` :

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { LoginForm } from "./LoginForm";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: replaceMock }),
}));

const USER = {
  id: 1,
  email: "admin@bamfa.org",
  first_name: "Ada",
  last_name: "Lovelace",
  is_staff: true,
  is_superuser: true,
  roles: ["Administrateur"],
};

let apiMock: MockAdapter;
let axiosMock: MockAdapter;

beforeEach(() => {
  replaceMock.mockClear();
  apiMock = new MockAdapter(api);
  axiosMock = new MockAdapter(axios);
  axiosMock.onGet(/\/auth\/csrf\/$/).reply(200, { csrfToken: "tok123" });
  apiMock.onGet("/auth/me/").reply(401);
  apiMock.onPost("/auth/refresh/").reply(401);
});

afterEach(() => {
  apiMock.restore();
  axiosMock.restore();
});

describe("LoginForm", () => {
  it("affiche des erreurs quand les champs sont vides", async () => {
    renderWithClient(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByText("L'e-mail est requis.")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe est requis.")).toBeInTheDocument();
  });

  it("redirige vers /admin après une connexion réussie", async () => {
    apiMock.onPost("/auth/login/").reply(200, USER);
    renderWithClient(<LoginForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@bamfa.org" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin"));
  });

  it("affiche une erreur sur identifiants invalides (401)", async () => {
    apiMock.onPost("/auth/login/").reply(401, { detail: "Identifiants invalides." });
    renderWithClient(<LoginForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "bad@bamfa.org" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByText("Identifiants invalides.")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer le test (échec)**

Run: `npm run test -- LoginForm`
Expected: FAIL (`LoginForm` introuvable).

- [ ] **Step 3 : Implémenter LoginForm**

`frontend/components/auth/LoginForm.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Errors = { email?: string; password?: string };

export function LoginForm() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/admin");
  }, [isAuthenticated, router]);

  function validate(): Errors {
    const e: Errors = {};
    if (!email.trim()) e.email = "L'e-mail est requis.";
    if (!password.trim()) e.password = "Le mot de passe est requis.";
    return e;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    try {
      await login.mutateAsync({ email, password });
      router.replace("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError("Identifiants invalides.");
      } else {
        setFormError("Une erreur est survenue. Réessayez plus tard.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert variant="danger">{formError}</Alert>}
      <Field
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="email"
      />
      <Field
        label="Mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="current-password"
      />
      <Button type="submit" loading={login.isPending} className="mt-2">
        Se connecter
      </Button>
    </form>
  );
}
```

- [ ] **Step 4 : Lancer le test (succès)**

Run: `npm run test -- LoginForm`
Expected: PASS (3 tests).

- [ ] **Step 5 : Créer la page /connexion**

`frontend/app/connexion/page.tsx` :

```tsx
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Connexion — BAMFA",
};

export default function ConnexionPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque (masqué en mobile) */}
      <div className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink/20" />
        <Link href="/" className="relative font-heading text-2xl font-bold">
          BAMFA
        </Link>
        <div className="relative">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Espace membre
          </h1>
          <p className="mt-4 max-w-md text-white/90">
            Accédez à votre back-office pour gérer les contenus, la communauté
            et la vie de l'association.
          </p>
        </div>
        <p className="relative text-sm text-white/70">
          Benin Association of the Mastercard Foundation Alumni
        </p>
      </div>

      {/* Carte de connexion */}
      <div className="flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="font-heading text-2xl font-bold text-primary-700">
              BAMFA
            </Link>
          </div>
          <h2 className="font-heading text-2xl font-bold text-ink">Connexion</h2>
          <p className="mt-2 text-sm text-stone-600">
            Entrez vos identifiants pour accéder à votre espace.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6 : Build + lancer toute la suite**

Run: `npm run build`
Expected: build OK ; route `/connexion` listée.
Run: `npm run test`
Expected: tous les tests au vert.

- [ ] **Step 7 : Commit**

```bash
git add components/auth/ app/connexion/
git commit -m "feat: page de connexion (formulaire + redirection /admin)"
```

---

## Task 4 : Middleware de protection `/admin/*`

**Files:**
- Create: `frontend/lib/auth/route-guard.ts`
- Create: `frontend/middleware.ts`
- Test: `frontend/lib/auth/route-guard.test.ts`

**Interfaces:**
- Produces: `shouldRedirectToLogin(pathname: string, hasSessionCookie: boolean): boolean` (depuis `@/lib/auth/route-guard`) ; `SESSION_COOKIE` (constante `"bamfa_refresh"`).

- [ ] **Step 1 : Écrire le test du garde (échec attendu)**

`frontend/lib/auth/route-guard.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import { shouldRedirectToLogin } from "./route-guard";

describe("shouldRedirectToLogin", () => {
  it("redirige sur /admin sans cookie de session", () => {
    expect(shouldRedirectToLogin("/admin", false)).toBe(true);
    expect(shouldRedirectToLogin("/admin/contenus", false)).toBe(true);
  });

  it("laisse passer /admin avec cookie de session", () => {
    expect(shouldRedirectToLogin("/admin", true)).toBe(false);
  });

  it("ne concerne pas les routes hors /admin", () => {
    expect(shouldRedirectToLogin("/", false)).toBe(false);
    expect(shouldRedirectToLogin("/connexion", false)).toBe(false);
    expect(shouldRedirectToLogin("/a-propos", false)).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec)**

Run: `npm run test -- route-guard`
Expected: FAIL (`shouldRedirectToLogin` introuvable).

- [ ] **Step 3 : Implémenter le garde**

`frontend/lib/auth/route-guard.ts` :

```ts
export const SESSION_COOKIE = "bamfa_refresh";

export function shouldRedirectToLogin(
  pathname: string,
  hasSessionCookie: boolean,
): boolean {
  return pathname.startsWith("/admin") && !hasSessionCookie;
}
```

- [ ] **Step 4 : Lancer le test (succès)**

Run: `npm run test -- route-guard`
Expected: PASS (3 tests).

- [ ] **Step 5 : Créer le middleware**

`frontend/middleware.ts` :

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, shouldRedirectToLogin } from "@/lib/auth/route-guard";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (shouldRedirectToLogin(request.nextUrl.pathname, hasSession)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 6 : Build**

Run: `npm run build`
Expected: build OK ; le middleware est compilé (mention « Middleware » dans la sortie).

- [ ] **Step 7 : Commit**

```bash
git add lib/auth/route-guard.ts lib/auth/route-guard.test.ts middleware.ts
git commit -m "feat: middleware de protection des routes /admin"
```

---

## Task 5 : Layout admin (garde client + shell)

**Files:**
- Create: `frontend/components/admin/Sidebar.tsx`
- Create: `frontend/components/admin/Topbar.tsx`
- Create: `frontend/app/(admin)/layout.tsx`
- Test: `frontend/app/(admin)/admin-layout.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/lib/auth/useAuth`), `User` (`@/lib/auth/types`), `Spinner` (S2), `useRouter` (`next/navigation`), icônes `lucide-react`.
- Produces: `Sidebar` (`{ user: User }`), `Topbar` (`{ user: User }`), `AdminLayout` (layout `{ children }`).

- [ ] **Step 1 : Créer la Sidebar**

`frontend/components/admin/Sidebar.tsx` :

```tsx
"use client";

import Link from "next/link";
import { Calendar, FileText, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

import type { User } from "@/lib/auth/types";

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Contenus", icon: FileText, soon: true },
  { label: "Alumni", icon: Users, soon: true },
  { label: "Événements", icon: Calendar, soon: true },
];

export function Sidebar({ user }: { user: User }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-stone-200 px-6">
        <Link href="/admin" className="font-heading text-xl font-bold text-primary-700">
          BAMFA
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Navigation principale">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (item.soon) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-400"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                <span className="ml-auto rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase">
                  À venir
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-primary-50 hover:text-primary-700"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 p-4 text-xs text-stone-500">
        Connecté : {user.email}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2 : Créer la Topbar**

`frontend/components/admin/Topbar.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import type { User } from "@/lib/auth/types";
import { useAuth } from "@/lib/auth/useAuth";
import { Button } from "@/components/ui/Button";

export function Topbar({ user }: { user: User }) {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout.mutateAsync();
    router.replace("/connexion");
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  const role = user.is_superuser ? "Administrateur" : user.roles[0] ?? "Membre";

  return (
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6">
      <div>
        <p className="text-sm font-medium text-ink">{displayName}</p>
        <p className="text-xs text-stone-500">{role}</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleLogout}
        loading={logout.isPending}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Déconnexion
      </Button>
    </header>
  );
}
```

- [ ] **Step 3 : Écrire le test du layout admin (échec attendu)**

`frontend/app/(admin)/admin-layout.test.tsx` :

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminLayout from "./layout";

const { replaceMock, useAuthMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: replaceMock }),
}));
vi.mock("@/lib/auth/useAuth", () => ({ useAuth: useAuthMock }));

const USER = {
  id: 1,
  email: "admin@bamfa.org",
  first_name: "Ada",
  last_name: "Lovelace",
  is_staff: true,
  is_superuser: true,
  roles: ["Administrateur"],
};

afterEach(() => {
  replaceMock.mockClear();
  useAuthMock.mockReset();
});

describe("AdminLayout (garde)", () => {
  it("affiche un indicateur de chargement pendant la vérification", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: true, isAuthenticated: false });
    render(<AdminLayout><p>secret</p></AdminLayout>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirige vers /connexion si non authentifié", async () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: false, isAuthenticated: false });
    render(<AdminLayout><p>secret</p></AdminLayout>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/connexion"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("rend le contenu quand authentifié", () => {
    useAuthMock.mockReturnValue({
      user: USER,
      isLoading: false,
      isAuthenticated: true,
      logout: { mutateAsync: vi.fn(), isPending: false },
    });
    render(<AdminLayout><p>secret</p></AdminLayout>);
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.getByText("admin@bamfa.org")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4 : Lancer le test (échec)**

Run: `npm run test -- admin-layout`
Expected: FAIL (`./layout` introuvable).

- [ ] **Step 5 : Implémenter le layout admin**

`frontend/app/(admin)/layout.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/useAuth";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/connexion");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Spinner className="h-8 w-8 text-primary-700" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6 : Lancer le test (succès)**

Run: `npm run test -- admin-layout`
Expected: PASS (3 tests).

- [ ] **Step 7 : Commit**

```bash
git add components/admin/ "app/(admin)/layout.tsx" "app/(admin)/admin-layout.test.tsx"
git commit -m "feat: layout admin (garde client + shell sidebar/topbar)"
```

---

## Task 6 : Dashboard placeholder `/admin`

**Files:**
- Create: `frontend/app/(admin)/admin/page.tsx`
- Test: `frontend/app/(admin)/admin/dashboard.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/lib/auth/useAuth`), `Card` (S2), `Badge` (S2).

- [ ] **Step 1 : Écrire le test du dashboard (échec attendu)**

`frontend/app/(admin)/admin/dashboard.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./page";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/lib/auth/useAuth", () => ({ useAuth: useAuthMock }));

afterEach(() => useAuthMock.mockReset());

describe("DashboardPage", () => {
  it("salue l'utilisateur et affiche ses rôles", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 1,
        email: "admin@bamfa.org",
        first_name: "Ada",
        last_name: "Lovelace",
        is_staff: true,
        is_superuser: true,
        roles: ["Administrateur"],
      },
      isLoading: false,
      isAuthenticated: true,
    });
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /Bonjour Ada/ })).toBeInTheDocument();
    expect(screen.getByText("Administrateur")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test (échec)**

Run: `npm run test -- dashboard`
Expected: FAIL (`./page` introuvable).

- [ ] **Step 3 : Implémenter le dashboard**

`frontend/app/(admin)/admin/page.tsx` :

```tsx
"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const STATS = [
  { label: "Membres", hint: "Annuaire alumni" },
  { label: "Contenus publiés", hint: "Articles & actualités" },
  { label: "Événements à venir", hint: "Agenda associatif" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.first_name || "membre";
  const roles = user?.is_superuser ? ["Administrateur"] : user?.roles ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">
          Bonjour {firstName} 👋
        </h1>
        <p className="mt-2 text-stone-600">
          Bienvenue dans votre back-office BAMFA.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role}>{role}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm font-medium text-stone-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-stone-300">—</p>
            <p className="mt-1 text-xs text-stone-400">{stat.hint} · à venir</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test (succès)**

Run: `npm run test -- dashboard`
Expected: PASS.

- [ ] **Step 5 : Suite complète + build**

Run: `npm run test`
Expected: tous les tests au vert.
Run: `rm -rf .next && npm run build`
Expected: build OK ; routes `/connexion`, `/admin` + Middleware listés.

- [ ] **Step 6 : Commit**

```bash
git add "app/(admin)/admin/"
git commit -m "feat: dashboard placeholder du back-office"
```

---

## Vérification finale (manuelle, hors TDD)

- [ ] Démarrer le backend (`localhost:8000`) + `npm run dev`.
- [ ] Accéder à `/admin` sans session → redirigé vers `/connexion` (middleware).
- [ ] Se connecter avec un compte valide → redirigé vers `/admin`, nom + rôle affichés.
- [ ] Recharger `/admin` → reste connecté (`/me` via cookie).
- [ ] Déconnexion → cookies effacés, redirigé vers `/connexion` ; re-tenter `/admin` → redirigé.
- [ ] Identifiants invalides → message « Identifiants invalides. » sans redirection.

## Definition of Done (rappel spec)

- [ ] `@tanstack/react-query` + `Providers` en place ; `useAuth` opérationnel.
- [ ] `/connexion` fonctionnelle (succès → `/admin`, 401 → erreur).
- [ ] Middleware protège `/admin/*`.
- [ ] Layout `(admin)` : garde (spinner / redirection / rendu) + shell (sidebar/topbar/déconnexion).
- [ ] Dashboard affiche l'utilisateur + ses rôles.
- [ ] Déconnexion fonctionnelle ; redirection connexion sur échec de refresh (couvert par la garde).
- [ ] `npm run test` vert, `npm run build` OK, contrastes AA.
