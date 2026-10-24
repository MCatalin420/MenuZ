import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MenuService } from './menu-service';
import { sampleRestaurant, type Restaurant } from '../../shared/menu';
import type { RestaurantRepository } from '../domain/repository';
class Memory implements RestaurantRepository {
 data=new Map([[sampleRestaurant.id,structuredClone(sampleRestaurant)]]);
 async get(id:string){return this.data.get(id)??null;}
 async findByOwner(id:string){return [...this.data.values()].find(r=>r.ownerId===id)??null;}
 async save(r:Restaurant){this.data.set(r.id,r);}
}
test('owners cannot overwrite another restaurant',async()=>{const service=new MenuService(new Memory());await assert.rejects(()=>service.save('attacker',sampleRestaurant),/FORBIDDEN/);});
test('public menu hides unavailable items and owner identity',async()=>{const service=new MenuService(new Memory());const menu=await service.publicMenu(sampleRestaurant.id);assert.ok(menu);assert.equal('ownerId' in menu,false);assert.ok(menu.items.every(i=>i.available));assert.equal(menu.items.length,6);});
test('unpublished restaurants are inaccessible publicly',async()=>{const repo=new Memory();repo.data.get(sampleRestaurant.id)!.published=false;assert.equal(await new MenuService(repo).publicMenu(sampleRestaurant.id),null);});
test('new owners receive a distinct draft restaurant',async()=>{const service=new MenuService(new Memory());const menu=await service.owned('new-owner');assert.equal(menu.ownerId,'new-owner');assert.equal(menu.published,false);assert.notEqual(menu.id,sampleRestaurant.id);assert.equal((await service.owned('new-owner')).id,menu.id);});
