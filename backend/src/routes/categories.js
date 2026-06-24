const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, color, sort_order } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)').run(id, name, color || '#6366f1', sort_order || 0);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  const { name, color, sort_order } = req.body;
  db.prepare('UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color), sort_order = COALESCE(?, sort_order) WHERE id = ?').run(name, color, sort_order, req.params.id);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(category);
});

router.delete('/:id', (req, res) => {
  const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(req.params.id);
  if (products.count > 0) {
    return res.status(400).json({ error: 'Cannot delete category with products' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
