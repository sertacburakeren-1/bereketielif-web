export const validPrice = value => value === null ||
  (Number.isSafeInteger(value) && value >= 0 && value <= 999999999);

export function mergeCatalog(catalog, products = []) {
  return catalog.map(category => ({
    ...category,
    items: [...category.items, ...products.filter(product => product.categoryId === category.id)]
  }));
}

function invalid(message, status = 400) {
  throw Object.assign(new Error(message), {status});
}

export function applyMenuUpdate(current, payload, catalog) {
  const {revision, changes = {}, additions = []} = payload || {};
  if (!Number.isSafeInteger(revision) || revision < 0 || !changes ||
      typeof changes !== 'object' || Array.isArray(changes) || !Array.isArray(additions)) {
    invalid('Geçersiz menü değişikliği.');
  }
  if (revision !== current.revision) {
    invalid('Menü başka bir oturumda değişti. Güncel menüyü yükleyip taslaklarınızı kontrol edin.', 409);
  }
  const entries = Object.entries(changes);
  if (!entries.length && !additions.length) invalid('Yayınlanacak değişiklik bulunamadı.');
  const categories = new Set(catalog.map(category => category.id));
  const existing = mergeCatalog(catalog, current.products).flatMap(category => category.items);
  const ids = new Set(existing.map(product => product.id));
  const productKey = (category, name, note = '') =>
    [category, name.trim(), note.trim()].join('\n').normalize('NFC').toLocaleLowerCase('tr');
  const names = new Set(mergeCatalog(catalog, current.products).flatMap(category =>
    category.items.map(product => productKey(category.id, product.name, product.note))));
  const products = [...(current.products || [])];
  for (const product of additions) {
    if (!product || typeof product !== 'object' ||
        typeof product.id !== 'string' || !/^custom-[0-9a-f-]{36}$/.test(product.id) ||
        !categories.has(product.categoryId) || typeof product.name !== 'string' ||
        !product.name.trim() || product.name.trim().length > 120 ||
        (product.note !== undefined && (typeof product.note !== 'string' || product.note.trim().length > 250))) {
      invalid('Yeni ürünün adı, kategorisi veya açıklaması geçersiz.');
    }
    if (ids.has(product.id)) invalid('Bu ürün zaten kayıtlı. Güncel menüyü yükleyin.', 409);
    const name = product.name.trim();
    const note = (product.note || '').trim();
    const key = productKey(product.categoryId, name, note);
    if (names.has(key)) invalid('Aynı kategoride bu ad ve açıklamayla bir ürün zaten var.');
    products.push({id: product.id, categoryId: product.categoryId, name, note});
    ids.add(product.id);
    names.add(key);
  }
  const prices = {...current.prices};
  for (const [id, value] of entries) {
    if (!ids.has(id) || !validPrice(value)) invalid('Ürün veya fiyat geçersiz.');
    if (value === null) delete prices[id];
    else prices[id] = value;
  }
  return {revision: revision + 1, prices, products};
}
