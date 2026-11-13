/* t62 — 🏠 데일리 = 홈 · 화면 기본기 (v4.74)
   🔴 로한(11/4):
      ① 아래 메뉴를 누르면 새 화면이 「중간부터」 뜬다
      ② 앱을 열면 지난번 눌러 둔 날(11/2)로 열린다 · 상단 날짜도 그 날을 따라간다
      ③ 사주 말풍선은 날짜 칸마다 (칸 머리 오른쪽)
      ④ 목표 A~E 가 늘 0% — 보증금은 자산과 연동하면 0% 일 수 없다
      ⑤ 드릴 · 뽀모도로 바로가기
      ⑥ 새로고침하면 로그인 화면이 번쩍 떴다가 돌아온다
   🔒 불변식:
      A 메뉴를 바꾸면 scrollY=0 · PC 사이드바는 화면에 붙어 있다(sticky)
      B 앱을 열면 curDate()=오늘 (저장된 goalDate 가 무엇이든) · 상단은 지난 날을 눌러도 오늘
      C 달력의 모든 날짜 칸 머리에 판정(吉凶平)과 💬 — 상단엔 없다 · 미래 칸 말풍선도 눌린다
      D 수치 목표는 연동값으로 % · 완료/미완 목표는 「실행 N%」(0% 거짓말 없음) · 학습 진도 소스
      E 드릴 → 학습 탭 드릴(word) · 뽀모도로 → 전체화면
      F 세션이 있으면 로그인 화면은 한 번도 보이지 않는다 · 세션이 없으면 로그인이 보인다
      G 모바일 대조표 — 계좌 이름이 한 줄을 쓴다(글자가 세로로 쌓이지 않는다) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const TODAY='2026-11-04';
const ST={schemaVersion:7,ui:{month:'2026-11',goalDate:'2026-11-02',goalMonth:'2026-10'},cards:[],categories:[],
 routines:[{id:'r1',code:'D3',title:'주말 1만자',goalId:'gD',freq:'daily',start:'2026-10-01'}],
 checks:{'2026-11-01':{done:['D3']},'2026-11-03':{done:['D3']}},
 goals:[
  {id:'gA',code:'A',kind:'year',period:'2026',title:'보증금 500만 확보',metric:{type:'amount',unit:'원',target:5000000},source:'cash',baseline:'',progress:0,status:'active',due:'2026-12-31',startYM:'2026-11'},
  {id:'gC',code:'C',kind:'year',period:'2026',title:'JLPT N4',metric:{type:'amount',unit:'%',target:100},source:'study',baseline:'0',progress:0,status:'active',due:'2026-12-06',startYM:'2026-11'},
  {id:'gD',code:'D',kind:'year',period:'2026',title:'웹소설 1질',metric:{type:'binary',unit:'',target:0},progress:0,status:'active',due:'2026-12-31'},
  {id:'gE',code:'E',kind:'year',period:'2026',title:'멋진 남자',metric:{type:'binary',unit:'',target:0},progress:0,status:'active',due:'2026-12-31'}],
 meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}},errors:[],
   units:[{id:'u1',status:'done'},{id:'u2',status:'done'},{id:'u3',status:'todo'},{id:'u4',status:'doing'}]},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]},
 accounts:[{id:'a1',name:'카카오뱅크 세이프박스',group:'현금성',mode:'manual',hist:[{date:'2026-11-01',amount:1250000}]},
  {id:'a6',name:'노랑우산공제',group:'저축',mode:'manual',hist:[{date:'2026-11-01',amount:2600000}]}],
 transactions:[]};
function mock(sess){return ({s,sess})=>{
  function mk(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},
    update(){return q},upsert(){return q},insert(){return q},delete(){return q},
    maybeSingle(){ if(table==='app_state')return Promise.resolve({data:{data:JSON.parse(JSON.stringify(s)),updated_at:'2026-11-04T00:00:00.000Z'},error:null});
      return Promise.resolve({data:null,error:null}); },
    then(res,rej){return Promise.resolve({data:[{updated_at:'2026-11-04T00:00:01.000Z'}],error:null}).then(res,rej);}};
   return q;}
  /* 첫 페인트부터 로그인 화면이 보였는지 기록한다 — 한 번이라도 보이면 「번쩍」이다 */
  window.__loginSeen=false;
  const tick=()=>{const l=document.getElementById('login');
    if(l&&getComputedStyle(l).display!=='none')window.__loginSeen=true;
    if(!window.__stopTick)requestAnimationFrame(tick);};
  document.addEventListener('DOMContentLoaded',tick);
  window.supabase={createClient:()=>({from:(t)=>mk(t),rpc:()=>Promise.resolve({data:null,error:null}),
    auth:{getSession:()=>new Promise(r=>setTimeout(()=>r({data:{session:sess?{user:{id:'u1'}}:null}}),120)),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 };}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  async function open(vp,sess){
   const ctx=await b.newContext({viewport:vp});
   await ctx.addInitScript(mock(sess),{s:ST,sess});
   await ctx.clock.setFixedTime(new Date(TODAY+'T12:00:00+09:00'));
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
   await p.route('**/*supabase*',r=>r.abort());
   await p.goto('file://'+file);await p.waitForTimeout(1500);
   return {ctx,p,errs};
  }
  /* ── F 로그인 번쩍임 ── */
  {const {ctx,p}=await open({width:1440,height:900},true);
   const r=await p.evaluate(()=>{window.__stopTick=true;return {seen:window.__loginSeen,boot:document.documentElement.classList.contains('boot'),
     app:getComputedStyle(document.getElementById('app')).display};});
   ok('F1 🔴 세션이 있으면 로그인 화면이 한 번도 안 보인다',r.seen===false,JSON.stringify(r));
   ok('F2 로드가 끝나면 표지를 걷고 앱이 보인다',!r.boot&&r.app!=='none',JSON.stringify(r));
   await ctx.close();}
  {const {ctx,p}=await open({width:1440,height:900},false);
   const r=await p.evaluate(()=>({boot:document.documentElement.classList.contains('boot'),login:getComputedStyle(document.getElementById('login')).display}));
   ok('F3 세션이 없으면 로그인이 보인다',!r.boot&&r.login!=='none',JSON.stringify(r));
   await ctx.close();}

  const {ctx,p,errs}=await open({width:1440,height:900},true);
  /* ── B 오늘에서 시작 ── */
  const B=await p.evaluate(()=>({cd:curDate(),cm:curMonth(),top:document.querySelector('#v-daily .dtd').textContent}));
  ok('B1 🔴 저장된 goalDate(11/2)가 있어도 오늘(11/4)로 연다',B.cd==='2026-11-04'&&B.cm==='2026-11',JSON.stringify(B));
  ok('B2 상단 날짜 = 오늘',/^11월 4일/.test(B.top),B.top);
  const B3=await p.evaluate(()=>{DB.ui.dayOpen=true;setGoalDate('2026-11-01');   /* v4.97 — 그 날 표는 서랍이다. 쓰기 전에 연다 */
return {top:document.querySelector('#v-daily .dtd').textContent,
    pane:document.querySelector('#v-daily .ddraw .pane').querySelector('.mnav2 b').textContent};});
  ok('B3 🔴 지난 날을 눌러도 상단은 오늘 · 오른쪽 칸만 그 날',/^11월 4일/.test(B3.top)&&/11월 1일/.test(B3.pane),JSON.stringify(B3));

  /* ── C 칸 머리 일진 ── */
  const C=await p.evaluate(()=>{DB.ui.dview='month';renderDaily();   /* v4.98 — 달력 칸(월간)을 본다 */
   const cells=[...document.querySelectorAll('#v-daily .gcell[data-gcal]')];
    return {n:cells.length,withFv:cells.filter(c=>c.querySelector('.gchd .gmk.fv')).length,withBub:cells.filter(c=>c.querySelector('.gchd .bub')).length,
      top:!!document.querySelector('#v-daily .dtop .bub,#v-daily .dtop .dsaju'),
      fut:(()=>{const e=document.querySelector('#v-daily .gcell.fut .gchd .bub');return e?getComputedStyle(e).pointerEvents:null;})()};});
  ok('C1 🔴 모든 날짜 칸 머리에 판정과 💬',C.n>=28&&C.withFv===C.n&&C.withBub===C.n,JSON.stringify(C));
  ok('C2 상단엔 일진·말풍선이 없다',C.top===false);
  ok('C3 미래 칸 말풍선도 눌린다',C.fut==='auto',C.fut);
  const C4=await p.evaluate(()=>{const before=curDate();
    document.querySelector('#v-daily .gcell[data-gcal="2026-11-03"] .bub').click();
    const t=document.getElementById('modal').innerHTML;const on=document.getElementById('ov').classList.contains('on');closeModal();
    return {on,has:t.indexOf('2026-11-03')>=0,same:curDate()===before};});
  ok('C4 칸 말풍선을 누르면 그 날 해석이 열리고, 날짜 선택은 안 바뀐다',C4.on&&C4.has&&C4.same,JSON.stringify(C4));

  /* ── D 목표 칩 ── */
  const D=await p.evaluate(()=>{setGoalDate(todayStr());const m={};document.querySelectorAll('#v-daily .dgchip').forEach(e=>{m[e.querySelector('.gcode').textContent]=e.querySelector('i').textContent;});return m;});
  ok('D1 🔴 보증금(A)은 현금성 자산 연동 — 125만/500만 = 25%',D.A==='25%',JSON.stringify(D));
  ok('D2 JLPT(C)는 학습 진도 — 4단원 중 2 완료 = 50%',D.C==='50%',JSON.stringify(D));
  ok('D3 🔴 완료/미완(D)은 0% 가 아니라 최근 30일 실행률',/^실행 \d+%$/.test(D.D||'')&&D.D!=='실행 0%',JSON.stringify(D));
  ok('D4 루틴 없는 완료/미완(E)은 「—」',D.E==='—',JSON.stringify(D));
  ok('D5 학습 진도 소스가 목록에 있다',await p.evaluate(()=>GOAL_SOURCES.some(x=>x.k==='study')&&sourceValue('study')===50));

  /* ── E 바로가기 ── */
  const E=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#v-daily .dquick button')].map(x=>x.textContent);
    document.querySelectorAll('#v-daily .dquick button')[0].click();
    const r={bs,view:document.querySelector('.view.on').id,tab:stTab(),side:document.querySelector('.side .m.on').dataset.v};
    gotoTab('daily');document.querySelectorAll('#v-daily .dquick button')[1].click();
    r.pomo=document.getElementById('pomoOv').classList.contains('on');stPomoClose();return r;});
  ok('E1 바로가기 두 개(드릴 · 뽀모도로)',E.bs.length===2&&/드릴/.test(E.bs[0])&&/뽀모도로/.test(E.bs[1]),JSON.stringify(E.bs));
  ok('E2 드릴 → 학습 탭 드릴 자리 · 메뉴 표시도 학습',E.view==='v-study'&&E.tab==='word'&&E.side==='study',JSON.stringify(E));
  ok('E3 뽀모도로 → 전체화면',E.pomo===true);

  /* ── A 스크롤 · 사이드바 ── */
  const A=await p.evaluate(async()=>{document.querySelector('.main').style.minHeight='3000px';window.scrollTo(0,900);
    const y0=window.scrollY;document.querySelector('.side .m[data-v="log"]').click();
    const y1=window.scrollY;window.scrollTo(0,900);
    const R=document.getElementById('sideBar').getBoundingClientRect();
    return {y0,y1,top:Math.round(R.top),pos:getComputedStyle(document.querySelector('.sidewrap')).position};});
  ok('A1 🔴 메뉴를 바꾸면 새 화면은 맨 위에서 시작',A.y0>0&&A.y1===0,JSON.stringify(A));
  ok('A2 PC 사이드바는 내려도 화면에 붙어 있다',A.pos==='sticky'&&A.top===0,JSON.stringify(A));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();

  /* ── G 모바일 대조표 ── */
  {const {ctx,p,errs}=await open({width:390,height:844},true);
   await p.click('.m[data-v="cashflow"]');await p.waitForTimeout(300);
   const G=await p.evaluate(()=>{const n=document.querySelector('.recrow:not(.rchd) .rc-n b');const R=n.getBoundingClientRect();
     const lh=parseFloat(getComputedStyle(n).lineHeight)||16;
     return {h:Math.round(R.height),lh,hs:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
   ok('G1 🔴 390px 에서 계좌 이름이 한 줄(세로로 안 쌓인다)',G.h<=G.lh*1.6,JSON.stringify(G));
   ok('G2 가로 스크롤 없음',G.hs===false,JSON.stringify(G));
   ok('G3 모바일 에러 없음',errs.length===0,errs.join(' | '));
   await ctx.close();}
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t62 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
