import os
import sys
from collections import deque
import bpy
import numpy as np

def process_zombie(input_path, output_png_path, backup_png_path):
    print(f"Processing {input_path} -> {output_png_path}")
    img = bpy.data.images.load(input_path)
    w, h = img.size
    
    # img.pixels is bottom-to-top RGBA float 0..1
    raw = np.array(img.pixels).reshape((h, w, 4))
    
    # We work on RGB in 0..255 for clean integer math
    rgb = np.clip(raw[:, :, :3] * 255.0, 0, 255).astype(np.uint8)
    
    # Define what is considered a "background" white pixel:
    # High brightness and low color saturation/chroma
    r = rgb[:, :, 0].astype(np.int32)
    g = rgb[:, :, 1].astype(np.int32)
    b = rgb[:, :, 2].astype(np.int32)
    
    brightness = (r + g + b) // 3
    spread = np.maximum(np.maximum(np.abs(r - g), np.abs(g - b)), np.abs(r - b))
    
    # Core background criteria
    is_bg_candidate = (brightness >= 242) & (spread <= 14)
    # Also near-edge soft background criteria for antialiasing
    is_fringe_candidate = (brightness >= 228) & (spread <= 18)
    
    # Flood-fill from borders
    is_background = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Seed all border pixels that match background candidate
    for x in range(w):
        if is_bg_candidate[0, x]:
            is_background[0, x] = True
            queue.append((0, x))
        if is_bg_candidate[h - 1, x]:
            is_background[h - 1, x] = True
            queue.append((h - 1, x))
            
    for y in range(h):
        if is_bg_candidate[y, 0] and not is_background[y, 0]:
            is_background[y, 0] = True
            queue.append((y, 0))
        if is_bg_candidate[y, w - 1] and not is_background[y, w - 1]:
            is_background[y, w - 1] = True
            queue.append((y, w - 1))
            
    while queue:
        cy, cx = queue.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w:
                if not is_background[ny, nx] and is_bg_candidate[ny, nx]:
                    is_background[ny, nx] = True
                    queue.append((ny, nx))

    # Second pass: fringe pixels adjacent to background
    # Expand slightly into fringe to remove white halos smoothly
    fringe_queue = deque()
    is_fringe = np.zeros((h, w), dtype=bool)
    for y in range(h):
        for x in range(w):
            if is_background[y, x]:
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and not is_background[ny, nx] and is_fringe_candidate[ny, nx]:
                        if not is_fringe[ny, nx]:
                            is_fringe[ny, nx] = True
                            fringe_queue.append((ny, nx))
                            
    while fringe_queue:
        cy, cx = fringe_queue.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w:
                if not is_background[ny, nx] and not is_fringe[ny, nx] and is_fringe_candidate[ny, nx]:
                    is_fringe[ny, nx] = True
                    fringe_queue.append((ny, nx))

    # Compute final alpha (0..1 float)
    alpha = np.ones((h, w), dtype=np.float32)
    alpha[is_background] = 0.0
    
    # Smooth alpha for fringe pixels based on brightness
    # brightness 228 -> alpha 1.0, brightness 255 -> alpha 0.0
    fringe_mask = is_fringe & ~is_background
    if np.any(fringe_mask):
        f_bright = brightness[fringe_mask].astype(np.float32)
        f_alpha = np.clip((255.0 - f_bright) / (255.0 - 228.0), 0.0, 1.0)
        alpha[fringe_mask] = f_alpha
        
        # Defringe RGB on fringe pixels to avoid light halo
        for c in range(3):
            chan = raw[:, :, c]
            # Replace white bleed with darker underlying hue
            chan[fringe_mask] = np.clip(chan[fringe_mask] * (1.0 - (1.0 - f_alpha) * 0.6), 0.0, 1.0)
            raw[:, :, c] = chan

    raw[:, :, 3] = alpha
    
    # Save output using Blender
    out_img = bpy.data.images.new(f"out_{os.path.basename(output_png_path)}", width=w, height=h, alpha=True)
    out_img.pixels = raw.ravel().tolist()
    
    os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
    out_img.filepath_raw = output_png_path
    out_img.file_format = 'PNG'
    out_img.save()
    print(f"Saved: {output_png_path}")
    
    if backup_png_path:
        os.makedirs(os.path.dirname(backup_png_path), exist_ok=True)
        out_img.filepath_raw = backup_png_path
        out_img.save()
        print(f"Saved backup: {backup_png_path}")
        
    bpy.data.images.remove(img)
    bpy.data.images.remove(out_img)

if __name__ == "__main__":
    targets = [
        (
            r"C:\Users\User\.gemini\antigravity\brain\f7d21d92-1d21-4bd4-9e56-3c091adad063\zombie2_base_1794251270227.jpg",
            r"C:\Users\User\Desktop\Dungeons\campaigns\stormwreck-isle\public\art\m3\zombie\zombie2_base.png",
            r"C:\Users\User\Desktop\Dungeons\Imagenes VTT\DnD VTT\Zombie 2\zombie2_base.png"
        ),
        (
            r"C:\Users\User\.gemini\antigravity\brain\f7d21d92-1d21-4bd4-9e56-3c091adad063\zombie3_base_1794251300244.jpg",
            r"C:\Users\User\Desktop\Dungeons\campaigns\stormwreck-isle\public\art\m3\zombie\zombie3_base.png",
            r"C:\Users\User\Desktop\Dungeons\Imagenes VTT\DnD VTT\Zombie 3\zombie3_base.png"
        ),
        (
            r"C:\Users\User\.gemini\antigravity\brain\f7d21d92-1d21-4bd4-9e56-3c091adad063\zombie4_base_1794251319407.jpg",
            r"C:\Users\User\Desktop\Dungeons\campaigns\stormwreck-isle\public\art\m3\zombie\zombie4_base.png",
            r"C:\Users\User\Desktop\Dungeons\Imagenes VTT\DnD VTT\Zombie 4\zombie4_base.png"
        )
    ]
    
    for in_p, out_p, bak_p in targets:
        process_zombie(in_p, out_p, bak_p)
    print("ALL DONE")
