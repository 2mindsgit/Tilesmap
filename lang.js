(function(){
const packs=window.TileLangPacks=window.TileLangPacks||{};
const api={cur:'',onchange:null,langs:packs,t,apply,init,set,available:()=>Object.keys(packs)};
function fallback(){const k=packs.fr?'fr':packs.en?'en':Object.keys(packs)[0];return k&&packs[k]?packs[k].dict||{}:{}}
function get(k){const d=(packs[api.cur]&&packs[api.cur].dict)||{},f=fallback();return d[k]??f[k]??k}
function t(k,v){return String(get(k)).replace(/\{(\w+)\}/g,(_,x)=>v&&v[x]!=null?v[x]:'')}
function pick(){const saved=localStorage.getItem('tileLang');if(saved&&packs[saved])return saved;const nav=[...(navigator.languages||[]),navigator.language||''];for(const l of nav){const c=String(l).toLowerCase().split('-')[0];if(packs[c])return c}return packs.en?'en':packs.fr?'fr':Object.keys(packs)[0]||'en'}
function apply(){document.documentElement.lang=api.cur||'en';document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));document.querySelectorAll('[data-i18n-title]').forEach(e=>e.title=t(e.dataset.i18nTitle));document.querySelectorAll('[data-i18n-aria]').forEach(e=>e.setAttribute('aria-label',t(e.dataset.i18nAria)));renderFlags()}
function set(c){if(!packs[c])return;api.cur=c;localStorage.setItem('tileLang',c);apply();if(typeof api.onchange==='function')api.onchange(c)}
function init(){api.cur=pick();apply()}
function renderFlags(){const box=document.getElementById('langSelect');if(!box)return;box.innerHTML='';Object.keys(packs).forEach(c=>{const b=document.createElement('button'),img=document.createElement('img'),sp=document.createElement('span');b.type='button';b.className='lang-btn'+(c===api.cur?' active':'');b.title=packs[c].name||c;b.onclick=()=>set(c);img.src=`flags/${c}.svg`;img.alt=c;img.onerror=()=>img.remove();sp.textContent=c.toUpperCase();b.append(img,sp);box.appendChild(b)})}
window.TileLang=api;
})();
