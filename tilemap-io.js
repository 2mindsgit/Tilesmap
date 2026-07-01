(function(w){
const tr=(k,v)=>w.TileLang?w.TileLang.t(k,v):k;
function orderedCells(tilemap,mode){
  if(!tilemap||!tilemap.cells)return[];
  const out=[],tw=tilemap.w,th=tilemap.h,cells=tilemap.cells;
  if(mode==='rows-bottom')for(let y=th-1;y>=0;y--)for(let x=0;x<tw;x++)out.push(cells[y*tw+x]);
  else if(mode==='cols-left')for(let x=0;x<tw;x++)for(let y=0;y<th;y++)out.push(cells[y*tw+x]);
  else if(mode==='cols-right')for(let x=tw-1;x>=0;x--)for(let y=0;y<th;y++)out.push(cells[y*tw+x]);
  else for(let y=0;y<th;y++)for(let x=0;x<tw;x++)out.push(cells[y*tw+x]);
  return out;
}
function words(tilemap,tiles,start,opt){
  const index=new Map();
  tiles.forEach((t,i)=>index.set(t,start+i));
  return orderedCells(tilemap,opt.order).map(cell=>{
    let v=index.get(cell.tile)||0;
    if(cell.h)v|=0x0200;
    if(cell.v)v|=0x0400;
    // Per-tile palette 2 (auto depuis les indices >=16) OU option globale
    if(cell.tile&&cell.tile.palette===1)v|=0x0800;
    if(opt.palette2)v|=0x0800;
    if(opt.priority)v|=0x1000;
    return v&0xFFFF;
  });
}
function bin(words){
  const out=new Uint8Array(words.length*2);
  words.forEach((v,i)=>{out[i*2]=v&255;out[i*2+1]=(v>>8)&255});
  return out;
}
function lineSize(tilemap,mode){
  if(!tilemap)return 16;
  const n=(mode==='cols-left'||mode==='cols-right')?tilemap.h:tilemap.w;
  return Math.max(1,n|0);
}
function asm(words,name,tilemap,opt){
  const o=typeof opt==='string'?{order:opt}:opt||{},mode=o.order||'rows-top',perLine=lineSize(tilemap,mode),labels={'rows-top':tr('asm.order.rowsTop'),'rows-bottom':tr('asm.order.rowsBottom'),'cols-left':tr('asm.order.colsLeft'),'cols-right':tr('asm.order.colsRight')},yes=v=>v?tr('asm.yes'):tr('asm.no'),lines=[tr('asm.title',{name}),tr('asm.dim',{w:tilemap?tilemap.w:0,h:tilemap?tilemap.h:0}),tr('asm.order',{order:labels[mode]||mode}),tr('asm.start',{start:o.start??0}),tr('asm.dedupe',{value:yes(o.dedupe)}),tr('asm.mirror',{value:yes(o.mirror)}),tr('asm.palette2',{value:yes(o.palette2)}),tr('asm.priority',{value:yes(o.priority)}),''];
  for(let i=0;i<words.length;i+=perLine)lines.push('.dw '+words.slice(i,i+perLine).map(v=>'$'+hex4(v)).join(', '));
  return lines.join('\n')+'\n';
}
function rleCompressBuffer(buffer){
  if(!buffer.length)return[];
  const out=[];
  let i=0;
  while(i<buffer.length){
    let run=1;
    while(i+run<buffer.length&&buffer[i]===buffer[i+run]&&run<127)run++;
    if(run>=2){
      out.push(0x80|run,buffer[i]);
      i+=run;
    }else{
      const start=i;
      let len=1;
      while(i+len<buffer.length&&len<127){
        let next=1,pos=i+len;
        while(pos+next<buffer.length&&buffer[pos]===buffer[pos+next]&&next<3)next++;
        if(next>=3)break;
        len++;
      }
      out.push(len);
      for(let j=0;j<len;j++)out.push(buffer[start+j]);
      i+=len;
    }
  }
  return out;
}
function rle(bytes){
  const data=bytes instanceof Uint8Array?bytes:Uint8Array.from(bytes||[]);
  if(!data.length)return new Uint8Array([0,0]);
  const even=[],odd=[];
  for(let i=0;i<data.length;i++)(i&1?odd:even).push(data[i]);
  const ce=rleCompressBuffer(even),co=rleCompressBuffer(odd);
  return Uint8Array.from([...ce,0,...co,0]);
}
function stm(words,width){
  const buf=Array.from(words||[],v=>v&0xffff),inSize=buf.length,out=[];
  const RLE_TYPE_NORMAL=0x01,RLE_TYPE_INCREMENTAL=0x03,MIN_RLE_LEN=2,MAX_RLE_LEN=65,MAX_RAW_LEN=63;
  let current=0,curHH=0,oldHH=0,wasTempHH=false;
  if(width<1||width>255)throw Error('STM : largeur de tilemap invalide (>255 tiles).');
  out.push(width&0xff);
  const hi=v=>(v>>8)&0xff,lo=v=>v&0xff;
  function writeRLE(val,cnt,type){out.push((((cnt-MIN_RLE_LEN)&0xff)<<2)|type,val&0xff)}
  function writeHI(val,temp){out.push(((val&0xff)<<3)|(temp?0x04:0)|0x02)}
  function checkHI(count){
    if(wasTempHH){wasTempHH=false;curHH=oldHH}
    if(hi(curHH)!==hi(buf[current])){
      let isTemp=false;
      if(current+count===inSize)isTemp=false;
      else if(hi(curHH)===hi(buf[current+count])){
        isTemp=true;
        if(hi(buf[current+count-1])===hi(buf[current+count]))isTemp=false;
      }
      writeHI(hi(buf[current]),isTemp);
      if(isTemp){wasTempHH=true;oldHH=curHH}
    }
    curHH=buf[current+count-1]&0xff00;
  }
  while(current<inSize){
    let i,tmp;
    if(current+1<inSize&&buf[current]===buf[current+1]){
      for(i=2;i<MAX_RLE_LEN;i++){
        if(current+i>=inSize)break;
        if(buf[current]!==buf[current+i])break;
      }
      checkHI(i);
      writeRLE(lo(buf[current]),i,RLE_TYPE_NORMAL);
    }else if(current+1<inSize&&((buf[current]+1)&0xffff)===buf[current+1]){
      for(i=2;i<MAX_RLE_LEN;i++){
        if(current+i===inSize)break;
        if(((buf[current+i-1]+1)&0xffff)!==buf[current+i])break;
      }
      checkHI(i);
      writeRLE(lo(buf[current]),i,RLE_TYPE_INCREMENTAL);
    }else{
      for(i=1;i<MAX_RAW_LEN;i++){
        if(current+i===inSize)break;
        if(buf[current+i-1]===buf[current+i]){i--;break}
        if(((buf[current+i-1]+1)&0xffff)===buf[current+i]){i--;break}
        if(hi(buf[current+i-1])!==hi(buf[current+i]))break;
      }
      checkHI(i);
      tmp=lo(i)<<2;
      out.push(tmp&0xff);
      for(let j=0;j<i;j++)out.push(lo(buf[current+j]));
    }
    current+=i;
  }
  out.push(0);
  return Uint8Array.from(out);
}
function hex4(v){return v.toString(16).toUpperCase().padStart(4,'0')}
w.TilemapIO={words,bin,asm,rle,stm,orderedCells,lineSize,hex4};
})(window);
