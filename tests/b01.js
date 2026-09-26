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
  /* 🔒 새로고침 때 앱이 처음 보이는 순간을 찍어 둔다 — 그때 이미 판 종류·탭·당구대가 다 그려져 있어야 한다 */
  window.__reveal=null;
  new MutationObserver(function(){var app=document.getElementById('app');if(window.__reveal||!app||app.classList.contains('hide'))return;
    window.__reveal={k:document.body.className,tabs:document.querySelectorAll('#tabs button').length,boot:!document.getElementById('boot').classList.contains('hide'),
      balls:document.querySelectorAll('#gDyn circle').length};}).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
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
    onAuthStateChange:(cb)=>{window.__authCb=cb;return {data:{subscription:{unsubscribe(){}}}};}}})};
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
  ok('A8b 첫 실행에 불러오는 중 글자가 남지 않음',!/불러오는/.test(await p.textContent('#saveSt')),await p.textContent('#saveSt'));
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
 /* 말풍선 글자가 칸을 넘는 것들(실제 글자 폭으로 잰다) */
 const fits=()=>p.evaluate(()=>[...document.querySelectorAll('#gDyn g')].map(g=>{const r=g.querySelector('rect'),t=g.querySelector('text');
   return r&&t?{t:t.textContent,over:t.getComputedTextLength()-r.width.baseVal.value}:null;}).filter(x=>x&&x.over>-2));
 ok('B0 첫 판',(await p.textContent('#bName'))==='판 1');
 /* 🔒 v2.5: 배포 캐시 때문에 새 index.html + 옛 app.js 가 돌아 '불러오는 중' 이 안 꺼지고 그 아래 앱이 떴다 */
 {const H=fs.readFileSync(FILE,'utf8'),A=fs.readFileSync(path.join(__dirname,'..','billiards','app.js'),'utf8'),PV=require(path.join(__dirname,'..','billiards','physics.js')).VERSION;
  const hv=(H.match(/data-ver="([^"]+)"/)||[])[1],v1=(H.match(/physics\.js\?v=([\d.]+)/)||[])[1],v2=(H.match(/app\.js\?v=([\d.]+)/)||[])[1],av=(A.match(/APP_VER='([^']+)'/)||[])[1];
  ok('B0v 버전 꼬리표 다섯 곳이 같다(html·physics?v·app?v·APP_VER·PH.VERSION)',hv&&[v1,v2,av,PV].every(x=>x===hv),[hv,v1,v2,av,PV]);}
 await p.evaluate(()=>document.getElementById('boot').classList.remove('hide'));
 ok('B0s 앱이 보이면 불러오는 중 화면은 CSS 만으로도 숨음',await p.evaluate(()=>getComputedStyle(document.getElementById('boot')).display==='none'));
 await p.evaluate(()=>document.getElementById('boot').classList.add('hide'));
 const rv=await p.evaluate(()=>window.__reveal);
 ok('B0c 앱이 처음 보일 때 이미 다 그려짐(판 종류·탭·공 · 불러오는 중 화면 없음)',rv&&/k-free/.test(rv.k)&&rv.tabs>=1&&!rv.boot&&rv.balls>=4,rv);
 ok('B0b 기본 모드 = 공 옮기기',/공을 잡아 끌어서/.test(await p.textContent('#hint')));

 /* ── B) 선 긋기 ── */
 await p.click('#mDraw');
 ok('B1 모드 글자',/예측선 긋는 중/.test(await p.textContent('#hint')));
 await p.mouse.move(...(await cl(3,0.15)));await wait(60);
 ok('B2 미리보기 숫자 말풍선(30)',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='30')));
 await click(3,0.15);            /* 윗쿠션 3칸 → 30 */
 await click(7.85,1.5);          /* 오른쪽 쿠션 1.5 → 15 */
 await click(4.5,3.9);           /* 아랫쿠션 4.5 → 45 */
 await click(6,2);               /* 빨간 공 */
 let s=await st();
 ok('B3 점 5개(내 공 + 4)',s.draft.predict.length===5,s.draft.predict);
 ok('B4 첫 점 = 내 공',s.draft.predict[0].ref==='cue');
 ok('B5 쿠션 위로 붙음 30→15→45',JSON.stringify(await seq())==='[30,15,45]',await seq());
 /* 🔒 v2.4 로한: 공 근처로 가면 공 가운데로 붙어 버렸다 → 공 자석 없음(두께가 늘 정면으로 강제됐다) */
 ok('B6 공 근처도 누른 자리 그대로(공 자석 없음)',!s.draft.predict[4].ref&&await p.evaluate(()=>{const q=snapPt({x:6.12,y:2.07});return q.x===6.12&&q.y===2.07&&!q.ref&&!q.rail;}));
 ok('B7 아래 쿠션 지점 글자',/30 → 15 → 45/.test(await p.textContent('#seq')));
 /* 🔒 v1.2 5 단위 눈금이 아니라 0~80 아무 수치나 */
 ok('B7b 자유 위치 — 윗쿠션 23·68, 옆쿠션 27, 아랫쿠션 7',await p.evaluate(()=>[snapPt({x:2.31,y:0.12}),snapPt({x:6.83,y:0.2}),snapPt({x:7.9,y:2.66}),snapPt({x:0.72,y:3.95})].map(railVal).join()==='23,68,27,7'),
   await p.evaluate(()=>[snapPt({x:2.31,y:0.12}),snapPt({x:6.83,y:0.2}),snapPt({x:7.9,y:2.66}),snapPt({x:0.72,y:3.95})].map(railVal)));
 ok('B7c 쿠션 점은 쿠션 위에(가운데로 안 들어감)',await p.evaluate(()=>{const q=snapPt({x:2.31,y:0.12});return q.y===0&&q.rail;}));
 ok('B7d 안쪽 점은 완전 자유',await p.evaluate(()=>{const q=snapPt({x:3.137,y:1.284});return q.x===3.14&&q.y===1.28&&!q.rail;}));
 await p.mouse.move(...(await cl(2.7,0.1)));await wait(60);
 ok('B7e 마우스 미리보기도 27',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='27')));
 /* 🔒 v1.2 눈금 간격 선택 — 1 단위 / 0.5 단위 (상단 메뉴바) */
 ok('B7f 기본 = 1 단위',await p.$eval('#stepGrp [data-st="1"]',e=>e.classList.contains('on')));
 await p.click('#stepGrp [data-st="0.5"]');await wait(60);
 ok('B7g 0.5 단위 → 23.5 · 24 · 5.5',await p.evaluate(()=>[snapPt({x:2.33,y:0.1}),snapPt({x:2.38,y:0.1}),snapPt({x:0.53,y:3.96})].map(railVal).join()==='23.5,24,5.5'),
   await p.evaluate(()=>[snapPt({x:2.33,y:0.1}),snapPt({x:2.38,y:0.1}),snapPt({x:0.53,y:3.96})].map(railVal)));
 await p.mouse.move(...(await cl(2.35,0.1)));await wait(60);
 ok('B7h 미리보기 말풍선 23.5',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='23.5')));
 ok('B7i 선택이 기억됨',await p.evaluate(()=>localStorage.getItem('bb.step'))==='0.5');
 ok('B7j 버튼 표시',await p.$eval('#stepGrp [data-st="0.5"]',e=>e.classList.contains('on')));
 await p.click('#stepGrp [data-st="1"]');await wait(60);
 ok('B7k 1 단위로 되돌림 → 23',await p.evaluate(()=>railVal(snapPt({x:2.33,y:0.1})))===23);
 ok('B7l 이미 찍은 점은 그대로',JSON.stringify(await seq())==='[30,15,45]',await seq());
 await click(6,2);
 ok('B8 같은 곳 두 번은 무시',(await st()).draft.predict.length===5);
 await p.click('#bDone');
 ok('B9 긋기 끝 → 고치기 모드',(await p.evaluate(()=>MODE))==='edit');
 ok('B10 손잡이 4개',(await p.$$('#gDyn .hd')).length===4);

 /* ── C) 고치기 ── */
 await drag(3,0,3.5,0.1);
 ok('C1 끌어서 옮기기 → 쿠션 위(35)',JSON.stringify(await seq())==='[35,15,45]',await seq());
 await click(7.97,1.5);          /* 손잡이 클릭(움직임 없음) */
 ok('C2 클릭 → 지우기 버튼',await p.isVisible('#ptPop'));
 await p.click('#ptDel');await wait(60);
 ok('C3 점 지우기',JSON.stringify(await seq())==='[35,45]'&&(await st()).draft.predict.length===4,await seq());
 /* 첫 선분(내 공 2,3 → 3.5,0) 중간 클릭 = 점 추가 */
 await click(2.75,1.5);
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

 /* ── D) 공 옮기기 (4구: 흰·노랑·빨강 ①②) ── */
 ok('D0 공 4개',(await p.evaluate(()=>liveBalls().join()))==='w,y,r,r2'&&(await p.$$('#gDyn circle[fill="#d8231b"]')).length===2);
 ok('D0b 상대 공 표시',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='상대 공')));
 await p.click('#mBall');
 await drag(2,3,1,3.5);
 s=await st();
 ok('D1 흰 공 옮김',Math.abs(s.balls.w.x-1)<0.03&&Math.abs(s.balls.w.y-3.5)<0.03,s.balls.w);
 ok('D2 선 시작이 공을 따라감',await p.evaluate(()=>{const q=resolve(ST.draft.predict[0]);return q.x===ST.balls.w.x&&q.y===ST.balls.w.y;}));
 await drag(4,2,1,3.5);              /* 빨간 공 ②를 흰 공 위로 → 겹치면 안 됨 */
 s=await st();
 ok('D3 공끼리 안 겹침',Math.hypot(s.balls.r2.x-s.balls.w.x,s.balls.r2.y-s.balls.w.y)>=2*0.117-1e-9,[s.balls.r2,s.balls.w]);
 await p.click('#cY');
 ok('D4 내 공 = 노란 공 · 상대 = 흰 공',(await st()).balls.cue==='y'&&(await p.evaluate(()=>opp()))==='w');
 await p.click('#cW');

 /* ── E) 당점 · 속도 ── */
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
 ok('E5 새 판 속도 기본 3(보통)',(await st()).draft.speed===3&&await p.$eval('#spd [data-s="3"]',e=>e.classList.contains('on')));
 await p.fill('#kmh','12.5');await p.press('#kmh','Tab');await wait(40);
 ok('E6 km/h 넣으면 단계 표시는 꺼짐',(await st()).draft.kmh===12.5&&!(await p.$eval('#spd [data-s="3"]',e=>e.classList.contains('on'))));
 await p.click('#spd [data-s="3"]');
 ok('E7 단계 누르면 km/h 비움',(await st()).draft.kmh===null&&(await st()).draft.speed===3);

 /* ── F) 실제 간 길 ── */
 await p.click('#lAct');
 ok('F1 실제 선 → 긋기 모드',(await p.evaluate(()=>MODE))==='draw'&&/실제선 긋는 중/.test(await p.textContent('#hint')));
 await click(4,0.1);await click(8,2);
 ok('F2 실제 선 40→20',JSON.stringify(await seq())==='[40,20]',await seq());
 ok('F3 아래 글자에 실제도',/실제:.*40 → 20/.test(await p.textContent('#seq')));
 await p.click('#bDone');
 await p.click('#lPre');

 /* ── G) 자동 저장 ── */
 await wait(1000);
 let T=await p.evaluate(()=>window.__T);
 ok('G1 자동 저장(선·빨강 ②)',T.bb_boards[0].draft.predict.length===4&&T.bb_boards[0].draft.actual.length===3&&!!T.bb_boards[0].balls.r2,T.bb_boards[0].draft);
 ok('G2 저장됨 표시',/저장됨/.test(await p.textContent('#saveSt')),await p.textContent('#saveSt'));

 /* ── S) 시뮬레이션 · 4구 판정 ──
    🔒 판정이 물리와 맞는지: 수구가 실제로 지나가는 자리에 빨강 ②를 놓으면 득점, 상대 공을 놓으면 파울, 비켜 놓으면 실패 */
 const setUp=()=>p.evaluate(()=>{pushUndo();ST.balls={w:{x:1,y:2},y:{x:1,y:0.6},r:{x:3,y:2.1},r2:{x:7,y:3.8},cue:'w'};
   ST.draft.predict=[{ref:'cue'},{x:3,y:2}];ST.draft.tip={x:0,y:0};ST.draft.speed=3;ST.draft.kmh=null;renderAll();});
 await setUp();
 ok('S1 조준 → 첫 공·두께 표시',/첫 공: 빨간 공 ① · 두께 4\.5\/8 \(왼쪽\)/.test(await p.textContent('#aimTxt')),await p.textContent('#aimTxt'));
 const probe=await p.evaluate(()=>{const sv=computeSim(),E=sv.res.events,h=E.find(e=>e.type==='ball'&&(e.a==='w'||e.b==='w'));
   const f=sv.res.frames.find(f=>f.t>h.t+0.35);return {first:h&&(h.a==='w'?h.b:h.a),pt:[f.p.w[0]/DM,f.p.w[1]/DM],res:sv.info.result};});
 ok('S2 첫 충돌 = 빨강 ①',probe.first==='r',probe);
 ok('S3 빨강 ②가 멀면 실패',probe.res==='miss',probe);
 const judge=(mv)=>p.evaluate(([mv,pt])=>{const b=JSON.parse(JSON.stringify(ST.balls));
   if(mv==='hit')ST.balls.r2={x:pt[0],y:pt[1]};
   if(mv==='foul'){ST.balls.y={x:pt[0],y:pt[1]};}
   /* miss: 빨강 ②는 멀리(7, 3.8) 그대로 — 가까이 비켜 두면 쿠션 돌아 나온 수구가 결국 맞힌다(첫 판 실측) */
   const i=computeSim().info;ST.balls=b;return i;},[mv,probe.pt]);
 let J=await judge('hit');
 ok('S4 수구 길목에 빨강 ② → ⭕ 득점',J.result==='hit'&&/⭕ 득점 — 빨간 공 ①.*빨간 공 ②/.test(J.text),J);
 J=await judge('foul');
 ok('S5 길목에 상대 공 → ⚠ 파울',J.result==='foul'&&/상대 공\(노란 공\)/.test(J.text),J);
 J=await judge('miss');
 ok('S6 빨강 ②가 길목 밖 → ❌ 실패 + 몇 cm 차이',J.result==='miss'&&J.missCm>0&&/빨간 공 ①만 맞힘 · 빨간 공 ②와 [\d.]+(cm|mm)( \(거의 맞음\))? 차이/.test(J.text),J);
 /* 🔒 v2.1: 0.3mm 로 스친 공이 "0cm 차이 ❌" 로 떴다 — 1cm 미만은 mm */
 ok('S6b 빗나간 거리 글자',await p.evaluate(()=>[missTxt(0.03),missTxt(0.33),missTxt(4.26)].join('|'))==='1mm 미만 (거의 맞음)|3mm (거의 맞음)|4.3cm',
   await p.evaluate(()=>[missTxt(0.03),missTxt(0.33),missTxt(4.26)]));
 await p.evaluate(pt=>{ST.balls.r2={x:pt[0],y:pt[1]};renderAll();},probe.pt);
 const before=await st();
 await p.click('#bSim');await wait(150);
 ok('S7 ▶ → 굴러가는 중',await p.evaluate(()=>SIMV&&SIMV.playing)&&/굴러가는 중/.test(await p.textContent('#hint'))&&/끝으로/.test(await p.textContent('#bSim')));
 await p.click('#bSim');await wait(150);
 ok('S8 한 번 더 → 끝으로 · 결과 글자',await p.evaluate(()=>SIMV&&!SIMV.playing)&&/⭕ 득점/.test(await p.textContent('#hint'))&&await p.$eval('#hint',e=>e.classList.contains('ok')),await p.textContent('#hint'));
 ok('S9 지나간 자리가 그려진다',(await p.$$('#gDyn polyline')).length>=2);
 ok('S10 시뮬레이션은 공 자리를 안 바꾼다',JSON.stringify((await st()).balls)===JSON.stringify(before.balls));
 await p.click('#spd [data-s="4"]');await wait(60);
 ok('S11 조건을 바꾸면 결과가 지워진다',await p.evaluate(()=>SIMV===null)&&!/득점/.test(await p.textContent('#hint')));
 await p.click('#spd [data-s="3"]');
 await p.keyboard.press('Enter');await wait(100);
 ok('S12 Enter = ▶',await p.evaluate(()=>SIMV!==null));
 await p.evaluate(()=>{clearSim();renderAll();});await p.focus('#tipMid');await p.keyboard.press('Enter');await wait(80);
 ok('S12b 버튼에 초점 + Enter = 그 버튼만(▶ 안 돎)',await p.evaluate(()=>SIMV===null&&ST.draft.tip&&ST.draft.tip.x===0&&ST.draft.tip.y===0));
 await p.evaluate(()=>document.activeElement.blur());
 await p.click('#bSim');await wait(80);
 await p.click('#bSlow');
 ok('S13 🐢 천천히 켜고 기억',await p.evaluate(()=>SLOW&&localStorage.getItem('bb.slow')==='1'));
 await p.click('#bSlow');

 /* ── H) 기록하기 — 시뮬레이션 결과 + 실제로 쳐 본 결과 ── */
 await p.click('#bRec');await wait(150);
 ok('H0 실제 결과를 묻는다',/실제로 쳐 보셨나요/.test(await p.textContent('#mask'))&&/⭕ 득점/.test(await p.textContent('#mask')));
 await p.fill('#mIn','조금 두껍게');await p.click('.modal .btns .hitb');await wait(300);
 T=await p.evaluate(()=>window.__T);
 const a=T.bb_attempts[0];
 ok('H1 시도 1건',T.bb_attempts.length===1);
 ok('H2 종류·조준 저장',a&&a.kind==='free'&&a.predict.length===2);
 ok('H3 당점·속도·실제 결과·메모',a&&a.tip&&a.speed===3&&a.result==='hit'&&a.memo==='조금 두껍게',a);
 ok('H4 시뮬레이션 판정·경로 저장',a&&a.sim&&a.sim.result==='hit'&&a.sim.paths&&a.sim.paths.w.length>5&&a.sim.V===1.6,a&&a.sim&&{r:a.sim.result,V:a.sim.V});
 ok('H5 빨강 ② 자리 저장',a&&a.balls.r2&&Math.abs(a.balls.r2.x-probe.pt[0])<0.02);
 ok('H7 알림',/기록했습니다.*1번째/.test(await p.textContent('#toast')),await p.textContent('#toast'));
 ok('H8 이벤트 로그',T.bb_events.some(e=>e.kind==='attempt.save'&&e.payload.sim==='hit'));
 await p.click('#bRec');await wait(150);await p.click('.modal .btns button:has-text("실패")');await wait(300);
 /* 조준 없이 → 안내 */
 await p.evaluate(()=>{pushUndo();ST.draft.predict=[];renderAll();});
 await p.click('#bRec');await wait(100);
 ok('H9 조준 없이 기록 → 안내',/먼저 조준선을 그어 주세요/.test(await p.textContent('#mask')));
 await p.click('.modal .btns button');
 await p.click('#bUndo');

 /* ── I) 판 CRUD ── */
 await p.click('#bNew');
 ok('I0b 자유 판에서 연 새 판 창에 종류 4개가 보임',(await p.$$eval('.kindpick button',es=>es.filter(e=>e.getBoundingClientRect().width>0).length))===4);
 ok('I0 새 판 = 종류 고르기(기본 자유 연습)',/자유 연습/.test(await p.textContent('#mask'))&&/분리각 훈련/.test(await p.textContent('#mask'))&&await p.$eval('[data-kind="free"]',e=>e.classList.contains('on')));
 await p.fill('#mIn','옆돌리기');await p.click('.modal .btns .primary');await wait(200);
 ok('I1 새 판 탭',(await p.textContent('#tabs')).includes('🎱 옆돌리기')&&(await p.textContent('#bName'))==='옆돌리기');
 ok('I2 새 판은 빈 선',(await st()).draft.predict.length===0);
 await p.click('#bRename');await p.fill('#mIn','옆돌리기 연습');await p.press('#mIn','Enter');await wait(150);
 ok('I3 이름 바꾸기',(await p.textContent('#bName'))==='옆돌리기 연습'&&(await p.evaluate(()=>window.__T.bb_boards.some(b=>b.name==='옆돌리기 연습'))));
 await p.click('#tabs button:has-text("판 1")');await wait(100);
 ok('I4 탭 전환 → 판 1 선 그대로',(await st()).draft.predict.length===2);
 await p.click('#bCopy');await wait(200);
 ok('I5 복제',(await p.textContent('#bName'))==='판 1 (복사)'&&(await st()).draft.predict.length===2);
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
 /* 🔒 v2.4 로한: "판을 최대한 여러 개 띄우자" — 6개 고정 → 들어가는 만큼. 눈금 간격은 오른쪽으로 */
 const tabFit=()=>p.evaluate(()=>{const t=document.getElementById('tabs');return {shown:t.querySelectorAll('button').length,over:t.scrollWidth-t.clientWidth,
   more:document.getElementById('bMore').textContent,cur:!!t.querySelector('button.on')};});
 let tf=await tabFit();
 ok('I10 32인치: 긴 이름 판 8개 중 6개 넘게 탭에(전엔 6개 고정) · 넘침 없음',tf.shown>6&&tf.over<=1&&(tf.shown===8||new RegExp('외 '+(8-tf.shown)+'개').test(tf.more)),tf);
 ok('I10b 눈금 간격은 오른쪽(기록 버튼 옆)',await p.evaluate(()=>{const s=document.getElementById('stepGrp').getBoundingClientRect(),l=document.getElementById('bLog').getBoundingClientRect(),n=document.getElementById('bNew').getBoundingClientRect();return s.left>n.right&&l.left-s.right<40;}));
 await p.setViewportSize({width:1536,height:730});await wait(250);
 tf=await tabFit();
 ok('I10c 좁은 창: 넘치는 판만 목록으로(외 N개) · 탭 넘침 없음',tf.shown<8&&tf.over<=1&&new RegExp('외 '+(8-tf.shown)+'개').test(tf.more)&&tf.cur,tf);
 await p.evaluate(()=>switchBoard(BOARDS[BOARDS.length-1].id));await wait(100);
 tf=await tabFit();
 ok('I11 좁은 창에서도 지금 판(맨 끝)은 탭에 보임',tf.cur&&(await p.$eval('#tabs button.on',e=>e.textContent)).endsWith(await p.textContent('#bName'))&&tf.over<=1,tf);
 await p.setViewportSize({width:2560,height:1440});await wait(250);
 await p.click('#bMore');ok('I12 판 목록 8개',(await p.$$('.modal .litem')).length===8);
 await p.click('.modal .litem:first-child [data-go]');await wait(100);
 ok('I13 목록에서 열기',(await p.textContent('#bName'))==='판 1');

 /* ── T) 📐 분리각 훈련 ── */
 await p.click('#bNew');await p.click('[data-kind="sep"]');
 ok('T0 종류 고르면 이름도 분리각',/^분리각 \d+$/.test(await p.inputValue('#mIn')),await p.inputValue('#mIn'));
 await p.click('.modal .btns .primary');await wait(250);
 ok('T1 분리각 판 · 탭 아이콘',(await p.$eval('#tabs button.on',e=>e.textContent)).startsWith('📐')&&await p.evaluate(()=>kind()==='sep'&&document.body.classList.contains('k-sep')));
 ok('T2 도구: ① 1적구 ② 수구 · 선긋기 숨김',await p.isVisible('#mObj')&&await p.isVisible('#mCue')&&!(await p.isVisible('#mDraw'))&&!(await p.isVisible('#lPre')));
 ok('T3 공은 수구·1적구 둘만',(await p.evaluate(()=>liveBalls().join()))==='w,r');
 ok('T4 두께 8칸+좌우 · 기본 4/8 · 왼쪽',(await p.$$('#thk [data-t]')).length===8&&await p.$eval('#thk [data-t="4"]',e=>e.classList.contains('on'))&&await p.$eval('#thk [data-lr="L"]',e=>e.classList.contains('on')));
 ok('T5 조준 글자 4/8 (반)',/빨간 공 ① · 두께 4\/8 \(반\) \(왼쪽\)/.test(await p.textContent('#aimTxt')),await p.textContent('#aimTxt'));
 ok('T6 바로 ① 1적구 방향 모드',(await p.evaluate(()=>MODE))==='pobj'&&/① 1적구/.test(await p.textContent('#hint')));
 /* 정답 방향 근처(1적구: 조준에서 30°, 수구: 반대쪽 약 33°)를 조금 틀리게 찍는다 */
 const geo=await p.evaluate(()=>{const ai=aimInfo(),a=Math.atan2(ai.dir.y,ai.dir.x),o=ST.balls.r,g=ai.contact.ghost;
   const s1=Math.atan2(o.y-g.y,o.x-g.x)-a>0?1:-1;
   const po=a+s1*33*Math.PI/180,pc=a-s1*40*Math.PI/180;
   return {o:[o.x+Math.cos(po),o.y+Math.sin(po)],c:[g.x+Math.cos(pc)*0.9,g.y+Math.sin(pc)*0.9]};});
 await click(geo.o[0],geo.o[1]);
 ok('T7 ① 찍으면 ② 로 넘어감',(await p.evaluate(()=>MODE))==='pcue'&&!!(await st()).draft.predObj);
 await click(geo.c[0],geo.c[1]);
 ok('T8 ② 수구 방향 저장',!!(await st()).draft.predCue);
 ok('T9 버튼 = 정답 보기',/정답 보기/.test(await p.textContent('#bSim')));
 await p.click('#bSim');await wait(100);await p.click('#bSim');await wait(150);
 const hs=await p.textContent('#hint');
 ok('T10 1적구 30° (반 두께)',/1적구 (29|30|31)°/.test(hs),hs);
 ok('T11 예측과 차이(°)',/1적구 \d+° \(예측 3[2-4]°, [1-5]° 차이\)/.test(hs)&&/수구 \d+° \(예측 \d+°, \d+° 차이\)/.test(hs)&&/분리각 \d+°/.test(hs),hs);
 ok('T12b 말풍선 글자가 칸 안(두께·1적구·수구)',!(await fits()).length,await fits());
 ok('T12 판 위에 각도 숫자',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>/^1적구 \d+°$/.test(t.textContent))));
 await p.click('#bRec');await wait(300);
 T=await p.evaluate(()=>window.__T);
 const sa=T.bb_attempts[T.bb_attempts.length-1];
 ok('T13 기록 → 종류 sep · 오차 저장(묻지 않음)',sa.kind==='sep'&&sa.sim&&sa.sim.eObj!=null&&sa.sim.eCue!=null&&sa.sim.thick===4&&sa.result===null,sa.sim&&{e:sa.sim.eObj,c:sa.sim.eCue});
 await p.click('#bNextT');
 s=await st();
 ok('T14 다음 두께 → 5/8 · 예측 비움 · ① 부터',s.draft.thick===5&&!s.draft.predObj&&!s.draft.predCue&&(await p.evaluate(()=>MODE))==='pobj');
 await p.click('#thk [data-lr="R"]');await p.click('#thk [data-t="2"]');
 ok('T15 오른쪽 · 2/8',/두께 2\/8 \(오른쪽\)/.test(await p.textContent('#aimTxt')),await p.textContent('#aimTxt'));

 /* ── J) 기록 화면 ── */
 await p.click('#bLog');await wait(300);
 const body=await p.textContent('#logBody');
 ok('J1 자유 연습 시도 2번',/🎱 자유 연습[\s\S]*시도\s*2번/.test(body),body.slice(0,200));
 ok('J2 실제 득점률 50% · 시뮬레이션 득점률',/실제 득점률[^%]*50%/.test(body)&&/시뮬레이션 득점률/.test(body),body.slice(0,300));
 ok('J2b 분리각 문제 1번 · 평균 오차',/📐 분리각 훈련[\s\S]*문제\s*1번/.test(body)&&/1적구 평균 오차[^°]*\d+(\.\d)?°/.test(body));
 ok('J3 표 3줄',(await p.$$('#logBody tr.click')).length===3);
 ok('J4 조건 글자(첫 공·두께)',/빨간 공 ① 4\.5\/8/.test(body)&&/두께 4\/8 왼쪽/.test(body));
 await p.click('#logBody tr.click >> nth=2');await wait(100);
 ok('J5 지난 시도 그림(시뮬레이션 길 포함)',(await p.$$('.modal svg.mini polyline')).length>=4);
 await p.click('.modal .btns .primary');await wait(200);   /* 이 조건으로 다시 */
 ok('J6 다시 해보기 → 당구대로',await p.isVisible('#workv')&&(await p.textContent('#bName'))==='판 1'&&(await st()).draft.predict.length===2&&(await st()).draft.speed===3);
 await p.click('#bLog');await wait(200);
 await p.click('#vEvt');await wait(200);
 const ev=await p.textContent('#logBody');
 ok('J7 변경 이력',/새 판 ‘옆돌리기’/.test(ev)&&/이름을 ‘옆돌리기’ → ‘옆돌리기 연습’/.test(ev)&&/휴지통에서 살렸습니다/.test(ev)&&/분리각 문제를 기록/.test(ev),ev.slice(0,300));
 await p.click('#bBack');

 /* ── U) 🔁 원쿠션 · 투쿠션 훈련 (v3) — ① 지점 찾기 · ② 답 보기 ──
    아버지: "적구를 아무 곳에 두고, 1적구를 맞히고 어디를 맞아야 2적구로 가는지" · "두께도 말해 주면 좋겠다" */
 await p.click('#bNew');
 ok('U-1 새 판 카드 4장(자유·분리각·원쿠션·투쿠션) · 어느 판에서 열어도 보임',(await p.$$eval('.kindpick button',es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.dataset.kind).join()))==='free,sep,cush1,cush2');
 await p.click('[data-kind="cush1"]');
 ok('U0 이름도 원쿠션',/^원쿠션 \d+$/.test(await p.inputValue('#mIn')),await p.inputValue('#mIn'));
 await p.click('.modal .btns .primary');await wait(250);
 ok('U1 원쿠션 판: 탭 🔁 · 1적구 뒤 쿠션이 기본 · 지점 찍기 모드',(await p.$eval('#tabs button.on',e=>e.textContent)).startsWith('🔁 ')&&(await p.evaluate(()=>[kind(),ST.draft.ctype,ST.draft.ncush,MODE].join()))==='cush,after,1,cpt');
 ok('U2 쿠션 수 전환 버튼 없음(판이 정한다) · 기록하기 숨김(자동) · 💡 답 보기 · 🎯 없음',!(await p.$('#ncush'))&&!(await p.isVisible('#bRec'))&&await p.isVisible('#bAnswer')&&!(await p.isVisible('#bScan'))&&/쳐 보기/.test(await p.textContent('#bSim')));
 ok('U3 1적구 뒤 = 공 셋 · 두께칸 보임',(await p.evaluate(()=>liveBalls().join()))==='w,r,r2'&&await p.isVisible('#thkBox'));
 /* 🔒 거울 원리(무회전 계산) — 대칭 배치면 한가운데, 투쿠션은 입사각 = 반사각 */
 ok('U4 거울: (2,2)→윗쿠션→(6,2) = 40',await p.evaluate(()=>{const sp=sysPath({x:2,y:2},{x:6,y:2},['T']);return sp&&Math.abs(sp[1].x-4)<1e-9&&cval(sp[1],'T')===40;}));
 const refl=await p.evaluate(()=>{const sp=sysPath({x:1.5,y:2.5},{x:5,y:3},['T','R']);if(!sp)return null;const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
   const i1=ang(sp[0],sp[1]),o1=ang(sp[1],sp[2]),i2=ang(sp[1],sp[2]),o2=ang(sp[2],sp[3]);
   return {top:Math.abs(Math.cos(i1)-Math.cos(o1))<1e-9&&Math.abs(Math.sin(i1)+Math.sin(o1))<1e-9,right:Math.abs(Math.sin(i2)-Math.sin(o2))<1e-9&&Math.abs(Math.cos(i2)+Math.cos(o2))<1e-9};});
 ok('U5 투쿠션 거울: 입사각 = 반사각',refl&&refl.top&&refl.right,refl);
 /* 🎲 새 문제 — 훈련이 되는 문제만(맞는 두께 두 칸 이상 · 너무 얇지 않게) */
 await p.click('#bNewQ');await wait(300);
 const sol=await p.evaluate(()=>{const s=solveCush(false);return {n:s.ranges.length,w:s.ranges[0]&&s.ranges[0].items.length,u:s.best&&s.best.u,miss:s.items.filter(x=>x.res==='miss'&&x.act&&x.act.length).map(x=>({side:x.side,t:x.t16})),direct:s.items.filter(x=>x.res==='miss'&&x.act&&!x.act.length).map(x=>({side:x.side,t:x.t16})),best:s.best&&{side:s.best.side,t:s.best.t16,act:s.best.act,actR:s.best.actR}};});
 ok('U6 새 문제는 답이 있다(두 칸 이상 · 1.5/8 보다 두껍게)',sol.n>=1&&sol.w>=2&&Math.abs(sol.u)<=0.82,sol);
 ok('U7 안내: 지점을 찍고 두께를 골라 쳐 보기',/쿠션 지점을 찍고\(1개\) 📏 두께를 골라 \[▶ 쳐 보기\]/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 /* ① 틀린 두께로 한 번 */
 await p.evaluate(m=>{ST.draft.side=m.side;ST.draft.thick=m.t/2;ST.draft.cpts=[{x:4,y:0,rail:true}];renderAll();},sol.miss[0]);
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 let uh=await p.textContent('#hint');
 ok('U8 쳐 보기: 1번째 · 수구가 닿은 곳 · 찍은 곳과 차이 · 빗나간 거리',/❌ 1번째 — 수구: (위|아래|왼쪽|오른쪽) [\d.]+/.test(uh)&&/(찍은 곳 [\d.]+|다른 쿠션)/.test(uh)&&(/(와|과) [\d.]+(cm|mm)/.test(uh)||/쿠션이 아님/.test(uh)),uh);
 /* 쿠션 없이 바로 2적구에 맞는 두께가 있으면 — "쿠션 0번 · 다른 쿠션" 처럼 헷갈리게 쓰지 않는다 */
 if(sol.direct.length){
   const dt=await p.evaluate(m=>{const d=ST.draft,sv={side:d.side,thick:d.thick,tries:JSON.stringify(d.tries)};d.side=m.side;d.thick=m.t/2;
     const r=computeSim(),I=r.info;d.side=sv.side;d.thick=sv.thick;return {ncus:I.ncus,act:I.act.length,miss:I.missCm};},sol.direct[0]);
   ok('U8b 쿠션 없이 바로 맞는 경우 판정',dt.ncus===0&&dt.act===0,dt);
 }
 ok('U9 💡 힌트: 방향만(두께 · 가야 할 곳) — 답은 안 줌',/💡 .*(두께를 더 (두껍게|얇게)|공 (왼쪽|오른쪽)을 맞혀 보세요)/.test(uh)&&!/약 [\d.]+\/8/.test(uh)&&!/정답/.test(uh),uh);
 /* 🔒 쳐 보기에서 무회전 계산선을 그리면 답이 새어 나간다("계산 8") */
 ok('U9b 쳐 보기엔 계산선·계산 숫자가 없다',await p.evaluate(()=>![...document.querySelectorAll('#gDyn text')].some(t=>/^계산 /.test(t.textContent))));
 ok('U10 판 위에 시도 번호 ①',await p.evaluate(()=>[...document.querySelectorAll('#gDyn text')].some(t=>t.textContent==='1')&&ST.draft.tries.length===1));
 /* 힌트 수준: 방향+크기 · 없음 */
 await p.click('#bSet');await wait(100);await p.click('[data-hint="size"]');await p.click('.modal .btns .primary');
 await p.evaluate(m=>{ST.draft.side=m.side;ST.draft.thick=m.t/2;renderAll();},sol.miss[sol.miss.length>1?1:0]);
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 uh=await p.textContent('#hint');
 ok('U11 힌트 "방향 + 대략 크기" · 2번째',/❌ 2번째/.test(uh)&&(/약 [\d.]+\/8/.test(uh)||/공 (왼쪽|오른쪽)을 맞혀/.test(uh)),uh);
 await p.click('#bSet');await wait(100);await p.click('[data-hint="none"]');await p.click('.modal .btns .primary');
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 ok('U12 힌트 없음 · 3번째',/❌ 3번째/.test(await p.textContent('#hint'))&&!/💡/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 await p.click('#bSet');await wait(100);await p.click('[data-hint="dir"]');await p.click('.modal .btns .primary');
 ok('U13 힌트 선택이 기억됨',await p.evaluate(()=>localStorage.getItem('bb.hint'))==='dir');
 /* ① 맞는 두께로 → 스스로 맞힘 → 자동 기록 */
 const nAtt=await p.evaluate(()=>window.__T.bb_attempts.length);
 await p.evaluate(b=>{ST.draft.side=b.side;ST.draft.thick=b.t/2;ST.draft.cpts=[railPt(b.actR[0],b.act[0])];renderAll();},sol.best);
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(300);
 uh=await p.textContent('#hint');
 ok('U14 ⭕ 4번째 만에 득점! — 두께 → 쿠션 → 빨강 ②',/⭕ 4번째 만에 득점! — 공 (왼쪽|오른쪽) [\d.]+\/8 → (위|아래|왼쪽|오른쪽) [\d.]+ → 빨간 공 ②/.test(uh)&&await p.$eval('#hint',e=>e.classList.contains('ok')),uh);
 let TT=await p.evaluate(()=>window.__T.bb_attempts);
 const ua=TT[TT.length-1];
 ok('U15 자동 기록: 스스로 · 4번 · 시도 내역',TT.length===nAtt+1&&ua.kind==='cush'&&ua.sim.solvedBy==='self'&&ua.sim.triesN===4&&ua.sim.tries.length===4&&ua.sim.n===1,ua.sim&&{by:ua.sim.solvedBy,n:ua.sim.triesN});
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 ok('U16 맞힌 뒤 또 쳐도 두 번 기록 안 함',(await p.evaluate(()=>window.__T.bb_attempts.length))===nAtt+1);
 /* ② 답 보기 */
 await p.click('#bNewQ');await wait(300);
 ok('U17 새 문제 → 시도 처음부터',(await st()).draft.tries.length===0);
 await p.click('#bAnswer');await wait(80);await p.click('#bSim');await wait(80);
 await p.evaluate(()=>{if(SIMV)SIMV.t=SIMV.T;});await wait(200);
 uh=await p.textContent('#hint');
 ok('U18 💡 정답: 두께 구간 → 수구가 닿는 쿠션 → 빨강 ② · 무회전 계산',/💡 정답: (공 (왼쪽|오른쪽) [\d.]+\/8( ~ [\d.]+\/8)?|정면).* → 수구 (위|아래|왼쪽|오른쪽) [\d.]+ → 빨간 공 ②/.test(uh)&&/무회전 계산 (위|아래|왼쪽|오른쪽) [\d.]+/.test(uh),uh);
 ok('U19 [이 두께로 바꾸기] 버튼',await p.isVisible('#bApply'));
 /* 🔒 답 보기 판 그림 = 글자와 같은 정답 기준(아버지 두께·쿠션으로 그리면 어긋났다) */
 const ansDraw=await p.evaluate(()=>{const ts=[...document.querySelectorAll('#gDyn text')].map(t=>t.textContent);const m=(document.getElementById('hint').textContent.match(/무회전 계산 [^ ]+ ([\d.]+)/)||[])[1];
   return {ghost:ts.some(t=>/^정답 두께 /.test(t)),calc:ts.filter(t=>/^계산 /.test(t)),m};});
 ok('U19b 답 보기 그림: 정답 두께 · 계산 숫자가 글자와 같다',ansDraw.ghost&&ansDraw.calc.length>=1&&ansDraw.calc[0]==='계산 '+ansDraw.m,ansDraw);
 TT=await p.evaluate(()=>window.__T.bb_attempts);
 ok('U20 답을 보면 기록(답 봄 · 0번 시도)',TT[TT.length-1].sim.solvedBy==='answer'&&TT[TT.length-1].sim.triesN===0);
 /* 🔒 답이 정직한가 — 정답 두께로 바꿔 치면 득점 */
 await p.click('#bApply');await wait(80);
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(300);
 ok('U21 정답 두께로 쳐 보면 ⭕ 득점',/⭕ 1번째 만에 득점/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 ok('U22 답 본 문제는 두 번 기록 안 함',(await p.evaluate(()=>window.__T.bb_attempts.length))===TT.length);
 ok('U22b 말풍선 글자가 칸 안',!(await fits()).length,await fits());
 /* 모든 해답이 정직한가 — 초록(맞음) 두께는 전부 득점 */
 const hon=await p.evaluate(()=>{const s=solveCush(false),c=ST.balls[ST.balls.cue];let bad=0,n=0;
   s.items.filter(x=>x.res==='hit').forEach(x=>{n++;const ai={dir:x.dir,contact:rayHit(c,x.dir)};if(judgeCush(simWith(ai,speedMs()),ai).result!=='hit')bad++;});return {n,bad};});
 ok('U23 조기 종료로 푼 정답도 끝까지 굴리면 전부 득점',hon.n>0&&hon.bad===0,hon);
 /* 공을 옮기면 시도 처음부터 */
 await p.click('#mBall');const wb=await p.evaluate(()=>ST.balls[ST.balls.cue]);await drag(wb.x,wb.y,wb.x+0.3,wb.y);
 ok('U24 공을 옮기면 시도 처음부터',(await st()).draft.tries.length===0);
 /* 쿠션 먼저 */
 await p.click('#ctype [data-ct="first"]');await wait(60);
 ok('U25 쿠션 먼저: 공 둘 · 두께칸 숨김',(await p.evaluate(()=>liveBalls().join()))==='w,r'&&!(await p.isVisible('#thkBox')));
 await p.evaluate(()=>{pushUndo();ST.balls.w={x:1.5,y:2.6};ST.balls.r={x:6,y:2.4};resetTries();ST.draft.cpts=[{x:3.5,y:0,rail:true}];renderAll();});
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 uh=await p.textContent('#hint');
 ok('U26 쿠션 먼저 쳐 보기: 1번째 · 💡 지점을 더 큰/작은 수로',/1번째/.test(uh)&&(/⭕/.test(uh)||/💡 지점을 더 (큰|작은) 수로/.test(uh)||/이 쿠션으론 안 됩니다/.test(uh)),uh);
 await p.click('#bAnswer');await wait(80);await p.evaluate(()=>{if(SIMV)SIMV.t=SIMV.T;});await wait(200);
 uh=await p.textContent('#hint');
 ok('U27 쿠션 먼저 정답: 위 구간 · 무회전 계산 38.5',/💡 정답: 위 [\d.]+( ~ [\d.]+)?/.test(uh)&&/무회전 계산 위 38\.5/.test(uh),uh);
 await p.click('#bApply');await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 ok('U28 정답 지점으로 → 맞음',/⭕ \d+번째 만에 맞힘/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 /* 🔁² 투쿠션 판 */
 await p.click('#bNew');await p.click('[data-kind="cush2"]');
 ok('U29 이름 투쿠션',/^투쿠션 \d+$/.test(await p.inputValue('#mIn')));
 await p.click('.modal .btns .primary');await wait(250);
 ok('U30 투쿠션 판: 탭 🔁² · 쿠션 2',(await p.$eval('#tabs button.on',e=>e.textContent)).startsWith('🔁² ')&&(await p.evaluate(()=>ST.draft.ncush))===2);
 await p.click('#bNewQ');await wait(600);
 await p.click('#bAnswer');await wait(80);await p.evaluate(()=>{if(SIMV)SIMV.t=SIMV.T;});await wait(200);
 uh=await p.textContent('#hint');
 ok('U31 투쿠션 정답: 수구가 두 쿠션을 거쳐 빨강 ②',/→ 수구 (위|아래|왼쪽|오른쪽) [\d.]+ → (위|아래|왼쪽|오른쪽) [\d.]+ → 빨간 공 ②/.test(uh),uh);
 await p.click('#bApply');await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(300);
 ok('U32 투쿠션 정답 두께로 → ⭕',/⭕ 1번째 만에 득점/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 /* 10문제(🔁): "몇 번 만에" */
 await p.click('#bSet10');await wait(400);
 for(let i=1;i<=10;i++){
   await p.evaluate(()=>{const s=solveCush(false);ST.draft.side=s.best.side;ST.draft.thick=s.best.t16/2;renderAll();});
   await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
   await p.click('#bNextQ');await wait(i<10?450:500);
 }
 let mkU=await p.textContent('#mask');
 ok('U33 10문제 결과: 스스로 맞히기까지 평균 1번',/스스로 맞히기까지 평균 시도: 1번/.test(mkU),mkU.slice(0,200));
 await p.click('.modal .btns button');
 /* ⚙ 테이블 감각 */
 await p.click('#bSet');await wait(150);
 ok('U34 설정: 테이블 감각 · 지금 3단 = 2쿠션 ✓ · 힌트 3가지',/테이블 감각/.test(await p.textContent('#mask'))&&/3단\)로 짧은 방향 → 2쿠션 ✓/.test(await p.textContent('#feelNow'))&&(await p.$$('[data-hint]')).length===3,await p.textContent('#feelNow'));
 await p.click('[data-f="cloth:fast"]');await wait(80);
 ok('U35 천 빠름 → 더 굴러감 · 기억',/→ [3-9]쿠션/.test(await p.textContent('#feelNow'))&&(await p.evaluate(()=>feelParams().muR))===0.0075);
 await p.click('[data-f="cloth:mid"]');await wait(50);await p.click('.modal .btns .primary');
 /* 기록 화면 */
 await p.click('#bLog');await wait(200);await p.click('#vAtt');await wait(250);
 const ub=await p.textContent('#logBody');
 ok('U36 기록 화면: N번 만에 · 답 봄',/⭕ 4번 만에/.test(ub)&&/답 봄 \(0번 시도\)/.test(ub),ub.slice(0,300));
 await p.click('#bBack');

 /* ── R) 🔍 모든 길 찾기 (v3.1) ── */
 const waitRoutes=async()=>{for(let i=0;i<200;i++){if(await p.evaluate(()=>!!(SIMV&&SIMV.routes&&SIMV.info&&!/찾는 중/.test(SIMV.info.text))))return true;await wait(50);}return false;};
 await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='cush'&&x.draft.ncush===1);switchBoard(b.id);ST.draft.ctype='after';renderAll();});
 await p.click('#bNewQ');await wait(300);
 ok('R0 🔍 모든 길 버튼 · 속도 비교는 도구줄',await p.isVisible('#bRoutes')&&await p.evaluate(()=>!!document.querySelector('.stage .tools #bCmp')));
 const nA=await p.evaluate(()=>window.__T.bb_attempts.length);
 await p.click('#bRoutes');
 ok('R1 길 찾기 끝',await waitRoutes());
 let rh=await p.textContent('#hint');
 const rl=await p.evaluate(()=>SIMV.routes.list.map(r=>({w:r.w,key:r.key})));
 ok('R2 득점하는 길 N가지 · 안내 줄은 요약만',/🔍 득점하는 길 \d+가지 \(속도 3 · 정중앙/.test(rh)&&rl.length>=1&&!(await p.$('#hint .rchip')),rh);
 ok('R3 길 전용 줄: 번호 버튼 = 길 수 · 설명 · [이 길로 해 보기]',await p.isVisible('#routeBar')&&(await p.$$('#routeBar .rchip')).length===rl.length&&/① .* → 빨간 공 ② · (쉬움|보통|어려움)/.test(await p.textContent('#routeBar .rdesc'))&&await p.isVisible('#bUseRoute'),await p.textContent('#routeBar'));
 ok('R4 쉬운 길(폭 넓은 길)부터',rl.every((r,i)=>i===0||r.w<=rl[i-1].w),rl);
 /* 🔒 길이 정직한가 — 각 길의 가운데·양 끝 조준을 끝까지 굴리면 득점 */
 const rhon=await p.evaluate(()=>{const c=ST.balls[ST.balls.cue];let n=0,bad=0;SIMV.routes.list.forEach(r=>[r.items[0],r.center,r.items[r.items.length-1]].forEach(x=>{n++;
   const ai={dir:x.dir,contact:rayHit(c,x.dir)};const I=judgeCush(simWith(ai,speedMs()),ai);if(I.result!=='hit'||I.actR.join('>')!==r.key)bad++;}));return {n,bad};});
 ok('R5 길마다 가운데·양 끝을 끝까지 굴려도 득점 · 같은 쿠션 순서',rhon.n>0&&rhon.bad===0,rhon);
 ok('R6 길을 보면 답 본 것으로 한 번 기록',(await p.evaluate(()=>window.__T.bb_attempts.length))===nA+1&&(await p.evaluate(()=>window.__T.bb_attempts[window.__T.bb_attempts.length-1].sim.solvedBy))==='answer');
 ok('R7 선택한 길: 노란 선 · 정답 두께 표시',await p.evaluate(()=>[...document.querySelectorAll('#gDyn polyline')].some(e=>e.getAttribute('stroke')==='#ffcc33')&&[...document.querySelectorAll('#gDyn text')].some(t=>/^정답 두께 /.test(t.textContent))));
 ok('R7b 말풍선 글자가 칸 안(길 번호)',!(await fits()).length,await fits());
 if(rl.length>1){const d1=await p.textContent('#routeBar .rdesc');await p.click('#routeBar .rchip >> nth=1');await wait(80);
   ok('R8 다른 길 고르면 설명·강조가 바뀐다',/^② /.test(await p.textContent('#routeBar .rdesc'))&&(await p.textContent('#routeBar .rdesc'))!==d1&&await p.evaluate(()=>SIMV.routes.sel===1));}
 else ok('R8 (길이 하나 — 건너뜀)',true);
 await p.click('#bUseRoute');await wait(100);
 ok('R9 [이 길로 해 보기] → 두께가 그 길로 · 길 줄 사라짐',!(await p.isVisible('#routeBar'))&&/길로 바꿨습니다/.test(await p.textContent('#toast')));
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(300);
 ok('R10 그 길로 쳐 보면 ⭕ 득점',/⭕ \d+번째 만에 득점/.test(await p.textContent('#hint')),await p.textContent('#hint'));
 /* 🔁² 투쿠션 · 쿠션 먼저: 네 쿠션을 전부 훑는다 */
 await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='cush'&&x.draft.ncush===2);switchBoard(b.id);ST.draft.ctype='first';renderAll();});
 await p.click('#bNewQ');await wait(300);
 await p.click('#bRoutes');await wait(40);
 ok('R11 계산 중 진행률',/🔍 길 찾는 중/.test(await p.textContent('#hint')));
 ok('R12 끝',await waitRoutes());
 const r2l=await p.evaluate(()=>SIMV.routes.list.map(r=>r.key));
 ok('R13 투쿠션 길 = 쿠션 두 개 순서',r2l.length>=1&&r2l.every(k=>k.split('>').length===2)&&/(위|아래|왼쪽|오른쪽) [\d. ~]+ → (위|아래|왼쪽|오른쪽) [\d. ~]+ → 빨간 공 ①/.test(await p.textContent('#routeBar .rdesc')),[r2l,await p.textContent('#routeBar .rdesc')]);
 /* 좁은 창에서도 길 줄 때문에 화면이 넘치지 않는다 */
 await p.setViewportSize({width:1536,height:730});await wait(250);
 const rv2=await p.evaluate(()=>{const s=document.querySelector('.side');return {page:document.documentElement.scrollHeight-innerHeight,side:s.scrollHeight-s.clientHeight,
   over:[...document.querySelectorAll('#workv button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.bottom>innerHeight+.5||r.right>innerWidth+.5);}).map(e=>e.textContent.trim())};});
 ok('R14 1536×730: 길 줄이 있어도 스크롤·잘림 없음',rv2.page<=1&&rv2.side<=1&&!rv2.over.length,rv2);
 await p.setViewportSize({width:2560,height:1440});await wait(250);
 await p.click('#spd [data-s="4"]');await wait(60);
 ok('R15 조건을 바꾸면 길 줄 사라짐',!(await p.isVisible('#routeBar'))&&await p.evaluate(()=>SIMV===null));
 await p.click('#spd [data-s="3"]');

 /* ── V) 🎯 맞는 범위 찾기 (v2.2) ── */
 const waitScan=async()=>{for(let i=0;i<100;i++){if(await p.evaluate(()=>!!(SIMV&&SIMV.info&&SIMV.info.scan)))return true;await wait(50);}return false;};
 await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='free');switchBoard(b.id);MODE='ball';
   ST.balls={w:{x:1,y:2},y:{x:1,y:0.6},r:{x:3,y:2.1},r2:{x:7,y:3.8},cue:'w'};ST.draft.predict=[{ref:'cue'},{x:3,y:2}];ST.draft.tip={x:0,y:0};ST.draft.speed=3;ST.draft.kmh=null;renderAll();
   const sv=computeSim(),h=sv.res.events.find(e=>e.type==='ball');const f=sv.res.frames.find(f=>f.t>h.t+0.35);ST.balls.r2={x:f.p.w[0]/DM,y:f.p.w[1]/DM};renderAll();});
 ok('V0 자유 연습에 🎯 버튼',await p.isVisible('#bScan'));
 await p.click('#bScan');await wait(30);
 ok('V1 계산 중 글자',/🎯 계산 중… \d+\/\d+/.test(await p.textContent('#hint'))||await p.evaluate(()=>!!(SIMV&&SIMV.info.scan)));
 ok('V2 계산이 끝난다',await waitScan());
 let vt=await p.textContent('#hint');
 ok('V3 맞는 두께 글자: 빨강 ①·② 각각',/🎯 맞는 두께 \(속도 3 · 정중앙\) — 빨간 공 ①: .* · 빨간 공 ②: /.test(vt),vt);
 ok('V4 빨강 ① 쪽에 득점 구간이 있다(방금 쳐서 득점한 조준 포함)',/빨간 공 ①: (왼쪽|오른쪽|정면)/.test(vt),vt);
 const sc=await p.evaluate(()=>({n:SIMV.scan.items.length,hit:SIMV.scan.items.filter(x=>x.res==='hit').length,ranges:SIMV.scan.ranges.length,best:!!SIMV.scan.best,
   un:SIMV.scan.items.filter(x=>!x.res).length}));
 ok('V5 두 공 × 31 조준 · 모두 판정',sc.n===62&&sc.un===0,sc);
 ok('V6 구간·가운데 조준',sc.ranges>=1&&sc.best,sc);
 ok('V7 부채꼴이 그려진다',(await p.$$('#gDyn line')).length>=60);
 ok('V8 [가운데로 조준해 보기] 버튼',await p.isVisible('#bUseBest'));
 /* 🔒 v2.4 로한: "가운데" 글자가 말풍선 칸을 벗어났다 — 실제 글자 폭을 재서 모든 말풍선이 칸 안인지 */
 ok('V8b 말풍선 글자가 칸 안(가운데)',!(await fits()).length,await fits());
 /* 🔒 부채꼴이 거짓말하지 않는가 — 초록 조준을 하나하나 다시 치면 전부 득점 */
 const recheck=await p.evaluate(()=>{const it=SIMV.scan.items.filter(x=>x.res==='hit');let bad=0;
   it.forEach(x=>{const ai={dir:x.dir,contact:rayHit(ST.balls[ST.balls.cue],x.dir)};const r=simWith(ai,speedMs());if(judge(r,ai).result!=='hit')bad++;});return {n:it.length,bad};});
 ok('V9 초록 조준은 다시 쳐도 전부 득점',recheck.n>0&&recheck.bad===0,recheck);
 await p.click('#bUseBest');await wait(100);await p.click('#bSim');await wait(150);
 ok('V10 가운데로 조준 → 바로 쳐서 ⭕ 득점',/⭕ 득점/.test(await p.textContent('#hint'))&&(await st()).draft.predict.length===2,await p.textContent('#hint'));
 await p.click('#bUndo');
 /* 바꾸면 멈춘다 */
 await p.click('#bScan');await p.click('#spd [data-s="4"]');await wait(400);
 ok('V11 계산 중 조건을 바꾸면 멈춘다',await p.evaluate(()=>SIMV===null));
 await p.click('#spd [data-s="3"]');
 /* 🔁 판은 🎯 대신 💡 답 보기(v3) */
 await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='cush');switchBoard(b.id);});
 ok('V12 🔁 판엔 🎯 대신 💡 답 보기',!(await p.isVisible('#bScan'))&&await p.isVisible('#bAnswer'));
 /* 분리각 판엔 없다 */
 await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='sep');switchBoard(b.id);});
 ok('V18 분리각 판엔 🎯 없음',!(await p.isVisible('#bScan')));

 /* ── W) 🎲 문제 모드 (v2.3) ── */
 const toBoard=k=>p.evaluate(k=>{const b=BOARDS.find(x=>x.kind===k);if(b.id!==CUR)switchBoard(b.id);},k);
 await toBoard('sep');
 ok('W0 새 문제·10문제 버튼',await p.isVisible('#bNewQ')&&await p.isVisible('#bSet10')&&!(await p.isVisible('#setChip')));
 const before1=await st();
 await p.click('#bNewQ');await wait(100);
 let w=await st();
 ok('W1 분리각 새 문제: 배치·두께 바뀜 · 예측 비움 · ① 모드',JSON.stringify(w.balls)!==JSON.stringify(before1.balls)&&w.draft.thick>=1&&w.draft.thick<=8&&!w.draft.predObj&&(await p.evaluate(()=>MODE))==='pobj');
 ok('W2 분리각 문제 조건: 거리 1.2~4.5칸 · 첫 공 = 빨강 ①',await p.evaluate(()=>problemOk()));
 /* 여러 번 뽑아도 늘 조건을 지킨다 */
 ok('W3 20번 뽑아도 모두 조건 충족',await p.evaluate(()=>{for(let i=0;i<20;i++){newProblem();if(!problemOk())return false;}return true;}));
 await p.click('#bUndo');
 ok('W4 되돌리기로 이전 배치',(await p.evaluate(()=>UNDO.length))>=0);
 /* 원·투쿠션 */
 await toBoard('cush');
 await p.evaluate(()=>{ST.draft.ctype='first';ST.draft.ncush=1;renderAll();});
 await p.click('#bNewQ');await wait(100);
 /* 🔒 v3: 문제를 거꾸로 만든다(굴린 길 위에 목표 공) — 답 없는 문제가 나오지 않는다 */
 ok('W5 쿠션 먼저 새 문제: 답이 있다(20번 모두)',await p.evaluate(()=>{for(let i=0;i<20;i++){newProblem();SOLVE={key:null,val:null};if(!solveCush(true).best)return false;}return ST.draft.cpts.length===0&&MODE==='cpt';}));
 await p.evaluate(()=>{ST.draft.ctype='after';renderAll();});
 await p.click('#bNewQ');await wait(300);
 ok('W6 1적구 뒤 새 문제: 답이 있다 · 훈련 조건(20번 모두)',await p.evaluate(()=>{for(let i=0;i<20;i++){newProblem();if(!problemOk())return false;}return true;}));
 /* 자유 연습: 득점 가능한 배치만 */
 await toBoard('free');
 await p.click('#bNewQ');
 for(let i=0;i<80;i++){if(/득점할 수 있는 배치입니다|못 찾았/.test(await p.textContent('#toast')))break;await wait(100);}
 ok('W7 자유 새 문제: 득점 조준이 있는 배치',/득점할 수 있는 배치/.test(await p.textContent('#toast'))&&await p.evaluate(()=>{const it=scanCandidates();const V=speedMs();
   return it.some(x=>{if(x.block)return false;const ai={dir:x.dir,contact:rayHit(ST.balls[ST.balls.cue],x.dir)};return judge(simWith(ai,V),ai).result==='hit';});}),await p.textContent('#toast'));
 ok('W8 자유 새 문제 → 선 긋기 모드',(await p.evaluate(()=>MODE))==='draw'&&(await st()).draft.predict.length===0);
 ok('W9 자유 연습엔 10문제 없음',!(await p.isVisible('#bSet10')));

 /* 📝 10문제 — 분리각 */
 await toBoard('sep');
 const nAtt0=(await p.evaluate(()=>window.__T.bb_attempts.length));
 await p.click('#bSet10');await wait(100);
 ok('W10 세트 시작: 1 / 10 · 버튼 숨김',await p.isVisible('#setChip')&&(await p.textContent('#setNo'))==='1 / 10'&&!(await p.isVisible('#bSet10')));
 /* 한 문제 풀기: 정답 근처(±5°)를 예측으로 찍고 정답 보기 */
 const solve=async(off)=>{
   await p.evaluate(off=>{const ai=aimInfo(),sv=computeSim(),I=sv.info,a=Math.atan2(ai.dir.y,ai.dir.x),o=ST.balls.r,g=ai.contact.ghost;
     const s1=Math.atan2(o.y-g.y,o.x-g.x)-a>0?1:-1;const po=a+(I.obj+off)*Math.PI/180,pc=a+((I.cue==null?-s1*60:I.cue)-off)*Math.PI/180;
     ST.draft.predObj={x:o.x+Math.cos(po),y:o.y+Math.sin(po)};ST.draft.predCue={x:g.x+Math.cos(pc),y:g.y+Math.sin(pc)};renderAll();},off);
   await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(250);
 };
 await solve(6);
 let T3=await p.evaluate(()=>window.__T.bb_attempts);
 const last=T3[T3.length-1];
 ok('W11 정답 보면 자동 기록 · 세트 번호',T3.length===nAtt0+1&&last.sim.set&&last.sim.set.no===1,last.sim&&last.sim.set);
 ok('W12b 자동 기록 뒤 [기록하기] 막힘 · [다음 두께] 숨김',await p.$eval('#bRec',e=>e.disabled&&/기록됨/.test(e.textContent))&&!(await p.isVisible('#bNextT')));
 ok('W12 [다음 문제 ▶ (2/10)]',/다음 문제 ▶ \(2\/10\)/.test(await p.textContent('#hint')));
 await p.click('#bSim');await wait(60);await p.click('#bSim');await wait(200);
 ok('W13 같은 문제 다시 봐도 두 번 기록 안 함',(await p.evaluate(()=>window.__T.bb_attempts.length))===nAtt0+1);
 await p.click('#bNextQ');await wait(150);
 ok('W14 2 / 10 · 새 배치',(await p.textContent('#setNo'))==='2 / 10'&&(await p.evaluate(()=>MODE))==='pobj');
 for(let i=2;i<=10;i++){await solve(6);if(i<10){await p.click('#bNextQ');await wait(120);}}
 ok('W15 10번째 → [결과 보기]',/📝 결과 보기/.test(await p.textContent('#hint')));
 await p.click('#bNextQ');await wait(400);
 let mk=await p.textContent('#mask');
 ok('W16 결과 창: 평균 오차 · 10줄',/10문제 끝/.test(mk)&&/평균 오차: [\d.]+°/.test(mk)&&(await p.$$('.modal table tr')).length===11,mk.slice(0,200));
 ok('W17 세트 끝나면 표시 사라짐',!(await p.isVisible('#setChip')));
 /* 한 세트 더 — 이번엔 더 정확하게(오차 2°) → 지난 세트와 비교 */
 await p.click('.modal .btns .primary');await wait(150);
 ok('W18 [10문제 더] → 새 세트 1 / 10',(await p.textContent('#setNo'))==='1 / 10');
 for(let i=1;i<=10;i++){await solve(2);await p.click('#bNextQ');await wait(i<10?120:400);}
 mk=await p.textContent('#mask');
 ok('W19 지난 세트와 비교 · 좋아졌습니다',/지난 세트 [\d.]+° → 이번 [\d.]+° · [\d.]+° 좋아졌습니다/.test(mk),mk.slice(0,300));
 await p.click('.modal .btns button');
 /* 그만하기 · 판 바꾸면 멈춤 */
 await p.click('#bSet10');await wait(100);await p.click('#bSetStop');
 ok('W20 그만하기',!(await p.isVisible('#setChip'))&&await p.evaluate(()=>SET===null));
 await p.click('#bSet10');await wait(100);await toBoard('free');
 ok('W21 판을 바꾸면 세트 멈춤',await p.evaluate(()=>SET===null));

 /* ── X) 📈 실력 추이 (v2.4) — 답을 아는 가짜 기록을 날짜별로 심는다 ── */
 await p.evaluate(()=>{
   const T=window.__T,b=BOARDS.find(x=>x.kind==='sep').id,c=BOARDS.find(x=>x.kind==='cush').id,f=BOARDS.find(x=>x.kind==='free').id;
   T.bb_attempts.length=0;let n=0;
   const at=(d,h)=>new Date(2026,8,d,h||10,0,n++).toISOString();
   const push=(o)=>T.bb_attempts.push(Object.assign({id:'x'+(n++),user_id:'dad',deleted_at:null,balls:{},predict:[],tip:null,speed:3,kmh:null,memo:null},o));
   /* 분리각: 2/8 두께에서 수구를 늘 12° 넓게 본다(약점) · 나머지는 2° · 날짜가 갈수록 1적구 오차가 준다 */
   [[20,6],[22,4],[25,2]].forEach(([d,eo])=>{
     for(let i=0;i<3;i++)push({board_id:b,kind:'sep',created_at:at(d),result:null,sim:{thick:2,side:'L',obj:48,pObj:48+eo,eObj:eo,cue:40,pCue:52,eCue:12,set:{id:'S'+d,no:i+1}}});
     for(let i=0;i<3;i++)push({board_id:b,kind:'sep',created_at:at(d),result:null,sim:{thick:5,side:'R',obj:-20,pObj:-20-eo,eObj:eo,cue:-50,pCue:-48,eCue:2,set:{id:'S'+d,no:i+4}}});
   });
   /* 원·투쿠션: 쿠션 먼저에서 계산보다 늘 2 작게 찍는다 */
   [21,24].forEach(d=>{for(let i=0;i<2;i++)push({board_id:c,kind:'cush',created_at:at(d),result:null,sim:{ctype:'first',n:1,dad:[36],sys:[38],act:[37],err:[2],result:'miss'}});});
   /* 자유: 실제 득점 2/4 */
   [['hit','hit'],['miss','hit'],['hit','miss'],['miss','miss']].forEach(([r,s],i)=>push({board_id:f,kind:'free',created_at:at(21+i),result:r,sim:{result:s}}));
 });
 await p.click('#bLog');await wait(200);await p.click('#vTrend');await wait(350);
 let xb=await p.textContent('#logBody');
 ok('X0 📈 탭 · 세 가지 구역',/📐 분리각 훈련 \(18문제\)/.test(xb)&&/🔁 원·투쿠션 훈련 \(4문제\)/.test(xb)&&/🎱 자유 연습 \(4번\)/.test(xb),xb.slice(0,200));
 ok('X1 약점: 2/8 두께 수구 12° · 넓게',/⚠ 2\/8 두께: 수구 방향을 평균 12° 틀립니다 — 보통 넓게 봅니다/.test(xb),xb.slice(0,400));
 ok('X2 약점 표: 2/8 줄 강조',await p.$eval('#logBody tr.worst',e=>/2\/8/.test(e.textContent)));
 ok('X3 표: 2/8 수구 경향 넓게 12°',/넓게 12°/.test(await p.$eval('#logBody tr.worst',e=>e.textContent)));
 ok('X4 5/8 는 고름에 가깝다(좁게 2°)',await p.evaluate(()=>[...document.querySelectorAll('#logBody tr')].some(t=>/^5\/8/.test(t.textContent)&&/2°/.test(t.textContent))));
 ok('X5 쿠션 먼저 경향: 계산보다 2 작은 수',/무회전 계산보다 평균 2 작은 수를 찍습니다/.test(xb),xb);
 ok('X6 그래프 3개 · 범례',(await p.$$('#logBody .chart svg')).length===3&&/1적구[\s\S]*수구/.test(await p.$eval('#logBody .legend',e=>e.textContent)));
 const pts=await p.evaluate(()=>[...document.querySelectorAll('#logBody .chart')][0].querySelectorAll('circle').length);
 ok('X7 분리각 그래프: 3날짜 × 2선 = 점 6개',pts===6,pts);
 ok('X8 1적구 오차가 날짜마다 준다(6→4→2 · 5/8 도 같은 값)',await p.evaluate(()=>{const c=CH[0].o.series[0].map(x=>x.y);return JSON.stringify(c)==='[6,4,2]';}),await p.evaluate(()=>CH[0].o.series[0]));
 ok('X9 끝점 직접 표시',await p.evaluate(()=>[...document.querySelectorAll('#logBody .chart svg text')].some(t=>t.textContent==='1적구 2°')));
 /* 마우스 올리면 그날 값 */
 const hr=await p.$eval('#logBody .chart .hit',e=>{const r=e.getBoundingClientRect();return [r.x+r.width*0.02,r.y+r.height/2];});
 await p.mouse.move(hr[0],hr[1]);await wait(80);
 ok('X10 마우스 → 날짜·값 풍선',/9\/20[\s\S]*1적구: 6° \(6번\)[\s\S]*수구: 7° \(6번\)/.test(await p.textContent('#logBody .ctip')),await p.textContent('#logBody .ctip'));
 await p.mouse.move(5,5);
 ok('X11 [표로 보기] 에 같은 숫자',/9\/20[\s\S]*6°/.test(await p.$eval('#logBody details',e=>e.textContent)));
 ok('X12 세트 기록: 최근이 위 · 좋아짐 표시',/최근 10문제 세트/.test(xb)&&/▼ 1° 좋아짐/.test(xb),xb.slice(xb.indexOf('최근 10문제'),xb.indexOf('최근 10문제')+200));
 ok('X13 자유 연습 그래프 0~100%',await p.evaluate(()=>CH[2].o.unit==='%'&&CH[2].o.max===100));
 /* 판 고르면 그 판만 */
 await p.selectOption('#lBoard',{label:await p.evaluate(()=>{const b=BOARDS.find(x=>x.kind==='cush');return KINDS.cush.ic+' '+b.name;})});await wait(300);
 xb=await p.textContent('#logBody');
 ok('X14 판 고르면 그 판 기록만',!/분리각 훈련 \(/.test(xb)&&/원·투쿠션 훈련 \(4문제\)/.test(xb));
 await p.selectOption('#lBoard','');
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
  for(const md of ['ball','draw','edit','sep:ball','sep:pobj','sep:pcue','cush:ball','cush:cpt']){
   /* 원·투쿠션은 가장 칸이 많은 '1적구 뒤 쿠션'으로 잰다 */
   await p.evaluate(m=>{const k=m.includes(':')?m.split(':')[0]:'free';const b=BOARDS.find(x=>x.kind===k);if(b.id!==CUR)switchBoard(b.id);if(k==='cush')ST.draft.ctype='after';setMode(m.replace(/^\w+:/,''));},md);await wait(80);
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
 /* 로그인이 풀리면 로그인 화면으로(저장 실패만 반복하지 않게) */
 await p.evaluate(()=>window.__authCb&&window.__authCb('SIGNED_OUT',null));await wait(100);
 ok('Y1 로그인 풀림 → 로그인 화면 · 안내',await p.isVisible('#login')&&!(await p.isVisible('#app'))&&/다시 로그인해 주세요/.test(await p.textContent('#loginErr')));
 ok('Z 에러 없음',!errs.length,errs);
 await c.close();
 }finally{await b.close();}
 let f=0;R.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
 if(f){console.log('실패 '+f+'건');process.exit(1);}
 console.log('전부 통과 ('+R.length+'건)');
})().catch(e=>{console.error(e);process.exit(1);});
