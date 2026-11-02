# Named entry points for the project. Run `make backend` and `make frontend`
# in two terminals, then open http://localhost:5173.

# Override if port 8000 is busy: `make backend API_PORT=8010` and `make frontend API_PORT=8010`.
API_PORT ?= 8000

.PHONY: setup backend frontend test test-backend test-frontend lint

setup: ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

backend: ## Run the API (FastAPI on uvicorn, auto-reload) on :$(API_PORT)
	cd backend && uv run uvicorn app.main:app --reload --port $(API_PORT) --no-access-log

frontend: ## Run the UI dev server on :5173 (proxies /api to :$(API_PORT))
	cd frontend && API_URL=http://localhost:$(API_PORT) npm run dev

test: test-backend test-frontend ## Run all tests

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npm test -- --run

lint: ## Lint and check formatting
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint
