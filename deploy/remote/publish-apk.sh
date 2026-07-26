#!/usr/bin/env bash
# Publish an APK into the nginx-served releases folder.
# Usage:
#   publish-apk.sh /path/to/TroubleDent.apk [version-tag]
# Example:
#   publish-apk.sh ./TroubleDent.apk v0.3.7
set -euo pipefail

APK_SRC="${1:?path to apk}"
VERSION_TAG="${2:-latest}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/urgent-care/releases}"

[[ -f "$APK_SRC" ]] || { echo "APK not found: $APK_SRC" >&2; exit 1; }

VERSION_TAG="${VERSION_TAG#/}"
SAFE_TAG="$(printf '%s' "$VERSION_TAG" | tr -c 'A-Za-z0-9._+-' '_')"
DEST_NAME="TroubleDent-${SAFE_TAG}.apk"

mkdir -p "$RELEASES_DIR"
install -m 644 "$APK_SRC" "${RELEASES_DIR}/${DEST_NAME}"
cp -f "${RELEASES_DIR}/${DEST_NAME}" "${RELEASES_DIR}/TroubleDent-latest.apk"
chmod a+rX "$RELEASES_DIR" "${RELEASES_DIR}/${DEST_NAME}" "${RELEASES_DIR}/TroubleDent-latest.apk"

# Simple HTML index (nicer than raw autoindex; autoindex still works as fallback)
INDEX="${RELEASES_DIR}/index.html"
{
  echo '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
  echo '<title>TroubleDent — Releases</title>'
  echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}'
  echo 'a{color:#0b57d0;text-decoration:none}a:hover{text-decoration:underline}'
  echo 'ul{padding-left:1.2rem}li{margin:.4rem 0}.meta{color:#666;font-size:.9rem}</style>'
  echo '</head><body><h1>TroubleDent APK</h1>'
  echo '<p><a href="TroubleDent-latest.apk"><strong>Скачать latest</strong></a></p>'
  echo '<h2>Все версии</h2><ul>'
  # newest first
  ls -1t "$RELEASES_DIR"/TroubleDent-*.apk 2>/dev/null | while read -r f; do
    base="$(basename "$f")"
    [[ "$base" == "TroubleDent-latest.apk" ]] && continue
    size="$(du -h "$f" | cut -f1)"
    mtime="$(date -r "$f" '+%Y-%m-%d %H:%M' 2>/dev/null || stat -c '%y' "$f" | cut -d. -f1)"
    echo "<li><a href=\"${base}\">${base}</a> <span class=\"meta\">${size} · ${mtime}</span></li>"
  done
  echo '</ul><p class="meta">Файлы также доступны напрямую в этой папке.</p></body></html>'
} > "$INDEX"
chmod a+r "$INDEX"

echo "Published ${DEST_NAME} (+ TroubleDent-latest.apk) -> ${RELEASES_DIR}"
ls -lh "${RELEASES_DIR}/${DEST_NAME}" "${RELEASES_DIR}/TroubleDent-latest.apk"
