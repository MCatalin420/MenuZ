import sharp from 'sharp';
import { ImageError, type ImageProcessor } from '../domain/images';

// Bound native memory usage; permit one image transformation per server instance.
sharp.cache({memory:16,files:0,items:20});
sharp.concurrency(1);
export class SharpImageProcessor implements ImageProcessor {
 private busy=false;
 async process(input:Buffer){
  if(this.busy)throw new ImageError('Another photo is being processed. Please try again in a moment.',429);
  this.busy=true;
  try{
   const pipeline=sharp(input,{limitInputPixels:25_000_000,failOn:'warning'});
   const meta=await pipeline.metadata();
   if(!meta.format||!['jpeg','png','webp'].includes(meta.format)||(meta.pages??1)>1)
    throw new ImageError('Choose a single-frame JPEG, PNG, or WebP image.');
   const {data,info}=await pipeline.rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer({resolveWithObject:true});
   return {data,width:info.width,height:info.height};
  }catch(e){if(e instanceof ImageError)throw e;throw new ImageError('Unable to read this image. Use a valid JPEG, PNG, or WebP image up to 25 megapixels.');}
  finally{this.busy=false;}
 }
}
