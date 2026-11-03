// Read-only view of a map: shared via #view= links and exported as .html.
import { FRAME_COLORS, MH, MW, NH, NW } from '../model/constants.js';
import { allNotes, pagesOf, titleOf } from '../model/storage.js';
import { plain } from '../text/links.js';
import { IMG_RE } from '../text/markdown.js';
import { parseRefs } from '../text/refs.js';
import { packShare, unpackShare } from './packShare.js';
export const shareMethods = {
  mapViewData(withImages) {
    const s = this.state, ac = this.accent();
    this.refreshLabels();
    const title = plain(titleOf(s.nodes));
    const strip = (t) => withImages ? (t || '') : (t || '').split('\n').filter(l => !IMG_RE.test(l)).join('\n');
    const TIr = this.treeInfo(), treeKid = new Set(Object.keys(TIr.pe).map(k => TIr.pe[k].from));
    const catById = {}; s.cats.forEach(c => catById[c.id] = c);
    const nodeById = {}; s.nodes.forEach(n => nodeById[n.id] = n);
    const inhCat = (n) => { if (n.cat || n.main || !treeKid.has(n.id)) return null; let x = n, k = 0; const seen = new Set(); while (TIr.pe[x.id] && !seen.has(x.id)) { seen.add(x.id); x = nodeById[TIr.pe[x.id].from]; k++; if (!x || x.main) return null; if (x.cat && catById[x.cat]) return { c: catById[x.cat], k: k }; } return null; };
    const back = {}; s.nodes.forEach(n => { const seen = new Set(); (allNotes(n).match(/\[\[([A-Za-z0-9_-]+)\]\]/g) || []).forEach(m => { const t = m.slice(2, -2); if (t !== n.id && !seen.has(t)) { seen.add(t); back[t] = (back[t] || 0) + 1; } }); });
    const hidden = this.collapseInfo().hidden;
    const nodes = s.nodes.filter(n => !hidden.has(n.id)).map(n => {
      const cat = catById[n.cat], ih = cat ? null : inhCat(n), pct = ih ? Math.max(25, 62 - (ih.k - 1) * 14) : 0;
      const el = this.els && this.els[n.id];
      const pages = pagesOf(n).map(p => ({ name: p.name || '', notes: strip(p.notes), refs: p.refs || '' }));
      const an = allNotes(n), wc = (an.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
      const tc = pagesOf(n).filter(p => (p.notes || '').trim()).length, rc = parseRefs(n.refs).length;
      return { id: n.id, x: n.x, y: n.y, main: !!n.main, label: n.label || 'Untitled', pages: pages, images: withImages && n.images ? n.images : null,
        w: el && el.offsetWidth ? el.offsetWidth : (n.main ? MW : NW), h: el && el.offsetHeight ? el.offsetHeight : (n.main ? MH : NH),
        color: cat ? cat.color : ih ? 'color-mix(in oklab, ' + ih.c.color + ' ' + (pct + 10) + '%, #fcfcfd)' : ac,
        tint: cat ? cat.tint : ih ? 'color-mix(in oklab, ' + ih.c.tint + ' ' + pct + '%, #fcfcfd)' : '#fcfcfd',
        cat: cat ? cat.name : '', words: an.trim() ? wc + (wc === 1 ? ' word' : ' words') : '', tabs: an.trim() ? tc + (tc === 1 ? ' tab' : ' tabs') : '',
        refs: rc ? rc + ' ref' : '', back: back[n.id] ? '↙ ' + back[n.id] : '' };
    });
    const shown = new Set(nodes.map(n => n.id));
    const frames = (s.frames || []).map(f => { const c = FRAME_COLORS[f.color] || FRAME_COLORS.sage; return { x: f.x, y: f.y, w: f.w, h: f.h, bg: c.bg, bd: c.bd, ink: c.ink, label: f.label || '' }; });
    const byId = {}; s.nodes.forEach(n => byId[n.id] = n);
    const mo = (m, id) => m ? { x: m.x, y: m.y, horiz: m.horiz, vx: m.vx, vy: m.vy, label: m.label, go: id } : null;
    const edges = s.edges.filter(e => shown.has(e.from) && shown.has(e.to)).map(e => {
      const g = this.geom(e); if (!g) return null;
      const a = byId[e.from], b = byId[e.to];
      return { d: g.d, head: g.head, tail: e.both ? (g.tail || '') : '', color: g.color || e.color || (e.strength === 'thick' ? '#6f6559' : '#7e8091'), w: g.w, dash: g.dash === 'none' ? '' : g.dash, mx: g.midX, my: g.midY,
        ox: e.both ? null : g.ox, oy: g.oy, fadeD: g.tunnel ? g.fadeD : '', mA: g.tunnel ? mo(g.mA, e.to) : null, mB: g.tunnel ? mo(g.mB, e.from) : null,
        notes: e.notes || '', title: plain(a && a.label) + (e.both ? ' ↔ ' : ' → ') + plain(b && b.label) };
    }).filter(Boolean);
    const cats = s.cats.filter(c => s.nodes.some(n => n.cat === c.id)).map(c => ({ name: c.name, color: c.color }));
    return { title: title, nodes: nodes, edges: edges, cats: cats, frames: frames };
  },
  viewerHtml(D, shared) {
    const SC = 'scr' + 'ipt', title = D.title || 'Map';
    const data = JSON.stringify(D).replace(/</g, '\\u003c');
    const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Karla:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
html,body{margin:0;height:100%;background:#f1f2f6;color:#2a2724;font-family:Karla,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
a{color:#2f6f5e}#surf{position:absolute;inset:0;cursor:grab;background-image:radial-gradient(#d3d5df 1px,transparent 1px);background-size:28px 28px;touch-action:none}
#world{position:absolute;left:0;top:0;transform-origin:0 0}.node{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px 18px;border-radius:14px;line-height:1.25;overflow-wrap:anywhere;text-wrap:pretty;cursor:pointer;user-select:none;transition:box-shadow .12s}
.node>span{white-space:pre-line}.node:hover{box-shadow:0 4px 16px rgba(42,39,36,.16)}.node.on{box-shadow:0 0 0 3px #f1f2f6,0 0 0 5px #2f6f5e}.mt{position:absolute;font-size:10px;color:#6a6c7e;letter-spacing:.02em;pointer-events:none;font-weight:400}
.frame{position:absolute;box-sizing:border-box;border-radius:14px}.frame b{position:absolute;left:14px;top:8px;max-width:calc(100% - 28px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}
.tl{position:absolute;white-space:nowrap;font:italic 500 11.5px Karla,sans-serif;line-height:1;color:#5e6072;cursor:pointer;text-shadow:0 0 3px #f1f2f6,0 0 3px #f1f2f6,0 0 2px #f1f2f6}
#bar{position:absolute;left:20px;top:20px;display:flex;gap:8px;align-items:center;background:#fcfcfd;border:1px solid #dcdee6;border-radius:12px;padding:8px 8px 8px 14px;box-shadow:0 2px 10px rgba(42,39,36,.06)}
#bar h1{font-family:Karla,sans-serif;font-weight:600;font-size:18px;margin:0 8px 0 0}#bar button{border:1px solid #dcdee6;background:#fcfcfd;color:#2a2724;font-size:13px;min-width:32px;height:32px;border-radius:8px;cursor:pointer;font-family:inherit}
#hint{position:absolute;left:20px;bottom:18px;font-size:12px;color:#7e8091}#legend{position:absolute;right:20px;top:20px;background:#fcfcfd;border:1px solid #dcdee6;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-size:13px}
#legend[hidden]{display:none}#legend div{display:flex;gap:8px;align-items:center}#legend span{width:10px;height:10px;border-radius:3px}
#panel{position:absolute;top:0;right:0;bottom:0;width:min(440px,100%);background:#fcfcfd;border-left:1px solid #dcdee6;box-shadow:-10px 0 40px rgba(42,39,36,.10);transform:translateX(105%);transition:transform .2s ease,opacity .16s ease;display:flex;flex-direction:column;z-index:5}
#panel.open{transform:none}#panel.center{top:50%;left:50%;right:auto;bottom:auto;width:min(720px,calc(100% - 32px));max-height:min(86vh,920px);border:1px solid #dcdee6;border-radius:16px;box-shadow:0 24px 60px rgba(42,39,36,.22);transform:translate(-50%,-48%);opacity:0;pointer-events:none}
#panel.center.open{transform:translate(-50%,-50%);opacity:1;pointer-events:auto}#panel.center #ph{padding:26px 32px 12px}#panel.center #pb{padding:0 32px 32px;font-size:16px}
#scrim{position:absolute;inset:0;background:rgba(30,30,40,.28);opacity:0;pointer-events:none;transition:opacity .16s;z-index:4}#scrim.on{opacity:1;pointer-events:auto}
#ph{padding:22px 24px 12px;display:flex;gap:6px;align-items:flex-start}#ph h2{flex:1;margin:0 6px 0 0;font-family:Karla,sans-serif;font-weight:600;font-size:23px;line-height:1.2}
#ph button{border:none;background:transparent;font-size:22px;color:#7e8091;cursor:pointer;width:32px;height:32px;border-radius:8px;flex:none}#ph button:hover{background:#ebecf2}#ph #mode{font-family:inherit;font-size:12px;width:auto;padding:0 10px;border:1px solid #dcdee6;margin-top:2px;white-space:nowrap}#pb{flex:1;min-height:0;padding:0 24px 28px;overflow-y:auto;font-size:15px;line-height:1.65}
.lbl{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7e8091;margin:20px 0 6px}.cat{display:inline-flex;gap:6px;align-items:center;font-size:13px;color:#5e6072}.cat i{width:9px;height:9px;border-radius:3px;display:inline-block}
ul{margin:2px 0 8px;padding-left:22px}.ref{padding:8px 0;border-bottom:1px solid #ebecf2;font-size:14px;overflow-wrap:anywhere}.empty{color:#7e8091;font-style:italic}.tabs{display:flex;flex-wrap:wrap;gap:18px;border-bottom:1px solid #e0e1ea;margin:16px 0 4px}.tabs button{border:none;background:transparent;padding:0 0 9px;margin-bottom:-1px;font-family:inherit;font-size:13px;color:#7e8091;cursor:pointer;border-bottom:2px solid transparent}.tabs button.on{color:#2a2724;font-weight:600;border-bottom-color:#2f6f5e}
</style></head><body>
<div id="surf"><div id="world"><svg id="svg" style="position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible"></svg></div></div>
<div id="bar"><h1></h1><button id="zo">−</button><button id="zi">+</button><button id="fit" style="padding:0 10px">Fit</button></div>
<div id="legend" hidden></div><div id="hint">${shared ? 'Read-only shared view · ' : ''}Drag to pan · scroll to zoom · click a box to read its notes</div>
<div id="scrim"></div><div id="panel"><div id="ph"><h2></h2><button id="mode"></button><button id="close" title="Close">×</button></div><div id="pb"></div></div>
<${SC}>
const D=${data};
const $=s=>document.querySelector(s),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BY={};D.nodes.forEach(n=>{BY[n.id]=n;if(!n.pages)n.pages=[{name:'',notes:n.notes||'',refs:n.refs||''}]});
const lbl=id=>BY[id]?String(BY[id].label).replace(/\\*+/g,'').replace(/\\s+/g,' ').trim():'Deleted box';
const inl=t=>esc(t).replace(/\\[\\[([A-Za-z0-9_-]+)\\]\\]/g,(m,id)=>'<a href="#" data-open="'+id+'" style="text-decoration:none;border-bottom:1px dashed #2f6f5e">&#8599;&nbsp;'+esc(lbl(id))+'</a>').replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>').replace(/\\*([^*\\s][^*]*)\\*/g,'<em>$1</em>').replace(/(https?:\\/\\/[^\\s<>"]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
const olL=(n,lv)=>{n=+n;const k=lv%3;if(k===1){let s='';while(n>0){n--;s=String.fromCharCode(97+n%26)+s;n=Math.floor(n/26)}return s}if(k===2){let s='';[[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']].forEach(([v,c])=>{while(n>=v){s+=c;n-=v}});return s}return String(n)};
const block=(t,im)=>{let o='',l=false;(t||'').split('\\n').forEach(x=>{const g=x.match(/^\\[image:([a-z0-9]+)\\]$/i);if(g){if(l){o+='</ul>';l=false}if(im&&im[g[1]])o+='<img src="'+im[g[1]].d+'" style="display:block;max-width:100%;height:auto;border-radius:8px;margin:8px 0">';return}const hm=x.match(/^#{1,3}\\s+(.*)$/);if(hm){if(l){o+='</ul>';l=false}o+='<div style="font-weight:700;margin:12px 0 2px">'+inl(hm[1])+'</div>';return}const m=x.match(/^(\\s*)(?:[-•]|(\\d+)[.)])\\s+(.*)$/);if(m){if(!l){o+='<ul style="padding-left:22px">';l=true}const lv=Math.floor(m[1].length/2);o+='<li style="margin-left:'+(lv*22)+'px;list-style-type:'+(m[2]?'&quot;'+olL(m[2],lv)+'. &quot;':['disc','circle','square'][lv%3])+'">'+inl(m[3])+'</li>';return}if(l){o+='</ul>';l=false}o+=x.trim()?'<div>'+inl(x)+'</div>':'<div style="height:10px"></div>'});return o+(l?'</ul>':'')};
$('#bar h1').textContent=D.title;
const W=$('#world'),S=$('#svg'),NS='http://www.w3.org/2000/svg',TL=[],EL={};
(D.frames||[]).forEach(f=>{const d=document.createElement('div');d.className='frame';d.style.cssText='left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;background:'+f.bg+'99;border:1.5px solid '+f.bd;if(f.label){const b=document.createElement('b');b.style.color=f.ink;b.textContent=f.label;d.appendChild(b)}W.insertBefore(d,S)});
D.edges.forEach(e=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',e.d);p.setAttribute('fill','none');p.setAttribute('stroke',e.color);p.setAttribute('stroke-width',e.w);if(e.dash)p.setAttribute('stroke-dasharray',e.dash);p.setAttribute('stroke-linecap','round');S.appendChild(p);
[e.head,e.tail].forEach(pt=>{if(!pt)return;const g=document.createElementNS(NS,'polygon');g.setAttribute('points',pt);g.setAttribute('fill',e.color);S.appendChild(g)});
if(e.ox!=null){const o=document.createElementNS(NS,'circle');o.setAttribute('cx',e.ox);o.setAttribute('cy',e.oy);o.setAttribute('r',3.6);o.setAttribute('fill','#fcfcfd');o.setAttribute('stroke',e.color);o.setAttribute('stroke-width',1.8);S.appendChild(o)}
if(e.fadeD){const f=document.createElementNS(NS,'path');f.setAttribute('d',e.fadeD);f.setAttribute('fill','none');f.setAttribute('stroke',e.color);f.setAttribute('stroke-width',1.8);f.setAttribute('stroke-dasharray','2.5 4');f.setAttribute('stroke-linecap','round');f.setAttribute('opacity',.75);S.appendChild(f);
[e.mA,e.mB].forEach(m=>{if(!m)return;[[5.5,'#f1f2f6',1.6],[2.2,e.color,0]].forEach(([r,fl,sw])=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',m.x);c.setAttribute('cy',m.y);c.setAttribute('r',r);c.setAttribute('fill',fl);if(sw){c.setAttribute('stroke',e.color);c.setAttribute('stroke-width',sw)}c.style.cursor='pointer';c.style.pointerEvents='all';c.addEventListener('pointerdown',ev=>ev.stopPropagation());c.addEventListener('click',()=>go(m.go));S.appendChild(c)});
const t=document.createElement('div');t.className='tl';t.textContent=m.label;t.style.left=m.x+'px';t.style.top=m.y+'px';t.style.transform=m.horiz?(m.vx>0?'translate(10px,-50%)':'translate(calc(-100% - 10px),-50%)'):(m.vy>0?'translate(-50%,10px)':'translate(-50%,calc(-100% - 10px))');t.addEventListener('pointerdown',ev=>ev.stopPropagation());t.addEventListener('click',()=>go(m.go));TL.push(t)})}
if(e.notes.trim()){const c=document.createElementNS(NS,'circle');c.setAttribute('cx',e.mx);c.setAttribute('cy',e.my);c.setAttribute('r',9);c.setAttribute('fill','#fcfcfd');c.setAttribute('stroke',e.color);c.setAttribute('stroke-width',1.5);c.style.cursor='pointer';c.style.pointerEvents='all';c.addEventListener('click',ev=>{ev.stopPropagation();show(esc(e.title),'<div class="lbl">Arrow notes</div>'+block(e.notes))});c.addEventListener('pointerdown',ev=>ev.stopPropagation());S.appendChild(c)}});
D.nodes.forEach(n=>{const d=document.createElement('div');d.className='node';d.style.cssText='left:'+n.x+'px;top:'+n.y+'px;width:'+n.w+'px;min-height:'+n.h+'px;background:'+n.tint+';border:'+(n.main?'2px':'1.5px')+' solid '+n.color+';'+(n.main?'font-weight:600;font-size:18px':'font-size:15px');
const mt=(t,p,c)=>t?'<i class="mt" style="'+p+(c?';color:'+c:'')+'">'+esc(t)+'</i>':'';
d.innerHTML='<span>'+inl(n.label)+'</span>'+mt(n.words,'left:12px;top:6px')+mt(n.tabs,'left:12px;bottom:6px')+mt(n.refs,'right:16px;top:6px')+mt(n.back,'right:12px;bottom:6px','#2f6f5e');
d.addEventListener('pointerdown',ev=>ev.stopPropagation());d.addEventListener('click',()=>openN(n));W.appendChild(d);EL[n.id]=d});
TL.forEach(t=>W.appendChild(t));
function refsH(t){const refs=(t||'').split('\\n').map(x=>x.trim()).filter(Boolean);return refs.length?refs.map((r,i)=>'<div class="ref">['+(i+1)+'] '+(/https?:/.test(r)?inl(r):esc(r).replace(/\\b(10\\.\\d{4,9}\\/[^\\s<>"]+)/g,'<a href="https://doi.org/$1" target="_blank" rel="noopener">$1</a>'))+'</div>').join(''):''}
function openN(n,ti){ti=ti||0;const multi=n.pages.length>1;let b=n.cat?'<div class="cat"><i style="background:'+n.color+'"></i>'+esc(n.cat)+'</div>':'';
if(multi)b+='<div class="tabs">'+n.pages.map((p,i)=>'<button data-tab="'+i+'"'+(i===ti?' class="on"':'')+'>'+esc(p.name||('Tab '+(i+1)))+'</button>').join('')+'</div>';
const p=n.pages[ti]||n.pages[0];b+=(multi?'':'<div class="lbl">Notes</div>')+(p.notes.trim()?(multi?'<div style="height:10px"></div>':'')+block(p.notes,n.images):'<div class="empty" style="margin-top:12px">No notes</div>');
const r=refsH(p.refs);b+='<div class="lbl">References</div>'+(r||'<div class="empty">No references</div>');CUR=n;hi(n.id);show(inl(n.label),b);$('#pb').scrollTop=0}
let CUR=null;
$('#pb').addEventListener('click',e=>{const tb=e.target.closest&&e.target.closest('button[data-tab]');if(tb&&CUR){openN(CUR,+tb.dataset.tab);return}const a=e.target.closest&&e.target.closest('a[data-open]');if(a){e.preventDefault();const n=BY[a.dataset.open];if(n)openN(n)}});
if(D.cats.length){const L=$('#legend');L.hidden=false;L.innerHTML=D.cats.map(c=>'<div><span style="background:'+c.color+'"></span>'+esc(c.name)+'</div>').join('')}
let MODE='center';try{MODE=localStorage.getItem('vn.viewer.panel')||'center'}catch(e){}
const P=$('#panel'),SC_=$('#scrim');
function setMode(m){MODE=m;try{localStorage.setItem('vn.viewer.panel',m)}catch(e){}P.classList.toggle('center',m==='center');$('#mode').textContent=m==='center'?'Side view':'Centered';$('#mode').title=m==='center'?'Show notes in a side panel':'Show notes in the middle';sync()}
function sync(){SC_.classList.toggle('on',MODE==='center'&&P.classList.contains('open'))}
function hi(id){Object.keys(EL).forEach(k=>EL[k].classList.toggle('on',k===id))}
function show(t,b){$('#ph h2').innerHTML=t;$('#pb').innerHTML=b;P.classList.add('open');sync()}
function hide(){P.classList.remove('open');hi(null);sync()}
$('#mode').onclick=()=>setMode(MODE==='center'?'side':'center');setMode(MODE);
$('#close').onclick=hide;SC_.onclick=hide;addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
function go(id){const n=BY[id],r=$('#surf').getBoundingClientRect();if(!n)return;k=Math.max(k,.9);tx=r.width/2-(n.x+n.w/2)*k;ty=r.height/2-(n.y+n.h/2)*k;ap();hi(id)}
let tx=0,ty=0,k=1;const ap=()=>W.style.transform='translate('+tx+'px,'+ty+'px) scale('+k+')';
function fit(){if(!D.nodes.length)return;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;D.nodes.concat(D.frames||[]).forEach(n=>{x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x+n.w);y1=Math.max(y1,n.y+n.h)});const r=$('#surf').getBoundingClientRect(),p=80;k=Math.min(1.4,Math.max(.25,Math.min((r.width-p*2)/(x1-x0),(r.height-p*2-60)/(y1-y0))));tx=r.width/2-(x0+x1)/2*k;ty=r.height/2+30-(y0+y1)/2*k;ap()}
const zoom=(f,cx,cy)=>{const r=$('#surf').getBoundingClientRect();if(cx==null){cx=r.width/2;cy=r.height/2}const nk=Math.min(2.5,Math.max(.25,k*f));tx=cx-(cx-tx)*nk/k;ty=cy-(cy-ty)*nk/k;k=nk;ap()};
$('#zi').onclick=()=>zoom(1.2);$('#zo').onclick=()=>zoom(1/1.2);$('#fit').onclick=fit;
const sf=$('#surf');sf.addEventListener('wheel',e=>{e.preventDefault();const r=sf.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top)},{passive:false});
let dr=null;sf.addEventListener('pointerdown',e=>{dr={x:e.clientX,y:e.clientY,tx:tx,ty:ty};sf.setPointerCapture(e.pointerId);sf.style.cursor='grabbing'});
sf.addEventListener('pointermove',e=>{if(!dr)return;tx=dr.tx+e.clientX-dr.x;ty=dr.ty+e.clientY-dr.y;ap()});sf.addEventListener('pointerup',()=>{dr=null;sf.style.cursor='grab'});
fit();
</${SC}></body></html>`;
  },
  async shareMap() {
    this.setState({ exportOpen: false, shareOpen: true, shareUrl: '', shareNote: 'Creating link…', shareCopied: false });
    try {
      if (typeof CompressionStream === 'undefined') throw new Error('This browser cannot create share links. Try a recent Chrome, Edge, Safari or Firefox.');
      const code = await packShare(this.mapViewData(false));
      const base = location.href.split('#')[0], url = base + '#view=' + code;
      let note = '';
      if (!/^https?:/.test(location.protocol)) note = 'The link only works when the app is opened from its web address (for example GitHub Pages), not from a file on your computer.';
      else if (url.length > 60000) note = 'This map makes a very long link (' + Math.round(url.length / 1000) + ' k characters). It works in browsers, but some chat and mail apps may cut it. Images are not included.';
      else note = 'Images are not included in the link.';
      this.setState({ shareUrl: url, shareNote: note });
    } catch (err) { this.setState({ shareNote: err.message }); }
  },
  async openShared(code) {
    try {
      const D = await unpackShare(code);
      const html = this.viewerHtml(D, true);
      document.open(); document.write(html); document.close();
    } catch (err) {
      window.alert('This share link could not be opened. It may have been cut off. Ask for a new link.');
      history.replaceState(null, '', location.href.split('#')[0]); location.reload();
    }
  }
};
