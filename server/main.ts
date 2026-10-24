import 'dotenv/config';
import { createApp } from './app';
const app=await createApp();
app.listen(Number(process.env.PORT??3001),'127.0.0.1',()=>console.log(`MenuZ API ready on http://localhost:${process.env.PORT??3001} (${process.env.APP_MODE??'demo'})`));
