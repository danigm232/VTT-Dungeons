/** Equal-face vertex normals for the coast's fixed indexed topology.
 * Same triangle order, arithmetic and Float32 accumulation as Babylon's
 * ComputeNormals default path, without its optional facet/partition branches.
 * Vertex positions may change on every axis; only the indices stay fixed. */
export function createCoastalNormalUpdater(indices:ArrayLike<number>,vertexCount:number){
 const offsets=Uint32Array.from(indices,index=>index*3),length=vertexCount*3;
 return {
  topologyBytes:offsets.byteLength,
  update(positions:Float32Array,normals:Float32Array){
   if(positions.length!==length||normals.length!==length)throw Error('Coastal normal buffer size changed');
   normals.fill(0);
   for(let face=0;face<offsets.length;face+=3){
    const a=offsets[face]!,b=offsets[face+1]!,c=offsets[face+2]!;
    const abx=positions[a]!-positions[b]!,aby=positions[a+1]!-positions[b+1]!,abz=positions[a+2]!-positions[b+2]!;
    const cbx=positions[c]!-positions[b]!,cby=positions[c+1]!-positions[b+1]!,cbz=positions[c+2]!-positions[b+2]!;
    let nx=aby*cbz-abz*cby,ny=abz*cbx-abx*cbz,nz=abx*cby-aby*cbx;
    let size=Math.sqrt(nx*nx+ny*ny+nz*nz);size=size===0?1:size;nx/=size;ny/=size;nz/=size;
    normals[a]=normals[a]!+nx;normals[a+1]=normals[a+1]!+ny;normals[a+2]=normals[a+2]!+nz;
    normals[b]=normals[b]!+nx;normals[b+1]=normals[b+1]!+ny;normals[b+2]=normals[b+2]!+nz;
    normals[c]=normals[c]!+nx;normals[c+1]=normals[c+1]!+ny;normals[c+2]=normals[c+2]!+nz;
   }
   for(let i=0;i<length;i+=3){
    let nx=normals[i]!,ny=normals[i+1]!,nz=normals[i+2]!;
    let size=Math.sqrt(nx*nx+ny*ny+nz*nz);size=size===0?1:size;nx/=size;ny/=size;nz/=size;
    normals[i]=nx;normals[i+1]=ny;normals[i+2]=nz;
   }
  }
 };
}
