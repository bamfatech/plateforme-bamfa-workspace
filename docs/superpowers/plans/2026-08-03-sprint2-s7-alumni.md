# Plan d'implémentation — S7 Alumni

> **Auteur** : Mathias KINNINKPO
> **Pour les agents** : SOUS-SKILL REQUISE — utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).
> **Spec** : [../specs/2026-08-03-sprint2-s7-alumni-design.md](../specs/2026-08-03-sprint2-s7-alumni-design.md)

**Objectif** : livrer la base alumni de BAMFA — inscription publique validée par l'administration, import de fichier idempotent, récupération d'accès par lien signé, et annuaire à trois niveaux de visibilité.

**Architecture** : une app Django `apps/alumni` où la *demande* (`AlumniRegistration`) est découplée du *membre* (`AlumniProfile`, dont le `user` est nullable). Les deux portes d'entrée — inscription et import — convergent vers un unique flux d'invitation par jeton signé sans état. Le frontend Next.js ajoute trois pages publiques, trois écrans de back-office et une page d'espace alumni minimale.

**Stack** : Django 5.2 · DRF 3.15 · drf-spectacular · django-filter 24 · Celery (eager en tests) · PostgreSQL · Next.js 15 · React 19 · TypeScript · TanStack Query 5 · Vitest + Testing Library · Tailwind 4.

---

## Contraintes globales

Ces règles s'appliquent à **toutes** les tâches, sans être répétées.

- **Trois dépôts git indépendants.** `plateforme-bamfa-api/` et `plateforme-bamfa-frontend/` ont leur propre `.git` et sont ignorés par le workspace. **Ne jamais lancer `git add -A` depuis la racine du workspace.** Chaque commit se fait depuis le dépôt concerné.
- **Branche** : `feat/s7-alumni`, déjà créée dans les trois dépôts. Ne jamais commiter sur `main`.
- **Messages de commit en français**, format `type: résumé court` (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`). **Ne jamais mentionner Claude, l'IA ou un assistant** — pas de `Co-Authored-By`, pas de « Generated with ».
- **Langue du produit : français.** Libellés d'interface, messages d'erreur, `verbose_name`, contenus d'email, noms de tests. Les *noms de champs de modèle* restent en anglais (`first_name`, `created_at`) — convention du dépôt — avec un `verbose_name` français.
- **TDD strict** : test qui échoue → implémentation minimale → test qui passe → refactor → commit. Ne jamais écrire l'implémentation avant d'avoir vu le test échouer.
- **Tests backend centralisés** dans `plateforme-bamfa-api/tests/`. `pytest.ini` définit `testpaths = tests` : **un répertoire `apps/alumni/tests/` ne serait pas collecté.**
- **Tests frontend colocalisés** : `Composant.test.tsx` à côté de `Composant.tsx`.
- **Permissions obligatoires sur chaque vue.** `DEFAULT_PERMISSION_CLASSES` n'est pas défini dans les réglages, donc le défaut DRF est `AllowAny`. Toute vue doit déclarer `permission_classes` explicitement.
- **API sous `/api/v1/`**, documentée via drf-spectacular (`@extend_schema` sur toute action personnalisée, tag `alumni`).
- **Migrations obligatoires** : `python manage.py makemigrations --check --dry-run` doit rester propre.
- **Noms des paramètres de filtre en français** : `statut`, `promotion`, `secteur`, `pays`, `consentement`, `a_un_compte`, `search`, `ordering`, `page`, `page_size`.

### Commandes de référence

Depuis `plateforme-bamfa-api/` :

```bash
.venv/bin/pytest -q                                    # suite complète
.venv/bin/pytest tests/test_alumni_models.py -v         # un fichier
.venv/bin/ruff check .                                  # lint
.venv/bin/python manage.py makemigrations --check --dry-run
```

Depuis `plateforme-bamfa-frontend/` :

```bash
npm run test                    # Vitest
npm run test -- Composant       # un fichier
npm run build                   # build Next.js
npm run generate:api            # régénère lib/api/schema.d.ts (backend doit tourner)
```

Depuis le workspace :

```bash
docker compose up -d db redis   # PostgreSQL + Redis requis par pytest
```

### Base de départ vérifiée le 2026-08-03

`pytest` : **34 passed** · `ruff check .` : propre · `makemigrations --check` : propre · `npm run test` : **54 tests / 23 fichiers** verts.

> **Attention** : le venv du backend était périmé (il manquait `celery` et `django-filter`, ajoutés en S5). Il a été remis à niveau par `.venv/bin/pip install -r requirements/dev.txt`. Si `pytest` échoue avec `ModuleNotFoundError`, relancer cette commande.

---

## Structure de fichiers

### Backend — `plateforme-bamfa-api/`

| Fichier | Responsabilité |
|---|---|
| `apps/common/permissions.py` | **Créé.** `HasAnyRole` et ses trois classes concrètes — socle partagé avec S9/S17 |
| `apps/alumni/__init__.py`, `apps.py` | Déclaration de l'app |
| `apps/alumni/models.py` | `AlumniFieldsMixin`, `AlumniProfile` (+ queryset), `AlumniRegistration`, `AlumniImport`, `AlumniImportError`, énumérations, `normalize_email` |
| `apps/alumni/serializers.py` | Sérialiseurs des trois niveaux de visibilité, de la demande, de l'invitation et du rapport d'import |
| `apps/alumni/permissions.py` | Permissions propres à la slice, dérivées du socle |
| `apps/alumni/services.py` | Approbation, rejet, jeton d'invitation, activation, cycle de vie du membre |
| `apps/alumni/imports.py` | `parse_csv` (adaptateur) et `import_alumni` (cœur neutre vis-à-vis de la source) |
| `apps/alumni/filters.py` | `FilterSet` de l'annuaire public, de l'annuaire d'administration et des demandes |
| `apps/alumni/views.py` | Vues publiques, vues d'administration, vue « moi » |
| `apps/alumni/urls.py` | Routeur DRF de la slice |
| `apps/alumni/templates/emails/*.txt` | Les quatre gabarits d'email |
| `apps/alumni/migrations/0001_initial.py` | Migration initiale |
| `tests/test_permissions.py` | **Créé.** Socle de permissions |
| `tests/test_alumni_*.py` | 8 fichiers de tests de la slice |

### Frontend — `plateforme-bamfa-frontend/`

| Fichier | Responsabilité |
|---|---|
| `components/ui/{Table,Pagination,Select,Textarea,Modal}.tsx` | **Créés.** Primitives partagées avec S6 |
| `lib/alumni/types.ts` | Types de la slice |
| `lib/alumni/params.ts` | `cleanParams` — retire les filtres vides avant l'appel |
| `lib/alumni/{useDirectory,useRegistrations,useProfiles,useImports}.ts` | Hooks TanStack Query |
| `components/alumni/RegistrationForm.tsx` | Formulaire public d'inscription |
| `components/alumni/{DirectoryCard,DirectoryFilters}.tsx` | Annuaire public |
| `components/alumni/ActivationForm.tsx` | Définition du mot de passe |
| `components/admin/alumni/{ProfilesTable,RegistrationsTable,ImportForm,ImportReport}.tsx` | Back-office |
| `app/(public)/alumni/page.tsx` | Annuaire public |
| `app/(public)/alumni/inscription/page.tsx` | Inscription |
| `app/(public)/alumni/activation/page.tsx` | Activation par jeton |
| `app/(admin)/admin/alumni/page.tsx` | Profils |
| `app/(admin)/admin/alumni/inscriptions/page.tsx` | File d'attente |
| `app/(admin)/admin/alumni/imports/page.tsx` | Import et rapports |
| `app/(alumni)/layout.tsx`, `app/(alumni)/espace/page.tsx` | Espace alumni minimal |

---

## Tâche 1 : Socle de permissions partagé

**Fichiers**
- Créer : `plateforme-bamfa-api/apps/common/permissions.py`
- Test : `plateforme-bamfa-api/tests/test_permissions.py`

**Interfaces**
- Consomme : `apps.accounts.roles.user_has_role(user, name)` (existant).
- Produit : `HasAnyRole` (attribut de classe `roles: tuple[str, ...]`), `IsAdministrateur`, `IsAdministrateurOrSecretaire`, `IsAlumni`. Toutes utilisables dans `permission_classes`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_permissions.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from rest_framework.test import APIRequestFactory

from apps.accounts.roles import create_roles
from apps.common.permissions import (
    HasAnyRole,
    IsAdministrateur,
    IsAdministrateurOrSecretaire,
    IsAlumni,
)

User = get_user_model()


def _request(user):
    request = APIRequestFactory().get("/")
    request.user = user
    return request


@pytest.mark.django_db
def test_role_present_accorde_l_acces():
    create_roles()
    user = User.objects.create_user(email="a@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name="Administrateur"))
    assert IsAdministrateur().has_permission(_request(user), None) is True


@pytest.mark.django_db
def test_role_absent_refuse_l_acces():
    create_roles()
    user = User.objects.create_user(email="b@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name="Alumni"))
    assert IsAdministrateur().has_permission(_request(user), None) is False


@pytest.mark.django_db
def test_superutilisateur_passe_outre_les_groupes():
    user = User.objects.create_superuser(email="root@bamfa.org", password="x")
    assert IsAdministrateur().has_permission(_request(user), None) is True
    assert IsAlumni().has_permission(_request(user), None) is True


def test_utilisateur_anonyme_refuse():
    assert IsAdministrateur().has_permission(_request(AnonymousUser()), None) is False


@pytest.mark.django_db
def test_plusieurs_roles_acceptes():
    create_roles()
    user = User.objects.create_user(email="c@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name="Secrétaire"))
    assert IsAdministrateurOrSecretaire().has_permission(_request(user), None) is True
    assert IsAdministrateur().has_permission(_request(user), None) is False


def test_has_any_role_sans_roles_declares_refuse_tout():
    class Aucun(HasAnyRole):
        roles = ()

    assert Aucun().has_permission(_request(AnonymousUser()), None) is False
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_permissions.py -q`
Attendu : ÉCHEC — `ModuleNotFoundError: No module named 'apps.common.permissions'`

- [ ] **Étape 3 : écrire l'implémentation minimale**

Créer `apps/common/permissions.py` :

```python
from rest_framework.permissions import BasePermission

from apps.accounts.roles import user_has_role


class HasAnyRole(BasePermission):
    """Accorde l'accès aux super-utilisateurs et aux membres de l'un des groupes listés.

    Le passe-droit super-utilisateur est volontaire : l'administrateur de
    démonstration est superutilisateur, et le frontend traite déjà
    `is_superuser` comme équivalent au rôle « Administrateur ».
    """

    roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return any(user_has_role(user, role) for role in self.roles)


class IsAdministrateur(HasAnyRole):
    roles = ("Administrateur",)


class IsAdministrateurOrSecretaire(HasAnyRole):
    roles = ("Administrateur", "Secrétaire")


class IsAlumni(HasAnyRole):
    roles = ("Alumni",)
```

- [ ] **Étape 4 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_permissions.py -q`
Attendu : 6 passed

- [ ] **Étape 5 : lint et commit**

```bash
cd plateforme-bamfa-api
.venv/bin/ruff check .
git add apps/common/permissions.py tests/test_permissions.py
git commit -m "feat: socle de permissions DRF par role (HasAnyRole)"
```

---

## Tâche 2 : App `alumni` — modèles et migration

**Fichiers**
- Créer : `apps/alumni/__init__.py`, `apps/alumni/apps.py`, `apps/alumni/models.py`, `apps/alumni/migrations/__init__.py`
- Modifier : `config/settings/base.py:15-31` (`INSTALLED_APPS`)
- Test : `tests/test_alumni_models.py`

**Interfaces**
- Consomme : `settings.AUTH_USER_MODEL`, `accounts.Mandate`.
- Produit : `normalize_email(value) -> str` · `DEFAULT_COUNTRY` · `PROMOTION_MIN` · `promotion_max() -> int` · `Sector`, `Gender` (`TextChoices`) · `AlumniFieldsMixin` (abstrait) · `AlumniProfile` (`Status.ACTIF/SUSPENDU/ARCHIVE`, `Source.INSCRIPTION/IMPORT`, propriété `completeness: int`, `objects.in_directory()`) · `AlumniRegistration` (`Status.EN_ATTENTE/APPROUVEE/REJETEE`) · `AlumniImport` · `AlumniImportError`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_models.py` :

```python
import pytest
from django.db import IntegrityError, transaction

from apps.alumni.models import (
    DEFAULT_COUNTRY,
    AlumniProfile,
    AlumniRegistration,
    normalize_email,
)


def _profil(**kwargs):
    valeurs = {
        "first_name": "Awa",
        "last_name": "Doe",
        "email": "awa@example.org",
        "promotion": 2018,
    }
    valeurs.update(kwargs)
    return AlumniProfile.objects.create(**valeurs)


def _demande(**kwargs):
    valeurs = {
        "first_name": "Kofi",
        "last_name": "Mensah",
        "email": "kofi@example.org",
        "promotion": 2019,
    }
    valeurs.update(kwargs)
    return AlumniRegistration.objects.create(**valeurs)


def test_normalize_email_met_en_minuscules_et_retire_les_espaces():
    assert normalize_email("  Awa.DOE@Example.ORG ") == "awa.doe@example.org"
    assert normalize_email(None) == ""


@pytest.mark.django_db
def test_le_profil_normalise_son_email_a_l_enregistrement():
    profil = _profil(email="  AWA@Example.ORG ")
    profil.refresh_from_db()
    assert profil.email == "awa@example.org"


@pytest.mark.django_db
def test_la_demande_normalise_son_email_a_l_enregistrement():
    demande = _demande(email="KOFI@Example.ORG")
    demande.refresh_from_db()
    assert demande.email == "kofi@example.org"


@pytest.mark.django_db
def test_le_pays_par_defaut_est_le_benin():
    assert _profil().country == DEFAULT_COUNTRY


@pytest.mark.django_db
def test_un_pays_vide_retombe_sur_la_valeur_par_defaut():
    profil = _profil(country="   ")
    profil.refresh_from_db()
    assert profil.country == DEFAULT_COUNTRY


@pytest.mark.django_db
def test_deux_demandes_en_attente_pour_le_meme_email_sont_refusees():
    _demande()
    with pytest.raises(IntegrityError), transaction.atomic():
        _demande()


@pytest.mark.django_db
def test_une_nouvelle_demande_est_possible_apres_un_rejet():
    demande = _demande()
    demande.status = AlumniRegistration.Status.REJETEE
    demande.save()
    assert _demande().pk is not None


@pytest.mark.django_db
def test_completude_nulle_quand_aucun_champ_optionnel_n_est_rempli():
    assert _profil().completeness == 0


@pytest.mark.django_db
def test_completude_totale_quand_tous_les_champs_optionnels_sont_remplis():
    profil = _profil(
        phone="+229 90 00 00 00",
        city="Cotonou",
        university="UAC",
        mcf_program="Scholars",
        sector="numerique",
        current_position="Développeuse",
        organization="BAMFA",
        bio="Courte bio.",
        linkedin_url="https://linkedin.com/in/awa",
        birth_date="1995-04-12",
        gender="femme",
    )
    assert profil.completeness == 100


@pytest.mark.django_db
def test_l_annuaire_ne_retient_que_les_profils_actifs_et_consentants():
    visible = _profil(email="visible@example.org", directory_consent=True)
    _profil(email="sans-consentement@example.org", directory_consent=False)
    _profil(
        email="suspendu@example.org",
        directory_consent=True,
        status=AlumniProfile.Status.SUSPENDU,
    )
    _profil(
        email="archive@example.org",
        directory_consent=True,
        status=AlumniProfile.Status.ARCHIVE,
    )

    assert list(AlumniProfile.objects.in_directory()) == [visible]


@pytest.mark.django_db
def test_un_profil_existe_sans_compte():
    assert _profil().user is None
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_models.py -q`
Attendu : ÉCHEC — `ModuleNotFoundError: No module named 'apps.alumni'`

- [ ] **Étape 3 : créer l'app et les modèles**

Créer `apps/alumni/__init__.py` (vide) et `apps/alumni/migrations/__init__.py` (vide).

Créer `apps/alumni/apps.py` :

```python
from django.apps import AppConfig


class AlumniConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.alumni"
    verbose_name = "Alumni"
```

Créer `apps/alumni/models.py` :

```python
from datetime import date

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

DEFAULT_COUNTRY = "Bénin"
PROMOTION_MIN = 2010


def promotion_max():
    """Borne haute de la promotion. Fonction (et non constante) pour rester
    juste au fil des années sans nouvelle migration de validateur."""
    return date.today().year + 1


def normalize_email(value):
    """Minuscules + espaces retirés.

    `UserManager.normalize_email` de Django ne met en minuscules que le
    domaine : cette normalisation-ci porte sur l'adresse entière, ce qui rend
    les contraintes d'unicité effectivement insensibles à la casse.
    """
    return (value or "").strip().lower()


class Sector(models.TextChoices):
    AGRICULTURE = "agriculture", "Agriculture et agro-industrie"
    SANTE = "sante", "Santé"
    EDUCATION = "education", "Éducation et formation"
    NUMERIQUE = "numerique", "Technologies et numérique"
    FINANCE = "finance", "Finance et assurance"
    ENTREPRENEURIAT = "entrepreneuriat", "Entrepreneuriat et PME"
    ENERGIE = "energie", "Énergie et environnement"
    INDUSTRIE = "industrie", "Industrie et BTP"
    COMMERCE = "commerce", "Commerce et distribution"
    TRANSPORT = "transport", "Transport et logistique"
    PUBLIC = "public", "Administration publique"
    ONG = "ong", "Société civile et ONG"
    CULTURE = "culture", "Arts, culture et médias"
    RECHERCHE = "recherche", "Recherche"
    AUTRE = "autre", "Autre"


class Gender(models.TextChoices):
    FEMME = "femme", "Femme"
    HOMME = "homme", "Homme"
    AUTRE = "autre", "Autre"
    NON_PRECISE = "non_precise", "Non précisé"


class AlumniFieldsMixin(models.Model):
    """Champs de personne partagés par la demande et le profil."""

    first_name = models.CharField("prénom", max_length=150)
    last_name = models.CharField("nom", max_length=150)
    email = models.EmailField("adresse e-mail")
    promotion = models.PositiveSmallIntegerField(
        "promotion",
        validators=[MinValueValidator(PROMOTION_MIN), MaxValueValidator(promotion_max)],
    )
    country = models.CharField("pays", max_length=100, default=DEFAULT_COUNTRY)
    phone = models.CharField("téléphone", max_length=30, blank=True)
    city = models.CharField("ville", max_length=100, blank=True)
    university = models.CharField("université", max_length=200, blank=True)
    mcf_program = models.CharField("programme MCF", max_length=200, blank=True)
    sector = models.CharField(
        "secteur d'activité", max_length=50, choices=Sector.choices, blank=True
    )
    current_position = models.CharField("poste actuel", max_length=200, blank=True)
    organization = models.CharField("organisation", max_length=200, blank=True)
    bio = models.TextField("biographie", blank=True)
    linkedin_url = models.URLField("profil LinkedIn", blank=True)
    birth_date = models.DateField("date de naissance", null=True, blank=True)
    gender = models.CharField("genre", max_length=20, choices=Gender.choices, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.email = normalize_email(self.email)
        self.country = (self.country or "").strip() or DEFAULT_COUNTRY
        super().save(*args, **kwargs)


class AlumniProfileQuerySet(models.QuerySet):
    def in_directory(self):
        """Point d'entrée unique de tous les annuaires non-administratifs.

        La règle de visibilité est écrite ici et nulle part ailleurs : aucune
        vue ne peut oublier un filtre.
        """
        return self.filter(
            status=AlumniProfile.Status.ACTIF, directory_consent=True
        )


class AlumniProfile(AlumniFieldsMixin):
    """Un membre reconnu par BAMFA. Peut exister sans compte de connexion."""

    class Status(models.TextChoices):
        ACTIF = "actif", "Actif"
        SUSPENDU = "suspendu", "Suspendu"
        ARCHIVE = "archive", "Archivé"

    class Source(models.TextChoices):
        INSCRIPTION = "inscription", "Inscription en ligne"
        IMPORT = "import", "Import"

    OPTIONAL_FIELDS = (
        "phone",
        "city",
        "university",
        "mcf_program",
        "sector",
        "current_position",
        "organization",
        "bio",
        "linkedin_url",
        "birth_date",
        "gender",
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        verbose_name="compte",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="alumni_profile",
    )
    email = models.EmailField("adresse e-mail", unique=True)
    directory_consent = models.BooleanField(
        "publication dans l'annuaire", default=False
    )
    status = models.CharField(
        "statut", max_length=10, choices=Status.choices, default=Status.ACTIF
    )
    mandate = models.ForeignKey(
        "accounts.Mandate",
        verbose_name="mandat",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="alumni_profiles",
    )
    source = models.CharField(
        "origine", max_length=15, choices=Source.choices, default=Source.INSCRIPTION
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    objects = AlumniProfileQuerySet.as_manager()

    class Meta:
        verbose_name = "profil alumni"
        verbose_name_plural = "profils alumni"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def completeness(self):
        """Pourcentage de champs optionnels renseignés.

        Les champs obligatoires sont exclus : toujours remplis, ils tireraient
        l'indicateur vers le haut sans rien dire de la richesse du profil.
        """
        rempli = sum(1 for champ in self.OPTIONAL_FIELDS if getattr(self, champ))
        return round(rempli * 100 / len(self.OPTIONAL_FIELDS))

    @property
    def has_account(self):
        return self.user_id is not None


class AlumniRegistration(AlumniFieldsMixin):
    """Une candidature soumise depuis le site public."""

    class Status(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        APPROUVEE = "approuvee", "Approuvée"
        REJETEE = "rejetee", "Rejetée"

    directory_consent = models.BooleanField(
        "publication dans l'annuaire", default=False
    )
    status = models.CharField(
        "statut", max_length=12, choices=Status.choices, default=Status.EN_ATTENTE
    )
    submitted_at = models.DateTimeField("soumise le", auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="instruite par",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="alumni_reviews",
    )
    reviewed_at = models.DateTimeField("instruite le", null=True, blank=True)
    rejection_reason = models.TextField("motif du rejet", blank=True)
    profile = models.ForeignKey(
        AlumniProfile,
        verbose_name="profil créé",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="registrations",
    )

    class Meta:
        verbose_name = "demande d'inscription alumni"
        verbose_name_plural = "demandes d'inscription alumni"
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["email"],
                condition=Q(status="en_attente"),
                name="unique_demande_en_attente_par_email",
            )
        ]

    def __str__(self):
        return f"{self.email} ({self.get_status_display()})"


class AlumniImport(models.Model):
    """Rapport d'un import. Créé même quand rien n'a été importé."""

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="importé par",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="alumni_imports",
    )
    filename = models.CharField("nom du fichier", max_length=255, blank=True)
    strict = models.BooleanField("mode strict", default=False)
    created_at = models.DateTimeField("importé le", auto_now_add=True)
    rows_total = models.PositiveIntegerField("lignes lues", default=0)
    rows_created = models.PositiveIntegerField("profils créés", default=0)
    rows_updated = models.PositiveIntegerField("profils mis à jour", default=0)
    rows_skipped = models.PositiveIntegerField("lignes sans changement", default=0)
    rows_failed = models.PositiveIntegerField("lignes en erreur", default=0)

    class Meta:
        verbose_name = "import alumni"
        verbose_name_plural = "imports alumni"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.filename or 'import'} — {self.rows_total} ligne(s)"


class AlumniImportError(models.Model):
    """Une ligne du rapport d'import : erreur bloquante ou avertissement."""

    import_run = models.ForeignKey(
        AlumniImport,
        verbose_name="import",
        on_delete=models.CASCADE,
        related_name="errors",
    )
    line_number = models.PositiveIntegerField("ligne")
    raw_row = models.JSONField("ligne brute", default=dict)
    message = models.TextField("message")

    class Meta:
        verbose_name = "ligne en erreur"
        verbose_name_plural = "lignes en erreur"
        ordering = ["line_number"]

    def __str__(self):
        return f"ligne {self.line_number} : {self.message}"
```

- [ ] **Étape 4 : déclarer l'app**

Dans `config/settings/base.py`, ajouter `"apps.alumni",` à la fin de `INSTALLED_APPS` (après `"apps.payments",`) :

```python
    "apps.common",
    "apps.accounts",
    "apps.payments",
    "apps.alumni",
]
```

- [ ] **Étape 5 : générer la migration**

```bash
.venv/bin/python manage.py makemigrations alumni
```

Attendu : création de `apps/alumni/migrations/0001_initial.py` avec les 4 modèles concrets.

- [ ] **Étape 6 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_models.py -q`
Attendu : 11 passed

- [ ] **Étape 7 : vérifier l'ensemble et commiter**

```bash
.venv/bin/pytest -q                                        # 34 + 6 + 11 = 51 passed
.venv/bin/ruff check .
.venv/bin/python manage.py makemigrations --check --dry-run # No changes detected
git add apps/alumni config/settings/base.py tests/test_alumni_models.py
git commit -m "feat: modeles alumni (demande, profil, rapport d'import) + migration"
```

---

## Tâche 3 : Inscription publique

**Fichiers**
- Créer : `apps/alumni/serializers.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`, `apps/alumni/templates/emails/alumni_demande_recue.txt`
- Créer : `apps/alumni/services.py`
- Modifier : `config/urls.py:5-15`
- Test : `tests/test_alumni_registration_api.py`

**Interfaces**
- Consomme : `AlumniRegistration`, `AlumniProfile`, `normalize_email` (tâche 2) · `apps.common.tasks.send_templated_email_task` (existant).
- Produit : `AlumniRegistrationCreateSerializer` · `services.acknowledge_registration(registration) -> None` · `POST /api/v1/alumni/inscriptions/` · le routeur `apps.alumni.urls.urlpatterns`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_registration_api.py` :

```python
import pytest
from rest_framework.test import APIClient

from apps.alumni.models import AlumniProfile, AlumniRegistration

URL = "/api/v1/alumni/inscriptions/"

CHARGE = {
    "first_name": "Awa",
    "last_name": "Doe",
    "email": "Awa.DOE@Example.org",
    "promotion": 2018,
    "country": "Bénin",
    "directory_consent": True,
}


@pytest.mark.django_db
def test_une_soumission_valide_cree_une_demande_en_attente():
    response = APIClient().post(URL, CHARGE, format="json")

    assert response.status_code == 201
    demande = AlumniRegistration.objects.get()
    assert demande.status == AlumniRegistration.Status.EN_ATTENTE
    assert demande.email == "awa.doe@example.org"
    assert demande.directory_consent is True


@pytest.mark.django_db
def test_la_soumission_ne_cree_ni_compte_ni_profil():
    APIClient().post(URL, CHARGE, format="json")

    assert AlumniProfile.objects.count() == 0


@pytest.mark.django_db
def test_un_accuse_de_reception_est_envoye(mailoutbox):
    APIClient().post(URL, CHARGE, format="json")

    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["awa.doe@example.org"]
    assert "Awa" in mailoutbox[0].body


@pytest.mark.django_db
@pytest.mark.parametrize(
    "champ", ["first_name", "last_name", "email", "promotion"]
)
def test_les_champs_obligatoires_sont_exiges(champ):
    charge = {k: v for k, v in CHARGE.items() if k != champ}
    response = APIClient().post(URL, charge, format="json")

    assert response.status_code == 400
    assert champ in response.data["error"]["details"]


@pytest.mark.django_db
def test_une_promotion_hors_bornes_est_refusee():
    response = APIClient().post(URL, {**CHARGE, "promotion": 1990}, format="json")

    assert response.status_code == 400
    assert "promotion" in response.data["error"]["details"]


@pytest.mark.django_db
def test_une_seconde_demande_en_attente_est_refusee_par_un_message_neutre():
    client = APIClient()
    client.post(URL, CHARGE, format="json")
    response = client.post(URL, CHARGE, format="json")

    assert response.status_code == 400
    assert response.data["error"]["details"]["email"] == [
        "Une demande est déjà enregistrée pour cette adresse e-mail."
    ]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "statut",
    [
        AlumniProfile.Status.ACTIF,
        AlumniProfile.Status.SUSPENDU,
        AlumniProfile.Status.ARCHIVE,
    ],
)
def test_un_profil_existant_bloque_la_demande_par_le_meme_message(statut):
    AlumniProfile.objects.create(
        first_name="Awa",
        last_name="Doe",
        email="awa.doe@example.org",
        promotion=2018,
        status=statut,
    )

    response = APIClient().post(URL, CHARGE, format="json")

    assert response.status_code == 400
    assert response.data["error"]["details"]["email"] == [
        "Une demande est déjà enregistrée pour cette adresse e-mail."
    ]


@pytest.mark.django_db
def test_une_nouvelle_demande_est_acceptee_apres_un_rejet():
    client = APIClient()
    client.post(URL, CHARGE, format="json")
    demande = AlumniRegistration.objects.get()
    demande.status = AlumniRegistration.Status.REJETEE
    demande.save()

    assert client.post(URL, CHARGE, format="json").status_code == 201


@pytest.mark.django_db
def test_le_statut_n_est_pas_pilotable_par_le_client():
    APIClient().post(
        URL, {**CHARGE, "status": "approuvee"}, format="json"
    )

    assert (
        AlumniRegistration.objects.get().status
        == AlumniRegistration.Status.EN_ATTENTE
    )
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_registration_api.py -q`
Attendu : ÉCHEC — 404 sur l'URL (la route n'existe pas).

- [ ] **Étape 3 : écrire le sérialiseur**

Créer `apps/alumni/serializers.py` :

```python
from rest_framework import serializers

from .models import AlumniProfile, AlumniRegistration, normalize_email

DOUBLON_MESSAGE = "Une demande est déjà enregistrée pour cette adresse e-mail."


class AlumniRegistrationCreateSerializer(serializers.ModelSerializer):
    """Soumission publique. Aucun champ d'instruction n'est exposé."""

    class Meta:
        model = AlumniRegistration
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "promotion",
            "country",
            "phone",
            "city",
            "university",
            "mcf_program",
            "sector",
            "current_position",
            "organization",
            "bio",
            "linkedin_url",
            "birth_date",
            "gender",
            "directory_consent",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        """Message unique pour « déjà membre » et « demande en cours ».

        Ne pas distinguer les deux cas évite d'énumérer les membres.
        """
        email = normalize_email(value)
        deja_membre = AlumniProfile.objects.filter(email=email).exists()
        deja_demande = AlumniRegistration.objects.filter(
            email=email, status=AlumniRegistration.Status.EN_ATTENTE
        ).exists()
        if deja_membre or deja_demande:
            raise serializers.ValidationError(DOUBLON_MESSAGE)
        return email
```

- [ ] **Étape 4 : écrire le service d'accusé de réception**

Créer `apps/alumni/services.py` :

```python
from apps.common.tasks import send_templated_email_task


def acknowledge_registration(registration):
    """Accusé de réception au demandeur."""
    send_templated_email_task.delay(
        "Votre demande d'inscription à BAMFA",
        "alumni_demande_recue",
        {"prenom": registration.first_name},
        registration.email,
    )
```

- [ ] **Étape 5 : écrire le gabarit d'email**

Créer `apps/alumni/templates/emails/alumni_demande_recue.txt` :

```
Bonjour {{ prenom }},

Nous avons bien reçu votre demande d'inscription à la Benin Association of
the Mastercard Foundation Alumni (BAMFA).

Notre équipe va l'examiner. Vous recevrez un e-mail dès qu'une décision
sera prise.

Merci de votre intérêt pour BAMFA.

L'équipe BAMFA
```

- [ ] **Étape 6 : écrire la vue et le routage**

Créer `apps/alumni/views.py` :

```python
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from . import services
from .serializers import AlumniRegistrationCreateSerializer


@extend_schema(tags=["alumni"])
class RegistrationCreateView(generics.CreateAPIView):
    """Soumission publique d'une demande d'inscription alumni."""

    serializer_class = AlumniRegistrationCreateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def perform_create(self, serializer):
        registration = serializer.save()
        services.acknowledge_registration(registration)
```

Créer `apps/alumni/urls.py` :

```python
from django.urls import path

from .views import RegistrationCreateView

urlpatterns = [
    path(
        "inscriptions/",
        RegistrationCreateView.as_view(),
        name="alumni-inscription-create",
    ),
]
```

Dans `config/urls.py`, ajouter la ligne avant l'include de `apps.common.urls` :

```python
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/alumni/", include("apps.alumni.urls")),
    path("api/v1/", include("apps.common.urls")),
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_registration_api.py -q`
Attendu : 14 passed (les deux tests paramétrés comptent pour 4 et 3)

- [ ] **Étape 8 : lint et commit**

```bash
.venv/bin/ruff check .
git add apps/alumni config/urls.py tests/test_alumni_registration_api.py
git commit -m "feat: inscription alumni publique (demande en attente + accuse de reception)"
```

---

## Tâche 4 : Invitation — jeton signé et activation du compte

**Fichiers**
- Modifier : `apps/alumni/services.py`, `apps/alumni/serializers.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Créer : `apps/alumni/templates/emails/alumni_invitation.txt`
- Modifier : `config/settings/base.py` (ajout de `FRONTEND_BASE_URL`)
- Test : `tests/test_alumni_invitation.py`

**Interfaces**
- Consomme : `AlumniProfile` (tâche 2) · `django.core.signing`.
- Produit : `INVITATION_SALT`, `INVITATION_MAX_AGE` · `build_invitation_token(profile) -> str` · `resolve_invitation_token(token) -> AlumniProfile` (lève `InvitationExpired` / `InvitationInvalid` / `InvitationAlreadyUsed`) · `claim_invitation(profile, *, password) -> tuple[User, bool]` (le booléen vaut `True` si le compte a été créé, `False` s'il existait déjà et a été rattaché) · `send_invitation(profile, *, template="alumni_invitation", subject=...) -> None` · `POST /api/v1/alumni/invitation/verifier/` · `POST /api/v1/alumni/invitation/activer/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_invitation.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniProfile
from apps.alumni.services import (
    InvitationAlreadyUsed,
    InvitationExpired,
    InvitationInvalid,
    build_invitation_token,
    claim_invitation,
    resolve_invitation_token,
)

User = get_user_model()
VERIFIER = "/api/v1/alumni/invitation/verifier/"
ACTIVER = "/api/v1/alumni/invitation/activer/"
MOT_DE_PASSE = "un-mot-de-passe-solide-42"


@pytest.fixture
def profil(db):
    create_roles()
    return AlumniProfile.objects.create(
        first_name="Awa",
        last_name="Doe",
        email="awa@example.org",
        promotion=2018,
    )


def test_un_jeton_altere_est_invalide(profil):
    with pytest.raises(InvitationInvalid):
        resolve_invitation_token(build_invitation_token(profil) + "x")


def test_un_jeton_expire_est_detecte(profil, monkeypatch):
    monkeypatch.setattr("apps.alumni.services.INVITATION_MAX_AGE", -1)
    with pytest.raises(InvitationExpired):
        resolve_invitation_token(build_invitation_token(profil))


def test_un_jeton_valide_resout_le_profil(profil):
    assert resolve_invitation_token(build_invitation_token(profil)) == profil


def test_un_jeton_visant_un_profil_inexistant_est_invalide(db):
    jeton = signing.dumps({"profile_id": 999999}, salt="alumni-invitation")
    with pytest.raises(InvitationInvalid):
        resolve_invitation_token(jeton)


def test_le_jeton_devient_inerte_une_fois_le_compte_cree(profil):
    jeton = build_invitation_token(profil)
    claim_invitation(profil, password=MOT_DE_PASSE)

    with pytest.raises(InvitationAlreadyUsed):
        resolve_invitation_token(jeton)


def test_l_activation_cree_le_compte_et_le_role_alumni(profil):
    user, cree = claim_invitation(profil, password=MOT_DE_PASSE)

    profil.refresh_from_db()
    assert cree is True
    assert profil.user == user
    assert user.email == "awa@example.org"
    assert user.check_password(MOT_DE_PASSE) is True
    assert user.is_active is True
    assert list(user.groups.values_list("name", flat=True)) == ["Alumni"]


def test_un_compte_existant_est_rattache_sans_toucher_a_son_mot_de_passe(profil):
    """Le lien d'invitation ne doit jamais permettre de réécrire le mot de
    passe d'un compte déjà en place (un rédacteur, par exemple)."""
    existant = User.objects.create_user(
        email="awa@example.org", password="mot-de-passe-initial"
    )

    user, cree = claim_invitation(profil, password=MOT_DE_PASSE)

    profil.refresh_from_db()
    assert cree is False
    assert user == existant
    assert existant.check_password("mot-de-passe-initial") is True
    assert profil.user == existant


def test_endpoint_verifier_renvoie_l_identite(profil):
    jeton = build_invitation_token(profil)
    response = APIClient().post(VERIFIER, {"token": jeton}, format="json")

    assert response.status_code == 200
    assert response.data == {"first_name": "Awa", "email": "awa@example.org"}


def test_endpoint_verifier_refuse_un_jeton_invalide(profil):
    response = APIClient().post(VERIFIER, {"token": "n-importe-quoi"}, format="json")

    assert response.status_code == 400
    assert "invalide" in str(response.data["error"]["details"]).lower()


def test_endpoint_activer_cree_le_compte(profil):
    jeton = build_invitation_token(profil)
    response = APIClient().post(
        ACTIVER, {"token": jeton, "password": MOT_DE_PASSE}, format="json"
    )

    assert response.status_code == 200
    assert response.data["created"] is True
    profil.refresh_from_db()
    assert profil.user is not None


def test_endpoint_activer_refuse_un_rejeu(profil):
    jeton = build_invitation_token(profil)
    client = APIClient()
    client.post(ACTIVER, {"token": jeton, "password": MOT_DE_PASSE}, format="json")

    response = client.post(
        ACTIVER, {"token": jeton, "password": MOT_DE_PASSE}, format="json"
    )

    assert response.status_code == 400
    assert "déjà" in str(response.data["error"]["details"]).lower()


def test_endpoint_activer_applique_les_validateurs_de_mot_de_passe(profil):
    jeton = build_invitation_token(profil)
    response = APIClient().post(
        ACTIVER, {"token": jeton, "password": "123"}, format="json"
    )

    assert response.status_code == 400
    assert "password" in response.data["error"]["details"]


def test_send_invitation_envoie_un_lien_vers_le_frontend(profil, mailoutbox, settings):
    settings.FRONTEND_BASE_URL = "https://bamfa.example"
    from apps.alumni.services import send_invitation

    send_invitation(profil)

    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["awa@example.org"]
    assert "https://bamfa.example/alumni/activation?token=" in mailoutbox[0].body
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_invitation.py -q`
Attendu : ÉCHEC — `ImportError: cannot import name 'build_invitation_token'`

- [ ] **Étape 3 : ajouter le réglage `FRONTEND_BASE_URL`**

Dans `config/settings/base.py`, après le bloc `CSRF_TRUSTED_ORIGINS` :

```python
# Base d'URL du frontend, pour construire les liens envoyés par email
# (activation d'accès alumni, et plus tard réinitialisation de mot de passe).
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
```

Ajouter aussi la variable à `.env.example` :

```
# Base d'URL du frontend (liens dans les emails)
FRONTEND_BASE_URL=http://localhost:3000
```

- [ ] **Étape 4 : implémenter les services d'invitation**

Remplacer le contenu de `apps/alumni/services.py` par :

```python
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import signing
from django.db import transaction

from apps.common.tasks import send_templated_email_task

from .models import AlumniProfile

INVITATION_SALT = "alumni-invitation"
INVITATION_MAX_AGE = 7 * 24 * 3600  # 7 jours
ALUMNI_GROUP = "Alumni"


class InvitationError(Exception):
    """Base des erreurs d'invitation."""


class InvitationInvalid(InvitationError):
    pass


class InvitationExpired(InvitationError):
    pass


class InvitationAlreadyUsed(InvitationError):
    pass


def acknowledge_registration(registration):
    """Accusé de réception au demandeur."""
    send_templated_email_task.delay(
        "Votre demande d'inscription à BAMFA",
        "alumni_demande_recue",
        {"prenom": registration.first_name},
        registration.email,
    )


def build_invitation_token(profile):
    return signing.dumps({"profile_id": profile.pk}, salt=INVITATION_SALT)


def resolve_invitation_token(token):
    """Renvoie le profil visé par un jeton d'invitation.

    L'usage unique n'est pas stocké : il découle de l'invariante
    `profile.user_id is None`. Une fois le compte créé, le jeton est inerte.
    """
    try:
        data = signing.loads(token, salt=INVITATION_SALT, max_age=INVITATION_MAX_AGE)
    except signing.SignatureExpired as exc:
        raise InvitationExpired("Ce lien d'invitation a expiré.") from exc
    except signing.BadSignature as exc:
        raise InvitationInvalid("Ce lien d'invitation est invalide.") from exc

    profile = AlumniProfile.objects.filter(pk=data.get("profile_id")).first()
    if profile is None:
        raise InvitationInvalid("Ce lien d'invitation est invalide.")
    if profile.user_id is not None:
        raise InvitationAlreadyUsed("Cet accès a déjà été activé.")
    return profile


@transaction.atomic
def claim_invitation(profile, *, password):
    """Crée le compte de connexion du profil, ou rattache un compte existant.

    Renvoie `(user, created)`. Si un compte porte déjà cette adresse, il est
    rattaché **sans** que son mot de passe soit modifié : l'invitation ne doit
    jamais servir à réécrire les identifiants d'un compte en place.
    """
    if profile.user_id is not None:
        raise InvitationAlreadyUsed("Cet accès a déjà été activé.")

    User = get_user_model()
    groupe = Group.objects.get(name=ALUMNI_GROUP)
    existant = User.objects.filter(email=profile.email).first()

    if existant is not None:
        user, created = existant, False
    else:
        user = User.objects.create_user(
            email=profile.email,
            password=password,
            first_name=profile.first_name,
            last_name=profile.last_name,
        )
        created = True

    user.groups.add(groupe)
    profile.user = user
    profile.save(update_fields=["user", "updated_at"])
    return user, created


def _invitation_url(profile):
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}/alumni/activation?token={build_invitation_token(profile)}"


def send_invitation(
    profile,
    *,
    template="alumni_invitation",
    subject="Activez votre accès à la plateforme BAMFA",
):
    send_templated_email_task.delay(
        subject,
        template,
        {"prenom": profile.first_name, "lien": _invitation_url(profile)},
        profile.email,
    )
```

- [ ] **Étape 5 : écrire le gabarit d'invitation**

Créer `apps/alumni/templates/emails/alumni_invitation.txt` :

```
Bonjour {{ prenom }},

Votre profil est enregistré dans l'annuaire de la Benin Association of the
Mastercard Foundation Alumni (BAMFA).

Pour accéder à la plateforme, définissez votre mot de passe en suivant ce
lien, valable 7 jours :

{{ lien }}

Vous pourrez ensuite compléter votre profil et choisir de figurer ou non
dans l'annuaire public.

L'équipe BAMFA
```

- [ ] **Étape 6 : ajouter les sérialiseurs d'invitation**

Ajouter à la fin de `apps/alumni/serializers.py` :

```python
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


class InvitationVerifySerializer(serializers.Serializer):
    token = serializers.CharField()


class InvitationActivateSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value
```

> Les imports Django doivent remonter en tête de fichier lors du passage de `ruff` (règle `I`). Lancer `.venv/bin/ruff check --fix .` réordonne automatiquement.

- [ ] **Étape 7 : ajouter les vues et les routes**

Ajouter à `apps/alumni/views.py` :

```python
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import InvitationActivateSerializer, InvitationVerifySerializer
from .services import InvitationError


def _resolve_or_400(token):
    try:
        return services.resolve_invitation_token(token)
    except InvitationError as exc:
        raise ValidationError({"token": [str(exc)]}) from exc


@extend_schema(
    tags=["alumni"],
    request=InvitationVerifySerializer,
    responses={200: dict},
)
class InvitationVerifyView(APIView):
    """Valide un jeton d'invitation et renvoie l'identité à préremplir."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = InvitationVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _resolve_or_400(serializer.validated_data["token"])
        return Response({"first_name": profile.first_name, "email": profile.email})


@extend_schema(
    tags=["alumni"],
    request=InvitationActivateSerializer,
    responses={200: dict},
)
class InvitationActivateView(APIView):
    """Crée le compte de connexion à partir d'un jeton d'invitation."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = InvitationActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _resolve_or_400(serializer.validated_data["token"])
        _user, created = services.claim_invitation(
            profile, password=serializer.validated_data["password"]
        )
        message = (
            "Votre accès est activé. Vous pouvez maintenant vous connecter."
            if created
            else (
                "Un compte existait déjà pour cette adresse ; il a été rattaché "
                "à votre profil. Connectez-vous avec vos identifiants habituels."
            )
        )
        return Response(
            {"created": created, "detail": message}, status=status.HTTP_200_OK
        )
```

Ajouter à `apps/alumni/urls.py` :

```python
from .views import (
    InvitationActivateView,
    InvitationVerifyView,
    RegistrationCreateView,
)

urlpatterns = [
    path(
        "inscriptions/",
        RegistrationCreateView.as_view(),
        name="alumni-inscription-create",
    ),
    path(
        "invitation/verifier/",
        InvitationVerifyView.as_view(),
        name="alumni-invitation-verify",
    ),
    path(
        "invitation/activer/",
        InvitationActivateView.as_view(),
        name="alumni-invitation-activate",
    ),
]
```

- [ ] **Étape 8 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_invitation.py -q`
Attendu : 13 passed

- [ ] **Étape 9 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
.venv/bin/pytest -q
git add apps/alumni config/settings/base.py .env.example tests/test_alumni_invitation.py
git commit -m "feat: invitation alumni par jeton signe (verification + activation du compte)"
```

---

## Tâche 5 : Revue administrateur — approbation et rejet

**Fichiers**
- Créer : `apps/alumni/permissions.py`, `apps/alumni/filters.py`
- Créer : `apps/alumni/templates/emails/alumni_demande_approuvee.txt`, `apps/alumni/templates/emails/alumni_demande_rejetee.txt`
- Modifier : `apps/alumni/services.py`, `apps/alumni/serializers.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Test : `tests/test_alumni_review_api.py`

**Interfaces**
- Consomme : `HasAnyRole` et dérivées (tâche 1) · `build_invitation_token`, `send_invitation` (tâche 4).
- Produit : `CanReviewRegistrations`, `CanManageDirectory`, `CanReadAdminDirectory`, `CanImportAlumni` · `approve_registration(registration, *, reviewer) -> AlumniProfile` · `reject_registration(registration, *, reviewer, reason="") -> AlumniRegistration` · `PROFILE_COPY_FIELDS` · `AlumniRegistrationAdminSerializer`, `RejectSerializer`, `AdminProfileSerializer` · `AlumniRegistrationFilter` · `GET /api/v1/alumni/admin/inscriptions/`, `POST .../{id}/approuver/`, `POST .../{id}/rejeter/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_review_api.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniProfile, AlumniRegistration

User = get_user_model()
LISTE = "/api/v1/alumni/admin/inscriptions/"


def _client(role=None):
    create_roles()
    client = APIClient()
    if role is None:
        return client
    user = User.objects.create_user(email=f"{role.lower()}@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name=role))
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def demande(db):
    return AlumniRegistration.objects.create(
        first_name="Awa",
        last_name="Doe",
        email="awa@example.org",
        promotion=2018,
        directory_consent=True,
        city="Cotonou",
        sector="numerique",
    )


@pytest.mark.django_db
def test_l_approbation_cree_un_profil_actif_sans_compte(demande, mailoutbox):
    client = _client("Administrateur")

    response = client.post(f"{LISTE}{demande.pk}/approuver/")

    assert response.status_code == 200
    profil = AlumniProfile.objects.get()
    assert profil.status == AlumniProfile.Status.ACTIF
    assert profil.source == AlumniProfile.Source.INSCRIPTION
    assert profil.user is None
    assert profil.email == "awa@example.org"
    assert profil.city == "Cotonou"
    assert profil.directory_consent is True


@pytest.mark.django_db
def test_l_approbation_trace_l_instruction_et_lie_le_profil(demande):
    client = _client("Administrateur")

    client.post(f"{LISTE}{demande.pk}/approuver/")

    demande.refresh_from_db()
    assert demande.status == AlumniRegistration.Status.APPROUVEE
    assert demande.reviewed_at is not None
    assert demande.reviewed_by.email == "administrateur@bamfa.org"
    assert demande.profile == AlumniProfile.objects.get()


@pytest.mark.django_db
def test_l_approbation_envoie_le_lien_d_invitation(demande, mailoutbox):
    _client("Administrateur").post(f"{LISTE}{demande.pk}/approuver/")

    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["awa@example.org"]
    assert "/alumni/activation?token=" in mailoutbox[0].body


@pytest.mark.django_db
def test_le_rejet_conserve_le_motif_et_ne_cree_rien(demande, mailoutbox):
    client = _client("Administrateur")

    response = client.post(
        f"{LISTE}{demande.pk}/rejeter/",
        {"motif": "Promotion non rattachée à BAMFA."},
        format="json",
    )

    assert response.status_code == 200
    demande.refresh_from_db()
    assert demande.status == AlumniRegistration.Status.REJETEE
    assert demande.rejection_reason == "Promotion non rattachée à BAMFA."
    assert demande.reviewed_by is not None
    assert demande.reviewed_at is not None
    assert AlumniProfile.objects.count() == 0
    assert User.objects.filter(email="awa@example.org").count() == 0


@pytest.mark.django_db
def test_le_rejet_notifie_le_demandeur_avec_le_motif(demande, mailoutbox):
    _client("Administrateur").post(
        f"{LISTE}{demande.pk}/rejeter/", {"motif": "Dossier incomplet."}, format="json"
    )

    assert len(mailoutbox) == 1
    assert "Dossier incomplet." in mailoutbox[0].body


@pytest.mark.django_db
def test_le_rejet_sans_motif_est_accepte(demande, mailoutbox):
    response = _client("Administrateur").post(f"{LISTE}{demande.pk}/rejeter/")

    assert response.status_code == 200
    demande.refresh_from_db()
    assert demande.rejection_reason == ""


@pytest.mark.django_db
def test_une_demande_deja_instruite_ne_peut_pas_etre_reinstruite(demande):
    client = _client("Administrateur")
    client.post(f"{LISTE}{demande.pk}/approuver/")

    response = client.post(f"{LISTE}{demande.pk}/approuver/")

    assert response.status_code == 400
    assert AlumniProfile.objects.count() == 1


@pytest.mark.django_db
def test_la_secretaire_lit_la_file_mais_ne_peut_pas_approuver(demande):
    client = _client("Secrétaire")

    assert client.get(LISTE).status_code == 200
    assert client.post(f"{LISTE}{demande.pk}/approuver/").status_code == 403
    assert client.post(f"{LISTE}{demande.pk}/rejeter/").status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["Alumni", "Rédacteur de contenu", "Trésorier"])
def test_les_autres_roles_n_ont_aucun_acces(demande, role):
    client = _client(role)

    assert client.get(LISTE).status_code == 403
    assert client.post(f"{LISTE}{demande.pk}/approuver/").status_code == 403


@pytest.mark.django_db
def test_un_anonyme_est_refuse(demande):
    client = _client()

    assert client.get(LISTE).status_code in (401, 403)
    assert client.post(f"{LISTE}{demande.pk}/approuver/").status_code in (401, 403)


@pytest.mark.django_db
def test_la_file_est_filtrable_par_statut(demande):
    AlumniRegistration.objects.create(
        first_name="Kofi",
        last_name="Mensah",
        email="kofi@example.org",
        promotion=2019,
        status=AlumniRegistration.Status.REJETEE,
    )
    client = _client("Administrateur")

    response = client.get(LISTE, {"statut": "en_attente"})

    assert response.data["count"] == 1
    assert response.data["results"][0]["email"] == "awa@example.org"
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_review_api.py -q`
Attendu : ÉCHEC — 404 sur `/api/v1/alumni/admin/inscriptions/`

- [ ] **Étape 3 : écrire les permissions de la slice**

Créer `apps/alumni/permissions.py` :

```python
from apps.common.permissions import HasAnyRole


class CanReviewRegistrations(HasAnyRole):
    """Approuver ou rejeter une demande : acte de gouvernance."""

    roles = ("Administrateur",)


class CanManageDirectory(HasAnyRole):
    """Éditer, suspendre, réactiver, archiver, (ré)inviter."""

    roles = ("Administrateur",)


class CanReadAdminDirectory(HasAnyRole):
    """Consulter la base complète, e-mails et profils sans consentement inclus."""

    roles = ("Administrateur", "Secrétaire")


class CanImportAlumni(HasAnyRole):
    """Alimenter la base par import de fichier."""

    roles = ("Administrateur", "Secrétaire")
```

- [ ] **Étape 4 : écrire les services d'approbation et de rejet**

Ajouter à `apps/alumni/services.py` (après `send_invitation`) :

```python
from django.utils import timezone

from .models import AlumniRegistration

# Champs recopiés de la demande vers le profil à l'approbation.
PROFILE_COPY_FIELDS = (
    "first_name",
    "last_name",
    "email",
    "promotion",
    "country",
    "phone",
    "city",
    "university",
    "mcf_program",
    "sector",
    "current_position",
    "organization",
    "bio",
    "linkedin_url",
    "birth_date",
    "gender",
    "directory_consent",
)


def approve_registration(registration, *, reviewer):
    """Crée le membre depuis la demande, puis envoie le lien d'invitation.

    L'email part **après** le commit : une transaction annulée ne doit pas
    laisser filer une invitation vers un profil qui n'existe pas.
    """
    with transaction.atomic():
        profile = AlumniProfile.objects.create(
            source=AlumniProfile.Source.INSCRIPTION,
            **{champ: getattr(registration, champ) for champ in PROFILE_COPY_FIELDS},
        )
        registration.status = AlumniRegistration.Status.APPROUVEE
        registration.reviewed_by = reviewer
        registration.reviewed_at = timezone.now()
        registration.profile = profile
        registration.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "profile"]
        )

    send_invitation(
        profile,
        template="alumni_demande_approuvee",
        subject="Votre inscription à BAMFA est approuvée",
    )
    return profile


def reject_registration(registration, *, reviewer, reason=""):
    with transaction.atomic():
        registration.status = AlumniRegistration.Status.REJETEE
        registration.reviewed_by = reviewer
        registration.reviewed_at = timezone.now()
        registration.rejection_reason = reason or ""
        registration.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "rejection_reason",
            ]
        )

    send_templated_email_task.delay(
        "Votre demande d'inscription à BAMFA",
        "alumni_demande_rejetee",
        {"prenom": registration.first_name, "motif": registration.rejection_reason},
        registration.email,
    )
    return registration
```

- [ ] **Étape 5 : écrire les deux gabarits d'email**

Créer `apps/alumni/templates/emails/alumni_demande_approuvee.txt` :

```
Bonjour {{ prenom }},

Bonne nouvelle : votre demande d'inscription à BAMFA est approuvée.
Bienvenue dans la communauté des alumni de la Mastercard Foundation au Bénin.

Pour accéder à la plateforme, définissez votre mot de passe en suivant ce
lien, valable 7 jours :

{{ lien }}

Vous pourrez ensuite compléter votre profil et choisir de figurer ou non
dans l'annuaire public.

L'équipe BAMFA
```

Créer `apps/alumni/templates/emails/alumni_demande_rejetee.txt` :

```
Bonjour {{ prenom }},

Après examen, votre demande d'inscription à BAMFA n'a pas été retenue.
{% if motif %}
Motif communiqué par l'équipe :

{{ motif }}
{% endif %}
Si vous pensez qu'il s'agit d'une erreur, vous pouvez nous écrire via le
formulaire de contact du site.

L'équipe BAMFA
```

- [ ] **Étape 6 : écrire les sérialiseurs d'administration**

Ajouter à `apps/alumni/serializers.py` :

```python
class AlumniRegistrationAdminSerializer(serializers.ModelSerializer):
    """Lecture d'une demande dans le back-office."""

    reviewed_by_email = serializers.EmailField(
        source="reviewed_by.email", read_only=True, default=None
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    sector_display = serializers.CharField(source="get_sector_display", read_only=True)

    class Meta:
        model = AlumniRegistration
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "promotion",
            "country",
            "phone",
            "city",
            "university",
            "mcf_program",
            "sector",
            "sector_display",
            "current_position",
            "organization",
            "bio",
            "linkedin_url",
            "birth_date",
            "gender",
            "directory_consent",
            "status",
            "status_display",
            "submitted_at",
            "reviewed_at",
            "reviewed_by_email",
            "rejection_reason",
            "profile",
        ]
        read_only_fields = fields


class RejectSerializer(serializers.Serializer):
    motif = serializers.CharField(required=False, allow_blank=True, default="")


class AdminProfileSerializer(serializers.ModelSerializer):
    """Niveau administration : tous les champs, e-mail et téléphone inclus."""

    completeness = serializers.IntegerField(read_only=True)
    has_account = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    sector_display = serializers.CharField(source="get_sector_display", read_only=True)
    user_email = serializers.EmailField(
        source="user.email", read_only=True, default=None
    )

    class Meta:
        model = AlumniProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "promotion",
            "country",
            "phone",
            "city",
            "university",
            "mcf_program",
            "sector",
            "sector_display",
            "current_position",
            "organization",
            "bio",
            "linkedin_url",
            "birth_date",
            "gender",
            "directory_consent",
            "status",
            "status_display",
            "source",
            "mandate",
            "completeness",
            "has_account",
            "user_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "status_display",
            "source",
            "sector_display",
            "completeness",
            "has_account",
            "user_email",
            "created_at",
            "updated_at",
        ]
```

> `status` est en lecture seule : il ne change que par les actions dédiées (`suspendre`, `reactiver`, `archiver`), jamais par un `PATCH` générique.

- [ ] **Étape 7 : écrire le `FilterSet` des demandes**

Créer `apps/alumni/filters.py` :

```python
import django_filters as filters

from .models import AlumniRegistration


class AlumniRegistrationFilter(filters.FilterSet):
    statut = filters.CharFilter(field_name="status")

    class Meta:
        model = AlumniRegistration
        fields = ["promotion"]
```

- [ ] **Étape 8 : écrire la vue d'administration des demandes**

Ajouter à `apps/alumni/views.py` :

```python
from rest_framework import viewsets
from rest_framework.decorators import action

from .filters import AlumniRegistrationFilter
from .models import AlumniRegistration
from .permissions import CanReadAdminDirectory, CanReviewRegistrations
from .serializers import (
    AdminProfileSerializer,
    AlumniRegistrationAdminSerializer,
    RejectSerializer,
)


@extend_schema(tags=["alumni"])
class AdminRegistrationViewSet(viewsets.ReadOnlyModelViewSet):
    """File d'attente des demandes d'inscription.

    Lecture ouverte à la Secrétaire, instruction réservée à l'Administrateur.
    """

    queryset = AlumniRegistration.objects.select_related("reviewed_by", "profile")
    serializer_class = AlumniRegistrationAdminSerializer
    permission_classes = [CanReadAdminDirectory]
    filterset_class = AlumniRegistrationFilter
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["submitted_at", "last_name", "promotion"]

    def get_permissions(self):
        if self.action in ("approuver", "rejeter"):
            return [CanReviewRegistrations()]
        return super().get_permissions()

    def _en_attente_ou_400(self):
        registration = self.get_object()
        if registration.status != AlumniRegistration.Status.EN_ATTENTE:
            raise ValidationError(
                {"statut": ["Cette demande a déjà été instruite."]}
            )
        return registration

    @extend_schema(request=None, responses={200: AdminProfileSerializer})
    @action(detail=True, methods=["post"], url_path="approuver")
    def approuver(self, request, pk=None):
        registration = self._en_attente_ou_400()
        profile = services.approve_registration(registration, reviewer=request.user)
        return Response(AdminProfileSerializer(profile).data)

    @extend_schema(
        request=RejectSerializer, responses={200: AlumniRegistrationAdminSerializer}
    )
    @action(detail=True, methods=["post"], url_path="rejeter")
    def rejeter(self, request, pk=None):
        registration = self._en_attente_ou_400()
        serializer = RejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reject_registration(
            registration,
            reviewer=request.user,
            reason=serializer.validated_data["motif"],
        )
        registration.refresh_from_db()
        return Response(self.get_serializer(registration).data)
```

- [ ] **Étape 9 : brancher le routeur**

Remplacer `apps/alumni/urls.py` par :

```python
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminRegistrationViewSet,
    InvitationActivateView,
    InvitationVerifyView,
    RegistrationCreateView,
)

router = DefaultRouter()
router.register(
    "admin/inscriptions", AdminRegistrationViewSet, basename="alumni-admin-inscription"
)

urlpatterns = [
    path(
        "inscriptions/",
        RegistrationCreateView.as_view(),
        name="alumni-inscription-create",
    ),
    path(
        "invitation/verifier/",
        InvitationVerifyView.as_view(),
        name="alumni-invitation-verify",
    ),
    path(
        "invitation/activer/",
        InvitationActivateView.as_view(),
        name="alumni-invitation-activate",
    ),
    path("", include(router.urls)),
]
```

- [ ] **Étape 10 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_review_api.py -q`
Attendu : 13 passed (le test paramétré compte pour 3)

- [ ] **Étape 11 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
.venv/bin/pytest -q
git add apps/alumni tests/test_alumni_review_api.py
git commit -m "feat: revue admin des demandes alumni (approbation, rejet motive, emails)"
```

---

## Tâche 6 : Annuaire public et connecté

**Fichiers**
- Modifier : `apps/alumni/serializers.py`, `apps/alumni/filters.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Test : `tests/test_alumni_directory_api.py`

**Interfaces**
- Consomme : `AlumniProfile.objects.in_directory()` (tâche 2) · `user_has_role` (existant).
- Produit : `PublicDirectorySerializer`, `MemberDirectorySerializer` · `PublicDirectoryFilter` · `DIRECTORY_ROLES` · `GET /api/v1/alumni/annuaire/` et `GET /api/v1/alumni/annuaire/{id}/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_directory_api.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniProfile

User = get_user_model()
URL = "/api/v1/alumni/annuaire/"

CHAMPS_PRIVES = ("email", "phone")
CHAMPS_ENRICHIS = ("city", "bio", "linkedin_url")


def _profil(**kwargs):
    valeurs = {
        "first_name": "Awa",
        "last_name": "Doe",
        "email": "awa@example.org",
        "promotion": 2018,
        "directory_consent": True,
        "phone": "+229 90 00 00 00",
        "city": "Cotonou",
        "bio": "Développeuse.",
        "linkedin_url": "https://linkedin.com/in/awa",
        "sector": "numerique",
        "country": "Bénin",
        "organization": "BAMFA",
        "current_position": "Développeuse",
    }
    valeurs.update(kwargs)
    return AlumniProfile.objects.create(**valeurs)


def _client_avec_role(role):
    create_roles()
    user = User.objects.create_user(email=f"{role.lower()}@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name=role))
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_l_annuaire_public_masque_email_et_telephone():
    _profil()

    entree = APIClient().get(URL).data["results"][0]

    for champ in CHAMPS_PRIVES:
        assert champ not in entree


@pytest.mark.django_db
def test_l_annuaire_public_n_expose_pas_les_champs_enrichis():
    _profil()

    entree = APIClient().get(URL).data["results"][0]

    for champ in CHAMPS_ENRICHIS:
        assert champ not in entree


@pytest.mark.django_db
def test_l_annuaire_public_expose_les_champs_de_presentation():
    _profil()

    entree = APIClient().get(URL).data["results"][0]

    assert entree["first_name"] == "Awa"
    assert entree["last_name"] == "Doe"
    assert entree["promotion"] == 2018
    assert entree["sector_display"] == "Technologies et numérique"
    assert entree["country"] == "Bénin"
    assert entree["organization"] == "BAMFA"
    assert entree["current_position"] == "Développeuse"


@pytest.mark.django_db
def test_un_alumni_connecte_voit_les_champs_enrichis_mais_pas_les_prives():
    _profil()
    client = _client_avec_role("Alumni")

    entree = client.get(URL).data["results"][0]

    for champ in CHAMPS_ENRICHIS:
        assert champ in entree
    for champ in CHAMPS_PRIVES:
        assert champ not in entree


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["Rédacteur de contenu", "Trésorier"])
def test_un_role_non_habilite_reste_au_niveau_public(role):
    _profil()
    client = _client_avec_role(role)

    entree = client.get(URL).data["results"][0]

    assert "city" not in entree


@pytest.mark.django_db
def test_l_annuaire_exclut_les_profils_sans_consentement():
    _profil(email="visible@example.org")
    _profil(email="cache@example.org", directory_consent=False)

    response = APIClient().get(URL)

    assert response.data["count"] == 1


@pytest.mark.django_db
@pytest.mark.parametrize(
    "statut", [AlumniProfile.Status.SUSPENDU, AlumniProfile.Status.ARCHIVE]
)
def test_l_annuaire_exclut_les_profils_non_actifs(statut):
    _profil(email="hors@example.org", status=statut)

    assert APIClient().get(URL).data["count"] == 0


@pytest.mark.django_db
def test_le_detail_applique_les_memes_regles_de_champs():
    profil = _profil()

    entree = APIClient().get(f"{URL}{profil.pk}/").data

    assert entree["first_name"] == "Awa"
    for champ in CHAMPS_PRIVES + CHAMPS_ENRICHIS:
        assert champ not in entree


@pytest.mark.django_db
def test_le_detail_d_un_profil_hors_annuaire_est_introuvable():
    profil = _profil(directory_consent=False)

    assert APIClient().get(f"{URL}{profil.pk}/").status_code == 404


@pytest.mark.django_db
def test_filtrage_par_promotion_secteur_et_pays():
    _profil(email="a@example.org", promotion=2018, sector="numerique", country="Bénin")
    _profil(email="b@example.org", promotion=2020, sector="sante", country="Togo")
    client = APIClient()

    assert client.get(URL, {"promotion": 2018}).data["count"] == 1
    assert client.get(URL, {"secteur": "sante"}).data["count"] == 1
    assert client.get(URL, {"pays": "togo"}).data["count"] == 1


@pytest.mark.django_db
def test_recherche_sur_nom_organisation_et_poste():
    _profil(email="a@example.org", last_name="Mensah", organization="ONG Espoir")
    _profil(email="b@example.org", last_name="Doe", organization="BAMFA")
    client = APIClient()

    assert client.get(URL, {"search": "Mensah"}).data["count"] == 1
    assert client.get(URL, {"search": "Espoir"}).data["count"] == 1


@pytest.mark.django_db
def test_l_annuaire_est_pagine():
    for index in range(25):
        _profil(email=f"alumni{index}@example.org", last_name=f"Nom{index:02d}")

    response = APIClient().get(URL)

    assert response.data["count"] == 25
    assert len(response.data["results"]) == 20
    assert response.data["next"] is not None
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_directory_api.py -q`
Attendu : ÉCHEC — 404 sur `/api/v1/alumni/annuaire/`

- [ ] **Étape 3 : écrire les deux sérialiseurs d'annuaire**

Ajouter à `apps/alumni/serializers.py` :

```python
class PublicDirectorySerializer(serializers.ModelSerializer):
    """Niveau public : ni e-mail, ni téléphone, ni champs enrichis."""

    sector_display = serializers.CharField(source="get_sector_display", read_only=True)

    class Meta:
        model = AlumniProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "promotion",
            "sector",
            "sector_display",
            "country",
            "current_position",
            "organization",
        ]
        read_only_fields = fields


class MemberDirectorySerializer(PublicDirectorySerializer):
    """Niveau connecté : ajoute ville, biographie et LinkedIn. Toujours pas
    d'e-mail ni de téléphone — ceux-là ne sortent jamais du back-office."""

    class Meta(PublicDirectorySerializer.Meta):
        fields = PublicDirectorySerializer.Meta.fields + [
            "city",
            "bio",
            "linkedin_url",
        ]
        read_only_fields = fields
```

- [ ] **Étape 4 : ajouter le `FilterSet` de l'annuaire**

Ajouter à `apps/alumni/filters.py` :

```python
from .models import AlumniProfile


class PublicDirectoryFilter(filters.FilterSet):
    secteur = filters.CharFilter(field_name="sector")
    pays = filters.CharFilter(field_name="country", lookup_expr="iexact")

    class Meta:
        model = AlumniProfile
        fields = ["promotion"]
```

- [ ] **Étape 5 : écrire la vue d'annuaire**

Ajouter à `apps/alumni/views.py` :

```python
from apps.accounts.roles import user_has_role

from .filters import PublicDirectoryFilter
from .models import AlumniProfile
from .serializers import MemberDirectorySerializer, PublicDirectorySerializer

# Rôles qui accèdent au niveau « connecté » de l'annuaire.
DIRECTORY_ROLES = ("Alumni", "Secrétaire", "Administrateur")


@extend_schema(tags=["alumni"])
class DirectoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Annuaire des alumni.

    Un seul URL, deux niveaux de champs : le sérialiseur est choisi selon le
    rôle de l'appelant. La *présence* dans l'annuaire est portée par
    `in_directory()` — statut actif et consentement — quel que soit le niveau.
    """

    permission_classes = [AllowAny]
    filterset_class = PublicDirectoryFilter
    search_fields = [
        "first_name",
        "last_name",
        "organization",
        "current_position",
    ]
    ordering_fields = ["last_name", "promotion"]
    ordering = ["last_name", "first_name"]

    def get_queryset(self):
        return AlumniProfile.objects.in_directory()

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (
            user.is_superuser
            or any(user_has_role(user, role) for role in DIRECTORY_ROLES)
        ):
            return MemberDirectorySerializer
        return PublicDirectorySerializer
```

- [ ] **Étape 6 : enregistrer la route**

Dans `apps/alumni/urls.py`, ajouter l'import `DirectoryViewSet` et l'enregistrement :

```python
router.register("annuaire", DirectoryViewSet, basename="alumni-annuaire")
router.register(
    "admin/inscriptions", AdminRegistrationViewSet, basename="alumni-admin-inscription"
)
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_directory_api.py -q`
Attendu : 15 passed (les deux tests paramétrés comptent pour 2 chacun)

- [ ] **Étape 8 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
.venv/bin/pytest -q
git add apps/alumni tests/test_alumni_directory_api.py
git commit -m "feat: annuaire alumni public et connecte (deux niveaux de champs, filtres, recherche)"
```

---

## Tâche 7 : Annuaire d'administration et cycle de vie du membre

**Fichiers**
- Modifier : `apps/alumni/services.py`, `apps/alumni/filters.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Test : `tests/test_alumni_admin_api.py`

**Interfaces**
- Consomme : `AdminProfileSerializer` (tâche 5) · `send_invitation` (tâche 4) · `CanReadAdminDirectory`, `CanManageDirectory` (tâche 5).
- Produit : `suspend_profile(profile) -> AlumniProfile` · `reactivate_profile(profile) -> AlumniProfile` · `archive_profile(profile) -> AlumniProfile` · `AdminProfileFilter` · `GET/PATCH /api/v1/alumni/admin/profils/` et `/{id}/` · `POST .../{id}/suspendre|reactiver|archiver|inviter/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_admin_api.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniProfile

User = get_user_model()
LISTE = "/api/v1/alumni/admin/profils/"


def _client(role=None):
    create_roles()
    client = APIClient()
    if role is None:
        return client
    user = User.objects.create_user(email=f"{role.lower()}@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name=role))
    client.force_authenticate(user=user)
    return client


def _profil(**kwargs):
    valeurs = {
        "first_name": "Awa",
        "last_name": "Doe",
        "email": "awa@example.org",
        "promotion": 2018,
        "phone": "+229 90 00 00 00",
    }
    valeurs.update(kwargs)
    return AlumniProfile.objects.create(**valeurs)


@pytest.mark.django_db
def test_l_administration_voit_email_telephone_et_completude():
    _profil()

    entree = _client("Administrateur").get(LISTE).data["results"][0]

    assert entree["email"] == "awa@example.org"
    assert entree["phone"] == "+229 90 00 00 00"
    assert "completeness" in entree
    assert entree["has_account"] is False


@pytest.mark.django_db
def test_l_administration_voit_les_profils_sans_consentement_et_non_actifs():
    _profil(email="a@example.org", directory_consent=False)
    _profil(email="b@example.org", status=AlumniProfile.Status.SUSPENDU)
    _profil(email="c@example.org", status=AlumniProfile.Status.ARCHIVE)

    assert _client("Administrateur").get(LISTE).data["count"] == 3


@pytest.mark.django_db
def test_la_secretaire_lit_mais_ne_modifie_pas():
    profil = _profil()
    client = _client("Secrétaire")

    assert client.get(LISTE).status_code == 200
    assert (
        client.patch(f"{LISTE}{profil.pk}/", {"city": "Cotonou"}, format="json").status_code
        == 403
    )
    assert client.post(f"{LISTE}{profil.pk}/suspendre/").status_code == 403
    assert client.post(f"{LISTE}{profil.pk}/inviter/").status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["Alumni", "Rédacteur de contenu", "Trésorier"])
def test_les_autres_roles_n_ont_aucun_acces(role):
    profil = _profil()
    client = _client(role)

    assert client.get(LISTE).status_code == 403
    assert client.post(f"{LISTE}{profil.pk}/suspendre/").status_code == 403


@pytest.mark.django_db
def test_un_anonyme_est_refuse():
    assert _client().get(LISTE).status_code in (401, 403)


@pytest.mark.django_db
def test_patch_modifie_un_profil():
    profil = _profil()

    response = _client("Administrateur").patch(
        f"{LISTE}{profil.pk}/",
        {"city": "Cotonou", "sector": "numerique", "directory_consent": True},
        format="json",
    )

    assert response.status_code == 200
    profil.refresh_from_db()
    assert profil.city == "Cotonou"
    assert profil.sector == "numerique"
    assert profil.directory_consent is True


@pytest.mark.django_db
def test_patch_ne_peut_pas_changer_le_statut():
    profil = _profil()

    _client("Administrateur").patch(
        f"{LISTE}{profil.pk}/", {"status": "suspendu"}, format="json"
    )

    profil.refresh_from_db()
    assert profil.status == AlumniProfile.Status.ACTIF


@pytest.mark.django_db
def test_la_suspension_desactive_le_compte():
    profil = _profil()
    user = User.objects.create_user(email="awa@example.org", password="x")
    profil.user = user
    profil.save()

    response = _client("Administrateur").post(f"{LISTE}{profil.pk}/suspendre/")

    assert response.status_code == 200
    profil.refresh_from_db()
    user.refresh_from_db()
    assert profil.status == AlumniProfile.Status.SUSPENDU
    assert user.is_active is False


@pytest.mark.django_db
def test_un_alumni_suspendu_ne_peut_plus_appeler_l_api():
    """SimpleJWT refuse un utilisateur inactif : la suspension prend effet à la
    requête suivante, sans mise en liste noire des jetons."""
    create_roles()
    user = User.objects.create_user(email="awa@example.org", password="x")
    user.groups.add(Group.objects.get(name="Alumni"))
    profil = _profil(user=user)
    client = APIClient()
    client.force_authenticate(user=user)
    assert client.get("/api/v1/alumni/moi/").status_code == 200

    _client("Administrateur").post(f"{LISTE}{profil.pk}/suspendre/")

    user.refresh_from_db()
    client_suspendu = APIClient()
    client_suspendu.force_authenticate(user=user)
    assert client_suspendu.get("/api/v1/alumni/moi/").status_code in (401, 403)


@pytest.mark.django_db
def test_la_reactivation_reactive_le_compte():
    user = User.objects.create_user(email="awa@example.org", password="x")
    user.is_active = False
    user.save()
    profil = _profil(user=user, status=AlumniProfile.Status.SUSPENDU)

    _client("Administrateur").post(f"{LISTE}{profil.pk}/reactiver/")

    profil.refresh_from_db()
    user.refresh_from_db()
    assert profil.status == AlumniProfile.Status.ACTIF
    assert user.is_active is True


@pytest.mark.django_db
def test_l_archivage_masque_le_profil_et_conserve_les_donnees():
    profil = _profil(directory_consent=True)

    _client("Administrateur").post(f"{LISTE}{profil.pk}/archiver/")

    profil.refresh_from_db()
    assert profil.status == AlumniProfile.Status.ARCHIVE
    assert profil.email == "awa@example.org"
    assert AlumniProfile.objects.in_directory().count() == 0


@pytest.mark.django_db
def test_l_action_inviter_envoie_le_lien(mailoutbox):
    profil = _profil()

    response = _client("Administrateur").post(f"{LISTE}{profil.pk}/inviter/")

    assert response.status_code == 200
    assert len(mailoutbox) == 1
    assert "/alumni/activation?token=" in mailoutbox[0].body


@pytest.mark.django_db
def test_inviter_un_profil_qui_a_deja_un_compte_est_refuse(mailoutbox):
    user = User.objects.create_user(email="awa@example.org", password="x")
    profil = _profil(user=user)

    response = _client("Administrateur").post(f"{LISTE}{profil.pk}/inviter/")

    assert response.status_code == 400
    assert len(mailoutbox) == 0


@pytest.mark.django_db
def test_filtre_a_un_compte():
    user = User.objects.create_user(email="avec@example.org", password="x")
    _profil(email="avec@example.org", user=user)
    _profil(email="sans@example.org")
    client = _client("Administrateur")

    assert client.get(LISTE, {"a_un_compte": "true"}).data["count"] == 1
    assert (
        client.get(LISTE, {"a_un_compte": "true"}).data["results"][0]["email"]
        == "avec@example.org"
    )
    assert client.get(LISTE, {"a_un_compte": "false"}).data["count"] == 1
    assert (
        client.get(LISTE, {"a_un_compte": "false"}).data["results"][0]["email"]
        == "sans@example.org"
    )


@pytest.mark.django_db
def test_filtres_statut_consentement_promotion_et_recherche_email():
    _profil(email="a@example.org", promotion=2018, directory_consent=True)
    _profil(
        email="b@example.org",
        promotion=2020,
        status=AlumniProfile.Status.SUSPENDU,
    )
    client = _client("Administrateur")

    assert client.get(LISTE, {"statut": "suspendu"}).data["count"] == 1
    assert client.get(LISTE, {"consentement": "true"}).data["count"] == 1
    assert client.get(LISTE, {"promotion": 2020}).data["count"] == 1
    assert client.get(LISTE, {"search": "b@example.org"}).data["count"] == 1
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_admin_api.py -q`
Attendu : ÉCHEC — 404 sur `/api/v1/alumni/admin/profils/`

- [ ] **Étape 3 : écrire les services de cycle de vie**

Ajouter à `apps/alumni/services.py` :

```python
def _set_account_active(profile, actif):
    if profile.user_id is None:
        return
    if profile.user.is_active != actif:
        profile.user.is_active = actif
        profile.user.save(update_fields=["is_active"])


def _set_status(profile, status, *, account_active):
    with transaction.atomic():
        profile.status = status
        profile.save(update_fields=["status", "updated_at"])
        _set_account_active(profile, account_active)
    return profile


def suspend_profile(profile):
    """Retire le membre de l'annuaire et bloque sa connexion."""
    return _set_status(
        profile, AlumniProfile.Status.SUSPENDU, account_active=False
    )


def reactivate_profile(profile):
    return _set_status(profile, AlumniProfile.Status.ACTIF, account_active=True)


def archive_profile(profile):
    """Suppression logique : masque partout, conserve les données."""
    return _set_status(
        profile, AlumniProfile.Status.ARCHIVE, account_active=False
    )
```

- [ ] **Étape 4 : ajouter le `FilterSet` d'administration**

Ajouter à `apps/alumni/filters.py` :

```python
class AdminProfileFilter(filters.FilterSet):
    statut = filters.CharFilter(field_name="status")
    secteur = filters.CharFilter(field_name="sector")
    pays = filters.CharFilter(field_name="country", lookup_expr="iexact")
    consentement = filters.BooleanFilter(field_name="directory_consent")
    # `exclude=True` : a_un_compte=true écarte les profils sans compte, et
    # a_un_compte=false écarte ceux qui en ont un.
    a_un_compte = filters.BooleanFilter(
        field_name="user", lookup_expr="isnull", exclude=True
    )

    class Meta:
        model = AlumniProfile
        fields = ["promotion"]
```

- [ ] **Étape 5 : écrire la vue d'administration des profils**

Ajouter à `apps/alumni/views.py` :

```python
from rest_framework import mixins

from .filters import AdminProfileFilter
from .permissions import CanManageDirectory


@extend_schema(tags=["alumni"])
class AdminProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Base alumni complète : tous les statuts, e-mails inclus.

    Lecture ouverte à la Secrétaire ; modification et actes de gouvernance
    réservés à l'Administrateur.
    """

    queryset = AlumniProfile.objects.select_related("user", "mandate")
    serializer_class = AdminProfileSerializer
    permission_classes = [CanReadAdminDirectory]
    filterset_class = AdminProfileFilter
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "organization",
        "current_position",
    ]
    ordering_fields = ["last_name", "promotion", "created_at"]
    http_method_names = ["get", "patch", "post", "head", "options"]

    ACTIONS_RESERVEES = (
        "partial_update",
        "suspendre",
        "reactiver",
        "archiver",
        "inviter",
    )

    def get_permissions(self):
        if self.action in self.ACTIONS_RESERVEES:
            return [CanManageDirectory()]
        return super().get_permissions()

    def _repondre(self, profile):
        return Response(self.get_serializer(profile).data)

    @extend_schema(request=None, responses={200: AdminProfileSerializer})
    @action(detail=True, methods=["post"], url_path="suspendre")
    def suspendre(self, request, pk=None):
        return self._repondre(services.suspend_profile(self.get_object()))

    @extend_schema(request=None, responses={200: AdminProfileSerializer})
    @action(detail=True, methods=["post"], url_path="reactiver")
    def reactiver(self, request, pk=None):
        return self._repondre(services.reactivate_profile(self.get_object()))

    @extend_schema(request=None, responses={200: AdminProfileSerializer})
    @action(detail=True, methods=["post"], url_path="archiver")
    def archiver(self, request, pk=None):
        return self._repondre(services.archive_profile(self.get_object()))

    @extend_schema(request=None, responses={200: AdminProfileSerializer})
    @action(detail=True, methods=["post"], url_path="inviter")
    def inviter(self, request, pk=None):
        profile = self.get_object()
        if profile.user_id is not None:
            raise ValidationError(
                {"compte": ["Ce profil possède déjà un compte de connexion."]}
            )
        services.send_invitation(profile)
        return self._repondre(profile)
```

- [ ] **Étape 6 : enregistrer la route**

Dans `apps/alumni/urls.py`, importer `AdminProfileViewSet` et ajouter :

```python
router.register(
    "admin/profils", AdminProfileViewSet, basename="alumni-admin-profil"
)
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_admin_api.py -q`
Attendu : 17 passed (le test paramétré compte pour 3)

> Le test `test_un_alumni_suspendu_ne_peut_plus_appeler_l_api` dépend de la vue `moi/` de la tâche 8. Si l'ordre d'exécution des tâches est respecté, il échouera d'abord en 404 : **le déplacer temporairement en `@pytest.mark.skip` n'est pas autorisé**. Exécuter la tâche 8 avant de valider ce fichier, ou écrire la tâche 8 d'abord — les deux ordres sont acceptables, mais la suite complète doit être verte au commit final de la tâche 8.

- [ ] **Étape 8 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
git add apps/alumni tests/test_alumni_admin_api.py
git commit -m "feat: annuaire admin alumni + cycle de vie (suspension, reactivation, archivage, invitation)"
```

---

## Tâche 8 : API « mon profil »

**Fichiers**
- Modifier : `apps/alumni/serializers.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Test : `tests/test_alumni_self_api.py`

**Interfaces**
- Consomme : `AlumniProfile` (tâche 2).
- Produit : `SelfProfileSerializer` · `GET/PATCH /api/v1/alumni/moi/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_self_api.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniProfile

User = get_user_model()
URL = "/api/v1/alumni/moi/"


@pytest.fixture
def alumni(db):
    create_roles()
    user = User.objects.create_user(email="awa@example.org", password="x")
    user.groups.add(Group.objects.get(name="Alumni"))
    profil = AlumniProfile.objects.create(
        first_name="Awa",
        last_name="Doe",
        email="awa@example.org",
        promotion=2018,
        user=user,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, profil


@pytest.mark.django_db
def test_un_alumni_lit_son_profil(alumni):
    client, _profil = alumni

    response = client.get(URL)

    assert response.status_code == 200
    assert response.data["email"] == "awa@example.org"
    assert response.data["completeness"] == 0


@pytest.mark.django_db
def test_un_alumni_modifie_ses_coordonnees_et_son_consentement(alumni):
    client, profil = alumni

    response = client.patch(
        URL,
        {
            "city": "Cotonou",
            "bio": "Développeuse.",
            "sector": "numerique",
            "directory_consent": True,
        },
        format="json",
    )

    assert response.status_code == 200
    profil.refresh_from_db()
    assert profil.city == "Cotonou"
    assert profil.bio == "Développeuse."
    assert profil.directory_consent is True


@pytest.mark.django_db
def test_la_completude_progresse_avec_les_champs_remplis(alumni):
    client, _profil = alumni

    response = client.patch(URL, {"city": "Cotonou"}, format="json")

    assert response.data["completeness"] > 0


@pytest.mark.django_db
@pytest.mark.parametrize(
    "champ,valeur",
    [("email", "autre@example.org"), ("promotion", 2000), ("status", "suspendu")],
)
def test_les_champs_reserves_a_l_administration_ne_sont_pas_modifiables(
    alumni, champ, valeur
):
    client, profil = alumni
    avant = getattr(profil, champ)

    client.patch(URL, {champ: valeur}, format="json")

    profil.refresh_from_db()
    assert getattr(profil, champ) == avant


@pytest.mark.django_db
def test_un_compte_sans_profil_alumni_recoit_404(db):
    user = User.objects.create_user(email="redacteur@bamfa.org", password="x")
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get(URL).status_code == 404


@pytest.mark.django_db
def test_un_anonyme_est_refuse(db):
    assert APIClient().get(URL).status_code in (401, 403)


@pytest.mark.django_db
def test_le_profil_d_autrui_est_inatteignable(alumni):
    """L'endpoint n'expose aucun identifiant : le périmètre est porté par le
    queryset, filtré sur `user=request.user`."""
    client, profil = alumni
    autre = AlumniProfile.objects.create(
        first_name="Kofi",
        last_name="Mensah",
        email="kofi@example.org",
        promotion=2019,
    )

    response = client.get(URL)

    assert response.data["id"] == profil.pk
    assert response.data["id"] != autre.pk
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_self_api.py -q`
Attendu : ÉCHEC — 404 sur `/api/v1/alumni/moi/`

- [ ] **Étape 3 : écrire le sérialiseur**

Ajouter à `apps/alumni/serializers.py` :

```python
class SelfProfileSerializer(serializers.ModelSerializer):
    """Profil vu et édité par son titulaire.

    `email`, `promotion`, `status` et `source` restent réservés à
    l'administration : ce sont des données d'instruction, pas des préférences.
    """

    completeness = serializers.IntegerField(read_only=True)
    sector_display = serializers.CharField(source="get_sector_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AlumniProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "promotion",
            "country",
            "phone",
            "city",
            "university",
            "mcf_program",
            "sector",
            "sector_display",
            "current_position",
            "organization",
            "bio",
            "linkedin_url",
            "birth_date",
            "gender",
            "directory_consent",
            "status",
            "status_display",
            "completeness",
        ]
        read_only_fields = [
            "id",
            "email",
            "promotion",
            "status",
            "status_display",
            "sector_display",
            "completeness",
        ]
```

- [ ] **Étape 4 : écrire la vue**

Ajouter à `apps/alumni/views.py` :

```python
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

from .serializers import SelfProfileSerializer


@extend_schema(tags=["alumni"])
class SelfProfileView(generics.RetrieveUpdateAPIView):
    """Profil du titulaire du compte.

    Aucune permission de niveau objet : le périmètre est porté par le
    queryset (`user=request.user`), donc aucun chemin de code ne permet
    d'atteindre le profil d'un autre alumni.
    """

    serializer_class = SelfProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        profile = AlumniProfile.objects.filter(user=self.request.user).first()
        if profile is None:
            raise NotFound("Aucun profil alumni n'est rattaché à ce compte.")
        return profile
```

- [ ] **Étape 5 : enregistrer la route**

Dans `apps/alumni/urls.py`, ajouter avant `path("", include(router.urls))` :

```python
    path("moi/", SelfProfileView.as_view(), name="alumni-moi"),
```

- [ ] **Étape 6 : vérifier que tout passe**

```bash
.venv/bin/pytest tests/test_alumni_self_api.py -q   # 9 passed
.venv/bin/pytest -q                                  # suite complète verte
```

- [ ] **Étape 7 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
git add apps/alumni tests/test_alumni_self_api.py
git commit -m "feat: API mon profil alumni (lecture et edition par le titulaire)"
```

---

## Tâche 9 : Cœur d'import — analyse du fichier et application des lignes

Cette tâche ne touche pas à HTTP. Elle livre le cœur **neutre vis-à-vis de la source** : le jour où une API Transition existe, elle écrira un second adaptateur et alimentera le même `import_alumni`.

**Fichiers**
- Créer : `apps/alumni/imports.py`
- Test : `tests/test_alumni_import.py`

**Interfaces**
- Consomme : `AlumniProfile`, `AlumniImport`, `AlumniImportError`, `normalize_email`, `Sector`, `Gender`, `PROMOTION_MIN`, `promotion_max` (tâche 2).
- Produit : `ImportFormatError` · `REQUIRED_COLUMNS` · `COLUMN_TO_FIELD` · `normalize_header(name) -> str` · `parse_csv(uploaded_file) -> list[tuple[int, dict]]` (lève `ImportFormatError`) · `import_alumni(rows, *, uploaded_by, strict=False, filename="") -> AlumniImport`.

**Invariant garanti par les compteurs** : `rows_created + rows_updated + rows_skipped + rows_failed == rows_total`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_import.py` :

```python
import io

import pytest

from apps.alumni.imports import ImportFormatError, import_alumni, parse_csv
from apps.alumni.models import AlumniProfile

EN_TETE = "email,nom,prenom,promotion"


def _fichier(contenu, encodage="utf-8"):
    return io.BytesIO(contenu.encode(encodage))


def _importer(contenu, **kwargs):
    return import_alumni(
        parse_csv(_fichier(contenu)), uploaded_by=None, filename="test.csv", **kwargs
    )


def test_les_en_tetes_sont_normalises():
    from apps.alumni.imports import normalize_header

    assert normalize_header("  Prénom ") == "prenom"
    assert normalize_header("Programme MCF") == "programme_mcf"
    assert normalize_header("E-MAIL") == "e-mail"


def test_une_colonne_requise_absente_leve_une_erreur_de_format():
    with pytest.raises(ImportFormatError) as exc:
        parse_csv(_fichier("email,nom\nawa@example.org,Doe\n"))

    assert "prenom" in str(exc.value)
    assert "promotion" in str(exc.value)


def test_un_fichier_vide_leve_une_erreur_de_format():
    with pytest.raises(ImportFormatError):
        parse_csv(_fichier(""))


def test_le_separateur_point_virgule_est_accepte():
    lignes = parse_csv(
        _fichier("email;nom;prenom;promotion\nawa@example.org;Doe;Awa;2018\n")
    )

    assert lignes[0][1]["email"] == "awa@example.org"


def test_le_bom_utf8_est_tolere():
    lignes = parse_csv(
        _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n", encodage="utf-8-sig")
    )

    assert lignes[0][1]["email"] == "awa@example.org"


def test_les_colonnes_inconnues_sont_ignorees():
    lignes = parse_csv(
        _fichier(f"{EN_TETE},lubie\nawa@example.org,Doe,Awa,2018,xyz\n")
    )

    assert "lubie" in lignes[0][1]  # conservée dans la ligne brute
    assert lignes[0][0] == 2  # la numérotation démarre à la 2e ligne du fichier


@pytest.mark.django_db
def test_un_import_cree_les_profils_valides_directement():
    rapport = _importer(f"{EN_TETE}\nAWA@Example.org,Doe,Awa,2018\n")

    profil = AlumniProfile.objects.get()
    assert profil.email == "awa@example.org"
    assert profil.status == AlumniProfile.Status.ACTIF
    assert profil.source == AlumniProfile.Source.IMPORT
    assert profil.user is None
    assert rapport.rows_total == 1
    assert rapport.rows_created == 1


@pytest.mark.django_db
def test_les_profils_importes_ne_consentent_pas_par_defaut():
    _importer(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")

    assert AlumniProfile.objects.get().directory_consent is False
    assert AlumniProfile.objects.in_directory().count() == 0


@pytest.mark.django_db
def test_la_colonne_consentement_est_prise_en_compte():
    _importer(
        f"{EN_TETE},consentement_annuaire\nawa@example.org,Doe,Awa,2018,oui\n"
    )

    assert AlumniProfile.objects.get().directory_consent is True


@pytest.mark.django_db
def test_deux_passes_du_meme_fichier_ne_creent_rien_la_seconde_fois():
    contenu = f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n"

    premier = _importer(contenu)
    second = _importer(contenu)

    assert premier.rows_created == 1
    assert second.rows_created == 0
    assert second.rows_skipped == 1
    assert AlumniProfile.objects.count() == 1


@pytest.mark.django_db
def test_une_seconde_passe_met_a_jour_les_champs_modifies():
    _importer(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")

    rapport = _importer(
        f"{EN_TETE},ville\nawa@example.org,Doe,Awa,2018,Cotonou\n"
    )

    assert rapport.rows_updated == 1
    assert AlumniProfile.objects.get().city == "Cotonou"


@pytest.mark.django_db
def test_une_colonne_vide_n_ecrase_jamais_une_valeur_existante():
    _importer(f"{EN_TETE},ville\nawa@example.org,Doe,Awa,2018,Cotonou\n")

    _importer(f"{EN_TETE},ville\nawa@example.org,Doe,Awa,2018,\n")

    assert AlumniProfile.objects.get().city == "Cotonou"


@pytest.mark.django_db
def test_une_ligne_invalide_est_consignee_sans_bloquer_les_valides():
    rapport = _importer(
        f"{EN_TETE}\n"
        "awa@example.org,Doe,Awa,2018\n"
        "pas-un-email,Mensah,Kofi,2019\n"
        "kofi@example.org,Mensah,Kofi,2019\n"
    )

    assert rapport.rows_total == 3
    assert rapport.rows_created == 2
    assert rapport.rows_failed == 1
    erreur = rapport.errors.get()
    assert erreur.line_number == 3
    assert "e-mail" in erreur.message.lower()
    assert erreur.raw_row["nom"] == "Mensah"
    assert AlumniProfile.objects.count() == 2


@pytest.mark.django_db
@pytest.mark.parametrize(
    "ligne,fragment",
    [
        ("awa@example.org,Doe,,2018", "prénom"),
        ("awa@example.org,,Awa,2018", "nom"),
        ("awa@example.org,Doe,Awa,mille", "promotion"),
        ("awa@example.org,Doe,Awa,1990", "bornes"),
    ],
)
def test_les_lignes_invalides_portent_un_message_explicite(ligne, fragment):
    rapport = _importer(f"{EN_TETE}\n{ligne}\n")

    assert rapport.rows_failed == 1
    assert fragment in rapport.errors.get().message.lower()


@pytest.mark.django_db
def test_un_secteur_inconnu_est_refuse():
    rapport = _importer(
        f"{EN_TETE},secteur\nawa@example.org,Doe,Awa,2018,astrologie\n"
    )

    assert rapport.rows_failed == 1
    assert "secteur" in rapport.errors.get().message.lower()


@pytest.mark.django_db
def test_une_date_de_naissance_mal_formee_est_refusee():
    rapport = _importer(
        f"{EN_TETE},date_naissance\nawa@example.org,Doe,Awa,2018,12/04/1995\n"
    )

    assert rapport.rows_failed == 1
    assert "naissance" in rapport.errors.get().message.lower()


@pytest.mark.django_db
def test_un_doublon_dans_le_fichier_garde_la_derniere_occurrence():
    rapport = _importer(
        f"{EN_TETE},ville\n"
        "awa@example.org,Doe,Awa,2018,Cotonou\n"
        "awa@example.org,Doe,Awa,2018,Porto-Novo\n"
    )

    assert AlumniProfile.objects.count() == 1
    assert AlumniProfile.objects.get().city == "Porto-Novo"
    assert rapport.errors.filter(line_number=3).exists()
    assert "avertissement" in rapport.errors.get(line_number=3).message.lower()


@pytest.mark.django_db
def test_les_compteurs_couvrent_toujours_le_total_lu():
    rapport = _importer(
        f"{EN_TETE}\n"
        "awa@example.org,Doe,Awa,2018\n"
        "pas-un-email,Mensah,Kofi,2019\n"
    )

    somme = (
        rapport.rows_created
        + rapport.rows_updated
        + rapport.rows_skipped
        + rapport.rows_failed
    )
    assert somme == rapport.rows_total


@pytest.mark.django_db
def test_le_mode_strict_annule_tout_au_premier_echec():
    rapport = _importer(
        f"{EN_TETE}\n"
        "awa@example.org,Doe,Awa,2018\n"
        "pas-un-email,Mensah,Kofi,2019\n"
        "kofi@example.org,Mensah,Kofi,2019\n",
        strict=True,
    )

    assert AlumniProfile.objects.count() == 0
    assert rapport.rows_created == 0
    assert rapport.rows_updated == 0
    assert rapport.rows_failed == 1
    assert rapport.strict is True


@pytest.mark.django_db
def test_le_rapport_survit_a_l_annulation_du_mode_strict():
    from apps.alumni.models import AlumniImport

    _importer(f"{EN_TETE}\npas-un-email,Doe,Awa,2018\n", strict=True)

    assert AlumniImport.objects.count() == 1
    assert AlumniImport.objects.get().errors.count() == 1


@pytest.mark.django_db
def test_un_rapport_est_cree_meme_quand_le_fichier_ne_contient_aucune_ligne():
    rapport = _importer(f"{EN_TETE}\n")

    assert rapport.rows_total == 0
    assert rapport.pk is not None
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_import.py -q`
Attendu : ÉCHEC — `ModuleNotFoundError: No module named 'apps.alumni.imports'`

- [ ] **Étape 3 : écrire l'adaptateur et le cœur d'import**

Créer `apps/alumni/imports.py` :

```python
import csv
import io
import re
import unicodedata
from datetime import date

from django.db import transaction

from .models import (
    AlumniImport,
    AlumniImportError,
    AlumniProfile,
    Gender,
    Sector,
    PROMOTION_MIN,
    normalize_email,
    promotion_max,
)

REQUIRED_COLUMNS = ("email", "nom", "prenom", "promotion")

# Colonnes du fichier → champs du modèle.
COLUMN_TO_FIELD = {
    "email": "email",
    "nom": "last_name",
    "prenom": "first_name",
    "promotion": "promotion",
    "pays": "country",
    "telephone": "phone",
    "ville": "city",
    "universite": "university",
    "programme_mcf": "mcf_program",
    "secteur": "sector",
    "poste": "current_position",
    "organisation": "organization",
    "bio": "bio",
    "linkedin": "linkedin_url",
    "date_naissance": "birth_date",
    "genre": "gender",
    "consentement_annuaire": "directory_consent",
}

VALEURS_VRAIES = {"1", "true", "vrai", "oui", "yes", "x"}


class ImportFormatError(Exception):
    """Le fichier lui-même est inexploitable : rien n'est écrit."""


class _StrictAbort(Exception):
    """Signal interne : annule la transaction en mode strict."""


def normalize_header(name):
    """Minuscules, espaces retirés, accents supprimés, espaces internes en `_`."""
    texte = unicodedata.normalize("NFKD", (name or "").strip().lower())
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"\s+", "_", texte)


def parse_csv(uploaded_file):
    """Adaptateur CSV → lignes normalisées `[(numéro_de_ligne, dict), ...]`.

    Renvoie une liste et non un générateur : les en-têtes sont ainsi validés
    **avant** que le cœur d'import n'écrive quoi que ce soit.
    """
    brut = uploaded_file.read()
    texte = brut.decode("utf-8-sig") if isinstance(brut, bytes) else brut

    try:
        delimiteur = csv.Sniffer().sniff(texte[:4096], delimiters=",;").delimiter
    except csv.Error:
        delimiteur = ","

    lecteur = csv.DictReader(io.StringIO(texte), delimiter=delimiteur)
    if not lecteur.fieldnames:
        raise ImportFormatError("Le fichier est vide ou n'a pas d'en-tête.")

    en_tetes = [normalize_header(nom) for nom in lecteur.fieldnames]
    manquantes = [col for col in REQUIRED_COLUMNS if col not in en_tetes]
    if manquantes:
        raise ImportFormatError(
            "Colonnes requises absentes : " + ", ".join(manquantes) + "."
        )

    lignes = []
    for numero, ligne in enumerate(lecteur, start=2):
        lignes.append(
            (
                numero,
                {
                    normalize_header(cle): (valeur or "").strip()
                    for cle, valeur in ligne.items()
                    if cle is not None
                },
            )
        )
    return lignes


def _valeur_optionnelle(champ, brut):
    """Convertit et valide une valeur optionnelle. Lève `ValueError` si invalide."""
    if champ == "directory_consent":
        return brut.lower() in VALEURS_VRAIES
    if champ == "birth_date":
        try:
            return date.fromisoformat(brut)
        except ValueError:
            raise ValueError(
                "Date de naissance invalide (format AAAA-MM-JJ attendu)."
            ) from None
    if champ == "sector" and brut not in Sector.values:
        raise ValueError(f"Secteur inconnu : « {brut} ».")
    if champ == "gender" and brut not in Gender.values:
        raise ValueError(f"Genre inconnu : « {brut} ».")
    return brut


def _build_values(row):
    """Traduit une ligne normalisée en champs de modèle.

    Les colonnes vides sont **omises** du résultat : c'est ce qui garantit
    qu'une mise à jour n'écrase jamais une valeur existante par du vide.
    """
    email = normalize_email(row.get("email"))
    if not email or "@" not in email:
        raise ValueError("Adresse e-mail invalide ou absente.")
    if not row.get("nom"):
        raise ValueError("Le nom est obligatoire.")
    if not row.get("prenom"):
        raise ValueError("Le prénom est obligatoire.")

    try:
        promotion = int(row.get("promotion", ""))
    except ValueError:
        raise ValueError("Promotion invalide (une année est attendue).") from None
    if not PROMOTION_MIN <= promotion <= promotion_max():
        raise ValueError(
            f"Promotion hors bornes ({PROMOTION_MIN}–{promotion_max()})."
        )

    valeurs = {
        "email": email,
        "last_name": row["nom"],
        "first_name": row["prenom"],
        "promotion": promotion,
    }
    for colonne, champ in COLUMN_TO_FIELD.items():
        if colonne in REQUIRED_COLUMNS:
            continue
        brut = row.get(colonne, "")
        if brut == "":
            continue
        valeurs[champ] = _valeur_optionnelle(champ, brut)
    return valeurs


def _appliquer(valeurs, compteurs):
    email = valeurs["email"]
    profil = AlumniProfile.objects.filter(email=email).first()
    if profil is None:
        AlumniProfile.objects.create(
            source=AlumniProfile.Source.IMPORT, **valeurs
        )
        compteurs["created"] += 1
        return

    modifies = [
        champ
        for champ, valeur in valeurs.items()
        if getattr(profil, champ) != valeur
    ]
    if not modifies:
        compteurs["skipped"] += 1
        return
    for champ in modifies:
        setattr(profil, champ, valeurs[champ])
    profil.save()
    compteurs["updated"] += 1


def import_alumni(rows, *, uploaded_by, strict=False, filename=""):
    """Applique un lot de lignes déjà normalisées.

    Ne sait rien de CSV : `rows` est un itérable de `(numéro, dict)`. C'est ce
    découplage qui permettra à une future API Transition d'alimenter la même
    fonction sans la modifier.
    """
    compteurs = {"total": 0, "created": 0, "updated": 0, "skipped": 0, "failed": 0}
    lignes_rapport = []
    vues = {}

    def parcourir():
        for numero, ligne in rows:
            compteurs["total"] += 1
            try:
                valeurs = _build_values(ligne)
            except ValueError as exc:
                compteurs["failed"] += 1
                lignes_rapport.append((numero, ligne, str(exc)))
                if strict:
                    raise _StrictAbort from exc
                continue

            email = valeurs["email"]
            if email in vues:
                lignes_rapport.append(
                    (
                        numero,
                        ligne,
                        "Avertissement : doublon dans le fichier — "
                        f"l'occurrence de la ligne {vues[email]} est remplacée.",
                    )
                )
            vues[email] = numero
            _appliquer(valeurs, compteurs)

    try:
        with transaction.atomic():
            parcourir()
    except _StrictAbort:
        # Les écritures sont annulées ; le rapport, lui, est écrit ensuite,
        # hors de la transaction abandonnée, afin que la trace survive.
        compteurs["created"] = 0
        compteurs["updated"] = 0
        compteurs["skipped"] = 0

    rapport = AlumniImport.objects.create(
        uploaded_by=uploaded_by,
        filename=filename,
        strict=strict,
        rows_total=compteurs["total"],
        rows_created=compteurs["created"],
        rows_updated=compteurs["updated"],
        rows_skipped=compteurs["skipped"],
        rows_failed=compteurs["failed"],
    )
    AlumniImportError.objects.bulk_create(
        [
            AlumniImportError(
                import_run=rapport, line_number=numero, raw_row=ligne, message=message
            )
            for numero, ligne, message in lignes_rapport
        ]
    )
    return rapport
```

> **Attention au compteur `total` en mode strict** : il reflète les lignes *lues* avant l'abandon, pas le fichier entier. Le test `test_le_mode_strict_annule_tout_au_premier_echec` n'assertit donc que `created`, `updated` et `failed`.

- [ ] **Étape 4 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_import.py -q`
Attendu : 25 passed (les tests paramétrés comptent pour 4)

- [ ] **Étape 5 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
git add apps/alumni/imports.py tests/test_alumni_import.py
git commit -m "feat: coeur d'import alumni idempotent (analyse CSV + application transactionnelle)"
```

---

## Tâche 10 : Endpoints d'import et historique des rapports

**Fichiers**
- Modifier : `apps/alumni/serializers.py`, `apps/alumni/views.py`, `apps/alumni/urls.py`
- Test : `tests/test_alumni_import_api.py`

**Interfaces**
- Consomme : `parse_csv`, `import_alumni`, `ImportFormatError` (tâche 9) · `CanImportAlumni` (tâche 5).
- Produit : `AlumniImportErrorSerializer`, `AlumniImportSerializer`, `AlumniImportCreateSerializer` · `POST /api/v1/alumni/admin/imports/` · `GET /api/v1/alumni/admin/imports/` et `/{id}/`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/test_alumni_import_api.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.roles import create_roles
from apps.alumni.models import AlumniImport, AlumniProfile

User = get_user_model()
URL = "/api/v1/alumni/admin/imports/"
EN_TETE = "email,nom,prenom,promotion"


def _client(role=None):
    create_roles()
    client = APIClient()
    if role is None:
        return client
    user = User.objects.create_user(email=f"{role.lower()}@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name=role))
    client.force_authenticate(user=user)
    return client


def _fichier(contenu, nom="alumni.csv"):
    return SimpleUploadedFile(nom, contenu.encode("utf-8"), content_type="text/csv")


@pytest.mark.django_db
def test_un_administrateur_importe_un_fichier():
    response = _client("Administrateur").post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    assert response.status_code == 201
    assert response.data["rows_created"] == 1
    assert response.data["filename"] == "alumni.csv"
    assert AlumniProfile.objects.count() == 1


@pytest.mark.django_db
def test_la_secretaire_peut_importer():
    response = _client("Secrétaire").post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    assert response.status_code == 201


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["Alumni", "Rédacteur de contenu", "Trésorier"])
def test_les_autres_roles_ne_peuvent_pas_importer(role):
    response = _client(role).post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    assert response.status_code == 403
    assert AlumniProfile.objects.count() == 0


@pytest.mark.django_db
def test_un_anonyme_ne_peut_pas_importer():
    response = _client().post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_l_import_trace_son_auteur():
    _client("Administrateur").post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    assert AlumniImport.objects.get().uploaded_by.email == "administrateur@bamfa.org"


@pytest.mark.django_db
def test_une_colonne_requise_absente_renvoie_400_sans_rien_ecrire():
    response = _client("Administrateur").post(
        URL, {"fichier": _fichier("email,nom\nawa@example.org,Doe\n")}, format="multipart"
    )

    assert response.status_code == 400
    assert "fichier" in response.data["error"]["details"]
    assert AlumniProfile.objects.count() == 0
    assert AlumniImport.objects.count() == 0


@pytest.mark.django_db
def test_le_fichier_est_obligatoire():
    response = _client("Administrateur").post(URL, {}, format="multipart")

    assert response.status_code == 400
    assert "fichier" in response.data["error"]["details"]


@pytest.mark.django_db
def test_le_rapport_expose_les_lignes_en_erreur():
    response = _client("Administrateur").post(
        URL,
        {
            "fichier": _fichier(
                f"{EN_TETE}\n"
                "awa@example.org,Doe,Awa,2018\n"
                "pas-un-email,Mensah,Kofi,2019\n"
            )
        },
        format="multipart",
    )

    assert response.data["rows_created"] == 1
    assert response.data["rows_failed"] == 1
    assert len(response.data["errors"]) == 1
    assert response.data["errors"][0]["line_number"] == 3
    assert response.data["errors"][0]["raw_row"]["nom"] == "Mensah"


@pytest.mark.django_db
def test_le_mode_strict_est_transmis():
    response = _client("Administrateur").post(
        URL,
        {
            "fichier": _fichier(
                f"{EN_TETE}\n"
                "awa@example.org,Doe,Awa,2018\n"
                "pas-un-email,Mensah,Kofi,2019\n"
            ),
            "strict": "true",
        },
        format="multipart",
    )

    assert response.data["strict"] is True
    assert response.data["rows_created"] == 0
    assert AlumniProfile.objects.count() == 0


@pytest.mark.django_db
def test_l_historique_liste_les_rapports_du_plus_recent_au_plus_ancien():
    client = _client("Administrateur")
    client.post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\na@example.org,Doe,Awa,2018\n", "premier.csv")},
        format="multipart",
    )
    client.post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nb@example.org,Doe,Awa,2018\n", "second.csv")},
        format="multipart",
    )

    response = client.get(URL)

    assert response.data["count"] == 2
    assert response.data["results"][0]["filename"] == "second.csv"


@pytest.mark.django_db
def test_le_detail_d_un_rapport_est_consultable():
    client = _client("Administrateur")
    creation = client.post(
        URL,
        {"fichier": _fichier(f"{EN_TETE}\nawa@example.org,Doe,Awa,2018\n")},
        format="multipart",
    )

    response = client.get(f"{URL}{creation.data['id']}/")

    assert response.status_code == 200
    assert response.data["rows_total"] == 1
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_alumni_import_api.py -q`
Attendu : ÉCHEC — 404 sur `/api/v1/alumni/admin/imports/`

- [ ] **Étape 3 : écrire les sérialiseurs**

Ajouter à `apps/alumni/serializers.py` :

```python
from .models import AlumniImport, AlumniImportError


class AlumniImportErrorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumniImportError
        fields = ["id", "line_number", "raw_row", "message"]
        read_only_fields = fields


class AlumniImportSerializer(serializers.ModelSerializer):
    """Rapport d'import, avec ses lignes en erreur et avertissements."""

    errors = AlumniImportErrorSerializer(many=True, read_only=True)
    uploaded_by_email = serializers.EmailField(
        source="uploaded_by.email", read_only=True, default=None
    )

    class Meta:
        model = AlumniImport
        fields = [
            "id",
            "filename",
            "strict",
            "created_at",
            "uploaded_by_email",
            "rows_total",
            "rows_created",
            "rows_updated",
            "rows_skipped",
            "rows_failed",
            "errors",
        ]
        read_only_fields = fields


class AlumniImportCreateSerializer(serializers.Serializer):
    fichier = serializers.FileField()
    strict = serializers.BooleanField(default=False)
```

- [ ] **Étape 4 : écrire la vue**

Ajouter à `apps/alumni/views.py` :

```python
from rest_framework.parsers import FormParser, MultiPartParser

from .imports import ImportFormatError, import_alumni, parse_csv
from .models import AlumniImport
from .permissions import CanImportAlumni
from .serializers import AlumniImportCreateSerializer, AlumniImportSerializer


@extend_schema(tags=["alumni"])
class AdminImportViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Dépôt d'un fichier d'alumni et consultation des rapports."""

    queryset = AlumniImport.objects.select_related("uploaded_by").prefetch_related(
        "errors"
    )
    serializer_class = AlumniImportSerializer
    permission_classes = [CanImportAlumni]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=AlumniImportCreateSerializer, responses={201: AlumniImportSerializer}
    )
    def create(self, request):
        serializer = AlumniImportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fichier = serializer.validated_data["fichier"]

        try:
            lignes = parse_csv(fichier)
        except (ImportFormatError, UnicodeDecodeError) as exc:
            raise ValidationError({"fichier": [str(exc)]}) from exc

        rapport = import_alumni(
            lignes,
            uploaded_by=request.user,
            strict=serializer.validated_data["strict"],
            filename=fichier.name,
        )
        return Response(
            AlumniImportSerializer(rapport).data, status=status.HTTP_201_CREATED
        )
```

> `parse_csv` est appelée **hors** de `import_alumni` : une erreur de format échoue donc avant qu'aucun rapport ne soit créé — ce que vérifie `test_une_colonne_requise_absente_renvoie_400_sans_rien_ecrire`.

- [ ] **Étape 5 : enregistrer la route**

Dans `apps/alumni/urls.py`, importer `AdminImportViewSet` et ajouter :

```python
router.register("admin/imports", AdminImportViewSet, basename="alumni-admin-import")
```

- [ ] **Étape 6 : vérifier que les tests passent**

Lancer : `.venv/bin/pytest tests/test_alumni_import_api.py -q`
Attendu : 13 passed (le test paramétré compte pour 3)

- [ ] **Étape 7 : lint et commit**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
.venv/bin/pytest -q
git add apps/alumni tests/test_alumni_import_api.py
git commit -m "feat: endpoints d'import alumni (depot de fichier, rapport, historique)"
```

---

## Tâche 11 : Données de démonstration et vérification du schéma OpenAPI

**Fichiers**
- Modifier : `apps/common/management/commands/seed_demo.py`
- Test : `tests/test_seed_demo.py` (existant, à compléter), `tests/test_schema.py` (existant, à compléter)

**Interfaces**
- Consomme : `AlumniProfile` (tâche 2).
- Produit : des profils alumni de démonstration idempotents, dont celui rattaché au compte `alumni@bamfa.org`.

- [ ] **Étape 1 : lire les tests existants**

Ouvrir `tests/test_seed_demo.py` et `tests/test_schema.py` pour reprendre leurs conventions avant d'y ajouter des cas.

- [ ] **Étape 2 : écrire les tests qui échouent**

Ajouter à `tests/test_seed_demo.py` :

```python
@pytest.mark.django_db
def test_seed_demo_cree_des_profils_alumni_de_demonstration():
    from apps.alumni.models import AlumniProfile

    call_command("seed_demo")

    assert AlumniProfile.objects.count() >= 3
    assert AlumniProfile.objects.in_directory().exists()


@pytest.mark.django_db
def test_seed_demo_rattache_le_profil_au_compte_alumni_de_demonstration():
    from django.contrib.auth import get_user_model

    from apps.alumni.models import AlumniProfile

    call_command("seed_demo")

    user = get_user_model().objects.get(email="alumni@bamfa.org")
    profil = AlumniProfile.objects.get(email="alumni@bamfa.org")
    assert profil.user == user


@pytest.mark.django_db
def test_seed_demo_reste_idempotente_sur_les_profils_alumni():
    from apps.alumni.models import AlumniProfile

    call_command("seed_demo")
    total = AlumniProfile.objects.count()
    call_command("seed_demo")

    assert AlumniProfile.objects.count() == total
```

> Si `call_command` et `pytest` ne sont pas déjà importés en tête de `tests/test_seed_demo.py`, ajouter `import pytest` et `from django.core.management import call_command`.

Ajouter à `tests/test_schema.py` :

```python
@pytest.mark.django_db
def test_le_schema_expose_les_endpoints_alumni():
    from rest_framework.test import APIClient

    schema = APIClient().get("/api/v1/schema/?format=json").json()
    chemins = schema["paths"]

    for chemin in [
        "/api/v1/alumni/inscriptions/",
        "/api/v1/alumni/annuaire/",
        "/api/v1/alumni/invitation/verifier/",
        "/api/v1/alumni/invitation/activer/",
        "/api/v1/alumni/moi/",
        "/api/v1/alumni/admin/inscriptions/",
        "/api/v1/alumni/admin/profils/",
        "/api/v1/alumni/admin/imports/",
    ]:
        assert chemin in chemins, f"{chemin} absent du schéma"


@pytest.mark.django_db
def test_les_actions_alumni_sont_documentees():
    from rest_framework.test import APIClient

    schema = APIClient().get("/api/v1/schema/?format=json").json()

    for chemin in [
        "/api/v1/alumni/admin/inscriptions/{id}/approuver/",
        "/api/v1/alumni/admin/inscriptions/{id}/rejeter/",
        "/api/v1/alumni/admin/profils/{id}/suspendre/",
        "/api/v1/alumni/admin/profils/{id}/reactiver/",
        "/api/v1/alumni/admin/profils/{id}/archiver/",
        "/api/v1/alumni/admin/profils/{id}/inviter/",
    ]:
        assert chemin in schema["paths"], f"{chemin} absent du schéma"
```

- [ ] **Étape 3 : vérifier que les tests échouent**

Lancer : `.venv/bin/pytest tests/test_seed_demo.py tests/test_schema.py -q`
Attendu : ÉCHEC — aucun profil alumni créé par `seed_demo`.

- [ ] **Étape 4 : compléter `seed_demo`**

Dans `apps/common/management/commands/seed_demo.py`, ajouter après la liste `DEMO_USERS` :

```python
DEMO_ALUMNI = [
    {
        "email": "alumni@bamfa.org",
        "first_name": "Awa",
        "last_name": "Alumni",
        "promotion": 2018,
        "city": "Cotonou",
        "sector": "numerique",
        "current_position": "Développeuse",
        "organization": "BAMFA",
        "bio": "Passionnée de technologies au service de l'éducation.",
        "directory_consent": True,
    },
    {
        "email": "kofi.mensah@example.org",
        "first_name": "Kofi",
        "last_name": "Mensah",
        "promotion": 2016,
        "city": "Porto-Novo",
        "sector": "agriculture",
        "current_position": "Ingénieur agronome",
        "organization": "Coopérative Espoir",
        "directory_consent": True,
    },
    {
        "email": "fatou.diallo@example.org",
        "first_name": "Fatou",
        "last_name": "Diallo",
        "promotion": 2020,
        "city": "Parakou",
        "sector": "sante",
        "current_position": "Sage-femme",
        "organization": "Centre de santé de Parakou",
        "directory_consent": True,
    },
    {
        "email": "sans-consentement@example.org",
        "first_name": "Yao",
        "last_name": "Discret",
        "promotion": 2019,
        "sector": "finance",
        "directory_consent": False,
    },
]
```

Puis, dans `handle`, après la création du mandat :

```python
        for spec in DEMO_ALUMNI:
            profil, _cree = AlumniProfile.objects.get_or_create(
                email=spec["email"], defaults=spec
            )
            # Le profil de démonstration « alumni@bamfa.org » est rattaché à son
            # compte, pour que la connexion de démonstration mène à un profil.
            compte = User.objects.filter(email=spec["email"]).first()
            if compte is not None and profil.user_id is None:
                profil.user = compte
                profil.save(update_fields=["user", "updated_at"])
```

Et l'import en tête de fichier :

```python
from apps.alumni.models import AlumniProfile
```

- [ ] **Étape 5 : vérifier que les tests passent**

```bash
.venv/bin/pytest tests/test_seed_demo.py tests/test_schema.py -q
.venv/bin/pytest -q          # suite backend complète verte
```

- [ ] **Étape 6 : vérifier la suite complète et commiter**

```bash
.venv/bin/ruff check --fix . && .venv/bin/ruff check .
.venv/bin/python manage.py makemigrations --check --dry-run   # No changes detected
git add apps/common tests/test_seed_demo.py tests/test_schema.py
git commit -m "feat: profils alumni de demonstration dans seed_demo + couverture du schema OpenAPI"
```

**Le backend est terminé à ce stade.** Vérification attendue : `pytest` vert (≈ 155 tests), `ruff` propre, migrations propres.

---

## Tâche 12 : Primitives d'interface partagées

À merger tôt : **S6 (Dev A) a besoin des mêmes primitives.** Elles restent volontairement minces — pas de tri intégré, pas de sélection multiple, pas de virtualisation. Le style suit la direction artistique en place (filets `stone-300`, rayons `rounded-sm`, libellés `font-mono` en petites capitales).

**Fichiers**
- Créer : `components/ui/Table.tsx`, `components/ui/Pagination.tsx`, `components/ui/Select.tsx`, `components/ui/Textarea.tsx`, `components/ui/Modal.tsx`
- Test : `components/ui/Table.test.tsx`, `components/ui/Pagination.test.tsx`, `components/ui/Select.test.tsx`, `components/ui/Textarea.test.tsx`, `components/ui/Modal.test.tsx`

**Interfaces**
- Consomme : `components/ui/styles.ts` (`monoLabel`), `components/ui/Button.tsx` (existants).
- Produit :
  - `<Table>`, `<Thead>`, `<Tbody>`, `<Tr>`, `<Th>`, `<Td>` — enveloppes sémantiques, `Table` gère le défilement horizontal.
  - `<Pagination count page pageSize onPageChange />` — `count` total d'éléments, `page` 1-indexé.
  - `<Select label error options={{value,label}[]} …>` — même contrat visuel que `Field`.
  - `<Textarea label error rows …>` — même contrat visuel que `Field`.
  - `<Modal open title onClose>{children}</Modal>` — fermeture par `Échap` et par le fond.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/ui/Table.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table, Tbody, Td, Th, Thead, Tr } from "./Table";

describe("Table", () => {
  it("rend une table accessible avec ses en-têtes", () => {
    render(
      <Table caption="Profils alumni">
        <Thead>
          <Tr>
            <Th>Nom</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Doe</Td>
          </Tr>
        </Tbody>
      </Table>,
    );

    expect(screen.getByRole("table", { name: "Profils alumni" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Nom" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Doe" })).toBeInTheDocument();
  });
});
```

Créer `components/ui/Pagination.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("affiche la position courante", () => {
    render(<Pagination count={45} page={2} pageSize={20} onPageChange={vi.fn()} />);

    expect(screen.getByText("Page 2 sur 3")).toBeInTheDocument();
  });

  it("désactive « Précédent » sur la première page", () => {
    render(<Pagination count={45} page={1} pageSize={20} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();
  });

  it("désactive « Suivant » sur la dernière page", () => {
    render(<Pagination count={45} page={3} pageSize={20} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });

  it("notifie le changement de page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={45} page={2} pageSize={20} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("ne s'affiche pas quand tout tient sur une page", () => {
    const { container } = render(
      <Pagination count={5} page={1} pageSize={20} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
```

Créer `components/ui/Select.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Select } from "./Select";

const OPTIONS = [
  { value: "numerique", label: "Technologies et numérique" },
  { value: "sante", label: "Santé" },
];

describe("Select", () => {
  it("associe le libellé au champ", () => {
    render(<Select label="Secteur" options={OPTIONS} />);

    expect(screen.getByLabelText("Secteur")).toBeInTheDocument();
  });

  it("rend les options fournies", () => {
    render(<Select label="Secteur" options={OPTIONS} />);

    expect(screen.getByRole("option", { name: "Santé" })).toBeInTheDocument();
  });

  it("rend un choix vide quand un texte de repli est fourni", () => {
    render(<Select label="Secteur" options={OPTIONS} placeholder="Tous les secteurs" />);

    expect(screen.getByRole("option", { name: "Tous les secteurs" })).toBeInTheDocument();
  });

  it("signale l'erreur au lecteur d'écran", () => {
    render(<Select label="Secteur" options={OPTIONS} error="Champ requis." />);

    expect(screen.getByLabelText("Secteur")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Champ requis.")).toBeInTheDocument();
  });
});
```

Créer `components/ui/Textarea.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associe le libellé au champ", () => {
    render(<Textarea label="Biographie" />);

    expect(screen.getByLabelText("Biographie")).toBeInTheDocument();
  });

  it("signale l'erreur au lecteur d'écran", () => {
    render(<Textarea label="Motif" error="Le motif est requis." />);

    expect(screen.getByLabelText("Motif")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Le motif est requis.")).toBeInTheDocument();
  });
});
```

Créer `components/ui/Modal.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

describe("Modal", () => {
  it("ne rend rien quand elle est fermée", () => {
    const { container } = render(
      <Modal open={false} title="Rejeter" onClose={vi.fn()}>
        contenu
      </Modal>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("rend un dialogue nommé quand elle est ouverte", () => {
    render(
      <Modal open title="Rejeter la demande" onClose={vi.fn()}>
        contenu
      </Modal>,
    );

    expect(
      screen.getByRole("dialog", { name: "Rejeter la demande" }),
    ).toBeInTheDocument();
  });

  it("se ferme au clic sur le bouton de fermeture", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Rejeter" onClose={onClose}>
        contenu
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("se ferme à la touche Échap", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Rejeter" onClose={onClose}>
        contenu
      </Modal>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : installer `@testing-library/user-event` si absent**

```bash
cd plateforme-bamfa-frontend
npm ls @testing-library/user-event || npm install -D @testing-library/user-event
```

- [ ] **Étape 3 : vérifier que les tests échouent**

Lancer : `npm run test -- components/ui`
Attendu : ÉCHEC — `Failed to resolve import "./Table"` (et les quatre autres modules).

- [ ] **Étape 4 : écrire `Table.tsx`**

```tsx
import type { ReactNode, TableHTMLAttributes } from "react";

import { monoLabel } from "./styles";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Décrit la table pour les lecteurs d'écran. Rendu visuellement masqué. */
  caption: string;
  children: ReactNode;
}

export function Table({ caption, children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-sm border border-stone-300 bg-white">
      <table className={`w-full border-collapse text-sm ${className}`} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-stone-300 bg-stone-100">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-stone-200">{children}</tbody>;
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className={`${monoLabel} px-4 py-3 text-left text-stone-600`}>
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-middle text-ink">{children}</td>;
}
```

- [ ] **Étape 5 : écrire `Pagination.tsx`**

```tsx
"use client";

import { Button } from "./Button";

interface PaginationProps {
  /** Nombre total d'éléments, tel que renvoyé par l'API. */
  count: number;
  /** Page courante, 1-indexée. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ count, page, pageSize, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 pt-4"
    >
      <Button
        type="button"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Précédent
      </Button>
      <p aria-live="polite" className="font-mono text-xs text-stone-600">
        Page {page} sur {pages}
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant
      </Button>
    </nav>
  );
}
```

> `Button` accepte déjà `variant: "primary" | "secondary" | "ghost"`, `size: "sm" | "md" | "lg"` et `loading` — vérifié. Ne pas le modifier.

- [ ] **Étape 6 : écrire `Select.tsx`**

```tsx
"use client";

import { useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  /** Libellé du choix vide (filtre « tous ») ; omis, aucun choix vide n'est rendu. */
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  options,
  placeholder,
  error,
  id,
  className = "",
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="font-mono text-xs uppercase tracking-[0.15em] text-stone-600"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-11 w-full rounded-sm border bg-transparent px-3 text-ink outline-none focus-visible:border-flame focus-visible:ring-2 focus-visible:ring-flame/40 ${
          error ? "border-danger" : "border-ink/20"
        } ${className}`}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Étape 7 : écrire `Textarea.tsx`**

```tsx
"use client";

import { useId, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  rows = 5,
  className = "",
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const errorId = `${textareaId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={textareaId}
        className="font-mono text-xs uppercase tracking-[0.15em] text-stone-600"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-sm border bg-transparent px-3 py-2 text-ink outline-none focus-visible:border-flame focus-visible:ring-2 focus-visible:ring-flame/40 ${
          error ? "border-danger" : "border-ink/20"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Étape 8 : écrire `Modal.tsx`**

```tsx
"use client";

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-sm border border-stone-300 bg-paper p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-heading text-xl font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-sm p-1 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Étape 9 : vérifier que les tests passent**

Lancer : `npm run test -- components/ui`
Attendu : les 5 nouveaux fichiers verts, et les tests `components/ui` existants toujours verts.

- [ ] **Étape 10 : commiter**

```bash
cd plateforme-bamfa-frontend
npm run test
git add components/ui package.json package-lock.json
git commit -m "feat: primitives d'interface partagees (Table, Pagination, Select, Textarea, Modal)"
```

---

## Tâche 13 : Client API alumni

**Fichiers**
- Créer : `lib/alumni/types.ts`, `lib/alumni/params.ts`, `lib/alumni/useDirectory.ts`, `lib/alumni/useRegistrations.ts`, `lib/alumni/useProfiles.ts`, `lib/alumni/useImports.ts`
- Test : `lib/alumni/params.test.ts`, `lib/alumni/useDirectory.test.tsx`, `lib/alumni/useProfiles.test.tsx`
- Modifier : `lib/api/schema.d.ts` (régénéré)

**Interfaces**
- Consomme : `api` de `lib/api/client.ts` · `queryWrapper` de `lib/test-utils.tsx` (existants).
- Produit :
  - Types : `Paginated<T>`, `DirectoryEntry`, `AdminProfile`, `Registration`, `ImportReport`, `ImportReportError`, `RegistrationStatus`, `ProfileStatus`, `DirectoryFilters`, `AdminProfileFilters`.
  - `cleanParams(filters) -> Record<string, string | number>` — retire `undefined`, `null` et `""`.
  - `useDirectory(filters)` · `useRegistrations(filters)`, `useApproveRegistration()`, `useRejectRegistration()` · `useProfiles(filters)`, `useProfileAction()` · `useImports()`, `useCreateImport()`.
  - Clés de cache : `["alumni","annuaire",filters]`, `["alumni","inscriptions",filters]`, `["alumni","profils",filters]`, `["alumni","imports"]`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `lib/alumni/params.test.ts` :

```ts
import { describe, expect, it } from "vitest";

import { cleanParams } from "./params";

describe("cleanParams", () => {
  it("retire les valeurs vides, nulles et indéfinies", () => {
    expect(
      cleanParams({ search: "", promotion: undefined, secteur: null, page: 2 }),
    ).toEqual({ page: 2 });
  });

  it("conserve les valeurs utiles, y compris les booléens", () => {
    expect(cleanParams({ search: "Doe", a_un_compte: false })).toEqual({
      search: "Doe",
      a_un_compte: false,
    });
  });

  it("renvoie un objet vide quand tout est vide", () => {
    expect(cleanParams({ search: "", page: undefined })).toEqual({});
  });
});
```

Créer `lib/alumni/useDirectory.test.tsx` :

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { queryWrapper } from "@/lib/test-utils";

import { useDirectory } from "./useDirectory";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

const REPONSE = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      first_name: "Awa",
      last_name: "Doe",
      promotion: 2018,
      sector: "numerique",
      sector_display: "Technologies et numérique",
      country: "Bénin",
      current_position: "Développeuse",
      organization: "BAMFA",
    },
  ],
};

describe("useDirectory", () => {
  it("charge l'annuaire", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, REPONSE);

    const { result } = renderHook(() => useDirectory({}), {
      wrapper: queryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results[0].last_name).toBe("Doe");
  });

  it("n'envoie que les filtres renseignés", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, REPONSE);

    const { result } = renderHook(
      () => useDirectory({ search: "Doe", secteur: "", page: 2 }),
      { wrapper: queryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.get[0].params).toEqual({ search: "Doe", page: 2 });
  });
});
```

Créer `lib/alumni/useProfiles.test.tsx` :

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { queryWrapper } from "@/lib/test-utils";

import { useProfileAction, useProfiles } from "./useProfiles";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

describe("useProfiles", () => {
  it("charge la liste d'administration", async () => {
    mock
      .onGet("/alumni/admin/profils/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });

    const { result } = renderHook(() => useProfiles({}), {
      wrapper: queryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(0);
  });
});

describe("useProfileAction", () => {
  it("appelle l'action demandée sur le bon profil", async () => {
    mock.onPost("/alumni/admin/profils/7/suspendre/").reply(200, { id: 7 });

    const { result } = renderHook(() => useProfileAction(), {
      wrapper: queryWrapper(),
    });
    result.current.mutate({ id: 7, action: "suspendre" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.post[0].url).toBe("/alumni/admin/profils/7/suspendre/");
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- lib/alumni`
Attendu : ÉCHEC — `Failed to resolve import "./params"`

- [ ] **Étape 3 : écrire les types**

Créer `lib/alumni/types.ts` :

```ts
export type RegistrationStatus = "en_attente" | "approuvee" | "rejetee";
export type ProfileStatus = "actif" | "suspendu" | "archive";
export type ProfileAction = "suspendre" | "reactiver" | "archiver" | "inviter";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Niveau public de l'annuaire. Les champs enrichis n'arrivent que pour un
 *  utilisateur connecté habilité — d'où leur caractère optionnel. */
export interface DirectoryEntry {
  id: number;
  first_name: string;
  last_name: string;
  promotion: number;
  sector: string;
  sector_display: string;
  country: string;
  current_position: string;
  organization: string;
  city?: string;
  bio?: string;
  linkedin_url?: string;
}

export interface AdminProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  promotion: number;
  country: string;
  phone: string;
  city: string;
  university: string;
  mcf_program: string;
  sector: string;
  sector_display: string;
  current_position: string;
  organization: string;
  bio: string;
  linkedin_url: string;
  birth_date: string | null;
  gender: string;
  directory_consent: boolean;
  status: ProfileStatus;
  status_display: string;
  source: string;
  mandate: number | null;
  completeness: number;
  has_account: boolean;
  user_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  promotion: number;
  country: string;
  phone: string;
  city: string;
  sector: string;
  sector_display: string;
  current_position: string;
  organization: string;
  directory_consent: boolean;
  status: RegistrationStatus;
  status_display: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  rejection_reason: string;
  profile: number | null;
}

export interface ImportReportError {
  id: number;
  line_number: number;
  raw_row: Record<string, string>;
  message: string;
}

export interface ImportReport {
  id: number;
  filename: string;
  strict: boolean;
  created_at: string;
  uploaded_by_email: string | null;
  rows_total: number;
  rows_created: number;
  rows_updated: number;
  rows_skipped: number;
  rows_failed: number;
  errors: ImportReportError[];
}

export interface DirectoryFilters {
  search?: string;
  promotion?: string;
  secteur?: string;
  pays?: string;
  page?: number;
}

export interface AdminProfileFilters extends DirectoryFilters {
  statut?: string;
  consentement?: string;
  a_un_compte?: string;
}

export interface RegistrationFilters {
  search?: string;
  statut?: string;
  page?: number;
}
```

- [ ] **Étape 4 : écrire `cleanParams`**

Créer `lib/alumni/params.ts` :

```ts
type Filters = Record<string, string | number | boolean | null | undefined>;

/** Retire les filtres non renseignés : une chaîne vide envoyée à l'API
 *  filtrerait sur « vide » au lieu de ne pas filtrer du tout. */
export function cleanParams(filters: Filters): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as Record<string, string | number | boolean>;
}
```

- [ ] **Étape 5 : écrire les hooks de lecture**

Créer `lib/alumni/useDirectory.ts` :

```ts
"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

import { cleanParams } from "./params";
import type { DirectoryEntry, DirectoryFilters, Paginated } from "./types";

export function useDirectory(filters: DirectoryFilters) {
  return useQuery<Paginated<DirectoryEntry>>({
    queryKey: ["alumni", "annuaire", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<DirectoryEntry>>(
        "/alumni/annuaire/",
        { params: cleanParams(filters) },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
```

Créer `lib/alumni/useProfiles.ts` :

```ts
"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api/client";

import { cleanParams } from "./params";
import type {
  AdminProfile,
  AdminProfileFilters,
  Paginated,
  ProfileAction,
} from "./types";

export function useProfiles(filters: AdminProfileFilters) {
  return useQuery<Paginated<AdminProfile>>({
    queryKey: ["alumni", "profils", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminProfile>>(
        "/alumni/admin/profils/",
        { params: cleanParams(filters) },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useProfileAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: ProfileAction }) => {
      const { data } = await api.post<AdminProfile>(
        `/alumni/admin/profils/${id}/${action}/`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni", "profils"] });
    },
  });
}
```

Créer `lib/alumni/useRegistrations.ts` :

```ts
"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api/client";

import { cleanParams } from "./params";
import type { Paginated, Registration, RegistrationFilters } from "./types";

export function useRegistrations(filters: RegistrationFilters) {
  return useQuery<Paginated<Registration>>({
    queryKey: ["alumni", "inscriptions", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Registration>>(
        "/alumni/admin/inscriptions/",
        { params: cleanParams(filters) },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

function useReviewMutation(action: "approuver" | "rejeter") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motif }: { id: number; motif?: string }) => {
      const { data } = await api.post(
        `/alumni/admin/inscriptions/${id}/${action}/`,
        action === "rejeter" ? { motif: motif ?? "" } : undefined,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni", "inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["alumni", "profils"] });
    },
  });
}

export function useApproveRegistration() {
  return useReviewMutation("approuver");
}

export function useRejectRegistration() {
  return useReviewMutation("rejeter");
}
```

Créer `lib/alumni/useImports.ts` :

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

import type { ImportReport, Paginated } from "./types";

export function useImports() {
  return useQuery<Paginated<ImportReport>>({
    queryKey: ["alumni", "imports"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ImportReport>>(
        "/alumni/admin/imports/",
      );
      return data;
    },
  });
}

export function useCreateImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, strict }: { file: File; strict: boolean }) => {
      const body = new FormData();
      body.append("fichier", file);
      body.append("strict", String(strict));
      const { data } = await api.post<ImportReport>(
        "/alumni/admin/imports/",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni", "imports"] });
      queryClient.invalidateQueries({ queryKey: ["alumni", "profils"] });
    },
  });
}
```

- [ ] **Étape 6 : vérifier que les tests passent**

Lancer : `npm run test -- lib/alumni`
Attendu : 6 tests verts

- [ ] **Étape 7 : régénérer le schéma OpenAPI**

Le backend doit tourner. Dans un terminal :

```bash
cd plateforme-bamfa-api && .venv/bin/python manage.py runserver
```

Dans un autre :

```bash
cd plateforme-bamfa-frontend && npm run generate:api
git diff --stat lib/api/schema.d.ts   # doit montrer l'ajout des chemins /alumni/
```

- [ ] **Étape 8 : commiter**

```bash
npm run test
git add lib/alumni lib/api/schema.d.ts
git commit -m "feat: client API alumni (types, hooks de lecture et d'action) + schema regenere"
```

---

## Tâche 14 : Formulaire public d'inscription

Validation écrite à la main, comme [`ContactForm.tsx`](../../../plateforme-bamfa-frontend/components/contact/ContactForm.tsx) : **aucune dépendance de formulaire n'est introduite**, la cohérence du dépôt primant sur le confort d'écriture.

**Fichiers**
- Créer : `content/alumni.ts`, `components/alumni/RegistrationForm.tsx`, `app/(public)/alumni/inscription/page.tsx`
- Test : `components/alumni/RegistrationForm.test.tsx`

**Interfaces**
- Consomme : `Field`, `Select`, `Textarea`, `Button`, `Alert` · `api` de `lib/api/client.ts` · `ApiError`.
- Produit : `SECTOR_OPTIONS`, `GENDER_OPTIONS`, `PROMOTION_MIN` (côté front) dans `content/alumni.ts` · `<RegistrationForm />`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/alumni/RegistrationForm.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { RegistrationForm } from "./RegistrationForm";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

async function remplirLeMinimum() {
  await userEvent.type(screen.getByLabelText(/prénom/i), "Awa");
  await userEvent.type(screen.getByLabelText(/^nom/i), "Doe");
  await userEvent.type(screen.getByLabelText(/e-mail/i), "awa@example.org");
  await userEvent.type(screen.getByLabelText(/promotion/i), "2018");
}

describe("RegistrationForm", () => {
  it("refuse la soumission quand les champs obligatoires sont vides", async () => {
    renderWithClient(<RegistrationForm />);

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    expect(screen.getByText("Le prénom est requis.")).toBeInTheDocument();
    expect(screen.getByText("Le nom est requis.")).toBeInTheDocument();
    expect(screen.getByText("L'e-mail est requis.")).toBeInTheDocument();
    expect(screen.getByText("La promotion est requise.")).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it("refuse un e-mail mal formé", async () => {
    renderWithClient(<RegistrationForm />);
    await userEvent.type(screen.getByLabelText(/e-mail/i), "pas-un-email");

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    expect(screen.getByText("Format d'e-mail invalide.")).toBeInTheDocument();
  });

  it("refuse une promotion hors bornes", async () => {
    renderWithClient(<RegistrationForm />);
    await userEvent.type(screen.getByLabelText(/promotion/i), "1990");

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    expect(screen.getByText(/année de promotion invalide/i)).toBeInTheDocument();
  });

  it("soumet la demande et affiche la confirmation", async () => {
    mock.onPost("/alumni/inscriptions/").reply(201, { id: 1 });
    renderWithClient(<RegistrationForm />);
    await remplirLeMinimum();

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() =>
      expect(screen.getByText(/demande a bien été enregistrée/i)).toBeInTheDocument(),
    );
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      first_name: "Awa",
      last_name: "Doe",
      email: "awa@example.org",
      promotion: 2018,
      directory_consent: false,
    });
  });

  it("transmet le consentement quand la case est cochée", async () => {
    mock.onPost("/alumni/inscriptions/").reply(201, { id: 1 });
    renderWithClient(<RegistrationForm />);
    await remplirLeMinimum();
    await userEvent.click(screen.getByLabelText(/annuaire public/i));

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data).directory_consent).toBe(true);
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    mock.onPost("/alumni/inscriptions/").reply(400, {
      error: {
        code: "invalid",
        message: "Requête invalide.",
        details: {
          email: ["Une demande est déjà enregistrée pour cette adresse e-mail."],
        },
      },
    });
    renderWithClient(<RegistrationForm />);
    await remplirLeMinimum();

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Une demande est déjà enregistrée pour cette adresse e-mail.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- RegistrationForm`
Attendu : ÉCHEC — `Failed to resolve import "./RegistrationForm"`

- [ ] **Étape 3 : écrire les listes de choix**

Créer `content/alumni.ts` :

```ts
/** Doit rester aligné sur `Sector` de `apps/alumni/models.py`. */
export const SECTOR_OPTIONS = [
  { value: "agriculture", label: "Agriculture et agro-industrie" },
  { value: "sante", label: "Santé" },
  { value: "education", label: "Éducation et formation" },
  { value: "numerique", label: "Technologies et numérique" },
  { value: "finance", label: "Finance et assurance" },
  { value: "entrepreneuriat", label: "Entrepreneuriat et PME" },
  { value: "energie", label: "Énergie et environnement" },
  { value: "industrie", label: "Industrie et BTP" },
  { value: "commerce", label: "Commerce et distribution" },
  { value: "transport", label: "Transport et logistique" },
  { value: "public", label: "Administration publique" },
  { value: "ong", label: "Société civile et ONG" },
  { value: "culture", label: "Arts, culture et médias" },
  { value: "recherche", label: "Recherche" },
  { value: "autre", label: "Autre" },
];

/** Doit rester aligné sur `Gender` de `apps/alumni/models.py`. */
export const GENDER_OPTIONS = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "autre", label: "Autre" },
  { value: "non_precise", label: "Non précisé" },
];

export const STATUS_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "suspendu", label: "Suspendu" },
  { value: "archive", label: "Archivé" },
];

export const REGISTRATION_STATUS_OPTIONS = [
  { value: "en_attente", label: "En attente" },
  { value: "approuvee", label: "Approuvée" },
  { value: "rejetee", label: "Rejetée" },
];

export const PROMOTION_MIN = 2010;
export const promotionMax = () => new Date().getFullYear() + 1;
```

- [ ] **Étape 4 : écrire le formulaire**

Créer `components/alumni/RegistrationForm.tsx` :

```tsx
"use client";

import { useState } from "react";

import { GENDER_OPTIONS, PROMOTION_MIN, SECTOR_OPTIONS, promotionMax } from "@/content/alumni";
import { ApiError, api } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const VIDE = {
  first_name: "",
  last_name: "",
  email: "",
  promotion: "",
  country: "Bénin",
  phone: "",
  city: "",
  university: "",
  mcf_program: "",
  sector: "",
  current_position: "",
  organization: "",
  bio: "",
  linkedin_url: "",
  gender: "",
};

type Valeurs = typeof VIDE;
type Erreurs = Partial<Record<keyof Valeurs, string>>;

function extraireErreursApi(erreur: unknown): { champs: Erreurs; global: string } {
  if (erreur instanceof ApiError) {
    const details = (erreur.data as { error?: { details?: Record<string, string[]> } })
      ?.error?.details;
    if (details) {
      const champs: Erreurs = {};
      for (const [champ, messages] of Object.entries(details)) {
        if (champ in VIDE) champs[champ as keyof Valeurs] = messages[0];
      }
      if (Object.keys(champs).length > 0) return { champs, global: "" };
    }
  }
  return {
    champs: {},
    global: "L'envoi a échoué. Veuillez réessayer dans quelques instants.",
  };
}

export function RegistrationForm() {
  const [valeurs, setValeurs] = useState<Valeurs>(VIDE);
  const [consentement, setConsentement] = useState(false);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [erreurGlobale, setErreurGlobale] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  function set(champ: keyof Valeurs, valeur: string) {
    setValeurs((v) => ({ ...v, [champ]: valeur }));
  }

  function valider(): Erreurs {
    const e: Erreurs = {};
    if (!valeurs.first_name.trim()) e.first_name = "Le prénom est requis.";
    if (!valeurs.last_name.trim()) e.last_name = "Le nom est requis.";
    if (!valeurs.email.trim()) e.email = "L'e-mail est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email))
      e.email = "Format d'e-mail invalide.";
    if (!valeurs.promotion.trim()) e.promotion = "La promotion est requise.";
    else {
      const annee = Number(valeurs.promotion);
      if (!Number.isInteger(annee) || annee < PROMOTION_MIN || annee > promotionMax())
        e.promotion = `Année de promotion invalide (entre ${PROMOTION_MIN} et ${promotionMax()}).`;
    }
    if (!valeurs.country.trim()) e.country = "Le pays est requis.";
    return e;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErreurGlobale("");
    const e = valider();
    setErreurs(e);
    if (Object.keys(e).length > 0) return;

    setEnvoi(true);
    try {
      await api.post("/alumni/inscriptions/", {
        ...valeurs,
        promotion: Number(valeurs.promotion),
        directory_consent: consentement,
      });
      setEnvoye(true);
      setValeurs(VIDE);
      setConsentement(false);
    } catch (erreur) {
      const { champs, global } = extraireErreursApi(erreur);
      setErreurs(champs);
      setErreurGlobale(global);
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <Alert variant="success">
        Votre demande a bien été enregistrée. Vous recevrez un e-mail dès qu'elle
        aura été examinée par l'équipe BAMFA.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {erreurGlobale && <Alert variant="danger">{erreurGlobale}</Alert>}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-mono text-xs uppercase tracking-[0.15em] text-flame-ink">
          Identité
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Prénom"
            value={valeurs.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            error={erreurs.first_name}
          />
          <Field
            label="Nom"
            value={valeurs.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            error={erreurs.last_name}
          />
          <Field
            label="Adresse e-mail"
            type="email"
            value={valeurs.email}
            onChange={(e) => set("email", e.target.value)}
            error={erreurs.email}
          />
          <Field
            label="Téléphone"
            value={valeurs.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Field
            label="Pays"
            value={valeurs.country}
            onChange={(e) => set("country", e.target.value)}
            error={erreurs.country}
          />
          <Field
            label="Ville"
            value={valeurs.city}
            onChange={(e) => set("city", e.target.value)}
          />
          <Select
            label="Genre"
            options={GENDER_OPTIONS}
            placeholder="Non précisé"
            value={valeurs.gender}
            onChange={(e) => set("gender", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-mono text-xs uppercase tracking-[0.15em] text-flame-ink">
          Parcours
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Promotion"
            type="number"
            inputMode="numeric"
            value={valeurs.promotion}
            onChange={(e) => set("promotion", e.target.value)}
            error={erreurs.promotion}
          />
          <Field
            label="Université"
            value={valeurs.university}
            onChange={(e) => set("university", e.target.value)}
          />
          <Field
            label="Programme MCF"
            value={valeurs.mcf_program}
            onChange={(e) => set("mcf_program", e.target.value)}
          />
          <Select
            label="Secteur d'activité"
            options={SECTOR_OPTIONS}
            placeholder="Non précisé"
            value={valeurs.sector}
            onChange={(e) => set("sector", e.target.value)}
          />
          <Field
            label="Poste actuel"
            value={valeurs.current_position}
            onChange={(e) => set("current_position", e.target.value)}
          />
          <Field
            label="Organisation"
            value={valeurs.organization}
            onChange={(e) => set("organization", e.target.value)}
          />
          <Field
            label="Profil LinkedIn"
            type="url"
            value={valeurs.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
          />
        </div>
        <Textarea
          label="Biographie"
          rows={4}
          value={valeurs.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-mono text-xs uppercase tracking-[0.15em] text-flame-ink">
          Confidentialité
        </legend>
        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={consentement}
            onChange={(e) => setConsentement(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded-sm border-ink/25 text-flame focus-visible:ring-2 focus-visible:ring-flame"
          />
          <span>
            J'accepte de figurer dans l'annuaire public des alumni BAMFA. Mon
            adresse e-mail et mon téléphone ne seront jamais publiés. Ce choix
            est révocable à tout moment.
          </span>
        </label>
      </fieldset>

      <Button type="submit" loading={envoi} className="self-start">
        Envoyer ma demande
      </Button>
    </form>
  );
}
```

> La case à cocher porte le texte « annuaire public », ce qui permet au test de la retrouver par `getByLabelText(/annuaire public/i)`.

- [ ] **Étape 5 : écrire la page**

Créer `app/(public)/alumni/inscription/page.tsx` :

```tsx
import type { Metadata } from "next";

import { RegistrationForm } from "@/components/alumni/RegistrationForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/sections/PageHeader";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Rejoindre BAMFA — Inscription alumni",
  description:
    "Formulaire d'inscription à la Benin Association of the Mastercard Foundation Alumni. Votre demande est examinée par l'équipe BAMFA.",
};

export default function InscriptionAlumniPage() {
  return (
    <>
      <PageHeader
        title="Rejoindre la communauté BAMFA"
        intro="Remplissez ce formulaire pour demander votre inscription. Votre demande sera examinée par l'équipe, puis vous recevrez un e-mail pour activer votre accès."
      />
      <Section>
        <Container className="max-w-3xl">
          <RegistrationForm />
        </Container>
      </Section>
    </>
  );
}
```

> Contrats vérifiés : `PageHeader` prend `{ title: string; intro?: string }` — **il n'accepte ni `eyebrow` ni `description`**. `Section` prend `{ className?, children }`. Ne pas les modifier.

- [ ] **Étape 6 : vérifier que les tests passent**

Lancer : `npm run test -- RegistrationForm`
Attendu : 6 passed

- [ ] **Étape 7 : commiter**

```bash
npm run test && npm run build
git add content/alumni.ts components/alumni app/\(public\)/alumni
git commit -m "feat: formulaire et page publique d'inscription alumni"
```

---

## Tâche 15 : Annuaire public

**Fichiers**
- Créer : `components/alumni/DirectoryCard.tsx`, `components/alumni/DirectoryFilters.tsx`, `components/alumni/Directory.tsx`, `app/(public)/alumni/page.tsx`
- Modifier : `components/layout/Header.tsx:10-14` (entrée de navigation)
- Test : `components/alumni/Directory.test.tsx`, `components/layout/Header.test.tsx` (existant, à compléter)

**Interfaces**
- Consomme : `useDirectory` (tâche 13) · `Pagination`, `Select`, `Field`, `Spinner`, `Alert`, `Badge` · `SECTOR_OPTIONS`.
- Produit : `<DirectoryCard entry />` · `<DirectoryFilters values onChange />` · `<Directory />` (assemble filtres, liste et pagination).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/alumni/Directory.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { Directory } from "./Directory";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

const ENTREE = {
  id: 1,
  first_name: "Awa",
  last_name: "Doe",
  promotion: 2018,
  sector: "numerique",
  sector_display: "Technologies et numérique",
  country: "Bénin",
  current_position: "Développeuse",
  organization: "BAMFA",
};

function reponse(results: unknown[], count = results.length) {
  return { count, next: null, previous: null, results };
}

describe("Directory", () => {
  it("affiche les alumni renvoyés par l'API", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, reponse([ENTREE]));

    renderWithClient(<Directory />);

    expect(await screen.findByText("Awa Doe")).toBeInTheDocument();
    expect(screen.getByText("Technologies et numérique")).toBeInTheDocument();
    expect(screen.getByText(/Développeuse/)).toBeInTheDocument();
  });

  it("n'affiche jamais d'adresse e-mail ni de téléphone", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, reponse([ENTREE]));

    renderWithClient(<Directory />);
    await screen.findByText("Awa Doe");

    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("affiche un message quand l'annuaire est vide", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, reponse([]));

    renderWithClient(<Directory />);

    expect(
      await screen.findByText(/aucun alumni ne correspond/i),
    ).toBeInTheDocument();
  });

  it("envoie le filtre de secteur choisi", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, reponse([ENTREE]));
    renderWithClient(<Directory />);
    await screen.findByText("Awa Doe");

    await userEvent.selectOptions(screen.getByLabelText(/secteur/i), "sante");

    await waitFor(() =>
      expect(
        mock.history.get.some((appel) => appel.params?.secteur === "sante"),
      ).toBe(true),
    );
  });

  it("affiche la pagination au-delà d'une page", async () => {
    mock.onGet("/alumni/annuaire/").reply(200, reponse([ENTREE], 45));

    renderWithClient(<Directory />);

    expect(await screen.findByText("Page 1 sur 3")).toBeInTheDocument();
  });

  it("affiche une erreur quand l'API échoue", async () => {
    mock.onGet("/alumni/annuaire/").reply(500);

    renderWithClient(<Directory />);

    expect(
      await screen.findByText(/annuaire n'a pas pu être chargé/i),
    ).toBeInTheDocument();
  });
});
```

Ajouter à `components/layout/Header.test.tsx` :

```tsx
it("propose l'entrée Alumni", () => {
  render(<Header />);

  expect(screen.getByRole("link", { name: "Alumni" })).toHaveAttribute(
    "href",
    "/alumni",
  );
});
```

> Reprendre les imports et le rendu déjà utilisés dans ce fichier de test ; ne pas dupliquer un `describe` s'il en existe déjà un.

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- Directory Header`
Attendu : ÉCHEC — module `./Directory` introuvable, et pas de lien `Alumni`.

- [ ] **Étape 3 : écrire la carte d'annuaire**

Créer `components/alumni/DirectoryCard.tsx` :

```tsx
import { Badge } from "@/components/ui/Badge";
import { cardShell, monoLabel } from "@/components/ui/styles";
import type { DirectoryEntry } from "@/lib/alumni/types";

export function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  const poste = [entry.current_position, entry.organization]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={`${cardShell} flex flex-col gap-3 p-5`}>
      <div>
        <h3 className="font-heading text-lg font-semibold text-ink">
          {entry.first_name} {entry.last_name}
        </h3>
        <p className={`${monoLabel} mt-1 text-stone-600`}>
          Promotion {entry.promotion}
        </p>
      </div>
      {poste && <p className="text-sm text-stone-700">{poste}</p>}
      {entry.bio && <p className="text-sm text-stone-600">{entry.bio}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {entry.sector_display && <Badge>{entry.sector_display}</Badge>}
        <span className="text-xs text-stone-600">
          {[entry.city, entry.country].filter(Boolean).join(", ")}
        </span>
      </div>
      {entry.linkedin_url && (
        <a
          href={entry.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-flame-ink underline-offset-4 hover:underline"
        >
          Profil LinkedIn
        </a>
      )}
    </article>
  );
}
```

- [ ] **Étape 4 : écrire la barre de filtres**

Créer `components/alumni/DirectoryFilters.tsx` :

```tsx
"use client";

import { SECTOR_OPTIONS } from "@/content/alumni";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { DirectoryFilters as Filters } from "@/lib/alumni/types";

interface Props {
  values: Filters;
  onChange: (values: Filters) => void;
}

export function DirectoryFilters({ values, onChange }: Props) {
  function set(champ: keyof Filters, valeur: string) {
    // Tout changement de filtre ramène à la première page : rester sur la
    // page 3 d'un résultat qui n'en a plus qu'une afficherait un vide trompeur.
    onChange({ ...values, [champ]: valeur, page: 1 });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field
        label="Rechercher"
        placeholder="Nom, organisation, poste"
        value={values.search ?? ""}
        onChange={(e) => set("search", e.target.value)}
      />
      <Field
        label="Promotion"
        type="number"
        inputMode="numeric"
        placeholder="Toutes"
        value={values.promotion ?? ""}
        onChange={(e) => set("promotion", e.target.value)}
      />
      <Select
        label="Secteur"
        options={SECTOR_OPTIONS}
        placeholder="Tous les secteurs"
        value={values.secteur ?? ""}
        onChange={(e) => set("secteur", e.target.value)}
      />
      <Field
        label="Pays"
        placeholder="Tous"
        value={values.pays ?? ""}
        onChange={(e) => set("pays", e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Étape 5 : écrire l'assemblage**

Créer `components/alumni/Directory.tsx` :

```tsx
"use client";

import { useState } from "react";

import { useDirectory } from "@/lib/alumni/useDirectory";
import type { DirectoryFilters as Filters } from "@/lib/alumni/types";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";

import { DirectoryCard } from "./DirectoryCard";
import { DirectoryFilters } from "./DirectoryFilters";

const PAGE_SIZE = 20;

export function Directory() {
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const { data, isLoading, isError } = useDirectory(filters);

  return (
    <div className="flex flex-col gap-8">
      <DirectoryFilters values={filters} onChange={setFilters} />

      {isError && (
        <Alert variant="danger">
          L'annuaire n'a pas pu être chargé. Veuillez réessayer dans quelques
          instants.
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 text-flame-ink" />
        </div>
      )}

      {data && data.results.length === 0 && (
        <Alert variant="info">
          Aucun alumni ne correspond à votre recherche.
        </Alert>
      )}

      {data && data.results.length > 0 && (
        <>
          <p className="font-mono text-xs text-stone-600">
            {data.count} alumni référencé{data.count > 1 ? "s" : ""}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((entry) => (
              <DirectoryCard key={entry.id} entry={entry} />
            ))}
          </div>
          <Pagination
            count={data.count}
            page={filters.page ?? 1}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Étape 6 : écrire la page et l'entrée de navigation**

Créer `app/(public)/alumni/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { Directory } from "@/components/alumni/Directory";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/sections/PageHeader";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Annuaire des alumni — BAMFA",
  description:
    "Découvrez les alumni de la Mastercard Foundation au Bénin : promotions, secteurs d'activité et parcours professionnels.",
};

export default function AnnuaireAlumniPage() {
  return (
    <>
      <PageHeader
        title="Annuaire des alumni"
        intro="La communauté BAMFA en un coup d'œil. Seuls les alumni ayant accepté la publication de leur profil y figurent."
      />
      <Section>
        <Container className="flex flex-col gap-8">
          <p className="text-sm text-stone-600">
            Vous êtes alumni de la Mastercard Foundation au Bénin ?{" "}
            <Link
              href="/alumni/inscription"
              className="text-flame-ink underline-offset-4 hover:underline"
            >
              Demandez votre inscription
            </Link>
            .
          </p>
          <Directory />
        </Container>
      </Section>
    </>
  );
}
```

Dans `components/layout/Header.tsx`, ajouter l'entrée au tableau `NAV` :

```tsx
const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/alumni", label: "Alumni" },
  { href: "/contact", label: "Contact" },
];
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `npm run test -- Directory Header`
Attendu : les 6 tests de `Directory` verts, ceux de `Header` verts (l'ancien test de navigation compris).

- [ ] **Étape 8 : commiter**

```bash
npm run test && npm run build
git add components/alumni components/layout/Header.tsx app/\(public\)/alumni
git commit -m "feat: annuaire public des alumni (recherche, filtres, pagination) + entree de navigation"
```

---

## Tâche 16 : Activation de l'accès par lien d'invitation

**Fichiers**
- Créer : `components/alumni/ActivationForm.tsx`, `app/(public)/alumni/activation/page.tsx`
- Test : `components/alumni/ActivationForm.test.tsx`

**Interfaces**
- Consomme : `api`, `ApiError` · `Field`, `Button`, `Alert`, `Spinner`.
- Produit : `<ActivationForm token />`. Le composant enchaîne `POST /alumni/invitation/verifier/` au montage, puis `POST /alumni/invitation/activer/` à la soumission.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/alumni/ActivationForm.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { ActivationForm } from "./ActivationForm";

const mock = new MockAdapter(api);

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push }),
}));

afterEach(() => {
  mock.reset();
  push.mockReset();
});

const MOT_DE_PASSE = "un-mot-de-passe-solide-42";

describe("ActivationForm", () => {
  it("affiche une erreur quand aucun jeton n'est fourni", async () => {
    renderWithClient(<ActivationForm token={null} />);

    expect(
      await screen.findByText(/lien d'activation est incomplet/i),
    ).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it("accueille l'alumni par son prénom après vérification du jeton", async () => {
    mock
      .onPost("/alumni/invitation/verifier/")
      .reply(200, { first_name: "Awa", email: "awa@example.org" });

    renderWithClient(<ActivationForm token="jeton-valide" />);

    expect(await screen.findByText(/Bonjour Awa/)).toBeInTheDocument();
    expect(screen.getByText("awa@example.org")).toBeInTheDocument();
  });

  it("affiche le message du serveur quand le jeton est expiré", async () => {
    mock.onPost("/alumni/invitation/verifier/").reply(400, {
      error: {
        code: "invalid",
        message: "Requête invalide.",
        details: { token: ["Ce lien d'invitation a expiré."] },
      },
    });

    renderWithClient(<ActivationForm token="jeton-expire" />);

    expect(
      await screen.findByText("Ce lien d'invitation a expiré."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument();
  });

  it("refuse une confirmation de mot de passe différente", async () => {
    mock
      .onPost("/alumni/invitation/verifier/")
      .reply(200, { first_name: "Awa", email: "awa@example.org" });
    renderWithClient(<ActivationForm token="jeton-valide" />);
    await screen.findByText(/Bonjour Awa/);

    await userEvent.type(screen.getByLabelText("Mot de passe"), MOT_DE_PASSE);
    await userEvent.type(screen.getByLabelText("Confirmation"), "autre-chose");
    await userEvent.click(screen.getByRole("button", { name: /activer/i }));

    expect(
      screen.getByText("Les deux mots de passe ne correspondent pas."),
    ).toBeInTheDocument();
    expect(
      mock.history.post.filter((a) => a.url?.includes("activer")),
    ).toHaveLength(0);
  });

  it("active le compte puis redirige vers la connexion", async () => {
    mock
      .onPost("/alumni/invitation/verifier/")
      .reply(200, { first_name: "Awa", email: "awa@example.org" });
    mock
      .onPost("/alumni/invitation/activer/")
      .reply(200, { created: true, detail: "Votre accès est activé." });
    renderWithClient(<ActivationForm token="jeton-valide" />);
    await screen.findByText(/Bonjour Awa/);

    await userEvent.type(screen.getByLabelText("Mot de passe"), MOT_DE_PASSE);
    await userEvent.type(screen.getByLabelText("Confirmation"), MOT_DE_PASSE);
    await userEvent.click(screen.getByRole("button", { name: /activer/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/connexion"));
  });

  it("remonte les messages de validation du mot de passe", async () => {
    mock
      .onPost("/alumni/invitation/verifier/")
      .reply(200, { first_name: "Awa", email: "awa@example.org" });
    mock.onPost("/alumni/invitation/activer/").reply(400, {
      error: {
        code: "invalid",
        message: "Requête invalide.",
        details: { password: ["Ce mot de passe est trop court."] },
      },
    });
    renderWithClient(<ActivationForm token="jeton-valide" />);
    await screen.findByText(/Bonjour Awa/);

    await userEvent.type(screen.getByLabelText("Mot de passe"), "court");
    await userEvent.type(screen.getByLabelText("Confirmation"), "court");
    await userEvent.click(screen.getByRole("button", { name: /activer/i }));

    expect(
      await screen.findByText("Ce mot de passe est trop court."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- ActivationForm`
Attendu : ÉCHEC — module `./ActivationForm` introuvable.

- [ ] **Étape 3 : écrire le composant**

Créer `components/alumni/ActivationForm.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";

interface Identite {
  first_name: string;
  email: string;
}

/** Extrait le premier message d'un champ du format d'erreur normalisé de l'API. */
function messageApi(erreur: unknown, champ: string, repli: string): string {
  if (erreur instanceof ApiError) {
    const details = (erreur.data as { error?: { details?: Record<string, string[]> } })
      ?.error?.details;
    const messages = details?.[champ];
    if (messages?.length) return messages[0];
  }
  return repli;
}

export function ActivationForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [erreurJeton, setErreurJeton] = useState("");
  const [verification, setVerification] = useState(true);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurMotDePasse, setErreurMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!token) {
      setErreurJeton(
        "Ce lien d'activation est incomplet. Ouvrez-le depuis l'e-mail que vous avez reçu.",
      );
      setVerification(false);
      return;
    }
    let annule = false;
    async function verifier() {
      try {
        const { data } = await api.post<Identite>(
          "/alumni/invitation/verifier/",
          { token },
        );
        if (!annule) setIdentite(data);
      } catch (erreur) {
        if (!annule)
          setErreurJeton(
            messageApi(
              erreur,
              "token",
              "Ce lien d'invitation est invalide ou a expiré.",
            ),
          );
      } finally {
        if (!annule) setVerification(false);
      }
    }
    verifier();
    return () => {
      annule = true;
    };
  }, [token]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErreurMotDePasse("");
    if (!motDePasse) {
      setErreurMotDePasse("Le mot de passe est requis.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreurMotDePasse("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnvoi(true);
    try {
      await api.post("/alumni/invitation/activer/", {
        token,
        password: motDePasse,
      });
      router.push("/connexion");
    } catch (erreur) {
      setErreurMotDePasse(
        messageApi(
          erreur,
          "password",
          messageApi(
            erreur,
            "token",
            "L'activation a échoué. Veuillez réessayer.",
          ),
        ),
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (verification) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8 text-flame-ink" />
      </div>
    );
  }

  if (erreurJeton) {
    return <Alert variant="danger">{erreurJeton}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <p className="font-heading text-2xl font-semibold text-ink">
          Bonjour {identite?.first_name}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Choisissez un mot de passe pour activer l'accès associé à{" "}
          <span className="font-mono text-ink">{identite?.email}</span>.
        </p>
      </div>

      <Field
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        error={erreurMotDePasse}
      />
      <Field
        label="Confirmation"
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />

      <Button type="submit" loading={envoi} className="self-start">
        Activer mon accès
      </Button>
    </form>
  );
}
```

- [ ] **Étape 4 : écrire la page**

Créer `app/(public)/alumni/activation/page.tsx` :

```tsx
import type { Metadata } from "next";

import { ActivationForm } from "@/components/alumni/ActivationForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/sections/PageHeader";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Activer mon accès — BAMFA",
  robots: { index: false, follow: false },
};

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <PageHeader
        title="Activer mon accès"
        intro="Dernière étape : définissez le mot de passe qui vous servira à vous connecter à la plateforme BAMFA."
      />
      <Section>
        <Container className="max-w-md">
          <ActivationForm token={token ?? null} />
        </Container>
      </Section>
    </>
  );
}
```

> `searchParams` est une promesse dans Next.js 15 : la page est `async` et l'attend. La page est exclue de l'indexation (`robots`) — un lien d'activation n'a rien à faire dans un moteur de recherche.

- [ ] **Étape 5 : vérifier que les tests passent**

Lancer : `npm run test -- ActivationForm`
Attendu : 6 passed

- [ ] **Étape 6 : commiter**

```bash
npm run test && npm run build
git add components/alumni/ActivationForm.tsx components/alumni/ActivationForm.test.tsx app/\(public\)/alumni/activation
git commit -m "feat: activation de l'acces alumni par lien d'invitation (definition du mot de passe)"
```

---

## Tâche 17 : Back-office — profils alumni

**Fichiers**
- Créer : `components/admin/alumni/ProfilesTable.tsx`, `components/admin/alumni/ProfileFilters.tsx`, `components/admin/alumni/ProfilesView.tsx`, `app/(admin)/admin/alumni/page.tsx`
- Modifier : `components/admin/Sidebar.tsx:16-21`
- Test : `components/admin/alumni/ProfilesView.test.tsx`, `app/(admin)/admin-layout.test.tsx` ou le test existant du `Sidebar`

**Interfaces**
- Consomme : `useProfiles`, `useProfileAction` (tâche 13) · `Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td`, `Pagination`, `Select`, `Field`, `Badge`, `Button`, `Alert`, `Spinner`.
- Produit : `<ProfilesView />` (assemblage complet), `<ProfilesTable profiles onAction pending />`, `<ProfileFilters values onChange />`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/admin/alumni/ProfilesView.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { ProfilesView } from "./ProfilesView";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

const PROFIL = {
  id: 7,
  first_name: "Awa",
  last_name: "Doe",
  email: "awa@example.org",
  promotion: 2018,
  country: "Bénin",
  phone: "+229 90 00 00 00",
  city: "Cotonou",
  university: "",
  mcf_program: "",
  sector: "numerique",
  sector_display: "Technologies et numérique",
  current_position: "Développeuse",
  organization: "BAMFA",
  bio: "",
  linkedin_url: "",
  birth_date: null,
  gender: "",
  directory_consent: true,
  status: "actif",
  status_display: "Actif",
  source: "import",
  mandate: null,
  completeness: 45,
  has_account: false,
  user_email: null,
  created_at: "2026-08-01T10:00:00Z",
  updated_at: "2026-08-01T10:00:00Z",
};

function reponse(results: unknown[], count = results.length) {
  return { count, next: null, previous: null, results };
}

describe("ProfilesView", () => {
  it("affiche les profils avec leurs données d'administration", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([PROFIL]));

    renderWithClient(<ProfilesView />);

    expect(await screen.findByText("Doe Awa")).toBeInTheDocument();
    expect(screen.getByText("awa@example.org")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("45 %")).toBeInTheDocument();
  });

  it("signale les profils sans compte de connexion", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([PROFIL]));

    renderWithClient(<ProfilesView />);

    expect(await screen.findByText("Sans compte")).toBeInTheDocument();
  });

  it("affiche un message quand la base est vide", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([]));

    renderWithClient(<ProfilesView />);

    expect(await screen.findByText(/aucun profil/i)).toBeInTheDocument();
  });

  it("suspend un profil", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([PROFIL]));
    mock.onPost("/alumni/admin/profils/7/suspendre/").reply(200, PROFIL);
    renderWithClient(<ProfilesView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Suspendre" }));

    await waitFor(() =>
      expect(mock.history.post[0].url).toBe("/alumni/admin/profils/7/suspendre/"),
    );
  });

  it("propose de réactiver un profil suspendu et non de le suspendre", async () => {
    mock
      .onGet("/alumni/admin/profils/")
      .reply(200, reponse([{ ...PROFIL, status: "suspendu", status_display: "Suspendu" }]));

    renderWithClient(<ProfilesView />);
    await screen.findByText("Doe Awa");

    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Suspendre" }),
    ).not.toBeInTheDocument();
  });

  it("invite un profil sans compte", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([PROFIL]));
    mock.onPost("/alumni/admin/profils/7/inviter/").reply(200, PROFIL);
    renderWithClient(<ProfilesView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Inviter" }));

    await waitFor(() =>
      expect(mock.history.post[0].url).toBe("/alumni/admin/profils/7/inviter/"),
    );
  });

  it("n'offre pas d'inviter un profil qui a déjà un compte", async () => {
    mock.onGet("/alumni/admin/profils/").reply(
      200,
      reponse([{ ...PROFIL, has_account: true, user_email: "awa@example.org" }]),
    );

    renderWithClient(<ProfilesView />);
    await screen.findByText("Doe Awa");

    expect(screen.queryByRole("button", { name: "Inviter" })).not.toBeInTheDocument();
  });

  it("envoie le filtre de statut choisi", async () => {
    mock.onGet("/alumni/admin/profils/").reply(200, reponse([PROFIL]));
    renderWithClient(<ProfilesView />);
    await screen.findByText("Doe Awa");

    await userEvent.selectOptions(screen.getByLabelText(/statut/i), "suspendu");

    await waitFor(() =>
      expect(
        mock.history.get.some((appel) => appel.params?.statut === "suspendu"),
      ).toBe(true),
    );
  });

  it("affiche une erreur quand l'API échoue", async () => {
    mock.onGet("/alumni/admin/profils/").reply(500);

    renderWithClient(<ProfilesView />);

    expect(
      await screen.findByText(/profils n'ont pas pu être chargés/i),
    ).toBeInTheDocument();
  });
});
```

Créer `components/admin/Sidebar.test.tsx` — **il n'existe pas** : le seul test du back-office est `app/(admin)/admin-layout.test.tsx`, qui monte `AdminLayout` avec `useAuth` simulé et ne teste pas la navigation.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sidebar } from "./Sidebar";

const USER = {
  id: 1,
  email: "admin@bamfa.org",
  first_name: "Ada",
  last_name: "Lovelace",
  is_staff: true,
  is_superuser: true,
  roles: ["Administrateur"],
};

describe("Sidebar", () => {
  it("mène à la page des profils alumni", () => {
    render(<Sidebar user={USER} />);

    expect(screen.getByRole("link", { name: "Alumni" })).toHaveAttribute(
      "href",
      "/admin/alumni",
    );
  });

  it("laisse les modules non livrés marqués « À venir »", () => {
    render(<Sidebar user={USER} />);

    expect(screen.queryByRole("link", { name: /Contenus/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("À venir")).toHaveLength(2);
  });
});
```

> Le second cas verrouille la régression inverse : après S7, il ne doit rester que **deux** entrées « À venir » (Contenus et Événements).

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- ProfilesView Sidebar`
Attendu : ÉCHEC — module `./ProfilesView` introuvable, et `Alumni` n'est pas un lien (`getByRole("link")` échoue : c'est encore un `<span aria-disabled>`).

- [ ] **Étape 3 : écrire la barre de filtres**

Créer `components/admin/alumni/ProfileFilters.tsx` :

```tsx
"use client";

import { SECTOR_OPTIONS, STATUS_OPTIONS } from "@/content/alumni";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { AdminProfileFilters } from "@/lib/alumni/types";

const COMPTE_OPTIONS = [
  { value: "true", label: "Avec compte" },
  { value: "false", label: "Sans compte" },
];

const CONSENTEMENT_OPTIONS = [
  { value: "true", label: "Publié dans l'annuaire" },
  { value: "false", label: "Non publié" },
];

interface Props {
  values: AdminProfileFilters;
  onChange: (values: AdminProfileFilters) => void;
}

export function ProfileFilters({ values, onChange }: Props) {
  function set(champ: keyof AdminProfileFilters, valeur: string) {
    onChange({ ...values, [champ]: valeur, page: 1 });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Field
        label="Rechercher"
        placeholder="Nom, e-mail, organisation"
        value={values.search ?? ""}
        onChange={(e) => set("search", e.target.value)}
      />
      <Select
        label="Statut"
        options={STATUS_OPTIONS}
        placeholder="Tous"
        value={values.statut ?? ""}
        onChange={(e) => set("statut", e.target.value)}
      />
      <Field
        label="Promotion"
        type="number"
        inputMode="numeric"
        placeholder="Toutes"
        value={values.promotion ?? ""}
        onChange={(e) => set("promotion", e.target.value)}
      />
      <Select
        label="Secteur"
        options={SECTOR_OPTIONS}
        placeholder="Tous"
        value={values.secteur ?? ""}
        onChange={(e) => set("secteur", e.target.value)}
      />
      <Select
        label="Compte"
        options={COMPTE_OPTIONS}
        placeholder="Peu importe"
        value={values.a_un_compte ?? ""}
        onChange={(e) => set("a_un_compte", e.target.value)}
      />
      <Select
        label="Annuaire"
        options={CONSENTEMENT_OPTIONS}
        placeholder="Peu importe"
        value={values.consentement ?? ""}
        onChange={(e) => set("consentement", e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Étape 4 : écrire la table**

Créer `components/admin/alumni/ProfilesTable.tsx` :

```tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import type { AdminProfile, ProfileAction } from "@/lib/alumni/types";

interface Props {
  profiles: AdminProfile[];
  onAction: (id: number, action: ProfileAction) => void;
  pending: boolean;
}

export function ProfilesTable({ profiles, onAction, pending }: Props) {
  return (
    <Table caption="Profils alumni">
      <Thead>
        <Tr>
          <Th>Alumni</Th>
          <Th>Contact</Th>
          <Th>Promotion</Th>
          <Th>Statut</Th>
          <Th>Complétude</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {profiles.map((profile) => (
          <Tr key={profile.id}>
            <Td>
              <span className="font-medium">
                {profile.last_name} {profile.first_name}
              </span>
              {profile.sector_display && (
                <span className="mt-1 block text-xs text-stone-600">
                  {profile.sector_display}
                </span>
              )}
            </Td>
            <Td>
              <span className="block font-mono text-xs">{profile.email}</span>
              {profile.phone && (
                <span className="block text-xs text-stone-600">{profile.phone}</span>
              )}
            </Td>
            <Td>{profile.promotion}</Td>
            <Td>
              <div className="flex flex-col items-start gap-1">
                <Badge>{profile.status_display}</Badge>
                {!profile.has_account && (
                  <span className="text-xs text-stone-600">Sans compte</span>
                )}
              </div>
            </Td>
            <Td>{profile.completeness} %</Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {profile.status === "actif" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAction(profile.id, "suspendre")}
                  >
                    Suspendre
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAction(profile.id, "reactiver")}
                  >
                    Réactiver
                  </Button>
                )}
                {profile.status !== "archive" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAction(profile.id, "archiver")}
                  >
                    Archiver
                  </Button>
                )}
                {!profile.has_account && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAction(profile.id, "inviter")}
                  >
                    Inviter
                  </Button>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
```

- [ ] **Étape 5 : écrire l'assemblage**

Créer `components/admin/alumni/ProfilesView.tsx` :

```tsx
"use client";

import { useState } from "react";

import type { AdminProfileFilters, ProfileAction } from "@/lib/alumni/types";
import { useProfileAction, useProfiles } from "@/lib/alumni/useProfiles";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";

import { ProfileFilters } from "./ProfileFilters";
import { ProfilesTable } from "./ProfilesTable";

const PAGE_SIZE = 20;

export function ProfilesView() {
  const [filters, setFilters] = useState<AdminProfileFilters>({ page: 1 });
  const { data, isLoading, isError } = useProfiles(filters);
  const action = useProfileAction();

  function onAction(id: number, nom: ProfileAction) {
    action.mutate({ id, action: nom });
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileFilters values={filters} onChange={setFilters} />

      {isError && (
        <Alert variant="danger">
          Les profils n'ont pas pu être chargés. Veuillez réessayer.
        </Alert>
      )}
      {action.isError && (
        <Alert variant="danger">
          L'action n'a pas pu être appliquée. Veuillez réessayer.
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 text-flame-ink" />
        </div>
      )}

      {data && data.results.length === 0 && (
        <Alert variant="info">Aucun profil ne correspond à ces critères.</Alert>
      )}

      {data && data.results.length > 0 && (
        <>
          <p className="font-mono text-xs text-stone-600">
            {data.count} profil{data.count > 1 ? "s" : ""}
          </p>
          <ProfilesTable
            profiles={data.results}
            onAction={onAction}
            pending={action.isPending}
          />
          <Pagination
            count={data.count}
            page={filters.page ?? 1}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Étape 6 : écrire la page et corriger le `Sidebar`**

Créer `app/(admin)/admin/alumni/page.tsx` :

```tsx
"use client";

import Link from "next/link";

import { ProfilesView } from "@/components/admin/alumni/ProfilesView";

export default function AdminAlumniPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-flame-ink">
          Alumni
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-ink">
          Profils alumni
        </h1>
        <p className="mt-3 text-stone-600">
          La base complète des membres BAMFA, tous statuts confondus.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href="/admin/alumni/inscriptions"
            className="text-flame-ink underline-offset-4 hover:underline"
          >
            Demandes d'inscription
          </Link>
          <Link
            href="/admin/alumni/imports"
            className="text-flame-ink underline-offset-4 hover:underline"
          >
            Imports
          </Link>
        </div>
      </div>
      <ProfilesView />
    </div>
  );
}
```

Dans `components/admin/Sidebar.tsx`, remplacer l'entrée Alumni du tableau `NAV` :

```tsx
const NAV: NavItem[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Contenus", icon: FileText, soon: true },
  { label: "Alumni", href: "/admin/alumni", icon: Users },
  { label: "Événements", icon: Calendar, soon: true },
];
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `npm run test -- ProfilesView Sidebar`
Attendu : 9 tests de `ProfilesView` verts, 2 tests du `Sidebar` verts, et `admin-layout` toujours vert.

- [ ] **Étape 8 : commiter**

```bash
npm run test && npm run build
git add components/admin app/\(admin\)/admin/alumni
git commit -m "feat: back-office des profils alumni (table, filtres, cycle de vie) + entree Sidebar active"
```

---

## Tâche 18 : Back-office — file d'attente des demandes

**Fichiers**
- Créer : `components/admin/alumni/RegistrationsTable.tsx`, `components/admin/alumni/RegistrationsView.tsx`, `app/(admin)/admin/alumni/inscriptions/page.tsx`
- Test : `components/admin/alumni/RegistrationsView.test.tsx`

**Interfaces**
- Consomme : `useRegistrations`, `useApproveRegistration`, `useRejectRegistration` (tâche 13) · `Table`, `Pagination`, `Select`, `Field`, `Textarea`, `Modal`, `Badge`, `Button`, `Alert`, `Spinner`.
- Produit : `<RegistrationsView />`, `<RegistrationsTable registrations onApprove onReject pending />`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/admin/alumni/RegistrationsView.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { RegistrationsView } from "./RegistrationsView";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

const DEMANDE = {
  id: 3,
  first_name: "Awa",
  last_name: "Doe",
  email: "awa@example.org",
  promotion: 2018,
  country: "Bénin",
  phone: "",
  city: "Cotonou",
  sector: "numerique",
  sector_display: "Technologies et numérique",
  current_position: "Développeuse",
  organization: "BAMFA",
  directory_consent: true,
  status: "en_attente",
  status_display: "En attente",
  submitted_at: "2026-08-02T09:00:00Z",
  reviewed_at: null,
  reviewed_by_email: null,
  rejection_reason: "",
  profile: null,
};

function reponse(results: unknown[], count = results.length) {
  return { count, next: null, previous: null, results };
}

describe("RegistrationsView", () => {
  it("affiche les demandes en attente", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));

    renderWithClient(<RegistrationsView />);

    expect(await screen.findByText("Doe Awa")).toBeInTheDocument();
    expect(screen.getByText("awa@example.org")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("affiche un message quand la file est vide", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([]));

    renderWithClient(<RegistrationsView />);

    expect(await screen.findByText(/aucune demande/i)).toBeInTheDocument();
  });

  it("approuve une demande", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));
    mock.onPost("/alumni/admin/inscriptions/3/approuver/").reply(200, { id: 9 });
    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Approuver" }));

    await waitFor(() =>
      expect(mock.history.post[0].url).toBe(
        "/alumni/admin/inscriptions/3/approuver/",
      ),
    );
  });

  it("demande le motif dans une modale avant de rejeter", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));
    mock.onPost("/alumni/admin/inscriptions/3/rejeter/").reply(200, DEMANDE);
    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(
      screen.getByRole("dialog", { name: /rejeter la demande/i }),
    ).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);

    await userEvent.type(screen.getByLabelText(/motif/i), "Dossier incomplet.");
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmer le rejet" }),
    );

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      motif: "Dossier incomplet.",
    });
  });

  it("permet de rejeter sans motif", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));
    mock.onPost("/alumni/admin/inscriptions/3/rejeter/").reply(200, DEMANDE);
    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Rejeter" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmer le rejet" }),
    );

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ motif: "" });
  });

  it("ferme la modale sans rejeter quand on annule", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));
    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    await userEvent.click(screen.getByRole("button", { name: "Rejeter" }));
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it("n'offre pas d'instruire une demande déjà traitée", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(
      200,
      reponse([
        {
          ...DEMANDE,
          status: "rejetee",
          status_display: "Rejetée",
          rejection_reason: "Hors périmètre.",
        },
      ]),
    );

    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
    expect(screen.getByText("Hors périmètre.")).toBeInTheDocument();
  });

  it("envoie le filtre de statut choisi", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(200, reponse([DEMANDE]));
    renderWithClient(<RegistrationsView />);
    await screen.findByText("Doe Awa");

    await userEvent.selectOptions(screen.getByLabelText(/statut/i), "rejetee");

    await waitFor(() =>
      expect(
        mock.history.get.some((appel) => appel.params?.statut === "rejetee"),
      ).toBe(true),
    );
  });

  it("affiche une erreur quand l'API échoue", async () => {
    mock.onGet("/alumni/admin/inscriptions/").reply(500);

    renderWithClient(<RegistrationsView />);

    expect(
      await screen.findByText(/demandes n'ont pas pu être chargées/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- RegistrationsView`
Attendu : ÉCHEC — module `./RegistrationsView` introuvable.

- [ ] **Étape 3 : écrire la table**

Créer `components/admin/alumni/RegistrationsTable.tsx` :

```tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import type { Registration } from "@/lib/alumni/types";

interface Props {
  registrations: Registration[];
  onApprove: (id: number) => void;
  onReject: (registration: Registration) => void;
  pending: boolean;
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function RegistrationsTable({
  registrations,
  onApprove,
  onReject,
  pending,
}: Props) {
  return (
    <Table caption="Demandes d'inscription alumni">
      <Thead>
        <Tr>
          <Th>Demandeur</Th>
          <Th>Contact</Th>
          <Th>Promotion</Th>
          <Th>Soumise le</Th>
          <Th>Statut</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {registrations.map((registration) => (
          <Tr key={registration.id}>
            <Td>
              <span className="font-medium">
                {registration.last_name} {registration.first_name}
              </span>
              {registration.sector_display && (
                <span className="mt-1 block text-xs text-stone-600">
                  {registration.sector_display}
                </span>
              )}
            </Td>
            <Td>
              <span className="block font-mono text-xs">{registration.email}</span>
              <span className="block text-xs text-stone-600">
                {[registration.city, registration.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </Td>
            <Td>{registration.promotion}</Td>
            <Td>{dateCourte(registration.submitted_at)}</Td>
            <Td>
              <div className="flex flex-col items-start gap-1">
                <Badge>{registration.status_display}</Badge>
                {registration.rejection_reason && (
                  <span className="text-xs text-stone-600">
                    {registration.rejection_reason}
                  </span>
                )}
              </div>
            </Td>
            <Td>
              {registration.status === "en_attente" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => onApprove(registration.id)}
                  >
                    Approuver
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => onReject(registration)}
                  >
                    Rejeter
                  </Button>
                </div>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
```

- [ ] **Étape 4 : écrire l'assemblage avec la modale de rejet**

Créer `components/admin/alumni/RegistrationsView.tsx` :

```tsx
"use client";

import { useState } from "react";

import { REGISTRATION_STATUS_OPTIONS } from "@/content/alumni";
import type { Registration, RegistrationFilters } from "@/lib/alumni/types";
import {
  useApproveRegistration,
  useRegistrations,
  useRejectRegistration,
} from "@/lib/alumni/useRegistrations";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";

import { RegistrationsTable } from "./RegistrationsTable";

const PAGE_SIZE = 20;

export function RegistrationsView() {
  const [filters, setFilters] = useState<RegistrationFilters>({ page: 1 });
  const [aRejeter, setARejeter] = useState<Registration | null>(null);
  const [motif, setMotif] = useState("");

  const { data, isLoading, isError } = useRegistrations(filters);
  const approuver = useApproveRegistration();
  const rejeter = useRejectRegistration();

  function set(champ: keyof RegistrationFilters, valeur: string) {
    setFilters({ ...filters, [champ]: valeur, page: 1 });
  }

  function ouvrirRejet(registration: Registration) {
    setARejeter(registration);
    setMotif("");
  }

  function confirmerRejet() {
    if (!aRejeter) return;
    rejeter.mutate(
      { id: aRejeter.id, motif },
      { onSuccess: () => setARejeter(null) },
    );
  }

  const enCours = approuver.isPending || rejeter.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Rechercher"
          placeholder="Nom, e-mail"
          value={filters.search ?? ""}
          onChange={(e) => set("search", e.target.value)}
        />
        <Select
          label="Statut"
          options={REGISTRATION_STATUS_OPTIONS}
          placeholder="Tous"
          value={filters.statut ?? ""}
          onChange={(e) => set("statut", e.target.value)}
        />
      </div>

      {isError && (
        <Alert variant="danger">
          Les demandes n'ont pas pu être chargées. Veuillez réessayer.
        </Alert>
      )}
      {(approuver.isError || rejeter.isError) && (
        <Alert variant="danger">
          L'instruction n'a pas pu être enregistrée. Veuillez réessayer.
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 text-flame-ink" />
        </div>
      )}

      {data && data.results.length === 0 && (
        <Alert variant="info">Aucune demande ne correspond à ces critères.</Alert>
      )}

      {data && data.results.length > 0 && (
        <>
          <p className="font-mono text-xs text-stone-600">
            {data.count} demande{data.count > 1 ? "s" : ""}
          </p>
          <RegistrationsTable
            registrations={data.results}
            onApprove={(id) => approuver.mutate({ id })}
            onReject={ouvrirRejet}
            pending={enCours}
          />
          <Pagination
            count={data.count}
            page={filters.page ?? 1}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}

      <Modal
        open={aRejeter !== null}
        title="Rejeter la demande"
        onClose={() => setARejeter(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-700">
            Le motif, s'il est renseigné, sera communiqué à{" "}
            <span className="font-mono text-ink">{aRejeter?.email}</span> dans
            l'e-mail de notification.
          </p>
          <Textarea
            label="Motif du rejet (facultatif)"
            rows={4}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              loading={rejeter.isPending}
              onClick={confirmerRejet}
            >
              Confirmer le rejet
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setARejeter(null)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Étape 5 : écrire la page**

Créer `app/(admin)/admin/alumni/inscriptions/page.tsx` :

```tsx
"use client";

import Link from "next/link";

import { RegistrationsView } from "@/components/admin/alumni/RegistrationsView";

export default function AdminAlumniInscriptionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-flame-ink">
          Alumni
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-ink">
          Demandes d'inscription
        </h1>
        <p className="mt-3 text-stone-600">
          Instruisez les candidatures reçues depuis le site public. Une
          approbation crée le profil et envoie le lien d'activation.
        </p>
        <Link
          href="/admin/alumni"
          className="mt-4 inline-block text-sm text-flame-ink underline-offset-4 hover:underline"
        >
          Retour aux profils
        </Link>
      </div>
      <RegistrationsView />
    </div>
  );
}
```

- [ ] **Étape 6 : vérifier que les tests passent**

Lancer : `npm run test -- RegistrationsView`
Attendu : 9 passed

- [ ] **Étape 7 : commiter**

```bash
npm run test && npm run build
git add components/admin/alumni app/\(admin\)/admin/alumni/inscriptions
git commit -m "feat: back-office des demandes d'inscription alumni (approbation, rejet motive)"
```

---

## Tâche 19 : Back-office — import de fichier et rapports

**Fichiers**
- Créer : `components/admin/alumni/ImportForm.tsx`, `components/admin/alumni/ImportReportCard.tsx`, `components/admin/alumni/ImportsView.tsx`, `app/(admin)/admin/alumni/imports/page.tsx`
- Test : `components/admin/alumni/ImportsView.test.tsx`

**Interfaces**
- Consomme : `useImports`, `useCreateImport` (tâche 13) · `Button`, `Alert`, `Spinner`, `Table`.
- Produit : `<ImportsView />`, `<ImportForm onImported />`, `<ImportReportCard report />`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `components/admin/alumni/ImportsView.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import { ImportsView } from "./ImportsView";

const mock = new MockAdapter(api);

afterEach(() => mock.reset());

const RAPPORT = {
  id: 1,
  filename: "alumni.csv",
  strict: false,
  created_at: "2026-08-03T08:00:00Z",
  uploaded_by_email: "administrateur@bamfa.org",
  rows_total: 3,
  rows_created: 2,
  rows_updated: 0,
  rows_skipped: 0,
  rows_failed: 1,
  errors: [
    {
      id: 1,
      line_number: 3,
      raw_row: { email: "pas-un-email", nom: "Mensah" },
      message: "Adresse e-mail invalide ou absente.",
    },
  ],
};

function fichier() {
  return new File(
    ["email,nom,prenom,promotion\nawa@example.org,Doe,Awa,2018\n"],
    "alumni.csv",
    { type: "text/csv" },
  );
}

describe("ImportsView", () => {
  it("affiche l'historique des imports", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 1, next: null, previous: null, results: [RAPPORT] });

    renderWithClient(<ImportsView />);

    expect(await screen.findByText("alumni.csv")).toBeInTheDocument();
  });

  it("indique quand aucun import n'a encore été fait", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });

    renderWithClient(<ImportsView />);

    expect(await screen.findByText(/aucun import/i)).toBeInTheDocument();
  });

  it("refuse la soumission sans fichier", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });
    renderWithClient(<ImportsView />);

    await userEvent.click(screen.getByRole("button", { name: /importer/i }));

    expect(screen.getByText("Sélectionnez un fichier CSV.")).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it("dépose le fichier et affiche le rapport", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });
    mock.onPost("/alumni/admin/imports/").reply(201, RAPPORT);
    renderWithClient(<ImportsView />);

    await userEvent.upload(screen.getByLabelText(/fichier csv/i), fichier());
    await userEvent.click(screen.getByRole("button", { name: /importer/i }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(await screen.findByText("2 créé(s)")).toBeInTheDocument();
    expect(screen.getByText("1 en erreur")).toBeInTheDocument();
    expect(
      screen.getByText("Adresse e-mail invalide ou absente."),
    ).toBeInTheDocument();
    expect(screen.getByText(/ligne 3/i)).toBeInTheDocument();
  });

  it("transmet le mode strict quand la case est cochée", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });
    mock.onPost("/alumni/admin/imports/").reply(201, RAPPORT);
    renderWithClient(<ImportsView />);

    await userEvent.upload(screen.getByLabelText(/fichier csv/i), fichier());
    await userEvent.click(screen.getByLabelText(/tout ou rien/i));
    await userEvent.click(screen.getByRole("button", { name: /importer/i }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const body = mock.history.post[0].data as FormData;
    expect(body.get("strict")).toBe("true");
  });

  it("affiche l'erreur de format renvoyée par l'API", async () => {
    mock
      .onGet("/alumni/admin/imports/")
      .reply(200, { count: 0, next: null, previous: null, results: [] });
    mock.onPost("/alumni/admin/imports/").reply(400, {
      error: {
        code: "invalid",
        message: "Requête invalide.",
        details: { fichier: ["Colonnes requises absentes : promotion."] },
      },
    });
    renderWithClient(<ImportsView />);

    await userEvent.upload(screen.getByLabelText(/fichier csv/i), fichier());
    await userEvent.click(screen.getByRole("button", { name: /importer/i }));

    expect(
      await screen.findByText("Colonnes requises absentes : promotion."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- ImportsView`
Attendu : ÉCHEC — module `./ImportsView` introuvable.

- [ ] **Étape 3 : écrire la carte de rapport**

Créer `components/admin/alumni/ImportReportCard.tsx` :

```tsx
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { cardShell, monoLabel } from "@/components/ui/styles";
import type { ImportReport } from "@/lib/alumni/types";

export function ImportReportCard({ report }: { report: ImportReport }) {
  const compteurs = [
    { label: `${report.rows_total} ligne(s) lue(s)`, ton: "text-stone-700" },
    { label: `${report.rows_created} créé(s)`, ton: "text-success-text" },
    { label: `${report.rows_updated} mis à jour`, ton: "text-info-text" },
    { label: `${report.rows_skipped} sans changement`, ton: "text-stone-600" },
    { label: `${report.rows_failed} en erreur`, ton: "text-danger-text" },
  ];

  return (
    <article className={`${cardShell} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-lg font-semibold text-ink">
          {report.filename || "Import"}
        </h3>
        <p className={`${monoLabel} text-stone-600`}>
          {new Date(report.created_at).toLocaleString("fr-FR")}
          {report.strict && " · mode strict"}
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {compteurs.map((compteur) => (
          <li key={compteur.label} className={compteur.ton}>
            {compteur.label}
          </li>
        ))}
      </ul>

      {report.uploaded_by_email && (
        <p className="text-xs text-stone-600">
          Importé par {report.uploaded_by_email}
        </p>
      )}

      {report.errors.length > 0 && (
        <Table caption={`Lignes en erreur de l'import ${report.filename}`}>
          <Thead>
            <Tr>
              <Th>Ligne</Th>
              <Th>Message</Th>
              <Th>Contenu</Th>
            </Tr>
          </Thead>
          <Tbody>
            {report.errors.map((erreur) => (
              <Tr key={erreur.id}>
                <Td>Ligne {erreur.line_number}</Td>
                <Td>{erreur.message}</Td>
                <Td>
                  <code className="font-mono text-xs text-stone-600">
                    {Object.entries(erreur.raw_row)
                      .map(([cle, valeur]) => `${cle}=${valeur}`)
                      .join(" · ")}
                  </code>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </article>
  );
}
```

- [ ] **Étape 4 : écrire le formulaire de dépôt**

Créer `components/admin/alumni/ImportForm.tsx` :

```tsx
"use client";

import { useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import type { ImportReport } from "@/lib/alumni/types";
import { useCreateImport } from "@/lib/alumni/useImports";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function messageErreur(erreur: unknown): string {
  if (erreur instanceof ApiError) {
    const details = (erreur.data as { error?: { details?: Record<string, string[]> } })
      ?.error?.details;
    const messages = details?.fichier;
    if (messages?.length) return messages[0];
  }
  return "L'import a échoué. Vérifiez le fichier et réessayez.";
}

export function ImportForm({
  onImported,
}: {
  onImported: (report: ImportReport) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [strict, setStrict] = useState(false);
  const [erreur, setErreur] = useState("");
  const creer = useCreateImport();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErreur("");
    if (!fichier) {
      setErreur("Sélectionnez un fichier CSV.");
      return;
    }
    creer.mutate(
      { file: fichier, strict },
      {
        onSuccess: (report) => {
          onImported(report);
          setFichier(null);
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (err) => setErreur(messageErreur(err)),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {erreur && <Alert variant="danger">{erreur}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="import-fichier"
          className="font-mono text-xs uppercase tracking-[0.15em] text-stone-600"
        >
          Fichier CSV
        </label>
        <input
          ref={inputRef}
          id="import-fichier"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          className="rounded-sm border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-paper focus-visible:border-flame focus-visible:outline-none"
        />
        <p className="text-xs text-stone-600">
          Colonnes requises : <code className="font-mono">email</code>,{" "}
          <code className="font-mono">nom</code>,{" "}
          <code className="font-mono">prenom</code>,{" "}
          <code className="font-mono">promotion</code>. Séparateur{" "}
          <code className="font-mono">,</code> ou{" "}
          <code className="font-mono">;</code>. Les alumni déjà présents sont mis
          à jour, jamais dupliqués.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={strict}
          onChange={(e) => setStrict(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded-sm border-ink/25 text-flame focus-visible:ring-2 focus-visible:ring-flame"
        />
        <span>
          Mode « tout ou rien » : la première ligne invalide annule l'import
          entier. Sans cette option, les lignes valides sont importées et les
          autres consignées au rapport.
        </span>
      </label>

      <Button type="submit" loading={creer.isPending} className="self-start">
        Importer le fichier
      </Button>
    </form>
  );
}
```

- [ ] **Étape 5 : écrire l'assemblage**

Créer `components/admin/alumni/ImportsView.tsx` :

```tsx
"use client";

import { useState } from "react";

import type { ImportReport } from "@/lib/alumni/types";
import { useImports } from "@/lib/alumni/useImports";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

import { ImportForm } from "./ImportForm";
import { ImportReportCard } from "./ImportReportCard";

export function ImportsView() {
  const [dernier, setDernier] = useState<ImportReport | null>(null);
  const { data, isLoading, isError } = useImports();

  // L'historique inclut déjà le dernier import après invalidation du cache :
  // on ne le met donc en avant qu'une fois, sans le dupliquer dans la liste.
  const historique = (data?.results ?? []).filter(
    (report) => report.id !== dernier?.id,
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-semibold text-ink">
          Importer des alumni
        </h2>
        <ImportForm onImported={setDernier} />
      </section>

      {dernier && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-2xl font-semibold text-ink">
            Résultat du dernier import
          </h2>
          <ImportReportCard report={dernier} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-semibold text-ink">
          Historique
        </h2>

        {isError && (
          <Alert variant="danger">
            L'historique n'a pas pu être chargé. Veuillez réessayer.
          </Alert>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 text-flame-ink" />
          </div>
        )}

        {data && historique.length === 0 && !dernier && (
          <Alert variant="info">Aucun import n'a encore été effectué.</Alert>
        )}

        <div className="flex flex-col gap-4">
          {historique.map((report) => (
            <ImportReportCard key={report.id} report={report} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Étape 6 : écrire la page**

Créer `app/(admin)/admin/alumni/imports/page.tsx` :

```tsx
"use client";

import Link from "next/link";

import { ImportsView } from "@/components/admin/alumni/ImportsView";

export default function AdminAlumniImportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-flame-ink">
          Alumni
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-ink">
          Import d'alumni
        </h1>
        <p className="mt-3 text-stone-600">
          Alimentez la base depuis un fichier CSV. Les profils importés sont
          validés d'office et n'apparaissent dans l'annuaire public que si la
          colonne de consentement l'indique.
        </p>
        <Link
          href="/admin/alumni"
          className="mt-4 inline-block text-sm text-flame-ink underline-offset-4 hover:underline"
        >
          Retour aux profils
        </Link>
      </div>
      <ImportsView />
    </div>
  );
}
```

- [ ] **Étape 7 : vérifier que les tests passent**

Lancer : `npm run test -- ImportsView`
Attendu : 6 passed

- [ ] **Étape 8 : commiter**

```bash
npm run test && npm run build
git add components/admin/alumni app/\(admin\)/admin/alumni/imports
git commit -m "feat: back-office d'import alumni (depot CSV, mode strict, rapport detaille)"
```

---

## Tâche 20 : Espace alumni et redirection selon le rôle

Cette tâche modifie du code livré en S4. Les deux changements sont liés : sans redirection dépendante du rôle, un alumni qui active son accès atterrit sur `/admin`, où la garde le renvoie à `/connexion` — boucle sans issue.

**Fichiers**
- Créer : `app/(alumni)/layout.tsx`, `app/(alumni)/espace/page.tsx`
- Modifier : `lib/auth/route-guard.ts`, `middleware.ts:16-18`, `components/auth/LoginForm.tsx:22-24,41-51`
- Test : `lib/auth/route-guard.test.ts` (existant, à compléter), `components/auth/LoginForm.test.tsx` (existant, à compléter), `app/(alumni)/espace.test.tsx`

**Interfaces**
- Consomme : `useAuth` (existant) · `SelfProfileSerializer` via `GET /alumni/moi/`.
- Produit :
  - `PROTECTED_PREFIXES` et `shouldRedirectToLogin(pathname, hasSessionCookie)` généralisée (même signature).
  - `STAFF_ROLES` et `landingPathForUser(user) -> "/admin" | "/espace"` — fonction pure, dans `lib/auth/route-guard.ts`.
  - `useSelfProfile()` dans `lib/alumni/useSelfProfile.ts`.
  - Page `/espace`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à `lib/auth/route-guard.test.ts` :

```ts
import { landingPathForUser, shouldRedirectToLogin } from "./route-guard";

describe("shouldRedirectToLogin — espace alumni", () => {
  it("protège /espace", () => {
    expect(shouldRedirectToLogin("/espace", false)).toBe(true);
    expect(shouldRedirectToLogin("/espace/", false)).toBe(true);
  });

  it("laisse passer /espace avec une session", () => {
    expect(shouldRedirectToLogin("/espace", true)).toBe(false);
  });

  it("ne protège pas les pages publiques alumni", () => {
    expect(shouldRedirectToLogin("/alumni", false)).toBe(false);
    expect(shouldRedirectToLogin("/alumni/inscription", false)).toBe(false);
    expect(shouldRedirectToLogin("/alumni/activation", false)).toBe(false);
  });

  it("ne confond pas un préfixe avec un autre chemin", () => {
    expect(shouldRedirectToLogin("/espacements", false)).toBe(false);
  });
});

describe("landingPathForUser", () => {
  it("envoie les rôles staff vers le back-office", () => {
    for (const role of [
      "Administrateur",
      "Secrétaire",
      "Trésorier",
      "Rédacteur de contenu",
    ]) {
      expect(
        landingPathForUser({ roles: [role], is_superuser: false }),
      ).toBe("/admin");
    }
  });

  it("envoie un alumni vers son espace", () => {
    expect(
      landingPathForUser({ roles: ["Alumni"], is_superuser: false }),
    ).toBe("/espace");
  });

  it("envoie un super-utilisateur vers le back-office", () => {
    expect(landingPathForUser({ roles: [], is_superuser: true })).toBe("/admin");
  });

  it("envoie un compte sans rôle vers l'espace alumni", () => {
    expect(landingPathForUser({ roles: [], is_superuser: false })).toBe("/espace");
  });

  it("privilégie le back-office pour un alumni également rédacteur", () => {
    expect(
      landingPathForUser({
        roles: ["Alumni", "Rédacteur de contenu"],
        is_superuser: false,
      }),
    ).toBe("/admin");
  });

  it("tolère un utilisateur absent", () => {
    expect(landingPathForUser(null)).toBe("/espace");
  });
});
```

> Reprendre les imports déjà présents dans ce fichier (`describe`/`it`/`expect` viennent de la configuration globale de Vitest).

Ajouter à `components/auth/LoginForm.test.tsx` :

```tsx
it("redirige un alumni vers son espace après connexion", async () => {
  mock.onGet("/auth/me/").reply(401);
  mock.onPost("/auth/login/").reply(200, {
    id: 2,
    email: "awa@example.org",
    first_name: "Awa",
    last_name: "Doe",
    is_staff: false,
    is_superuser: false,
    roles: ["Alumni"],
  });
  renderWithClient(<LoginForm />);

  await userEvent.type(screen.getByLabelText(/e-mail/i), "awa@example.org");
  await userEvent.type(screen.getByLabelText(/mot de passe/i), "motdepasse123");
  await userEvent.click(screen.getByRole("button", { name: /se connecter/i }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/espace"));
});

it("redirige un administrateur vers le back-office après connexion", async () => {
  mock.onGet("/auth/me/").reply(401);
  mock.onPost("/auth/login/").reply(200, {
    id: 1,
    email: "admin@bamfa.org",
    first_name: "Ada",
    last_name: "Admin",
    is_staff: true,
    is_superuser: false,
    roles: ["Administrateur"],
  });
  renderWithClient(<LoginForm />);

  await userEvent.type(screen.getByLabelText(/e-mail/i), "admin@bamfa.org");
  await userEvent.type(screen.getByLabelText(/mot de passe/i), "motdepasse123");
  await userEvent.click(screen.getByRole("button", { name: /se connecter/i }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
});
```

> **Lire d'abord `components/auth/LoginForm.test.tsx`** : il possède déjà un mock de `next/navigation` et un `MockAdapter`. Réutiliser leurs noms (`replace`, `mock`) au lieu d'en créer de nouveaux, et ajuster les deux cas ci-dessus à la nomenclature en place.

Créer `app/(alumni)/espace.test.tsx` :

```tsx
import { screen } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api/client";
import { renderWithClient } from "@/lib/test-utils";

import EspacePage from "./espace/page";

const mock = new MockAdapter(api);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => mock.reset());

const PROFIL = {
  id: 5,
  first_name: "Awa",
  last_name: "Doe",
  email: "awa@example.org",
  promotion: 2018,
  country: "Bénin",
  phone: "",
  city: "Cotonou",
  university: "",
  mcf_program: "",
  sector: "numerique",
  sector_display: "Technologies et numérique",
  current_position: "Développeuse",
  organization: "BAMFA",
  bio: "",
  linkedin_url: "",
  birth_date: null,
  gender: "",
  directory_consent: true,
  status: "actif",
  status_display: "Actif",
  completeness: 45,
};

describe("EspacePage", () => {
  it("accueille l'alumni et affiche sa complétude", async () => {
    mock.onGet("/alumni/moi/").reply(200, PROFIL);

    renderWithClient(<EspacePage />);

    expect(await screen.findByText(/Bonjour Awa/)).toBeInTheDocument();
    expect(screen.getByText("45 %")).toBeInTheDocument();
  });

  it("propose l'accès à l'annuaire", async () => {
    mock.onGet("/alumni/moi/").reply(200, PROFIL);

    renderWithClient(<EspacePage />);
    await screen.findByText(/Bonjour Awa/);

    expect(screen.getByRole("link", { name: /annuaire/i })).toHaveAttribute(
      "href",
      "/alumni",
    );
  });

  it("explique la situation d'un compte sans profil alumni", async () => {
    mock.onGet("/alumni/moi/").reply(404, {
      error: { code: "not_found", message: "Introuvable.", details: {} },
    });

    renderWithClient(<EspacePage />);

    expect(
      await screen.findByText(/aucun profil alumni n'est rattaché/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Étape 2 : vérifier que les tests échouent**

Lancer : `npm run test -- route-guard LoginForm espace`
Attendu : ÉCHEC — `landingPathForUser` non exporté, `/espace` non protégé, module `./espace/page` introuvable.

- [ ] **Étape 3 : généraliser la garde de routes**

Remplacer `lib/auth/route-guard.ts` par :

```ts
export const SESSION_COOKIE = "bamfa_refresh";

/** Zones qui exigent une session. Le back-office et l'espace alumni. */
export const PROTECTED_PREFIXES = ["/admin", "/espace"] as const;

/** Rôles qui mènent au back-office. Tout autre compte va à l'espace alumni. */
export const STAFF_ROLES = [
  "Administrateur",
  "Secrétaire",
  "Trésorier",
  "Rédacteur de contenu",
] as const;

export function shouldRedirectToLogin(
  pathname: string,
  hasSessionCookie: boolean,
): boolean {
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return isProtected && !hasSessionCookie;
}

/** Page d'atterrissage après connexion, selon le rôle.
 *  Un compte cumulant un rôle staff et le rôle Alumni va au back-office :
 *  c'est la zone la plus capacitaire, et l'annuaire reste accessible depuis là. */
export function landingPathForUser(
  user: { roles: string[]; is_superuser: boolean } | null | undefined,
): "/admin" | "/espace" {
  if (!user) return "/espace";
  if (user.is_superuser) return "/admin";
  return user.roles.some((role) =>
    (STAFF_ROLES as readonly string[]).includes(role),
  )
    ? "/admin"
    : "/espace";
}
```

> `pathname === prefix || pathname.startsWith(`${prefix}/`)` et non `startsWith(prefix)` : sinon `/espacements` serait protégé à tort — ce que vérifie un test.

- [ ] **Étape 4 : étendre le `matcher` du middleware**

Dans `middleware.ts`, remplacer la configuration finale :

```ts
export const config = {
  matcher: ["/admin/:path*", "/espace/:path*"],
};
```

> Le `matcher` de Next.js doit rester une liste de littéraux statiques : il est analysé à la compilation et ne peut pas être dérivé de `PROTECTED_PREFIXES`. Garder les deux listes en cohérence manuellement.

- [ ] **Étape 5 : rendre la redirection de connexion dépendante du rôle**

Dans `components/auth/LoginForm.tsx` :

```tsx
import { landingPathForUser } from "@/lib/auth/route-guard";
```

Remplacer l'effet de redirection (lignes 22-24) :

```tsx
  const { isAuthenticated, user, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace(landingPathForUser(user));
  }, [isAuthenticated, user, router]);
```

Et la redirection après connexion (ligne 43) :

```tsx
      const connecte = await login.mutateAsync({ email, password });
      router.replace(landingPathForUser(connecte));
```

> `login.mutateAsync` renvoie l'utilisateur (`UserSerializer`), donc le rôle est connu **immédiatement**, sans attendre le rafraîchissement de la requête `me`.

- [ ] **Étape 6 : écrire le hook de profil**

Créer `lib/alumni/useSelfProfile.ts` :

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

export interface SelfProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  promotion: number;
  country: string;
  city: string;
  sector: string;
  sector_display: string;
  current_position: string;
  organization: string;
  bio: string;
  linkedin_url: string;
  directory_consent: boolean;
  status: string;
  status_display: string;
  completeness: number;
}

export function useSelfProfile() {
  return useQuery<SelfProfile>({
    queryKey: ["alumni", "moi"],
    queryFn: async () => {
      const { data } = await api.get<SelfProfile>("/alumni/moi/");
      return data;
    },
    // Un compte sans profil alumni répond 404 : inutile de réessayer.
    retry: false,
  });
}
```

- [ ] **Étape 7 : écrire la zone alumni**

Créer `app/(alumni)/layout.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/useAuth";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Spinner } from "@/components/ui/Spinner";

export default function AlumniLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/connexion");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner className="h-8 w-8 text-flame-ink" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

> Même double barrière que le back-office : `middleware.ts` sur le cookie, puis garde client qui ne monte jamais les enfants avant l'authentification.
>
> La structure reprend celle de `app/(public)/layout.tsx` (conteneur `flex min-h-screen flex-col`, `Header`, `main flex-1`, `Footer`) **sans** son `SmoothScrollProvider` : le défilement fluide sert la lecture éditoriale des pages publiques, pas une zone applicative.

Créer `app/(alumni)/espace/page.tsx` :

```tsx
"use client";

import Link from "next/link";

import { useSelfProfile } from "@/lib/alumni/useSelfProfile";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/ui/Spinner";
import { cardShell, monoLabel } from "@/components/ui/styles";

export default function EspacePage() {
  const { data: profil, isLoading, isError } = useSelfProfile();

  return (
    <Section>
      <Container className="flex max-w-3xl flex-col gap-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-flame-ink" />
          </div>
        )}

        {isError && (
          <Alert variant="info">
            Aucun profil alumni n'est rattaché à ce compte. Si vous êtes alumni
            de la Mastercard Foundation au Bénin,{" "}
            <Link
              href="/alumni/inscription"
              className="underline underline-offset-4"
            >
              demandez votre inscription
            </Link>
            .
          </Alert>
        )}

        {profil && (
          <>
            <div>
              <p className={`${monoLabel} text-flame-ink`}>Espace alumni</p>
              <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-ink">
                Bonjour {profil.first_name}
              </h1>
              <p className="mt-3 text-stone-600">
                Promotion {profil.promotion}
                {profil.organization && ` · ${profil.organization}`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{profil.status_display}</Badge>
                {profil.sector_display && <Badge>{profil.sector_display}</Badge>}
              </div>
            </div>

            <div className={`${cardShell} p-6`}>
              <p className={`${monoLabel} text-stone-600`}>
                Complétude de votre profil
              </p>
              <p className="mt-2 font-heading text-4xl font-semibold text-ink">
                {profil.completeness} %
              </p>
              <div
                role="progressbar"
                aria-valuenow={profil.completeness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Complétude du profil"
                className="mt-4 h-1.5 w-full overflow-hidden rounded-sm bg-stone-200"
              >
                <div
                  className="h-full bg-flame"
                  style={{ width: `${profil.completeness}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-stone-600">
                {profil.directory_consent
                  ? "Votre profil figure dans l'annuaire public."
                  : "Votre profil ne figure pas dans l'annuaire public."}{" "}
                L'édition de votre profil depuis cette page arrivera
                prochainement — contactez l'équipe BAMFA d'ici là.
              </p>
            </div>

            <Link
              href="/alumni"
              className="self-start text-sm text-flame-ink underline-offset-4 hover:underline"
            >
              Parcourir l'annuaire des alumni
            </Link>
          </>
        )}
      </Container>
    </Section>
  );
}
```

- [ ] **Étape 8 : vérifier que les tests passent**

Lancer : `npm run test -- route-guard LoginForm espace`
Attendu : les nouveaux cas de `route-guard` (11) et de `LoginForm` (2) verts, les 3 tests d'`espace` verts, **et les anciens tests de `LoginForm` et `route-guard` toujours verts**.

- [ ] **Étape 9 : commiter**

```bash
npm run test && npm run build
git add lib/auth/route-guard.ts lib/auth/route-guard.test.ts middleware.ts \
        components/auth/LoginForm.tsx components/auth/LoginForm.test.tsx \
        lib/alumni/useSelfProfile.ts app/\(alumni\)
git commit -m "feat: espace alumni minimal + garde de routes generalisee + redirection selon le role"
```

---

## Tâche 21 : Vérification finale et compte-rendu de slice

**Fichiers**
- Créer : `docs/done/2026-08-03-sprint2-s7-alumni.md` (dépôt **workspace**)

**Interfaces** — aucune : tâche de clôture.

- [ ] **Étape 1 : vérifier le backend de bout en bout**

```bash
cd plateforme-bamfa-api
.venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/python manage.py makemigrations --check --dry-run
```

Attendu : suite verte (≈ 155 tests), `All checks passed!`, `No changes detected`.

- [ ] **Étape 2 : vérifier le frontend de bout en bout**

```bash
cd ../plateforme-bamfa-frontend
npm run test
npm run build
```

Attendu : suite verte (≈ 110 tests), build réussi sans erreur de type.

- [ ] **Étape 3 : vérifier le parcours réel dans l'application**

Le socle est vert, mais aucun test automatisé ne couvre l'enchaînement complet. Le dérouler à la main une fois :

```bash
# Terminal 1 — services
cd .. && docker compose up -d db redis mailpit
# Terminal 2 — backend
cd plateforme-bamfa-api && .venv/bin/python manage.py migrate && \
  .venv/bin/python manage.py seed_demo && .venv/bin/python manage.py runserver
# Terminal 3 — frontend
cd plateforme-bamfa-frontend && npm run dev
```

Parcours à vérifier, en cochant chaque point :

- [ ] `/alumni` liste les profils de démonstration consentants, et **pas** `sans-consentement@example.org`.
- [ ] Les filtres promotion / secteur / pays et la recherche fonctionnent, la pagination apparaît au-delà de 20 entrées.
- [ ] `/alumni/inscription` soumet une demande ; l'accusé de réception arrive dans Mailpit (http://localhost:8025).
- [ ] Connecté en `admin@bamfa.org` (mot de passe `bamfa1234`), `/admin/alumni/inscriptions` montre la demande ; l'approbation crée le profil et envoie l'e-mail contenant le lien.
- [ ] Ce lien, ouvert dans le navigateur, mène à `/alumni/activation`, permet de définir un mot de passe, puis redirige vers `/connexion`.
- [ ] La connexion avec ce nouveau compte mène à `/espace` (et non `/admin`).
- [ ] `/admin/alumni/imports` accepte un CSV, affiche le rapport ; un second dépôt du **même** fichier ne crée aucun profil.
- [ ] Suspendre ce profil depuis `/admin/alumni` déconnecte effectivement l'alumni à sa requête suivante.
- [ ] Aucune adresse e-mail ni téléphone n'apparaît sur `/alumni`, connecté comme déconnecté.

- [ ] **Étape 4 : rédiger le compte-rendu de slice**

Créer `docs/done/2026-08-03-sprint2-s7-alumni.md` dans le dépôt **workspace**, sur le modèle de [`docs/done/2026-08-02-sprint2-s5-socle-metier.md`](../../done/2026-08-02-sprint2-s5-socle-metier.md). Y faire figurer :

- **En-tête** : `> **Auteur** : <nom du rédacteur>`, statut, date, liens vers la spec et le plan.
- **Contexte** : vague V1 du Sprint 2, slice qui débloque S9, S13 et S17.
- **Livré (dépôt api)** : app `apps/alumni` (modèles découplés demande/membre, services, imports, permissions, 20 endpoints), socle `apps/common/permissions.py`, réglage `FRONTEND_BASE_URL`, 4 gabarits d'email, extension de `seed_demo`.
- **Livré (dépôt frontend)** : 5 primitives d'interface partagées, client `lib/alumni`, 3 pages publiques, 3 écrans de back-office, espace alumni minimal, garde de routes généralisée, redirection selon le rôle.
- **Décisions notables** : l'approche « demande découplée du membre », le jeton d'invitation sans état dont l'usage unique découle de `profile.user_id is None`, le consentement qui conditionne la présence dans l'annuaire, les profils importés non consentants par défaut.
- **Élargissement de périmètre assumé** : le flux « définir mon mot de passe par lien signé », reporté en S1, est livré ici — et servira de socle au « mot de passe oublié ».
- **Commits** : la plage de commits de chaque dépôt.
- **Tests** : les chiffres réels des deux suites, et le résultat du parcours manuel de l'étape 3.
- **Points reportés** : édition du profil depuis l'interface, photo de profil et socle média, mot de passe oublié, export de l'annuaire, anonymisation RGPD, API Transition réelle.
- **Definition of Done** : la liste du §18 de la spec, cochée.

- [ ] **Étape 5 : commiter le compte-rendu**

```bash
cd ..   # racine du workspace
git add docs/done/2026-08-03-sprint2-s7-alumni.md
git commit -m "docs: CR de la slice S7 (alumni) — terminee"
```

> Rappel : **jamais `git add -A` depuis la racine du workspace** — `plateforme-bamfa-api/` et `plateforme-bamfa-frontend/` y apparaissent comme dossiers non suivis et ne doivent pas y être ajoutés.

- [ ] **Étape 6 : ouvrir les trois demandes de fusion**

Une PR par dépôt (`feat/s7-alumni` → `main`), en se référençant mutuellement. Ordre de fusion : **api d'abord** (le frontend en dépend pour le schéma), puis frontend, puis workspace.

---

## Récapitulatif des tâches

| # | Tâche | Dépôt | Livrable |
|---|---|---|---|
| 1 | Socle de permissions | api | `HasAnyRole` + 3 classes concrètes |
| 2 | Modèles et migration | api | 4 modèles, `in_directory()`, `completeness` |
| 3 | Inscription publique | api | `POST /inscriptions/` + accusé de réception |
| 4 | Invitation par jeton signé | api | vérification, activation, `FRONTEND_BASE_URL` |
| 5 | Revue administrateur | api | approbation, rejet motivé, permissions |
| 6 | Annuaire public et connecté | api | deux niveaux de champs, filtres, recherche |
| 7 | Annuaire d'administration | api | cycle de vie du membre, filtre `a_un_compte` |
| 8 | API « mon profil » | api | `GET/PATCH /moi/` |
| 9 | Cœur d'import | api | `parse_csv` + `import_alumni` idempotent |
| 10 | Endpoints d'import | api | dépôt, rapport, historique |
| 11 | Démonstration et OpenAPI | api | `seed_demo` étendue, couverture du schéma |
| 12 | Primitives d'interface | frontend | Table, Pagination, Select, Textarea, Modal |
| 13 | Client API alumni | frontend | types, `cleanParams`, 4 modules de hooks |
| 14 | Inscription publique | frontend | formulaire + page |
| 15 | Annuaire public | frontend | filtres, cartes, pagination, navigation |
| 16 | Activation de l'accès | frontend | vérification du jeton + mot de passe |
| 17 | Back-office des profils | frontend | table, filtres, actions, `Sidebar` |
| 18 | Back-office des demandes | frontend | approbation, rejet en modale |
| 19 | Back-office des imports | frontend | dépôt, mode strict, rapport |
| 20 | Espace alumni et redirection | frontend | zone `(alumni)`, gardes, rôle → page |
| 21 | Vérification et compte-rendu | workspace | parcours manuel + CR de slice |
