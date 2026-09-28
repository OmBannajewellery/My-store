const { createClient } = supabase;
const sb = createClient(OM_CONFIG.SUPABASE_URL, OM_CONFIG.SUPABASE_PUBLISHABLE_KEY);
let products = [], cart = [];

const $ = (id) => document.getElementById(id);

async function init() {
  if (OM_CONFIG.SUPABASE_URL.startsWith("PASTE_")) {
    $("products").innerHTML = "<p>Supabase setup बाकी है। config.js में project URL और publishable key डालें.</p>";
    return;
  }

  sb.auth.onAuthStateChange((_event, session) => {
    updateAccountUI(session?.user || null);
    loadOrders();
  });

  const { data, error } = await sb.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
  if (error) {
    $("products").textContent = error.message;
    return;
  }
  products = data || [];
  render();
  const { data: sessionData } = await sb.auth.getSession();
  updateAccountUI(sessionData?.session?.user || null);
  loadOrders();
}

function updateAccountUI(user) {
  const area = $("accountArea");
  if (!area) return;
  if (!user) {
    area.innerHTML = '<button onclick="showAuth()">Login / Signup</button>';
    return;
  }
  const email = user.email || "My Account";
  area.innerHTML = `<span class="account-name" title="${escapeHtml(email)}">👤 ${escapeHtml(email)}</span> <button onclick="logout()">Logout</button>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function render() {
  $("products").innerHTML = products.map(p => `
    <article class="card">
      <img src="${p.image_url || 'assets/upi-qr.jpg'}" alt="${escapeHtml(p.name)}">
      <div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || '')}</p>
      <p>Size: ${escapeHtml(p.size || 'Free Size')}</p><b>₹${p.price}</b><br>
      <button onclick="add('${p.id}')">Add to Cart</button></div>
    </article>`).join("");
}

function add(id) {
  const x = cart.find(i => i.id === id);
  x ? x.qty++ : cart.push({ id, qty: 1 });
  $("count").textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function openCart() {
  $("cart").classList.add("show");
  $("cartItems").innerHTML = cart.map(x => {
    const p = products.find(y => y.id === x.id);
    return p ? `<p>${escapeHtml(p.name)} × ${x.qty} — ₹${p.price * x.qty}</p>` : "";
  }).join("") || "<p>Cart empty.</p>";
}
function closeCart() { $("cart").classList.remove("show"); }

async function checkout() {
  if (!cart.length) return alert("Cart is empty");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    closeCart();
    showAuth();
    return;
  }
  closeCart();
  $("checkout").classList.add("show");
}
function closeCheckout() { $("checkout").classList.remove("show"); }
function togglePay() { $("qr").style.display = document.querySelector('input[name=pay]:checked').value === "UPI" ? "block" : "none"; }
function showAuth() { $("auth").classList.add("show"); }
function hideAuth() { $("auth").classList.remove("show"); }

async function signup() {
  const emailValue = $("email").value.trim();
  const passwordValue = $("password").value;
  if (!emailValue || !passwordValue) return $("authMsg").textContent = "Email और password भरें.";
  if (passwordValue.length < 6) return $("authMsg").textContent = "Password कम से कम 6 characters का होना चाहिए.";
  const { data, error } = await sb.auth.signUp({ email: emailValue, password: passwordValue });
  if (error) {
    $("authMsg").textContent = error.message;
    return;
  }
  if (data.session?.user) {
    $("authMsg").textContent = "Account बन गया और आप login हैं.";
    updateAccountUI(data.session.user);
    setTimeout(hideAuth, 500);
  } else {
    $("authMsg").textContent = "Account बन गया. Email confirmation मांगी जाए तो email verify करके Login करें.";
  }
}

async function login() {
  const emailValue = $("email").value.trim();
  const passwordValue = $("password").value;
  if (!emailValue || !passwordValue) return $("authMsg").textContent = "Email और password भरें.";
  const { data, error } = await sb.auth.signInWithPassword({ email: emailValue, password: passwordValue });
  if (error) {
    $("authMsg").textContent = error.message;
    return;
  }
  updateAccountUI(data.user);
  $("authMsg").textContent = "Login successful.";
  setTimeout(hideAuth, 400);
  loadOrders();
}

async function logout() {
  await sb.auth.signOut();
  updateAccountUI(null);
  $("ordersList").innerHTML = "<p>Login करके अपने orders देखें.</p>";
}

async function placeOrder() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { closeCheckout(); return showAuth(); }

  const customerName = $("name").value.trim();
  const phone = $("phone").value.trim();
  const address = $("address").value.trim();
  const pincode = $("pincode").value.trim();

  // Validate each field separately so the customer knows exactly what is missing.
  if (!customerName) return alert("Please enter your full name.");
  if (!phone) return alert("Please enter your mobile number.");
  if (!/^\d{10}$/.test(phone)) return alert("Please enter a valid 10-digit mobile number.");
  if (!address) return alert("Please enter your complete address.");
  if (!pincode) return alert("Please enter your 6-digit pincode.");
  if (!/^\d{6}$/.test(pincode)) return alert("Please enter a valid 6-digit pincode.");
  if (!cart.length) return alert("Your cart is empty.");

  const method = document.querySelector('input[name=pay]:checked').value;
  const total = Number(OM_CONFIG.DELIVERY_CHARGE || 40) + cart.reduce((s, x) => {
    const p = products.find(p => p.id === x.id);
    return s + (p ? Number(p.price) * x.qty : 0);
  }, 0);

  // Keep pincode with the address so the existing database schema remains compatible.
  const fullAddress = `${address}, Pincode: ${pincode}`;
  const payload = { customer_name: customerName, phone, address: fullAddress, payment_method: method, total, user_id: user.id };
  const { data, error } = await sb.from("orders").insert(payload).select().single();
  if (error) return alert(error.message);

  for (const x of cart) {
    const p = products.find(p => p.id === x.id);
    if (p) await sb.from("order_items").insert({ order_id: data.id, product_id: p.id, product_name: p.name, price: p.price, quantity: x.qty });
  }

  if (method === "UPI") {
    alert("Order created. UPI payment is pending confirmation. Automatic payment verification अभी connected नहीं है.");
  } else {
    alert("COD order confirmed. Order ID: " + data.id);
  }

  cart = [];
  $("count").textContent = 0;
  closeCheckout();
  loadOrders();
  location.hash = "#orders";
}

async function loadOrders() {
  if (OM_CONFIG.SUPABASE_URL.startsWith("PASTE_")) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    $("ordersList").innerHTML = "<p>Login करके अपने orders देखें.</p>";
    return;
  }
  const { data, error } = await sb.from("orders").select("*,order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) {
    $("ordersList").innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }
  $("ordersList").innerHTML = (data || []).map(o => `
    <div class="order"><b>Order ${escapeHtml(o.id)}</b>
    <p>Total ₹${o.total} · ${escapeHtml(o.payment_method)} · ${escapeHtml(o.payment_status)} · ${escapeHtml(o.order_status)}</p>
    <p>${(o.order_items || []).map(i => escapeHtml(i.product_name) + " × " + i.quantity).join(", ")}</p></div>`).join("") || "<p>No orders yet.</p>";
}

init();
