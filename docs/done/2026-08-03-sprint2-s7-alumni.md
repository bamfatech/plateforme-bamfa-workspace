# CR de slice — Sprint 2 / S7 : Alumni

> **Auteur** : Mathias KINNINKPO
> **Statut** : ✅ Terminé, prêt à merger (branche `feat/s7-alumni` dans les trois dépôts) · **Date** : 2026-08-05
> **Spec** : [../superpowers/specs/2026-08-03-sprint2-s7-alumni-design.md](../superpowers/specs/2026-08-03-sprint2-s7-alumni-design.md)
> **Plan** : [../superpowers/plans/2026-08-03-sprint2-s7-alumni.md](../superpowers/plans/2026-08-03-sprint2-s7-alumni.md)
> **Overview** : [../superpowers/specs/2026-08-02-sprint2-overview.md](../superpowers/specs/2026-08-02-sprint2-overview.md)

## Contexte

**Vague V1** du Sprint 2, prise tôt car elle débloque **S9** (ciblage des opportunités), **S13** (succès alumni) et **S17** (messaging et statistiques). Répond à l'objectif spécifique du cahier des charges : « mettre en place une base de données centralisée, fiable et évolutive des alumni », avec ses deux indicateurs de succès — nombre d'alumni inscrits et taux de complétude des profils.

## Décision de conception structurante

La **demande** (`AlumniRegistration`) est découplée du **membre** (`AlumniProfile`, dont le `user` est nullable). Trois conséquences voulues :

1. **Un membre existe sans compte de connexion** — c'est ce qui rend l'import exploitable immédiatement : annuaire d'administration, recherche et ciblage de S9 fonctionnent sans qu'aucun compte n'existe.
2. **Deux jeux de statuts séparés** : `en_attente`/`approuvee`/`rejetee` qualifient une candidature, `actif`/`suspendu`/`archive` qualifient un membre. Un champ fourre-tout aurait obligé chaque requête d'annuaire à exclure trois statuts sur quatre — une fuite par filtre oublié à chaque nouvelle vue.
3. **Un seul chemin d'accès pour les deux portes d'entrée** : approbation et import convergent vers le même flux d'invitation par jeton signé. Une seule surface à sécuriser et à tester.

Le **jeton d'invitation est sans état** : aucune table, aucune colonne `used_at`. L'usage unique découle de l'invariante `profile.user_id is None`, donc le jeton devient inerte de lui-même une fois le compte créé.

## Livré — dépôt `api` (24 commits, `dcdea94..d271537`, 33 fichiers, +4 448 lignes)

- **`apps/common/permissions.py`** : socle `HasAnyRole` (passe-droit super-utilisateur) + `IsAdministrateur`, `IsAdministrateurOrSecretaire`, `IsAlumni`. Réutilisable tel quel par S9 et S17.
- **`apps/alumni`** : `AlumniFieldsMixin` (abstrait), `AlumniProfile` (+ `AlumniProfileQuerySet.in_directory()`, propriété `completeness` calculée), `AlumniRegistration` (contrainte d'unicité partielle sur `email` où `status='en_attente'`), `AlumniImport`/`AlumniImportError`, et sa migration initiale.
- **20 endpoints** sous `/api/v1/alumni/` : inscription publique, annuaire (deux niveaux sur un seul URL), vérification et activation d'invitation, file des demandes + approbation/rejet, annuaire d'administration + `PATCH` + quatre actions de cycle de vie, dépôt d'import + historique, et `moi/`.
- **Cœur d'import neutre vis-à-vis de la source** : `import_alumni(rows, …)` consomme un itérable de `(numéro, dict)` et ne sait rien du CSV ; `parse_csv` est un adaptateur mince. Le jour où une API Transition existe, elle écrit un second adaptateur et alimente le même cœur — c'est la réponse concrète à l'exigence « récupération des informations alumni depuis Transition ».
- **4 gabarits d'email** (accusé, approbation, rejet motivé, invitation) via `send_templated_email_task`, tous envoyés **après** le commit.
- Réglage `FRONTEND_BASE_URL`, extension idempotente de `seed_demo` (4 profils de démonstration dont un non consentant, pour rendre la règle de consentement visible en développement).

## Livré — dépôt `frontend` (20 commits, `384644f..61c0884`, 63 fichiers, +6 122 lignes)

- **5 primitives d'interface partagées** (`Table`, `Pagination`, `Select`, `Textarea`, `Modal`) — mergées tôt car **S6 en a besoin aussi**. La `Modal` porte une gestion complète du focus (focalisation à l'ouverture, piège `Tab`/`Maj+Tab` recalculé à chaque frappe, restitution à la fermeture).
- **Client `lib/alumni/`** : types, `cleanParams`, quatre modules de hooks TanStack Query, un helper unique de lecture du format d'erreur normalisé. `schema.d.ts` régénéré, et les énumérations typées **depuis** lui en `Record<Sector, string>` — la forme qui fait échouer la compilation si un membre manque.
- **3 pages publiques** : annuaire (recherche, filtres, pagination), inscription (validation écrite à la main, sans dépendance de formulaire), activation par lien signé.
- **3 écrans de back-office** : profils avec cycle de vie, file des demandes avec rejet motivé en modale, import avec rapport détaillé ligne à ligne.
- **Espace alumni minimal** + garde de routes généralisée à une liste de préfixes + **redirection de connexion dépendante du rôle** (modification assumée de code livré en S4 : sans elle, un alumni était renvoyé vers `/admin`, d'où la garde le rebouclait sur `/connexion`).

## Méthode

**Pilotage par sous-agents** : 21 tâches TDD, un implémenteur frais et un relecteur indépendant par tâche, puis une revue finale de branche sur le modèle le plus capable, une vague de correction unique et une re-relecture ciblée. **63 dispatches**, ledger tenu à chaque étape.

**14 tâches sur 21 ont demandé un round de correction.** Les constats se rangent en **quatre familles**, dont trois révèlent des défauts de méthode dans ma rédaction du plan plutôt que dans l'exécution.

### Famille 1 — l'exception métier non traduite (6 occurrences)

`bamfa_exception_handler` renvoie délibérément `None` pour les exceptions non-DRF (choix de S5). Toute exception métier non explicitement traduite devient donc un **500**. Vu sur : `IntegrityError` de la contrainte partielle à l'inscription, `claim_invitation` rejoué, course sur l'instruction d'une demande, erreurs base de données par ligne à l'import, `csv.Error` lors de l'itération, collision d'e-mail à l'approbation. Le déclencheur était chaque fois banal — un double-clic, une cellule trop longue, un import intercalé.

> **Recommandation transverse** : durcir `apps/common/exceptions.py` pour que les exceptions non-DRF ne s'échappent plus silencieusement (journalisation + 500 explicite, ou traduction d'un socle d'exceptions métier). Un correctif de quelques lignes dans `common` protégerait toutes les slices à venir, au lieu de retraiter le cas endpoint par endpoint.

### Famille 2 — le test qui décrit sans contraindre (13 occurrences)

Treize tests annonçaient une protection sans la contraindre ; plusieurs passaient **par coïncidence**. Les plus instructifs :

| Cas | Pourquoi il passait sans la protection |
|---|---|
| Isolation du profil (`moi/`) | l'ordre par défaut `last_name, first_name` plaçait le bon profil en premier |
| Champ réservé `promotion=2000` | la valeur était rejetée hors bornes, pas par la protection `read_only` |
| Garde d'instruction d'une demande | l'appel séquentiel ne déclenche jamais la course |
| 403 de la Secrétaire | seules deux des quatre actions réservées étaient assertées |
| Redirection post-connexion | **supprimer entièrement la ligne testée laissait les 6 tests verts** |

Le dernier a été **prouvé par exécution** par le relecteur : les deux sites de redirection se masquaient mutuellement, et `toHaveBeenCalledWith` n'assure que qu'*un* appel correspondant a eu lieu — pas lequel.

> **Recommandation transverse, à inscrire dans les conventions du projet** : **tout test de garde-fou se valide en cassant le garde-fou.** Écrire l'assertion qui *décrit* le comportement voulu est facile ; écrire celle que seul ce comportement peut satisfaire demande de se demander activement « et si je cassais ça ? ». Les correctifs de fin de slice ont été systématiquement validés par mutation, et cette discipline a trouvé des défauts qu'aucune relecture de code n'aurait vus.

### Famille 3 — le défaut de jointure entre deux tâches (4 occurrences)

Chaque moitié correcte, la jointure fausse — **structurellement invisible à une relecture par tâche**, puisque aucun diff ne contient les deux moitiés.

| Jointure | Un côté | L'autre |
|---|---|---|
| Accessibilité / contraste | correction du nom accessible d'une case à cocher | le texte déplacé perdait son héritage de couleur → 3,43:1, sous AA |
| Invitation / activation | le backend ne réécrit jamais le mot de passe d'un compte existant | le front jetait `created`, donc l'alumni essayait un mot de passe jamais appliqué |
| Import / rapport | deux régimes de compteurs soigneusement distingués côté backend | l'écran les affichait à plat, laissant croire à des lignes disparues |
| Cycle de vie / invitation | le cycle de vie pilote `user.is_active` **si un compte existe** | l'invitation ne testait que `user_id is None`, jamais `status` |

Le dernier est le **Critical** de la revue finale : un profil suspendu ou archivé **sans compte** pouvait être invité, activer son accès et se connecter — contournement de la règle que la spec énonce (§3-E, « la suspension bloque la connexion »). C'est une règle sur le *membre*, pas sur une ligne `User` préexistante.

> **Recommandation** : orienter explicitement toute revue finale de branche vers les jointures, plutôt que de la laisser reparcourir des tâches déjà validées. C'est là que se trouve sa valeur propre.

### Famille 4 — l'outillage qui ne vérifie pas ce qu'on croit (2 occurrences)

- **`npm run build` ne type-vérifie pas les `*.test.tsx`** : le type-check de `next build` les ignore silencieusement, donc deux erreurs de typage sont passées la porte. La porte réelle est `npx tsc --noEmit`, désormais dans les commandes du plan.
- **Un serveur lancé avec `--noreload` sert du code périmé** : mon premier parcours de bout en bout testait l'état d'avant la vague de correction et m'a donné un faux négatif sur le correctif C1. Vérifier ce qu'exécute réellement le processus avant de conclure.
- **La suite frontend n'était pas hermétique au réseau**, et je ne l'ai découvert qu'en relançant les tests à la clôture, backend éteint. `fetchCsrfToken` (`lib/api/client.ts`, livré en S4) appelle l'instance axios **par défaut**, pas l'instance `api` que les tests interceptent : la pré-requête CSRF déclenchée par tout `POST`/`PUT`/`PATCH`/`DELETE` échappait aux mocks et partait sur le réseau. La suite ne passait donc que parce qu'un backend écoutait *par hasard* sur le port 8000 — lancé pour régénérer le schéma et dérouler le parcours. Sans lui : **24 échecs sur 157**, et la CI aurait été rouge au premier push. Corrigé en interceptant l'instance par défaut dans `vitest.setup.ts`, avec `onNoMatch: "throwException"` pour qu'un futur appel non mocké échoue bruyamment au lieu de filer vers le réseau. La suite est désormais verte avec le port 8000 prouvé injoignable.

> **Leçon de méthode, la plus coûteuse de la slice** : j'ai annoncé « 157 tests verts » à chaque point d'étape sans vérifier que ce vert était *hermétique*. Une suite qui dépend d'un service extérieur non déclaré n'est pas verte, elle est chanceuse. Ce que la skill de clôture impose — relancer la suite sur l'arbre qu'on s'apprête à intégrer — est exactement ce qui l'a révélé.

## Commits

- **api** : 24 commits, `dcdea94..d271537`.
- **frontend** : 20 commits, `384644f..61c0884`.
- **workspace** : 19 commits (spec, plan, 15 amendements du plan, ce CR).
- **Zéro mention de Claude, d'IA ou d'assistant** dans les 63 messages de commit de la slice (vérifié ; les seules correspondances de l'historique complet sont antérieures à S7 et désignent le fichier `CLAUDE.md`).

Le plan a été **amendé 15 fois en cours d'exécution**, afin que code et plan ne divergent jamais et que les tâches suivantes héritent du bon idiome au lieu de répéter la faute.

## Tests et vérifications

| | Résultat |
|---|---|
| `pytest` | **206 passed** (34 au départ de la slice) |
| `ruff check .` | propre |
| `makemigrations --check --dry-run` | propre |
| `npm run test` | **157 passed** / 41 fichiers (54 au départ), **backend éteint** — suite hermétique |
| `npm run build` | réussi |
| `npx tsc --noEmit` | propre |

**Parcours de bout en bout exercé contre un serveur réel** (backend + frontend lancés, emails lus dans le journal console, jeton d'invitation véritable extrait du courriel) :

- inscription publique → 201, demande en attente, accusé de réception envoyé ;
- approbation → profil `actif` créé avec `user=None`, email d'approbation portant le lien signé ;
- vérification puis activation du jeton → compte créé, rôle `Alumni` attribué, connexion réussie ;
- `alumni/moi/` accessible au titulaire ;
- **annuaire public anonyme : aucun champ `email` ni `phone`, aucun `@` dans la réponse brute** ; annuaire connecté : `city`, `bio`, `linkedin_url` ajoutés, champs privés toujours absents ;
- import avec séparateur `;` et une ligne invalide → ligne isolée au rapport, lignes valides importées, invariant des compteurs vérifié ; **second passage du même fichier : 0 création** ;
- colonne requise absente → 400 **sans qu'aucun rapport ne soit créé** ; octet NUL dans une cellule → 201 avec rapport ; champ démesuré → 400 en français ;
- profils importés **absents de l'annuaire public** (consentement à `False` par défaut) ;
- **suspension : `auth/me/` passe de 200 à 401** ; inviter un profil suspendu sans compte → 400 ; un jeton émis avant la suspension devient inerte, avec le message neutre qui ne révèle pas la suspension ;
- pages publiques en 200 ; **les cinq routes protégées (`/admin`, ses trois sous-pages et `/espace`) répondent 307** sans session.

**Non vérifié** : l'interaction navigateur réelle (clics, navigation clavier, rendu visuel, lecteur d'écran). Le parcours ci-dessus valide le système et le rendu serveur, pas l'ergonomie ni l'accessibilité vécue — cela reste à la recette du porteur.

## Points reportés

**Nés de la vague de correction, arbitrés et consignés :**

- **Approbation d'une demande correspondant à un profil non actif ou déjà pourvu d'un compte** : renvoie 200 et envoie un mail d'approbation portant un lien **mort**. Aucun accès n'est ouvert — les gardes tiennent — mais ce chemin contourne les contrôles que l'action `inviter` applique désormais. *Mérite un ticket nommé.*
- **`imports.py` : le `bulk_create` de repli du rapport n'est pas protégé** et ne fonctionne que grâce à l'autocommit. Activer `ATOMIC_REQUESTS` au durcissement production (Sprint 3) transformerait un refus `jsonb` en `TransactionManagementError` non traduite, **dans le `finally` censé garantir le rapport**. *Dépendance directe du durcissement prod.*
- `models.py` : la docstring d'une normalisation affirme un ordre faux (`full_clean` lance `clean_fields` avant `clean`) ; inatteignable aujourd'hui, correction de commentaire.
- `ImportReportCard` : « les N lignes ont été appliquées » compte les lignes inchangées comme appliquées — imprécis, pas faux.
- Préexistant, hors périmètre : `claim_invitation` cherche le compte en `exact` alors que `BaseUserManager.normalize_email` ne met en minuscules que le domaine.

**Hors périmètre de la slice, comme prévu à la spec :** photo de profil et socle média · écran d'édition de son profil (l'API `PATCH /moi/` est livrée et testée) · mot de passe oublié (le socle de jeton signé est posé) · suppression dure et anonymisation RGPD · API Transition réelle · export CSV de l'annuaire.

**Dette de plateforme identifiée, à ouvrir en tickets :** `next lint` n'a jamais été configuré (la branche n'a aucun garde-fou de style JS/TS automatisé ; `tsc --noEmit` n'est pas un linter) · pas de live region sur le paragraphe d'erreur de `Field`, ce qui touche tous les formulaires du produit (WCAG 4.1.3) · pas de debounce sur la recherche d'administration, qui lance un `ILIKE` sur cinq colonnes à chaque frappe — acceptable au volume actuel, à traiter avant que la base grossisse.

## Definition of Done — atteinte

- [x] App `apps/alumni` avec `models / serializers / views / permissions / services / imports / urls` et ses migrations.
- [x] `apps/common/permissions.py` livré et réutilisable par S9/S17.
- [x] Inscription publique, approbation, rejet motivé avec trace, emails envoyés.
- [x] Import idempotent, transactionnel, avec rapport persisté et lignes en erreur consultables.
- [x] Flux d'invitation : jeton signé, usage unique, création du compte et du rôle `Alumni`.
- [x] Annuaire à trois niveaux, filtres et recherche multicritères.
- [x] Cycle de vie du membre, avec effet vérifié sur la connexion.
- [x] Permissions appliquées côté backend sur tous les endpoints, couvertes par des tests.
- [x] Endpoints documentés dans OpenAPI (18 chemins alumni) ; `schema.d.ts` régénéré et désormais **consommé**.
- [x] Pages publiques, back-office et espace alumni livrés ; entrées de navigation activées.
- [x] Les six portes de vérification sont propres.
- [x] CR de slice rédigé.

## Prochaine étape

Ouvrir une PR par dépôt (`feat/s7-alumni` → `main`), en se référençant mutuellement. **Ordre de fusion : `api` d'abord** (le frontend en dépend pour le schéma), puis `frontend`, puis `workspace`. S9 (Opportunités) et S17 (Messaging/Stats) peuvent démarrer dès le merge de `api` : les filtres de `admin/profils/` **sont** leur API de ciblage.
