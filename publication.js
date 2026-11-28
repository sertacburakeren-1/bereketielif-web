import {json} from './shared.js?v=9c21d87240';
import {applyMenuUpdate, validPrice} from './menu-data.js?v=9c21d87240';

let unlocked = false;
let idsPromise, catalogPromise;
function priceIds() {
  idsPromise ??= json('./price-ids.json').catch(error => { idsPromise = null; throw error; });
  return idsPromise;
}
function catalogData() {
  catalogPromise ??= json('./catalog.json').catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
export async function publicState() {
  const [raw, ids, catalog] = await Promise.all([json('./state.json?t=' + Date.now()), priceIds(), catalogData()]);
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 0 || !Array.isArray(raw.values) ||
      !Array.isArray(raw.products ?? [])) throw Error('Menü verileri okunamadı.');
  const prices = {};
  for (const pair of raw.values) {
    if (!Array.isArray(pair) || pair.length !== 2) throw Error('Fiyat listesi okunamadı.');
    const [index, amount] = pair;
    if (!Number.isSafeInteger(index) || !ids[index] || amount === null || !validPrice(amount)) {
      throw Error('Fiyat listesi okunamadı.');
    }
    prices[ids[index]] = amount;
  }
  const products = (raw.products || []).map(entry => {
    if (!entry || typeof entry !== 'object' || !validPrice(entry.price ?? null)) throw Error('Ürün listesi okunamadı.');
    const {price, ...product} = entry;
    if (price != null) prices[product.id] = price;
    return product;
  });
  if (!products.length) return {revision: raw.revision, prices, products: []};
  const checked = applyMenuUpdate({revision: 0, prices: {}, products: []}, {revision: 0, changes: prices, additions: products}, catalog);
  return {...checked, revision: raw.revision};
}
function fromHex(value) {
  return Uint8Array.from(value.match(/../g), part => parseInt(part, 16));
}
export async function adminRequest(url, options = {}) {
  if (url === '/api/admin') return {local: true, authorized: unlocked, publication: true};
  if (url === '/api/admin/login') {
    const pass = JSON.parse(options.body).password;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bytes = await crypto.subtle.deriveBits({name: 'PBKDF2', salt: fromHex('72000afc2b6103b77261bee7fd928c4ed4f33b0b'), iterations: 600000, hash: 'SHA-256'}, key, 256);
    unlocked = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('') === '1e3397ee5fe62ddefc7f1f0cdf39ab4463d616f491b620a370cc31ad3add478d';
    if (!unlocked) throw Object.assign(Error('Parola hatalı.'), {status: 403});
    return {ok: true};
  }
  if (url === '/api/menu') {
    if (options.method === 'PATCH') return openPublication(JSON.parse(options.body));
    return publicState();
  }
  return json(url, options);
}
export async function openPublication(payload) {
  if (!unlocked) throw Object.assign(Error('Yönetici girişi gerekiyor.'), {status: 403});
  const [latest, ids, catalog] = await Promise.all([publicState(), priceIds(), catalogData()]);
  const next = applyMenuUpdate(latest, payload, catalog);
  const values = ids.flatMap((id, index) => next.prices[id] == null ? [] : [[index, next.prices[id]]]);
  const products = next.products.map(product => ({...product, price: next.prices[product.id] ?? null}));
  const content = JSON.stringify({revision: next.revision, values, products});
  const filename = 'r' + String(next.revision).padStart(10, '0') + '.json';
  const target = new URL('https://github.com/sertacburakeren-1/bereketielif-web/new/main');
  target.searchParams.set('filename', '_data/fiyatlar/' + filename);
  target.searchParams.set('value', content);
  target.searchParams.set('message', 'Menü ürünlerini ve fiyatlarını güncelle · ' + next.revision);
  if (target.toString().length > 12000) {
    return {pendingPublication: true, url: 'https://github.com/sertacburakeren-1/bereketielif-web/upload/main/_data/fiyatlar', filename, content};
  }
  return {pendingPublication: true, url: target.toString()};
}
