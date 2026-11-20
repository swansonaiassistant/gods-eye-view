import { inflateRawSync } from 'node:zlib';

/** Extract the one expected XML file from SD's small public ZIP feed. */
export function extractSd511Xml(input) {
  const zip = Buffer.from(input);
  if (zip.length < 52 || zip.length > 512_000) throw new Error('SD511 ZIP size is invalid');
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > zip.length || zip.readUInt16LE(eocd + 10) !== 1) {
    throw new Error('SD511 ZIP must contain one entry');
  }
  const directory = zip.readUInt32LE(eocd + 16);
  if (directory + 46 > zip.length || zip.readUInt32LE(directory) !== 0x02014b50) {
    throw new Error('SD511 ZIP directory is invalid');
  }
  const flags = zip.readUInt16LE(directory + 8);
  const method = zip.readUInt16LE(directory + 10);
  const compressedSize = zip.readUInt32LE(directory + 20);
  const uncompressedSize = zip.readUInt32LE(directory + 24);
  const filenameLength = zip.readUInt16LE(directory + 28);
  const extraLength = zip.readUInt16LE(directory + 30);
  const commentLength = zip.readUInt16LE(directory + 32);
  const localOffset = zip.readUInt32LE(directory + 42);
  if (flags & 1 || method !== 8 || !compressedSize || compressedSize > 512_000
    || !uncompressedSize || uncompressedSize > 2_000_000
    || directory + 46 + filenameLength + extraLength + commentLength > zip.length
    || zip.toString('utf8', directory + 46, directory + 46 + filenameLength) !== '511.xml') {
    throw new Error('SD511 ZIP entry is unsupported');
  }
  if (localOffset + 30 > directory || zip.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error('SD511 ZIP local header is invalid');
  }
  const start = localOffset + 30 + zip.readUInt16LE(localOffset + 26)
    + zip.readUInt16LE(localOffset + 28);
  if (start + compressedSize > directory) throw new Error('SD511 ZIP data exceeds entry');
  const xml = inflateRawSync(zip.subarray(start, start + compressedSize), { maxOutputLength: 2_000_000 });
  if (xml.length !== uncompressedSize) throw new Error('SD511 ZIP expanded size mismatch');
  if (!xml.subarray(0, 150).toString('utf8').includes('<SDDOT>')) {
    throw new Error('SD511 XML root is unexpected');
  }
  return xml.toString('utf8');
}
