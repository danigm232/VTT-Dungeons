/** Choose a stable page size before clamping the selected page. */
export function radialRadiusLimit(width: number, height: number) {
  // A side fan can use the long axis; fitting still checks every node and label.
  // Limiting to half of the shortest axis needlessly reduced an eight-action fan.
  return Math.min(360, Math.max(width, height) * .48);
}

export function radialPagination(total:number,maximum:number,requestedPage:number,fits:(start:number,count:number,pages:number)=>boolean){
  let capacity=Math.max(1,maximum),pages=1;
  while(true){
    pages=Math.max(1,Math.ceil(total/capacity));
    const allFit=Array.from({length:pages},(_,page)=>fits(page*capacity,Math.min(capacity,total-page*capacity),pages)).every(Boolean);
    if(allFit||capacity===1)break;
    capacity=capacity>4?4:capacity-1;
  }
  return {capacity,pages,page:Math.max(0,Math.min(requestedPage,pages-1))};
}
