/* 🎱 당구 연습장(billiards/index.html) v1 — 로한북과 별개인 앱의 테스트
   · 가짜 Supabase(메모리) 로 돌린다. 실제 마우스 클릭·드래그로 선을 긋고 고친다.
   · 실버 UX 기준(글자 20px↑·버튼 56px↑)을 1920·2560 두 화면에서 잰다.
   🔒 argv[2](로한북 HTML)는 무시한다 — 이 파일은 늘 billiards/index.html 을 본다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'..','billiards','index.html');
const URL='file:///'+FILE.replace(/\\/g,'/').replace(/^\//,'');
const DAD={id:'dad',email:'dad@test',app_metadata:{provider:'email',app:'billiards'}};
const ROHAN={id:'rohan',email:'rohan@test',app_metadata:{provider:'email'}};

function init({session,users}){
  const T={bb_boards:[],bb_attempts:[],bb_events:[]};window.__T=T;window.__ops=[];window.__out=0;let seq=0;
  let cur=session;
  const J=o=>o==null?o:JSON.parse(JSON.stringify(o));
  function from(t){
    const st={op:'select',f:[],o:[],lim:null,one:false,p:null};
    const q={
      select(){return q},insert(p){st.op='insert';st.p=p;return q},update(p){st.op='update';st.p=p;return q},delete(){st.op='delete';return q},
      eq(c,v){st.f.push(r=>r[c]===v);return q},is(c){st.f.push(r=>r[c]==null);return q},not(c){st.f.push(r=>r[c]!=null);return q},
      lt(c,v){st.f.push(r=>r[c]!=null&&r[c]<v);return q},order(c,o){st.o.push([c,o&&o.ascending===false?-1:1]);return q},
      limit(n){st.lim=n;return q},single(){st.one=true;return q},
      then(a,b){return Promise.resolve(run()).then(a,b)}};
    function run(){
      const now=new Date(Date.now()+(seq++)).toISOString(),rows=T[t];window.__ops.push(t+':'+st.op);
      if(st.op==='insert'){const r=Object.assign({id:t==='bb_events'?seq:t+'_'+seq,user_id:cur.user.id,created_at:now,updated_at:now,deleted_at:null,at:now},J(st.p));rows.push(r);return {data:st.one?J(r):[J(r)],error:null};}
      let m=rows.filter(r=>st.f.every(f=>f(r)));
      if(st.op==='update'){m.forEach(r=>Object.assign(r,J(st.p),{updated_at:now}));return {data:J(m),error:null};}
      if(st.op==='delete'){T[t]=rows.filter(r=>!m.includes(r));return {data:null,error:null};}
      st.o.slice().reverse().forEach(([c,d])=>m.sort((a,b)=>(a[c]>b[c]?1:a[c]<b[c]?-1:0)*d));
      if(st.lim)m=m.slice(0,st.lim);
      return {data:st.one?J(m[0]):J(m),error:null};
    }
    return q;
  }
  window.supabase={createClient:()=>({from,auth:{
    getSession:()=>Promise.resolve({data:{session:cur}}),
    signInWithPassword:({email,password})=>{const u=users[email];
      if(!u||u.pw!==password)return Promise.resolve({data:{},error:{message:'Invalid login credentials'}});
      cur={user:u.user};return Promise.resolve({data:{user:u.user,session:cur},error:null});},
    signOut:()=>{window.__out++;cur=null;return Promise.resolve({})},
    updateUser:()=>Promise.resolve({data:{},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
}

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function open(opt,vp){
   const c=await b.newContext({viewport:vp||{width:2560,height:1440}});
   await c.addInitScript(init,opt);
   const p=await c.newPage(),errs=[];
   p.on('pageerror',e=>errs.push(e.message));
   await p.route('https://**/*',r=>r.abort());
   await p.goto(URL);await wait(400);
   return {c,p,errs};
 }
 try{
 /* ── A) 로그인 ── */
 {const users={'dad@test':{pw:'pw-dad-1',user:DAD},'rohan@test':{pw:'pw-ro-1',user:ROHAN}};
  const {c,p,errs}=await open({session:null,users});
  ok('A1 로그인 화면',await p.isVisible('#login')&&!(await p.isVisible('#app')));
  ok('A2 가입 버튼 없음',!(await p.$('text=가입')));
  await p.fill('#email','dad@test');await p.fill('#pw','wrong');await p.click('#loginBtn');await wait(200);
  ok('A3 틀린 비번 → 한국어 안내',/맞지 않습니다/.test(await p.textContent('#loginErr')),await p.textContent('#loginErr'));
  await p.click('#pwEye');ok('A4 비밀번호 보기',(await p.getAttribute('#pw','type'))==='text');
  await p.fill('#email','rohan@test');await p.fill('#pw','pw-ro-1');await p.click('#loginBtn');await wait(200);
  ok('A5 로한 계정 → 막힘',/당구 연습장 계정이 아닙니다/.test(await p.textContent('#loginErr'))&&(await p.evaluate(()=>window.__out))===1);
  ok('A6 로한 계정 → 앱 안 열림',!(await p.isVisible('#app')));
  await p.fill('#email','dad@test');await p.fill('#pw','pw-dad-1');await p.press('#pw','Enter');await wait(400);
  ok('A7 아버지 → 입장',await p.isVisible('#app'));
  const T=await p.evaluate(()=>window.__T);
  ok('A8 첫 판 자동 생성',T.bb_boards.length===1&&T.bb_boards[0].name==='판 1',T.bb_boards);
  ok('A9 로그인 후 비밀번호 칸 비움',(await p.inputValue('#pw'))==='');
  ok('A10 에러 없음',!errs.length,errs);
  await c.close();}

 /* ── 본 시험: 이미 로그인된 아버지 ── */
 const {c,p,errs}=await open({session:{user:DAD},users:{}});
 const cl=(x,y)=>p.evaluate(([x,y])=>{const s=document.getElementById('tbl'),pt=s.createSVGPoint();pt.x=x*100;pt.y=y*100;const q=pt.matrixTransform(s.getScreenCTM());return [q.x,q.y];},[x,y]);
 const click=async(x,y)=>{const [a,bb]=await cl(x,y);await p.mouse.click(a,bb);await wait(40);};
 const drag=async(x0,y0,x1,y1)=>{const [a,bb]=await cl(x0,y0),[e,f]=await cl(x1,y1);await p.mouse.move(a,bb);await p.mouse.down();
   for(let i=1;i<=8;i++){await p.mouse.move(a+(e-a)*i/8,bb+(f-bb)*i/8);await wait(10);}await p.mouse.up();await wait(60);};
 const st=()=>p.evaluate(()=>JSON.parse(JSON.stringify(ST)));
 const seq=()=>p.evaluate(()=>railSeq(ST.draft[LAYER]));
 ok('B0 첫 판',(await p.textContent('#bName'))==='판 1');
 ok('B0b 기본 모드 = 공 옮기기',/공을 잡아 끌어서/.test(await p.textContent('#hint')));

 /* ── B) 선 긋기 ── */
 await p.click('#mDraw');
 ok('B1 모드 글자',/예측선 긋는 중/.test(await p.textContent('#hint')));
 await p.mouse.move(...(await cl(3.1,0.15)));await wait(60);
 ok('B2 미리보기 숫자 말풍선(30)',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='30')));
 await click(3.1,0.15);          /* 윗쿠션 3칸 → 30 */
 await click(7.85,1.6);          /* 오른쪽 쿠션 1.5 → 15 */
 await click(4.4,3.9);           /* 아랫쿠션 4.5 → 45 */
 await click(6,2);               /* 빨간 공 */
 let s=await st();
 ok('B3 점 5개(내 공 + 4)',s.draft.predict.length===5,s.draft.predict);
 ok('B4 첫 점 = 내 공',s.draft.predict[0].ref==='cue');
 ok('B5 쿠션 자석 30→15→45',JSON.stringify(await seq())==='[30,15,45]',await seq());
 ok('B6 공 자석',s.draft.predict[4].ref==='r');
 ok('B7 아래 쿠션 지점 글자',/30 → 15 → 45/.test(await p.textContent('#seq')));
 await click(6,2);
 ok('B8 같은 곳 두 번은 무시',(await st()).draft.predict.length===5);
 await p.click('#bDone');
 ok('B9 긋기 끝 → 고치기 모드',(await p.evaluate(()=>MODE))==='edit');
 ok('B10 손잡이 4개',(await p.$$('#gDyn .hd')).length===4);

 /* ── C) 고치기 ── */
 await drag(3,0,3.55,0.1);
 ok('C1 끌어서 옮기기 + 자석(35)',JSON.stringify(await seq())==='[35,15,45]',await seq());
 await click(7.97,1.5);          /* 손잡이 클릭(움직임 없음) */
 ok('C2 클릭 → 지우기 버튼',await p.isVisible('#ptPop'));
 await p.click('#ptDel');await wait(60);
 ok('C3 점 지우기',JSON.stringify(await seq())==='[35,45]'&&(await st()).draft.predict.length===4,await seq());
 /* 첫 선분(내 공 2,2.5 → 3.5,0) 중간 클릭 = 점 추가 */
 await click(2.75,1.25);
 ok('C4 선 클릭 → 점 추가',(await st()).draft.predict.length===5);
 await p.click('#bUndo');await wait(40);
 ok('C5 되돌리기',(await st()).draft.predict.length===4);
 await p.keyboard.press('Control+z');await wait(40);
 ok('C6 Ctrl+Z',JSON.stringify(await seq())==='[35,15,45]',await seq());
 await p.keyboard.press('Control+y');await wait(40);
 ok('C7 Ctrl+Y 다시하기',JSON.stringify(await seq())==='[35,45]',await seq());
 await p.click('#bRedo');await wait(40);
 ok('C8 다시하기 버튼',(await st()).draft.predict.length===5);
 await p.keyboard.press('Control+z');await wait(40);

 /* ── D) 공 옮기기 ── */
 await p.click('#mBall');
 await drag(2,2.5,1,3);
 s=await st();
 ok('D1 흰 공 옮김',Math.abs(s.balls.w.x-1)<0.03&&Math.abs(s.balls.w.y-3)<0.03,s.balls.w);
 ok('D2 선 시작이 공을 따라감',await p.evaluate(()=>{const q=resolve(ST.draft.predict[0]);return q.x===ST.balls.w.x&&q.y===ST.balls.w.y;}));
 await drag(6,2,1,3);              /* 빨간 공을 흰 공 위로 → 겹치면 안 됨 */
 s=await st();
 ok('D3 공끼리 안 겹침',Math.hypot(s.balls.r.x-s.balls.w.x,s.balls.r.y-s.balls.w.y)>=0.2-1e-9,[s.balls.r,s.balls.w]);
 await p.click('#cY');
 ok('D4 내 공 = 노란 공',(await st()).balls.cue==='y');
 await p.click('#cW');

 /* ── E) 당점 · 속도 · 결과 ── */
 const tipAt=async(x,y)=>{const bx=await p.$eval('#tip',e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width];});
   await p.mouse.click(bx[0]+bx[2]/2+x*bx[2]/2.3,bx[1]+bx[2]/2+y*bx[2]/2.3);await wait(40);};
 await tipAt(0.45,-0.45);
 ok('E1 당점 → 시계·팁',/^[12]시 방향 · \d(\.5)?팁$/.test(await p.textContent('#tipTxt')),await p.textContent('#tipTxt'));
 ok('E2 당점 풀이',/위 \(밀어치기\) · 오른쪽 회전/.test(await p.textContent('#tipTxt2')),await p.textContent('#tipTxt2'));
 await p.click('#tipGuide [data-g=c12]');
 ok('E3 12시 안내선',(await p.$$('#tip line')).length===12&&(await p.$$('#tip text')).length===12);
 await p.click('#tipMid');
 ok('E4 정중앙',(await p.textContent('#tipTxt'))==='정중앙');
 await tipAt(0.45,-0.45);
 await p.click('#spd [data-s="3"]');
 ok('E5 속도 3',(await st()).draft.speed===3&&await p.$eval('#spd [data-s="3"]',e=>e.classList.contains('on')));
 await p.fill('#kmh','12.5');await p.press('#kmh','Tab');
 await p.click('#rHit');await p.fill('#memo','조금 두껍게');
 s=await st();
 ok('E6 km/h · 결과 · 메모',s.draft.kmh===12.5&&s.draft.result==='hit'&&s.draft.memo==='조금 두껍게',s.draft);

 /* ── F) 실제 간 길 ── */
 await p.click('#lAct');
 ok('F1 실제 선 → 긋기 모드',(await p.evaluate(()=>MODE))==='draw'&&/실제선 긋는 중/.test(await p.textContent('#hint')));
 await click(4,0.1);await click(8,2.1);
 ok('F2 실제 선 40→20',JSON.stringify(await seq())==='[40,20]',await seq());
 ok('F3 아래 글자에 실제도',/실제:.*40 → 20/.test(await p.textContent('#seq')));
 await p.click('#bDone');

 /* ── G) 자동 저장 ── */
 await wait(1000);
 let T=await p.evaluate(()=>window.__T);
 ok('G1 자동 저장(선)',T.bb_boards[0].draft.predict.length===4&&T.bb_boards[0].draft.actual.length===3,T.bb_boards[0].draft);
 ok('G2 저장됨 표시',/저장됨/.test(await p.textContent('#saveSt')),await p.textContent('#saveSt'));

 /* ── H) 기록하기 ── */
 await p.click('#bRec');await wait(300);
 T=await p.evaluate(()=>window.__T);
 const a=T.bb_attempts[0];
 ok('H1 시도 1건',T.bb_attempts.length===1);
 ok('H2 예측 쿠션 저장',a&&JSON.stringify(a.predict.filter(x=>x.rail).map(x=>x.x===0||x.x===8?x.y*10:x.x*10))==='[35,45]',a&&a.predict);
 ok('H3 당점·속도·결과·메모',a&&a.tip&&a.speed===3&&a.kmh===12.5&&a.result==='hit'&&a.memo==='조금 두껍게',a);
 ok('H4 실제 선 저장',a&&a.actual&&a.actual.length===3);
 ok('H5 그때 공 배치 저장',a&&a.balls.w.x===s.balls.w.x);
 s=await st();
 ok('H6 결과·메모·실제만 비움',s.draft.result===null&&s.draft.memo===''&&s.draft.actual.length===0&&s.draft.predict.length===4&&s.draft.speed===3);
 ok('H7 알림',/기록했습니다.*1번째/.test(await p.textContent('#toast')),await p.textContent('#toast'));
 ok('H8 이벤트 로그',T.bb_events.some(e=>e.kind==='attempt.save'));
 await p.click('#rMiss');await p.click('#bRec');await wait(300);
 /* 선 없이 기록 → 안내 */
 await p.click('#lPre');await p.click('#bClear');await p.click('.modal .btns .danger');await wait(60);
 await p.click('#bRec');await wait(100);
 ok('H9 선 없이 기록 → 안내',/예측 선을 그어 주세요/.test(await p.textContent('#mask')));
 await p.click('.modal .btns button');
 await p.click('#bUndo');

 /* ── I) 판 CRUD ── */
 await p.click('#bNew');await p.fill('#mIn','옆돌리기');await p.click('.modal .btns .primary');await wait(200);
 ok('I1 새 판 탭',(await p.textContent('#tabs')).includes('옆돌리기')&&(await p.textContent('#bName'))==='옆돌리기');
 ok('I2 새 판은 빈 선',(await st()).draft.predict.length===0);
 await p.click('#bRename');await p.fill('#mIn','옆돌리기 연습');await p.press('#mIn','Enter');await wait(150);
 ok('I3 이름 바꾸기',(await p.textContent('#bName'))==='옆돌리기 연습'&&(await p.evaluate(()=>window.__T.bb_boards.some(b=>b.name==='옆돌리기 연습'))));
 await p.click('#tabs button:has-text("판 1")');await wait(100);
 ok('I4 탭 전환 → 판 1 선 그대로',(await st()).draft.predict.length===4);
 await p.click('#bCopy');await wait(200);
 ok('I5 복제',(await p.textContent('#bName'))==='판 1 (복사)'&&(await st()).draft.predict.length===4);
 await p.click('#bDel');
 ok('I6 지우기 확인창',/휴지통/.test(await p.textContent('#mask')));
 await p.click('.modal .btns .danger');await wait(200);
 T=await p.evaluate(()=>window.__T);
 ok('I7 휴지통으로(행은 남음)',T.bb_boards.find(x=>x.name==='판 1 (복사)').deleted_at!=null&&!(await p.textContent('#tabs')).includes('(복사)'));
 await p.click('#bTrash');await wait(200);
 ok('I8 휴지통 목록',/판 1 \(복사\)/.test(await p.textContent('#mask'))&&/30일 남음|29일 남음/.test(await p.textContent('#mask')));
 await p.click('[data-rb]');await wait(200);
 await p.click('.modal .btns .primary');
 ok('I9 되살리기',(await p.textContent('#tabs')).includes('(복사)'));
 /* 탭이 7개 넘으면 목록으로 */
 for(let i=0;i<5;i++){await p.click('#bNew');await p.click('.modal .btns .primary');await wait(150);}
 ok('I10 탭 최대 6 + 판 목록 외 N개',(await p.$$('#tabs button')).length===6&&/외 2개/.test(await p.textContent('#bMore')),await p.textContent('#bMore'));
 ok('I11 지금 판은 늘 탭에 보임',await p.$eval('#tabs button.on',e=>e.textContent)===await p.textContent('#bName'));
 await p.click('#bMore');ok('I12 판 목록 8개',(await p.$$('.modal .litem')).length===8);
 await p.click('.modal .litem:first-child [data-go]');await wait(100);
 ok('I13 목록에서 열기',(await p.textContent('#bName'))==='판 1');

 /* ── J) 기록 화면 ── */
 await p.click('#bLog');await wait(300);
 const body=await p.textContent('#logBody');
 ok('J1 시도 2번',/시도\s*2번/.test(body),body.slice(0,120));
 ok('J2 성공률 50%',/50%/.test(body));
 ok('J3 표 2줄',(await p.$$('#logBody tr.click')).length===2);
 ok('J4 쿠션 지점 표시',/35 → 45/.test(body));
 await p.click('#logBody tr.click >> nth=1');await wait(100);
 ok('J5 지난 시도 그림',(await p.$$('.modal svg.mini polyline')).length>=2);
 await p.click('.modal .btns .primary');await wait(200);   /* 이 조건으로 다시 */
 ok('J6 다시 해보기 → 당구대로',await p.isVisible('#workv')&&(await st()).draft.predict.length===4&&(await st()).draft.speed===3);
 await p.click('#bLog');await wait(200);
 await p.click('#vEvt');await wait(200);
 const ev=await p.textContent('#logBody');
 ok('J7 변경 이력',/새 판 ‘옆돌리기’/.test(ev)&&/이름을 ‘옆돌리기’ → ‘옆돌리기 연습’/.test(ev)&&/휴지통에서 살렸습니다/.test(ev),ev.slice(0,300));
 await p.click('#bBack');

 /* ── K) 한 화면 · 실버 UX 치수 ──
    🔒 v1.1: 화면 전체(2560×1440)로 쟀더니 통과했지만, 실제 브라우저 창은 탭·주소창을 빼면 ~1300 이라
       로한 화면에서 오른쪽 패널에 스크롤이 생겼다. → **실제 브라우저 창 크기**로 잰다.
       2560×1300 = 32인치(아버지) · 1920×950 = 보통 모니터 · 1536×730 = 125% 배율 노트북 */
 const meas=()=>p.evaluate(()=>{
   const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
   const btn=[...document.querySelectorAll('#app button')].filter(vis).map(e=>({t:e.textContent.trim().slice(0,12),h:e.getBoundingClientRect().height}));
   const out=[...document.querySelectorAll('#workv button, header button, #workv input')].filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.bottom>innerHeight+0.5||r.right>innerWidth+0.5;}).map(e=>e.textContent.trim()||e.id);
   const side=document.querySelector('.side');
   const tops=[...document.querySelectorAll('.stage .tools button')].filter(vis).map(e=>Math.round(e.getBoundingClientRect().top));
   const wrap=document.querySelector('.tblwrap').getBoundingClientRect(),frame=document.querySelector('#gStatic rect').getBoundingClientRect();
   return {root:parseFloat(getComputedStyle(document.documentElement).fontSize),minBtn:Math.min(...btn.map(x=>x.h)),
     over:document.documentElement.scrollWidth-innerWidth,out,sideScroll:side.scrollHeight-side.clientHeight,
     pageScroll:document.documentElement.scrollHeight-innerHeight,rows:new Set(tops).size,
     fillW:frame.width/wrap.width,fillH:frame.height/wrap.height,frameW:frame.width};
 });
 let m;
 for(const [W,H,font,btnH] of [[2560,1300,23,56],[1920,950,15,38],[1536,730,15,38]]){
  await p.setViewportSize({width:W,height:H});await wait(200);
  for(const md of ['ball','draw','edit']){await p.evaluate(m=>setMode(m),md);await wait(80);
   m=await meas();const t=W+'×'+H+' '+md+' · ';
   ok('K '+t+'글자 ≥'+font+'px',m.root>=font,m.root);
   ok('K '+t+'버튼 ≥'+btnH+'px',m.minBtn>=btnH-0.5,m.minBtn);
   ok('K '+t+'가로 넘침 없음',m.over<=0,m.over);
   ok('K '+t+'버튼·칸이 화면 밖으로 안 나감',!m.out.length,m.out);
   ok('K '+t+'오른쪽 패널 스크롤 없음',m.sideScroll<=1,m.sideScroll);
   ok('K '+t+'페이지 스크롤 없음',m.pageScroll<=1,m.pageScroll);
   ok('K '+t+'도구가 한 줄',m.rows===1,m.rows);
   /* 당구대가 칸을 꽉 채운다 — 가로든 세로든 한쪽은 97% 이상, 가로 여백은 25% 이하 */
   ok('K '+t+'당구대 꽉 참',Math.max(m.fillW,m.fillH)>=0.97&&m.fillW>=(W>=1900?0.75:0.7),[m.fillW,m.fillH]);
  }
 }
 ok('Z 에러 없음',!errs.length,errs);
 await c.close();
 }finally{await b.close();}
 let f=0;R.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
 if(f){console.log('실패 '+f+'건');process.exit(1);}
 console.log('전부 통과 ('+R.length+'건)');
})().catch(e=>{console.error(e);process.exit(1);});
