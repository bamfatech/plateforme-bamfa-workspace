# DA-2 (composants) — Composants de sections éditoriaux « La Revue » : Plan d'implémentation

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Réf. direction artistique** : [../specs/2026-08-02-refonte-direction-artistique-design.md](../specs/2026-08-02-refonte-direction-artistique-design.md) · **Socle** : [DA-1](./2026-08-02-da1-fondations.md)

**Goal:** Refondre les composants de sections publics dans le langage éditorial « La Revue » — hero « masthead » signature, cartes nettes à filets, timeline numérotée, exergues serif — sur les tokens et primitives posés en DA-1.

**Architecture:** On restyle les composants existants de `components/sections/` (Hero, PageHeader, SplitSection, ValueCard, ImageFeatureCard, Testimonials, Faq, Timeline, TeamMemberCard, CallToAction) vers les tokens éditoriaux (`ink/paper/flame/flame-ink/ember/stone-300`), en conservant leurs **API publiques** (les 3 pages les consomment sans changement). Le Hero devient l'élément signature (titre serif XXL + portrait + révélation `Reveal`). L'assemblage des pages (rythme des fonds, séparateurs `FlameGlyph`, `Reveal` par section) est traité dans le plan **DA-2 (pages)** qui suit.

**Tech Stack:** Next.js 15 (App Router, TS), React 19, Tailwind v4, `next/image`, `motion` via le composant `Reveal` (DA-1), `FlameGlyph` (DA-1), lucide-react, Vitest + Testing Library.

## Global Constraints

- **Langue** : UI/contenu et **messages de commit** en **français**. Ne **jamais** mentionner Claude/IA/assistant. Commits `feat:`.
- **Dépôt** : `frontend/` uniquement. Alias `@/*`.
- **API publiques inchangées** : les props de chaque composant restent identiques (les 3 pages les utilisent tel quel) — on ne change que le rendu/les classes.
- **Tokens éditoriaux (DA-1)** : `ink #14130F`, `paper #F6F2EA`, `flame #E1451D` (marques/filets, non-texte), `flame-ink #B5390F` (accent **texte** AA), `ember #7A1E10`, `gold #F2A93B`, `stone-300 #D8D2C6` (filets), `stone-600 #6B655B` (texte 2ndaire). Police display = `font-heading` (Fraunces), utilité = `font-mono` (Geist Mono).
- **Discipline éditoriale** : rayons **nets** (`rounded-sm`), **filets** (`border-stone-300`) plutôt qu'ombres lourdes, pas de `bg-brand-gradient` (réservé logo). Accent **texte** = `flame-ink` (jamais `flame` pur < 18px).
- **Primitives DA-1** : `Reveal` (`@/components/motion/Reveal`) pour les révélations ; `FlameGlyph` (`@/components/brand/FlameGlyph`) pour l'accent signature.
- **Tests protégés** : `Sections.test.tsx` (Hero h1 + CTA nommés, PageHeader h1, Stat, ValueCard titre, CallToAction titre + lien) et `RichSections.test.tsx` (SplitSection h2 + image, ImageFeatureCard titre/description/image, Avatar) doivent **rester verts** — garder les balises sémantiques (`h1`/`h2`/`h3`, liens nommés, `alt`).
- **Accessibilité** : contrastes AA, focus visibles, `Reveal` honore déjà `prefers-reduced-motion`.
- **Plateforme Windows** : si `npm run build` échoue sur un cache périmé, `rm -rf .next` puis rebâtir.

## File Structure

- `components/sections/Hero.tsx` — **refonte** : masthead signature (serif XXL + portrait + `Reveal` + `FlameGlyph`).
- `components/sections/PageHeader.tsx` — **refonte** : masthead-lite éditorial.
- `components/sections/SplitSection.tsx` — **restyle** : image nette à filet, titre serif large.
- `components/sections/ValueCard.tsx` — **restyle** : icône `flame-ink`, carte à filet.
- `components/sections/ImageFeatureCard.tsx` — **restyle** : carte éditoriale nette.
- `components/sections/Testimonials.tsx` — **restyle** : exergues serif, filets.
- `components/sections/Faq.tsx` — **restyle** : accordéon à filets, chevron `flame-ink`.
- `components/sections/Timeline.tsx` — **refonte** : timeline **numérotée** (01/02, mono).
- `components/sections/CallToAction.tsx` — **restyle** : bloc encre, bouton papier.
- `components/sections/TeamMemberCard.tsx` — **restyle** : portrait éditorial, rôle mono.

---

## Task 1 : Hero → masthead (élément signature)

**Files:**
- Modify: `frontend/components/sections/Hero.tsx`
- Test existant (doit rester vert) : `components/sections/Sections.test.tsx` (Hero : h1 = `title`, liens nommés `primaryCta.label` / `secondaryCta.label`).

**Interfaces:**
- Conserve la signature : `Hero({ eyebrow?, title, subtitle?, primaryCta?, secondaryCta?, imageSrc?, imageAlt? })` (props inchangées).

- [ ] **Step 1 : Réécrire `Hero` en masthead éditorial**

Remplacer tout le contenu de `frontend/components/sections/Hero.tsx` par :

```tsx
import Image from "next/image";
import Link from "next/link";

import { FlameGlyph } from "@/components/brand/FlameGlyph";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";

import { Eyebrow } from "./Eyebrow";

type Cta = { label: string; href: string };

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="border-b border-stone-300 bg-paper">
      <Container className="grid grid-cols-1 items-end gap-10 py-16 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:py-28">
        <div className="lg:col-span-7">
          {eyebrow && (
            <div className="flex items-center gap-3">
              <FlameGlyph className="h-5 w-5 text-flame" />
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          )}
          <Reveal>
            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {title}
            </h1>
          </Reveal>
          {subtitle && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">{subtitle}</p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex h-12 items-center rounded-sm bg-ink px-7 font-medium text-paper transition-colors hover:bg-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-sm font-medium text-flame-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame"
                >
                  {secondaryCta.label} <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          )}
        </div>
        {imageSrc && (
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-stone-300">
              <Image
                src={imageSrc}
                alt={imageAlt ?? ""}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
```

- [ ] **Step 2 : Lancer le test des sections (doit rester vert)**

Run: `npm run test -- Sections`
Expected: PASS — le `h1` porte toujours `title`, les liens portent toujours `primaryCta.label` / `secondaryCta.label` (le `Reveal` rend son enfant dans le DOM).

- [ ] **Step 3 : Vérifier le build**

Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 4 : Commit**

```bash
git add components/sections/Hero.tsx
git commit -m "feat: hero masthead editorial (serif XXL, portrait, revelation)"
```

---

## Task 2 : PageHeader → masthead-lite éditorial

**Files:**
- Modify: `frontend/components/sections/PageHeader.tsx`
- Test existant (doit rester vert) : `components/sections/Sections.test.tsx` (PageHeader : h1 = `title`).

**Interfaces:**
- Conserve la signature : `PageHeader({ title, intro? })`.

- [ ] **Step 1 : Réécrire `PageHeader`**

Remplacer tout le contenu de `frontend/components/sections/PageHeader.tsx` par :

```tsx
import { FlameGlyph } from "@/components/brand/FlameGlyph";
import { Container } from "@/components/ui/Container";

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="border-b border-stone-300 bg-paper">
      <Container className="py-16 sm:py-20">
        <FlameGlyph className="h-6 w-6 text-flame" />
        <h1 className="mt-5 max-w-4xl font-heading text-5xl font-semibold leading-[1.0] tracking-tight text-ink sm:text-6xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">{intro}</p>
        )}
      </Container>
    </section>
  );
}
```

- [ ] **Step 2 : Lancer le test (doit rester vert)**

Run: `npm run test -- Sections`
Expected: PASS (h1 = `title`).

- [ ] **Step 3 : Commit**

```bash
git add components/sections/PageHeader.tsx
git commit -m "feat: PageHeader masthead-lite editorial"
```

---

## Task 3 : SplitSection & ValueCard

**Files:**
- Modify: `frontend/components/sections/SplitSection.tsx`
- Modify: `frontend/components/sections/ValueCard.tsx`
- Tests existants (doivent rester verts) : `RichSections.test.tsx` (SplitSection : h2 = titre, image `alt`), `Sections.test.tsx` (ValueCard : titre).

**Interfaces:**
- Conserve : `SplitSection({ eyebrow?, title, children, imageSrc, imageAlt, imageSide?, className? })` ; `ValueCard({ icon, title, description })`.

- [ ] **Step 1 : Restyle `SplitSection` (image nette à filet, titre serif large)**

Remplacer le corps de `frontend/components/sections/SplitSection.tsx` par :

```tsx
import Image from "next/image";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import { Eyebrow } from "./Eyebrow";

export function SplitSection({
  eyebrow,
  title,
  children,
  imageSrc,
  imageAlt,
  imageSide = "right",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  imageSrc: string;
  imageAlt: string;
  imageSide?: "left" | "right";
  className?: string;
}) {
  return (
    <Section className={className}>
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={imageSide === "left" ? "lg:order-2" : undefined}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {title}
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-stone-600">{children}</div>
        </div>
        <div
          className={`relative aspect-[4/3] overflow-hidden rounded-sm border border-stone-300 ${
            imageSide === "left" ? "lg:order-1" : ""
          }`}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2 : Restyle `ValueCard` (icône flame-ink)**

Remplacer le corps de `frontend/components/sections/ValueCard.tsx` par :

```tsx
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";

export function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex gap-4">
      <Icon className="h-6 w-6 shrink-0 text-flame-ink" aria-hidden="true" />
      <div>
        <h3 className="font-heading text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{description}</p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3 : Lancer les tests (doivent rester verts)**

Run: `npm run test -- RichSections Sections`
Expected: PASS (SplitSection h2 + alt ; ValueCard titre).

- [ ] **Step 4 : Commit**

```bash
git add components/sections/SplitSection.tsx components/sections/ValueCard.tsx
git commit -m "feat: restyle editorial de SplitSection et ValueCard"
```

---

## Task 4 : ImageFeatureCard & Testimonials

**Files:**
- Modify: `frontend/components/sections/ImageFeatureCard.tsx`
- Modify: `frontend/components/sections/Testimonials.tsx`
- Test existant (doit rester vert) : `RichSections.test.tsx` (ImageFeatureCard : titre/description/image).

**Interfaces:**
- Conserve : `ImageFeatureCard({ icon, title, description, imageSrc, imageAlt })` ; `Testimonials({ eyebrow, title, items, className? })`.

- [ ] **Step 1 : Restyle `ImageFeatureCard` (carte éditoriale nette)**

Remplacer le corps de `frontend/components/sections/ImageFeatureCard.tsx` par :

```tsx
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

export function ImageFeatureCard({
  icon: Icon,
  title,
  description,
  imageSrc,
  imageAlt,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-sm border border-stone-300 bg-white transition-colors hover:border-ink">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Icon className="h-6 w-6 text-flame-ink" aria-hidden="true" />
        <h3 className="mt-4 font-heading text-xl font-semibold text-ink">{title}</h3>
        <p className="mt-2 leading-relaxed text-stone-600">{description}</p>
      </div>
    </article>
  );
}
```

- [ ] **Step 2 : Restyle `Testimonials` (exergues serif, filets)**

Remplacer le corps de `frontend/components/sections/Testimonials.tsx` par :

```tsx
import { Quote } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import { Eyebrow } from "./Eyebrow";

export function Testimonials({
  eyebrow,
  title,
  items,
  className = "",
}: {
  eyebrow: string;
  title: string;
  items: { quote: string; name: string; role: string }[];
  className?: string;
}) {
  return (
    <Section className={className}>
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {title}
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-stone-300 bg-stone-300 md:grid-cols-3">
          {items.map((item) => (
            <figure key={item.name} className="flex flex-col bg-paper p-8">
              <Quote className="h-7 w-7 text-flame" aria-hidden="true" />
              <blockquote className="mt-5 flex-1 font-heading text-xl leading-snug text-ink">
                {item.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-stone-300 pt-4">
                <div className="font-medium text-ink">{item.name}</div>
                <div className="mt-0.5 font-mono text-xs uppercase tracking-[0.12em] text-stone-600">
                  {item.role}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

*(Note : la valeur par défaut de `className` passe de `"bg-cream"` à `""` — le rythme des fonds est géré à l'assemblage des pages, DA-2 pages.)*

- [ ] **Step 3 : Lancer le test (doit rester vert)**

Run: `npm run test -- RichSections`
Expected: PASS (ImageFeatureCard titre/description/image).

- [ ] **Step 4 : Commit**

```bash
git add components/sections/ImageFeatureCard.tsx components/sections/Testimonials.tsx
git commit -m "feat: restyle editorial de ImageFeatureCard et Testimonials"
```

---

## Task 5 : Faq, Timeline (numérotée) & CallToAction

**Files:**
- Modify: `frontend/components/sections/Faq.tsx`
- Modify: `frontend/components/sections/Timeline.tsx`
- Modify: `frontend/components/sections/CallToAction.tsx`
- Test existant (doit rester vert) : `Sections.test.tsx` (CallToAction : titre + lien nommé).

**Interfaces:**
- Conserve : `Faq({ eyebrow, title, items, className? })` ; `Timeline({ steps })` ; `CallToAction({ title, description?, cta })`.

- [ ] **Step 1 : Restyle `Faq` (accordéon à filets, chevron flame-ink)**

Remplacer le corps de `frontend/components/sections/Faq.tsx` par :

```tsx
import { ChevronDown } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import { Eyebrow } from "./Eyebrow";

export function Faq({
  eyebrow,
  title,
  items,
  className = "",
}: {
  eyebrow: string;
  title: string;
  items: { question: string; answer: string }[];
  className?: string;
}) {
  return (
    <Section className={className}>
      <Container className="max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {title}
        </h2>
        <div className="mt-10 divide-y divide-stone-300 border-y border-stone-300">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-flame-ink transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 leading-relaxed text-stone-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2 : Refondre `Timeline` en séquence numérotée**

Remplacer tout le contenu de `frontend/components/sections/Timeline.tsx` par :

```tsx
export function Timeline({
  steps,
}: {
  steps: { year: string; title: string; text: string }[];
}) {
  return (
    <ol className="divide-y divide-stone-300 border-y border-stone-300">
      {steps.map((step, index) => (
        <li key={step.year} className="grid gap-3 py-8 sm:grid-cols-[8rem_1fr] sm:gap-8">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-flame-ink">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-stone-600">
              {step.year}
            </span>
          </div>
          <div>
            <h3 className="font-heading text-xl font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-stone-600">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3 : Restyle `CallToAction` (bloc encre, bouton papier)**

Remplacer le corps de `frontend/components/sections/CallToAction.tsx` par :

```tsx
import Link from "next/link";

import { Container } from "@/components/ui/Container";

export function CallToAction({
  title,
  description,
  cta,
}: {
  title: string;
  description?: string;
  cta: { label: string; href: string };
}) {
  return (
    <section className="bg-ink text-paper">
      <Container className="flex flex-col items-start gap-8 py-16 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {description && <p className="mt-3 max-w-xl text-paper/75">{description}</p>}
        </div>
        <Link
          href={cta.href}
          className="inline-flex h-12 shrink-0 items-center rounded-sm bg-paper px-7 font-medium text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          {cta.label}
        </Link>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4 : Lancer le test (doit rester vert)**

Run: `npm run test -- Sections`
Expected: PASS (CallToAction titre + lien nommé `cta.label`).

- [ ] **Step 5 : Commit**

```bash
git add components/sections/Faq.tsx components/sections/Timeline.tsx components/sections/CallToAction.tsx
git commit -m "feat: restyle editorial de Faq, Timeline numerotee et CallToAction"
```

---

## Task 6 : TeamMemberCard (portrait éditorial)

**Files:**
- Modify: `frontend/components/sections/TeamMemberCard.tsx`
- (Pas de test dédié ; couvert par le build et la page À propos.)

**Interfaces:**
- Conserve : `TeamMemberCard({ member })` avec `member = { name, role, imageSrc, bio?, linkedin?, facebook? }`.

- [ ] **Step 1 : Restyle `TeamMemberCard`**

Remplacer le corps de `frontend/components/sections/TeamMemberCard.tsx` par :

```tsx
import Image from "next/image";

import { FacebookIcon, LinkedInIcon } from "@/components/ui/SocialIcons";

type Member = {
  name: string;
  role: string;
  imageSrc: string;
  bio?: string;
  linkedin?: string;
  facebook?: string;
};

export function TeamMemberCard({ member }: { member: Member }) {
  return (
    <article className="group overflow-hidden rounded-sm border border-stone-300 bg-white transition-colors hover:border-ink">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={member.imageSrc}
          alt={member.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {member.bio && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-ink/40 to-transparent opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="p-5 text-sm leading-relaxed text-paper">{member.bio}</p>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-heading text-lg font-semibold text-ink">{member.name}</h3>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-flame-ink">
          {member.role}
        </p>
        {(member.linkedin || member.facebook) && (
          <div className="mt-4 flex gap-2">
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`LinkedIn de ${member.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-stone-300 text-stone-600 transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            )}
            {member.facebook && (
              <a
                href={member.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Facebook de ${member.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-stone-300 text-stone-600 transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2 : Suite complète + build**

Run: `npm run test`
Expected: tous verts.
Run: `rm -rf .next && npm run build`
Expected: build OK.

- [ ] **Step 3 : Commit**

```bash
git add components/sections/TeamMemberCard.tsx
git commit -m "feat: restyle editorial de TeamMemberCard (portrait, role mono)"
```

---

## Vérification finale (manuelle)

- [ ] `npm run dev` → l'accueil affiche le **hero masthead** (titre serif XXL sur papier, portrait à filet, révélation au chargement).
- [ ] Cartes (programmes, valeurs, témoignages, équipe) **nettes à filets**, sans dégradé ni ombre lourde ; icônes/accents en `flame-ink`.
- [ ] Timeline (page À propos) **numérotée** 01/02… en mono.
- [ ] CallToAction en bloc encre avec bouton papier.
- [ ] Contrastes AA, focus visibles.

## Definition of Done (DA-2 composants)

- [ ] Hero refondu en masthead signature (serif XXL + portrait + `Reveal` + `FlameGlyph`).
- [ ] PageHeader, SplitSection, ValueCard, ImageFeatureCard, Testimonials, Faq, Timeline (numérotée), CallToAction, TeamMemberCard restylés — API inchangées.
- [ ] `Sections.test.tsx` + `RichSections.test.tsx` **verts** ; `npm run test` + `npm run build` OK ; AA.

## Points reportés → DA-2 (pages)

- Assemblage éditorial des pages (Accueil, À propos, Contact) : rythme des fonds (remplacer `bg-cream` par papier/encre alternés), séparateurs `FlameGlyph`, enveloppes `Reveal` par section, nav d'ancres éditoriale, refonte du bloc Contact (suppression du panneau dégradé).
- Harmonisation de l'échelle `stone` (report DA-1).
