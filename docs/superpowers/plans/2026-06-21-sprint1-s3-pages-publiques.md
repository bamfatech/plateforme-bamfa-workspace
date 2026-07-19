# Sprint 1 / S3 — Pages publiques statiques : Implementation Plan

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le site vitrine public de BAMFA (6 pages riches et responsive) sur le design system S2, avec contenu FR de substitution isolé, composants de sections réutilisables, formulaire de contact (UI) et SEO.

**Architecture:** Pages statiques Next.js (App Router) sous `app/(public)/`, composées à partir de **composants de sections** (`components/sections/`) eux-mêmes bâtis sur le design system S2 (`components/ui/`). Le **contenu** est isolé dans `content/` (objets typés FR). Icônes via `lucide-react`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, lucide-react · Vitest + Testing Library.

**Dépôt :** `frontend`. **Spec :** `docs/superpowers/specs/2026-06-21-sprint1-s3-pages-publiques.md` (workspace).

## Global Constraints

- Langue **française** (UI, contenus, commits). Commits **sans mention de Claude/IA/assistant** (cf. `frontend/CLAUDE.md`).
- **TDD** : test qui échoue → implémentation → test qui passe → commit (pour composants et logique ; pages = test ciblé du `h1`/section clé).
- **Accessibilité AA** : réutiliser les tokens S2 (boutons `primary-700`, texte sémantique `-text`), `h1` unique par page, focus visibles, `alt` sur images.
- Contenu = **substitution FR réaliste**, isolé dans `content/`, en-tête « à remplacer par le contenu officiel ».
- Réutiliser les composants S2 (`Container`, `Section`, `Card`, `Button`, `Link`, `Field`, `Alert`) via l'alias `@/components/ui/...`.
- Environnement Windows / Git Bash : état shell non persistant → enchaîner les commandes.

---

## File Structure

**Sections (`frontend/components/sections/`)** : `Hero.tsx`, `PageHeader.tsx`, `Stat.tsx`, `FeatureCard.tsx`, `ValueCard.tsx`, `CallToAction.tsx` (+ tests).
**Contenu (`frontend/content/`)** : `home.ts`, `about.ts`, `values.ts`, `how-it-works.ts`, `org.ts`, `contact.ts`.
**Pages (`frontend/app/(public)/`)** : `page.tsx` (Accueil, remplacé), `a-propos/page.tsx`, `vision-mission-valeurs/page.tsx`, `fonctionnement/page.tsx`, `organigramme/page.tsx`, `contact/page.tsx`.
**Contact** : `frontend/components/contact/ContactForm.tsx`.
**Modifiés** : `frontend/components/layout/Header.tsx`, `frontend/components/layout/Footer.tsx` (réalignement nav).

---

### Task 1: lucide-react + composants de sections

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/components/sections/Hero.tsx`, `PageHeader.tsx`, `Stat.tsx`, `FeatureCard.tsx`, `ValueCard.tsx`, `CallToAction.tsx`
- Test: `frontend/components/sections/Sections.test.tsx`

**Interfaces:**
- Consumes: `Container`, `Section`, `Button` (S2) ; `lucide-react` icônes.
- Produces:
  - `Hero({ title, subtitle, primaryCta?: {label,href}, secondaryCta?: {label,href} })`
  - `PageHeader({ title, intro? })`
  - `Stat({ value, label })`
  - `FeatureCard({ icon: LucideIcon, title, description })`
  - `ValueCard({ icon: LucideIcon, title, description })`
  - `CallToAction({ title, description?, cta: {label,href} })`

- [ ] **Step 1: Installer lucide-react**

Run: `cd frontend && npm install lucide-react`
Expected: installation sans erreur.

- [ ] **Step 2: Write the failing test**

`frontend/components/sections/Sections.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { Award } from "lucide-react";
import { describe, expect, it } from "vitest";

import { CallToAction } from "./CallToAction";
import { FeatureCard } from "./FeatureCard";
import { Hero } from "./Hero";
import { PageHeader } from "./PageHeader";
import { Stat } from "./Stat";
import { ValueCard } from "./ValueCard";

describe("composants de sections", () => {
  it("Hero rend le titre et les CTA", () => {
    render(
      <Hero
        title="Bienvenue"
        subtitle="Sous-titre"
        primaryCta={{ label: "Découvrir", href: "/a-propos" }}
        secondaryCta={{ label: "Nous soutenir", href: "/contact" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Bienvenue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir" })).toHaveAttribute("href", "/a-propos");
    expect(screen.getByRole("link", { name: "Nous soutenir" })).toHaveAttribute("href", "/contact");
  });

  it("PageHeader rend un h1", () => {
    render(<PageHeader title="À propos" intro="Intro" />);
    expect(screen.getByRole("heading", { level: 1, name: "À propos" })).toBeInTheDocument();
  });

  it("Stat rend valeur et libellé", () => {
    render(<Stat value="250+" label="Alumni" />);
    expect(screen.getByText("250+")).toBeInTheDocument();
    expect(screen.getByText("Alumni")).toBeInTheDocument();
  });

  it("FeatureCard rend titre et description", () => {
    render(<FeatureCard icon={Award} title="Mentorat" description="Accompagnement" />);
    expect(screen.getByText("Mentorat")).toBeInTheDocument();
    expect(screen.getByText("Accompagnement")).toBeInTheDocument();
  });

  it("ValueCard rend titre et description", () => {
    render(<ValueCard icon={Award} title="Excellence" description="Viser haut" />);
    expect(screen.getByText("Excellence")).toBeInTheDocument();
  });

  it("CallToAction rend le titre et le bouton-lien", () => {
    render(<CallToAction title="Rejoignez-nous" cta={{ label: "Contact", href: "/contact" }} />);
    expect(screen.getByText("Rejoignez-nous")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- sections/Sections`
Expected: FAIL — modules de sections introuvables.

- [ ] **Step 4: Write minimal implementations**

`frontend/components/sections/Hero.tsx` :
```tsx
import Link from "next/link";

import { Container } from "@/components/ui/Container";

type Cta = { label: string; href: string };

export function Hero({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  subtitle?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
}) {
  return (
    <section className="bg-brand-gradient text-white">
      <Container className="py-20 sm:py-28">
        <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-6 max-w-2xl text-lg text-white/90">{subtitle}</p>}
        {(primaryCta || secondaryCta) && (
          <div className="mt-8 flex flex-wrap gap-4">
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="inline-flex h-12 items-center rounded-md bg-white px-6 font-medium text-primary-700 hover:bg-white/90"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex h-12 items-center rounded-md border border-white/70 px-6 font-medium text-white hover:bg-white/10"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
```

`frontend/components/sections/PageHeader.tsx` :
```tsx
import { Container } from "@/components/ui/Container";

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="bg-cream">
      <Container className="py-14 sm:py-16">
        <h1 className="font-heading text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-stone-600">{intro}</p>}
      </Container>
    </section>
  );
}
```

`frontend/components/sections/Stat.tsx` :
```tsx
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-heading text-4xl font-bold text-primary-600">{value}</div>
      <div className="mt-1 text-sm text-stone-600">{label}</div>
    </div>
  );
}
```

`frontend/components/sections/FeatureCard.tsx` :
```tsx
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Icon className="h-8 w-8 text-primary-600" aria-hidden="true" />
      <h3 className="mt-4 font-heading text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-stone-600">{description}</p>
    </Card>
  );
}
```

`frontend/components/sections/ValueCard.tsx` :
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
      <Icon className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" />
      <div>
        <h3 className="font-heading font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
    </Card>
  );
}
```

`frontend/components/sections/CallToAction.tsx` :
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
    <section className="bg-ink text-white">
      <Container className="flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">{title}</h2>
          {description && <p className="mt-2 text-white/80">{description}</p>}
        </div>
        <Link
          href={cta.href}
          className="inline-flex h-12 shrink-0 items-center rounded-md bg-brand-gradient px-6 font-medium text-white hover:opacity-90"
        >
          {cta.label}
        </Link>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- sections/Sections`
Expected: PASS (6 passed).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add components/sections package.json package-lock.json && git commit -m "feat(frontend): lucide-react + composants de sections (Hero, PageHeader, Stat, cards, CTA)"
```

---

### Task 2: Page d'accueil

**Files:**
- Create: `frontend/content/home.ts`
- Modify (remplace): `frontend/app/(public)/page.tsx`
- Test: `frontend/app/(public)/page.test.tsx`

**Interfaces:**
- Consumes: sections (Task 1), `Container`/`Section` (S2), icônes lucide.
- Produces: page `/` complète + `metadata`.

- [ ] **Step 1: Contenu de substitution**

`frontend/content/home.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
import { GraduationCap, HandHeart, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const home = {
  hero: {
    title: "Le réseau des alumni Mastercard Foundation au Bénin",
    subtitle:
      "BAMFA fédère, accompagne et valorise les diplômés de la Mastercard Foundation pour multiplier leur impact au Bénin et au-delà.",
    primaryCta: { label: "Découvrir BAMFA", href: "/a-propos" },
    secondaryCta: { label: "Nous soutenir", href: "/contact" },
  },
  stats: [
    { value: "250+", label: "Alumni membres" },
    { value: "15", label: "Programmes & initiatives" },
    { value: "30+", label: "Événements organisés" },
  ],
  mission: {
    title: "Notre mission",
    text: "Créer une communauté solidaire d'alumni engagés, en facilitant le mentorat, le partage d'opportunités et la conduite de projets à fort impact social.",
  },
  features: [
    { icon: Users as LucideIcon, title: "Communauté", description: "Un réseau actif d'alumni qui s'entraident et collaborent." },
    { icon: GraduationCap as LucideIcon, title: "Mentorat & formation", description: "Des programmes d'accompagnement et de montée en compétences." },
    { icon: HandHeart as LucideIcon, title: "Impact", description: "Des projets concrets au service des communautés." },
  ],
  cta: {
    title: "Devenez partenaire de BAMFA",
    description: "Ensemble, amplifions l'impact des alumni au Bénin.",
    cta: { label: "Nous contacter", href: "/contact" },
  },
};
```

- [ ] **Step 2: Write the failing test**

`frontend/app/(public)/page.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("Page d'accueil", () => {
  it("rend le hero et les chiffres-clés", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /réseau des alumni Mastercard Foundation au Bénin/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("250+")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- "(public)/page"`
Expected: FAIL — l'accueil actuel (composant `Brand`) ne contient pas ce hero.

- [ ] **Step 4: Write the page**

Remplacer `frontend/app/(public)/page.tsx` par :
```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CallToAction } from "@/components/sections/CallToAction";
import { FeatureCard } from "@/components/sections/FeatureCard";
import { Hero } from "@/components/sections/Hero";
import { Stat } from "@/components/sections/Stat";
import { home } from "@/content/home";

export const metadata = {
  title: "BAMFA — Réseau des alumni Mastercard Foundation au Bénin",
  description:
    "BAMFA fédère, accompagne et valorise les alumni de la Mastercard Foundation au Bénin.",
};

export default function HomePage() {
  return (
    <>
      <Hero {...home.hero} />

      <Section>
        <Container className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {home.stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} />
          ))}
        </Container>
      </Section>

      <Section className="bg-cream">
        <Container>
          <h2 className="font-heading text-3xl font-bold text-ink">{home.mission.title}</h2>
          <p className="mt-4 max-w-3xl text-lg text-stone-600">{home.mission.text}</p>
        </Container>
      </Section>

      <Section>
        <Container className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {home.features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </Container>
      </Section>

      <CallToAction {...home.cta} />
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- "(public)/page"`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add "app/(public)/page.tsx" "app/(public)/page.test.tsx" content/home.ts && git commit -m "feat(frontend): page d'accueil (hero, chiffres-cles, apercus, CTA)"
```

---

### Task 3: Pages institutionnelles (À propos, Vision/mission/valeurs, Fonctionnement)

**Files:**
- Create: `frontend/content/about.ts`, `frontend/content/values.ts`, `frontend/content/how-it-works.ts`
- Create: `frontend/app/(public)/a-propos/page.tsx`, `frontend/app/(public)/vision-mission-valeurs/page.tsx`, `frontend/app/(public)/fonctionnement/page.tsx`
- Test: `frontend/app/(public)/institutionnel.test.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `ValueCard` (Task 1), `Container`/`Section`/`Card` (S2), icônes lucide.
- Produces: 3 pages + `metadata` chacune.

- [ ] **Step 1: Contenus de substitution**

`frontend/content/about.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
export const about = {
  header: {
    title: "À propos de BAMFA",
    intro: "La Benin Association of the Mastercard Foundation Alumni rassemble les diplômés de la Mastercard Foundation au Bénin.",
  },
  sections: [
    {
      title: "Qui sommes-nous",
      text: "BAMFA est une association qui réunit les alumni de la Mastercard Foundation afin de renforcer leurs liens, valoriser leurs parcours et démultiplier leur impact au service du développement.",
    },
    {
      title: "Le réseau Mastercard Foundation",
      text: "Nos membres sont issus des programmes de la Mastercard Foundation. Ensemble, ils forment un réseau d'entraide, de mentorat et de collaboration à l'échelle nationale et internationale.",
    },
    {
      title: "Notre histoire",
      text: "Née de la volonté des alumni de rester connectés et d'agir collectivement, BAMFA structure aujourd'hui ses actions autour de la communauté, des opportunités et de l'impact.",
    },
  ],
};
```

`frontend/content/values.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
import { Compass, HeartHandshake, Lightbulb, ShieldCheck, Sprout, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const values = {
  header: { title: "Vision, mission & valeurs", intro: "Ce qui guide l'action de BAMFA au quotidien." },
  vision: {
    title: "Vision",
    text: "Une communauté d'alumni influente et solidaire, moteur de transformation positive au Bénin.",
  },
  mission: {
    title: "Mission",
    text: "Fédérer les alumni, faciliter le mentorat et le partage d'opportunités, et porter des projets à fort impact social.",
  },
  items: [
    { icon: HeartHandshake as LucideIcon, title: "Solidarité", description: "S'entraider et avancer ensemble." },
    { icon: ShieldCheck as LucideIcon, title: "Intégrité", description: "Agir avec éthique et transparence." },
    { icon: Lightbulb as LucideIcon, title: "Innovation", description: "Oser des solutions nouvelles." },
    { icon: Sprout as LucideIcon, title: "Impact", description: "Servir les communautés durablement." },
    { icon: Users as LucideIcon, title: "Inclusion", description: "Valoriser chaque membre." },
    { icon: Compass as LucideIcon, title: "Excellence", description: "Viser haut, avec exigence." },
  ],
};
```

`frontend/content/how-it-works.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
export const howItWorks = {
  header: { title: "Fonctionnement", intro: "Comment BAMFA s'organise et agit." },
  sections: [
    { title: "Gouvernance", text: "BAMFA est animée par un bureau élu et des comités thématiques, avec des mandats renouvelés régulièrement." },
    { title: "Adhésion", text: "Tout alumni de la Mastercard Foundation au Bénin peut rejoindre l'association et participer à ses activités." },
    { title: "Activités", text: "Mentorat, formations, événements, partage d'opportunités et projets communautaires rythment la vie de l'association." },
  ],
};
```

- [ ] **Step 2: Write the failing test**

`frontend/app/(public)/institutionnel.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage from "./a-propos/page";
import HowItWorksPage from "./fonctionnement/page";
import ValuesPage from "./vision-mission-valeurs/page";

describe("pages institutionnelles", () => {
  it("À propos rend son titre", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: "À propos de BAMFA" })).toBeInTheDocument();
  });

  it("Vision/mission/valeurs rend le titre et une valeur", () => {
    render(<ValuesPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Vision, mission & valeurs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Solidarité")).toBeInTheDocument();
  });

  it("Fonctionnement rend son titre", () => {
    render(<HowItWorksPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Fonctionnement" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- institutionnel`
Expected: FAIL — pages introuvables.

- [ ] **Step 4: Write the pages**

`frontend/app/(public)/a-propos/page.tsx` :
```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { about } from "@/content/about";

export const metadata = {
  title: "À propos — BAMFA",
  description: "Découvrez BAMFA, le réseau des alumni de la Mastercard Foundation au Bénin.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader title={about.header.title} intro={about.header.intro} />
      <Section>
        <Container className="flex flex-col gap-10">
          {about.sections.map((s) => (
            <div key={s.title} className="max-w-3xl">
              <h2 className="font-heading text-2xl font-bold text-ink">{s.title}</h2>
              <p className="mt-3 text-stone-600">{s.text}</p>
            </div>
          ))}
        </Container>
      </Section>
    </>
  );
}
```

`frontend/app/(public)/vision-mission-valeurs/page.tsx` :
```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { ValueCard } from "@/components/sections/ValueCard";
import { values } from "@/content/values";

export const metadata = {
  title: "Vision, mission & valeurs — BAMFA",
  description: "La vision, la mission et les valeurs qui guident BAMFA.",
};

export default function ValuesPage() {
  return (
    <>
      <PageHeader title={values.header.title} intro={values.header.intro} />
      <Section>
        <Container className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl font-bold text-ink">{values.vision.title}</h2>
            <p className="mt-3 text-stone-600">{values.vision.text}</p>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-ink">{values.mission.title}</h2>
            <p className="mt-3 text-stone-600">{values.mission.text}</p>
          </div>
        </Container>
      </Section>
      <Section className="bg-cream">
        <Container>
          <h2 className="font-heading text-2xl font-bold text-ink">Nos valeurs</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.items.map((v) => (
              <ValueCard key={v.title} icon={v.icon} title={v.title} description={v.description} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
```

`frontend/app/(public)/fonctionnement/page.tsx` :
```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/sections/PageHeader";
import { howItWorks } from "@/content/how-it-works";

export const metadata = {
  title: "Fonctionnement — BAMFA",
  description: "Gouvernance, adhésion et activités de l'association BAMFA.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader title={howItWorks.header.title} intro={howItWorks.header.intro} />
      <Section>
        <Container className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {howItWorks.sections.map((s) => (
            <Card key={s.title}>
              <h2 className="font-heading text-xl font-semibold text-ink">{s.title}</h2>
              <p className="mt-2 text-stone-600">{s.text}</p>
            </Card>
          ))}
        </Container>
      </Section>
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- institutionnel`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add "app/(public)/a-propos" "app/(public)/vision-mission-valeurs" "app/(public)/fonctionnement" "app/(public)/institutionnel.test.tsx" content/about.ts content/values.ts content/how-it-works.ts && git commit -m "feat(frontend): pages a-propos, vision-mission-valeurs, fonctionnement"
```

---

### Task 4: Page Organigramme

**Files:**
- Create: `frontend/content/org.ts`, `frontend/app/(public)/organigramme/page.tsx`
- Test: `frontend/app/(public)/organigramme/page.test.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1), `Container`/`Section`/`Card` (S2).
- Produces: page `/organigramme` + `metadata`.

- [ ] **Step 1: Contenu de substitution**

`frontend/content/org.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
export const org = {
  header: {
    title: "Organigramme",
    intro: "L'équipe qui anime BAMFA pour le mandat en cours.",
  },
  mandate: "Mandat 2024-2026",
  members: [
    { name: "Nom Prénom", role: "Président(e)" },
    { name: "Nom Prénom", role: "Vice-président(e)" },
    { name: "Nom Prénom", role: "Secrétaire général(e)" },
    { name: "Nom Prénom", role: "Trésorier(ère)" },
    { name: "Nom Prénom", role: "Responsable communication" },
    { name: "Nom Prénom", role: "Responsable programmes" },
  ],
};
```

- [ ] **Step 2: Write the failing test**

`frontend/app/(public)/organigramme/page.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrgPage from "./page";

describe("Page organigramme", () => {
  it("rend le titre, le mandat et les rôles", () => {
    render(<OrgPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Organigramme" })).toBeInTheDocument();
    expect(screen.getByText("Mandat 2024-2026")).toBeInTheDocument();
    expect(screen.getByText("Président(e)")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- organigramme`
Expected: FAIL — page introuvable.

- [ ] **Step 4: Write the page**

`frontend/app/(public)/organigramme/page.tsx` :
```tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/sections/PageHeader";
import { org } from "@/content/org";

export const metadata = {
  title: "Organigramme — BAMFA",
  description: "L'équipe et la structure de gouvernance de BAMFA.",
};

export default function OrgPage() {
  return (
    <>
      <PageHeader title={org.header.title} intro={org.header.intro} />
      <Section>
        <Container>
          <p className="text-sm font-medium uppercase tracking-wide text-primary-600">
            {org.mandate}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {org.members.map((m, i) => (
              <Card key={`${m.role}-${i}`}>
                <div className="font-heading text-lg font-semibold text-ink">{m.name}</div>
                <div className="mt-1 text-sm text-primary-700">{m.role}</div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- organigramme`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add "app/(public)/organigramme" content/org.ts && git commit -m "feat(frontend): page organigramme (equipe par mandat)"
```

---

### Task 5: Page Contact + formulaire

**Files:**
- Create: `frontend/content/contact.ts`, `frontend/components/contact/ContactForm.tsx`, `frontend/app/(public)/contact/page.tsx`
- Test: `frontend/components/contact/ContactForm.test.tsx`

**Interfaces:**
- Consumes: `Field`, `Button`, `Alert` (S2), `PageHeader` (Task 1), icônes lucide.
- Produces: page `/contact` + `metadata` ; `ContactForm` (client component, validation, soumission non branchée).

- [ ] **Step 1: Contenu de substitution**

`frontend/content/contact.ts` :
```ts
// Contenu de substitution — à remplacer par le contenu officiel BAMFA.
export const contact = {
  header: {
    title: "Contact",
    intro: "Une question, un partenariat, une idée ? Écrivez-nous.",
  },
  coordinates: {
    email: "contact@bamfa.org",
    phone: "+229 00 00 00 00",
    address: "Cotonou, Bénin",
  },
};
```

- [ ] **Step 2: Write the failing test**

`frontend/components/contact/ContactForm.test.tsx` :
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactForm } from "./ContactForm";

describe("ContactForm", () => {
  it("affiche des erreurs quand on soumet vide", () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(screen.getByText("Le nom est requis.")).toBeInTheDocument();
    expect(screen.getByText("L'e-mail est requis.")).toBeInTheDocument();
    expect(screen.getByText("Le message est requis.")).toBeInTheDocument();
  });

  it("valide le format de l'e-mail", () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "invalide" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(screen.getByText("Format d'e-mail invalide.")).toBeInTheDocument();
  });

  it("affiche un message d'information sur soumission valide", () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "alice@bamfa.org" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/bient[oô]t/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- ContactForm`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Write the ContactForm**

`frontend/components/contact/ContactForm.tsx` :
```tsx
"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Errors = { name?: string; email?: string; message?: string };

export function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!values.name.trim()) e.name = "Le nom est requis.";
    if (!values.email.trim()) e.email = "L'e-mail est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = "Format d'e-mail invalide.";
    if (!values.message.trim()) e.message = "Le message est requis.";
    return e;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      // TODO Sprint 2 : brancher POST /api/v1/forms/contact/
      setSent(true);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {sent && <Alert variant="info">Merci ! Le formulaire sera bientôt opérationnel.</Alert>}
      <Field
        label="Nom"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        error={errors.name}
      />
      <Field
        label="E-mail"
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        error={errors.email}
      />
      <Field
        label="Sujet"
        value={values.subject}
        onChange={(e) => set("subject", e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium text-ink">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`rounded-md border px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            errors.message ? "border-danger" : "border-stone-300"
          }`}
        />
        {errors.message && (
          <p id="message-error" className="text-sm text-danger-text">
            {errors.message}
          </p>
        )}
      </div>
      <Button type="submit" className="self-start">
        Envoyer
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- ContactForm`
Expected: PASS (3 passed).

- [ ] **Step 6: Write the contact page**

`frontend/app/(public)/contact/page.tsx` :
```tsx
import { Mail, MapPin, Phone } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import { contact } from "@/content/contact";

export const metadata = {
  title: "Contact — BAMFA",
  description: "Contactez BAMFA : question, partenariat ou proposition.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title={contact.header.title} intro={contact.header.intro} />
      <Section>
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ContactForm />
          <ul className="flex flex-col gap-4 text-stone-700">
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <a className="hover:underline" href={`mailto:${contact.coordinates.email}`}>
                {contact.coordinates.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <span>{contact.coordinates.phone}</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <span>{contact.coordinates.address}</span>
            </li>
          </ul>
        </Container>
      </Section>
    </>
  );
}
```

- [ ] **Step 7: Run the full suite**

Run: `cd frontend && npm run test`
Expected: tous les tests passent (aucune régression).

- [ ] **Step 8: Commit**

```bash
cd frontend && git add "app/(public)/contact" components/contact content/contact.ts && git commit -m "feat(frontend): page contact (formulaire UI + coordonnees)"
```

---

### Task 6: Réalignement nav/footer + vérification finale

**Files:**
- Modify: `frontend/components/layout/Header.tsx`, `frontend/components/layout/Footer.tsx`
- Test: `frontend/components/layout/Header.test.tsx` (mise à jour)

**Interfaces:**
- Consumes: pages existantes (Tasks 2-5).
- Produces: nav/footer pointant vers les pages qui existent.

- [ ] **Step 1: Mettre à jour le test du Header (liens réalignés)**

Dans `frontend/components/layout/Header.test.tsx` :

a) Remplacer la ligne d'import de Testing Library par (ajout de `within`) :
```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
```

b) Remplacer le test "affiche le logo et la navigation principale" par :
```tsx
  it("affiche le logo et la navigation principale realignee", () => {
    render(<Header />);
    expect(screen.getByAltText("BAMFA")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getByRole("link", { name: "Fonctionnement" })).toHaveAttribute(
      "href",
      "/fonctionnement",
    );
  });
```

Laisser inchangé le second test (bascule du menu burger).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- layout/Header`
Expected: FAIL — la nav actuelle ne contient pas de lien « Fonctionnement » (elle pointe vers /programmes, /actualites).

- [ ] **Step 3: Réaligner la nav du Header**

Dans `frontend/components/layout/Header.tsx`, remplacer la constante `NAV` par :
```tsx
const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/organigramme", label: "Organigramme" },
  { href: "/contact", label: "Contact" },
];
```

- [ ] **Step 4: Réaligner les liens du Footer**

Dans `frontend/components/layout/Footer.tsx`, remplacer le bloc `nav` des liens par :
```tsx
        <nav aria-label="Liens de pied de page" className="flex gap-6 text-sm">
          <Link href="/a-propos">À propos</Link>
          <Link href="/vision-mission-valeurs">Vision & valeurs</Link>
          <Link href="/contact">Contact</Link>
        </nav>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- layout/Header`
Expected: PASS.

- [ ] **Step 6: Vérification finale (suite + build)**

Run: `cd frontend && npm run test && npm run build`
Expected: tous les tests verts ; build réussi ; routes générées : `/`, `/a-propos`, `/vision-mission-valeurs`, `/fonctionnement`, `/organigramme`, `/contact`.

- [ ] **Step 7: Commit**

```bash
cd frontend && git add components/layout && git commit -m "feat(frontend): realignement nav/footer sur les pages publiques"
```

---

## Definition of Done — S3

- [ ] 6 pages publiques riches, responsive, sous le layout public, avec `metadata` SEO.
- [ ] Composants de sections réutilisables + `lucide-react`.
- [ ] Contenu FR de substitution isolé dans `content/`.
- [ ] Formulaire de contact (UI + validation client) ; soumission marquée « à brancher Sprint 2 » ; coordonnées affichées.
- [ ] Nav/footer réalignés sur les pages existantes.
- [ ] `npm run test` vert, `npm run build` OK.

## Self-Review (effectuée)

- **Couverture spec** : sections (T1), Accueil (T2), À propos/Vision-mission-valeurs/Fonctionnement (T3), Organigramme (T4), Contact + formulaire (T5), nav/footer + SEO/build (T2-T6). Contenu isolé dans `content/` (T2-T5). lucide-react (T1). Toutes les sections de la spec sont couvertes.
- **Placeholders** : le contenu FR est du contenu de substitution **assumé et livrable** (pas des « TODO ») ; le seul TODO est le point d'intégration Sprint 2 du formulaire (voulu).
- **Cohérence des types** : les composants de sections (T1) exposent les props consommées par les pages (T2-T5) ; les objets `content/*` correspondent aux props utilisées ; réutilisation des tokens/thèmes S2 (`text-danger-text`, `primary-700`, `bg-cream`, `bg-brand-gradient`).
