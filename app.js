// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyBimCHLmGA3YBV0k8X-i2Hdpe2H3qYJ5UA",
  authDomain: "campusconnect-4c760.firebaseapp.com",
  databaseURL: "https://campusconnect-4c760-default-rtdb.firebaseio.com",
  projectId: "campusconnect-4c760",
  storageBucket: "campusconnect-4c760.firebasestorage.app",
  messagingSenderId: "238765550877",
  appId: "1:238765550877:web:ea106c6858dda2e77505f4",
  measurementId: "G-NG7FSBM686"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
console.log("✅ Firebase Connected");

// ===== CART =====
let cart = [];
let isAdmin = false;

// Render menu from Firebase
const menuGrid = document.getElementById("menu-grid");
const menuRef = ref(db, "menu");

function renderMenu(snapshot) {
  menuGrid.innerHTML = "";
  const items = snapshot.val() || {};
  const categories = {};

  // Group items by category
  Object.keys(items).forEach((key) => {
    const item = items[key];
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push({ key, ...item });
  });

  Object.entries(categories).forEach(([category, items]) => {
    const div = document.createElement("div");
    div.classList.add("category");
    div.innerHTML = `<h3>${category}</h3>`;
    items.forEach((i) => {
      const el = document.createElement("div");
      el.classList.add("menu-item");
      el.innerHTML = `
        <span>${i.name}</span>
        <span>₹${i.price}</span>
        <button onclick="addToCart('${i.name}', ${i.price})">Add</button>
      `;
      div.appendChild(el);
    });
    menuGrid.appendChild(div);
  });
}

onValue(menuRef, renderMenu);

// ===== CART =====
window.addToCart = function (name, price) {
  cart.push({ name, price });
  renderCart();
};

function renderCart() {
  const list = document.getElementById("cart-list");
  const total = document.getElementById("cart-total");
  list.innerHTML = "";
  let sum = 0;
  cart.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} - ₹${item.price}`;
    list.appendChild(li);
    sum += item.price;
  });
  total.textContent = sum;
}

// ===== PLACE ORDER =====
document.getElementById("place-order").addEventListener("click", () => {
  if (cart.length === 0) return alert("Your cart is empty!");
  const name = prompt("Enter your name:");
  if (!name) return;

  const ordersRef = ref(db, "orders");
  push(ordersRef, {
    name,
    items: cart,
    timestamp: new Date().toISOString(),
    status: "queued"
  });
  alert("✅ Order placed successfully!");
  cart = [];
  renderCart();
});

// ===== LIVE QUEUE =====
const queueRef = ref(db, "orders");
const queueList = document.getElementById("queue-list");
onValue(queueRef, (snapshot) => {
  queueList.innerHTML = "";
  snapshot.forEach((snap) => {
    const o = snap.val();
    const li = document.createElement("li");
    li.textContent = `${o.name}: ${o.items.map((i) => i.name).join(", ")} (${o.status})`;
    queueList.appendChild(li);
  });
});

// ===== ADMIN LOGIN =====
const ADMIN_PASSWORD = "canteen123";
const adminLoginBtn = document.getElementById("admin-login");
const adminPassInput = document.getElementById("admin-pass");
const adminLoginForm = document.getElementById("admin-login-form");
const adminControls = document.getElementById("admin-controls");
const adminMenuList = document.getElementById("admin-menu-list");
const adminQueueList = document.getElementById("admin-queue-list");

if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", () => {
    if (adminPassInput.value.trim() === ADMIN_PASSWORD) {
      isAdmin = true;
      localStorage.setItem("isAdmin", "true");
      alert("✅ Admin access granted!");
      adminLoginForm.style.display = "none";
      adminControls.style.display = "block";
      loadAdminData();
    } else {
      alert("❌ Incorrect password!");
    }
  });
}

// Keep admin session active
if (localStorage.getItem("isAdmin") === "true") {
  isAdmin = true;
  adminLoginForm.style.display = "none";
  adminControls.style.display = "block";
  loadAdminData();
}

// ===== ADMIN MENU MANAGEMENT =====
const itemName = document.getElementById("item-name");
const itemPrice = document.getElementById("item-price");
const itemCategory = document.getElementById("item-category");
const addItemBtn = document.getElementById("add-item");

addItemBtn.addEventListener("click", () => {
  const name = itemName.value.trim();
  const price = parseFloat(itemPrice.value);
  const category = itemCategory.value.trim() || "Uncategorized";
  if (!name || !price) return alert("Please enter valid item details!");
  const newRef = push(menuRef);
  set(newRef, { name, price, category });
  itemName.value = "";
  itemPrice.value = "";
  itemCategory.value = "";
});

function loadAdminData() {
  // Menu management
  onValue(menuRef, (snapshot) => {
    adminMenuList.innerHTML = "";
    snapshot.forEach((snap) => {
      const key = snap.key;
      const item = snap.val();
      const li = document.createElement("li");
      li.innerHTML = `
        ${item.name} - ₹${item.price} (${item.category})
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      `;

      li.querySelector(".edit-btn").addEventListener("click", () => {
        const newName = prompt("New name:", item.name) || item.name;
        const newPrice = parseFloat(prompt("New price:", item.price)) || item.price;
        const newCategory = prompt("New category:", item.category) || item.category;
        update(ref(db, "menu/" + key), {
          name: newName,
          price: newPrice,
          category: newCategory
        });
      });

      li.querySelector(".delete-btn").addEventListener("click", () => {
        if (confirm(`Delete ${item.name}?`)) remove(ref(db, "menu/" + key));
      });

      adminMenuList.appendChild(li);
    });
  });

  // Queue management
  onValue(queueRef, (snapshot) => {
    adminQueueList.innerHTML = "";
    snapshot.forEach((snap) => {
      const key = snap.key;
      const o = snap.val();
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${o.name}</strong> — ${o.items.map((i) => i.name).join(", ")}
        <br><small>${new Date(o.timestamp).toLocaleTimeString()}</small>
      `;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.style.backgroundColor = "#4b2e05";
      removeBtn.style.color = "white";
      removeBtn.style.border = "none";
      removeBtn.style.borderRadius = "6px";
      removeBtn.style.padding = "8px 14px";
      removeBtn.style.cursor = "pointer";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => remove(ref(db, "orders/" + key)));
      li.appendChild(removeBtn);
      adminQueueList.appendChild(li);
    });
  });
}
