# CR de slice — DA-1 : Fondations de la direction artistique « La Revue »

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé (fusionné sur `main` du dépôt **frontend**) · **Date** : 2026-08-02
> **Réf. direction artistique** : [../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md](../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md)
> **Plan** : [../superpowers/plans/2026-08-02-da1-fondations.md](../superpowers/plans/2026-08-02-da1-fondations.md)

## Contexte

Retour de l'équipe sur le Sprint 1 : design jugé « pas vivant », générique, « pattern IA ». DA-1 pose le **socle** de la refonte éditoriale « La Revue » (fidèle au logo, flamme-en-accent sur base noir + papier), sans casser les pages non encore refondues.

## Livré (dépôt `frontend`)

- **Polices éditoriales** : Inter/Poppins retirés → **Fraunces** (display serif), **Geist** (corps), **Geist Mono** (utilité). Câblées dans `app/layout.tsx` + `@theme` de `app/globals.css`.
- **Tokens** : palette éditoriale ajoutée (`ink #14130F`, `paper #F6F2EA`, `flame #E1451D`, `flame-ink #B5390F` pour l'accent texte AA, `gold #F2A93B`, `ember #7A1E10`, `stone-300/600`), rayons resserrés (2–6px), fond de base **papier**. **Tokens hérités conservés** (`primary-*`, `red-brand`, `cream`, `bg-brand-gradient`) pour que les pages non refondues restent affichables.
- **Primitifs de marque & motion** : `FlameGlyph` (SVG signature, décoratif/`role=img` selon `title`), `Reveal` (apparition via `motion`, honore `prefers-reduced-motion`), `SmoothScrollProvider` (Lenis, client only, cleanup).
- **Restyle éditorial** (API publiques inchangées) : `Button` (primaire encre, focus flamme), `Field` (bordure nette, libellé mono, œil conservé), `Alert`, `Badge` (mono), `Card`, `Eyebrow` (mono), `Stat` (nombre serif + libellé mono), `Header` (papier, filet, CTA encre), `Footer` (logo réel, en-têtes mono, accent or).
- **Tests** : mock des nouvelles polices + polyfills `matchMedia`/`IntersectionObserver`/`ResizeObserver` dans `vitest.setup.ts` (gardes corrigées de `in` vers `typeof`).

## Développement (méthode)

- **Subagent-driven** : 6 tâches TDD, un implémenteur frais par tâche + revue par tâche.
- **Boucle de correction** : aucune (les 6 tâches approuvées du premier coup).
- **Revue finale de branche** (opus) → **« Ready to merge: Yes »**, aucun critique/important ; seuls des mineurs cosmétiques, reportés en DA-2/DA-3.

## Commits (sur `main`, frontend)

De `954683b` à `c996813` (6 commits) :
`954683b` polices + tokens · `4df08d6` FlameGlyph · `3706fe4` motion (Reveal + Lenis) · `1f8e46e` restyle primitifs UI · `098c668` Eyebrow + Stat · **`c996813`** Header + Footer.

## Tests

- `vitest` : **53/53** (22 fichiers). `npm run build` : **OK** (routes inchangées, Middleware compilé).

## Points reportés (non bloquants)

- **Échelle `stone` partielle** : seuls `stone-300/600` sont surchargés (chauds) alors que `stone-100/200/400/500/700` restent par défaut (froids) — léger décalage de neutres à harmoniser en refondant les pages (DA-2/DA-3).
- **Lenis enveloppe aussi `(admin)`** : le smooth-scroll s'applique au back-office ; à **scoper au public** lors de DA-3.
- `Reveal` ignore `delay` en `reduced-motion` (comportement correct, sans commentaire).
- **Refonte des pages publiques** (masthead, sections éditoriales, timeline numérotée, cartes-portraits) → **DA-2**.
- **Refonte connexion + shell admin + dashboard** → **DA-3**.
- Nettoyage des tokens hérités une fois DA-2/DA-3 terminées.

## Definition of Done — atteinte

- [x] Fraunces/Geist/Geist Mono en place ; Inter/Poppins retirés.
- [x] Tokens éditoriaux + rayons resserrés dans `@theme` ; tokens hérités conservés.
- [x] `FlameGlyph`, `Reveal`, `SmoothScrollProvider` créés et testés.
- [x] Primitifs UI + `Eyebrow`/`Stat` + `Header`/`Footer` restylés (API inchangées).
- [x] `npm run test` (53/53) + `npm run build` OK ; contrastes AA ; `prefers-reduced-motion` honoré.
