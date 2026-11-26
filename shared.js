export const $ = (id) => document.getElementById(id);
export const esc = (text) => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function icon(name, size=20) {return '<svg class="icon" aria-hidden="true" width="'+size+'" height="'+size+'"><use href="./icons.svg?v=6b5fa7262c#'+esc(name)+'"></use></svg>'}
export const norm = text => (text||'').toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu,'').replaceAll('ı','i');
export const matches = (item, category, term) => norm([category.name, item.name, item.note].join(' ')).includes(norm(term.trim()));
export async function json(url, options={}) {
  const r=await fetch(url,{cache:"no-store",...options});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw Object.assign(new Error(data.error || 'Bağlantı kurulamadı. Tekrar deneyin.'),{status:r.status});
  return data;
}
export const money = amount => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:amount%100 ? 2 : 0,maximumFractionDigits:2}).format(amount/100);



export function printedWord(key, text) {
  return '<span class="press-script print-'+key+'"><span>'+esc(text)+'</span></span>';
}

const restaurantContacts = [
  {key:'call', icon:'phone-call', href:'tel:+903622667471', text:'0 (362) 266 74 71', label:'Telefonla ara: 0 (362) 266 74 71'},
  {key:'wa', icon:'whatsapp', href:'https://wa.me/903622667471', text:'WhatsApp', label:'WhatsApp ile yaz: 0 (362) 266 74 71'},
  {key:'instagram', icon:'instagram', href:'https://www.instagram.com/bereketielif/', text:'@bereketielif', label:'Instagram: @bereketielif'}
];

function contactLinks(label) {
  const links = restaurantContacts.map(({key,icon:mark,href,text,label:action}) =>
    '<a class="press-link press-'+key+'" href="'+href+'" aria-label="'+action+'"'+
    (href.startsWith('https:')?' target="_blank" rel="noopener noreferrer"':'')+'>'+
    '<span class="press-icon">'+icon(mark,18)+'</span>'+printedWord(key,text)+'</a>'
  ).join('');
  return '<nav class="press-links" aria-label="'+label+'">'+links+'</nav>';
}

export function contactHeader() {
  return '<div id="contact-top" class="press-top"><div class="wrap press-top-inner">'+
    '<span class="press-order">'+printedWord('order','Sipariş için')+'</span>'+
    contactLinks('Üst menü iletişim bağlantıları')+'</div></div>';
}

export function contactFooter() {
  return '<div id="contact-bottom" class="press-foot"><div class="wrap press-foot-inner">'+
    '<div class="pack-illustration" role="img" aria-label="Bereket-i Elif pide kutusu tasarımı"></div>'+
    '<div class="press-foot-contact"><h2>'+printedWord('contact','Sipariş ve iletişim')+'</h2>'+
    contactLinks('Alt menü iletişim bağlantıları')+'</div></div>'+
    '<div class="press-signoff"><span>Birlikte daha iyiyiz.</span></div></div>';
}

// Rendered on the server and reused when an already-running local server has an earlier page shell.
export function menuMasthead() {
  return `${contactHeader()}<div class="wrap mastin table-nav">
    <a href="#menu" id="menu-link" class="navmenu">${icon('book',19)}<span>Sofra menüsü</span></a>
    <nav class="house-nav" aria-label="Hızlı kategoriler"><a href="#urunler" data-jump="kahvalti">Kahvaltı</a><i></i><a href="#urunler" data-jump="doner">Döner</a><i></i><a href="#urunler" data-jump="pideler">Pide</a><i></i><a href="#urunler" data-jump="izgaralar">Izgara</a></nav>
    <button id="favorites" class="favorites" type="button" aria-pressed="false">${icon('heart',17)}<span>Favorilerim</span><span id="favcount" class="count">0</span></button>
  </div>`;
}

export function adminEntrance() {
  return `<div class="entrance-photo">
    <div class="entrance-sign"><img src="./bereket-i-elif.webp" alt="Bereket-i Elif" width="880" height="398"></div>
  </div>
  <div class="entrance-paper">
    <div class="entrance-content">
      <div class="entrance-kicker"><span aria-hidden="true"></span>Menü yönetimi</div>
      <h1 id="entrance-title">Yönetici girişi</h1>
      <p id="auth-help">Oturum kontrol ediliyor…</p>
      <form id="login-form" hidden>
        <label for="password">Yönetici parolası</label>
        <div class="entrance-field">
          ${icon('lock',18)}
          <input id="password" name="password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required>
          <button id="password-visibility" type="button" aria-label="Parolayı göster" aria-pressed="false" aria-controls="password">
            <span class="show-eye">${icon('eye',20)}</span><span class="hide-eye">${icon('eye-off',20)}</span>
          </button>
        </div>
        <button class="solid entrance-submit" type="submit">Giriş yap</button>
      </form>
      <a class="solid entrance-submit" href="/signin-with-chatgpt?return_to=%2Fadmin" id="cloud-login" target="_top" hidden>Hesabımla giriş yap</a>
      <div id="entrance-status" class="notice" role="status" hidden></div>
      <a class="entrance-back" href="./">${icon('book',17)} Sofra menüsüne dön</a>
    </div>
  </div>`;
}
export function menuInterior() {
  return `<section class="cover" aria-labelledby="hero-title">
    <div class="cover-scene" aria-hidden="true"><img id="hero-img" src="./adana.webp" fetchpriority="high" width="1983" height="793" alt=""><img id="hero-edge" src="./adana.webp" width="1983" height="793" alt=""></div>
    <div class="cover-rule" aria-hidden="true"></div>
    <div class="paper-shadow"><div class="paper-card">
      <div class="paper-content"><p class="paper-kicker"><i></i>Geleneksel Türk mutfağı<i></i></p>
      <img id="cover-logo" src="./bereket-i-elif.webp" width="520" height="235" alt="Bereket-i Elif" fetchpriority="high">
      <div class="ornamental-rule" aria-hidden="true"><i></i><b></b><i></i></div>
      <h1 id="hero-title">${printedWord('table','Sofra menüsü')}</h1><a class="cover-cta" href="#menu">${icon('book',16)} Menüyü incele</a></div>
    </div></div>
    <div class="cover-caption" aria-live="polite"><span class="caption-rule"></span><span id="hero-dish">Adana kebap &amp; kıymalı pide</span></div>
    <div class="slide-buttons"><button type="button" id="prev-slide" aria-label="Önceki sofra fotoğrafı">${icon('left',17)}</button><button type="button" id="next-slide" aria-label="Sonraki sofra fotoğrafı">${icon('right',17)}</button></div>
  </section>
  <section class="catalog wrap" id="menu" aria-labelledby="menu-title">
    <div class="gallery-head"><h2 id="menu-title">${printedWord('gallery','Kategoriler')}</h2><div class="heading-rule" aria-hidden="true"></div>
      <div class="rail-buttons"><button type="button" id="rail-prev" aria-label="Önceki kategoriler" aria-controls="categories">${icon('left',19)}</button><button type="button" id="rail-next" aria-label="Sonraki kategoriler" aria-controls="categories">${icon('right',19)}</button></div>
    </div>
    <nav id="categories" class="category-rail" aria-label="Menü kategorileri"></nav>
    <div id="error" role="alert" hidden class="notice"></div>
    <section class="menu-paper" id="urunler" aria-labelledby="section-title">
      <div class="menu-paper-head"><div class="section-head"><span class="section-icon" id="section-icon">${icon('sunrise',24)}</span><div><h3 id="section-title">Kahvaltı</h3><span id="section-count" aria-live="polite"></span></div></div>
      <div class="list-tools"><label class="category-select"><span class="sr-only">Kategori seç</span><select id="mobile-category" aria-label="Kategori seç"></select></label><label class="searchbox">${icon('search',17)}<input id="search" type="search" placeholder="Menüde ara" aria-label="Tüm menüde ürün ara" autocomplete="off"></label></div></div>
      <p id="price-note" class="price-note" hidden></p><div id="items"><p class="quiet">Ürünler yükleniyor…</p></div>
    </section>
  </section>`;
}

