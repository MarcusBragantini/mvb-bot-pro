// Proxy para admin.js com rota /users
const adminHandler = require('../admin');

module.exports = async function handler(req, res) {
  // Reescrever a URL para incluir /api/admin
  req.url = '/api/admin/users' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  return adminHandler(req, res);
};



