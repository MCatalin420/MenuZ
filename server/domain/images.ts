export interface ProcessedImage { data:Buffer; width:number; height:number; }
export interface ImageProcessor { process(input:Buffer):Promise<ProcessedImage>; }
export interface ImageStore { save(restaurantId:string,image:ProcessedImage):Promise<string>; }
export class ImageError extends Error {
 constructor(message:string,public status=400){super(message);}
}
export const MAX_IMAGE_BYTES=10*1024*1024;
