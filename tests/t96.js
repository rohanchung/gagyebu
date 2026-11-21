/* t96 — 🎓 드릴 탭 「오늘 할 것」 = 학습방 메뉴(strategy.daily) (v5.03 · study-ui-spec S2)
   🔒 M1 mode·sets 가 있는 줄만 드릴 행(done/sets · ▶) · M2 나머지는 글 칩 — what 글에서 드릴을 짐작하지 않는다
      M3 바닥·총 분 · M4/M5 요약 「오늘 메뉴 a / b세트」가 세트를 끝내면 오른다
      E1~E4 극단: daily 없음 · 빈 배열 · 드릴 없는 메뉴 · 배열 아님 — 칸을 안 그리거나 글만 · 에러 없음 */
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
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();setStTab('word');});await p.waitForTimeout(400);
  const put=(st)=>p.evaluate(st=>{DB.study.strategy=st;ST_SDB=null;renderStudy();
    const m=document.querySelector('#v-study .smenu'), s=document.querySelector('#v-study .ssum');
    return {has:!!m, t:m?m.textContent:'', rows:m?[...m.querySelectorAll('.smrow')].map(r=>({k:r.dataset.mode,n:r.querySelector('.smn').textContent,go:!r.querySelector('.drgo').disabled})):[],
      chips:m?[...m.querySelectorAll('.smtxt span')].map(x=>x.textContent):[], sum:s?s.textContent:''};},st);

  /* M — 섞인 메뉴 */
  const M=await put({daily:{weekdayTotalMin:90,floor:'바닥: 뜻 맞히기 1세트',weekday:[
    {what:'뜻 맞히기',mode:'r2m',sets:2,why:'복습'},
    {what:'문맥규정 읽기',amount:'p71'},
    {what:'모르는 드릴',mode:'zzz',sets:1},
    {what:'세트 0',mode:'k2r',sets:0},
    {what:'세트 글자',mode:'k2r',sets:'두 번'}]}});
  ok('M1 mode·sets 가 있는 것만 드릴 행 — r2m 0/2세트 ▶',M.rows.length===1&&M.rows[0].k==='r2m'&&/0 \/ 2세트/.test(M.rows[0].n)&&M.rows[0].go,JSON.stringify(M.rows));
  ok('M2 🔒 나머지는 글 칩(모르는 mode · sets 0 · sets 글자도) — what 에서 드릴을 짐작하지 않는다',
     M.chips.length===4&&M.chips.some(c=>/문맥규정 읽기 · p71/.test(c))&&M.chips.some(c=>/모르는 드릴/.test(c))&&M.chips.some(c=>/세트 0/.test(c))&&M.chips.some(c=>/세트 글자/.test(c)),JSON.stringify(M.chips));
  ok('M3 바닥 글 · 총 분',/바닥: 뜻 맞히기 1세트/.test(M.t)&&/90분/.test(M.t),M.t.slice(0,200));
  ok('M4 요약에 「오늘 메뉴 0 / 2세트」',/오늘 메뉴\s*0\s*\/\s*2세트/.test(M.sum),M.sum.slice(0,200));

  /* 세트 하나 끝내면 1/2 */
  const M2=await p.evaluate(()=>{const b=document.querySelector('#v-study .smrow[data-mode="r2m"] .drgo');b.click();
    const ok1=!!ST_DRILL&&ST_DRILL.mode==='r2m';
    for(let i=0;i<60&&!ST_DRILL.fin;i++){const D=ST_DRILL;if(!D.show)stDrillGrade(D.opts[D.i][0]);stDrillNext();}
    stDrillClose(); ST_SDB=null; renderStudy();
    const m=document.querySelector('#v-study .smrow[data-mode="r2m"] .smn');return {ok1,n:m?m.textContent:'',sum:document.querySelector('#v-study .ssum').textContent};});
  ok('M5 ▶ 가 그 드릴을 연다 · 끝내면 1 / 2세트',M2.ok1&&/1 \/ 2세트/.test(M2.n)&&/오늘 메뉴\s*1\s*\/\s*2세트/.test(M2.sum),JSON.stringify(M2).slice(0,300));

  /* 극단 */
  const E1=await put({});
  ok('E1 daily 없음 → 메뉴 칸 · 오늘 메뉴 요약 둘 다 없음',!E1.has&&!/오늘 메뉴/.test(E1.sum),JSON.stringify(E1).slice(0,200));
  const E2=await put({daily:{weekday:[]}});
  ok('E2 weekday 빈 배열 → 메뉴 칸 없음',!E2.has);
  const E3=await put({daily:{weekday:[{what:'읽기만'},{what:'듣기',amount:'20분'}]}});
  ok('E3 드릴이 하나도 없으면 글 칩만 · 오늘 메뉴 요약 없음',E3.has&&E3.rows.length===0&&E3.chips.length===2&&!/오늘 메뉴/.test(E3.sum),JSON.stringify(E3).slice(0,300));
  const E4=await put({daily:{weekday:'월화수'}});
  ok('E4 weekday 가 배열이 아니어도 깨지지 않는다',!E4.has);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t96 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
