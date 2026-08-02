# DA-1 — Fondations de la direction artistique « La Revue » : Plan d'implémentation

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Réf. direction artistique** : [../specs/2026-08-02-refonte-direction-artistique-design.md](../specs/2026-08-02-refonte-direction-artistique-design.md)

**Goal:** Poser le socle éditorial « La Revue » : polices (Fraunces/Geist/Geist Mono), tokens couleur/rayon, primitifs de motion (`SmoothScrollProvider`, `Reveal`) et de marque (`FlameGlyph`), puis restyler les primitifs UI + Header/Footer — sans casser les pages existantes (refondues en DA-2/DA-3).

**Architecture:** On bascule les fondations globales (polices, couleurs de base, rayons) dans `app/layout.tsx` + le bloc `@theme` de `app/globals.css`, en **conservant** les tokens hérités (`primary-*`, `red-brand`, `cream`, `bg-brand-gradient`) pour que les pages non encore refondues restent affichables. On ajoute des composants isolés (`FlameGlyph`, `Reveal`, `SmoothScrollProvider`) et on restyle les primitifs (`Button`, `Field`, `Alert`, `Badge`, `Card`, `Eyebrow`, `Stat`) + `Header`/`Footer` vers les nouveaux tokens.

**Tech Stack:** Next.js 15 (App Router, TS), React 19, Tailwind CSS v4 (`@theme`), `next/font/google`, `motion` (ex-Framer Motion), `lenis`, Vitest + Testing Library.

## Global Constraints

- **Langue** : UI/contenu et **messages de commit** en **français**. Ne **jamais** mentionner Claude/IA/assistant. Commits `type: résumé` (`feat:`, `chore:`, `test:`).
- **Dépôt** : tout dans `frontend/` (dépôt git autonome).
- **Ne pas casser le build ni les tests** : les pages `(public)` et `(admin)` ne sont PAS refondues ici — garder les tokens hérités (`primary-*`, `red-brand`, `cream`, `bg-brand-gradient`) tant qu'ils sont référencés.
- **Retirer Inter/Poppins** au profit de **Fraunces** (display serif), **Geist** (corps), **Geist Mono** (utilité).
- **Palette** (nouveaux tokens) : `ink #14130F` · `paper #F6F2EA` · `flame #E1451D` · `flame-ink #B5390F` (accent texte AA) · `gold #F2A93B` · `ember #7A1E10` · filets `stone-300 #D8D2C6` · texte 2ndaire `stone-600 #6B655B`.
- **Discipline** : le dégradé (`bg-brand-gradient`) ne sert QUE pour le logo/moment signature ; ailleurs, aplats + encre.
- **Accessibilité** : texte courant `ink` sur `paper` ; accent **texte** = `flame-ink` (jamais `flame` pur < 18px) ; focus visibles ; `prefers-reduced-motion` honoré ; responsive.
- **Alias** `@/*` → racine `frontend/` (configuré `tsconfig` + `vitest.config.ts`).
- **Plateforme Windows** : si `npm run build` échoue avec un cache périmé (« Cannot find module './xxx.js' » / « for page: /_not-found »), supprimer `.next` (`rm -rf .next`) et rebâtir.

## File Structure

- `app/layout.tsx` — **modifié** : polices Fraunces/Geist/Geist Mono ; enveloppe `children` dans `SmoothScrollProvider`.
- `app/globals.css` — **modifié** : `@theme` (polices, couleurs, rayons), base layer.
- `vitest.setup.ts` — **modifié** : mock des nouvelles polices + polyfills `matchMedia`/`IntersectionObserver`.
- `components/brand/FlameGlyph.tsx` — **créé** : SVG signature (marque flamme).
- `components/motion/Reveal.tsx` — **créé** : wrapper d'apparition (motion), honore reduced-motion.
- `components/motion/SmoothScrollProvider.tsx` — **créé** : init Lenis (client).
- `components/ui/{Button,Field,Alert,Badge,Card}.tsx` — **restyle** vers les tokens éditoriaux.
- `components/sections/{Eyebrow,Stat}.tsx` — **restyle** (mono / serif+mono).
- `components/layout/{Header,Footer}.tsx` — **restyle** éditorial.

---

## Task 1 : Polices éditoriales & tokens de base

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/vitest.setup.ts`

**Interfaces:**
- Produces : variables CSS `--font-fraunces`, `--font-geist`, `--font-geist-mono` ; tokens `@theme` `--color-paper`, `--color-flame`, `--color-flame-ink`, `--color-gold`, `--color-ember`, `--color-stone-300`, `--color-stone-600`, `--color-ink` (mis à jour), familles `--font-sans`/`--font-heading`/`--font-mono`, rayons resserrés. Classes Tailwind générées : `font-mono`, `bg-paper`, `text-flame`, `text-flame-ink`, `bg-ember`, etc.

- [ ] **Step 1 : Remplacer les polices dans le layout racine**

Dans `frontend/app/layout.tsx`, remplacer les imports/instances Inter+Poppins par Fraunces+Geist+Geist Mono et exposer leurs variables sur `<html>` :

```tsx
import type { ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers/Providers";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata = {
  title: "BAMFA",
  description: "Plateforme de la Benin Association of the Mastercard Foundation Alumni",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <body>
        <Providers>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </Providers>
      </body>
    </html>
  );
}
```

*(Note : `SmoothScrollProvider` est créé en Task 3. Pour que ce commit build seul, créer d'abord un stub minimal dans cette task — voir Step 4 — puis Task 3 le complète.)*

- [ ] **Step 2 : Réécrire le bloc `@theme` et la base dans `globals.css`**

Remplacer le contenu de `frontend/app/globals.css` par :

```css
@import "tailwindcss";

@theme {
  /* Couleurs héritées conservées (pages non encore refondues — DA-2/DA-3) */
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
  --color-cream: #faf6f0;

  /* Palette éditoriale « La Revue » */
  --color-ink: #14130f;
  --color-paper: #f6f2ea;
  --color-flame: #e1451d;
  --color-flame-ink: #b5390f;
  --color-gold: #f2a93b;
  --color-ember: #7a1e10;
  --color-stone-300: #d8d2c6;
  --color-stone-600: #6b655b;

  /* Sémantique (inchangée) */
  --color-success: #1e9e5a;
  --color-info: #2563eb;
  --color-warning: #f5a623;
  --color-danger: #dc2626;
  --color-success-text: #157347;
  --color-warning-text: #b45309;
  --color-danger-text: #b91c1c;
  --color-info-text: #1d4ed8;

  /* Typographie */
  --font-sans: var(--font-geist), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-fraunces), ui-serif, Georgia, "Times New Roman", serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;

  /* Rayons resserrés (net, éditorial) */
  --radius-sm: 2px;
  --radius-md: 3px;
  --radius-lg: 4px;
  --radius-xl: 6px;
}

@layer base {
  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
  h1, h2, h3, h4 {
    font-family: var(--font-heading);
  }
}

@layer utilities {
  .bg-brand-gradient {
    background-image: linear-gradient(135deg, var(--color-red-brand), var(--color-flame), var(--color-gold));
  }
}
```

- [ ] **Step 3 : Mettre à jour le mock des polices + polyfills dans `vitest.setup.ts`**

Remplacer `frontend/vitest.setup.ts` par :

```ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist", className: "font-geist" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "font-geist-mono" }),
  Fraunces: () => ({ variable: "--font-fraunces", className: "font-fraunces" }),
}));

// Polyfills jsdom pour le motion (Reveal / Lenis) — Task 3 s'appuie dessus.
if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!("IntersectionObserver" in globalThis)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error - polyfill de test
  globalThis.IntersectionObserver = IO;
}
```

- [ ] **Step 4 : Créer un stub minimal `SmoothScrollProvider` (complété en Task 3)**

`frontend/components/motion/SmoothScrollProvider.tsx` :

```tsx
"use client";

import type { ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 5 : Vérifier la suite + le build**

Run: `npm run test`
Expected: tous les tests au vert (les tests existants sont basés sur le texte/rôles ; le mock des polices est mis à jour, donc aucune régression).
Run: `rm -rf .next && npm run build`
Expected: build OK. Si `Geist`/`Geist_Mono`/`Fraunces` ne sont pas résolus par `next/font/google` sur cette version de Next, le build échoue à l'import — dans ce cas, s'arrêter et remonter en NEEDS_CONTEXT (ne pas substituer une police au hasard).

- [ ] **Step 6 : Commit**

```bash
git add app/layout.tsx app/globals.css vitest.setup.ts components/motion/SmoothScrollProvider.tsx
git commit -m "feat: fondations editoriales (polices Fraunces/Geist, tokens couleur/rayon)"
```

---

## Task 2 : Composant signature `FlameGlyph`

**Files:**
- Create: `frontend/components/brand/FlameGlyph.tsx`
- Test: `frontend/components/brand/FlameGlyph.test.tsx`

**Interfaces:**
- Produces : `FlameGlyph` — `{ className?: string; title?: string }`. Décoratif par défaut (`aria-hidden`) ; si `title` fourni, rend un `<title>` et `role="img"` avec `aria-label`.

- [ ] **Step 1 : Écrire le test (échec attendu)**

`frontend/components/brand/FlameGlyph.test.tsx` :

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlameGlyph } from "./FlameGlyph";

describe("FlameGlyph", () => {
  it("est décoratif par défaut (aria-hidden, pas de rôle image)", () => {
    const { container } = render(<FlameGlyph />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role", "img");
  });

  it("applique la className passée", () => {
    const { container } = render(<FlameGlyph className="h-6 w-6 text-flame" />);
    expect(container.querySelector("svg")).toHaveClass("h-6", "w-6", "text-flame");
  });

  it("devient une image accessible quand un title est fourni", () => {
    const { container, getByText } = render(<FlameGlyph title="Signature BAMFA" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Signature BAMFA");
    expect(getByText("Signature BAMFA").tagName.toLowerCase()).toBe("title");
  });
});
```

- [ ] **Step 2 : Lancer le test (échec)**

Run: `npm run test -- FlameGlyph`
Expected: FAIL (`FlameGlyph` introuvable).

- [ ] **Step 3 : Implémenter `FlameGlyph`**

`frontend/components/brand/FlameGlyph.tsx` (marque à deux pétales entrelacés, en `currentColor` pour hériter de la couleur du texte) :

```tsx
interface FlameGlyphProps {
  className?: string;
  title?: string;
}

export function FlameGlyph({ className = "h-5 w-5", title }: FlameGlyphProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : "true"}
    >
      {labelled && <title>{title}</title>}
      {/* Deux pétales/flammes entrelacés — abstraction de la marque BAMFA */}
      <path d="M12 2c2.7 2.4 4.2 5 4.2 7.8 0 2.2-1.3 3.9-3.2 4.6 2.9.3 5 1.9 5 4 0 2.1-2.3 3.6-5.8 3.6-.8 0-1.5-.1-2.2-.2 1.7-.9 2.8-2.3 2.8-3.9 0-2.2-1.9-3.8-4.8-4.1 2.4-.6 3.9-2.2 3.9-4.3C11.9 8.9 11.4 6.3 12 2z" />
      <path d="M8.4 8.2c-1.9 1.9-2.9 3.9-2.9 5.9 0 2.7 2.2 4.6 5.7 4.9-2-1-3.2-2.6-3.2-4.5 0-2.1 1.3-4.1 3.4-6.1-1.1-.4-2.2-.5-3-0.2z" opacity=".85" />
    </svg>
  );
}
```

- [ ] **Step 4 : Lancer le test (succès)**

Run: `npm run test -- FlameGlyph`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add components/brand/FlameGlyph.tsx components/brand/FlameGlyph.test.tsx
git commit -m "feat: composant signature FlameGlyph (marque flamme)"
```

---

## Task 3 : Motion — `Reveal` & `SmoothScrollProvider`

**Files:**
- Modify: `frontend/package.json` (ajout `motion`, `lenis`)
- Create: `frontend/components/motion/Reveal.tsx`
- Modify: `frontend/components/motion/SmoothScrollProvider.tsx` (remplace le stub de Task 1)
- Test: `frontend/components/motion/Reveal.test.tsx`
- Test: `frontend/components/motion/SmoothScrollProvider.test.tsx`

**Interfaces:**
- Consumes : `motion` (ex-Framer Motion), `lenis`.
- Produces : `Reveal` — `{ children: ReactNode; className?: string; delay?: number; as?: "div" | "section" }` (apparition en fondu/translation à l'entrée dans le viewport, honore `prefers-reduced-motion`) ; `SmoothScrollProvider` — `{ children: ReactNode }` (initialise Lenis côté client, rend les enfants).

- [ ] **Step 1 : Installer les dépendances**

Run: `npm install motion lenis`
Expected: `motion` et `lenis` ajoutés à `dependencies`.

- [ ] **Step 2 : Écrire les tests (échec attendu)**

`frontend/components/motion/Reveal.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Reveal } from "./Reveal";

describe("Reveal", () => {
  it("rend son contenu (présent dans le DOM)", () => {
    render(
      <Reveal>
        <p>contenu révélé</p>
      </Reveal>,
    );
    expect(screen.getByText("contenu révélé")).toBeInTheDocument();
  });

  it("applique la className", () => {
    const { container } = render(<Reveal className="mt-8">x</Reveal>);
    expect(container.firstChild).toHaveClass("mt-8");
  });
});
```

`frontend/components/motion/SmoothScrollProvider.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SmoothScrollProvider } from "./SmoothScrollProvider";

describe("SmoothScrollProvider", () => {
  it("rend ses enfants", () => {
    render(
      <SmoothScrollProvider>
        <p>page</p>
      </SmoothScrollProvider>,
    );
    expect(screen.getByText("page")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3 : Lancer les tests (échec)**

Run: `npm run test -- motion`
Expected: FAIL (`Reveal` introuvable ; `SmoothScrollProvider` ne rend encore qu'un fragment mais le fichier existe — le test SmoothScroll peut déjà passer, celui de Reveal échoue).

- [ ] **Step 4 : Implémenter `Reveal`**

`frontend/components/motion/Reveal.tsx` :

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}

export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = as === "section" ? motion.section : motion.div;

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
```

- [ ] **Step 5 : Compléter `SmoothScrollProvider` (Lenis)**

Remplacer `frontend/components/motion/SmoothScrollProvider.tsx` par :

```tsx
"use client";

import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 6 : Lancer les tests (succès)**

Run: `npm run test -- motion`
Expected: PASS (Reveal 2 tests, SmoothScrollProvider 1 test). Les polyfills `matchMedia`/`IntersectionObserver` (Task 1) permettent le rendu en jsdom.

- [ ] **Step 7 : Vérifier le build**

Run: `rm -rf .next && npm run build`
Expected: build OK (Lenis initialisé côté client uniquement, aucun accès `window` au rendu serveur).

- [ ] **Step 8 : Commit**

```bash
git add package.json package-lock.json components/motion/Reveal.tsx components/motion/SmoothScrollProvider.tsx components/motion/Reveal.test.tsx components/motion/SmoothScrollProvider.test.tsx
git commit -m "feat: primitives de motion (Reveal + smooth-scroll Lenis)"
```

---

## Task 4 : Restyle des primitifs UI (Button, Field, Alert, Badge, Card)

**Files:**
- Modify: `frontend/components/ui/Button.tsx`
- Modify: `frontend/components/ui/Field.tsx`
- Modify: `frontend/components/ui/Alert.tsx`
- Modify: `frontend/components/ui/Badge.tsx`
- Modify: `frontend/components/ui/Card.tsx`
- Modify: `frontend/components/ui/Button.test.tsx` (l'assertion de style du bouton primaire change avec le restyle)
- Tests existants **inchangés** (doivent rester verts) : `Field.test.tsx`, `Alert.test.tsx` (assertion `text-danger` ⊂ `text-danger-text`), `Badge.test.tsx` (assertion `text-success` ⊂ `text-success-text`).

**Interfaces:**
- Conserve les **API publiques** (noms de props/variants) pour ne pas casser les pages : `Button` variants `primary|secondary|ghost|gradient`, sizes `sm|md|lg`, prop `loading` ; `Field` props `label`, `error`, + le bouton œil pour `type="password"` ; `Alert` variants `success|info|warning|danger` ; `Badge` variants `neutral|success|info|warning|danger` ; `Card` `{ className, children }`.

- [ ] **Step 1 : Restyle `Button` (éditorial, rayon net, accent flamme)**

Remplacer le corps de `frontend/components/ui/Button.tsx` (mêmes exports/props, styles éditoriaux) :

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "gradient";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ember",
  secondary: "border border-ink/25 text-ink hover:border-ink hover:bg-ink/5",
  ghost: "text-flame-ink hover:bg-flame/10",
  gradient: "bg-brand-gradient text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5",
  lg: "h-12 px-7 text-lg",
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

- [ ] **Step 2 : Restyle `Field` (bordure nette, focus flamme, œil conservé)**

Remplacer le corps de `frontend/components/ui/Field.tsx` (conserve `label`, `error`, le toggle mot de passe) :

```tsx
"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, id, className = "", type, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-mono text-xs uppercase tracking-[0.15em] text-stone-600"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-sm border bg-transparent px-3 ${isPassword ? "pr-11" : ""} text-ink outline-none focus-visible:border-flame focus-visible:ring-2 focus-visible:ring-flame/40 ${
            error ? "border-danger" : "border-ink/20"
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center rounded-sm px-3 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame"
          >
            {visible ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Restyle `Alert` (rayon net)**

Dans `frontend/components/ui/Alert.tsx`, remplacer la classe conteneur `rounded-md` par `rounded-sm border-l-2` (bandeau éditorial) — remplacer le `<div>` de rendu par :

```tsx
  return (
    <div role="alert" className={`rounded-sm border border-l-2 px-4 py-3 text-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
```

*(Le `variants` et les props restent inchangés.)*

- [ ] **Step 4 : Restyle `Badge` (mono, rayon net)**

Dans `frontend/components/ui/Badge.tsx`, remplacer le `<span>` de rendu par une puce éditoriale (capitales mono, coins nets) :

```tsx
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
```

*(Le type `BadgeVariant`, l'objet `variants` et les props restent inchangés — seule la ligne de rendu change : `rounded-full text-xs font-medium` → `rounded-sm font-mono text-[11px] uppercase tracking-[0.12em]`.)*

- [ ] **Step 5 : Restyle `Card` (filet net, papier)**

Remplacer le corps de `frontend/components/ui/Card.tsx` :

```tsx
import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-sm border border-stone-300 bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6 : Mettre à jour l'assertion de style du bouton primaire**

Le restyle passe le variant `primary` de `bg-primary-700` à `bg-ink`. Dans `frontend/components/ui/Button.test.tsx`, remplacer l'assertion :

```tsx
    expect(btn.className).toContain("bg-primary-700");
```
par :
```tsx
    expect(btn.className).toContain("bg-ink");
```

*(Les autres tests — `Field`, `Alert`, `Badge` — restent inchangés : leurs assertions `text-danger`/`text-success` sont des sous-chaînes de `text-danger-text`/`text-success-text`, toujours présentes.)*

- [ ] **Step 7 : Lancer les tests concernés (doivent être verts)**

Run: `npm run test -- Button Field Alert Badge`
Expected: PASS — libellé lié, `aria-invalid`, toggle mot de passe, variant primaire (`bg-ink`), rôle `alert`, variant `Badge`.

- [ ] **Step 8 : Vérifier la suite + build**

Run: `npm run test`
Expected: tous verts.
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 9 : Commit**

```bash
git add components/ui/Button.tsx components/ui/Field.tsx components/ui/Alert.tsx components/ui/Badge.tsx components/ui/Card.tsx components/ui/Button.test.tsx
git commit -m "feat: restyle editorial des primitifs UI (Button, Field, Alert, Badge, Card)"
```

---

## Task 5 : Restyle `Eyebrow` & `Stat`

**Files:**
- Modify: `frontend/components/sections/Eyebrow.tsx`
- Modify: `frontend/components/sections/Stat.tsx`
- Test existant (inchangé, doit rester vert) : `components/sections/Sections.test.tsx`.

**Interfaces:**
- Conserve les API : `Eyebrow` `{ children, tone?: "brand"|"light", className? }` ; `Stat` `{ value, label }`.

- [ ] **Step 1 : Restyle `Eyebrow` (mono, capitales espacées)**

Remplacer le corps de `frontend/components/sections/Eyebrow.tsx` :

```tsx
import type { ReactNode } from "react";

export function Eyebrow({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: "brand" | "light";
  className?: string;
}) {
  const color = tone === "light" ? "text-paper/75" : "text-flame-ink";
  return (
    <p className={`font-mono text-xs uppercase tracking-[0.22em] ${color} ${className}`}>
      {children}
    </p>
  );
}
```

- [ ] **Step 2 : Restyle `Stat` (nombre serif, libellé mono)**

Remplacer le corps de `frontend/components/sections/Stat.tsx` :

```tsx
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-heading text-5xl font-semibold text-ink">{value}</div>
      <div className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-stone-600">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Lancer le test des sections (doit rester vert)**

Run: `npm run test -- Sections`
Expected: PASS — le test vérifie que `Stat` rend la valeur et le libellé, et `Eyebrow` n'y est pas testé directement ; aucune assertion de style.

- [ ] **Step 4 : Commit**

```bash
git add components/sections/Eyebrow.tsx components/sections/Stat.tsx
git commit -m "feat: restyle editorial de Eyebrow (mono) et Stat (serif + mono)"
```

---

## Task 6 : Restyle `Header` & `Footer`

**Files:**
- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/layout/Footer.tsx`
- Modify: `frontend/components/layout/Footer.test.tsx` (si une assertion vise un élément retiré)
- Test existant : `components/layout/Header.test.tsx` (doit rester vert), `components/layout/Layout.test.tsx`.

**Interfaces:**
- Conserve : `Header` et `Footer` sans props ; le logo réel (`/logo.jpg`) et les libellés de nav restent (le test Header vérifie l'alt « BAMFA » et la présence de la navigation).

- [ ] **Step 1 : Restyle `Header` (papier, filet, CTA éditorial)**

Dans `frontend/components/layout/Header.tsx` :
- conteneur `<header>` : remplacer `border-stone-200 bg-white/90` par `border-stone-300 bg-paper/90` ;
- les deux CTA « Nous soutenir » (desktop + mobile) : remplacer `rounded-md bg-brand-gradient px-3 text-sm font-medium text-white hover:opacity-90` par `rounded-sm bg-ink px-4 text-sm font-medium text-paper hover:bg-ember` ;
- la nav mobile : remplacer `border-stone-200 bg-white` par `border-stone-300 bg-paper` ;
- les trois barres du burger : `bg-ink` (inchangé).

Le reste (logo `/logo.jpg`, structure, `Link`) est conservé.

- [ ] **Step 2 : Restyle `Footer` (logo réel, en-têtes mono, accent flamme)**

Dans `frontend/components/layout/Footer.tsx` :
- remplacer le faux carré dégradé + texte par le **logo réel** sur fond sombre. Remplacer le bloc :

```tsx
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-7 w-7 rounded-lg bg-brand-gradient" />
              <span className="font-heading text-xl font-bold text-white">BAMFA</span>
            </div>
```
par :
```tsx
            <Image
              src="/logo.jpg"
              alt="BAMFA"
              width={132}
              height={35}
              className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"
            />
```
et ajouter l'import en tête du fichier : `import Image from "next/image";`

- les trois en-têtes de colonnes (`<h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">`) → `<h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-paper">` (libellés mono éditoriaux) ;
- le lien de contact accentué `text-primary-400 ... hover:text-primary-300` → `text-gold hover:text-paper` ;
- le fond `bg-ink` et les filets `border-white/10` restent (encre éditoriale).

- [ ] **Step 3 : Mettre à jour `Footer.test.tsx` si nécessaire**

Ouvrir `frontend/components/layout/Footer.test.tsx`. Si un test asserte le **texte** « BAMFA » du `<span>` retiré, le remplacer par une assertion sur le logo : `expect(screen.getByAltText("BAMFA")).toBeInTheDocument();`. Si le test ne visait que des liens/en-têtes conservés, ne rien changer.

- [ ] **Step 4 : Lancer les tests layout (doivent rester verts)**

Run: `npm run test -- Header Footer Layout`
Expected: PASS — le test Header vérifie l'alt « BAMFA » (logo, inchangé) et la nav ; le test Footer vérifie les liens/colonnes (et, le cas échéant, le logo mis à jour au Step 3).

- [ ] **Step 5 : Vérifier la suite complète + build**

Run: `npm run test`
Expected: tous verts.
Run: `rm -rf .next && npm run build`
Expected: build OK ; routes inchangées.

- [ ] **Step 6 : Commit**

```bash
git add components/layout/Header.tsx components/layout/Footer.tsx components/layout/Footer.test.tsx
git commit -m "feat: restyle editorial du Header et du Footer (logo reel, mono, encre)"
```

---

## Vérification finale (manuelle)

- [ ] `npm run dev` → l'app charge en **Fraunces (titres serif) + Geist (corps)** ; plus aucune trace d'Inter/Poppins.
- [ ] Fond **papier** chaud, primitifs nets (rayons resserrés), boutons encre, focus flamme.
- [ ] Header : logo réel, CTA encre ; Footer : logo réel, en-têtes mono.
- [ ] Le smooth-scroll (Lenis) est actif ; avec `prefers-reduced-motion` activé, pas d'animation.
- [ ] Les pages publiques (non encore refondues) restent **affichables** (elles héritent des polices ; leurs tokens hérités existent toujours).

## Definition of Done (DA-1)

- [ ] Fraunces/Geist/Geist Mono en place ; Inter/Poppins retirés.
- [ ] Tokens éditoriaux (`ink/paper/flame/flame-ink/gold/ember/stone`) + rayons resserrés dans `@theme` ; tokens hérités conservés.
- [ ] `FlameGlyph`, `Reveal`, `SmoothScrollProvider` créés et testés.
- [ ] Primitifs UI + `Eyebrow`/`Stat` + `Header`/`Footer` restylés (API publiques inchangées).
- [ ] `npm run test` vert, `npm run build` OK, contrastes AA, `prefers-reduced-motion` honoré.

## Points reportés (hors DA-1)

- Refonte des **pages publiques** (Accueil/À propos/Contact : masthead, sections éditoriales, timeline numérotée, cartes-portraits) → **DA-2**.
- Refonte **connexion + shell admin + dashboard** → **DA-3**.
- Nettoyage des tokens hérités (`primary-*`, `cream`, `bg-brand-gradient` hors logo) une fois DA-2/DA-3 terminées.
