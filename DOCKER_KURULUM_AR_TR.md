# Sitesis Docker Setup

## Arabic

These files run the project within three containers:

- `frontend`: React production build using Nginx.

- `backend`: Node.js + Express + TypeScript + Prisma.

- `db`: PostgreSQL.

The database and upload files are saved in Docker Volumes so they are not lost upon restart.

### Steps

Copy the files to the root of the `sitesis` project.


Create the actual configuration file:

```powershell
Copy-Item .env.docker.example .env.docker
```

Change all passwords inside `.env.docker`, then add them to `.gitignore`:

```gitignore
.env.docker
```

Run the project:

```powershell
docker compose --env-file .env.docker up -d --build
```

Create the first Super Admin:

```powershell
docker compose --env-file .env.docker exec backend npm run db:seed:super-admin
```

View the logs:

```powershell
docker compose --env-file .env.docker logs -f
```

Stop the project:

```powershell
docker compose --env-file .env.docker down

To delete the database and uploaded files:

```powershell
docker compose --env-file .env.docker down -v

Warning: The `-v` option permanently deletes the data.

## Turkish

This works with Docker's frontend, backend, and PostgreSQL services.

Kurulum:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

İlk Super Admin:

```powershell
docker compose --env-file .env.docker exec backend npm run db:seed:super-admin
```

Loglar:

```powershell
docker compose --env-file .env.docker logs -f
```

Durdurma:

```powershell
docker compose --env-file .env.docker down
```

GitHub'a gonderilebilir:

- `Dockerfile`
- `backend/Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `backend/.dockerignore`
- `nginx/default.conf`
- `.env.docker.example`

GitHub'a gönderilmemeli:

- `.env.docker`
- Gerçek `.env` dosyaları
- `node_modules`
- `dist`
- `uploads`
- SSL private key dosyaları