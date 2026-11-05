/* t65 — 📂 증빙함 (v4.77)
   🔒 불변식:
      A 기타 메뉴에 증빙함 · sources 를 읽어 카드로 보인다 · 같은 slug 는 최신 판 하나 + 「이전 판」
      B 카드 이용내역은 가계부와 대사 — 맞음/없음 건수·금액, 반대 방향(기간 안 가계부에만 있는 것)
      C 할부 행은 개월수·원금으로 맞춘다
      D 그림은 <img> 로만 — SVG 안 스크립트가 돌지 않는다
      E 앱은 sources 에 쓰지 않는다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{
   window.__srcWrites=0;
   const SRC=[
    {id:2,slug:'samsung-2026-11',version:2,room:'생활사',kind:'card_statement',title:'삼성 11/25 결제 예정',period_from:'2026-10-13',period_to:'2026-11-12',as_of:'2026-11-05',
     summary:'**합계** 범위 확인',cols:[{k:'date',label:'이용일'},{k:'merchant',label:'가맹점'},{k:'amt',label:'금액'},{k:'card',label:'카드'}],
     rows:[{date:'2026-10-13',merchant:'쿠팡',amt:15830,card:'테스트카드'},
           {date:'2026-10-14',merchant:'없는가게',amt:50144,card:'테스트카드'},
           {date:'2026-08-29',merchant:'안경',amt:145033,card:'테스트카드',inst:3,k:3,total:435100},
           {date:'2026-10-20',merchant:'카드명틀림',amt:1000,card:'없는카드'}],
     figure:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><script>window.__pwned=1</script><text x="5" y="20">합계</text></svg>',
     masked:'카드번호 뒤4자리',origin:'캡처 2장'},
    {id:1,slug:'samsung-2026-11',version:1,room:'생활사',kind:'card_statement',title:'삼성 옛판',as_of:'2026-11-04',rows:[]},
    {id:3,slug:'lab-2026-10',version:1,room:'순환기',kind:'lab_result',title:'10월 피검사',as_of:'2026-10-20',rows:[{item:'LDL',value:120}]}];
   function mk(name){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},
     update(){if(name==='sources')window.__srcWrites++;return q},
     upsert(){if(name==='sources')window.__srcWrites++;return Promise.resolve({})},insert(){if(name==='sources')window.__srcWrites++;return Promise.resolve({data:[],error:null})},
     delete(){if(name==='sources')window.__srcWrites++;return q},
     maybeSingle(){return Promise.resolve({data:null,error:null})},then(a,bb){return Promise.resolve({data:name==='sources'?SRC:[],error:null}).then(a,bb)}};return q;}
   window.supabase={createClient:()=>({from:(n)=>mk(n),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  await p.evaluate(()=>{
    DB.cards.push({id:'cT',name:'테스트카드',type:'credit',closeDay:12,payDay:25});
    DB.transactions.push({id:'q1',type:'expense',cat:'식비',method:'테스트카드',amt:15830,date:'2026-10-13',card:false});
    DB.transactions.push({id:'q2',type:'expense',cat:'생활용품',method:'테스트카드',amt:435100,date:'2026-08-29',card:false,inst:3,instDone:3});
    DB.transactions.push({id:'q3',type:'expense',cat:'식비',method:'테스트카드',amt:9000,date:'2026-11-03',card:false,memo:'자료에없음'});
  });
  ok('A0 기타 메뉴에 증빙함',await p.evaluate(()=>!!document.querySelector('.side .m[data-v="src"]')));
  await p.click('.m[data-v="src"]');await p.waitForTimeout(400);
  const A=await p.evaluate(()=>({n:document.querySelectorAll('#v-src .hocard').length,t:document.getElementById('v-src').innerText}));
  ok('A1 slug 별 한 장 (2장)',A.n===2,A.n);
  ok('A2 최신 판이 보인다',/삼성 11\/25 결제 예정/.test(A.t)&&!/삼성 옛판/.test(A.t),A.t.slice(0,300));
  await p.evaluate(()=>srcToggle(2));await p.waitForTimeout(150);
  const B=await p.evaluate(()=>({t:document.getElementById('v-src').innerText,img:!!document.querySelector('#v-src img.srcfig'),
     svgInline:!!document.querySelector('#v-src svg script'),pw:!!window.__pwned,miss:document.querySelectorAll('#v-src td.miss').length,
     rc:srcReconcile(SOURCES[0])}));
  ok('B1 🔎 맞음 2건(일시불 + 할부)',B.rc.hit===2,JSON.stringify(B.rc.res.map(x=>x.st)));
  ok('B2 🔴 가계부에 없음 1건 50,144',B.rc.miss.length===1&&B.rc.missSum===50144,B.rc.missSum);
  ok('B3 화면에 「가계부에 없음 1건」',/가계부에 없음 1건/.test(B.t),B.t.slice(0,600));
  ok('B4 반대 방향 — 기간 안 가계부에만 있는 9,000',B.rc.extra.length===1&&B.rc.extra[0].id==='q3',JSON.stringify(B.rc.extra.map(t=>t.id)));
  ok('B5 표에 없음 칸 표시',B.miss===1,B.miss);
  ok('C1 할부 행은 원금으로 맞음',B.rc.res[2].st==='hit',B.rc.res[2].st);
  ok('C2 카드명이 틀리면 대사하지 않는다(카드명?)',B.rc.res[3].st==='nocard'&&/카드명\?/.test(B.t));
  ok('D1 그림은 img 로',B.img&&!B.svgInline);
  ok('D2 SVG 스크립트 안 돎',!B.pw);
  await p.evaluate(()=>srcToggleOld('samsung-2026-11'));await p.waitForTimeout(100);
  ok('A3 이전 판 펼치기',/삼성 옛판/.test(await p.evaluate(()=>document.getElementById('v-src').innerText)));
  ok('E1 앱은 sources 에 쓰지 않는다',await p.evaluate(()=>window.__srcWrites)===0);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t65 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
