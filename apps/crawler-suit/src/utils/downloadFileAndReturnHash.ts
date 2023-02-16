import * as crypto from 'crypto';
import * as https from 'https';
import * as fs from 'fs';

export function downloadFileAndReturnHash(storagePath, url): Promise<string> {
  const writeStream = fs.createWriteStream(storagePath);
  // const writeStream = fs.createWriteStream(join(__dirname, '../../../', storagePath));

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
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
