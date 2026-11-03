/** Transparent padding is not part of an actor's physical height or feet. */
export function alphaGrounding(rgba: ArrayLike<number>, width: number, height: number) {
  const rect=alphaVisibleRect(rgba,width,height);
  return {anchorY:rect.bottom,heightFraction:rect.bottom-rect.top};
}

/** The camera must contain the painted actor, including outstretched arms,
 * rather than treating transparent atlas padding as part of the body. */
export function alphaVisibleRect(rgba:ArrayLike<number>,width:number,height:number) {
  let top=height,bottom=-1,left=width,right=-1;
  const minimum = Math.max(2, Math.ceil(width * .002));
  for (let y = 0; y < height; y++) {
    let count=0,rowLeft=width,rowRight=-1;
    for(let x=0;x<width;x++)if((rgba[(y*width+x)*4+3]??0)>=32){count++;rowLeft=Math.min(rowLeft,x);rowRight=x;}
    if(count>=minimum){top=Math.min(top,y);bottom=y;left=Math.min(left,rowLeft);right=Math.max(right,rowRight);}
  }
  return bottom<top?{left:0,top:0,right:1,bottom:1}:{left:left/width,top:top/height,right:(right+1)/width,bottom:(bottom+1)/height};
}

/** A close view changes the camera, never the size of characters in metres. */
export function actorDetailZoom(currentZoom: number, halfHeight: number, viewportHeight: number, actorHeight: number, beta: number) {
  const projectedPixels = actorHeight * Math.sin(beta) * viewportHeight / (2 * halfHeight);
  const targetPixels = Math.min(150, Math.max(90, viewportHeight * .24));
  return Math.max(.4, Math.min(24, currentZoom * targetPixels / Math.max(1, projectedPixels)));
}
