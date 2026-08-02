# Sprint 2 / S5 — Socle métier : Plan d'implémentation

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Réf.** : [Overview Sprint 2](../specs/2026-08-02-sprint2-overview.md) · [Architecture](../specs/2026-06-20-architecture-socle-technique-design.md)
> **Dépôt** : `backend` (Django + DRF). **Vague V0** (à faire en premier, en binôme — débloque toutes les slices du Sprint 2).

**Goal:** Poser les enablers transverses du Sprint 2 : conventions DRF (pagination/filtres/erreurs), abstraction email (repli console, Brevo branchable), Celery/Redis, base paiement (`Payment` + `PaymentProvider` manuel), et une commande de seed de démonstration.

**Architecture:** On complète le socle **déjà en place** (S1 a livré `PublishableMixin`, `Mandate`, drf-spectacular, `seed_roles`). On ajoute : une pagination/filtre/handler d'erreurs standardisés dans `apps/common`, un helper d'email transactionnel derrière le backend email Django (console en dev), Celery configuré (eager en dev/tests), une app `apps/payments` avec `Payment` + une interface `PaymentProvider` (impl. manuelle), et une commande `seed_demo`. **Aucun nouvel endpoint API** (le schéma OpenAPI est inchangé → pas de régénération du client frontend nécessaire pour S5).

**Tech Stack:** Django 5.2, DRF 3.15, drf-spectacular, django-filter, Celery 5 + Redis, PostgreSQL, pytest + pytest-django, ruff.

## Global Constraints

- **Langue** : code/commentaires et **messages de commit** en **français**. Ne **jamais** mentionner Claude/IA/assistant. Commits `feat:`/`chore:`/`test:`.
- **Dépôt** : `backend/` uniquement (dépôt git autonome). Branche `feat/s5-socle-metier`.
- **TDD** : test qui échoue → implémentation minimale → test qui passe → commit. Tests dans `tests/` (pytest, `DJANGO_SETTINGS_MODULE = config.settings.dev`).
- **Conventions** : une app = un module (`apps/<module>`), `LANGUAGE_CODE = "fr-fr"`, API sous `/api/v1/`. Passer **ruff** (`ruff check .`) avant chaque commit.
- **Intégrations branchables** : email derrière le backend Django (console maintenant, Brevo plus tard sans toucher les appelants) ; paiement derrière `PaymentProvider` (manuel maintenant, FedaPay/Kkiapay plus tard).
- **Existant à réutiliser** (ne pas recréer) : `apps/common/models.py::PublishableMixin`, `apps/accounts/models.py::{User, Mandate}`, `apps/accounts/roles.py::{create_roles, ROLE_GROUPS}`.
- **Nouvelles variables d'environnement** : les documenter dans `.env.example` avec des valeurs par défaut de dev.

## File Structure

- `requirements/base.txt` — **modifié** : `django-filter`, `celery[redis]`.
- `config/settings/base.py` — **modifié** : DRF (pagination/filtres/erreurs), email, Celery, paiement, `django_filters` + `apps.payments` dans INSTALLED_APPS.
- `config/settings/dev.py` — **modifié** : `CELERY_TASK_ALWAYS_EAGER = True`.
- `config/celery.py` — **créé** : app Celery.
- `config/__init__.py` — **modifié** : import de l'app Celery.
- `apps/common/pagination.py` — **créé** : `DefaultPagination`.
- `apps/common/exceptions.py` — **créé** : `bamfa_exception_handler`.
- `apps/common/emails.py` — **créé** : `send_templated_email`.
- `apps/common/templates/emails/exemple.txt` — **créé** : template de démonstration.
- `apps/common/tasks.py` — **créé** : tâche Celery `ping`.
- `apps/common/management/commands/seed_demo.py` — **créé** : seed de démo.
- `apps/payments/` — **créé** : `models.py` (`Payment`), `providers.py` (`PaymentProvider`, `ManualPaymentProvider`, `get_payment_provider`), `apps.py`, migration.
- `.env.example` — **modifié** : nouvelles variables.
- `tests/test_api_conventions.py`, `tests/test_emails.py`, `tests/test_celery.py`, `tests/test_payments.py`, `tests/test_seed_demo.py` — **créés**.

---

## Task 1 : Conventions DRF (pagination, filtres, erreurs)

**Files:**
- Modify: `backend/requirements/base.txt`
- Modify: `backend/config/settings/base.py`
- Create: `backend/apps/common/pagination.py`
- Create: `backend/apps/common/exceptions.py`
- Test: `backend/tests/test_api_conventions.py`

**Interfaces:**
- Produces : `apps.common.pagination.DefaultPagination` ; `apps.common.exceptions.bamfa_exception_handler(exc, context)` → `Response` dont `data = {"error": {"code", "message", "details"}}`.

- [ ] **Step 1 : Ajouter la dépendance django-filter**

Dans `backend/requirements/base.txt`, ajouter une ligne :

```
django-filter==24.*
```

- [ ] **Step 2 : Écrire le test (échec attendu)**

`backend/tests/test_api_conventions.py` :

```python
from rest_framework import exceptions

from apps.common.exceptions import bamfa_exception_handler
from apps.common.pagination import DefaultPagination


def test_pagination_par_defaut():
    p = DefaultPagination()
    assert p.page_size == 20
    assert p.page_size_query_param == "page_size"


def test_handler_erreur_validation():
    exc = exceptions.ValidationError({"email": ["Ce champ est requis."]})
    response = bamfa_exception_handler(exc, {})
    assert response is not None
    assert set(response.data["error"].keys()) == {"code", "message", "details"}
    assert response.data["error"]["details"] == {"email": ["Ce champ est requis."]}


def test_handler_erreur_authentification():
    exc = exceptions.NotAuthenticated()
    response = bamfa_exception_handler(exc, {})
    assert response.data["error"]["code"] == "not_authenticated"
    assert response.data["error"]["details"] == {}


def test_handler_ignore_les_exceptions_non_drf():
    assert bamfa_exception_handler(ValueError("boom"), {}) is None
```

- [ ] **Step 3 : Lancer le test (échec)**

Run: `cd backend && pytest tests/test_api_conventions.py -q`
Expected: FAIL (modules `pagination`/`exceptions` introuvables).

- [ ] **Step 4 : Créer la pagination**

`backend/apps/common/pagination.py` :

```python
from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
```

- [ ] **Step 5 : Créer le handler d'erreurs normalisé**

`backend/apps/common/exceptions.py` :

```python
from rest_framework.views import exception_handler


def bamfa_exception_handler(exc, context):
    """Format d'erreur normalisé : {"error": {"code", "message", "details"}}.

    Enveloppe le handler DRF par défaut. Retourne None pour les exceptions
    non-DRF (laissées à Django / au serveur d'application).
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    code = str(getattr(exc, "default_code", "") or "error")

    if isinstance(data, dict) and set(data.keys()) == {"detail"}:
        message = str(data["detail"])
        details = {}
    elif isinstance(data, dict):
        message = "Requête invalide."
        details = data
    else:
        message = "Erreur."
        details = {"detail": data}

    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response
```

- [ ] **Step 6 : Câbler DRF dans les settings**

Dans `backend/config/settings/base.py` :
- ajouter `"django_filters",` dans `INSTALLED_APPS` (après `"corsheaders",`) ;
- compléter le dict `REST_FRAMEWORK` avec :

```python
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "EXCEPTION_HANDLER": "apps.common.exceptions.bamfa_exception_handler",
```

- [ ] **Step 7 : Installer la dépendance + lancer le test (succès)**

Run: `cd backend && pip install -r requirements/dev.txt`
Run: `pytest tests/test_api_conventions.py -q`
Expected: PASS (4 tests).
Run: `ruff check .`
Expected: aucune erreur.

- [ ] **Step 8 : Commit**

```bash
git add requirements/base.txt config/settings/base.py apps/common/pagination.py apps/common/exceptions.py tests/test_api_conventions.py
git commit -m "feat: conventions DRF (pagination, filtres, format d'erreur normalise)"
```

---

## Task 2 : Abstraction email transactionnel

**Files:**
- Modify: `backend/config/settings/base.py`
- Modify: `backend/.env.example`
- Create: `backend/apps/common/emails.py`
- Create: `backend/apps/common/templates/emails/exemple.txt`
- Test: `backend/tests/test_emails.py`

**Interfaces:**
- Produces : `apps.common.emails.send_templated_email(*, subject, template_name, context, to, from_email=None) -> int` (nombre d'emails envoyés). Rend `emails/<template_name>.txt` (+ `.html` optionnel) et envoie via le backend email Django.

- [ ] **Step 1 : Configurer le backend email (console en dev)**

Dans `backend/config/settings/base.py`, ajouter (après le bloc CORS, par ex.) :

```python
EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="BAMFA <no-reply@bamfa.org>")
```

Dans `backend/.env.example`, documenter :

```
# Email (dev : console ; prod/Brevo : changer EMAIL_BACKEND)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=BAMFA <no-reply@bamfa.org>
```

- [ ] **Step 2 : Créer le template de démonstration**

`backend/apps/common/templates/emails/exemple.txt` :

```
Bonjour {{ nom }},

Ceci est un email de démonstration de la plateforme BAMFA.

L'équipe BAMFA
```

- [ ] **Step 3 : Écrire le test (échec attendu)**

`backend/tests/test_emails.py` :

```python
from apps.common.emails import send_templated_email


def test_envoi_email_template(mailoutbox):
    envoyes = send_templated_email(
        subject="Bienvenue",
        template_name="exemple",
        context={"nom": "Awa"},
        to="awa@example.org",
    )
    assert envoyes == 1
    assert len(mailoutbox) == 1
    message = mailoutbox[0]
    assert message.subject == "Bienvenue"
    assert message.to == ["awa@example.org"]
    assert "Awa" in message.body


def test_destinataire_unique_accepte_une_chaine(mailoutbox):
    send_templated_email(
        subject="Test", template_name="exemple", context={"nom": "X"}, to="x@example.org"
    )
    assert mailoutbox[0].to == ["x@example.org"]
```

*(La fixture `mailoutbox` de pytest-django bascule le backend email en mémoire et capture les envois.)*

- [ ] **Step 4 : Lancer le test (échec)**

Run: `cd backend && pytest tests/test_emails.py -q`
Expected: FAIL (`apps.common.emails` introuvable).

- [ ] **Step 5 : Implémenter le helper email**

`backend/apps/common/emails.py` :

```python
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string


def send_templated_email(*, subject, template_name, context, to, from_email=None):
    """Envoie un email transactionnel rendu depuis un template.

    Abstraction volontairement fine : aujourd'hui via le backend email Django
    (console en dev), demain via Brevo — il suffira de changer EMAIL_BACKEND,
    sans toucher aux appelants. Rend `emails/<template_name>.txt` (corps texte)
    et, si présent, `emails/<template_name>.html` (alternative HTML).
    """
    recipients = [to] if isinstance(to, str) else list(to)
    text_body = render_to_string(f"emails/{template_name}.txt", context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    try:
        html_body = render_to_string(f"emails/{template_name}.html", context)
        message.attach_alternative(html_body, "text/html")
    except TemplateDoesNotExist:
        pass

    return message.send()
```

- [ ] **Step 6 : Lancer le test (succès)**

Run: `cd backend && pytest tests/test_emails.py -q`
Expected: PASS (2 tests).
Run: `ruff check .`
Expected: aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add config/settings/base.py .env.example apps/common/emails.py apps/common/templates/emails/exemple.txt tests/test_emails.py
git commit -m "feat: abstraction email transactionnel (backend Django, repli console)"
```

---

## Task 3 : Celery + Redis

**Files:**
- Modify: `backend/requirements/base.txt`
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/settings/dev.py`
- Modify: `backend/config/__init__.py`
- Modify: `backend/.env.example`
- Create: `backend/config/celery.py`
- Create: `backend/apps/common/tasks.py`
- Test: `backend/tests/test_celery.py`

**Interfaces:**
- Produces : app Celery `config.celery.app` (exposée en `config.celery_app`) ; tâche `apps.common.tasks.ping` → `"pong"`. En dev/tests, `CELERY_TASK_ALWAYS_EAGER = True` (exécution inline, sans worker).

- [ ] **Step 1 : Ajouter la dépendance**

Dans `backend/requirements/base.txt`, ajouter :

```
celery[redis]==5.4.*
```

- [ ] **Step 2 : Écrire le test (échec attendu)**

`backend/tests/test_celery.py` :

```python
def test_tache_ping_en_mode_eager():
    from apps.common.tasks import ping

    result = ping.delay()
    assert result.get(timeout=5) == "pong"
```

- [ ] **Step 3 : Lancer le test (échec)**

Run: `cd backend && pip install -r requirements/dev.txt && pytest tests/test_celery.py -q`
Expected: FAIL (`apps.common.tasks` introuvable / Celery non configuré).

- [ ] **Step 4 : Créer l'app Celery**

`backend/config/celery.py` :

```python
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("bamfa")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

`backend/config/__init__.py` (remplacer le contenu vide par) :

```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```

- [ ] **Step 5 : Configurer Celery dans les settings**

Dans `backend/config/settings/base.py`, ajouter :

```python
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://127.0.0.1:6379/1")
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TIMEZONE = TIME_ZONE
```

Dans `backend/config/settings/dev.py`, ajouter (après l'import `from .base import *`) :

```python
CELERY_TASK_ALWAYS_EAGER = True  # exécution inline en dev/tests (pas de worker requis)
```

Dans `backend/.env.example`, documenter :

```
# Celery / Redis
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1
```

- [ ] **Step 6 : Créer la tâche de vérification**

`backend/apps/common/tasks.py` :

```python
from celery import shared_task


@shared_task
def ping():
    """Tâche de vérification du câblage Celery."""
    return "pong"
```

- [ ] **Step 7 : Lancer le test (succès)**

Run: `cd backend && pytest tests/test_celery.py -q`
Expected: PASS (exécution eager → `ping.delay().get()` == "pong").
Run: `pytest -q`
Expected: toute la suite au vert (Celery importé au démarrage n'a rien cassé).
Run: `ruff check .`
Expected: aucune erreur.

- [ ] **Step 8 : Commit**

```bash
git add requirements/base.txt config/celery.py config/__init__.py config/settings/base.py config/settings/dev.py .env.example apps/common/tasks.py tests/test_celery.py
git commit -m "feat: configuration Celery + Redis (eager en dev, tache ping)"
```

---

## Task 4 : Base paiement (`apps/payments`)

**Files:**
- Create: `backend/apps/payments/__init__.py`
- Create: `backend/apps/payments/apps.py`
- Create: `backend/apps/payments/models.py`
- Create: `backend/apps/payments/providers.py`
- Create: `backend/apps/payments/migrations/__init__.py`
- Create: `backend/apps/payments/migrations/0001_initial.py` (via `makemigrations`)
- Modify: `backend/config/settings/base.py`
- Modify: `backend/.env.example`
- Test: `backend/tests/test_payments.py`

**Interfaces:**
- Produces : `apps.payments.models.Payment` (statuts `en_attente`/`confirme`/`echoue`/`rembourse`, `mark_confirmed()`, `mark_failed()`) ; `apps.payments.providers.{PaymentProvider, ManualPaymentProvider, get_payment_provider}`. `get_payment_provider()` lit `settings.PAYMENT_PROVIDER` (défaut = provider manuel).

- [ ] **Step 1 : Créer l'app + le modèle**

`backend/apps/payments/__init__.py` : (fichier vide)

`backend/apps/payments/apps.py` :

```python
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    verbose_name = "Paiements"
```

`backend/apps/payments/models.py` :

```python
from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        CONFIRME = "confirme", "Confirmé"
        ECHOUE = "echoue", "Échoué"
        REMBOURSE = "rembourse", "Remboursé"

    amount = models.DecimalField("montant", max_digits=12, decimal_places=2)
    currency = models.CharField("devise", max_length=3, default="XOF")
    status = models.CharField(
        "statut", max_length=12, choices=Status.choices, default=Status.EN_ATTENTE
    )
    provider = models.CharField("fournisseur", max_length=50, default="manual")
    provider_reference = models.CharField(
        "référence fournisseur", max_length=255, blank=True
    )
    reference = models.CharField("référence interne", max_length=64, unique=True)
    metadata = models.JSONField("métadonnées", default=dict, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "paiement"
        verbose_name_plural = "paiements"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.amount} {self.currency} ({self.status})"

    def mark_confirmed(self):
        self.status = self.Status.CONFIRME

    def mark_failed(self):
        self.status = self.Status.ECHOUE
```

- [ ] **Step 2 : Créer l'interface fournisseur + l'impl. manuelle**

`backend/apps/payments/providers.py` :

```python
from abc import ABC, abstractmethod

from django.conf import settings
from django.utils.module_loading import import_string


class PaymentProvider(ABC):
    """Interface d'un fournisseur de paiement (agrégateur).

    Impl. manuelle aujourd'hui ; FedaPay/Kkiapay branchables plus tard
    en fournissant une autre implémentation (réglage PAYMENT_PROVIDER).
    """

    name = "base"

    @abstractmethod
    def create_checkout(self, payment):
        """Initie un paiement ; retourne un dict décrivant l'étape suivante."""

    @abstractmethod
    def verify_webhook(self, payload):
        """Valide un webhook entrant ; retourne le statut ou None."""


class ManualPaymentProvider(PaymentProvider):
    """Aucun agrégateur branché : le paiement reste 'en_attente' jusqu'à
    confirmation manuelle par un trésorier / administrateur."""

    name = "manual"

    def create_checkout(self, payment):
        return {"mode": "manuel", "reference": payment.reference, "checkout_url": None}

    def verify_webhook(self, payload):
        return None


def get_payment_provider():
    dotted = getattr(
        settings,
        "PAYMENT_PROVIDER",
        "apps.payments.providers.ManualPaymentProvider",
    )
    return import_string(dotted)()
```

- [ ] **Step 3 : Enregistrer l'app + le réglage**

Dans `backend/config/settings/base.py` :
- ajouter `"apps.payments",` à la fin de `INSTALLED_APPS` ;
- ajouter le réglage :

```python
PAYMENT_PROVIDER = env(
    "PAYMENT_PROVIDER", default="apps.payments.providers.ManualPaymentProvider"
)
```

Dans `backend/.env.example`, documenter :

```
# Paiement (manuel maintenant ; FedaPay/Kkiapay plus tard)
PAYMENT_PROVIDER=apps.payments.providers.ManualPaymentProvider
```

- [ ] **Step 4 : Générer la migration**

Run: `cd backend && python manage.py makemigrations payments`
Expected: crée `apps/payments/migrations/0001_initial.py`.

- [ ] **Step 5 : Écrire le test**

`backend/tests/test_payments.py` :

```python
import pytest

from apps.payments.models import Payment
from apps.payments.providers import ManualPaymentProvider, get_payment_provider


@pytest.mark.django_db
def test_transitions_de_statut():
    payment = Payment.objects.create(amount="1000.00", reference="REF-1")
    assert payment.status == Payment.Status.EN_ATTENTE
    payment.mark_confirmed()
    assert payment.status == Payment.Status.CONFIRME
    payment.mark_failed()
    assert payment.status == Payment.Status.ECHOUE


def test_provider_manuel_par_defaut():
    provider = get_payment_provider()
    assert isinstance(provider, ManualPaymentProvider)
    out = provider.create_checkout(Payment(amount="500.00", reference="REF-2"))
    assert out["mode"] == "manuel"
    assert out["checkout_url"] is None
    assert provider.verify_webhook({}) is None
```

- [ ] **Step 6 : Lancer le test + migrations + suite**

Run: `cd backend && pytest tests/test_payments.py -q`
Expected: PASS (2 tests).
Run: `python manage.py makemigrations --check --dry-run`
Expected: « No changes detected » (migration bien committée).
Run: `ruff check .`
Expected: aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add apps/payments config/settings/base.py .env.example tests/test_payments.py
git commit -m "feat: base paiement (Payment + PaymentProvider manuel, branchable)"
```

---

## Task 5 : Commande de seed de démonstration

**Files:**
- Create: `backend/apps/common/management/__init__.py`
- Create: `backend/apps/common/management/commands/__init__.py`
- Create: `backend/apps/common/management/commands/seed_demo.py`
- Test: `backend/tests/test_seed_demo.py`

**Interfaces:**
- Consumes : `apps.accounts.roles.create_roles`, `apps.accounts.models.Mandate`, `get_user_model()`.
- Produces : commande `python manage.py seed_demo` (idempotente) — rôles + 3 utilisateurs de démo (superuser admin, rédacteur, alumni) + mandat courant.

- [ ] **Step 1 : Écrire le test (échec attendu)**

`backend/tests/test_seed_demo.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.accounts.models import Mandate


@pytest.mark.django_db
def test_seed_demo_cree_les_donnees_et_est_idempotent():
    call_command("seed_demo")
    User = get_user_model()

    admin = User.objects.get(email="admin@bamfa.org")
    assert admin.is_superuser
    assert admin.groups.filter(name="Administrateur").exists()
    assert User.objects.filter(email="redacteur@bamfa.org").exists()
    assert Mandate.objects.filter(is_current=True).count() == 1

    # Idempotent : un second passage ne duplique rien.
    call_command("seed_demo")
    assert User.objects.filter(email="admin@bamfa.org").count() == 1
    assert Mandate.objects.filter(label="Mandat 2024-2026").count() == 1
```

- [ ] **Step 2 : Lancer le test (échec)**

Run: `cd backend && pytest tests/test_seed_demo.py -q`
Expected: FAIL (commande `seed_demo` inconnue).

- [ ] **Step 3 : Créer la commande**

`backend/apps/common/management/__init__.py` : (vide)
`backend/apps/common/management/commands/__init__.py` : (vide)

`backend/apps/common/management/commands/seed_demo.py` :

```python
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from apps.accounts.models import Mandate
from apps.accounts.roles import create_roles

User = get_user_model()

DEMO_USERS = [
    {
        "email": "admin@bamfa.org",
        "first_name": "Ada",
        "last_name": "Admin",
        "role": "Administrateur",
        "superuser": True,
    },
    {
        "email": "redacteur@bamfa.org",
        "first_name": "Rémi",
        "last_name": "Rédacteur",
        "role": "Rédacteur de contenu",
        "superuser": False,
    },
    {
        "email": "alumni@bamfa.org",
        "first_name": "Awa",
        "last_name": "Alumni",
        "role": "Alumni",
        "superuser": False,
    },
]

DEMO_PASSWORD = "bamfa1234"


class Command(BaseCommand):
    help = "Peuple un environnement de démonstration (rôles, utilisateurs, mandat). Idempotent."

    def handle(self, *args, **options):
        create_roles()

        for spec in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "is_staff": True,
                    "is_superuser": spec["superuser"],
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            user.groups.add(Group.objects.get(name=spec["role"]))

        Mandate.objects.get_or_create(
            label="Mandat 2024-2026",
            defaults={
                "start_date": date(2024, 1, 1),
                "end_date": date(2026, 12, 31),
                "is_current": True,
            },
        )

        self.stdout.write(
            self.style.SUCCESS("Données de démonstration créées / à jour.")
        )
```

- [ ] **Step 4 : Lancer le test (succès) + suite complète**

Run: `cd backend && pytest tests/test_seed_demo.py -q`
Expected: PASS.
Run: `pytest -q`
Expected: toute la suite au vert.
Run: `ruff check .`
Expected: aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add apps/common/management tests/test_seed_demo.py
git commit -m "feat: commande seed_demo (roles, utilisateurs, mandat de demonstration)"
```

---

## Vérification finale (manuelle)

- [ ] `pytest -q` : toute la suite au vert (nouveaux + existants).
- [ ] `python manage.py migrate` puis `python manage.py seed_demo` : crée l'admin de démo (`admin@bamfa.org` / `bamfa1234`), le rédacteur, l'alumni et le mandat courant.
- [ ] `python manage.py makemigrations --check --dry-run` : « No changes detected ».
- [ ] Le schéma OpenAPI est inchangé (aucun nouvel endpoint) → **pas de régénération du client frontend** nécessaire pour S5.

## Definition of Done (S5)

- [ ] Conventions DRF en place (pagination `DefaultPagination`, filtres django-filter, `bamfa_exception_handler`).
- [ ] `send_templated_email` opérationnel derrière le backend email Django (console en dev, Brevo branchable).
- [ ] Celery + Redis configurés (eager en dev/tests) ; tâche `ping` verte.
- [ ] `apps.payments` : `Payment` + `PaymentProvider`/`ManualPaymentProvider`/`get_payment_provider` + migration.
- [ ] `seed_demo` idempotente.
- [ ] `pytest -q` vert, `ruff check .` propre, migrations à jour.

## Points reportés (hors S5)

- Impl. **Brevo** (email) et **FedaPay/Kkiapay** (paiement) : quand les clés seront disponibles — brancher une nouvelle classe, sans toucher les appelants.
- **Registre partagé des entrées de nav admin** (pour limiter les conflits `Sidebar` entre pistes) : à poser côté frontend au premier module qui en a besoin (S6).
- **Seed de contenus** (articles, événements…) : ajouté par chaque slice métier au fil de l'eau.
- Endpoints API : apparaissent avec les modules (S6+) → régénération du client OpenAPI à ce moment-là.
