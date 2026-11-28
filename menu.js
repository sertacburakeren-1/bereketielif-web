import {publicState} from './publication.js?v=9c21d87240';
import {$,esc,icon,json,matches,money,menuMasthead,menuInterior,contactFooter} from './shared.js?v=9c21d87240';
import {mergeCatalog} from './menu-data.js?v=9c21d87240';

if (!$('allergen-note')) {
  document.querySelector('.mast').innerHTML = menuMasthead();
  const main = $('main');
  main.classList.remove('wrap');
  main.innerHTML = menuInterior();
}

if (!$('heritage-note') || document.querySelector('.pide-feature')) document.querySelector('.footer').innerHTML=contactFooter();

const slides = [
  ['adana', 'Adana kebap & kıymalı pide'],
  ['menemen', 'Bakır sahanda menemen'],
  ['pide', 'Açık kıymalı pide']
];
let slide = 0;
function changeSlide(direction) {
  slide = (slide + direction + slides.length) % slides.length;
  const [file, caption] = slides[slide];
  const source = './'+file+'.webp';
  $('hero-img').src = source;
  $('hero-edge').src = source;
  $('hero-dish').textContent = caption;
}
$('prev-slide').onclick = () => changeSlide(-1);
$('next-slide').onclick = () => changeSlide(1);

const storeKey='bereket-elif-favoriler-v1';
let favs=new Set();
try{const arr=JSON.parse(localStorage.getItem(storeKey)||'[]');if(Array.isArray(arr))favs=new Set(arr.filter(x=>typeof x==='string'));}catch{}
let baseCatalog=[], cats=[], prices={}, priceAvailable=false, ready=false;
let catalogVersion='';
let active='kahvalti', favoriteView=false;
const goMenu=()=>$('urunler').scrollIntoView({block:'start'});
function selectCategory(id) {
  if(!cats.some(c=>c.id===id))return;
  active=id;favoriteView=false;$('search').value='';render();
  const selected=$('categories').querySelector('[aria-pressed="true"]');
  if(selected){
    const rail=$('categories'),box=rail.getBoundingClientRect(),card=selected.getBoundingClientRect();
    if(card.left<box.left||card.right>box.right)rail.scrollBy({left:card.left-box.left-(box.width-card.width)/2});
  }
}
function scrollCategories(direction){
  const rail=$('categories');
  rail.scrollBy({left:direction*Math.max(180,rail.clientWidth*0.78)});
}
function updateRailButtons(){
  const rail=$('categories');
  $('rail-prev').disabled=rail.scrollLeft<=2;
  $('rail-next').disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2;
}
$('rail-prev').onclick=()=>scrollCategories(-1);
$('rail-next').onclick=()=>scrollCategories(1);
$('categories').addEventListener('scroll',updateRailButtons,{passive:true});
window.addEventListener('resize',updateRailButtons,{passive:true});
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-jump]');
  if(link)selectCategory(link.dataset.jump);
});
function setFavMode(value){favoriteView=value;$('search').value='';render();goMenu();}
$('favorites').onclick=()=>setFavMode(!favoriteView);
$('menu-link').onclick=()=>{favoriteView=false;$('search').value='';render();};
$('search').oninput=render;
$('mobile-category').onchange=e=>selectCategory(e.target.value);
$('categories').onclick=e=>{const btn=e.target.closest('button[data-category]');if(btn)selectCategory(btn.dataset.category);};
$('items').onclick=e=>{
  const btn=e.target.closest('button[data-fav]');if(!btn)return;
  const id=btn.dataset.fav;
  if(favs.has(id))favs.delete(id);else favs.add(id);
  try{localStorage.setItem(storeKey,JSON.stringify([...favs]));}catch{}
  render();const next=document.querySelector('[data-fav="'+CSS.escape(id)+'"]');(next||$('favorites')).focus({preventScroll:true});
};
function productRow(item){
  const liked=favs.has(item.id), price=prices[item.id];
  const doner=cats.find(category=>category.id==='doner')?.items.some(product=>product.id===item.id);
  const notes=[item.note,doner?'%100 yaprak döner':'',item.id==='doner-iskender'?'Tereyağı içerir.':''].filter(Boolean);
  return '<div class="foodrow"><div><h4>'+esc(item.name)+'</h4>'+(notes.length?'<small>'+esc(notes.join(' · '))+'</small>':'')+'</div><div class="action">'+(Number.isInteger(price)?'<span class="price">'+money(price)+'</span>':'')+'<button class="heartbtn'+(liked?' on':'')+'" type="button" aria-pressed="'+liked+'" aria-label="'+esc(item.name+(item.note?' '+item.note:'')+(liked?' favorilerden çıkar':' favorilere ekle'))+'" data-fav="'+esc(item.id)+'">'+icon('heart',18)+'</button></div></div>';
}
function render(){
  $('favcount').textContent=String(favs.size);$('favorites').setAttribute('aria-pressed',String(favoriteView));
  if(!ready)return;
  const query=$('search').value.trim();
  const grouped=Boolean(query)||favoriteView;
  const chosen=cats.find(c=>c.id===active)||cats[0];
  const groups=(grouped?cats:[chosen]).map(c=>({c,items:c.items.filter(i=>(!favoriteView||favs.has(i.id))&&matches(i,c,query))})).filter(g=>g.items.length);
  const count=groups.reduce((total,g)=>total+g.items.length,0);
  $('section-title').textContent=favoriteView?'Favorilerim':query?'Arama sonuçları':chosen.name;
  $('section-icon').innerHTML=icon(favoriteView?'heart':query?'search':chosen.icon,24);
  $('section-count').textContent=count+' ürün';
  $('category-note').hidden=grouped||chosen.id!=='doner';
  $('price-note').hidden=!priceAvailable||!groups.some(g=>g.items.some(i=>prices[i.id]==null));
  $('price-note').textContent='Fiyatı görünmeyen ürünler için servis ekibimize danışabilirsiniz.';
  if(!$('categories').childElementCount){
    $('categories').innerHTML=cats.map(c=>'<button type="button" class="category-card food-'+esc(c.id)+'" data-category="'+esc(c.id)+'" aria-pressed="false"><span class="category-image" aria-hidden="true"></span><span class="category-text"><strong>'+esc(c.name)+'</strong><small>'+c.items.length+' ürün</small></span></button>').join('');
  }
  for(const button of $('categories').children){
    const selected=!grouped&&button.dataset.category===active;
    button.setAttribute('aria-pressed',String(selected));
  }
  updateRailButtons();
  $('mobile-category').innerHTML='<option value="" disabled'+(grouped?' selected':'')+'>Kategori seç</option>'+cats.map(c=>'<option value="'+c.id+'"'+(!grouped&&c.id===active?' selected':'')+'>'+esc(c.name)+'</option>').join('');
  if(!count){$('items').innerHTML='<p class="empty">'+(query?'Aramanızla eşleşen ürün bulunamadı.': 'Beğendiğiniz yemeklerin yanındaki kalbe dokunarak burada bir sofra listesi oluşturabilirsiniz.')+'</p>';return;}
  $('items').innerHTML=groups.map(({c,items})=>(grouped?'<h4 class="subhead">'+esc(c.name)+'</h4>':'')+'<div class="dish-grid">'+items.map(productRow).join('')+'</div>').join('');
}
function showError(text,fn){
 const box=$('error');box.hidden=false;box.textContent=text;const button=document.createElement('button');button.type='button';button.textContent='Tekrar dene';button.onclick=fn;box.append(button);
}
let loading=false;
async function load(){
 if(loading)return;loading=true;
 try{
  if(!ready){baseCatalog=await json('./catalog.json');cats=baseCatalog;ready=true;render();}
  const data=await publicState();prices=data.prices;priceAvailable=true;$('error').hidden=true;
  const products=data.products||[];
  const version=JSON.stringify(products);
  if(version!==catalogVersion){
    cats=mergeCatalog(baseCatalog,products);catalogVersion=version;
    $('categories').innerHTML='';
    const valid=new Set(cats.flatMap(category=>category.items.map(item=>item.id)));
    favs=new Set([...favs].filter(id=>valid.has(id)));
  }
 }catch{prices={};priceAvailable=false;showError(ready?'Güncel fiyatlara ulaşılamadı.':'Menü yüklenemedi.',load);}
 finally{loading=false;render();}
}
load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},45000);

