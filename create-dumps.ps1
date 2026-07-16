param(
  [string]$DatabaseHost = "localhost",
  [int]$DatabasePort = 5432,
  [string]$DatabaseName = "sitesis_db",
  [string]$DatabaseUser = "postgres",
  [string]$OutputDirectory = "$PSScriptRoot\backend"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Host "HATA: pg_dump bulunamadı." -ForegroundColor Red
  Write-Host 'PostgreSQL bin klasörünü PATH içine ekleyin.'
  Write-Host 'Örnek: C:\Program Files\PostgreSQL\16\bin'
  exit 1
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$schemaDumpPath = Join-Path $OutputDirectory "dump-schema.sql"
$dataDumpPath = Join-Path $OutputDirectory "dump-data.sql"

$securePassword = Read-Host "PostgreSQL şifresi" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:PGPASSWORD = $plainPassword

  Write-Host ""
  Write-Host "1/2 Sadece tablo yapısı oluşturuluyor..."

  & pg_dump `
    --host $DatabaseHost `
    --port $DatabasePort `
    --username $DatabaseUser `
    --dbname $DatabaseName `
    --schema-only `
    --no-owner `
    --no-privileges `
    --file $schemaDumpPath

  if ($LASTEXITCODE -ne 0) {
    throw "Schema dump oluşturulamadı."
  }

  Write-Host "Oluşturuldu: $schemaDumpPath" -ForegroundColor Green

  Write-Host ""
  Write-Host "2/2 Sadece veriler oluşturuluyor..."

  & pg_dump `
    --host $DatabaseHost `
    --port $DatabasePort `
    --username $DatabaseUser `
    --dbname $DatabaseName `
    --data-only `
    --no-owner `
    --no-privileges `
    --file $dataDumpPath

  if ($LASTEXITCODE -ne 0) {
    throw "Data dump oluşturulamadı."
  }

  Write-Host "Oluşturuldu: $dataDumpPath" -ForegroundColor Green
  Write-Host ""
  Write-Host "İşlem tamamlandı." -ForegroundColor Cyan
  Write-Host "UYARI: dump-data.sql kullanıcı ve sistem verilerini içerebilir."
  Write-Host "Bu dosyayı GitHub'a göndermeyin."
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
}
