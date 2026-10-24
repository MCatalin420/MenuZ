import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { SharpImageProcessor } from './sharp-image-processor';
import { ImageError } from '../domain/images';
async function fixture(width:number,height:number){return sharp({create:{width,height,channels:3,background:'#468254'}}).jpeg().toBuffer();}
test('4K landscape is resized without cropping and stored as WebP',async()=>{
 const result=await new SharpImageProcessor().process(await fixture(3840,2160));
 assert.equal(result.width,1200);assert.equal(result.height,675);
 const meta=await sharp(result.data).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
});
test('portrait aspect ratio is retained',async()=>{
 const result=await new SharpImageProcessor().process(await fixture(2160,3840));
 assert.equal(result.width,675);assert.equal(result.height,1200);
});
test('small images are not enlarged',async()=>{
 const result=await new SharpImageProcessor().process(await fixture(320,180));
 assert.equal(result.width,320);assert.equal(result.height,180);
});
test('EXIF orientation is applied before resize and metadata is removed',async()=>{
 const input=await sharp(await fixture(1800,1200)).withMetadata({orientation:6}).jpeg().toBuffer();
 const result=await new SharpImageProcessor().process(input);
 assert.equal(result.width,800);assert.equal(result.height,1200);
 assert.equal((await sharp(result.data).metadata()).orientation,undefined);
});
test('invalid files and vector inputs are rejected',async()=>{
 const processor=new SharpImageProcessor();
 await assert.rejects(()=>processor.process(Buffer.from('not an image')),ImageError);
 await assert.rejects(()=>processor.process(Buffer.from('<svg width="10" height="10"><rect width="10" height="10"/></svg>')),ImageError);
});
test('oversized image dimensions are rejected',async()=>{
 const input=await fixture(6000,5000);
 await assert.rejects(()=>new SharpImageProcessor().process(input),ImageError);
});
