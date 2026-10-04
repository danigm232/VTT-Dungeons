param([Parameter(Mandatory=$true)][string]$Path, [int]$Rows = 6)
$ErrorActionPreference = 'Stop'
# Read-only atlas inspection: preserve the PNG, derive alpha bounds and feet anchors.
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
public static class D8AtlasBounds {
  public static int[][] Components(byte[] bytes,int width,int height,int stride) {
    var visited=new bool[width*height];var queue=new int[width*height];var result=new List<int[]>();
    for(int seed=0;seed<visited.Length;seed++) {
      if(visited[seed]||bytes[(seed/width)*Math.Abs(stride)+(seed%width)*4+3]<32)continue;
      int head=0,tail=1;queue[0]=seed;visited[seed]=true;
      int left=width,right=0,top=height,bottom=0,count=0;
      while(head<tail) {
        int index=queue[head++],x=index%width,y=index/width;count++;
        left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);
        for(int d=0;d<4;d++) { int nx=x+(d==0?1:d==1?-1:0),ny=y+(d==2?1:d==3?-1:0);
          if(nx<0||nx>=width||ny<0||ny>=height)continue;int next=ny*width+nx;
          if(visited[next]||bytes[ny*Math.Abs(stride)+nx*4+3]<32)continue;visited[next]=true;queue[tail++]=next;
        }
      }
      if(count>500)result.Add(new int[]{left,top,right-left+1,bottom-top+1,count});
    }
    return result.ToArray();
  }
  public static int[][] Read(byte[] bytes, int width, int height, int stride, int rows) {
        var result = new int[rows * 4][];
        for(int row=0;row<rows;row++) for(int col=0;col<4;col++) {
          int x0=col*width/4,x1=(col+1)*width/4,y0=row*height/rows,y1=(row+1)*height/rows;
          int top=y1,bottom=y0,count=0,edge=0;
          for(int y=y0;y<y1;y++) for(int x=x0;x<x1;x++) {
            if(bytes[y*Math.Abs(stride)+x*4+3] < 32) continue;
            top=Math.Min(top,y);bottom=Math.Max(bottom,y);count++;
            if(x==x0||x==x1-1||y==y0||y==y1-1)edge++;
          }
          result[row*4+col]=new int[]{x0,top,x1-x0,Math.Max(0,bottom-top+1),count,edge};
        }
        return result;
  }
}
'@
$taskBitmap = [System.Drawing.Bitmap]::new($Path)
$taskWidth = $taskBitmap.Width; $taskHeight = $taskBitmap.Height
$taskCorner = $taskBitmap.GetPixel(0,0).A
$taskRect = [System.Drawing.Rectangle]::new(0, 0, $taskWidth, $taskHeight)
$taskBits = $taskBitmap.LockBits($taskRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$taskBytes = [byte[]]::new([Math]::Abs($taskBits.Stride) * $taskHeight)
[System.Runtime.InteropServices.Marshal]::Copy($taskBits.Scan0, $taskBytes, 0, $taskBytes.Length)
$taskStride = $taskBits.Stride
$taskBitmap.UnlockBits($taskBits); $taskBitmap.Dispose()
$taskBounds = [D8AtlasBounds]::Read($taskBytes, $taskWidth, $taskHeight, $taskStride, $Rows)
$taskComponents = [D8AtlasBounds]::Components($taskBytes, $taskWidth, $taskHeight, $taskStride)
$taskReference = ($taskBounds[0..3] | ForEach-Object { $_[3] } | Sort-Object)[2]
[pscustomobject]@{width=$taskWidth;height=$taskHeight;rows=$Rows;cornerAlpha=$taskCorner;referenceHeight=$taskReference;components=@($taskComponents | ForEach-Object { [pscustomobject]@{x=$_[0];y=$_[1];width=$_[2];height=$_[3];opaquePixels=$_[4]} });frames=@($taskBounds | ForEach-Object { [pscustomobject]@{x=$_[0];y=$_[1];width=$_[2];height=$_[3];opaquePixels=$_[4];edgePixels=$_[5]} })} | ConvertTo-Json -Depth 5 -Compress
