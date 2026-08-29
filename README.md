# Cortex Library

AI-powered digital library and adaptive reading ecosystem.

## Overview

Cortex Library is a full-stack platform for browsing, issuing, and reading digital books with background attention analysis and personalized recommendations.

This repository contains:

- **frontend** — React + Vite web application
- **backend** — Node.js + Express REST API
- **ml-service** — Python + FastAPI attention analysis service
- **database** — PostgreSQL migrations and seeds (future phases)

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+ (for local development without Docker)
- [Python](https://www.python.org/) 3.11+ (for local ML service development)

## Quick Start (Docker)

1. Copy environment templates:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp ml-service/.env.example ml-service/.env
   ```

2. Start all services:

   ```bash
   docker compose up --build
   ```

   Or run in detached mode:

   ```bash
   npm run docker:up
   ```

3. Open the application:

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - ML Service: http://localhost:8000

## Health Endpoints

| Service  | Endpoint           | Description              |
|----------|--------------------|--------------------------|
| Backend  | `GET /api/health`  | API and database status  |
| ML       | `GET /health`      | ML service status        |

Example:

```bash
curl http://localhost:3000/api/health
curl http://localhost:8000/health
```

## Local Development (Without Docker)

### PostgreSQL

Run PostgreSQL locally or via Docker:

```bash
docker compose up postgres -d
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### ML Service

```bash
cd ml-service
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Project Structure

```
CortexLibrary/
├── frontend/          # React + Vite application
├── backend/           # Express REST API
├── ml-service/        # FastAPI ML service
├── database/          # Migrations and seeds
├── docs/              # Project documentation
├── docker-compose.yml
└── package.json       # Root dev scripts
```

## Root Scripts

| Script            | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start all services via Docker      |
| `npm run docker:up`   | Build and start in background  |
| `npm run docker:down` | Stop all services              |
| `npm run docker:logs` | Follow service logs            |
| `npm run dev:frontend` | Run frontend locally          |
| `npm run dev:backend`  | Run backend locally           |
| `npm run dev:ml`       | Run ML service locally        |

## Current Phase

Foundation setup only. The following are **not yet implemented**:

- Authentication (JWT, Google OAuth)
- Book catalog and issuing
- In-app reader
- Attention engine and camera capture
- Reading analytics and recommendations
- Database schema and migrations

## Documentation

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for the full project protocol, architecture, and development status.

## License

Private project — all rights reserved.
