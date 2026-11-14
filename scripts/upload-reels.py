#!/usr/bin/env python3
"""Upload reel clips to the Supabase `reels` bucket via the reels Edge Function.

Auto-discovers every public/content/reels/*.mp4 (skipping 001-005, which are
already live) and uploads each one. Re-running is safe: clips recorded in
content/reels-work/upload-manifest.json are skipped. Pass --force to re-upload,
or one or more ids (e.g. `upload-reels.py Comedy1 Mind3`) to upload just those.
"""
import base64, json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/content/reels"
OUT = ROOT / "content/reels-work/upload-manifest.json"
ALREADY_LIVE = {"001", "002", "003", "004", "005"}


def load_env():
    for name in (".env.local", ".env"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def call(url, key, body, timeout=300):
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
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    force = "--force" in sys.argv

    url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (put them in .env.local)")
        sys.exit(1)

    if args:
        ids = args
    else:
        ids = sorted(p.stem for p in SRC.glob("*.mp4") if p.stem not in ALREADY_LIVE)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(OUT.read_text()) if OUT.exists() else {}

    done, failed, skipped = [], [], []
    for rid in ids:
        path = SRC / f"{rid}.mp4"
        if not path.exists():
            print(f"{rid:<12} MISSING file {path}")
            failed.append(rid)
            continue
        if not force and manifest.get(rid, {}).get("url"):
            print(f"{rid:<12} already uploaded (use --force to redo)")
            skipped.append(rid)
            continue
        mb = path.stat().st_size / 1_000_000
        print(f"{rid:<12} uploading {mb:.2f} MB ...", flush=True)
        body = {
            "action": "upload",
            "id": rid,
            "bytes": base64.b64encode(path.read_bytes()).decode("ascii"),
            "mime": "video/mp4",
        }
        try:
            out = call(url, key, body)
        except Exception as e:
            print(f"{rid:<12} FAIL {e}")
            failed.append(rid)
            continue
        if out.get("ok") and out.get("url"):
            manifest[rid] = {"url": out["url"], "path": out.get("path")}
            OUT.write_text(json.dumps(manifest, indent=2))
            print(f"{rid:<12} ok -> {out['url']}")
            done.append(rid)
        else:
            print(f"{rid:<12} FAIL {out}")
            failed.append(rid)

    print(f"\nuploaded {len(done)}  skipped {len(skipped)}  failed {len(failed)}")
    if failed:
        print("failed:", ", ".join(failed))
    print("manifest:", OUT)


if __name__ == "__main__":
    main()
