(function(){
const $=id=>document.getElementById(id);
const TILE_SHELF_COLS=16;
const {parsePng,bitmapFrom,readIndexedPixels,quantizeAndPack}=window.TilePng;
const Lang=window.TileLang,tr=(k,v)=>Lang?Lang.t(k,v):k;
const {parsePaletteImport,rgbToSms,smsToRgb,rgbToGg,ggToRgb,paletteMode,hex,hex2,hex4,paletteRows}=window.PaletteIO;
const Tm=window.TilemapIO;
const state={
  src:null,tiles:[],tilemap:null,raw:0,removed:0,name:'tiles',fileName:'',fileW:0,fileH:0,fileColors:0,error:'',
  hover:-1,hoverPos:-1,reorder:false,drag:null,sourceScale:1,tileLayout:null,leftW:260,rightW:360,
  paletteOrder:[],palCounts:new Map(),palHover:-1,palReorder:false,palEdit:false,palDrag:null,palLayout:null,palTarget:-1,palOriginal:null,palVariants:[],activePal:0,palMode:'sms',dualPalette:false,slots:[0,null],
  edit:{active:false,index:-1,data:null,backupPixels:null,selectedPal:0,painting:false,layout:null},
  psgBytes:null,zx7Bytes:null,tmRleBytes:null,tmStmBytes:null
};
const ui={
  app:$('app'),input:$('pngInput'),import:$('importBtn'),emptyImport:$('emptyImportBtn'),badge:$('stateBadge'),file:$('fileInfo'),
  start:$('startVal'),budget:$('tileBudget'),dedupe:$('dedupeOpt'),mirror:$('mirrorOpt'),tmPal2:$('tmPal2'),tmPriority:$('tmPriority'),tmOrder:$('tmOrder'),
  raw:$('rawCount'),valid:$('validCount'),budgetWarn:$('budgetWarn'),removed:$('removedCount'),range:$('idRange'),weight:$('binWeight'),
  psgStat:$('psgStat'),psgWeight:$('psgWeight'),zx7Stat:$('zx7Stat'),zx7Weight:$('zx7Weight'),tmWeight:$('tmBinWeight'),tmRleStat:$('tmRleStat'),tmRleWeight:$('tmRleWeight'),tmStmStat:$('tmStmStat'),tmStmWeight:$('tmStmWeight'),
  source:$('sourceCanvas'),empty:$('emptyState'),hudL:$('hudLeft'),hudR:$('hudRight'),wrap:$('sourceWrap'),
  tiles:$('tilesCanvas'),tilesEmpty:$('tilesEmpty'),reorder:$('reorderBtn'),editBtn:$('editBtn'),editPanel:$('tileEditPanel'),editCanvas:$('editCanvas'),editDone:$('editDoneBtn'),editCancel:$('editCancelBtn'),editInfo:$('editInfo'),editSwatch:$('editColorSwatch'),editColorInfo:$('editColorInfo'),rpanel:$('rpanel'),
  palCanvas:$('paletteCanvas'),palEmpty:$('paletteEmpty'),palMode:$('paletteMode'),palReorder:$('paletteReorderBtn'),palEdit:$('paletteEditBtn'),palImport:$('paletteImportBtn'),palImportInput:$('paletteImportInput'),palDefault:$('paletteDefaultBtn'),palVariant:$('paletteVariantBtn'),palVariantInput:$('paletteVariantInput'),palVariants:$('paletteVariants'),
  picker:$('palPicker'),pickerBox:$('palPickerBox'),pickerTitle:$('palPickerTitle'),pickerCurrent:$('palPickerCurrent'),pickerClose:$('palPickerClose'),pickerCancel:$('palPickerCancel'),smsGrid:$('smsGrid'),ggPicker:$('ggPicker'),ggColor:$('ggColor'),ggR:$('ggR'),ggG:$('ggG'),ggB:$('ggB'),ggEye:$('ggEye'),
  exportPng:$('exportPng'),exportBin:$('exportBin'),exportC:$('exportC'),exportPsg:$('exportPsg'),exportZx7:$('exportZx7'),exportTsx:$('exportTsx'),
  exportTmBin:$('exportTmBin'),exportTmAsm:$('exportTmAsm'),exportTmC:$('exportTmC'),exportTmRle:$('exportTmRle'),exportTmStm:$('exportTmStm'),exportTmTmx:$('exportTmTmx'),
  exportPalBin:$('exportPalBin'),exportPalAsm:$('exportPalAsm'),exportPalC:$('exportPalC'),exportPalAct:$('exportPalAct'),exportPalGpl:$('exportPalGpl'),exportPalJasc:$('exportPalJasc')
};
const tip=document.createElement('div'),toastLayer=document.createElement('div');
tip.id='tileTooltip';toastLayer.id='toastLayer';
document.body.appendChild(tip);document.body.appendChild(toastLayer);
if(Lang){Lang.init();Lang.onchange=()=>{buildSmsGrid();updateStats();renderSource();renderTiles();renderPalette();renderEditCanvas();if(state.palTarget>=0){updatePickerMode();updatePickerInfo()}}}
bindUi();
buildSmsGrid();
initSplitters();
updateGrid();
updateStats();
renderPalette();
function bindUi(){
  ui.import.onclick=()=>ui.input.click();
  ui.emptyImport.onclick=()=>ui.input.click();
  const home=$('homeBtn');if(home)home.onclick=()=>location.href='index.html';
  ui.input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)loadFile(f);e.target.value=''};
  ui.start.oninput=()=>{ui.start.value=clamp(parseInt(ui.start.value||0,10),0,447);resetTilemapCompressionStats();updateStats();renderTiles();if(state.hover>-1)renderSource()};
  ui.budget.oninput=()=>{ui.budget.value=clamp(parseInt(ui.budget.value||0,10),0,448);updateStats()};
  ui.dedupe.onchange=()=>{if(state.edit.active)return cancelTileEdit();process()};
  ui.mirror.onchange=()=>{if(state.edit.active)return cancelTileEdit();process()};
  ui.tmPal2.onchange=()=>{resetTilemapCompressionStats();updateStats()};
  ui.tmPriority.onchange=()=>{resetTilemapCompressionStats();updateStats()};
  ui.tmOrder.onchange=()=>{resetTilemapCompressionStats();updateStats()};
  if(ui.palMode)ui.palMode.onchange=()=>setPaletteMode(ui.palMode.value,true);
  ui.exportPng.onclick=exportPng;
  ui.exportBin.onclick=exportBin;
  ui.exportPsg.onclick=exportPsg;
  ui.exportZx7.onclick=exportZx7;
  ui.exportTsx.onclick=exportTsx;
  ui.exportTmBin.onclick=exportTilemapBin;
  ui.exportTmAsm.onclick=exportTilemapAsm;
  ui.exportTmRle.onclick=exportTilemapRle;
  ui.exportTmStm.onclick=exportTilemapStm;
  ui.exportTmTmx.onclick=exportTmx;
  if(ui.exportC)ui.exportC.onclick=exportTilesC;
  if(ui.exportTmC)ui.exportTmC.onclick=exportTilemapC;
  ui.exportPalBin.onclick=exportPaletteBin;
  ui.exportPalAsm.onclick=exportPaletteAsm;
  if(ui.exportPalC)ui.exportPalC.onclick=exportPaletteC;
  ui.exportPalAct.onclick=exportPaletteAct;
  ui.exportPalGpl.onclick=exportPaletteGpl;
  if(ui.exportPalJasc)ui.exportPalJasc.onclick=exportPaletteJasc;
  ui.reorder.onclick=()=>{if(!state.tiles.length||state.edit.active)return;state.reorder=!state.reorder;state.drag=null;clearHover();updateReorderUi();renderTiles();toast(state.reorder?tr('toast.tilesReorderOn'):tr('toast.tilesReorderOff'))};
  ui.editBtn.onclick=toggleTileEditMode;
  ui.editDone.onclick=finishTileEdit;
  ui.editCancel.onclick=()=>cancelTileEdit();
  ui.palReorder.onclick=()=>{if(!state.paletteOrder.length||state.edit.active)return;state.palReorder=!state.palReorder;state.palDrag=null;if(state.palReorder)state.palEdit=false;clearPaletteHover();updatePaletteModeUi();renderPalette();toast(state.palReorder?tr('toast.paletteReorderOn'):tr('toast.paletteReorderOff'))};
  ui.palEdit.onclick=()=>{if(!state.paletteOrder.length||state.edit.active)return;state.palEdit=!state.palEdit;if(state.palEdit)state.palReorder=false;state.palDrag=null;clearPaletteHover();closePicker();updatePaletteModeUi();renderPalette();toast(state.palEdit?tr('toast.paletteEditOn'):tr('toast.paletteEditOff'))};
  ui.palImport.onclick=()=>{if(state.paletteOrder.length&&!state.edit.active)ui.palImportInput.click()};
  ui.palImportInput.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importPaletteFile(f);e.target.value=''};
  ui.palVariant.onclick=()=>{if(state.paletteOrder.length&&!state.edit.active)ui.palVariantInput.click()};
  ui.palVariantInput.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importPaletteVariantFile(f);e.target.value=''};
  ui.palDefault.onclick=restoreDefaultPalette;
  ui.tiles.addEventListener('mousemove',onTileMove);
  ui.tiles.addEventListener('mouseleave',()=>{if(!state.drag)clearHover()});
  ui.tiles.addEventListener('mousedown',onTileDown);
  ui.source.addEventListener('mousemove',onSourceMove);
  ui.source.addEventListener('mouseleave',()=>{if(!state.drag&&!state.edit.active)clearHover()});
  ui.editCanvas.addEventListener('mousedown',onEditCanvasDown);
  ui.editCanvas.addEventListener('contextmenu',e=>{if(state.edit.active&&state.edit.index>=0)e.preventDefault()});
  ui.editCanvas.addEventListener('mousemove',onEditCanvasMove);
  ui.editCanvas.addEventListener('mouseleave',()=>{state.edit.painting=false});
  ui.palCanvas.addEventListener('mousemove',onPaletteMove);
  ui.palCanvas.addEventListener('mouseleave',()=>{if(!state.palDrag)clearPaletteHover()});
  ui.palCanvas.addEventListener('mousedown',onPaletteDown);
  ui.palCanvas.addEventListener('click',onPaletteClick);
  ui.pickerClose.onclick=closePicker;
  ui.pickerCancel.onclick=cancelPicker;
  if(ui.ggColor)ui.ggColor.oninput=()=>pickGgHex(ui.ggColor.value);
  [ui.ggR,ui.ggG,ui.ggB].forEach(el=>{if(el)el.oninput=()=>pickGgRgb()});
  if(ui.ggEye)ui.ggEye.onclick=pickEyeDropper;
  initPickerDrag();
  setupSvgOverlays();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.edit.active)cancelTileEdit();else closePicker()}});
  window.addEventListener('resize',()=>{renderSource();renderTiles();renderPalette();renderEditCanvas()});
}
function setupSvgOverlays(){
  const tw=wrapWithSvgOverlay(ui.tiles);
  state.tilesOverlay=tw.svg;state.tilesWrap=tw.wrap;
  const sw=wrapWithSvgOverlay(ui.source);
  state.sourceOverlay=sw.svg;state.sourceWrap=sw.wrap;
  // Attacher les events aussi sur les wrappers (au cas où le SVG intercepterait)
  state.sourceWrap.addEventListener('mousemove',onSourceMove);
  state.sourceWrap.addEventListener('mouseleave',()=>{if(!state.drag&&!state.edit.active)clearHover()});
}
function wrapWithSvgOverlay(canvas){
  const wrap=document.createElement('span');
  wrap.style.cssText='position:relative;display:inline-block;line-height:0;font-size:0;align-self:flex-start;max-width:100%;';
  canvas.parentNode.insertBefore(wrap,canvas);
  wrap.appendChild(canvas);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('preserveAspectRatio','none');
  svg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
  wrap.appendChild(svg);
  return {wrap,svg};
}
function makePal2SvgBadge(ox,oy,size){
  const NS='http://www.w3.org/2000/svg',g=document.createElementNS(NS,'g');
  g.setAttribute('pointer-events','none');
  const s=Math.max(3,Math.min(size*0.5,size-1));
  const rect=document.createElementNS(NS,'rect');
  rect.setAttribute('x',ox+size-s-0.5);rect.setAttribute('y',oy+0.5);
  rect.setAttribute('width',s);rect.setAttribute('height',s);
  rect.setAttribute('rx',Math.min(2,s*0.15));
  rect.setAttribute('fill','#e05050');
  rect.setAttribute('fill-opacity','0.95');
  g.appendChild(rect);
  const t=document.createElementNS(NS,'text');
  t.setAttribute('x',ox+size-s/2-0.5);t.setAttribute('y',oy+s/2+0.5);
  t.setAttribute('fill','#fff');t.setAttribute('font-family','sans-serif');
  t.setAttribute('font-size',s*0.75);t.setAttribute('font-weight','bold');
  t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','central');
  t.textContent='2';
  g.appendChild(t);
  return g;
}
function updateTilesOverlay(){
  const svg=state.tilesOverlay;if(!svg)return;
  const c=ui.tiles;
  svg.setAttribute('viewBox',`0 0 ${c.width} ${c.height}`);
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  if(!state.dualPalette||!state.tileLayout||!state.tiles.length)return;
  const {tileSize,gap,cols}=state.tileLayout;
  state.tiles.forEach((t,i)=>{
    if(t.data[0]<16)return;
    const ox=(i%cols)*(tileSize+gap),oy=Math.floor(i/cols)*(tileSize+gap);
    svg.appendChild(makePal2SvgBadge(ox,oy,tileSize));
  });
}
function updateSourceOverlay(){
  const svg=state.sourceOverlay;if(!svg||!state.src)return;
  const c=ui.source;
  svg.setAttribute('viewBox',`0 0 ${c.width} ${c.height}`);
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  if(!state.dualPalette||c.hidden)return;
  const src=state.src,scale=state.sourceScale||1,ts=8*scale;
  if(ts<6)return;
  for(let ty=0;ty<src.h;ty+=8)for(let tx=0;tx<src.w;tx+=8){
    if(src.pixels[ty*src.w+tx]>=16)svg.appendChild(makePal2SvgBadge(tx*scale,ty*scale,ts));
  }
}
async function loadFile(file){
  try{
    state.error='';
    setBadge(tr('badge.reading'),'idle');
    const buf=await file.arrayBuffer(),png=parsePng(buf);
    if(png.width%8||png.height%8)throw Error(tr('png.err.size'));
    const bmp=await bitmapFrom(buf,file);
    let pixels,pal,mode,palCount;
    // PNG indexé ≤16 couleurs -> chemin direct
    if(png.colorType===3&&png.palette&&png.palette.length<=16){
      pixels=readIndexedPixels(bmp,png);
      pal=png.palette.map(p=>({r:p.r,g:p.g,b:p.b}));
      mode=paletteMode(pal);palCount=1;
    }else{
      // 24 bits ou indexé >16 -> quantif RGB444 + assignation par tile
      const q=quantizeAndPack(bmp,png.width,png.height);
      pixels=q.pixels;pal=q.palette;mode=q.mode;palCount=q.palCount;
    }
    state.dualPalette=palCount===2;
    state.src={w:png.width,h:png.height,palette:pal,defaultPalette:clonePalette(pal),pixels,bitmap:bmp};
    if(palCount===2){
      state.palVariants=[
        {name:tr('variant.pal1','Palette 1'),colors:pal.slice(0,16).map(c=>({...c})),base:true},
        {name:tr('variant.pal2','Palette 2'),colors:pal.slice(16,32).map(c=>({...c})),base:true}
      ];
      state.slots=[0,1];
    }else{
      state.palVariants=[{name:'PNG',colors:pal,base:true}];
      state.slots=[0,null];
    }
    state.activePal=0;state.palMode=mode;if(ui.palMode)ui.palMode.value=state.palMode;
    setUsedPalette(pixels,pal.length);
    state.name=file.name.replace(/\.png$/i,'')||'tiles';
    state.fileName=file.name;state.fileW=png.width;state.fileH=png.height;state.fileColors=pal.length;
    ui.empty.classList.add('is-hidden');
    ui.source.hidden=false;
    state.hover=-1;
    resetTileEditState();
    state.palHover=-1;
    closePicker();
    process();
    toast(tr('toast.pngImported'));
  }catch(err){
    resetAfterError(err.message);
  }
}
function resetAfterError(msg){
  state.src=null;state.tiles=[];state.tilemap=null;state.raw=0;state.removed=0;state.hover=-1;state.hoverPos=-1;state.reorder=false;state.drag=null;resetTileEditState();resetGeneratedStats();
  state.paletteOrder=[];state.palCounts=new Map();state.palHover=-1;state.palReorder=false;state.palEdit=false;state.palDrag=null;state.palVariants=[];state.activePal=0;state.palMode='sms';state.dualPalette=false;state.slots=[0,null];if(ui.palMode)ui.palMode.value='sms';
  state.fileName='';state.fileW=0;state.fileH=0;state.fileColors=0;state.error=msg;ui.source.hidden=true;ui.empty.classList.remove('is-hidden');closePicker();setBadge(tr('badge.error'),'idle');
  updateStats();renderTiles();renderPalette();toast(msg,true);
}
function setUsedPalette(pixels,len){
  const counts=new Map();
  for(const v of pixels)counts.set(v,(counts.get(v)||0)+1);
  state.palCounts=counts;
  state.paletteOrder=[];
  for(let i=0;i<len;i++)if(counts.has(i))state.paletteOrder.push(i);
}
function process(){
  resetGeneratedStats();
  if(!state.src){updateStats();return}
  const src=state.src,tiles=[],seen=new Map(),tw=src.w/8,th=src.h/8,cells=[];
  state.raw=0;state.removed=0;state.hover=-1;state.drag=null;clearTooltip();
  for(let y=0,ty=0;y<src.h;y+=8,ty++)for(let x=0,tx=0;x<src.w;x+=8,tx++){
    state.raw++;
    const data=cutTile(src.pixels,src.w,x,y),pos={x,y,tx,ty,raw:state.raw-1},k=key(data);
    let cell;
    if(ui.dedupe.checked){
      const old=seen.get(k);
      if(old){
        old.tile.occ++;
        old.tile.positions.push({...pos,h:old.h,v:old.v});
        state.removed++;
        cell={tile:old.tile,h:old.h,v:old.v,pos};
      }else{
        const tile={data,occ:1,positions:[{...pos,h:false,v:false}],palette:data[0]>=16?1:0};
        tiles.push(tile);
        registerTile(seen,tile);
        cell={tile,h:false,v:false,pos};
      }
    }else{
      const tile={data,occ:1,positions:[{...pos,h:false,v:false}],palette:data[0]>=16?1:0};
      tiles.push(tile);
      cell={tile,h:false,v:false,pos};
    }
    cells.push(cell);
  }
  state.tiles=tiles;
  state.tilemap={w:tw,h:th,cells};
  updateStats();renderSource();renderTiles();renderPalette();
}
function registerTile(seen,tile){
  const vars=[{data:tile.data,h:false,v:false}];
  if(ui.mirror.checked){
    vars.push({data:mirror(tile.data,1,0),h:true,v:false});
    vars.push({data:mirror(tile.data,0,1),h:false,v:true});
    vars.push({data:mirror(tile.data,1,1),h:true,v:true});
  }
  for(const v of vars){
    const k=key(v.data);
    if(!seen.has(k))seen.set(k,{tile,h:v.h,v:v.v});
  }
}
function cutTile(p,w,x,y){const t=new Uint8Array(64);for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++)t[ty*8+tx]=p[(y+ty)*w+x+tx];return t}
function key(t){let s='';for(let i=0;i<64;i++)s+=String.fromCharCode(t[i]);return s}
function mirror(t,h,v){const o=new Uint8Array(64);for(let y=0;y<8;y++)for(let x=0;x<8;x++)o[y*8+x]=t[(v?7-y:y)*8+(h?7-x:x)];return o}
function updateStats(){
  const n=state.tiles.length,b=n*32,s=Number(ui.start.value),budget=Number(ui.budget.value)||0,last=n?s+n-1:s,max=448-s,over=state.src&&n>max,budgetOver=state.src&&budget>0&&n>budget,budgetExcess=budgetOver?n-budget:0,budgetMsg=budgetOver?`⚠ +${budgetExcess}`:'',mapCount=state.tilemap?state.tilemap.cells.length:0,tmBin=mapCount*2;
  ui.raw.textContent=state.raw;
  ui.valid.textContent=n;
  ui.budgetWarn.textContent=budgetMsg;
  ui.budgetWarn.title=budgetOver?tr('stats.budgetTitle',{valid:n,budget,excess:budgetExcess}):'';
  ui.removed.textContent=state.removed;
  ui.range.textContent=n?`${s} - ${last} (${hexId(s)} - ${hexId(last)})`:'—';
  ui.weight.textContent=formatSize(b);
  if(ui.tmWeight)ui.tmWeight.textContent=formatSize(tmBin);
  setCompressedStat(ui.psgStat,ui.psgWeight,state.psgBytes,b);
  setCompressedStat(ui.zx7Stat,ui.zx7Weight,state.zx7Bytes,b);
  setCompressedStat(ui.tmRleStat,ui.tmRleWeight,state.tmRleBytes,tmBin);
  setCompressedStat(ui.tmStmStat,ui.tmStmWeight,state.tmStmBytes,tmBin);
  ui.hudL.textContent=state.src?tr('hud.source',{w:state.src.w,h:state.src.h,raw:state.raw}):'—';
  ui.hudR.textContent=n?tr('hud.tiles',{valid:n,budget:budgetOver?tr('hud.budget',{excess:budgetExcess}):'',kb:(b/1024).toFixed(2),tilemap:state.tilemap?tr('hud.tilemap',{w:state.tilemap.w,h:state.tilemap.h}):''}):'—';
  ui.exportPng.disabled=!n;ui.exportBin.disabled=!n;ui.exportPsg.disabled=!n||typeof window.compressTilesPSG!=='function';ui.exportZx7.disabled=!n||typeof window.compressZX7!=='function';ui.exportTsx.disabled=!n;if(ui.exportC)ui.exportC.disabled=!n;ui.reorder.disabled=!n||state.edit.active;ui.editBtn.disabled=!n;
  ui.exportTmBin.disabled=!mapCount;ui.exportTmAsm.disabled=!mapCount;if(ui.exportTmC)ui.exportTmC.disabled=!mapCount;
  ui.exportTmRle.disabled=!mapCount||typeof Tm.rle!=='function';ui.exportTmStm.disabled=!mapCount||typeof Tm.stm!=='function';ui.exportTmTmx.disabled=!mapCount;
  if(ui.palMode)ui.palMode.disabled=!state.paletteOrder.length||state.edit.active;ui.palReorder.disabled=!state.paletteOrder.length||state.edit.active;ui.palEdit.disabled=!state.paletteOrder.length||state.edit.active;ui.palImport.disabled=!state.paletteOrder.length||state.edit.active;if(ui.palVariant)ui.palVariant.disabled=!state.paletteOrder.length||state.edit.active;
  const pd=paletteDirty();
  ui.palDefault.disabled=!pd;ui.palDefault.classList.toggle('is-hidden',!pd);
  ui.exportPalBin.disabled=!state.paletteOrder.length;ui.exportPalAsm.disabled=!state.paletteOrder.length;ui.exportPalAct.disabled=!state.paletteOrder.length;ui.exportPalGpl.disabled=!state.paletteOrder.length;if(ui.exportPalC)ui.exportPalC.disabled=!state.paletteOrder.length;if(ui.exportPalJasc)ui.exportPalJasc.disabled=!state.paletteOrder.length;
  if(!n&&state.reorder){state.reorder=false;state.drag=null}
  if(!n&&state.edit.active)resetTileEditState();
  if(!state.paletteOrder.length){state.palReorder=false;state.palEdit=false;state.palDrag=null}
  updateReorderUi();updatePaletteModeUi();
  if(state.error){ui.file.textContent=state.error;return}
  if(!state.src){ui.file.textContent=tr('info.default');setBadge(tr('badge.none'),'idle');return}
  const info=tr('file.meta',{file:state.fileName,w:state.fileW,h:state.fileH,colors:state.fileColors});
  if(over){ui.file.textContent=tr('file.overflow',{valid:n,start:s,max,budget:budgetOver?tr('file.budget',{valid:n,budget,excess:budgetExcess}):''});setBadge(tr('badge.overflow'),'idle')}
  else{
    const rem=state.removed?tr('file.removed',{removed:state.removed,s:state.removed>1?'s':''}):'',warn=budgetOver?tr('file.warn',{valid:n,budget,excess:budgetExcess}):'',ord=state.reorder?tr('file.reorder'):'',edit=state.edit.active?tr('file.edit'):'',mod=pd?tr('file.modifiedPalette'):'',pal=state.palReorder?tr('file.paletteReorder'):state.palEdit?tr('file.paletteEdit'):'',pv=state.palVariants.length>1?tr('file.paletteNum',{current:state.activePal+1,total:state.palVariants.length}):'',tm=state.tilemap?tr('hud.tilemap',{w:state.tilemap.w,h:state.tilemap.h}):'';
    ui.file.textContent=tr('file.tiles',{info,raw:state.raw,valid:n,warn,removed:rem,tilemap:tm,colors:state.paletteOrder.length,palette:pv,kb:(b/1024).toFixed(2),reorder:ord,edit,mod,palMode:pal});
    setBadge(budgetOver?tr('badge.warning'):tr('badge.valid'),budgetOver?'warning':'editing');
  }
}
function hexId(v){return '0x'+Number(v).toString(16).toUpperCase()}
function formatSize(bytes){return `${(bytes/1024).toFixed(2)} kB (${bytes} bytes)`}
function compressionText(bytes,base){const pct=base?((1-bytes/base)*100):0;return `${formatSize(bytes)} — ${pct.toFixed(1)}%`}
function setCompressedStat(row,field,bytes,base){if(!row||!field)return;const show=Number.isFinite(bytes)&&bytes>=0;row.classList.toggle('is-hidden',!show);if(show)field.textContent=compressionText(bytes,base)}
function resetTileCompressionStats(){state.psgBytes=null;state.zx7Bytes=null}
function resetTilemapCompressionStats(){state.tmRleBytes=null;state.tmStmBytes=null}
function resetGeneratedStats(){resetTileCompressionStats();resetTilemapCompressionStats()}


function resetTileEditState(){
  state.edit={active:false,index:-1,data:null,backupPixels:null,selectedPal:state.paletteOrder[0]??0,painting:false,layout:null};
  if(ui&&ui.editPanel)ui.editPanel.classList.add('is-hidden');
}
function toggleTileEditMode(){
  if(!state.tiles.length)return;
  if(state.edit.active){
    if(state.edit.index>=0)return cancelTileEdit();
    state.edit.active=false;state.hover=-1;clearTooltip();updateStats();renderSource();renderTiles();renderPalette();toast(tr('toast.tileEditOff'));return;
  }
  state.reorder=false;state.drag=null;state.palReorder=false;state.palEdit=false;state.palDrag=null;closePicker();clearTooltip();
  state.edit.active=true;state.edit.index=-1;state.edit.data=null;state.edit.backupPixels=null;state.edit.selectedPal=state.paletteOrder[0]??0;
  updateStats();renderTiles();renderPalette();toast(tr('toast.tileEditOn'));
}
function startTileEdit(idx){
  const tile=state.tiles[idx];
  if(!tile)return;
  if(state.edit.index>=0&&state.edit.index!==idx)cancelTileEdit(true);
  state.reorder=false;state.drag=null;state.palReorder=false;state.palEdit=false;state.palDrag=null;closePicker();clearTooltip();
  state.edit.active=true;state.edit.index=idx;state.edit.data=new Uint8Array(tile.data);state.edit.backupPixels=state.src.pixels.slice();state.edit.selectedPal=state.paletteOrder.includes(state.edit.selectedPal)?state.edit.selectedPal:(state.paletteOrder[0]??0);state.edit.painting=false;
  tile.data=state.edit.data;state.hover=idx;applyEditTileToSource();updateStats();renderSource();renderTiles();renderPalette();renderEditCanvas();
  toast(tr('toast.tileEditing',{idx}));
}
function renderEditCanvas(){
  const ed=state.edit,c=ui.editCanvas;
  if(!c)return;
  if(!ed.active||ed.index<0||!ed.data){c.width=1;c.height=1;return}
  const scale=32,x=c.getContext('2d');
  ed.layout={scale};c.width=8*scale;c.height=8*scale;x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);drawTile(x,ed.data,state.src.palette,0,0,scale);
  x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=1;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*scale+.5,0);x.lineTo(i*scale+.5,c.height);x.stroke();x.beginPath();x.moveTo(0,i*scale+.5);x.lineTo(c.width,i*scale+.5);x.stroke()}
  x.strokeStyle='rgba(255,255,255,.35)';x.strokeRect(.5,.5,c.width-1,c.height-1);updateEditColorUi();
}
function updateEditColorUi(){
  if(!ui.editSwatch||!ui.editColorInfo)return;
  const p=state.src&&state.src.palette[state.edit.selectedPal];
  if(!p||!state.edit.active){ui.editSwatch.style.background='transparent';ui.editColorInfo.textContent=tr('edit.colorEmpty');return}
  ui.editSwatch.style.background=hex(p);if(state.palMode==='gg'){const gg=rgbToGg(p);ui.editColorInfo.textContent=tr('edit.colorGg',{idx:state.edit.selectedPal,hex:hex(p),gg:hex4(gg.v),r:gg.r,g:gg.g,b:gg.b})}else{const sms=rgbToSms(p);ui.editColorInfo.textContent=tr('edit.colorSms',{idx:state.edit.selectedPal,hex:hex(p),sms:hex2(sms.v),r:sms.r,g:sms.g,b:sms.b})}
  if(ui.editInfo&&state.edit.index>=0)ui.editInfo.textContent=tr('edit.tileInfo',{idx:state.edit.index});
}
function editCellAt(e){
  const ed=state.edit,l=ed.layout;if(!l||ed.index<0)return null;
  const r=ui.editCanvas.getBoundingClientRect(),mx=(e.clientX-r.left)*(ui.editCanvas.width/r.width),my=(e.clientY-r.top)*(ui.editCanvas.height/r.height),x=Math.floor(mx/l.scale),y=Math.floor(my/l.scale);
  return x>=0&&y>=0&&x<8&&y<8?{x,y}:null;
}
function onEditCanvasDown(e){if(!state.edit.active||state.edit.index<0)return;const p=editCellAt(e);if(!p)return;if(e.button===2){e.preventDefault();pickEditPixelColor(p.x,p.y);return}if(e.button!==0)return;e.preventDefault();state.edit.painting=true;paintEditPixel(p.x,p.y);const up=()=>{state.edit.painting=false;removeEventListener('mouseup',up)};addEventListener('mouseup',up)}
function onEditCanvasMove(e){if(!state.edit.painting||!state.edit.active||state.edit.index<0)return;const p=editCellAt(e);if(p)paintEditPixel(p.x,p.y)}
function pickEditPixelColor(x,y){
  const ed=state.edit;if(!ed.data)return;
  ed.selectedPal=ed.data[y*8+x];
  clearTooltip();renderPalette();renderEditCanvas();updateEditColorUi();toast(tr('toast.colorSelected',{idx:ed.selectedPal}));
}
function paintEditPixel(x,y){
  const ed=state.edit;if(!ed.data)return;const v=ed.selectedPal;
  if(ed.data[y*8+x]===v)return;
  ed.data[y*8+x]=v;state.tiles[ed.index].data=ed.data;applyEditTileToSource();resetGeneratedStats();renderEditCanvas();renderSource();renderTiles();updateStats();
}
function applyEditTileToSource(){
  const ed=state.edit,tile=state.tiles[ed.index];if(!state.src||!tile||!ed.data)return;
  for(const p of tile.positions){const d=(p.h||p.v)?mirror(ed.data,!!p.h,!!p.v):ed.data;writeTile(state.src.pixels,state.src.w,p.x,p.y,d)}
}
function writeTile(pixels,w,x,y,data){for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++)pixels[(y+ty)*w+x+tx]=data[ty*8+tx]}
function finishTileEdit(){
  if(!state.edit.active)return;
  if(state.edit.index<0){state.edit.active=false;updateStats();renderTiles();renderPalette();return}
  const before=state.tiles.length;state.edit.active=false;state.edit.index=-1;state.edit.data=null;state.edit.backupPixels=null;state.edit.painting=false;clearTooltip();process();
  toast(ui.dedupe.checked&&state.tiles.length<before?tr('toast.tileMerged'):tr('toast.tileModified'));
}
function cancelTileEdit(silent){
  if(!state.edit.active)return;
  const backup=state.edit.backupPixels;state.edit.active=false;state.edit.index=-1;state.edit.data=null;state.edit.backupPixels=null;state.edit.painting=false;clearTooltip();
  if(backup&&state.src)state.src.pixels=backup;
  process();
  if(!silent)toast(tr('toast.editCanceled'));
}

function updateReorderUi(){ui.reorder.classList.toggle('act',state.reorder);ui.tiles.classList.toggle('reorder-mode',state.reorder);ui.reorder.textContent=state.reorder?tr('btn.done'):tr('btn.reorder');ui.editBtn.classList.toggle('act',state.edit.active);ui.editBtn.textContent=state.edit.active?tr('btn.quit'):tr('btn.edit');ui.editPanel.classList.toggle('is-hidden',!(state.edit.active&&state.edit.index>=0));ui.tiles.classList.toggle('edit-mode',state.edit.active)}
function updatePaletteModeUi(){if(ui.palMode)ui.palMode.value=state.palMode;ui.palReorder.classList.toggle('act',state.palReorder);ui.palEdit.classList.toggle('act',state.palEdit);ui.palCanvas.classList.toggle('reorder-mode',state.palReorder);ui.palCanvas.classList.toggle('edit-mode',state.palEdit);ui.palCanvas.classList.toggle('pick-mode',state.edit.active&&state.edit.index>=0);ui.palCanvas.classList.toggle('disabled-tooltips',state.edit.active);ui.palReorder.textContent=state.palReorder?tr('btn.done'):tr('btn.reorder');ui.palEdit.textContent=state.palEdit?tr('btn.done'):tr('btn.modify');updateEditColorUi()}
function renderSource(){
  const src=state.src,c=ui.source;
  if(!src||c.hidden){updateSourceOverlay();return}
  const x=c.getContext('2d'),base=indexedCanvas(src.w,src.h,src.pixels,src.palette),pad=28,aw=Math.max(32,ui.wrap.clientWidth-pad),ah=Math.max(32,ui.wrap.clientHeight-pad),fit=Math.min(aw/src.w,ah/src.h),scale=Math.max(.125,Math.min(4,fit));
  state.sourceScale=scale;c.width=Math.max(1,Math.round(src.w*scale));c.height=Math.max(1,Math.round(src.h*scale));
  x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);x.drawImage(base,0,0,c.width,c.height);
  if(scale>=2){
    x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=1;
    for(let i=0;i<=src.w;i+=8){x.beginPath();x.moveTo(Math.round(i*scale)+.5,0);x.lineTo(Math.round(i*scale)+.5,c.height);x.stroke()}
    for(let i=0;i<=src.h;i+=8){x.beginPath();x.moveTo(0,Math.round(i*scale)+.5);x.lineTo(c.width,Math.round(i*scale)+.5);x.stroke()}
  }
  highlightSource(x,scale);
  updateSourceOverlay();
}
function highlightSource(x,scale){
  const tile=state.tiles[state.hover];
  if(!tile)return;
  const primary=state.hoverPos>=0?state.hoverPos:0;
  tile.positions.forEach((p,i)=>{
    const isPrimary=i===primary,sx=Math.round(p.x*scale),sy=Math.round(p.y*scale),sw=Math.max(1,Math.round(8*scale)),sh=Math.max(1,Math.round(8*scale));
    x.fillStyle=isPrimary?'rgba(74,158,255,.30)':'rgba(240,160,48,.20)';
    x.fillRect(sx,sy,sw,sh);
    x.lineWidth=Math.max(1,Math.round(scale>=1?1:0));
    x.strokeStyle=isPrimary?'rgba(74,158,255,1)':'rgba(240,160,48,.95)';
    x.strokeRect(sx+.5,sy+.5,Math.max(1,sw-1),Math.max(1,sh-1));
  });
}
function sourceTileAt(e){
  const src=state.src;if(!src)return null;
  const c=ui.source,r=c.getBoundingClientRect();
  if(!r.width||!r.height)return null;
  const mx=(e.clientX-r.left)*(c.width/r.width),my=(e.clientY-r.top)*(c.height/r.height);
  const scale=state.sourceScale||1,px=mx/scale,py=my/scale;
  const tx=Math.floor(px/8),ty=Math.floor(py/8);
  if(tx<0||ty<0||tx*8>=src.w||ty*8>=src.h)return null;
  const tw=src.w/8,cellIdx=ty*tw+tx,cell=state.tilemap&&state.tilemap.cells[cellIdx];
  if(!cell)return null;
  const tileIdx=state.tiles.indexOf(cell.tile);
  if(tileIdx<0)return null;
  const posIdx=cell.tile.positions.findIndex(p=>p.tx===tx&&p.ty===ty);
  return{tileIdx,posIdx:posIdx>=0?posIdx:0};
}
function onSourceMove(e){
  if(state.edit.active||state.reorder)return;
  const info=sourceTileAt(e);
  if(!info){if(state.hover>=0)clearHover();return}
  const {tileIdx,posIdx}=info;
  if(state.hover!==tileIdx||state.hoverPos!==posIdx){
    state.hover=tileIdx;state.hoverPos=posIdx;
    renderSource();renderTiles();
  }
  showTipSource(e,tileIdx);
}
function showTipSource(e,idx){
  const s=Number(ui.start.value),id=s+idx,tile=state.tiles[idx];
  if(!tile){clearTooltip();return}
  const label=(window.TileLang&&window.TileLang.cur==='en')?'Occurrences':'Occurrences';
  tip.textContent=`ID ${id} (${hexId(id)})\n${label} ${tile.occ}`;
  placeTip(e);
}
function renderTiles(){
  const src=state.src,c=ui.tiles,x=c.getContext('2d'),tiles=state.tiles;
  if(!src||!tiles.length){c.width=1;c.height=1;state.tileLayout=null;ui.tilesEmpty.style.display='block';updateTilesOverlay();updateStats();return}
  ui.tilesEmpty.style.display='none';
  const scale=3,gap=0,tileSize=8*scale;
  // Nb de colonnes = combien de tiles rentrent dans la largeur dispo du panel de droite
  const avail=Math.max(tileSize,(ui.rpanel?ui.rpanel.clientWidth:400)-20);
  const cols=Math.max(1,Math.floor(avail/(tileSize+gap)));
  const rows=Math.ceil(tiles.length/cols);
  state.tileLayout={scale,gap,tileSize,cols,rows};c.width=cols*tileSize+(cols-1)*gap;c.height=rows*tileSize+(rows-1)*gap;x.clearRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;
  tiles.forEach((t,i)=>{const ox=(i%cols)*(tileSize+gap),oy=Math.floor(i/cols)*(tileSize+gap),dragged=state.drag&&state.drag.from===i,target=state.drag&&state.drag.to===i;x.save();if(dragged)x.globalAlpha=.35;drawTile(x,t.data,src.palette,ox,oy,scale);x.restore();if(i===state.hover||target||dragged){x.strokeStyle=dragged?'rgba(240,160,48,1)':target?'rgba(0,200,104,1)':'rgba(74,158,255,1)';x.lineWidth=2;x.strokeRect(ox+1,oy+1,tileSize-2,tileSize-2)}});
  x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=1;for(let i=0;i<=cols;i++){x.beginPath();x.moveTo(i*tileSize+.5,0);x.lineTo(i*tileSize+.5,c.height);x.stroke()}for(let i=0;i<=rows;i++){x.beginPath();x.moveTo(0,i*tileSize+.5);x.lineTo(c.width,i*tileSize+.5);x.stroke()}
  updateTilesOverlay();
  updateStats();
}
function activeSlot(){
  if(!state.dualPalette)return 0;
  if(state.activePal===state.slots[1])return 1;
  return 0;
}
function palIdxAt(localIdx){
  if(state.palLayout&&state.palLayout.slotOrder)return state.palLayout.slotOrder[localIdx];
  return state.paletteOrder[localIdx];
}
function setSrcPaletteColor(palIdx,color){
  if(!state.src||palIdx===undefined)return;
  state.src.palette[palIdx]={r:color.r,g:color.g,b:color.b};
  // Sync avec la variante du slot correspondant
  const slot=palIdx<16?0:1,varIdx=state.slots[slot];
  if(varIdx!==null&&varIdx!==undefined&&state.palVariants[varIdx]){
    state.palVariants[varIdx].colors[palIdx&15]={r:color.r,g:color.g,b:color.b};
  }
}
function renderPalette(){
  const src=state.src,c=ui.palCanvas,x=c.getContext('2d'),order=state.paletteOrder;
  if(!src||!order.length){c.width=1;c.height=1;state.palLayout=null;ui.palCanvas.classList.remove('active-palette');ui.palEmpty.style.display='block';renderPaletteVariants();updateStats();return}
  ui.palCanvas.classList.add('active-palette');ui.palEmpty.style.display='none';
  // Filtre l'ordre pour le slot actif (0-15 pour pal1, 16-31 pour pal2)
  const slot=activeSlot();
  const slotOrder=state.dualPalette?order.filter(i=>slot===0?i<16:i>=16):order;
  const w=14,h=28,gap=2,cols=16,rows=1;
  state.palLayout={w,h,gap,cols,rows,slotOrder};
  c.width=cols*w+(cols-1)*gap;c.height=h;x.clearRect(0,0,c.width,c.height);
  for(let i=0;i<cols;i++){
    const palIdx=slotOrder[i],ox=i*(w+gap),oy=0;
    const dragged=state.palDrag&&state.palDrag.from===i,target=state.palDrag&&state.palDrag.to===i;
    x.strokeStyle='rgba(255,255,255,.12)';x.strokeRect(ox+.5,oy+.5,w-1,h-1);
    if(palIdx===undefined)continue;
    const p=src.palette[palIdx];
    x.save();if(dragged)x.globalAlpha=.35;x.fillStyle=`rgb(${p.r},${p.g},${p.b})`;x.fillRect(ox,oy,w,h);x.restore();
    if(i===state.palHover||target||dragged||palIdx===state.edit.selectedPal&&state.edit.active&&state.edit.index>=0){
      x.strokeStyle=palIdx===state.edit.selectedPal&&state.edit.active&&state.edit.index>=0?'rgba(0,200,104,1)':dragged?'rgba(240,160,48,1)':target?'rgba(0,200,104,1)':'rgba(74,158,255,1)';
      x.lineWidth=2;x.strokeRect(ox+1,oy+1,w-2,h-2);
    }
  }
  renderPaletteVariants();updateStats();
}
function indexedCanvas(w,h,pix,pal){const c=document.createElement('canvas'),x=c.getContext('2d'),id=x.createImageData(w,h);c.width=w;c.height=h;for(let i=0;i<pix.length;i++){const p=pal[pix[i]]||{r:0,g:0,b:0},j=i*4;id.data[j]=p.r;id.data[j+1]=p.g;id.data[j+2]=p.b;id.data[j+3]=255}x.putImageData(id,0,0);return c}
function drawTile(x,t,pal,ox,oy,s){for(let y=0;y<8;y++)for(let xx=0;xx<8;xx++){const p=pal[t[y*8+xx]]||{r:0,g:0,b:0};x.fillStyle=`rgb(${p.r},${p.g},${p.b})`;x.fillRect(ox+xx*s,oy+y*s,s,s)}}
function tileAt(e){const l=state.tileLayout,tiles=state.tiles;if(!l||!tiles.length)return-1;const r=ui.tiles.getBoundingClientRect(),mx=(e.clientX-r.left)*(ui.tiles.width/r.width),my=(e.clientY-r.top)*(ui.tiles.height/r.height),step=l.tileSize+l.gap,col=Math.floor(mx/step),row=Math.floor(my/step),ix=mx-col*step,iy=my-row*step,idx=row*l.cols+col;return ix>=0&&iy>=0&&ix<l.tileSize&&iy<l.tileSize&&idx>=0&&idx<tiles.length?idx:-1}
function paletteAt(e){
  const l=state.palLayout,order=state.paletteOrder;
  if(!l||!order.length)return -1;
  const r=ui.palCanvas.getBoundingClientRect(),mx=(e.clientX-r.left)*(ui.palCanvas.width/r.width),my=(e.clientY-r.top)*(ui.palCanvas.height/r.height);
  const step=l.w+l.gap,col=Math.floor(mx/step),ix=mx-col*step;
  if(ix<0||my<0||ix>=l.w||my>=l.h||col<0||col>=l.cols)return -1;
  const so=l.slotOrder||order;
  if(so[col]===undefined)return -1;
  return col;
}
function onTileMove(e){const idx=tileAt(e),tiles=state.tiles;if(state.edit.active&&state.edit.index>=0){clearTooltip();return}if(idx<0)return state.drag?null:clearHover();if(state.drag){if(state.drag.to!==idx){state.drag.to=idx;state.hover=idx;renderSource();renderTiles()}showDragTip(e,state.drag.from,idx);return}if(state.hover!==idx||state.hoverPos!==-1){state.hover=idx;state.hoverPos=-1;renderSource();renderTiles()}showTip(e,idx,tiles[idx])}
function onTileDown(e){if(e.button!==0)return;const idx=tileAt(e);if(idx<0)return;if(state.edit.active){e.preventDefault();startTileEdit(idx);return}if(state.dualPalette&&!state.reorder){e.preventDefault();toggleTilePalette(idx);return}if(!state.reorder)return;e.preventDefault();state.drag={from:idx,to:idx};state.hover=idx;clearTooltip();document.body.classList.add('tile-dragging');renderTiles();const move=ev=>onTileMove(ev),up=ev=>{removeEventListener('mousemove',move);removeEventListener('mouseup',up);document.body.classList.remove('tile-dragging');const d=state.drag,target=tileAt(ev);if(d){const to=target>=0?target:d.to;if(to>=0&&to!==d.from){moveTile(d.from,to);resetGeneratedStats()}state.hover=to>=0?to:d.from;state.drag=null;updateStats();renderSource();renderTiles();if(to>=0&&to!==d.from)toast(tr('toast.tileMoved'))}clearTooltip()};addEventListener('mousemove',move);addEventListener('mouseup',up)}
function toggleTilePalette(idx){
  const tile=state.tiles[idx];if(!tile||!state.src)return;
  // XOR data du tile + bascule flag
  for(let i=0;i<tile.data.length;i++)tile.data[i]^=16;
  tile.palette=tile.palette===0?1:0;
  // Recopie dans src.pixels à toutes les positions occupées
  for(const p of tile.positions){
    const d=(p.h||p.v)?mirror(tile.data,!!p.h,!!p.v):tile.data;
    writeTile(state.src.pixels,state.src.w,p.x,p.y,d);
  }
  setUsedPalette(state.src.pixels,state.src.palette.length);
  resetGeneratedStats();
  renderSource();renderTiles();renderPalette();updateStats();
}
function moveTile(from,to){const a=state.tiles,t=a.splice(from,1)[0];a.splice(to,0,t)}
function onPaletteMove(e){const idx=paletteAt(e);if(state.edit.active){if(idx<0)return clearPaletteHover();if(state.palHover!==idx){state.palHover=idx;renderPalette()}clearTooltip();return}if(idx<0)return state.palDrag?null:clearPaletteHover();if(state.palDrag){if(state.palDrag.to!==idx){state.palDrag.to=idx;state.palHover=idx;renderPalette()}showPaletteDragTip(e,state.palDrag.from,idx);return}if(state.palHover!==idx){state.palHover=idx;renderPalette()}showPaletteTip(e,idx)}
function onPaletteDown(e){if(state.edit.active)return;if(!state.palReorder||e.button!==0)return;const idx=paletteAt(e);if(idx<0)return;e.preventDefault();state.palDrag={from:idx,to:idx};state.palHover=idx;clearTooltip();document.body.classList.add('tile-dragging');renderPalette();const move=ev=>onPaletteMove(ev),up=ev=>{removeEventListener('mousemove',move);removeEventListener('mouseup',up);document.body.classList.remove('tile-dragging');const d=state.palDrag,target=paletteAt(ev);if(d){const to=target>=0?target:d.to;if(to>=0&&to!==d.from)movePalette(d.from,to);state.palHover=to>=0?to:d.from;state.palDrag=null;renderPalette();if(to>=0&&to!==d.from)toast(tr('toast.colorMoved'))}clearTooltip()};addEventListener('mousemove',move);addEventListener('mouseup',up)}
function onPaletteClick(e){const idx=paletteAt(e);if(idx<0)return;if(state.edit.active&&state.edit.index>=0){const palIdx=palIdxAt(idx);if(palIdx===undefined)return;state.edit.selectedPal=palIdx;clearTooltip();renderPalette();renderEditCanvas();updateEditColorUi();return}if(!state.palEdit||state.palDrag)return;openPicker(idx)}
function movePalette(from,to){
  const a=state.paletteOrder;
  if(!state.dualPalette){const p=a.splice(from,1)[0];a.splice(to,0,p);return}
  // Mode dual : reorder seulement à l'intérieur du slot actif
  const slot=activeSlot(),isInSlot=v=>slot===0?v<16:v>=16;
  const positions=[];
  for(let i=0;i<a.length;i++)if(isInSlot(a[i]))positions.push(i);
  const values=positions.map(p=>a[p]);
  const moved=values.splice(from,1)[0];
  values.splice(to,0,moved);
  for(let i=0;i<positions.length;i++)a[positions[i]]=values[i];
}
function showTip(e,idx,tile){const s=Number(ui.start.value),id=s+idx,p=tile.positions[0],more=tile.occ>1?tr('tip.more',{occ:tile.occ}):'';tip.textContent=tr('tip.tile',{id,hex:hexId(id),idx,occ:tile.occ,x:p.x,y:p.y,tx:p.tx,ty:p.ty,more});placeTip(e)}
function showDragTip(e,from,to){const s=Number(ui.start.value),old=s+from,nw=s+to;tip.textContent=tr('tip.dragTile',{old,oldHex:hexId(old),new:nw,newHex:hexId(nw),from,to});placeTip(e)}
function showPaletteTip(e,idx){const palIdx=palIdxAt(idx);if(palIdx===undefined)return;const p=state.src.palette[palIdx],occ=state.palCounts.get(palIdx)||0;if(state.palMode==='gg'){const gg=rgbToGg(p);tip.textContent=tr('tip.paletteGg',{idx,png:palIdx,hex:hex(p),gg:hex4(gg.v),r:gg.r,g:gg.g,b:gg.b,occ})}else{const sms=rgbToSms(p);tip.textContent=tr('tip.paletteSms',{idx,png:palIdx,hex:hex(p),sms:hex2(sms.v),r:sms.r,g:sms.g,b:sms.b,occ})}placeTip(e)}
function showPaletteDragTip(e,from,to){const p=palIdxAt(from);if(p===undefined)return;const c=state.src.palette[p];if(state.palMode==='gg'){const gg=rgbToGg(c);tip.textContent=tr('tip.dragColorGg',{from,to,png:p,gg:hex4(gg.v)})}else{const sms=rgbToSms(c);tip.textContent=tr('tip.dragColorSms',{from,to,png:p,sms:hex2(sms.v)})}placeTip(e)}
function placeTip(e){tip.style.display='block';const m=14,w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+m,y=e.clientY+m;if(x+w>innerWidth-6)x=e.clientX-w-m;if(y+h>innerHeight-6)y=e.clientY-h-m;tip.style.left=x+'px';tip.style.top=y+'px'}
function clearTooltip(){tip.style.display='none'}
function clearHover(){if(state.hover!==-1){state.hover=-1;state.hoverPos=-1;renderSource();renderTiles()}clearTooltip()}
function clearPaletteHover(){if(state.palHover!==-1){state.palHover=-1;renderPalette()}clearTooltip()}
function buildSmsGrid(){ui.smsGrid.innerHTML='';for(let b=0;b<4;b++)for(let g=0;g<4;g++)for(let r=0;r<4;r++){const v=r|(g<<2)|(b<<4),p=smsToRgb(v),btn=document.createElement('button');btn.type='button';btn.className='sms-cell';btn.dataset.v=v;btn.style.backgroundColor=`rgb(${p.r},${p.g},${p.b})`;btn.title=tr('picker.smsTitle',{sms:hex2(v),r,g,b});btn.onclick=()=>pickSms(v);ui.smsGrid.appendChild(btn)}}
function openPicker(idx){const palIdx=palIdxAt(idx);if(palIdx===undefined)return;const p=state.src.palette[palIdx];state.palTarget=palIdx;state.palOriginal={r:p.r,g:p.g,b:p.b};ui.pickerTitle.textContent=tr('picker.titleFull',{idx,png:palIdx});ui.picker.hidden=false;updatePickerMode();centerPicker();updatePickerInfo();clearTooltip()}
function closePicker(){ui.picker.hidden=true;state.palTarget=-1;state.palOriginal=null}
function cancelPicker(){if(state.src&&state.palTarget>=0&&state.palOriginal){setSrcPaletteColor(state.palTarget,state.palOriginal);renderSource();renderTiles();renderPalette();updateStats()}closePicker()}
function pickSms(v){if(!state.src||state.palTarget<0)return;const p=smsToRgb(v);setSrcPaletteColor(state.palTarget,p);renderSource();renderTiles();renderPalette();updateStats();updatePickerInfo();toast(tr('toast.colorChangedSms',{sms:hex2(v)}))}
function pickGgHex(v){const m=String(v).match(/^#?([0-9a-f]{6})$/i);if(!m||!state.src||state.palTarget<0)return;pickGgRgbValues(parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16))}
function pickGgRgb(){pickGgRgbValues(Number(ui.ggR.value)||0,Number(ui.ggG.value)||0,Number(ui.ggB.value)||0)}
function pickGgRgbValues(r,g,b){if(!state.src||state.palTarget<0)return;const gg=rgbToGg({r:clamp(r,0,255),g:clamp(g,0,255),b:clamp(b,0,255)}),p=ggToRgb(gg.v);setSrcPaletteColor(state.palTarget,p);renderSource();renderTiles();renderPalette();updateStats();updatePickerInfo();toast(tr('toast.colorChangedGg',{gg:hex4(gg.v)}))}
async function pickEyeDropper(){try{if(!window.EyeDropper)return toast(tr('err.eyedropper'),true);const r=await new EyeDropper().open();if(r&&r.sRGBHex)pickGgHex(r.sRGBHex)}catch(e){}}
function updatePickerMode(){if(!ui.smsGrid||!ui.ggPicker)return;ui.smsGrid.hidden=state.palMode==='gg';ui.ggPicker.hidden=state.palMode!=='gg'}
function updatePickerInfo(){if(!state.src||state.palTarget<0)return;const p=state.src.palette[state.palTarget],o=state.palOriginal,os=o?`<span class="palette-origin">${xml(tr('picker.origin',{hex:hex(o)}))}</span>`:'';if(state.palMode==='gg'){const gg=rgbToGg(p);ui.pickerCurrent.innerHTML=`<span class="palette-current-swatch" style="background:${hex(p)}"></span><span>${xml(tr('picker.currentGg',{hex:hex(p),gg:hex4(gg.v),r:gg.r,g:gg.g,b:gg.b}))}</span>${os}`;setGgInputs(p)}else{const sms=rgbToSms(p);ui.pickerCurrent.innerHTML=`<span class="palette-current-swatch" style="background:${hex(p)}"></span><span>${xml(tr('picker.currentSms',{hex:hex(p),sms:hex2(sms.v),r:sms.r,g:sms.g,b:sms.b}))}</span>${os}`;ui.smsGrid.querySelectorAll('.sms-cell').forEach(b=>b.classList.toggle('sel',Number(b.dataset.v)===sms.v))}}
function setGgInputs(p){if(!ui.ggColor)return;ui.ggColor.value=hex(p).toLowerCase();ui.ggR.value=p.r;ui.ggG.value=p.g;ui.ggB.value=p.b}
function setPaletteMode(m,manual){m=m==='gg'?'gg':'sms';state.palMode=m;if(ui.palMode)ui.palMode.value=m;updatePickerMode();updatePaletteModeUi();if(state.palTarget>=0)updatePickerInfo();if(manual)toast(tr('toast.paletteMode',{mode:m.toUpperCase()}))}
function centerPicker(){ui.pickerBox.style.left='50%';ui.pickerBox.style.top='50%';ui.pickerBox.style.transform='translate(-50%,-50%)'}
function initPickerDrag(){const h=ui.pickerBox.querySelector('.modal-head');h.addEventListener('mousedown',e=>{if(e.button!==0||e.target.closest('button'))return;e.preventDefault();const r=ui.pickerBox.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;ui.pickerBox.style.transform='none';const move=ev=>{const bw=ui.pickerBox.offsetWidth,bh=ui.pickerBox.offsetHeight,x=clamp(ev.clientX-ox,0,innerWidth-bw),y=clamp(ev.clientY-oy,0,innerHeight-bh);ui.pickerBox.style.left=x+'px';ui.pickerBox.style.top=y+'px'},up=()=>{removeEventListener('mousemove',move);removeEventListener('mouseup',up)};addEventListener('mousemove',move);addEventListener('mouseup',up)})}
function clonePalette(pal){return pal.map(p=>({r:p.r,g:p.g,b:p.b}))}
function renderPaletteVariants(){
  const box=ui.palVariants;if(!box)return;box.innerHTML='';
  if(!state.src||!state.paletteOrder.length||!state.palVariants.length){box.style.display='none';return}
  box.style.display='flex';
  const w=14,h=28,gap=2,cols=16,slot0=state.slots[0],slot1=state.slots[1],dual=state.dualPalette;
  // Bouton swap en mode dual
  if(dual){
    const swapBtn=document.createElement('button');
    swapBtn.type='button';swapBtn.className='palette-swap-btn';
    swapBtn.textContent='⇅ '+tr('palette.swap','Échanger P1 ↔ P2');
    swapBtn.onclick=e=>{e.stopPropagation();swapPaletteSlots()};
    box.appendChild(swapBtn);
  }
  // Ordre d'affichage : slot0, slot1, puis autres variants
  const displayOrder=[];
  if(slot0!==null&&slot0!==undefined)displayOrder.push(slot0);
  if(dual&&slot1!==null&&slot1!==undefined&&slot1!==slot0)displayOrder.push(slot1);
  state.palVariants.forEach((_,idx)=>{if(idx!==slot0&&idx!==slot1)displayOrder.push(idx)});
  displayOrder.forEach(idx=>{
    const v=state.palVariants[idx];if(!v)return;
    const row=document.createElement('div'),name=document.createElement('span'),slotSpan=document.createElement('span');
    row.className='palette-variant'+(idx===state.activePal?' active':'');
    row.onclick=e=>{if(!state.edit.active&&idx!==state.activePal&&!e.target.closest('button'))setActivePalette(idx)};
    name.className='palette-variant-name';
    const badge=idx===slot0?'[P1] ':idx===slot1?'[P2] ':'';
    name.textContent=badge+(v.name||tr('variant.defaultName',{idx:idx+1}));
    row.appendChild(name);
    if(idx===state.activePal){
      row.appendChild(ui.palCanvas);
    }else{
      const can=document.createElement('canvas'),x=can.getContext('2d');
      can.width=cols*w+(cols-1)*gap;can.height=h;
      // Détermine quelles couleurs afficher
      const isSlotVariant=dual&&(idx===slot0||idx===slot1);
      if(isSlotVariant){
        const slot=idx===slot0?0:1,usedInSlot=state.paletteOrder.filter(pi=>slot===0?pi<16:pi>=16);
        for(let i=0;i<cols;i++){
          const palIdx=usedInSlot[i],ox=i*(w+gap);
          x.strokeStyle='rgba(255,255,255,.12)';x.strokeRect(ox+.5,.5,w-1,h-1);
          if(palIdx===undefined)continue;
          const p=state.src.palette[palIdx]||{r:0,g:0,b:0};
          x.fillStyle=`rgb(${p.r},${p.g},${p.b})`;x.fillRect(ox,0,w,h);
        }
      }else{
        for(let i=0;i<cols;i++){
          const palIdx=state.paletteOrder[i],ox=i*(w+gap);
          x.strokeStyle='rgba(255,255,255,.12)';x.strokeRect(ox+.5,.5,w-1,h-1);
          if(palIdx===undefined)continue;
          const p=v.colors[palIdx]||v.colors[palIdx&15]||{r:0,g:0,b:0};
          x.fillStyle=`rgb(${p.r},${p.g},${p.b})`;x.fillRect(ox,0,w,h);
        }
      }
      row.appendChild(can);
    }
    // Bouton × : seulement pour variantes non-base et non-slot
    if(idx!==state.activePal&&!v.base&&idx!==slot0&&idx!==slot1){
      const b=document.createElement('button');b.type='button';b.className='palette-remove';b.textContent='×';b.title=tr('variant.remove');
      b.onclick=e=>{e.stopPropagation();removePaletteVariant(idx)};
      row.appendChild(b);
    }else{slotSpan.className='palette-remove-space';row.appendChild(slotSpan)}
    box.appendChild(row);
  });
}
function setActivePalette(idx){
  if(!state.src||!state.palVariants[idx])return;
  if(state.dualPalette){
    if(idx===state.slots[0]||idx===state.slots[1]){
      // Slot variant : simple changement de focus
      state.activePal=idx;state.palHover=-1;closePicker();
      renderPalette();updateStats();
      return;
    }
    // Variante non-slot : prompt de choix
    slotChoicePopup(tr('slotChoose','Assigner cette variante à quelle palette ?')).then(slot=>{
      if(slot===null)return;
      assignVariantToSlot(idx,slot);
    });
    return;
  }
  // Mode palette unique : comportement existant
  state.activePal=idx;state.src.palette=state.palVariants[idx].colors;
  if(paletteMode(state.src.palette)==='gg')setPaletteMode('gg');
  state.palHover=-1;closePicker();
  renderSource();renderTiles();renderPalette();updateStats();
  toast(tr('toast.paletteActive',{name:state.palVariants[idx].name}));
}
function assignVariantToSlot(varIdx,slot){
  const v=state.palVariants[varIdx];if(!v)return;
  const off=slot*16;
  for(let i=0;i<16;i++){
    const c=v.colors[i]||{r:0,g:0,b:0};
    state.src.palette[off+i]={r:c.r,g:c.g,b:c.b};
  }
  state.slots[slot]=varIdx;state.activePal=varIdx;state.palHover=-1;
  closePicker();
  renderSource();renderTiles();renderPalette();updateStats();
  toast(tr('toast.paletteAssigned','{name} → Palette {slot}',{name:v.name,slot:slot+1}));
}
function swapPaletteSlots(){
  if(!state.dualPalette||!state.src)return;
  // XOR pixels source
  const px=state.src.pixels;
  for(let i=0;i<px.length;i++)px[i]^=16;
  // XOR chaque tile et bascule tile.palette
  for(const t of state.tiles){
    const td=t.data;
    for(let i=0;i<td.length;i++)td[i]^=16;
    t.palette=t.palette===0?1:0;
  }
  // Échange les 2 moitiés de state.src.palette
  const tmp=state.src.palette.slice(0,16);
  for(let i=0;i<16;i++){
    state.src.palette[i]=state.src.palette[16+i];
    state.src.palette[16+i]=tmp[i];
  }
  // Échange les slots
  [state.slots[0],state.slots[1]]=[state.slots[1],state.slots[0]];
  // Focus reste sur le slot 0 par convention
  state.activePal=state.slots[0];
  setUsedPalette(state.src.pixels,state.src.palette.length);
  state.palHover=-1;closePicker();
  renderSource();renderTiles();renderPalette();updateStats();
  toast(tr('toast.slotsSwapped','Palettes 1 et 2 échangées'));
}
function slotChoicePopup(title){
  return new Promise(res=>{
    const m=document.createElement('div');m.className='choice-pop';
    m.innerHTML=`<div class="choice-box"><div class="choice-title">${xml(title)}</div><div class="choice-actions"><button type="button" data-v="0">→ Palette 1</button><button type="button" data-v="1">→ Palette 2</button><button type="button" data-v="cancel">${xml(tr('choice.cancel','Annuler'))}</button></div></div>`;
    m.onclick=e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;m.remove();res(v==='0'?0:v==='1'?1:null)};
    document.body.appendChild(m);
  });
}
function removePaletteVariant(idx){if(idx===state.activePal||!state.palVariants[idx])return;state.palVariants.splice(idx,1);if(state.activePal>idx)state.activePal--;renderPalette();updateStats();toast(tr('toast.paletteRemoved'))}
function paletteDirty(){const s=state.src;if(!s||!s.defaultPalette)return false;return s.palette.some((p,i)=>{const q=s.defaultPalette[i];return !q||p.r!==q.r||p.g!==q.g||p.b!==q.b})}
function restoreDefaultPalette(){if(!state.src||!paletteDirty())return;const pal=clonePalette(state.src.defaultPalette);if(state.palVariants[state.activePal])state.palVariants[state.activePal].colors=pal;state.src.palette=pal;closePicker();renderSource();renderTiles();renderPalette();updateStats();toast(tr('toast.paletteRestored'))}
async function importPaletteFile(file){try{if(!state.src||!state.paletteOrder.length)return;const buf=await file.arrayBuffer(),colors=parsePaletteImport(file,buf,state.palMode);if(!colors.length)throw Error(tr('err.paletteEmpty'));const order=state.paletteOrder,n=Math.min(colors.length,order.length,16);for(let i=0;i<n;i++)state.src.palette[order[i]]=colors[i];if(colors.mode==='gg'||paletteMode(state.src.palette)==='gg')setPaletteMode('gg');renderSource();renderTiles();renderPalette();updateStats();toast(tr('toast.paletteImported',{n,s:n>1?'s':''}))}catch(err){toast(err.message,true)}}
async function importPaletteVariantFile(file){try{if(!state.src||!state.paletteOrder.length)return;const buf=await file.arrayBuffer(),colors=parsePaletteImport(file,buf,state.palMode);if(!colors.length)throw Error(tr('err.paletteEmpty'));const order=state.paletteOrder,pal=clonePalette(state.src.palette),n=Math.min(colors.length,order.length,16);for(let i=0;i<n;i++)pal[order[i]]=colors[i];state.palVariants.push({name:file.name.replace(/\.[^.]+$/,'')||tr('variant.new',{idx:state.palVariants.length}),colors:pal,base:false});state.activePal=state.palVariants.length-1;state.src.palette=pal;if(colors.mode==='gg'||paletteMode(pal)==='gg')setPaletteMode('gg');state.palHover=-1;closePicker();renderSource();renderTiles();renderPalette();updateStats();toast(tr('toast.paletteVariantAdded',{n,s:n>1?'s':''}))}catch(err){toast(err.message,true)}}
function currentPalette(){return state.paletteOrder.map(i=>state.src.palette[i])}
// Version paddée à 16 (single) ou 32 (dual) avec du noir pour les slots manquants.
// Utilisée pour tous les exports palette (BIN/ASM/C/ACT/GPL/JASC).
function currentPalettePadded(){
  const black=()=>({r:0,g:0,b:0});
  if(state.dualPalette){
    const p0=state.paletteOrder.filter(i=>i<16).map(i=>state.src.palette[i]);
    while(p0.length<16)p0.push(black());
    const p1=state.paletteOrder.filter(i=>i>=16).map(i=>state.src.palette[i]);
    while(p1.length<16)p1.push(black());
    return [...p0,...p1];
  }
  const pal=state.paletteOrder.map(i=>state.src.palette[i]);
  while(pal.length<16)pal.push(black());
  return pal;
}
function paletteSmsBytes(){return Uint8Array.from(currentPalettePadded().map(p=>rgbToSms(p).v))}
function paletteGgBytes(){const pal=currentPalettePadded(),out=new Uint8Array(pal.length*2);pal.forEach((p,i)=>{const v=rgbToGg(p).v;out[i*2]=v&255;out[i*2+1]=v>>8});return out}
function paletteBytes(){return state.palMode==='gg'?paletteGgBytes():paletteSmsBytes()}
function smsBytes(){const out=new Uint8Array(state.tiles.length*32);state.tiles.forEach((tile,n)=>{const t=tile.data;let o=n*32;for(let y=0;y<8;y++)for(let b=0;b<4;b++){let v=0;for(let x=0;x<8;x++)v|=((t[y*8+x]>>b)&1)<<(7-x);out[o++]=v}});return out}
function tilemapOptions(){return{order:ui.tmOrder.value,palette2:ui.tmPal2.checked,priority:ui.tmPriority.checked}}
function tilemapWords(){return Tm.words(state.tilemap,state.tiles,Number(ui.start.value),tilemapOptions())}
function tileArrays(){const b=smsBytes(),a=[];for(let i=0;i<b.length;i+=32)a.push(b.slice(i,i+32));return a}
function exportBin(){download(`${state.name}.bin`,smsBytes(),'application/octet-stream')}
function exportPsg(){if(typeof window.compressTilesPSG!=='function')return toast(tr('toast.psgMissing'),true);const out=window.compressTilesPSG(tileArrays());if(out){state.psgBytes=out.length;updateStats();download(`${state.name}.psgcompr`,out,'application/octet-stream')}}
function exportZx7(){if(typeof window.compressZX7!=='function')return toast(tr('toast.zx7Missing'),true);const out=window.compressZX7(smsBytes());state.zx7Bytes=out.length;updateStats();download(`${state.name}.zx7`,out,'application/octet-stream')}
function makeTilesCanvas(){const src=state.src,tiles=state.tiles,cols=Math.min(16,Math.max(1,tiles.length)),rows=Math.ceil(tiles.length/cols),c=document.createElement('canvas'),x=c.getContext('2d');c.width=cols*8;c.height=rows*8;tiles.forEach((t,i)=>drawTile(x,t.data,src.palette,(i%cols)*8,Math.floor(i/cols)*8,1));return c}
function makeTilesIndexedPng(){const tiles=state.tiles,cols=Math.min(16,Math.max(1,tiles.length)),rows=Math.ceil(tiles.length/cols),w=cols*8,h=rows*8,pix=new Uint8Array(w*h),map=paletteIndexMap();tiles.forEach((t,i)=>{const ox=(i%cols)*8,oy=Math.floor(i/cols)*8;for(let y=0;y<8;y++)for(let x=0;x<8;x++)pix[(oy+y)*w+ox+x]=map[t.data[y*8+x]]??0});return new Blob([indexedPng(w,h,pix,currentPalette())],{type:'image/png'})}
function paletteIndexMap(){const m=[];state.paletteOrder.forEach((v,i)=>m[v]=i);return m}
function exportPng(){download(tilePngName(),makeTilesIndexedPng(),'image/png')}
async function exportTsx(){try{const zip=await choicePopup(tr('choice.tsxTitle'),tr('choice.tsxZip'),tr('choice.tsxSingle'));if(zip===null)return;const tsx=tsxText(),tsxName=tileTsxName(),pngName=tilePngName();if(zip){const png=makeTilesIndexedPng(),blob=await zipBlob([{name:tsxName,data:tsx},{name:pngName,data:png}]);download(`${state.name}_tsx.zip`,blob,'application/zip')}else download(tsxName,tsx,'application/xml')}catch(e){toast(e.message,true)}}
function exportTilemapBin(){const words=tilemapWords();download(`${state.name}_tilemap.bin`,Tm.bin(words),'application/octet-stream')}
function exportTilemapAsm(){const opt={...tilemapOptions(),start:Number(ui.start.value),dedupe:ui.dedupe.checked,mirror:ui.mirror.checked};const words=tilemapWords();download(`${state.name}_tilemap.asm`,Tm.asm(words,state.name,state.tilemap,opt),'text/plain')}
function exportTilemapRle(){const words=tilemapWords(),bytes=Tm.bin(words),out=Tm.rle(bytes);state.tmRleBytes=out.length;updateStats();download(`${state.name}_tilemap.rle`,out,'application/octet-stream')}
function exportTilemapStm(){try{const opt=tilemapOptions(),words=tilemapWords(),w=Tm.lineSize(state.tilemap,opt.order),out=Tm.stm(words,w);state.tmStmBytes=out.length;updateStats();download(`${state.name}_tilemap.stmcompr`,out,'application/octet-stream')}catch(err){toast(err.message,true)}}
async function exportTmx(){try{const zip=await choicePopup(tr('choice.tmxTitle'),tr('choice.tmxZip'),tr('choice.tmxSingle'));if(zip===null)return;const tmxName=tileTmxName(),tsxName=tileTsxName(),pngName=tilePngName();if(zip){const png=makeTilesIndexedPng(),blob=await zipBlob([{name:tmxName,data:tmxText(tsxName)},{name:tsxName,data:tsxText()},{name:pngName,data:png}]);download(`${state.name}_tmx.zip`,blob,'application/zip')}else download(tmxName,tmxText(''),'application/xml')}catch(e){toast(e.message,true)}}
function choicePopup(title,zipLabel,singleLabel){return new Promise(res=>{const m=document.createElement('div');m.className='choice-pop';m.innerHTML=`<div class="choice-box"><div class="choice-title">${xml(title)}</div><div class="choice-actions"><button type="button" data-v="zip">${xml(zipLabel)}</button><button type="button" data-v="single">${xml(singleLabel)}</button><button type="button" data-v="cancel">${xml(tr('choice.cancel'))}</button></div></div>`;m.onclick=e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;m.remove();res(v==='zip'?true:v==='single'?false:null)};document.body.appendChild(m)})}
function tilePngName(){return `${state.name}_tiles.png`}
function tileTsxName(){return `${state.name}.tsx`}
function tileTmxName(){return `${state.name}.tmx`}
function tsxText(){const n=state.tiles.length,cols=Math.min(16,Math.max(1,n)),rows=Math.ceil(n/cols),p=currentPalette()[0]||state.src.palette[0]||{r:0,g:0,b:0},trans=hex(p).slice(1).toLowerCase();return `<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.11.2" name="${xml(state.name)}" tilewidth="8" tileheight="8" tilecount="${n}" columns="${cols}">
 <image source="${xml(tilePngName())}" trans="${trans}" width="${cols*8}" height="${rows*8}"/>
</tileset>
`}
function tmxText(tsx){const tm=state.tilemap,w=tm?tm.w:0,h=tm?tm.h:0,tileset=tsx?`<tileset firstgid="1" source="${xml(tsx)}"/>
 `:'';return `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.11.2" orientation="orthogonal" renderorder="right-down" width="${w}" height="${h}" tilewidth="8" tileheight="8" infinite="0" nextlayerid="2" >
${tmxSmsProperties()}${tileset}<layer id="1" name="tilemap" width="${w}" height="${h}">
  <data encoding="csv">
${tmxCsv()}
</data>
 </layer>
</map>
`}
function tmxSmsProperties(){const opt=tilemapOptions(),flags=(opt.palette2?0x0800:0)|(opt.priority?0x1000:0);return ` <properties>
  <property name="sms_palette2" type="bool" value="${opt.palette2?'true':'false'}"/>
  <property name="sms_priority" type="bool" value="${opt.priority?'true':'false'}"/>
  <property name="sms_flags" type="int" value="${flags}"/>
  <property name="sms_palette2_label" value="${xml(tr('tmx.prop.palette2'))}"/>
  <property name="sms_priority_label" value="${xml(tr('tmx.prop.priority'))}"/>
 </properties>
`}
function tmxCsv(){const tm=state.tilemap;if(!tm)return'';const index=new Map();state.tiles.forEach((t,i)=>index.set(t,i+1));const lines=[];for(let y=0;y<tm.h;y++){const row=[];for(let x=0;x<tm.w;x++){const c=tm.cells[y*tm.w+x];let v=index.get(c.tile)||0;if(v){if(c.h)v+=0x80000000;if(c.v)v+=0x40000000}row.push(String(v))}lines.push(row.join(','))}return lines.join(',\n')}
function xml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function indexedPng(w,h,pix,pal){const ihdr=new Uint8Array(13),dv=new DataView(ihdr.buffer);dv.setUint32(0,w,false);dv.setUint32(4,h,false);ihdr[8]=8;ihdr[9]=3;const plte=new Uint8Array(Math.max(1,pal.length)*3);pal.forEach((p,i)=>{const j=i*3;plte[j]=p.r;plte[j+1]=p.g;plte[j+2]=p.b});const raw=new Uint8Array((w+1)*h);for(let y=0;y<h;y++){raw[y*(w+1)]=0;raw.set(pix.subarray(y*w,y*w+w),y*(w+1)+1)}return joinBytes(Uint8Array.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('PLTE',plte),pngChunk('IDAT',zlibStore(raw)),pngChunk('IEND',new Uint8Array(0)))}
function pngChunk(type,data){const t=new TextEncoder().encode(type),out=new Uint8Array(12+data.length),dv=new DataView(out.buffer);dv.setUint32(0,data.length,false);out.set(t,4);out.set(data,8);dv.setUint32(8+data.length,crc32(joinBytes(t,data)),false);return out}
function zlibStore(data){const parts=[Uint8Array.from([0x78,0x01])];for(let p=0;p<data.length;p+=65535){const len=Math.min(65535,data.length-p),last=p+len>=data.length,b=new Uint8Array(5+len),n=(~len)&65535;b[0]=last?1:0;b[1]=len&255;b[2]=len>>8;b[3]=n&255;b[4]=n>>8;b.set(data.subarray(p,p+len),5);parts.push(b)}const ad=adler32(data);parts.push(Uint8Array.from([(ad>>>24)&255,(ad>>>16)&255,(ad>>>8)&255,ad&255]));return joinBytes(...parts)}
function adler32(data){let a=1,b=0;for(const v of data){a=(a+v)%65521;b=(b+a)%65521}return((b<<16)|a)>>>0}
function joinBytes(...arrs){const n=arrs.reduce((s,a)=>s+a.length,0),out=new Uint8Array(n);let o=0;for(const a of arrs){out.set(a,o);o+=a.length}return out}
async function zipBlob(files){const parts=[],central=[];let off=0;for(const f of files){const name=new TextEncoder().encode(f.name),data=await bytes(f.data),crc=crc32(data),time=dosTime(new Date()),lh=new Uint8Array(30+name.length),dv=new DataView(lh.buffer);dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(8,0,true);dv.setUint16(10,time.t,true);dv.setUint16(12,time.d,true);dv.setUint32(14,crc,true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);dv.setUint16(26,name.length,true);lh.set(name,30);parts.push(lh,data);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(10,0,true);cv.setUint16(12,time.t,true);cv.setUint16(14,time.d,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,off,true);ch.set(name,46);central.push(ch);off+=lh.length+data.length}const csize=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,csize,true);ev.setUint32(16,off,true);return new Blob([...parts,...central,end],{type:'application/zip'})}
async function bytes(d){if(d instanceof Blob)return new Uint8Array(await d.arrayBuffer());if(d instanceof Uint8Array)return d;if(typeof d==='string')return new TextEncoder().encode(d);return new Uint8Array(d)}
function crc32(a){let c=0xffffffff;for(const b of a)c=(c>>>8)^CRC[(c^b)&255];return(c^0xffffffff)>>>0}
const CRC=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0})
function dosTime(d){return{t:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()/2|0),d:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}}
function exportPaletteBin(){download(`${state.name}_palette.bin`,paletteBytes(),'application/octet-stream')}
function exportPaletteAsm(){const gg=state.palMode==='gg',vals=currentPalettePadded().map(p=>gg?rgbToGg(p).v:rgbToSms(p).v),lines=paletteRows(vals,gg?8:16).map(r=>(gg?'.dw ':'.db ')+r.map(v=>'$'+(gg?hex4(v):hex2(v))).join(', ')),key=gg?'export.paletteAsmCommentGg':'export.paletteAsmCommentSms',txt=`${tr(key,{name:state.name})}\n${lines.join('\n')}\n`;download(`${state.name}_palette.asm`,txt,'text/plain')}
function exportPaletteAct(){const pal=currentPalettePadded(),out=new Uint8Array(768);pal.forEach((p,i)=>{const j=i*3;out[j]=p.r;out[j+1]=p.g;out[j+2]=p.b});download(`${state.name}_palette.act`,out,'application/octet-stream')}
function exportPaletteGpl(){const pal=currentPalettePadded(),gg=state.palMode==='gg',lines=['GIMP Palette',`Name: ${state.name}`,`Columns: ${Math.min(16,Math.max(1,pal.length))}`,'#'];pal.forEach((p,i)=>{const v=gg?rgbToGg(p).v:rgbToSms(p).v;lines.push(`${String(p.r).padStart(3,' ')} ${String(p.g).padStart(3,' ')} ${String(p.b).padStart(3,' ')}\t${String(i).padStart(2,'0')} ${gg?'GG':'SMS'}_$${gg?hex4(v):hex2(v)}`)});download(`${state.name}_palette.gpl`,lines.join('\n')+'\n','text/plain')}
// --- exports C / JASC ---
function cIdent(s){let r=String(s||'tiles').replace(/[^A-Za-z0-9_]/g,'_');if(/^\d/.test(r))r='_'+r;return r||'tiles'}
function formatCArrayHex(vals,wordFormat){
  const perLine=wordFormat?8:16,hexLen=wordFormat?4:2,lines=[];
  for(let i=0;i<vals.length;i+=perLine){
    const chunk=[];
    for(let j=0;j<perLine&&i+j<vals.length;j++)chunk.push('0x'+vals[i+j].toString(16).toUpperCase().padStart(hexLen,'0'));
    lines.push('  '+chunk.join(', ')+(i+perLine<vals.length?',':''));
  }
  return lines.join('\n');
}
async function exportPaletteC(){
  const gg=state.palMode==='gg',vals=currentPalettePadded().map(p=>gg?rgbToGg(p).v:rgbToSms(p).v),size=vals.length;
  const id=cIdent(state.name),guard=id.toUpperCase()+'_PALETTE_H',type=gg?'unsigned short':'unsigned char';
  const h=`#ifndef ${guard}\n#define ${guard}\n\nextern const ${type} ${id}_palette[${size}];\n#define ${id.toUpperCase()}_PALETTE_SIZE ${size}\n\n#endif\n`;
  const c=`#include "${id}_palette.h"\n\nconst ${type} ${id}_palette[${size}] = {\n${formatCArrayHex(vals,gg)}\n};\n`;
  const blob=await zipBlob([{name:`${id}_palette.h`,data:h},{name:`${id}_palette.c`,data:c}]);
  download(`${state.name}_palette_c.zip`,blob,'application/zip');
}
function exportPaletteJasc(){
  const pal=currentPalettePadded(),lines=['JASC-PAL','0100',String(pal.length)];
  for(const p of pal)lines.push(`${p.r} ${p.g} ${p.b}`);
  download(`${state.name}_palette.pal`,lines.join('\r\n')+'\r\n','text/plain');
}
async function exportTilesC(){
  const bytes=smsBytes(),size=bytes.length,id=cIdent(state.name),guard=id.toUpperCase()+'_TILES_H';
  const h=`#ifndef ${guard}\n#define ${guard}\n\nextern const unsigned char ${id}_tiles[${size}];\n#define ${id.toUpperCase()}_TILES_SIZE ${size}\n#define ${id.toUpperCase()}_TILES_COUNT ${state.tiles.length}\n\n#endif\n`;
  const c=`#include "${id}_tiles.h"\n\nconst unsigned char ${id}_tiles[${size}] = {\n${formatCArrayHex(bytes,false)}\n};\n`;
  const blob=await zipBlob([{name:`${id}_tiles.h`,data:h},{name:`${id}_tiles.c`,data:c}]);
  download(`${state.name}_tiles_c.zip`,blob,'application/zip');
}
async function exportTilemapC(){
  const words=tilemapWords(),size=words.length,id=cIdent(state.name),guard=id.toUpperCase()+'_TILEMAP_H';
  const w=state.tilemap?state.tilemap.w:0,ht=state.tilemap?state.tilemap.h:0;
  const h=`#ifndef ${guard}\n#define ${guard}\n\nextern const unsigned short ${id}_tilemap[${size}];\n#define ${id.toUpperCase()}_TILEMAP_SIZE ${size}\n#define ${id.toUpperCase()}_TILEMAP_WIDTH ${w}\n#define ${id.toUpperCase()}_TILEMAP_HEIGHT ${ht}\n\n#endif\n`;
  const c=`#include "${id}_tilemap.h"\n\nconst unsigned short ${id}_tilemap[${size}] = {\n${formatCArrayHex(words,true)}\n};\n`;
  const blob=await zipBlob([{name:`${id}_tilemap.h`,data:h},{name:`${id}_tilemap.c`,data:c}]);
  download(`${state.name}_tilemap_c.zip`,blob,'application/zip');
}
function download(name,data,type){const b=data instanceof Blob?data:new Blob([data],{type}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function setBadge(t,c){ui.badge.textContent=t;ui.badge.className=`badge ${c}`}
function toast(msg,bad){const d=document.createElement('div');d.className='toast'+(bad?' error':'');d.textContent=msg;toastLayer.appendChild(d);setTimeout(()=>d.remove(),2600)}
function initSplitters(){document.querySelectorAll('.splitter').forEach(sp=>sp.addEventListener('mousedown',e=>{e.preventDefault();const side=sp.dataset.split,startX=e.clientX,startL=state.leftW,startR=state.rightW;sp.classList.add('active');document.body.classList.add('resizing');const move=ev=>{const dx=ev.clientX-startX;if(side==='left')state.leftW=clamp(startL+dx,180,600);else state.rightW=clamp(startR-dx,360,900);updateGrid();renderSource();renderTiles();renderPalette()};const up=()=>{sp.classList.remove('active');document.body.classList.remove('resizing');removeEventListener('mousemove',move);removeEventListener('mouseup',up)};addEventListener('mousemove',move);addEventListener('mouseup',up)}))}
function updateGrid(){ui.app.style.gridTemplateColumns=`${state.leftW}px 4px minmax(160px,1fr) 4px ${state.rightW}px`}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
})();
