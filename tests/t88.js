/* t88 — 📅 데일리 주간·월간 보기 (v4.98 · 핸드오프 daily-view-spec D1)
   로한: 「주간, 월간을 만들어라 … 0/8 이 한 줄을 차지한다 헤더로 … 노트북·핸드폰·샤오미패드7 에 맞게」
   🔒 V1 기본 = 주 · 주│월 전환은 기기에 남는다 · V2 ‹ › 는 보는 주를 옮긴다(고른 날 curDate 는 그대로)
      H1 「0/8」 줄(.gcr)이 어느 보기에도 없다 · 칸 배경 채색(l0~l3) 없음 · 머리에 루틴 알약 · H2 💬 가 두 보기 머리에 있고 눌러도 서랍이 안 열린다
      W1 🔴 주간 오늘 기둥에서 루틴 체크 → 머리 알약·헤더가 같이 바뀐다(서랍 안 열림) · W2 기둥에서 업무 끝냄 = wkToggle
      W3 올 날 기둥 = 「N개 예정」(체크 상자 없음) · 지난 날 = ✗ 이름 + ✓ N개 완료 · W4 기둥 글자 = 그 날 표의 그 탭
      M1 월간 칸 = 업무 일정(시각)·마감만 이름으로 · 넘치면 「+N개 더」 · M2 성공한 주의 일요일 ✓ · 「주」 칸 없음
      F1 🔴 1280×720 · 1536×820 · 1280×854 · 854×1280 · 360×780 — 월간이 스크롤 없이 한 화면(달력 아래 끝 ≤ 화면) · 가로 넘침 0
      F2 🔴 854×1280 = 아래 판 · 달력 칸 폭이 그대로 · F3 ≥1200 = 옆 서랍 330 · F4 360 주간 = 하루 한 장 목록(오늘이 맨 위)
      E1 빈 상태(업무 0 · 루틴 0)에서 두 보기가 깨지지 않는다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const words=[];for(let i=0;i<60;i++)words.push({id:'w'+i,kana:'か'+i,kanji:'漢'+i,ko:'뜻'+i});
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:words,rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  function q(name){const st={cols:'',inKeys:null};const o={select(c){st.cols=c||'';return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    S.saves++; const revs={},ats={};
    args.p_changes.forEach(c=>{const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const SEED=()=>{const t=todayStr();   DB.routines=['기상','아침약','스트레칭','단어','물'].map((x,i)=>({id:'r'+i,code:'R.'+i,title:x,freq:'daily',days:[],status:'active',start:'2026-01-01'}));   DB.checks=DB.checks||{}; DB.checks[addDays(t,-1)]={done:['R.0','R.1'],due:[],miss:{'R.4':{tag:'피곤',memo:''}}};   wkAdd({title:'교육청 방문',day:t,at:'14:00',dur:60}); wkAdd({title:'계약서 검토',day:t,due:addDays(t,1)});   for(let k=0;k<9;k++)wkAdd({title:'일정 '+k,day:addDays(t,2),at:String(9+k).padStart(2,'0')+':00',dur:30});   save(); document.querySelector('.side .m[data-v="daily"]').click();};
  /* E — 빈 상태 */
  const E=await p.evaluate(()=>{document.querySelector('.side .m[data-v="daily"]').click();const a=document.querySelectorAll('#v-daily .dwc').length;dviewSet('month');const b=document.querySelectorAll('#v-daily .dmon .gcell[data-gcal]').length;dviewSet('week');return {a,b};});
  ok('E1 빈 상태에서 두 보기 — 기둥 7 · 월 칸 28+',E.a===7&&E.b>=28&&errs.length===0,JSON.stringify(E)+errs.join('|'));
  await p.evaluate(SEED);
  await p.waitForTimeout(300);
  const V=await p.evaluate(()=>{const v0=dview(), cur0=curDate(), w0=dweekStart(); dvMove(1); const w1=dweekStart(), cur1=curDate(), lab=document.querySelector('#v-daily .pn-l').textContent; dvToday();
    dviewSet('month'); const ui=JSON.parse(localStorage.getItem('rb_ui')||'{}').dview; dviewSet('week'); return {v0,cur0,cur1,w0,w1,lab,ui};});
  ok('V1 기본 = 주 · 보기는 기기에(rb_ui)',V.v0==='week'&&V.ui==='month',JSON.stringify(V));
  ok('V2 ‹ › 는 보는 주만 · 고른 날은 그대로',V.w1>V.w0&&V.cur0===V.cur1&&/–/.test(V.lab),JSON.stringify(V));
  /* H — 머리 */
  const H=await p.evaluate(()=>{const r={};for(const v of ['week','month']){dviewSet(v);const root=document.getElementById('v-daily');
      r[v]={gcr:root.querySelectorAll('.gcr').length,lv:root.querySelectorAll('.gcell.l0,.gcell.l1,.gcell.l2,.gcell.l3').length,pill:root.querySelectorAll('.dvh .dpill').length,bub:root.querySelectorAll('.dvh .bub').length};}
    dviewSet('week'); const before=dayOpen(); document.querySelector('#v-daily .dwc.today .dvh .bub').click(); const after=dayOpen(); closeModal(); return {r,before,after};});
  ok('H1 「0/8」 줄·칸 배경 없음 · 머리에 알약',H.r.week.gcr===0&&H.r.month.gcr===0&&H.r.month.lv===0&&H.r.week.pill>=2&&H.r.month.pill>=2,JSON.stringify(H.r));
  ok('H2 💬 가 두 보기 머리에 · 눌러도 서랍이 안 열린다',H.r.week.bub===7&&H.r.month.bub>=28&&!H.before&&!H.after,JSON.stringify(H));
  /* W — 주간 기둥 */
  const W=await p.evaluate(()=>{const t=todayStr(); const col=()=>document.querySelector('#v-daily .dwc.today');
    const p0=col().querySelector('.dpill').textContent, h0=document.querySelector('#v-daily .ph-s').textContent;
    const row=[...col().querySelectorAll('.dwg-rt .dwr')].find(r=>/스트레칭/.test(r.textContent)); row.querySelector('.dwck').click();
    const p1=col().querySelector('.dpill').textContent, h1=document.querySelector('#v-daily .ph-s').textContent, open1=dayOpen(), chk=(DB.checks[t]||{done:[]}).done.indexOf('R.2')>=0;
    const wr=[...col().querySelectorAll('.dwg-wk .dwr')].find(r=>/교육청/.test(r.textContent)); wr.querySelector('.dwck').click();
    const done=DB.work.tasks.find(x=>x.title==='교육청 방문').status;
    const fut=document.querySelector('#v-daily .dwc.fut'), futTxt=fut?fut.querySelector('.dwg-rt').textContent:'', futCk=fut?fut.querySelectorAll('.dwg-rt .dwck').length:-1;
    const past=[...document.querySelectorAll('#v-daily .dwc')].find(c=>c.querySelector('.dvh').dataset.gcal===addDays(t,-1)), pastTxt=past?past.querySelector('.dwg-rt').textContent:'(지난 날이 다른 주)';
    [...col().querySelectorAll('.dwg-wk .dwt')][0].click(); const tab=DB.ui.dailyTab, open2=dayOpen();
    return {p0,p1,h0:/오늘 \d\/\d/.exec(h0)[0],h1:/오늘 \d\/\d/.exec(h1)[0],open1,chk,done,futTxt,futCk,pastTxt,tab,open2};});
  ok('W1 🔴 오늘 기둥에서 체크 → 알약·헤더 같이 · 서랍 안 열림',W.chk&&W.p0!==W.p1&&W.h0!==W.h1&&!W.open1,JSON.stringify(W));
  ok('W2 기둥에서 업무 끝냄',W.done==='done',W.done);
  ok('W3 올 날 = N개 예정(체크 상자 없음) · 지난 날 = ✗ 이름 + ✓ N개 완료',/5개 예정/.test(W.futTxt)&&W.futCk===0&&(/지난 날이 다른 주/.test(W.pastTxt)||(/✗ 물/.test(W.pastTxt)&&/✓ 2개 완료/.test(W.pastTxt))),JSON.stringify(W));
  ok('W4 기둥 글자 = 그 날 표의 그 탭',W.tab==='work'&&W.open2,JSON.stringify(W));
  /* C — 🔴 로한 사례(v4.99): 시각 없는 할 일 2개를 다 끝냄 → 2/2 · 월간에 이름이 남는다 */
  const C=await p.evaluate(()=>{const t=todayStr(); DB.work.tasks.forEach(x=>{if(x.day===t)x.deletedAt=new Date().toISOString();});
    const a=wkAdd({title:'학원 청소',day:t}), b2=wkAdd({title:'행사 준비',day:t}); save(); wkToggle(a.id); wkToggle(b2.id);
    dviewSet('week'); const head=document.querySelector('#v-daily .dwc.today .dwkn'), hs=document.querySelector('#v-daily .ph-s').textContent;
    dviewSet('month'); const cell=document.querySelector('#v-daily .dmon .gcell[data-gcal="'+t+'"]'), mh=cell.querySelector('.dwkn'), lines=[...cell.querySelectorAll('.dmi')].map(x=>x.textContent+'|'+x.className);
    dayOpenTo(t); const em=(document.querySelector('#v-daily .ddraw .dtab[data-dtab="work"] em')||{}).textContent; dayOpenSet(false);
    gotoTab('work'); const ws=document.querySelector('#v-work .ph-s').textContent; gotoTab('daily');
    return {wh:head&&head.textContent,mh:mh&&mh.textContent,hs:(hs.match(/업무 \d+\/\d+/)||[''])[0],lines,em,ws:(ws.match(/오늘 \d+\/\d+ 끝냄/)||[''])[0]};});
  ok('C1 🔴 2개 다 끝내면 2/2 — 주간 머리·월간 머리·헤더·서랍 탭·업무 페이지가 같은 답',C.wh==='☑2/2'&&C.mh==='☑2/2'&&C.hs==='업무 2/2'&&C.em==='2/2'&&C.ws==='오늘 2/2 끝냄',JSON.stringify(C));
  ok('C2 🔴 월간 칸에 시각 없는 할 일·끝낸 것도 이름으로(끝낸 것은 흐리게)',C.lines.some(l=>/학원 청소/.test(l)&&/done/.test(l))&&C.lines.some(l=>/행사 준비/.test(l)),JSON.stringify(C.lines));
  await p.evaluate(()=>dayOpenSet(false));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
  /* F — 다섯 화면 */
  const fit=[];
  for(const [Wd,Ht] of [[1536,820],[1280,720],[1280,854],[854,1280],[360,780]]){
    const c=await b.newContext({viewport:{width:Wd,height:Ht},hasTouch:Wd<1200,isMobile:Wd<600});await c.addInitScript(FAKE);
    const q=await c.newPage();await q.route('**/*supabase*',r=>r.abort());await q.goto('file://'+file);await q.waitForTimeout(2200);
    await q.evaluate(SEED); await q.evaluate(()=>{DB.ui.goalMonth='2026-11';dviewSet('month');}); await q.waitForTimeout(350);
    const m=await q.evaluate(()=>{const c=document.querySelector('#v-daily .dcal').getBoundingClientRect(), w0=document.querySelector('#v-daily .dmon .gcell[data-gcal]').getBoundingClientRect().width;
      const more=document.querySelectorAll('#v-daily .dmmore').length, sun=!!document.querySelector('#v-daily .gwk'), lines=[...document.querySelectorAll('#v-daily .dmi')].map(x=>x.textContent).join('|');
      gcalPick(todayStr());
      return new Promise(res=>setTimeout(()=>{const dr=document.querySelector('#v-daily .ddraw'), w1=document.querySelector('#v-daily .dmon .gcell[data-gcal]').getBoundingClientRect().width;
        res({bot:Math.round(c.bottom),vh:innerHeight,ov:document.documentElement.scrollWidth>innerWidth+1,pos:getComputedStyle(dr).position,dw:Math.round(dr.getBoundingClientRect().width),w0:Math.round(w0),w1:Math.round(w1),more,sun,lines});},350));});
    let ag=null;
    if(Wd<600){ag=await q.evaluate(()=>{dayOpenSet(false);dviewSet('week');const cards=[...document.querySelectorAll('#v-daily .dag')];return {n:cards.length,first:cards[0]&&cards[0].classList.contains('today')};});}
    fit.push({sz:Wd+'x'+Ht,...m,ag}); await c.close();
  }
  const F1=fit.every(f=>f.bot<=f.vh&&!f.ov);
  ok('F1 🔴 다섯 화면 — 월간이 한 화면 · 가로 넘침 0',F1,JSON.stringify(fit.map(f=>f.sz+':'+f.bot+'/'+f.vh+(f.ov?' OV':''))));
  const pad=fit.find(f=>f.sz==='854x1280');
  ok('F2 🔴 854×1280 = 아래 판 · 칸 폭 그대로',pad.pos==='fixed'&&Math.abs(pad.w0-pad.w1)<=1,JSON.stringify(pad));
  ok('F3 ≥1200 = 옆 서랍 330',fit.filter(f=>+f.sz.split('x')[0]>=1200).every(f=>f.pos==='sticky'&&f.dw===330),JSON.stringify(fit.map(f=>f.sz+':'+f.pos+'/'+f.dw)));
  const ph=fit.find(f=>f.sz==='360x780');
  ok('F4 360 주간 = 하루 한 장 · 오늘이 맨 위',ph.ag&&ph.ag.n===7&&ph.ag.first,JSON.stringify(ph.ag));
  const lap=fit.find(f=>f.sz==='1280x720');
  ok('M1 월간 줄 = 업무 일정·마감만 · 넘치면 「+N개 더」',/14:00 교육청 방문/.test(lap.lines)&&/⚑ 계약서 검토/.test(lap.lines)&&lap.more>=1,JSON.stringify(lap));
  ok('M2 「주」 칸(.gwk)이 격자에 없다',fit.every(f=>!f.sun));
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t88 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
