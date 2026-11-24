"""Extract a single authored cycle at its native pixel resolution."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from statistics import median

from PIL import Image


def digest(data):
    return hashlib.sha256(data).hexdigest()


root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('id', help='ID of a Stormwreck animation draft')
parser.add_argument('image', type=Path)
parser.add_argument('--reference-height', type=int)
parser.add_argument('--minimum-alpha', type=int, default=3, choices=range(3, 25),
                    metavar='3–24', help='Discard alpha below this threshold during native extraction')
args = parser.parse_args()
if not re.fullmatch(r'sw-[a-z0-9]+(?:-[a-z0-9]+)*', args.id):
    parser.error('A valid Stormwreck animation ID is required')
draft = root / 'prototypes/godot-shared/characters/drafts' / f'{args.id}.json'
definition = json.loads(draft.read_text(encoding='utf-8'))
is_pose_grid = definition.get('kind') == 'pose-grid'
if definition.get('id') != args.id or definition.get('kind') not in ('animation', 'pose-grid') or definition.get('campaign') != 'stormwreck-isle':
    parser.error('The draft must be a matching Stormwreck animation or turnaround')
if is_pose_grid:
    expected = [[action, direction] for action in ('idle', 'retreat_work') for direction in ('s', 'e', 'n', 'w')]
    if definition.get('expectedViews') != expected:
        parser.error('A turnaround must declare front/right/rear/left rest and work poses')
    definition.setdefault('production', {
        'reference': definition['reference'], 'prompt': definition['prompt'],
        'minimumVisibleStandingPixels': 260
    })
folder = root / 'campaigns/stormwreck-isle/public/art/characters/motion-detail-v1'
evidence = root / 'output/stormwreck-motion-detail'
evidence.mkdir(parents=True, exist_ok=True)
data = args.image.read_bytes()
revision = digest(data)[:12]
original = folder / 'originals' / f'{args.id}-{revision}.png'
original.parent.mkdir(parents=True, exist_ok=True)
if not original.exists():
    original.write_bytes(data)
sheet = Image.open(original).convert('RGBA')
nominal_cuts = [round(col * sheet.width / 4) for col in range(5)]
row_cuts = definition['production'].get('columnCutsByRow', [nominal_cuts, nominal_cuts])
if len(row_cuts) != 2 or any(
    len(cuts) != 5 or cuts[0] != 0 or cuts[-1] != sheet.width
    or any(type(x) is not int for x in cuts)
    or any(left >= right for left, right in zip(cuts, cuts[1:]))
    or any(abs(x - nominal) > sheet.width * .025 for x, nominal in zip(cuts, nominal_cuts))
    for cuts in row_cuts
):
    parser.error('Column cuts must describe two complete rows near the authored grid')
frames = []
bounds = []
horizontal_pivots = []
stationary = is_pose_grid or definition['action'].startswith('retreat_')
errors = []
for index in range(8):
    col, row = index % 4, index // 4
    box = (row_cuts[row][col], round(row * sheet.height / 2),
           row_cuts[row][col + 1], round((row + 1) * sheet.height / 2))
    cell = sheet.crop(box)
    alpha = cell.getchannel('A')
    body = alpha.point(lambda a: 255 if a >= 24 else 0).getbbox()
    if not body:
        errors.append(f'Empty cell {index + 1}')
        continue
    if min(body[0], body[1], cell.width - body[2], cell.height - body[3]) < 2:
        errors.append(f'Cell {index + 1} has opaque pixels inside the required safety margin')
    if body[3] - body[1] < definition['production']['minimumVisibleStandingPixels']:
        errors.append(f'Cell {index + 1} has insufficient native detail')
    # Clear faint RGB/alpha outside the silhouette's edge padding. Within it,
    # preserve anti-aliasing and the original illustration at full resolution.
    padded = (max(0, body[0] - 2), max(0, body[1] - 2),
              min(cell.width, body[2] + 2), min(cell.height, body[3] + 2))
    bounded_alpha = Image.new('L', cell.size)
    bounded_alpha.paste(alpha.crop(padded).point(lambda a: a if a >= args.minimum_alpha else 0), padded[:2])
    cell.putalpha(bounded_alpha)
    clean = Image.new('RGBA', cell.size)
    clean.paste(cell, mask=cell.getchannel('A').point(lambda a: 255 if a else 0))
    frames.append(clean)
    bounds.append(body)
    if stationary:
        # Register the sole pair rather than the hands and tail moving above it.
        lower = body[3] - max(8, round((body[3] - body[1]) * .045))
        feet = alpha.crop((0, lower, cell.width, body[3])).point(lambda a: 255 if a >= 32 else 0).getbbox()
        horizontal_pivots.append(round((feet[0] + feet[2]) / 2))
    else:
        horizontal_pivots.append(round((nominal_cuts[col] + nominal_cuts[col + 1]) / 2) - box[0])

hashes = [digest(im.tobytes()) for im in frames]
if len(set(hashes)) != 8:
    errors.append('Expected eight distinct, nonempty frames')
report_path = evidence / f'{args.id}-{revision}.json'
report = {
    'id': args.id, 'source': original.relative_to(root).as_posix(), 'sourceSha256': digest(data),
    'size': sheet.size, 'grid': [4, 2], 'columnCutsByRow': row_cuts, 'cellBounds': bounds,
    'visibleHeights': [b[3] - b[1] for b in bounds], 'distinctPhases': len(set(hashes)),
    'errors': errors, 'minimumAlpha': args.minimum_alpha,
    'operation': 'Native-size cell extraction, faint alpha removed and common registration. No resizing.',
}
if not errors:
    target = folder / args.id / revision
    target.mkdir(parents=True, exist_ok=True)
    ground = definition['action'] == 'walk' or stationary
    common_base = round(median(b[3] for b in bounds))
    calibration = bounds[:4] if is_pose_grid else bounds
    reference = args.reference_height or round(median(b[3] - b[1] for b in calibration))
    vertical_offsets = [common_base - body[3] if ground else 0 for body in bounds]
    top = min(0, min(vertical_offsets))
    bottom = max(im.height + offset for im, offset in zip(frames, vertical_offsets))
    height = bottom - top + 12
    half_width = max(max(pivot, im.width - pivot) for im, pivot in zip(frames, horizontal_pivots)) + 6
    width = half_width * 2
    paths = []
    pivot = [0.5, (common_base + 6 - top) / height]
    for index, (im, offset) in enumerate(zip(frames, vertical_offsets)):
        # Gait and stationary gestures share the sole line. Flight keeps its authored
        # vertical motion within each cell and uses a common virtual baseline.
        y = 6 + offset - top
        canvas = Image.new('RGBA', (width, height))
        canvas.paste(im, (half_width - horizontal_pivots[index], y))
        path = target / f'{index + 1:02}.png'
        if is_pose_grid or definition['action'] == 'walk' and definition['direction'] in ('n', 's'):
            # Strip unused gutters at native resolution while retaining the
            # authored scale and registration of the body.
            used = canvas.getbbox()
            crop = (max(0, used[0] - 4), max(0, used[1] - 4),
                    min(width, used[2] + 4), min(height, used[3] + 4))
            cropped = canvas.crop(crop)
            cell_pivot = [(half_width - crop[0]) / cropped.width,
                          (common_base + 6 - top - crop[1]) / cropped.height]
            canvas = cropped
        else:
            cell_pivot = pivot
        canvas.save(path)
        relative_path = path.relative_to(root).as_posix()
        paths.append(relative_path if cell_pivot == pivot else {'file': relative_path, 'pivot': cell_pivot})
    definition.update(frames=paths, referenceHeight=reference, pivot=pivot)
    definition['production'].update(original=report['source'], originalSha256=report['sourceSha256'],
                                    importReport=report_path.relative_to(root).as_posix(),
                                    minimumAlpha=args.minimum_alpha)
    if is_pose_grid:
        pose_ids = []
        for index, (action, direction) in enumerate(definition['expectedViews']):
            state = 'retreat_stance' if action == 'idle' else action
            pose_id = f"{definition['character']}-{state.replace('_', '-')}-{direction}"
            pose = {
                'version': 1, 'kind': 'animation', 'id': pose_id,
                'character': definition['character'], 'campaign': definition['campaign'],
                'anatomy': definition['anatomy'], 'action': state, 'direction': direction,
                'fps': 1, 'loop': False, 'dependencies': [definition['character']],
                'compatibility': {
                    'preservesAppearance': True, 'embeddedSlotsRetained': True,
                    'overlay': 'current frame alpha', 'placement': 'directional held pose with planted feet'
                },
                'frames': [paths[index]], 'referenceHeight': reference, 'pivot': pivot,
                'production': {**definition['production'], 'method': 'ImageGen turnaround with native-size cell extraction',
                               'heldPose': True, 'cell': index + 1, 'sourcePages': [8, 9, 10, 11]},
                'review': {'technical': 'Native detail and cell clearance verified',
                           'visual': 'pending', 'userAcceptance': 'pending'}
            }
            (draft.parent / f'{pose_id}.json').write_text(json.dumps(pose, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
            pose_ids.append(pose_id)
        report['poseIds'] = pose_ids
    else:
        definition['review']['technical'] = 'Native detail, cell clearance and distinct PNG phases verified'
        draft.write_text(json.dumps(definition, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    report.update(referenceHeight=reference, framePaths=paths, pivot=definition['pivot'])
report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=True))
raise SystemExit(bool(errors))
