(function(w){
const tr=(k,f)=>w.TileLang&&w.TileLang.t(k)!==k?w.TileLang.t(k):f;
function parsePng(buf){
  const u=new Uint8Array(buf),v=new DataView(buf),sig=[137,80,78,71,13,10,26,10];
  for(let i=0;i<8;i++)if(u[i]!==sig[i])throw Error(tr('util.png.invalid','Fichier PNG invalide.'));
  let p=8,out={};
  while(p+8<=u.length){
    const len=v.getUint32(p),type=str(u,p+4,4),s=p+8,e=s+len;
    if(e+4>u.length)throw Error(tr('util.png.truncated','PNG tronqué.'));
    if(type==='IHDR'){
      out.width=v.getUint32(s);out.height=v.getUint32(s+4);out.bitDepth=u[s+8];out.colorType=u[s+9];
    }else if(type==='PLTE'){
      out.palette=[];
      for(let i=s;i<e;i+=3)out.palette.push({r:u[i],g:u[i+1],b:u[i+2]});
    }else if(type==='tRNS')out.trns=u.slice(s,e);
    else if(type==='IEND')break;
    p=e+4;
  }
  return out;
}
function str(u,p,l){let s='';for(let i=0;i<l;i++)s+=String.fromCharCode(u[p+i]);return s}
async function bitmapFrom(buf,file){
  try{return await createImageBitmap(new Blob([buf],{type:'image/png'}),{colorSpaceConversion:'none'})}
  catch(e){return await createImageBitmap(file)}
}
function readIndexedPixels(bmp,png){
  const c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});
  c.width=bmp.width;c.height=bmp.height;x.drawImage(bmp,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data,map=new Map();
  png.palette.forEach((p,i)=>map.set(`${p.r},${p.g},${p.b}`,i));
  const tr=png.trns?png.trns.findIndex(a=>a===0):-1,pix=new Uint8Array(c.width*c.height),miss=new Set();
  for(let i=0,j=0;i<d.length;i+=4,j++){
    let k=`${d[i]},${d[i+1]},${d[i+2]}`,idx=map.get(k);
    if(idx===undefined&&d[i+3]===0&&tr>=0)idx=tr;
    if(idx===undefined){miss.add(k);if(miss.size>8)break}else pix[j]=idx;
  }
  if(miss.size)throw Error(tr('util.png.pixelMismatch','PNG invalide : certains pixels ne correspondent pas à la palette indexée.'));
  return pix;
}
// Quantifie un bitmap RGB(A) en RGB444, assigne les tiles à 1 ou 2 palettes de 16, tri par teinte.
// Retourne {palette:[{r,g,b},...], pixels:Uint8Array, mode:'sms'|'gg', palCount:1|2}
function quantizeAndPack(bmp,w,h){
  const c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});
  c.width=w;c.height=h;x.drawImage(bmp,0,0);
  const d=x.getImageData(0,0,w,h).data,pixels=new Uint32Array(w*h);
  for(let i=0,j=0;i<d.length;i+=4,j++){
    const r=Math.round(d[i]/17)*17,g=Math.round(d[i+1]/17)*17,b=Math.round(d[i+2]/17)*17;
    pixels[j]=(r<<16)|(g<<8)|b;
  }
  const unique=new Set(pixels);
  if(unique.size>32)throw Error(tr('util.png.tooManyColors','Trop de couleurs après quantification (>32).'));
  // Mode : SMS si toutes les couleurs sont multiples de 85 (RGB222), sinon GG.
  let mode='sms';
  for(const c of unique){if(((c>>16)&255)%85||((c>>8)&255)%85||(c&255)%85){mode='gg';break}}
  if(unique.size<=16){
    const pal=sortHue([...unique]),m=new Map(pal.map((c,i)=>[c,i])),idx=new Uint8Array(pixels.length);
    for(let i=0;i<pixels.length;i++)idx[i]=m.get(pixels[i]);
    return{palette:pal.map(unpackRgb),pixels:idx,mode,palCount:1};
  }
  // >16 couleurs : découpe en tiles 8x8, attribution greedy à 2 palettes.
  const tw=w/8,th=h/8,tileColors=[];
  for(let ty=0;ty<th;ty++)for(let tx=0;tx<tw;tx++){
    const s=new Set();
    for(let y=0;y<8;y++){const base=(ty*8+y)*w+tx*8;for(let dx=0;dx<8;dx++)s.add(pixels[base+dx])}
    tileColors.push(s);
  }
  const palettes=[new Set(),new Set()],assign=new Array(tileColors.length);
  const order=[...tileColors.keys()].sort((a,b)=>tileColors[b].size-tileColors[a].size);
  for(const i of order){
    const tc=tileColors[i];let best=null;
    for(let p=0;p<2;p++){
      const merged=new Set(palettes[p]);for(const c of tc)merged.add(c);
      if(merged.size<=16){const g=merged.size-palettes[p].size;if(!best||g<best[0])best=[g,p,merged]}
    }
    if(!best)throw Error(tr('util.png.packFail','Impossible d\'agglomérer les tiles en 2 palettes de 16 couleurs.'));
    palettes[best[1]]=best[2];assign[i]=best[1];
  }
  const pal0=sortHue([...palettes[0]]),pal1=sortHue([...palettes[1]]);
  const m0=new Map(pal0.map((c,i)=>[c,i])),m1=new Map(pal1.map((c,i)=>[c,i+16]));
  const idx=new Uint8Array(w*h);
  for(let i=0;i<tileColors.length;i++){
    const ty=Math.floor(i/tw)*8,tx=(i%tw)*8,m=assign[i]===0?m0:m1;
    for(let y=0;y<8;y++){const base=(ty+y)*w;for(let dx=0;dx<8;dx++){const px=base+tx+dx;idx[px]=m.get(pixels[px])}}
  }
  // Vérif d'intégrité : aucun tile ne mixe pal0/pal1.
  for(let i=0;i<tileColors.length;i++){
    const ty=Math.floor(i/tw)*8,tx=(i%tw)*8,seen=new Set();
    for(let y=0;y<8;y++){const base=(ty+y)*w;for(let dx=0;dx<8;dx++)seen.add(idx[base+tx+dx]>>4)}
    if(seen.size!==1)throw Error('Erreur interne: tile ('+tx+','+ty+') mixe pal0/pal1');
  }
  // Palette 32 entrées : pal0 (paddée noir) + pal1 (paddée noir).
  const palOut=[];
  for(const c of pal0)palOut.push(unpackRgb(c));while(palOut.length<16)palOut.push({r:0,g:0,b:0});
  for(const c of pal1)palOut.push(unpackRgb(c));while(palOut.length<32)palOut.push({r:0,g:0,b:0});
  return{palette:palOut,pixels:idx,mode,palCount:2};
}
function sortHue(cols){
  return cols.slice().sort((a,b)=>{
    const A=rgbToHsv(a),B=rgbToHsv(b);
    if(A[1]===0&&B[1]===0)return A[2]-B[2];
    if(A[1]===0)return -1;
    if(B[1]===0)return 1;
    return A[0]-B[0]||A[1]-B[1]||A[2]-B[2];
  });
}
function rgbToHsv(v){
  const r=((v>>16)&255)/255,g=((v>>8)&255)/255,b=(v&255)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d){if(max===r)h=((g-b)/d+(g<b?6:0))/6;else if(max===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6}
  return[h,max?d/max:0,max];
}
function unpackRgb(v){return{r:(v>>16)&255,g:(v>>8)&255,b:v&255}}
w.TilePng={parsePng,bitmapFrom,readIndexedPixels,quantizeAndPack};
})(window);
