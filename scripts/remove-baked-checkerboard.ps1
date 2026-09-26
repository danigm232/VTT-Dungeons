param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

# Turns an externally baked white/grey transparency checkerboard into real PNG
# alpha. Only neutral, bright pixels connected to the image edge are removed.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class CheckerboardTransparency {
  public static void Remove(string input, string output) {
    using (var source = new Bitmap(input)) using (var result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      int width = source.Width, height = source.Height, stride;
      var rect = new Rectangle(0, 0, width, height);
      var sourceData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      byte[] pixels;
      try { stride = sourceData.Stride; pixels = new byte[stride * height]; Marshal.Copy(sourceData.Scan0, pixels, 0, pixels.Length); }
      finally { source.UnlockBits(sourceData); }
      var background = new bool[width * height]; var seen = new bool[width * height]; var queue = new Queue<int>();
      Action<int, int> visit = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        int index = y * width + x; if (seen[index]) return; seen[index] = true;
        int offset = y * stride + x * 4; byte b = pixels[offset], g = pixels[offset + 1], r = pixels[offset + 2];
        int max = Math.Max(r, Math.Max(g, b)), min = Math.Min(r, Math.Min(g, b));
        if (max - min <= 24 && max >= 72) { background[index] = true; queue.Enqueue(index); }
      };
      for (int x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
      for (int y = 1; y < height - 1; y++) { visit(0, y); visit(width - 1, y); }
      while (queue.Count > 0) { int index = queue.Dequeue(), x = index % width, y = index / width; visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1); }
      for (int index = 0; index < background.Length; index++) if (background[index]) pixels[(index / width) * stride + (index % width) * 4 + 3] = 0;
      var resultData = result.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      try { Marshal.Copy(pixels, 0, resultData.Scan0, pixels.Length); } finally { result.UnlockBits(resultData); }
      result.Save(output, ImageFormat.Png);
    }
  }
}
'@
[CheckerboardTransparency]::Remove((Resolve-Path -LiteralPath $InputPath), $OutputPath)
