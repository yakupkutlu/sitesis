# Sitesis Backend

Sitesis Backend, apartman ve site yönetimi için geliştirilen Node.js + Express + TypeScript + PostgreSQL + Prisma tabanlı güvenli backend API projesidir.

Bu backend sistemi; kullanıcı yönetimi, rol bazlı yetkilendirme, yönetici kapsam kontrolü, aidat/ödeme yönetimi, dekont yükleme ve onaylama, duyuru, talep, SMS/e-posta ayarları, bildirim logları, AI ayarları, sistem ayarları ve dashboard özetlerini içerir.

## Kullanılan Teknolojiler

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- HttpOnly Cookie
- CSRF Protection
- Zod Validation
- bcryptjs
- Multer
- Helmet
- Express Rate Limit
- Vitest

## Kurulum

Projeyi indirdikten sonra bağımlılıkları yüklemek için:

```bash
npm install
```

## Ortam Değişkenleri

`.env.example` dosyası `.env` olarak kopyalanmalı ve gerekli değerler doldurulmalıdır.

Örnek:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sitesis_db?schema=public"

JWT_SECRET="change-this-jwt-secret-minimum-32-characters"
JWT_EXPIRES_IN="1d"

CLIENT_URL="http://localhost:5173"

CONFIG_ENCRYPTION_KEY="change-this-config-encryption-key-min-32-chars"

COOKIE_SAME_SITE="lax"
TRUST_PROXY="false"

SUPER_ADMIN_FULL_NAME="Super Admin"
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="change-this-strong-password"
```

Gerçek `.env` dosyası GitHub'a gönderilmemelidir.

## Temel Komutlar

Geliştirme ortamında projeyi çalıştırmak için:

```bash
npm run dev
```

Projeyi build etmek için:

```bash
npm run build
```

Production build sonrası projeyi başlatmak için:

```bash
npm start
```

Testleri çalıştırmak için:

```bash
npm test
```

Build ve testleri birlikte çalıştırmak için:

```bash
npm run check
```

## Prisma Komutları

Prisma Client üretmek için:

```bash
npm run prisma:generate
```

Development ortamında migration oluşturmak ve uygulamak için:

```bash
npm run prisma:migrate:dev
```

Production ortamında migration uygulamak için:

```bash
npm run prisma:migrate:deploy
```

Prisma Studio açmak için:

```bash
npm run prisma:studio
```

Migration durumunu kontrol etmek için:

```bash
npx prisma migrate status
```

## Production Çalıştırma Sırası

Production ortamında önerilen çalıştırma sırası şu şekildedir:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run db:seed:super-admin
npm start
```

Bu sıra önemlidir. Önce bağımlılıklar yüklenir, sonra Prisma Client oluşturulur, database migration uygulanır, proje build edilir, ilk Super Admin oluşturulur ve son olarak backend başlatılır.

## İlk Super Admin Oluşturma

Sistem ilk kez production ortamında kurulurken ilk Super Admin hesabı seed script ile oluşturulur.

Önce gerçek `.env` dosyasına şu değerler eklenmelidir:

```env
SUPER_ADMIN_FULL_NAME="Super Admin"
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="change-this-strong-password"
```

Sonra şu komut çalıştırılır:

```bash
npm run db:seed:super-admin
```

Bu komut, verilen e-posta ile daha önce Super Admin yoksa yeni bir Super Admin kullanıcısı oluşturur.

Şifre veritabanına düz metin olarak kaydedilmez. `bcryptjs` ile hashlenmiş şekilde kaydedilir.

Aynı e-posta ile zaten Super Admin varsa yeni kullanıcı oluşturulmaz.

Aynı e-posta ile farklı role sahip bir kullanıcı varsa işlem durdurulur.

## Güvenlik Özellikleri

- JWT, HttpOnly Cookie içinde saklanır.
- CSRF koruması aktiftir.
- POST, PATCH ve DELETE isteklerinde `x-csrf-token` gereklidir.
- Login endpointinde rate limit vardır.
- Forgot password endpointinde rate limit vardır.
- Production ortamında debug reset token gösterilmez.
- `.env`, uploads, dist, node_modules ve generated Prisma client Git dışında tutulur.
- Dosya yükleme işlemlerinde dosya tipi, boyutu ve dosya imzası kontrol edilir.
- Upload dosyaları public path üzerinden doğrudan servis edilmez.
- SMS, Email ve AI ayarlarında gizli bilgiler güvenli şekilde saklanır.
- Önemli işlemler AuditLog ile kayıt altına alınır.
- Manager kullanıcıları sadece yetkili oldukları site, blok ve daire kapsamındaki verilere erişebilir.
- API key, JWT secret, encryption key gibi gizli bilgiler frontend tarafına gönderilmez.

## Production Güvenlik Notları

Production ortamında mutlaka şu ayarlar kontrol edilmelidir:

- `NODE_ENV=production` kullanılmalıdır.
- `JWT_SECRET` en az 32 karakter olmalıdır.
- `CONFIG_ENCRYPTION_KEY` en az 32 karakter olmalıdır.
- Gerçek `.env` dosyası GitHub'a gönderilmemelidir.
- `CLIENT_URL` sadece gerçek frontend domaini olacak şekilde ayarlanmalıdır.
- HTTPS aktif olmalıdır.
- Production ortamında cookie güvenliği aktif olmalıdır.
- `COOKIE_SAME_SITE` ihtiyaca göre `lax`, `strict` veya `none` olarak ayarlanabilir.
- Eğer backend reverse proxy arkasında çalışıyorsa `TRUST_PROXY=true` yapılmalıdır.
- Upload edilen dosyalar GitHub'a eklenmemelidir.
- Production migration için `prisma migrate deploy` kullanılmalıdır.
- Kullanıcı şifreleri veritabanına hashlenmiş olarak kaydedilmelidir.
- Dekont ve görsel dosyaları public static olarak açılmamalıdır.
- Dosya erişimleri yetki kontrolünden geçmelidir.

## Tamamlanan Ana Backend Özellikleri

Bu projede şu ana kadar aşağıdaki ana modüller tamamlanmıştır:

- Auth login/logout/me
- JWT HttpOnly Cookie authentication
- CSRF protection
- Rate limit
- Role based authorization
- Manager scope permission
- AuditLog
- Password reset flow
- Users update/deactivate
- Sites, blocks, apartments management
- Apartment residents management
- Payment batches
- Payment allocations
- Payment exemption desteği
- Secure receipt/dekont upload
- File type ve file signature validation
- Receipt approve/reject flow
- Announcements
- Resident requests
- SMS settings
- Email settings
- Notification logs
- Notification service
- Manual notifications
- Site/Block image upload
- Private image view endpoints
- AI Settings
- System Settings
- Super Admin Dashboard Summary
- Manager Dashboard Summary
- Resident Dashboard Summary
- Production security hardening
- Initial Super Admin seed script

## Dashboard Summary Endpoints

Super Admin dashboard için:

```http
GET /api/dashboard-summary/super-admin
```

Manager dashboard için:

```http
GET /api/dashboard-summary/manager
```

Resident/Sakin dashboard için:

```http
GET /api/dashboard-summary/resident
```

Bu endpointler gerçek database verilerinden özet üretir.

Manager dashboard sadece yöneticinin yetkili olduğu site veya blok kapsamındaki verileri gösterir.

Resident dashboard sadece sakinin bağlı olduğu dairelere ait ödeme, talep ve bildirim bilgilerini gösterir.

## API Notları

Cookie tabanlı authentication kullanıldığı için frontend isteklerinde `credentials` aktif olmalıdır.

Örnek:

```js
fetch("http://localhost:5000/api/auth/me", {
  credentials: "include",
});
```

CSRF korumalı isteklerde header gönderilmelidir:

```js
fetch("http://localhost:5000/api/users", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
  },
  body: JSON.stringify(data),
});
```

## Test ve Kalite Kontrol

Backend testleri Vitest ile çalıştırılır.

```bash
npm test
```

Build kontrolü için:

```bash
npm run build
```

Build ve testleri birlikte çalıştırmak için:

```bash
npm run check
```

Şu anda test kapsamı şunları içerir:

- Health check
- CSRF koruması
- Auth ve protected route kontrolleri
- Password reset privacy ve rate limit
- Role permission kontrolleri
- Manager scope kontrolleri
- Güvenli dekont yükleme
- Dekont dosya tipi ve gerçek dosya imzası doğrulama
- Dekont onay/red süreçleri
- Notification logs
- Email/SMS notification queue fallback kontrolleri
- AI Settings
- System Settings
- Super Admin Dashboard Summary
- Manager Dashboard Summary
- Resident Dashboard Summary

## Production Öncesi Kontrol Listesi

Production'a geçmeden önce şu kontroller yapılmalıdır:

```bash
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate:deploy
```

Ayrıca Git durumu kontrol edilmelidir:

```bash
git status --short
```

Production'a çıkmadan önce `git status --short` çıktısı temiz olmalıdır.

## Durum

Backend MVP büyük ölçüde tamamlanmıştır ve production cleanup aşamasına getirilmiştir.

Bu backend gerçek dünyada kullanılabilecek şekilde güvenlik odaklı geliştirilmektedir. Bu nedenle gizli bilgiler frontend tarafında tutulmamalı, API key ve benzeri değerler kullanıcıya response içinde döndürülmemeli, upload edilen dosyalar doğrudan public path üzerinden servis edilmemelidir.
## GitHub'a Gönderilmemesi Gereken Dosyalar

Aşağıdaki dosya ve klasörler GitHub'a gönderilmemelidir:

- `.env`
- `node_modules`
- `dist`
- `uploads`
- `src/generated/prisma`

Bu dosyalar `.gitignore` içinde tutulmalıdır.

`.env.example` dosyası ise GitHub'a gönderilebilir. Bu dosya gerçek gizli bilgiler içermez, sadece gerekli ortam değişkenlerini örnek olarak gösterir.