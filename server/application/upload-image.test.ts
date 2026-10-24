import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UploadImage } from './upload-image';
import { sampleRestaurant } from '../../shared/menu';
import { ImageError, MAX_IMAGE_BYTES } from '../domain/images';
const restaurants={get:async(id:string)=>id===sampleRestaurant.id?sampleRestaurant:null,findByOwner:async()=>sampleRestaurant,save:async()=>{}};
test('ownership and upload limits are enforced before processing or storage',async()=>{
 const service=new UploadImage(restaurants,{process:async()=>{throw new Error('must not process');}},{save:async()=>{throw new Error('must not store');}});
 await assert.rejects(()=>service.execute('other-owner',sampleRestaurant.id,Buffer.from('test')),(e:unknown)=>e instanceof ImageError&&e.status===403);
 await assert.rejects(()=>service.execute(sampleRestaurant.ownerId,sampleRestaurant.id,Buffer.alloc(0)),ImageError);
 await assert.rejects(()=>service.execute(sampleRestaurant.ownerId,sampleRestaurant.id,Buffer.alloc(MAX_IMAGE_BYTES+1)),(e:unknown)=>e instanceof ImageError&&e.status===413);
});
test('only processed bytes reach storage',async()=>{
 const original=Buffer.from('original');const processed={data:Buffer.from('processed'),width:1200,height:675};
 const service=new UploadImage(restaurants,{process:async input=>{assert.equal(input,original);return processed;}},{save:async(id,image)=>{assert.equal(id,sampleRestaurant.id);assert.equal(image,processed);assert.notEqual(image.data,original);return 'https://example.com/processed.webp';}});
 const result=await service.execute(sampleRestaurant.ownerId,sampleRestaurant.id,original);
 assert.deepEqual(result,{url:'https://example.com/processed.webp',width:1200,height:675,bytes:processed.data.length});
});
