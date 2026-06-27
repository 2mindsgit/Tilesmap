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
w.TilePng={parsePng,bitmapFrom,readIndexedPixels};
})(window);
