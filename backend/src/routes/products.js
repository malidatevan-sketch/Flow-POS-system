const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const router = express.Router();

router.get('/', (req, res) => {
  const { category_id, search, available_only } = req.query;
  let query = `SELECT p.*, c.name as category_name, c.color as category_color
    FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];

  if (category_id) {
    query += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (search) {
    query += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }
  if (available_only === 'true') {
    query += ' AND p.is_available = 1';
  }
  query += ' ORDER BY c.sort_order, p.name';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = db.prepare(`SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { name, price, category_id, image_url, stock_quantity, low_stock_threshold, unit } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO products (id, name, price, category_id, image_url, stock_quantity, low_stock_threshold, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, price, category_id, image_url || null, stock_quantity || 0, low_stock_threshold || 10, unit || 'pcs');

  if (stock_quantity > 0) {
    db.prepare('INSERT INTO stock_transactions (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), id, 'in', stock_quantity, 'Initial stock');
  }

  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(id);
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const { name, price, category_id, image_url, low_stock_threshold, unit, is_available } = req.body;
  db.prepare(`UPDATE products SET
    name = COALESCE(?, name), price = COALESCE(?, price), category_id = COALESCE(?, category_id),
    image_url = COALESCE(?, image_url), low_stock_threshold = COALESCE(?, low_stock_threshold),
    unit = COALESCE(?, unit), is_available = COALESCE(?, is_available), updated_at = datetime('now')
    WHERE id = ?`).run(name, price, category_id, image_url, low_stock_threshold, unit, is_available, req.params.id);
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  res.json(product);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
