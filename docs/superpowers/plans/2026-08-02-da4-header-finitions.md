# DA-4 — Finitions header & dette de la refonte « La Revue » : Plan d'implémentation

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Réf. direction artistique** : [../specs/2026-08-02-refonte-direction-artistique-design.md](../specs/2026-08-02-refonte-direction-artistique-design.md)

**Goal:** Améliorer le header (onglet actif + logo agrandi), utiliser les nouveaux logos par surface (PNG transparent sur clair, JPG sur sombre, sans fond blanc ajouté), et solder la dette DA (retrait de la variante `gradient`, échelle `stone` chaude, DRY carte + libellé mono).

**Architecture:** Le `Header` (client) détecte l'onglet actif via `usePathname()` et le marque d'un **soulignement flamme** + `aria-current`. Les logos sont choisis par surface : `logo.png` (transparent) sur fonds clairs, `logo.jpg` (fond blanc intégré) sur fonds sombres — sans habillage `bg-white` ajouté. La dette est soldée : suppression de la variante `gradient` de `Button` + de `.bg-brand-gradient` + du token `red-brand` ; ajout des nuances **chaudes** manquantes de l'échelle `stone` au `@theme` ; factorisation de la coquille de carte et du libellé mono.

**Tech Stack:** Next.js 15 (App Router), React 19, TS, Tailwind v4, `next/image`, `usePathname`, Vitest + Testing Library.

## Global Constraints

- **Langue** : UI/contenu et **messages de commit** en **français**. Ne **jamais** mentionner Claude/IA/assistant. Commits `feat:` / `chore:` / `refactor:`.
- **Dépôt** : `frontend/` uniquement. Alias `@/*`.
- **Assets logo** (dans `frontend/public/`) : `logo.png` (999×250, **RGBA transparent**, mot-symbole noir + marque) → surfaces **claires** ; `logo.jpg` (1678×420, **fond blanc intégré**, recadré serré) → surfaces **sombres**. **Ne jamais ajouter** de `bg-white`/habillage autour du logo (le JPG a déjà son blanc, le PNG est transparent).
- **Tokens éditoriaux** : `ink`, `paper`, `flame` (marques/filets/soulignement), `flame-ink` (accent texte), `ember`, `gold`, `stone-*`. Alt du logo = **"BAMFA"** partout.
- **Tests protégés** : `components/layout/Header.test.tsx` (logo alt, nav, toggle mobile), `Footer.test.tsx` (année), `admin-layout.test.tsx` (email), `RichSections.test.tsx`, `Sections.test.tsx`, `Button.test.tsx` — doivent **rester verts**.
- **Accessibilité** : `aria-current="page"` sur l'onglet actif ; contrastes AA ; focus visibles.
- **Plateforme Windows** : si `npm run build` échoue sur un cache périmé, `rm -rf .next` puis rebâtir.

## File Structure

- `components/layout/Header.tsx` — **réécrit** : logo PNG agrandi + onglet actif (soulignement flamme, `usePathname`).
- `components/layout/Header.test.tsx` — **modifié** : mock de `usePathname`.
- `components/layout/Footer.tsx` — **modifié** : logo JPG sans habillage blanc.
- `app/connexion/page.tsx` — **modifié** : logo JPG (panneau encre) + PNG (mobile), sans habillage blanc.
- `components/admin/Sidebar.tsx` — **modifié** : logo PNG (fond papier).
- `components/ui/Button.tsx` — **modifié** : retrait de la variante `gradient`.
- `app/globals.css` — **modifié** : retrait de `.bg-brand-gradient` + `--color-red-brand` ; ajout des nuances chaudes `stone-100/200/400/500/700`.
- `components/ui/styles.ts` — **créé** : `cardShell`, `monoLabel` (DRY).
- `components/sections/ImageFeatureCard.tsx`, `components/sections/TeamMemberCard.tsx`, `app/(public)/a-propos/page.tsx` — **modifiés** : usage de `cardShell`.

---

## Task 1 : Header — logo agrandi & onglet actif

**Files:**
- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/layout/Header.test.tsx`

**Interfaces:**
- `Header` reste sans props. Consomme `usePathname` (`next/navigation`).

- [ ] **Step 1 : Réécrire `Header`**

Remplacer tout le contenu de `frontend/components/layout/Header.tsx` par :

```tsx
"use client";

import Image from "next/image";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Container } from "@/components/ui/Container";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-300 bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <NextLink href="/" className="inline-flex items-center">
          <Image src="/logo.png" alt="BAMFA" width={200} height={50} priority className="h-10 w-auto" />
        </NextLink>

        <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <NextLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame ${
                  active ? "text-ink" : "text-stone-600 hover:text-ink"
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-1.5 left-0 h-0.5 w-full origin-left bg-flame transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </NextLink>
            );
          })}
          <NextLink
            href="/contact"
            className="inline-flex h-9 items-center rounded-sm bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Nous soutenir
          </NextLink>
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
        <nav aria-label="Navigation mobile" className="border-t border-stone-300 bg-paper md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`rounded-sm px-2 py-2 text-sm transition-colors ${
                    active ? "bg-ink/5 font-medium text-ink" : "text-stone-600 hover:text-ink"
                  }`}
                >
                  {item.label}
                </NextLink>
              );
            })}
            <NextLink
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-9 items-center rounded-sm bg-ink px-4 text-sm font-medium text-paper hover:bg-ember"
            >
              Nous soutenir
            </NextLink>
          </Container>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 2 : Mocker `usePathname` dans le test du Header**

En tête de `frontend/components/layout/Header.test.tsx`, après les imports, ajouter le mock :

```tsx
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
```

*(Si `vi` est déjà importé, ne pas le réimporter — ajouter seulement le `vi.mock(...)`.)* Le reste du test (alt "BAMFA", lien "À propos" → `/a-propos`, bascule mobile) est inchangé et reste vert.

- [ ] **Step 3 : Lancer le test + build**

Run: `npm run test -- Header`
Expected: PASS — logo `alt="BAMFA"` présent, lien "À propos" → `/a-propos`, bouton "Menu" bascule la nav mobile.
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 4 : Commit**

```bash
git add components/layout/Header.tsx components/layout/Header.test.tsx
git commit -m "feat: header — logo agrandi (png) et indicateur d'onglet actif"
```

---

## Task 2 : Logos par surface (Footer, connexion, Sidebar)

**Files:**
- Modify: `frontend/components/layout/Footer.tsx`
- Modify: `frontend/app/connexion/page.tsx`
- Modify: `frontend/components/admin/Sidebar.tsx`
- Tests existants (doivent rester verts) : `Footer.test.tsx`, `admin-layout.test.tsx`, `LoginForm.test.tsx`.

**Interfaces:** Aucun changement d'API ; uniquement les `<Image>` du logo.

- [ ] **Step 1 : Footer — `logo.jpg` sans habillage blanc (fond sombre)**

Dans `frontend/components/layout/Footer.tsx`, remplacer la classe de l'`<Image>` du logo :
`... className="h-9 w-auto rounded-sm bg-white/95 px-2 py-1"`
→
`... className="h-10 w-auto rounded-sm"`
(le `src="/logo.jpg"`, `alt="BAMFA"` et les dimensions restent ; on retire seulement `bg-white/95 px-2 py-1` et on passe `h-9`→`h-10`.)

- [ ] **Step 2 : Connexion — `logo.jpg` (panneau encre) + `logo.png` (mobile), sans habillage blanc**

Dans `frontend/app/connexion/page.tsx` :
- panneau gauche (encre) : l'`<Image>` du logo → retirer `bg-white/95 px-2 py-1`, garder `rounded-sm`. Classe cible : `className="h-10 w-auto rounded-sm"` (src reste `/logo.jpg`, alt "BAMFA").
- logo mobile (côté papier) : changer `src="/logo.jpg"` → `src="/logo.png"` et la classe → `className="h-9 w-auto"` (pas d'habillage ; PNG transparent sur papier).

- [ ] **Step 3 : Sidebar — `logo.png` (fond papier)**

Dans `frontend/components/admin/Sidebar.tsx`, l'`<Image>` du logo : `src="/logo.jpg"` → `src="/logo.png"`, dimensions `width={110} height={29}` → `width={140} height={35}`, classe `h-7 w-auto` → `h-8 w-auto`.

- [ ] **Step 4 : Lancer les tests concernés + build**

Run: `npm run test -- Footer admin-layout LoginForm`
Expected: PASS (alt/année/email inchangés).
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 5 : Commit**

```bash
git add components/layout/Footer.tsx app/connexion/page.tsx components/admin/Sidebar.tsx
git commit -m "feat: logos par surface (png transparent sur clair, jpg sur sombre, sans fond ajoute)"
```

---

## Task 3 : Retrait de la variante `gradient` + `red-brand`

**Files:**
- Modify: `frontend/components/ui/Button.tsx`
- Modify: `frontend/app/globals.css`
- Test existant (doit rester vert) : `Button.test.tsx`.

**Interfaces:** `Button` conserve les variantes `primary|secondary|ghost` (retrait de `gradient`) ; sizes + `loading` inchangés.

- [ ] **Step 1 : Vérifier qu'aucune utilisation ne subsiste**

Run: `grep -rn "variant=\"gradient\"\|bg-brand-gradient" app components 2>/dev/null | grep -v "components/ui/Button.tsx" | grep -v "app/globals.css" || echo "AUCUNE UTILISATION EXTERNE"`
Expected: **AUCUNE UTILISATION EXTERNE**. (Si une utilisation subsiste, la restyler avant de poursuivre.)

- [ ] **Step 2 : Retirer la variante `gradient` de `Button`**

Dans `frontend/components/ui/Button.tsx` :
- type : `type Variant = "primary" | "secondary" | "ghost" | "gradient";` → `type Variant = "primary" | "secondary" | "ghost";`
- objet `variants` : supprimer la ligne `gradient: "bg-brand-gradient text-white hover:opacity-90",`.

- [ ] **Step 3 : Retirer `.bg-brand-gradient` et `--color-red-brand` de `globals.css`**

Dans `frontend/app/globals.css` :
- supprimer la ligne du token : `--color-red-brand: #e11b22;`
- supprimer le bloc utilitaire :
```css
@layer utilities {
  .bg-brand-gradient {
    background-image: linear-gradient(135deg, var(--color-red-brand), var(--color-flame), var(--color-gold));
  }
}
```

- [ ] **Step 4 : Vérifier + build**

Run: `grep -rn "bg-brand-gradient\|red-brand" app components 2>/dev/null || echo "PLUS AUCUNE REFERENCE"`
Expected: **PLUS AUCUNE REFERENCE**.
Run: `npm run test -- Button`
Expected: PASS (variante primaire `bg-ink`, chargement).
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/Button.tsx app/globals.css
git commit -m "chore: retire la variante gradient de Button et le token red-brand"
```

---

## Task 4 : Échelle `stone` chaude

**Files:**
- Modify: `frontend/app/globals.css`

**Interfaces:** ajout de tokens `@theme` (aucune classe nouvelle à écrire — les classes `stone-100/200/400/500/700` existantes prendront les valeurs chaudes).

- [ ] **Step 1 : Ajouter les nuances chaudes manquantes**

Dans `frontend/app/globals.css`, dans le bloc `@theme`, à côté de `--color-stone-300` et `--color-stone-600` déjà présents, ajouter :

```css
  --color-stone-100: #efeae0;
  --color-stone-200: #e3ddd1;
  --color-stone-400: #b3aa9c;
  --color-stone-500: #8a8175;
  --color-stone-700: #4b463e;
```

(Ordre indifférent ; garder l'échelle groupée et lisible : 100, 200, 300, 400, 500, 600, 700.)

- [ ] **Step 2 : Vérifier la suite + build**

Run: `npm run test`
Expected: tous verts (changement purement de valeurs de tokens ; aucun test ne dépend de la teinte).
Run: `rm -rf .next && npm run build`
Expected: build OK — l'échelle de gris est désormais **chaude** et cohérente sur le papier (sidebar « à venir », footer, topbar, dashboard).

- [ ] **Step 3 : Commit**

```bash
git add app/globals.css
git commit -m "chore: harmonise l'echelle stone en gris chauds (100/200/400/500/700)"
```

---

## Task 5 : DRY — coquille de carte & libellé mono

**Files:**
- Create: `frontend/components/ui/styles.ts`
- Modify: `frontend/components/sections/ImageFeatureCard.tsx`
- Modify: `frontend/components/sections/TeamMemberCard.tsx`
- Modify: `frontend/app/(public)/a-propos/page.tsx`
- Tests existants (doivent rester verts) : `RichSections.test.tsx` (ImageFeatureCard), `about.test.tsx` (fonctionnement).

**Interfaces:**
- Produces : `cardShell` (string), `monoLabel` (string) depuis `@/components/ui/styles`.

- [ ] **Step 1 : Créer les utilitaires de style partagés**

`frontend/components/ui/styles.ts` :

```ts
// Coquille éditoriale d'une carte : filet net + survol encre.
export const cardShell =
  "rounded-sm border border-stone-300 bg-white transition-colors hover:border-ink";

// Libellé utilitaire mono (eyebrows courtes, rôles, métadonnées).
export const monoLabel = "font-mono text-xs uppercase tracking-[0.12em]";
```

- [ ] **Step 2 : Appliquer `cardShell` à `ImageFeatureCard`**

Dans `frontend/components/sections/ImageFeatureCard.tsx` :
- ajouter l'import : `import { cardShell } from "@/components/ui/styles";`
- remplacer la classe de l'`<article>` racine `group flex h-full flex-col overflow-hidden rounded-sm border border-stone-300 bg-white transition-colors hover:border-ink` par : `` `group flex h-full flex-col overflow-hidden ${cardShell}` ``.

- [ ] **Step 3 : Appliquer `cardShell` à `TeamMemberCard`**

Dans `frontend/components/sections/TeamMemberCard.tsx` :
- ajouter l'import : `import { cardShell } from "@/components/ui/styles";`
- remplacer la classe de l'`<article>` racine `group h-full overflow-hidden rounded-sm border border-stone-300 bg-white transition-colors hover:border-ink` par : `` `group h-full overflow-hidden ${cardShell}` ``.

- [ ] **Step 4 : Appliquer `cardShell` à la carte « fonctionnement » (page À propos)**

Dans `frontend/app/(public)/a-propos/page.tsx` :
- ajouter l'import : `import { cardShell } from "@/components/ui/styles";`
- remplacer la classe de l'`<article>` des cartes « fonctionnement » `h-full rounded-sm border border-stone-300 bg-white p-7 transition-colors hover:border-ink` par : `` `h-full p-7 ${cardShell}` ``.

- [ ] **Step 5 : Lancer les tests concernés + suite complète + build**

Run: `npm run test -- RichSections about`
Expected: PASS (ImageFeatureCard titre/description/image ; fonctionnement « Gouvernance »).
Run: `npm run test`
Expected: tous verts.
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 6 : Commit**

```bash
git add components/ui/styles.ts components/sections/ImageFeatureCard.tsx components/sections/TeamMemberCard.tsx "app/(public)/a-propos/page.tsx"
git commit -m "refactor: factorise la coquille de carte editoriale (DRY)"
```

---

## Vérification finale (manuelle)

- [ ] Header : logo **plus grand** (PNG net, sans cadre blanc), **onglet actif souligné en flamme** (desktop) et marqué (mobile).
- [ ] Footer & panneau de connexion : logo JPG **sans habillage blanc ajouté** ; sidebar & connexion-mobile : logo PNG transparent.
- [ ] Plus de dégradé (`bg-brand-gradient`) ni de variante `gradient` ; échelle `stone` **chaude** cohérente.
- [ ] Contrastes AA, focus visibles.

## Definition of Done (DA-4)

- [ ] Header : logo agrandi + indicateur d'onglet actif (`aria-current` + soulignement flamme), desktop & mobile.
- [ ] Logos choisis par surface (PNG clair / JPG sombre), sans `bg-white` ajouté.
- [ ] Variante `gradient` + `.bg-brand-gradient` + `red-brand` retirés (grep-vérifié).
- [ ] Échelle `stone` chaude complétée dans le `@theme`.
- [ ] `cardShell`/`monoLabel` factorisés et appliqués.
- [ ] `npm run test` + `npm run build` OK ; tests protégés verts ; AA.

## Points reportés (hors DA-4)

- **Sprint 2** : modules métier du back-office + vraies statistiques.
- **jest-axe** (a11y automatisé) — suivi outillage.
- Application plus large de `monoLabel` aux libellés mono restants (au fil des retouches).
- Remplacer les placeholders (photos/logos partenaires/textes réels) — au fil de l'eau.
