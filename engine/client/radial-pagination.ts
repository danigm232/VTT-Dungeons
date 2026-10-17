/** Choose a stable page size before clamping the selected page. */
export function radialRadiusLimit(width: number, height: number) {
  // A side fan can use the long axis; fitting still checks every node and label.
  // Limiting to half of the shortest axis needlessly reduced an eight-action fan.
  return Math.min(360, Math.max(width, height) * .48);
}

export function radialPagination(total:number,maximum:number,requestedPage:number){
  // Captions and navigation must never turn a four/eight-icon wheel into
  // twenty one-icon pages. Layout adapts; page size belongs to the chosen arc.
  const capacity=Math.max(1,Math.floor(maximum)),pages=Math.max(1,Math.ceil(total/capacity));
  return {capacity,pages,page:Math.max(0,Math.min(requestedPage,pages-1))};
}
