# Sprint 1 / S2 — Design system & fondations frontend : Implementation Plan

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations frontend de BAMFA : Tailwind v4 + design tokens (couleurs/typo), client axios avec intercepteurs auth/CSRF, composants de base accessibles, et layout public responsive.

**Architecture:** Next.js 15 (App Router, TS). Styling via **Tailwind CSS v4** (config CSS-first `@theme` dans `globals.css`, tokens en variables CSS). Polices **Poppins/Inter** via `next/font`. Client HTTP **axios** (remplace le `fetch` de S0) avec intercepteurs CSRF + refresh-sur-401. Composants faits main dans `components/ui/`, layout dans `components/layout/`.

**Tech Stack:** Node 22, Next.js 15, React 19, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`), axios, next/font · Tests : Vitest + Testing Library + axios-mock-adapter.

**Dépôt :** `frontend` (répertoire `frontend/`). **Spec :** `docs/superpowers/specs/2026-06-21-sprint1-s2-design-system.md` (dépôt workspace).

## Global Constraints

- Langue **française** (UI, commits). Commits **sans mention de Claude/IA/assistant** (cf. `frontend/CLAUDE.md`).
- **TDD** : test qui échoue → implémentation minimale → test qui passe → commit (sauf tâches de config pures, vérifiées par le build).
- **Accessibilité AA** : boutons/fonds interactifs en `primary-600`+ (texte blanc lisible), focus visibles, HTML sémantique.
- Palette (variables CSS) : primary-500 `#f26522`, primary-600 `#da5312`, rouge `#e11b22`, or `#fbb040`, encre `#17181b`, crème `#faf6f0` ; sémantiques succès `#1e9e5a`, info `#2563eb`, alerte `#f5a623`, erreur `#dc2626`.
- Environnement Windows / Git Bash : état shell non persistant entre appels → enchaîner les commandes (`cd frontend && npm run test`).

---

## File Structure

**Config & tokens**
- `frontend/postcss.config.mjs` — plugin Tailwind v4.
- `frontend/app/globals.css` — `@import "tailwindcss"` + `@theme` (tokens) + utilitaire dégradé.
- `frontend/app/layout.tsx` — (modifié) import CSS + polices `next/font`.
- `frontend/vitest.setup.ts` — (modifié) mock `next/font/google`.

**Client API**
- `frontend/lib/api/client.ts` — (remplacé) instance axios + intercepteurs + `ApiError`.
- `frontend/lib/api/client.test.ts` — (remplacé) tests axios.

**Composants UI (`frontend/components/ui/`)**
- `Button.tsx`, `Spinner.tsx`, `Badge.tsx`, `Link.tsx`, `Field.tsx`, `Alert.tsx`, `Container.tsx`, `Section.tsx`, `Card.tsx` (+ tests `.test.tsx`).

**Layout (`frontend/components/layout/`)**
- `Header.tsx`, `Footer.tsx` (+ tests).
- `frontend/app/(public)/layout.tsx` — layout public (header/footer).
- `frontend/app/(public)/page.tsx` — page d'accueil déplacée sous le groupe `(public)`.

---

### Task 1: Tailwind v4 + tokens + polices

**Files:**
- Create: `frontend/postcss.config.mjs`, `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`, `frontend/vitest.setup.ts`, `frontend/package.json`

**Interfaces:**
- Consumes: socle Next.js de S0.
- Produces: classes Tailwind + tokens en variables CSS (`bg-primary-600`, `text-ink`, `bg-cream`, `text-success`, `font-heading`, `rounded-md`, `.bg-brand-gradient`). Polices exposées via `--font-poppins`/`--font-inter`. Mock `next/font/google` global pour les tests.

- [ ] **Step 1: Installer les dépendances**

Run: `cd frontend && npm install -D tailwindcss @tailwindcss/postcss postcss`
Expected: installation sans erreur.

- [ ] **Step 2: Config PostCSS**

`frontend/postcss.config.mjs` :
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 3: Feuille de styles + tokens**

`frontend/app/globals.css` :
```css
@import "tailwindcss";

@theme {
  /* Couleurs de marque (échelle primaire dérivée de l'orange BAMFA) */
  --color-primary-50: #fef3ec;
  --color-primary-100: #fce0ce;
  --color-primary-200: #f9c09e;
  --color-primary-300: #f59c6b;
  --color-primary-400: #f4813f;
  --color-primary-500: #f26522;
  --color-primary-600: #da5312;
  --color-primary-700: #b5410c;
  --color-primary-800: #8f340b;
  --color-primary-900: #6e2809;

  --color-red-brand: #e11b22;
  --color-gold: #fbb040;

  --color-ink: #17181b;
  --color-cream: #faf6f0;

  /* Sémantique */
  --color-success: #1e9e5a;
  --color-info: #2563eb;
  --color-warning: #f5a623;
  --color-danger: #dc2626;

  /* Typographie */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;

  /* Rayons */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

@layer base {
  body {
    background-color: #ffffff;
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
  h1, h2, h3, h4 {
    font-family: var(--font-heading);
  }
}

@layer utilities {
  .bg-brand-gradient {
    background-image: linear-gradient(135deg, #e11b22, #f26522, #fbb040);
  }
}
```

- [ ] **Step 4: Polices + import CSS dans le layout racine**

Remplacer `frontend/app/layout.tsx` par :
```tsx
import type { ReactNode } from "react";
import { Inter, Poppins } from "next/font/google";

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
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Mock next/font pour les tests**

Remplacer `frontend/vitest.setup.ts` par :
```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter", className: "font-inter" }),
  Poppins: () => ({ variable: "--font-poppins", className: "font-poppins" }),
}));
```

- [ ] **Step 6: Vérifier build + tests existants**

Run: `cd frontend && npm run build && npm run test`
Expected: build Next.js réussi (Tailwind compilé), tests existants (Brand) toujours verts.

- [ ] **Step 7: Commit**

```bash
cd frontend && git add app/globals.css app/layout.tsx postcss.config.mjs vitest.setup.ts package.json package-lock.json && git commit -m "feat(frontend): Tailwind v4 + design tokens + polices Poppins/Inter"
```

---

### Task 2: Client axios + intercepteurs (TDD)

**Files:**
- Modify (remplace): `frontend/lib/api/client.ts`, `frontend/lib/api/client.test.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_API_BASE_URL` ; endpoints backend `GET /auth/csrf/`, `POST /auth/refresh/`.
- Produces: instance `api` (axios, `withCredentials`), `ApiError` (`status`, `message`, `data`), `fetchCsrfToken()`. Intercepteur requête → `X-CSRFToken` sur méthodes non sûres ; intercepteur réponse → refresh-sur-401 (une fois) + rejeu, sinon `ApiError`.

- [ ] **Step 1: Installer axios + outil de mock**

Run: `cd frontend && npm install axios && npm install -D axios-mock-adapter`
Expected: installation sans erreur.

- [ ] **Step 2: Write the failing tests**

Remplacer `frontend/lib/api/client.test.ts` par :
```typescript
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ApiError, api } from "./client";

let apiMock: MockAdapter;
let axiosMock: MockAdapter;

beforeEach(() => {
  apiMock = new MockAdapter(api);
  axiosMock = new MockAdapter(axios);
  axiosMock.onGet(/\/auth\/csrf\/$/).reply(200, { csrfToken: "tok123" });
});

afterEach(() => {
  apiMock.restore();
  axiosMock.restore();
});

describe("client axios", () => {
  it("ajoute l'en-tête X-CSRFToken sur une requête POST", async () => {
    let sentHeaders: Record<string, unknown> = {};
    apiMock.onPost("/things/").reply((config) => {
      sentHeaders = config.headers as Record<string, unknown>;
      return [201, {}];
    });
    await api.post("/things/", { a: 1 });
    expect(sentHeaders["X-CSRFToken"]).toBe("tok123");
  });

  it("rafraîchit puis rejoue la requête sur 401", async () => {
    let calls = 0;
    apiMock.onGet("/me/").reply(() => {
      calls += 1;
      return calls === 1 ? [401, {}] : [200, { ok: true }];
    });
    apiMock.onPost("/auth/refresh/").reply(200, {});
    const res = await api.get("/me/");
    expect(res.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("lève ApiError si le refresh échoue (401 persistant)", async () => {
    apiMock.onGet("/secret/").reply(401);
    apiMock.onPost("/auth/refresh/").reply(401);
    await expect(api.get("/secret/")).rejects.toBeInstanceOf(ApiError);
  });

  it("lève ApiError avec le status sur une erreur non-401", async () => {
    apiMock.onGet("/x/").reply(500, { detail: "boom" });
    await expect(api.get("/x/")).rejects.toMatchObject({ status: 500 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm run test -- client`
Expected: FAIL — l'export `api` n'existe pas encore (le module exporte `apiFetch`/`ApiError` en version fetch).

- [ ] **Step 4: Write minimal implementation**

Remplacer `frontend/lib/api/client.ts` par :
```typescript
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

let csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  const { data } = await axios.get<{ csrfToken: string }>(
    `${API_BASE}/auth/csrf/`,
    { withCredentials: true },
  );
  csrfToken = data.csrfToken;
  return csrfToken;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    config.headers.set("X-CSRFToken", csrfToken as string);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        await api.post("/auth/refresh/");
        return api(original);
      } catch {
        throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
      }
    }

    const status = error.response?.status ?? 0;
    throw new ApiError(status, error.message, error.response?.data);
  },
);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm run test -- client`
Expected: PASS (4 passed).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add lib/api/client.ts lib/api/client.test.ts package.json package-lock.json && git commit -m "feat(frontend): client axios (intercepteurs CSRF + refresh sur 401) remplace fetch"
```

---

### Task 3: Composants Button, Spinner, Badge, Link (TDD)

**Files:**
- Create: `frontend/components/ui/Spinner.tsx`, `frontend/components/ui/Button.tsx`, `frontend/components/ui/Badge.tsx`, `frontend/components/ui/Link.tsx`
- Test: `frontend/components/ui/Button.test.tsx`, `frontend/components/ui/Badge.test.tsx`

**Interfaces:**
- Consumes: tokens Tailwind (Task 1).
- Produces : `Button` (props `variant: "primary"|"secondary"|"ghost"|"gradient"`, `size: "sm"|"md"|"lg"`, `loading?`), `Spinner` (`className?`), `Badge` (`variant: "neutral"|"success"|"info"|"warning"|"danger"`), `Link` (props de `next/link`).

- [ ] **Step 1: Write the failing tests**

`frontend/components/ui/Button.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("rend le libellé et le variant primaire par défaut", () => {
    render(<Button>Envoyer</Button>);
    const btn = screen.getByRole("button", { name: "Envoyer" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-primary-600");
  });

  it("est désactivé et aria-busy en chargement", () => {
    render(<Button loading>Envoyer</Button>);
    const btn = screen.getByRole("button", { name: "Chargement Envoyer" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });
});
```

`frontend/components/ui/Badge.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("rend le contenu avec le style du variant succès", () => {
    render(<Badge variant="success">Validé</Badge>);
    const el = screen.getByText("Validé");
    expect(el.className).toContain("text-success");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- ui/Button ui/Badge`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Write minimal implementations**

`frontend/components/ui/Spinner.tsx` :
```tsx
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
```

`frontend/components/ui/Button.tsx` :
```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "gradient";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "border border-primary-600 text-primary-700 hover:bg-primary-50",
  ghost: "text-primary-700 hover:bg-primary-50",
  gradient: "bg-brand-gradient text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4",
  lg: "h-12 px-6 text-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
```

`frontend/components/ui/Badge.tsx` :
```tsx
import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "success" | "info" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-stone-100 text-stone-700",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({
  variant = "neutral",
  className = "",
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

`frontend/components/ui/Link.tsx` :
```tsx
import NextLink from "next/link";
import type { ComponentProps } from "react";

export function Link({ className = "", ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink
      className={`rounded text-primary-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- ui/Button ui/Badge`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/ui/Button.tsx components/ui/Spinner.tsx components/ui/Badge.tsx components/ui/Link.tsx components/ui/Button.test.tsx components/ui/Badge.test.tsx && git commit -m "feat(frontend): composants Button, Spinner, Badge, Link"
```

---

### Task 4: Composants Field + Alert (TDD)

**Files:**
- Create: `frontend/components/ui/Field.tsx`, `frontend/components/ui/Alert.tsx`
- Test: `frontend/components/ui/Field.test.tsx`, `frontend/components/ui/Alert.test.tsx`

**Interfaces:**
- Consumes: tokens Tailwind (Task 1).
- Produces : `Field` (props `label: string`, `error?: string`, + attributs input) reliant label↔input et input↔message d'erreur (`aria-invalid`, `aria-describedby`) ; `Alert` (`variant: "success"|"info"|"warning"|"danger"`, `role="alert"`).

- [ ] **Step 1: Write the failing tests**

`frontend/components/ui/Field.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";

describe("Field", () => {
  it("associe le label à l'input", () => {
    render(<Field label="Adresse e-mail" />);
    expect(screen.getByLabelText("Adresse e-mail")).toBeInTheDocument();
  });

  it("marque l'input invalide et relie le message d'erreur", () => {
    render(<Field label="E-mail" error="Champ requis" />);
    const input = screen.getByLabelText("E-mail");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(screen.getByText("Champ requis").id).toBe(errorId);
  });
});
```

`frontend/components/ui/Alert.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "./Alert";

describe("Alert", () => {
  it("a le rôle alert et le style du variant erreur", () => {
    render(<Alert variant="danger">Une erreur est survenue</Alert>);
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("Une erreur est survenue");
    expect(el.className).toContain("text-danger");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- ui/Field ui/Alert`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Write minimal implementations**

`frontend/components/ui/Field.tsx` :
```tsx
import { useId, type InputHTMLAttributes } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, id, className = "", ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-11 rounded-md border px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          error ? "border-danger" : "border-stone-300"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

`frontend/components/ui/Alert.tsx` :
```tsx
import type { ReactNode } from "react";

type AlertVariant = "success" | "info" | "warning" | "danger";

const variants: Record<AlertVariant, string> = {
  success: "bg-success/10 text-success border-success/30",
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export function Alert({
  variant = "info",
  className = "",
  children,
}: {
  variant?: AlertVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="alert" className={`rounded-md border px-4 py-3 text-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- ui/Field ui/Alert`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/ui/Field.tsx components/ui/Alert.tsx components/ui/Field.test.tsx components/ui/Alert.test.tsx && git commit -m "feat(frontend): composants Field et Alert (accessibles)"
```

---

### Task 5: Composants Container, Section, Card (TDD)

**Files:**
- Create: `frontend/components/ui/Container.tsx`, `frontend/components/ui/Section.tsx`, `frontend/components/ui/Card.tsx`
- Test: `frontend/components/ui/Layout.test.tsx`

**Interfaces:**
- Consumes: tokens Tailwind (Task 1).
- Produces : `Container` (largeur max + gouttières), `Section` (rythme vertical, rend une balise `<section>`), `Card` (surface avec bordure/ombre/rayon). Chacun : `className?`, `children`.

- [ ] **Step 1: Write the failing test**

`frontend/components/ui/Layout.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";
import { Container } from "./Container";
import { Section } from "./Section";

describe("primitives de mise en page", () => {
  it("Container applique la largeur max et rend ses enfants", () => {
    render(<Container>contenu</Container>);
    const el = screen.getByText("contenu");
    expect(el.className).toContain("max-w-7xl");
  });

  it("Section rend une balise section", () => {
    const { container } = render(<Section>bloc</Section>);
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("Card rend ses enfants dans une surface bordée", () => {
    render(<Card>carte</Card>);
    const el = screen.getByText("carte");
    expect(el.className).toContain("border");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- ui/Layout`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Write minimal implementations**

`frontend/components/ui/Container.tsx` :
```tsx
import type { ReactNode } from "react";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  );
}
```

`frontend/components/ui/Section.tsx` :
```tsx
import type { ReactNode } from "react";

export function Section({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`py-12 sm:py-16 lg:py-20 ${className}`}>{children}</section>;
}
```

`frontend/components/ui/Card.tsx` :
```tsx
import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- ui/Layout`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/ui/Container.tsx components/ui/Section.tsx components/ui/Card.tsx components/ui/Layout.test.tsx && git commit -m "feat(frontend): primitives Container, Section, Card"
```

---

### Task 6: Layout public (Header + Footer)

**Files:**
- Create: `frontend/components/layout/Header.tsx`, `frontend/components/layout/Footer.tsx`, `frontend/app/(public)/layout.tsx`
- Move: `frontend/app/page.tsx` → `frontend/app/(public)/page.tsx`
- Test: `frontend/components/layout/Header.test.tsx`, `frontend/components/layout/Footer.test.tsx`

**Interfaces:**
- Consumes: `Container`, `Link`, `Button` (Tasks 3, 5), logo `frontend/public/logo.jpg`.
- Produces : `Header` (client component, logo + nav + menu burger mobile via état), `Footer` (liens + année dynamique), layout `(public)` combinant header/footer autour de `children`.

- [ ] **Step 1: Write the failing tests**

`frontend/components/layout/Header.test.tsx` :
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "./Header";

describe("Header", () => {
  it("affiche le logo et la navigation principale", () => {
    render(<Header />);
    expect(screen.getByAltText("BAMFA")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
  });

  it("bascule le menu mobile au clic sur le bouton", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Navigation mobile" })).toBeInTheDocument();
  });
});
```

`frontend/components/layout/Footer.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
  it("affiche l'année courante", () => {
    render(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- layout/Header layout/Footer`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Write minimal implementations**

`frontend/components/layout/Header.tsx` :
```tsx
"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Link } from "@/components/ui/Link";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/programmes", label: "Programmes" },
  { href: "/actualites", label: "Actualités" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center no-underline hover:no-underline">
          <Image src="/logo.jpg" alt="BAMFA" width={120} height={32} priority className="h-8 w-auto" />
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Button variant="gradient" size="sm">
            Nous soutenir
          </Button>
        </nav>
        <button
          type="button"
          className="flex flex-col gap-1 md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
        </button>
      </Container>
      {open && (
        <nav aria-label="Navigation mobile" className="border-t border-stone-200 bg-white md:hidden">
          <Container className="flex flex-col gap-3 py-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Button variant="gradient" size="sm">
              Nous soutenir
            </Button>
          </Container>
        </nav>
      )}
    </header>
  );
}
```

`frontend/components/layout/Footer.tsx` :
```tsx
import { Container } from "@/components/ui/Container";
import { Link } from "@/components/ui/Link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-stone-200 bg-cream">
      <Container className="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">© {year} BAMFA. Tous droits réservés.</p>
        <nav aria-label="Liens de pied de page" className="flex gap-6 text-sm">
          <Link href="/a-propos">À propos</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </nav>
      </Container>
    </footer>
  );
}
```

`frontend/app/(public)/layout.tsx` :
```tsx
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Déplacer la page d'accueil sous le groupe (public)**

Run:
```bash
cd frontend && mkdir -p "app/(public)" && git mv app/page.tsx "app/(public)/page.tsx"
```
Expected: `app/(public)/page.tsx` existe, `app/page.tsx` n'existe plus. (La page d'accueil reste servie sur `/`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm run test -- layout/Header layout/Footer`
Expected: PASS (3 passed).

- [ ] **Step 6: Vérification finale (suite complète + build)**

Run: `cd frontend && npm run test && npm run build`
Expected: tous les tests verts, build Next.js réussi (route `/` sous le layout public).

- [ ] **Step 7: Commit**

```bash
cd frontend && git add components/layout "app/(public)" && git commit -m "feat(frontend): layout public (header responsive + footer)"
```

---

## Definition of Done — S2

- [ ] Tailwind v4 + tokens (couleurs/typo/rayons) en variables CSS ; Poppins/Inter via `next/font`.
- [ ] Client axios (intercepteurs CSRF + refresh-sur-401) remplace le `fetch` ; tests verts.
- [ ] Composants Button, Spinner, Badge, Link, Field, Alert, Container, Section, Card livrés, accessibles, testés.
- [ ] Layout public (header responsive + burger + footer) ; page `/` sous le layout public.
- [ ] `npm run test` vert, `npm run build` réussi.

## Self-Review (effectuée)

- **Couverture spec** : tokens/Tailwind (T1), typo (T1), axios/intercepteurs (T2), composants de base (T3-T5), layout public (T6), tests (chaque tâche) → toutes les sections de la spec sont couvertes. Mode sombre / Radix / redirection login = explicitement hors S2 (points reportés).
- **Placeholders** : aucun ; code complet à chaque étape.
- **Cohérence des types** : tokens (`primary-600`, `text-ink`, `bg-cream`, `text-success/danger`, `bg-brand-gradient`, `font-heading`) définis en T1 et réutilisés tels quels par les composants ; `api`/`ApiError` (T2) cohérents avec les tests ; `Container`/`Link`/`Button` produits en T3/T5 et consommés par le Header en T6.
- **Note** : les tests composants vérifient des classes utilitaires (ex. `bg-primary-600`) — c'est volontaire pour verrouiller le rattachement aux tokens sans dépendre du CSS calculé (non disponible en jsdom).
