/* 🎱 당구 연습장 — 화면 · 저장 · 훈련 흐름 (물리 계산은 physics.js)
 *
 * v1   판 CRUD · 클릭 선긋기 · 당점·속도 · 자동 저장 · 기록 · 휴지통 (3구로 잘못 알았다)
 * v2   🔒 **4구**(흰·노랑·빨강 ①②) · 중대 · 물리 시뮬레이션
 *      판 종류 — 🎱 자유 연습: 조준(첫 선)·당점·속도 → ▶ → 득점/실패/파울 판정
 *               📐 분리각 훈련: 두께·당점·속도 → ① 1적구 방향 ② 수구 방향 예측 → ▶ 정답 → 오차(°)
 *      아버지 목적: "이렇게 치면 맞느냐"를 확인 · 수구 분리각 · 1적구 · 원/투쿠션 흐름 훈련
 */
'use strict';
var APP_VER='3.0.0';   /* 🔒 index.html 의 data-ver · ?v= 와 같아야 한다 */
var SUPA_URL='https://ytkbrdgbklnijbwkvino.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0a2JyZGdia2xuaWpid2t2aW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjA0NTQsImV4cCI6MjEwMTk5NjQ1NH0.7ymaJsdADQ1RhodMMuJxV58nE9httVltWllKq1QmXQM';
var SB=window.supabase.createClient(SUPA_URL,SUPA_KEY);
var PH=window.BBPhys;

var S=100;                 /* 다이아 1칸 = 화면 단위 100 */
var W=8, H=4;              /* 가로 8칸 · 세로 4칸 */
var DM=0.28;               /* 중대: 다이아 1칸 = 0.28 m (안쪽 2.24 × 1.12 m) */
var BR=PH.DEF.R/DM;        /* 공 반지름(다이아) — 4구 공 65.5 mm = 0.117칸 */
var KEEP_DAYS=30;
var SPEEDS=['아주 약하게','약하게','보통','세게','아주 세게'];
var ALLB=['w','y','r','r2'];
var BCOL={w:'#fbfbf5',y:'#f5c400',r:'#d8231b',r2:'#d8231b'};
var BNAME={w:'흰 공',y:'노란 공',r:'빨간 공 ①',r2:'빨간 공 ②'};
var KINDS={free:{ic:'🎱',name:'자유 연습'},sep:{ic:'📐',name:'분리각 훈련'},cush:{ic:'🔁',name:'원·투쿠션 훈련'}};
/* v3: 🔁 원쿠션 판 · 🔁² 투쿠션 판 — 같은 kind(cush), 쿠션 수는 판마다 고정(draft.ncush) */
function kindIc(b){return b&&b.kind==='cush'?(b.draft&&b.draft.ncush===2?'🔁²':'🔁'):KINDS[(b&&b.kind)||'free'].ic;}
function kindName(b){return b&&b.kind==='cush'?(b.draft&&b.draft.ncush===2?'투쿠션 훈련':'원쿠션 훈련'):KINDS[(b&&b.kind)||'free'].name;}
/* ⚙ 테이블 감각 — 당구장마다 천·쿠션이 다르다. 표준(보통)에서 한 칸씩만 움직인다 */
var FEELS={cloth:{slow:{muR:0.013},mid:{muR:0.010},fast:{muR:0.0075}},
           cush:{weak:{eC:0.72},mid:{eC:0.78},strong:{eC:0.84}},
           spin:{weak:{muC:0.12},mid:{muC:0.18},strong:{muC:0.24}}};
var FEEL=(function(){try{return JSON.parse(localStorage.getItem('bb.feel'))||{};}catch(e){return {};}})();
function feelParams(){var o={};['cloth','cush','spin'].forEach(function(k){var v=FEELS[k][FEEL[k]]||FEELS[k].mid;for(var x in v)o[x]=v[x];});return o;}
var SIMC='#6a2bb0';        /* 시뮬레이션 색(보라) */

var USER=null, BOARDS=[], CUR=null, ST=null;
var MODE='ball', LAYER='predict', UNDO=[], REDO=[], SEL=null, HOVER=null, DRAG=null;
var GUIDE=pref('guide')||'cross';
var STEP=pref('step')==='0.5'?0.5:1;   /* 쿠션 눈금 간격(수치 단위) */
var SLOW=pref('slow')==='1';
var SIMV=null, RAF=0;                   /* 시뮬레이션 보기 상태 */
var saveTimer=null, saveBusy=false, saveAgain=false, lastSaved=null;
var LOGVIEW='att', LOGBOARD='', ATTS=[], EVTS=[];

/* ═════════ 작은 도구 ═════════ */
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function clone(o){return JSON.parse(JSON.stringify(o));}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function r2(v){return Math.round(v*100)/100;}
function pref(k,v){try{if(v===undefined)return localStorage.getItem('bb.'+k);localStorage.setItem('bb.'+k,v);}catch(e){return null;}}
function isBB(u){return !!(u&&u.app_metadata&&u.app_metadata.app==='billiards');}
function fmtTime(d){d=new Date(d);var h=d.getHours(),m=d.getMinutes();return (h<12?'오전 ':'오후 ')+((h%12)||12)+':'+(m<10?'0':'')+m;}
function fmtDate(d){d=new Date(d);return (d.getMonth()+1)+'월 '+d.getDate()+'일 ('+'일월화수목금토'[d.getDay()]+')';}
function fmtDT(d){return fmtDate(d)+' '+fmtTime(d);}
function deg(a){return a*180/Math.PI;}
function normA(a){while(a>180)a-=360;while(a<-180)a+=360;return a;}

/* 초구 기본 배치(4구) — 빨강 ①은 풋 스팟, ②는 센터, 흰·노랑은 헤드 쪽 */
function defaultBalls(){return {w:{x:2,y:3},y:{x:2,y:1},r:{x:6,y:2},r2:{x:4,y:2},cue:'w'};}
function emptyDraft(){return {predict:[],actual:[],tip:null,speed:3,kmh:null,memo:'',thick:4,side:'L',predObj:null,predCue:null,
  ctype:'first',ncush:1,cpts:[]};}   /* 🔁 ctype: first = 쿠션 먼저(빈쿠션) · after = 1적구 뒤 쿠션 · cpts = 아버지가 찍은 쿠션 지점 */
function normBoard(b){
  var d=defaultBalls(),bl=b.balls||{};
  b.balls={w:bl.w||d.w,y:bl.y||d.y,r:bl.r||d.r,r2:bl.r2||d.r2,cue:bl.cue==='y'?'y':'w'};
  var e=emptyDraft(),dr=b.draft||{};
  Object.keys(e).forEach(function(k){if(dr[k]===undefined)dr[k]=e[k];});
  b.draft=dr;b.kind=KINDS[b.kind]?b.kind:'free';return b;
}
function curBoard(){for(var i=0;i<BOARDS.length;i++)if(BOARDS[i].id===CUR)return BOARDS[i];return null;}
function kind(){var b=curBoard();return b?b.kind:'free';}
function opp(){return ST.balls.cue==='w'?'y':'w';}
function cushAfter(){return kind()==='cush'&&ST.draft.ctype==='after';}
/* 분리각 = 수구·1적구 · 쿠션 먼저 = 수구·목표(빨강 ①) · 1적구 뒤 쿠션 = 수구·빨강 ①·② · 자유 = 넷 */
function liveBalls(){var K=kind();
  if(K==='sep'||(K==='cush'&&!cushAfter()))return [ST.balls.cue,'r'];
  if(K==='cush')return [ST.balls.cue,'r','r2'];
  return ALLB;}

/* ═════════ 알림 · 모달 ═════════ */
var toastT=null;
function toast(msg){var t=$('toast');t.textContent=msg;t.classList.remove('hide');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.add('hide');},2800);}
/* modal({title, body, html, input, wide, buttons:[{label,value,cls}]}) → Promise({value,text}) · Esc = 취소 */
function modal(o){
  return new Promise(function(res){
    var m=$('mask');
    var btns=o.buttons||[{label:'확인',value:true,cls:'primary'}];
    m.innerHTML='<div class="modal'+(o.wide?' wide':'')+'" role="dialog" aria-modal="true"><h2>'+esc(o.title||'')+'</h2>'+
      (o.html!=null?'<div class="body">'+o.html+'</div>':(o.body?'<div class="body">'+esc(o.body)+'</div>':''))+
      (o.input?'<input type="'+(o.input.type||'text')+'" id="mIn" maxlength="'+(o.input.max||40)+'" autocomplete="'+(o.input.ac||'off')+'" value="'+esc(o.input.value||'')+'" placeholder="'+esc(o.input.placeholder||'')+'">':'')+
      (o.input2?'<input type="'+(o.input2.type||'text')+'" id="mIn2" placeholder="'+esc(o.input2.placeholder||'')+'" autocomplete="'+(o.input2.ac||'off')+'">':'')+
      '<div class="btns">'+btns.map(function(b,i){return '<button data-i="'+i+'" class="'+(b.cls||'')+'">'+b.label+'</button>';}).join('')+'</div></div>';
    m.classList.remove('hide');
    var inp=$('mIn');
    function done(v){
      var t=inp?inp.value:null,t2=$('mIn2')?$('mIn2').value:null;
      m.classList.add('hide');m.innerHTML='';document.removeEventListener('keydown',key,true);res({value:v,text:t,text2:t2});
    }
    function key(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(null);}
      else if(e.key==='Enter'&&(e.target.tagName==='INPUT')){e.preventDefault();e.stopPropagation();
        var p=btns.filter(function(b){return /primary|danger/.test(b.cls||'');})[0]||btns[0];done(p.value);}
    }
    document.addEventListener('keydown',key,true);
    m.querySelectorAll('.btns button').forEach(function(b){b.addEventListener('click',function(){done(btns[+b.dataset.i].value);});});
    m.onclick=function(e){if(e.target===m&&!o.sticky)done(null);};
    if(o.onOpen)o.onOpen(m,done);
    setTimeout(function(){if(inp&&!o.noFocus){inp.focus();inp.select();}else{var f=m.querySelector('.btns button.primary')||m.querySelector('.btns button');if(f)f.focus();}},30);
  });
}
function confirmBox(title,body,okLabel,danger){
  return modal({title:title,body:body,buttons:[{label:'아니오',value:false},{label:okLabel||'예',value:true,cls:danger?'danger':'primary'}]}).then(function(r){return r.value===true;});
}

/* ═════════ 로그인 ═════════ */
function loginMsg(err){
  var m=(err&&err.message)||String(err||'');
  if(/Invalid login credentials/i.test(m))return '아이디(이메일) 또는 비밀번호가 맞지 않습니다. 다시 확인해 주세요.';
  if(/Email not confirmed/i.test(m))return '아직 인증되지 않은 계정입니다. 로한에게 말씀해 주세요.';
  if(/fetch|network|Failed/i.test(m))return '인터넷 연결을 확인해 주세요.';
  if(/rate|too many/i.test(m))return '잠시 후에 다시 시도해 주세요.';
  return '로그인하지 못했습니다. ('+m+')';
}
function showLogin(msg){$('boot').classList.add('hide');$('app').classList.add('hide');$('login').classList.remove('hide');$('loginErr').textContent=msg||'';setTimeout(function(){$('email').focus();},30);}
function doLogin(){
  var email=$('email').value.trim(),pw=$('pw').value;
  if(!email||!pw){$('loginErr').textContent='아이디와 비밀번호를 모두 넣어 주세요.';return;}
  $('loginErr').textContent='로그인 중입니다…';$('loginBtn').disabled=true;
  SB.auth.signInWithPassword({email:email,password:pw}).then(function(r){
    $('loginBtn').disabled=false;
    if(r.error){$('loginErr').textContent=loginMsg(r.error);return;}
    enter(r.data.user);
  },function(e){$('loginBtn').disabled=false;$('loginErr').textContent=loginMsg(e);});
}
/* 🔒 문지기 — billiards 표식이 없는 계정(로한)은 들이지 않는다 */
function enter(u){
  if(!isBB(u)){USER=null;SB.auth.signOut();showLogin('이 계정은 당구 연습장 계정이 아닙니다.');return;}
  USER=u;$('pw').value='';
  /* 🔒 앱은 판을 불러와 그린 뒤에 보인다(reveal). 먼저 보이면 판 종류가 정해지기 전이라 모든 도구가 한꺼번에 보였다가 바뀌었다 */
  $('login').classList.add('hide');$('boot').classList.remove('hide');
  loadBoards();
}

/* ═════════ DB ═════════ */
function logEvent(kind,boardId,payload){
  SB.from('bb_events').insert({kind:kind,board_id:boardId||null,payload:payload||null}).then(function(){},function(){});
}
function purgeOld(){
  var cut=new Date(Date.now()-KEEP_DAYS*864e5).toISOString();
  SB.from('bb_attempts').delete().lt('deleted_at',cut).then(function(){},function(){});
  SB.from('bb_boards').delete().lt('deleted_at',cut).then(function(){},function(){});
}
function loadBoards(){
  setSave('불러오는 중…');
  SB.from('bb_boards').select('*').is('deleted_at',null).order('sort',{ascending:true}).order('created_at',{ascending:true}).then(function(r){
    if(r.error){reveal();setSave('⚠ 불러오지 못했습니다 — 새로고침(F5) 해 주세요',true);return;}
    BOARDS=(r.data||[]).map(normBoard);
    purgeOld();
    setSave('');   /* 🔒 첫 실행(판 0개)에서 '불러오는 중…' 이 그대로 남았다 */
    if(!BOARDS.length){createBoard('판 1',defaultBalls(),emptyDraft(),true,null,'free');return;}
    var last=pref('board');
    switchBoard(BOARDS.some(function(b){return b.id===last;})?last:BOARDS[0].id);
  });
}
function createBoard(name,balls,draft,silent,from,kd){
  var sort=BOARDS.reduce(function(m,b){return Math.max(m,b.sort||0);},0)+1;
  return SB.from('bb_boards').insert({name:name,balls:balls,draft:draft,sort:sort,kind:kd||'free'}).select().single().then(function(r){
    if(r.error||!r.data){reveal();toast('⚠ 새 판을 만들지 못했습니다');return;}
    var b=normBoard(r.data);BOARDS.push(b);
    logEvent(from?'board.copy':'board.create',b.id,from?{from:from,name:name}:{name:name,kind:b.kind});
    MODE=b.kind==='sep'?'pobj':b.kind==='cush'?'cpt':'ball';
    switchBoard(b.id);
    if(!silent)toast(from?'‘'+name+'’(으)로 복제했습니다':kindIc(b)+' 새 판 ‘'+name+'’을 만들었습니다');
  });
}
function setSave(t,bad){var s=$('saveSt');s.textContent=t;s.classList.toggle('bad',!!bad);}
/* 자동 저장 — 손을 뗀 뒤 0.7초 */
function saveSoon(){
  var b=curBoard();if(!b)return;
  b.balls=ST.balls;b.draft=ST.draft;
  setSave('저장 중…');
  clearTimeout(saveTimer);saveTimer=setTimeout(flush,700);
}
function flush(){
  clearTimeout(saveTimer);saveTimer=null;
  var b=curBoard();if(!b)return Promise.resolve();
  if(saveBusy){saveAgain=true;return Promise.resolve();}
  saveBusy=true;
  var id=b.id;
  return SB.from('bb_boards').update({balls:b.balls,draft:b.draft}).eq('id',id).then(function(r){
    saveBusy=false;
    if(r&&r.error){setSave('⚠ 저장하지 못했습니다 — 인터넷을 확인해 주세요',true);saveTimer=setTimeout(flush,5000);return;}
    lastSaved=new Date();setSave('✓ 저장됨 '+fmtTime(lastSaved));
    if(saveAgain){saveAgain=false;flush();}
  },function(){saveBusy=false;setSave('⚠ 저장하지 못했습니다 — 인터넷을 확인해 주세요',true);saveTimer=setTimeout(flush,5000);});
}
window.addEventListener('beforeunload',function(e){if(saveTimer){flush();e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&saveTimer)flush();});

/* ═════════ 판 CRUD ═════════ */
function switchBoard(id){
  if(saveTimer)flush();
  clearSim();QTOKEN++;
  if(SET&&SET.board!==id){SET=null;toast('판을 바꿔서 10문제 풀기를 멈췄습니다');}
  CUR=id;pref('board',id);
  var b=curBoard();ST={balls:clone(b.balls),draft:clone(b.draft)};
  UNDO=[];REDO=[];SEL=null;HOVER=null;DRAG=null;
  var OK={sep:{ball:1,pobj:1,pcue:1},free:{ball:1,draw:1,edit:1},cush:{ball:1,cpt:1}},FIRST={sep:'pobj',free:'ball',cush:'cpt'};
  if(!OK[b.kind][MODE])MODE=FIRST[b.kind];
  if(MODE==='draw'&&!ST.draft[LAYER].length)MODE='ball';
  hidePop();renderAll();reveal();
}
/* 첫 판을 그릴 준비가 됐을 때 한 번 — 불러오는 중 화면을 걷고 앱을 보인다 */
function reveal(){
  $('boot').classList.add('hide');   /* 🔒 앱이 이미 보여도 늘 걷는다(두 번째 호출에 남아 있었다) */
  if(!$('app').classList.contains('hide'))return;
  $('app').classList.remove('hide');
  if(ST)renderAll();   /* 숨긴 채로는 당구대 크기를 몰라 못 그린다 — 보인 뒤 다시 */
}
function newBoard(){
  var pick='free';
  var html='<p>어떤 판을 만들까요?</p><div class="kindpick">'+
    '<button type="button" data-kind="free" class="on"><b>🎱 자유 연습</b><span>공 4개를 놓고 조준·당점·속도로 쳐 본다. 두 빨간 공을 맞히는지 판정</span></button>'+
    '<button type="button" data-kind="sep"><b>📐 분리각 훈련</b><span>두께를 정하고 1적구·수구가 갈 방향을 먼저 예측 → 정답과 각도 비교</span></button>'+
    '<button type="button" data-kind="cush1"><b>🔁 원쿠션 훈련</b><span>1적구를 맞히고 쿠션 한 번 → 2적구. 어디를 맞아야 하는지·두께를 찾는다</span></button>'+
    '<button type="button" data-kind="cush2"><b>🔁² 투쿠션 훈련</b><span>1적구 → 쿠션 두 번 → 2적구. 두 쿠션 지점과 두께를 찾는다</span></button></div>'+
    '<p style="margin:.9rem 0 .3rem;font-weight:700">판 이름</p>';
  modal({title:'＋ 새 판 만들기',html:html,input:{value:'판 '+(BOARDS.length+1),max:30},noFocus:true,
    buttons:[{label:'취소',value:null},{label:'만들기',value:'ok',cls:'primary'}],
    onOpen:function(m){m.querySelectorAll('[data-kind]').forEach(function(x){x.addEventListener('click',function(){
      pick=x.dataset.kind;m.querySelectorAll('[data-kind]').forEach(function(y){y.classList.toggle('on',y===x);});
      var inp=$('mIn');if(/^(판|분리각|쿠션|원쿠션|투쿠션) \d+$/.test(inp.value))inp.value=({sep:'분리각 ',cush1:'원쿠션 ',cush2:'투쿠션 '}[pick]||'판 ')+(BOARDS.length+1);});});}
  }).then(function(r){
    if(r.value!=='ok')return;var n=(r.text||'').trim()||('판 '+(BOARDS.length+1));
    var dr=emptyDraft(),kd=pick;
    if(pick==='cush1'||pick==='cush2'){kd='cush';dr.ncush=pick==='cush2'?2:1;dr.ctype='after';}   /* 주 훈련 = 1적구 뒤 쿠션 */
    createBoard(n,defaultBalls(),dr,false,null,kd);
  });
}
function renameBoard(){
  var b=curBoard();if(!b)return;
  modal({title:'✏️ 이름 바꾸기',input:{value:b.name,max:30},buttons:[{label:'취소',value:null},{label:'바꾸기',value:'ok',cls:'primary'}]}).then(function(r){
    if(r.value!=='ok')return;var n=(r.text||'').trim();if(!n||n===b.name)return;
    var old=b.name;b.name=n;renderTabs();
    SB.from('bb_boards').update({name:n}).eq('id',b.id).then(function(x){
      if(x&&x.error){b.name=old;renderTabs();toast('⚠ 이름을 바꾸지 못했습니다');return;}
      logEvent('board.rename',b.id,{from:old,to:n});toast('이름을 ‘'+n+'’(으)로 바꿨습니다');
    });
  });
}
function copyBoard(){
  var b=curBoard();if(!b)return;
  if(saveTimer)flush();
  createBoard(b.name+' (복사)',clone(ST.balls),clone(ST.draft),false,b.name,b.kind);
}
function deleteBoard(){
  var b=curBoard();if(!b)return;
  confirmBox('🗑 이 판을 지울까요?','‘'+b.name+'’을 휴지통으로 옮깁니다. '+KEEP_DAYS+'일 안에는 휴지통에서 다시 살릴 수 있습니다.','지우기',true).then(function(ok){
    if(!ok)return;
    if(saveTimer)flush();
    SB.from('bb_boards').update({deleted_at:new Date().toISOString()}).eq('id',b.id).then(function(x){
      if(x&&x.error){toast('⚠ 지우지 못했습니다');return;}
      logEvent('board.delete',b.id,{name:b.name});
      var i=BOARDS.indexOf(b);BOARDS.splice(i,1);
      toast('‘'+b.name+'’을 휴지통으로 옮겼습니다');
      if(!BOARDS.length){createBoard('판 1',defaultBalls(),emptyDraft(),true,null,'free');return;}
      switchBoard(BOARDS[Math.min(i,BOARDS.length-1)].id);
    });
  });
}
function boardList(){
  modal({title:'📂 판 목록 ('+BOARDS.length+'개)',wide:false,
    html:'<div class="list">'+BOARDS.map(function(b){
      return '<div class="litem'+(b.id===CUR?' on':'')+'"><span class="grow"><b>'+kindIc(b)+' '+esc(b.name)+'</b> <small>'+kindName(b)+'</small></span><button data-go="'+b.id+'" class="'+(b.id===CUR?'':'primary')+'">'+(b.id===CUR?'지금 보는 판':'이 판 열기')+'</button></div>';
    }).join('')+'</div>',
    buttons:[{label:'닫기',value:null}],
    onOpen:function(m,done){m.querySelectorAll('[data-go]').forEach(function(x){x.addEventListener('click',function(){
      var id=x.dataset.go;done(null);if(id!==CUR)switchBoard(id);});});}
  });
}

/* ═════════ 되돌리기 ═════════ */
function snap(){return JSON.stringify({balls:ST.balls,draft:ST.draft});}
/* 🔒 무언가 바뀌면 시뮬레이션 결과는 낡는다 — 바꾸기 직전(pushUndo)에서 지운다 */
function pushUndo(){clearSim();UNDO.push(snap());if(UNDO.length>150)UNDO.shift();REDO=[];}
function restore(s){var o=JSON.parse(s);ST.balls=o.balls;ST.draft=o.draft;SEL=null;hidePop();clearSim();}
function undo(){if(!UNDO.length)return;REDO.push(snap());restore(UNDO.pop());saveSoon();renderAll();}
function redo(){if(!REDO.length)return;UNDO.push(snap());restore(REDO.pop());saveSoon();renderAll();}

/* ═════════ 좌표 ═════════ */
function svg(){return $('tbl');}
function pxK(){var m=svg().getScreenCTM();return m&&m.a?1/m.a:1;}         /* 화면 1px = 몇 단위 */
function evPt(e){var s=svg(),p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;var m=s.getScreenCTM();if(!m)return {x:0,y:0};p=p.matrixTransform(m.inverse());return {x:p.x/S,y:p.y/S};}
function ballAt(k){return ST.balls[k];}
function resolve(p){
  if(p.ref==='cue')return ballAt(ST.balls.cue);
  if(p.ref&&ST.balls[p.ref])return ballAt(p.ref);
  return p;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
/* 🧲 자석 — 쿠션 근처면 쿠션 **위로만** 붙이고 위치는 자유(수치 1 단위 = 0.1칸), 나머지는 완전 자유.
   🔒 v1.2 로한: "당구가 5 단위로 움직이는 게 아니다. 0~80 아무 곳이나 찍혀야지" — 처음엔 0.5칸(=5) 눈금에 붙였다.
      1 단위 = 약 2.8cm · 32인치 화면 약 17px 라 계단처럼 안 느껴지고, 숫자는 32·33 처럼 깔끔하게 읽힌다
   🔒 v2.4 로한: "공 근처로 가면 공 가운데로 붙어 버린다 — 상관없어야 하는 거 아냐?" — 공 자석을 뺐다.
      4구는 두께가 핵심인데, 공 중심에 붙으면 조준이 늘 정면(8/8)으로 강제된다 */
function snapPt(p){
  var k=pxK()/S, band=Math.max(0.4,30*k);
  var nx=p.x<band?0:(p.x>W-band?W:null), ny=p.y<band?0:(p.y>H-band?H:null);
  if(nx!==null||ny!==null){
    var q=STEP/10;                               /* 1 단위 = 0.1칸 · 0.5 단위 = 0.05칸 */
    return {x:nx!==null?nx:clamp(r2(Math.round(p.x/q)*q),0,W), y:ny!==null?ny:clamp(r2(Math.round(p.y/q)*q),0,H), rail:true};
  }
  return {x:clamp(r2(p.x),0,W),y:clamp(r2(p.y),0,H)};
}
/* 쿠션 지점의 다이아 수치 — 장쿠션은 가로 ×10, 단쿠션은 세로 ×10 */
function railVal(p){
  if(!p.rail)return null;
  /* 0.5 단위까지 읽는다 — 1 단위로 찍은 점은 32, 0.5 단위로 찍은 점은 32.5 */
  if(p.y===0||p.y===H)return Math.round(p.x*20)/2;
  if(p.x===0||p.x===W)return Math.round(p.y*20)/2;
  return null;
}
function railSeq(path){return path.map(railVal).filter(function(v){return v!==null;});}

/* ═════════ 쿠션 · 무회전 시스템(거울 원리) ═════════
   공 중심은 쿠션에서 반지름만큼 안쪽 선(중심선) 위에서 튕긴다. 거울 원리는 이 중심선으로 계산한다.
   원쿠션: 목표를 쿠션 너머로 뒤집은 점을 겨냥하면 그 선이 쿠션과 만나는 곳이 맞힐 지점.
   투쿠션: 두 번째 쿠션으로 뒤집고, 그걸 다시 첫 쿠션으로 뒤집어 겨냥. */
function railId(p){if(!p||!p.rail)return null;if(p.y===0)return 'T';if(p.y===H)return 'B';if(p.x===0)return 'L';if(p.x===W)return 'R';return null;}
function toCenter(p){var r=railId(p);return r==='T'?{x:p.x,y:BR}:r==='B'?{x:p.x,y:H-BR}:r==='L'?{x:BR,y:p.y}:{x:W-BR,y:p.y};}
function toRail(q,r){return r==='T'?{x:q.x,y:0}:r==='B'?{x:q.x,y:H}:r==='L'?{x:0,y:q.y}:{x:W,y:q.y};}
function mirror(p,r){return r==='T'?{x:p.x,y:2*BR-p.y}:r==='B'?{x:p.x,y:2*(H-BR)-p.y}:r==='L'?{x:2*BR-p.x,y:p.y}:{x:2*(W-BR)-p.x,y:p.y};}
function hitRail(a,b,r){
  var t;
  if(r==='T'||r==='B'){var y=r==='T'?BR:H-BR;if(b.y===a.y)return null;t=(y-a.y)/(b.y-a.y);}
  else{var x=r==='L'?BR:W-BR;if(b.x===a.x)return null;t=(x-a.x)/(b.x-a.x);}
  if(t<=1e-6)return null;
  var q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  if(q.x<-1e-6||q.x>W+1e-6||q.y<-1e-6||q.y>H+1e-6)return null;
  return q;
}
/* 출발점 S → 쿠션들(rails) → 목표 Tg 의 무회전 경로 [S, P1, (P2), Tg] (중심선 좌표) · 안 되면 null */
function sysPath(S,Tg,rails){
  if(rails.length===1){var P=hitRail(S,mirror(Tg,rails[0]),rails[0]);return P?[S,P,Tg]:null;}
  if(rails[0]===rails[1])return null;
  var T1=mirror(Tg,rails[1]),T2=mirror(T1,rails[0]);
  var P1=hitRail(S,T2,rails[0]);if(!P1)return null;
  var P2=hitRail(P1,T1,rails[1]);if(!P2)return null;
  return [S,P1,P2,Tg];
}
/* 중심선 위 점 → 쿠션 수치(0.5 단위) */
function cval(q,r){return Math.round((r==='T'||r==='B'?q.x:q.y)*20)/2;}
/* 가장 가까운 쿠션 위로 붙인다(쿠션 지점 찍기 — 공 자석 없음) */
function snapRail(p){
  var dT=p.y,dB=H-p.y,dL=p.x,dR=W-p.x,m=Math.min(dT,dB,dL,dR),q=STEP/10;
  var along=function(v,max){return clamp(r2(Math.round(v/q)*q),0,max);};
  if(m===dT)return {x:along(p.x,W),y:0,rail:true};
  if(m===dB)return {x:along(p.x,W),y:H,rail:true};
  if(m===dL)return {x:0,y:along(p.y,H),rail:true};
  return {x:W,y:along(p.y,H),rail:true};
}

/* ═════════ 조준 · 두께 ═════════ */
/* 두께(0~1)를 1/8 단위 글자로 — 8/8 = 정면(풀), 4/8 = 반 */
/* v2.2: 반 칸(1/16)까지 — 맞는 범위를 1/16 로 훑으니 4.5/8 같은 값이 나온다 */
function thickTxt(t){var e=clamp(Math.round(t*16)/2,0.5,8);return e===8?'8/8 (정면)':e===4?'4/8 (반)':e+'/8';}
/* 수구에서 dir 로 쐈을 때 처음 맞는 공 · 두께 · 맞는 순간 수구 자리(고스트) */
function rayHit(c,dir){
  var best=null;
  liveBalls().forEach(function(n){
    if(n===ST.balls.cue)return;var o=ST.balls[n];
    var rx=o.x-c.x, ry=o.y-c.y, along=rx*dir.x+ry*dir.y;if(along<=0)return;
    var cr=dir.x*ry-dir.y*rx, off=Math.abs(cr);if(off>=2*BR)return;
    var t=along-Math.sqrt(4*BR*BR-off*off);
    /* cr>0: 공이 조준선 오른쪽 → 공의 왼쪽을 맞힌다 */
    if(!best||t<best.t)best={ball:n,t:t,thick:1-off/(2*BR),side:cr>0?'L':'R',ghost:{x:c.x+dir.x*t,y:c.y+dir.y*t}};
  });
  return best;
}
/* 분리각 훈련 — 두께(1~8/8)·좌우 → 조준 방향 */
function sepAim(){var d=ST.draft;return aimAt('r',d.thick/8,d.side);}
/* 수구 → 공 target 을 두께 t(0~1)·좌우로 맞히는 조준 방향 */
function aimAt(target,t,side){
  var c=ST.balls[ST.balls.cue], o=ST.balls[target];
  var dx=o.x-c.x, dy=o.y-c.y, L=Math.hypot(dx,dy);
  var off=(1-t)*2*BR;if(L<=off+1e-6)return null;
  var th=Math.asin(off/L)*(side==='L'?-1:1), ux=dx/L, uy=dy/L, rx=-uy, ry=ux;
  return {x:Math.cos(th)*ux+Math.sin(th)*rx, y:Math.cos(th)*uy+Math.sin(th)*ry};
}
function aimInfo(){
  var c=ST.balls[ST.balls.cue], dir=null, K=kind();
  if(K==='sep'||cushAfter())dir=sepAim();
  else if(K==='cush'){var cp=ST.draft.cpts[0];if(cp){var q0=toCenter(cp);dir={x:q0.x-c.x,y:q0.y-c.y};}}   /* 쿠션 먼저: 찍은 첫 쿠션 지점으로 친다 */
  else{var p=ST.draft.predict;if(p.length>=2){var q=resolve(p[1]);dir={x:q.x-c.x,y:q.y-c.y};}}
  if(!dir)return null;var L=Math.hypot(dir.x,dir.y);if(L<1e-6)return null;
  dir={x:dir.x/L,y:dir.y/L};
  return {dir:dir,contact:rayHit(c,dir)};
}
function aimText(){
  var ai=aimInfo(),K=kind(),d=ST.draft;
  if(K==='cush'&&!cushAfter()){
    if(!d.cpts.length)return '📍 수구가 맞힐 쿠션 지점을 찍어 주세요'+(d.ncush===2?' (2개)':'');
    return '조준: 쿠션 '+d.cpts.map(railVal).join(' → ')+' → 목표 '+BNAME.r+(d.cpts.length<d.ncush?' · 1개 더 찍어 주세요':'');
  }
  if(!ai)return K==='sep'||K==='cush'?'수구와 1적구가 너무 가깝습니다':'조준선(예측선의 첫 선)을 그어 주세요';
  var c=ai.contact;
  if(!c)return '첫 공 없음 — 쿠션을 먼저 맞힙니다';
  return '첫 공: '+BNAME[c.ball]+' · 두께 '+thickTxt(c.thick)+' ('+(c.side==='L'?'왼쪽':'오른쪽')+')';
}

/* ═════════ 시뮬레이션 ═════════ */
function speedMs(){var d=ST.draft;return d.kmh!=null&&d.kmh>0?d.kmh/3.6:PH.SPEED[(d.speed||3)-1];}
function simWith(ai,V,stopWhen){
  var balls={};liveBalls().forEach(function(n){var b=ST.balls[n];balls[n]={x:b.x*DM,y:b.y*DM};});
  return PH.simulate({balls:balls,cue:ST.balls.cue,dir:ai.dir,V:V,tip:ST.draft.tip||{x:0,y:0},params:feelParams(),stopWhen:stopWhen});
}
function judge(res,ai){var K=kind();return K==='sep'?judgeSep(res,ai):K==='cush'?judgeCush(res,ai):judgeFree(res,ai);}
function computeSim(){
  var ai=aimInfo();if(!ai)return null;
  var res=simWith(ai,speedMs());
  return {res:res,ai:ai,info:judge(res,ai),ids:liveBalls(),t:0,T:res.frames[res.frames.length-1].t,playing:false};
}
/* 🔁 원·투쿠션 판정
   쿠션 먼저: 수구 → 쿠션 N번 → 빨강 ① · 비교 = 아버지가 찍은 지점 vs 무회전 계산(거울)
   1적구 뒤: 수구 → 빨강 ① → 쿠션 N번 → 빨강 ② · 비교 = 아버지 예측 vs 시뮬레이션에서 수구가 실제 닿은 지점
             + 빨강 ②까지 가려면 필요한 지점(무회전 계산) */
function judgeCush(res,ai){
  var d=ST.draft,cue=ST.balls.cue,E=res.events,N=d.ncush,first=d.ctype!=='after',target=first?'r':'r2',i=0;
  var S=first?ST.balls[cue]:(ai.contact?ai.contact.ghost:null);
  if(!first){
    for(;i<E.length;i++){var e=E[i];if(e.type==='ball'&&((e.a===cue&&e.b==='r')||(e.b===cue&&e.a==='r')))break;}
    if(i>=E.length)return {kind:'cush',none:true,result:'miss',text:'❌ 1적구(빨간 공 ①)를 맞히지 못했습니다'};
    i++;
  }
  var cps=[],hit=false;
  for(;i<E.length;i++){var e2=E[i];
    if(e2.type==='cushion'&&e2.ball===cue)cps.push(e2);
    else if(e2.type==='ball'&&(e2.a===cue||e2.b===cue)&&(e2.a===target||e2.b===target)){hit=true;break;}
  }
  var act=cps.slice(0,N).map(function(e){return {r:e.side,v:cval({x:e.x/DM,y:e.y/DM},e.side)};});
  var dad=d.cpts.map(function(p){return {r:railId(p),v:railVal(p)};});
  var rails=dad.length===N?dad.map(function(x){return x.r;}):act.length===N?act.map(function(x){return x.r;}):null;
  var sp=rails&&S?sysPath(S,ST.balls[target],rails):null;
  var sys=sp?sp.slice(1,1+N).map(function(q,k){return {r:rails[k],v:cval(q,rails[k])};}):null;
  var ok=hit&&cps.length===N, miss=hit?null:nearMiss(res,cue,target);
  var err=dad.map(function(x,k){var ref=first?(sys&&sys[k]):act[k];return ref&&ref.r===x.r?Math.abs(x.v-ref.v):null;});
  /* 🔒 쿠션 이름을 늘 붙인다 — "예측 70 · 실제 7" 은 위 쿠션 70 과 오른쪽 쿠션 7 이었다(v2.1 화면 확인) */
  var RN={T:'위',B:'아래',L:'왼쪽',R:'오른쪽'};
  var nm=N===1?'원쿠션':'투쿠션', V=function(a){return a.map(function(x){return RN[x.r]+' '+x.v;}).join(' → ');};
  var out=ok?'⭕ '+nm+'으로 '+BNAME[target]+' 맞음':hit?'△ '+BNAME[target]+' 맞았지만 쿠션 '+cps.length+'번':'❌ '+BNAME[target]+'와 '+missTxt(miss)+' 차이';
  var errT=err.some(function(x){return x!=null;})?' ('+err.map(function(x){return x==null?'다른 쿠션':x;}).join(', ')+' 차이)':
           dad.length&&(first?sys:act.length)?' (다른 쿠션)':'';
  var txt;
  if(first)txt='📍 아버지 '+(dad.length?V(dad):'—')+(sys?' · 무회전 계산 '+V(sys)+errT:' · 무회전 계산 불가(쿠션 조합)')+' · '+out;
  else txt='📍 수구 쿠션: 예측 '+(dad.length?V(dad):'—')+' · 실제 '+(act.length?V(act):'—')+errT+
    (sys?' · 빨강 ②까지 필요한 지점 '+V(sys):'')+' · '+out;
  return {kind:'cush',ctype:first?'first':'after',n:N,dad:dad.map(function(x){return x.v;}),sys:sys?sys.map(function(x){return x.v;}):null,
    act:act.map(function(x){return x.v;}),actR:act.map(function(x){return x.r;}),ncus:cps.length,err:err,result:ok?'hit':'miss',missCm:miss,text:txt,
    sysPath:sp?sp.map(function(q){return [r2(q.x),r2(q.y)];}):null,rails:rails,thick:d.thick,side:d.side};
}
/* ═════════ 🎯 맞는 범위 찾기 (v2.2) ═════════
   아버지: "이렇게 치면 맞느냐" — 한 번 쳐 보는 대신, 지금 당점·속도로 조준을 촘촘히 돌려 **맞는 구간**을 보여 준다.
   🎱 자유 연습   : 빨강 ①·② 각각 첫 공으로, 두께 1/16 씩 (왼쪽 얇게 → 정면 → 오른쪽 얇게)
   🔁 쿠션 먼저   : 찍은 첫 쿠션 위에서 지점을 0.5 씩
   🔁 1적구 뒤    : 빨강 ① 두께 1/16 씩
   한 번 계산 ≈ 8ms · 몇 개씩 나눠 돌려 화면이 멈추지 않게 한다. 무엇이든 바뀌면(clearSim) 멈춘다 */
var SCAN_TOKEN=0;
function scanCandidates(){
  var K=kind(),out=[],c=ST.balls[ST.balls.cue];
  function thickSweep(target){
    var seq=[];for(var t=1;t<=16;t++)seq.push({side:'L',t16:t});for(t=15;t>=1;t--)seq.push({side:'R',t16:t});
    seq.forEach(function(s,i){var dir=aimAt(target,s.t16/16,s.side);if(!dir)return;
      var hit=rayHit(c,dir);
      out.push({grp:target,idx:i,target:target,side:s.side,t16:s.t16,dir:dir,ghost:hit?hit.ghost:null,block:!hit||hit.ball!==target});});
  }
  if(K==='free'){thickSweep('r');thickSweep('r2');}
  else if(K==='cush'&&cushAfter())thickSweep('r');
  else if(K==='cush'){
    var cp=ST.draft.cpts[0];if(!cp)return null;
    var r=railId(cp),max=(r==='T'||r==='B')?W:H,i=0;
    for(var v=0;v<=max*10+1e-9;v+=0.5,i++){var p=r==='T'||r==='B'?{x:v/10,y:cp.y,rail:true}:{x:cp.x,y:v/10,rail:true};
      var q=toCenter(p),dx=q.x-c.x,dy=q.y-c.y,L=Math.hypot(dx,dy);if(L<1e-6)continue;
      out.push({grp:r,idx:i,rail:r,v:v,pt:p,dir:{x:dx/L,y:dy/L},end:q});}
  }
  return out;
}
function scanRange(){
  var K=kind();if(K==='sep')return;
  if(K==='cush'&&!cushAfter()&&!ST.draft.cpts.length){modal({title:'먼저 쿠션 지점을 하나 찍어 주세요',body:'찍은 쿠션 위에서 지점을 조금씩 옮겨 가며 계산합니다.',buttons:[{label:'알겠습니다',value:1,cls:'primary'}]});return;}
  clearSim();
  var items=scanCandidates()||[],tok=++SCAN_TOKEN,i=0,V=speedMs(),saved=clone(ST.draft.cpts);
  SIMV={scan:{items:items,done:0},ids:liveBalls(),t:0,T:0,playing:false,info:{result:'cmp',text:'🎯 계산 중… 0/'+items.length}};
  renderAll();
  function step(){
    if(tok!==SCAN_TOKEN||!SIMV||!SIMV.scan)return;
    var end=Math.min(items.length,i+8);
    for(;i<end;i++){var it=items[i];if(it.block){it.res='block';continue;}
      if(it.pt)ST.draft.cpts=[it.pt].concat(saved.slice(1));   /* 쿠션 먼저: 첫 지점만 바꿔 계산 */
      var ai={dir:it.dir,contact:rayHit(ST.balls[ST.balls.cue],it.dir)},r=simWith(ai,V),I=judge(r,ai);
      it.res=I.result==='hit'?'hit':I.result==='foul'?'foul':'miss';
    }
    ST.draft.cpts=saved;
    SIMV.scan.done=i;SIMV.info.text='🎯 계산 중… '+i+'/'+items.length;
    if(i<items.length){renderHint();setTimeout(step,0);return;}
    finishScan();
  }
  setTimeout(step,0);
}
/* 이어진 성공 구간 → 글자 · 가장 넓은 구간의 가운데 = 추천 조준 */
function finishScan(){
  var sc=SIMV.scan,items=sc.items,groups={},order=[];
  items.forEach(function(it){if(!groups[it.grp]){groups[it.grp]=[];order.push(it.grp);}groups[it.grp].push(it);});
  var ranges=[];
  order.forEach(function(g){var run=null;
    groups[g].forEach(function(it,k){
      if(it.res==='hit'){if(!run){run={grp:g,from:it,to:it,items:[]};ranges.push(run);}run.to=it;run.items.push(it);}
      else run=null;
    });});
  var best=null;ranges.forEach(function(r){if(!best||r.items.length>best.items.length)best=r;});
  sc.ranges=ranges;sc.best=best?best.items[Math.floor((best.items.length-1)/2)]:null;
  var RN={T:'위',B:'아래',L:'왼쪽',R:'오른쪽'};
  var th=function(it){return it.t16===16?'정면':(it.side==='L'?'왼쪽 ':'오른쪽 ')+(it.t16/2)+'/8';};
  var one=function(r){return r.from===r.to?(r.from.pt?RN[r.from.rail]+' '+r.from.v:th(r.from)):
    (r.from.pt?RN[r.from.rail]+' '+r.from.v+' ~ '+r.to.v:th(r.from)+' ~ '+th(r.to));};
  var cond=' (속도 '+(ST.draft.kmh!=null?ST.draft.kmh+'km/h':ST.draft.speed)+' · '+tipDesc(ST.draft.tip)[0]+')';
  var txt;
  if(kind()==='cush'&&!cushAfter()){
    var sys=null,cp=ST.draft.cpts[0],c=ST.balls[ST.balls.cue];
    if(cp&&ST.draft.ncush===1){var sp=sysPath(c,ST.balls.r,[railId(cp)]);if(sp)sys=cval(sp[1],railId(cp));}
    txt='🎯 맞는 쿠션 지점'+cond+' — '+(ranges.length?ranges.map(one).join(' · '):'없음')+(sys!=null?' · 무회전 계산 '+sys:'');
  }else{
    txt='🎯 맞는 두께'+cond+' — '+order.map(function(g){var rs=ranges.filter(function(r){return r.grp===g;});
      return BNAME[g]+': '+(rs.length?rs.map(one).join(', '):'없음');}).join(' · ');
  }
  if(!ranges.length)txt+=' — 속도나 당점을 바꿔 보세요';
  var foul=items.filter(function(x){return x.res==='foul';}).length;
  if(foul)txt+=' · ⚠ 파울 조준 '+foul+'개';
  SIMV.info={result:ranges.length?'hit':'miss',text:txt,scan:true};
  renderAll();
}
/* 가장 넓은 성공 구간의 가운데로 조준을 옮기고 바로 쳐 본다 */
function useBest(){
  var b=SIMV&&SIMV.scan&&SIMV.scan.best;if(!b)return;
  pushUndo();var d=ST.draft;
  if(b.pt)d.cpts=[b.pt].concat(d.cpts.slice(1));
  else if(kind()==='cush'){d.thick=b.t16/2;d.side=b.side;}
  else d.predict=[{ref:'cue'},{x:r2(b.ghost.x),y:r2(b.ghost.y)}];
  saveSoon();renderAll();runSim();
}
/* ═════════ 🎲 문제 모드 (v2.3) ═════════
   🎲 새 문제  : 배치를 무작위로. 자유 연습은 **지금 당점·속도로 득점할 수 있는 배치만** 낸다(맞는 범위로 확인)
   📝 10문제   : 분리각·원투쿠션 — 새 문제 → 예측 → 정답 보기(자동 기록) → 다음 문제 … → 평균 오차 · 지난 세트와 비교 */
var SET=null, QTOKEN=0;
function rnd(a,b){return a+Math.random()*(b-a);}
function rpos(m){return {x:r2(rnd(m,W-m)),y:r2(rnd(m,H-m))};}
function apart(list,p,g){return list.every(function(q){return Math.hypot(q.x-p.x,q.y-p.y)>=g;});}
/* 한 배치 후보 — 공끼리 3반지름 이상 떨어뜨린다 */
function randomBalls(ids,m){
  var out={},got=[];
  for(var k=0;k<ids.length;k++){var p,t=0;do{p=rpos(m);t++;}while(!apart(got,p,BR*3)&&t<200);out[ids[k]]=p;got.push(p);}
  return out;
}
/* 이 배치가 문제로 쓸 만한가 — 종류별 조건 */
function problemOk(){
  var K=kind(),c=ST.balls[ST.balls.cue],o=ST.balls.r,d=Math.hypot(o.x-c.x,o.y-c.y);
  if(K==='sep'){var ai=aimInfo();return d>=1.2&&d<=4.5&&ai&&ai.contact&&ai.contact.ball==='r';}
  if(K==='cush'&&!cushAfter()){
    if(d<1)return false;
    /* 거울 계산으로 풀 수 있는 쿠션 조합이 하나는 있어야 문제다 */
    var combos=ST.draft.ncush===1?[['T'],['B'],['L'],['R']]:[['T','R'],['T','L'],['B','R'],['B','L'],['R','T'],['L','T'],['R','B'],['L','B']];
    return combos.some(function(rs){return !!sysPath(c,o,rs);});
  }
  if(K==='cush'){var a2=aimInfo();if(!a2||!a2.contact||a2.contact.ball!=='r'||d<1.2)return false;
    var I=judgeCush(simWith(a2,speedMs()),a2);if(I.none||!I.act||I.act.length!==ST.draft.ncush)return false;
    /* 🔒 훈련이 되는 문제만: 맞는 두께가 두 칸(1/8) 이상 · 너무 얇지 않게(1.5/8 보다 두껍게) — 1/16 로만 되는 문제가 나왔다 */
    SOLVE={key:null,val:null};var sv=solveCush(false);
    return !!sv.best&&sv.ranges[0].items.length>=2&&Math.abs(sv.best.u)<=0.82;}
  return true;
}
/* 🔁 문제를 거꾸로 만든다 — 수구·1적구(쿠션 먼저는 수구만)를 놓고 임의의 두께(지점)로 실제로 굴린 뒤,
   수구가 N번째 쿠션을 지나 굴러가는 길 위에 목표 공을 놓는다. 그러면 답이 반드시 있다.
   🔒 무작위로 놓고 답을 찾던 방식은 투쿠션에서 60번 안에 못 찾아 **답 없는 문제**가 나왔다(v3 테스트) */
function buildCushProblem(){
  var d=ST.draft,after=d.ctype==='after',cue=ST.balls.cue,N=d.ncush,tg=after?'r2':'r',R0=PH.DEF.R;
  var c=rpos(0.5),o=null;
  if(after){o=rpos(0.5);var dd=Math.hypot(o.x-c.x,o.y-c.y);if(dd<1.2||dd>4)return false;}
  var dir;
  if(after){var t16=4+Math.floor(Math.random()*9),side=Math.random()<0.5?'L':'R';ST.balls[cue]=c;ST.balls.r=o;dir=aimAt('r',t16/16,side);if(!dir)return false;d.thick=t16/2;d.side=side;}
  else{var rr=['T','B','L','R'][Math.floor(Math.random()*4)],mx=(rr==='T'||rr==='B')?W:H,q=toCenter(railPt(rr,Math.round(rnd(0.5,mx-0.5)*20)/2));
    dir={x:q.x-c.x,y:q.y-c.y};var L=Math.hypot(dir.x,dir.y);if(L<1)return false;dir={x:dir.x/L,y:dir.y/L};}
  var balls={};balls[cue]={x:c.x*DM,y:c.y*DM};if(after)balls.r={x:o.x*DM,y:o.y*DM};
  var res=PH.simulate({balls:balls,cue:cue,dir:dir,V:speedMs(),tip:d.tip||{x:0,y:0},params:feelParams()}),E=res.events,i=0;
  if(after){for(;i<E.length;i++)if(E[i].type==='ball')break;if(i>=E.length)return false;}
  var cc=0,tN=null,tNext=null;
  for(;i<E.length;i++){var e=E[i];if(e.ball!==cue)continue;
    if(e.type==='cushion'){cc++;if(cc===N)tN=e.t;else if(cc===N+1){tNext=e.t;break;}}
    if(e.type==='stop'&&tN!=null){tNext=e.t;break;}}
  if(tN==null)return false;
  /* N번째 쿠션 뒤 길 위 — 쿠션에서 공 4개 이상 떨어진 곳 중 아무 데 */
  var F=res.frames,cands=F.filter(function(f){return f.t>tN&&(tNext==null||f.t<tNext-0.05);}).map(function(f){return {x:f.p[cue][0]/DM,y:f.p[cue][1]/DM};})
    .filter(function(p){return p.x>0.4&&p.x<W-0.4&&p.y>0.4&&p.y<H-0.4;});
  var ePt=F.filter(function(f){return f.t<=tN+1e-9;});
  cands=cands.filter(function(p){ /* 앞선 길(N번째 쿠션 전)과 겹치지 않게 */
    return ePt.every(function(f){return Math.hypot(f.p[cue][0]/DM-p.x,f.p[cue][1]/DM-p.y)>(2*R0/DM)*1.6;})&&Math.hypot(p.x-c.x,p.y-c.y)>0.6&&(!o||Math.hypot(p.x-o.x,p.y-o.y)>0.6);});
  if(!cands.length)return false;
  var t=cands[Math.floor(rnd(0,cands.length))];
  ST.balls[tg]={x:r2(t.x),y:r2(t.y)};
  /* 나머지 공(쿠션 먼저의 빨강 ② 등)은 판 밖 흉내 없이 그대로 둔다 — 이 판에서 안 쓰는 공이다 */
  return true;
}
function newProblem(){
  var K=kind(),tok=++QTOKEN,tries=0;
  pushUndo();
  var d=ST.draft;d.predObj=null;d.predCue=null;d.cpts=[];d.predict=[];d.actual=[];resetTries();
  var cue=ST.balls.cue;
  function once(){
    var ids=K==='free'?ALLB:liveBalls(),nb=randomBalls(ids,K==='cush'?0.45:0.3);
    ids.forEach(function(n){ST.balls[n]=nb[n];});
    if(K==='sep'||(K==='cush'&&cushAfter())){d.thick=1+Math.floor(Math.random()*8);d.side=Math.random()<0.5?'L':'R';}
  }
  if(K!=='free'){
    if(K==='cush'){var okq=false;while(!okq&&tries<150){tries++;okq=buildCushProblem()&&(!cushAfter()||problemOk());}}
    else do{once();tries++;}while(!problemOk()&&tries<300);
    resetTries();
    MODE={sep:'pobj',cush:'cpt'}[K];saveSoon();renderAll();
    toast('🎲 새 문제'+(SET?' — '+SET.i+'/'+SET.n:''));return;
  }
  /* 🎱 자유 연습: 지금 당점·속도로 득점 조준이 하나라도 있는 배치가 나올 때까지(나눠서 돌린다) */
  $('hint').className='hint run';$('hint').textContent='🎲 득점할 수 있는 배치를 찾는 중…';
  function attempt(){
    if(tok!==QTOKEN)return;
    once();tries++;
    var V=speedMs(),items=scanCandidates()||[],found=false;
    for(var i=0;i<items.length&&!found;i++){var it=items[i];if(it.block)continue;
      var ai={dir:it.dir,contact:rayHit(ST.balls[cue],it.dir)};if(judge(simWith(ai,V),ai).result==='hit')found=true;}
    if(!found&&tries<20){setTimeout(attempt,0);return;}
    MODE='draw';LAYER='predict';saveSoon();renderAll();
    toast(found?'🎲 새 문제 — 득점할 수 있는 배치입니다. 조준을 그어 보세요':'⚠ 득점 배치를 못 찾았습니다. 속도나 당점을 바꿔 다시 눌러 보세요');
  }
  setTimeout(attempt,0);
}
function startSet(){
  var K=kind();if(K!=='sep'&&K!=='cush')return;
  SET={id:'s'+Date.now().toString(36),n:10,i:1,kind:K,board:CUR,answered:false,scores:[]};
  newProblem();renderTools();
}
function stopSet(){SET=null;renderAll();toast('10문제 풀기를 멈췄습니다');}
/* 정답을 본 순간 자동 기록(한 문제에 한 번) */
function onSimDone(){
  if(SIMV&&!SIMV.multi&&!SIMV.scan&&kind()==='cush'&&!SIMV.info.answer){cushTry();renderHint();renderSimBtn();renderTable();return;}
  if(!SET||SET.answered||SET.board!==CUR||!SIMV||SIMV.multi||SIMV.scan||kind()==='cush')return;
  SET.answered=true;
  var I=SIMV.info,e=SET.kind==='sep'?[I.eObj,I.eCue]:(I.err||[]);
  var v=e.filter(function(x){return x!=null;});
  SET.scores.push({no:SET.i,err:v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null,text:I.text});
  record();
  renderHint();renderSimBtn();   /* 🔒 안내 줄은 굴러가기 끝에서 먼저 그려진다 — 답함 표시 뒤에 다시 그려야 [다음 문제 ▶] 가 나온다 */
}
function nextQ(){
  if(!SET)return;
  if(SET.i>=SET.n){finishSet();return;}
  SET.i++;SET.answered=false;newProblem();renderTools();
}
function setScore(L){var v=L.filter(function(x){return x!=null;});return v.length?Math.round(v.reduce(function(a,b){return a+b;},0)/v.length*10)/10:null;}
/* 세트 결과 — 평균 오차 · 지난 세트와 비교 */
function finishSet(){
  var S0=SET,unit=S0.kind==='sep'?'°':S0.kind==='cush'?'번':'',avgNow=setScore(S0.scores.map(function(x){return x.err;}));
  SET=null;renderAll();
  var what=S0.kind==='sep'?'1적구·수구 방향 평균 오차':'스스로 맞히기까지 평균 시도';
  SB.from('bb_attempts').select('*').is('deleted_at',null).eq('kind',S0.kind).order('created_at',{ascending:false}).limit(500).then(function(r){
    var prev=null,sets={},order=[];
    (r.data||[]).forEach(function(a){var st=a.sim&&a.sim.set;if(!st||st.id===S0.id)return;if(!sets[st.id]){sets[st.id]=[];order.push(st.id);}
      var s=a.sim,e=S0.kind==='sep'?[s.eObj,s.eCue]:S0.kind==='cush'?[s.solvedBy==='self'?s.triesN:null]:(s.err||[]);var v=e.filter(function(x){return x!=null;});
      if(v.length)sets[st.id].push(v.reduce(function(x,y){return x+y;},0)/v.length);});
    if(order.length)prev=setScore(sets[order[0]]);
    var cmp=prev==null||avgNow==null?'':(avgNow<prev?'<p style="color:#0d3aa3;font-weight:800">지난 세트 '+prev+unit+' → 이번 '+avgNow+unit+' · '+Math.round((prev-avgNow)*10)/10+unit+' 좋아졌습니다 👍</p>':
      avgNow>prev?'<p style="font-weight:800">지난 세트 '+prev+unit+' → 이번 '+avgNow+unit+'</p>':'<p style="font-weight:800">지난 세트와 같습니다 ('+avgNow+unit+')</p>');
    var rows=S0.scores.map(function(x){return '<tr><td class="num">'+x.no+'</td><td class="num"><b>'+(x.err==null?'—':Math.round(x.err*10)/10+unit)+'</b></td><td>'+esc(x.text)+'</td></tr>';}).join('');
    modal({title:'📝 10문제 끝!',wide:true,html:'<p style="font-size:1.3rem">'+what+': <b>'+(avgNow==null?'—':avgNow+unit)+'</b></p>'+cmp+
      '<table class="t"><tr><th>번호</th><th>오차</th><th>정답</th></tr>'+rows+'</table>',
      buttons:[{label:'닫기',value:null},{label:'<span class="ic">📝</span> 10문제 더',value:'again',cls:'primary'}]}).then(function(m){if(m.value==='again')startSet();});
  });
}
/* ═════════ 🔁 원·투쿠션 훈련 v3 — ① 지점 찾기 · ② 답 보기 ═════════
   아버지: "적구를 아무 곳에 두고, 1적구를 맞히고 어디를 맞아야 2적구로 가는지 훈련" · "두께도 말해 주면 좋겠다"
   ① 찾기: 📍 가야 할 쿠션 지점(아버지의 답) + 📏 두께 → [▶ 쳐 보기] → 결과 + 💡 힌트(답은 안 보여 줌) → 다시
   ② 답 : [💡 답 보기] → 맞는 두께 구간·가운데·수구가 닿는 지점·무회전 계산 + 정답 공 재생
   정답은 두께(1적구 뒤) 또는 첫 쿠션 지점(쿠션 먼저)을 촘촘히 굴려 찾는다 — 결과가 정해지면 바로 멈춰(stopWhen) 빠르다 */
var HINT=pref('hint')||'dir';                     /* dir 방향만 · size 방향+크기 · none 없음 */
var RNM={T:'위',B:'아래',L:'왼쪽',R:'오른쪽'};
var SOLVE={key:null,val:null};
function railPt(r,v){return r==='T'?{x:v/10,y:0,rail:true}:r==='B'?{x:v/10,y:H,rail:true}:r==='L'?{x:0,y:v/10,rail:true}:{x:W,y:v/10,rail:true};}
function thickWord(side,t16){return t16>=16?'정면(8/8)':'공 '+(side==='L'?'왼쪽':'오른쪽')+' '+(t16/2)+'/8';}
/* 두께를 한 줄 좌표로: 왼쪽 얇게 -1 … 정면 0 … 오른쪽 얇게 +1 */
function uOf(side,t16){return (side==='L'?-1:1)*(1-t16/16);}
/* 결과가 정해지면 멈춘다: 목표 공에 닿음 · 쿠션을 N번 넘김 */
function cushStop(){
  var d=ST.draft,cue=ST.balls.cue,after=d.ctype==='after',target=after?'r2':'r',N=d.ncush,cc=0,gotR=!after;
  return function(e){
    if(e.type==='ball'&&(e.a===cue||e.b===cue)){var o=e.a===cue?e.b:e.a;if(o==='r')gotR=true;if(o===target&&gotR)return true;}
    if(e.type==='cushion'&&e.ball===cue&&gotR){cc++;if(cc>N)return true;}
    return false;};
}
function cushCands(allRails){
  var d=ST.draft,c=ST.balls[ST.balls.cue],out=[];
  if(d.ctype==='after'){
    var seq=[];for(var t=1;t<=16;t++)seq.push({side:'L',t16:t});for(t=15;t>=1;t--)seq.push({side:'R',t16:t});
    seq.forEach(function(s,i){var dir=aimAt('r',s.t16/16,s.side);if(!dir)return;var h=rayHit(c,dir);
      out.push({grp:'r',idx:i,side:s.side,t16:s.t16,u:uOf(s.side,s.t16),dir:dir,ghost:h?h.ghost:null,block:!h||h.ball!=='r'});});
  }else{
    var rails=!allRails&&d.cpts[0]?[railId(d.cpts[0])]:['T','B','L','R'];
    rails.forEach(function(r){var max=(r==='T'||r==='B')?W:H;
      for(var v=0;v<=max*10+1e-9;v+=0.5){var p=railPt(r,v),q=toCenter(p),dx=q.x-c.x,dy=q.y-c.y,L=Math.hypot(dx,dy);if(L<1e-6)continue;
        out.push({grp:r,rail:r,v:v,pt:p,dir:{x:dx/L,y:dy/L},end:q});}});
  }
  return out;
}
/* 정답 풀기(같은 배치·당점·속도면 다시 안 푼다) */
function solveCush(allRails){
  var d=ST.draft,key=JSON.stringify([liveBalls().map(function(n){return ST.balls[n];}),ST.balls.cue,d.ctype,d.ncush,d.tip,speedMs(),FEEL,
    d.ctype==='first'&&!allRails&&d.cpts[0]?railId(d.cpts[0]):'all']);
  if(SOLVE.key===key)return SOLVE.val;
  var items=cushCands(allRails),V=speedMs(),c=ST.balls[ST.balls.cue];
  items.forEach(function(it){if(it.block){it.res='block';return;}
    var ai={dir:it.dir,contact:rayHit(c,it.dir)},I=judgeCush(simWith(ai,V,cushStop()),ai);
    it.res=I.result==='hit'?'hit':'miss';it.act=I.act;it.actR=I.actR;});
  var ranges=[],run=null,prev=null;
  items.forEach(function(it){if(it.res==='hit'&&run&&prev&&prev.grp===it.grp&&prev.res==='hit'){run.to=it;run.items.push(it);}
    else if(it.res==='hit'){run={grp:it.grp,from:it,to:it,items:[it]};ranges.push(run);}else run=null;prev=it;});
  ranges.sort(function(x,y){return y.items.length-x.items.length;});
  var best=ranges[0]?ranges[0].items[Math.floor((ranges[0].items.length-1)/2)]:null;
  SOLVE={key:key,val:{items:items,ranges:ranges,best:best}};
  return SOLVE.val;
}
function rangeTxt(r){
  if(r.from.pt)return RNM[r.grp]+' '+(r.from===r.to?r.from.v:r.from.v+' ~ '+r.to.v);
  var a=r.from,b=r.to;if(a===b)return thickWord(a.side,a.t16);
  return a.side===b.side?'공 '+(a.side==='L'?'왼쪽':'오른쪽')+' '+Math.min(a.t16,b.t16)/2+'/8 ~ '+Math.max(a.t16,b.t16)/2+'/8':thickWord(a.side,a.t16)+' ~ '+thickWord(b.side,b.t16);
}
function viaTxt(it){return (it.actR||[]).map(function(r,k){return RNM[r]+' '+it.act[k];}).join(' → ');}
/* 💡 힌트 — 답은 안 준다. 지금 두께(또는 지점)에서 가장 가까운 정답 쪽 방향만 */
function cushHint(tr,sol){
  if(HINT==='none')return '';
  var hits=sol.items.filter(function(x){return x.res==='hit';});
  if(!hits.length)return ' · 💡 이 속도·당점으론 맞는 길이 없습니다 — 속도나 당점을 바꿔 보세요';
  var d=ST.draft,out=[],sz=HINT==='size';
  if(d.ctype==='after'){
    var u0=uOf(tr.side,Math.round(tr.thick*2)),near=hits.reduce(function(m,x){return !m||Math.abs(x.u-u0)<Math.abs(m.u-u0)?x:m;},null);
    var dt=Math.abs(Math.abs(near.u)-Math.abs(u0))*8;
    if(near.u*u0<0&&Math.abs(near.u)>0.01&&Math.abs(u0)>0.01)out.push('공 '+(near.side==='L'?'왼쪽':'오른쪽')+'을 맞혀 보세요');
    else if(Math.abs(near.u-u0)>0.01)out.push('두께를 더 '+(Math.abs(near.u)<Math.abs(u0)?'두껍게':'얇게')+(sz?' (약 '+Math.max(0.5,Math.round(dt*2)/2)+'/8)':''));
    var need=near.actR&&near.actR[0],cp=d.cpts[0];
    if(!cp)out.push('다음엔 📍 가야 할 쿠션 지점도 찍어 보세요');
    else if(need&&railId(cp)!==need)out.push('가야 할 곳은 '+RNM[need]+' 쿠션');
    else if(need){var dv=near.act[0]-railVal(cp);if(Math.abs(dv)>=0.5)out.push('가야 할 지점은 찍은 곳보다 '+(dv>0?'큰':'작은')+' 수 쪽'+(sz?' (약 '+Math.round(Math.abs(dv))+')':''));}
  }else{
    var cp0=d.cpts[0],same=hits.filter(function(x){return x.rail===railId(cp0);});
    if(!same.length)out.push('이 쿠션으론 안 됩니다 — '+RNM[hits[0].rail]+' 쿠션을 찍어 보세요');
    else{var v0=railVal(cp0),n2=same.reduce(function(m,x){return !m||Math.abs(x.v-v0)<Math.abs(m.v-v0)?x:m;},null),dv2=n2.v-v0;
      out.push('지점을 더 '+(dv2>0?'큰':'작은')+' 수로'+(sz?' (약 '+Math.max(0.5,Math.round(Math.abs(dv2)*2)/2)+')':''));}
  }
  return out.length?' · 💡 '+out.join(' · '):'';
}
/* ▶ 쳐 보기가 끝나면 — 시도 한 번 */
function cushTry(){
  var d=ST.draft,I=SIMV.info;if(!d.tries)d.tries=[];
  var tr={no:d.tries.length+1,thick:d.thick,side:d.side,cpt:d.cpts.map(function(p){return {r:railId(p),v:railVal(p)};}),
    act:I.act||[],actR:I.actR||[],hit:I.result==='hit',miss:I.missCm,pt:d.cpts[0]?clone(d.cpts[0]):null};
  d.tries.push(tr);
  var after=d.ctype==='after',tg=after?BNAME.r2:BNAME.r,txt;
  if(I.none)txt='❌ '+tr.no+'번째 — 1적구(빨간 공 ①)를 맞히지 못했습니다';
  else if(tr.hit)txt='⭕ '+tr.no+'번째 만에 '+(after?'득점':'맞힘')+'! — '+(after?thickWord(d.side,Math.round(d.thick*2))+' → ':'')+
    tr.act.map(function(v,k){return RNM[tr.actR[k]]+' '+v;}).join(' → ')+' → '+tg;
  else{
    var via=tr.act.length?tr.act.map(function(v,k){return RNM[tr.actR[k]]+' '+v;}).join(' → '):'쿠션에 안 닿음';
    var cmp='';if(after&&tr.cpt.length&&tr.act.length){   /* 쿠션에 안 닿았으면 비교할 게 없다 */var c0=tr.cpt[0];cmp=c0.r===tr.actR[0]?' (찍은 곳 '+c0.v+', '+Math.abs(c0.v-tr.act[0])+' 차이)':' (찍은 곳 '+RNM[c0.r]+' '+c0.v+' — 다른 쿠션)';}
    txt='❌ '+tr.no+'번째 — 수구: '+via+cmp+(I.missCm!=null?' · '+tg+'와 '+missTxt(I.missCm):I.ncus===0?' · 쿠션 없이 바로 '+tg+'에 맞음 ('+(d.ncush===1?'원':'투')+'쿠션이 아님)':' · '+tg+' 맞았지만 쿠션 '+I.ncus+'번 ('+(d.ncush===1?'원':'투')+'쿠션이 아님)')+cushHint(tr,solveCush());
  }
  I.text=txt;I.tryNo=tr.no;
  if(tr.hit&&!d.solved){d.solved='self';cushDone();}
  saveSoon();
}
/* 💡 답 보기 — 정답 공을 굴려 보이고, 두께·지점·계산을 말로 */
function showAnswer(){
  var d=ST.draft;if(kind()!=='cush')return;
  if(d.ctype!=='after'&&!d.cpts[0]){var s0=solveCush(true);if(!s0.best){answerNone();return;}}
  clearSim();
  var sol=solveCush(false);if(!sol.best&&d.ctype!=='after')sol=solveCush(true);
  if(!sol.best){answerNone();return;}
  var b=sol.best,c=ST.balls[ST.balls.cue],ai={dir:b.dir,contact:rayHit(c,b.dir)},res=simWith(ai,speedMs()),I=judgeCush(res,ai);
  var tg=d.ctype==='after'?'r2':'r',S=d.ctype==='after'?b.ghost:c,sp=S&&b.actR&&b.actR.length?sysPath(S,ST.balls[tg],b.actR):null;
  var sysT=sp?' · 무회전 계산 '+sp.slice(1,1+b.actR.length).map(function(q,k){return RNM[b.actR[k]]+' '+cval(q,b.actR[k]);}).join(' → '):'';
  var more=sol.ranges.length>1?' · 다른 길 '+(sol.ranges.length-1)+'가지':'';
  var txt=d.ctype==='after'
    ?'💡 정답: '+rangeTxt(sol.ranges[0])+(sol.ranges[0].items.length>2?' (가운데 '+thickWord(b.side,b.t16)+')':'')+' → 수구 '+viaTxt(b)+' → '+BNAME.r2+sysT+more
    :'💡 정답: '+rangeTxt(sol.ranges[0])+(sol.ranges[0].items.length>2?' (가운데 '+b.v+')':'')+(b.actR.length>1?' → '+viaTxt(b):'')+' → '+BNAME.r+sysT+more;
  I.text=txt;I.answer=true;I.result='hit';I.best=b;
  I.sysPath=sp?sp.map(function(q){return [r2(q.x),r2(q.y)];}):null;I.rails=b.actR;   /* 판 위 계산선도 글자와 같은 쿠션으로 */
  SIMV={res:res,ai:ai,info:I,ids:liveBalls(),t:0,T:res.frames[res.frames.length-1].t,playing:false};
  if(!d.answered){d.answered=true;if(!d.solved){d.solved='answer';cushDone();}}
  saveSoon();hidePop();
  /* 굴려 보인다 */
  SIMV.playing=true;var last=performance.now();cancelAnimationFrame(RAF);
  (function step(now){if(!SIMV||!SIMV.info.answer)return;SIMV.t=Math.min(SIMV.T,SIMV.t+Math.max(0,now-last)/1000*(SLOW?0.35:1));last=Math.max(last,now);
    if(SIMV.t>=SIMV.T)SIMV.playing=false;renderTable();renderHint();renderSimBtn();if(SIMV.playing)RAF=requestAnimationFrame(step);})(last);
  renderAll();
}
function answerNone(){clearSim();SIMV={multi:null,res:null,info:{result:'miss',text:'💡 이 속도·당점으론 맞는 길이 없습니다 — 속도나 당점을 바꿔 보세요',answer:true},ids:[],t:0,T:0,playing:false,none:true};renderHint();}
/* 답의 두께(또는 지점)로 바꿔 직접 쳐 보게 */
function applyAnswer(){
  var b=SIMV&&SIMV.info&&SIMV.info.best;if(!b)return;
  pushUndo();var d=ST.draft;
  if(b.pt)d.cpts=[b.pt];else{d.thick=b.t16/2;d.side=b.side;d.cpts=(b.actR||[]).map(function(r,k){return railPt(r,b.act[k]);});}
  saveSoon();renderAll();toast('💡 정답 '+(b.pt?'지점':'두께')+'으로 바꿨습니다 — [▶ 쳐 보기]로 확인해 보세요');
}
/* 한 문제가 끝남(스스로 맞힘 또는 답 봄) — 한 번만 기록 */
function cushDone(){
  var d=ST.draft;if(d.recorded)return;d.recorded=true;
  if(SET&&SET.board===CUR&&!SET.answered){SET.answered=true;
    SET.scores.push({no:SET.i,err:d.solved==='self'?d.tries.length:null,text:d.solved==='self'?d.tries.length+'번 만에':'답 봄 ('+d.tries.length+'번 시도)'});}
  record();
}
/* 새 배치·종류가 바뀌면 시도는 처음부터 */
function resetTries(){var d=ST.draft;d.tries=[];d.solved=null;d.answered=false;d.recorded=false;SOLVE={key:null,val:null};}
/* 💨 속도 1~5 비교 — 같은 조준·당점으로 속도만 바꿔 수구 길을 겹쳐 본다 ("무회전이라도 속도에 따라 달라진다") */
function compareSpeeds(){
  var ai=aimInfo();if(!ai){runSim();return;}
  clearSim();
  var out=PH.SPEED.map(function(V,i){var r=simWith(ai,V);return {res:r,info:judge(r,ai),n:i+1};});
  SIMV={multi:out,ai:ai,ids:liveBalls(),res:out[2].res,t:0,T:0,playing:false,
    info:{result:'cmp',sysPath:out[2].info.sysPath,rails:out[2].info.rails,
      text:'💨 속도별 — '+out.map(function(o){return o.n+'단 '+(o.info.result==='hit'?'⭕':o.info.missCm!=null?'❌ '+missTxt(o.info.missCm).replace(' (거의 맞음)',''):'❌');}).join(' · ')}};
  hidePop();renderAll();
}
/* 🎱 4구 판정 — 두 빨간 공을 모두 맞히면 득점, 상대 공을 맞히면 파울 */
function judgeFree(res,ai){
  var cue=ST.balls.cue, op=opp(), hit={}, seq=[], foul=false, done=false;
  res.events.forEach(function(e){
    if(done)return;
    if(e.type==='ball'&&(e.a===cue||e.b===cue)){
      var o=e.a===cue?e.b:e.a;hit[o]=1;seq.push(o);if(o===op)foul=true;
      if(hit.r&&hit.r2)done=true;
    }else if(e.type==='cushion'&&e.ball===cue)seq.push('c');
  });
  var both=!!(hit.r&&hit.r2), result=foul?'foul':both?'hit':'miss';
  /* 길 글자 — 쿠션은 묶어 센다 */
  var parts=[],cc=0;
  seq.forEach(function(x){if(x==='c'){cc++;return;}if(cc){parts.push('쿠션 '+cc+'번');cc=0;}parts.push(BNAME[x]+(x===op?'(상대 공)':''));});
  if(cc)parts.push('쿠션 '+cc+'번');
  var miss=null,target=null;
  if(!both&&!foul){
    target=hit.r?'r2':hit.r2?'r':null;
    miss=target?nearMiss(res,cue,target):Math.min(nearMiss(res,cue,'r'),nearMiss(res,cue,'r2'));
    if(!target)target=nearMiss(res,cue,'r')<=nearMiss(res,cue,'r2')?'r':'r2';
  }
  var txt;
  if(result==='hit')txt='⭕ 득점 — '+parts.join(' → ');
  else if(result==='foul')txt='⚠ 파울 — 상대 공('+BNAME[op]+')을 맞혔습니다 · '+parts.join(' → ');
  else if(hit.r||hit.r2)txt='❌ 실패 — '+BNAME[hit.r?'r':'r2']+'만 맞힘 · '+BNAME[target]+'와 '+missTxt(miss)+' 차이';
  else txt='❌ 실패 — 빨간 공을 하나도 못 맞힘 · '+BNAME[target]+'와 '+missTxt(miss)+' 차이'+(parts.length?' ('+parts.join(' → ')+')':'');
  return {result:result,text:txt,seq:parts,missCm:miss,first:ai.contact?{ball:ai.contact.ball,thick:r2(ai.contact.thick),side:ai.contact.side}:null};
}
/* 수구가 공 target 에 가장 가까이 간 거리(cm, 공끼리 닿는 거리 기준) — 프레임 사이 선분까지 잰다 */
function nearMiss(res,cue,target){
  var best=1e9,F=res.frames,R=PH.DEF.R;
  for(var i=1;i<F.length;i++){
    var a=F[i-1].p[cue],b=F[i].p[cue],o=F[i].p[target];
    var dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?clamp(((o[0]-a[0])*dx+(o[1]-a[1])*dy)/L,0,1):0;
    var d=Math.hypot(a[0]+t*dx-o[0],a[1]+t*dy-o[1]);if(d<best)best=d;
  }
  return Math.max(0,Math.round((best-2*R)*10000)/100);
}
/* 빗나간 거리 글자 — 1cm 미만은 mm 로. "0cm 차이 ❌" 는 틀린 것처럼 보인다(v2.1 실측: 0.3mm 로 스친 공) */
function missTxt(cm){if(cm==null)return "";if(cm<0.1)return "1mm 미만 (거의 맞음)";if(cm<1)return Math.round(cm*10)+"mm (거의 맞음)";return Math.round(cm*10)/10+"cm";}
/* 📐 분리각 — 1적구 방향 · 수구 방향(끌기·밀기로 휜 뒤 곧게 가는 방향) · 둘 사이 각 */
function judgeSep(res,ai){
  var cue=ST.balls.cue,he=null,E=res.events;
  for(var i=0;i<E.length;i++){var e=E[i];if(e.type==='ball'&&((e.a===cue&&e.b==='r')||(e.b===cue&&e.a==='r'))){he=e;break;}}
  if(!he)return {none:true,text:'❌ 1적구를 맞히지 못했습니다'};
  var ov=he.a==='r'?he.va:he.vb, cp=he.a===cue?[he.x,he.y]:[he.bx,he.by];
  var cd=null,stopped=false;
  for(i=i+1;i<E.length;i++){e=E[i];if(e.ball!==cue)continue;
    if(e.type==='roll'){cd=e.v;break;}
    if(e.type==='cushion'||e.type==='stop'){var mx=e.x-cp[0],my=e.y-cp[1];if(Math.hypot(mx,my)>0.01)cd=[mx,my];else stopped=true;break;}
  }
  var aim=Math.atan2(ai.dir.y,ai.dir.x);
  var objA=normA(deg(Math.atan2(ov[1],ov[0])-aim));
  var cueA=cd?normA(deg(Math.atan2(cd[1],cd[0])-aim)):null;
  var sepA=cd?Math.abs(normA(deg(Math.atan2(cd[1],cd[0])-Math.atan2(ov[1],ov[0])))):null;
  var d=ST.draft,o=ST.balls.r,g=ai.contact?ai.contact.ghost:null,pO=null,pC=null;
  if(d.predObj)pO=normA(deg(Math.atan2(d.predObj.y-o.y,d.predObj.x-o.x)-aim));
  if(d.predCue&&g)pC=normA(deg(Math.atan2(d.predCue.y-g.y,d.predCue.x-g.x)-aim));
  var eO=pO!=null?Math.round(Math.abs(normA(pO-objA))):null, eC=(pC!=null&&cueA!=null)?Math.round(Math.abs(normA(pC-cueA))):null;
  var t='1적구 '+Math.round(Math.abs(objA))+'°'+(eO!=null?' (예측 '+Math.round(Math.abs(pO))+'°, '+eO+'° 차이)':'')+
        ' · 수구 '+(cueA!=null?Math.round(Math.abs(cueA))+'°':'멈춤')+(eC!=null?' (예측 '+Math.round(Math.abs(pC))+'°, '+eC+'° 차이)':'')+
        (sepA!=null?' · 분리각 '+Math.round(sepA)+'°':'');
  return {obj:r2(objA),cue:cueA==null?null:r2(cueA),sep:sepA==null?null:r2(sepA),stopped:stopped,pObj:pO==null?null:r2(pO),pCue:pC==null?null:r2(pC),
    eObj:eO,eCue:eC,text:'📐 '+t,thick:d.thick,side:d.side};
}
function runSim(){
  if(SIMV&&SIMV.playing){SIMV.t=SIMV.T;return;}          /* 굴러가는 중에 다시 누르면 끝으로 */
  var sv=computeSim();
  if(!sv){modal({title:kind()==='sep'?'두께를 계산할 수 없습니다':'먼저 조준선을 그어 주세요',
    body:kind()==='sep'?'수구와 1적구를 조금 떨어뜨려 놓아 주세요.':'[✏️ 선 긋기]를 누르고 내 공에서 첫 선을 그으면, 그 방향이 조준입니다.',
    buttons:[{label:'알겠습니다',value:1,cls:'primary'}]});return;}
  SIMV=sv;SIMV.playing=true;hidePop();
  var last=performance.now();
  cancelAnimationFrame(RAF);
  function step(now){
    if(!SIMV)return;
    /* 🔒 rAF 가 주는 now 는 이 프레임의 시작 시각이라 직전 performance.now() 보다 이를 수 있다 → 음수 시간이면 -1번 프레임을 읽다 죽었다 */
    SIMV.t=Math.min(SIMV.T,SIMV.t+Math.max(0,now-last)/1000*(SLOW?0.35:1));last=Math.max(last,now);
    if(SIMV.t>=SIMV.T)SIMV.playing=false;
    renderTable();renderHint();renderSimBtn();
    if(SIMV.playing)RAF=requestAnimationFrame(step);
    else onSimDone();
  }
  RAF=requestAnimationFrame(step);
  renderSimBtn();renderHint();
}
function clearSim(){SCAN_TOKEN++;if(SIMV){cancelAnimationFrame(RAF);SIMV=null;}}
function simFrame(){var F=SIMV.res.frames;return clamp(Math.floor(SIMV.t*PH.DEF.fps)||0,0,F.length-1);}

/* ═════════ 그리기 ═════════ */
function staticTable(){
  var h=[];
  h.push('<rect x="-92" y="-92" width="984" height="584" rx="30" fill="#5b3a22"/>');
  h.push('<rect x="-22" y="-22" width="844" height="444" rx="5" fill="#17613a"/>');
  h.push('<rect x="0" y="0" width="800" height="400" fill="#2a8a52"/>');
  for(var i=1;i<W;i++)h.push('<line x1="'+i*S+'" y1="0" x2="'+i*S+'" y2="400" stroke="rgba(255,255,255,.2)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>');
  for(var j=1;j<H;j++)h.push('<line x1="0" y1="'+j*S+'" x2="800" y2="'+j*S+'" stroke="rgba(255,255,255,.2)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>');
  for(i=0;i<=W;i++){h.push(dot(i*S,-36),dot(i*S,436));h.push(num(i*S,-58,i*10),num(i*S,480,i*10));}
  for(j=0;j<=H;j++){h.push(dot(-36,j*S),dot(836,j*S));h.push(num(-68,j*S+8,j*10),num(868,j*S+8,j*10));}
  function dot(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="#f3e6c8" stroke="#1a1a1a" stroke-width="2"/>';}
  function num(x,y,t){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="25" font-weight="800" fill="#f3e6c8" font-family="inherit">'+t+'</text>';}
  return h.join('');
}
function pathSvg(path,color,marker,faint){
  if(path.length<2)return '';
  var pts=path.map(function(p){var q=resolve(p);return (q.x*S)+','+(q.y*S);}).join(' ');
  var op=faint?' opacity="0.4"':'';
  return '<polyline points="'+pts+'" fill="none" stroke="#fff" stroke-width="'+(faint?7:11)+'" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"'+op+'/>'+
         '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="'+(faint?4:6)+'" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" marker-end="url(#'+marker+')"'+op+'/>';
}
/* 글자 폭 어림(굵은 글꼴) — 한글·기호는 숫자보다 넓다. 🔒 글자 수 × 0.62 로 잡았더니 "가운데" 가 칸을 벗어났다 */
function textEm(t){var w=0;String(t).split("").forEach(function(ch){var c=ch.charCodeAt(0);
  w+=(c>=0xAC00&&c<=0xD7A3)||(c>=0x3130&&c<=0x318F)||(c>=0x2460&&c<=0x24FF)||(c>=0x2600)?1.05:ch===" "?0.32:/[0-9]/.test(ch)?0.62:/[A-Za-z]/.test(ch)?0.64:0.5;});return w;}
function bubble(x,y,t,color,k,below){
  var fs=22*k, w=(textEm(t)+1)*fs, hgt=fs*1.4;
  var bx=x-w/2, by=y-hgt-12*k;
  if(below===true||(below!=='up'&&y<=0.01))by=y+12*k;   /* 윗쿠션이면 아래로 · below='up' 이면 늘 위 */
  return '<g pointer-events="none"><rect x="'+bx+'" y="'+by+'" width="'+w+'" height="'+hgt+'" rx="'+6*k+'" fill="#fff" stroke="'+color+'" stroke-width="'+3*k+'"/>'+
    '<text x="'+x+'" y="'+(by+hgt*0.74)+'" text-anchor="middle" font-size="'+fs+'" font-weight="800" fill="'+color+'">'+esc(t)+'</text></g>';
}
function tag(x,y,t,k){  /* 공 위 작은 글씨 */
  return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="'+17*k+'" font-weight="800" fill="#fff" stroke="#11482a" stroke-width="'+4*k+'" paint-order="stroke" pointer-events="none">'+t+'</text>';
}
function ballSvg(n,b,k,big,ghost){
  var cx=b.x*S,cy=b.y*S,h='';
  if(ghost)return '<circle cx="'+cx+'" cy="'+cy+'" r="'+BR*S+'" fill="none" stroke="'+(n==='w'?'#fff':BCOL[n])+'" stroke-width="'+2.5*k+'" stroke-dasharray="'+5*k+' '+4*k+'" opacity=".8" pointer-events="none"/>';
  if(ST.balls.cue===n)h+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(BR*S+9*k)+'" fill="none" stroke="#fff" stroke-width="'+3*k+'" stroke-dasharray="'+6*k+' '+4*k+'"/>';
  h+='<circle cx="'+cx+'" cy="'+cy+'" r="'+BR*S+'" fill="'+BCOL[n]+'" stroke="#222" stroke-width="2"'+(big?' style="cursor:grab"':'')+'/>';
  if(n==='r'||n==='r2')h+='<text x="'+cx+'" y="'+(cy+6*k)+'" text-anchor="middle" font-size="'+16*k+'" font-weight="900" fill="#fff" pointer-events="none">'+(n==='r'?'1':'2')+'</text>';
  var lab=ST.balls.cue===n?'내 공':(kind()==='free'&&n===opp()?'상대 공':'');
  if(lab)h+=tag(cx,cy-BR*S-12*k,lab,k);
  return h;
}
function ray(from,to,len,color,k,dash){
  var dx=to.x-from.x,dy=to.y-from.y,L=Math.hypot(dx,dy);if(L<1e-6)return '';
  var ex=from.x+dx/L*len,ey=from.y+dy/L*len;
  return '<line x1="'+from.x*S+'" y1="'+from.y*S+'" x2="'+ex*S+'" y2="'+ey*S+'" stroke="#fff" stroke-width="9" vector-effect="non-scaling-stroke" opacity=".8" pointer-events="none"/>'+
    '<line x1="'+from.x*S+'" y1="'+from.y*S+'" x2="'+ex*S+'" y2="'+ey*S+'" stroke="'+color+'" stroke-width="5" '+(dash?'stroke-dasharray="12 8" ':'')+'vector-effect="non-scaling-stroke" marker-end="url(#arB)" pointer-events="none"/>';
}
function renderTable(){
  var s=svg();if(!ST||s.getBoundingClientRect().width===0)return;
  if(!$('gStatic').firstChild)$('gStatic').innerHTML=staticTable();
  var k=pxK(), h=[], d=ST.draft, K=kind(), ids=liveBalls();
  var ai=aimInfo();
  if(K==='free'){
    var other=LAYER==='predict'?'actual':'predict';
    h.push(pathSvg(d[other],other==='predict'?'#1650d8':'#d0231a',other==='predict'?'arB':'arR',true));
    var col=LAYER==='predict'?'#1650d8':'#d0231a';
    h.push(pathSvg(d[LAYER],col,LAYER==='predict'?'arB':'arR',!!SIMV));
  }else if(ai&&(K==='sep'||cushAfter())){
    /* 분리각·1적구 뒤 쿠션: 조준선(흰 점선) + 맞는 자리(고스트) + 예측 방향
       🔒 답 보기 중엔 정답 두께로 그린다 — 아버지 두께로 그리면 굴러가는 정답 공과 어긋났다(v3 화면 확인) */
    var ANS=K==='cush'&&SIMV&&SIMV.info&&SIMV.info.answer&&SIMV.ai;
    var aiD=ANS?SIMV.ai:ai,c=ST.balls[ST.balls.cue],g=aiD.contact?aiD.contact.ghost:null;
    if(g){h.push('<line x1="'+c.x*S+'" y1="'+c.y*S+'" x2="'+g.x*S+'" y2="'+g.y*S+'" stroke="#fff" stroke-width="3" stroke-dasharray="8 7" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push(ballSvg(ST.balls.cue,g,k,false,true));
      h.push(bubble(g.x*S,g.y*S-BR*S,(ANS?'정답 두께 ':'두께 ')+thickTxt(aiD.contact.thick),ANS?'#0f8a33':'#11482a',k));}
    if(d.predObj)h.push(ray(ST.balls.r,d.predObj,2.2,'#1650d8',k,true));
    if(d.predCue&&g)h.push(ray(g,d.predCue,2.2,'#1650d8',k,true));
  }
  /* 🔁 원·투쿠션: 아버지가 찍은 쿠션 지점(파랑) · 정답 뒤엔 무회전 계산선(흰색) */
  if(K==='cush'){
    var S0=cushAfter()?(ai&&ai.contact?ai.contact.ghost:null):ST.balls[ST.balls.cue];
    if(S0&&d.cpts.length){var cp=[S0].concat(d.cpts.map(toCenter)).map(function(q){return q.x*S+','+q.y*S;}).join(' ');
      h.push('<polyline points="'+cp+'" fill="none" stroke="#fff" stroke-width="9" opacity=".7" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push('<polyline points="'+cp+'" fill="none" stroke="#1650d8" stroke-width="5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke" pointer-events="none"/>');}
    d.cpts.forEach(function(p,i){h.push(bubble(p.x*S,p.y*S,(i?'② ':'① ')+railVal(p),'#1650d8',k));});
    /* 🔒 무회전 계산선은 💡 답 보기 때만 — 쳐 보기에 그리면 "계산 8" 처럼 답이 새어 나갔다 */
    var SI=SIMV&&!SIMV.playing&&SIMV.info;
    if(SI&&SI.answer&&SI.sysPath){var sp=SI.sysPath.map(function(q){return q[0]*S+','+q[1]*S;}).join(' ');
      h.push('<polyline points="'+sp+'" fill="none" stroke="#222" stroke-width="9" opacity=".6" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push('<polyline points="'+sp+'" fill="none" stroke="#fff" stroke-width="4.5" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      SI.rails.forEach(function(r,i){var q={x:SI.sysPath[i+1][0],y:SI.sysPath[i+1][1]},rp=toRail(q,r);
        h.push(bubble(rp.x*S,rp.y*S,'계산 '+cval(q,r),'#222',k,r==='T'?'up':r==='B'?true:true));});}
  }
  /* 🔁 지금 문제의 시도들 — 수구가 실제 닿은 첫 쿠션(쿠션 먼저는 찍은 지점)에 번호 */
  if(K==='cush'&&d.tries&&d.tries.length){
    d.tries.forEach(function(tr){var p=d.ctype==='after'?(tr.actR[0]?railPt(tr.actR[0],tr.act[0]):null):tr.pt;if(!p)return;
      /* 🔒 빨간 원에 숫자는 빨간 공 ①②와 똑같아 보였다 → 마름모(빗나감 짙은 회색 · 맞음 초록) */
      var col=tr.hit?'#0f8a33':'#3a3a3a',rr=15*k,cx=p.x*S,cy=p.y*S;
      h.push('<polygon points="'+cx+','+(cy-rr)+' '+(cx+rr)+','+cy+' '+cx+','+(cy+rr)+' '+(cx-rr)+','+cy+'" fill="'+col+'" stroke="#fff" stroke-width="'+2.5*k+'" pointer-events="none"/>');
      h.push('<text x="'+p.x*S+'" y="'+(p.y*S+6*k)+'" text-anchor="middle" font-size="'+16*k+'" font-weight="900" fill="#fff" pointer-events="none">'+tr.no+'</text>');});
  }
  /* 시뮬레이션: 지나간 자리 + 지금 자리 */
  var pos={};ids.forEach(function(n){pos[n]=ST.balls[n];});
  if(SIMV&&SIMV.scan){
    /* 🎯 조준 부채꼴 — 초록 맞음 · 빨강 빗나감 · 주황 파울 · 회색 다른 공에 가림 */
    /* 빗나감은 옅게 — 진하면 판 전체가 붉게 덮여 초록 구간이 묻힌다(v2.2 화면 확인) */
    var CC={hit:'#19c24a',miss:'rgba(208,35,26,.16)',foul:'rgba(240,154,26,.7)',block:'rgba(120,120,120,.25)'},cu=ST.balls[ST.balls.cue];
    SIMV.scan.items.forEach(function(it){if(!it.res)return;
      var e=it.end||it.ghost||{x:cu.x+it.dir.x*0.8,y:cu.y+it.dir.y*0.8};
      h.push('<line x1="'+cu.x*S+'" y1="'+cu.y*S+'" x2="'+e.x*S+'" y2="'+e.y*S+'" stroke="'+CC[it.res]+'" stroke-width="'+(it.res==='hit'?3.5:1.5)+'" vector-effect="non-scaling-stroke" pointer-events="none"/>');});
    var bb=SIMV.scan.best;
    if(bb){var be=bb.end||bb.ghost;
      h.push('<line x1="'+cu.x*S+'" y1="'+cu.y*S+'" x2="'+be.x*S+'" y2="'+be.y*S+'" stroke="#fff" stroke-width="8" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push('<line x1="'+cu.x*S+'" y1="'+cu.y*S+'" x2="'+be.x*S+'" y2="'+be.y*S+'" stroke="#0f8a33" stroke-width="4" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push(bubble(be.x*S,be.y*S,'가운데',  '#0f8a33',k));}
  }else if(SIMV&&SIMV.multi){
    /* 💨 속도 비교: 수구 길 5개를 옅은 색 → 짙은 색으로 겹친다 */
    var PAL=['#d9c2f2','#b48ae0','#6a2bb0','#45157a','#220a3d'];
    SIMV.multi.forEach(function(o,j){var Fm=o.res.frames,cu=ST.balls.cue,pts=[];
      for(var i=0;i<Fm.length;i+=2){var q=Fm[i].p[cu];pts.push((q[0]/DM*S).toFixed(1)+','+(q[1]/DM*S).toFixed(1));}
      var L=Fm[Fm.length-1].p[cu];pts.push((L[0]/DM*S).toFixed(1)+','+(L[1]/DM*S).toFixed(1));
      h.push('<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+PAL[j]+'" stroke-width="'+(j===2?5:3.5)+'" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>');
      h.push(bubble(L[0]/DM*S,L[1]/DM*S,o.n+'단 '+(o.info.result==='hit'?'⭕':'❌'),PAL[Math.max(j,2)],k,true));});
  }else if(SIMV&&SIMV.res){
    var F=SIMV.res.frames,fi=simFrame();
    SIMV.ids.forEach(function(n){
      var pts=[],p0=F[0].p[n],moved=false;
      for(var i=0;i<=fi;i+=2){var q=F[i].p[n];pts.push((q[0]/DM*S).toFixed(1)+','+(q[1]/DM*S).toFixed(1));}
      var q=F[fi].p[n];pts.push((q[0]/DM*S).toFixed(1)+','+(q[1]/DM*S).toFixed(1));
      moved=Math.hypot(q[0]-p0[0],q[1]-p0[1])>0.005;
      if(moved){var tc=n===ST.balls.cue?SIMC:(n==='w'?'#ffffff':BCOL[n]);
        h.push('<polyline points="'+pts.join(' ')+'" fill="none" stroke="#11482a" stroke-width="'+(n===ST.balls.cue?9:7)+'" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".55" pointer-events="none"/>');
        h.push('<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+tc+'" stroke-width="'+(n===ST.balls.cue?5:3.5)+'" stroke-linejoin="round" '+(n===ST.balls.cue?'':'stroke-dasharray="10 6" ')+'vector-effect="non-scaling-stroke" pointer-events="none"/>');
        h.push(ballSvg(n,ST.balls[n],k,false,true));}
      pos[n]={x:q[0]/DM,y:q[1]/DM};
    });
    /* 분리각 정답 숫자 */
    if(K==='sep'&&!SIMV.playing&&SIMV.info&&!SIMV.info.none){
      var I=SIMV.info,fr=F[F.length-1].p;
      h.push(bubble(fr.r[0]/DM*S,fr.r[1]/DM*S,'1적구 '+Math.round(Math.abs(I.obj))+'°',SIMC,k,true));
      if(I.cue!=null)h.push(bubble(fr[ST.balls.cue][0]/DM*S,fr[ST.balls.cue][1]/DM*S,'수구 '+Math.round(Math.abs(I.cue))+'°',SIMC,k,true));
    }
  }
  ids.forEach(function(n){h.push(ballSvg(n,pos[n],k,MODE==='ball'&&!SIMV,false));});
  /* 쿠션 지점 숫자 */
  if(K==='free'&&!SIMV){var col2=LAYER==='predict'?'#1650d8':'#d0231a';d[LAYER].forEach(function(p){var v=railVal(p);if(v!==null)h.push(bubble(p.x*S,p.y*S,v,col2,k));});}
  /* 미리보기 */
  if(MODE==='draw'&&HOVER&&K==='free'){
    var colp=LAYER==='predict'?'#1650d8':'#d0231a',path=d[LAYER],last=path.length?resolve(path[path.length-1]):ballAt(ST.balls.cue);
    h.push('<line x1="'+last.x*S+'" y1="'+last.y*S+'" x2="'+HOVER.x*S+'" y2="'+HOVER.y*S+'" stroke="'+colp+'" stroke-width="4" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" pointer-events="none"/>');
    h.push('<circle cx="'+HOVER.x*S+'" cy="'+HOVER.y*S+'" r="'+10*k+'" fill="#fff" stroke="'+colp+'" stroke-width="'+4*k+'" pointer-events="none"/>');
    var v=railVal(HOVER);if(v!==null)h.push(bubble(HOVER.x*S,HOVER.y*S,v,colp,k));
  }
  if(MODE==='cpt'&&HOVER&&K==='cush'){
    var S1=d.cpts.length&&d.cpts.length<d.ncush?toCenter(d.cpts[d.cpts.length-1]):(cushAfter()?(ai&&ai.contact?ai.contact.ghost:null):ST.balls[ST.balls.cue]);
    var hq=toCenter(HOVER);
    if(S1)h.push('<line x1="'+S1.x*S+'" y1="'+S1.y*S+'" x2="'+hq.x*S+'" y2="'+hq.y*S+'" stroke="#1650d8" stroke-width="4" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" pointer-events="none"/>');
    h.push(bubble(HOVER.x*S,HOVER.y*S,railVal(HOVER),'#1650d8',k));
  }
  if((MODE==='pobj'||MODE==='pcue')&&HOVER&&K==='sep'&&ai){
    var from=MODE==='pobj'?ST.balls.r:(ai.contact?ai.contact.ghost:null);
    if(from)h.push(ray(from,HOVER,2.2,'#1650d8',k,true));
  }
  /* 손잡이 */
  if(MODE==='edit'&&K==='free'&&!SIMV){
    var colh=LAYER==='predict'?'#1650d8':'#d0231a';
    d[LAYER].forEach(function(p,i){if(i===0)return;var q=resolve(p);
      h.push('<circle class="hd" data-i="'+i+'" cx="'+q.x*S+'" cy="'+q.y*S+'" r="'+15*k+'" fill="'+(SEL===i?'#ff9f1a':p.ref?'rgba(255,255,255,.15)':'#fff')+'" stroke="'+colh+'" stroke-width="'+5*k+'" style="cursor:move"/>');
    });
  }
  $('gDyn').innerHTML=h.join('');
  s.setAttribute('class','m-'+(MODE==='pobj'||MODE==='pcue'||MODE==='cpt'?'draw':MODE));
}
function renderSeq(){
  if(kind()!=='free'){$('seq').innerHTML='';return;}
  var d=ST.draft,a=railSeq(d.predict),b=railSeq(d.actual),h=[];
  h.push('<span style="color:#1650d8">예측 쿠션 지점:</span> '+(a.length?'<b>'+a.join(' → ')+'</b>':'—'));
  if(d.actual.length)h.push('　<span style="color:#d0231a">실제:</span> '+(b.length?'<b>'+b.join(' → ')+'</b>':'—'));
  $('seq').innerHTML=h.join('');
}
function renderHint(){
  var el=$('hint');el.className='hint';
  if(SIMV){
    if(SIMV.playing){el.classList.add('run');el.textContent='▶ 굴러가는 중… (한 번 더 누르면 끝으로)';return;}
    var I=SIMV.info;el.classList.add(I.result==='hit'?'ok':I.result==='foul'?'foul':I.result==='cmp'?'run':I.none||I.result==='miss'?'bad':'run');
    el.textContent=I.text;
    if(SET&&SET.answered&&SET.board===CUR&&!SIMV.multi&&!SIMV.scan){var nb=document.createElement('button');nb.id='bNextQ';nb.className='primary';nb.style.marginLeft='.6rem';nb.style.flex='none';
      nb.innerHTML=SET.i>=SET.n?'📝 결과 보기':'다음 문제 ▶ ('+(SET.i+1)+'/'+SET.n+')';nb.addEventListener('click',nextQ);el.appendChild(nb);}
    if(I.answer&&I.best){var ab=document.createElement('button');ab.id='bApply';ab.className='primary';ab.style.marginLeft='.6rem';ab.style.flex='none';
      ab.innerHTML=I.best.pt?'이 지점으로 바꾸기':'이 두께로 바꾸기';ab.addEventListener('click',applyAnswer);el.appendChild(ab);}
    if(SIMV.scan&&SIMV.scan.best&&I.scan){var b=document.createElement('button');b.id='bUseBest';b.className='primary';b.style.marginLeft='.6rem';b.style.flex='none';
      b.innerHTML='▶ 가운데로 조준해 보기';b.addEventListener('click',useBest);el.appendChild(b);}
    return;
  }
  var t={
    ball:'지금: ✋ 공을 잡아 끌어서 옮기세요',
    draw:'지금: ✏️ '+(LAYER==='predict'?'예측선':'실제선')+' 긋는 중 — 첫 선 = 조준 · 쿠션을 차례로 클릭 → [긋기 끝]',
    edit:'지금: 🖐 동그라미를 끌어 옮기기 · 누르면 지우기 · 선을 누르면 점 추가',
    pobj:'지금: ① 1적구(빨간 공 ①)가 갈 방향을 클릭하세요',
    pcue:'지금: ② 수구가 맞은 뒤 갈 방향을 클릭하세요 → [▶ 정답 보기]',
    cpt:cushAfter()?'지금: 📍 2적구로 가려면 수구가 맞아야 할 쿠션 지점을 찍고('+ST.draft.ncush+'개) 📏 두께를 골라 [▶ 쳐 보기]'
                   :'지금: 📍 수구로 맞힐 쿠션 지점을 찍고 [▶ 쳐 보기]'+(ST.draft.ncush===2?' (두 번째 지점은 예측 — 안 찍어도 됨)':'')
  }[MODE];
  el.textContent=t||'';
}
function renderSimBtn(){
  var sep=kind()==='sep',tr=kind()!=='free';
  $('bSimT').textContent=SIMV&&SIMV.playing?'끝으로 건너뛰기':(kind()==='cush'?'쳐 보기':tr?'정답 보기':'시뮬레이션');
  $('bRec').classList.toggle('hide',kind()==='cush');   /* 🔁 판은 맞히거나 답을 보면 저절로 기록 */
  $('bSlow').classList.toggle('on',SLOW);
  /* 훈련 판은 [다음 두께 ▶]·[속도 비교]와 한 줄이라 글자를 줄인다 */
  var done=!!(SET&&SET.board===CUR&&SET.answered);   /* 세트는 정답을 보면 자동 기록 — 두 번 저장하지 않게 */
  $('bRec').disabled=done;
  $('bRec').innerHTML='<span class="ic">✅</span> '+(done?'기록됨':tr?'기록하기':'이 시도 기록하기');
}
function renderTools(){
  var K=kind();
  ['free','sep','cush'].forEach(function(x){document.body.classList.toggle('k-'+x,K===x);});
  var on=!!(SET&&SET.board===CUR);$('setChip').classList.toggle('hide',!on);$('bSet10').classList.toggle('hide',on);
  if(on)$('setNo').textContent=SET.i+' / '+SET.n;
  $('bNextT').classList.toggle('hide',on);   /* 세트 중엔 [다음 문제 ▶] 하나만 — [다음 두께]와 헷갈린다 */
  $('thkBox').classList.toggle('hide',K==='cush'&&!cushAfter());
  /* 1적구 뒤 쿠션: 조준 글자는 두께 버튼·판 위 말풍선과 같은 말이라 숨긴다(패널이 넘쳤다) */
  $('aimTxt').classList.toggle('hide',cushAfter());
  ['mBall','mDraw','mEdit','mObj','mCue','mCpt'].forEach(function(id){$(id).classList.toggle('on',$(id).dataset.m===MODE);});
  ['lPre','lAct'].forEach(function(id){$(id).classList.toggle('on',$(id).dataset.l===LAYER);});
  ['cW','cY'].forEach(function(id){$(id).classList.toggle('on',$(id).dataset.c===ST.balls.cue);});
  $('tBall').classList.toggle('hide',MODE!=='ball');
  $('tDraw').classList.toggle('hide',MODE==='ball');
  $('bDone').classList.toggle('hide',MODE!=='draw');
  $('bClear').innerHTML='<span class="ic">🧹</span> '+(K==='free'?'선 지우기':K==='cush'?'지점 지우기':'예측 지우기');
  $('bClear').disabled=K==='sep'?!(ST.draft.predObj||ST.draft.predCue):K==='cush'?!ST.draft.cpts.length:!ST.draft[LAYER].length;
  $('bUndo').disabled=!UNDO.length;$('bRedo').disabled=!REDO.length;
}
/* 탭 — 들어가는 만큼 전부 띄우고, 넘치면 뒤에서부터 [판 목록] 으로 넘긴다(지금 판은 늘 남긴다) */
function renderTabs(){
  var el=$('tabs'),n=BOARDS.length,show=BOARDS.slice();
  function draw(){
    el.innerHTML=show.map(function(b){return '<button data-id="'+b.id+'" class="'+(b.id===CUR?'on':'')+'">'+kindIc(b)+' '+esc(b.name)+'</button>';}).join('');
    var rest=n-show.length;
    $('bMore').innerHTML='<span class="ic">📂</span> 판 목록'+(rest>0?' (외 '+rest+'개)':'');
  }
  draw();
  while(show.length>1&&el.scrollWidth>el.clientWidth+1){
    var i=show.length-1;if(show[i].id===CUR)i--;
    show.splice(i,1);draw();
  }
  var b=curBoard();$('bName').textContent=b?b.name:'';
  document.querySelectorAll('#stepGrp button').forEach(function(x){x.classList.toggle('on',+x.dataset.st===STEP);});
}
function renderSide(){
  var d=ST.draft;
  document.querySelectorAll('#tipGuide button').forEach(function(x){x.classList.toggle('on',x.dataset.g===GUIDE);});
  renderTip();
  $('spd').innerHTML=SPEEDS.map(function(t,i){return '<button data-s="'+(i+1)+'" class="'+(d.speed===i+1&&d.kmh==null?'on':'')+'"><b>'+(i+1)+'</b><span>'+t+'</span></button>';}).join('');
  if(document.activeElement!==$('kmh'))$('kmh').value=d.kmh==null?'':d.kmh;
  var tb=function(e){return '<button data-t="'+e+'" class="'+(d.thick===e?'on':'')+'" title="'+(e===8?'정면':e===4?'반 두께':'')+'">'+e+'/8</button>';};
  $('thk').innerHTML='<button class="lr'+(d.side==='L'?' on':'')+'" data-lr="L">◐ 공 왼쪽</button>'+[1,2,3,4].map(tb).join('')+
    '<button class="lr'+(d.side==='R'?' on':'')+'" data-lr="R">◑ 공 오른쪽</button>'+[5,6,7,8].map(tb).join('');
  $('aimTxt').textContent=aimText();
  document.querySelectorAll('#ctype button').forEach(function(x){x.classList.toggle('on',x.dataset.ct===d.ctype);});
  document.querySelectorAll('#ncush button').forEach(function(x){x.classList.toggle('on',+x.dataset.n===d.ncush);});
  renderSimBtn();
}
function renderAll(){if(!ST)return;renderTabs();renderTools();renderHint();renderSeq();renderSide();renderTable();}

/* ═════════ 당점 ═════════ */
function tipDesc(t){
  if(!t)return ['정중앙 (안 정함)','무회전'];
  var d=Math.hypot(t.x,t.y);
  if(d<0.12)return ['정중앙','무회전'];
  var hr=Math.round(Math.atan2(t.x,-t.y)/(2*Math.PI)*12);hr=((hr%12)+12)%12;if(hr===0)hr=12;
  var tips=Math.min(3,Math.max(0.5,Math.round(d*3*2)/2));
  var parts=[];
  if(t.y<-0.25)parts.push('위 (밀어치기)');else if(t.y>0.25)parts.push('아래 (끌어치기)');
  if(t.x<-0.25)parts.push('왼쪽 회전');else if(t.x>0.25)parts.push('오른쪽 회전');
  return [hr+'시 방향 · '+tips+'팁',parts.join(' · ')];
}
function renderTip(){
  var h=['<circle cx="0" cy="0" r="100" fill="#fbfbf5" stroke="#222" stroke-width="3"/>'];
  var g='stroke="#9a9a9a" stroke-width="1.6"';
  if(GUIDE==='cross'){
    h.push('<line x1="-100" y1="0" x2="100" y2="0" '+g+'/><line x1="0" y1="-100" x2="0" y2="100" '+g+'/>');
    h.push('<circle r="33.3" fill="none" '+g+' stroke-dasharray="4 4"/><circle r="66.6" fill="none" '+g+' stroke-dasharray="4 4"/>');
  }else{
    var n=GUIDE==='c12'?12:16;
    for(var i=0;i<n;i++){var a=i/n*2*Math.PI;h.push('<line x1="0" y1="0" x2="'+(Math.sin(a)*100).toFixed(1)+'" y2="'+(-Math.cos(a)*100).toFixed(1)+'" '+g+'/>');}
    if(n===12)for(i=1;i<=12;i++){var b=i/12*2*Math.PI;h.push('<text x="'+(Math.sin(b)*109).toFixed(1)+'" y="'+(-Math.cos(b)*109+5).toFixed(1)+'" text-anchor="middle" font-size="14" font-weight="700" fill="#444">'+i+'</text>');}
    h.push('<circle r="4" fill="#222"/>');
  }
  var t=ST.draft.tip;
  if(t)h.push('<circle cx="'+t.x*100+'" cy="'+t.y*100+'" r="13" fill="#d0231a" stroke="#fff" stroke-width="3"/>');
  $('tip').innerHTML=h.join('');
  var ds=tipDesc(t);$('tipTxt').textContent=ds[0];$('tipTxt2').textContent=ds[1];
}
function setTip(t){pushUndo();ST.draft.tip=t;saveSoon();renderAll();}

/* ═════════ 마우스 — 당구대 ═════════ */
function segHit(p,path){
  var k=pxK()/S, tol=12*k, best=null;
  for(var i=0;i<path.length-1;i++){
    var a=resolve(path[i]),b=resolve(path[i+1]);
    var dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy;if(!L)continue;
    var t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/L,0,1);
    var d=Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
    if(d<tol&&(!best||d<best.d))best={i:i,d:d};
  }
  return best;
}
function handleAt(p){
  var k=pxK()/S, r=20*k, path=ST.draft[LAYER], best=null;
  for(var i=1;i<path.length;i++){var d=dist(p,resolve(path[i]));if(d<r&&(!best||d<best.d))best={i:i,d:d};}
  return best?best.i:null;
}
function ballHit(p){
  var k=pxK()/S, r=Math.max(BR*1.5,20*k), best=null;
  liveBalls().forEach(function(n){var d=dist(p,ST.balls[n]);if(d<r&&(!best||d<best.d))best={n:n,d:d};});
  return best?best.n:null;
}
function onDown(e){
  if(e.button!==0||!ST)return;
  var p=evPt(e);hidePop();
  if(SIMV&&!SIMV.playing&&MODE!=='ball'){clearSim();renderAll();}
  if(MODE==='ball'){
    var n=ballHit(p);if(!n)return;
    DRAG={type:'ball',n:n,moved:false,start:snap()};svg().setPointerCapture(e.pointerId);e.preventDefault();
  }else if(MODE==='draw'){
    var q=snapPt(p),path=ST.draft[LAYER];
    pushUndo();
    if(!path.length)path.push({ref:'cue'});
    var last=resolve(path[path.length-1]);
    if(dist(last,resolve(q))<0.01)return;         /* 같은 곳 두 번 = 무시 */
    path.push(q);saveSoon();renderSeq();renderTools();renderSide();renderTable();
  }else if(MODE==='edit'){
    var i=handleAt(p);
    if(i!==null){DRAG={type:'pt',i:i,moved:false,start:snap(),x0:e.clientX,y0:e.clientY};svg().setPointerCapture(e.pointerId);e.preventDefault();return;}
    var sg=segHit(p,ST.draft[LAYER]);
    if(sg){pushUndo();var np=snapPt(p);if(np.ref)np={x:np.x,y:np.y};
      ST.draft[LAYER].splice(sg.i+1,0,np);SEL=sg.i+1;
      DRAG={type:'pt',i:sg.i+1,moved:false,start:null,x0:e.clientX,y0:e.clientY};svg().setPointerCapture(e.pointerId);
      saveSoon();renderSeq();renderTools();renderSide();renderTable();e.preventDefault();return;}
    SEL=null;renderTable();
  }else if(MODE==='cpt'){
    /* 📍 쿠션 지점 — 원쿠션 1개 · 투쿠션 2개. 다 찍었는데 또 누르면 처음부터 다시 */
    pushUndo();var rp=snapRail(p),cs=ST.draft.cpts;
    if(cs.length>=ST.draft.ncush)cs.length=0;
    cs.push(rp);saveSoon();renderAll();
  }else if(MODE==='pobj'||MODE==='pcue'){
    pushUndo();var pt={x:r2(p.x),y:r2(p.y)};
    if(MODE==='pobj'){ST.draft.predObj=pt;MODE='pcue';}
    else ST.draft.predCue=pt;
    saveSoon();renderAll();
  }
}
function onMove(e){
  if(!ST)return;
  var p=evPt(e);
  if(DRAG&&DRAG.type==='ball'){
    var n=DRAG.n,nx=clamp(p.x,BR,W-BR),ny=clamp(p.y,BR,H-BR);
    var ok=liveBalls().every(function(o){return o===n||dist({x:nx,y:ny},ST.balls[o])>=BR*2;});
    if(ok){if(!DRAG.moved)clearSim();ST.balls[n]={x:r2(nx),y:r2(ny)};DRAG.moved=true;renderTable();$('aimTxt').textContent=aimText();}
    return;
  }
  if(DRAG&&DRAG.type==='pt'){
    if(!DRAG.moved&&Math.hypot(e.clientX-DRAG.x0,e.clientY-DRAG.y0)<4)return;
    if(!DRAG.moved)clearSim();
    DRAG.moved=true;var q=snapPt(p);ST.draft[LAYER][DRAG.i]=q;SEL=DRAG.i;renderSeq();renderTable();$('aimTxt').textContent=aimText();return;
  }
  if(MODE==='draw'){HOVER=snapPt(p);renderTable();}
  else if(MODE==='pobj'||MODE==='pcue'){HOVER=p;renderTable();}
  else if(MODE==='cpt'){HOVER=snapRail(p);renderTable();}
}
function onUp(e){
  if(!DRAG)return;
  var d=DRAG;DRAG=null;
  try{svg().releasePointerCapture(e.pointerId);}catch(x){}
  if(d.type==='ball'){if(d.moved){UNDO.push(d.start);REDO=[];if(kind()==='cush')resetTries();saveSoon();renderAll();}return;}
  if(d.type==='pt'){
    if(d.moved){if(d.start){UNDO.push(d.start);REDO=[];}saveSoon();renderAll();}
    else{SEL=d.i;renderTable();showPop(d.i);}
  }
}
function onLeave(){if(HOVER){HOVER=null;renderTable();}}
function showPop(i){
  var q=resolve(ST.draft[LAYER][i]),s=svg(),pt=s.createSVGPoint();pt.x=q.x*S;pt.y=q.y*S;
  var sc=pt.matrixTransform(s.getScreenCTM());
  var pop=$('ptPop');pop.classList.remove('hide');
  var w=pop.offsetWidth,h=pop.offsetHeight;
  pop.style.left=clamp(sc.x-w/2,8,window.innerWidth-w-8)+'px';
  pop.style.top=clamp(sc.y+28,8,window.innerHeight-h-8)+'px';
}
function hidePop(){$('ptPop').classList.add('hide');}
function delPoint(){
  if(SEL===null)return;pushUndo();ST.draft[LAYER].splice(SEL,1);
  if(ST.draft[LAYER].length<2)ST.draft[LAYER]=[];
  SEL=null;hidePop();saveSoon();renderAll();
}
function setMode(m){MODE=m;SEL=null;HOVER=null;hidePop();if(SIMV&&!SIMV.playing)clearSim();renderAll();}
function doneDraw(){setMode(ST.draft[LAYER].length?'edit':'ball');}
function clearLayer(){
  if(kind()==='cush'){if(!ST.draft.cpts.length)return;pushUndo();ST.draft.cpts=[];MODE='cpt';saveSoon();renderAll();return;}
  if(kind()==='sep'){if(!(ST.draft.predObj||ST.draft.predCue))return;pushUndo();ST.draft.predObj=null;ST.draft.predCue=null;MODE='pobj';saveSoon();renderAll();return;}
  if(!ST.draft[LAYER].length)return;
  confirmBox('🧹 이 선을 지울까요?',(LAYER==='predict'?'예측 선(파랑)':'실제 간 길(빨강)')+'을 모두 지웁니다. [↶ 되돌리기]로 다시 살릴 수 있습니다.','지우기',true).then(function(ok){
    if(!ok)return;pushUndo();ST.draft[LAYER]=[];SEL=null;saveSoon();renderAll();
  });
}
/* 📐 다음 두께 — 1/8 → 2/8 → … → 8/8 → 1/8. 예측은 비우고 ① 부터 */
function nextThick(){pushUndo();var d=ST.draft;d.thick=d.thick>=8?1:d.thick+1;d.predObj=null;d.predCue=null;MODE='pobj';saveSoon();renderAll();}

/* ═════════ 시도 기록 ═════════ */
function pathOut(path){return path.map(function(p){var q=resolve(p);var o={x:r2(q.x),y:r2(q.y)};if(p.rail)o.rail=true;if(p.ref)o.ref=p.ref;return o;});}
/* 기록에 남길 시뮬레이션 요약 — 경로는 3프레임마다, 다이아 단위 소수 2자리 */
function simOut(sv){
  var F=sv.res.frames,paths={};
  sv.ids.forEach(function(n){var a=[];for(var i=0;i<F.length;i+=3)a.push([r2(F[i].p[n][0]/DM),r2(F[i].p[n][1]/DM)]);
    var L=F[F.length-1].p[n];a.push([r2(L[0]/DM),r2(L[1]/DM)]);paths[n]=a;});
  var o=clone(sv.info);o.v=2;o.V=r2(speedMs());o.paths=paths;o.aim=[r2(sv.ai.dir.x),r2(sv.ai.dir.y)];o.feel=clone(FEEL);
  if(SET&&SET.board===CUR)o.set={id:SET.id,no:SET.i};
  if(kind()==='cush'){var dd=ST.draft;o.ctype=dd.ctype;o.cpts=clone(dd.cpts);o.tries=clone(dd.tries||[]);o.triesN=(dd.tries||[]).length;o.solvedBy=dd.solved||null;o.n=dd.ncush;o.thick=dd.thick;o.side=dd.side;}
  return o;
}
function record(){
  var d=ST.draft,b=curBoard(),K=kind();if(!b)return;
  if(!aimInfo()&&!(K==='cush'&&SIMV&&SIMV.res)){runSim();return;}   /* 조준이 없으면 같은 안내(🔁 답 보기는 답의 공으로 기록) */
  if(!(K==='cush'&&SIMV&&SIMV.res)&&(!SIMV||SIMV.playing||SIMV.multi||SIMV.scan)){var sv=computeSim();sv.t=sv.T;SIMV=sv;renderAll();}
  var info=SIMV.info, simData=simOut(SIMV);
  function save(result,memo){
    var row={board_id:b.id,kind:K,balls:clone(ST.balls),predict:K==='free'?pathOut(d.predict):[],actual:K==='free'&&d.actual.length>1?pathOut(d.actual):null,
      tip:d.tip,speed:d.kmh!=null?null:d.speed,kmh:d.kmh,result:result,memo:(memo||'').trim()||null,sim:simData};
    $('bRec').disabled=true;
    SB.from('bb_attempts').insert(row).select().single().then(function(r){
      $('bRec').disabled=false;renderSimBtn();
      if(r.error||!r.data){toast('⚠ 기록하지 못했습니다 — 인터넷을 확인해 주세요');return;}
      logEvent('attempt.save',b.id,{name:b.name,result:result,sim:info.result||null,kind:K});
      if(K==='free'){pushUndo();d.memo='';d.actual=[];if(LAYER==='actual')LAYER='predict';saveSoon();renderAll();}
      SB.from('bb_attempts').select('id').eq('board_id',b.id).is('deleted_at',null).then(function(c){
        var n=(c&&c.data)?c.data.length:null;
        toast('✅ 기록했습니다'+(n?' — 이 판의 '+n+'번째':''));
      });
    },function(){$('bRec').disabled=false;renderSimBtn();toast('⚠ 기록하지 못했습니다 — 인터넷을 확인해 주세요');});
  }
  if(K!=='free'){save(null,'');return;}
  modal({title:'✅ 이 시도 기록하기',html:'<p>시뮬레이션: <b>'+esc(info.text)+'</b></p><p style="margin-top:.8rem;font-weight:700">실제로 쳐 보셨나요?</p>',
    input:{value:'',max:200,placeholder:'메모 (예: 조금 얇았다)'},noFocus:true,
    buttons:[{label:'아직 안 쳐봄',value:'none'},{label:'⚠ 파울',value:'foul'},{label:'❌ 실패',value:'miss'},{label:'⭕ 득점',value:'hit',cls:'hitb'}]}).then(function(r){
    if(r.value==null)return;save(r.value==='none'?null:r.value,r.text);
  });
}

/* ═════════ 기록 화면 ═════════ */
function openLog(){
  if(saveTimer)flush();
  clearSim();
  $('workv').classList.add('hide');$('logv').classList.remove('hide');hidePop();
  var opts='<option value="">전체</option>'+BOARDS.map(function(b){return '<option value="'+b.id+'">'+kindIc(b)+' '+esc(b.name)+'</option>';}).join('');
  $('lBoard').innerHTML=opts;$('lBoard').value=LOGBOARD&&BOARDS.some(function(b){return b.id===LOGBOARD;})?LOGBOARD:'';
  loadLog();
}
function closeLog(){$('logv').classList.add('hide');$('workv').classList.remove('hide');renderAll();}
function boardName(id){var b=BOARDS.filter(function(x){return x.id===id;})[0];return b?b.name:'(지운 판)';}
function loadLog(){
  LOGBOARD=$('lBoard').value;
  ['vAtt','vTrend','vEvt'].forEach(function(id){$(id).classList.toggle('on',$(id).dataset.v===LOGVIEW);});
  $('logBody').innerHTML='<div class="empty">불러오는 중…</div>';
  if(LOGVIEW==='att'||LOGVIEW==='trend'){
    var q=SB.from('bb_attempts').select('*').is('deleted_at',null);
    if(LOGBOARD)q=q.eq('board_id',LOGBOARD);
    q.order('created_at',{ascending:false}).limit(1000).then(function(r){
      if(r.error){$('logBody').innerHTML='<div class="empty">⚠ 불러오지 못했습니다</div>';return;}
      ATTS=r.data||[];if(LOGVIEW==='trend')renderTrend();else renderAttempts();
    });
  }else{
    var e=SB.from('bb_events').select('*');
    if(LOGBOARD)e=e.eq('board_id',LOGBOARD);
    e.order('at',{ascending:false}).limit(500).then(function(r){
      if(r.error){$('logBody').innerHTML='<div class="empty">⚠ 불러오지 못했습니다</div>';return;}
      EVTS=r.data||[];renderEvents();
    });
  }
}
function pct(a,b){return b?Math.round(a/b*100)+'%':'—';}
function avg(a){return a.length?Math.round(a.reduce(function(s,x){return s+x;},0)/a.length*10)/10:null;}
function resTag(r){return r==='hit'?'<span class="tag hit">⭕ 득점</span>':r==='miss'?'<span class="tag miss">❌ 실패</span>':r==='foul'?'<span class="tag foul">⚠ 파울</span>':'<span class="tag none">안 적음</span>';}
function simTag(a){
  var s=a.sim;if(!s)return '<span class="tag none">—</span>';
  if(a.kind==='cush')return resTag(s.result==='hit'?'hit':'miss').replace('득점','맞음')+(s.sys?' <small>계산 '+s.sys.join(' → ')+'</small>':'');
  if(a.kind==='sep')return s.none?'<span class="tag miss">못 맞힘</span>':'<span class="tag sim">1적구 '+Math.round(Math.abs(s.obj))+'° · 수구 '+(s.cue==null?'멈춤':Math.round(Math.abs(s.cue))+'°')+'</span>';
  return resTag(s.result);
}
function renderAttempts(){
  var A=ATTS,h=[];
  var F=A.filter(function(a){return a.kind==='free'||!a.kind;}),P=A.filter(function(a){return a.kind==='sep';}),C=A.filter(function(a){return a.kind==='cush';});
  if(F.length){
    var sh=F.filter(function(a){return a.sim&&a.sim.result==='hit';}).length;
    var real=F.filter(function(a){return a.result;}),rh=real.filter(function(a){return a.result==='hit';}).length;
    var both=F.filter(function(a){return a.result&&a.sim&&a.sim.result;}),agree=both.filter(function(a){return a.result===a.sim.result;}).length;
    h.push('<h3>🎱 자유 연습</h3><div class="stats">'+
      '<div class="stat"><div class="k">시도</div><div class="v">'+F.length+'번</div></div>'+
      '<div class="stat"><div class="k">시뮬레이션 득점률</div><div class="v" style="color:'+SIMC+'">'+pct(sh,F.length)+'</div></div>'+
      '<div class="stat"><div class="k">실제 득점률 <small>(쳐 본 '+real.length+'번 중)</small></div><div class="v" style="color:#0d3aa3">'+pct(rh,real.length)+'</div></div>'+
      '<div class="stat"><div class="k">시뮬레이션과 실제가 같았던 비율 <small>('+both.length+'번 중)</small></div><div class="v">'+pct(agree,both.length)+'</div></div></div>');
  }
  if(P.length){
    var eo=P.map(function(a){return a.sim&&a.sim.eObj;}).filter(function(x){return x!=null;});
    var ec=P.map(function(a){return a.sim&&a.sim.eCue;}).filter(function(x){return x!=null;});
    h.push('<h3>📐 분리각 훈련</h3><div class="stats">'+
      '<div class="stat"><div class="k">문제</div><div class="v">'+P.length+'번</div></div>'+
      '<div class="stat"><div class="k">1적구 평균 오차 <small>(예측한 '+eo.length+'번)</small></div><div class="v">'+(avg(eo)==null?'—':avg(eo)+'°')+'</div></div>'+
      '<div class="stat"><div class="k">수구 평균 오차 <small>(예측한 '+ec.length+'번)</small></div><div class="v">'+(avg(ec)==null?'—':avg(ec)+'°')+'</div></div>'+
      '<div class="stat"><div class="k">오차 5° 이내</div><div class="v">'+pct(eo.concat(ec).filter(function(x){return x<=5;}).length,eo.length+ec.length)+'</div></div></div>');
  }
  if(C.length){
    var cf=C.filter(function(a){return a.sim&&a.sim.ctype==='first';}),ca=C.filter(function(a){return a.sim&&a.sim.ctype==='after';});
    var errs=function(L){var o=[];L.forEach(function(a){(a.sim.err||[]).forEach(function(x){if(x!=null)o.push(x);});});return o;};
    var okc=C.filter(function(a){return a.sim&&a.sim.result==='hit';}).length;
    h.push('<h3>🔁 원·투쿠션 훈련</h3><div class="stats">'+
      '<div class="stat"><div class="k">문제</div><div class="v">'+C.length+'번</div></div>'+
      '<div class="stat"><div class="k">시뮬레이션에서 맞은 비율</div><div class="v" style="color:'+SIMC+'">'+pct(okc,C.length)+'</div></div>'+
      '<div class="stat"><div class="k">쿠션 먼저 — 무회전 계산과 평균 차이 <small>('+cf.length+'번)</small></div><div class="v">'+(avg(errs(cf))==null?'—':avg(errs(cf)))+'</div></div>'+
      '<div class="stat"><div class="k">1적구 뒤 — 쿠션 지점 예측 평균 오차 <small>('+ca.length+'번)</small></div><div class="v">'+(avg(errs(ca))==null?'—':avg(errs(ca)))+'</div></div></div>');
  }
  if(!A.length){$('logBody').innerHTML='<div class="empty">아직 기록한 시도가 없습니다.<br>당구대에서 [▶] 로 쳐 보고 [✅ 이 시도 기록하기]를 누르면 여기에 쌓입니다.</div>';return;}
  h.push('<table class="t"><tr><th>날짜</th><th>판</th><th>조건</th><th>시뮬레이션</th><th>실제 · 오차</th><th>메모</th></tr>');
  A.forEach(function(a,i){
    var s=a.sim||{},cond;
    if(a.kind==='sep')cond='두께 '+(s.thick?s.thick+'/8 '+(s.side==='R'?'오른쪽':'왼쪽'):'—');
    else if(a.kind==='cush')cond=(s.ctype==='after'?'1적구 뒤 '+s.thick+'/8':'쿠션 먼저')+' · '+(s.n===2?'투쿠션':'원쿠션')+' · 찍은 지점 '+((s.dad||[]).join(' → ')||'—');
    else cond=s.first?BNAME[s.first.ball]+' '+thickTxt(s.first.thick):(railSeq(a.predict||[]).join(' → ')||'—');
    cond+=' · '+esc(tipDesc(a.tip)[0])+' · '+(a.kmh!=null?a.kmh+'km/h':a.speed?'속도 '+a.speed:'—');
    var real=a.kind==='cush'&&s.triesN!=null?(s.solvedBy==='self'?'<span class="tag hit">⭕ '+s.triesN+'번 만에</span>':'<span class="tag none">답 봄 ('+s.triesN+'번 시도)</span>'):a.kind==='cush'?((s.err||[]).some(function(x){return x!=null;})?(s.ctype==='after'?'예측 오차 ':'계산과 차이 ')+s.err.map(function(x){return x==null?'—':x;}).join(', '):'<span class="tag none">—</span>'):a.kind==='sep'?(s.eObj!=null||s.eCue!=null?'1적구 '+(s.eObj==null?'—':s.eObj+'°')+' · 수구 '+(s.eCue==null?'—':s.eCue+'°'):'<span class="tag none">예측 없음</span>'):resTag(a.result);
    h.push('<tr class="click" data-i="'+i+'"><td class="num">'+fmtDT(a.created_at)+'</td><td>'+(KINDS[a.kind]||KINDS.free).ic+' '+esc(boardName(a.board_id))+'</td>'+
      '<td>'+cond+'</td><td>'+simTag(a)+'</td><td class="num">'+real+'</td><td>'+esc(a.memo||'')+'</td></tr>');
  });
  h.push('</table>');
  if(A.length>=1000)h.push('<p>최근 1,000번만 보여 줍니다.</p>');
  $('logBody').innerHTML=h.join('');
  $('logBody').querySelectorAll('tr.click').forEach(function(tr){tr.addEventListener('click',function(){openAttempt(ATTS[+tr.dataset.i]);});});
}
function miniSvg(a){
  var bl=a.balls||defaultBalls(),s=a.sim||{};
  function line(path,col,w){if(!path||path.length<2)return '';var pts=path.map(function(p){return Array.isArray(p)?p[0]*S+','+p[1]*S:p.x*S+','+p.y*S;}).join(' ');
    return '<polyline points="'+pts+'" fill="none" stroke="#fff" stroke-width="'+(w+5)+'" stroke-linejoin="round" opacity=".7"/><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linejoin="round"/>';}
  var h='<svg class="mini" viewBox="-94 -94 988 588" xmlns="http://www.w3.org/2000/svg">'+staticTable();
  if(s.paths)Object.keys(s.paths).forEach(function(n){h+=line(s.paths[n],n===bl.cue?SIMC:(n==='w'?'#fff':BCOL[n]),n===bl.cue?7:4);});
  h+=line(a.predict,'#1650d8',6)+line(a.actual,'#d0231a',6);
  if(s.sysPath)h+=line(s.sysPath,'#fff',4);
  var ids=a.kind==='sep'||(a.kind==='cush'&&s.ctype!=='after')?[bl.cue,'r']:a.kind==='cush'?[bl.cue,'r','r2']:['r','r2','y','w'];
  ids.forEach(function(n){if(!bl[n])return;
    h+='<circle cx="'+bl[n].x*S+'" cy="'+bl[n].y*S+'" r="'+BR*S+'" fill="'+BCOL[n]+'" stroke="#222" stroke-width="2"/>';});
  return h+'</svg>';
}
function openAttempt(a){
  var tp=tipDesc(a.tip),s=a.sim||{},seq=railSeq(a.predict||[]),aseq=railSeq(a.actual||[]);
  var rows='<tr><th>날짜</th><td>'+fmtDT(a.created_at)+'</td><th>판</th><td>'+esc(boardName(a.board_id))+'</td></tr>'+
    '<tr><th>당점</th><td>'+esc(tp[0])+(tp[1]?' <small>('+esc(tp[1])+')</small>':'')+'</td><th>속도</th><td>'+(a.kmh!=null?a.kmh+'km/h':a.speed?a.speed+' '+SPEEDS[a.speed-1]:'—')+'</td></tr>'+
    '<tr><th>시뮬레이션</th><td colspan="3"><b>'+esc(s.text||'—')+'</b></td></tr>';
  if(a.kind!=='sep')rows+='<tr><th>예측 쿠션</th><td style="color:#1650d8"><b>'+(seq.join(' → ')||'—')+'</b></td><th>실제</th><td>'+resTag(a.result)+(aseq.length?' <span style="color:#d0231a">'+aseq.join(' → ')+'</span>':'')+'</td></tr>';
  rows+='<tr><th>메모</th><td colspan="3">'+esc(a.memo||'')+'</td></tr>';
  var alive=BOARDS.some(function(b){return b.id===a.board_id;});
  modal({title:'🎯 지난 시도 보기',wide:true,html:miniSvg(a)+'<table class="t">'+rows+'</table>',buttons:[
    {label:'<span class="ic">🗑</span> 이 기록 지우기',value:'del',cls:'danger'},
    {label:'닫기',value:null},
    {label:'<span class="ic">🔁</span> 이 조건으로 다시 해보기',value:'again',cls:'primary'}]}).then(function(r){
    if(r.value==='again')replay(a,alive);
    else if(r.value==='del')delAttempt(a);
  });
}
function replay(a,alive){
  if(alive&&a.board_id!==CUR)switchBoard(a.board_id);
  else if(!alive)toast('그 판은 지워져서, 지금 보던 판에 불러옵니다');
  pushUndo();
  ST.balls=Object.assign(defaultBalls(),clone(a.balls||{}));
  var s=a.sim||{},d=emptyDraft();
  d.predict=clone(a.predict||[]);d.tip=a.tip?clone(a.tip):null;d.speed=a.speed||3;d.kmh=a.kmh;
  if(a.kind==='sep'||a.kind==='cush'){d.thick=s.thick||4;d.side=s.side||'L';}
  if(a.kind==='cush'){d.ctype=s.ctype||'first';d.ncush=s.n||1;d.cpts=clone(s.cpts||[]);}
  ST.draft=d;LAYER='predict';MODE={sep:'pobj',cush:'cpt'}[kind()]||'edit';saveSoon();closeLog();toast('🔁 그때 조건을 불러왔습니다');
}
function delAttempt(a){
  confirmBox('🗑 이 기록을 지울까요?','휴지통으로 옮깁니다. '+KEEP_DAYS+'일 안에는 다시 살릴 수 있습니다.','지우기',true).then(function(ok){
    if(!ok)return;
    SB.from('bb_attempts').update({deleted_at:new Date().toISOString()}).eq('id',a.id).then(function(x){
      if(x&&x.error){toast('⚠ 지우지 못했습니다');return;}
      logEvent('attempt.delete',a.board_id,{name:boardName(a.board_id),at:a.created_at});
      toast('기록을 휴지통으로 옮겼습니다');loadLog();
    });
  });
}
function evtText(e){
  var p=e.payload||{};
  switch(e.kind){
    case 'board.create': return '새 판 ‘'+p.name+'’을 만들었습니다'+(KINDS[p.kind]&&p.kind!=='free'?' ('+KINDS[p.kind].ic+' '+KINDS[p.kind].name+')':'');
    case 'board.rename': return '판 이름을 ‘'+p.from+'’ → ‘'+p.to+'’(으)로 바꿨습니다';
    case 'board.copy': return '‘'+p.from+'’을 복제해 ‘'+p.name+'’을 만들었습니다';
    case 'board.delete': return '‘'+p.name+'’을 휴지통으로 옮겼습니다';
    case 'board.restore': return '‘'+p.name+'’을 휴지통에서 살렸습니다';
    case 'attempt.save': return '‘'+p.name+'’에 '+(p.kind==='sep'?'분리각 문제를':p.kind==='cush'?'쿠션 문제를':'시도를')+' 기록했습니다'+(p.result==='hit'?' (⭕ 득점)':p.result==='miss'?' (❌ 실패)':p.result==='foul'?' (⚠ 파울)':'');
    case 'attempt.delete': return '‘'+p.name+'’의 기록을 휴지통으로 옮겼습니다';
    case 'attempt.restore': return '기록을 휴지통에서 살렸습니다';
    case 'password.change': return '비밀번호를 바꿨습니다';
    case 'feel.change': return '테이블 감각을 바꿨습니다 ('+p.text+')';
  }
  return e.kind;
}
function renderEvents(){
  if(!EVTS.length){$('logBody').innerHTML='<div class="empty">아직 변경 이력이 없습니다.</div>';return;}
  $('logBody').innerHTML='<table class="t"><tr><th style="width:18rem">언제</th><th>무엇을</th></tr>'+
    EVTS.map(function(e){return '<tr><td class="num">'+fmtDT(e.at)+'</td><td>'+esc(evtText(e))+'</td></tr>';}).join('')+'</table>'+
    (EVTS.length>=500?'<p>최근 500개만 보여 줍니다.</p>':'');
}

/* ═════════ 📈 실력 추이 (v2.4) ═════════
   날짜별 평균 오차 선 그래프 + 약점 분석 표 + 세트 기록.
   🔒 차트 규칙(dataviz): 한 축 · 범주 색은 고정 순서(파랑 #2a78d6 → 주황 #eb6834, 색각 검사 통과) ·
      글자는 먹색(선 색으로 쓰지 않음) · 범례 + 끝점 직접 표시 · 마우스 올리면 그날 값 · [표로 보기] */
var SERIES=['#2a78d6','#eb6834'];
function dayKey(t){var d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dayLab(k){var p=k.split('-');return (+p[1])+'/'+(+p[2]);}
function mean(a){return a.length?a.reduce(function(s,x){return s+x;},0)/a.length:null;}
function r1(v){return v==null?null:Math.round(v*10)/10;}
/* 기록 → 날짜별로 묶어 series 마다 평균 */
function daily(A,fns){
  var days={},keys=[];
  A.forEach(function(a){var k=dayKey(a.created_at);if(!days[k]){days[k]=[];keys.push(k);}days[k].push(a);});
  keys.sort();
  return {keys:keys,series:fns.map(function(f){return keys.map(function(k){var v=[];days[k].forEach(function(a){var x=f(a);if(x!=null)v.push(x);});return {y:r1(mean(v)),n:v.length};});})};
}
var CH=[];   /* 그린 차트들(마우스 올림용) */
function niceMax(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p;return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;}
function lineChart(o){ /* o:{title,unit,names[],keys[],series[[{y,n}]],max?,w} */
  /* 🔒 그림 단위 = 실제 화면 px (o.w = 들어갈 칸 너비). viewBox 를 고정하면 칸 너비에 따라 글자가 들쭉날쭉했다(v2.4 화면 확인) */
  var fs=Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize)*0.8);
  var Wd=Math.max(420,Math.round(o.w||900)),Ht=fs*13,L=fs*3.6,R=fs*7.5,T=fs*0.9,B=fs*2.2,pw=Wd-L-R,ph=Ht-T-B,n=o.keys.length;
  var mx=o.max||niceMax(Math.max.apply(null,o.series.reduce(function(a,s){return a.concat(s.map(function(p){return p.y||0;}));},[1])));
  var X=function(i){return L+(n<=1?pw/2:i*pw/(n-1));},Y=function(v){return T+ph-v/mx*ph;};
  var h=['<svg viewBox="0 0 '+Wd+' '+Ht+'" role="img" aria-label="'+esc(o.title)+'">'];
  /* 눈금 5칸 — niceMax 가 1·2·2.5·5·10 배수라 5로 나누면 늘 깔끔하다(3.8·1.3 같은 눈금이 나왔다) */
  for(var g=0;g<=5;g++){var v=mx*g/5,y=Y(v);
    h.push('<line x1="'+L+'" y1="'+y+'" x2="'+(L+pw)+'" y2="'+y+'" stroke="'+(g?'#ebe6da':'#b9b2a2')+'" stroke-width="'+(g?1:1.5)+'"/>');
    h.push('<text x="'+(L-10)+'" y="'+(y+fs*0.35)+'" text-anchor="end" font-size="'+fs+'" fill="#555">'+(Math.round(v*10)/10)+o.unit+'</text>');}
  var step=Math.max(1,Math.ceil(n/Math.max(2,Math.floor(pw/(fs*4)))));   /* 날짜 글자가 겹치지 않게 칸 너비로 솎는다 */
  o.keys.forEach(function(k,i){if(i%step&&i!==n-1)return;h.push('<text x="'+X(i)+'" y="'+(Ht-fs*0.6)+'" text-anchor="middle" font-size="'+fs+'" fill="#555">'+dayLab(k)+'</text>');});
  var labY=[];
  o.series.forEach(function(s,si){
    var pts=s.map(function(p,i){return p.y==null?null:[X(i),Y(p.y)];}),seg=[],d='';
    pts.forEach(function(q){if(q){d+=(seg.length?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1);seg.push(q);}else seg=[];});
    if(d)h.push('<path d="'+d+'" fill="none" stroke="'+SERIES[si]+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'+(si?' stroke-dasharray="10 6"':'')+'/>');
    pts.forEach(function(q){if(q)h.push('<circle cx="'+q[0]+'" cy="'+q[1]+'" r="6" fill="'+SERIES[si]+'" stroke="#fff" stroke-width="2"/>');});
    /* 끝점 직접 표시 — 글자는 먹색, 옆 점이 색을 맡는다 */
    for(var j=pts.length-1;j>=0;j--)if(pts[j]){
      var ly=pts[j][1]+fs*0.35;labY.forEach(function(q){if(Math.abs(q-ly)<fs*1.25)ly=q+(ly>=q?fs*1.25:-fs*1.25);});labY.push(ly);   /* 두 끝 글자가 겹치면 비켜 놓는다 */
      h.push('<text x="'+(pts[j][0]+fs*0.7)+'" y="'+ly+'" font-size="'+(fs+1)+'" font-weight="700" fill="#1a1a1a">'+esc((o.labels||o.names)[si])+' '+s[j].y+o.unit+'</text>');break;}
  });
  h.push('<line class="xh" x1="0" y1="'+T+'" x2="0" y2="'+(T+ph)+'" stroke="#888" stroke-width="1.5" stroke-dasharray="4 4" visibility="hidden"/>');
  h.push('<rect class="hit" x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'" fill="transparent"/>');
  h.push('</svg>');
  var id=CH.length;CH.push({o:o,X:X,L:L,pw:pw,n:n,Wd:Wd});
  var leg='<div class="legend">'+o.names.map(function(nm,i){return '<span><i style="background:'+(i?'repeating-linear-gradient(90deg,'+SERIES[i]+' 0 8px,transparent 8px 12px)':SERIES[i])+'"></i>'+esc(nm)+'</span>';}).join('')+'</div>';
  var tbl='<details><summary>표로 보기</summary><table class="t"><tr><th>날짜</th>'+o.names.map(function(nm){return '<th>'+esc(nm)+'</th>';}).join('')+'</tr>'+
    o.keys.map(function(k,i){return '<tr><td class="num">'+dayLab(k)+'</td>'+o.series.map(function(s){return '<td class="num">'+(s[i].y==null?'—':s[i].y+o.unit+' <small>('+s[i].n+'번)</small>')+'</td>';}).join('')+'</tr>';}).join('')+'</table></details>';
  return '<div class="chart" data-ch="'+id+'"><h4>'+esc(o.title)+'</h4>'+leg+h.join('')+'<div class="ctip hide"></div>'+tbl+'</div>';
}
function bindCharts(){
  document.querySelectorAll('.chart[data-ch]').forEach(function(el){
    var c=CH[+el.dataset.ch],svgEl=el.querySelector('svg'),tip=el.querySelector('.ctip'),xh=el.querySelector('.xh'),hit=el.querySelector('.hit');
    function at(e){var r=svgEl.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*c.Wd;
      var i=c.n<=1?0:Math.round((sx-c.L)/c.pw*(c.n-1));return clamp(i,0,c.n-1);}
    hit.addEventListener('mousemove',function(e){
      var i=at(e),o=c.o,x=c.X(i);xh.setAttribute('x1',x);xh.setAttribute('x2',x);xh.setAttribute('visibility','visible');
      tip.innerHTML='<b>'+dayLab(o.keys[i])+'</b><br>'+o.names.map(function(nm,si){var p=o.series[si][i];
        return '<span style="color:'+SERIES[si]+'">●</span> '+esc(nm)+': '+(p.y==null?'—':p.y+o.unit+' ('+p.n+'번)');}).join('<br>');
      tip.classList.remove('hide');
      var er=el.getBoundingClientRect(),sr=svgEl.getBoundingClientRect(),px=sr.left-er.left+x/c.Wd*sr.width;
      tip.style.left=Math.min(px+14,er.width-tip.offsetWidth-8)+'px';tip.style.top=(sr.top-er.top+10)+'px';
    });
    hit.addEventListener('mouseleave',function(){tip.classList.add('hide');xh.setAttribute('visibility','hidden');});
  });
}
/* 약점 — 표본 3번 이상인 칸에서 평균 오차가 가장 큰 곳 */
function tendency(v,wide,narrow,unit){if(v==null)return '—';var a=Math.abs(r1(v));return a<1?'고름':(v>0?wide:narrow)+' '+a+unit;}
function renderTrend(){
  CH=[];
  var full=$('logBody').clientWidth||1200,half=window.innerWidth>1300?(full-16)/2-28:full-28;full-=28;
  var A=ATTS.slice().sort(function(a,b){return a.created_at<b.created_at?-1:1;}),h=[];
  var P=A.filter(function(a){return a.kind==='sep'&&a.sim&&!a.sim.none;}),C=A.filter(function(a){return a.kind==='cush'&&a.sim&&!a.sim.none;}),
      F=A.filter(function(a){return (a.kind==='free'||!a.kind)&&a.sim;});
  if(!A.length){$('logBody').innerHTML='<div class="empty">아직 기록이 없습니다.<br>분리각·원투쿠션 훈련을 몇 번 풀면 여기에 실력 변화가 그려집니다.</div>';return;}
  /* 📐 분리각 */
  if(P.length){
    var dP=daily(P,[function(a){return a.sim.eObj;},function(a){return a.sim.eCue;}]);
    h.push('<h3>📐 분리각 훈련 <small>('+P.length+'문제)</small></h3>');
    /* 두께별 · 당점별 약점 — 부호: 예측 각이 정답보다 크면 "넓게 봄" */
    var rows=[];
    for(var t=1;t<=8;t++){var L=P.filter(function(a){return Math.round(a.sim.thick)===t;});
      var eo=L.map(function(a){return a.sim.eObj;}).filter(function(x){return x!=null;}),ec=L.map(function(a){return a.sim.eCue;}).filter(function(x){return x!=null;});
      var so=L.filter(function(a){return a.sim.pObj!=null;}).map(function(a){return Math.abs(a.sim.pObj)-Math.abs(a.sim.obj);});
      var scu=L.filter(function(a){return a.sim.pCue!=null&&a.sim.cue!=null;}).map(function(a){return Math.abs(a.sim.pCue)-Math.abs(a.sim.cue);});
      rows.push({t:t,n:L.length,eo:r1(mean(eo)),ec:r1(mean(ec)),so:mean(so),sc:mean(scu)});}
    var cand=[];rows.forEach(function(r){if(r.n<3)return;if(r.eo!=null)cand.push({r:r,what:'1적구',e:r.eo,s:r.so});if(r.ec!=null)cand.push({r:r,what:'수구',e:r.ec,s:r.sc});});
    cand.sort(function(a,b){return b.e-a.e;});
    var worstT=cand.length?cand[0].r.t:null;
    h.push('<div class="weak">'+(cand.length?cand.slice(0,2).map(function(c){return '<p>⚠ <b>'+c.r.t+'/8 두께</b>: '+c.what+' 방향을 평균 <b>'+c.e+'°</b> 틀립니다'+
      (c.s!=null&&Math.abs(c.s)>=1?' — 보통 <b>'+(c.s>0?'넓게':'좁게')+'</b> 봅니다':'')+' <small>('+c.r.n+'문제)</small></p>';}).join(''):
      '<p>두께마다 3문제 이상 풀면 약점을 찾아 드립니다.</p>')+'</div>');
    h.push('<div class="sec2"><div>'+lineChart({w:half,title:'날짜별 평균 오차',unit:'°',names:['1적구','수구'],keys:dP.keys,series:dP.series})+'</div>');
    h.push('<div><table class="t"><tr><th>두께</th><th>문제</th><th>1적구 오차</th><th>경향</th><th>수구 오차</th><th>경향</th></tr>'+
      rows.map(function(r){return '<tr class="'+(r.t===worstT?'worst':'')+'"><td>'+(r.t===worstT?'⚠ ':'')+r.t+'/8'+(r.t===8?' 정면':r.t===4?' 반':'')+'</td><td class="num">'+r.n+'</td>'+
        '<td class="num">'+(r.eo==null?'—':r.eo+'°')+'</td><td>'+tendency(r.so,'넓게','좁게','°')+'</td><td class="num">'+(r.ec==null?'—':r.ec+'°')+'</td><td>'+tendency(r.sc,'넓게','좁게','°')+'</td></tr>';}).join('')+'</table></div></div>');
    h.push(setTable(P,'sep','°'));
  }
  /* 🔁 원·투쿠션 — 부호: 찍은 수치 - 기준(계산 또는 실제) */
  if(C.length){
    var errOf=function(ct){return function(a){if(a.sim.ctype!==ct)return null;var v=(a.sim.err||[]).filter(function(x){return x!=null;});return v.length?mean(v):null;};};
    var dC=daily(C,[errOf('first'),errOf('after')]);
    h.push('<h3>🔁 원·투쿠션 훈련 <small>('+C.length+'문제)</small></h3>');
    var sgn=function(ct){var v=[];C.forEach(function(a){var s=a.sim;if(s.ctype!==ct)return;(s.err||[]).forEach(function(e,k){if(e==null)return;var ref=ct==='first'?(s.sys||[])[k]:(s.act||[])[k];if(ref!=null&&s.dad[k]!=null)v.push(s.dad[k]-ref);});});return {m:mean(v),n:v.length};};
    var s1=sgn('first'),s2=sgn('after');
    h.push('<div class="weak">'+
      (s1.n>=3?'<p>쿠션 먼저: 무회전 계산보다 평균 <b>'+Math.abs(r1(s1.m))+'</b> '+(s1.m<0?'작은 수':'큰 수')+'를 찍습니다 <small>('+s1.n+'지점)</small></p>':'')+
      (s2.n>=3?'<p>1적구 뒤 쿠션: 수구가 실제 닿는 곳보다 평균 <b>'+Math.abs(r1(s2.m))+'</b> '+(s2.m<0?'작은 수':'큰 수')+'로 예측합니다 <small>('+s2.n+'지점)</small></p>':'')+
      (s1.n<3&&s2.n<3?'<p>3지점 이상 풀면 경향을 알려 드립니다.</p>':'')+'</div>');
    h.push(lineChart({w:full,title:'날짜별 평균 차이 (쿠션 수치)',unit:'',names:['쿠션 먼저 · 계산과 차이','1적구 뒤 · 예측 오차'],labels:['쿠션 먼저','1적구 뒤'],keys:dC.keys,series:dC.series}));
    h.push(setTable(C,'cush',''));
  }
  /* 🎱 자유 연습 */
  if(F.length){
    var dF=daily(F,[function(a){return a.result?(a.result==='hit'?100:0):null;},function(a){return a.result&&a.sim.result?(a.result===a.sim.result?100:0):null;}]);
    h.push('<h3>🎱 자유 연습 <small>('+F.length+'번)</small></h3>');
    h.push(lineChart({w:full,title:'날짜별 실제 득점률 · 시뮬레이션과 실제가 같았던 비율',unit:'%',names:['실제 득점률','시뮬레이션 일치'],labels:['득점률','일치'],keys:dF.keys,series:dF.series,max:100}));
  }
  /* 🔒 옛 기록(v1 — 시뮬레이션 결과 없음)만 있으면 구역이 하나도 안 생겨 빈 화면이었다(실제 DB 가 그랬다) */
  if(!h.length)h.push('<div class="empty">아직 실력 추이를 그릴 기록이 없습니다.<br>분리각·원투쿠션 훈련을 풀거나 ▶ 시뮬레이션 뒤 기록하면 여기에 쌓입니다.<br><small>(예전 방식으로 남긴 기록 '+A.length+'개는 [🎯 시도 기록]에서 볼 수 있습니다)</small></div>');
  $('logBody').innerHTML=h.join('');
  bindCharts();
}
/* 📝 세트 기록 — 최근 세트 10개 */
function setTable(L,k,unit){
  var sets={},order=[];
  L.forEach(function(a){var st=a.sim.set;if(!st)return;if(!sets[st.id]){sets[st.id]={at:a.created_at,v:[]};order.push(st.id);}
    var e=k==='sep'?[a.sim.eObj,a.sim.eCue]:(a.sim.err||[]);var v=e.filter(function(x){return x!=null;});if(v.length)sets[st.id].v.push(mean(v));});
  if(!order.length)return '';
  order=order.slice(-10).reverse();
  return '<div class="chart"><h4>📝 최근 10문제 세트</h4><table class="t"><tr><th>언제</th><th>푼 문제</th><th>평균 오차</th></tr>'+
    order.map(function(id,i){var s=sets[id],m=r1(mean(s.v)),pv=order[i+1]?r1(mean(sets[order[i+1]].v)):null;
      return '<tr><td class="num">'+fmtDT(s.at)+'</td><td class="num">'+s.v.length+'</td><td class="num"><b>'+(m==null?'—':m+unit)+'</b>'+
        (m!=null&&pv!=null&&m!==pv?' <small>'+(m<pv?'▼ '+r1(pv-m)+unit+' 좋아짐':'▲ '+r1(m-pv)+unit)+'</small>':'')+'</td></tr>';}).join('')+'</table></div>';
}

/* ═════════ 휴지통 ═════════ */
function daysLeft(t){return Math.max(0,KEEP_DAYS-Math.floor((Date.now()-new Date(t))/864e5));}
function openTrash(){
  Promise.all([
    SB.from('bb_boards').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    SB.from('bb_attempts').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(200)
  ]).then(function(rs){
    var bs=rs[0].data||[],as=rs[1].data||[];
    var names={};bs.forEach(function(b){names[b.id]=b.name;});BOARDS.forEach(function(b){names[b.id]=b.name;});
    var h='<p>지운 것은 <b>'+KEEP_DAYS+'일</b> 동안 여기 있다가 저절로 없어집니다.</p>';
    h+='<h3>판 ('+bs.length+'개)</h3>'+(bs.length?'<div class="list">'+bs.map(function(b){
      return '<div class="litem"><span class="grow"><b>'+esc(b.name)+'</b><br><small>'+fmtDT(b.deleted_at)+' 지움 · '+daysLeft(b.deleted_at)+'일 남음</small></span><button class="primary" data-rb="'+b.id+'">↺ 되살리기</button></div>';}).join('')+'</div>':'<p>없음</p>');
    h+='<h3>시도 기록 ('+as.length+'개)</h3>'+(as.length?'<div class="list">'+as.map(function(a){
      return '<div class="litem"><span class="grow"><b>'+esc(names[a.board_id]||'(판 없음)')+'</b> · '+fmtDT(a.created_at)+' '+resTag(a.result)+'<br><small>'+fmtDT(a.deleted_at)+' 지움 · '+daysLeft(a.deleted_at)+'일 남음</small></span><button class="primary" data-ra="'+a.id+'">↺ 되살리기</button></div>';}).join('')+'</div>':'<p>없음</p>');
    modal({title:'🗑 휴지통',wide:true,html:h,buttons:[{label:'닫기',value:null,cls:'primary'}],onOpen:function(m){
      m.querySelectorAll('[data-rb]').forEach(function(x){x.addEventListener('click',function(){
        var b=bs.filter(function(y){return y.id===x.dataset.rb;})[0];x.disabled=true;
        SB.from('bb_boards').update({deleted_at:null}).eq('id',b.id).then(function(r){
          if(r&&r.error){toast('⚠ 되살리지 못했습니다');x.disabled=false;return;}
          b.deleted_at=null;BOARDS.push(normBoard(b));logEvent('board.restore',b.id,{name:b.name});
          x.closest('.litem').remove();renderTabs();toast('‘'+b.name+'’을 되살렸습니다');
        });});});
      m.querySelectorAll('[data-ra]').forEach(function(x){x.addEventListener('click',function(){
        var a=as.filter(function(y){return y.id===x.dataset.ra;})[0];x.disabled=true;
        SB.from('bb_attempts').update({deleted_at:null}).eq('id',a.id).then(function(r){
          if(r&&r.error){toast('⚠ 되살리지 못했습니다');x.disabled=false;return;}
          logEvent('attempt.restore',a.board_id,{});x.closest('.litem').remove();toast('시도 기록을 되살렸습니다');
          if(!$('logv').classList.contains('hide'))loadLog();
        });});});
    }});
  });
}

/* ═════════ 설정 ═════════ */
/* ⚙ 테이블 감각 — 시뮬레이션이 아버지 당구장과 다르게 굴러가면 한 칸씩 옮긴다 */
var FEEL_UI=[['cloth','천 빠르기',['slow','mid','fast'],['느림','보통','빠름']],
             ['cush','쿠션 탄력',['weak','mid','strong'],['약함','보통','강함']],
             ['spin','회전 먹는 정도',['weak','mid','strong'],['약함','보통','강함']]];
function feelCheck(){ /* 지금 감각으로 3단(보통) 짧은 방향 몇 쿠션인지 — 아버지 기준은 2쿠션 */
  var r=PH.simulate({balls:{c:{x:1.12,y:0.56}},cue:'c',dir:{x:0,y:-1},V:PH.SPEED[2],tip:{x:0,y:0},params:feelParams()});
  return r.events.filter(function(e){return e.type==='cushion';}).length;}
function feelText(){return FEEL_UI.map(function(f){var i=f[2].indexOf(FEEL[f[0]]||'mid');return f[1]+' '+f[3][i<0?1:i];}).join(' · ');}
function feelHtml(){
  return '<h3 style="margin:.8rem 0 .3rem">🎱 테이블 감각</h3><p style="margin:0 0 .5rem">시뮬레이션이 실제 당구대와 다르게 굴러가면 한 칸씩 옮겨 보세요.</p>'+
    FEEL_UI.map(function(f){var cur=FEEL[f[0]]||'mid';return '<div style="display:flex;align-items:center;gap:.5rem;margin:.35rem 0"><b style="width:9rem">'+f[1]+'</b>'+
      f[2].map(function(v,i){return '<button type="button" data-f="'+f[0]+':'+v+'" class="'+(cur===v?'on':'')+'" style="flex:1">'+f[3][i]+'</button>';}).join('')+'</div>';}).join('')+
    '<p id="feelNow" style="margin:.6rem 0 0;font-weight:700"></p>'+
    '<h3 style="margin:.9rem 0 .3rem">💡 원·투쿠션 힌트</h3><div style="display:flex;gap:.5rem">'+
    [['dir','방향만'],['size','방향 + 대략 크기'],['none','힌트 없음']].map(function(x){return '<button type="button" data-hint="'+x[0]+'" class="'+(HINT===x[0]?'on':'')+'" style="flex:1">'+x[1]+'</button>';}).join('')+'</div>';
}
function openSettings(){
  modal({title:'⚙ 설정',html:'<p>로그인한 계정: <b>'+esc(USER&&USER.email||'')+'</b></p><p>테이블: 중대 (안쪽 2.24 × 1.12 m) · 4구 공 65.5 mm · 속도 3 = 1.6 m/s</p>'+feelHtml(),
    onOpen:function(m){
      var now=function(){var n=feelCheck();m.querySelector('#feelNow').textContent='지금 설정이면 보통 속도(3단)로 짧은 방향 → '+n+'쿠션'+(n===2?' ✓ (아버지 기준 2쿠션)':' (아버지 기준은 2쿠션)');};now();
      m.querySelectorAll('[data-f]').forEach(function(x){x.addEventListener('click',function(){
        var kv=x.dataset.f.split(':');FEEL[kv[0]]=kv[1];pref('feel',JSON.stringify(FEEL));clearSim();
        m.querySelectorAll('[data-f^="'+kv[0]+':"]').forEach(function(y){y.classList.toggle('on',y===x);});now();
        logEvent('feel.change',null,{text:feelText()});});});
      m.querySelectorAll('[data-hint]').forEach(function(x){x.addEventListener('click',function(){HINT=x.dataset.hint;pref('hint',HINT);
        m.querySelectorAll('[data-hint]').forEach(function(y){y.classList.toggle('on',y===x);});});});
    },
    buttons:[
    {label:'<span class="ic">🔑</span> 비밀번호 바꾸기',value:'pw'},
    {label:'<span class="ic">🚪</span> 나가기 (로그아웃)',value:'out',cls:'danger'},
    {label:'닫기',value:null,cls:'primary'}]}).then(function(r){
    if(r.value==='pw')changePw();
    else if(r.value==='out')confirmBox('🚪 나갈까요?','다음에 들어올 때 아이디와 비밀번호를 다시 넣어야 합니다.','나가기',true).then(function(ok){
      if(!ok)return;(saveTimer?flush():Promise.resolve()).then(function(){SB.auth.signOut().then(function(){location.reload();});});
    });
  });
}
function changePw(){
  modal({title:'🔑 비밀번호 바꾸기',body:'새 비밀번호를 두 번 적어 주세요. (8자 이상)',input:{type:'password',ac:'new-password',max:72},input2:{type:'password',ac:'new-password',placeholder:'한 번 더'},
    buttons:[{label:'취소',value:null},{label:'바꾸기',value:'ok',cls:'primary'}]}).then(function(r){
    if(r.value!=='ok')return;
    if((r.text||'').length<8){modal({title:'8자 이상으로 적어 주세요',buttons:[{label:'다시 하기',value:1,cls:'primary'}]}).then(changePw);return;}
    if(r.text!==r.text2){modal({title:'두 번 적은 비밀번호가 다릅니다',buttons:[{label:'다시 하기',value:1,cls:'primary'}]}).then(changePw);return;}
    SB.auth.updateUser({password:r.text}).then(function(x){
      if(x&&x.error){toast('⚠ 바꾸지 못했습니다 ('+x.error.message+')');return;}
      logEvent('password.change',null,null);toast('🔑 비밀번호를 바꿨습니다');
    });
  });
}

/* ═════════ 연결 ═════════ */
function bind(){
  $('lform').addEventListener('submit',doLogin);
  $('pwEye').addEventListener('click',function(){var p=$('pw');var s=p.type==='password';p.type=s?'text':'password';this.innerHTML='<span class="ic">'+(s?'🙈':'👁')+'</span> '+(s?'숨기기':'보기');});
  $('tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(b&&b.dataset.id&&b.dataset.id!==CUR)switchBoard(b.dataset.id);});
  $('bMore').addEventListener('click',boardList);
  $('bNew').addEventListener('click',newBoard);
  $('stepGrp').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;STEP=+b.dataset.st;pref('step',String(STEP));renderTabs();
    toast('쿠션 눈금을 '+(STEP===1?'1 단위(예: 32)':'0.5 단위(예: 32.5)')+'로 찍습니다');});
  $('bRename').addEventListener('click',renameBoard);
  $('bCopy').addEventListener('click',copyBoard);
  $('bDel').addEventListener('click',deleteBoard);
  $('bLog').addEventListener('click',openLog);
  $('bBack').addEventListener('click',closeLog);
  $('bTrash').addEventListener('click',openTrash);
  $('bSet').addEventListener('click',openSettings);
  ['vAtt','vTrend','vEvt'].forEach(function(id){$(id).addEventListener('click',function(){LOGVIEW=this.dataset.v;loadLog();});});
  $('lBoard').addEventListener('change',loadLog);
  ['mBall','mDraw','mEdit','mObj','mCue','mCpt'].forEach(function(id){$(id).addEventListener('click',function(){setMode(this.dataset.m);});});
  $('ctype').addEventListener('click',function(e){var b=e.target.closest('button');if(!b||ST.draft.ctype===b.dataset.ct)return;pushUndo();ST.draft.ctype=b.dataset.ct;ST.draft.cpts=[];resetTries();MODE='cpt';saveSoon();renderAll();});
  $('bAnswer').addEventListener('click',showAnswer);
  $('bCmp').addEventListener('click',compareSpeeds);
  $('bScan').addEventListener('click',scanRange);
  $('bNewQ').addEventListener('click',function(){if(SET){nextQ();return;}newProblem();});
  $('bSet10').addEventListener('click',startSet);
  $('bSetStop').addEventListener('click',stopSet);
  ['lPre','lAct'].forEach(function(id){$(id).addEventListener('click',function(){LAYER=this.dataset.l;SEL=null;hidePop();clearSim();if(MODE==='ball')MODE='draw';renderAll();});});
  ['cW','cY'].forEach(function(id){$(id).addEventListener('click',function(){if(ST.balls.cue===this.dataset.c)return;pushUndo();ST.balls.cue=this.dataset.c;saveSoon();renderAll();});});
  $('bReset').addEventListener('click',function(){pushUndo();var c=ST.balls.cue,d=defaultBalls();d.cue=c;ST.balls=d;saveSoon();renderAll();toast('공을 처음 자리로 옮겼습니다 (↶ 되돌리기 가능)');});
  $('bDone').addEventListener('click',doneDraw);
  $('bClear').addEventListener('click',clearLayer);
  $('bUndo').addEventListener('click',undo);$('bRedo').addEventListener('click',redo);
  $('ptDel').addEventListener('click',delPoint);
  $('bRec').addEventListener('click',record);
  $('bSim').addEventListener('click',runSim);
  $('bSlow').addEventListener('click',function(){SLOW=!SLOW;pref('slow',SLOW?'1':'0');renderSimBtn();});
  $('bNextT').addEventListener('click',nextThick);
  $('thk').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var d=ST.draft;
    if(b.dataset.lr){if(d.side===b.dataset.lr)return;pushUndo();d.side=b.dataset.lr;}else{pushUndo();d.thick=+b.dataset.t;}
    d.predObj=null;d.predCue=null;if(kind()==='cush')d.cpts=[];MODE=kind()==='cush'?'cpt':'pobj';saveSoon();renderAll();});
  var s=svg();
  s.addEventListener('pointerdown',onDown);s.addEventListener('pointermove',onMove);
  s.addEventListener('pointerup',onUp);s.addEventListener('pointercancel',onUp);s.addEventListener('pointerleave',onLeave);
  s.addEventListener('contextmenu',function(e){e.preventDefault();});
  /* 당점 */
  $('tipGuide').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;GUIDE=b.dataset.g;pref('guide',GUIDE);renderSide();});
  $('tip').addEventListener('pointerdown',function(e){
    var t=$('tip'),p=t.createSVGPoint();p.x=e.clientX;p.y=e.clientY;p=p.matrixTransform(t.getScreenCTM().inverse());
    var x=p.x/100,y=p.y/100,d=Math.hypot(x,y);if(d>1.1)return;
    if(d>0.92){x=x/d*0.92;y=y/d*0.92;}
    setTip({x:r2(x),y:r2(y)});
  });
  $('tipMid').addEventListener('click',function(){setTip({x:0,y:0});});
  $('tipClr').addEventListener('click',function(){setTip(null);});
  $('spd').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;pushUndo();ST.draft.speed=+b.dataset.s;ST.draft.kmh=null;saveSoon();renderAll();});
  $('kmh').addEventListener('change',function(){var v=this.value===''?null:Math.round(parseFloat(this.value)*10)/10;if(v!==null&&(isNaN(v)||v<=0))v=null;pushUndo();ST.draft.kmh=v;saveSoon();renderAll();});
  /* 키보드 — Enter: 긋는 중이면 긋기 끝, 아니면 ▶ */
  document.addEventListener('keydown',function(e){
    if($('app').classList.contains('hide')||!$('mask').classList.contains('hide')||!$('logv').classList.contains('hide'))return;
    var inField=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if((e.ctrlKey||e.metaKey)&&!inField){
      if(e.key==='z'||e.key==='Z'){e.preventDefault();if(e.shiftKey)redo();else undo();}
      else if(e.key==='y'||e.key==='Y'){e.preventDefault();redo();}
      return;
    }
    if(inField)return;
    /* 🔒 버튼에 초점이 있을 때 Enter = 그 버튼만 누른다(전엔 버튼 + ▶ 가 같이 돌았다) */
    if(e.key==='Enter'&&e.target.tagName==='BUTTON')return;
    if(e.key==='Enter'){e.preventDefault();if(MODE==='draw')doneDraw();else runSim();}
    else if(e.key==='Escape'&&MODE==='draw'){e.preventDefault();doneDraw();}
    else if(e.key==='Escape'){SEL=null;hidePop();if(SIMV&&!SIMV.playing){clearSim();renderAll();}else renderTable();}
    else if((e.key==='Delete'||e.key==='Backspace')&&MODE==='edit'&&SEL!==null){e.preventDefault();delPoint();}
  });
  var rt=null;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){hidePop();renderTable();if(ST)renderTabs();
    if(!$('logv').classList.contains('hide')&&LOGVIEW==='trend'&&ATTS)renderTrend();},80);});
}

bind();
/* 로그인이 풀리면(다른 곳에서 로그아웃 · 토큰 만료) 저장 실패만 반복하지 말고 로그인 화면으로 */
try{SB.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT'&&USER){USER=null;showLogin('로그인이 풀렸습니다. 다시 로그인해 주세요.');}});}catch(e){}
SB.auth.getSession().then(function(r){
  var s=r&&r.data&&r.data.session;
  if(s)enter(s.user);else showLogin('');
},function(){showLogin('인터넷 연결을 확인해 주세요.');});
