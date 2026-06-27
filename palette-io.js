(function(w){
const tr=(k,f)=>w.TileLang&&w.TileLang.t(k)!==k?w.TileLang.t(k):f;
function parsePaletteImport(file,buf){
  const name=(file.name||'').toLowerCase(),u=new Uint8Array(buf);
  if(name.endsWith('.png'))return parsePngPalette(buf);
  if(name.endsWith('.act'))return parseAct(u);
  if(name.endsWith('.gpl'))return parseGpl(decoder(buf));
  if(name.endsWith('.asm'))return parseAsm(decoder(buf));
  if(name.endsWith('.bin'))return parseBin(u);
  if(isPng(u))return parsePngPalette(buf);
  const text=isLikelyText(u)?decoder(buf):'';
  if(text){
    if(/^gimp palette/i.test(text.trim()))return parseGpl(text);
    if(/\.db|\$[0-9a-f]{1,2}|0x[0-9a-f]{1,2}/i.test(text))return parseAsm(text);
  }
  return parseBin(u);
}
function parsePngPalette(buf){
  if(!w.TilePng||!w.TilePng.parsePng)throw Error(tr('util.pal.pngUnavailable','Import PNG palette indisponible.'));
  const png=w.TilePng.parsePng(buf);
  if(png.colorType!==3)throw Error(tr('util.pal.pngIndexed','PNG palette invalide : le fichier doit être indexé.'));
  if(!png.palette||!png.palette.length)throw Error(tr('util.pal.pngPlte','PNG palette invalide : PLTE absent.'));
  return png.palette.slice(0,16).map(quantRgb);
}
function parseBin(u){
  const out=[];
  for(const b of u){
    if(out.length>=16)break;
    if(b>0x3F)throw Error(tr('util.pal.binRange','BIN invalide : valeur supérieure à $3F.'));
    out.push(smsToRgb(b));
  }
  return out;
}
function parseAsm(txt){
  const clean=txt.replace(/;.*$/gm,'').replace(/\/\/.*$/gm,''),vals=[];
  let m;const re=/\$([0-9a-f]{1,2})|0x([0-9a-f]{1,2})|\b([0-9]{1,3})\b/gi;
  while((m=re.exec(clean))&&vals.length<16){
    const v=parseInt(m[1]||m[2]||m[3],m[3]?10:16);
    if(v>0x3F)throw Error(tr('util.pal.asmRange','ASM invalide : valeur supérieure à $3F.'));
    vals.push(smsToRgb(v));
  }
  return vals;
}
function parseAct(u){
  const out=[];
  for(let i=0;i+2<u.length&&out.length<16;i+=3)out.push(quantRgb({r:u[i],g:u[i+1],b:u[i+2]}));
  return out;
}
function parseGpl(txt){
  const out=[];
  txt.split(/\r?\n/).forEach(line=>{
    if(out.length>=16)return;
    line=line.trim();
    if(!line||line[0]==='#'||/^GIMP Palette|^Name:|^Columns:/i.test(line))return;
    const m=line.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\b/);
    if(m)out.push(quantRgb({r:clamp(+m[1],0,255),g:clamp(+m[2],0,255),b:clamp(+m[3],0,255)}));
  });
  return out;
}
function isPng(u){return u.length>=8&&u[0]===137&&u[1]===80&&u[2]===78&&u[3]===71&&u[4]===13&&u[5]===10&&u[6]===26&&u[7]===10}
function isLikelyText(u){let n=Math.min(u.length,256),bad=0;for(let i=0;i<n;i++){const c=u[i];if(c===0)return false;if(c<9||(c>13&&c<32))bad++}return n>0&&bad/n<.08}
function decoder(buf){return new TextDecoder('utf-8').decode(buf)}
function quantRgb(p){return smsToRgb(rgbToSms(p).v)}
function rgbToSms(p){const r=Math.round(p.r/85),g=Math.round(p.g/85),b=Math.round(p.b/85);return{r,g,b,v:r|(g<<2)|(b<<4)}}
function smsToRgb(v){return{r:(v&3)*85,g:((v>>2)&3)*85,b:((v>>4)&3)*85}}
function paletteRows(vals,n=16){const rows=[];for(let i=0;i<vals.length;i+=n)rows.push(vals.slice(i,i+n));return rows}
function hex(p){return '#'+hex2(p.r)+hex2(p.g)+hex2(p.b)}
function hex2(v){return v.toString(16).toUpperCase().padStart(2,'0')}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
w.PaletteIO={parsePaletteImport,rgbToSms,smsToRgb,quantRgb,paletteRows,hex,hex2};
})(window);
