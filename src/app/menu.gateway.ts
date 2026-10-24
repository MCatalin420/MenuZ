import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, Auth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { Restaurant } from '../../shared/menu';
@Injectable({providedIn:'root'})
export class MenuGateway {
 mode='demo';auth?:Auth;
 async init(){const config=await this.request('/api/config');this.mode=config.mode;if(this.mode==='firebase'){this.auth=getAuth(initializeApp(config.firebase));await new Promise<void>(resolve=>{const stop=onAuthStateChanged(this.auth!,()=>{stop();resolve();});});}}
 async login(email:string,password:string,register=false){if(!this.auth)return;await (register?createUserWithEmailAndPassword:signInWithEmailAndPassword)(this.auth,email,password);}
 async loginWithGoogle(){if(!this.auth)throw new Error('Firebase authentication is not configured.');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(this.auth,provider);}
 async logout(){if(this.auth)await signOut(this.auth);}
 async uploadImage(restaurantId:string,file:File,onProgress:(value:number)=>void):Promise<{url:string;width:number;height:number;bytes:number}>{
  const token=await this.auth?.currentUser?.getIdToken();
  return new Promise((resolve,reject)=>{
   const xhr=new XMLHttpRequest();
   xhr.open('POST',`/api/owner/restaurants/${encodeURIComponent(restaurantId)}/images`);
   xhr.setRequestHeader('Content-Type','application/octet-stream');
   if(token)xhr.setRequestHeader('Authorization',`Bearer ${token}`);
   xhr.timeout=90000;
   xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
   xhr.onload=()=>{try{const result=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new Error(result.error??'Photo upload failed.'));}catch{reject(new Error('Photo upload failed. Please try again.'));}};
   xhr.onerror=()=>reject(new Error('Photo upload failed. Check your connection and try again.'));
   xhr.ontimeout=()=>reject(new Error('Photo upload timed out. Please try again.'));
   xhr.send(file);
  });
 }
 async request(path:string,method='GET',body?:unknown){const token=await this.auth?.currentUser?.getIdToken();const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed');return data;}
 load():Promise<Restaurant>{return this.request('/api/owner/menu');}
 save(menu:Restaurant):Promise<Restaurant>{return this.request('/api/owner/menu','PUT',menu);}
}
