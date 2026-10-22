#!/usr/bin/env bash
# Publica el simulador en un link público temporal.
#
# Sin cuenta, sin costo y sin instalar nada: un servidor estático local y un túnel SSH a
# localhost.run, que reparte un subdominio HTTPS al vuelo. El link vive mientras este
# script corra; Ctrl+C lo mata y la URL deja de existir.
#
# Uso:  ./compartir.sh [puerto]
set -euo pipefail

PUERTO="${1:-8788}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$(mktemp -t diablos-tunel)"

if [[ ! -f "$AQUI/app/dist/index.html" ]]; then
  echo "No hay build. Compilando…"
  (cd "$AQUI/app" && npm run build)
fi

limpiar() {
  echo
  echo "Cerrando el link…"
  [[ -n "${PID_TUNEL:-}" ]] && kill "$PID_TUNEL" 2>/dev/null || true
  [[ -n "${PID_WEB:-}"   ]] && kill "$PID_WEB"   2>/dev/null || true
  rm -f "$LOG"
  echo "Listo: la URL ya no responde."
}
trap limpiar EXIT INT TERM

node "$AQUI/app/scripts/serve.mjs" "$PUERTO" > /dev/null 2>&1 &
PID_WEB=$!
sleep 1

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 \
    -R "80:localhost:$PUERTO" nokey@localhost.run > "$LOG" 2>&1 &
PID_TUNEL=$!

echo "Abriendo el túnel…"
for _ in $(seq 1 45); do
  URL=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' "$LOG" | head -1 || true)
  [[ -n "${URL:-}" ]] && break
  sleep 1
done

if [[ -z "${URL:-}" ]]; then
  echo "No se pudo abrir el túnel. Revisa:"; cat "$LOG"; exit 1
fi

cat <<FIN

  ──────────────────────────────────────────────
   $URL
  ──────────────────────────────────────────────

  Mándaselo a quien quieras: no pide cuenta ni login.
  El link vive mientras esta terminal siga abierta.
  Ctrl+C para matarlo.

FIN
wait "$PID_TUNEL"
