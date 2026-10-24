import type { RestaurantRepository } from '../domain/repository';
import { ImageError, MAX_IMAGE_BYTES, type ImageProcessor, type ImageStore } from '../domain/images';

export class UploadImage {
 constructor(private restaurants:RestaurantRepository,private processor:ImageProcessor,private store:ImageStore){}
 async execute(ownerId:string,restaurantId:string,input:Buffer){
  const restaurant=await this.restaurants.get(restaurantId);
  if(!restaurant||restaurant.ownerId!==ownerId)throw new ImageError('You do not own this restaurant.',403);
  if(!input.length)throw new ImageError('Choose an image to upload.');
  if(input.length>MAX_IMAGE_BYTES)throw new ImageError('Choose an image smaller than 10 MB.',413);
  const image=await this.processor.process(input);
  const url=await this.store.save(restaurantId,image);
  return {url,width:image.width,height:image.height,bytes:image.data.length};
 }
}
