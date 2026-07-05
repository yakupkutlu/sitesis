# Sitesis Backend

Sitesis, apartman ve site yönetimi için geliştirilen güvenli bir backend API projesidir.

## Teknolojiler

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- HttpOnly Cookie
- CSRF Protection
- Audit Log
- Rate Limit
- Secure File Upload

## Kurulum

npm install

## Ortam Degiskenleri

.env.example dosyasini .env olarak kopyalayin ve gerekli degerleri doldurun.

NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sitesis_db"
JWT_SECRET="change_this_secret_with_at_least_32_characters"
JWT_EXPIRES_IN=1d
CONFIG_ENCRYPTION_KEY=change-this-long-secret-key-minimum-32-characters

Not: .env dosyasi Git'e eklenmemelidir.

## Prisma

Migration durumunu kontrol etmek icin:

npx prisma migrate status

Development ortaminda migration calistirmak icin:

npx prisma migrate dev

Prisma Client uretmek icin:

npx prisma generate

## Build

npm run build

## Calistirma

Development ortami:

npm run dev

Production build sonrasi:

npm start

## Guvenlik Ozellikleri

- JWT, HttpOnly Cookie icinde saklanir.
- CSRF korumasi aktiftir.
- POST, PATCH ve DELETE isteklerinde x-csrf-token gereklidir.
- Login endpointinde rate limit vardir.
- Forgot password endpointinde rate limit vardir.
- Production ortaminda debug reset token gosterilmez.
- .env, uploads, dist, node_modules ve generated Prisma client Git disinda tutulur.
- Dosya yukleme islemlerinde dosya tipi, boyutu ve dosya imzasi kontrol edilir.
- Upload dosyalari public path uzerinden dogrudan servis edilmez.
- SMS ve Email ayarlarinda gizli bilgiler sifrelenerek saklanir.
- Onemli islemler AuditLog ile kayit altina alinir.
- Manager kullanicilari sadece yetkili olduklari site, blok ve daire kapsamindaki verilere erisebilir.

## Onemli Moduller

- Auth login/logout/me
- Password reset flow
- Users update/deactivate
- Sites, blocks, apartments management
- Apartment residents management
- Payment batches
- Payment receipts / secure dekont upload-download
- Announcements
- Resident requests
- SMS settings
- Email settings
- Notification logs
- Notification service
- Manual notifications
- Audit logs
- Manager scope permissions

## API Notlari

Cookie tabanli authentication kullanildigi icin frontend isteklerinde credentials aktif olmalidir.

Ornek:

fetch("http://localhost:5000/api/auth/me", {
  credentials: "include",
});

CSRF korumali isteklerde header gonderilmelidir:

fetch("http://localhost:5000/api/users", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
  },
  body: JSON.stringify(data),
});

## Production Notlari

Production ortaminda asagidakiler kontrol edilmelidir:

- NODE_ENV=production
- Guclu JWT_SECRET
- Guclu CONFIG_ENCRYPTION_KEY
- Dogru CLIENT_URL
- Guvenli PostgreSQL baglantisi
- HTTPS aktif olmali
- Upload klasoru public olarak acilmamali
- .env dosyasi sunucuda guvenli tutulmali

## Son Kontrol Komutlari

npm run build
git status --short
npx prisma migrate status

## Durum

Backend MVP buyuk olcude tamamlanmistir ve production cleanup asamasina getirilmistir.

## Test ve Kalite Kontrol

Backend testleri Vitest ile çalıştırılır.

```bash
npm test
```

Bu komut şu şekilde çalışır:

```bash
vitest run --fileParallelism=false
```

PostgreSQL kullanan entegrasyon testlerinde aynı anda çok fazla test dosyası çalışınca bağlantı sorunları oluşabileceği için test dosyaları sıralı çalıştırılır.

Build kontrolü için:

```bash
npm run build
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

## Güvenlik Notları

- JWT HttpOnly cookie içinde tutulur.
- POST, PATCH ve DELETE isteklerinde CSRF token zorunludur.
- Dekont dosyaları public path altında tutulmaz.
- Dekont yüklemede MIME type ve dosya imzası kontrolü yapılır.
- Hassas ayarlar `.env` içinde tutulur ve Git'e eklenmez.
- SMS/E-posta secret bilgileri şifreli saklanmalıdır.