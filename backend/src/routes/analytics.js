const express = require('express');
const db = require('../models/database');

const router = express.Router();

router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const orders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE date(created_at) = ? AND status = 'completed'`).get(today);

  const items = db.prepare(`SELECT COALESCE(SUM(oi.quantity), 0) as total_items FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) = ? AND o.status = 'completed'`).get(today);

  const topProducts = db.prepare(`SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) = ? AND o.status = 'completed' GROUP BY oi.product_id ORDER BY qty DESC LIMIT 5`).all(today);

  const hourly = db.prepare(`SELECT strftime('%H', created_at) as hour, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE date(created_at) = ? AND status = 'completed' GROUP BY hour ORDER BY hour`).all(today);

  res.json({
    date: today,
    total_orders: orders.count,
    total_revenue: orders.revenue,
    total_items_sold: items.total_items,
    average_order: orders.count > 0 ? Math.round(orders.revenue / orders.count * 100) / 100 : 0,
    top_products: topProducts,
    hourly_sales: hourly,
  });
});

router.get('/range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

  const daily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as orders, SUM(total) as revenue, SUM(total - tax_amount) as net_revenue FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed' GROUP BY date(created_at) ORDER BY date`).all(start, end);

  const summary = db.prepare(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue, COALESCE(AVG(total), 0) as avg_order FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed'`).get(start, end);

  const topProducts = db.prepare(`SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'completed' GROUP BY oi.product_id ORDER BY revenue DESC LIMIT 10`).all(start, end);

  const byPayment = db.prepare(`SELECT payment_method, COUNT(*) as count, SUM(total) as total FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed' GROUP BY payment_method`).all(start, end);

  res.json({ daily, summary, top_products: topProducts, by_payment_method: byPayment });
});

module.exports = router;
