import { sRGBtoY, APCAcontrast } from 'apca-w3';

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return {
    r: parseInt(h.substring(0,2),16) / 255,
    g: parseInt(h.substring(2,4),16) / 255,
    b: parseInt(h.substring(4,6),16) / 255,
  };
}

function rgbToHex(r,g,b){
  const to255 = v => Math.round(Math.min(1,Math.max(0,v))*255);
  return '#'+[to255(r),to255(g),to255(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function srgbToLinear(c){
  return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
}

function rgbToHsl({r,g,b}){
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h,s,l = (max+min)/2;
  if(max===min){h=0;s=0;} else {
    const d = max-min;
    s = l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return {h: h*360, s: s, l: l};
}

function hslToRgb(h,s,l){
  h = ((h%360)+360)%360 / 360;
  let r,g,b;
  if(s===0){r=g=b=l;} else {
    const q = l<0.5?l*(1+s):l+s-l*s;
    const p = 2*l-q;
    const hue2rgb = (p,q,t)=>{
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p + (q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p + (q-p)*(2/3 - t)*6;
      return p;
    };
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  return {r,g,b};
}

function wcagContrastRgb(a,b){
  const linear = c => srgbToLinear(c);
  const la = 0.2126*linear(a.r)+0.7152*linear(a.g)+0.0722*linear(a.b);
  const lb = 0.2126*linear(b.r)+0.7152*linear(b.g)+0.0722*linear(b.b);
  const L1 = Math.max(la,lb), L2 = Math.min(la,lb);
  return (L1+0.05)/(L2+0.05);
}

async function run() {
  const fgHex = '#45ad7f';
  const bgHex = '#19332A';
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const bgHsl = rgbToHsl(bgRgb);

  const wcagTarget = 4.5;

  const wcagPassing = [];
  for (let dh=-12; dh<=12; dh+=2) {
    for (let ds=-0.15; ds<=0.15; ds+=0.03) {
      for (let l=0.02; l<=0.98; l+=0.02) {
        const h = bgHsl.h + dh;
        const s = Math.min(1,Math.max(0,bgHsl.s + ds));
        const cand = hslToRgb(h,s,l);
        const ratio = wcagContrastRgb(fgRgb, cand);
        if (ratio >= wcagTarget) {
          wcagPassing.push({hex: rgbToHex(cand.r,cand.g,cand.b), ratio: ratio, l});
        }
      }
    }
  }

  const unique = {};
  for (const r of wcagPassing) unique[r.hex.toLowerCase()] = r;
  const arr = Object.values(unique);
  arr.sort((a,b)=> Math.abs(a.l - bgHsl.l) - Math.abs(b.l - bgHsl.l));

  console.log('Top WCAG-only candidates:');
  for (const r of arr.slice(0,24)) {
    console.log(`${r.hex}  WCAG ${r.ratio.toFixed(2)}  l:${(r.l*100).toFixed(0)}%`);
  }
}

run().catch(e=>{console.error(e);process.exit(1);});
