# Sitesis Docker Kurulumu

## العربية

تعمل هذه الملفات على تشغيل المشروع داخل ثلاث حاويات:

- `frontend`: React production build بواسطة Nginx.
- `backend`: Node.js + Express + TypeScript + Prisma.
- `db`: PostgreSQL.

يتم حفظ قاعدة البيانات وملفات الرفع في Docker Volumes حتى لا تضيع عند إعادة التشغيل.

### الخطوات

انسخ الملفات إلى جذر مشروع `sitesis`.

أنشئ ملف الإعدادات الحقيقي:

```powershell
Copy-Item .env.docker.example .env.docker
```

غيّر جميع كلمات السر داخل `.env.docker`، ثم أضف إلى `.gitignore`:

```gitignore
.env.docker
```

شغّل المشروع:

```powershell
docker compose --env-file .env.docker up -d --build
```

أنشئ أول Super Admin:

```powershell
docker compose --env-file .env.docker exec backend npm run db:seed:super-admin
```

اعرض السجلات:

```powershell
docker compose --env-file .env.docker logs -f
```

أوقف المشروع:

```powershell
docker compose --env-file .env.docker down
```

لحذف قاعدة البيانات والملفات المرفوعة أيضًا:

```powershell
docker compose --env-file .env.docker down -v
```

تحذير: الخيار `-v` يحذف البيانات نهائيًا.

## Türkçe

Bu yapı `frontend`, `backend` ve `PostgreSQL` servislerini Docker ile çalıştırır.

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

GitHub'a gönderilebilir:

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
