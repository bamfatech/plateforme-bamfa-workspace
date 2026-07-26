# Sprint 1 / S3 — Pages publiques statiques : Spec détaillée

> **Auteur** : Charlot DEDINOU
> **Type** : Spec de slice (niveau 3 — slice design + contenu → spec avant plan).
> **Sprint** : 1 · **Slice** : S3 · **Dépôt** : `frontend` · **Priorité** : P0
> **Références** : [architecture (niveau 1)](2026-06-20-architecture-socle-technique-design.md) · [overview sprint 1](2026-06-21-sprint1-overview.md) · [spec S2 design system](2026-06-21-sprint1-s2-design-system.md)

---

## 0. Note de réalisation (structure finale livrée)

En cours de réalisation, la structure a évolué (validée avec le porteur) pour éviter des pages trop courtes et augmenter la densité/richesse :

- **Consolidation** : *Vision/mission/valeurs*, *Fonctionnement* et *Organigramme* ne sont plus des pages séparées — ils sont devenus des **sections d'une page « À propos » riche** (avec navigation par ancres). Le site public statique tient donc en **3 pages** : **Accueil**, **À propos** (hub), **Contact**.
- **Enrichissement** : hero éditorial imagé, sections en *splits* alternés, **timeline** d'histoire, **FAQ** (accordéon natif `<details>`), **témoignages**, cartes programmes imagées, **bandeau partenaires en images**, **cartes membres** (photo + overlay bio au survol + liens LinkedIn/Facebook).
- **Contact** : refonte en **panneau dégradé** (coordonnées) + formulaire.
- **Footer** : refonte BAMFA (sombre, colonnes Découvrir/Plateformes/Contact, réseaux sociaux, redirections Transition/Baobab/ACN).
- **Composants ajoutés** : `Eyebrow`, `SplitSection`, `ImageFeatureCard`, `Timeline`, `Testimonials`, `Faq`, `TeamMemberCard`, `Avatar` (photo/initiales), `SocialIcons`.
- **Images** : placeholders (picsum via `remotePatterns`) + avatars ; **à remplacer par les vraies photos BAMFA**.

Les sections 1-13 ci-dessous décrivent la spec initiale ; cette note prévaut là où elles divergent.

## 1. Objectif

Construire les **pages publiques statiques** du site vitrine BAMFA sur les fondations du design system (S2) : une vitrine **riche et moderne** qui présente l'association, sa vision/mission/valeurs, son fonctionnement, son organigramme, et un point de contact — de quoi renforcer la visibilité et la crédibilité auprès des partenaires.

## 2. Périmètre

**Inclus :**
- 6 pages sous `app/(public)/` : Accueil, À propos, Vision/mission/valeurs, Fonctionnement, Organigramme, Contact.
- Composants de **sections** réutilisables (Hero, PageHeader, Stat, FeatureCard, ValueCard, CallToAction).
- **Contenu de substitution** français réaliste, isolé dans `content/`.
- **Icônes** via `lucide-react`.
- **Formulaire de contact** : UI + validation côté client (soumission non branchée).
- **Métadonnées SEO** par page.
- Réconciliation de la **navigation** (Header/Footer) sur les pages existantes.

**Exclus (→ Sprint 2 ou autres slices) :**
- Contenu **dynamique** (programmes, actualités, blogs, événements, opportunités, annuaire alumni) → Sprint 2.
- **Branchement réel** du formulaire de contact (endpoint + email) → Sprint 2 (module `forms`).
- Pages Programmes / Actualités (dynamiques) → Sprint 2.
- Dons/paiement, inscription événements → slices dédiées.

## 3. Décisions de design (validées)

| Sujet | Décision |
|---|---|
| Contenu | Substitution FR réaliste, **isolée dans `content/`** (objets typés), remplaçable |
| Ambition visuelle | **Vitrine riche & moderne** (hero dégradé, sections alternées crème/blanc, cards, chiffres-clés, CTA) |
| Icônes | **`lucide-react`** (SVG légères, tree-shakeable) |
| Formulaire contact | UI + validation client via composants S2 ; **soumission non branchée** (Sprint 2) |
| SEO | `metadata` Next par page (title + description) |

## 4. Pages et structure

Toutes sous `app/(public)/` (héritent du layout header/footer de S2).

| Route | Fichier | Sections |
|---|---|---|
| `/` | `app/(public)/page.tsx` (remplace l'accueil minimal) | Hero (dégradé, accroche, CTA « Découvrir »/« Nous soutenir ») · Chiffres-clés (Stat) · Mission en bref · Aperçu programmes (FeatureCard) · Teaser impact/réalisations · CallToAction partenaires |
| `/a-propos` | `app/(public)/a-propos/page.tsx` | PageHeader · Présentation BAMFA + réseau MCF · Histoire · Renvoi vision/valeurs |
| `/vision-mission-valeurs` | `app/(public)/vision-mission-valeurs/page.tsx` | PageHeader · Vision · Mission · Grille de valeurs (ValueCard + icônes) |
| `/fonctionnement` | `app/(public)/fonctionnement/page.tsx` | PageHeader · Gouvernance · Adhésion · Activités (sections/étapes) |
| `/organigramme` | `app/(public)/organigramme/page.tsx` | PageHeader · Équipe par **mandat** (cards par rôle : nom, fonction) |
| `/contact` | `app/(public)/contact/page.tsx` | PageHeader · Formulaire (client) · Coordonnées (email, tél, réseaux) |

## 5. Composants de sections (`components/sections/`)

Composables au-dessus du design system S2 (Container/Section/Card/Button/Link) :

| Composant | Rôle |
|---|---|
| **Hero** | Bandeau d'accueil : fond dégradé de marque, titre, accroche, CTA(s) |
| **PageHeader** | En-tête des pages internes : bande crème, titre + intro |
| **Stat** | Chiffre-clé (valeur + libellé) |
| **FeatureCard** | Carte icône + titre + description (programmes, atouts) |
| **ValueCard** | Carte valeur (icône + intitulé + texte) |
| **CallToAction** | Bande d'appel à l'action (titre + bouton) |

## 6. Organisation du contenu (`content/`)

- Un module par page (ex. `content/home.ts`, `content/about.ts`, `content/values.ts`, `content/how-it-works.ts`, `content/org.ts`, `content/contact.ts`).
- Objets **typés** exportés, en français, avec un en-tête de commentaire « contenu de substitution — à remplacer par le contenu officiel ».
- Sépare le fond (texte) de la forme (composants) → facile à éditer par un rédacteur et à migrer vers le CMS (Sprint 2).

## 7. Formulaire de contact

- **Client component** (`components/contact/ContactForm.tsx`).
- Champs : nom, e-mail, sujet, message (via `Field` + `textarea` stylé).
- **Validation côté client** : champs requis + format e-mail ; erreurs affichées par champ (`Field` error) au submit.
- Sur soumission valide : **pas d'appel réseau** ; affichage d'un `Alert` d'information (« Le formulaire sera bientôt opérationnel »). Un commentaire `// TODO Sprint 2 : brancher POST /api/v1/forms/contact/` marque le point d'intégration.
- Coordonnées statiques à côté (contenu `content/contact.ts`).

## 8. SEO & métadonnées

- Chaque page exporte `metadata` (Next) : `title` (ex. « À propos — BAMFA ») + `description`.
- Titres sémantiques (`h1` unique par page), structure de titres cohérente, `alt` sur images.

## 9. Navigation & footer

- **Header** (S2) : réaligner la nav sur les pages existantes → Accueil, À propos, Fonctionnement, Organigramme, Contact (retirer Programmes/Actualités jusqu'au Sprint 2 ; garder le CTA « Nous soutenir »).
- **Footer** (S2) : liens vers pages existantes (À propos, Contact) ; retirer/ajuster les liens morts.
- Le sous-menu Vision/mission/valeurs est accessible depuis À propos (et éventuellement la nav).

## 10. Accessibilité & responsive

- Contrastes **WCAG AA** (réutilise les tokens corrigés en S2 : boutons `primary-700`, texte sémantique lisible).
- `h1` unique/page, hiérarchie de titres, focus visibles, `alt` images, formulaire accessible (labels liés, erreurs `aria`).
- Responsive mobile/tablette/desktop (grilles Tailwind).

## 11. Stratégie de tests (Vitest + Testing Library)

- **Sections** : Hero/PageHeader/Stat/FeatureCard/ValueCard/CallToAction rendent leur contenu (titre, CTA).
- **Pages** : chaque page rend son `h1` attendu + une section clé (assertions ciblées, pas de sur-test du texte).
- **Contact** : les champs sont présents ; soumission vide → erreurs ; e-mail invalide → erreur ; soumission valide → `Alert` d'info (pas d'appel réseau).
- **Build** : `npm run build` réussit (toutes les routes statiques générées).

## 12. Definition of Done

- [ ] 6 pages publiques livrées, riches et responsive, sous le layout public.
- [ ] Composants de sections réutilisables + `lucide-react` intégrés.
- [ ] Contenu FR de substitution isolé dans `content/`.
- [ ] Formulaire de contact (UI + validation client), soumission marquée « à brancher Sprint 2 ».
- [ ] Métadonnées SEO par page ; nav/footer réalignés.
- [ ] `npm run test` vert, `npm run build` OK, contrastes AA respectés.

## 13. Points reportés (hors S3)

- Contenu **dynamique** (programmes, actualités, blogs, événements, opportunités, annuaire) → Sprint 2.
- **Branchement** du formulaire de contact (endpoint + email) → Sprint 2.
- Pages Programmes/Actualités + réintégration dans la nav → Sprint 2.
- Remplacement du contenu de substitution par le contenu officiel (rédacteurs).
