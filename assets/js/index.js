'use strict';
// ================= TABLO =================
function el(id){ return document.getElementById(id); }
function qs(s,r){ return (r||document).querySelector(s); }
function qsa(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function jget(k,d){ try{ var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } }
function jset(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
(function(){
  var b=el('jserr');
  window.addEventListener('error',function(e){
    b.style.display='block';
    b.textContent='JS ошибка: '+(e.message||'')+(e.lineno?' (строка '+e.lineno+')':'');
  });
})();
var AGENT=(location.hostname==='127.0.0.1'||location.hostname==='localhost')
  ? (window.location.protocol+'//'+window.location.host)
  : 'http://127.0.0.1:8787';

var libFilters = {
  name: '',
  artist: '',
  genre: ''
};
var isOstmMode = false; // флаг режима «только OST»

var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- доп. стили ----------
(function(){
  var s=document.createElement('style');
  s.textContent=
   '#cmdwrap{position:relative}'+
   '#cmdSug{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--panel2);'+
     'border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:none;z-index:40;'+
     'box-shadow:0 18px 40px rgba(0,0,0,.4)}'+
   '#cmdSug .ci{padding:8px 14px;font-size:13px;cursor:pointer;display:flex;justify-content:space-between;gap:10px}'+
   '#cmdSug .ci:hover,#cmdSug .ci.sel{background:rgba(46,232,139,.12)}'+
   '#cmdSug .ci .k{color:var(--muted);font-size:11px}'+
   '#cmdwrap.active{border-color:var(--accent)}'+
   '#btnReorder{display:none}'+
   '.rep.on{color:var(--accent);border-color:var(--accent)}'+
   '.ctl.rep{width:34px;height:32px;padding:0;font-size:13px}'+
   '#hud .widget.dragging{opacity:.55}'+
   '.notes-status{font-size:11px;color:var(--muted);margin-top:6px}'+
   '.notes-more{background:none;border:none;color:var(--muted);font-size:11px;padding:4px 0;margin-top:2px}'+
   '.notes-more:hover{color:var(--accent)}'+
   '#widgetDock{position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:45;'+
     'display:flex;flex-direction:column;gap:8px}'+
   '.dock-chip{width:42px;height:42px;border-radius:var(--radius);background:var(--bg);'+
     'border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;'+
     'justify-content:center;gap:1px;cursor:pointer;transition:border-color .3s,box-shadow .3s}'+
   '.dock-chip:hover{border-color:var(--accent);box-shadow:0 0 14px rgba(46,232,139,.25)}'+
   '.dock-chip .ic{font-size:15px;line-height:1;color:var(--accent)}'+
   '.dock-chip .lb{font-family:var(--mono);font-size:6.5px;letter-spacing:.08em;'+
     'color:var(--muted);text-transform:uppercase;line-height:1}'+
   '#notesBig{position:fixed;inset:0;z-index:60;display:none;background:rgba(4,8,7,.6);backdrop-filter:blur(4px)}'+
   '#notesBig.on{display:flex;align-items:center;justify-content:center}'+
   '#notesBig .nb-box{width:min(760px,92vw);max-height:88vh;display:flex;flex-direction:column;'+
     'background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;'+
     'box-shadow:0 30px 80px rgba(0,0,0,.5)}'+
   '#notesBig .nb-top{display:flex;align-items:center;gap:16px;padding:12px 18px;border-bottom:1px solid var(--line)}'+
   '#notesBig .nb-status{color:var(--muted);font-size:12px;margin-left:auto}'+
   '#notesBig .nb-close{background:none;border:none;color:var(--muted);font-size:16px}'+
   '#notesBig .nb-close:hover{color:var(--accent)}'+
   '#notesBig textarea{width:100%;flex:1;min-height:50vh;background:none;border:none;outline:none;color:var(--text);'+
     'padding:14px;resize:none;font:300 14px/1.6 var(--h-font)}'+
   // ---------- полноэкранная библиотека ----------
   '#libPage{position:fixed;inset:0;z-index:55;display:none;background:var(--bg);overflow:hidden}'+
   '#libPage.on{display:grid;grid-template-columns:280px 1fr 320px;grid-template-rows:64px 1fr}'+
   '#libPage .lp-head{grid-column:1/-1;display:flex;align-items:center;gap:18px;padding:0 22px;'+
     'border-bottom:1px solid var(--line)}'+
   '#libPage .lp-head .ttl{font-family:var(--mono);letter-spacing:.25em;font-size:13px;color:var(--accent)}'+
   '#libPage .lp-head .cnt{font-family:var(--mono);font-size:11px;color:var(--muted)}'+
   '#libPage .lp-head .lp-close{margin-left:auto;background:none;border:1px solid var(--line);'+
     'color:var(--muted);border-radius:var(--radius);width:34px;height:34px;cursor:pointer}'+
   '#libPage .lp-close:hover{color:var(--accent);border-color:var(--accent)}'+
   '#libPage .lp-side{border-right:1px solid var(--line);padding:16px;overflow-y:auto}'+
   '#libPage .lp-main{overflow-y:auto;padding:16px 20px}'+
   '#libPage .lp-queue{border-left:1px solid var(--line);padding:16px;overflow-y:auto}'+
   '#libPage .lp-sec{font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:var(--muted);'+
     'text-transform:uppercase;margin:0 0 10px}'+
   '#libPage .lp-ost{display:flex;flex-direction:column;gap:2px;margin-bottom:18px}'+
   '#libPage .lp-ost button{background:none;border:none;color:var(--text);font-family:var(--mono);'+
     'font-size:11px;text-align:left;padding:6px 8px;border-radius:var(--radius);cursor:pointer;'+
     'display:flex;justify-content:space-between;gap:8px}'+
   '#libPage .lp-ost button:hover{background:var(--panel2)}'+
   '#libPage .lp-ost button.act{color:var(--accent);background:rgba(46,232,139,.08)}'+
   '#libPage .lp-ost button .n{color:var(--muted);font-size:10px}'+
   '#libPage .lp-input{width:100%;background:rgba(0,0,0,.25);border:1px solid var(--line);'+
     'border-radius:var(--radius);color:var(--text);font-family:var(--mono);font-size:12px;'+
     'padding:8px 10px;outline:none;margin-bottom:10px}'+
   '#libPage .lp-input:focus{border-color:var(--accent)}'+
   '#libPage .lp-sel{width:100%;background:rgba(0,0,0,.25);border:1px solid var(--line);'+
     'border-radius:var(--radius);color:var(--text);font-family:var(--mono);font-size:11px;'+
     'padding:6px 8px;outline:none;margin-bottom:8px}'+
   '#libPage .lp-sel option{background:#10141a;color:#eee}'+
   '#libPage .trk{display:flex;gap:10px;align-items:baseline;padding:8px 10px;border-radius:var(--radius);'+
     'cursor:pointer;border-bottom:1px solid var(--line)}'+
   '#libPage .trk:hover{background:var(--panel2)}'+
   '#libPage .trk.act{color:var(--accent)}'+
   '#libPage .trk .t{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}'+
   '#libPage .trk .a{font-family:var(--mono);font-size:10px;color:var(--muted);white-space:nowrap;'+
     'overflow:hidden;text-overflow:ellipsis;max-width:26%}'+
   '#libPage .trk .al{font-family:var(--mono);font-size:10px;color:var(--muted);white-space:nowrap;'+
     'overflow:hidden;text-overflow:ellipsis;max-width:20%}'+
   '#libPage .trk .d{font-family:var(--mono);font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}'+
   '#libPage .lp-more{background:none;border:1px solid var(--line);color:var(--muted);'+
     'border-radius:var(--radius);padding:8px;width:100%;margin-top:10px;cursor:pointer;font-size:12px}'+
   '#libPage .lp-more:hover{color:var(--accent);border-color:var(--accent)}'+
   '#libPage .lp-now{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid var(--line);'+
     'border-radius:var(--radius);margin-bottom:14px}'+
   '#libPage .lp-now .art{width:56px;height:56px;border-radius:var(--radius);background:var(--panel2);'+
     'border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--accent)}'+
   '#libPage .lp-now .tt{font-size:13px;font-weight:600}'+
   '#libPage .lp-now .ss{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:3px}'+
   '#libPage .q-row{display:flex;gap:8px;align-items:baseline;padding:5px 8px;font-size:12px;'+
     'cursor:pointer;border-radius:var(--radius)}'+
   '#libPage .q-row:hover{background:var(--panel2)}'+
   '#libPage .q-row.act{color:var(--accent)}'+
   '#libPage .q-row .i{font-family:var(--mono);font-size:10px;color:var(--muted);min-width:22px}'+
   '#libPage .q-row .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
   '#libPage .lp-note{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5}'+
   '.queue-item{cursor:pointer}'+
   '.queue-more{font-family:var(--mono);font-size:10px;color:var(--muted);padding:6px 0}'+
   // ---------- карточка персонажа 2.0 ----------
   '.cpc-top{display:flex;gap:14px;align-items:flex-start}'+
   '.cpc-hex{width:84px;height:92px;flex:none;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);'+
     'background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:30px;'+
     'font-weight:700;color:var(--accent)}'+
   '.cpc-lvl{font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.12em;'+
     'text-transform:uppercase;margin-bottom:6px}'+
   '.enk-wrap{margin-top:18px;border-top:1px dashed var(--line);padding-top:14px}'+
   '.enk-head{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}'+
   '.enk-ttl{font-family:var(--mono);letter-spacing:.2em;font-size:11px;color:var(--muted)}'+
   '.enk-profile{font-size:12px;color:var(--muted);margin-bottom:10px}'+
   '.enk-row{display:flex;gap:10px;align-items:baseline;padding:7px 10px;border:1px solid var(--line);'+
     'border-radius:var(--radius);margin-bottom:6px;flex-wrap:wrap}'+
   '.enk-row:hover{border-color:var(--line)}'+
   '.enk-name{font-weight:600;font-size:13px;min-width:150px}'+
   '.enk-sub{font-family:var(--mono);font-size:10px;color:var(--muted)}'+
   '.enk-star{color:#e8c34a;font-size:10px;letter-spacing:1px}'+
   '.enk-sel{background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:var(--radius);'+
     'color:var(--text);font-family:var(--mono);font-size:11px;padding:4px 6px;outline:none;margin-left:auto}'+
   '.enk-sel option{background:#10141a;color:#eee}'+
   '.clog-sec,.todo-sec{font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:var(--muted);'+
     'text-transform:uppercase;margin:16px 0 8px}'+
   '.clog-row{display:flex;gap:10px;font-size:12px;padding:5px 10px;border-bottom:1px solid var(--line)}'+
   '.clog-row .ts{font-family:var(--mono);font-size:10px;color:var(--muted);min-width:130px;'+
     'font-variant-numeric:tabular-nums}'+
   '.clog-more{font-family:var(--mono);font-size:10px;color:var(--muted);padding:6px 0}'+
   '.todo-row{display:flex;justify-content:space-between;gap:10px;padding:5px 10px;font-size:12px;'+
     'border-bottom:1px solid var(--line)}'+
   '.todo-row b{font-variant-numeric:tabular-nums}'+
   '.pl-head .upd{font-family:var(--mono);font-size:9px;color:var(--muted);margin-left:8px}';
  document.head.appendChild(s);
})();

// ---------- темы (референс Despero: базовая + fern/orbit/xber/ex8) ----------
var THEMES=['teal','fern','orbit','xber','ex8'];
var THEME_NAMES={teal:'Неон',fern:'Папоротник',orbit:'Орбита',xber:'Кибер',ex8:'EX8'};
var curTheme=jget('tablo_theme','teal');
function applyTheme(t){
  if(THEMES.indexOf(t)<0) t='teal';
  if(t==='teal') document.body.removeAttribute('data-theme');
  else document.body.dataset.theme=t;
  curTheme=t; jset('tablo_theme',t);
  if(typeof cv!=='undefined'&&cv) buildLayers();
}
applyTheme(curTheme);
function nextTheme(){
  applyTheme(THEMES[(THEMES.indexOf(curTheme)+1)%THEMES.length]);
}
el('btnTheme').onclick=nextTheme;
function isTyping(t){
  var tag=t&&t.tagName;
  return tag==='INPUT'||tag==='TEXTAREA'||(t&&t.isContentEditable);
}
document.addEventListener('keydown',function(e){
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(isTyping(e.target)) return;
  var n=parseInt(e.key,10);
  if(n>=1&&n<=4) applyTheme(THEMES[n]);        // 1=Папоротник 2=Орбита 3=Кибер 4=EX8
  if(n===0) applyTheme('teal');                // 0 = базовая неон-зелёная
});

// Перерисовка списка треков с учетом фильтров и режима OST
function libRenderTracks(tracks) {
  var main = qs('#libPage .lp-main');
  if (!main) return;
  main.innerHTML = '';
  var filtered = tracks.filter(function(t) {
    var n = (t.name || '').toLowerCase();
    var a = (t.artist || '').toLowerCase();
    var g = (t.genre || '').toLowerCase();

    // Режим OST: показываем только треки, где в названии есть «ost»
    if (isOstmMode && n.indexOf('ost') === -1) return false;

    // Фильтры по полям
    if (libFilters.name && n.indexOf(libFilters.name) === -1) return false;
    if (libFilters.artist && a.indexOf(libFilters.artist) === -1) return false;
    if (libFilters.genre && g.indexOf(libFilters.genre) === -1) return false;

    return true;
  });

  filtered.forEach(function(t, i) {
    var el = document.createElement('div');
    el.className = 'trk';
    if (t.isNow) el.classList.add('act');
    el.innerHTML =
      '<span class="t">' + esc(t.name) + '</span>' +
      '<span class="a">' + esc(t.artist || '-') + '</span>' +
      '<span class="al">' + esc(t.album || '-') + '</span>' +
      '<span class="d">' + (t.duration || '') + '</span>';
    el.onclick = function() { libPlayTrack(t); };
    main.appendChild(el);
  });

  // Счетчик видимых треков
  var cnt = qs('#libPage .lp-head .cnt');
  if (cnt) cnt.textContent = 'треков: ' + filtered.length;
}

// Обработчики полей фильтров
function libSetupFilters() {
  var inpName = qs('#libPage .lp-input[name="name"]');
  var inpArtist = qs('#libPage .lp-input[name="artist"]');
  var selGenre = qs('#libPage .lp-sel[name="genre"]');
  var btnOstm = qs('#libPage .lp-more[data-type="ostm"]');

  if (inpName) inpName.oninput = function() { libFilters.name = this.value.toLowerCase(); libRenderTracks(libTracks); };
  if (inpArtist) inpArtist.oninput = function() { libFilters.artist = this.value.toLowerCase(); libRenderTracks(libTracks); };
  if (selGenre) selGenre.onchange = function() { libFilters.genre = this.value.toLowerCase(); libRenderTracks(libTracks); };
  if (btnOstm) btnOstm.onclick = function() {
    isOstmMode = !isOstmMode;
    this.textContent = isOstmMode ? 'Режим OST: ВКЛ' : 'Режим OST: ВЫКЛ';
    this.style.color = isOstmMode ? 'var(--accent)' : '';
    libRenderTracks(libTracks);
  };
}

// перетаскивание отключено; одноразовая очистка старых сохранённых позиций
if(localStorage.getItem('tablo_free_pos')){
  localStorage.removeItem('tablo_free_pos');
  location.reload();
}

// ---------- сворачивание: виджет прячется в док 42x42 справа, с подписью ----------
(function(){
  var dock=document.createElement('div');
  dock.id='widgetDock';
  document.body.appendChild(dock);
  var DEFS={'clock-panel':['⏱','время'],'sys-panel':['⚙','система'],
    'player-panel':['♫','плеер'],'tasks-panel':['✓','задачи'],
    'char-panel':['☺','персонаж'],'links-panel':['🔗','ссылки'],
    'notes-panel':['✎','заметки']};
  qsa('.w-collapse').forEach(function(b){
    b.onclick=function(){
      var w=b.closest('.widget');
      var key=null;
      Object.keys(DEFS).some(function(k){
        if(w.classList.contains(k)){ key=k; return true; }
        return false;
      });
      w.style.display='none';
      var chip=document.createElement('div');
      chip.className='dock-chip';
      chip.innerHTML='<span class="ic">'+((key&&DEFS[key][0])||'▪')+'</span>'+
        '<span class="lb">'+((key&&DEFS[key][1])||'панель')+'</span>';
      chip.title='Развернуть';
      chip.onclick=function(){ w.style.display=''; chip.remove(); };
      dock.appendChild(chip);
    };
  });
})();

// ---------- палитра команд (Ctrl+K) ----------
var COMMANDS=[
  {k:'тема',t:'Следующая тема',run:nextTheme},
  {k:'тема:неон',t:'Тема · Неон (база)',run:function(){ applyTheme('teal'); }},
  {k:'тема:папоротник',t:'Тема · Папоротник',run:function(){ applyTheme('fern'); }},
  {k:'тема:орбита',t:'Тема · Орбита',run:function(){ applyTheme('orbit'); }},
  {k:'тема:кибер',t:'Тема · Кибер',run:function(){ applyTheme('xber'); }},
  {k:'тема:ex8',t:'Тема · EX8',run:function(){ applyTheme('ex8'); }},
  {k:'сброс',t:'Сбросить раскладку (перезагрузка)',run:function(){ location.reload(); }},
  {k:'персонажи',t:'Открыть раздел персонажей',run:function(){ openChars(); }},
  {k:'заметки',t:'Открыть заметки',run:function(){ openNotesBig(); }},
  {k:'библиотека',t:'Открыть библиотеку NAS (полный экран)',run:function(){ openLibPage(); }},
  {k:'плей',t:'Плеер: играть/пауза',run:function(){ plToggle(); }},
  {k:'повтор',t:'Плеер: повтор трека вкл/выкл',run:function(){ el('repBtn').click(); }},
  {k:'дальше',t:'Плеер: следующий трек',run:function(){ el('next').click(); }},
  {k:'назад',t:'Плеер: предыдущий трек',run:function(){ el('prev').click(); }},
  {k:'громче',t:'Громкость +10',run:function(){ setVol(volNow+10); }},
  {k:'тише',t:'Громкость −10',run:function(){ setVol(volNow-10); }},
  {k:'mute',t:'Звук вкл/выкл',run:function(){ toggleMute(); }},
  {k:'полный экран',t:'Плеер на весь экран',run:function(){ openFull(); }}
];
var pal=el('palette'), palInput=qs('.pal-input',pal), palList=qs('.pal-list',pal);
var palSel=0, palItems=[];
function palRender(q){
  q=(q||'').toLowerCase();
  palItems=COMMANDS.filter(function(c){ return !q||c.k.indexOf(q)>=0||c.t.toLowerCase().indexOf(q)>=0; });
  palSel=Math.min(palSel,Math.max(0,palItems.length-1));
  palList.innerHTML=palItems.map(function(c,i){
    return '<div class="pal-item'+(i===palSel?' sel':'')+'" data-i="'+i+'"><span>'+c.t+'</span><span class="k">'+c.k+'</span></div>';
  }).join('')||'<div class="pal-item" style="color:var(--muted)">Ничего не найдено</div>';
  qsa('.pal-item[data-i]',palList).forEach(function(n){
    n.onclick=function(){ palRun(+n.dataset.i); };
  });
}
function palRun(i){ pal.classList.remove('on'); if(palItems[i]) palItems[i].run(); }
function palOpen(){
  pal.classList.add('on'); palSel=0; palInput.value=''; palRender(''); palInput.focus();
}
palInput.addEventListener('input',function(){ palSel=0; palRender(palInput.value); });
palInput.addEventListener('keydown',function(e){
  if(e.key==='ArrowDown'){ palSel=Math.min(palSel+1,palItems.length-1); palRender(palInput.value); e.preventDefault(); }
  else if(e.key==='ArrowUp'){ palSel=Math.max(palSel-1,0); palRender(palInput.value); e.preventDefault(); }
  else if(e.key==='Enter') palRun(palSel);
  else if(e.key==='Escape') pal.classList.remove('on');
});
pal.addEventListener('mousedown',function(e){ if(e.target===pal) pal.classList.remove('on'); });
el('btnCmds').onclick=palOpen;

// Ctrl+K: фаза захвата + обе раскладки (физическая K на кириллице = «л»)
window.addEventListener('keydown',function(e){
  var key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(key==='k'||key==='л')){
    e.preventDefault(); e.stopPropagation();
    if(pal.classList.contains('on')) pal.classList.remove('on'); else palOpen();
  }
},true);

// Esc закрывает всё
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  pal.classList.remove('on');
  if(el('charsPage').classList.contains('on')) el('charsPage').classList.remove('on');
  if(el('notesBig').classList.contains('on')) closeNotesBig();
  if(el('playerFull').classList.contains('on')) closeFull();
  if(el('libPage').classList.contains('on')) closeLibPage();
});

// ---------- поиск в шапке: тихие подсказки под полем ----------
var cmdInput=el('cmdInput');
var sug=document.createElement('div'); sug.id='cmdSug';
el('cmdwrap').appendChild(sug);
var sugItems=[], sugSel=0;
function sugRender(q){
  q=q.toLowerCase();
  sugItems=COMMANDS.filter(function(c){ return c.k.indexOf(q)>=0||c.t.toLowerCase().indexOf(q)>=0; }).slice(0,7);
  sugSel=0;
  if(!q||!sugItems.length){ sug.style.display='none'; el('cmdwrap').classList.remove('active'); return; }
  el('cmdwrap').classList.add('active');
  sug.innerHTML=sugItems.map(function(c,i){
    return '<div class="ci'+(i===sugSel?' sel':'')+'" data-i="'+i+'"><span>'+c.t+'</span><span class="k">'+c.k+'</span></div>';
  }).join('');
  sug.style.display='block';
  qsa('.ci',sug).forEach(function(n){
    n.onmousedown=function(ev){ ev.preventDefault(); sugRun(+n.dataset.i); };
  });
}
function sugRun(i){
  sug.style.display='none'; el('cmdwrap').classList.remove('active');
  cmdInput.value='';
  if(sugItems[i]) sugItems[i].run();
}
cmdInput.addEventListener('input',function(){ sugRender(cmdInput.value); });
cmdInput.addEventListener('keydown',function(e){
  if(e.key==='ArrowDown'&&sug.style.display==='block'){ sugSel=Math.min(sugSel+1,sugItems.length-1); sugRender(cmdInput.value); e.preventDefault(); }
  else if(e.key==='ArrowUp'&&sug.style.display==='block'){ sugSel=Math.max(sugSel-1,0); sugRender(cmdInput.value); e.preventDefault(); }
  else if(e.key==='Enter'&&sug.style.display==='block') sugRun(sugSel);
  else if(e.key==='Escape'){ cmdInput.value=''; sug.style.display='none'; el('cmdwrap').classList.remove('active'); }
});
document.addEventListener('mousedown',function(e){
  if(!e.target.closest('#cmdwrap')){ sug.style.display='none'; el('cmdwrap').classList.remove('active'); }
});

// ---------- часы (МСК) ----------
function tickClock(){
  var d=new Date();
  var msk=new Date(d.getTime()+d.getTimezoneOffset()*60000+3*3600000);
  var t=('0'+msk.getHours()).slice(-2)+':'+('0'+msk.getMinutes()).slice(-2)+':'+('0'+msk.getSeconds()).slice(-2);
  qs('.clock-panel .time').textContent=t;
  qs('.clock-panel .date').textContent=msk.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
}
setInterval(tickClock,1000); tickClock();

// ---------- система ----------
function setSysRow(label,pct,text){
  qsa('.sys-panel .sys-item').forEach(function(row){
    var lab=qs('span',row);
    if(lab&&lab.textContent.trim().toUpperCase()===label){
      qs('.bar-fill',row).style.width=Math.max(0,Math.min(100,pct))+'%';
      qs('.val',row).textContent=text;
    }
  });
}
var demo={cpu:12,mem:39,net:100};
async function pollSystem(){
  try{
    var r=await fetch(AGENT+'/api/system',{cache:'no-store'});
    var j=await r.json();
    if(j.agent){
      el('sysBadge').textContent='ЖИВОЕ';
      setSysRow('CPU',j.cpu,Math.round(j.cpu)+'%');
      setSysRow('RAM',j.mem,Math.round(j.mem)+'%');
      var kb=j.net||0;
      setSysRow('NET',Math.min(100,kb/300), kb>=1024?(kb/1024).toFixed(1)+' MB/s':Math.round(kb)+' KB/s');
      return;
    }
  }catch(e){}
  el('sysBadge').textContent='ДЕМО';
  demo.cpu=Math.max(3,Math.min(95,demo.cpu+(Math.random()*10-5)));
  demo.mem=Math.max(10,Math.min(95,demo.mem+(Math.random()*6-3)));
  demo.net=Math.max(0,Math.min(200,demo.net+(Math.random()*10-5)));
  setSysRow('CPU',demo.cpu,Math.round(demo.cpu)+'%');
  setSysRow('RAM',demo.mem,Math.round(demo.mem)+'%');
  setSysRow('NET',demo.net/2,Math.round(demo.net)+' KB/s');
}
pollSystem(); setInterval(pollSystem,2000);

// ---------- фон: Firewatch-параллакс (слои гор + ёлки + частицы) ----------
var cv=el('bg'), cx=cv.getContext('2d');
var layers=[], parts=[], scrollCur=0, scrollTgt=0;
var mouse={x:-9999,y:-9999};
function hexRGB(h){
  var m=/^#?([0-9a-f]{6})$/i.exec(h.trim());
  if(m) return [parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16)];
  m=/^#?([0-9a-f]{3})$/i.exec(h.trim());
  if(m) return m[1].split('').map(function(c){ return parseInt(c+c,16); });
  return [12,15,13];
}
function mixC(a,b,k){
  return [Math.round(a[0]+(b[0]-a[0])*k),Math.round(a[1]+(b[1]-a[1])*k),Math.round(a[2]+(b[2]-a[2])*k)];
}
function rng(seed){
  return function(){ seed=(seed*9301+49297)%233280; return seed/233280; };
}
function accentRGB(){
  var a=getComputedStyle(document.body).getPropertyValue('--accent').trim();
  return hexRGB(a);
}
function buildLayers(){
  var bg=hexRGB(getComputedStyle(document.body).getPropertyValue('--bg'));
  layers=[];
  var defs=[
    {depth:.10,base:.58,amp:130,trees:false,dark:.06,wl:520},
    {depth:.26,base:.68,amp:150,trees:false,dark:.22,wl:360},
    {depth:.52,base:.78,amp:130,trees:true, dark:.45,wl:240},
    {depth:.85,base:.88,amp:105,trees:true, dark:.68,wl:170}
  ];
  defs.forEach(function(d,i){
    var r=rng(17+i*37);
    var pts=[],x=-60;
    while(x<cv.width+120){
      var y=cv.height*d.base
        - r()*d.amp
        - Math.sin(x/d.wl+i*2.1)*d.amp*.45
        - Math.sin(x/(d.wl*.37)+i*5.7)*d.amp*.22;
      pts.push({x:x,y:y});
      x+=40+r()*80;
    }
    var trees=[];
    if(d.trees){
      var r2=rng(91+i*13);
      for(var t=0;t<Math.floor(cv.width/9);t++){
        var tx=r2()*(cv.width+40)-20, ty=cv.height*d.base;
        for(var p=0;p<pts.length-1;p++){
          if(tx>=pts[p].x&&tx<=pts[p+1].x){
            var k=(tx-pts[p].x)/((pts[p+1].x-pts[p].x)||1);
            ty=pts[p].y+(pts[p+1].y-pts[p].y)*k; break;
          }
        }
        trees.push({x:tx,y:ty+2,w:2.5+r2()*4,h:12+r2()*30});
      }
    }
    layers.push({pts:pts,trees:trees,depth:d.depth,col:mixC(bg,[0,0,0],d.dark)});
  });
  parts=[];
  var n=Math.floor(cv.width*cv.height/26000);
  for(var i=0;i<n;i++) parts.push({
    x:Math.random()*cv.width,y:Math.random()*cv.height,
    vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,
    r:1.1+Math.random()*1.7,z:0.25+Math.random()*0.75
  });
}
function drawBG(){
  var A=accentRGB();
  cx.clearRect(0,0,cv.width,cv.height);
  for(var li=0;li<layers.length;li++){
    var L=layers[li];
    var off=scrollCur*L.depth*0.9;
    var mx=(mouse.x>-999?(mouse.x-cv.width/2):0)*L.depth*.035;
    cx.save();
    cx.translate(mx,off);
    cx.beginPath(); cx.moveTo(-80,cv.height+60);
    for(var p=0;p<L.pts.length;p++) cx.lineTo(L.pts[p].x,L.pts[p].y);
    cx.lineTo(cv.width+80,cv.height+60); cx.closePath();
    cx.fillStyle='rgb('+L.col[0]+','+L.col[1]+','+L.col[2]+')';
    cx.fill();
    if(L.trees.length){
      cx.fillStyle='rgb('+L.col[0]+','+L.col[1]+','+L.col[2]+')';
      for(var t=0;t<L.trees.length;t++){
        var tr=L.trees[t];
        cx.beginPath();
        cx.moveTo(tr.x-tr.w/2,tr.y);
        cx.lineTo(tr.x,tr.y-tr.h);
        cx.lineTo(tr.x+tr.w/2,tr.y);
        cx.closePath(); cx.fill();
      }
    }
    cx.beginPath();
    for(var q=0;q<L.pts.length;q++){
      if(q) cx.lineTo(L.pts[q].x,L.pts[q].y); else cx.moveTo(L.pts[q].x,L.pts[q].y);
    }
    cx.strokeStyle='rgba('+A[0]+','+A[1]+','+A[2]+','+(0.20-L.depth*0.12).toFixed(3)+')';
    cx.lineWidth=1;
    cx.stroke();
    cx.restore();
  }
  for(var i=0;i<parts.length;i++){
    var pt=parts[i];
    pt.x+=pt.vx; pt.y+=pt.vy;
    if(pt.x<0||pt.x>cv.width) pt.vx*=-1;
    if(pt.y<0||pt.y>cv.height) pt.vy*=-1;
    var yy=pt.y-scrollCur*pt.z*.2;
    yy=((yy%cv.height)+cv.height)%cv.height;
    var dx=mouse.x-pt.x, dy=mouse.y-yy, d=Math.hypot(dx,dy);
    if(d<220&&d>1&&!reduceMotion){ pt.x+=dx/d*.5; pt.y+=dy/d*.5; }
    cx.beginPath(); cx.arc(pt.x,yy,pt.r*(.6+pt.z*.5),0,6.283);
    cx.fillStyle='rgba('+A[0]+','+A[1]+','+A[2]+','+(.35+pt.z*.4).toFixed(2)+')';
    cx.fill();
  }
  for(var a=0;a<parts.length;a++)for(var b=a+1;b<parts.length;b++){
    var p1=parts[a],p2=parts[b];
    var y1=p1.y-scrollCur*p1.z*.2, y2=p2.y-scrollCur*p2.z*.2;
    y1=((y1%cv.height)+cv.height)%cv.height;
    y2=((y2%cv.height)+cv.height)%cv.height;
    var dd=Math.hypot(p1.x-p2.x,y1-y2);
    if(dd<130){
      cx.strokeStyle='rgba('+A[0]+','+A[1]+','+A[2]+','+(.18*(1-dd/130)).toFixed(3)+')';
      cx.beginPath(); cx.moveTo(p1.x,y1); cx.lineTo(p2.x,y2); cx.stroke();
    }
  }
}
(function loop(){
  scrollCur+=(scrollTgt-scrollCur)*(reduceMotion?1:.08);
  drawBG(); requestAnimationFrame(loop);
})();
function resize(){ cv.width=innerWidth; cv.height=innerHeight; buildLayers(); }
window.addEventListener('resize',resize);
window.addEventListener('mousemove',function(e){ mouse.x=e.clientX; mouse.y=e.clientY; });
window.addEventListener('mouseleave',function(){ mouse.x=mouse.y=-9999; });
window.addEventListener('scroll',function(){ scrollTgt=window.scrollY||0; },{passive:true});
resize();

// ---------- задачи ----------
var tasks=jget('tablo_tasks',[]);
if(!Array.isArray(tasks)) tasks=[];
function saveTasks(){ jset('tablo_tasks',tasks); }
function renderTasks(){
  var box=el('mainTasks'); box.innerHTML='';
  var done=0;
  tasks.forEach(function(t){ if(t.done) done++; });
  el('taskCount').textContent=done+' / '+tasks.length;
  if(!tasks.length){
    var d=document.createElement('div');
    d.className='task-item'; d.style.color='var(--muted)'; d.style.cursor='default';
    d.textContent='Задач нет — добавьте первую ниже';
    box.appendChild(d); return;
  }
  tasks.forEach(function(t,i){
    var d=document.createElement('div');
    d.className='task-item'+(t.done?' done':'');
    d.innerHTML='<span class="tx">'+(t.done?'✓ ':'○ ')+t.text+'</span><span class="rm">✕</span>';
    qs('.tx',d).onclick=function(){ tasks[i].done=!tasks[i].done; saveTasks(); renderTasks(); };
    qs('.rm',d).onclick=function(ev){ ev.stopPropagation(); tasks.splice(i,1); saveTasks(); renderTasks(); };
    box.appendChild(d);
  });
}
var taskInput=qs('.task-input-wrapper input');
var taskBtn=qs('.task-input-wrapper button');
function addTask(){
  var v=taskInput.value.trim(); if(!v) return;
  tasks.push({text:v,done:false}); taskInput.value='';
  saveTasks(); renderTasks();
}
taskBtn.onclick=addTask;
taskInput.addEventListener('keydown',function(e){ if(e.key==='Enter') addTask(); });
renderTasks();

// ---------- заметки: автосохранение + модальное окно ----------
var notesArea=el('notesInline');
var notesStatus=document.createElement('div');
notesStatus.className='notes-status'; notesStatus.textContent='';
if(notesArea){
  notesArea.value=jget('tablo_notes','');
  notesArea.insertAdjacentElement('afterend',notesStatus);
  var moreBtn=document.createElement('button');
  moreBtn.className='notes-more'; moreBtn.textContent='⤢ развернуть';
  notesStatus.insertAdjacentElement('afterend',moreBtn);
  moreBtn.onclick=openNotesBig;
  var ntimer=null;
  notesArea.addEventListener('input',function(){
    clearTimeout(ntimer);
    ntimer=setTimeout(function(){ jset('tablo_notes',notesArea.value); },400);
  });
}
var nb=document.createElement('div'); nb.id='notesBig';
nb.innerHTML='<div class="nb-box"><div class="nb-top">'+
  '<span style="letter-spacing:4px;color:var(--muted)">ЗАМЕТКИ</span>'+
  '<span class="nb-status" id="nbStatus"></span>'+
  '<button class="nb-close" id="nbClose">✕</button></div>'+
  '<textarea id="nbArea" placeholder="Держите здесь всё, что не должно забыться…"></textarea></div>';
document.body.appendChild(nb);
var nbArea=el('nbArea');
nbArea.value=jget('tablo_notes','');
var nbtimer=null;
nbArea.addEventListener('input',function(){
  clearTimeout(nbtimer);
  nbtimer=setTimeout(function(){
    jset('tablo_notes',nbArea.value);
    if(notesArea) notesArea.value=nbArea.value;
    el('nbStatus').textContent='Сохранено ✓';
    setTimeout(function(){ el('nbStatus').textContent=''; },1200);
  },400);
});
function openNotesBig(){ nb.classList.add('on'); nbArea.focus(); }
function closeNotesBig(){ nb.classList.remove('on'); if(notesArea) notesArea.value=nbArea.value; }
nb.addEventListener('mousedown',function(e){ if(e.target===nb) closeNotesBig(); });
el('nbClose').onclick=closeNotesBig;

// ---------- персонажи ----------
var ELE_COLOR={'Пиро':'#ef7a3d','Гидро':'#4cc2f1','Крио':'#9fd6e3','Электро':'#a36cf5',
  'Анемо':'#74c2a8','Гео':'#f0c96b','Дендро':'#a5c83c'};
var ROSTER=[
  {n:'Эмбер',e:'Пиро',l:90,c:6},{n:'Кэйа',e:'Крио',l:90,c:6},{n:'Барбара',e:'Гидро',l:90,c:6},
  {n:'Лиза',e:'Электро',l:90,c:4},{n:'Валерий',e:'Крио',l:87,c:2},{n:'Мика',e:'Крио',l:85,c:4},
  {n:'Проян',e:'—',l:82,c:1},{n:'Алёша',e:'—',l:80,c:1},{n:'Ягода',e:'—',l:80,c:2},
  {n:'Айно',e:'—',l:80,c:3},{n:'Далия',e:'Гидро',l:80,c:1},{n:'Ифа',e:'Анемо',l:80,c:5},
  {n:'Иансан',e:'Электро',l:80,c:3},{n:'Оророн',e:'Электро',l:80,c:6},{n:'Сетос',e:'Дендро',l:80,c:6},
  {n:'Шеврёз',e:'Пиро',l:80,c:4},{n:'Линетт',e:'Анемо',l:80,c:5},{n:'Кавех',e:'Дендро',l:80,c:3},
  {n:'Яо Яо',e:'Дендро',l:80,c:6},{n:'Лайла',e:'Крио',l:80,c:3},{n:'Кандакия',e:'Гидро',l:80,c:2},
  {n:'Дори',e:'Электро',l:80,c:6},{n:'Коллеи',e:'Дендро',l:80,c:6},{n:'Хэйдзо',e:'Анемо',l:80,c:3},
  {n:'Сара',e:'Электро',l:80,c:6},{n:'Саю',e:'Анемо',l:80,c:3},{n:'Янь Фэй',e:'Пиро',l:80,c:6},
  {n:'Синь Янь',e:'Пиро',l:80,c:6},{n:'Сахароза',e:'Анемо',l:80,c:6},{n:'Диона',e:'Крио',l:80,c:6},
  {n:'Бэй Доу',e:'Электро',l:80,c:6},{n:'Райзор',e:'Электро',l:80,c:6},
  {n:'Тигнари',e:'Дендро',l:90,c:6},{n:'Аято',e:'Гидро',l:90,c:6},{n:'Шэнь Хэ',e:'Крио',l:90,c:6},
  {n:'Е Лань',e:'Гидро',l:90,c:6},{n:'Яэ Мико',e:'Электро',l:90,c:6},{n:'Райдэн',e:'Электро',l:90,c:1},
  {n:'Кадзуха',e:'Анемо',l:90,c:1},{n:'Кэ Цин',e:'Электро',l:90,c:3},{n:'Мона',e:'Гидро',l:90,c:1},
  {n:'Ци Ци',e:'Крио',l:90,c:4},{n:'Чжун Ли',e:'Гео',l:90,c:1},{n:'Кли',e:'Пиро',l:90,c:1},
  {n:'Дилок',e:'Пиро',l:90,c:1},{n:'Путешественник',e:'—',l:90,c:6},{n:'Джинн',e:'Анемо',l:90,c:2},
  {n:'Иллуга',e:'—',l:90,c:6},{n:'Лань Янь',e:'Анемо',l:90,c:2},{n:'Канина',e:'—',l:90,c:6},
  {n:'Ка Мина',e:'—',l:90,c:6},{n:'Шарлотта',e:'Крио',l:90,c:6},{n:'Фремине',e:'Крио',l:90,c:6},
  {n:'Фарузан',e:'Анемо',l:90,c:6},{n:'Куки Синобу',e:'Электро',l:90,c:6},{n:'Юнь Цзинь',e:'Гео',l:90,c:6},
  {n:'Кирара',e:'Дендро',l:90,c:6},{n:'Горо',e:'Гео',l:90,c:6},{n:'Тома',e:'Пиро',l:90,c:6},
  {n:'Розария',e:'Крио',l:90,c:6},{n:'Чун Юнь',e:'Крио',l:90,c:1},{n:'Нозоль',e:'—',l:90,c:6},
  {n:'Беннет',e:'Пиро',l:90,c:6},{n:'Фишль',e:'Электро',l:90,c:6},{n:'Нин Гуан',e:'Гео',l:90,c:6},
  {n:'Син Цю',e:'Гидро',l:90,c:6},{n:'Сян Лин',e:'Пиро',l:90,c:5},
  {n:'Арлекино',e:'Пиро',l:95,c:2},{n:'Линнея',e:'—',l:90,c:1},{n:'Коломбина',e:'Крио',l:90,c:1},
  {n:'Дурин',e:'—',l:90,c:4},{n:'Манекен (ж)',e:'—',l:90,c:0},{n:'Манекен (м)',e:'—',l:90,c:0},
  {n:'Мидзуки',e:'Анемо',l:90,c:6},{n:'Ситлали',e:'Крио',l:90,c:6},{n:'Клоринда',e:'Электро',l:90,c:1},
  {n:'Тиори',e:'Гео',l:90,c:6},{n:'Навия',e:'Гео',l:90,c:2},{n:'Фурина',e:'Гидро',l:90,c:2},
  {n:'Нёвиллет',e:'Гидро',l:90,c:1},{n:'Бай Чжу',e:'Дендро',l:90,c:2},{n:'Дэхья',e:'Пиро',l:90,c:5},
  {n:'Аль-Хайтам',e:'Дендро',l:90,c:5},{n:'Странник',e:'Анемо',l:90,c:6},{n:'Нахида',e:'Дендро',l:90,c:1}
];
var ASC={thresholds:[20,40,50,60,70,80],gem:[1,3,6,3,6,6],boss:[1,3,6,9,12,15],
  local:[6,12,20,30,40,60],moraK:[20,40,60,80,100,120]};
var TAL={green:9,blue:63,purple:114,weekly:18,moraK:1652.5};
var cpIdx=0;
var gplans=jget('t2_gplans',[]);
if(!Array.isArray(gplans)) gplans=[];
function savePlans(){ jset('t2_gplans',gplans); }

// ---------- журнал изменений: каждая правка плана пишется с датой ----------
var chlog=jget('tablo_changelog',[]);
if(!Array.isArray(chlog)) chlog=[];
function logCh(charName,itemName,delta){
  chlog.unshift({ts:Date.now(),c:charName,i:itemName,d:delta});
  if(chlog.length>200) chlog.length=200;
  jset('tablo_changelog',chlog);
  if(typeof renderClog==='function') renderClog();
}
function lastUpd(charName){
  for(var i=0;i<chlog.length;i++){
    if(chlog[i].c===charName){
      var d=new Date(chlog[i].ts);
      return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+' '+
        ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    }
  }
  return '';
}

// ---------- Enka: витрина профиля ----------
// Словарь ID → имя: только те, в которых уверен. Остальное — ручная привязка.
var AVATAR_RU={10000001:'Джинн',10000002:'Аяка',10000006:'Дилок',10000007:'Путешественник',
  10000035:'Ци Ци',10000052:'Мона',10000061:'Гань Юй',10000067:'Эула',
  10000069:'Ху Тао',10000070:'Сяо',10000071:'Кадзуха',10000073:'Тарталья',
  10000075:'Чжун Ли',10000079:'Райдэн',10000085:'Кокоми',10000086:'Аято',
  10000087:'Яэ Мико',10000088:'Итто',10000089:'Е Лань',10000091:'Сайно',
  10000097:'Нилу',10000098:'Коллеи',10000099:'Дори',10000100:'Тигнари',
  10000102:'Лайни',10000103:'Аль-Хайтам',10000104:'Нёвиллет',10000105:'Странник',
  10000106:'Фурина',10000107:'Клоринда',10000108:'Сиджвинн',10000109:'Шарлотта',
  10000110:'Навия',10000111:'Ризоттли',10000112:'Сянь Юнь',10000113:'Тиори'};
var idmap=jget('tablo_idmap',{});
var ENKA=null;
var SLOT_RU={'EQUIP_BRACER':'цветок','EQUIP_NECKLACE':'перо','EQUIP_SHOES':'пески',
  'EQUIP_RING':'чаша','EQUIP_DRESS':'корона'};
function enkName(c){
  return AVATAR_RU[c.id]||idmap[String(c.id)]||('ID '+c.id);
}
function enkLoad(){
  return fetch(AGENT+'/api/enka',{cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(j){ ENKA=j; enkRender(); return j; })
    .catch(function(){ ENKA={ok:false,err:'агент не отвечает'}; enkRender(); return ENKA; });
}
function enkRender(){
  if(!el('enkList')) return;
  var prof=el('enkProfile'), list=el('enkList');
  if(!ENKA){ list.innerHTML=''; return; }
  if(!ENKA.ok){
    prof.innerHTML='<span style="color:var(--muted)">'+esc(ENKA.err||'нет данных')+'</span>';
    list.innerHTML='';
    return;
  }
  prof.innerHTML='Профиль: <b>'+esc(ENKA.nickname)+'</b> · ур. '+ENKA.level+
    ' · мир '+ENKA.worldLevel;
  list.innerHTML=ENKA.characters.map(function(c,i){
    var arts5=(c.artifacts||[]).filter(function(a){ return a.rarity>=5; }).length;
    var stars='';
    (c.artifacts||[]).forEach(function(a){ stars+=a.rarity>=5?'★':'☆'; });
    var wep=c.weapon?('оружия ID '+c.weapon.id+' · ур. '+c.weapon.level):'';
    var sel='<select class="enk-sel" data-i="'+i+'">'+
      '<option value="">— привязать к ростеру —</option>'+
      ROSTER.map(function(r){ return '<option value="'+esc(r.n)+'"'+(idmap[String(c.id)]===r.n?' selected':'')+'>'+esc(r.n)+'</option>'; }).join('')+
      '</select>';
    return '<div class="enk-row" style="border-left:3px solid #555">'+
      '<span class="enk-name">'+esc(enkName(c))+'</span>'+
      '<span class="enk-sub">ур. '+c.level+
      (c.talents!=null?' · талантов: '+c.talents:'')+
      (wep?' · '+wep:'')+'</span>'+
      (stars?'<span class="enk-star">'+stars+'</span><span class="enk-sub">'+arts5+'×5★</span>':'')+
      sel+'</div>';
  }).join('')||'<div class="enk-sub" style="padding:8px">Витрина пуста</div>';
  qsa('.enk-sel',list).forEach(function(sel){
    sel.onchange=function(){
      var c=ENKA.characters[+sel.dataset.i];
      if(sel.value){ idmap[String(c.id)]=sel.value; }
      else delete idmap[String(c.id)];
      jset('tablo_idmap',idmap);
      enkRender();
    };
  });
}

// ---------- калькулятор и планы ----------
function cpRenderRoster(){
  var box=el('cpRoster'); box.innerHTML='';
  ROSTER.forEach(function(c,i){
    var d=document.createElement('div');
    d.className='cp-rtile'+(i===cpIdx?' act':'');
    d.style.borderLeft='3px solid '+(ELE_COLOR[c.e]||'#6c5ce7');
    d.innerHTML='<div class="nm">'+c.n+'</div><div class="sub">Ур. '+c.l+' · C'+c.c+' · '+c.e+'</div>';
    d.onclick=function(){ cpIdx=i; cpRenderRoster(); cpRenderCard(); cpCalc(); };
    box.appendChild(d);
  });
}
function cpRenderCard(){
  var c=ROSTER[cpIdx];
  var card=el('cpCard');
  card.style.borderLeft='4px solid '+(ELE_COLOR[c.e]||'#6c5ce7');
  var enkaRow=null;
  if(ENKA&&ENKA.ok){
    ENKA.characters.forEach(function(e){
      if(idmap[String(e.id)]===c.n||(!idmap[String(e.id)]&&AVATAR_RU[e.id]===c.n)) enkaRow=e;
    });
  }
  var upd=lastUpd(c.n);
  card.innerHTML='<div class="cpc-top">'+
    '<div class="cpc-hex">'+esc(c.n[0])+'</div>'+
    '<div><div class="cpc-name">'+c.n+'</div>'+
    '<div class="cpc-sub">созвездие C'+c.c+' · стихия: '+c.e+'</div>'+
    (enkaRow?'<div class="cpc-lvl">ENKA · ур. '+enkaRow.level+
      (enkaRow.weapon?' · оружие ур. '+enkaRow.weapon.level:'')+
      ' · артефактов 5★: '+((enkaRow.artifacts||[]).filter(function(a){return a.rarity>=5;}).length)+'</div>':
      '<div class="cpc-lvl">нет связи с витриной Enka — нажми «обновить» ниже</div>')+
    (upd?'<div class="cpc-lvl">последняя правка плана: '+upd+'</div>':'')+
    '</div></div>';
}
function cpCalc(){
  var c=ROSTER[cpIdx];
  var cur=Math.max(1,Math.min(89,parseInt(el('cpLvlCur').value,10)||1));
  var tgt=Math.max(cur+1,Math.min(90,parseInt(el('cpLvlTgt').value,10)||90));
  var tc=Math.max(1,Math.min(9,parseInt(el('cpTalCur').value,10)||1));
  var tt=Math.max(tc,Math.min(10,parseInt(el('cpTalTgt').value,10)||10));
  var stages=[]; ASC.thresholds.forEach(function(t,i){ if(cur<t&&tgt>=t) stages.push(i); });
  var items=[];
  if(stages.length){
    var gem=0,boss=0,local=0,mora=0;
    stages.forEach(function(i){ gem+=ASC.gem[i]; boss+=ASC.boss[i]; local+=ASC.local[i]; mora+=ASC.moraK[i]; });
    items.push({n:c.e==='—'?'Камень стихии':'Камень «'+c.e+'»',v:gem});
    items.push({n:'Местная специя региона',v:local});
    items.push({n:'Материал босса',v:boss});
    items.push({n:'Книги опыта (прибл.)',v:Math.ceil(277*(tgt-cur)/89)});
    items.push({n:'Мора: возвышение',v:mora*1000,money:true});
  }
  var frac=tt>tc?(tt-tc)/9:0;
  if(frac>0){
    items.push({n:'Талант-книги малые',v:Math.ceil(TAL.green*frac)});
    items.push({n:'Талант-книги средние',v:Math.ceil(TAL.blue*frac)});
    items.push({n:'Талант-книги большие',v:Math.ceil(TAL.purple*frac)});
    items.push({n:'Материал еженедельного босса',v:Math.ceil(TAL.weekly*frac)});
    if(tt>=10&&tc<10) items.push({n:'Корона прозрения',v:1});
    items.push({n:'Мора: таланты',v:Math.round(TAL.moraK*frac)*1000,money:true});
  }
  el('cpRes').innerHTML=items.length
    ? items.map(function(it){
        return '<div class="mrow"><span>'+it.n+'</span><b>'+(it.money?it.v.toLocaleString('ru-RU'):'×'+it.v)+'</b></div>';
      }).join('')
    : '<div style="color:var(--muted)">Цель уже достигнута</div>';
  return {c:c,items:items};
}
['cpLvlCur','cpLvlTgt','cpTalCur','cpTalTgt'].forEach(function(id){
  el(id).addEventListener('input',cpCalc);
});
// ---------- журнал (рендер) ----------
function renderClog(){
  var box=el('cpClog');
  if(!box) return;
  if(!chlog.length){
    box.innerHTML='<div class="clog-more">Пока ничего не менялось — правь остатки в планах, журнал заполнится сам.</div>';
    return;
  }
  box.innerHTML=chlog.slice(0,30).map(function(e){
    var d=new Date(e.ts);
    var t=('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+' '+
      ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    return '<div class="clog-row"><span class="ts">'+t+'</span>'+
      '<span><b>'+esc(e.c)+'</b> · '+esc(e.i)+' → собрано +'+e.d+'</span></div>';
  }).join('')+(chlog.length>30?'<div class="clog-more">…и ещё '+(chlog.length-30)+' записей</div>':'');
}
// ---------- глобальный todo из планов ----------
function renderTodo(){
  var box=el('cpTodo');
  if(!box) return;
  var agg={};
  gplans.forEach(function(pl){
    pl.items.forEach(function(it){
      var left=it.total-it.have;
      if(left<=0) return;
      if(!agg[it.n]) agg[it.n]={v:0,money:!!it.money};
      agg[it.n].v+=left;
    });
  });
  var keys=Object.keys(agg);
  if(!keys.length){
    box.innerHTML='<div class="clog-more">Все планы закрыты 🎉</div>';
    return;
  }
  keys.sort(function(a,b){ return agg[b].v-agg[a].v; });
  box.innerHTML=keys.map(function(k){
    return '<div class="todo-row"><span>'+esc(k)+'</span><b>'+
      (agg[k].money?agg[k].v.toLocaleString('ru-RU'):agg[k].v)+'</b></div>';
  }).join('');
}
function renderPlans(){
  var box=el('cpPlans'); box.innerHTML='';
  if(!gplans.length){
    box.innerHTML='<div style="color:var(--muted);padding:10px">План пуст. Посчитайте ресурсы в калькуляторе выше и нажмите «Добавить в план».</div>';
    return;
  }
  gplans.forEach(function(pl,pi){
    var rc=null; ROSTER.forEach(function(x){ if(x.n===pl.charId) rc=x; });
    if(!rc) return;
    var card=document.createElement('div');
    card.className='pl-card';
    card.style.borderLeft='3px solid '+(ELE_COLOR[rc.e]||'#6c5ce7');
    var rows=pl.items.map(function(it,ii){
      var left=Math.max(0,it.total-it.have);
      var v=it.money?left.toLocaleString('ru-RU'):left+' / '+it.total;
      return '<div class="pl-item'+(left===0?' ok':'')+'" data-p="'+pi+'" data-i="'+ii+'">'+
        '<span class="cnt">'+v+'</span><span class="nmx">'+it.n+'</span>'+
        (it.money?'':'<span class="pl-dec"><button data-d="1">−1</button><button data-d="5">−5</button><button data-d="10">−10</button></span>')+
        '</div>';
    }).join('');
    var upd=lastUpd(rc.n);
    card.innerHTML='<div class="pl-head"><span class="nm">'+rc.n+'</span>'+
      (upd?'<span class="upd">апгрейд: '+upd+'</span>':'')+
      '<span class="del">✕</span></div>'+rows;
    qs('.del',card).onclick=function(){ gplans.splice(pi,1); savePlans(); renderPlans(); renderTodo(); };
    qsa('.pl-dec button',card).forEach(function(b){
      b.onclick=function(ev){
        ev.stopPropagation();
        var row=ev.target.closest('.pl-item');
        var it=gplans[+row.dataset.p].items[+row.dataset.i];
        var delta=Math.min(parseInt(b.dataset.d,10),it.total-it.have);
        if(delta<=0) return;
        it.have+=delta;
        logCh(pl.charId,it.n,delta);
        savePlans(); renderPlans(); renderTodo();
      };
    });
    box.appendChild(card);
  });
}
el('cpToPlan').onclick=function(){
  var r=cpCalc(); if(!r.items.length) return;
  var pl=null; gplans.forEach(function(x){ if(x.charId===r.c.n) pl=x; });
  if(!pl){ pl={charId:r.c.n,items:[]}; gplans.push(pl); }
  r.items.forEach(function(it){
    var ex=null; pl.items.forEach(function(x){ if(x.n===it.n) ex=x; });
    if(ex){ ex.total=Math.max(ex.total,it.v); ex.have=Math.min(ex.have,ex.total); }
    else pl.items.push({n:it.n,total:it.v,have:0,money:!!it.money});
  });
  savePlans(); renderPlans(); renderTodo();
  var btn=el('cpToPlan'); btn.textContent='Добавлено в план ✓';
  setTimeout(function(){ btn.textContent='Добавить в план ✚'; },1800);
};

// ---------- Enka-блок внутри страницы персонажей ----------
var enkBox=document.createElement('div');
enkBox.className='enk-wrap';
enkBox.innerHTML='<div class="enk-head">'+
  '<span class="enk-ttl">ВИТРИНА // ENKA</span>'+
  '<button class="ctl" id="enkRefresh">⟳ обновить</button>'+
  '<a class="ctl" id="enkAkasha" href="https://akasha.cv/profile/737634719" target="_blank" '+
  'style="text-decoration:none;display:inline-block;line-height:30px;padding:0 10px">Akasha ↗</a>'+
  '<span id="enkStatus" style="font-size:11px;color:var(--muted)"></span></div>'+
  '<div class="enk-profile" id="enkProfile"></div>'+
  '<div id="enkList"></div>'+
  '<div class="clog-sec">Журнал изменений</div>'+
  '<div id="cpClog"></div>'+
  '<div class="todo-sec">Глобальный todo · осталось собрать по всем планам</div>'+
  '<div id="cpTodo"></div>';
el('charsPage').appendChild(enkBox);
el('enkRefresh').onclick=function(){
  var b=this; b.textContent='…качаю с сервера';
  el('enkStatus').textContent='';
  fetch(AGENT+'/api/enka/refresh',{cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(j){
      ENKA=j; enkRender();
      b.textContent='⟳ обновить';
      el('enkStatus').textContent=j.ok?'обновлено ✓':(j.err||'ошибка');
      if(typeof cpRenderCard==='function') cpRenderCard();
    })
    .catch(function(){
      b.textContent='⟳ обновить';
      el('enkStatus').textContent='агент не отвечает';
    });
};

function openChars(){
  el('charsPage').classList.add('on');
  cpRenderRoster(); cpRenderCard(); cpCalc(); renderPlans(); renderClog(); renderTodo();
  if(ENKA) enkRender(); else enkLoad();
}
el('btnChars').onclick=openChars;
el('cpBack').onclick=function(){ el('charsPage').classList.remove('on'); };

// ---------- плеер ----------
var audio=new Audio();
var PL={tracks:[],idx:-1};
var tab='local';
var volNow=jget('tablo_vol',70);
if(typeof volNow!=='number') volNow=70;
audio.volume=volNow/100;
var volRange=qs('.vol input');
volRange.value=volNow;
function setVol(v){
  volNow=Math.max(0,Math.min(100,Math.round(v)));
  jset('tablo_vol',volNow);
  volRange.value=volNow;
  audio.volume=volNow/100;
  updateMuteIcon();
}
function updateMuteIcon(){
  var m=qs('.vol .mute');
  if(m) m.textContent=(volNow===0)?'🔇':'🔊';
}
function toggleMute(){
  if(volNow>0){ jset('tablo_lastvol',volNow); setVol(0); }
  else setVol(jget('tablo_lastvol',70));
}
volRange.addEventListener('input',function(){ setVol(+volRange.value); });
volRange.addEventListener('change',function(){ if(+volRange.value>0) jset('tablo_lastvol',+volRange.value); });
qs('.vol .mute').onclick=toggleMute;
qs('.vol .vminus').onclick=function(){ setVol(volNow-10); };
updateMuteIcon();

// повтор трека
var repBtn=document.createElement('button');
repBtn.className='ctl rep'; repBtn.id='repBtn'; repBtn.title='Повтор трека';
repBtn.textContent='🔁';
repBtn.onclick=function(){
  audio.loop=!audio.loop;
  repBtn.classList.toggle('on',audio.loop);
};
qs('.player-controls').insertBefore(repBtn,qs('.vol'));

// полный экран плеера
function openFull(){
  el('playerFull').classList.add('on');
  qs('#playerFull .pf-title').textContent=qs('.player-info .title').textContent;
  qs('#playerFull .pf-sub').textContent=qs('.player-info .subtitle').textContent;
}
function closeFull(){ el('playerFull').classList.remove('on'); }
el('btnFull').onclick=openFull;
qs('.player-art').onclick=openFull;
qs('#playerFull .pf-close').onclick=closeFull;
el('pfPlay').onclick=plToggle;
el('pfPrev').onclick=function(){ el('prev').click(); };
el('pfNext').onclick=function(){ el('next').click(); };
el('playerFull').addEventListener('mousedown',function(e){
  if(e.target===el('playerFull')) closeFull();
});

function fmt(s){
  s=Math.max(0,Math.floor(s||0));
  return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);
}
function cleanName(n){
  var s=String(n).replace(/\.(mp3|flac|wav|ogg|m4a|opus|aac|wma)$/i,'');
  s=s.replace(/\s*[([]\s*www\.[^)\]]*[)\]]\s*/gi,' ');
  s=s.replace(/_+/g,' ').replace(/\s{2,}/g,' ').trim();
  return s||String(n);
}
// очередь рендерим порциями — тысячи DOM-строк убивают дизайн и скорость
var QUEUE_MAX=200;
function plRenderQueue(){
  var box=qs('.player-queue'); box.innerHTML='';
  var n=Math.min(PL.tracks.length,QUEUE_MAX);
  for(var i=0;i<n;i++){
    var t=PL.tracks[i];
    var d=document.createElement('div');
    d.className='queue-item'+(i===PL.idx?' active':'');
    d.textContent=(i+1)+'. '+t.name;
    d.onclick=function(ii){ return function(){ plLoad(ii); }; }(i);
    box.appendChild(d);
  }
  if(PL.tracks.length>QUEUE_MAX){
    var m=document.createElement('div');
    m.className='queue-more';
    m.textContent='…и ещё '+(PL.tracks.length-QUEUE_MAX)+' треков (полный список — в Библиотеке)';
    box.appendChild(m);
  }
}
function plLoad(i){
  if(!PL.tracks.length) return;
  PL.idx=i; audio.src=PL.tracks[i].url;
  qs('.player-info .title').textContent=PL.tracks[i].name;
  var m=PL.tracks[i].meta;
  qs('.player-info .subtitle').textContent=m
    ? ((m.artist||'—')+(m.album?' · '+m.album:'')+(m.ost?' · '+m.ost:''))
    : 'библиотека агента · '+PL.tracks.length+' треков';
  plRenderQueue();
  libMarkActive();
  audio.play().catch(function(){});
}
function plToggle(){
  if(tab==='system'){ sysCmd('play_pause'); return; }
  if(!PL.tracks.length) return;
  if(audio.paused){ if(PL.idx<0) plLoad(0); else audio.play().catch(function(){}); }
  else audio.pause();
}
audio.addEventListener('play',function(){ el('play').textContent='⏸'; el('pfPlay').textContent='⏸'; });
audio.addEventListener('pause',function(){ el('play').textContent='▶'; el('pfPlay').textContent='▶'; });
audio.addEventListener('ended',function(){ if(PL.idx<PL.tracks.length-1) plLoad(PL.idx+1); });
audio.addEventListener('timeupdate',function(){
  if(!(audio.duration>0)) return;
  qs('.progress-fill').style.width=(audio.currentTime/audio.duration*100)+'%';
  qs('.time-cur').textContent=fmt(audio.currentTime);
  qs('.time-left').textContent='-'+fmt(audio.duration-audio.currentTime);
});
el('play').onclick=plToggle;
el('prev').onclick=function(){
  if(tab==='system'){ sysCmd('prev'); return; }
  if(PL.tracks.length) plLoad((PL.idx-1+PL.tracks.length)%PL.tracks.length);
};
el('next').onclick=function(){
  if(tab==='system'){ sysCmd('next'); return; }
  if(PL.tracks.length) plLoad((PL.idx+1)%PL.tracks.length);
};
var pbar=qs('.progress-bar');
pbar.onclick=function(e){
  if(tab==='system'||!(audio.duration>0)) return;
  var r=pbar.getBoundingClientRect();
  audio.currentTime=(e.clientX-r.left)/r.width*audio.duration;
};
// вкладки: Локальная / Система
qsa('.player-header .tabs').forEach(function(t){
  if(t.textContent.trim()==='ЖДЁМ'){ t.remove(); return; }
  var name=t.textContent.trim();
  t.onclick=function(){
    qsa('.player-header .tabs').forEach(function(x){ if(x!==libTabBtn) x.classList.remove('active'); });
    t.classList.add('active');
    if(name==='Система'){
      audio.pause(); tab='system';
      qs('.player-art').textContent='🖥';
      sysStart();
    }else{
      tab='local'; clearInterval(sysTimer);
      qs('.player-art').textContent='♪';
      if(PL.idx>=0) qs('.player-info .title').textContent=PL.tracks[PL.idx].name;
    }
  };
});

// системный плеер (SMTC)
var sysTimer=null;
async function sysPoll(){
  try{
    var r=await fetch(AGENT+'/api/media',{cache:'no-store'});
    var j=await r.json();
    if(j.session){
      qs('.player-info .title').textContent=j.title||'—';
      qs('.player-info .subtitle').textContent=(j.artist||'')+(j.playing?' · играет':' · пауза');
      if(j.dur>0){
        qs('.progress-fill').style.width=(j.pos/j.dur*100)+'%';
        qs('.time-cur').textContent=fmt(j.pos);
        qs('.time-left').textContent='-'+fmt(j.dur-j.pos);
      }
      el('play').textContent=j.playing?'⏸':'▶';
      el('pfPlay').textContent=j.playing?'⏸':'▶';
    }else{
      qs('.player-info .title').textContent=j.media_ok?'Нет активного плеера':'SMTC недоступен';
      qs('.player-info .subtitle').textContent=j.media_ok?'открой музыку в любой программе':'запусти агента';
    }
  }catch(e){}
}
function sysStart(){ clearInterval(sysTimer); sysPoll(); sysTimer=setInterval(sysPoll,1000); }
function sysCmd(action){
  fetch(AGENT+'/api/media/cmd',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:action})}).then(function(){ sysPoll(); }).catch(function(){});
}

// ---------- полноэкранная библиотека NAS ----------
var LIB={data:[],loaded:false,ost:'',genre:'',artist:'',q:'',shown:300};
var libPage=document.createElement('div'); libPage.id='libPage';
libPage.innerHTML=
 '<div class="lp-head">'+
  '<span class="ttl">БИБЛИОТЕКА // NAS</span>'+
  '<span class="cnt" id="lpCount"></span>'+
  '<button class="lp-close" id="lpClose">✕</button>'+
 '</div>'+
 '<div class="lp-side">'+
  '<p class="lp-sec">Поиск</p>'+
  '<input class="lp-input" id="lpSearch" placeholder="название, исполнитель…">'+
  '<p class="lp-sec">Жанр</p>'+
  '<select class="lp-sel" id="lpGenre"><option value="">все жанры</option></select>'+
  '<p class="lp-sec">Исполнитель</p>'+
  '<select class="lp-sel" id="lpArtist"><option value="">все исполнители</option></select>'+
  '<button class="lp-more" id="lpRefresh">⟳ пересканировать</button>'+
  '<div class="lp-note" id="lpScan"></div>'+
 '</div>'+
 '<div class="lp-main">'+
  '<p class="lp-sec" id="lpOstTitle">Все треки</p>'+
  '<div id="lpList"></div>'+
  '<button class="lp-more" id="lpMore" style="display:none">Показать ещё 300</button>'+
 '</div>'+
 '<div class="lp-queue">'+
  '<p class="lp-sec">Сейчас играет</p>'+
  '<div class="lp-now" id="lpNow" style="display:none">'+
    '<div class="art">♪</div><div><div class="tt" id="lpNowT"></div><div class="ss" id="lpNowS"></div></div>'+
  '</div>'+
  '<p class="lp-sec">Очередь</p>'+
  '<div id="lpQueue"></div>'+
 '</div>';
document.body.appendChild(libPage);
var libTabBtn=document.createElement('button');
libTabBtn.className='tabs'; libTabBtn.textContent='Библиотека';
libTabBtn.onclick=function(){ openLibPage(); };
var playerHeader=qs('.player-header');
if(playerHeader) playerHeader.appendChild(libTabBtn);

function uniq(arr){
  var m={},out=[];
  arr.forEach(function(v){ if(v&&!m[v]){ m[v]=1; out.push(v); } });
  return out.sort(function(a,b){ return a.localeCompare(b,'ru'); });
}
function libGenres(tracks){
  var m={};
  tracks.forEach(function(t){
    (t.genre||'').split(/[,;|]+/).forEach(function(g){
      g=g.trim(); if(g) m[g]=1;
    });
  });
  return uniq(Object.keys(m));
}
function libFetch(){
  var list=el('lpList');
  list.innerHTML='<div class="trk" style="cursor:default;color:var(--muted)">Загружаю библиотеку NAS…</div>';
  fetch(AGENT+'/api/music/meta',{cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(j){
      LIB.data=(j&&j.tracks)?j.tracks:[];
      LIB.loaded=true;
      var sc=j&&j.scanning;
      el('lpScan').textContent=sc&&sc.pending>0
        ? 'Сканирую теги: осталось '+sc.pending+' из '+sc.total+' — список обновится сам'
        : '';
      if(sc&&sc.pending>0) setTimeout(libFetchSilent,5000);
      if(!LIB.data.length){
        list.innerHTML='<div class="trk" style="cursor:default;color:var(--muted)">'+
          esc((j&&j.err)||'Библиотека пуста — проверь music_dir в config.json')+'</div>';
        el('lpCount').textContent='';
        return;
      }
      libFill(el('lpGenre'),libGenres(LIB.data),'все жанры');
      libFill(el('lpArtist'),uniq(LIB.data.map(function(t){ return t.artist; })),'все исполнители');
      el('lpGenre').value=LIB.genre; el('lpArtist').value=LIB.artist;
      libRenderSide(); libRender();
    })
    .catch(function(){
      list.innerHTML='<div class="trk" style="cursor:default;color:var(--muted)">Агент не отвечает — запусти agent.py</div>';
    });
}
function libFetchSilent(){
  fetch(AGENT+'/api/music/meta',{cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(j){
      LIB.data=(j&&j.tracks)?j.tracks:[];
      var sc=j&&j.scanning;
      el('lpScan').textContent=sc&&sc.pending>0
        ? 'Сканирую теги: осталось '+sc.pending+' из '+sc.total
        : '';
      if(sc&&sc.pending>0) setTimeout(libFetchSilent,5000);
      else el('lpScan').textContent='';
      libFill(el('lpGenre'),libGenres(LIB.data),'все жанры');
      libFill(el('lpArtist'),uniq(LIB.data.map(function(t){ return t.artist; })),'все исполнители');
      el('lpGenre').value=LIB.genre; el('lpArtist').value=LIB.artist;
      libRender();
    }).catch(function(){});
}
function libFill(sel,values,allLabel){
  sel.innerHTML='<option value="">'+allLabel+'</option>'+
    values.map(function(v){ return '<option value="'+esc(v)+'">'+esc(v)+'</option>'; }).join('');
}
function libRenderSide(){
  var counts={};
  LIB.data.forEach(function(t){ counts[t.ost]=(counts[t.ost]||0)+1; });
  var osts=uniq(LIB.data.map(function(t){ return t.ost; }));
  el('lpCount').textContent='треков: '+LIB.data.length;
  libPage.querySelector('.lp-ost').innerHTML=osts.map(function(o){
    return '<button data-o="'+esc(o)+'"'+(LIB.ost===o?' class="act"':'')+'>'+
      '<span>'+esc(o)+'</span><span class="n">'+counts[o]+'</span></button>';
  }).join('');
  qsa('.lp-ost button',libPage).forEach(function(b){
    b.onclick=function(){
      LIB.ost=(LIB.ost===b.dataset.o)?'':b.dataset.o;
      libRenderSide(); libRender();
    };
  });
}
function libFiltered(){
  var q=LIB.q.toLowerCase();
  return LIB.data.filter(function(t){
    if(LIB.ost&&t.ost!==LIB.ost) return false;
    if(LIB.genre&&(t.genre||'').toLowerCase().indexOf(LIB.genre.toLowerCase())<0) return false;
    if(LIB.artist&&t.artist!==LIB.artist) return false;
    if(q&&((t.title||'')+' '+(t.artist||'')+' '+(t.album||'')).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
}
function libMarkActive(){
  var cur=(PL.idx>=0&&PL.tracks[PL.idx]&&PL.tracks[PL.idx].meta)?PL.tracks[PL.idx].meta.file:null;
  qsa('#lpList .trk').forEach(function(n){
    var i=+n.dataset.i;
    var f=libFilteredCache();
    n.classList.toggle('act',!!(f[i]&&f[i].file===cur));
  });
  qsa('#lpQueue .q-row').forEach(function(n){
    var i=+n.dataset.i;
    n.classList.toggle('act',i===PL.idx);
  });
  var now=el('lpNow');
  if(PL.idx>=0&&PL.tracks[PL.idx]){
    now.style.display='flex';
    el('lpNowT').textContent=PL.tracks[PL.idx].name;
    var m=PL.tracks[PL.idx].meta;
    el('lpNowS').textContent=m?((m.artist||'—')+(m.ost?' · '+m.ost:'')):'';
  }else now.style.display='none';
}
var _libFilteredCache=null;
function libFilteredCache(){ return _libFilteredCache||[]; }
function libRender(){
  var f=libFiltered();
  _libFilteredCache=f;
  LIB.shown=300;
  libRenderMain();
  var qbox=el('lpQueue');
  if(tab==='lib'&&PL.tracks.length){
    var n=Math.min(PL.tracks.length,QUEUE_MAX);
    var html='';
    for(var i=0;i<n;i++){
      html+='<div class="q-row'+(i===PL.idx?' act':'')+'" data-i="'+i+'">'+
        '<span class="i">'+(i+1)+'</span><span class="t">'+esc(PL.tracks[i].name)+'</span></div>';
    }
    if(PL.tracks.length>QUEUE_MAX) html+='<div class="lp-note">…и ещё '+(PL.tracks.length-QUEUE_MAX)+' в очереди</div>';
    qbox.innerHTML=html;
    qsa('.q-row',qbox).forEach(function(n2){
      n2.onclick=function(){ plLoad(+n2.dataset.i); };
    });
  }else{
    qbox.innerHTML='<div class="lp-note">Кликни трек слева — он станет очередью. «Дальше/назад» плеера листают именно отфильтрованный список.</div>';
  }
  libMarkActive();
}
function libRenderMain(){
  var f=_libFilteredCache||[];
  var list=el('lpList');
  if(!f.length){
    list.innerHTML='<div class="trk" style="cursor:default;color:var(--muted)">'+
      (LIB.data.length?'Ничего не найдено по фильтрам':'Библиотека пуста')+'</div>';
    el('lpOstTitle').textContent='Все треки';
    el('lpMore').style.display='none';
    return;
  }
  var n=Math.min(f.length,LIB.shown);
  var html='';
  for(var i=0;i<n;i++){
    var t=f[i];
    html+='<div class="trk" data-i="'+i+'">'+
      '<span class="t">'+esc(t.title||'—')+'</span>'+
      (t.artist?'<span class="a">'+esc(t.artist)+'</span>':'')+
      (t.album&&t.album!==t.ost?'<span class="al">'+esc(t.album)+'</span>':'')+
      (t.dur?'<span class="d">'+fmt(t.dur)+'</span>':'')+
      '</div>';
  }
  list.innerHTML=html;
  qsa('.trk[data-i]',list).forEach(function(node){
    node.onclick=function(){ libPlay(+node.dataset.i); };
  });
  el('lpOstTitle').textContent=LIB.ost?('OST · '+LIB.ost):'Все треки';
  var more=el('lpMore');
  if(f.length>LIB.shown){
    more.style.display='block';
    more.textContent='Показать ещё 300 (всего '+f.length+')';
  }else more.style.display='none';
}
function libPlay(i){
  var f=_libFilteredCache||[];
  if(!f.length) return;
  tab='lib';
  PL.tracks=f.map(function(t){
    return {name:t.title||t.file,url:AGENT+'/music/'+encodeURIComponent(t.file),meta:t};
  });
  PL.idx=i;
  audio.src=PL.tracks[i].url;
  var t=PL.tracks[i].meta;
  qs('.player-info .title').textContent=t.title||t.file;
  qs('.player-info .subtitle').textContent=
    (t.artist||'—')+(t.album?' · '+t.album:'')+(t.ost?' · '+t.ost:'');
  plRenderQueue();
  libRender();
  audio.play().catch(function(){});
}
function openLibPage(){
  libPage.classList.add('on');
  if(LIB.loaded) libRender(); else libFetch();
    libSetupFilters();
  libRenderTracks(libTracks);

}
function closeLibPage(){ libPage.classList.remove('on'); }
el('lpClose').onclick=closeLibPage;
el('lpSearch').addEventListener('input',function(e){ LIB.q=e.target.value; libRender(); });
el('lpGenre').addEventListener('change',function(e){ LIB.genre=e.target.value; libRender(); });
el('lpArtist').addEventListener('change',function(e){ LIB.artist=e.target.value; libRender(); });
el('lpMore').onclick=function(){ LIB.shown+=300; libRenderMain(); libMarkActive(); };
el('lpRefresh').onclick=function(){
  libFetch();
};

// ---------- локальная библиотека агента (ограниченная) ----------
(function localLibLoad(){
  fetch(AGENT+'/api/music',{cache:'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(j){
      if(!j.ok||!j.count) return;
      var files=j.tracks;
      if(files.length>1000) files=files.slice(0,1000);
      PL.tracks=files.map(function(n){
        return {name:cleanName(n.split(/[\\/]/).pop()),url:AGENT+'/music/'+encodeURIComponent(n)};
      });
      plRenderQueue();
      if(tab==='local'){
        qs('.player-info .title').textContent='Библиотека: '+j.count+' треков'+
          (files.length<j.count?' (в очереди первые '+files.length+')':'');
        qs('.player-info .subtitle').textContent='нажми ▶ или кликни трек в очереди · полный список — в Библиотеке';
      }
    })
    .catch(function(){ setTimeout(localLibLoad,5000); });
})();

// ---------- подвал ----------
var foot=el('foot');
if(foot) foot.innerHTML='TABLO · <code>Ctrl</code>+<code>K</code> — команды · <code>1</code>–<code>4</code> темы, <code>0</code> база';

// ---------- старт ----------
cpRenderRoster(); cpRenderCard(); cpCalc(); renderPlans(); renderClog(); renderTodo();
