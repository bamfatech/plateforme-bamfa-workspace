# DA-3 — Connexion, shell admin & dashboard « La Revue » : Plan d'implémentation

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Réf. direction artistique** : [../specs/2026-08-02-refonte-direction-artistique-design.md](../specs/2026-08-02-refonte-direction-artistique-design.md) · **Précédentes** : [DA-1](./2026-08-02-da1-fondations.md) · [DA-2 composants](./2026-08-02-da2-composants.md) · [DA-2 pages](./2026-08-02-da2-pages.md)

**Goal:** Terminer la refonte « La Revue » sur les écrans authentifiés (page de connexion, shell back-office, dashboard), scoper le smooth-scroll Lenis au site public, puis retirer les tokens hérités devenus morts.

**Architecture:** On restyle `/connexion`, le layout `(admin)` + `Sidebar`/`Topbar`, et le dashboard vers les tokens éditoriaux (`ink/paper/flame/flame-ink/ember/stone-300`), en conservant les API et la logique d'auth (garde, mutations). On déplace `SmoothScrollProvider` du layout racine vers le layout `(public)` (Lenis limité au public). Enfin, on restyle les deux derniers consommateurs de tokens hérités (`Link`, `Avatar`) et on supprime `--color-primary-*` et `--color-cream` du `@theme`.

**Tech Stack:** Next.js 15 (App Router), React 19, TS, Tailwind v4, `next/image`, `FlameGlyph` (DA-1), lucide-react, Vitest + Testing Library.

## Global Constraints

- **Langue** : UI/contenu et **messages de commit** en **français**. Ne **jamais** mentionner Claude/IA/assistant. Commits `feat:` / `chore:`.
- **Dépôt** : `frontend/` uniquement. Alias `@/*`.
- **Tokens éditoriaux (DA-1)** : `ink`, `paper`, `flame` (marques/filets, non-texte), `flame-ink` (accent **texte** AA), `ember`, `gold`, `stone-300` (filets), `stone-600` (texte 2ndaire). Police display = `font-heading` (Fraunces), utilité = `font-mono`.
- **Discipline** : base **papier** (retirer `bg-cream`), **filets** `stone-300`, rayons **nets** (`rounded-sm`), pas de `bg-brand-gradient` sur ces écrans (réservé logo/variante dédiée). Accent **texte** = `flame-ink`. Pas d'emoji décoratif.
- **Logique d'auth inchangée** : la garde du layout `(admin)` (spinner / redirection / rendu), les mutations `login`/`logout`, le middleware — on ne touche qu'au **style**.
- **Tokens conservés** : `bg-brand-gradient` + `red-brand` restent (dégradé du logo / variante `gradient` de `Button`). On retire **uniquement** `primary-*` et `cream`, devenus morts.
- **Tests protégés** : `app/(admin)/admin-layout.test.tsx` (spinner `role="status"`, redirection, rendu enfants + `admin@bamfa.org`), `app/(admin)/admin/dashboard.test.tsx` (heading `/Bonjour Ada/`, `Administrateur`), `components/auth/LoginForm.test.tsx`, `components/sections/RichSections.test.tsx` (Avatar initiales `AK`) doivent **rester verts** — garder textes/rôles.
- **Accessibilité** : contrastes AA, focus visibles.
- **Plateforme Windows** : si `npm run build` échoue sur un cache périmé, `rm -rf .next` puis rebâtir.

## File Structure

- `app/layout.tsx` — **modifié** : retirer `SmoothScrollProvider` (déplacé vers public).
- `app/(public)/layout.tsx` — **modifié** : envelopper dans `SmoothScrollProvider`.
- `app/connexion/page.tsx` — **réécrit** : panneau encre éditorial (logo + `FlameGlyph`), formulaire sur papier.
- `app/(admin)/layout.tsx` — **modifié** : base papier, spinner `flame-ink`.
- `components/admin/Sidebar.tsx` — **réécrit** : filets, logo réel, nav éditoriale.
- `components/admin/Topbar.tsx` — **modifié** : papier/filet, rôle mono.
- `app/(admin)/admin/page.tsx` — **réécrit** : dashboard éditorial (eyebrow mono, titre serif, stats à filets).
- `components/ui/Link.tsx` — **modifié** : `flame-ink` / focus `flame`.
- `components/ui/Avatar.tsx` — **modifié** : initiales sur `ink`.
- `app/globals.css` — **modifié** : suppression des tokens `primary-*` et `cream`.

---

## Task 1 : Scoper Lenis au site public

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/(public)/layout.tsx`

**Interfaces:**
- Consomme : `SmoothScrollProvider` (`@/components/motion/SmoothScrollProvider`).

- [ ] **Step 1 : Retirer `SmoothScrollProvider` du layout racine**

Dans `frontend/app/layout.tsx` : supprimer l'import `SmoothScrollProvider` et le déballer du corps. Le `<body>` devient :

```tsx
      <body>
        <Providers>{children}</Providers>
      </body>
```
(et supprimer la ligne `import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";`).

- [ ] **Step 2 : Envelopper le layout public dans `SmoothScrollProvider`**

Remplacer tout le contenu de `frontend/app/(public)/layout.tsx` par :

```tsx
import type { ReactNode } from "react";

import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
```

- [ ] **Step 3 : Vérifier la suite + build**

Run: `npm run test`
Expected: tous verts (aucun test ne dépend de l'emplacement du provider).
Run: `rm -rf .next && npm run build`
Expected: build OK. Le smooth-scroll Lenis ne s'applique désormais qu'au groupe `(public)` ; `/connexion` et `(admin)` ont un défilement natif.

- [ ] **Step 4 : Commit**

```bash
git add app/layout.tsx "app/(public)/layout.tsx"
git commit -m "feat: scope le smooth-scroll Lenis au site public"
```

---

## Task 2 : Page de connexion éditoriale

**Files:**
- Modify: `frontend/app/connexion/page.tsx`
- Test existant (doit rester vert) : `components/auth/LoginForm.test.tsx` (inchangé — on ne touche pas au formulaire).

**Interfaces:**
- Consomme : `LoginForm` (`@/components/auth/LoginForm`), `FlameGlyph`, `next/image`, `next/link`.

- [ ] **Step 1 : Réécrire `/connexion`**

Remplacer tout le contenu de `frontend/app/connexion/page.tsx` par :

```tsx
import Image from "next/image";
import Link from "next/link";

import { FlameGlyph } from "@/components/brand/FlameGlyph";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Connexion — BAMFA",
};

export default function ConnexionPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque éditorial (encre) — masqué en mobile */}
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <Link href="/" className="inline-flex">
          <Image
            src="/logo.jpg"
            alt="BAMFA"
            width={132}
            height={35}
            className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"
          />
        </Link>
        <div>
          <FlameGlyph className="h-8 w-8 text-flame" />
          <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.02] tracking-tight">
            Espace membre
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-paper/70">
            Accédez à votre back-office pour gérer les contenus, la communauté et la vie de
            l'association.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-paper/50">
          Benin Association of the Mastercard Foundation Alumni
        </p>
      </div>

      {/* Carte de connexion */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex lg:hidden">
            <Image src="/logo.jpg" alt="BAMFA" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-ink">Connexion</h2>
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

- [ ] **Step 2 : Lancer le test du formulaire (doit rester vert) + build**

Run: `npm run test -- LoginForm`
Expected: PASS (formulaire inchangé).
Run: `rm -rf .next && npm run build`
Expected: build OK ; plus de `bg-brand-gradient`/`bg-cream`/`primary-` sur la page.

- [ ] **Step 3 : Commit**

```bash
git add app/connexion/page.tsx
git commit -m "feat: page de connexion editoriale (panneau encre, logo, flamme)"
```

---

## Task 3 : Shell back-office éditorial (layout + Sidebar + Topbar)

**Files:**
- Modify: `frontend/app/(admin)/layout.tsx`
- Modify: `frontend/components/admin/Sidebar.tsx`
- Modify: `frontend/components/admin/Topbar.tsx`
- Test existant (doit rester vert) : `app/(admin)/admin-layout.test.tsx` (spinner `role="status"`, redirection, rendu enfants + `admin@bamfa.org`).

**Interfaces:**
- Conserve : la garde (`isLoading`/`isAuthenticated`) et le rendu `Sidebar`/`Topbar` ; `Sidebar({ user })`, `Topbar({ user })` (props inchangées) ; la logique `handleLogout` de `Topbar`.

- [ ] **Step 1 : Restyle le layout `(admin)` (base papier, spinner flame-ink)**

Dans `frontend/app/(admin)/layout.tsx`, remplacer les deux blocs de rendu (spinner + shell) :
- le conteneur du spinner `bg-cream` → `bg-paper`, et `<Spinner className="h-8 w-8 text-primary-700" />` → `<Spinner className="h-8 w-8 text-flame-ink" />` ;
- le conteneur du shell `<div className="flex min-h-screen bg-cream">` → `<div className="flex min-h-screen bg-paper">` ;
- le `<main className="flex-1 p-6">` → `<main className="flex-1 p-6 lg:p-8">`.

Le reste (imports, garde, `useEffect`, `return null`) est **inchangé**.

- [ ] **Step 2 : Réécrire `Sidebar` (filets, logo réel, nav éditoriale)**

Remplacer tout le contenu de `frontend/components/admin/Sidebar.tsx` par :

```tsx
"use client";

import Image from "next/image";
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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-300 bg-paper lg:flex">
      <div className="flex h-16 items-center border-b border-stone-300 px-6">
        <Link href="/admin" className="inline-flex">
          <Image src="/logo.jpg" alt="BAMFA" width={110} height={29} className="h-7 w-auto" />
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
                className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-stone-400"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                <span className="ml-auto rounded-sm bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-stone-500">
                  À venir
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              <Icon className="h-5 w-5 text-flame-ink" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-300 p-4 text-xs text-stone-500">
        Connecté : <span>{user.email}</span>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3 : Restyle `Topbar` (papier/filet, rôle mono)**

Dans `frontend/components/admin/Topbar.tsx`, remplacer uniquement le `<header>` de rendu :
- `border-stone-200 bg-white` → `border-stone-300 bg-paper` ;
- la ligne du rôle `<p className="text-xs text-stone-500">{role}</p>` → `<p className="font-mono text-xs uppercase tracking-[0.12em] text-stone-500">{role}</p>`.

Le reste (`handleLogout`, `displayName`, `role`, le `Button variant="secondary"`) est **inchangé**.

- [ ] **Step 4 : Lancer le test du layout (doit rester vert)**

Run: `npm run test -- admin-layout`
Expected: PASS — spinner (`role="status"`) présent, redirection, rendu des enfants + `admin@bamfa.org` (span de la Sidebar) inchangés.

- [ ] **Step 5 : Build**

Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 6 : Commit**

```bash
git add "app/(admin)/layout.tsx" components/admin/Sidebar.tsx components/admin/Topbar.tsx
git commit -m "feat: shell back-office editorial (papier, filets, logo, nav mono)"
```

---

## Task 4 : Dashboard éditorial

**Files:**
- Modify: `frontend/app/(admin)/admin/page.tsx`
- Test existant (doit rester vert) : `app/(admin)/admin/dashboard.test.tsx` (heading `/Bonjour Ada/`, `Administrateur`).

**Interfaces:**
- Consomme : `useAuth`, `Badge`.

- [ ] **Step 1 : Réécrire le dashboard**

Remplacer tout le contenu de `frontend/app/(admin)/admin/page.tsx` par :

```tsx
"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { Badge } from "@/components/ui/Badge";

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
    <div className="space-y-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-flame-ink">
          Tableau de bord
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-ink">
          Bonjour {firstName}
        </h1>
        <p className="mt-3 text-stone-600">Bienvenue dans votre back-office BAMFA.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role}>{role}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-sm border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-paper p-6">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-stone-600">
              {stat.label}
            </p>
            <p className="mt-3 font-heading text-4xl font-semibold text-stone-300">—</p>
            <p className="mt-1 text-xs text-stone-500">{stat.hint} · à venir</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Lancer le test (doit rester vert)**

Run: `npm run test -- dashboard`
Expected: PASS — heading `Bonjour Ada` (regex) + badge `Administrateur` présents (l'emoji retiré ne change pas la correspondance).

- [ ] **Step 3 : Commit**

```bash
git add "app/(admin)/admin/page.tsx"
git commit -m "feat: dashboard editorial (eyebrow mono, titre serif, stats a filets)"
```

---

## Task 5 : Nettoyage des tokens hérités

**Files:**
- Modify: `frontend/components/ui/Link.tsx`
- Modify: `frontend/components/ui/Avatar.tsx`
- Modify: `frontend/app/globals.css`
- Test existant (doit rester vert) : `components/sections/RichSections.test.tsx` (Avatar initiales `AK`).

**Interfaces:**
- Conserve : `Link` (mêmes props) ; `Avatar({ name, src?, className? })`.

- [ ] **Step 1 : Restyle `Link` (dernier consommateur de `primary-`)**

Remplacer le corps de `frontend/components/ui/Link.tsx` par :

```tsx
import NextLink from "next/link";
import type { ComponentProps } from "react";

export function Link({ className = "", ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink
      className={`rounded-sm text-flame-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2 : Restyle le repli initiales d'`Avatar` (retirer le dégradé)**

Dans `frontend/components/ui/Avatar.tsx`, remplacer la classe du `<span>` des initiales :
`... rounded-full bg-brand-gradient font-heading text-lg font-semibold text-white ...`
→
`... rounded-full bg-ink font-heading text-lg font-semibold text-paper ...`
(le reste — logique des initiales, variante `src` — est inchangé.)

- [ ] **Step 3 : Vérifier qu'aucune référence `primary-`/`cream` ne subsiste (hors `globals.css`)**

Run: `grep -rn "primary-\|cream" app components lib 2>/dev/null | grep -v "globals.css" || echo "AUCUNE REFERENCE"`
Expected: **AUCUNE REFERENCE**. Si une référence subsiste, la corriger vers le token éditorial équivalent (`text-primary-700`→`text-flame-ink`, `bg-cream`→`bg-paper`, etc.) **avant** de poursuivre.

- [ ] **Step 4 : Supprimer les tokens `primary-*` et `cream` du `@theme`**

Dans `frontend/app/globals.css`, supprimer les 10 lignes suivantes du bloc `@theme` (échelle `primary` + `cream`) :

```css
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
  --color-cream: #faf6f0;
```

Conserver `--color-red-brand` (utilisé par `bg-brand-gradient`) et tous les tokens éditoriaux.

- [ ] **Step 5 : Suite complète + build**

Run: `npm run test`
Expected: tous verts (Avatar initiales `AK` inchangées ; aucun test ne dépend des tokens supprimés).
Run: `rm -rf .next && npm run build`
Expected: build OK — aucune classe `primary-`/`cream` n'étant plus référencée, leur retrait est sans effet visuel.

- [ ] **Step 6 : Commit**

```bash
git add components/ui/Link.tsx components/ui/Avatar.tsx app/globals.css
git commit -m "chore: retire les tokens herites primary-* et cream (restyle Link/Avatar)"
```

---

## Vérification finale (manuelle)

- [ ] `/connexion` : panneau encre éditorial (logo + flamme + titre serif), formulaire sur papier (icône œil conservée). Plus de dégradé.
- [ ] `/admin` (connecté) : sidebar à filets avec logo réel + nav (icônes `flame-ink`, entrées « à venir » désactivées), topbar papier + rôle mono + déconnexion ; dashboard serif + stats à filets.
- [ ] Défilement : le smooth-scroll ne s'applique qu'au site public ; l'admin défile nativement.
- [ ] Contrastes AA, focus visibles ; plus aucune classe `primary-`/`cream` dans le code.

## Definition of Done (DA-3)

- [ ] Lenis scopé au groupe `(public)`.
- [ ] `/connexion`, layout `(admin)`, `Sidebar`, `Topbar`, dashboard refondus en éditorial (logique d'auth intacte).
- [ ] `Link`/`Avatar` restylés ; tokens `primary-*` et `cream` supprimés du `@theme`.
- [ ] Tests protégés verts ; `npm run test` + `npm run build` OK ; AA.

## Points reportés (hors DA-3)

- **Sprint 2** : modules métier du back-office (les entrées « à venir » deviendront les vrais modules) + vraies statistiques du dashboard.
- **jest-axe** (a11y automatisé) — suivi outillage, en attente depuis S3.
- DRY : factoriser la coquille de carte + le libellé mono (report DA-2 composants).
- Remplacer les placeholders (photos réelles d'alumni, logos partenaires, textes) — au fil de l'eau.
