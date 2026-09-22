/**
 * Proxy local para el ERP. Evita CORS en desarrollo web.
 * Uso: npm run proxy
 * La app en web debe usar baseURL http://localhost:3001 (ver api.client.ts).
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PROXY_PORT = 3001;
const ERP_BASE = process.env.ERP_BASE_URL || 'http://80.58.154.71:8000';

const app = express();

// CORS: permitir que el front (localhost:8081) acceda a este proxy
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Reenviar todo al ERP (la app usa baseURL .../WcfServiceLibraryVerial, las rutas son /GetClientesWS, etc.)
app.use(
  '/',
  createProxyMiddleware({
    target: ERP_BASE,
    changeOrigin: true,
    // Quitar cabeceras que el ERP puede rechazar con 403 (Origin/Referer de localhost)
    onProxyReq(proxyReq, req, _res) {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
      proxyReq.removeHeader('Origin');
      proxyReq.removeHeader('Referer');
    },
    onProxyRes(proxyRes) {
      // Asegurar CORS en la respuesta que reenviamos
      proxyRes.headers['access-control-allow-origin'] = '*';
    },
    onError(err, req, res) {
      console.error('[proxy-erp] Error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify({ error: 'Proxy no pudo conectar con el ERP', detail: err.message }));
    },
  })
);

app.listen(PROXY_PORT, () => {
  console.log(`[proxy-erp] Proxy ERP escuchando en http://localhost:${PROXY_PORT} -> ${ERP_BASE}`);
  console.log(`[proxy-erp] En la app web usa baseURL: http://localhost:${PROXY_PORT}/WcfServiceLibraryVerial`);
});
