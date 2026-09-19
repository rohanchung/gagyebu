/* EMR 1~3단계 화면 — 문제 목록·질문 저장·중계 답 표시·다시 받기·기록 범위·모바일.
   Supabase 는 테이블별로 행을 실제로 저장하는 메모리 목이다(기존 스위트의 '빈 배열만 주는 목'으로는 흐름을 못 본다).
   🔒 DB 쪽 격리(emr_thread)는 SQL 로 따로 검증했다 — db/20260918_emr_relay.sql. 여기선 화면만 본다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-09'},accounts:[],transactions:[],categories:[],cards:[],debts:[],journal:[],items:[],logs:[],
 health:{weights:[{date:'2026-09-10',kg:68.2}],labs:[],events:[],
   metrics:[{name:'K (Serum)',cat:'전해질',low:3.5,high:5.1,range:'3.5-5.1',func:'칼륨'},{name:'BUN',cat:'신장',range:'7-23',func:'요소질소'}],
   labDates:['2026-08-27'],labTypes:[''],labMeds:[{am:['약A'],pm:[]}],labVisits:[''],labValues:{'K (Serum)':[5.6],BUN:[16.3]}},
 meals:{}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1440,height:1000}});
 await c.addInitScript(({st})=>{
   /* ── 메모리 Supabase ── */
   let seq=0;const now=()=>new Date(Date.UTC(2026,8,18,0,0,seq++)).toISOString();
   const T={app_state:[{user_id:'u1',data:JSON.parse(JSON.stringify(st)),updated_at:null}],app_state_snap:[],
     health_problems:[
       {id:'p1',user_id:'u1',slug:'순환기',title:'순환기 — 추적',status:'active',summary:'요약 원문',sources:null,rooms:{claude:'순환기',openai:'수연'},created_at:now()},
       {id:'p0',user_id:'u1',slug:'옛문제',title:'끝난 문제',status:'closed',summary:'',sources:null,rooms:{},created_at:now()}],
     health_messages:[]};
   window.__T=T;window.__fail=null;
   function Q(t){this.t=t;this.op='select';this.f=[];this.o=[];this.one=false;}
   Q.prototype.select=function(){if(this.op==='select')this.op='select';this.ret=true;return this;};
   Q.prototype.eq=function(k,v){this.f.push([k,v]);return this;};
   Q.prototype.in=function(){return this;};Q.prototype.limit=function(){return this;};
   Q.prototype.order=function(k,o){this.o.push([k,!(o&&o.ascending===false)]);return this;};
   Q.prototype.insert=function(r){this.op='insert';this.row=r;return this;};
   Q.prototype.update=function(p){this.op='update';this.patch=p;return this;};
   Q.prototype.upsert=function(r){this.op='upsert';this.row=r;return this;};
   Q.prototype.delete=function(){this.op='delete';return this;};
   Q.prototype.maybeSingle=function(){this.one=true;return this;};
   Q.prototype.run=function(){
     const rows=(T[this.t]=T[this.t]||[]);
     if(window.__fail&&window.__fail===this.t+':'+this.op)return {data:null,error:{message:'목 실패 '+this.t}};
     const hit=r=>this.f.every(([k,v])=>r[k]===v);
     if(this.op==='insert'||this.op==='upsert'){
       const list=Array.isArray(this.row)?this.row:[this.row];
       for(const r of list){
         if(this.t==='health_messages'&&r.role==='user'&&rows.some(x=>x.role==='user'&&x.problem_id===r.problem_id&&x.turn_no===r.turn_no))
           return {data:null,error:{message:'duplicate key health_messages_one_question'}};
         if(this.t==='health_problems'&&rows.some(x=>x.slug===r.slug))return {data:null,error:{message:'duplicate slug'}};
         rows.push(Object.assign({id:'r'+(seq++),created_at:now(),status:'ok',summary:'',sources:null,rooms:{}},r));
       }
       return {data:null,error:null};
     }
     if(this.op==='update'){const m=rows.filter(hit);m.forEach(r=>Object.assign(r,this.patch));return {data:m.map(r=>({updated_at:r.updated_at})),error:null};}
     if(this.op==='delete')return {data:null,error:null};
     let out=rows.filter(hit).map(r=>Object.assign({},r));
     for(const [k,asc] of this.o.slice().reverse())out.sort((a,b)=>(a[k]<b[k]?-1:a[k]>b[k]?1:0)*(asc?1:-1));
     return {data:this.one?(out[0]||null):out,error:null};
   };
   Q.prototype.then=function(a,b){return Promise.resolve(this.run()).then(a,b);};
   window.supabase={createClient:()=>({from:t=>new Q(t),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:()=>Promise.resolve()}})};
 },{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.health);
 const results=[];const ok=(n,c)=>results.push({n,c:!!c});
 /* 부팅 직후의 건강 기록 — 앱 마이그레이션이 채운 뒤의 모양이 기준이다 */
 const health0=await p.evaluate(()=>JSON.stringify(DB.health));
 const txt=()=>p.evaluate(()=>document.getElementById('v-emr').textContent);
 const settle=()=>p.waitForTimeout(250);

 await p.evaluate(()=>gotoTab('emr'));await settle();
 ok('목록에 현재 문제',(await txt()).includes('순환기 — 추적'));
 ok('종료 문제는 접힌 묶음',await p.evaluate(()=>!!document.querySelector('.emrclosed')&&!document.querySelector('.emrclosed').open));
 ok('고르기 전 안내',(await txt()).includes('왼쪽에서 문제를 고르거나'));

 await p.click('.emrli[data-emrpick="순환기"]');await settle();
 ok('문제 선택 → DB.ui 에만 기록',await p.evaluate(()=>DB.ui.emrSel==='순환기'));
 ok('빈 대화 안내',(await txt()).includes('아직 질문이 없다'));
 ok('경과 요약 접힘 표시',await p.evaluate(()=>!!document.querySelector('.emrsum')&&!document.querySelector('.emrsum').open));

 /* 턴 1 질문 */
 await p.fill('#emrQ','  칼륨이 왜 올랐나  ');await p.click('.emrask .btn');await settle();
 const q1=await p.evaluate(()=>__T.health_messages.filter(m=>m.role==='user'));
 ok('질문 저장 — 앞뒤 공백 제거·턴 1',q1.length===1&&q1[0].turn_no===1&&q1[0].content==='칼륨이 왜 올랐나');
 ok('질문 행은 provider 없음',q1[0].provider===undefined);
 ok('사실 묶음 함께 저장',q1[0].facts.includes('[문제] 순환기 — 추적')&&q1[0].facts.includes('요약 원문')&&q1[0].facts.includes('K (Serum) — 칼륨'));
 ok('기본 범위 = 기록 있는 지표 전부',q1[0].facts.includes('BUN — 요소질소'));
 ok('사실 묶음은 화면에 안 띄움',!(await txt()).includes('[문제]'));
 ok('입력칸 비워짐',await p.evaluate(()=>document.getElementById('emrQ').value===''));
 ok('방금 남긴 턴은 펼쳐 둔다(복사해야 하므로)',await p.evaluate(()=>document.querySelector('details.emrturn[data-k="p1:1"]').open));
 ok('두 칸 답 대기',await p.evaluate(()=>document.querySelectorAll('.emrac.wait').length===2));
 ok('방에 보낼 한 줄',await p.evaluate(()=>[...document.querySelectorAll('.emrac.wait button')].every(b=>b.dataset.line==='EMR 답할 거 있나 봐 — 순환기 턴 1')));
 ok('목록 대기 개수 2',await p.evaluate(()=>document.querySelector('.emrli.on .emrpend').textContent==='⏳2'));
 ok('대기 중엔 20초 확인이 켜진다',await p.evaluate(()=>!!EMR.poll));

 /* 방이 답을 쓴다(emr_reply 가 하는 일을 흉내) — 🔒 AI 글은 외부 입력이다 */
 await p.evaluate(()=>{__T.health_messages.push({id:'a1',user_id:'u1',problem_id:'p1',turn_no:1,role:'assistant',provider:'claude',
   content:'로버트 답 <img src=x onerror="window.__xss=1"><script>window.__xss=1</script>',status:'ok',mode:'relay',room:'순환기',created_at:'2026-09-18T01:00:00Z'});
   emrLoad();});await settle();
 ok('로버트 답 표시',(await txt()).includes('로버트 답'));
 ok('AI 글은 텍스트로만',await p.evaluate(()=>!window.__xss&&!document.querySelector('.emrac img')&&!document.querySelector('.emrac script')));
 ok('수연은 계속 대기',await p.evaluate(()=>document.querySelectorAll('.emrac.wait').length===1));
 ok('진단 아님 표시',(await txt()).includes('AI 의견 · 진단 아님'));
 ok('대기 개수 1',await p.evaluate(()=>document.querySelector('.emrli.on .emrpend').textContent==='⏳1'));

 /* 쓰던 질문은 다시 그려도 남는다 */
 await p.fill('#emrQ','쓰는 중');await p.evaluate(()=>renderEmr());
 ok('쓰던 질문 보존',await p.evaluate(()=>document.getElementById('emrQ').value==='쓰는 중'));
 await p.fill('#emrQ','');

 /* 다시 받기 — 지우지 않고 error 로 */
 p.once('dialog',d=>d.accept());
 await p.click('.emrac:not(.wait) .emrfoot button');await settle();
 ok('다시 받기 → error 로 남김',await p.evaluate(()=>{const r=__T.health_messages.find(m=>m.id==='a1');return r.status==='error'&&r.error==='로한이 다시 요청';}));
 ok('다시 요청함 표시',(await txt()).includes('다시 요청함'));
 ok('옛 답은 안 보임',!(await txt()).includes('로버트 답'));

 /* 거절 답 */
 await p.evaluate(()=>{__T.health_messages.push({id:'a2',user_id:'u1',problem_id:'p1',turn_no:1,role:'assistant',provider:'openai',
   content:'답하지 않겠다',status:'refused',mode:'relay',room:'수연',created_at:'2026-09-18T01:01:00Z'});emrLoad();});await settle();
 ok('거절은 답함으로 친다',(await txt()).includes('이 질문엔 답하지 않았다')&&await p.evaluate(()=>document.querySelector('.emrli.on .emrpend').textContent==='⏳1'));

 /* v4.11 사고 재현 — 방이 질문 없는 턴에 답을 썼다. 조용히 버리지 말고 드러낸다 */
 await p.evaluate(()=>{__T.health_messages.push({id:'orph',user_id:'u1',problem_id:'p1',turn_no:9,role:'assistant',provider:'claude',
   content:'고아 답',status:'ok',created_at:'2026-09-18T01:02:00Z'});emrLoad();});await settle();
 ok('짝 없는 답 경고',(await txt()).includes('질문이 없는 턴에 쓰인 답 1건(턴 9 · 로버트)'));
 await p.evaluate(()=>{__T.health_messages=__T.health_messages.filter(m=>m.id!=='orph');emrLoad();});await settle();
 ok('짝 없는 답 없으면 경고 없음',!(await txt()).includes('질문이 없는 턴에'));

 /* 기록 범위 — 고른 지표만 */
 await p.click('text=기록 범위');await settle();
 await p.check('input[name="es_mode"][value="pick"]');
 await p.check('.es_lab[value="BUN"]');
 await p.fill('#es_diet','0');
 await p.click('#modal .btn');await settle();
 const src=await p.evaluate(()=>__T.health_problems.find(x=>x.id==='p1').sources);
 ok('기록 범위 저장',Array.isArray(src.labs)&&src.labs.join()==='BUN'&&src.diet_days===0);

 /* 턴 2 — 고른 범위가 사실 묶음에 반영 */
 await p.fill('#emrQ','두 번째 질문');await p.click('.emrask .btn');await settle();
 const q2=await p.evaluate(()=>__T.health_messages.find(m=>m.role==='user'&&m.turn_no===2));
 ok('턴 2 저장',!!q2&&q2.content==='두 번째 질문');
 ok('범위 반영 — BUN 만',q2.facts.includes('BUN — 요소질소')&&!q2.facts.includes('K (Serum)')&&!q2.facts.includes('[식이'));

 /* 저장 실패 — 쓴 글을 잃지 않는다 */
 await p.evaluate(()=>{window.__fail='health_messages:insert';});
 await p.fill('#emrQ','실패할 질문');await p.click('.emrask .btn');await settle();
 ok('실패 사유 표시',(await txt()).includes('질문 저장 실패'));
 ok('실패해도 글 보존',await p.evaluate(()=>document.getElementById('emrQ').value==='실패할 질문'));
 await p.evaluate(()=>{window.__fail=null;});

 /* 요약 편집 */
 await p.click('text=요약 편집');await settle();
 await p.fill('#es_sum','새 요약');await p.click('#modal .btn');await settle();
 ok('요약 저장',await p.evaluate(()=>__T.health_problems.find(x=>x.id==='p1').summary==='새 요약'));

 /* 신규 문제 — 겹치는 이름은 막는다 */
 await p.click('text=+ 신규 문제');await settle();
 let alerted='';p.once('dialog',d=>{alerted=d.message();d.accept();});
 await p.fill('#en_title','중복');await p.fill('#en_slug','순환기');await p.click('#modal .btn');await settle();
 ok('겹치는 짧은 이름 거부',alerted.includes('이미 있다'));
 await p.fill('#en_title','어깨 재활');await p.fill('#en_slug','오십견');await p.fill('#en_claude','재활의학과');
 await p.click('#modal .btn');await p.waitForTimeout(500);
 ok('신규 문제 생성·선택',await p.evaluate(()=>DB.ui.emrSel==='오십견'&&__T.health_problems.some(x=>x.slug==='오십견'&&x.rooms.claude==='재활의학과')));

 /* 모바일 */
 await p.evaluate(()=>emrPick('순환기'));await settle();
 await p.setViewportSize({width:400,height:900});await settle();
 ok('모바일 — 고르면 목록 숨김',await p.evaluate(()=>getComputedStyle(document.querySelector('.emrlist')).display==='none'));
 ok('모바일 — ← 목록 버튼',await p.evaluate(()=>getComputedStyle(document.querySelector('.emrback')).display!=='none'));
 ok('모바일 — 두 답 세로',await p.evaluate(()=>{const a=document.querySelectorAll('.emrturn:first-child .emrac');return a.length===2&&a[1].getBoundingClientRect().top>a[0].getBoundingClientRect().bottom-1;}));
 ok('모바일 가로 넘침 없음',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 fs.mkdirSync(path.join(__dirname,'.out'),{recursive:true});
 await p.screenshot({path:path.join(__dirname,'.out','emr44-400.png'),fullPage:true});
 await p.click('.emrback');await settle();
 ok('모바일 — 목록으로 돌아감',await p.evaluate(()=>getComputedStyle(document.querySelector('.emrlist')).display!=='none'&&!DB.ui.emrSel));
 await p.screenshot({path:path.join(__dirname,'.out','emr44-400-list.png'),fullPage:true});
 await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>emrPick('순환기'));await settle();
 ok('PC 가로 넘침 없음',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:path.join(__dirname,'.out','emr44-1440.png'),fullPage:true});

 /* v4.12 턴 접기 — 기본은 접힘, 제목줄에 상태, 펼친 건 다시 그려도 유지 */
 await p.evaluate(()=>{EMR.open={};renderEmr();});
 ok('접기 — 기존 턴은 기본 접힘',await p.evaluate(()=>[...document.querySelectorAll('details.emrturn')].every(d=>!d.open)&&document.querySelectorAll('details.emrturn').length===2));
 ok('접기 — 제목줄에 질문 앞부분',await p.evaluate(()=>document.querySelector('details.emrturn[data-k="p1:2"] .emrpv').textContent==='두 번째 질문'));
 ok('접기 — 제목줄에 두 AI 상태',await p.evaluate(()=>{const c=[...document.querySelectorAll('details.emrturn[data-k="p1:1"] .emrchip')].map(x=>x.textContent.trim());return c.length===2&&c[0].includes('⏳')&&c[1].includes('거절');}));
 await p.click('details.emrturn[data-k="p1:2"] summary');await settle();
 await p.evaluate(()=>renderEmr());
 ok('접기 — 펼친 턴은 다시 그려도 유지',await p.evaluate(()=>document.querySelector('details.emrturn[data-k="p1:2"]').open&&!document.querySelector('details.emrturn[data-k="p1:1"]').open));
 ok('접기 — app_state 에 안 남긴다',await p.evaluate(()=>!('emrOpen' in DB.ui)&&!JSON.stringify(DB.ui).includes('p1:2')));

 /* 종료 — 질문칸·복사 버튼이 사라진다 */
 await p.selectOption('.emrtools select','closed');await settle();
 ok('종료 → 질문칸 없음',await p.evaluate(()=>!document.getElementById('emrQ')));
 ok('종료 → 복사 버튼 없음',await p.evaluate(()=>!document.querySelector('.emrac.wait button')));
 ok('종료 → 대기 개수 없음',await p.evaluate(()=>!document.querySelector('.emrli.on .emrpend')));
 ok('종료 → 20초 확인 꺼짐',await p.evaluate(()=>!EMR.poll));

 ok('EMR 조작으로 app_state 건강 기록 불변',await p.evaluate(()=>JSON.stringify(DB.health))===health0);
 for(const r of results)assert.ok(r.c,r.n);
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+(results.length+1)+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
