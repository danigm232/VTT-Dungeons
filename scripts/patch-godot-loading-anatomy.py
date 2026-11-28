"""Pack the reviewed Medicine correction into the eight existing atlas regions."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import runpy

from PIL import Image

measure = runpy.run_path(str(Path(__file__).with_name("measure-godot-loading-contacts.py")))
ROOT, PROJECTS, support = (measure[name] for name in ("ROOT", "PROJECTS", "support"))

OUTPUT = ROOT / "output/loading-anatomy-20261127"
SCOPE = "loading-anatomy-20261127"
RESOURCE = "sw-mike-loading-medicine-v6"
SHARED = ROOT / "prototypes/godot-shared/characters"
BASE = ROOT / "prototypes/godot-campamentos/loading"
FILES = ("catalog.json", "art/atlas-7.webp", "ground_contacts.json")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def candidate():
    scope = read(SHARED / "scopes" / f"{SCOPE}.candidate.json")
    animation = scope["animations"][RESOURCE]
    correction = animation["production"]["anatomyCorrection"]
    ids = correction["atlasFrames"]
    if correction["status"] != "localized-retouch" or ids != list(range(664, 672)):
        raise ValueError("Unexpected frame correction scope")

    baseline = OUTPUT / "baseline"
    candidate_dir = OUTPUT / "candidate"
    (candidate_dir / "art").mkdir(parents=True, exist_ok=True)
    (baseline / "art").mkdir(parents=True, exist_ok=True)
    for name in FILES:
        if not (baseline / name).exists():
            shutil.copyfile(BASE / name, baseline / name)
    catalog = read(baseline / "catalog.json")
    contacts = read(baseline / "ground_contacts.json")
    page = Image.open(baseline / "art/atlas-7.webp").convert("RGBA")
    patched = page.copy()

    for i, index in enumerate(ids):
        frame = catalog["frames"][index]
        x, y, width, height = frame["region"]
        source = frame["source"]
        original_path = correction["originalFrames"][i]
        replacement_path = animation["frames"][i]
        if frame["atlas"] != 7 or source["file"] != original_path or (frame["width"], frame["height"]) != (width, height):
            raise ValueError(f"Frame {index} moved since this correction was authored")
        reference = Image.open(ROOT / original_path).convert("RGBA")
        replacement = Image.open(ROOT / replacement_path).convert("RGBA")
        if reference.size != replacement.size or replacement.size != (source["width"], source["height"]):
            raise ValueError(f"Frame {index} source dimensions changed")
        bounds = reference.getchannel("A").point(lambda v: 255 if v >= 32 else 0).getbbox()
        if bounds is None or (bounds[2] - bounds[0], bounds[3] - bounds[1]) != (width, height):
            raise ValueError(f"Frame {index} source does not reproduce its atlas region")
        raw = reference.crop(bounds)
        changed = replacement.crop(bounds)
        atlas_original = page.crop((x, y, x + width, y + height))
        for before, original in zip(raw.get_flattened_data(), atlas_original.get_flattened_data()):
            if max(abs(a - b) for a, b in zip(before, original)) > 1 and (before[3] or original[3]):
                raise ValueError(f"Frame {index} differs from its declared original")
        roi = correction["affectedBounds"][i]
        changes = 0
        alpha = bytearray(atlas_original.getchannel("A").tobytes())
        for k, (before, after) in enumerate(zip(raw.get_flattened_data(), changed.get_flattened_data())):
            if before[3] == after[3]:
                if before[3] and before != after:
                    raise ValueError(f"Frame {index} repaints source colors instead of removing the duplicate")
                continue
            if before[3] < after[3]:
                raise ValueError(f"Frame {index} expands the original silhouette")
            row, col = divmod(k, width)
            if not (roi[0] <= col < roi[2] and roi[1] <= row < roi[3]):
                raise ValueError(f"Frame {index} changes something outside its traced repair")
            alpha[k] = round(alpha[k] * after[3] / before[3])
            changes += 1
        if not changes:
            raise ValueError(f"Frame {index} has no corrected pixels")
        alpha = Image.frombytes("L", (width, height), bytes(alpha))
        atlas_original.putalpha(alpha)
        patched.paste(atlas_original, (x, y))
        contacts["frames"][str(index)]["points"] = [
            support(alpha, 0, round(width * .48), frame),
            support(alpha, round(width * .52), width, frame),
        ]
        source["file"] = replacement_path
        print(f"Frame {index}: {changes} edited pixels, retained dimensions and position")

    # Verify every unaffected atlas region after lossless encoding.
    path = candidate_dir / "art/atlas-7.webp"
    patched.save(path, lossless=True, exact=True)
    verified = Image.open(path).convert("RGBA")
    if verified.tobytes() != patched.tobytes():
        raise ValueError("Lossless atlas verification failed")
    unaffected = 0
    for index, f in enumerate(catalog["frames"]):
        if index in ids:
            continue
        if f["atlas"] == 7:
            x, y, w, h = f["region"]
            rect = (x, y, x + w, y + h)
            if page.crop(rect).tobytes() != verified.crop(rect).tobytes():
                raise ValueError(f"Unrelated frame {index} changed")
        unaffected += 1
    catalog["anatomyRegistry"] = {"scope": SCOPE, "revision": scope["revision"], "frames": ids}
    write(candidate_dir / "catalog.json", catalog)
    write(candidate_dir / "ground_contacts.json", contacts)
    print(f"Candidate packed, {unaffected} unrelated frame regions preserved.")


def install():
    scope = read(SHARED / "scopes" / f"{SCOPE}.json")
    baseline, candidate_dir = OUTPUT / "baseline", OUTPUT / "candidate"
    new = read(candidate_dir / "catalog.json")
    if scope["status"] != "reviewed-candidate" or new["anatomyRegistry"]["revision"] != scope["revision"]:
        raise ValueError("The exact candidate revision must be promoted first")
    for project in PROJECTS:
        loading = ROOT / f"prototypes/godot-{project}/loading"
        for name in FILES:
            if digest(loading / name) not in (digest(baseline / name), digest(candidate_dir / name)):
                raise ValueError(f"{project}/{name} diverged from the reviewed inputs")
    for project in PROJECTS:
        loading = ROOT / f"prototypes/godot-{project}/loading"
        for name in FILES:
            shutil.copyfile(candidate_dir / name, loading / name)
    print("The eight reviewed frames are installed in Campamentos, Pecio and Retiro.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    (install if args.install else candidate)()
