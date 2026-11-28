"""Measure planted supports on the existing loading atlas. No sprite pixels are changed."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ("campamentos", "pecio", "retiro")
LOADING = ROOT / "prototypes/godot-campamentos/loading"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def support(alpha, start, end, frame):
    width, height = alpha.size
    rows = alpha.tobytes()
    for y in range(height - 1, -1, -1):
        if sum(value >= 160 for value in rows[y * width + start:y * width + end]) >= 2:
            break
    else:
        raise ValueError("Missing opaque support in a declared side")
    band = max(3, round(height * .026))
    xs = [x for yy in range(max(0, y - band), y + 1) for x in range(start, end)
          if rows[yy * width + x] >= 160]
    horizontal = frame["width"] / width
    vertical = frame["height"] / height
    return [round((min(xs) + max(xs) + 1) * .5 * horizontal - frame["pivot"], 2),
            round((y + 1) * vertical - frame["floor"], 2),
            round((max(xs) - min(xs) + 1) * horizontal, 2)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true", help="Copy measured contacts into all three loading modules")
    args = parser.parse_args()
    catalog = json.loads((LOADING / "catalog.json").read_text(encoding="utf-8"))
    assets = ["catalog.json", *[f"art/atlas-{i}.webp" for i in range(catalog["atlasCount"])]]
    signatures = {name: digest(LOADING / name) for name in assets}
    for project in PROJECTS:
        path = ROOT / f"prototypes/godot-{project}/loading"
        if any(digest(path / name) != signature for name, signature in signatures.items()):
            raise ValueError(f"Installed loading atlas differs in {project}")

    clips = set()
    for actor in catalog["actors"].values():
        for phases in actor["scenes"].values():
            for value in phases.values():
                for choice in value if isinstance(value, list) else [value]:
                    clips.add(choice["clip"])
    paired = {index for clip in clips if catalog["selections"][clip]["paired"]
              for index in catalog["selections"][clip]["frames"]}
    horse = set(catalog["groups"]["horse"]["frames"])
    atlases = [Image.open(LOADING / f"art/atlas-{i}.webp").getchannel("A")
               for i in range(catalog["atlasCount"])]
    anchors = {}
    for index in sorted(paired | horse):
        frame = catalog["frames"][index]
        x, y, w, h = frame["region"]
        alpha = atlases[frame["atlas"]].crop((x, y, x + w, y + h))
        anchors[str(index)] = {
            "region": [frame["atlas"], *frame["region"]],
            "points": [support(alpha, 0, round(w * .48), frame),
                       support(alpha, round(w * .52), w, frame)],
        }
    result = {"version": 1, "units": "native offset from sprite pivot and floor", "frames": anchors}
    encoded = json.dumps(result, separators=(",", ":")) + "\n"
    if args.install:
        for project in PROJECTS:
            (ROOT / f"prototypes/godot-{project}/loading/ground_contacts.json").write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    print(f"Measured {len(paired)} paired frames and {len(horse)} horse frames.")


if __name__ == "__main__":
    main()
