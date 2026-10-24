import { randomUUID } from 'node:crypto';
import type { RestaurantRepository } from '../domain/repository';
import { sampleRestaurant, type Restaurant } from '../../shared/menu';
export class MenuService {
 constructor(private repository:RestaurantRepository) {}
 async owned(ownerId:string) { const existing=await this.repository.findByOwner(ownerId); if(existing)return existing; const restaurant:Restaurant={...structuredClone(sampleRestaurant),id:randomUUID(),ownerId,name:'My restaurant',published:false};await this.repository.save(restaurant);return restaurant; }
 async save(ownerId:string, restaurant:Restaurant) { const current=await this.repository.get(restaurant.id); if(!current||current.ownerId!==ownerId)throw new Error('FORBIDDEN'); const safe={...restaurant,ownerId};await this.repository.save(safe);return safe; }
 async publicMenu(id:string) {const restaurant=await this.repository.get(id);if(!restaurant?.published)return null; const {ownerId,...menu}=restaurant; return {...menu,items:menu.items.filter(i=>i.available)};}
}
