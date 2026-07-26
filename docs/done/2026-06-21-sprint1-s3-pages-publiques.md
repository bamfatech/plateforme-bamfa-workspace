# CR de slice — Sprint 1 / S3 : Pages publiques

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé (sur `main` du dépôt **frontend**) · **Date** : 2026-06-21
> **Spec** : [../superpowers/specs/2026-06-21-sprint1-s3-pages-publiques.md](../superpowers/specs/2026-06-21-sprint1-s3-pages-publiques.md)
> **Plan** : [../superpowers/plans/2026-06-21-sprint1-s3-pages-publiques.md](../superpowers/plans/2026-06-21-sprint1-s3-pages-publiques.md)

## Livré (dépôt `frontend`)

Site vitrine public **riche et moderne**, sur le design system S2. **3 pages** (structure consolidée en cours de réalisation) :

- **Accueil** : hero éditorial (dégradé + image + eyebrow), bande de chiffres-clés, mission (split), programmes (cartes imagées), impact (split), **témoignages**, **partenaires en images**, bande CTA.
- **À propos** (page hub, navigation par ancres) : qui-sommes-nous (split), **histoire (timeline)**, vision & mission (splits), **valeurs** (grille), **fonctionnement** (cartes à icônes), **équipe/organigramme** (cartes membres : photo + overlay bio au survol + liens LinkedIn/Facebook), **FAQ** (accordéon `<details>`), témoignages, CTA. *(Vision/valeurs, Fonctionnement et Organigramme y sont fusionnés — plus de pages séparées.)*
- **Contact** : **panneau dégradé** (coordonnées) + formulaire (UI, validation client, **sans appel réseau** — `// TODO Sprint 2`).

**Composants** : `Hero`, `PageHeader`, `Eyebrow`, `Stat`, `FeatureCard`, `ImageFeatureCard`, `ValueCard`, `CallToAction`, `SplitSection`, `Timeline`, `Testimonials`, `Faq`, `TeamMemberCard`, `Avatar` (photo/initiales), `SocialIcons`. **Footer** BAMFA (sombre, colonnes Découvrir/Plateformes/Contact, réseaux, redirections Transition/Baobab/ACN). **Nav** consolidée (Accueil/À propos/Contact + CTA « Nous soutenir »).

**Contenu** isolé dans `content/*.ts` (FR de substitution, « à remplacer »). **Images** = placeholders picsum (via `remotePatterns`) + avatars. **SEO** : `metadata` par page. **Accessibilité AA** (tokens S2 ; voiles de contraste sur les panneaux dégradés).

## Développement (méthode)

- Cœur S3 : subagent-driven (6 tâches TDD + revue par tâche).
- **Enrichissement** (à la main, piloté avec le porteur, skill `frontend-design`) : refonte visuelle, consolidation en « À propos », images, footer, cartes membres, refonte contact.
- **Revue finale de branche** (opus) → 2 Important corrigés (isolation du contenu, contraste AA) + mineurs.

## Commits (sur `main`, frontend)

De `6548269` (composants de sections) à `fd0c64a` (fixes revue finale). Principaux jalons :
`6548269` sections · `5bbfac7` accueil · `8b99d28` pages institutionnelles · `4f3b710` organigramme · `12eff66` contact · `57050ea` nav/footer · `662eebc` fixes S3 · **enrichissement** `f0a95d9` accueil · `5320256` partenaires+footer · `25b1fd3` pages · `529e7d5` consolidation À propos · `2b2a70d` photos+refonte contact · `32b98e9` cartes membres · **`fd0c64a`** fixes revue finale.

*(Note process : le dossier `frontend` étant partagé avec le serveur de dev, un `git checkout main` en cours de route a fait atterrir l'enrichissement directement sur `main` — net effet identique à une fusion ; la branche `feat/s3-pages-publiques` a été supprimée.)*

## Tests

- `vitest` : **31/31**. `npm run build` : **OK** (routes `/`, `/a-propos`, `/contact`).

## Points reportés (non bloquants)

- **Contenu & photos réels** : remplacer les placeholders (textes de substitution, images picsum, avatars, liens réseaux, logos partenaires).
- **Branchement du formulaire de contact** (POST + email) → **Sprint 2** (module `forms`).
- **Pages dynamiques publiques** (Programmes, Réalisations, Actualités, Blogs, Événements, Opportunités, Annuaire alumni, Dons, Newsletter, redirections tierces réelles) → **Sprint 2**.
- Ajouter un **check a11y automatisé** (jest-axe) sur les 3 pages — seul point de la revue finale non traité (suivi outillage).

*Tous les autres retours de la revue finale ont été traités* : contenu isolé, contraste AA (voiles), token `text-danger-text`, champs de contenu morts retirés, composants morts `Brand`/`FeatureCard` supprimés, fond de la page Contact séparé, formulaire vidé après envoi.

## Definition of Done — atteinte

- [x] Site vitrine public riche et responsive (3 pages), sous le layout public.
- [x] Composants de sections + images + `lucide-react`.
- [x] Contenu FR isolé dans `content/`.
- [x] Formulaire de contact (UI + validation) ; envoi marqué « à brancher Sprint 2 ».
- [x] SEO par page ; nav/footer cohérents (aucun lien mort).
- [x] `npm run test` (31/31) + `npm run build` OK ; contrastes AA (voiles) ; revue finale traitée.
