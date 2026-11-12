/* t86 — 💼 업무 페이지 · work 키 (v4.96 · 핸드오프 work-page-spec 걸음 A)
   로한: 「실행 카테고리 내 업무 페이지 … 보통의 업무 to do list」
   🔒 E1 빈 상태(work 없음)에서 work 가 생기고 페이지가 뜬다 · E2 네비 = 데일리 바로 아래
      Q1 빠른 추가 = 오늘 · id 'w'+uid · day0=day · moved 0 · Q2 「날짜 없음」 칩이면 day null
      D1 끝냄 → doneAt · 되돌림 → todo · L1 🔴 밀린 일의 day 를 앱이 안 바꾼다(다시 그려도 그대로)
      M1 [오늘로] = day 오늘 · moved+1 · day0 그대로 · M2 상세에서 뒤로 옮겨도 moved+1 · 앞으로 당기면 그대로
      X1 🔴 삭제 = deletedAt(배열에 남는다) · 목록에서 빠진다 · X2 안 하기로 = drop(삭제와 다르다)
      O1 🔴 wkOn 하나 — 페이지 「오늘」 묶음과 같은 답 · K1 KPI·헤더 숫자 · F1 끝낸 것 탭(주 이동 · 안 하기로)
      S1 서버(kv)에 work 키로 저장된다 · S2 충돌창 SYNC_COLS 에 업무가 있다 · T1 터치 기기에선 [+ 업무]가 오른쪽 아래 */
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
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const E=await p.evaluate(()=>{const nav=[...document.querySelectorAll('.side .m[data-v]')].map(x=>x.dataset.v);
    document.querySelector('.side .m[data-v="work"]').click();
    return {work:JSON.stringify(DB.work),nav:nav.slice(0,3).join(','),h1:(document.querySelector('#v-work .phead h1')||{}).textContent,len:document.getElementById('v-work').innerHTML.length,empty:!!document.querySelector('#v-work .wkempty')};});
  ok('E1 빈 상태에서 work 가 생기고 페이지가 뜬다',E.work==='{"v":1,"tasks":[],"projects":[]}'&&/업무/.test(E.h1||'')&&E.empty&&E.len>200,JSON.stringify(E));
  ok('E2 네비 = 데일리 바로 아래',E.nav==='daily,work,goal',E.nav);
  /* Q — 빠른 추가 */
  const Q=await p.evaluate(()=>{const t=todayStr();
    const i=document.getElementById('wkq'); i.value='교육청 방문'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    const a=DB.work.tasks[0];
    wkQSet('none'); const j=document.getElementById('wkq'); j.value='교재 발주'; j.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    const b=DB.work.tasks[1]; wkQSet('today');
    return {a:JSON.parse(JSON.stringify(a)),b:JSON.parse(JSON.stringify(b)),t,rows:document.querySelectorAll('#v-work .wkrow').length};});
  ok('Q1 빠른 추가 = 오늘 · id w… · day0 · moved 0',Q.a.title==='교육청 방문'&&Q.a.day===Q.t&&Q.a.day0===Q.t&&Q.a.moved===0&&/^w/.test(Q.a.id)&&Q.a.status==='todo'&&Q.a.deletedAt===null&&Q.a.by==='rohan',JSON.stringify(Q.a));
  ok('Q2 「날짜 없음」이면 day null · 화면에 둘',Q.b.day===null&&Q.b.day0===null&&Q.rows===2,JSON.stringify(Q.b)+' rows='+Q.rows);
  /* D — 끝냄·되돌림 */
  const D=await p.evaluate(()=>{const id=DB.work.tasks[0].id; wkToggle(id); const d1=JSON.parse(JSON.stringify(wkById(id))); wkToggle(id); const d2=JSON.parse(JSON.stringify(wkById(id)));return {d1,d2};});
  ok('D1 끝냄 → done·doneAt · 되돌림 → todo·doneAt null',D.d1.status==='done'&&!!D.d1.doneAt&&D.d2.status==='todo'&&D.d2.doneAt===null,JSON.stringify(D));
  /* L — 밀린 것 */
  const L=await p.evaluate(()=>{const t=todayStr(), d=addDays(t,-2);
    const x=wkAdd({title:'부가세 자료 정리',day:d}); save(); renderWork(); renderWork();
    const row=document.querySelector('#v-work .wkgrp.late .wkrow[data-wk="'+x.id+'"]');
    return {day:wkById(x.id).day,d,late:!!row,txt:row?row.textContent:'',id:x.id};});
  ok('L1 🔴 밀린 일의 day 를 앱이 안 바꾼다 · 「밀린 것」에 2일 밀림',L.day===L.d&&L.late&&/2일 밀림/.test(L.txt),JSON.stringify(L));
  /* M — 미룸 */
  const M=await p.evaluate(id=>{const t=todayStr(); wkMove(id,'today'); const m1=JSON.parse(JSON.stringify(wkById(id)));
    wkModal(id); document.getElementById('wk_d').value=addDays(t,3); wkSave(id); const m2=JSON.parse(JSON.stringify(wkById(id)));
    wkModal(id); document.getElementById('wk_d').value=addDays(t,1); wkSave(id); const m3=JSON.parse(JSON.stringify(wkById(id)));
    return {m1,m2,m3,t};},L.id);
  ok('M1 [오늘로] = day 오늘 · moved 1 · day0 그대로',M.m1.day===M.t&&M.m1.moved===1&&M.m1.day0===L.d,JSON.stringify(M.m1));
  ok('M2 상세에서 뒤로 = moved+1 · 앞으로 당기면 그대로',M.m2.moved===2&&M.m3.moved===2&&M.m3.day0===L.d,JSON.stringify([M.m2.moved,M.m3.moved,M.m3.day0]));
  /* X — 삭제·안 하기로 */
  const X=await p.evaluate(()=>{const a=wkAdd({title:'지울 것',day:todayStr()}), b=wkAdd({title:'안 할 것',day:todayStr()}); save();
    wkDel(a.id); wkDrop(b.id); renderWork();
    const inArr=DB.work.tasks.some(x=>x.id===a.id&&x.deletedAt), shown=!!document.querySelector('#v-work .wkrow[data-wk="'+a.id+'"]'), shownB=!!document.querySelector('#v-work .wkrow[data-wk="'+b.id+'"]');
    return {inArr,shown,shownB,bs:wkById(b.id).status,bdel:wkById(b.id).deletedAt};});
  ok('X1 🔴 삭제 = deletedAt(배열에 남는다) · 목록에서 빠진다',X.inArr&&!X.shown,JSON.stringify(X));
  ok('X2 안 하기로 = drop · 삭제가 아니다 · 할 일 목록엔 안 보인다',X.bs==='drop'&&X.bdel===null&&!X.shownB,JSON.stringify(X));
  /* O — wkOn 하나 */
  const O=await p.evaluate(()=>{const t=todayStr(); wkAdd({title:'14시 회의',day:t,at:'14:00',dur:60}); wkAdd({title:'★ 계약서',day:t,pri:1,due:addDays(t,2)}); wkAdd({title:'모레 마감 다른 날',day:addDays(t,5),due:t}); save(); renderWork();
    const on=wkOn(t), ids=on.sched.concat(on.todo).map(x=>x.id);
    const grp=[...document.querySelectorAll('#v-work .wkgrp')].find(g=>/^오늘/.test(g.querySelector('.wkgh').textContent));
    const shown=grp?[...grp.querySelectorAll('.wkrow')].map(r=>r.dataset.wk):[];
    const first=grp?grp.querySelector('.wkrow .wkt').textContent:'';
    return {ids,shown,first,due:on.dueHere.map(x=>x.title),left:on.left,kpi:[...document.querySelectorAll('#v-work .kpi .kv')].map(x=>x.textContent),st:document.querySelector('#v-work .ph-s').textContent};});
  ok('O1 🔴 페이지 「오늘」 = wkOn(오늘) 과 같은 답 · 일정이 먼저',JSON.stringify(O.ids)===JSON.stringify(O.shown)&&O.first==='14시 회의'&&O.due.indexOf('모레 마감 다른 날')>=0,JSON.stringify(O));
  ok('K1 헤더·KPI 숫자(오늘 남은 · 밀린 0 · 이번 주 마감)',O.kpi[0]===String(O.left)&&O.kpi[1]==='0'&&new RegExp('오늘 '+O.left+' · 밀린 0').test(O.st),JSON.stringify(O.kpi)+' '+O.st);
  /* F — 끝낸 것 탭 */
  const F=await p.evaluate(()=>{const x=DB.work.tasks.find(t=>t.title==='14시 회의'); wkToggle(x.id); pfL1Set('work','done');
    const txt=document.getElementById('v-work').textContent; wkWeekMv(-1); const prev=document.getElementById('v-work').textContent; wkWeekMv(0);
    return {has:/14시 회의/.test(txt),drop:/안 하기로 함/.test(txt)&&/안 할 것/.test(txt),prevEmpty:/끝낸 것이 없다/.test(prev)};});
  ok('F1 끝낸 것 탭 — 이번 주 끝낸 것 · 안 하기로 · 지난주로 이동',F.has&&F.drop&&F.prevEmpty,JSON.stringify(F));
  await p.evaluate(()=>pfL1Set('work','todo'));
  /* S — 서버·충돌창 */
  await p.evaluate(()=>save()); await p.waitForTimeout(2500);
  const S=await p.evaluate(()=>{const k=window.__S.kv.work;return {has:!!k,n:k&&k.data&&k.data.tasks&&k.data.tasks.length,local:DB.work.tasks.length,del:!!(k&&k.data.tasks.some(t=>t.deletedAt)),sync:SYNC_COLS.some(c=>c.k==='wk_tasks'&&c.p.join('/')==='work/tasks')&&SYNC_COLS.some(c=>c.k==='wk_projects')};});
  ok('S1 서버(app_kv)에 work 키로 저장 · 삭제분까지',S.has&&S.n===S.local&&S.n>=6&&S.del,JSON.stringify(S));
  ok('S2 충돌창(SYNC_COLS)에 업무·묶음',S.sync);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
  /* T — 터치 기기 */
  const ctx2=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await ctx2.addInitScript(FAKE);
  const p2=await ctx2.newPage();await p2.route('**/*supabase*',r=>r.abort());
  await p2.goto('file://'+file);await p2.waitForTimeout(2500);
  const T=await p2.evaluate(()=>{document.documentElement.classList.add('tch');document.querySelector('.side .m[data-v="work"]').click();
    const b=document.querySelector('#v-work .wkfab').getBoundingClientRect();return {pos:getComputedStyle(document.querySelector('#v-work .wkfab')).position,r:innerWidth-b.right,bt:innerHeight-b.bottom,ov:document.documentElement.scrollWidth>innerWidth+1};});
  ok('T1 터치 기기 — [+ 업무]가 오른쪽 아래 · 가로 넘침 없음',T.pos==='fixed'&&T.r<40&&T.bt<40&&!T.ov,JSON.stringify(T));
  await ctx2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t86 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
