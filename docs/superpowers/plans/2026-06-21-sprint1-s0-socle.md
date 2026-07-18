# Sprint 1 / S0 — Socle technique : Implementation Plan

> **Auteur** : Charlot DEDINOU
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place un monorepo fonctionnel (backend Django/DRF + PostgreSQL, frontend Next.js, client API typé, CI) qui débloque le développement parallèle des autres slices.

**Architecture:** Backend Django/DRF headless exposant une API REST sous `/api/v1/`, frontend Next.js (App Router, TypeScript) consommant cette API via un client typé généré depuis le schéma OpenAPI. PostgreSQL et Redis tournent via Docker Compose ; backend et frontend tournent localement pendant le développement.

**Tech Stack:** Python 3.12, Django 5.2 LTS, Django REST Framework 3.15, drf-spectacular, psycopg 3, pytest-django, ruff · Node 22, Next.js 15, React 19, TypeScript 5, Vitest, openapi-typescript · Docker Compose (PostgreSQL 16, Redis 7) · GitHub Actions.

## Global Constraints

- Langue : **français** pour l'UI, les contenus et les messages de commit (cf. `CLAUDE.md`).
- Commits : **jamais de mention de Claude / IA / assistant** (cf. `CLAUDE.md`).
- API versionnée sous `/api/v1/`.
- Backend dans `backend/`, frontend dans `frontend/` (monorepo).
- Configuration par variables d'environnement ; aucun secret commité (`.env` ignoré, `.env.example` versionné).
- TDD : test qui échoue d'abord, puis implémentation minimale, puis test qui passe, puis commit.

---

## File Structure

**Backend (`backend/`)**
- `manage.py` — point d'entrée Django.
- `config/settings/base.py`, `config/settings/dev.py` — settings séparés.
- `config/urls.py`, `config/wsgi.py`, `config/asgi.py` — routage et serveurs.
- `apps/common/views.py`, `apps/common/urls.py` — endpoints transverses (health).
- `requirements/base.txt`, `requirements/dev.txt` — dépendances.
- `pytest.ini`, `ruff.toml`, `.env.example` — config tests/lint/env.
- `tests/test_health.py`, `tests/test_schema.py` — tests du socle.

**Frontend (`frontend/`)**
- `app/layout.tsx`, `app/page.tsx` — App Router de base.
- `components/Brand.tsx` — composant de marque (testable).
- `lib/api/client.ts` — wrapper fetch typé vers l'API.
- `lib/api/client.test.ts`, `components/Brand.test.tsx` — tests.
- `vitest.config.ts`, `vitest.setup.ts`, `package.json`, `tsconfig.json`, `.env.example`.

**Racine**
- `docker-compose.yml` — services PostgreSQL + Redis.
- `.github/workflows/ci.yml` — intégration continue.

---

### Task 1: Docker Compose — PostgreSQL + Redis

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Consumes: rien.
- Produces: services `db` (PostgreSQL sur `localhost:5432`, base `bamfa`, user `bamfa`, mot de passe `bamfa`) et `redis` (sur `localhost:6379`). Variables d'env consommées par les tâches suivantes : `POSTGRES_DB=bamfa`, `POSTGRES_USER=bamfa`, `POSTGRES_PASSWORD=bamfa`.

- [ ] **Step 1: Créer `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-bamfa}
      POSTGRES_USER: ${POSTGRES_USER:-bamfa}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-bamfa}
    ports:
      - "5432:5432"
    volumes:
      - ./docker/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-bamfa}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

- [ ] **Step 2: Créer `.env.example` (racine)**

```dotenv
POSTGRES_DB=bamfa
POSTGRES_USER=bamfa
POSTGRES_PASSWORD=bamfa
```

- [ ] **Step 3: Démarrer et vérifier les services**

Run: `docker compose up -d db redis`
Then: `docker compose ps`
Expected: les services `db` et `redis` sont `running` ; `db` devient `healthy` après quelques secondes.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: ajout docker compose (postgres + redis)"
```

---

### Task 2: Backend Django/DRF + endpoint de santé (TDD)

**Files:**
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings/__init__.py`
- Create: `backend/config/settings/base.py`
- Create: `backend/config/settings/dev.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/config/asgi.py`
- Create: `backend/apps/__init__.py`
- Create: `backend/apps/common/__init__.py`
- Create: `backend/apps/common/apps.py`
- Create: `backend/apps/common/views.py`
- Create: `backend/apps/common/urls.py`
- Create: `backend/requirements/base.txt`
- Create: `backend/requirements/dev.txt`
- Create: `backend/pytest.ini`
- Create: `backend/ruff.toml`
- Create: `backend/.env.example`
- Test: `backend/tests/__init__.py`, `backend/tests/test_health.py`

**Interfaces:**
- Consumes: PostgreSQL de la Task 1.
- Produces: endpoint `GET /api/v1/health/` → `200` avec JSON `{"status": "ok"}`. Settings activés par `DJANGO_SETTINGS_MODULE=config.settings.dev`.

- [ ] **Step 1: Créer les dépendances backend**

`backend/requirements/base.txt` :
```text
Django==5.2.*
djangorestframework==3.15.*
drf-spectacular==0.28.*
psycopg[binary]==3.2.*
django-environ==0.11.*
django-cors-headers==4.4.*
```

`backend/requirements/dev.txt` :
```text
-r base.txt
pytest==8.*
pytest-django==4.*
ruff==0.6.*
```

- [ ] **Step 2: Créer l'environnement virtuel et installer (PowerShell)**

Run:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements/dev.txt
```
Expected: installation sans erreur.

- [ ] **Step 3: Créer le squelette Django**

`backend/manage.py` :
```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

`backend/config/__init__.py` : (fichier vide)

`backend/config/settings/__init__.py` : (fichier vide)

`backend/config/settings/base.py` :
```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-key-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "apps.common",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="bamfa"),
        "USER": env("POSTGRES_USER", default="bamfa"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="bamfa"),
        "HOST": env("POSTGRES_HOST", default="127.0.0.1"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Porto-Novo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API BAMFA",
    "DESCRIPTION": "API de la plateforme BAMFA",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"]
)
```

`backend/config/settings/dev.py` :
```python
from .base import *  # noqa: F401,F403
```

`backend/config/urls.py` :
```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.common.urls")),
]
```

`backend/config/wsgi.py` :
```python
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
application = get_wsgi_application()
```

`backend/config/asgi.py` :
```python
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
application = get_asgi_application()
```

`backend/apps/__init__.py` : (fichier vide)
`backend/apps/common/__init__.py` : (fichier vide)

`backend/apps/common/apps.py` :
```python
from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
```

- [ ] **Step 4: Créer les fichiers de config tests/lint/env**

`backend/pytest.ini` :
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.dev
python_files = test_*.py
testpaths = tests
```

`backend/ruff.toml` :
```toml
line-length = 100
target-version = "py312"

[lint]
select = ["E", "F", "I", "UP", "B"]
```

`backend/.env.example` :
```dotenv
DJANGO_SECRET_KEY=dev-insecure-key-change-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
POSTGRES_DB=bamfa
POSTGRES_USER=bamfa
POSTGRES_PASSWORD=bamfa
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Then create the real `.env` for local dev:
```powershell
Copy-Item .env.example .env
```

- [ ] **Step 5: Write the failing test**

`backend/tests/__init__.py` : (fichier vide)

`backend/tests/test_health.py` :
```python
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_endpoint_returns_ok():
    client = APIClient()
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pytest tests/test_health.py -v`
Expected: FAIL — l'URL `/api/v1/health/` n'existe pas encore (404) ou import error (`apps.common.urls` absent).

- [ ] **Step 7: Write minimal implementation**

`backend/apps/common/views.py` :
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})
```

`backend/apps/common/urls.py` :
```python
from django.urls import path

from .views import health

urlpatterns = [
    path("health/", health, name="health"),
]
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pytest tests/test_health.py -v`
Expected: PASS (1 passed).

- [ ] **Step 9: Vérifier le serveur et le lint**

Run:
```powershell
python manage.py migrate
python manage.py check
ruff check .
```
Expected: `migrate` applique les migrations par défaut ; `check` → "System check identified no issues" ; `ruff check` → "All checks passed!".

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): socle Django/DRF + endpoint de sante"
```

---

### Task 3: Schéma OpenAPI (drf-spectacular) (TDD)

**Files:**
- Modify: `backend/config/urls.py`
- Test: `backend/tests/test_schema.py`

**Interfaces:**
- Consumes: socle DRF de la Task 2.
- Produces: endpoint `GET /api/v1/schema/?format=json` → `200`, corps JSON dont la clé `openapi` commence par `"3"`. C'est la source du client typé frontend (Task 5).

- [ ] **Step 1: Write the failing test**

`backend/tests/test_schema.py` :
```python
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_openapi_schema_is_available():
    client = APIClient()
    response = client.get("/api/v1/schema/?format=json")
    assert response.status_code == 200
    assert response.json()["openapi"].startswith("3")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_schema.py -v`
Expected: FAIL — l'URL `/api/v1/schema/` n'existe pas (404).

- [ ] **Step 3: Write minimal implementation**

Modifier `backend/config/urls.py` :
```python
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/v1/", include("apps.common.urls")),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_schema.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/config/urls.py backend/tests/test_schema.py
git commit -m "feat(backend): exposition du schema OpenAPI"
```

---

### Task 4: Frontend Next.js + composant Brand (TDD)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/components/Brand.tsx`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Create: `frontend/.env.example`
- Test: `frontend/components/Brand.test.tsx`

**Interfaces:**
- Consumes: rien (frontend autonome à ce stade).
- Produces: app Next.js démarrable (`npm run dev` sur `http://localhost:3000`), composant `Brand` exporté depuis `components/Brand.tsx` affichant le texte `"BAMFA"`.

- [ ] **Step 1: Créer `package.json`**

`frontend/package.json` :
```json
{
  "name": "bamfa-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "generate:api": "openapi-typescript http://localhost:8000/api/v1/schema/?format=json -o lib/api/schema.d.ts"
  },
  "dependencies": {
    "next": "15.*",
    "react": "19.*",
    "react-dom": "19.*"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.*",
    "@testing-library/react": "16.*",
    "@types/node": "22.*",
    "@types/react": "19.*",
    "@types/react-dom": "19.*",
    "@vitejs/plugin-react": "4.*",
    "jsdom": "25.*",
    "openapi-typescript": "7.*",
    "typescript": "5.*",
    "vitest": "2.*"
  }
}
```

- [ ] **Step 2: Installer les dépendances**

Run:
```powershell
cd frontend
npm install
```
Expected: installation sans erreur, `node_modules/` créé.

- [ ] **Step 3: Créer la config TypeScript / Next / Vitest**

`frontend/tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`frontend/next.config.ts` :
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`frontend/vitest.config.ts` :
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`frontend/vitest.setup.ts` :
```typescript
import "@testing-library/jest-dom";
```

`frontend/.env.example` :
```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

- [ ] **Step 4: Write the failing test**

`frontend/components/Brand.test.tsx` :
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Brand } from "./Brand";

describe("Brand", () => {
  it("affiche le nom BAMFA", () => {
    render(<Brand />);
    expect(screen.getByText("BAMFA")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `./Brand` introuvable (module non résolu).

- [ ] **Step 6: Write minimal implementation**

`frontend/components/Brand.tsx` :
```tsx
export function Brand() {
  return <span>BAMFA</span>;
}
```

`frontend/app/layout.tsx` :
```tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "BAMFA",
  description: "Plateforme de la Benin Association of the Mastercard Foundation Alumni",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

`frontend/app/page.tsx` :
```tsx
import { Brand } from "@/components/Brand";

export default function HomePage() {
  return (
    <main>
      <h1>
        <Brand />
      </h1>
    </main>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (1 passed).

- [ ] **Step 8: Vérifier le build**

Run: `npm run build`
Expected: build Next.js réussi sans erreur.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): socle Next.js + composant Brand"
```

---

### Task 5: Client API typé (TDD)

**Files:**
- Create: `frontend/lib/api/client.ts`
- Test: `frontend/lib/api/client.test.ts`

**Interfaces:**
- Consumes: variable d'env `NEXT_PUBLIC_API_BASE_URL` (Task 4) ; schéma OpenAPI (Task 3) pour générer `lib/api/schema.d.ts` via `npm run generate:api`.
- Produces: fonction `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` qui préfixe `NEXT_PUBLIC_API_BASE_URL`, envoie `credentials: "include"` (pour les cookies httpOnly de l'auth, slice S1), et lève `ApiError` (avec `.status`) si la réponse n'est pas `ok`.

- [ ] **Step 1: Write the failing test**

`frontend/lib/api/client.test.ts` :
```typescript
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("prefixe l'URL de base et inclut les credentials", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const data = await apiFetch<{ status: string }>("/health/");

    expect(data).toEqual({ status: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/health/");
    expect(init?.credentials).toBe("include");
  });

  it("leve ApiError avec le status sur reponse non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );

    await expect(apiFetch("/secret/")).rejects.toMatchObject({ status: 403 });
    await expect(apiFetch("/secret/")).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- client`
Expected: FAIL — `./client` introuvable.

- [ ] **Step 3: Write minimal implementation**

`frontend/lib/api/client.ts` :
```typescript
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- client`
Expected: PASS (2 passed).

- [ ] **Step 5: Générer les types depuis le schéma (vérification d'intégration)**

Prérequis : backend lancé (`python manage.py runserver` dans `backend/` avec le venv activé et `docker compose up -d db redis`).
Run (dans `frontend/`): `npm run generate:api`
Expected: fichier `frontend/lib/api/schema.d.ts` créé, contenant `export interface paths` avec une entrée `"/health/"`.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/api/
git commit -m "feat(frontend): client API type + generation des types OpenAPI"
```

---

### Task 6: Intégration continue (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: commandes de test backend (`pytest`) et frontend (`npm run test`, `npm run build`).
- Produces: workflow CI qui s'exécute sur push et pull request.

- [ ] **Step 1: Créer le workflow**

`.github/workflows/ci.yml` :
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: bamfa
          POSTGRES_USER: bamfa
          POSTGRES_PASSWORD: bamfa
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U bamfa"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    env:
      POSTGRES_HOST: 127.0.0.1
      DJANGO_SECRET_KEY: ci-secret-key
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements/dev.txt
      - run: ruff check .
      - run: pytest -v

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Vérifier localement les commandes du workflow**

Run (backend, venv activé, services docker up):
```powershell
cd backend
ruff check .
pytest -v
```
Expected: lint OK, tous les tests passent.

Run (frontend):
```powershell
cd frontend
npm run test
npm run build
```
Expected: tests passent, build réussi.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: integration continue backend (pytest) et frontend (vitest + build)"
```

---

## Definition of Done — S0

- [ ] `docker compose up -d db redis` démarre PostgreSQL + Redis.
- [ ] Backend : `pytest` vert (health + schema), `ruff check` propre, `manage.py runserver` sert `/api/v1/health/` et `/api/v1/docs/`.
- [ ] Frontend : `npm run test` vert, `npm run build` réussi, `npm run dev` sert la page d'accueil.
- [ ] `npm run generate:api` produit `lib/api/schema.d.ts` depuis le schéma backend.
- [ ] Workflow CI présent et exécutable.
- [ ] Toutes les modifications commitées sur une branche `feat/s0-socle`.

## Self-Review (effectuée)

- **Couverture spec** : S0 (monorepo, Django/DRF, PostgreSQL, Next.js, client API typé, CI) → toutes couvertes par les Tasks 1-6.
- **Placeholders** : aucun — chaque étape contient le code/commande réels.
- **Cohérence des types** : `apiFetch` / `ApiError` / endpoint `/health/` / clé `openapi` du schéma sont cohérents entre Task 2, 3 et 5.
