#!/bin/bash
set -euo pipefail
APP="/root/PROJETOS/exito/paulocond"
SEED_FILE="/tmp/paulocond-seed.env"
cd "$APP"

if [ -f .env ]; then
  cp -a .env ".env.bak.$(date +%Y%m%d%H%M%S)"
fi

git fetch origin main
git reset --hard origin/main

if ! docker ps -a --format '{{.Names}}' | grep -qx paulocond-pg; then
  PW="$(openssl rand -hex 24)"
  docker run -d --name paulocond-pg --restart unless-stopped \
    -e POSTGRES_USER=sabia \
    -e POSTGRES_PASSWORD="$PW" \
    -e POSTGRES_DB=sabia \
    -p 127.0.0.1:5437:5432 \
    postgres:18
  export PAULOCOND_PG_PASSWORD="$PW"
  echo "CREATED_PG"
else
  echo "PG_EXISTS"
fi

for i in $(seq 1 30); do
  if docker exec paulocond-pg pg_isready -U sabia >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec paulocond-pg pg_isready -U sabia >/dev/null

python3 - <<'PY'
import os, pathlib, secrets, re

app = pathlib.Path("/root/PROJETOS/exito/paulocond")
seed_path = pathlib.Path("/tmp/paulocond-seed.env")
env_path = app / ".env"
seed = {}
if seed_path.exists():
    for line in seed_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        seed[k] = v

existing = {}
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        existing[k] = v.strip().strip('"').strip("'")

pw = os.environ.get("PAULOCOND_PG_PASSWORD", "").strip()
url = existing.get("DATABASE_URL", "")
if pw:
    url = f"postgresql://sabia:{pw}@127.0.0.1:5437/sabia"
elif not url.startswith("postgresql://"):
    raise SystemExit("sem senha do postgres e sem DATABASE_URL valida")

auth = existing.get("AUTH_SECRET") or secrets.token_hex(32)
email = seed.get("SEED_ADMIN_EMAIL") or existing.get("SEED_ADMIN_EMAIL") or ""
senha = seed.get("SEED_ADMIN_PASSWORD") or existing.get("SEED_ADMIN_PASSWORD") or ""
if not email or not senha:
    raise SystemExit("SEED_ADMIN ausente")

text = "\n".join([
    "DB_HOST=127.0.0.1",
    "DB_PORT=5437",
    "DB_NAME=sabia",
    "DB_USER=sabia",
    f"DB_PASSWORD={pw or existing.get('DB_PASSWORD','')}",
    f'DATABASE_URL="{url}"',
    'CONDOMINIO_CODIGO="132"',
    f'AUTH_SECRET="{auth}"',
    "AUTH_COOKIE_SECURE=true",
    f'SEED_ADMIN_EMAIL="{email}"',
    f'SEED_ADMIN_PASSWORD="{senha}"',
    "",
])
env_path.write_text(text, encoding="utf-8")
os.chmod(env_path, 0o600)
print("ENV_OK")
PY

chmod 600 "$APP/.env"
rm -f "$SEED_FILE"
echo "BOOTSTRAP_OK"
