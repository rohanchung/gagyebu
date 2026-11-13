/* t87 — 📅 데일리: 달력 전체 폭 + 서랍 + 미래 날짜 (v4.97 · 핸드오프 work-page-spec 걸음 B)
   로한: 「오른쪽 할일표를 일자를 클릭하면 오른쪽에서 나오고 다시 누르면 사라지게 해서 캘린더 중점으로」
   🔒 O1 앱을 열면 닫힘(달력만) · O2 날짜 → 열림 · 같은 날짜 → 닫힘 · O3 다른 날짜 → 열린 채 내용만 · O4 Esc · ✕ · O5 헤더 오늘 한 줄 = 오늘 열기
      F1 미래 날을 고를 수 있다 · F2 🔴 미래 날엔 루틴 체크·못 한 사유·타임로그가 안 쓰인다 · F3 루틴은 읽기 전용 · 로그는 「아직 오지 않은 날」
      W1 서랍 💼 업무 탭 = wkOn 같은 답 · W2 서랍에서 넣으면 그 날로 · W3 탭 순서 루틴·업무·로그·식사·학습
      L1 1440 — 서랍이 열려도 달력 7열+주 칸이 다 보인다(밀어내기) · M1 390 — 아래 판 · 가로 넘침 0 · 바깥 누르면 닫힘
      R1 새로고침하면 닫힘(rb_ui 에 열림이 남아 있어도) */
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
  const cell=ds=>p.evaluate(d=>{document.querySelector('#v-daily .gcell[data-gcal="'+d+'"]').click();},ds);
  const st=()=>p.evaluate(()=>({open:!!document.querySelector('#v-daily .ddraw'),sel:(document.querySelector('#v-daily .gcell.sel')||{dataset:{}}).dataset.gcal||null,
    title:(document.querySelector('#v-daily .ddraw .mnav2 b')||{}).textContent||'',cur:curDate()}));
  await p.evaluate(()=>{DB.ui.dview='month';DB.routines=[{id:'r1',code:'A.1',title:'스트레칭',freq:'daily',days:[],status:'active',start:'2026-01-01'}];document.querySelector('.side .m[data-v="daily"]').click();});
  await p.waitForTimeout(300);
  const t=await p.evaluate(()=>todayStr()), t1=await p.evaluate(()=>addDays(todayStr(),1)), tm2=await p.evaluate(()=>addDays(todayStr(),-1));
  const sameMonth=t1.slice(0,7)===t.slice(0,7), past=tm2.slice(0,7)===t.slice(0,7)?tm2:t;
  const O1=await st();
  ok('O1 앱을 열면 닫힘 — 달력만',!O1.open&&!O1.sel,JSON.stringify(O1));
  await cell(past); const s1=await st(); await cell(past); const s2=await st();
  ok('O2 날짜 → 열림 · 같은 날짜 → 닫힘',s1.open&&s1.sel===past&&s1.cur===past&&!s2.open&&!s2.sel,JSON.stringify([s1,s2]));
  await cell(past); await cell(t); const c=await st();
  ok('O3 다른 날짜 → 열린 채 내용만',c.open&&c.cur===t&&c.sel===t,JSON.stringify(c));
  await p.keyboard.press('Escape'); const d=await st();
  await cell(t); await p.evaluate(()=>document.querySelector('#v-daily .ddx').click()); const d2=await st();
  ok('O4 Esc · ✕ 로 닫힌다',!d.open&&!d2.open,JSON.stringify([d,d2]));
  await p.evaluate(()=>{setGoalDate(addDays(todayStr(),-3));document.querySelector('#v-daily .dtop[data-dayopen]').click();}); const e=await st();
  ok('O5 헤더 오늘 한 줄 = 오늘 서랍',e.open&&e.cur===t,JSON.stringify(e));
  /* F — 미래 */
  const F=await p.evaluate(fd=>{gcalPick(fd); const cur=curDate();
    const ck0=JSON.stringify(DB.checks||{}), tl0=JSON.stringify(DB.timelog||{});
    checkToggle(fd,'A.1'); setMiss(fd,'A.1','피곤',''); missModal('A.1');
    DB.ui.dailyTab='routine'; renderDaily();
    const ro=!!document.querySelector('#v-daily .ddraw .rtask.ro')&&!document.querySelector('#v-daily .ddraw [data-rcheck]')&&!document.querySelector('#v-daily .ddraw [data-rmiss]');
    const note1=/아직 오지 않은 날/.test(document.querySelector('#v-daily .ddraw').textContent);
    setDailyTab('log'); const logTxt=document.querySelector('#v-daily .ddraw').textContent, grid=!!document.querySelector('#v-daily .ddraw .tlgrid');
    tlSlotClick(60); tlRangeModal(fd,60,61); const modalOn=document.getElementById('ov').classList.contains('on');
    return {cur,ckSame:ck0===JSON.stringify(DB.checks||{}),tlSame:tl0===JSON.stringify(DB.timelog||{}),pick:DB.ui.tlPick==null,ro,note1,logNote:/아직 오지 않은 날/.test(logTxt),grid,modalOn};},t1);
  ok('F1 미래 날을 고를 수 있다',F.cur===t1,F.cur);
  ok('F2 🔴 미래 날엔 체크·사유·로그가 안 쓰인다',F.ckSame&&F.tlSame&&F.pick&&!F.modalOn,JSON.stringify(F));
  ok('F3 미래 — 루틴 읽기 전용 · 로그 「아직 오지 않은 날」(그리드 없음)',F.ro&&F.note1&&F.logNote&&!F.grid,JSON.stringify(F));
  /* W — 업무 탭 */
  const W=await p.evaluate(fd=>{wkAdd({title:'모레 미팅',day:fd,at:'15:00',dur:60});wkAdd({title:'서류 정리',day:fd});save();
    setDailyTab('work'); const dr=document.querySelector('#v-daily .ddraw');
    const ids=[...dr.querySelectorAll('.wkrow')].map(r=>r.dataset.wk), o=wkOn(fd), want=o.sched.concat(o.todo).map(x=>x.id);
    const i=document.getElementById('wkqd'); i.value='드로어에서 넣음'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    const added=DB.work.tasks.find(x=>x.title==='드로어에서 넣음');
    const tabs=[...document.querySelectorAll('#v-daily .ddraw .dtab')].map(x=>x.dataset.dtab).join(',');
    const em=(document.querySelector('#v-daily .ddraw .dtab[data-dtab="work"] em')||{}).textContent;
    return {ids,want,addedDay:added&&added.day,tabs,em};},t1);
  ok('W1 서랍 업무 탭 = wkOn(그 날) 같은 답',JSON.stringify(W.ids)===JSON.stringify(W.want)&&W.ids.length===2,JSON.stringify(W));
  ok('W2 서랍에서 넣으면 그 날 할 일',W.addedDay===t1,W.addedDay);
  ok('W3 탭 순서 루틴·업무·로그·식사·학습 · 업무 숫자 끝낸/전체(v4.99)',W.tabs==='routine,work,log,meal,study'&&W.em==='0/3',JSON.stringify(W));
  /* L — 1440 밀어내기 */
  await p.waitForTimeout(350);   /* 서랍 애니메이션(0.2초)이 끝난 뒤 잰다 */
  const L=await p.evaluate(()=>{const g=document.querySelector('#v-daily .dmon').getBoundingClientRect(), dr=document.querySelector('#v-daily .ddraw').getBoundingClientRect();
    const cells=[...document.querySelectorAll('#v-daily .dmon > *')].slice(0,7).map(x=>x.getBoundingClientRect().right);
    return {gr:g.right,dl:dr.left,dw:dr.width,maxr:Math.max.apply(null,cells),ov:document.documentElement.scrollWidth>innerWidth+1};});
  ok('L1 1440 — 서랍(330 · v4.98)이 달력을 밀어낸다 · 7열이 다 보인다',Math.abs(L.dw-330)<2&&L.maxr<=L.dl&&L.gr<=L.dl&&!L.ov,JSON.stringify(L));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  /* R — 새로고침하면 닫힘 */
  await p.evaluate(()=>{DB.ui.dayOpen=true;kvUiWrite();});
  await p.reload(); await p.waitForTimeout(2500);
  const R=await p.evaluate(()=>({o:dayOpen(),d:!!document.querySelector('#v-daily .ddraw'),c:curDate()===todayStr()}));
  ok('R1 새로고침하면 닫힘 · 오늘로',!R.o&&!R.d&&R.c,JSON.stringify(R));
  await ctx.close();
  /* M — 390 */
  const ctx2=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await ctx2.addInitScript(FAKE);
  const p2=await ctx2.newPage();await p2.route('**/*supabase*',r=>r.abort());
  await p2.goto('file://'+file);await p2.waitForTimeout(2500);
  const M=await p2.evaluate(()=>{document.querySelector('.side .m[data-v="daily"]').click(); DB.ui.dview='month';renderDaily();
    const c=document.querySelector('#v-daily .gcell[data-gcal="'+todayStr()+'"]'); c.click();
    const dr=document.querySelector('#v-daily .ddraw'), r=dr.getBoundingClientRect(), cs=getComputedStyle(dr);
    const res={pos:cs.position,bot:Math.round(innerHeight-r.bottom),h:Math.round(r.height/innerHeight*100),w:Math.round(r.width),ov:document.documentElement.scrollWidth>innerWidth+1};
    document.querySelector('#v-daily .ddrawbg').click(); res.closed=!document.querySelector('#v-daily .ddraw'); return res;});
  ok('M1 390 — 아래에서 올라오는 판(약 60%) · 가로 넘침 0 · 바깥 누르면 닫힘',M.pos==='fixed'&&M.bot<=1&&M.h>=55&&M.h<=66&&M.w===390&&!M.ov&&M.closed,JSON.stringify(M));
  await ctx2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t87 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
