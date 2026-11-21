/* t92 — 💼 업무 ▶ 시간 자동 기록 (v5.04 · work-v2-spec E1)
   🔒 E0 빈 상태 · E1 ▶/■ · E2 25분 → runs·타임로그 wk·⏱ · E3 바꿔 ▶ · E4 1분 미만 버림 · E5/E6 빈 칸만(식사 그대로 · 「채움」은 잇는다)
      E7 tlPiece — 자를 때 wk 유지 · E8 자정 나누기 · E9 끝냄=■ · E10 4시간 물음 · E11 시간 적기 · E12 로그 업무 연결 · E13 극단 · E14 칩 · P1 폰 한 줄 */
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
  /* 빈 상태 */
  const E0=await p.evaluate(()=>{gotoTab('work');return {run:wkRun(),rows:document.querySelectorAll('#v-work .wkrow').length,hasRun:'run' in wkDB()};});
  ok('E0 빈 상태 — 업무 없음 · run 없음 · run 칸을 미리 만들지 않는다',E0.run===null&&E0.rows===0&&!E0.hasRun,JSON.stringify(E0));

  const A=await p.evaluate(()=>{const t=todayStr();
    const a=wkAdd({title:'교육청 방문',day:t}), c=wkAdd({title:'계약서 검토',day:t}), f=wkAdd({title:'다음 주 일',day:addDays(t,3)});
    save(); renderWork();
    const go=document.querySelectorAll('#v-work .wkrow .wkgo').length;
    wkStart(a.id);
    const r1=wkRun(), on=document.querySelector('#v-work .wkrow[data-wk="'+a.id+'"] .wkgo.on'), head=document.querySelector('#v-work').textContent;
    window.__ids={a:a.id,c:c.id,f:f.id}; return {go,run:!!r1&&r1.id===a.id,on:!!on,head:/▶ 교육청 방문/.test(head)};});
  ok('E1 todo 행마다 ▶ · 누르면 하는 중(■) · 머리에 칩',A.go===3&&A.run&&A.on&&A.head,JSON.stringify(A));

  const B=await p.evaluate(()=>{const W=wkDB(), id=window.__ids.a; W.run.at=Date.now()-25*60000-5000; wkStop();
    const x=wkById(id), ds=todayStr(), bl=tlOf(ds).filter(b=>b.wk===id);
    return {run:wkRun(),runs:x.runs.length,mins:x.runs[0]&&x.runs[0].mins,blk:bl.length,tag:bl[0]&&bl[0].tag,title:bl[0]&&bl[0].title,
      spent:(document.querySelector('#v-work .wkrow[data-wk="'+id+'"] .wkspent')||{}).textContent||'',chip:/▶ 교육청/.test(document.querySelector('#v-work').textContent)};});
  ok('E2 🔴 25분 뒤 ■ — runs 1건(실제 분) · 그 날 타임로그에 wk 칸 · 행에 ⏱ · 칩 사라짐',
     B.run===null&&B.runs===1&&B.mins>=25&&B.mins<25.3&&B.blk>=1&&B.tag==='work'&&B.title==='교육청 방문'&&/⏱ 25m/.test(B.spent)&&!B.chip,JSON.stringify(B));

  const C=await p.evaluate(()=>{const {a,c}=window.__ids; wkStart(c); wkDB().run.at=Date.now()-10*60000; wkStart(a);
    return {run:wkRunId()===a, cRuns:(wkById(c).runs||[]).length, cMin:(wkById(c).runs||[])[0]&&wkById(c).runs[0].mins};});
  ok('E3 하는 중에 다른 업무 ▶ — 앞 것이 기록되고 뒤 것이 하는 중(묻지 않는다)',C.run&&C.cRuns===1&&C.cMin>=10,JSON.stringify(C));

  const D=await p.evaluate(()=>{const {a}=window.__ids; wkDB().run.at=Date.now()-20000; const n0=(wkById(a).runs||[]).length; const t0=JSON.stringify(DB.timelog);
    wkStop(); return {n:(wkById(a).runs||[]).length-n0, tl:JSON.stringify(DB.timelog)===t0, run:wkRun()};});
  ok('E4 1분 미만은 버린다 — runs·타임로그 그대로',D.n===0&&D.tl&&D.run===null,JSON.stringify(D));

  /* 손으로 쓴 식사 칸 · 「채움」 칸 */
  const E=await p.evaluate(()=>{const ds='2026-11-10'; delete DB.timelog[ds];
    tlPut(ds,{s:60,e:62,tag:'meal',title:'점심',code:null});
    tlPut(ds,{s:63,e:65,tag:'work',title:'채움',code:null});
    tlPut(ds,{s:70,e:72,tag:'work',title:'학원 상담 준비',code:null});
    const x=wkById(window.__ids.c), n0=x.runs.length;
    wkLogRun(x,{at:new Date(2026,10,10,9,55).toISOString(),mins:85});   /* 09:55~11:20 = 칸 59~67 · 70~72 는 밖 */
    const L=tlOf(ds), at=i=>L.find(b=>i>=b.s&&i<=b.e)||null;
    return {meal:!!at(61)&&at(61).tag==='meal'&&!at(61).wk&&at(61).title==='점심', claim:!!at(64)&&at(64).wk===x.id&&at(64).title==='계약서 검토',
      fresh:!!at(59)&&at(59).wk===x.id&&at(59).tag==='work', after:!!at(67)&&at(67).wk===x.id, keep:!!at(71)&&!at(71).wk&&at(71).title==='학원 상담 준비',
      mins:x.runs[n0]&&x.runs[n0].mins};});
  ok('E5 🔴 손으로 쓴 식사 칸은 그대로 · runs 는 실제 분(85)',E.meal&&E.mins===85,JSON.stringify(E));
  ok('E6 「채움」 한 단어 업무 칸은 이 업무로 잇는다 · 빈 칸은 새로 · 다른 제목은 안 건드린다',E.claim&&E.fresh&&E.after&&E.keep,JSON.stringify(E));

  const F=await p.evaluate(()=>{const ds='2026-11-11'; delete DB.timelog[ds];
    tlPut(ds,{s:50,e:60,tag:'work',title:'교육청 방문',code:null,wk:'wX'});
    stTlMarkStudy({date:ds,slots:[{i:54,m:10},{i:55,m:10}]},'🈶 드릴 · 뜻 맞히기 3문항');
    const L=tlOf(ds), at=i=>L.find(b=>i>=b.s&&i<=b.e)||null;
    const r1={a:at(52)&&at(52).wk,m:at(54)&&at(54).wk,m2:at(54)&&at(54).tag2,z:at(58)&&at(58).wk};
    tlPut(ds,{s:57,e:57,tag:'rest',title:'',code:null}); tlDelRange(ds,59,59);
    const L2=tlOf(ds), at2=i=>L2.find(b=>i>=b.s&&i<=b.e)||null;
    return Object.assign(r1,{p56:at2(56)&&at2(56).wk,p58:at2(58)&&at2(58).wk,p60:at2(60)&&at2(60).wk,gone:at2(59)});});
  ok('E7 🔴 wk 칸 가운데에 드릴이 찍혀도 앞뒤 조각에 wk 가 남는다(tlPiece) · 가운데는 일+학습',F.a==='wX'&&F.z==='wX'&&F.m==='wX'&&F.m2==='study',JSON.stringify(F));
  ok('E7b 덮어쓰기·구간 지우기 뒤에도 조각에 wk',F.p56==='wX'&&F.p58==='wX'&&F.p60==='wX'&&F.gone===null,JSON.stringify(F));

  const G=await p.evaluate(()=>{const x=wkById(window.__ids.f), n0=(x.runs||[]).length;
    const y=new Date(); y.setDate(y.getDate()-1); y.setHours(23,50,0,0);
    const ds1=wkLocalDay(y.toISOString()), ds2=todayStr(); delete DB.timelog[ds1];
    wkLogRun(x,{at:y.toISOString(),mins:30});
    const R=x.runs.slice(n0);
    return {n:R.length,m:R.map(r=>r.mins),d1:tlOf(ds1).some(b=>b.wk===x.id&&b.s===143),d2:tlOf(ds2).some(b=>b.wk===x.id&&b.s===0),day:x.day===addDays(todayStr(),3)};});
  ok('E8 자정을 넘기면 두 날로 — runs 2건(10·20) · 타임로그도 날마다 · 업무 day 는 그대로',G.n===2&&G.m[0]===10&&G.m[1]===20&&G.d1&&G.d2&&G.day,JSON.stringify(G));

  const H=await p.evaluate(()=>{const {c}=window.__ids; wkStart(c); wkDB().run.at=Date.now()-5*60000; const n0=wkById(c).runs.length; wkToggle(c);
    const x=wkById(c); return {done:x.status==='done',run:wkRun(),rec:x.runs.length-n0};});
  ok('E9 하는 중인 업무를 ☐ 끝냄 = ■ + 끝냄',H.done&&H.run===null&&H.rec===1,JSON.stringify(H));

  const I=await p.evaluate(async()=>{const {a}=window.__ids; wkDB().run={id:a,at:Date.now()-5*3600000}; wkRunBoot(); await new Promise(r=>setTimeout(r,700));
    const ask=/아직 하는 중인가/.test(document.body.innerText); const stillRun=!!wkRun();
    wkStaleEnd();
    const x=wkById(a), last=x.runs[x.runs.length-1];
    return {ask,stillRun,last:last&&last.mins,run:wkRun()};});
  ok('E10 🔴 4시간 넘게 켜 둔 채 열면 묻는다 · 혼자 끝내지 않는다 · 「그 시각에 끝냄」 기본 = 시작+1시간(분 단위라 초는 버림)',I.ask&&I.stillRun&&I.last>=59&&I.last<=60&&I.run===null,JSON.stringify(I));

  const J=await p.evaluate(()=>{const {a}=window.__ids; wkModal(a); const has=!!document.getElementById('wk_lm');
    const d=new Date(Date.now()-3*3600000); document.getElementById('wk_ld').value=wkLocalDay(d.toISOString());
    document.getElementById('wk_lt').value=String(d.getHours()).padStart(2,'0')+':00'; document.getElementById('wk_lm').value='30';
    const n0=wkById(a).runs.length; wkLogManual(a); const x=wkById(a);
    return {has,add:x.runs.length-n0,m:x.runs[x.runs.length-1].mins};});
  ok('E11 상세 「⏱ 들인 시간 · + 시간 적기」 → runs 1건',J.has&&J.add===1&&J.m===30,JSON.stringify(J));

  const K=await p.evaluate(()=>{const ds=todayStr(); const {a}=window.__ids; tlRangeModal(ds,100,101);
    const sel=document.getElementById('tl_wk'); const opts=sel?[...sel.options].map(o=>o.value):[];
    if(sel){sel.value=a; wkTlLinkPick(sel);} const tag=modal._tltag; const n0=wkById(a).runs.length; tlSave(ds);
    const bb=tlAt(ds,100); return {a,opts:opts.includes(a),tag,wk:bb&&bb.wk,runs:wkById(a).runs.length-n0};});
  ok('E12 로그 구간 편집 「업무 연결」 — wk 가 붙고 태그 비었으면 「일」 · runs 는 안 는다',K.opts&&K.tag==='work'&&K.wk===K.a&&K.runs===0,JSON.stringify(K));

  const L=await p.evaluate(()=>{const W=wkDB(); W.run={id:'없는업무',at:Date.now()}; const r1=wkRun(); renderWork();
    const x=wkById(window.__ids.f); const keep=x.runs; x.runs='깨짐'; const sp=wkSpent(x); renderWork(); x.runs=keep; W.run=null; return {r1,sp};});
  ok('E13 극단 — run 이 없는 업무를 가리키면 하는 중 아님 · runs 가 배열이 아니면 0',L.r1===null&&L.sp===0,JSON.stringify(L));

  const M=await p.evaluate(async()=>{const {f}=window.__ids; wkStart(f); gotoTab('study'); await new Promise(r=>setTimeout(r,1300));
    const fl=document.getElementById('wkfloat'), sh=!!fl&&getComputedStyle(fl).display!=='none', txt=fl?fl.textContent:'';
    gotoTab('daily'); await new Promise(r=>setTimeout(r,1300)); const hid=getComputedStyle(fl).display==='none', dh=/▶ 다음 주 일/.test(document.getElementById('v-daily').textContent);
    wkStop(); return {sh,txt,hid,dh};});
  ok('E14 다른 화면에선 떠 있는 칩 · 데일리에선 머리 칩(떠 있는 칩은 숨김)',M.sh&&/다음 주 일/.test(M.txt)&&M.hid&&M.dh,JSON.stringify(M));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();

  /* 폰 — ▶ 가 둘째 줄로 내려가지 않는다 */
  const c2=await b.newContext({viewport:{width:360,height:780}});
  await c2.addInitScript(FAKE);
  const q=await c2.newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));
  await q.route('**/*supabase*',r=>r.abort());
  await q.goto('file://'+file);await q.waitForTimeout(2500);
  const P=await q.evaluate(()=>{wkAdd({title:'아주 긴 업무 제목이 들어가도 단추는 오른쪽 끝에 그대로 있어야 한다',day:todayStr(),at:'14:00',due:addDays(todayStr(),2),pri:1});save();gotoTab('work');
    const row=document.querySelector('#v-work .wkrow'), go=row.querySelector('.wkgo'), rr=row.getBoundingClientRect(), gr=go.getBoundingClientRect();
    return {right:Math.round(rr.right-gr.right),w:Math.round(gr.width),inRow:gr.top>=rr.top&&gr.bottom<=rr.bottom+1,sw:document.documentElement.scrollWidth};});
  ok('P1 폰: ▶ 는 오른쪽 끝 44px · 행 안 · 가로 스크롤 없음',P.right<=8&&P.w>=44&&P.inRow&&P.sw<=360,JSON.stringify(P));
  ok('Z2 폰 에러 없음',e2.length===0,e2.join(' | '));
  await c2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t92 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
