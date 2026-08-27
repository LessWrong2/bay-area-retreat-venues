#!/usr/bin/env python3
"""Merge spreadsheet data with research results, process images, emit data.js.

Usage: python3 build.py
Inputs:  research/venues-base.json, research/<id>.json, research/raw/<id>/*
Outputs: images/<id>/{thumb.jpg, NN.jpg}, data.js

research/raw/ is not committed, so a checkout usually has photos for none of the
venues. A venue with no raw directory keeps whatever images the existing data.js
already lists, which is what makes it safe to run this after touching one venue.
"""
import json, os, sys, glob
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.join(ROOT, "research")
RAW = os.path.join(RESEARCH, "raw")
OUT_IMG = os.path.join(ROOT, "images")

MAX_W = 1600
THUMB = 256
PIN = 112

TIER_LABEL = {"A": "Tier A", "B": "Tier B", "C": "Tier C", "FLY": "Fly-in", "REF": "Reference"}


def load_image(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    elif im.mode != "RGB":
        im = im.convert("RGB")
    return im


def save_jpeg(im, path, quality):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def fmt_k(n):
    if n >= 10000:
        return f"{round(n / 1000)}"
    return f"{n / 1000:.1f}".rstrip("0").rstrip(".")


def cost_with_short(c):
    c = dict(c)
    low, high = c.get("low"), c.get("high")
    if isinstance(low, (int, float)) and isinstance(high, (int, float)):
        rng = f"${fmt_k(low)}k" if abs(high - low) < 500 else f"${fmt_k(low)}–{fmt_k(high)}k"
        c["short"] = rng if c.get("mode") == "published" else f"est. {rng}"
    elif c.get("mode") == "quote":
        c["short"] = "Not bookable" if "not bookable" in (c.get("summary", "") + c.get("basis", "")).lower() else "Quote"
    else:
        c["short"] = c.get("summary", "")
    return c


def previous_venues():
    path = os.path.join(ROOT, "data.js")
    if not os.path.exists(path):
        return {}
    text = open(path).read()
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end < 0:
        return {}
    return {v["id"]: v for v in json.loads(text[start:end + 1])}


def process_venue(v, r, prev):
    vid = v["id"]
    out_dir = os.path.join(OUT_IMG, vid)
    raw_dir = os.path.join(RAW, vid)
    if not os.path.isdir(raw_dir):
        old = prev.get(vid, {})
        v["images"] = old.get("images", [])
        if old.get("thumb"):
            v["thumb"] = old["thumb"]
        return
    images = []
    thumb_file = r.get("thumb")
    for i, img in enumerate(r.get("images", [])):
        src = os.path.join(raw_dir, img["file"])
        if not os.path.exists(src):
            print(f"  ! missing raw {src}", file=sys.stderr)
            continue
        try:
            im = load_image(src)
        except Exception as e:
            print(f"  ! unreadable {src}: {e}", file=sys.stderr)
            continue
        w, h = im.size
        if w > MAX_W:
            im = im.resize((MAX_W, round(h * MAX_W / w)), Image.LANCZOS)
        name = f"{i+1:02d}.jpg"
        save_jpeg(im, os.path.join(out_dir, name), 82)
        images.append({
            "file": f"images/{vid}/{name}",
            "w": im.size[0], "h": im.size[1],
            "caption": img.get("caption", ""),
            "credit": img.get("credit", ""),
            "source": img.get("page_url") or img.get("source_url", ""),
        })
        if img["file"] == thumb_file or (thumb_file is None and i == 0):
            full = load_image(src)
            sq = ImageOps.fit(full, (THUMB, THUMB), Image.LANCZOS, centering=(0.5, 0.45))
            save_jpeg(sq, os.path.join(out_dir, "thumb.jpg"), 85)
            v["thumb"] = f"images/{vid}/thumb.jpg"
    v["images"] = images
    if images and "thumb" not in v:
        full = load_image(os.path.join(raw_dir, r["images"][0]["file"]))
        sq = ImageOps.fit(full, (THUMB, THUMB), Image.LANCZOS, centering=(0.5, 0.45))
        save_jpeg(sq, os.path.join(out_dir, "thumb.jpg"), 85)
        v["thumb"] = f"images/{vid}/thumb.jpg"


def main():
    base = json.load(open(os.path.join(RESEARCH, "venues-base.json")))
    prev = previous_venues()
    out = []
    for v in base:
        rp = os.path.join(RESEARCH, f"{v['id']}.json")
        r = json.load(open(rp)) if os.path.exists(rp) else {}
        v = dict(v)
        v["tierLabel"] = TIER_LABEL.get(v["tier"], v["tier"])
        v.setdefault("region", "bay")
        for k in ("address", "lat", "lng", "geo_confidence"):
            if k in r and r[k] not in (None, ""):
                v[k] = r[k]
        pp = os.path.join(RESEARCH, f"{v['id']}.pricing.json")
        if os.path.exists(pp):
            pr = json.load(open(pp))
            v["cost"] = cost_with_short(pr.get("cost") or {})
            v["availability"] = pr.get("availability") or []
            v["availabilityNotes"] = pr.get("availability_notes", "")
            v["checkedOn"] = pr.get("checked_on", "")
        ap = os.path.join(RESEARCH, f"{v['id']}.availability.json")
        if os.path.exists(ap):
            av = json.load(open(ap))
            v["verified"] = {
                "checkedOn": av.get("checked_on", ""),
                "method": av.get("method", ""),
                "bookingPolicy": av.get("booking_policy", ""),
                "weekends": [
                    {
                        "weekend": w.get("weekend"),
                        "status": w.get("status", "unknown"),
                        "evidence": w.get("evidence", ""),
                        "quote": w.get("evidence_quote") or "",
                        "sourceUrl": w.get("source_url", ""),
                        "sourceLabel": w.get("source_label", ""),
                    }
                    for w in (av.get("weekends") or [])
                ],
            }
        raw_present = os.path.isdir(os.path.join(RAW, v["id"]))
        print(f"{v['id']}: research={'yes' if r else 'NO'} raw={'yes' if raw_present else 'reused'} images={len(r.get('images', []))} geo={r.get('geo_confidence','-')} pricing={'yes' if os.path.exists(pp) else 'NO'} verified={len((v.get('verified') or {}).get('weekends', []))}")
        process_venue(v, r, prev)
        out.append(v)
    with open(os.path.join(ROOT, "data.js"), "w") as f:
        f.write("// Generated by build.py — do not edit by hand.\n")
        f.write("window.VENUES = ")
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write(";\n")
    missing = [v["id"] for v in out if "lat" not in v]
    noimg = [v["id"] for v in out if not v.get("images")]
    print(f"\n{len(out)} venues. Missing coords: {missing or 'none'}. No images: {noimg or 'none'}")


if __name__ == "__main__":
    main()
