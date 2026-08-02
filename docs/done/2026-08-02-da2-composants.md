# CR de slice — DA-2 (composants) : Composants de sections éditoriaux « La Revue »

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé (fusionné sur `main` du dépôt **frontend**) · **Date** : 2026-08-02
> **Réf. direction artistique** : [../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md](../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md)
> **Plan** : [../superpowers/plans/2026-08-02-da2-composants.md](../superpowers/plans/2026-08-02-da2-composants.md)

## Livré (dépôt `frontend`)

Refonte éditoriale des composants de sections publics, sur le socle DA-1 (tokens flamme-sur-papier, Fraunces/Geist/Geist Mono, `Reveal`/`FlameGlyph`). **API publiques inchangées** — les 3 pages les consomment sans modification.

- **Hero → masthead signature** : titre serif XXL (Fraunces) sur papier dans un `Reveal`, portrait à cadre net, eyebrow avec `FlameGlyph`, plus aucun dégradé.
- **PageHeader → masthead-lite** : `FlameGlyph` + titre serif XXL, filet inférieur.
- **SplitSection / ValueCard / ImageFeatureCard / TeamMemberCard** : cartes **nettes à filets** (`rounded-sm border-stone-300`, survol `border-ink`), accents `flame-ink`, rôles en **mono**.
- **Testimonials** : exergues serif en **grille à filets** (`gap-px`), marque `Quote` flamme, rôles mono.
- **Faq** : accordéon à filets, chevron `flame-ink`, questions serif.
- **Timeline** : séquence **numérotée** (01/02… en mono + année mono) remplaçant le point dégradé.
- **CallToAction** : bloc encre + bouton papier (fini le dégradé).

## Développement (méthode)

- **Subagent-driven** : 6 tâches TDD, un implémenteur frais par tâche + revue par tâche.
- **Boucle de correction** : aucune (6 tâches approuvées du premier coup).
- **Revue finale de branche** (opus) → **« Ready to merge: Yes »**, aucun critique/important ; seuls des polish reportés.

## Commits (sur `main`, frontend)

De `ca1ff3d` à `39960df` (6 commits) :
`ca1ff3d` hero masthead · `1a901f0` PageHeader · `70d0db0` SplitSection + ValueCard · `3991fd3` ImageFeatureCard + Testimonials · `b02df04` Faq + Timeline numérotée + CallToAction · **`39960df`** TeamMemberCard.

## Tests

- `vitest` : **53/53** (22 fichiers) sur le résultat fusionné. `npm run build` : **OK** (8 pages, Middleware compilé).
- Tests protégés (`Sections.test.tsx`, `RichSections.test.tsx`) verts : balises sémantiques `h1/h2/h3`, liens CTA nommés, `alt` images conservés.

## Points reportés (non bloquants)

- **DA-2 (pages)** — assemblage éditorial des pages (Accueil, À propos, Contact) : rythme des fonds (remplacer `bg-cream` par papier/encre alternés), séparateurs `FlameGlyph`, enveloppes `Reveal` par section, nav d'ancres éditoriale, refonte du bloc Contact (suppression du panneau dégradé). Certaines pages passent encore `className="bg-cream"` et gardent des classes héritées au niveau page (attendu, traité en DA-2 pages).
- **Polish** (revue finale) : offset du focus-ring du CTA secondaire du Hero ; cartes `bg-white` sur papier (contraste voulu) ; clé `Timeline` sur `step.year` (pré-existant) ; factoriser la coquille de carte + le libellé mono (DRY) dans une passe ultérieure.
- Harmonisation de l'échelle `stone` (report DA-1) ; scoper Lenis au public (report DA-1, à traiter en DA-3).

## Definition of Done — atteinte

- [x] Hero refondu en masthead signature (serif XXL + portrait + `Reveal` + `FlameGlyph`).
- [x] PageHeader, SplitSection, ValueCard, ImageFeatureCard, Testimonials, Faq, Timeline (numérotée), CallToAction, TeamMemberCard restylés — API inchangées.
- [x] `Sections.test.tsx` + `RichSections.test.tsx` verts ; `npm run test` (53/53) + `npm run build` OK ; AA.
