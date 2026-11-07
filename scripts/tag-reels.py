#!/usr/bin/env python3
"""Tag empty cells on downloaded reels via the reels Edge Function (NYU proxy wrapper)."""
import json, os, re, sys
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import PatternFill

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "content/reel-library.xlsx"
OUT = ROOT / "content/reel-library-tagged.xlsx"
WORK = ROOT / "content/reels-work"
CACHE = WORK / "tag-cache.json"
FILLABLE = ["topic", "subtopic", "audience", "mood", "energy", "format", "vibe", "depth", "keywords", "description"]
NEVER = {"id", "file", "link", "downloaded", "creator", "sponsored", "ad_category", "curator_notes", "notes"}
BLUE = PatternFill("solid", fgColor="BBDEFB")
IDS = None  # all downloaded if None


def load_env():
    for name in (".env.local", ".env"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def lists_from(wb):
    ws = wb["Lists"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    out = {h: [] for h in headers if h}
    for row in ws.iter_rows(min_row=2, values_only=True):
        for h, v in zip(headers, row):
            if h and v:
                out[h].append(str(v))
    return out


def call(url, key, body):
    import urllib.request
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
        print("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local")
        sys.exit(1)
    cap = int(os.environ.get("TAG_CAP", "300"))
    prep = json.loads((WORK / "prep.json").read_text())
    prep_by = {p["id"]: p for p in prep}
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    wb = load_workbook(XLSX)
    ws = wb["Reels"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    if "ai_filled" not in headers:
        ws.cell(1, len(headers) + 1, "ai_filled")
        headers.append("ai_filled")
    if "transcript" not in headers:
        ws.cell(1, len(headers) + 1, "transcript")
        headers.append("transcript")
    col = {name: i + 1 for i, name in enumerate(headers)}
    lists = lists_from(wb)
    used_total = 0
    flagged_all = []

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        rid = str(row[col["id"] - 1].value or "")
        downloaded = str(row[col["downloaded"] - 1].value or "").lower()
        if downloaded != "yes":
            continue
        if IDS and rid not in IDS:
            continue
        if used_total >= cap:
            print(f"cap {cap} reached, stopping")
            break
        rec = {h: row[col[h] - 1].value for h in headers if h in col}
        if rid in cache:
            print(f"{rid} cache hit")
            fields, transcript, flagged, used = cache[rid]["fields"], cache[rid].get("transcript", ""), cache[rid].get("flagged", []), []
        else:
            meta = prep_by.get(rid)
            if not meta:
                print(f"{rid} missing prep assets, skip")
                continue
            grid = WORK / "grids" / f"{rid}.jpg"
            wav = WORK / "audio" / f"{rid}.wav"
            pub = (os.environ.get("VITE_SUPABASE_URL") or url).rstrip("/")
            grid_url = f"{pub}/storage/v1/object/public/reels/tag/{rid}.jpg" if grid.exists() else None
            wav_url = f"{pub}/storage/v1/object/public/reels/tag/{rid}.wav" if wav.exists() else None
            body = {
                "action": "tag",
                "id": rid,
                "lists": lists,
                "curator_notes": rec.get("curator_notes") or "",
                "ad_category": rec.get("ad_category") or "",
                "sponsored": rec.get("sponsored") or "no",
                "energy": meta.get("energy"),
                "has_speech": bool(meta.get("has_speech")),
                "grid": grid_url,
            }
            if meta.get("has_speech") and wav.exists() and os.environ.get("SKIP_STT") != "1":
                body["audio"] = wav_url
            else:
                body["has_speech"] = False
            print(f"{rid} tagging speech={body['has_speech']} energy={body['energy']} ...")
            try:
                out = call(url, key, body)
            except Exception as e:
                print(f"{rid} FAIL {e}")
                continue
            if not out.get("ok"):
                print(f"{rid} FAIL {out}")
                continue
            fields, transcript, flagged, used = out.get("fields") or {}, out.get("transcript") or "", out.get("flagged") or [], out.get("used") or []
            cache[rid] = {"fields": fields, "transcript": transcript, "flagged": flagged, "used": used}
            CACHE.write_text(json.dumps(cache, indent=2))
            used_total += sum(1 for u in used if u.get("source") in ("proxy", "direct"))
            print(f"  used={used} transcript={transcript[:80]!r}")

        filled = []
        for key in FILLABLE:
            cell = row[col[key] - 1]
            empty = cell.value is None or str(cell.value).strip() == ""
            if not empty:
                continue
            val = fields.get(key)
            if key == "energy" and not val:
                val = prep_by.get(rid, {}).get("energy")
            if val is None or str(val).strip() == "":
                continue
            cell.value = str(val)
            cell.fill = BLUE
            filled.append(key)
        tcell = row[col["transcript"] - 1]
        if transcript and (tcell.value is None or str(tcell.value).strip() == ""):
            tcell.value = transcript
            tcell.fill = BLUE
            filled.append("transcript")
        row[col["ai_filled"] - 1].value = ",".join(filled)
        if filled:
            row[col["ai_filled"] - 1].fill = BLUE
        if flagged:
            flagged_all.append((rid, flagged))

    wb.save(OUT)
    print("wrote", OUT)
    print("proxy/direct requests this run (uncached):", used_total)
    if flagged_all:
        print("NEW values flagged:", flagged_all)


if __name__ == "__main__":
    main()
