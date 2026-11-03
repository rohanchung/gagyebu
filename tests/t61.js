/* t61 — 📈 파생 계좌는 추세도 파생한다 (v4.73)
   🔴 노랑우산: 잔액 2,600,000 인데 클릭하면 그래프·로그가 9/30 2,500,000 에서 멈추고 수기 입력칸이 떴다.
   원인: 잔액은 accIsDerived(기초잔액)로, 그래프·로그·칩은 a.mode·a.hist 로 — 같은 질문에 답하는 칸이 둘.
   🔒 불변식:
      A 기초가 있으면 mode 가 'manual' 이어도 모달 맨 위 잔액 = 로그 맨 위(오늘 계산) = accVal
      B 기초 이후 월말은 가계부로 계산해 로그에 오른다 · 기초 이전 수기 기록은 남는다
      C 기초 이후에 적어 둔 실제 잔액은 계산값 옆에 두고, 다르면 차이를 보인다
      D 파생 계좌엔 수기 입력칸이 없다 · 계좌 목록 칩은 「자동」
      E 기초가 없는 투자 계좌는 예전 그대로(수기 로그·입력칸·칩 「수기」) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const ST={schemaVersion:7,ui:{month:'2026-11'},cards:[],categories:[],goals:[],routines:[],checks:{},
 meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}},errors:[]},rewards:[],rewardCards:{},journal:[],items:[],logs2:[],
 activity:[],netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]},
 accounts:[
  {id:'sup',name:'우리 SUPER',group:'현금성',mode:'auto',opening:{date:'2026-09-01',amount:1000000},hist:[]},
  {id:'a6',name:'노랑우산공제',group:'저축',mode:'manual',opening:{date:'2026-09-01',amount:2400000},
   hist:[{date:'2026-07-28',amount:2300000},{date:'2026-08-31',amount:2400000},{date:'2026-09-30',amount:2500000},{date:'2026-10-31',amount:2550000}]},
  {id:'a3',name:'AI전력인프라',group:'투자',mode:'manual',hist:[{date:'2026-10-07',amount:180460},{date:'2026-11-02',amount:142625}]}],
 transactions:[
  {id:'t1',type:'transfer',from:'sup',to:'a6',amt:100000,date:'2026-09-29',cat:'이체',memo:''},
  {id:'t2',type:'transfer',from:'sup',to:'a6',amt:100000,date:'2026-10-26',cat:'이체',memo:''}]};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext();
  await ctx.addInitScript(({s})=>{
   function mk(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},
     update(){return q},upsert(){return q},insert(){return q},delete(){return q},
     maybeSingle(){ if(table==='app_state')return Promise.resolve({data:{data:JSON.parse(JSON.stringify(s)),updated_at:'2026-11-03T00:00:00.000Z'},error:null});
       return Promise.resolve({data:null,error:null}); },
     then(res,rej){return Promise.resolve({data:[{updated_at:'2026-11-03T00:00:01.000Z'}],error:null}).then(res,rej);}};
    return q;}
   window.supabase={createClient:()=>({from:(t)=>mk(t),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
  },{s:ST});
  await ctx.clock.setFixedTime(new Date('2026-11-03T12:00:00+09:00'));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);

  const M=await p.evaluate(()=>{assetModal('a6');const m=document.getElementById('modal');
    const rows=[...m.querySelectorAll('.logrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim());
    return {cur:m.querySelector('.mcur').textContent,rows,val:accVal(DB.accounts.filter(a=>a.id==='a6')[0]),
      input:!!m.querySelector('#vAmt'),dots:m.querySelectorAll('svg circle').length,text:m.textContent};});
  ok('A1 🔴 노랑우산(mode 수기 · 기초 있음) 모달 잔액 = accVal = 2,600,000',M.cur==='₩2,600,000'&&M.val===2600000,M.cur+' / '+M.val);
  ok('A2 🔴 로그 맨 위가 오늘 계산 잔액이다(옛 기록 9/30 2,500,000 이 아니다)',/^2026-11-03 계산 ?₩2,600,000/.test(M.rows[0]||''),M.rows[0]);
  ok('B1 기초 이후 월말이 가계부로 계산돼 오른다(9/30 2,500,000 · 10/31 2,600,000)',
    M.rows.some(r=>/^2026-09-30 계산 ?₩2,500,000/.test(r))&&M.rows.some(r=>/^2026-10-31 계산 ?₩2,600,000/.test(r)),JSON.stringify(M.rows));
  ok('B2 기초 줄과 기초 이전 수기 기록(7/28)은 남는다',M.rows.some(r=>/^2026-09-01 기초 ?₩2,400,000/.test(r))&&M.rows.some(r=>/^2026-07-28 수기 ?₩2,300,000/.test(r)),JSON.stringify(M.rows));
  ok('C1 적어 둔 실제가 계산과 같으면 ✓',M.rows.some(r=>/^2026-09-30 .*적어 둔 실제 ₩2,500,000 ✓/.test(r)),JSON.stringify(M.rows));
  ok('C2 🔴 다르면 차이를 부호와 함께 보인다(10/31 실제 2,550,000 vs 계산 2,600,000 → −50,000)',M.rows.some(r=>/^2026-10-31 .*적어 둔 실제 ₩2,550,000 \(차 −50,000\)/.test(r)),JSON.stringify(M.rows));
  ok('D1 파생 계좌엔 수기 입력칸이 없다',!M.input&&/자동 자산/.test(M.text));
  ok('D2 그래프는 달마다 점 하나(7·8·9·10·11월 = 5)',M.dots===5,M.dots);
  await p.evaluate(()=>closeModal());

  const X=await p.evaluate(()=>{assetModal('a3');const m=document.getElementById('modal');
    return {rows:[...m.querySelectorAll('.logrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim()),input:!!m.querySelector('#vAmt'),cur:m.querySelector('.mcur').textContent};});
  ok('E1 기초 없는 투자 계좌는 예전 그대로 — 수기 로그 · 삭제 · 입력칸',X.input&&X.cur==='₩142,625'&&X.rows.length===2&&/삭제/.test(X.rows[0]),JSON.stringify(X));
  await p.evaluate(()=>closeModal());

  const C=await p.evaluate(()=>{renderAcct();const t=document.body.innerHTML;
    const chip=n=>{const i=t.indexOf(n);const s=t.slice(i,i+400);const m=s.match(/chip (auto|manual)">(자동|수기)/);return m?m[2]:null;};
    return {a6:chip('노랑우산공제'),a3:chip('AI전력인프라')};});
  ok('D3 🔴 계좌 목록 칩 — 노랑우산 「자동」(mode 가 수기여도) · 투자 「수기」',C.a6==='자동'&&C.a3==='수기',JSON.stringify(C));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t61 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
