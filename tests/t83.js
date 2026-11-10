/* t83 — 🎯 남은 목표가 드릴·결과 화면에서 줄어든다 (v4.93)   로한: 「드릴을 해도 남은 갯수가 변화가 없는데?」 — 숫자가 시작 화면에만 있었다(엔터 = 한 번 더 로 이어 하면 못 본다)   🔒 L1 드릴 머리줄에 남은 수 · L2 답하면 줄어든다 · R1 결과 화면에 「전 → 지금」 · R2 줄어든 만큼 −k · R3 한 번 더 해도 이어서 준다 · S1 시작 화면 숫자도 같다 */
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
  await p.evaluate(()=>{DB.ui.stdMode='k2r';document.querySelector('.side .m[data-v="study"]').click();stTab&&stTab('word');});await p.waitForTimeout(400);
  const live=()=>p.evaluate(()=>{const e=document.querySelector('#v-study .stgoallive b');return e?+e.textContent:null;});
  await p.evaluate(()=>stDrillStart('k2r',20));await p.waitForTimeout(300);
  const l0=await live();
  ok('L1 드릴 머리줄에 남은 수',l0===60,l0);
  await p.evaluate(()=>stDrillGrade(ST_DRILL.opts[0][0]));await p.waitForTimeout(100);
  const l1=await live();
  ok('L2 🔴 답하면 바로 줄어든다',l1===59,l0+'→'+l1);
  for(let i=0;i<20;i++){await p.evaluate(()=>{const D=ST_DRILL;if(D.fin)return;if(!D.show)stDrillGrade(D.opts[D.i][0]);stDrillNext();});await p.waitForTimeout(20);}
  await p.waitForTimeout(300);
  const R=await p.evaluate(()=>{const g=document.querySelector('#v-study .stgoal');return g?g.textContent:null;});
  ok('R1 🔴 결과 화면에 「60 → 40」',!!R&&/60 →\s*40/.test(R),R);
  ok('R2 이번 세트로 −20',!!R&&/이번 세트로 −20/.test(R),R);
  await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await p.waitForTimeout(300);
  const l3=await live();
  ok('R3 한 번 더 — 40 에서 이어서 준다',l3===40,l3);
  await p.evaluate(()=>{stDrillQuit();stDrillClose();});await p.waitForTimeout(300);
  const S=await p.evaluate(()=>{const e=document.querySelector('#v-study .stgoaln');return e?e.textContent.trim():null;});
  ok('S1 시작 화면 숫자도 같은 계산',S==='40',S);
  /* T — 진단이 드릴 칸에 묻히지 않는다(로한: 「오전에 진단 본 것도 데일리 로그에 반영이 안 됐다」) */
  const T=await p.evaluate(()=>{
    const ds=todayStr(); tlAll()[ds]=[{s:19,e:19,tag:'study',title:'🈶 드릴 · A',code:null},{s:20,e:20,tag:'study',title:'🈶 드릴 · B',code:null}];
    const d0=new Date(); d0.setHours(9,52,0,0);
    const t={id:'dgX',kind:'diag',date:ds,secs:1320,at:d0.toISOString(),tl:true};
    studyDB().tests=(studyDB().tests||[]).concat([t]);
    const n1=stDiagBackfill(); const ti=tlOf(ds).map(b=>b.s+':'+b.title);
    const n2=stDiagBackfill(); const ti2=tlOf(ds).map(b=>b.s+':'+b.title);
    return {n1,n2,ti,ti2,tl:t.tl};});
  ok('T1 🔴 이미 드릴 칸이어도 진단 이름이 남는다',T.ti.length===2&&T.ti.every(x=>/🩺 진단/.test(x))&&T.ti.every(x=>/드릴/.test(x)),JSON.stringify(T.ti));
  ok('T2 v4.92 소급분(tl:true)도 한 번 더 남긴다 · 두 번째엔 안 붙인다',T.n1===1&&T.n2===0&&T.tl===2&&JSON.stringify(T.ti)===JSON.stringify(T.ti2),JSON.stringify(T));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t83 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
