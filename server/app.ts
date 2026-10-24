import express from 'express';
import { applicationDefault, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import { MenuService } from './application/menu-service';
import { DemoRepository, FirestoreRepository } from './infrastructure/repositories';
import { UploadImage } from './application/upload-image';
import { ImageError, MAX_IMAGE_BYTES } from './domain/images';
import { SharpImageProcessor } from './infrastructure/sharp-image-processor';
import { FirebaseImageStore, LocalImageStore } from './infrastructure/image-stores';
import { resolve } from 'node:path';
export interface ApiOptions { mode?:string; projectId?:string; apiKey?:string; authDomain?:string; storageBucket?:string; }
export async function createApp(options:ApiOptions={}) {
const mode=options.mode??process.env.APP_MODE??'demo';
if(!['demo','firebase'].includes(mode))throw new Error('APP_MODE must be demo or firebase');
if(process.env.NODE_ENV==='production'&&mode==='demo')throw new Error('Demo mode is disabled in production');
if(mode==='firebase'&&!getApps().length)initializeApp({credential:applicationDefault(),projectId:options.projectId??process.env.FIREBASE_PROJECT_ID});
const repo=mode==='firebase'?new FirestoreRepository():new DemoRepository();
if(repo instanceof DemoRepository)await repo.initialize();
const service=new MenuService(repo);const app=express();app.disable('x-powered-by');app.use(express.json({limit:'1mb'}));
app.use((_req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
app.get('/api/config',(_req,res)=>res.json({mode,firebase:{apiKey:options.apiKey??process.env.FIREBASE_API_KEY,authDomain:options.authDomain??process.env.FIREBASE_AUTH_DOMAIN,projectId:options.projectId??process.env.FIREBASE_PROJECT_ID}}));
app.get('/api/menus/:id',async(req,res,next)=>{try {const menu=await service.publicMenu(req.params.id);if(!menu){res.status(404).json({error:'This menu is not published yet.'});return;}res.json(menu);}catch(e){next(e);}});
if(mode==='demo')app.use('/api/images',express.static(resolve('data/uploads'),{dotfiles:'deny',index:false}));
app.use('/api/owner',async(req,res,next)=>{if(mode==='demo'){res.locals.uid='demo-owner';next();return;}try{const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw new Error();res.locals.uid=(await getAuth().verifyIdToken(token,true)).uid;next();}catch{res.status(401).json({error:'Please sign in to continue.'});}});
const bucket=options.storageBucket??process.env.FIREBASE_STORAGE_BUCKET;
const uploads=new UploadImage(repo,new SharpImageProcessor(),mode==='firebase'?new FirebaseImageStore(bucket??''):new LocalImageStore());
app.post('/api/owner/restaurants/:id/images',express.raw({type:'application/octet-stream',limit:MAX_IMAGE_BYTES}),async(req,res,next)=>{
 try{
  if(mode==='firebase'&&!bucket)throw new ImageError('Image uploads are not configured. Set the Firebase Storage bucket.',503);
  if(!req.is('application/octet-stream'))throw new ImageError('Upload the image as application/octet-stream.',415);
  // Cloud Functions parses incoming bodies before Express; local requests use express.raw.
  const body=Buffer.isBuffer(req.body)?req.body:(req as express.Request & {rawBody?:Buffer}).rawBody;
  if(!body)throw new ImageError('Choose an image to upload.');
  res.status(201).json(await uploads.execute(res.locals.uid,req.params.id,body));
 }catch(e){next(e);}
});
const image=z.string().max(2000).refine(v=>!v||/^https:\/\//i.test(v)||(mode==='demo'&&/^\/api\/images\/[a-f0-9-]+\.webp$/.test(v)),'Image must be an HTTPS URL');
const schema=z.object({id:z.string().regex(/^[a-zA-Z0-9-]+$/),ownerId:z.string(),name:z.string().trim().min(1).max(100),tagline:z.string().max(200),currency:z.enum(['EUR','USD','GBP','RON']),published:z.boolean(),categories:z.array(z.string().trim().min(1).max(60)).min(1).max(30),items:z.array(z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(120),description:z.string().max(500),price:z.number().finite().min(0).max(100000),category:z.string(),image,available:z.boolean(),dietary:z.array(z.enum(['Vegetarian','Vegan','Gluten-free'])).max(3)})).max(500)}).refine(r=>new Set(r.categories).size===r.categories.length&&new Set(r.items.map(i=>i.id)).size===r.items.length&&r.items.every(i=>r.categories.includes(i.category)),'Categories and item IDs must be valid and unique');
app.get('/api/owner/menu',async(_req,res,next)=>{try{res.json(await service.owned(res.locals.uid));}catch(e){next(e);}});
app.put('/api/owner/menu',async(req,res,next)=>{try{const parsed=schema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:parsed.error.issues[0].message});return;}res.json(await service.save(res.locals.uid,parsed.data));}catch(e){next(e);}});
app.use((err:Error & {type?:string},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(err instanceof ImageError){res.status(err.status).json({error:err.message});return;}if(err.type==='entity.too.large'){res.status(413).json({error:'The upload is too large. Images must be at most 10 MB.'});return;}const forbidden=err.message==='FORBIDDEN';if(!forbidden)console.error(err);res.status(forbidden?403:500).json({error:forbidden?'You do not own this restaurant.':'Something went wrong. Please try again.'});});
return app;
}
