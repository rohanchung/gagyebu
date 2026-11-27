/* t108 — 🔴 데일리 달력: 날짜를 눌러 서랍이 떠도 달력을 다시 깔지 않는다 (v5.20)
   로한(11/27): 「어떤 날은 오른쪽 슬라이드 뜰 때 캘린더가 새로고침이 안 되는데, 어떤 날은 된다」
   원인 ① 날짜를 누를 때마다 달력 innerHTML 을 통째로 새로 깔았다 ② 다른 주·10분 지남 → 캘린더를 다시 받아 와 한 번 더 통째로 그렸다
   🔒 C1 닫힘 → 날짜 → 서랍: 달력 노드 그대로 · 고른 칸만 .sel · C2 다른 날짜(같은 달) 그대로 · sel 이동 · C3 같은 날 → 닫힘 · 그대로 · sel 0
      C4 내용이 바뀌면(달 이동) 새로 깐다 — 옛 달력이 남지 않는다 · C5 다시 받은 일정이 같으면 다시 그리지 않는다
      C6 주간 보기도 같다 · Z 에러 0 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{}}; const at=new Date().toISOString();
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv.pref={data:{},rev:1,at};
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},is(){return o},lte(){return o},gte(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      if(name==='cal_sources')data=[{key:'c1',name:'가짜 캘린더',color:'#3a7',show:true,ord:1}];
      if(name==='cal_events'){const t=new Date(),d=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
        data=[{src:'c1',uid:'e1',inst:'',title:'가짜 일정',cat:null,all_day:true,d0:d,d1:d,t0:null,t1:null,loc:null,note:null}];}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    const revs={},ats={};
    args.p_changes.forEach(c=>{const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,functions:{invoke:()=>Promise.resolve({})},
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
  for(const view of ['month','week']){
    await p.evaluate(v=>{gotoTab('daily');DB.ui.dview=v;DB.ui.dayOpen=false;setGoalDate(todayStr());},view);await p.waitForTimeout(1500);
    const tag=view+' ';
    const R=await p.evaluate(async()=>{
      const box=document.getElementById('v-daily'), wait=ms=>new Promise(r=>setTimeout(r,ms));
      const cal=()=>box.querySelector('.dcalp'), sel=()=>[...box.querySelectorAll('.dcalp .sel')].map(e=>(e.dataset.gcal||(e.querySelector('[data-gcal],[data-ds]')||{}).dataset||{}).toString()).length;
      const t=todayStr(), d2=addDays(t,(new Date().getDate()>2)?-1:1);
      const c0=cal(); c0.__m=1;
      gcalPick(t); await wait(600);
      const r1={same:cal()===c0,open:!!box.querySelector('.ddraw'),sel:box.querySelectorAll('.dcalp .sel').length};
      gcalPick(d2); await wait(600);
      const r2={same:cal()===c0,cur:curDate()===d2,sel:box.querySelectorAll('.dcalp .sel').length};
      gcalPick(d2); await wait(600);
      const r3={same:cal()===c0,open:!!box.querySelector('.ddraw'),sel:box.querySelectorAll('.dcalp .sel').length};
      /* C5 — 다시 받아도 같으면 안 그린다 */
      let n=0; const orig=window.renderDaily; window.renderDaily=function(){n++;return orig.apply(this,arguments);};
      CAL.at=0; CAL.busy=false; CAL.failAt=0; calFetch(); await wait(400); window.renderDaily=orig;
      const r5={n,same:cal()===c0};
      /* C4 — 내용이 바뀌면 새로 깐다 */
      if(DB.ui.dview==='month')moveGoalMonth(1); else dvMove(1);
      await wait(400);
      const r4={fresh:cal()!==c0&&!cal().__m};
      return {r1,r2,r3,r4,r5};});
    ok(tag+'C1 날짜 → 서랍이 떠도 달력 노드 그대로 · 고른 칸 하나',R.r1.same&&R.r1.open&&R.r1.sel>=1,JSON.stringify(R));
    ok(tag+'C2 다른 날짜로 — 그대로 · 고른 칸 옮김',R.r2.same&&R.r2.cur&&R.r2.sel>=1,JSON.stringify(R.r2));
    ok(tag+'C3 같은 날 다시 → 닫힘 · 그대로 · 고른 칸 0',R.r3.same&&!R.r3.open&&R.r3.sel===0,JSON.stringify(R.r3));
    ok(tag+'C5 다시 받은 일정이 같으면 다시 그리지 않는다',R.r5.n===0&&R.r5.same,JSON.stringify(R.r5));
    ok(tag+'C4 내용이 바뀌면(달·주 이동) 새로 깐다',R.r4.fresh,JSON.stringify(R.r4));
  }
  ok('Z 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t108 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
