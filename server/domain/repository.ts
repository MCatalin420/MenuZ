import type { Restaurant } from '../../shared/menu';
export interface RestaurantRepository { get(id:string):Promise<Restaurant|null>; findByOwner(ownerId:string):Promise<Restaurant|null>; save(restaurant:Restaurant):Promise<void>; }
