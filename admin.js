import {adminRequest as json} from './publication.js?v=9c21d87240';
import {$, esc, matches, adminEntrance} from './shared.js?v=9c21d87240';
import {applyMenuUpdate, mergeCatalog} from './menu-data.js?v=9c21d87240';

let baseCatalog = [], cats = [];
let state = {revision: 0, prices: {}, products: []};
const drafts = new Map();
const additions = new Map();
let saving = false, pendingPublication = null, checkingPublication = false;
const entrance = $('auth-box');
if (!$('entrance-title')) {
  entrance.innerHTML = adminEntrance();
  entrance.setAttribute('aria-labelledby', 'entrance-title');
}
function showEntrance(visible) {
  document.body.classList.toggle('entrance-open', visible);
  entrance.hidden = !visible;
  $('admin-work').hidden = visible;
}
showEntrance(true);
function status(text, isError = false) {
  const box = $(entrance.hidden ? 'admin-status' : 'entrance-status');
  box.hidden = !text;
  box.classList.toggle('error', isError);
  box.textContent = text;
  return box;
}
function parseAmount(raw) {
  const value = raw.trim();
  if (value === '') return null;
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(value)) return undefined;
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
const asInput = cents => cents == null ? '' : String(Math.floor(cents / 100)) +
  (cents % 100 ? ',' + String(cents % 100).padStart(2, '0') : '');
function refreshBar() {
  const priceCount = [...drafts.keys()].filter(id => !additions.has(id)).length;
  const descriptions = [];
  if (additions.size) descriptions.push(additions.size + ' yeni ürün');
  if (priceCount) descriptions.push(priceCount + ' fiyat değişikliği');
  $('dirty-count').textContent = descriptions.join(' · ') || 'Değişiklik yok';
  $('save').disabled = saving || !!pendingPublication || !descriptions.length ||
    [...drafts.values()].some(value => parseAmount(value) === undefined);
  $('save').textContent = saving ? 'Kaydediliyor…' : pendingPublication ? 'Yayın onayı bekleniyor' : 'Değişiklikleri yayınla';
}
function render() {
  cats = mergeCatalog(baseCatalog, [...(state.products || []), ...additions.values()]);
  const selected = $('admin-cat').value;
  const term = $('admin-search').value;
  const rows = cats.filter(category => !selected || category.id === selected).flatMap(category =>
    category.items.filter(item => matches(item, category, term)).map(item => {
      const raw = drafts.has(item.id) ? drafts.get(item.id) : asInput(state.prices[item.id]);
      const added = additions.has(item.id);
      const changed = added || drafts.has(item.id);
      return '<div class="admin-row' + (changed ? ' changed' : '') + '">' +
        '<label for="price-' + esc(item.id) + '"><b>' + esc(item.name) + '</b><small>' +
        esc(category.name + (item.note ? ' · ' + item.note : '')) + (added ? ' · Yeni ürün taslağı' : '') +
        '</small></label><div class="admin-price"><input id="price-' + esc(item.id) +
        '" type="text" inputmode="decimal" autocomplete="off" data-id="' + esc(item.id) +
        '" value="' + esc(raw) + '" aria-invalid="' + (parseAmount(raw) === undefined) +
        '" placeholder="—" aria-label="' + esc([category.name, item.name, item.note, 'fiyatı (TL)'].filter(Boolean).join(' ')) + '">' +
        (added ? '<button type="button" class="draft-remove" data-remove="' + esc(item.id) +
          '" aria-label="' + esc(item.name) + ' taslağını kaldır"' + (pendingPublication ? ' disabled' : '') + '>Kaldır</button>' : '') +
        '</div></div>';
    }));
  $('admin-items').innerHTML = rows.length ? rows.join('') : '<p class="empty">Eşleşen ürün bulunamadı.</p>';
  refreshBar();
}
function receiveState(next) {
  state = {...next, products: next.products || []};
  for (const product of state.products) additions.delete(product.id);
  for (const [id, raw] of drafts) {
    if (!additions.has(id) && parseAmount(raw) === (state.prices[id] ?? null)) drafts.delete(id);
  }
  render();
}
$('admin-items').oninput = event => {
  const input = event.target, id = input.dataset.id;
  if (!id) return;
  if (parseAmount(input.value) === (state.prices[id] ?? null)) drafts.delete(id);
  else drafts.set(id, input.value);
  const invalid = parseAmount(input.value) === undefined;
  input.setAttribute('aria-invalid', invalid);
  input.closest('.admin-row').classList.toggle('changed', drafts.has(id) || additions.has(id));
  if (invalid) status('Fiyatı 125 veya 125,50 şeklinde girin.', true);
  else if (!pendingPublication) status('');
  refreshBar();
};
$('admin-items').onclick = event => {
  const button = event.target.closest('[data-remove]');
  if (!button || pendingPublication || saving) return;
  additions.delete(button.dataset.remove);
  drafts.delete(button.dataset.remove);
  render();
};
$('admin-search').oninput = render;
$('admin-cat').onchange = render;
const newForm = $('new-product-form');
newForm.onsubmit = event => {
  event.preventDefault();
  const error = $('new-product-error');
  error.hidden = true;
  const amount = parseAmount($('new-price').value);
  if (amount === undefined) {
    error.textContent = 'Fiyatı 125 veya 125,50 şeklinde girin.';
    error.hidden = false;
    $('new-price').focus();
    return;
  }
  const product = {
    id: 'custom-' + crypto.randomUUID(),
    categoryId: $('new-category').value,
    name: $('new-name').value.trim(),
    note: $('new-note').value.trim()
  };
  try {
    applyMenuUpdate(state, {revision: state.revision, additions: [...additions.values(), product], changes: {[product.id]: amount}}, baseCatalog);
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    return;
  }
  additions.set(product.id, product);
  drafts.set(product.id, $('new-price').value.trim());
  $('admin-cat').value = product.categoryId;
  $('admin-search').value = '';
  newForm.reset();
  $('new-product').open = false;
  render();
  if (!pendingPublication) status('“' + product.name + '” taslağa eklendi. Menüde görünmesi için değişiklikleri yayınlayın.');
  $('price-' + product.id).focus();
};
$('cancel-product').onclick = () => {
  newForm.reset();
  $('new-product-error').hidden = true;
  $('new-product').open = false;
};
$('new-product').ontoggle = () => {
  if ($('new-product').open && $('admin-cat').value) $('new-category').value = $('admin-cat').value;
};

const passwordInput = $('password'), visibility = $('password-visibility'), loginForm = $('login-form');
function showPassword(visible) {
  passwordInput.type = visible ? 'text' : 'password';
  visibility.setAttribute('aria-pressed', String(visible));
  visibility.setAttribute('aria-label', visible ? 'Parolayı gizle' : 'Parolayı göster');
}
visibility.onclick = () => showPassword(passwordInput.type === 'password');
passwordInput.oninput = () => {
  passwordInput.removeAttribute('aria-invalid');
  passwordInput.removeAttribute('aria-describedby');
  status('');
};
loginForm.onsubmit = async event => {
  event.preventDefault();
  const submit = loginForm.querySelector('[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  submit.textContent = 'Giriş yapılıyor…';
  loginForm.setAttribute('aria-busy', 'true');
  status('');
  try {
    await json('/api/admin/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: passwordInput.value})});
    passwordInput.value = '';
    showPassword(false);
    await start();
  } catch (err) {
    status(err.message, true);
    if (err.status === 403) {
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.setAttribute('aria-describedby', 'entrance-status');
      passwordInput.focus();
      passwordInput.select();
    }
  } finally {
    submit.disabled = false;
    submit.textContent = 'Giriş yap';
    loginForm.removeAttribute('aria-busy');
  }
};
async function start() {
  try {
    const auth = await json('/api/admin');
    showEntrance(!auth.authorized);
    status('');
    if (!auth.authorized) {
      $('auth-help').textContent = auth.local ? 'Menüyü düzenlemek için yönetici parolanızı girin.' : 'Menüyü düzenlemek için işletme sahibi hesabınızla giriş yapın.';
      loginForm.hidden = !auth.local;
      $('cloud-login').hidden = auth.local;
      return;
    }
    [baseCatalog, state] = await Promise.all([json('./catalog.json'), json('/api/menu')]);
    const options = baseCatalog.map(category => '<option value="' + esc(category.id) + '">' + esc(category.name) + '</option>').join('');
    $('admin-cat').innerHTML = '<option value="">Tüm kategoriler</option>' + options;
    $('new-category').innerHTML = options;
    $('publish-help').textContent = auth.publication ? 'Değişikliklerin yayına geçmesi için işletmenin GitHub hesabında onay verin.' : 'Kaydettiğiniz ürünler ve fiyatlar müşteri menüsüne yansır.';
    render();
  } catch (err) {
    const notice = status(err.message, true);
    const button = document.createElement('button');
    button.textContent = 'Tekrar dene';
    button.onclick = start;
    notice.append(button);
  }
}
function showPublicationLink() {
  const notice = status('Menü değişiklikleri hazır. Yayınlamak için işletmenin GitHub hesabında kaydı onaylayın.');
  if (pendingPublication.content) {
    notice.textContent = 'Menü değişiklikleri hazır. Yayın dosyasını indirip GitHub’da yükleyin ve kaydı onaylayın.';
    const download = document.createElement('a');
    download.href = URL.createObjectURL(new Blob([pendingPublication.content], {type: 'application/json'}));
    download.download = pendingPublication.filename;
    download.textContent = 'Yayın dosyasını indir';
    download.className = 'solid publication-link';
    notice.append(document.createElement('br'), download);
  }
  const link = document.createElement('a');
  link.href = pendingPublication.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'GitHub’da onayla ↗';
  link.className = 'solid publication-link';
  notice.append(document.createElement('br'), link);
}
$('save').onclick = async () => {
  if (saving || pendingPublication || (!drafts.size && !additions.size)) return;
  const changes = Object.fromEntries([...drafts].map(([id, raw]) => [id, parseAmount(raw)]));
  if (Object.values(changes).some(value => value === undefined)) return;
  const payload = {revision: state.revision, changes, additions: [...additions.values()]};
  saving = true;
  refreshBar();
  $('admin-items').inert = true;
  newForm.inert = true;
  try {
    const next = await json('/api/menu', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    if (next.pendingPublication) {
      pendingPublication = {...payload, url: next.url, filename: next.filename, content: next.content};
      showPublicationLink();
      render();
    } else {
      receiveState(next);
      status('Menü yayınlandı. Ürünler ve fiyatlar güncellendi.');
    }
  } catch (err) {
    status(err.message, true);
    if (err.status === 409) {
      const button = document.createElement('button');
      button.textContent = 'Güncel menüyü yükle';
      button.onclick = async () => {
        try {
          receiveState(await json('/api/menu'));
          status('Güncel menü yüklendi. Kalan taslaklarınızı kontrol edip yayınlayabilirsiniz.');
        } catch (error) { status(error.message, true); }
      };
      $('admin-status').append(button);
    }
  } finally {
    saving = false;
    $('admin-items').inert = false;
    newForm.inert = false;
    refreshBar();
    $('admin-status').scrollIntoView({block: 'nearest'});
  }
};
async function checkPublication() {
  if (!pendingPublication || checkingPublication || saving || document.hidden) return;
  checkingPublication = true;
  try {
    const next = await json('/api/menu');
    if (next.revision <= pendingPublication.revision) return;
    const expected = pendingPublication;
    const matched = Object.entries(expected.changes).every(([id, amount]) => (next.prices[id] ?? null) === amount) &&
      expected.additions.every(product => (next.products || []).some(saved => saved.id === product.id));
    pendingPublication = null;
    receiveState(next);
    status(matched ? 'Menü yayınlandı. Ürünler ve fiyatlar güncellendi.' : 'Yeni bir menü yayınlandı. Kalan taslaklarınızı kontrol edin.', !matched);
  } catch {
    // Keep drafts until the published state can be read.
  } finally { checkingPublication = false; }
}
document.addEventListener('visibilitychange', checkPublication);
setInterval(checkPublication, 10000);
window.addEventListener('beforeunload', event => {
  if (drafts.size || additions.size) { event.preventDefault(); event.returnValue = ''; }
});
start();
