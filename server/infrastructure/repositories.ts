import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getFirestore } from 'firebase-admin/firestore';
import type { RestaurantRepository } from '../domain/repository';
import { sampleRestaurant, type Restaurant } from '../../shared/menu';
export class DemoRepository implements RestaurantRepository {
 private data=new Map<string,Restaurant>();private file=resolve('data/demo.json');
 async initialize(){try {for(const r of JSON.parse(await readFile(this.file,'utf8')))this.data.set(r.id,r);}catch(e:any){if(e.code!=='ENOENT')throw e;this.data.set(sampleRestaurant.id,structuredClone(sampleRestaurant));}}
 async get(id:string){return structuredClone(this.data.get(id)??null);}
 async findByOwner(owner:string){return structuredClone([...this.data.values()].find(r=>r.ownerId===owner)??null);}
 private pending:Promise<void>=Promise.resolve();
 async save(r:Restaurant){this.data.set(r.id,structuredClone(r));const snapshot=JSON.stringify([...this.data.values()]);this.pending=this.pending.catch(()=>{}).then(async()=>{await mkdir(resolve('data'),{recursive:true});await writeFile(this.file+'.tmp',snapshot);await rename(this.file+'.tmp',this.file);});await this.pending;}
}
export class FirestoreRepository implements RestaurantRepository {
 private collection=getFirestore().collection('restaurants');
 async get(id:string){const doc=await this.collection.doc(id).get();return doc.exists?doc.data() as Restaurant:null;}
 async findByOwner(ownerId:string){const docs=await this.collection.where('ownerId','==',ownerId).limit(1).get();return docs.empty?null:docs.docs[0].data() as Restaurant;}
 async save(r:Restaurant){await this.collection.doc(r.id).set(r);}
}
