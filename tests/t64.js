/* t64 — 🧾 카드결제를 현금흐름에 그릴 때 과목을 부풀리지 않는다 (v4.76)
   🔴 생활사 핸드오프 검증 중 발견: 결제액 403,489 / 구성 307,346 → Sankey 가 모든 과목을 ×1.31 로 부풀렸다.
   🔒 불변식:
      A 구성은 구성만큼만 그린다 · 남는 돈은 「카드결제 내역미상」
      B 노드 합 = 결제액 (돈이 새거나 생기지 않는다)
      C 할부 청구분은 「과목·할부」로 따로 (생활사 제안)
      D 구성이 결제액보다 크면(부분 선결제) 줄여서 맞춘다
      E 가계부 결제 행에 「내역미상 N」 */
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

  const R=await p.evaluate(()=>{
    var acct=(DB.accounts.filter(function(a){return isCashAcct(a);})[0]||{}).id;
    DB.cards=[{id:'cA',name:'테스트카드',type:'credit',closeDay:12,payDay:25,acct:acct}];
    /* 실데이터 11월 결제분을 줄인 꼴: 안경 3개월 할부(8/29 → 11월이 3회차) + 일시불 10,900 */
    DB.transactions=[
      {id:'g1',type:'expense',cat:'생활용품',method:'테스트카드',amt:435100,date:'2026-08-29',card:false,inst:3,instDone:3,memo:'안경'},
      {id:'g2',type:'expense',cat:'생활용품',method:'테스트카드',amt:10900,date:'2026-11-03',card:false,memo:'거치대'},
      {id:'g3',type:'expense',cat:'식비',method:'테스트카드',amt:9000,date:'2026-11-03',card:false},
      /* 결제액 > 구성: 카드사엔 있는데 원장엔 없는 50,000 */
      {id:'s1',type:'settle',acct:acct,amt:214933,date:'2026-11-05',method:'테스트카드 결제',cat:'카드결제',cycle:'2026-11',
        catMix:{'생활용품':155933,'식비':9000}}];
    DB.ui.cfMode='cash';
    var g=cfBuildSankey(DB.transactions);
    var K=g.K, tot=0; for(var k in K)tot+=K[k];
    /* 부분 선결제: 구성 > 결제액 */
    DB.transactions.push({id:'s2',type:'settle',acct:acct,amt:5000,date:'2026-11-06',method:'테스트카드 결제',cat:'카드결제',cycle:'2026-12',catMix:{'식비':10000}});
    var g2=cfBuildSankey([DB.transactions[4]]), t2=0; for(var k2 in g2.K)t2+=g2.K[k2];
    DB.ui.month='2026-11'; selDate='2026-11-05'; try{renderCal();}catch(e){}
    var html=(document.getElementById('v-cal')||{}).innerHTML||'';
    return {K:K,tot:tot,K2:g2.K,t2:t2,rest:settleRest(DB.transactions[3]),inst:settleInstMix(DB.transactions[3]),html:/내역미상 50,000/.test(html)};
  });
  const K=R.K;
  ok('A1 🔴 과목을 부풀리지 않는다 — 식비는 구성 그대로 9,000',Math.round(K['ex:식비']||0)===9000,JSON.stringify(K));
  ok('A2 🔴 남는 50,000 은 「카드결제 내역미상」',Math.round(K['ex:카드결제 내역미상']||0)===50000,JSON.stringify(K));
  ok('B1 노드 합 = 결제액 214,933',Math.round(R.tot)===214933,R.tot);
  ok('C1 할부 회차(145,033)는 「생활용품·할부」로 따로',Math.round(K['ex:생활용품·할부']||0)===145033,JSON.stringify(K));
  ok('C2 새로 산 생활용품은 10,900 만',Math.round(K['ex:생활용품']||0)===10900,JSON.stringify(K));
  ok('C3 settleInstMix 는 역산 — 생활용품 145,033',Math.round(R.inst['생활용품']||0)===145033,JSON.stringify(R.inst));
  ok('D1 구성 > 결제액이면 결제액으로 맞춘다',Math.round(R.t2)===5000&&!R.K2['ex:카드결제 내역미상'],JSON.stringify(R.K2));
  ok('E0 settleRest = 50,000',Math.round(R.rest)===50000,R.rest);
  ok('E1 가계부 결제 행에 「내역미상 50,000」',R.html);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t64 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
