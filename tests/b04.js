/* 📱 당구 연습장 — 폰 화면(반응형 v3.5) 시험
   🔒 아버지 폰: 갤럭시 S23/S24 급(약 360~384 × 780~824). 세로는 당구대를 90° 돌려 크게, 가로는 도구줄을 오른쪽 세로 줄로.
   · 판 종류마다(자유·분리각·원투쿠션·쿠션 지점·X법·평행법·칠판) 세로·가로에서: 가로 넘침·페이지 스크롤 없음 · 당구대 꽉 참 · 버튼 크기
   · 세로에서 손가락으로 누른 자리 = 당구대 좌표(돌린 것을 거꾸로 계산) · 글자는 바로 선다
   · 서랍(⚙ 더보기) · 폰 판정 버튼 · 판 메뉴(⋯) · 새 판 창 · 기록 화면
   argv[2](로한북 HTML)는 쓰지 않는다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'..','billiards','index.html');
const URL='file:///'+FILE.replace(/\\/g,'/').replace(/^\//,'');
const src=fs.readFileSync(path.join(__dirname,'b01.js'),'utf8');
const init=eval('('+src.slice(src.indexOf('function init('),src.indexOf('\n(async()=>'))+')');
const DAD={id:'dad',email:'dad@test',app_metadata:{provider:'email',app:'billiards'}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 try{
 for(const [W,H,nm] of [[384,824,'세로 S24'],[360,780,'세로 S23'],[824,384,'가로 S24']]){
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await c.addInitScript(init,{session:{user:DAD},users:{}});
  const p=await c.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://**/*',r=>r.abort());
  await p.goto(URL);await wait(500);
  const port=H>W,t=nm+' · ';
  ok('M0 '+t+'폰 모드'+(port?' · 세로(당구대 돎)':' · 가로'),await p.evaluate(pt=>document.documentElement.classList.contains('mob')&&document.documentElement.classList.contains('port')===pt&&
    document.getElementById('tbl').getAttribute('viewBox')===(pt?'-94 -94 588 988':'-94 -94 988 588'),port));
  /* 판 종류 7가지를 만들어 둔다 */
  await p.evaluate(()=>{const mk=(id,name,kind,dr)=>{const d=Object.assign(emptyDraft(),dr||{});BOARDS.push(normBoard({id,name,kind,balls:defaultBalls(),draft:d,sort:BOARDS.length+1}));};
    mk('k-sep','분리각','sep');mk('k-cush','원쿠션','cush',{ctype:'after'});mk('k-bp','지점','bank',{bstyle:'pick'});mk('k-bx','X법','bank',{bstyle:'x'});
    mk('k-bc','평행법','bank',{bstyle:'corner',ncush:2});mk('k-ch','칠판','chalk',{items:[{t:'text',p:{x:3,y:2},s:'얇게',c:'#fff'}]});});
  const meas=()=>p.evaluate(()=>{
    const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    const inTools=e=>!!e.closest('.tools');
    const btn=[...document.querySelectorAll('#app button')].filter(vis).filter(e=>!e.closest('.side'));
    const out=[...document.querySelectorAll('#workv button, header button')].filter(vis).filter(e=>!inTools(e)&&!e.closest('#tabs')&&!e.closest('.side')).filter(e=>{const r=e.getBoundingClientRect();return r.bottom>innerHeight+0.5||r.right>innerWidth+0.5||r.left<-0.5;}).map(e=>e.textContent.trim()||e.id);
    const tools=[...document.querySelectorAll('.stage .tools button')].filter(vis).map(e=>e.getBoundingClientRect());
    const wrap=document.querySelector('.tblwrap').getBoundingClientRect(),frame=document.querySelector('#gStatic rect').getBoundingClientRect();
    return {over:document.documentElement.scrollWidth-innerWidth,page:document.documentElement.scrollHeight-innerHeight,out,
      minBtn:Math.min(...btn.map(e=>e.getBoundingClientRect().height)),
      toolsOneLine:document.documentElement.classList.contains('port')?new Set(tools.map(r=>Math.round(r.top))).size===1:new Set(tools.map(r=>Math.round(r.left))).size===1,
      fill:Math.max(frame.width/wrap.width,frame.height/wrap.height),tblH:Math.round(frame.height),tblW:Math.round(frame.width),root:parseFloat(getComputedStyle(document.documentElement).fontSize)};});
  for(const id of [null,'k-sep','k-cush','k-bp','k-bx','k-bc','k-ch']){
    await p.evaluate(id=>{switchBoard(id||BOARDS[0].id);},id);await wait(120);
    const m=await meas(),k=await p.evaluate(()=>kind()+(ST.draft.bstyle&&kind()==='bank'?':'+ST.draft.bstyle:''));
    ok('M1 '+t+k+' · 가로 넘침·페이지 스크롤 없음',m.over<=0&&m.page<=1,[m.over,m.page]);
    ok('M2 '+t+k+' · 화면 밖 버튼 없음(도구줄·탭은 밀어서 봄)',!m.out.length,m.out);
    ok('M3 '+t+k+' · 버튼 높이 ≥ 40px · 글자 16px',m.minBtn>=39.5&&m.root>=16,[m.minBtn,m.root]);
    ok('M4 '+t+k+' · 도구가 한 줄',m.toolsOneLine);
    ok('M5 '+t+k+' · 당구대 꽉 참'+(port?'(세로로 길게)':''),m.fill>=0.97&&(port?m.tblH>m.tblW*1.5:m.tblW>m.tblH*1.5),[m.fill,m.tblW,m.tblH]);
  }
  /* 세로: 글자는 바로 선다 · 누른 자리 = 당구대 좌표 */
  if(port){
    ok('M6 '+t+'당구대 숫자·칠판 글씨는 제자리에서 -90° (바로 선다)',await p.evaluate(()=>{switchBoard('k-ch');const t1=[...document.querySelectorAll('#gStatic text')][0],t2=[...document.querySelectorAll('#gDyn text')].find(e=>e.textContent==='얇게');
      return /rotate\(-90/.test(t1.getAttribute('transform')||'')&&/rotate\(-90/.test(t2.getAttribute('transform')||'');}));
    const at=(x,y)=>p.evaluate(([x,y])=>{const s=document.getElementById('tbl'),pt=s.createSVGPoint();pt.x=x*100;pt.y=y*100;const q=pt.matrixTransform(document.getElementById('gRot').getScreenCTM());return [q.x,q.y];},[x,y]);
    await p.evaluate(()=>{switchBoard('k-bp');setMode('cpt');ST.draft.cpts=[];});
    const [tx,ty]=await at(4,0.05);await p.touchscreen.tap(tx,ty);await wait(120);
    ok('M7 '+t+'손가락으로 위 쿠션 40 자리를 누름 → 위 40 (돌린 화면 좌표가 맞다)',(await p.evaluate(()=>ST.draft.cpts.map(q=>railId(q)+railVal(q)).join()))==='T40',await p.evaluate(()=>ST.draft.cpts));
    ok('M7b '+t+'위 쿠션은 화면 오른쪽에 있다',tx>W*0.6,[tx,W]);
    await p.click('#bSimM');await wait(120);
    ok('M8 '+t+'도구줄 [▶ 판정] → 판정',/[⭕❌]/.test(await p.textContent('#hint')),await p.textContent('#hint'));
    for(let i=0;i<300;i++){if(await p.evaluate(()=>!!(SIMV&&SIMV.bank&&SIMV.bank.ans)))break;await wait(50);}
    ok('M9 '+t+'정답이 나오면 서랍 버튼이 "💡 정답·더보기"',/정답·더보기/.test(await p.textContent('#bSheet')));
    await p.click('#bSheet');await wait(120);
    ok('M10 '+t+'서랍 열림: 정답 칸 · 당점 · 닫기',await p.isVisible('.side')&&await p.isVisible('#bankBar')&&await p.isVisible('#tip')&&await p.isVisible('#bSheetX'));
    ok('M10b '+t+'서랍도 화면 안(가로 넘침 없음)',await p.evaluate(()=>{const r=document.querySelector('.side').getBoundingClientRect();return r.left>=-0.5&&r.right<=innerWidth+0.5&&document.documentElement.scrollWidth<=innerWidth;}));
    await p.click('#bSheetX');await wait(80);
    ok('M11 '+t+'서랍 닫기',!(await p.isVisible('.side')));
    /* 칠판: 펜 획이 누른 자리에 */
    await p.evaluate(()=>{switchBoard('k-ch');setMode('cpen');ST.draft.items=[];});
    const a1=await at(2,1),a2=await at(2.5,1.5);
    await p.mouse.move(...a1);await p.mouse.down();await p.mouse.move(...a2,{steps:6});await p.mouse.up();await wait(80);
    const st=await p.evaluate(()=>ST.draft.items[0]);
    ok('M12 '+t+'칠판 펜: 그은 자리 = 당구대 좌표',st&&st.t==='pen'&&Math.abs(st.pts[0][0]-2)<0.05&&Math.abs(st.pts[0][1]-1)<0.05&&Math.abs(st.pts[st.pts.length-1][0]-2.5)<0.05,st&&[st.pts[0],st.pts[st.pts.length-1]]);
    /* 판 메뉴 · 새 판 창 · 기록 화면 */
    await p.click('#bBoardMenu');await wait(100);
    ok('M13 '+t+'⋯ 판 메뉴: 이름 바꾸기·복제·지우기',/이름 바꾸기/.test(await p.textContent('#mask'))&&/복제/.test(await p.textContent('#mask'))&&/이 판 지우기/.test(await p.textContent('#mask')));
    await p.keyboard.press('Escape');await wait(60);
    await p.click('#bNew');await wait(120);
    ok('M14 '+t+'새 판 창: 카드 한 줄씩 · 화면 안',await p.evaluate(()=>{const m=document.querySelector('.modal').getBoundingClientRect(),c=[...document.querySelectorAll('.kindpick button')].map(e=>e.getBoundingClientRect());
      return m.left>=0&&m.right<=innerWidth&&new Set(c.map(r=>Math.round(r.left))).size===1;}));
    await p.click('#mask .mx');await wait(60);
    await p.click('#bLog');await wait(250);
    ok('M15 '+t+'기록 화면: 가로 넘침 없음',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.click('#bBack');await wait(100);
  }else{
    /* 가로: 도구줄은 오른쪽 세로 · 당구대가 넉넉 */
    ok('M6 '+t+'도구줄이 당구대 오른쪽',await p.evaluate(()=>{const t=document.querySelector('.stage .tools').getBoundingClientRect(),w=document.querySelector('.tblwrap').getBoundingClientRect();return t.left>=w.right-1;}));
    ok('M7 '+t+'당구대 높이 ≥ 화면의 60%',await p.evaluate(()=>document.querySelector('#gStatic rect').getBoundingClientRect().height>=innerHeight*0.6));
  }
  /* 화면을 돌리면(세로 ↔ 가로) 바로 바뀐다 */
  await p.setViewportSize({width:H,height:W});await wait(300);
  ok('M16 '+t+'돌리면 모드가 바뀐다',await p.evaluate(pt=>document.documentElement.classList.contains('port')===!pt,port));
  ok('M17 '+t+'에러 없음',!errs.length,errs);
  await c.close();
 }
 /* PC 는 그대로 */
 {const c=await b.newContext({viewport:{width:2560,height:1300}});await c.addInitScript(init,{session:{user:DAD},users:{}});
  const p=await c.newPage();await p.route('https://**/*',r=>r.abort());await p.goto(URL);await wait(400);
  ok('M18 PC(2560×1300): 폰 모드 아님 · 당구대 안 돎 · 폰 전용 버튼 숨김',await p.evaluate(()=>!document.documentElement.classList.contains('mob')&&!document.getElementById('gRot').getAttribute('transform')&&
    getComputedStyle(document.getElementById('bSheet')).display==='none'&&getComputedStyle(document.getElementById('bBoardMenu')).display==='none'));
  await c.close();}
 /* ── ✍ S펜 · 손가락 (v3.6) — 펜·손가락 이벤트를 직접 만들어 넣는다 ── */
 {const c=await b.newContext({viewport:{width:384,height:824},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await c.addInitScript(init,{session:{user:DAD},users:{}});
  const p=await c.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('https://**/*',r=>r.abort());await p.goto(URL);await wait(500);
  await p.evaluate(()=>{const d=Object.assign(emptyDraft(),{});BOARDS.push(normBoard({id:'pc',name:'칠판',kind:'chalk',balls:defaultBalls(),draft:d,sort:9}));switchBoard('pc');setMode('cpen');});
  /* 당구대 좌표 → 화면 · 이벤트 만들기 */
  const ev=(type,id,pt,x,y,btn)=>p.evaluate(([type,id,pt,x,y,btn])=>{const s=document.getElementById('tbl'),q=s.createSVGPoint();q.x=x*100;q.y=y*100;const r=q.matrixTransform(document.getElementById('gRot').getScreenCTM());
    s.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:pt,clientX:r.x,clientY:r.y,button:type==='pointermove'?-1:(btn||0),buttons:type==='pointerup'?0:(btn===2?2:1),bubbles:true,cancelable:true,isPrimary:true}));},[type,id,pt,x,y,btn]);
  const stroke=async(id,pt,pts,btn)=>{await ev('pointerdown',id,pt,pts[0][0],pts[0][1],btn);for(const q of pts.slice(1))await ev('pointermove',id,pt,q[0],q[1],btn);await ev('pointerup',id,pt,pts[pts.length-1][0],pts[pts.length-1][1],btn);await wait(60);};
  const items=()=>p.evaluate(()=>ST.draft.items.length);
  await stroke(1,'touch',[[2,1],[2.4,1.3],[2.8,1.5]]);
  ok('S1 펜을 쓰기 전엔 손가락으로도 그려진다',(await items())===1);
  await stroke(2,'pen',[[3,1],[3.5,1.4],[4,1.6]]);
  ok('S2 S펜으로 쓰기 · 펜을 알아봄(기억)',(await items())===2&&await p.evaluate(()=>PENSEEN&&localStorage.getItem('bb.penseen')==='1')&&/S펜을 알아봤습니다/.test(await p.textContent('#toast')));
  await stroke(3,'touch',[[5,2],[5.5,2.4],[6,2.6]]);
  ok('S3 펜을 쓴 뒤 손가락 한 개 = 그리지 않음(화면 옮기기)',(await items())===2);
  /* 손바닥: 펜이 닿아 있는 동안 손가락 무시 */
  await ev('pointerdown',4,'pen',1,3);await ev('pointerdown',5,'touch',6,3);await ev('pointermove',4,'pen',1.5,3.2);await ev('pointermove',5,'touch',6.5,3.3);await ev('pointerup',5,'touch',6.5,3.3);await ev('pointerup',4,'pen',1.5,3.2);await wait(60);
  ok('S4 손바닥(펜이 닿아 있을 때 손가락) 무시 · 펜 획만',(await items())===3);
  /* 두 손가락 확대 */
  await ev('pointerdown',6,'touch',3.5,1.8);await ev('pointerdown',7,'touch',4.5,2.2);
  for(let i=1;i<=6;i++){await ev('pointermove',6,'touch',3.5-i*0.15,1.8-i*0.05);await ev('pointermove',7,'touch',4.5+i*0.15,2.2+i*0.05);}
  await ev('pointerup',6,'touch',2.6,1.5);await ev('pointerup',7,'touch',5.4,2.5);await wait(80);
  const z=await p.evaluate(()=>({s:ZOOM.s,vb:document.getElementById('tbl').getAttribute('viewBox')}));
  ok('S5 두 손가락으로 벌리면 확대 · [🔍 원래 크기] 보임 · 획은 안 생김',z.s>1.3&&await p.isVisible('#bZoom')&&(await items())===3,z);
  /* 확대한 채로 펜: 누른 자리 = 당구대 좌표 */
  await stroke(8,'pen',[[4,2],[4.2,2.1]]);
  ok('S6 확대한 채로 펜 — 그은 자리가 맞다',await p.evaluate(()=>{const it=ST.draft.items[ST.draft.items.length-1];return Math.abs(it.pts[0][0]-4)<0.03&&Math.abs(it.pts[0][1]-2)<0.03;}));
  /* 손가락 한 개 = 화면 옮기기 */
  const c0=await p.evaluate(()=>[ZOOM.cx,ZOOM.cy]);
  await stroke(9,'touch',[[4,2],[4,1.6],[4,1.2]]);
  const c1=await p.evaluate(()=>[ZOOM.cx,ZOOM.cy]);
  ok('S7 확대 중 손가락 한 개로 끌면 화면이 옮겨진다',Math.hypot(c1[0]-c0[0],c1[1]-c0[1])>10&&(await items())===4,[c0,c1]);
  await p.click('#bZoom');await wait(60);
  ok('S8 [🔍 원래 크기]',await p.evaluate(()=>ZOOM.s===1&&document.getElementById('tbl').getAttribute('viewBox')==='-94 -94 588 988')&&!(await p.isVisible('#bZoom')));
  /* S펜 옆 버튼 = 지우개 */
  await stroke(10,'pen',[[3,1.05],[3.6,1.45]],2);
  ok('S9 S펜 옆 버튼을 누른 채 문지르면 지우개',(await items())===3);
  /* 공 옮기기 모드에선 손가락으로 공을 옮긴다 */
  await p.evaluate(()=>setMode('ball'));
  const w0=await p.evaluate(()=>ST.balls.w);
  await stroke(11,'touch',[[w0.x,w0.y],[w0.x+0.3,w0.y-0.2],[w0.x+0.6,w0.y-0.4]]);
  ok('S10 펜을 쓴 뒤에도 공 옮기기 모드에선 손가락으로 공을 옮긴다',await p.evaluate(w=>Math.abs(ST.balls.w.x-(w.x+0.6))<0.05,w0));
  /* 설정: 손가락으로도 그리기 */
  await p.evaluate(()=>setMode('cpen'));
  await p.click('#bSet');await wait(100);await p.click('[data-pen="finger"]');await p.click('#mask .mx');await wait(60);
  await stroke(12,'touch',[[5,3],[5.5,3.2]]);
  ok('S11 설정 "손가락으로도 그리기" → 손가락으로 그려진다 · 기억',(await items())===4&&await p.evaluate(()=>localStorage.getItem('bb.penmode')==='finger'));
  /* 다른 판으로 가면 확대가 풀린다 */
  await ev('pointerdown',13,'touch',3,1.5);await ev('pointerdown',14,'touch',4,2);await ev('pointermove',14,'touch',5,2.5);await ev('pointerup',14,'touch',5,2.5);await ev('pointerup',13,'touch',3,1.5);
  await p.evaluate(()=>switchBoard(BOARDS[0].id));await wait(60);
  ok('S12 판을 바꾸면 확대가 풀린다',await p.evaluate(()=>ZOOM.s===1));
  ok('S13 에러 없음',!errs.length,errs);
  await c.close();}
 /* 🔒 v3.5.1 동시 접속: 예전 같은 칸에 있던 아버지 로그인은 당구 칸으로 옮기고, 로한 로그인은 건드리지 않는다 */
 for(const [who,u,moved] of [['아버지',DAD,true],['로한',{id:'rohan',app_metadata:{provider:'email'}},false]]){
  const c=await b.newContext({viewport:{width:1400,height:900}});
  await c.addInitScript(({u})=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('sb-ytkbrdgbklnijbwkvino-auth-token',JSON.stringify({access_token:'x',user:u}));}},{u});
  await c.addInitScript(init,{session:{user:DAD},users:{}});
  const p=await c.newPage();await p.route('https://**/*',r=>r.abort());await p.goto(URL);await wait(300);
  const s=await p.evaluate(()=>({old:localStorage.getItem('sb-ytkbrdgbklnijbwkvino-auth-token'),neu:localStorage.getItem('sb-billiards-auth')}));
  ok('M19 '+who+' 예전 로그인 → '+(moved?'당구 칸으로 옮김(다시 로그인 안 해도 됨)':'로한북 칸에 그대로'),moved?(!s.old&&/"app":"billiards"/.test(s.neu||'')):(!!s.old&&!s.neu),s);
  await c.close();}
 }finally{await b.close();}
 let f=0;R.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
 if(f){console.log('실패 '+f+'건');process.exit(1);}
 console.log('전부 통과 ('+R.length+'건)');
})().catch(e=>{console.error(e);process.exit(1);});
