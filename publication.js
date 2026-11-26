import {json} from './shared.js';
let unlocked=false;
let idsPromise;
function priceIds(){idsPromise??=json('./price-ids.json').catch(e=>{idsPromise=null;throw e;});return idsPromise;}
export async function publicState(){
  const [raw,ids]=await Promise.all([json('./state.json?t='+Date.now()),priceIds()]);
  if(!Number.isSafeInteger(raw.revision)||!Array.isArray(raw.values))throw Error('Fiyatlar yüklenemedi.');
  const prices={};
  for(const [index,amount] of raw.values){
    if(!Number.isSafeInteger(index)||!ids[index]||!Number.isSafeInteger(amount)||amount<0||amount>999999999)throw Error('Fiyat listesi okunamadı.');
    prices[ids[index]]=amount;
  }
  return {revision:raw.revision,prices};
}
function fromHex(value){return Uint8Array.from(value.match(/../g),v=>parseInt(v,16));}
export async function adminRequest(url,options={}){
  if(url==='/api/admin')return {local:true,authorized:unlocked};
  if(url==='/api/admin/login'){
    const pass=JSON.parse(options.body).password;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveBits']);
    const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex('72000afc2b6103b77261bee7fd928c4ed4f33b0b'),iterations:600000,hash:'SHA-256'},key,256);
    unlocked=Array.from(new Uint8Array(bytes),(v)=>v.toString(16).padStart(2,'0')).join('')==='1e3397ee5fe62ddefc7f1f0cdf39ab4463d616f491b620a370cc31ad3add478d';
    if(!unlocked)throw Object.assign(Error('Parola hatalı.'),{status:403});
    return {ok:true};
  }
  if(url==='/api/menu')return publicState();
  return json(url,options);
}
export async function openPublication(state,changes){
  if(!unlocked)throw Error('Yönetici girişi gerekiyor.');
  const [latest,ids]=await Promise.all([publicState(),priceIds()]);
  if(latest.revision!==state.revision)throw Object.assign(Error('Fiyatlar başka bir oturumdan güncellendi.'),{status:409});
  const prices={...latest.prices,...changes};
  const values=ids.flatMap((id,i)=>prices[id]==null?[]:[[i,prices[id]]]);
  const revision=latest.revision+1;
  const target=new URL('https://github.com/sertacburakeren-1/bereketielif-web/new/main');
  target.searchParams.set('filename','_data/fiyatlar/r'+String(revision).padStart(10,'0')+'.json');
  target.searchParams.set('value',JSON.stringify({revision,values}));
  target.searchParams.set('message','Menü fiyatlarını güncelle · '+revision);
  return target.toString();
}
