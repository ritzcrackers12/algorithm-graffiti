#!/usr/bin/env python3
"""Mark downloaded, compress to ~5 MB vertical H.264, extract last frames + tag assets."""
import json, os, re, shutil, subprocess, sys
from pathlib import Path

from openpyxl import load_workbook

FFMPEG = os.environ.get(
    "FFMPEG",
    str(Path.home() / "Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"),
)
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "content/reels-raw"
XLSX = ROOT / "content/reel-library.xlsx"
WORK = ROOT / "content/reels-work"
COMP = WORK / "compressed"
LAST = WORK / "last-frames"
GRIDS = WORK / "grids"
AUDIO = WORK / "audio"
IDS = ["001", "002", "003", "004", "005"]


def run(cmd, **kw):
    p = subprocess.run(cmd, capture_output=True, text=True, **kw)
    return p


def probe(path):
    p = run([FFMPEG, "-i", str(path)])
    err = p.stderr
    dur = 0.0
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", err)
    if m:
        dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    w = h = None
    vm = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", err)
    if vm:
        w, h = int(vm.group(1)), int(vm.group(2))
    return {"duration": dur, "width": w, "height": h, "raw": err}


def mark_downloaded():
    wb = load_workbook(XLSX)
    ws = wb["Reels"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {name: i + 1 for i, name in enumerate(headers)}
    n = 0
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        rid = str(row[col["id"] - 1].value or "")
        if rid in IDS:
            row[col["downloaded"] - 1].value = "yes"
            n += 1
    wb.save(XLSX)
    print(f"downloaded=yes on {n} rows in {XLSX}")
    src = RAW / "reelspreadsheet.xlsx"
    if src.exists():
        shutil.copy2(XLSX, src)


def ok_file(path, min_bytes=800):
    return path.exists() and path.stat().st_size >= min_bytes


def grab_still(src, dst, extra, vf=None):
    cmd = [FFMPEG, "-y", *extra, "-i", str(src)]
    if vf:
        cmd += ["-vf", vf]
    cmd += ["-frames:v", "1", "-an", "-q:v", "3", str(dst)]
    p = run(cmd)
    return p.returncode == 0 and ok_file(dst)


def compress_one(rid):
    src = RAW / f"{rid}.mp4"
    dst = COMP / f"{rid}.mp4"
    info = probe(src)
    dur = max(info["duration"] or 8, 1)
    if ok_file(dst, 80_000):
        mb = dst.stat().st_size / 1_000_000
        print(f"compress {rid} skip existing {mb:.2f} MB duration={dur:.1f}s")
        return {"id": rid, "duration": dur, "mb": round(mb, 2), "src_w": info["width"], "src_h": info["height"]}
    video_k = max(250, int((5.0 * 8192) / dur) - 96)
    vf = "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1"
    cmd = [
        FFMPEG, "-y", "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast",
        "-b:v", f"{video_k}k", "-maxrate", f"{int(video_k * 1.2)}k", "-bufsize", f"{video_k * 2}k",
        "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-ar", "44100",
        "-movflags", "+faststart",
        str(dst),
    ]
    print(f"compress {rid} duration={dur:.1f}s vbit={video_k}k")
    p = run(cmd)
    if p.returncode != 0 or not dst.exists():
        print(p.stderr[-800:])
        raise SystemExit(f"compress failed {rid}")
    mb = dst.stat().st_size / 1_000_000
    print(f"  -> {mb:.2f} MB")
    return {"id": rid, "duration": dur, "mb": round(mb, 2), "src_w": info["width"], "src_h": info["height"]}


def last_frame(rid, dur):
    jpg = LAST / f"{rid}.jpg"
    if ok_file(jpg):
        return jpg
    srcs = [p for p in (COMP / f"{rid}.mp4", RAW / f"{rid}.mp4") if p.exists()]
    seeks = [["-sseof", "-0.5"], ["-ss", f"{max(0, dur - 0.5):.2f}"], ["-ss", "0"]]
    for src in srcs:
        for extra in seeks:
            if grab_still(src, jpg, extra):
                return jpg
        p = run([FFMPEG, "-y", "-i", str(src), "-update", "1", "-q:v", "3", str(jpg)])
        if p.returncode == 0 and ok_file(jpg):
            return jpg
    print("last frame fail", rid)
    return jpg


def grid(rid, dur):
    out = GRIDS / f"{rid}.jpg"
    if ok_file(out):
        return out
    srcs = [p for p in (COMP / f"{rid}.mp4", RAW / f"{rid}.mp4") if p.exists()]
    vf = "scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2"
    fr = []
    for i, frac in enumerate((0.12, 0.38, 0.62, 0.88)):
        t = max(0.05, min(max(dur, 1) - 0.05, max(dur, 1) * frac))
        f = GRIDS / f"{rid}_{i}.jpg"
        got = False
        for src in srcs:
            if grab_still(src, f, ["-ss", f"{t:.2f}"], vf):
                got = True
                break
        if not got:
            for src in srcs:
                if grab_still(src, f, ["-ss", "0"], vf):
                    got = True
                    break
        if not got:
            print("grid frame fail", rid, i)
            raise SystemExit(1)
        fr.append(f)
    p = run([
        FFMPEG, "-y",
        "-i", str(fr[0]), "-i", str(fr[1]), "-i", str(fr[2]), "-i", str(fr[3]),
        "-filter_complex", "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0",
        "-frames:v", "1", "-q:v", "4", str(out),
    ])
    if p.returncode != 0 or not ok_file(out):
        print("grid fail", rid, p.stderr[-400:])
        raise SystemExit(1)
    return out


def audio_clip(rid, dur):
    src = RAW / f"{rid}.mp4"
    wav = AUDIO / f"{rid}.wav"
    take = min(30, dur)
    run([
        FFMPEG, "-y", "-i", str(src), "-t", str(take),
        "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav),
    ])
    vol = run([FFMPEG, "-i", str(wav), "-af", "volumedetect", "-f", "null", "-"])
    mean = None
    m = re.search(r"mean_volume:\s*([-\d.]+)", vol.stderr)
    if m:
        mean = float(m.group(1))
    # scene cuts on source
    sc = run([
        FFMPEG, "-i", str(src), "-filter:v", "select='gt(scene,0.25)',showinfo", "-f", "null", "-",
    ])
    cuts = len(re.findall(r"pts_time:", sc.stderr))
    cuts_per_s = cuts / max(dur, 1)
    # energy: cut frequency + loudness
    loud = 0 if mean is None else (0 if mean < -35 else 1 if mean < -22 else 2)
    cut_b = 0 if cuts_per_s < 0.15 else 1 if cuts_per_s < 0.45 else 2
    score = loud + cut_b
    energy = "low" if score <= 1 else "medium" if score <= 3 else "high"
    has_speech = mean is not None and mean > -38
    return {
        "wav": str(wav),
        "mean_volume": mean,
        "scene_cuts": cuts,
        "cuts_per_s": round(cuts_per_s, 3),
        "energy": energy,
        "has_speech": has_speech,
    }


def main():
    for d in (WORK, COMP, LAST, GRIDS, AUDIO):
        d.mkdir(parents=True, exist_ok=True)
    mark_downloaded()
    report = []
    for rid in IDS:
        meta = compress_one(rid)
        last_frame(rid, meta["duration"])
        grid(rid, meta["duration"])
        audio = audio_clip(rid, meta["duration"])
        meta.update(audio)
        report.append(meta)
        print(f"  energy={audio['energy']} speech={audio['has_speech']} mean={audio['mean_volume']}")
    (WORK / "prep.json").write_text(json.dumps(report, indent=2))
    print("wrote", WORK / "prep.json")


if __name__ == "__main__":
    main()
