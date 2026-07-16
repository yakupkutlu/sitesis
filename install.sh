#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "$0")"

SCHEMA_DUMP="backend/dump-schema.sql"
DATA_DUMP="backend/dump-data.sql"
MAX_WAIT_ATTEMPTS=60
WAIT_SECONDS=2

on_error() {
  local exit_code=$?
  echo ""
  echo "HATA: Kurulum tamamlanamadı. Çıkış kodu: ${exit_code}"
  echo "Kontrol komutları:"
  echo "  docker compose ps"
  echo "  docker compose logs --tail=200"
  exit "${exit_code}"
}

trap on_error ERR

service_exists() {
  docker compose config --services | grep -Fxq "$1"
}

echo "======================================"
echo "Sitesis kurulumu başlatılıyor..."
echo "======================================"

if ! command -v docker >/dev/null 2>&1; then
  echo "HATA: Docker kurulu değil."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "HATA: Docker Compose bulunamadı."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "HATA: .env dosyası bulunamadı."
  exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
  echo "HATA: docker-compose.yml dosyası bulunamadı."
  exit 1
fi

if [ ! -f "$SCHEMA_DUMP" ]; then
  echo "HATA: $SCHEMA_DUMP dosyası bulunamadı."
  exit 1
fi

if [ ! -f "$DATA_DUMP" ]; then
  echo "HATA: $DATA_DUMP dosyası bulunamadı."
  exit 1
fi

if ! service_exists "db"; then
  echo "HATA: docker-compose.yml içinde db servisi bulunamadı."
  exit 1
fi

echo ""
echo "1/6 Uygulama servisleri durduruluyor..."

for service_name in backend frontend; do
  if service_exists "$service_name"; then
    docker compose stop "$service_name" >/dev/null 2>&1 || true
  fi
done

echo ""
echo "2/6 PostgreSQL servisi başlatılıyor..."
docker compose up -d db

echo ""
echo "3/6 PostgreSQL hazır olana kadar bekleniyor..."

DATABASE_READY=false

for i in $(seq 1 "$MAX_WAIT_ATTEMPTS"); do
  if docker compose exec -T db sh -lc \
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    >/dev/null 2>&1; then
    DATABASE_READY=true
    break
  fi

  echo "PostgreSQL bekleniyor... ($i/$MAX_WAIT_ATTEMPTS)"
  sleep "$WAIT_SECONDS"
done

if [ "$DATABASE_READY" != "true" ]; then
  echo "HATA: PostgreSQL zamanında hazır olmadı."
  docker compose logs --tail=200 db
  exit 1
fi

echo "PostgreSQL hazır."

echo ""
echo "DİKKAT:"
echo "Bu işlem hedef veritabanındaki public şemasını silecek."
echo "Sonra şu dosyalar sırayla yüklenecek:"
echo "  1) $SCHEMA_DUMP"
echo "  2) $DATA_DUMP"
echo ""
echo "Devam etmeden önce yedek aldığınızdan emin olun."
echo ""

read -r -p "Devam etmek için TAMAM yazın: " CONFIRMATION

if [ "$CONFIRMATION" != "TAMAM" ]; then
  echo "Kurulum iptal edildi."
  exit 0
fi

echo ""
echo "4/6 Veritabanı temizleniyor ve tablo yapısı yükleniyor..."

docker compose exec -T db sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"'

docker compose exec -T db sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$SCHEMA_DUMP"

echo "Tablo yapısı başarıyla yüklendi."

echo ""
echo "5/6 Veriler yükleniyor..."

docker compose exec -T db sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$DATA_DUMP"

echo "Veriler başarıyla yüklendi."

echo ""
echo "6/6 Backend ve varsa frontend build edilip başlatılıyor..."
docker compose up -d --build

echo ""
echo "======================================"
echo "Sitesis kurulumu başarıyla tamamlandı."
echo "======================================"

docker compose ps

echo ""
echo "Kullanılan dump dosyaları:"
echo "  - $SCHEMA_DUMP"
echo "  - $DATA_DUMP"
