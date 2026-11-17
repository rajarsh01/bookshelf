# BookShelf: Docker Compose + CI/CD Pipeline

A small reading-list web app that demonstrates two DevOps practices:

1. **Multi-container application**: a Node.js web service and a PostgreSQL database, started together with Docker Compose.
2. **CI/CD pipeline**: GitHub Actions builds and tests the code with npm, builds a Docker image, pushes it to GitHub Container Registry, and deploys it.

## Architecture

```
 Browser ──► web (Node.js + Express, port 3000) ──► db (PostgreSQL 16)
                                                      └─ volume: db_data
```

## Project structure

```
├── src/                      # app code (app.js = routes, db.js = PostgreSQL, server.js = start-up)
├── public/index.html         # front-end page
├── test/app.test.js          # automated tests (run by the pipeline)
├── Dockerfile                # builds the web image
├── docker-compose.yml        # local: web + db (builds the image)
├── docker-compose.prod.yml   # deploy: web + db (pulls the image from GHCR)
└── .github/workflows/ci-cd.yml   # the pipeline
```

## Run locally

Requires Docker Desktop.

```bash
docker compose up --build
```

Open http://localhost:3000. Add books, change their status, delete them.
Data lives in PostgreSQL and survives restarts (volume `db_data`).

```bash
docker compose ps          # see the running containers
docker compose down        # stop
docker compose down -v     # stop and delete the stored data
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Web server is up |
| GET | `/health/db` | Web server can reach the database |
| GET | `/api/info` | Container name + database status |
| GET | `/api/books` | List books |
| POST | `/api/books` | Add a book `{"title": "...", "author": "..."}` |
| PATCH | `/api/books/:id` | Set status `{"status": "to-read \| reading \| finished"}` |
| DELETE | `/api/books/:id` | Delete a book |

## CI/CD pipeline

Defined in `.github/workflows/ci-cd.yml`. Runs on every push to `main`.

| Stage | Tools | What happens |
|-------|-------|--------------|
| **build-test** | GitHub, Node 22, npm | Check out the code, `npm ci`, `npm test` |
| **docker** | Docker, Compose | Start the whole web + db stack and check `/health/db`; then build the image and push it to `ghcr.io` |
| **deploy** | Docker Compose | Pull the pushed image, start it with `docker-compose.prod.yml`, and verify it answers |

Pull requests run only the first two stages (nothing is pushed or deployed).
