import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { onInit } from 'firebase-functions/v2/core';
import type { Express } from 'express';
import { createApp } from '../server/app';

// Firebase web app settings only. Admin credentials come from the runtime identity.
const projectId=defineString('MENUZ_PROJECT_ID');
const apiKey=defineString('MENUZ_WEB_API_KEY');
const authDomain=defineString('MENUZ_AUTH_DOMAIN');
const storageBucket=defineString('MENUZ_STORAGE_BUCKET',{default:''});
let app:Express;
onInit(async()=>{
 app=await createApp({mode:'firebase',projectId:projectId.value(),apiKey:apiKey.value(),authDomain:authDomain.value(),storageBucket:storageBucket.value()});
});
export const api=onRequest({region:'europe-west1',maxInstances:5,concurrency:8,memory:'512MiB',timeoutSeconds:60,invoker:'public'},(req,res)=>app(req,res));
