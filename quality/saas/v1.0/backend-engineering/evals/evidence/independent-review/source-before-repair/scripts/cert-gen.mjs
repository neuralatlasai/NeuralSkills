import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const openssl = process.env.OPENSSL_PATH || 'C:/Program Files/Git/usr/bin/openssl.exe';
export function generateCerts(directory) {
  if (!directory) throw new Error('A destination directory is required');
  const dir = resolve(directory);
  mkdirSync(dir, { recursive: true });
  const run = (...args) => execFileSync(openssl, args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
  run('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-subj', '/CN=Backend Fixture Ephemeral CA', '-days', '2');
  writeFileSync(join(dir, 'server.ext'), 'subjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth\n');
  for (const name of ['server', 'rotated', 'expired']) {
    run('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${name}.key`, '-out', `${name}.csr`, '-subj', '/CN=localhost');
    const validity = name === 'expired' ? ['-not_before','20200101000000Z','-not_after','20200102000000Z'] : ['-days','2'];
    run('x509', '-req', '-in', `${name}.csr`, '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', `${name}.pem`, ...validity, '-extfile', 'server.ext');
  }
  return {
    dir, ca: readFileSync(join(dir, 'ca.pem')),
    server: { key: readFileSync(join(dir, 'server.key')), cert: readFileSync(join(dir, 'server.pem')) },
    rotated: { key: readFileSync(join(dir, 'rotated.key')), cert: readFileSync(join(dir, 'rotated.pem')) },
    expired: { key: readFileSync(join(dir, 'expired.key')), cert: readFileSync(join(dir, 'expired.pem')) },
    openssl: run('version').trim()
  };
  } finally {
    // Private test keys are needed only during generation and then remain in process memory.
    for(const name of ['ca','server','rotated','expired']) { const path=join(dir,`${name}.key`); if(existsSync(path))unlinkSync(path); }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const destination = process.argv[2];
    if (!destination || destination.startsWith('--')) throw new Error('Usage: node scripts/cert-gen.mjs <destination-directory>');
    const certs = generateCerts(destination);
    console.log(JSON.stringify({ status: 'PASS', directory: certs.dir, openssl: certs.openssl }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
