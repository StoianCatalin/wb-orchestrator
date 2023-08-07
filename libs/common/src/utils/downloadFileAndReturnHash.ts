import * as crypto from 'crypto';
import * as https from 'https';
import * as fs from 'fs';
import * as http from "http";

export function downloadFileAndReturnHash(storagePath, url): Promise<string> {
  const writeStream = fs.createWriteStream(storagePath);
  // const writeStream = fs.createWriteStream(join(__dirname, '../../../', storagePath));
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
  };

  return new Promise((resolve, reject) => {
    let client = url.startsWith('http://') ? http : https;
    client.get(url, { headers }, (response) => {
      const hash = crypto.createHash('md5');
      response.on('data', (chunk) => {
        hash.update(chunk);
        writeStream.write(chunk);
      });
      response.on('end', () => {
        const hexDigest = hash.digest('hex');
        resolve(hexDigest);
        writeStream.end();
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}
