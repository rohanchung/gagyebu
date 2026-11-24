/* t99 — 🔁 한 바퀴 드릴 sweep (v5.11 · 학습사 id 8 · 11/17 로한 설계)
   🔒 A(첫 바퀴) = 섞은 순서대로 · 이 답만 r2m 카운터 · 틀리면 오답 풀 need 2 · 커서는 그만둬도 남는다
      B(오답 풀) = 풀 안의 단어만 · 같은 단어 사이 최소 5문항 · 맞히면 need−1 · 틀리면 need 2 · 카운터 안 움직임
      풀이 비면 history{round,startedAt,endedAt,size,firstPassCorrect,poolPeak} → 다음 회차(새로 섞음)
      끄면 예전 간격 반복 · study.sweep 은 study/rest 에 실린다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; const at=new Date().toISOString();
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:[],rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    const revs={},ats={};
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
  await p.evaluate(()=>{const S=DB.study;S.words=[];for(let i=0;i<30;i++)S.words.push({id:'w'+i,kana:'かな'+i,kanji:'',ko:'뜻'+i});delete S.sweep;});
  /* 🔁 S1 — 첫 시작: 전체를 섞어 1회차 · A 단계 */
  const S1=await p.evaluate(async()=>{stDrillStart('r2m',10);await new Promise(r=>setTimeout(r,80));const s=DB.study.sweep,D=ST_DRILL;
    return {round:s.round,n:s.order.length,uniq:new Set(s.order).size,ph:D.sweep&&D.sweep.phase,ids:D.ids.join()===s.order.slice(0,10).join(),on:stSweepOn()};});
  ok('S1 첫 시작 — 1회차 · 단어 전부(30)를 섞은 순서 · A 단계 · 순서대로 10',S1.round===1&&S1.n===30&&S1.uniq===30&&S1.ph==='A'&&S1.ids&&S1.on,JSON.stringify(S1));
  /* S2·S3 — A: 틀리면 풀(need 2) · 이 답은 카운터를 움직인다 */
  const S2=await p.evaluate(()=>{const D=ST_DRILL,w0=stWordById(D.ids[0]);
    stDrillGrade('틀린답'); const c0=JSON.parse(JSON.stringify(stCt(w0,'r2m')));stDrillNext();
    const w1=stWordById(D.ids[1]);stDrillGrade(w1.ko);const c1=JSON.parse(JSON.stringify(stCt(w1,'r2m')));stDrillNext();
    const s=DB.study.sweep;return {idx:s.idx,pool:JSON.stringify(s.pool),id0:w0.id,c0,c1,fpc:s.fpc};});
  ok('S2 A 에서 틀리면 오답 풀에 need 2',S2.pool===JSON.stringify([{id:S2.id0,need:2}]),S2.pool);
  ok('S3 🔒 A 의 답은 r2m 카운터를 움직인다(seen·miss · 정답 수)',S2.c0.seen===1&&S2.c0.miss===1&&S2.c1.seen===1&&S2.c1.streak===1&&S2.fpc===1&&S2.idx===2,JSON.stringify(S2));
  /* S4 — 중간에 그만둬도 커서가 남는다 */
  const S4=await p.evaluate(async()=>{stDrillQuit();const d=DB.study.drills.slice(-1)[0];stDrillClose();
    stDrillStart('r2m',10);await new Promise(r=>setTimeout(r,50));const s=DB.study.sweep;
    return {rec:d.sweep,mode:d.mode,first:ST_DRILL.ids[0]===s.order[2]};});
  ok('S4 그만둬도 커서가 남는다 — 다음 세트는 3번째부터',S4.first,JSON.stringify(S4));
  ok('S5 drills 에 mode=r2m · sweep{round,phase}',S4.mode==='r2m'&&S4.rec&&S4.rec.round===1&&S4.rec.phase==='A',JSON.stringify(S4.rec));
  /* 나머지 A 를 끝낸다 — 여섯 개 더 틀린다(풀 7) */
  const SA=await p.evaluate(async()=>{let wrong=0;
    for(let g=0;g<10&&DB.study.sweep.idx<30;g++){
      if(!ST_DRILL||ST_DRILL.fin){stDrillClose();stDrillStart('r2m',10);}
      const D=ST_DRILL;while(!D.fin&&D.i<D.ids.length){const w=stWordById(D.ids[D.i]);if(wrong<6){stDrillGrade('틀린답');wrong++;}else stDrillGrade(w.ko);stDrillNext();}}
    stDrillClose();const s=DB.study.sweep;return {idx:s.idx,pool:s.pool.length,peak:s.peak,fpc:s.fpc};});
  ok('S6 첫 바퀴 끝 — 풀 7 · 첫 바퀴 정답 23',SA.idx===30&&SA.pool===7&&SA.fpc===23,JSON.stringify(SA));
  /* S7 — B: 풀에서 · 같은 단어 사이 최소 5문항 · 카운터 안 움직임 */
  const SB2=await p.evaluate(async()=>{stDrillStart('r2m',20);await new Promise(r=>setTimeout(r,50));const D=ST_DRILL,ids=D.ids.slice(),pool=DB.study.sweep.pool.map(x=>x.id);
    let gapOk=true;ids.forEach((id,i)=>{const j=ids.indexOf(id,i+1);if(j>0&&j-i-1<5)gapOk=false;});
    const inPool=ids.every(id=>pool.includes(id));const cnt={};ids.forEach(id=>cnt[id]=(cnt[id]||0)+1);
    const w=stWordById(ids[0]),c0=JSON.stringify(stCt(w,'r2m'));stDrillGrade(w.ko);const c1=JSON.stringify(stCt(w,'r2m'));
    const need=DB.study.sweep.pool.find(x=>x.id===w.id).need;stDrillNext();
    return {ph:D.sweep.phase,n:ids.length,gapOk,inPool,max:Math.max(...Object.values(cnt)),same:c0===c1,need,live:document.querySelector('#v-study .stgoallive').textContent};});
  ok('S7 첫 바퀴 뒤엔 B — 풀 안의 단어만 · need 만큼(최대 2번)',SB2.ph==='B'&&SB2.inPool&&SB2.n===14&&SB2.max===2,JSON.stringify(SB2));
  ok('S8 🔒 같은 단어 사이에 최소 5문항',SB2.gapOk);
  ok('S9 🔒 B 의 답은 실력 카운터를 안 움직인다',SB2.same);
  ok('S10 B 에서 맞히면 need −1',SB2.need===1,String(SB2.need));
  ok('S11 머리줄에 「오답 풀 K개 남음」',/오답 풀 7개 남음/.test(SB2.live),SB2.live);
  /* S12 — B 에서 틀리면 need 2 로 되돌아간다 */
  const S12=await p.evaluate(()=>{const D=ST_DRILL,w=stWordById(D.ids[D.i]);stDrillGrade('틀린답');const p=DB.study.sweep.pool.find(x=>x.id===w.id);stDrillNext();return p&&p.need;});
  ok('S12 B 에서 틀리면 다시 need 2',S12===2,String(S12));
  /* S13 — 풀을 다 비우면 회차가 끝나고 다음 회차 */
  const S13=await p.evaluate(async()=>{
    for(let g=0;g<20;g++){const D=ST_DRILL;if(!D||D.fin){if(DB.study.sweep.round>1)break;stDrillClose();stDrillStart('r2m',20);continue;}
      const w=stWordById(D.ids[D.i]);stDrillGrade(w.ko);stDrillNext();g--; if(g<-400)break;}
    await new Promise(r=>setTimeout(r,80));const s=DB.study.sweep,h=s.history[0];
    return {round:s.round,idx:s.idx,pool:s.pool.length,n:s.order.length,h,t:document.getElementById('v-study').textContent};});
  ok('S13 풀이 비면 history 에 남기고 2회차 · 새로 섞고 처음부터',S13.round===2&&S13.idx===0&&S13.pool===0&&S13.n===30&&S13.h&&S13.h.round===1&&S13.h.size===30&&S13.h.firstPassCorrect===23&&S13.h.poolPeak===7&&!!S13.h.endedAt,JSON.stringify(S13.h));
  ok('S14 결과 화면 한 줄 — 「1회독 완료 — 첫 답 정답률 77% · 오답 풀 최대 7」',/1회독 완료 — 첫 답 정답률 77% · 오답 풀 최대 7/.test(S13.t),S13.t.slice(0,200));
  /* S15 — 드릴 탭 행 · 끄면 예전 간격 반복 */
  const S15=await p.evaluate(async()=>{stDrillClose();DB.ui.studyTab='word';renderStudy();await new Promise(r=>setTimeout(r,80));
    const row=document.querySelector('#v-study .drow[data-mode="r2m"]');const t=row?row.textContent:'';
    stSweepTog();stDrillStart('r2m',10);const off=!ST_DRILL.sweep;stDrillQuit();stDrillClose();stSweepTog();
    return {t,off,on:stSweepOn()};});
  ok('S15 행에 「🔁 2회독 0 / 30 · 오답 풀 0」(v5.18 — 로한: 한 바퀴보다 1회독)',/🔁 2회독 0 \/ 30 · 오답 풀 0/.test(S15.t),S15.t.slice(0,120));
  ok('S16 한 바퀴를 끄면 예전 세트(간격 반복)로 · 다시 켤 수 있다',S15.off&&S15.on);
  /* S17 — study/rest 에 실려 서버로 간다(KV_KIDS 아님) */
  const S17=await p.evaluate(()=>{const o=kvSplit(DB);return {rest:!!(o['study/rest']&&o['study/rest'].sweep),kid:KV_KIDS.study.indexOf('sweep')};});
  ok('S17 study.sweep 은 study/rest 로 저장된다',S17.rest&&S17.kid<0,JSON.stringify(S17));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t99 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
