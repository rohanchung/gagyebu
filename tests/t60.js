/* t60 — 💾 저장은 한 줄로 선다 (v4.71)
   🔴 10/29 5분간 「덮어쓰기 직전 서버본」 10개 — 로한: 휴대폰·PC·다른 창 없음 = **한 탭이 자기와 충돌**.
   재현: 저장 A 가 서버에 가 있는 동안 저장 B 가 출발 → B 는 A 이전의 LAST_SYNC 로 eq(updated_at) → 0행 → 충돌.
   🔒 불변식:
      A 한 탭에서 연달아 저장해도 충돌 경로(서버 다시 읽기·병합·스냅샷)에 들어가지 않는다
      B 마지막 변경까지 전부 서버에 간다(줄 선 저장이 최신 DB 로 이어서 간다)
      C 동시에 서버로 가는 update 는 언제나 1개
      D 진짜 남의 쓰기(다른 곳에서 updated_at 이 바뀜)는 여전히 충돌로 잡고 병합한다 — 줄 세우기가 감지를 없애면 안 된다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const ST={schemaVersion:7,ui:{month:'2026-10'},accounts:[],cards:[],categories:[],transactions:[],goals:[],routines:[],checks:{},
 meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}},errors:[]},rewards:[],rewardCards:{},journal:[],items:[],logs2:[],
 activity:[],netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext();
  await ctx.addInitScript(({s})=>{
   /* 서버 흉내 — 🔒 eq(updated_at) 를 실제로 따진다. update 는 1.2초 늦게 끝난다(실제 본문 814KB — 업로드가 저장 대기 400ms 보다 길다) */
   const srv={data:JSON.parse(JSON.stringify(s)),at:'2026-11-02T00:00:00.000Z'};
   window.__srv=srv; window.__log={updates:0,inflight:0,maxInflight:0,reads:0,snaps:0,eqMiss:0};
   function mk(table){let op='select',patch=null,eqs={},cols='';
    const q={select(c){cols=c||'';return q},eq(k,v){eqs[k]=v;return q},order(){return q},limit(){return q},in(){return q},
     update(p){op='update';patch=p;return q},upsert(r){op='upsert';patch=r;return q},insert(r){op='insert';patch=r;return q},delete(){op='delete';return q},
     maybeSingle(){ if(table==='app_state'){window.__log.reads++;return Promise.resolve({data:{data:JSON.parse(JSON.stringify(srv.data)),updated_at:srv.at},error:null});}
       return Promise.resolve({data:null,error:null}); },
     then(res,rej){
      if(table==='app_state_snap'&&op==='insert'){window.__log.snaps++;return Promise.resolve({data:[],error:null}).then(res,rej);}
      if(table==='app_state'&&(op==='update'||op==='upsert')){
        const L=window.__log;L.updates++;L.inflight++;L.maxInflight=Math.max(L.maxInflight,L.inflight);
        return new Promise(r=>setTimeout(()=>{L.inflight--;
          if(op==='update'&&eqs.updated_at!==undefined&&eqs.updated_at!==srv.at){L.eqMiss++;r({data:[],error:null});return;}
          srv.data=JSON.parse(JSON.stringify(patch.data));srv.at=patch.updated_at;r({data:[{updated_at:srv.at}],error:null});},1200)).then(res,rej);}
      return Promise.resolve({data:[],error:null}).then(res,rej);}};
    return q;}
   window.supabase={createClient:()=>({from:(t)=>mk(t),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
  },{s:ST});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  await p.evaluate(()=>{Object.assign(window.__log,{updates:0,inflight:0,maxInflight:0,reads:0,snaps:0,eqMiss:0});});

  /* ── A·B·C 한 탭에서 연달아 — 저장 A 가 날아가는 동안(1.2초) 체크를 네 번 더 ── */
  await p.evaluate(async()=>{
    const w=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=1;i<=5;i++){ DB.checks['2026-10-29']=DB.checks['2026-10-29']||{}; DB.checks['2026-10-29']['r'+i]=1; save(); await w(450); }
  });
  await p.waitForTimeout(6000);
  const L=await p.evaluate(()=>Object.assign({},window.__log,{srvChecks:Object.keys((window.__srv.data.checks||{})['2026-10-29']||{}).length,dirty:SAVE_DIRTY}));
  ok('A1 🔴 한 탭의 연속 저장이 충돌로 읽히지 않는다(eq 실패 0)',L.eqMiss===0,JSON.stringify(L));
  ok('A2 🔴 충돌 경로에 안 들어간다 — 서버 다시 읽기 0 · 덮어쓰기 직전 스냅샷 0',L.reads===0&&L.snaps===0,JSON.stringify(L));
  ok('B1 마지막 변경까지 전부 서버에 갔다(체크 5개)',L.srvChecks===5,JSON.stringify(L));
  ok('B2 다 보내고 나면 「저장 안 된 변경 없음」',L.dirty===false);
  ok('C1 서버로 가는 update 는 동시에 언제나 1개',L.maxInflight===1,JSON.stringify(L));

  /* ── D 진짜 남의 쓰기는 여전히 잡는다 ── */
  await p.evaluate(()=>{Object.assign(window.__log,{reads:0,eqMiss:0});
    window.__srv.data.study.errors=[{id:'eX',q:'남이 넣은 오답'}];window.__srv.at='2026-11-02T09:09:09.000Z';   /* 다른 방이 MCP 로 썼다 */
    DB.checks['2026-10-30']={r9:1};save();});
  await p.waitForTimeout(6000);
  const D=await p.evaluate(()=>({L:Object.assign({},window.__log),both:(window.__srv.data.study.errors||[]).some(e=>e.id==='eX')&&!!((window.__srv.data.checks||{})['2026-10-30']||{}).r9}));
  ok('D1 남의 쓰기는 충돌로 감지한다(서버를 다시 읽는다)',D.L.eqMiss>=1&&D.L.reads>=1,JSON.stringify(D.L));
  ok('D2 🔒 병합해서 둘 다 남긴다(남의 오답 + 내 체크)',D.both===true);
  ok('Z 콘솔 에러 0',errs.length===0,errs.join('|'));
 }finally{await b.close();}
 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
