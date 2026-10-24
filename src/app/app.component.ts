import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { MenuGateway } from './menu.gateway';
import type { Restaurant, MenuItem } from '../../shared/menu';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit {
 api=inject(MenuGateway);menu?:Restaurant;tab='Menu editor';category='All items';search='';view='grid';loading=true;error='';notice='';dirty=false;saving=false;
 publicId=location.pathname.match(/^\/m\/([^/]+)\/?$/)?.[1];preview=false;dialog='';editing?:MenuItem;qr='';email='';password='';register=false;needsLogin=false;categoryName='';
 nav=[{name:'Overview',icon:'◫'},{name:'Menu editor',icon:'☷'},{name:'QR code',icon:'▦'},{name:'Restaurant settings',icon:'⚙'}];
 photoFile?:File;photoPreview='';uploading=false;uploadProgress=0;photoError='';
 menuDark=this.readMenuTheme();
 showBackToCategories=false;
 @HostListener('window:scroll')
 onWindowScroll(){this.showBackToCategories=window.scrollY>80;}
 backToTop(){
  window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 private readMenuTheme(){
  try{const saved=localStorage.getItem('menuz-menu-theme');if(saved==='dark'||saved==='light')return saved==='dark';}catch{}
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
 }
 toggleMenuTheme(){this.menuDark=!this.menuDark;try{localStorage.setItem('menuz-menu-theme',this.menuDark?'dark':'light');}catch{}}
 clearPhotoSelection(){if(this.photoPreview)URL.revokeObjectURL(this.photoPreview);this.photoPreview='';this.photoFile=undefined;this.photoError='';}
 selectPhoto(event:Event){
  const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file)return;
  this.photoError='';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){this.photoError='Choose a JPEG, PNG, or WebP image.';return;}
  if(!file.size||file.size>10*1024*1024){this.photoError='Choose an image up to 10 MB.';return;}
  this.clearPhotoSelection();this.photoFile=file;this.photoPreview=URL.createObjectURL(file);
 }
 closeDialog(){if(this.uploading)return;this.clearPhotoSelection();this.dialog='';}
 removePhoto(){if(this.uploading)return;this.clearPhotoSelection();if(this.editing)this.editing.image='';}
 async ngOnInit(){try{await this.api.init();if(this.publicId)this.menu=await this.api.request('/api/menus/'+encodeURIComponent(this.publicId));else if(this.api.mode==='firebase'&&!this.api.auth?.currentUser)this.needsLogin=true;else this.menu=await this.api.load();}catch(e){this.fail(e);}finally{this.loading=false;}window.addEventListener('beforeunload',e=>{if(this.dirty){e.preventDefault();e.returnValue='';}});}
 get items(){return this.menu?.items.filter(i=>(this.category==='All items'||i.category===this.category)&&(`${i.name} ${i.description}`.toLowerCase().includes(this.search.toLowerCase())))??[];}
 get available(){return this.menu?.items.filter(i=>i.available).length??0;}
 get url(){return location.origin+'/m/'+this.menu?.id;}
 money(value:number){return new Intl.NumberFormat('en',{style:'currency',currency:this.menu?.currency??'EUR'}).format(value);}
 fail(e:unknown){this.error=e instanceof Error?e.message:'Something went wrong';}
 changed(){this.dirty=true;}
 async save(){if(!this.menu)return;this.saving=true;this.error='';try{this.menu=await this.api.save(this.menu);this.dirty=false;this.toast('Your menu has been saved.');}catch(e){this.fail(e);}finally{this.saving=false;}}
 toast(message:string){this.notice=message;setTimeout(()=>this.notice='',4000);}
 async navigate(name:string){this.tab=name;if(name==='QR code')await this.generateQR();}
 async generateQR(){try{this.qr=await QRCode.toDataURL(this.url,{width:720,margin:3,color:{dark:'#234e3d',light:'#ffffff'}});}catch(e){this.fail(e);}}
 edit(item?:MenuItem){this.clearPhotoSelection();this.editing=item?structuredClone(item):{id:crypto.randomUUID(),name:'',description:'',price:0,category:this.category==='All items'?this.menu!.categories[0]:this.category,image:'',available:true,dietary:[]};this.dialog='item';}
 async saveItem(){if(!this.menu||!this.editing||this.uploading)return;if(!this.editing.name.trim()||this.editing.price<0||!Number.isFinite(this.editing.price)){this.error='Enter a dish name and a valid price.';return;}
  if(this.photoFile){this.uploading=true;this.uploadProgress=0;this.photoError='';try{const image=await this.api.uploadImage(this.menu.id,this.photoFile,value=>this.uploadProgress=value);this.editing.image=image.url;}catch(e){this.photoError=e instanceof Error?e.message:'Unable to upload photo.';return;}finally{this.uploading=false;}}
  const index=this.menu.items.findIndex(i=>i.id===this.editing!.id);if(index>=0)this.menu.items[index]=this.editing;else this.menu.items.push(this.editing);this.changed();this.closeDialog();
 }
 deleteItem(){if(!this.menu||!this.editing||this.uploading)return;this.menu.items=this.menu.items.filter(i=>i.id!==this.editing!.id);this.changed();this.closeDialog();}
 addCategory(){const name=this.categoryName.trim();if(!name||!this.menu)return;if(this.menu.categories.includes(name)){this.error='That category already exists.';return;}this.menu.categories.push(name);this.category=name;this.categoryName='';this.dialog='';this.changed();}
 toggleDiet(value:string){if(!this.editing)return;this.editing.dietary=this.editing.dietary.includes(value)?this.editing.dietary.filter(v=>v!==value):[...this.editing.dietary,value];}
 async copy(){try{await navigator.clipboard.writeText(this.url);this.toast('Menu link copied.');}catch{this.error='Clipboard unavailable. Copy the menu link shown on this page.';}}
 async login(){this.loading=true;this.error='';try{await this.api.login(this.email,this.password,this.register);this.menu=await this.api.load();this.needsLogin=false;}catch(e){this.fail(e);}finally{this.loading=false;}}
 async loginWithGoogle(){this.loading=true;this.error='';try{await this.api.loginWithGoogle();this.menu=await this.api.load();this.needsLogin=false;}catch(e){const code=(e as {code?:string})?.code;if(code==='auth/popup-blocked')this.error='Please allow popups for this site and try again.';else if(code!=='auth/popup-closed-by-user'&&code!=='auth/cancelled-popup-request')this.fail(e);}finally{this.loading=false;}}
 async logout(){if(this.dirty&&!confirm('Discard your unsaved changes?'))return;await this.api.logout();this.menu=undefined;this.needsLogin=true;this.dirty=false;}
 imageError(event:Event){(event.target as HTMLImageElement).style.display='none';}
}
