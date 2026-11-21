/* t63 — ◀ 뒤로가기는 로한북 안에서 움직인다 (v4.75)
   🔴 로한: 「뒤로가기 버튼 클릭 시 아예 페이지 이탈이 되버리는데」 — 한 페이지 앱이라 탭을 바꿔도 기록이 안 쌓였다.
   🔒 불변식:
      A 탭을 바꾸면 뒤로가기 = 직전 탭 · 앞으로가기 = 다시 그 탭
      B 모달이 떠 있으면 뒤로가기는 모달만 닫는다(탭 그대로, 페이지 그대로)
      C 뽀모 전체화면도 뒤로가기로 닫힌다
      D 홈(첫 기록)에서 한 번 더 누르면 페이지에 남아 「한 번 더 누르면 나갑니다」를 보인다
      E 같은 탭을 다시 눌러도 기록이 쌓이지 않는다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{
   function mk(){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},update(){return q},
     upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},
     maybeSingle(){return Promise.resolve({data:null,error:null})},then(a){return Promise.resolve({data:[],error:null}).then(a)}};return q;}
   window.supabase={createClient:()=>({from:()=>mk(),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  const url0=p.url();
  const cur=()=>p.evaluate(()=>document.querySelector('.view.on').id.slice(2));
  const back=async()=>{await p.evaluate(()=>history.back());await p.waitForTimeout(250);};

  await p.click('.m[data-v="goal"]');await p.waitForTimeout(150);
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(150);
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(150);
  await back();
  ok('A1 🔴 뒤로가기 = 직전 탭(가계부 → 목표)',(await cur())==='goal',await cur());
  ok('E1 같은 탭을 다시 눌러도 기록이 안 쌓인다(한 번에 목표로)',(await cur())==='goal');
  await p.evaluate(()=>history.forward());await p.waitForTimeout(250);
  ok('A2 앞으로가기 = 다시 가계부',(await cur())==='cal',await cur());
  ok('A3 메뉴 강조도 따라간다',await p.evaluate(()=>document.querySelector('.side .m.on').dataset.v)==='cal');

  await p.evaluate(()=>openModal('<div>테스트 모달</div>'));
  await back();
  const B=await p.evaluate(()=>({modal:document.getElementById('ov').classList.contains('on')}));
  ok('B1 🔴 모달이 떠 있으면 뒤로가기는 모달만 닫는다',B.modal===false,JSON.stringify(B));
  ok('B2 탭은 그대로',(await cur())==='cal',await cur());
  await back();
  ok('B3 모달을 닫은 뒤 뒤로가기는 다시 탭 이동(헛누름 없음)',(await cur())==='goal',await cur());

  await p.evaluate(()=>stPomoOpen());
  await back();
  ok('C1 뽀모 전체화면도 뒤로가기로 닫힌다',await p.evaluate(()=>!document.getElementById('pomoOv').classList.contains('on')));
  ok('C2 탭은 그대로',(await cur())==='goal',await cur());

  await back();
  ok('D0 목표 → 데일리',(await cur())==='daily',await cur());
  await back();
  const D=await p.evaluate(()=>({t:document.getElementById('navToast').textContent,on:document.getElementById('navToast').classList.contains('on'),app:!!document.getElementById('v-daily')}));
  ok('D1 🔴 홈에서 한 번 더 눌러도 페이지에 남는다',p.url()===url0&&D.app,p.url());
  ok('D2 「한 번 더 누르면 나갑니다」 안내',D.on&&/한 번 더/.test(D.t),JSON.stringify(D));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t63 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
