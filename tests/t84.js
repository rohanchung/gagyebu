/* t84 — ⏳ 타임로그 10분 칸 (v4.94)
   로한: 「차라리 로그를 10분 단위로 업데이트 하는 게 어때 — 더 가로로 잘게 쪼개면 되잖아」
   🔒 M1 옛 30분 칸(u 없음)은 접속 때 10분 칸으로(s×3 · e×3+2 · u:10 · g:30) · M2 두 번 옮기지 않는다(멱등)
      M3 옛 판 탭이 나중에 30분 칸으로 쓴 블록도 읽을 때 옮겨진다 · M4 다음 저장에 서버로 10분 칸이 올라간다
      L1 🔴 과거 학습 분 그대로 — 28분 뽀모가 든 옛 30분 칸 둘은 28분(10분 칸으로 쪼개 48분으로 부풀지 않는다)
      L2 옛 칸 · 뽀모 없음은 30분 그대로 · L3 새 10분 칸은 10분씩
      G1 그리드 = 24줄 × 6칸 · G2 제목은 그 줄에서 블록이 차지한 칸만큼 펼친다 · G3 라벨·길이(10분 · 「1h 20m」)
      P1 뽀모·드릴이 10분 칸에 찍힌다(3분 드릴 = 10분 칸 하나) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const words=[];for(let i=0;i<60;i++)words.push({id:'w'+i,kana:'か'+i,kanji:'漢'+i,ko:'뜻'+i});
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{'2026-10-16':[{s:19,e:20,tag:'study',title:'뽀모'}],'2026-10-17':[{s:2,e:3,tag:'sleep',title:''},{s:20,e:21,tag:'work',tag2:'study',title:'근무 중 공부',code:null}]},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
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
  const M=await p.evaluate(()=>{
    const a=JSON.parse(JSON.stringify(tlOf('2026-10-16'))), b=JSON.parse(JSON.stringify(tlOf('2026-10-17')));
    const n2=tlMigAll(DB.timelog);
    /* 옛 판 탭이 같은 날에 30분 칸으로 덧쓴 것(u 없음) */
    DB.timelog['2026-10-17'].push({s:40,e:40,tag:'rest',title:'옛 탭'});
    const c=JSON.parse(JSON.stringify(tlOf('2026-10-17')));
    return {a,b,n2,c};});
  ok('M1 옛 30분 칸 → 10분 칸',JSON.stringify(M.a)==='[{"s":57,"e":62,"tag":"study","title":"뽀모","u":10,"g":30}]'&&M.b[0].s===6&&M.b[0].e===11&&M.b[1].s===60&&M.b[1].e===65,JSON.stringify([M.a,M.b]));
  ok('M2 두 번 옮기지 않는다',M.n2===0,M.n2);
  ok('M3 옛 판 탭이 쓴 30분 칸도 읽을 때 옮겨진다',M.c.some(x=>x.s===120&&x.e===122&&x.u===10),JSON.stringify(M.c));
  await p.evaluate(()=>{logAct('t84');save();});await p.waitForTimeout(2500);
  const srv=await p.evaluate(()=>JSON.stringify(window.__S.kv.timelog.data));
  ok('M4 다음 저장에 서버로 10분 칸이 올라간다',/"s":57,"e":62/.test(srv)&&!/"s":19,/.test(srv),srv.slice(0,200));
  /* L — 학습 분 */
  const L=await p.evaluate(()=>{
    DB.study.pomos=[{id:'q1',at:new Date('2026-10-16T09:40:00+09:00').toISOString(),mins:28,plan:28}];
    const l1=stStudyMins('2026-10-16');
    DB.study.pomos=[];
    const l2=stStudyMins('2026-10-16');
    tlPut('2026-10-18',{s:60,e:61,tag:'study',title:'손으로',code:null});
    const l3=stStudyMins('2026-10-18');
    return {l1,l2,l3};});
  ok('L1 🔴 옛 30분 칸 + 28분 뽀모 = 28분(48분으로 부풀지 않는다)',L.l1===28,L.l1);
  ok('L2 옛 칸 · 뽀모 없음 = 칸 그대로(60분)',L.l2===60,L.l2);
  ok('L3 새 10분 칸 둘 = 20분',L.l3===20,L.l3);
  /* G — 그리드 */
  await p.evaluate(()=>{DB.ui.dailyTab='log';DB.ui.dayOpen=true;setGoalDate('2026-10-18');tlPut('2026-10-18',{s:63,e:70,tag:'work',title:'긴 제목의 일 — 교육청 방문 서류 준비',code:null});document.querySelector('.side .m[data-v="daily"]').click();});
  await p.waitForTimeout(500);
  const G=await p.evaluate(()=>{const rows=[...document.querySelectorAll('.tlgrid .tlrow')];
    const q63=document.querySelector('[data-tlq="63"] em'), q66=document.querySelector('[data-tlq="66"] em');
    const cell=document.querySelector('[data-tlq="63"]').getBoundingClientRect().width, e=q63.getBoundingClientRect().width;
    return {rows:rows.length,cells:rows.map(r=>r.querySelectorAll('.tlq').length),em63:q63&&q63.getAttribute('style'),em66:q66&&q66.className,cell,e,
      lab:slotLabel(63)+'|'+slotRange(63,70)+'|'+hrs(8)+'|'+hrs(1),tl:document.querySelector('.tlstat').textContent};});
  ok('G1 그리드 = 24줄 × 6칸',G.rows===24&&G.cells.every(n=>n===6),JSON.stringify(G.cells.slice(0,3)));
  ok('G2 제목은 그 줄의 남은 칸만큼(10:30 시작 → 3칸) · 다음 줄 첫 칸에 이어 쓴다',/calc\(300% - 6px\)/.test(G.em63||'')&&G.em66==='cont'&&G.e>G.cell,JSON.stringify(G));
  ok('G3 라벨·길이',G.lab==='10:30|10:30–11:50|1h 20m|10m',G.lab);
  ok('G4 기록·미기록 합 = 24h',/기록 1h 40m · 미기록 22h 20m/.test(G.tl),G.tl);
  /* P — 뽀모·드릴이 10분 칸에 */
  const P=await p.evaluate(()=>{const sp=stDrillSpan({at:new Date('2026-10-19T09:05:00+09:00').toISOString(),secs:180});return sp.slots.map(s=>s.i+':'+Math.round(s.m));});
  ok('P1 3분 드릴 = 10분 칸 하나(09:00 = 54)',JSON.stringify(P)==='["54:3"]',JSON.stringify(P));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t84 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
