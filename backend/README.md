# Sitesis Backend

Sitesis Backend; apartman, bina ve site yönetimi için geliştirilen **Node.js + Express + TypeScript + PostgreSQL + Prisma** tabanlı güvenli bir REST API projesidir.

Sistem; kullanıcı ve rol yönetimi, yönetici çalışma alanı seçimi, site/blok/daire yetkilendirmesi, aidat ve ödeme yönetimi, dekont yükleme ve onaylama, kasa/ön muhasebe, duyurular, sakin talepleri, iletişim mesajları, SMS/e-posta bildirimleri, AI ayarları, sistem ayarları, AuditLog ve dashboard özetlerini içerir.

---

## Kullanılan Teknolojiler

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- JWT Authentication
- HttpOnly Cookie
- CSRF Protection
- Zod Validation
- bcryptjs
- Multer
- Helmet
- Express Rate Limit
- Vitest

---

# Kurulum

## 1. Bağımlılıkları yükleme

```bash
cd backend
npm install
```

BullMQ henüz `package.json` içinde yoksa:

```bash
npm install bullmq
```

## 2. Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve gerekli değerleri doldurun.

### Örnek `.env`

```env
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sitesis_db?schema=public"

REDIS_URL="redis://localhost:6379"

JWT_SECRET="change-this-jwt-secret-minimum-32-characters"
JWT_EXPIRES_IN="1d"

CLIENT_URL="http://localhost:5173"

CONFIG_ENCRYPTION_KEY="change-this-config-encryption-key-minimum-32-characters"

COOKIE_SAME_SITE="lax"
TRUST_PROXY="false"

POSTGRES_DB="sitesis_db"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="change-this-postgres-password"

INSTALL_TOKEN="change-this-install-token-minimum-16-characters"

SUPER_ADMIN_FULL_NAME="Super Admin"
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="change-this-strong-password"
```

> Gerçek `.env` dosyası GitHub'a gönderilmemelidir.

## 3. Redis gereksinimi

SMS ve e-posta bildirim kuyruğu BullMQ kullanır. BullMQ çalışmak için Redis bağlantısına ihtiyaç duyar.

Yerel geliştirme için seçenekler:

- Docker ile Redis çalıştırmak
- Windows/WSL içinde Redis çalıştırmak
- Redis Cloud gibi uzak bir Redis servisi kullanmak

Docker kullanılıyorsa proje kökünde:

```bash
docker compose up -d redis
docker compose ps
```

Uzak Redis kullanılıyorsa `.env` içine servis tarafından verilen bağlantı yazılır:

```env
REDIS_URL="rediss://default:PAROLA@SUNUCU:PORT"
```

> `REDIS_URL` içinde parola varsa bu değer kesinlikle GitHub'a gönderilmemelidir.

---

# Temel Komutlar

```bash
npm run dev
npm run build
npm start
npm test
npm run check
```

---

# Prisma Komutları

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
npx prisma migrate status
```

> Production sunucusunda `prisma migrate reset` veya kontrolsüz `prisma db push` kullanılmamalıdır.

---

# Development Çalıştırma Sırası

PostgreSQL ve Redis çalışır durumda olmalıdır.

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run build
npm run dev
```

Backend başarıyla açıldığında konsolda şu mesajlar görülür:

```text
Backend server 5000 portunda çalışıyor.
SMS ve e-posta kuyruk worker'ları çalışıyor.
```

---

# Production Çalıştırma Sırası

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run db:seed:super-admin
npm start
```

Bu sıra:

1. Bağımlılıkları yükler.
2. Prisma Client üretir.
3. Bekleyen migration dosyalarını uygular.
4. TypeScript build işlemini yapar.
5. İlk Super Admin hesabını oluşturur.
6. Backend ve bildirim worker'larını başlatır.

Production ortamında PostgreSQL ve Redis başlamadan backend başlatılmamalıdır.

---

# Docker Compose

Tüm sistemi Docker ile çalıştırmak için proje kökünde:

```bash
docker compose up -d --build
```

Servisleri kontrol etmek için:

```bash
docker compose ps
```

Backend ve Redis loglarını izlemek için:

```bash
docker compose logs -f backend redis
```

Sadece Redis'i başlatmak için:

```bash
docker compose up -d redis
```

Docker Compose içindeki backend Redis'e şu adresle bağlanır:

```env
REDIS_URL=redis://redis:6379
```

---

# İlk Super Admin Oluşturma

`.env` içine aşağıdaki değerleri ekleyin:

```env
SUPER_ADMIN_FULL_NAME="Super Admin"
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="change-this-strong-password"
```

Sonra:

```bash
npm run db:seed:super-admin
```

Seed script:

- Aynı e-posta ile Super Admin yoksa yeni hesap oluşturur.
- Şifreyi `bcryptjs` ile hashleyerek kaydeder.
- Aynı e-posta ile Super Admin varsa tekrar oluşturmaz.
- Aynı e-posta farklı role aitse işlemi durdurur.

---

# Kimlik Doğrulama ve Hesap Modları

## JWT ve Cookie

- JWT, `HttpOnly Cookie` içinde saklanır.
- Frontend JWT değerine doğrudan erişemez.
- Authentication isteklerinde `credentials: "include"` kullanılır.
- Production ortamında güvenli cookie ayarları uygulanır.

```js
fetch("http://localhost:5000/api/auth/me", {
  credentials: "include",
});
```

## Hesap Modu Seçimi

Aynı hesap şu rollerden birden fazlasına bağlı olabilir:

- `SUPER_ADMIN`
- `MANAGER`
- `RESIDENT`

Manager veya Super Admin hesabı bir daireye sakin olarak bağlandıysa kullanıcı girişten sonra yönetici/sakin hesap modunu seçebilir. Seçilen mod güvenli cookie/JWT bilgisiyle korunur. Normal Resident hesabı doğrudan sakin paneline geçer.

---

# Rol ve Yetkilendirme

## Super Admin

- Tüm site, blok ve daireleri yönetebilir.
- Manager hesaplarını ve atamalarını yönetebilir.
- Sistem ayarları, bildirim logları ve AuditLog kayıtlarına erişebilir.
- Tüm kapsamları görüntüleyebilir.
- Tüm sisteme duyuru gönderebilir.

## Manager

Manager yalnızca kendisine atanmış site, blok ve daire kapsamındaki verilere erişebilir.

Desteklenen atamalar:

- Site seviyesi
- Tek blok seviyesi
- Birden fazla atama
- Aktif çalışma alanı seçimi

Birden fazla ataması olan manager aktif çalışma alanını seçer. Backend her manager isteğinde aktif atamayı ve kapsam yetkisini doğrular.

## Resident

Resident yalnızca bağlı olduğu dairelerle ilgili:

- Borç ve aidatları
- Ödemeleri
- Dekontları
- Duyuruları
- Talepleri
- Dashboard özetlerini

görüntüleyebilir.

---

# CSRF Koruması

`POST`, `PATCH` ve `DELETE` isteklerinde `x-csrf-token` gerekir.

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

---

# Telefon Numarası Formatı

Manager ve Resident telefonları uluslararası formatta saklanır.

Geçerli örnekler:

```text
+905396402860
+963944123456
+4915123456789
```

Backend telefon numarasını doğrular ve `00` ile başlayan numaraları `+` formatına dönüştürebilir.

```text
00963944123456 -> +963944123456
```

Geçersiz, çok kısa veya harf içeren telefon numaraları reddedilir.

---

# Kasa / Ön Muhasebe Modülü

Muhasebe modülü yöneticinin gelir, gider, bekleyen alacak ve kasa durumunu takip etmesini sağlar.

Ana özellikler:

- Muhasebe genel özeti
- Gelirler
- Giderler
- Beklenen gelir
- Tahsil edilen gelir
- Bekleyen alacak
- Kasa bakiyesi
- Gider belgesi/fatura yükleme
- Gideri dairelere dağıtma
- Birden fazla muaf daire seçimi
- PaymentBatch ve PaymentAllocation bağlantısı
- AuditLog

## Hesaplama Mantığı

```text
Bekleyen Alacak = Beklenen Gelir - Tahsil Edilen Gelir
```

```text
Kasa Bakiyesi = Tahsil Edilen Gelir - Toplam Gider
```

`Toplam Gider`, iptal edilmemiş gerçek giderlerin toplamıdır.

Sakinler gider tutarını ödediğinde gider sıfırlanmaz. Tahsil edilen gelir artar ve kasa bakiyesi güncellenir.

Örnek:

```text
Asansör gideri:       5.000 TL
Tahsil edilen gelir:  5.000 TL
Toplam gider:         5.000 TL
Kasa bakiyesi:            0 TL
```

## Gider Kaydı

Manager şu bilgileri kullanarak gider oluşturabilir:

- Başlık
- Açıklama
- Kategori
- Tutar
- Tarih
- Site
- Blok
- Firma
- Fatura numarası
- Fatura veya gider belgesi

Belgeler private storage içinde tutulur ve yetkili endpoint üzerinden indirilir.

## Gider Dağıtımı

Gider:

- Tüm siteye
- Belirli bloğa
- Belirli dairelere

dağıtılabilir.

Birden fazla daire muaf tutulabilir.

```text
Toplam gider: 5.000 TL
Toplam daire: 10
Muaf daire: 2
Ödeme yapacak daire: 8
Daire başına: 625 TL
```

Dağıtım sırasında `PaymentBatch`, `PaymentAllocation` ve muafiyet kayıtları oluşturulur.

## Muhasebe Güvenliği

- Aynı gider ikinci kez dağıtılamaz.
- Muaf daireler ödeme dağıtımına dahil edilmez.
- Tüm işlemler manager scope kontrolünden geçer.
- Dağıtım ve iptal işlemleri AuditLog'a yazılır.
- Ödenmiş allocation bulunan finansal kayıtlar kontrolsüz silinmez.
- İptal edilen gider kayıtları geçmiş kontrolü için veritabanında korunur.

## Muhasebe Endpointleri

```http
GET    /api/accounting/summary
GET    /api/accounting/income
GET    /api/accounting/expenses
POST   /api/accounting/expenses
GET    /api/accounting/expenses/:id
PATCH  /api/accounting/expenses/:id
POST   /api/accounting/expenses/:id/documents
POST   /api/accounting/expenses/:id/distribute
PATCH  /api/accounting/expenses/:id/cancel
GET    /api/accounting/expenses/:expenseId/documents/:documentId/download
```

Muhasebe modülü migration dosyası:

```text
20260716190000_add_accounting_module
```

---

# Aidat ve Ödeme Yönetimi

Desteklenen kapsamlar:

- Tüm site
- Belirli blok
- Belirli daireler

Ana özellikler:

- PaymentBatch
- PaymentAllocation
- Çoklu muaf daire desteği
- PENDING/PAID durumları
- Batch iptal kontrolü
- PAID allocation bulunan batch için güvenli iptal kısıtlaması
- Manager scope
- AuditLog

---

# Güvenli Dekont Yönetimi

Desteklenen dosya türleri:

- PDF
- PNG
- JPG
- JPEG
- WEBP

Güvenlik:

- Dosya boyutu kontrolü
- MIME type kontrolü
- Gerçek dosya imzası kontrolü
- Rol ve manager scope kontrolü
- Private storage
- Yetkili download/view endpointleri
- Approve/reject akışı
- AuditLog

Onaylanan dekont ilgili `PaymentAllocation` kaydını `PAID` durumuna geçirir ve tahsil edilen gelir hesabını etkiler.

---

# Site ve Blok Görselleri

- Dosya tipi ve imzası doğrulanır.
- Private storage içinde saklanır.
- Yetkili görüntüleme endpointlerinden sunulur.
- Public static path üzerinden doğrudan açılmaz.

---

# Duyurular

Duyurular şu hedeflere gönderilebilir:

- Tüm sistem
- Site
- Blok
- Daire

`ALL` hedefi yalnızca Super Admin tarafından kullanılabilir.

Manager yalnızca yetkili olduğu site, blok veya daire kapsamına duyuru gönderebilir.

Duyuru oluştururken:

- SMS gönderimi
- E-posta gönderimi
- Her iki kanal
- Sadece uygulama içi duyuru

seçenekleri kullanılabilir.

Duyuru kaydedildikten sonra seçilen SMS/e-posta bildirimleri Redis kuyruğuna eklenir. HTTP isteği gerçek gönderimlerin tamamlanmasını beklemez.

---

# SMS, E-posta ve Bildirim Kuyruğu

## Secret saklama

SMS ve e-posta sağlayıcı secret değerleri hashlenmez; şifrelenerek veritabanında saklanır.

Hash kullanılmamasının nedeni, sağlayıcıya bağlanırken secret değerinin tekrar okunması gerekmesidir.

Örnek şifrelenen alanlar:

- SMS API key
- SMS API secret
- SMS kullanıcı adı ve parolası
- Twilio Account SID
- Twilio Auth Token
- SMTP kullanıcı adı
- SMTP parolası
- SendGrid API key

Şifreleme için:

```env
CONFIG_ENCRYPTION_KEY="..."
```

kullanılır.

Bu anahtar kaybedilirse önceden şifrelenmiş provider secret değerleri çözülemez.

## Queue yapısı

İki ayrı BullMQ kuyruğu kullanılır:

```text
notification-sms
notification-email
```

SMS ve e-posta birbirinden bağımsız çalışır.

Her kanal için global concurrency:

```text
1
```

olarak ayarlanır.

Böylece:

```text
SMS 1 -> SMS 2 -> SMS 3
```

ve:

```text
E-posta 1 -> E-posta 2 -> E-posta 3
```

şeklinde kanal içinde sıralı gönderim yapılır.

SMS kuyruğu ve e-posta kuyruğu aynı anda çalışabilir.

## Queue'yu kullanan işlemler

Aynı queue altyapısı şunlarda kullanılır:

- Manuel SMS gönderimi
- Manuel e-posta gönderimi
- Manager duyuruları
- Super Admin duyuruları
- PaymentBatch/aidat bildirimleri
- Resident request bildirimleri
- Sistem bildirimleri

## Bildirim durumları

NotificationLog kayıtları şu durumları kullanır:

```text
PENDING
SENT
FAILED
SKIPPED
```

Normal akış:

```text
PENDING -> SENT
```

Kalıcı hata:

```text
PENDING -> FAILED
```

Aktif provider veya geçerli alıcı bulunmaması:

```text
PENDING -> SKIPPED
```

## Yeniden deneme

Gönderim başarısız olduğunda job en fazla 3 kez denenir.

```text
attempts: 3
backoff: exponential
```

Bir gönderim hatası diğer alıcıların işlenmesini engellemez.

## Redis veri güvenliği

Docker Compose Redis servisi:

```text
appendonly yes
maxmemory-policy noeviction
```

ayarlarıyla çalışır.

Redis verileri şu volume içinde saklanır:

```text
redis_data
```

---

# Sakin Talepleri

Resident:

- Talep oluşturabilir.
- Açıklama ve dosya ekleyebilir.
- Durumu takip edebilir.

Manager:

- Yetkili kapsamındaki talepleri görebilir.
- Talep durumunu ve açıklamasını güncelleyebilir.

---

# İletişim Mesajları

Public iletişim formundan gelen mesajlar backend'de saklanır.

Super Admin:

- Mesajları listeleyebilir.
- Detaylarını görebilir.
- Durumlarını güncelleyebilir.

---

# AI ve Sistem Ayarları

- API key frontend'de saklanmaz.
- Secret değerler şifrelenir.
- Yalnızca yetkili Super Admin değiştirebilir.
- Önemli değişiklikler AuditLog'a yazılır.
- API key, JWT secret ve encryption key response içinde açık gönderilmez.

---

# Dashboard Summary Endpointleri

```http
GET /api/dashboard-summary/super-admin
GET /api/dashboard-summary/manager
GET /api/dashboard-summary/resident
```

Manager dashboard aktif atama kapsamındaki verileri, Resident dashboard ise yalnızca bağlı daire verilerini gösterir.

---

# Güvenlik Özellikleri

- JWT HttpOnly Cookie
- CSRF protection
- Login ve forgot-password rate limit
- Role based authorization
- Manager scope kontrolü
- Zod validation
- Helmet
- CORS origin kontrolü
- Production-safe error middleware
- Private file storage
- Dosya tipi, boyutu ve imza doğrulaması
- Secret encryption
- AuditLog
- Production ortamında stack trace gizleme
- Frontend'e secret göndermeme
- Bildirimler için Redis/BullMQ queue
- Başarısız bildirimler için kontrollü retry

---

# Tamamlanan Ana Backend Özellikleri

- Auth login/logout/me
- JWT HttpOnly Cookie
- CSRF
- Rate limit
- Role authorization
- Manager scope
- Aktif manager çalışma alanı
- Hesap modu seçimi
- AuditLog
- Password reset
- Kullanıcı güncelleme/pasifleştirme
- Uluslararası telefon doğrulaması
- Sites, blocks, apartments
- Apartment residents
- Manager assignments
- Payment batches
- Payment allocations
- Çoklu ödeme muafiyeti
- Kasa / Ön Muhasebe
- Gelir ve gider özetleri
- Gider belgesi yükleme
- Gider dağıtımı
- Güvenli gider iptali
- Güvenli dekont yükleme
- File signature validation
- Receipt approve/reject
- Announcements
- Resident requests
- Contact messages
- SMS settings
- Email settings
- Notification logs
- Manual notifications
- Redis/BullMQ notification queue
- Sıralı SMS gönderimi
- Sıralı e-posta gönderimi
- Bildirim retry/backoff
- Site/Block image upload
- Private image endpoints
- AI Settings
- System Settings
- Super Admin Dashboard
- Manager Dashboard
- Resident Dashboard
- Initial Super Admin seed
- Pagination ve search
- Production security hardening

---

# Test ve Kalite Kontrol

```bash
npm test
npm run build
npm run check
```

Mevcut ana test alanları:

- Health check
- CSRF
- Auth/protected routes
- Password reset privacy/rate limit
- Role permission
- Manager scope
- Güvenli dekont yükleme
- Dosya imzası doğrulama
- Dekont approve/reject
- Notification logs
- SMS/e-posta ayarları
- AI Settings
- System Settings
- Dashboard summaries

Queue entegrasyonu için manuel kontroller:

1. Redis bağlantısının başarılı olması
2. Manuel SMS job oluşturulması
3. Manuel e-posta job oluşturulması
4. Duyuru SMS job oluşturulması
5. Duyuru e-posta job oluşturulması
6. NotificationLog kaydının önce `PENDING` olması
7. Başarılı gönderim sonrası `SENT` olması
8. Aktif provider yoksa `SKIPPED` olması
9. Provider hatasında retry yapılması
10. Son denemeden sonra `FAILED` olması
11. SMS kanalında gönderimlerin sıralı olması
12. E-posta kanalında gönderimlerin sıralı olması
13. Backend yeniden başlatıldığında bekleyen job'ların devam etmesi

Muhasebe modülü için manuel entegrasyon kontrolleri:

1. Gider oluşturma
2. Belge yükleme ve indirme
3. Çoklu muaf daire
4. Gider dağıtımı
5. PaymentBatch/Allocation kontrolü
6. Dekont onayı sonrası gelir değişimi
7. Kasa bakiyesi
8. İkinci dağıtımın engellenmesi
9. Paid kayıt iptal güvenliği
10. Manager scope dışı erişimin engellenmesi

---

# Production Öncesi Kontrol

```bash
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate:deploy
npx prisma migrate status
git status --short
```

Kontrol edilmesi gerekenler:

- Build ve testler başarılı olmalı.
- Migration durumu güncel olmalı.
- PostgreSQL çalışıyor olmalı.
- Redis çalışıyor olmalı.
- Queue worker'ları başlamış olmalı.
- `.env`, uploads ve dist Git'e eklenmemeli.
- HTTPS aktif olmalı.
- CORS ve cookie ayarları production domainine uygun olmalı.
- Database yedeği alınmalı.
- Redis volume/yedekleme stratejisi kontrol edilmeli.
- SMS ve e-posta provider ayarları test edilmeli.
- `CONFIG_ENCRYPTION_KEY` güvenli şekilde yedeklenmeli.

---

# GitHub'a Gönderilmemesi Gerekenler

- `.env`
- `node_modules`
- `dist`
- `uploads`
- `src/generated/prisma`
- Database dump dosyaları
- ZIP dosyaları
- Backup klasörleri
- Geçici install/repair scriptleri

Örnek `.gitignore`:

```gitignore
.env
node_modules/
dist/
uploads/
src/generated/prisma/
*.zip
*.dump
*.bak
dump.sql
```

`.env.example` GitHub'a gönderilebilir; gerçek secret içermemelidir.

---

# Güvenli Git Pull ve Push Akışı

Local değişiklikler varken önce commit oluşturmak daha güvenlidir.

```bash
git status --short
git add .
git commit -m "feat: add notification queue and update documentation"
git pull --rebase origin main
git push origin main
```

Aktif branch:

```bash
git branch --show-current
```

Branch adı `main` değilse komutlarda gerçek branch adını kullanın.

Conflict olursa:

```bash
git add <duzeltilen-dosyalar>
git rebase --continue
```

Rebase iptali:

```bash
git rebase --abort
```

> `git add .` öncesinde `.env`, uploads, dist, ZIP, dump ve backup dosyalarının listede olmadığını kontrol edin.

---

# Durum

Backend MVP büyük ölçüde tamamlanmıştır.

Son önemli geliştirmeler:

- Aktif manager scope seçimi
- Aynı hesap için rol/mod seçimi
- Kasa / Ön Muhasebe
- Gelir, gider, bekleyen alacak ve kasa bakiyesi
- Gider belgesi yükleme
- Çoklu muaf daire ile gider dağıtımı
- PaymentBatch/PaymentAllocation entegrasyonu
- İletişim mesajları
- Uluslararası telefon numarası doğrulaması
- SMS ve e-posta için Redis/BullMQ queue
- Kanal içinde sıralı bildirim gönderimi
- Bildirim retry/backoff sistemi
- Production migration ve güvenlik iyileştirmeleri

Production yayını öncesinde tam entegrasyon testi, database yedeği, Redis sürekliliği, HTTPS, domain/CORS ayarları, log yönetimi ve dosya depolama stratejisi kontrol edilmelidir.