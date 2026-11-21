/* t103 — 🔒 빈 씨앗 (v5.14 · 공개 저장소 정리 id 64)
   v5.13 까지 index.html 의 씨앗(SEED·TAX·INS·HEALTH·MOM·SAJU·체중 일괄)에 실데이터가 있었다. 공개 Pages 로 누구나 받았다.
   🔒 S  소스에 실데이터 꼴이 없다(사업자번호 꼴 · 가린 증권번호 꼴 · 생년월일 · 씨앗 속 금액) — 진짜 값은 테스트에 싣지 않고 「꼴」로만 잰다
   🔒 N  새 기기(서버에 데이터가 있다) — 씨앗이 비어도 서버 값을 지우거나 덮지 않는다(사주 원국 · 건강 · 어머니 · 세무 · 보험 · 계좌)
   🔒 E  빈 계정 — 화면마다 죽지 않는다 · 사주는 「원국이 아직 없다」 · 키가 없으면 BMI 「—」 · 어머니 칸을 만들지 않는다
   🔒 O  오프라인 첫 실행 — 서버가 응답하지 않아도 죽지 않는다 */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
/* 서버 흉내 — mode: 'full'(데이터 있음) · 'empty'(빈 계정) · 'down'(응답 없음) */
const FAKE=(mode)=>{
  const S={kv:{},saves:[]}; window.__S=S; const at=new Date().toISOString();
  if(mode==='full'){
    const put=(k,v)=>S.kv[k]={data:v,rev:3,at};
    put('accounts',[{id:'fa1',name:'가짜통장',group:'현금성',mode:'manual',hist:[{date:'2026-01-31',amount:1234}]}]);
    put('transactions',[{id:'ft1',date:'2026-11-01',type:'expense',scope:'personal',cat:'식비',method:'현금',amt:5000,memo:''}]);
    put('categories',[{id:'fk1',name:'식비',type:'expense'}]);
    put('tax',{biz:{name:'가짜상호',bizNo:'000-00-00000'},vatHistory:[],units:[{id:'fu1',name:'가짜사업장'}],catMap:{},rates:{income:0.1},filings:[]});
    put('meta',{taxSeeded:1,insSeeded:2,rtOrdSeeded:1,incTypeFix:1});
    put('insurance/policies',[{id:'fp1',person:'self',insurer:'가짜생명',product:'가짜보험'}]);
    put('insurance/covers',[{id:'fc1',pid:'fp1',name:'가짜보장'}]);
    put('health/rest',{height:171,labDates:['2025-01-02'],labTypes:['외래'],labMeds:[{am:[],pm:[]}],labVisits:[''],events:[],catOrder:['지질'],wImport2026:true});
    put('health/metrics',[{name:'가짜지표',func:'',low:1,high:2,range:'1-2',cat:'지질'}]);
    put('health/labValues',{'가짜지표':[1.5]});
    put('health/weights',[{date:'2025-01-02',kg:70}]);
    put('healthPeople',{mom:{person:{name:'가짜이름',sex:'F',birth:'1900-01-01'},labDates:['2025-01-03'],labTypes:[''],labVisits:[''],labMeds:[{am:[],pm:[]}],metrics:[],labValues:{},weights:[],events:[],catOrder:[]}});
    put('saju/rest',{birth:{solar:'1990-01-01',lunar:'1989-12-05',gender:'M'},natal:{year:'己巳',month:'丙子',day:'丙寅',hour:'戊子'},ilgan:'丙',gongmang:['戌','亥'],gyeok:'가짜격',daeun:{startAge:5,dir:'역행',list:[[5,'乙亥'],[15,'甲戌'],[25,'癸酉'],[35,'壬申'],[45,'辛未']]}});
    put('saju/readings',{});
  }
  if(mode!=='down'){const seed={schemaVersion:9,actTzFixed:1};Object.keys(seed).forEach(k=>{if(!S.kv[k])S.kv[k]={data:seed[k],rev:1,at};});}
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return mode==='down'?Promise.reject(new Error('offline')):Promise.resolve({data:null,error:null})},
    then(a,b){if(mode==='down')return Promise.reject(new Error('offline')).then(a,b);let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(mode==='down')return Promise.reject(new Error('offline'));
    if(fn!=='kv_save')return Promise.resolve({data:null,error:null});
    const revs={},ats={};
    args.p_changes.forEach(c=>{S.saves.push(c.key);const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1',email:'test@example.com'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  /* ── S) 소스 — 씨앗에 실데이터 꼴이 없다 ── */
  const src=fs.readFileSync(file,'utf8');
  const grab=(n)=>{const m=src.match(new RegExp('^var '+n+'\\s*=\\s*(.*?);?$','m'));return m?m[1]:'';};
  const seedBlock=src.slice(src.indexOf('var SEED = {'),src.indexOf('\n};',src.indexOf('var SEED = {')));
  ok('S1 사업자등록번호 꼴(3-2-5)이 없다',!/\b\d{3}-\d{2}-\d{5}\b/.test(src));
  ok('S2 가린 증권·카드번호 꼴(숫자****숫자)이 없다',!/\d{3,}\*{3,}\d{2,}/.test(src));
  ok('S3 씨앗에 생년월일·검사일 꼴이 없다',!/(19[2-9]\d|20[0-2]\d)-\d\d-\d\d/.test(grab('SAJU_SEED')+grab('MOM_SEED')+grab('TAX_SEED')+grab('INS_SEED'))&&!/"labDates":\["\d/.test(grab('HEALTH_SEED')));
  ok('S4 첫 실행 씨앗에 금액·잔액이 없다',!/amount:\d|amt:\d|balance:\d|monthly:\d|price:\d/.test(seedBlock)&&/budgets:\{\}/.test(seedBlock),seedBlock.match(/(amount|amt|balance|price):\d+/)||'');
  ok('S5 체중 일괄 입력·어머니 씨앗이 비었다',/^var WEIGHT_IMPORT_2026=\[\];/m.test(src)&&/^var MOM_SEED=null;/m.test(src));
  ok('S6 씨앗에 키(cm)·체중(kg) 값이 없다',!/height":\d|kg":\d/.test(grab('HEALTH_SEED')+grab('MOM_SEED'))&&!/height=1\d\d/.test(src));

  /* ── N) 새 기기 — 서버 값을 지우거나 덮지 않는다 ── */
  const run=async(mode,fn)=>{const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(FAKE,mode);
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
    await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(3000);
    const r=await fn(p);await ctx.close();return {r,errs};};
  const N=await run('full',async p=>{
    for(const v of ['saju','weight','labs','insu','tax','acct','life'])await p.evaluate(v=>{const m=document.querySelector('.side .m[data-v="'+v+'"]');if(m)m.click();},v).then(()=>p.waitForTimeout(250));
    await p.waitForTimeout(2500);
    return await p.evaluate(()=>({natal:JSON.stringify(DB.saju.natal),daeun:DB.saju.daeun&&DB.saju.daeun.startAge,birth:DB.saju.birth&&DB.saju.birth.solar,
      h:DB.health.height,ld:JSON.stringify(DB.health.labDates),lv:JSON.stringify(DB.health.labValues['가짜지표']),
      mom:DB.healthPeople.mom&&DB.healthPeople.mom.person.name,tax:DB.tax.biz.name,units:DB.tax.units.length,pol:DB.insurance.policies.map(x=>x.id).join(),
      acc:DB.accounts.map(x=>x.id).join(),tx:DB.transactions.length,
      srv:{saju:JSON.stringify(window.__S.kv['saju/rest'].data.natal),mom:window.__S.kv.healthPeople.data.mom.person.name,h:window.__S.kv['health/rest'].data.height,
        pol:window.__S.kv['insurance/policies'].data.length,acc:window.__S.kv.accounts.data.length},saves:window.__S.saves.slice(),
      sajuTxt:document.getElementById('v-saju').textContent.slice(0,300),age:typeof lfBirthY==='function'?lfBirthY():null}));});
  const R=N.r;
  ok('N1 🔴 사주 원국을 씨앗으로 덮지 않는다(서버 값 그대로)',R.natal==='{"year":"己巳","month":"丙子","day":"丙寅","hour":"戊子"}'&&R.daeun===5&&R.birth==='1990-01-01'&&R.srv.saju===R.natal,JSON.stringify(R).slice(0,300));
  ok('N2 건강 — 키·검사일·수치가 서버 그대로',R.h===171&&R.ld==='["2025-01-02"]'&&R.lv==='[1.5]'&&R.srv.h===171,JSON.stringify([R.h,R.ld,R.lv]));
  ok('N3 어머니 칸 — 서버 그대로(씨앗이 덮지 않는다)',R.mom==='가짜이름'&&R.srv.mom==='가짜이름',R.mom);
  ok('N4 세무·보험·계좌·거래 — 서버 그대로(씨앗이 끼어들지 않는다)',R.tax==='가짜상호'&&R.units===1&&R.pol==='fp1'&&R.acc==='fa1'&&R.tx===1&&R.srv.pol===1&&R.srv.acc===1,JSON.stringify(R).slice(0,240));
  ok('N5 사주 화면이 서버 원국으로 그려진다 · 연대기 나이도 서버 생일',/1990-01-01/.test(R.sajuTxt)&&R.age===1990,R.sajuTxt.slice(0,120));
  ok('N6 페이지 에러 없음(새 기기)',N.errs.length===0,N.errs.join(' | '));

  /* ── E) 빈 계정 ── */
  const E=await run('empty',async p=>{
    const out={};
    for(const v of ['saju','weight','labs','insu','tax','acct','life','agora','dash']){await p.evaluate(v=>{const m=document.querySelector('.side .m[data-v="'+v+'"]');if(m)m.click();},v);await p.waitForTimeout(250);
      out[v]=await p.evaluate(v=>{const e=document.getElementById('v-'+v);return e?e.textContent.length:-1;},v);}
    out.saju=await p.evaluate(()=>document.getElementById('v-saju').textContent);
    out.mom=await p.evaluate(()=>DB.healthPeople&&DB.healthPeople.mom);
    out.bmi=await p.evaluate(()=>{const c=weightCells({kg:70});return c.filter(x=>x[0]==='BMI')[0][1];});
    out.wtxt=await p.evaluate(()=>{document.querySelector('.side .m[data-v="weight"]').click();return document.getElementById('v-weight').textContent;});
    out.acc=await p.evaluate(()=>DB.accounts.length+'/'+DB.transactions.length+'/'+Object.keys(DB.budgets||{}).length);
    out.biz=await p.evaluate(()=>JSON.stringify(DB.tax.biz));
    return out;});
  ok('E1 빈 계정 — 사주는 「원국이 아직 없다」(그리다 죽지 않는다)',/원국이 아직 없다/.test(E.r.saju),E.r.saju.slice(0,120));
  ok('E2 어머니 칸을 만들지 않는다',E.r.mom==null,JSON.stringify(E.r.mom));
  ok('E3 키가 없으면 BMI 는 비고 「키 —」',E.r.bmi==null&&/키 —/.test(E.r.wtxt),JSON.stringify([E.r.bmi,E.r.wtxt.slice(0,80)]));
  ok('E4 계좌·거래·예산·사업자 정보가 빈 채로 뜬다',E.r.acc==='0/0/0'&&E.r.biz==='{}',E.r.acc+' '+E.r.biz);
  ok('E5 화면마다 그려진다',['weight','labs','insu','tax','acct','life'].every(v=>E.r[v]>0),JSON.stringify(E.r).slice(0,200));
  ok('E6 페이지 에러 없음(빈 계정)',E.errs.length===0,E.errs.join(' | '));

  /* ── O) 오프라인 첫 실행 ── */
  const O=await run('down',async p=>{await p.waitForTimeout(1500);
    return await p.evaluate(()=>({db:typeof DB!=='undefined'&&!!DB,acc:(typeof DB!=='undefined'&&DB&&DB.accounts)?DB.accounts.length:-1,natal:(typeof DB!=='undefined'&&DB&&DB.saju)?DB.saju.natal:'x',body:document.body.innerText.slice(0,300).replace(/\s+/g,' '),login:getComputedStyle(document.getElementById('login')).display,app:document.getElementById('app').className}));});
  ok('O1 오프라인 첫 실행 — 실데이터 없는 틀로 뜬다',O.r.db&&O.r.acc===0&&O.r.natal==null,JSON.stringify(O.r));
  ok('O2 페이지 에러 없음(오프라인)',O.errs.filter(e=>!/offline/.test(e)).length===0,O.errs.join(' | '));
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t103 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
