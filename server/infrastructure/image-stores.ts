import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStorage } from 'firebase-admin/storage';
import type { ImageStore, ProcessedImage } from '../domain/images';
export class FirebaseImageStore implements ImageStore {
 constructor(private bucketName:string){}
 async save(restaurantId:string,image:ProcessedImage){
  const bucket=getStorage().bucket(this.bucketName);
  const objectName=`restaurants/${restaurantId}/${randomUUID()}.webp`;
  const token=randomUUID();
  await bucket.file(objectName).save(image.data,{resumable:false,metadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:token}}});
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(objectName)}?alt=media&token=${token}`;
 }
}
export class LocalImageStore implements ImageStore {
 async save(_restaurantId:string,image:ProcessedImage){
  const folder=resolve('data/uploads');await mkdir(folder,{recursive:true});
  const name=randomUUID()+'.webp';await writeFile(resolve(folder,name),image.data);
  return '/api/images/'+name;
 }
}
