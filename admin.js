import {adminRequest as json, openPublication} from './publication.js';
import {$,esc,matches,adminEntrance} from './shared.js';
let cats=[], state={revision:0,prices:{}}, drafts=new Map(), saving=false, conflicts=false;
const entrance=$('auth-box');
if(!$('entrance-title')){
  entrance.innerHTML=adminEntrance();
  entrance.setAttribute('aria-labelledby','entrance-title');
}
function showEntrance(visible){
  document.body.classList.toggle('entrance-open',visible);
  entrance.hidden=!visible;
  $('admin-work').hidden=visible;
}
showEntrance(true);
function status(text, isError=false){
  const b=$(entrance.hidden?'admin-status':'entrance-status');
  b.hidden=!text;b.classList.toggle('error',isError);b.textContent=text;
  return b;
}
function parseAmount(raw){
 const value=raw.trim();if(value==='')return null;
 if(!/^\d{1,7}([.,]\d{1,2})?$/.test(value))return undefined;
 const [whole,fraction='']=value.replace(',','.').split('.');
 return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
const asInput=cents=>cents==null?'':String(Math.floor(cents/100))+(cents%100?','+String(cents%100).padStart(2,'0'):'');
function refreshBar(){
 $('dirty-count').textContent=drafts.size?drafts.size+' fiyat değişikliği':'Değişiklik yok';
 $('save').disabled=saving||conflicts||!drafts.size||[...drafts.values()].some(v=>parseAmount(v)===undefined);
 $('save').textContent=saving?'Yayınlanıyor…':'Fiyatları yayınla';
}
function render(){
 const selected=$('admin-cat').value, term=$('admin-search').value;
 const rows=cats.filter(c=>!selected||c.id===selected).flatMap(c=>c.items.filter(i=>matches(i,c,term)).map(i=>{
 const raw=drafts.has(i.id)?drafts.get(i.id):asInput(state.prices[i.id]);
 return '<label class="admin-row'+(drafts.has(i.id)?' changed':'')+'"><span><b>'+esc(i.name)+'</b><small>'+esc(c.name+(i.note?' · '+i.note:''))+'</small></span><input type="text" inputmode="decimal" autocomplete="off" data-id="'+i.id+'" value="'+esc(raw)+'" aria-invalid="'+(parseAmount(raw)===undefined)+'" placeholder="—" aria-label="'+esc([c.name,i.name,i.note,'fiyatı (TL)'].filter(Boolean).join(' '))+'"></label>';
 }));
 $('admin-items').innerHTML=rows.length?rows.join(''):'<p class="empty">Eşleşen ürün bulunamadı.</p>';refreshBar();
}
$('admin-items').oninput=e=>{
 const el=e.target,id=el.dataset.id;if(!id)return;
 if(parseAmount(el.value)===(state.prices[id]??null))drafts.delete(id);else drafts.set(id,el.value);
 const invalid=parseAmount(el.value)===undefined;el.setAttribute('aria-invalid',invalid);el.closest('label').classList.toggle('changed',drafts.has(id));
 if(invalid)status('Fiyatı 125 veya 125,50 şeklinde girin.',true);else if(!conflicts)status('');
 refreshBar();
};
$('admin-search').oninput=render;$('admin-cat').onchange=render;
const passwordInput=$('password'), visibility=$('password-visibility'), loginForm=$('login-form');
function showPassword(visible){
  passwordInput.type=visible?'text':'password';
  visibility.setAttribute('aria-pressed',String(visible));
  visibility.setAttribute('aria-label',visible?'Parolayı gizle':'Parolayı göster');
}
visibility.onclick=()=>showPassword(passwordInput.type==='password');
passwordInput.oninput=()=>{
  passwordInput.removeAttribute('aria-invalid');
  passwordInput.removeAttribute('aria-describedby');
  status('');
};
loginForm.onsubmit=async e=>{
  e.preventDefault();
  const submit=loginForm.querySelector('[type=submit]');
  if(submit.disabled)return;
  submit.disabled=true;
  submit.textContent='Giriş yapılıyor…';
  loginForm.setAttribute('aria-busy','true');
  status('');
  try{
    await json('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:passwordInput.value})});
    passwordInput.value='';showPassword(false);
    await start();
  }catch(err){
    status(err.message,true);
    if(err.status===403){
      passwordInput.setAttribute('aria-invalid','true');
      passwordInput.setAttribute('aria-describedby','entrance-status');
      passwordInput.focus();passwordInput.select();
    }
  }finally{
    submit.disabled=false;submit.textContent='Giriş yap';loginForm.removeAttribute('aria-busy');
  }
};
async function start(){
 try{
 const auth=await json('/api/admin');showEntrance(!auth.authorized);status('');
 if(!auth.authorized){$('auth-help').textContent=auth.local?'Fiyatları düzenlemek için yönetici parolanızı girin. Yayını GitHub hesabınızla onaylayacaksınız.':'Menü fiyatlarını düzenlemek için işletme sahibi hesabınızla giriş yapın.';loginForm.hidden=!auth.local;$('cloud-login').hidden=auth.local;return;}
 [cats,state]=await Promise.all([json('./catalog.json'),json('/api/menu')]);
 $('admin-cat').innerHTML='<option value="">Tüm kategoriler</option>'+cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');render();
 }catch(err){const notice=status(err.message,true);const b=document.createElement('button');b.textContent='Tekrar dene';b.onclick=start;notice.append(b);}
}
$('save').onclick=async()=>{
 if(saving||conflicts||!drafts.size)return;
 const changes=Object.fromEntries([...drafts].map(([id,value])=>[id,parseAmount(value)]));
 if(Object.values(changes).some(v=>v===undefined))return;
 saving=true;refreshBar();$('admin-items').inert=true;
 try{const next=await openPublication(state,changes); const notice=status('Fiyatları yayınlamak için işletmenin GitHub hesabıyla kaydı onaylayın.');const link=document.createElement('a');link.href=next;link.target='_blank';link.rel='noopener noreferrer';link.textContent='GitHub’da onayla ↗';link.className='solid';notice.append(document.createElement('br'),link);}
 catch(err){status(err.message,true);
 if(err.status===409){conflicts=true;const b=document.createElement('button');b.textContent='Güncel fiyatları yükle';b.onclick=async()=>{if(!confirm('Taslaklarınız silinecek ve son yayınlanan fiyatlar açılacak. Devam edilsin mi?'))return;try{state=await json('/api/menu');drafts.clear();conflicts=false;status('Son yayınlanan fiyatlar yüklendi.');render();}catch(e){status(e.message,true);}};$('admin-status').append(b);}
 }
 finally{saving=false;$('admin-items').inert=false;refreshBar();$('admin-status').scrollIntoView({block:'nearest'});}
};
window.addEventListener('beforeunload',e=>{if(drafts.size){e.preventDefault();e.returnValue='';}});start();

