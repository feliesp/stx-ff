# Named entry points for the project. Run `make backend` and `make frontend`
# in two terminals, then open http://localhost:5173.

.PHONY: setup backend frontend test test-backend test-frontend lint

setup: ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

backend: ## Run the API (FastAPI on uvicorn, auto-reload) on :8000
	cd backend && uv run uvicorn app.main:app --reload --port 8000 --no-access-log

frontend: ## Run the UI dev server on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test: test-backend test-frontend ## Run all tests

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npm test -- --run

lint: ## Lint and check formatting
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint
