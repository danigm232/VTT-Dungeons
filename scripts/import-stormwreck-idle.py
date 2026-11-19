"""Deterministic atlas extraction and registration. Never repaint generated art."""
from pathlib import Path
import argparse, json, hashlib, shutil, statistics
from PIL import Image, ImageChops, ImageStat

parser = argparse.ArgumentParser()
parser.add_argument('--id', required=True)
parser.add_argument('--file', required=True)
parser.add_argument('--prompt-file', required=True)
parser.add_argument('--draft')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
key = args.id.removeprefix('sw-')
if not key.replace('-', '').isalnum():
    raise SystemExit('Invalid resource id')
draft = root / args.draft if args.draft else root / 'prototypes/godot-shared/characters/drafts' / ('sw-' + key + '.json')
definition = json.loads(draft.read_text(encoding='utf-8'))
folder = root / 'campaigns/stormwreck-isle/public/art/characters/base-v1'
original = folder / 'originals' / (key + '-idle8.png')
original.parent.mkdir(parents=True, exist_ok=True)
if original.exists() and hashlib.sha256(original.read_bytes()).digest() != hashlib.sha256(Path(args.file).read_bytes()).digest():
    original = folder / 'originals' / (key + '-idle8-' + hashlib.sha256(Path(args.file).read_bytes()).hexdigest()[:10] + '.png')
shutil.copyfile(args.file, original)
sheet = Image.open(original).convert('RGBA')
frames, boxes, errors, warnings = [], [], [], []
for index in range(8):
    column, row = index % 4, index // 4
    region = (round(column * sheet.width / 4), round(row * sheet.height / 2), round((column + 1) * sheet.width / 4), round((row + 1) * sheet.height / 2))
    cell = sheet.crop(region)
    alpha = cell.getchannel('A')
    alpha = alpha.point(lambda value: 0 if value <= 2 else value)
    cell.putalpha(alpha)
    # Invisible RGB can contain an unrelated vignette. Clear RGB only where
    # alpha is zero; visible painted pixels remain unchanged.
    clean = Image.new('RGBA', cell.size, (0, 0, 0, 0))
    clean.paste(cell, (0, 0), alpha.point(lambda value: 255 if value > 0 else 0))
    mask = alpha.point(lambda value: 255 if value >= 24 else 0)
    bounds = mask.getbbox()
    if not bounds:
        errors.append(f'Empty phase {index + 1}')
        continue
    if min(bounds[0], bounds[1], cell.width - bounds[2], cell.height - bounds[3]) < 3:
        errors.append(f'Phase {index + 1} reaches a cell edge: unsafe neighbour crop')
    frames.append(clean)
    boxes.append(bounds)
if len(frames) != 8:
    raise SystemExit('Eight nonempty phases are required: ' + str(errors))
heights = [box[3] - box[1] for box in boxes]
if max(heights) / min(heights) > 1.12:
    envelope = definition.get('production', {}).get('envelopeReview', {})
    if definition['anatomy'] == 'winged-insect' and envelope.get('cause') == 'authored-wingbeat' and max(heights) / min(heights) < 1.35:
        warnings.append('Reviewed wingbeat changes the wing envelope, not body stature; common canvas and fixed body scale preserved')
    else:
        errors.append('Standing height varies by more than 12%; reject body/scale drift')
baseline = round(statistics.median(box[3] for box in boxes))
registered, offsets = [], []
for image, box in zip(frames, boxes):
    dy = baseline - box[3]
    if abs(dy) > image.height * .04:
        errors.append('Excessive registration drift: a base pose appears to change scale or move')
    aligned = Image.new('RGBA', image.size, (0, 0, 0, 0))
    aligned.paste(image, (0, dy))
    registered.append(aligned)
    offsets.append(dy)
used = [image.getchannel('A').point(lambda a: 255 if a >= 24 else 0).getbbox() for image in registered]
padding = 10
common = (max(0, min(b[0] for b in used) - padding), max(0, min(b[1] for b in used) - padding), min(registered[0].width, max(b[2] for b in used) + padding), min(registered[0].height, max(b[3] for b in used) + padding))
derived = [image.crop(common) for image in registered]
pixel_hashes = [hashlib.sha256(image.tobytes()).hexdigest() for image in derived]
if len(set(pixel_hashes)) != 8:
    errors.append('The idle does not contain eight distinct image phases')
differences = []
for i in range(8):
    stat = ImageStat.Stat(ImageChops.difference(derived[i], derived[(i + 1) % 8]))
    differences.append(round(sum(stat.mean[:3]) / 3, 5))
if min(differences) < .05:
    warnings.append('At least two successive phases are extremely similar; inspect the actual loop')
report = {'id': 'sw-' + key, 'source': str(original.relative_to(root)).replace('\\', '/'), 'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'size': list(sheet.size), 'grid': [4, 2], 'frames': 8, 'distinctPhases': len(set(pixel_hashes)), 'cellBounds': boxes, 'standingHeightRange': [min(heights), max(heights)], 'registrationY': offsets, 'commonCrop': common, 'phaseDifferences': differences, 'errors': errors, 'warnings': warnings, 'passed': not errors, 'operation': 'Fixed grid extraction; alpha<=2/255 matte cleanup; invisible RGB cleanup; translation-only sole registration; shared canvas/pivot; no per-phase resizing or repainting', 'artisticAcceptance': 'pending visual loop review; not inferred from this report'}
report['id'] = definition['id']
evidence = root / 'output/stormwreck-characters-20261117/imports'
evidence.mkdir(parents=True, exist_ok=True)
(evidence / (key + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
if errors:
    print(json.dumps(report, ensure_ascii=True))
    raise SystemExit(1)
target = folder / key
target.mkdir(parents=True, exist_ok=True)
files = []
for i, image in enumerate(derived):
    path = target / f'idle-{i + 1:02}.png'
    image.save(path)
    files.append(str(path.relative_to(root)).replace('\\', '/'))
shutil.copyfile(target / 'idle-01.png', folder / (key + '.png'))
if definition['kind'] == 'animation':
    definition.update({'frames': files, 'fps': 2.5, 'loop': True, 'referenceHeight': heights[0], 'pivot': [.5, (baseline - common[1]) / derived[0].height]})
else:
    definition['source'].update({'files': files, 'fps': 2.5, 'animation': 'idle', 'directions': ['se'], 'minimumDistinctFrames': 8, 'preserveCanvas': True, 'referenceHeightPixels': heights[0], 'pivot': [.5, (baseline - common[1]) / derived[0].height]})
definition['production'].update({'stage': 'generated-and-technically-extracted', 'promptFile': args.prompt_file, 'original': str(original.relative_to(root)).replace('\\', '/'), 'originalSha256': report['sourceSha256'], 'importReport': str((evidence / (key + '.json')).relative_to(root)).replace('\\', '/')})
definition['review']['technical'] = 'atlas-extraction-passed; native test pending'
draft.write_text(json.dumps(definition, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'id': definition['id'], 'frames': len(files), 'distinct': len(set(pixel_hashes)), 'errors': errors, 'warnings': warnings, 'draft': str(draft), 'base': str(folder / (key + '.png'))}, ensure_ascii=True))
