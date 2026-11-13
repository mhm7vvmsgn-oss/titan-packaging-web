import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDSx_MuJ1C_IOXFj037sjH5qxbFuBq_gGg',
  authDomain: 'titan-packaging-84c77.firebaseapp.com',
  projectId: 'titan-packaging-84c77',
  storageBucket: 'titan-packaging-84c77.firebasestorage.app',
  messagingSenderId: '1096645578198',
  appId: '1:1096645578198:web:597326c7e07fb391a9e877',
  measurementId: 'G-DP6N8DQZ3N'
};
const ADMIN_EMAIL = 'mr.surasak.kitisak@gmail.com';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const productsRef = collection(db, 'products');
const $ = id => document.getElementById(id);
const money = n => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const state = { products: [], cart: new Map(), admin: false };
function showError(error) { console.error(error); $('error').textContent = error?.message || String(error); }
function clearError() { $('error').textContent = ''; }
function isAdmin(user) { return !!user && user.email === ADMIN_EMAIL && user.emailVerified; }
function button(text, callback, className = '') {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = text;
  if (className) el.className = className;
  el.addEventListener('click', callback); return el;
}
function renderProducts() {
  const root = $('products'); root.replaceChildren();
  const q = $('search').value.trim().toLocaleLowerCase('th');
  const filtered = state.products.filter(p => p.name.toLocaleLowerCase('th').includes(q));
  if (!filtered.length) { const p = document.createElement('p'); p.textContent = state.products.length ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในฐานข้อมูล'; root.append(p); return; }
  for (const p of filtered) {
    const item = document.createElement('div'); item.className = 'item';
    const name = document.createElement('strong'); name.textContent = p.name;
    const price = document.createElement('div'); price.textContent = money(p.price) + ' บาท / ชิ้น';
    const actions = document.createElement('div'); actions.className = 'line';
    actions.append(button('เพิ่มลงรายการ', () => { state.cart.set(p.id, (state.cart.get(p.id) || 0) + 1); renderCart(); }));
    if (state.admin) {
      actions.append(button('แก้ไข', () => {
        $('productId').value = p.id; $('name').value = p.name; $('price').value = p.price;
        $('adminPanel').scrollIntoView({ behavior: 'smooth' });
      }, 'secondary'));
      actions.append(button('ลบ', async () => {
        if (!confirm('ลบสินค้า ' + p.name + ' ใช่หรือไม่?')) return;
        try { clearError(); await deleteDoc(doc(db, 'products', p.id)); state.cart.delete(p.id); renderCart(); }
        catch (e) { showError(e); }
      }, 'secondary'));
    }
    item.append(name, price, actions); root.append(item);
  }
}
function renderCart() {
  const root = $('cart'); root.replaceChildren(); let total = 0;
  for (const [id, qty] of state.cart) {
    const p = state.products.find(x => x.id === id);
    if (!p) { state.cart.delete(id); continue; }
    total += p.price * qty;
    const line = document.createElement('div'); line.className = 'item';
    const name = document.createElement('div'); name.textContent = p.name + ' — ' + money(p.price) + ' บาท';
    const controls = document.createElement('div'); controls.className = 'line';
    const quantity = document.createElement('input'); quantity.type = 'number'; quantity.min = '0'; quantity.step = '1'; quantity.value = qty; quantity.setAttribute('aria-label', 'จำนวน ' + p.name);
    quantity.addEventListener('change', () => {
      const n = Number(quantity.value);
      if (!Number.isSafeInteger(n) || n < 0) { quantity.value = state.cart.get(id); return; }
      if (n === 0) state.cart.delete(id); else state.cart.set(id, n);
      renderCart();
    });
    const subtotal = document.createElement('span'); subtotal.textContent = 'รวม ' + money(p.price * qty) + ' บาท';
    controls.append(quantity, subtotal, button('ลบ', () => { state.cart.delete(id); renderCart(); }, 'secondary'));
    line.append(name, controls); root.append(line);
  }
  if (!state.cart.size) { const p = document.createElement('p'); p.textContent = 'ยังไม่มีรายการคำนวณ'; root.append(p); }
  $('total').textContent = 'รวม ' + money(total) + ' บาท';
}
function resetForm() { $('productForm').reset(); $('productId').value = ''; }
$('search').addEventListener('input', renderProducts);
$('clear').addEventListener('click', () => { state.cart.clear(); renderCart(); });
$('cancel').addEventListener('click', resetForm);
$('productForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!state.admin) return;
  const name = $('name').value.trim(), price = Number($('price').value), id = $('productId').value;
  if (!name || !Number.isFinite(price) || price < 0) { $('error').textContent = 'กรุณาระบุชื่อและราคาที่ถูกต้อง'; return; }
  try {
    clearError();
    if (id) await updateDoc(doc(db, 'products', id), { name, price, updatedAt: serverTimestamp() });
    else await addDoc(productsRef, { name, price, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    resetForm();
  } catch (e) { showError(e); }
});
$('login').addEventListener('click', async () => {
  clearError();
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      try { await signInWithRedirect(auth, provider); } catch (redirectError) { showError(redirectError); }
    } else if (e.code !== 'auth/popup-closed-by-user') showError(e);
  }
});
$('logout').addEventListener('click', async () => { try { await signOut(auth); } catch (e) { showError(e); } });
getRedirectResult(auth).catch(showError);
onAuthStateChanged(auth, user => {
  state.admin = isAdmin(user);
  $('adminPanel').style.display = state.admin ? 'block' : 'none';
  $('login').hidden = !!user;
  $('logout').hidden = !user;
  $('status').textContent = user ? (state.admin ? 'ผู้ดูแล: ' + user.email : 'เข้าสู่ระบบ: ' + user.email + ' (ไม่มีสิทธิ์แก้ไข)') : 'ลูกค้าสามารถดูราคาและคำนวณได้โดยไม่ต้องเข้าสู่ระบบ';
  if (!state.admin) resetForm();
  renderProducts();
});
onSnapshot(productsRef, snapshot => {
  state.products = snapshot.docs.map(d => ({ id: d.id, name: String(d.data().name || ''), price: Number(d.data().price) })).filter(p => p.name && Number.isFinite(p.price) && p.price >= 0).sort((a,b) => a.name.localeCompare(b.name, 'th'));
  renderProducts(); renderCart();
}, showError);
renderCart();
