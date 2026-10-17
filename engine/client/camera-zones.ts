/** Approved modules in the global assembly. Open terraces remain exterior. */
const retreatRooms = [
  {x:80.25,z:85.5,width:7.5,depth:6},{x:90,z:82.5,width:6,depth:12},
  {x:100.5,z:84,width:9,depth:9},{x:112.5,z:83.25,width:9,depth:10.5},
  {x:122.25,z:82.5,width:4.5,depth:12},{x:132,z:83.25,width:9,depth:10.5},
  {x:160.5,z:67.5,width:3,depth:3},{x:122.25,z:61.5,width:7.5,depth:3},
  {x:117.75,z:59.25,width:1.5,depth:7.5},{x:118.5,z:57,width:3,depth:3},
  {x:102,z:60,width:12,depth:6}
];
export function dragonRestCameraCovered(x: number, z: number) {
  return retreatRooms.some(room => Math.abs(x-room.x) < room.width / 2 && Math.abs(z-room.z) < room.depth / 2);
}
