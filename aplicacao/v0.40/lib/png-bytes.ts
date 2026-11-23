export const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc = crcTable[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}
