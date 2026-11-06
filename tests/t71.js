/* t71 — 🧾 v5 P2 변경 이력 탭
   🔒 E1 로그 페이지에 「🧾 이력」 탭 · E2 actor 별로 거른다 · E3 direct-sql 은 눈에 띄게
      E4 레코드 추가·삭제·수정이 요약된다(지운 것도 보인다) · E5 앱은 events 에 쓰지 않는다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{
   window.__evWrites=0;
   const EV=[
    {id:3,at:'2026-11-06T05:01:00Z',actor:'direct-sql',verb:null,target:'kv:budgets',op:'update',note:null,diff:{chg:{'식비':[100,200]}}},
    {id:2,at:'2026-11-06T05:00:00Z',actor:'생활사',verb:'rec_remove',target:'kv:transactions',op:'update',note:'중복 정리',
      diff:{rem:[{id:'t7',memo:'쿠팡 중복',amt:15830}]}},
    {id:1,at:'2026-11-06T04:59:00Z',actor:'생활사',verb:'rec_add',target:'kv:transactions',op:'update',note:null,
      diff:{add:[{id:'t8',memo:'토마토김밥',amt:10000}],chg:[{id:'t1',f:{amt:[1,2]}}]}}];
   function mk(name){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},
     update(){if(name==='events')window.__evWrites++;return q},upsert(){if(name==='events')window.__evWrites++;return Promise.resolve({})},
     insert(){if(name==='events')window.__evWrites++;return Promise.resolve({data:[],error:null})},delete(){if(name==='events')window.__evWrites++;return q},
     maybeSingle(){return Promise.resolve({data:null,error:null})},then(a,bb){return Promise.resolve({data:name==='events'?EV:[],error:null}).then(a,bb)}};return q;}
   window.supabase={createClient:()=>({from:(n)=>mk(n),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  await p.click('.m[data-v="log"]');await p.waitForTimeout(200);
  ok('E1 「🧾 이력」 탭',await p.evaluate(()=>/🧾 이력/.test(document.querySelector('#v-log .logtabs').innerText)));
  await p.evaluate(()=>setLogTab('ev'));await p.waitForTimeout(400);
  const T=await p.evaluate(()=>document.getElementById('v-log').innerText);
  ok('E1b 이력 3줄',(T.match(/kv:|budgets|transactions/g)||[]).length>=3,T.slice(0,400));
  ok('E4 추가 요약(+1 토마토김밥)',/\+1 토마토김밥/.test(T),T.slice(0,600));
  ok('E4b 지운 것도 보인다(−1 쿠팡 중복 · 이유)',/−1 쿠팡 중복/.test(T)&&/중복 정리/.test(T));
  ok('E4c 수정 요약(✎1 t1(amt))',/✎1 t1\(amt\)/.test(T));
  ok('E4d 맵 수정(✎1 식비)',/✎1 식비/.test(T));
  ok('E3 direct-sql 은 경고 색',await p.evaluate(()=>!!document.querySelector('#v-log .pill.warn2')));
  await p.evaluate(()=>evSetActor('생활사'));await p.waitForTimeout(100);
  const T2=await p.evaluate(()=>document.getElementById('v-log').innerText);
  ok('E2 actor 로 거른다',!/budgets/.test(T2)&&/토마토김밥/.test(T2),T2.slice(0,300));
  ok('E5 앱은 events 에 쓰지 않는다',await p.evaluate(()=>window.__evWrites)===0);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t71 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
