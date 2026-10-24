export interface MenuItem { id: string; name: string; description: string; price: number; category: string; image: string; available: boolean; dietary: string[]; }
export interface Restaurant { id: string; ownerId: string; name: string; tagline: string; currency: string; categories: string[]; items: MenuItem[]; published: boolean; }
export const sampleRestaurant: Restaurant = {
 id: 'olive-and-thyme', ownerId: 'demo-owner', name: 'Olive & Thyme', tagline: 'Good food. Great company.', currency: 'EUR', published: true,
 categories: ['Starters', 'Main courses', 'Desserts', 'Drinks'],
 items: [
 {id:'1',name:'Burrata & heirloom tomatoes',description:'Creamy burrata, sun-ripened tomatoes, fresh basil & extra virgin olive oil.',price:14,category:'Starters',image:'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=500&auto=format&fit=crop',available:true,dietary:['Vegetarian']},
 {id:'2',name:'Wild mushroom bruschetta',description:'Sourdough toast, sautéed forest mushrooms, whipped ricotta & thyme.',price:12,category:'Starters',image:'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop',available:true,dietary:['Vegetarian']},
 {id:'3',name:'Crispy calamari',description:'Golden fried calamari, lemon aioli & a little squeeze of sunshine.',price:16,category:'Starters',image:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop',available:true,dietary:[]},
 {id:'4',name:'Summer garden salad',description:'Seasonal greens, avocado, cucumber & our house citrus dressing.',price:11,category:'Starters',image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop',available:false,dietary:['Vegan','Gluten-free']},
 {id:'5',name:'Lemon herb chicken',description:'Grilled chicken, roasted potatoes & seasonal vegetables.',price:24,category:'Main courses',image:'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop',available:true,dietary:['Gluten-free']},
 {id:'6',name:'Pistachio cheesecake',description:'Silky cheesecake with toasted pistachios.',price:9,category:'Desserts',image:'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop',available:true,dietary:['Vegetarian']},
 {id:'7',name:'House lemonade',description:'Fresh lemons, mint & sparkling water.',price:6,category:'Drinks',image:'',available:true,dietary:['Vegan']}
 ]
};
