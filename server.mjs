/* Pieni staattinen palvelin TET Arcadelle.
   Kaytto:  node server.mjs  [portti]
   Sitten selaimessa:  http://localhost:8080/

   Palvelin tarjoilee taman hakemiston tiedostot http://-osoitteesta, jolloin
   selaimen file://-originin rajoitukset (esim. "file: URLs are treated as
   unique security origins") eivat tule vastaan. Erityisesti etusivun
   games.json-lataus vaatii http-yhteyden. Ei riippuvuuksia. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8080;

const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
};

// Estetaan hakemistorajojen ulkopuolelle kurottelu.
function resolvePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    const relative = normalize(decoded).replace(/^([/\\])+/, '');
    const target = join(ROOT, relative === '' ? 'index.html' : relative);
    if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
    return target;
}

const server = createServer(async (req, res) => {
    const requested = req.url === '/' ? '/index.html' : req.url;
    const filePath = resolvePath(requested);

    if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Kiellety polku');
        return;
    }

    try {
        const info = await stat(filePath);
        const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
        const body = await readFile(target);

        res.writeHead(200, {
            'Content-Type': CONTENT_TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
            'Content-Length': body.length,
            'Cache-Control': 'no-cache',
        });
        res.end(body);
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Ei löytynyt: ' + requested);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`TET Arcade: http://localhost:${PORT}/`);
    console.log(`Tarjoillaan hakemistosta ${ROOT}`);
    console.log('Lopeta painamalla Ctrl+C.');
});
