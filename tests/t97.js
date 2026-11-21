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
/* t97 — 🏵️ 연대기 · 📖 일지 종류 · 🥗 식단 체크 · 🏠 기타(보증금) 자산 · 저장 배지·막대 굵기 (v5.07)
   기획방 notion-import-spec(id 52) §3 · 생활방 deposit-asset-request(id 53) · 기획방 검수 id 50 고칠 것 2건
   🔒 가짜 글만 쓴다(노션 실제 내용·사람 이름 금지) */
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  for(const W of [1280,360]){
  const ctx=await b.newContext({viewport:{width:W,height:900}}); await ctx.addInitScript(require('./_fakeseed').saju);
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort()); await p.route('**/fonts.googleapis.com/**',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const ow=()=>p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);

  /* 빈 상태 — 네 탭이 「아직 없다」 한 줄씩 */
  const E=await p.evaluate(()=>{gotoTab('life'); const out=[];
    ['tl','vow','law','seen'].forEach(k=>{pfL1Set('life',k); const v=document.getElementById('v-life');
      out.push({k,empty:!!v.querySelector('.lfempty'),h1:(v.querySelector('.phead h1')||{}).textContent,han:(v.querySelector('.lffolio h4')||{}).textContent});});
    const tabs=[...document.querySelectorAll('#v-life .pl1 .tab')].map(t=>t.textContent.trim());
    return {out,tabs,life:JSON.stringify(DB.life)};});
  ok('A1 빈 상태 — 네 탭 모두 「아직 없다」 · 제목 🏵️연대기 · 탭 연표·서약·율법·견문록 @'+W,
     E.out.every(x=>x.empty&&/연대기/.test(x.h1))&&E.tabs.join()==='연표,서약,율법,견문록'&&E.out[0].han==='年 表',JSON.stringify(E));
  ok('A2 life 키 존재 보장 · v1 · 배열 넷 @'+W,/"v":1/.test(E.life)&&/"timeline":\[\]/.test(E.life)&&/"seen":\[\]/.test(E.life),E.life);
  ok('A3 빈 상태 가로 넘침 0 @'+W,(await ow())<=0);

  /* 연표 — 날짜를 아는 만큼만 */
  const T=await p.evaluate(()=>{const L=lifeDB(),n=new Date().toISOString();
    [['2015-06','유월 일'],['2015','해만 아는 일'],['2015-06-03','삼일 일'],['2026-03','올해 봄 일'],['날짜틀림','때 모르는 일']].forEach((x,i)=>L.timeline.push({id:'tT'+i,date:x[0],title:x[1],body:'',tag:'',createdAt:n,updatedAt:n,deletedAt:null}));
    L.timeline.push({id:'tTx',date:'2015-01',title:'지운 일',createdAt:n,updatedAt:n,deletedAt:n});
    save(); pfL1Set('life','tl'); const v=document.getElementById('v-life');
    const yrs=[...v.querySelectorAll('.lfyr')].map(y=>({y:y.querySelector('.lfy').childNodes[0].textContent,age:(y.querySelector('.lfy small')||{}).textContent||'',ev:[...y.querySelectorAll('.lfev')].map(e=>(e.querySelector('b').textContent+'|'+e.querySelector('.lfevt').textContent))}));
    return {yrs,dates:L.timeline.map(x=>x.date).join()};});
  const y15=T.yrs.find(y=>y.y==='2015');
  ok('B1 해마다 묶음 · 최근 해가 위 · 그 해 나이(2026=서른여섯 · 지어낸 생일 1990) @'+W,T.yrs[0].y==='2026'&&T.yrs[0].age==='서른여섯'&&!!y15&&y15.age==='스물다섯',JSON.stringify(T.yrs));
  ok('B2 2015 · 2015-06 · 2015-06-03 이 섞여도 순서대로 · 월/월 일/없음 그대로 @'+W,y15&&y15.ev.join('/')==='|해만 아는 일/6월|유월 일/6월 3일|삼일 일',JSON.stringify(y15));
  
  ok('B3 지운 것은 안 보인다 · 틀린 날짜는 「때 모름」 @'+W,T.yrs[T.yrs.length-1].y==='때 모름'&&!T.yrs.some(y=>y.ev.some(e=>/지운 일/.test(e))),JSON.stringify(T.yrs));
  const T2=await p.evaluate(()=>{lfModal('tl'); document.getElementById('lf_date').value='2015-13'; document.getElementById('lf_title').value='잘못된 달';
    const n0=lifeDB().timeline.length; lfSave(); const n1=lifeDB().timeline.length;
    document.getElementById('lf_date').value='2019'; lfSave(); const x=lifeDB().timeline.find(q=>q.title==='잘못된 달');
    return {refused:n1===n0,date:x&&x.date,id:x&&x.id,dl:x&&x.deletedAt===null,ca:!!(x&&x.createdAt)};});
  ok('B4 입력: 2015-13 은 거절 · 2019 는 그대로 저장 · id t… · createdAt·deletedAt @'+W,T2.refused&&T2.date==='2019'&&/^t/.test(T2.id)&&T2.dl&&T2.ca,JSON.stringify(T2));

  /* 서약 */
  const V=await p.evaluate(()=>{const L=lifeDB(),n=new Date().toISOString(),y=String(new Date().getFullYear()+1);
    DB.goals=(DB.goals||[]).concat([{id:'gT1',kind:'year',period:'2026',code:'Y9',title:'가짜 목표',status:'active'}]);
    L.bucket.push({id:'bB',title:'B 서약',pri:'B',type:[],year:null,done:false,doneAt:null,note:'',goalId:null,createdAt:n,updatedAt:n,deletedAt:null},
      {id:'bS',title:'S 서약',pri:'S',type:['여행'],year:null,done:false,doneAt:null,note:'',goalId:'gT1',createdAt:n,updatedAt:n,deletedAt:null},
      {id:'bY',title:'내년 서약',pri:'A',type:[],year:+y,done:false,doneAt:null,note:'',goalId:null,createdAt:n,updatedAt:n,deletedAt:null},
      {id:'bD',title:'이룬 서약',pri:'C',type:[],year:null,done:true,doneAt:'2026-04-02',note:'',goalId:null,createdAt:n,updatedAt:n,deletedAt:null});
    save(); pfL1Set('life','vow'); const v=document.getElementById('v-life');
    const subs=[...v.querySelectorAll('.lfsub')].map(s=>s.textContent);
    const open=[...v.querySelectorAll('.lffolio > .lfvow')].map(r=>r.dataset.id);
    const done=[...v.querySelectorAll('.lfdone .lfvow')].map(r=>r.dataset.id);
    const goal=!!v.querySelector('.lfvow[data-id="bS"] .lfgoal'), rankS=!!v.querySelector('.lfvow[data-id="bS"] .lfrank.s');
    const seal=v.querySelector('.lfvow[data-id="bB"] .lfseal'); seal.click();
    const x=lifeDB().bucket.find(q=>q.id==='bB'), after=!!document.querySelector('#v-life .lfdone .lfvow[data-id="bB"]');
    return {subs,y,open,done,goal,rankS,bdone:x.done,bat:x.doneAt,after,still:lifeDB().bucket.length,gN:(DB.goals||[]).length};});
  ok('C1 평생 → 해 묶음 · 등급 순(S 먼저) · 이룬 것은 접힘 · S 금패 · 목표 칩 @'+W,
     V.subs[0]==='평생의 서약'&&V.subs[1]===V.y+'년의 서약'&&V.open[0]==='bS'&&V.done.join()==='bD'&&V.goal&&V.rankS,JSON.stringify(V));
  ok('C2 봉랍을 누르면 이룸(doneAt 오늘) · 접힌 쪽으로 · 지우지 않는다 · 🔒 목표를 만들지 않는다 @'+W,V.bdone&&V.bat===todayStr0()&&V.after&&V.still===4&&V.gN===1,JSON.stringify(V));

  /* 율법 */
  const Lw=await p.evaluate(()=>{const L=lifeDB(),n=new Date().toISOString();
    L.creed.push({id:'c2',title:'재물',body:'한 줄 조문',ord:2,createdAt:n,updatedAt:n,deletedAt:null},
      {id:'c1',title:'통칙',body:'첫째 항이다\n둘째 항이다',ord:1,createdAt:n,updatedAt:n,deletedAt:null},
      {id:'c3',title:'말씀',body:'가짜 말씀 하나\n가짜 말씀 둘',ord:3,kind:'saying',createdAt:n,updatedAt:n,deletedAt:null});
    save(); pfL1Set('life','law'); const v=document.getElementById('v-life');
    return {h:[...v.querySelectorAll('.lflaw h5')].map(h=>h.textContent),hang:[...v.querySelectorAll('.lflaw[data-id="c1"] p b')].map(b=>b.textContent).join(),
      cap:(v.querySelector('.lfcap')||{}).textContent,prov:v.querySelectorAll('.lfprov').length,note:/로한 화면에서만/.test(v.textContent)};});
  ok('D1 제n조 순서(ord) · 여러 줄은 항 · 첫 글자 장식 · 어른들의 말씀 · 🔒 로한 화면에서만 @'+W,
     Lw.h.join()==='제1조통칙,제2조재물'&&Lw.hang==='1항,2항'&&Lw.cap==='첫'&&Lw.prov===2&&Lw.note,JSON.stringify(Lw));

  /* 견문록 */
  const S1=await p.evaluate(()=>{const L=lifeDB(),n=new Date().toISOString();
    L.seen.push({id:'s1',date:'2026-01-10',title:'가짜 드라마',genre:'드라마',medium:'',grade:'A',note:'',createdAt:n,updatedAt:n,deletedAt:null},
      {id:'s2',date:'2026-05-10',title:'가짜 예능',genre:'예능',medium:'',grade:'S',note:'',createdAt:n,updatedAt:n,deletedAt:null},
      {id:'s3',date:'2025',title:'가짜 게임',genre:'게임',medium:'',grade:null,note:'',createdAt:n,updatedAt:n,deletedAt:null});
    save(); pfL1Set('life','seen'); const v=document.getElementById('v-life');
    const rows=[...v.querySelectorAll('.lfseen')].map(r=>r.dataset.id), cr=[...v.querySelectorAll('.lfcrest')].map(c=>c.className.replace('lfcrest','').trim()+':'+c.textContent);
    const chips=[...v.querySelectorAll('.pl2 .chp')].map(c=>c.textContent);
    const c=[...v.querySelectorAll('.pl2 .chp')].find(x=>/예능/.test(x.textContent)); c.click();
    const after=[...document.querySelectorAll('#v-life .lfseen')].map(r=>r.dataset.id); lfGenreSet(-1);
    return {rows,cr,chips,after};});
  ok('E1 날짜 최근순 · 방패 문장(S 금·A 붉음 · 없음은 –) · 장르 칩으로 거른다 @'+W,
     S1.rows.join()==='s2,s1,s3'&&S1.cr.join()==='s:S,a:A,none:–'&&S1.chips.length===4&&S1.after.join()==='s2',JSON.stringify(S1));

  /* 지우기 = deletedAt */
  const Dl=await p.evaluate(()=>{lfModal('seen','s3'); lfDel(); const x=lifeDB().seen.find(q=>q.id==='s3'); return {kept:!!x,del:!!(x&&x.deletedAt),shown:!!document.querySelector('#v-life .lfseen[data-id="s3"]')};});
  ok('E2 지우기 = deletedAt(배열에 남는다) · 화면에서 빠진다 @'+W,Dl.kept&&Dl.del&&!Dl.shown,JSON.stringify(Dl));

  for(const k of ['tl','vow','law','seen']){await p.evaluate(k=>pfL1Set('life',k),k); const o=await ow(); ok('F1 '+k+' 가로 넘침 0 @'+W,o<=0,o);}
  const F2=await p.evaluate(()=>({sv:getComputedStyle(document.documentElement).getPropertyValue('--serif').trim(),lf:getComputedStyle(document.documentElement).getPropertyValue('--lf-serif').trim(),
     h:getComputedStyle(document.querySelector('#v-life .lffolio h4')).fontFamily}));
  ok('F2 🔒 전역 --serif 는 그대로 · 이 페이지만 --lf-serif(명조 → 대체 글꼴) @'+W,!/Myeongjo/.test(F2.sv)&&/Myeongjo/.test(F2.lf)&&/Myeongjo/.test(F2.h),JSON.stringify(F2));
  ok('F3 🔒 연대기 키는 충돌 비교·중복 id 검사에 등록 @'+W,await p.evaluate(()=>['timeline','bucket','creed','seen'].every(k=>SYNC_COLS.some(c=>c.p&&c.p[0]==='life'&&c.p[1]===k)&&DUP_PATHS.some(d=>d[0]==='life.'+k))));

  if(W===1280){
  /* 📖 일지 종류 */
  const J=await p.evaluate(()=>{DB.journal=[{id:'j1',date:'2026-11-01T10:00',title:'옛 기록',moods:[],place:'',body:'가짜'},{id:'j2',date:'2026-11-02T10:00',title:'둘째 옛 기록',moods:[],place:'',body:''}]; save();
    gotoTab('journal'); const chips=[...document.querySelectorAll('#v-journal .pl2 .chp')].map(c=>c.textContent);
    journalModal(null); document.querySelector('#j_kind .sg[data-seg="meet"]').click(); document.getElementById('j_title').value='가짜 만남'; saveJournal(null);
    const m=DB.journal.find(x=>x.title==='가짜 만남'), mk=m.kind;
    jnKindSet('meet'); const shown=[...document.querySelectorAll('#v-journal .jentry')].length;
    jnKindSet('diary'); const shownD=[...document.querySelectorAll('#v-journal .jentry')].length;
    journalModal(m.id); document.querySelector('#j_kind .sg[data-seg="diary"]').click(); saveJournal(m.id); jnKindSet('all');
    return {chips,mk,shown,shownD,back:!('kind' in DB.journal.find(x=>x.id===m.id)),old:DB.journal.filter(x=>x.id==='j1'||x.id==='j2').every(x=>!('kind' in x)),n:DB.journal.length};});
  ok('G1 일지 칩 전체·일기·만남·회고 · 옛 기록 2건은 「일기」(칸 없음 그대로)',J.chips.map(c=>c.replace(/\s*\d+$/,'')).join()==='전체,일기,만남,회고'&&/일기\s*2/.test(J.chips[1])&&J.old,JSON.stringify(J));
  ok('G2 만남으로 쓰면 kind:meet · 칩으로 거른다 · 일기로 되돌리면 칸을 지운다 · 수 그대로',J.mk==='meet'&&J.shown===1&&J.shownD===2&&J.back&&J.n===3,JSON.stringify(J));

  /* 🥗 식단 */
  const M=await p.evaluate(()=>{const t=todayStr(); DB.meals[t]={l:{p:'',a:'가짜 점심'}}; save();
    setTlDate&&setTlDate(t); dayOpenSet(true); setDailyTab('meal'); renderDaily();
    const row=!!document.getElementById('mldiet'); document.getElementById('ml_d').value='적던 저녁';
    document.querySelector('#mldiet .sg[data-seg="0"]').click(); const w=document.getElementById('md_why'); const vis=!w.hidden; w.value='가짜 이유'; w.dispatchEvent(new Event('change'));
    const kept=document.getElementById('ml_d').value; const c=JSON.parse(JSON.stringify(DB.meals[t]));
    document.querySelector('#mldiet .sg[data-seg=""]').click(); const c2=JSON.parse(JSON.stringify(DB.meals[t]));
    document.querySelector('#mldiet .sg[data-seg="1"]').click(); const c3=JSON.parse(JSON.stringify(DB.meals[t]));
    const fut=(function(){const f=addDays(t,3);setTlDate(f);renderDaily();return !document.getElementById('mldiet');})(); setTlDate(t);
    return {row,vis,kept,c,c2,c3,fut};});
  ok('H1 식사 탭 머리에 식단 줄 · 못 지킴 → 이유 칸 · 즉시 저장 · 🔒 적던 끼니 칸을 날리지 않는다',M.row&&M.vis&&M.kept==='적던 저녁'&&M.c.dietOk===false&&M.c.dietWhy==='가짜 이유'&&M.c.l.a==='가짜 점심',JSON.stringify(M));
  ok('H2 「기록 없음」은 칸을 지운다(안 지킴이 아니다) · 지킴은 true · 미래 날은 줄 없음',!('dietOk' in M.c2)&&!('dietWhy' in M.c2)&&M.c3.dietOk===true&&M.fut,JSON.stringify(M));
  const Mg=await p.evaluate(()=>{const d={meals:{'2026-10-01':{dietOk:false,dietWhy:'가짜',l:'옛 문자열'}}}; migrateDB(d); return d.meals['2026-10-01'];});
  ok('H3 🔴 마이그레이션은 dietWhy 를 끼니로 감싸지 않는다(옛 문자열 끼니는 감싼다)',Mg.dietWhy==='가짜'&&Mg.dietOk===false&&Mg.l.a==='옛 문자열',JSON.stringify(Mg));
  const Ws=await p.evaluate(()=>{DB.health.weights=[{date:'2026-10-01',kg:70},{date:'2026-10-02',kg:69.8},{date:'2026-10-03',kg:69.5}];
    DB.meals['2026-10-01']={dietOk:true,dietWhy:''}; DB.meals['2026-10-03']={dietOk:false,dietWhy:'가짜'}; save(); gotoTab('weight'); pfL1Set('weight','body');
    const s=document.querySelector('#v-weight .dstrip'); return s?{t:s.querySelector('.dsl').textContent,d:[...s.querySelectorAll('.dsd')].map(x=>x.textContent).join('')}:null;});
  ok('H4 체중 그래프 아래 ●/✕ 한 줄(측정한 날에 맞춰) · 수',Ws&&Ws.d==='●✕'&&/지킴 2/.test(Ws.t)&&/못 지킴 1/.test(Ws.t),JSON.stringify(Ws));

  /* 🏠 기타(보증금) 자산 */
  const A=await p.evaluate(()=>{DB.accounts=[{id:'aC',name:'가짜 통장',group:'현금성',mode:'auto',hist:[],opening:{date:'2026-11-01',amount:1000000}},
      {id:'aD',name:'보증금 · 가짜 집',group:'기타',mode:'manual',hist:[],opening:{date:'2026-11-01',amount:2000000}}];
    DB.transactions=[{id:'tr1',type:'transfer',from:'aC',to:'aD',amt:500000,date:'2026-11-13',scope:'personal',memo:'가짜 계약금'}]; save();
    const r={cash:sourceValue('cash'),cd:sourceValue('cashdep'),net:totalAssets(),isCash:isCashAcct(DB.accounts[1]),cashList:cashAccts().map(a=>a.id).join()};
    gotoTab('acct'); const v=document.getElementById('v-acct'); r.grp=[...v.querySelectorAll('.grp .ghd')].map(h=>h.textContent.replace(/[\d,원₩\s]+$/,'').trim());
    accModal(null); r.opt=[...document.getElementById('ac_group').options].map(o=>o.value).join(); closeModal();
    r.snap=netSnapRow().etc; r.src=GOAL_SOURCES.some(s=>s.k==='cashdep'); return r;});
  ok('I1 기타 계좌 — 현금성 합계에서 빠지고(50만 → 기타 250만) 순자산엔 든다 · 현금성+기타 원천',A.cash===500000&&A.cd===3000000&&A.net===3000000&&!A.isCash&&A.cashList==='aC'&&A.src,JSON.stringify(A));
  ok('I2 계좌 그룹에 「기타」 · 계좌·부채에 기타 묶음 · 월 스냅샷 etc',/기타/.test(A.opt)&&A.grp.some(g=>/^기타/.test(g))&&A.snap===2500000,JSON.stringify(A));
  const Tr=await p.evaluate(()=>{gotoTab('cal'); txnModal&&txnModal('tr1'); const f=document.getElementById('fFrom'); const o=f?[...f.options].map(x=>x.value).join():''; closeModal(); return o;});
  ok('I3 이체 출발 계좌로 보증금 계좌를 고를 수 있다(돌려받을 때)',/aD/.test(Tr),Tr);
  const R=await p.evaluate(()=>{   /* 🔴 v5.08 로한 11/16 — 기초잔액 없이 「나중에」 만든 보증금 계좌 */
    DB.accounts=[{id:'aC',name:'가짜 통장',group:'현금성',mode:'auto',hist:[],opening:{date:'2026-11-01',amount:1000000}},
      {id:'aP',name:'보증금 가짜(가상동A)',group:'기타',mode:'manual',hist:[{date:'2026-11-16',amount:0}]},
      {id:'aU',name:'보증금 가짜(가상동B)',group:'기타',mode:'manual',hist:[{date:'2026-11-16',amount:2000000}]}];
    DB.transactions=[{id:'tr1',type:'transfer',from:'aC',to:'aP',amt:500000,date:'2026-11-13',memo:'가짜 계약금',cat:'이체',acct:'aC',method:'이체'}]; save();
    gotoTab('acct'); const row=[...document.querySelectorAll('#v-acct .row')].find(r=>/가상동A/.test(r.textContent));
    return {p:accVal(DB.accounts[1]),u:accVal(DB.accounts[2]),c:accVal(DB.accounts[0]),net:totalAssets(),row:row?row.textContent:''};});
  ok('I4 🔴 기초잔액 없이 만든 보증금 계좌도 이체가 붙는다(만든 날보다 앞선 이체 포함) · 계좌·부채 행에 50만',R.p===500000&&R.u===2000000&&R.c===500000&&R.net===3000000&&/500,000/.test(R.row),JSON.stringify(R));
  }else{
  /* 폰 — 저장 배지는 여백의 점 · 학습 요약 막대 굵기 같음 */
  const B=await p.evaluate(()=>{saveBadge('✓ 저장됨','ok'); const r=document.getElementById('savebadge').getBoundingClientRect(); const ok1=r.width<=20&&r.height<=20;
    saveBadge('✕ 저장 안 됨','bad'); const r2=document.getElementById('savebadge').getBoundingClientRect(); saveBadge('');
    return {ok1,w:r.width,bad:r2.width>40};});
  ok('J1 폰: 「✓ 저장됨」은 20px 이하 점 · 실패는 알약 그대로',B.ok1&&B.bad,JSON.stringify(B));
  }
  const G=await p.evaluate(()=>{gotoTab('study'); setStTab('word'); const bs=[...document.querySelectorAll('#v-study .ssum .sbox .sgb')].map(g=>Math.round(g.getBoundingClientRect().height)); return bs;});
  ok('J2 학습 요약 칸 막대 굵기가 같다 @'+W,G.length>=2&&G.every(h=>h===G[0]),JSON.stringify(G));
  ok('Z 페이지 에러 없음 @'+W,errs.length===0,errs.join(' | '));
  await ctx.close();
  }
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t97 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
function todayStr0(){const d=new Date(),p=n=>(n<10?'0':'')+n;return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
