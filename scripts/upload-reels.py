#!/usr/bin/env python3
"""Upload compressed reels to the Supabase `reels` bucket via the reels Edge Function."""
import json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMP = ROOT / "content/reels-work/compressed"
OUT = ROOT / "content/reels-work/upload-manifest.json"
IDS = ["001", "002", "003", "004", "005"]


def load_env():
    for name in (".env.local", ".env"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def call(url, key, body, timeout=180):
    req = urllib.request.Request(
        f"{url.rstrip('/')}/functions/v1/reels",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode())


def main():
    load_env()
    url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")
        sys.exit(1)
    manifest = json.loads(OUT.read_text()) if OUT.exists() else {}
    for rid in IDS:
        path = COMP / f"{rid}.mp4"
        if not path.exists():
            print(f"{rid} missing compressed file")
            continue
        if rid in manifest and manifest[rid].get("url"):
            print(f"{rid} already uploaded {manifest[rid]['url']}")
            continue
        print(f"{rid} uploading {path.stat().st_size / 1_000_000:.2f} MB ...")
        import base64
        body = {"action": "upload", "id": rid, "bytes": base64.b64encode(path.read_bytes()).decode("ascii"), "mime": "video/mp4"}
        try:
            out = call(url, key, body)
        except Exception as e:
            print(f"{rid} FAIL {e}")
            continue
        print(f"  {out}")
        if out.get("ok") and out.get("url"):
            manifest[rid] = {"url": out["url"], "path": out.get("path")}
            OUT.write_text(json.dumps(manifest, indent=2))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
