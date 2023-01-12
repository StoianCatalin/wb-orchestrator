import * as crypto from 'crypto';
import * as https from 'https';

export function getFileHash(url): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const hash = crypto.createHash('md5');
      response.on('data', (chunk) => {
        hash.update(chunk);
      });
      response.on('end', () => {
        const hexDigest = hash.digest('hex');
        resolve(hexDigest);
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}
