import { APCAcontrast, sRGBtoY } from 'apca-w3';

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return { r: parseInt(h.substring(0,2),16)/255, g: parseInt(h.substring(2,4),16)/255, b: parseInt(h.substring(4,6),16)/255 };
}

const fg = hexToRgb('#45ad7f');
const bg = hexToRgb('#19332A');
console.log('fg', fg, 'bg', bg);
const tY = sRGBtoY([fg.r*255, fg.g*255, fg.b*255]);
const bY = sRGBtoY([bg.r*255, bg.g*255, bg.b*255]);
console.log('sRGBtoY fg ->', tY, 'bg ->', bY);
const lc = APCAcontrast(tY, bY);
console.log('APCAcontrast fg/bg ->', lc);
const lc2 = APCAcontrast(bY, tY);
console.log('APCAcontrast bg/fg ->', lc2);
