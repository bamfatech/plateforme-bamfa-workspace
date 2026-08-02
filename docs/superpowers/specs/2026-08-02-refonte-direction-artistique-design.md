# Refonte de la direction artistique — « La Revue » : Design

> **Auteur** : Charlot DEDINOU
> **Type** : Document de direction artistique (référence transverse — hors sprint, cadre 3 slices d'implémentation).
> **Date** : 2026-08-02 · **Dépôt cible** : `frontend`
> **Contexte** : retour de l'équipe sur le Sprint 1 — le design est jugé « pas vivant », générique, « pattern IA ». Cette refonte donne à BAMFA une identité éditoriale distinctive, fidèle au logo existant.

---

## 1. Objectif

Remplacer l'exécution générique actuelle (Inter/Poppins, dégradé orange omniprésent, cartes arrondies, mise en page symétrique sans signature) par une **direction élégant-éditoriale** — « La Revue » — qui :

- **respecte le logo existant** (mot-symbole noir géométrique + marque flamme rouge-orange-or) ;
- ancre l'identité dans le **monde de BAMFA** (alumni béninois de la Mastercard Foundation : éducation, leadership, impact communautaire) ;
- discipline la couleur chaude (**flamme en accent** sur base **noir + papier**), avec le dégradé réservé au logo et à un seul moment signature ;
- porte la personnalité par la **typographie** (serif à caractère + grotesque net + mono utilitaire) et par un **élément signature** récurrent.

## 2. Lecture de la marque (logo)

Le logo (`frontend/public/logo.jpg`) : mot-symbole **« BAMFA »** en sans-serif géométrique **noir et gras** ; marque de **deux formes flamme/pétale entrelacées** en dégradé **rouge → orange → or**. Sémantique : chaleur, énergie, mains qui se rejoignent, croissance, communauté. La palette chaude est donc **fidèle à la marque** — c'est l'exécution, pas la teinte, qu'il faut reprendre.

## 3. Système de tokens

### 3.1 Couleur

| Rôle | Nom token | Hex | Usage |
|---|---|---|---|
| Encre | `ink` | `#14130F` | Texte, titres, sections sombres |
| Papier | `paper` | `#F6F2EA` | Fond principal (blanc cassé chaud) |
| Vermillon | `flame` | `#E1451D` | Accent : marques, filets, gros display, fonds d'accent |
| Vermillon foncé | `flame-ink` | `#B5390F` | Accent **texte/liens** (contraste AA sur papier) |
| Or | `gold` | `#F2A93B` | Petites touches, rare |
| Braise | `ember` | `#7A1E10` | Profondeur, fonds sombres alternatifs |
| Gris chaud | `stone-600` | `#6B655B` | Texte secondaire |
| Filet | `stone-300` | `#D8D2C6` | Filets fins (1px), bordures |

**Règles** :
- Le **dégradé du logo** n'apparaît que sur le logo et **un seul moment signature** par page (jamais en fond de section générique).
- Texte courant = `ink` sur `paper` (contraste largement AA). Accent **textuel** = `flame-ink` (jamais `flame` pur sur papier pour du texte < 18px).
- Sections sombres = `ink` ou `ember` en fond, texte `paper`.

### 3.2 Typographie

| Rôle | Police | Usage |
|---|---|---|
| Display | **Fraunces** (serif optique variable) | h1/h2, titres éditoriaux, exergues |
| Corps | **Geist Sans** | paragraphes, UI, boutons |
| Utilité | **Geist Mono** | eyebrows, dates, libellés de chiffres, labels de nav (capitales, interlettrage) |

- **Inter et Poppins sont retirés** (signature n°1 du look IA).
- Échelle large : display `clamp(2.6rem, 7vw, 5.5rem)`, hiérarchie nette, graisses et espacements intentionnels.
- Le **mono en petites capitales espacées** est le signal éditorial récurrent (eyebrows, index, métadonnées).

### 3.3 Motion

- **`motion`** (ex-Framer Motion) : micro-interactions (hover liens/cartes), révélations à l'apparition et au scroll.
- **`lenis`** : smooth-scroll « premium » sous l'ensemble.
- **Retenue** : peu d'effets, orchestrés. Le « moment signature » = révélation cinétique du titre du hero au chargement.
- **`prefers-reduced-motion`** respecté : les composants de motion rendent l'état final sans animation quand la préférence est active.

### 3.4 Forme & densité

- Marges généreuses, grille éditoriale asymétrique, **filets fins** (`stone-300`, 1px) comme séparateurs structurels.
- **Rayons quasi nuls** (`--radius` ≈ 2–4px, voire 0 sur les grands blocs) — on quitte le « tout arrondi » actuel.

## 4. Élément signature & principes de layout

- **Logo réel** (`public/logo.jpg`) dans le header, en remplacement du texte « BAMFA ».
- **Glyphe flamme** : composant `FlameGlyph` — la marque à deux pétales abstraite, utilisée en **séparateur de sections** et en **ponctuation-étincelle** près de certains titres. C'est le fil visuel qui signe chaque page.
- **Hero « masthead »** : titre serif XXL sur colonne étroite + **portrait** d'alumni, révélation cinétique au chargement.
- **Grille éditoriale asymétrique** : colonnes inégales, eyebrows mono, exergues serif, imagerie portrait.
- **Numérotation** (01 / 02 …) **uniquement** sur les vraies séquences (histoire, fonctionnement) — jamais décorative.

## 5. Application page par page (périmètre : public + connexion + admin)

### Public
- **Accueil** : hero masthead (portrait + titre serif, révélation) · bande de chiffres (nombres serif, libellés mono, filets) · mission en split asymétrique · programmes en **cartes éditoriales** (image + titre serif + index mono) · impact en **exergue serif** + portrait · témoignages éditoriaux · partenaires en logos sobres sur papier · CTA = moment flamme. Glyphes flamme en séparateurs.
- **À propos (hub)** : masthead + nav par ancres (mono, filets) · qui-sommes-nous · **histoire = timeline numérotée** · vision/mission en splits · valeurs en grille (index mono) · **fonctionnement numéroté** · équipe en **cartes-portraits éditoriales** (nom serif, rôle mono, overlay au survol) · FAQ en accordéon à filets · CTA.
- **Contact** : grand titre serif, coordonnées en **liste typographique** (libellés mono), formulaire éditorial (champs nets, libellés mono), touche flamme. **Suppression du panneau dégradé** actuel.

### Connexion
- Plein écran éditorial : panneau gauche **encre/braise** (logo + phrase serif + `FlameGlyph`, fini le dégradé vif) ; carte droite papier, champs éditoriaux (**l'icône œil afficher/masquer est conservée**).

### Admin
- **Shell** : base papier, sidebar à filets avec **libellés mono**, titres de page serif, accent flamme sur l'item actif, topbar avec rôle en mono.
- **Dashboard** : salutation serif, libellés de chiffres mono, cartes à filets.

## 6. Approche technique

- **Fonts** : `next/font/google` — Fraunces (variable), Geist, Geist Mono — déclarées dans `app/layout.tsx` ; variables CSS injectées. Retrait d'Inter/Poppins.
- **Tokens** : réécriture des valeurs du bloc `@theme` de `app/globals.css` (couleurs, familles de polices, `--radius`). La propagation aux composants qui consomment les tokens minimise le churn.
- **Dépendances** : `motion`, `lenis`.
- **Nouveaux primitifs** : `SmoothScrollProvider` (Lenis), `Reveal` (wrapper d'apparition, respecte `prefers-reduced-motion`), `FlameGlyph` (SVG signature).
- **Restyle (pas de réécriture d'architecture)** : `Button`, `Field`, `Alert`, `Badge`, `Card`, `Eyebrow`, `Stat`, `Hero`→masthead, `SplitSection`, `Timeline`, `Testimonials`, `Faq`, `TeamMemberCard`, `Header` (logo réel), `Footer`, `Sidebar`, `Topbar`.
- **Tests** : les tests existants sont majoritairement basés sur le **texte/les rôles** → ils restent valides. Ajouts : Fraunces/Geist/Geist Mono au mock `next/font` (`vitest.setup.ts`) ; mock léger de `motion` si nécessaire pour jsdom (rendu des enfants sans animation). AA maintenu, focus visibles, motion réduite honorée.

## 7. Découpage en slices

Ce document est la référence commune. Implémentation en **3 slices**, chacune avec son plan → TDD → revue → merge → CR :

1. **DA-1 — Fondations** : tokens `@theme`, fonts, `SmoothScrollProvider` + `Reveal` + `FlameGlyph`, `Header` (logo réel) + `Footer`, restyle des **primitives UI** (Button/Field/Alert/Badge/Card/Eyebrow/Stat).
2. **DA-2 — Pages publiques** : Accueil, À propos, Contact refondues (masthead, sections éditoriales, timeline numérotée, cartes-portraits, témoignages, FAQ).
3. **DA-3 — Connexion + shell admin** : `/connexion` éditorial, layout admin (sidebar/topbar), dashboard.

## 8. Critères de réussite (DoD de la refonte)

- [ ] Aucune trace d'Inter/Poppins ; Fraunces + Geist + Geist Mono en place.
- [ ] Palette flamme-sur-papier appliquée ; dégradé limité au logo + moment signature.
- [ ] `FlameGlyph` + hero masthead + révélation cinétique présents ; motion réduite honorée.
- [ ] Logo réel dans le header ; footer, primitives et pages refondus dans l'esprit éditorial.
- [ ] Périmètre couvert : public (accueil/à propos/contact), connexion, shell admin + dashboard.
- [ ] Contrastes **AA** conservés ; focus clavier visibles ; responsive mobile.
- [ ] `npm run test` vert, `npm run build` OK sur chaque slice.

## 9. Points hors périmètre / reportés

- **Vraies photos & histoires d'alumni** : la conception prévoit une imagerie portrait ; les visuels réels sont fournis par le porteur au fil de l'eau (placeholders élégants en attendant).
- **Modules métier** du back-office (Sprint 2) : la refonte porte sur le **shell** et les écrans existants, pas sur les futurs CRUD.
- **jest-axe** (a11y automatisé) : suivi outillage, toujours en attente depuis S3.
- Micro-interactions avancées (WebGL, animations lourdes) : non retenues — la direction est éditoriale (précision, pas surenchère).
