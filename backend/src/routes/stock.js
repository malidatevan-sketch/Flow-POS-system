const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const router = express.Router();

router.get('/levels', (req, res) => {
  const products = db.prepare(`SELECT p.id, p.name, p.stock_quantity, p.low_stock_threshold, p.unit, c.name as category_name,
    CASE WHEN p.stock_quantity <= 0 THEN 'out_of_stock'
         WHEN p.stock_quantity <= p.low_stock_threshold THEN 'low_stock'
         ELSE 'in_stock' END as stock_status
    FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.stock_quantity ASC`).all();
  res.json(products);
});

router.get('/alerts', (req, res) => {
  const alerts = db.prepare(`SELECT p.id, p.name, p.stock_quantity, p.low_stock_threshold, p.unit, c.name as category_name
    FROM products p JOIN categories c ON p.category_id = c.id
    WHERE p.stock_quantity <= p.low_stock_threshold ORDER BY p.stock_quantity ASC`).all();
  res.json(alerts);
});

router.post('/adjust', (req, res) => {
  const { product_id, type, quantity, reason } = req.body;
  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'product_id, type, and quantity are required' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const adjust = db.transaction(() => {
    if (type === 'in') {
      db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = datetime(\'now\') WHERE id = ?').run(quantity, product_id);
    } else if (type === 'out') {
      if (product.stock_quantity < quantity) throw new Error('Insufficient stock');
      db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime(\'now\') WHERE id = ?').run(quantity, product_id);
    } else {
      throw new Error('Invalid type. Use "in" or "out"');
    }

    db.prepare('INSERT INTO stock_transactions (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), product_id, type, quantity, reason || 'Manual adjustment');
  });

  try {
    adjust();
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/transactions', (req, res) => {
  const { product_id, limit } = req.query;
  let query = `SELECT st.*, p.name as product_name FROM stock_transactions st JOIN products p ON st.product_id = p.id WHERE 1=1`;
  const params = [];

  if (product_id) {
    query += ' AND st.product_id = ?';
    params.push(product_id);
  }
  query += ' ORDER BY st.created_at DESC';
  query += ` LIMIT ?`;
  params.push(parseInt(limit) || 100);

  const transactions = db.prepare(query).all(...params);
  res.json(transactions);
});

module.exports = router;
