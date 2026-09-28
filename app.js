const {createClient}=supabase;
const sb=createClient(OM_CONFIG.SUPABASE_URL,OM_CONFIG.SUPABASE_PUBLISHABLE_KEY);
let products=[],cart=[];
async function init(){if(OM_CONFIG.SUPABASE_URL.startsWith("PASTE_")){document.getElementById("products").innerHTML="<p>Supabase setup बाकी है। config.js में project URL और publishable key डालें.</p>";return}
const {data,error}=await sb.from("products").select("*").eq("active",true).order("created_at",{ascending:false});
if(error){document.getElementById("products").textContent=error.message;return}products=data||[];render();loadOrders()}
function render(){document.getElementById("products").innerHTML=products.map(p=>`<article class="card"><img src="${p.image_url||'assets/upi-qr.jpg'}"><div><h3>${p.name}</h3><p>${p.description||''}</p><p>Size: ${p.size||'Free Size'}</p><b>₹${p.price}</b><br><button onclick="add('${p.id}')">Add to Cart</button></div></article>`).join("")}
function add(id){let x=cart.find(i=>i.id===id);x?x.qty++:cart.push({id,qty:1});document.getElementById("count").textContent=cart.reduce((a,b)=>a+b.qty,0)}
function openCart(){document.getElementById("cart").classList.add("show");document.getElementById("cartItems").innerHTML=cart.map(x=>{let p=products.find(y=>y.id===x.id);return `<p>${p.name} × ${x.qty} — ₹${p.price*x.qty}</p>`}).join("")||"<p>Cart empty.</p>"}
function closeCart(){document.getElementById("cart").classList.remove("show")}
async function checkout(){if(!cart.length)return alert("Cart is empty");const {data:{user}}=await sb.auth.getUser();if(!user){hideAuth();return showAuth()}closeCart();document.getElementById("checkout").classList.add("show")}
function closeCheckout(){document.getElementById("checkout").classList.remove("show")}
function togglePay(){document.getElementById("qr").style.display=document.querySelector('input[name=pay]:checked').value==="UPI"?"block":"none"}
function showAuth(){document.getElementById("auth").classList.add("show")}function hideAuth(){document.getElementById("auth").classList.remove("show")}
async function signup(){let {error}=await sb.auth.signUp({email:email.value,password:password.value});authMsg.textContent=error?error.message:"Account created. Check your email if confirmation is enabled."}
async function login(){let {error}=await sb.auth.signInWithPassword({email:email.value,password:password.value});authMsg.textContent=error?error.message:"Logged in.";if(!error){hideAuth();loadOrders()}}
async function placeOrder(){const {data:{user}}=await sb.auth.getUser();if(!user)return showAuth();if(!name.value||!phone.value||!address.value)return alert("Please fill all details.");let method=document.querySelector('input[name=pay]:checked').value;
let total=40+cart.reduce((s,x)=>s+(products.find(p=>p.id===x.id).price*x.qty),0);
let payload={customer_name:name.value,phone:phone.value,address:address.value,payment_method:method,total,user_id:user.id};
const {data,error}=await sb.from("orders").insert(payload).select().single();if(error)return alert(error.message);
for(const x of cart){let p=products.find(p=>p.id===x.id);await sb.from("order_items").insert({order_id:data.id,product_id:p.id,product_name:p.name,price:p.price,quantity:x.qty})}
if(method==="UPI"){alert("अब secure payment gateway checkout जोड़ना बाकी है। Order created as pending.");}
else alert("COD order confirmed. Order ID: "+data.id);
cart=[];document.getElementById("count").textContent=0;closeCheckout();loadOrders();location.hash="#orders"}
async function loadOrders(){if(OM_CONFIG.SUPABASE_URL.startsWith("PASTE_"))return;const {data:{user}}=await sb.auth.getUser();if(!user){ordersList.innerHTML="<p>Login करके अपने orders देखें.</p>";return}const {data}=await sb.from("orders").select("*,order_items(*)").eq("user_id",user.id).order("created_at",{ascending:false});ordersList.innerHTML=(data||[]).map(o=>`<div class="order"><b>Order ${o.id}</b><p>Total ₹${o.total} · ${o.payment_method} · ${o.payment_status} · ${o.order_status}</p><p>${o.order_items.map(i=>i.product_name+" × "+i.quantity).join(", ")}</p></div>`).join("")||"<p>No orders yet.</p>"}
init();