# Sprint 1 / S1 — Auth & rôles : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authentification des comptes internes (staff/admin) en JWT cookies httpOnly + fondation des rôles (groupes Django) + modèles transverses (`Mandate`, `PublishableMixin`).

**Architecture:** Backend Django/DRF. `User` custom (email = identifiant). `djangorestframework-simplejwt` avec vues custom qui posent les tokens dans des cookies httpOnly ; classe d'authentification DRF custom lisant le cookie et appliquant CSRF sur les requêtes authentifiées non sûres. Rôles = groupes Django seedés.

**Tech Stack:** Python 3.12, Django 5.2, DRF, djangorestframework-simplejwt (+ token_blacklist), PostgreSQL, pytest-django.

**Dépôt :** `backend` (répertoire `backend/`). Le `docker-compose.yml` (PostgreSQL/Redis) est à la racine du **workspace** (`c:/Users/CHARLOT/Personnel/Bamfa`).

**Spec de référence :** `docs/superpowers/specs/2026-06-21-sprint1-s1-auth-roles.md` (dans le dépôt workspace).

## Global Constraints

- Langue **française** (UI, contenus, commits). Messages de commit **sans aucune mention de Claude/IA/assistant** (cf. `backend/CLAUDE.md`).
- API versionnée sous `/api/v1/` ; endpoints auth sous `/api/v1/auth/`.
- **TDD** : test qui échoue → implémentation minimale → test qui passe → commit.
- Tokens **jamais** exposés au JS (cookies `HttpOnly`). CSRF sur les requêtes authentifiées non sûres.
- Tokens : access **15 min**, refresh **7 j**, rotation + blacklist.
- Environnement Windows / Git Bash : l'état shell ne persiste pas entre appels → utiliser le venv par chemin complet (`backend/.venv/Scripts/python.exe`).

---

## File Structure

**Créés dans `backend/apps/accounts/` :**
- `__init__.py`, `apps.py` — app Django.
- `managers.py` — `UserManager` (create_user / create_superuser).
- `models.py` — `User`, `Mandate`.
- `roles.py` — constante `ROLE_GROUPS` + `create_roles()` + `user_has_role()`.
- `authentication.py` — `CookieJWTAuthentication` (+ helper CSRF).
- `cookies.py` — `set_auth_cookies()` / `clear_auth_cookies()` (DRY).
- `serializers.py` — `LoginSerializer`, `UserSerializer`.
- `views.py` — `LoginView`, `LogoutView`, `RefreshView`, `MeView`.
- `urls.py` — routes `/api/v1/auth/`.
- `management/commands/seed_roles.py` — commande de seed.
- `migrations/` — migration initiale + data migration seed rôles.

**Modifiés :**
- `backend/config/settings/base.py` — `AUTH_USER_MODEL`, apps, `SIMPLE_JWT`, cookies, CORS/CSRF, auth class.
- `backend/config/urls.py` — inclusion des routes auth.

**Créés dans `backend/apps/common/` :**
- `models.py` — `PublishableMixin` (abstrait).

**Tests (`backend/tests/`) :**
- `test_user_model.py`, `test_auth_endpoints.py`, `test_roles.py`, `test_mandate.py`, `test_publishable.py`.

---

### Task 1: Modèle User personnalisé + réinitialisation de la base

**Files:**
- Create: `backend/apps/accounts/__init__.py`, `backend/apps/accounts/apps.py`, `backend/apps/accounts/managers.py`, `backend/apps/accounts/models.py`
- Modify: `backend/config/settings/base.py`
- Test: `backend/tests/test_user_model.py`

**Interfaces:**
- Consumes: socle Django S0.
- Produces: `apps.accounts.models.User` (email = `USERNAME_FIELD`, `REQUIRED_FIELDS=[]`), `AUTH_USER_MODEL = "accounts.User"`. `UserManager.create_user(email, password=None, **extra)` et `create_superuser(email, password=None, **extra)`.

- [ ] **Step 1: Créer l'app accounts (fichiers de base)**

`backend/apps/accounts/__init__.py` : (vide)

`backend/apps/accounts/apps.py` :
```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Comptes et rôles"
```

`backend/apps/accounts/managers.py` :
```python
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superutilisateur doit avoir is_superuser=True.")
        return self._create_user(email, password, **extra_fields)
```

- [ ] **Step 2: Write the failing test**

`backend/tests/test_user_model.py` :
```python
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user_avec_email():
    user = User.objects.create_user(email="Alice@Bamfa.org", password="motdepasse123")
    assert user.email == "Alice@bamfa.org"  # domaine normalisé
    assert user.check_password("motdepasse123")
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_create_user_sans_email_leve_erreur():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="x")


@pytest.mark.django_db
def test_create_superuser():
    admin = User.objects.create_superuser(email="admin@bamfa.org", password="x")
    assert admin.is_staff is True
    assert admin.is_superuser is True


@pytest.mark.django_db
def test_username_field_est_email():
    assert User.USERNAME_FIELD == "email"
    assert User.REQUIRED_FIELDS == []
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_user_model.py -v`
Expected: FAIL — `accounts.User` n'existe pas encore (erreur d'import / app non installée).

- [ ] **Step 4: Créer le modèle User + Mandate placeholder**

`backend/apps/accounts/models.py` :
```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField("adresse e-mail", unique=True)
    first_name = models.CharField("prénom", max_length=150, blank=True)
    last_name = models.CharField("nom", max_length=150, blank=True)
    is_active = models.BooleanField("actif", default=True)
    is_staff = models.BooleanField("équipe", default=False)
    date_joined = models.DateTimeField("date d'inscription", auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.email
```

- [ ] **Step 5: Activer l'app et le modèle User dans les settings**

Dans `backend/config/settings/base.py`, ajouter `"apps.accounts",` à `INSTALLED_APPS` (après `apps.common`) et ajouter la ligne `AUTH_USER_MODEL = "accounts.User"` juste après la définition de `DEFAULT_AUTO_FIELD` :
```python
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"
```

- [ ] **Step 6: Réinitialiser la base et migrer à neuf**

Le `User` custom impose une base vierge (S0 avait migré avec le User par défaut). Aucune donnée réelle → on réinitialise.

Run (depuis la racine workspace pour docker, puis backend pour Django) :
```bash
cd "c:/Users/CHARLOT/Personnel/Bamfa" && docker compose down -v && docker compose up -d db redis
```
Attendre que postgres soit prêt :
```bash
cd "c:/Users/CHARLOT/Personnel/Bamfa" && for i in $(seq 1 30); do docker compose exec -T db pg_isready -U bamfa >/dev/null 2>&1 && break; done
```
Puis générer et appliquer les migrations :
```bash
cd "c:/Users/CHARLOT/Personnel/Bamfa/backend" && .venv/Scripts/python.exe manage.py makemigrations accounts && .venv/Scripts/python.exe manage.py migrate
```
Expected: migration `accounts.0001_initial` créée et appliquée, plus les migrations Django standard sur la base vierge, sans erreur.

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_user_model.py -v`
Expected: PASS (4 passed).

- [ ] **Step 8: Vérifier createsuperuser (manuel, non commité)**

Run: `cd backend && .venv/Scripts/python.exe manage.py createsuperuser --email admin@bamfa.org --noinput` puis vérifier via `.venv/Scripts/python.exe manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.filter(is_superuser=True).count())"`
Expected: affiche `1` (le superuser existe ; ce compte de test peut rester, la base de dev est jetable).

- [ ] **Step 9: Commit**

```bash
cd backend && git add apps/accounts config/settings/base.py tests/test_user_model.py && git commit -m "feat(accounts): modele User personnalise (email identifiant) + base migree a neuf"
```

---

### Task 2: Fondation JWT (SimpleJWT, settings, auth cookie + CSRF)

**Files:**
- Modify: `backend/requirements/base.txt`, `backend/config/settings/base.py`
- Create: `backend/apps/accounts/authentication.py`
- Test: `backend/tests/test_auth_endpoints.py` (partie authentification)

**Interfaces:**
- Consumes: `User` (Task 1).
- Produces: `apps.accounts.authentication.CookieJWTAuthentication` (classe d'auth DRF lisant l'access token dans le cookie `settings.AUTH_COOKIE` et appliquant la vérification CSRF sur les méthodes non sûres). Constantes settings : `AUTH_COOKIE`, `AUTH_COOKIE_REFRESH`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_PATH`. `SIMPLE_JWT` configuré (access 15 min, refresh 7 j, rotation + blacklist).

- [ ] **Step 1: Ajouter la dépendance**

Dans `backend/requirements/base.txt`, ajouter :
```text
djangorestframework-simplejwt==5.3.*
```
Puis installer : `cd backend && .venv/Scripts/pip.exe install -r requirements/dev.txt`

- [ ] **Step 2: Configurer les settings (JWT, cookies, CORS/CSRF, auth class)**

Dans `backend/config/settings/base.py` :

a) Ajouter en haut : `from datetime import timedelta` (après les imports existants).

b) Ajouter à `INSTALLED_APPS` (après `"corsheaders",`) :
```python
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
```

c) Remplacer le bloc `REST_FRAMEWORK` existant par :
```python
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
    ],
}
```

d) Ajouter après le bloc `SPECTACULAR_SETTINGS` :
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Cookies d'authentification
AUTH_COOKIE = "bamfa_access"
AUTH_COOKIE_REFRESH = "bamfa_refresh"
AUTH_COOKIE_HTTP_ONLY = True
AUTH_COOKIE_SECURE = env.bool("AUTH_COOKIE_SECURE", default=False)
AUTH_COOKIE_SAMESITE = env("AUTH_COOKIE_SAMESITE", default="Lax")
AUTH_COOKIE_PATH = "/"
```

e) Remplacer la ligne `CORS_ALLOWED_ORIGINS = env.list(...)` par (ajout des credentials + CSRF trusted) :
```python
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"]
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"]
)
```

- [ ] **Step 3: Migrer (table blacklist)**

Run: `cd backend && .venv/Scripts/python.exe manage.py migrate`
Expected: migrations `token_blacklist` appliquées sans erreur.

- [ ] **Step 4: Write the failing test (classe d'auth par cookie)**

`backend/tests/test_auth_endpoints.py` :
```python
import pytest
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.authentication import CookieJWTAuthentication

User = get_user_model()


@pytest.mark.django_db
def test_cookie_auth_sans_cookie_retourne_none():
    factory = APIRequestFactory()
    request = factory.get("/api/v1/auth/me/")
    assert CookieJWTAuthentication().authenticate(request) is None


@pytest.mark.django_db
def test_cookie_auth_avec_access_valide_authentifie_sur_get():
    user = User.objects.create_user(email="a@bamfa.org", password="x")
    access = str(RefreshToken.for_user(user).access_token)
    factory = APIRequestFactory()
    request = factory.get("/api/v1/auth/me/")
    request.COOKIES[settings.AUTH_COOKIE] = access
    authenticated_user, _token = CookieJWTAuthentication().authenticate(request)
    assert authenticated_user == user
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -v`
Expected: FAIL — `apps.accounts.authentication` n'existe pas.

- [ ] **Step 6: Implémenter la classe d'authentification par cookie**

`backend/apps/accounts/authentication.py` :
```python
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


class CookieJWTAuthentication(JWTAuthentication):
    """Lit l'access token dans un cookie httpOnly et applique la
    vérification CSRF sur les requêtes non sûres (comme SessionAuthentication)."""

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE)
        if not raw_token:
            return None
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        self._enforce_csrf(request)
        return (user, validated_token)

    def _enforce_csrf(self, request):
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return
        check = _CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f"Échec CSRF : {reason}")
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -v`
Expected: PASS (2 passed).

- [ ] **Step 8: Commit**

```bash
cd backend && git add requirements/base.txt config/settings/base.py apps/accounts/authentication.py tests/test_auth_endpoints.py && git commit -m "feat(accounts): fondation JWT (simplejwt, cookies httpOnly, auth CSRF, CORS credentials)"
```

---

### Task 3: Endpoints login + me

**Files:**
- Create: `backend/apps/accounts/cookies.py`, `backend/apps/accounts/serializers.py`, `backend/apps/accounts/views.py`, `backend/apps/accounts/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/tests/test_auth_endpoints.py` (ajout)

**Interfaces:**
- Consumes: `User`, `CookieJWTAuthentication`, settings cookies (Tasks 1-2).
- Produces:
  - `set_auth_cookies(response, access, refresh)` et `clear_auth_cookies(response)` dans `cookies.py`.
  - `UserSerializer` (champs `id, email, first_name, last_name, is_staff, is_superuser, roles`) et `LoginSerializer` (`email`, `password`).
  - Endpoints `POST /api/v1/auth/login/` (pose cookies + renvoie user) et `GET /api/v1/auth/me/` (user courant, 401 sinon).

- [ ] **Step 1: Helper cookies (DRY)**

`backend/apps/accounts/cookies.py` :
```python
from django.conf import settings


def _common_kwargs():
    return {
        "httponly": settings.AUTH_COOKIE_HTTP_ONLY,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": settings.AUTH_COOKIE_PATH,
    }


def set_auth_cookies(response, access, refresh):
    response.set_cookie(settings.AUTH_COOKIE, str(access), **_common_kwargs())
    response.set_cookie(settings.AUTH_COOKIE_REFRESH, str(refresh), **_common_kwargs())
    return response


def clear_auth_cookies(response):
    response.delete_cookie(settings.AUTH_COOKIE, path=settings.AUTH_COOKIE_PATH)
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_PATH)
    return response
```

- [ ] **Step 2: Serializers**

`backend/apps/accounts/serializers.py` :
```python
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_staff", "is_superuser", "roles"]

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
```

- [ ] **Step 3: Write the failing test (login + me)**

Ajouter à `backend/tests/test_auth_endpoints.py` :
```python
from django.conf import settings as dj_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_pose_les_cookies_et_renvoie_user():
    User.objects.create_user(email="a@bamfa.org", password="motdepasse123")
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "a@bamfa.org", "password": "motdepasse123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["email"] == "a@bamfa.org"
    assert dj_settings.AUTH_COOKIE in response.cookies
    assert dj_settings.AUTH_COOKIE_REFRESH in response.cookies
    assert response.cookies[dj_settings.AUTH_COOKIE]["httponly"] is True


@pytest.mark.django_db
def test_login_identifiants_invalides_401():
    User.objects.create_user(email="a@bamfa.org", password="bon")
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "a@bamfa.org", "password": "mauvais"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_sans_auth_401():
    assert APIClient().get("/api/v1/auth/me/").status_code == 401


@pytest.mark.django_db
def test_me_avec_cookie_renvoie_user():
    User.objects.create_user(email="a@bamfa.org", password="motdepasse123")
    client = APIClient()
    client.post(
        "/api/v1/auth/login/",
        {"email": "a@bamfa.org", "password": "motdepasse123"},
        format="json",
    )
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 200
    assert response.data["email"] == "a@bamfa.org"
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -k "login or me" -v`
Expected: FAIL — les routes `/api/v1/auth/login/` et `/me/` n'existent pas (404).

- [ ] **Step 5: Vues login + me**

`backend/apps/accounts/views.py` :
```python
from django.contrib.auth import authenticate
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import set_auth_cookies
from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data)
        set_auth_cookies(response, refresh.access_token, refresh)
        get_token(request)  # force la pose du cookie CSRF
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
```

`backend/apps/accounts/urls.py` :
```python
from django.urls import path

from .views import LoginView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="auth-me"),
]
```

Dans `backend/config/urls.py`, ajouter l'inclusion des routes auth **avant** la ligne `path("api/v1/", include("apps.common.urls"))` :
```python
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.common.urls")),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -k "login or me" -v`
Expected: PASS (4 passed).

- [ ] **Step 7: Commit**

```bash
cd backend && git add apps/accounts config/urls.py tests/test_auth_endpoints.py && git commit -m "feat(accounts): endpoints login et me (cookies httpOnly)"
```

---

### Task 4: Endpoints refresh + logout + CSRF

**Files:**
- Modify: `backend/apps/accounts/views.py`, `backend/apps/accounts/urls.py`
- Test: `backend/tests/test_auth_endpoints.py` (ajout)

**Interfaces:**
- Consumes: `set_auth_cookies` / `clear_auth_cookies`, settings cookies, blacklist SimpleJWT (Tasks 2-3).
- Produces : `POST /api/v1/auth/refresh/` (lit le refresh cookie, rotation, repose l'access) et `POST /api/v1/auth/logout/` (efface les cookies, blackliste le refresh ; protégé CSRF car authentifié).

- [ ] **Step 1: Write the failing test (refresh + logout + CSRF)**

Ajouter à `backend/tests/test_auth_endpoints.py` :
```python
@pytest.mark.django_db
def test_refresh_repose_un_nouvel_access():
    User.objects.create_user(email="a@bamfa.org", password="motdepasse123")
    client = APIClient()
    client.post(
        "/api/v1/auth/login/",
        {"email": "a@bamfa.org", "password": "motdepasse123"},
        format="json",
    )
    response = client.post("/api/v1/auth/refresh/")
    assert response.status_code == 200
    assert dj_settings.AUTH_COOKIE in response.cookies


@pytest.mark.django_db
def test_logout_sans_csrf_est_refuse_puis_efface_les_cookies_avec_csrf():
    User.objects.create_user(email="a@bamfa.org", password="motdepasse123")
    client = APIClient(enforce_csrf_checks=True)
    client.post(
        "/api/v1/auth/login/",
        {"email": "a@bamfa.org", "password": "motdepasse123"},
        format="json",
    )
    # Sans en-tête CSRF -> refusé (403) car requête authentifiée non sûre
    refused = client.post("/api/v1/auth/logout/")
    assert refused.status_code == 403
    # Avec le token CSRF -> OK et cookies effacés
    csrf_token = client.cookies["csrftoken"].value
    ok = client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf_token)
    assert ok.status_code == 200
    assert ok.cookies[dj_settings.AUTH_COOKIE].value == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -k "refresh or logout" -v`
Expected: FAIL — routes `/refresh/` et `/logout/` absentes (404).

- [ ] **Step 3: Implémenter refresh + logout**

Ajouter à `backend/apps/accounts/views.py` (imports en tête du fichier) :
```python
from django.conf import settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken as RefreshTokenType

from .cookies import clear_auth_cookies
```
Puis les vues :
```python
class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw:
            return Response(
                {"detail": "Refresh token manquant."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshTokenType(raw)
        except TokenError:
            return Response(
                {"detail": "Refresh token invalide."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        access = refresh.access_token
        response = Response({"detail": "Token rafraîchi."})
        # Rotation : on blackliste l'ancien refresh et on en repose un neuf
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            try:
                refresh.blacklist()
            except AttributeError:
                pass
            user_id = refresh.get("user_id")
            new_refresh = RefreshTokenType()
            new_refresh["user_id"] = user_id
            set_auth_cookies(response, access, new_refresh)
        else:
            set_auth_cookies(response, access, refresh)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw:
            try:
                RefreshTokenType(raw).blacklist()
            except (TokenError, AttributeError):
                pass
        response = Response({"detail": "Déconnecté."})
        clear_auth_cookies(response)
        return response
```

Dans `backend/apps/accounts/urls.py`, ajouter les routes :
```python
from .views import LoginView, LogoutView, MeView, RefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth_endpoints.py -v`
Expected: PASS (tous les tests auth passent).

- [ ] **Step 5: Commit**

```bash
cd backend && git add apps/accounts tests/test_auth_endpoints.py && git commit -m "feat(accounts): endpoints refresh (rotation) et logout (blacklist) + protection CSRF"
```

---

### Task 5: Rôles (groupes Django) — seed + helper

**Files:**
- Create: `backend/apps/accounts/roles.py`, `backend/apps/accounts/management/__init__.py`, `backend/apps/accounts/management/commands/__init__.py`, `backend/apps/accounts/management/commands/seed_roles.py`
- Create: `backend/apps/accounts/migrations/0002_seed_roles.py`
- Test: `backend/tests/test_roles.py`

**Interfaces:**
- Consumes: `User` + groupes Django.
- Produces: `apps.accounts.roles.ROLE_GROUPS` (liste des 5 noms), `create_roles()` (idempotent), `user_has_role(user, name) -> bool`. Commande `manage.py seed_roles`. Data migration qui seed à l'installation.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_roles.py` :
```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.accounts.roles import ROLE_GROUPS, create_roles, user_has_role

User = get_user_model()


@pytest.mark.django_db
def test_create_roles_cree_les_groupes_et_est_idempotente():
    create_roles()
    create_roles()  # relance -> pas de doublon
    for name in ROLE_GROUPS:
        assert Group.objects.filter(name=name).count() == 1
    assert Group.objects.filter(name__in=ROLE_GROUPS).count() == len(ROLE_GROUPS)


@pytest.mark.django_db
def test_user_has_role():
    create_roles()
    user = User.objects.create_user(email="a@bamfa.org", password="x")
    user.groups.add(Group.objects.get(name="Administrateur"))
    assert user_has_role(user, "Administrateur") is True
    assert user_has_role(user, "Trésorier") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_roles.py -v`
Expected: FAIL — `apps.accounts.roles` n'existe pas.

- [ ] **Step 3: Implémenter roles.py**

`backend/apps/accounts/roles.py` :
```python
from django.contrib.auth.models import Group

ROLE_GROUPS = [
    "Alumni",
    "Rédacteur de contenu",
    "Secrétaire",
    "Trésorier",
    "Administrateur",
]


def create_roles():
    """Crée les groupes de rôles. Idempotent."""
    for name in ROLE_GROUPS:
        Group.objects.get_or_create(name=name)


def user_has_role(user, name):
    return user.is_authenticated and user.groups.filter(name=name).exists()
```

- [ ] **Step 4: Commande de management**

`backend/apps/accounts/management/__init__.py` : (vide)
`backend/apps/accounts/management/commands/__init__.py` : (vide)

`backend/apps/accounts/management/commands/seed_roles.py` :
```python
from django.core.management.base import BaseCommand

from apps.accounts.roles import ROLE_GROUPS, create_roles


class Command(BaseCommand):
    help = "Crée les groupes de rôles BAMFA (idempotent)."

    def handle(self, *args, **options):
        create_roles()
        self.stdout.write(self.style.SUCCESS(f"Rôles seedés : {', '.join(ROLE_GROUPS)}"))
```

- [ ] **Step 5: Data migration (seed à l'installation)**

Créer `backend/apps/accounts/migrations/0002_seed_roles.py` :
```python
from django.db import migrations

ROLE_GROUPS = [
    "Alumni",
    "Rédacteur de contenu",
    "Secrétaire",
    "Trésorier",
    "Administrateur",
]


def seed_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in ROLE_GROUPS:
        Group.objects.get_or_create(name=name)


def unseed_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=ROLE_GROUPS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("auth", "0001_initial"),
    ]
    operations = [migrations.RunPython(seed_roles, unseed_roles)]
```

- [ ] **Step 6: Appliquer la migration et lancer les tests**

Run:
```bash
cd backend && .venv/Scripts/python.exe manage.py migrate && .venv/Scripts/python.exe -m pytest tests/test_roles.py -v
```
Expected: migration `0002_seed_roles` appliquée ; tests PASS (2 passed).

- [ ] **Step 7: Commit**

```bash
cd backend && git add apps/accounts tests/test_roles.py && git commit -m "feat(accounts): roles = groupes Django (seed idempotent + data migration + helper)"
```

---

### Task 6: Modèle Mandate

**Files:**
- Modify: `backend/apps/accounts/models.py`
- Create: `backend/apps/accounts/migrations/0003_mandate.py` (auto-générée)
- Test: `backend/tests/test_mandate.py`

**Interfaces:**
- Consumes: app accounts.
- Produces: `apps.accounts.models.Mandate` (`label`, `start_date`, `end_date` nullable, `is_current`). Règle : mettre un mandat `is_current=True` bascule les autres à `False`.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_mandate.py` :
```python
import datetime

import pytest

from apps.accounts.models import Mandate


@pytest.mark.django_db
def test_un_seul_mandat_courant():
    m1 = Mandate.objects.create(
        label="Mandat 2022-2024", start_date=datetime.date(2022, 1, 1), is_current=True
    )
    m2 = Mandate.objects.create(
        label="Mandat 2024-2026", start_date=datetime.date(2024, 1, 1), is_current=True
    )
    m1.refresh_from_db()
    assert m2.is_current is True
    assert m1.is_current is False


@pytest.mark.django_db
def test_str_mandate():
    m = Mandate.objects.create(label="Mandat 2024-2026", start_date=datetime.date(2024, 1, 1))
    assert str(m) == "Mandat 2024-2026"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_mandate.py -v`
Expected: FAIL — `Mandate` n'existe pas.

- [ ] **Step 3: Ajouter le modèle Mandate**

Ajouter à `backend/apps/accounts/models.py` :
```python
class Mandate(models.Model):
    label = models.CharField("libellé", max_length=150)
    start_date = models.DateField("date de début")
    end_date = models.DateField("date de fin", null=True, blank=True)
    is_current = models.BooleanField("mandat courant", default=False)

    class Meta:
        verbose_name = "mandat"
        verbose_name_plural = "mandats"
        ordering = ["-start_date"]

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            Mandate.objects.exclude(pk=self.pk).filter(is_current=True).update(
                is_current=False
            )
```

- [ ] **Step 4: Générer et appliquer la migration**

Run: `cd backend && .venv/Scripts/python.exe manage.py makemigrations accounts && .venv/Scripts/python.exe manage.py migrate`
Expected: `0003_mandate` (ou nom équivalent) créée et appliquée.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_mandate.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
cd backend && git add apps/accounts tests/test_mandate.py && git commit -m "feat(accounts): modele Mandate (un seul mandat courant)"
```

---

### Task 7: PublishableMixin (app common)

**Files:**
- Create: `backend/apps/common/models.py`
- Test: `backend/tests/test_publishable.py`

**Interfaces:**
- Consumes: rien.
- Produces: `apps.common.models.PublishableMixin` (abstrait) : champ `status` (`brouillon`/`publie`/`depublie`), `published_at` nullable, méthodes `publish()` / `unpublish()` (ne sauvegardent pas — le modèle concret appelle `save()`), propriété `is_published`.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_publishable.py` :
```python
import pytest
from django.db import models
from django.test.utils import isolate_apps

from apps.common.models import PublishableMixin


@isolate_apps("tests")
def test_publish_et_unpublish():
    class Article(PublishableMixin):
        class Meta:
            app_label = "tests"

    article = Article()
    assert article.status == PublishableMixin.Status.BROUILLON
    assert article.is_published is False

    article.publish()
    assert article.status == PublishableMixin.Status.PUBLIE
    assert article.published_at is not None
    assert article.is_published is True

    article.unpublish()
    assert article.status == PublishableMixin.Status.DEPUBLIE
    assert article.is_published is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_publishable.py -v`
Expected: FAIL — `apps.common.models.PublishableMixin` n'existe pas.

- [ ] **Step 3: Implémenter PublishableMixin**

`backend/apps/common/models.py` :
```python
from django.db import models
from django.utils import timezone


class PublishableMixin(models.Model):
    class Status(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        PUBLIE = "publie", "Publié"
        DEPUBLIE = "depublie", "Dépublié"

    status = models.CharField(
        "statut", max_length=10, choices=Status.choices, default=Status.BROUILLON
    )
    published_at = models.DateTimeField("date de publication", null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def is_published(self):
        return self.status == self.Status.PUBLIE

    def publish(self):
        self.status = self.Status.PUBLIE
        self.published_at = timezone.now()

    def unpublish(self):
        self.status = self.Status.DEPUBLIE
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_publishable.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Suite complète + lint (vérification finale)**

Run:
```bash
cd backend && .venv/Scripts/python.exe -m pytest -v && .venv/Scripts/ruff.exe check .
```
Expected: tous les tests passent (User, auth, roles, mandate, publishable, health, schema), `ruff` propre.

- [ ] **Step 6: Commit**

```bash
cd backend && git add apps/common/models.py tests/test_publishable.py && git commit -m "feat(common): PublishableMixin (statut de publication, abstrait)"
```

---

## Definition of Done — S1

- [ ] `User` custom (email), base migrée à neuf, `createsuperuser` OK.
- [ ] `login` / `me` / `refresh` / `logout` fonctionnels en cookies httpOnly, CSRF appliqué sur requêtes authentifiées non sûres.
- [ ] Rotation + blacklist du refresh actives.
- [ ] 5 groupes de rôles seedés (commande + data migration), helper `user_has_role`.
- [ ] `Mandate` (un seul courant) et `PublishableMixin` (abstrait) avec tests.
- [ ] `CORS_ALLOW_CREDENTIALS` + `CSRF_TRUSTED_ORIGINS` configurés.
- [ ] Suite `pytest` verte, `ruff` propre.

## Self-Review (effectuée)

- **Couverture spec** : User custom (T1), JWT+CSRF+cookies (T2), login/me (T3), refresh/logout+rotation/blacklist (T4), rôles/groupes+seed (T5), Mandate (T6), PublishableMixin (T7), CORS/CSRF settings (T2) → toutes les sections de la spec sont couvertes.
- **Placeholders** : aucun ; code complet à chaque étape.
- **Cohérence des types** : `AUTH_COOKIE`/`AUTH_COOKIE_REFRESH` (settings) ↔ `cookies.py` ↔ `authentication.py` ↔ tests ; `ROLE_GROUPS` partagé entre `roles.py`, la commande et la data migration (valeurs identiques) ; `CookieJWTAuthentication` produite en T2 et consommée par les endpoints protégés T3/T4.
- **Note** : la data migration (T5) duplique volontairement la liste `ROLE_GROUPS` (les migrations ne doivent pas importer le code applicatif, susceptible d'évoluer) — c'est une pratique Django standard, pas une violation DRY.
