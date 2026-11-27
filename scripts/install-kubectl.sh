#!/bin/sh
# Installs kubectl, the version the practical exercises are graded with
# (lib/exercises/kubectl.ts, docs/SPECS-KUBERNETES-PRATIQUE.md §3.4), after
# checking its SHA-256 against the value written here (not one downloaded with it).
#   scripts/install-kubectl.sh [destination]      (default /usr/local/bin/kubectl)
# Used by the CI and the Dockerfile. A new version: change VERSION and both
# checksums (https://dl.k8s.io/release/<version>/bin/linux/<arch>/kubectl.sha256).
set -eu

VERSION=v1.37.3
SHA256_amd64=9a1b55af2795b25dd288dbef62387db9b5530087ab918d28c6ad067f2e3cb07c
SHA256_arm64=da160b41491cc5c5e575d78bb665810fb900f70fad666d834094b24ec56d304f
DEST=${1:-/usr/local/bin/kubectl}

case "${TARGETARCH:-$(uname -m)}" in
  amd64 | x86_64) ARCH=amd64; SHA256=$SHA256_amd64 ;;
  arm64 | aarch64) ARCH=arm64; SHA256=$SHA256_arm64 ;;
  *) echo "kubectl: unsupported architecture ${TARGETARCH:-$(uname -m)}" >&2; exit 1 ;;
esac

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
URL="https://dl.k8s.io/release/${VERSION}/bin/linux/${ARCH}/kubectl"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL --retry 4 -o "$TMP" "$URL"
else
  # No curl (node:*-slim): Node, there in every image that runs the app.
  node -e 'fetch(process.argv[1]).then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); require("fs").writeFileSync(process.argv[2], Buffer.from(await r.arrayBuffer())); }).catch((e) => { console.error(e.message); process.exit(1); })' "$URL" "$TMP"
fi
echo "${SHA256}  ${TMP}" | sha256sum -c -
install -m 0755 "$TMP" "$DEST"
"$DEST" version --client
