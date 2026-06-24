const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const categories = [
  { id: uuidv4(), name: 'Coffee', color: '#92400e', sort_order: 1 },
  { id: uuidv4(), name: 'Tea', color: '#166534', sort_order: 2 },
  { id: uuidv4(), name: 'Smoothie', color: '#9333ea', sort_order: 3 },
  { id: uuidv4(), name: 'Pastry', color: '#c2410c', sort_order: 4 },
  { id: uuidv4(), name: 'Sandwich', color: '#0369a1', sort_order: 5 },
  { id: uuidv4(), name: 'Snack', color: '#b91c1c', sort_order: 6 },
];

const products = [
  { name: 'Espresso', price: 3.50, category: 'Coffee', stock: 200, unit: 'cups' },
  { name: 'Americano', price: 4.00, category: 'Coffee', stock: 200, unit: 'cups' },
  { name: 'Latte', price: 5.00, category: 'Coffee', stock: 150, unit: 'cups' },
  { name: 'Cappuccino', price: 5.00, category: 'Coffee', stock: 150, unit: 'cups' },
  { name: 'Mocha', price: 5.50, category: 'Coffee', stock: 120, unit: 'cups' },
  { name: 'Cold Brew', price: 4.50, category: 'Coffee', stock: 100, unit: 'cups' },
  { name: 'Iced Latte', price: 5.50, category: 'Coffee', stock: 120, unit: 'cups' },
  { name: 'Matcha Latte', price: 5.50, category: 'Tea', stock: 100, unit: 'cups' },
  { name: 'Chai Latte', price: 5.00, category: 'Tea', stock: 100, unit: 'cups' },
  { name: 'Green Tea', price: 3.50, category: 'Tea', stock: 150, unit: 'cups' },
  { name: 'Earl Grey', price: 3.50, category: 'Tea', stock: 150, unit: 'cups' },
  { name: 'Iced Tea', price: 4.00, category: 'Tea', stock: 120, unit: 'cups' },
  { name: 'Mango Smoothie', price: 6.00, category: 'Smoothie', stock: 80, unit: 'cups' },
  { name: 'Berry Smoothie', price: 6.00, category: 'Smoothie', stock: 80, unit: 'cups' },
  { name: 'Banana Smoothie', price: 5.50, category: 'Smoothie', stock: 80, unit: 'cups' },
  { name: 'Croissant', price: 3.50, category: 'Pastry', stock: 30, unit: 'pcs' },
  { name: 'Muffin', price: 3.00, category: 'Pastry', stock: 25, unit: 'pcs' },
  { name: 'Scone', price: 3.00, category: 'Pastry', stock: 20, unit: 'pcs' },
  { name: 'Cinnamon Roll', price: 4.00, category: 'Pastry', stock: 20, unit: 'pcs' },
  { name: 'Cookie', price: 2.50, category: 'Snack', stock: 40, unit: 'pcs' },
  { name: 'Brownie', price: 3.50, category: 'Snack', stock: 30, unit: 'pcs' },
  { name: 'Club Sandwich', price: 7.50, category: 'Sandwich', stock: 15, unit: 'pcs' },
  { name: 'Grilled Cheese', price: 6.50, category: 'Sandwich', stock: 15, unit: 'pcs' },
  { name: 'BLT Sandwich', price: 7.00, category: 'Sandwich', stock: 15, unit: 'pcs' },
];

db.prepare('DELETE FROM stock_transactions').run();
db.prepare('DELETE FROM order_items').run();
db.prepare('DELETE FROM orders').run();
db.prepare('DELETE FROM products').run();
db.prepare('DELETE FROM categories').run();

const insertCat = db.prepare('INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
for (const c of categories) {
  insertCat.run(c.id, c.name, c.color, c.sort_order);
}

const insertProd = db.prepare('INSERT INTO products (id, name, price, category_id, stock_quantity, low_stock_threshold, unit) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertStock = db.prepare('INSERT INTO stock_transactions (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)');

for (const p of products) {
  const cat = categories.find(c => c.name === p.category);
  const id = uuidv4();
  insertProd.run(id, p.name, p.price, cat.id, p.stock, 10, p.unit);
  insertStock.run(uuidv4(), id, 'in', p.stock, 'Initial stock');
}

console.log(`Seeded ${categories.length} categories and ${products.length} products`);
