import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import express from 'express';
import sharp from 'sharp';
import { createApp } from '../app';
for(const cloudParsed of [false,true])test(`upload HTTP flow (${cloudParsed?'Cloud Functions pre-parsed body':'local raw body'})`,async()=>{
 const cwd=process.cwd();const folder=await mkdtemp(join(tmpdir(),'menuz-images-'));process.chdir(folder);
 const host=express();
 if(cloudParsed){host.use(express.raw({type:'application/octet-stream',limit:'11mb'}));host.use((req,_res,next)=>{(req as express.Request & {rawBody?:Buffer}).rawBody=req.body;req.body={};next();});}
 host.use(await createApp({mode:'demo'}));
 const server=host.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 try{
  const address=server.address();if(!address||typeof address==='string')throw new Error('No server address');
  const base=`http://127.0.0.1:${address.port}`;const endpoint=base+'/api/owner/restaurants/olive-and-thyme/images';
  const input=await sharp({create:{width:1600,height:900,channels:3,background:'#85976a'}}).jpeg().toBuffer();
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:input});
  assert.equal(response.status,201);const result=await response.json() as {url:string;width:number;height:number};assert.equal(result.width,1200);assert.equal(result.height,675);
  const saved=await fetch(base+result.url);assert.equal(saved.headers.get('content-type'),'image/webp');assert.equal((await sharp(Buffer.from(await saved.arrayBuffer())).metadata()).format,'webp');
  const invalid=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:'invalid'});assert.equal(invalid.status,400);
  const unknown=await fetch(base+'/api/owner/restaurants/not-owned/images',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:input});assert.equal(unknown.status,403);
  const tooBig=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:Buffer.alloc(10*1024*1024+1)});assert.equal(tooBig.status,413);
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));process.chdir(cwd);
  if(resolve(dirname(folder))!==resolve(tmpdir())||!basename(folder).startsWith('menuz-images-'))throw new Error('Unexpected temporary directory');
  await rm(folder,{recursive:true,force:true});
 }
});
