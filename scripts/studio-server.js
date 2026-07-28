'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const SiteConfig = require('../js/site-config.js');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'site-config.json');
const STATE_DIR = path.join(ROOT, '.site-studio');
const HISTORY_DIR = path.join(STATE_DIR, 'history');
const ASSET_DIR = path.join(ROOT, 'assets', 'custom');
const MAX_BODY = 6 * 1024 * 1024;

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const HOST = getArg('--host', '127.0.0.1');
const PORT = Number(getArg('--port', '4173'));
const SHOULD_OPEN = process.argv.includes('--open');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.cur': 'image/x-icon',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.webm': 'video/webm'
};

async function ensureDirs() {
  await fsp.mkdir(HISTORY_DIR, { recursive: true });
  await fsp.mkdir(ASSET_DIR, { recursive: true });
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw badRequest('请求内容超过 6MB');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw badRequest('请求内容不是有效 JSON');
  }
}

async function readConfig() {
  return JSON.parse(await fsp.readFile(CONFIG_PATH, 'utf8'));
}

async function writeAtomic(filePath, content) {
  const temp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  await fsp.writeFile(temp, content, 'utf8');
  await fsp.rename(temp, filePath);
}

function historyName(date) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '') + '.json';
}

async function backupConfig(config) {
  const file = historyName(new Date());
  await writeAtomic(path.join(HISTORY_DIR, file), JSON.stringify(config, null, 2) + '\n');
  const files = (await fsp.readdir(HISTORY_DIR))
    .filter((name) => /^\d{4}-\d{2}-\d{2}_.*\.json$/.test(name))
    .sort().reverse();
  await Promise.all(files.slice(20).map((name) => fsp.unlink(path.join(HISTORY_DIR, name))));
}

async function saveConfig(nextConfig) {
  const validation = SiteConfig.validateConfig(nextConfig);
  if (!validation.valid) {
    const error = new Error(validation.errors.join('；'));
    error.statusCode = 400;
    throw error;
  }
  const current = await readConfig();
  const normalized = SiteConfig.normalizeConfig(nextConfig, current);
  const normalizedValidation = SiteConfig.validateConfig(normalized);
  if (!normalizedValidation.valid) {
    const error = new Error(normalizedValidation.errors.join('；'));
    error.statusCode = 400;
    throw error;
  }
  await backupConfig(current);
  await writeAtomic(CONFIG_PATH, JSON.stringify(normalized, null, 2) + '\n');
  return normalized;
}

async function listHistory() {
  const files = (await fsp.readdir(HISTORY_DIR))
    .filter((name) => /^\d{4}-\d{2}-\d{2}_.*\.json$/.test(name))
    .sort().reverse().slice(0, 20);
  return Promise.all(files.map(async (name) => {
    const stat = await fsp.stat(path.join(HISTORY_DIR, name));
    return { id: name, savedAt: stat.mtime.toISOString(), size: stat.size };
  }));
}

async function restoreHistory(id) {
  if (!/^\d{4}-\d{2}-\d{2}_[A-Za-z0-9-]+\.json$/.test(id || '')) {
    const error = new Error('历史版本编号无效');
    error.statusCode = 400;
    throw error;
  }
  const restored = JSON.parse(await fsp.readFile(path.join(HISTORY_DIR, id), 'utf8'));
  return saveConfig(restored);
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(value || ''));
  if (!match) throw badRequest('素材数据格式无效');
  return { mime: match[1].toLowerCase(), bytes: Buffer.from(match[2].replace(/\s/g, ''), 'base64') };
}

function imageDimensions(mime, bytes) {
  if (mime === 'image/png' && bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if ((mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon') &&
      bytes.length >= 22 && bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 2) {
    return {
      width: bytes[6] === 0 ? 256 : bytes[6],
      height: bytes[7] === 0 ? 256 : bytes[7]
    };
  }
  return null;
}

function hasImageSignature(mime, bytes) {
  if (mime === 'image/png') return !!imageDimensions(mime, bytes);
  if (mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon') return !!imageDimensions(mime, bytes);
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/webp') {
    return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

async function saveAsset(payload) {
  const kind = ['cursor', 'avatar', 'project-icon'].includes(payload.kind) ? payload.kind : null;
  if (!kind) throw badRequest('素材类型无效');
  const parsed = parseDataUrl(payload.data);
  const extensions = {
    'image/png': '.png',
    'image/x-icon': '.cur',
    'image/vnd.microsoft.icon': '.cur',
    'image/jpeg': '.jpg',
    'image/webp': '.webp'
  };
  const extension = extensions[parsed.mime];
  if (!extension) throw badRequest('仅支持 PNG、CUR、JPG 或 WEBP 图片');
  if (!hasImageSignature(parsed.mime, parsed.bytes)) throw badRequest('素材文件内容与格式不匹配');
  if (kind === 'cursor' && !['.png', '.cur'].includes(extension)) {
    throw badRequest('光标只支持 PNG 或 CUR');
  }
  if (kind === 'cursor') {
    const dimensions = imageDimensions(parsed.mime, parsed.bytes);
    if (!dimensions || dimensions.width > 128 || dimensions.height > 128) {
      throw badRequest('光标尺寸不能超过 128 × 128');
    }
  }
  const limit = kind === 'cursor' ? 512 * 1024 : 3 * 1024 * 1024;
  if (!parsed.bytes.length || parsed.bytes.length > limit) throw badRequest('素材文件大小不符合限制');
  const hash = crypto.createHash('sha256').update(parsed.bytes).digest('hex').slice(0, 12);
  const fileName = kind + '-' + Date.now() + '-' + hash + extension;
  const target = path.join(ASSET_DIR, fileName);
  await fsp.writeFile(target, parsed.bytes, { flag: 'wx' });
  return { path: 'assets/custom/' + fileName, size: parsed.bytes.length, mime: parsed.mime };
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { ok: true, version: SiteConfig.VERSION });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/config') {
    json(res, 200, { config: await readConfig() });
    return true;
  }
  if (req.method === 'PUT' && url.pathname === '/api/config') {
    const payload = await readJsonBody(req);
    json(res, 200, { ok: true, config: await saveConfig(payload.config) });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/history') {
    json(res, 200, { history: await listHistory() });
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/history/restore') {
    const payload = await readJsonBody(req);
    json(res, 200, { ok: true, config: await restoreHistory(payload.id) });
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/assets') {
    const payload = await readJsonBody(req);
    json(res, 201, { ok: true, asset: await saveAsset(payload) });
    return true;
  }
  return false;
}

async function serveStatic(req, res, url) {
  let relative = decodeURIComponent(url.pathname);
  if (relative === '/') relative = '/index.html';
  const target = path.resolve(ROOT, '.' + relative);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const stat = await fsp.stat(target);
    if (!stat.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': path.basename(target) === 'site-config.json' ? 'no-store' : 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

async function start() {
  await ensureDirs();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://' + (req.headers.host || '127.0.0.1'));
    try {
      if (url.pathname.startsWith('/api/') && await handleApi(req, res, url)) return;
      await serveStatic(req, res, url);
    } catch (error) {
      json(res, error.statusCode || 500, { ok: false, error: error.message || '服务器错误' });
    }
  });
  server.listen(PORT, HOST, () => {
    const url = 'http://' + (HOST === '0.0.0.0' ? '127.0.0.1' : HOST) + ':' + PORT + '/editor.html';
    console.log('Site Studio 已启动：' + url);
    console.log('公开主页：http://' + (HOST === '0.0.0.0' ? '127.0.0.1' : HOST) + ':' + PORT + '/');
    if (SHOULD_OPEN && process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
    }
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
