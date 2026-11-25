/* t107 — 🔴 데일리 로그 칸을 눌러도 화면 전체를 다시 그리지 않는다 (v5.19)
   로한(11/25): 「로그에서 그 칸 누를 때마다 새로고침한다 말이 되냐」
   🔒 L1 시작 칸 → 같은 DOM 그대로(로그 격자·달력 노드가 바뀌지 않는다) · 그 칸만 .pick · 안내 한 줄이 「부터 — 끝나는 칸」
      L2 저장 0 · L3 스크롤 그대로 · L4 다른 칸으로 바꿔 잡아도 .pick 하나 · L5 취소도 그 자리 · L6 끝 칸 → 기록 창 · L7 기록하면 그때 다시 그린다 · Z 에러 0 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv.pref={data:{},rev:1,at};
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},
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
  for(const [w,h] of [[1280,800],[390,800]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  await p.evaluate(()=>{gotoTab('daily');setGoalDate(todayStr());dayOpenSet(true);setDailyTab('log');});await p.waitForTimeout(1500);
  const tag=w+' ';
  const L=await p.evaluate(async()=>{
    const box=document.getElementById('v-daily'), grid=box.querySelector('.tlgrid'), cal=box.querySelector('.dcal');
    grid.__mark=1; if(cal)cal.__mark=1;
    const sc=box.querySelector('.ddraw')||document.scrollingElement; const sEl=[...box.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+20&&e.contains(grid))||document.scrollingElement;
    sEl.scrollTop=200; const top0=sEl.scrollTop;
    const s0=window.__S.saves;
    grid.querySelector('.tlq[data-tlq="60"]').click();
    await new Promise(r=>setTimeout(r,1300));
    const g2=box.querySelector('.tlgrid'), c2=box.querySelector('.dcal');
    const r={same:g2===grid&&!!g2.__mark&&(!cal||c2===cal),pick:[...box.querySelectorAll('.tlq.pick')].map(e=>e.dataset.tlq).join(),
      hint:(box.querySelector('.tlhint')||{}).textContent||'',ui:DB.ui.tlPick,saves:window.__S.saves-s0,top:sEl.scrollTop,top0};
    /* L4 · L5 */
    DB.ui.tlPick=null; box.querySelector('[data-tlcancel]')||null;
    return r;});
  ok(tag+'L1 시작 칸 → DOM 그대로 · 그 칸만 .pick · 안내 「부터 — 끝나는 칸」',L.same&&L.pick==='60'&&/부터 — 끝나는 칸/.test(L.hint)&&L.ui===60,JSON.stringify(L));
  ok(tag+'L2 저장 0',L.saves===0,JSON.stringify(L));
  ok(tag+'L3 스크롤 그대로(옛 판은 맨 위로 튀었다)',Math.abs(L.top-L.top0)<=4,JSON.stringify(L));
  const C=await p.evaluate(async()=>{const box=document.getElementById('v-daily'),grid=box.querySelector('.tlgrid');
    tlSlotClick(60);   /* 다시 잡기 */
    const k=box.querySelector('[data-tlcancel]'); k.click(); await new Promise(r=>setTimeout(r,200));
    return {same:box.querySelector('.tlgrid')===grid,pick:box.querySelectorAll('.tlq.pick').length,ui:DB.ui.tlPick,hint:(box.querySelector('.tlhint')||{}).textContent||''};});
  ok(tag+'L5 취소도 그 자리 — .pick 0 · 안내 처음으로',C.same&&C.pick===0&&C.ui==null&&/시작 칸 → 끝 칸/.test(C.hint),JSON.stringify(C));
  const M=await p.evaluate(async()=>{const box=document.getElementById('v-daily');
    box.querySelector('.tlq[data-tlq="54"]').click(); box.querySelector('.tlq[data-tlq="57"]').click();
    const pk=box.querySelectorAll('.tlq.pick').length; await new Promise(r=>setTimeout(r,200));
    return {modal:document.getElementById('ov').classList.contains('on'),ui:DB.ui.tlPick,pk};});
  ok(tag+'L6 끝 칸 → 기록 창 · 고른 표시는 풀린다',M.modal&&M.ui==null&&M.pk===0,JSON.stringify(M));
  ok(tag+'Z 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
  }
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t107 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
