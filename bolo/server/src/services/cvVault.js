// Secure storage of CVs: type check by content, antivirus scan, AES-256-GCM encryption
// at rest, short-lived signed links for viewing.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// Detects the real type from the first bytes, never from the extension or the browser.
export function detectType(buf) {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04 && buf.includes('word/document.xml'))
    return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
}

function clamdScan(buf) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(config.clamavPort, config.clamavHost);
    let answer = '';
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error('Antivirus timeout')); });
    socket.on('data', (d) => { answer += d.toString(); });
    socket.on('end', () => resolve(!answer.includes('FOUND')));
    socket.on('error', reject);
    socket.write('zINSTREAM\0');
    for (let i = 0; i < buf.length; i += 64 * 1024) {
      const chunk = buf.subarray(i, i + 64 * 1024);
      const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length);
      socket.write(size); socket.write(chunk);
    }
    socket.end(Buffer.alloc(4));
  });
}

// Returns true when the file is clean. Uses ClamAV when CLAMAV_HOST is set;
// the EICAR signature is always checked so that the rule can be tested everywhere.
export async function scan(buf) {
  if (buf.includes(EICAR)) return false;
  if (config.clamavHost) return clamdScan(buf);
  return true;
}

export function encrypt(buf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.cvKey, iv);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decrypt(blob) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.cvKey, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}

async function extractText(buf, type) {
  try {
    if (type.ext === 'pdf') {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, verbosity: 0 }).promise;
      let text = '';
      for (let p = 1; p <= Math.min(doc.numPages, 5); p++) {
        const content = await (await doc.getPage(p)).getTextContent();
        text += content.items.map((i) => i.str).join(' ') + '\n';
      }
      return text;
    }
    if (type.ext === 'docx') {
      const mammoth = await import('mammoth');
      return (await mammoth.extractRawText({ buffer: buf })).value;
    }
  } catch { /* an unreadable text layer must not block the application */ }
  return '';
}

// Validates, scans, encrypts and stores an uploaded CV. Returns its metadata.
export async function storeCv(file) {
  if (!file) throw new HttpError(400, 'A CV file is required', 'cv_required');
  if (file.size > config.cvMaxBytes) throw new HttpError(413, 'File too large', 'file_too_large');
  const type = detectType(file.buffer);
  if (!type) throw new HttpError(415, 'Only PDF, Word (.docx) or a photo (JPG, PNG) are accepted', 'file_type');
  if (!(await scan(file.buffer))) throw new HttpError(422, 'The file was rejected by the antivirus', 'file_infected');
  const storageKey = `${crypto.randomUUID()}.${type.ext}.enc`;
  await fs.mkdir(config.storageDir, { recursive: true });
  await fs.writeFile(path.join(config.storageDir, storageKey), encrypt(file.buffer), { mode: 0o600 });
  return {
    storageKey,
    mime: type.mime,
    size: file.size,
    originalName: path.basename(file.originalname || `cv.${type.ext}`).slice(0, 200),
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    text: await extractText(file.buffer, type),
  };
}

export async function readCv(storageKey) {
  if (!/^[0-9a-f-]{36}\.(pdf|docx|jpg|png)\.enc$/.test(storageKey)) throw new HttpError(400, 'Bad key');
  return decrypt(await fs.readFile(path.join(config.storageDir, storageKey)));
}

export async function deleteCv(storageKey) {
  await fs.rm(path.join(config.storageDir, storageKey), { force: true });
}

// Signed link: cvId.userId.expiry.hmac — valid a few minutes, bound to one user.
export function signLink(cvId, userId, ttl = config.cvLinkTtlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const mac = crypto.createHmac('sha256', config.cvKey).update(`${cvId}.${userId}.${exp}`).digest('base64url');
  return { token: `${userId}.${exp}.${mac}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyLink(cvId, token) {
  const [userId, exp, mac] = String(token || '').split('.');
  if (!userId || !exp || !mac) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const expected = crypto.createHmac('sha256', config.cvKey).update(`${cvId}.${userId}.${exp}`).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return userId;
}
