import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractSd511Xml } from './sd511Zip.mjs';

function zipXml(xml, declaredSize = Buffer.byteLength(xml)) {
  const data = deflateRawSync(Buffer.from(xml));
  const name = Buffer.from('511.xml');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(data.length, 18); local.writeUInt32LE(declaredSize, 22);
  local.writeUInt16LE(name.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(8, 10);
  directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(declaredSize, 24);
  directory.writeUInt16LE(name.length, 28);
  const offset = local.length + name.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10); end.writeUInt32LE(directory.length + name.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([local, name, data, directory, name, end]);
}
test('extracts only a small 511.xml from the public feed container', () => {
  assert.equal(extractSd511Xml(zipXml('<?xml version="1.0"?><SDDOT></SDDOT>')),
    '<?xml version="1.0"?><SDDOT></SDDOT>');
});
test('rejects truncated and oversized ZIP content before XML reaches the browser', () => {
  assert.throws(() => extractSd511Xml(Buffer.from('not zip')), /ZIP size/);
  assert.throws(() => extractSd511Xml(zipXml('<SDDOT></SDDOT>', 2_000_001)), /unsupported/);
  assert.throws(() => extractSd511Xml(zipXml('<SDDOT></SDDOT>', 200)), /expanded size mismatch/);
});
