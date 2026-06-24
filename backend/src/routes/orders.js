const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const router = express.Router();

function getNextOrderNumber() {
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(`SELECT MAX(order_number) as max_num FROM orders WHERE date(created_at) = ?`).get(today);
  return (result.max_num || 0) + 1;
}

router.get('/', (req, res) => {
  const { status, date, limit } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (date) {
    query += ' AND date(created_at) = ?';
    params.push(date);
  }
  query += ' ORDER BY created_at DESC';
  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

const createOrder = db.transaction((data) => {
  const { items, discount_amount, discount_type, payment_method, note } = data;
  const id = uuidv4();
  const orderNumber = getNextOrderNumber();

  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) throw new Error(`Product ${item.product_id} not found`);
    if (product.stock_quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

    const totalPrice = product.price * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      id: uuidv4(),
      order_id: id,
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: product.price,
      total_price: totalPrice,
      note: item.note || null,
    });

    db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime(\'now\') WHERE id = ?').run(item.quantity, product.id);
    db.prepare('INSERT INTO stock_transactions (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), product.id, 'out', item.quantity, `Order #${orderNumber}`);
  }

  const discountAmt = discount_amount || 0;
  const taxAmount = Math.round((subtotal - discountAmt) * 0.07 * 100) / 100;
  const total = Math.round((subtotal - discountAmt + taxAmount) * 100) / 100;

  db.prepare(`INSERT INTO orders (id, order_number, status, subtotal, discount_amount, discount_type, tax_amount, total, payment_method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, orderNumber, 'completed', subtotal, discountAmt, discount_type || null, taxAmount, total, payment_method || 'cash', note || null);

  const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const item of orderItems) {
    insertItem.run(item.id, item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.note);
  }

  db.prepare("UPDATE orders SET completed_at = datetime('now') WHERE id = ?").run(id);

  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
});

router.post('/', (req, res) => {
  try {
    const order = createOrder(req.body);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.status(201).json({ ...order, items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/void', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  const restoreStock = db.transaction(() => {
    for (const item of items) {
      db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
      db.prepare('INSERT INTO stock_transactions (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), item.product_id, 'in', item.quantity, `Void Order #${order.order_number}`);
    }
    db.prepare("UPDATE orders SET status = 'voided' WHERE id = ?").run(req.params.id);
  });
  restoreStock();

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ ...updated, items });
});

module.exports = router;
