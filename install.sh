#!/usr/bin/env bash

set -Eeuo pipefail

# install.sh dosyasının bulunduğu proje klasörüne geç
cd "$(dirname "$0")"

echo "======================================"
echo "Sitesis kurulumu başlatılıyor..."
echo "======================================"

# Docker kontrolü
if ! command -v docker >/dev/null 2>&1; then
  echo "HATA: Docker kurulu değil."
  exit 1
fi

# Docker Compose kontrolü
if ! docker compose version >/dev/null 2>&1; then
  echo "HATA: Docker Compose bulunamadı."
  exit 1
fi

# .env dosyası kontrolü
if [ ! -f ".env" ]; then
  echo "HATA: .env dosyası bulunamadı."
  exit 1
fi

# docker-compose.yml kontrolü
if [ ! -f "docker-compose.yml" ]; then
  echo "HATA: docker-compose.yml dosyası bulunamadı."
  exit 1
fi

# dump.sql kontrolü
if [ ! -f "backend/dump.sql" ]; then
  echo "HATA: backend/dump.sql dosyası bulunamadı."
  exit 1
fi

echo ""
echo "1/4 PostgreSQL servisi başlatılıyor..."

docker compose up -d db

echo ""
echo "2/4 PostgreSQL hazır olana kadar bekleniyor..."

DATABASE_READY=false

for i in $(seq 1 30); do
  if docker compose exec -T db sh -lc \
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    >/dev/null 2>&1; then

    DATABASE_READY=true
    break
  fi

  echo "PostgreSQL bekleniyor... ($i/30)"
  sleep 2
done

if [ "$DATABASE_READY" != "true" ]; then
  echo "HATA: PostgreSQL zamanında hazır olmadı."
  docker compose logs db
  exit 1
fi

echo "PostgreSQL hazır."

echo ""
echo "UYARI:"
echo "Bu işlem backend/dump.sql dosyasını veritabanına yükleyecek."
echo "Veritabanında eski veriler varsa çakışma oluşabilir."
echo ""

read -r -p "Devam etmek istiyor musunuz? (e/h): " CEVAP

if [[ "$CEVAP" != "e" && "$CEVAP" != "E" ]]; then
  echo "Kurulum iptal edildi."
  exit 0
fi

echo ""
echo "3/4 dump.sql veritabanına yükleniyor..."

docker compose exec -T db sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < backend/dump.sql

echo "Veritabanı başarıyla yüklendi."

echo ""
echo "4/4 Backend ve frontend build edilip başlatılıyor..."

docker compose up -d --build

echo ""
echo "======================================"
echo "Sitesis kurulumu başarıyla tamamlandı."
echo "======================================"

docker compose ps

echo ""
echo "Super Admin hesabınız dump.sql içinde bulunuyorsa"
echo "mevcut e-posta ve şifrenizle giriş yapabilirsiniz."