const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Comprehensive MIME type mapping
// Zero-dependency replacement for 'mime-types'
const MIME_TYPES = {
  // Text / Web Standard
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.map': 'application/json',
  '.xml': 'application/xml',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.exr': 'image/x-exr',
  '.hdr': 'image/vnd.radiance',

  // Video / Audio
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',

  // 3D Models / CAD
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.usdz': 'model/vnd.usdz+zip',
  '.obj': 'model/obj',
  '.mtl': 'model/mtl',
  '.stl': 'model/stl',

  // Documents / Data
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const absolutePath = path.join(ROOT, decodedPath);

  // Trying to access outside the folder
  if (!absolutePath.startsWith(ROOT + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const getStats = async (p) => {
    try {
      const stats = await fs.promises.stat(p);
      return stats.isFile() ? stats : null;
    } catch {
      return null;
    }
  };

  const serveFile = (filePath, stats, statusCode = 200) => {
    const ext = path.extname(filePath).toLowerCase();

    // Default to binary stream if unknown type
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // --- Caching Logic ---
    const mtime = stats.mtime.toUTCString();
    res.setHeader('Last-Modified', mtime);

    // Handle 304 Not Modified
    if (req.headers['if-modified-since'] === mtime) {
      res.statusCode = 304;
      res.end();
      return;
    }

    // Cache-Control Headers
    if (ext === '.html' || ext === '.htm') {
      // HTML: Always validate with server to see if new deployment exists
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      // Assets: Cache for 1 year (Immutable)
      // Assumes build tools (Vite/Next) use hashed filenames for assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    res.statusCode = statusCode;

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.statusCode = 500;
      res.end();
    });
    stream.pipe(res);
  };

  try {
    // --- Resolution Strategy ---

    // 1. Exact Match (e.g. /style.css, /logo.png)
    let stats = await getStats(absolutePath);
    if (stats) return serveFile(absolutePath, stats);

    // 2. HTML Extension (Next.js Export: /about -> /about.html)
    const htmlPath = absolutePath + '.html';
    stats = await getStats(htmlPath);
    if (stats) return serveFile(htmlPath, stats);

    // 3. Directory Index (Standard Web: /blog -> /blog/index.html)
    const dirIndexPath = path.join(absolutePath, 'index.html');
    stats = await getStats(dirIndexPath);
    if (stats) return serveFile(dirIndexPath, stats);

    // 4. Missing File
    // If the URL has an extension at this point return 404.
    if (path.extname(absolutePath)) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // 5. Custom 404 (Next.js Exports)
    const custom404Path = path.join(ROOT, '404.html');
    stats = await getStats(custom404Path);
    if (stats) return serveFile(custom404Path, stats, 404);

    // 6. SPA Fallback
    const spaIndexPath = path.join(ROOT, 'index.html');
    stats = await getStats(spaIndexPath);
    if (stats) return serveFile(spaIndexPath, stats, 200);

    // 7. Hard 404
    res.statusCode = 404;
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Static Shim running on http://localhost:${PORT}`);
});
