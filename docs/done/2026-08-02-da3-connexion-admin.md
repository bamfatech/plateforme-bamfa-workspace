# CR de slice — DA-3 : Connexion, shell admin & dashboard « La Revue »

> **Auteur** : Charlot DEDINOU
> **Statut** : ✅ Terminé (fusionné sur `main` du dépôt **frontend**) · **Date** : 2026-08-02
> **Réf. direction artistique** : [../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md](../superpowers/specs/2026-08-02-refonte-direction-artistique-design.md)
> **Plan** : [../superpowers/plans/2026-08-02-da3-connexion-admin.md](../superpowers/plans/2026-08-02-da3-connexion-admin.md)

## Livré (dépôt `frontend`)

Dernière slice de la refonte « La Revue » : les écrans authentifiés passent en éditorial, le smooth-scroll est scopé au public, et les tokens hérités sont retirés.

- **Lenis scopé au public** : `SmoothScrollProvider` déplacé du layout racine vers `(public)` — `/connexion` et `(admin)` défilent nativement.
- **`/connexion`** : panneau **encre** éditorial (logo réel + `FlameGlyph` + phrase serif), formulaire sur papier (icône œil conservée). Plus de dégradé.
- **Shell back-office** : layout `(admin)` sur papier + spinner `flame-ink` ; `Sidebar` à filets `stone-300` (logo réel, icônes `flame-ink`, entrées « à venir » désactivées, ligne « Connecté ») ; `Topbar` papier + rôle en mono + déconnexion. **Logique d'auth inchangée** (garde, mutations, middleware).
- **Dashboard** : eyebrow mono, salutation serif (emoji retiré), rôles en `Badge`, statistiques placeholder en **grille à filets**.
- **Nettoyage des tokens hérités** : `Link` (`flame-ink`/`ring-flame`) et `Avatar` (initiales sur `ink`) restylés ; suppression de `--color-primary-*` et `--color-cream` du `@theme` (grep-vérifié : 0 référence restante). `red-brand` + `bg-brand-gradient` conservés (dégradé du logo).

## Développement (méthode)

- **Subagent-driven** : 5 tâches TDD, un implémenteur frais par tâche + revue par tâche.
- **Boucle de correction** : aucune (5 tâches approuvées du premier coup).
- **Revue finale de branche** (opus) → **« Ready to merge: Yes »** ; risque critique (références orphelines après suppression des tokens) **vérifié propre** sur tout l'arbre ; auth intacte ; seuls des mineurs reportés.

## Commits (sur `main`, frontend)

De `213bb81` à `76cb4f8` (5 commits) :
`213bb81` scope Lenis · `9d14a5e` connexion éditoriale · `1722fcf` shell back-office · `318a635` dashboard · **`76cb4f8`** nettoyage tokens hérités.

## Tests

- `vitest` : **54/54** (23 fichiers) sur le résultat fusionné. `npm run build` : **OK** (8 pages).
- Tests protégés verts : garde admin (spinner `role=status`, redirection, `admin@bamfa.org`), dashboard (`/Bonjour Ada/`, `Administrateur`), `LoginForm`, Avatar (`AK`).

## Points reportés (non bloquants)

- **Sprint 2** : modules métier du back-office (les entrées « à venir » deviendront les vrais modules) + vraies statistiques du dashboard.
- **jest-axe** (a11y automatisé) — suivi outillage, en attente depuis S3.
- **Dette DA** : variante `gradient` de `Button` + `.bg-brand-gradient` désormais inutilisées (à retirer dans une passe ultérieure pour clore l'histoire des tokens) ; harmoniser l'échelle `stone` (warm/cool) ; DRY coquille de carte + label mono.
- Remplacer les placeholders (photos/logos/textes réels) — au fil de l'eau.

## Definition of Done — atteinte

- [x] Lenis scopé au groupe `(public)`.
- [x] `/connexion`, layout `(admin)`, `Sidebar`, `Topbar`, dashboard refondus en éditorial (logique d'auth intacte).
- [x] `Link`/`Avatar` restylés ; tokens `primary-*` et `cream` supprimés du `@theme`.
- [x] `npm run test` (54/54) + `npm run build` OK ; AA ; contrastes/focus vérifiés.
