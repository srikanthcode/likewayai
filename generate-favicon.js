// Create a minimal valid favicon.ico directly (no dependencies)
const fs = require('fs');
const path = require('path');

// Build a 16x16 ICO with dark background + cyan "L"
// ICO format: header(6) + dirEntry(16) + PNG data

// Create a 16x16 RGBA pixel buffer
const W = 16, H = 16;
const pixels = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = b; pixels[i+1] = g; pixels[i+2] = r; pixels[i+3] = a;
}

// Fill dark background
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    setPixel(x, y, 5, 5, 5, 255);

// Draw "L" shape in cyan-to-violet gradient
const gradColors = [
  [6, 182, 212],   // cyan
  [99, 102, 241],  // indigo
  [139, 92, 246],  // violet
  [168, 85, 247],  // purple
];

function lerpColor(t) {
  const idx = Math.min(Math.floor(t * gradColors.length), gradColors.length - 2);
  const frac = (t * gradColors.length) - idx;
  const a = gradColors[idx], b = gradColors[idx + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
}

// Vertical bar of L
for (let y = 3; y <= 12; y++) {
  const t = (y - 3) / 9;
  const [r, g, b] = lerpColor(t);
  for (let x = 4; x <= 6; x++) setPixel(x, y, r, g, b);
}
// Horizontal bar of L
for (let x = 4; x <= 11; x++) {
  const t = (x - 4) / 7;
  const [r, g, b] = lerpColor(0.3 + t * 0.4);
  for (let y = 10; y <= 12; y++) setPixel(x, y, r, g, b);
}
// Small cyan dot
for (let dy = -1; dy <= 1; dy++)
  for (let dx = -1; dx <= 1; dx++)
    if (dx*dx + dy*dy <= 1) setPixel(12 + dx, 3 + dy, 6, 182, 212);

// Build PNG from raw pixels
function createPNG(w, h, rgba) {
  const zlib = require('zlib');
  
  // PNG raw data: filter byte (0) + RGBA per row
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // no filter
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  
  const deflated = zlib.deflateSync(raw);
  
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))]);
}

const png = createPNG(W, H, pixels);

// ICO: 6-byte header + 16-byte dir entry + PNG data
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);     // reserved
icoHeader.writeUInt16LE(1, 2);     // type: icon
icoHeader.writeUInt16LE(1, 4);     // count: 1

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(W >= 256 ? 0 : W, 0);   // width
icoDir.writeUInt8(H >= 256 ? 0 : H, 1);   // height
icoDir.writeUInt8(0, 2);           // color palette
icoDir.writeUInt8(0, 3);           // reserved
icoDir.writeUInt16LE(1, 4);        // color planes
icoDir.writeUInt16LE(32, 6);       // bits per pixel
icoDir.writeUInt32LE(png.length, 8);  // image data size
icoDir.writeUInt32LE(22, 12);      // offset (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, icoDir, png]);
const outPath = path.join(__dirname, 'public', 'favicon.ico');
fs.writeFileSync(outPath, ico);
console.log('Created favicon.ico:', ico.length, 'bytes');
