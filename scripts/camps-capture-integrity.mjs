import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import path from 'node:path';

const folder=path.resolve(process.env.CAMPS_REVIEW_OUTPUT??'output/camps-final');
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const files=(await readdir(folder)).filter(f=>/^(before|after|weather|polish|climate)-.+\.png$/.test(f)),report=[];
for(const file of files){
 const data=await readFile(path.join(folder,file));assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file);
 const idat=[];let width,height,channels,ended=false;
 for(let offset=8;offset<data.length;){
  const size=data.readUInt32BE(offset),end=offset+12+size;assert.ok(end<=data.length,file+' truncated chunk');
  const type=data.subarray(offset+4,offset+8).toString('ascii'),body=data.subarray(offset+8,offset+8+size);
  assert.equal(crc32(data.subarray(offset+4,offset+8+size)),data.readUInt32BE(offset+8+size),file+' CRC '+type);
  if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);assert.equal(body[8],8,file+' bit depth');assert.equal(body[12],0,file+' interlace');channels={2:3,6:4}[body[9]];assert.ok(channels,file+' colour type');}
  if(type==='IDAT')idat.push(body);
  if(type==='IEND'){ended=true;assert.equal(end,data.length,file+' trailing bytes');}
  offset=end;
 }
 assert.ok(ended&&width&&height,file+' missing header/end');
 assert.equal(inflateSync(Buffer.concat(idat)).length,(width*channels+1)*height,file+' pixel rows');
 report.push({file,width,height,bytes:data.length,crc:true,pixels:true,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(path.join(folder,'capture-integrity.json'),JSON.stringify({count:report.length,files:report},null,2));
console.log(report.length+' capturas PNG íntegras.');
