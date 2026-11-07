#!/usr/bin/env python3
"""Import tagged reel rows (+ embeddings) into Supabase and write public/content/reels.json."""
import json, os, re, sys, urllib.request
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "content/reel-library-tagged.xlsx"
FALLBACK = ROOT / "content/reel-library.xlsx"
PUBLIC = ROOT / "public/content/reels.json"
MANIFEST = ROOT / "content/reels-work/upload-manifest.json"
PREP = ROOT / "content/reels-work/prep.json"
IDS = ["001", "002", "003", "004", "005"]
COLS = [
    "id", "file", "link", "downloaded", "creator", "topic", "subtopic", "audience",
    "mood", "energy", "format", "vibe", "depth", "keywords", "description",
    "curator_notes", "notes", "sponsored", "ad_category", "transcript", "ai_filled",
]


def load_env():
    for name in (".env.local", ".env"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def call(url, key, body):
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
    with urllib.request.urlopen(req, timeout=180) as res:
        return json.loads(res.read().decode())


def main():
    load_env()
    url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")
        sys.exit(1)
    src = XLSX if XLSX.exists() else FALLBACK
    wb = load_workbook(src, data_only=True)
    ws = wb["Reels"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {name: i for i, name in enumerate(headers)}
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    prep = {p["id"]: p for p in json.loads(PREP.read_text())} if PREP.exists() else {}
    rows = []
    for values in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
        rec = {h: values[col[h]] if h in col else None for h in COLS if h in col or h in COLS}
        rid = str(rec.get("id") or "")
        if rid not in IDS:
            continue
        rec = {k: ("" if rec.get(k) is None else rec.get(k)) for k in COLS}
        rec["id"] = rid
        rec["video_url"] = (manifest.get(rid) or {}).get("url") or f"{os.environ.get('VITE_SUPABASE_URL', '').rstrip('/')}/storage/v1/object/public/reels/{rid}.mp4"
        if not rec.get("energy") and prep.get(rid):
            rec["energy"] = prep[rid].get("energy")
        depth = str(rec.get("depth") or "")
        m = re.search(r"[1-5]", depth)
        if m:
            rec["depth"] = int(m.group(0))
        rows.append(rec)
    print(f"importing {len(rows)} from {src.name}")
    out = call(url, key, {"action": "import", "rows": rows})
    print(out)
    if not out.get("ok"):
        sys.exit(1)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    slim = []
    for r in rows:
        slim.append({
            "id": r["id"], "file": r["file"], "link": r["link"], "creator": r["creator"],
            "topic": r["topic"], "subtopic": r["subtopic"], "audience": r["audience"],
            "mood": r["mood"], "energy": r["energy"], "format": r["format"], "vibe": r["vibe"],
            "depth": r["depth"], "keywords": r["keywords"], "description": r["description"],
            "notes": r["notes"], "curator_notes": r["curator_notes"], "sponsored": r["sponsored"], "ad_category": r["ad_category"],
            "transcript": r["transcript"], "videoUrl": r["video_url"], "video_url": r["video_url"],
        })
    PUBLIC.write_text(json.dumps(slim, indent=2))
    print("wrote", PUBLIC)
    topics, audiences, depths, sponsored = {}, {}, {}, 0
    for r in rows:
        topics[str(r["topic"] or "?")] = topics.get(str(r["topic"] or "?"), 0) + 1
        audiences[str(r["audience"] or "?")] = audiences.get(str(r["audience"] or "?"), 0) + 1
        depths[str(r["depth"] or "?")] = depths.get(str(r["depth"] or "?"), 0) + 1
        if str(r["sponsored"]).lower() in ("yes", "true", "1"):
            sponsored += 1
    print("balance", {"n": len(rows), "sponsored": sponsored, "topic": topics, "audience": audiences, "depth": depths})


if __name__ == "__main__":
    main()
