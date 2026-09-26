/* 🎱 당구 연습장 — 전체 점검(무작위로 마구 눌러 보기)
   🔒 왜: 기능 테스트(b01)는 "정해진 순서"만 본다. 2026-09-26 로한이 실제로 쓰다 보니
      새로고침 때 '불러오는 중' 이 안 꺼지는 결함이 나왔다 — 정해진 순서 밖에서 터지는 것을 잡으려고 만든다.
   · 실제 DB 모양을 흉내 낸 기록으로 시작한다(옛 3구 판·공에 붙은 조준점·결과 없는 시도·v2 판 3종류)
   · 버튼·당구대 클릭/드래그·키보드·창 크기를 무작위로 섞는다. 난수 씨앗을 찍어 두어 같은 순서로 다시 돌릴 수 있다
   · 매 동작마다: 화면 오류 없음 · '불러오는 중' 없음 · 로그인/앱 중 정확히 하나 · 굴러가기가 멈춰 있지 않음
   argv[2](로한북 HTML)는 쓰지 않는다. SEED=숫자 로 씨앗을 고정할 수 있다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'..','billiards','index.html');
const URL='file:///'+FILE.replace(/\\/g,'/').replace(/^\//,'');
const src=fs.readFileSync(path.join(__dirname,'b01.js'),'utf8');
const init=eval('('+src.slice(src.indexOf('function init('),src.indexOf('\n(async()=>'))+')');
const SEED=+process.env.SEED||(Date.now()%100000);
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const R=rng(SEED),pick=a=>a[Math.floor(R()*a.length)];

/* 실제 DB 모양(2026-09-26 아버지 계정 데이터에서 모양만 본떠 만든 것 — 값은 다르다) */
const U='dad',T0='2026-09-26T06:00:00.000Z';
const B=(id,name,kind,balls,draft,del)=>({id,user_id:U,name,kind,balls,draft,sort:1,deleted_at:del||null,created_at:T0,updated_at:T0});
const FIX={bb_events:[],
  bb_boards:[
    /* v1 옛 판: 빨강 ② 없음 · speed null · result 남음 · 공에 붙은 조준점(ref) */
    B('b-old','옛 판','free',{r:{x:6,y:2},w:{x:2,y:2.5},y:{x:2,y:1.5},cue:'y'},
      {kmh:null,tip:null,memo:'',speed:null,actual:[],result:'hit',predict:[{ref:'cue'},{x:6,y:2,ref:'r'},{x:7,y:0,rail:true},{x:8,y:1,rail:true},{x:4.9,y:4,rail:true},{x:2,y:2.5,ref:'w'}]}),
    B('b-free','판 1','free',{r:{x:5.67,y:3.13},w:{x:3.2,y:2.15},y:{x:7.06,y:1.81},r2:{x:6.53,y:1.19},cue:'w'},
      {kmh:null,tip:null,cpts:[],memo:'',side:'L',ctype:'first',ncush:1,speed:3,thick:4,actual:[],predCue:null,predObj:null,predict:[{ref:'cue'},{x:3.49,y:3.2},{x:4.75,y:4,rail:true}]}),
    B('b-sep','분리각 2','sep',{r:{x:6,y:2},w:{x:2,y:3},y:{x:2,y:1},r2:{x:4,y:2},cue:'w'},{thick:4,side:'L',speed:3}),
    B('b-cush','쿠션 3','cush',{r:{x:6,y:2},w:{x:2,y:3},y:{x:2,y:1},r2:{x:4,y:2},cue:'w'},{ctype:'after',ncush:2,cpts:[{x:3,y:0,rail:true}],thick:2.5,side:'R'}),
    B('b-gone','지운 판','free',{r:{x:6,y:2},w:{x:2,y:3},y:{x:2,y:1},cue:'w'},{},'2026-09-26T08:31:47.351+00:00')],
  bb_attempts:[
    /* v1 옛 시도: kind free · sim null · 결과 없음 · 조준점에 ref */
    {id:'a1',user_id:U,board_id:'b-old',kind:'free',sim:null,result:null,memo:null,tip:null,speed:null,kmh:null,deleted_at:null,created_at:T0,updated_at:T0,
     balls:{r:{x:6.15,y:2.04},w:{x:4.02,y:3.01},y:{x:2,y:1.01},cue:'w'},predict:[{x:4.02,y:3.01,ref:'cue'},{x:0.5,y:0,rail:true},{x:2,y:1.01,ref:'y'},{x:6.15,y:2.04,ref:'r'}],actual:null},
    {id:'a2',user_id:U,board_id:'b-gone',kind:'free',sim:null,result:null,memo:null,tip:null,speed:1,kmh:null,deleted_at:null,created_at:T0,updated_at:T0,
     balls:{r:{x:7.06,y:1.07},w:{x:6.99,y:1.99},y:{x:2.02,y:3.9},cue:'w'},predict:[{x:6.99,y:1.99,ref:'cue'},{x:7.06,y:1.07,ref:'r'},{x:5.9,y:0,rail:true}],actual:null}]};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R2=[];const ok=(n,v,x)=>R2.push({n,v:!!v,x});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 let log=[];
 try{
  const c=await b.newContext({viewport:{width:2560,height:1300}});
  await c.addInitScript(({session,users,seed})=>{window.__SEED=seed;},{session:null,users:{},seed:FIX});
  await c.addInitScript(init,{session:{user:{id:U,email:'dad@test',app_metadata:{app:'billiards'}}},users:{}});
  /* init 이 만든 빈 표를 실제 모양 기록으로 바꾼다 */
  await c.addInitScript(()=>{const S=JSON.parse(JSON.stringify(window.__SEED));const T=window.__T;Object.keys(S).forEach(k=>{T[k].length=0;S[k].forEach(r=>T[k].push(r));});});
  const p=await c.newPage(),errs=[];
  p.on('pageerror',e=>errs.push(e.message+' @'+log.slice(-3).join(' > ')));
  await p.route('https://**/*',r=>r.abort());
  await p.goto(URL);await wait(500);

  /* 불변 조건 */
  const inv=async(tag)=>{
    const s=await p.evaluate(()=>{const v=id=>{const e=document.getElementById(id);return !!e&&getComputedStyle(e).display!=='none';};
      return {boot:v('boot'),app:v('app'),login:v('login'),mask:v('mask'),playing:!!(window.SIMV&&SIMV.playing),t:window.SIMV?SIMV.t:0};});
    if(s.boot)return tag+': 불러오는 중 화면이 남음';
    if(s.app===s.login)return tag+': 로그인/앱 둘 다 '+(s.app?'보임':'안 보임');
    return null;
  };
  ok('M0 실제 모양 기록으로 시작 — 오류 없이 뜸',!(await inv('시작'))&&!errs.length,errs);
  ok('M1 옛 판·빨강 ② 없는 판도 4구로 불러옴',await p.evaluate(()=>BOARDS.length===4&&BOARDS.every(b=>b.balls.r2&&KINDS[b.kind])));
  /* 판마다 한 번씩 열어 그려 본다 */
  for(const id of ['b-old','b-free','b-sep','b-cush']){await p.evaluate(id=>switchBoard(id),id);await wait(80);}
  ok('M2 네 판 모두 열림(옛 판 · 1/16 두께 2.5/8 · 투쿠션 지점 1개)',!errs.length,errs);
  await p.click('#bLog');await wait(250);await p.click('#vAtt');await wait(200);
  ok('M3 기록 화면: 옛 시도(sim 없음) 표시',(await p.$$('#logBody tr.click')).length===2&&!errs.length,errs);
  await p.click('#logBody tr.click >> nth=0');await wait(100);
  ok('M4 옛 시도 그림 열림',await p.isVisible('.modal svg.mini'));
  await p.keyboard.press('Escape');
  await p.click('#vTrend');await wait(250);
  ok('M5 실력 추이: sim 없는 옛 시도만 있어도 오류 없음',!errs.length&&/아직 실력 추이를 그릴 기록이 없습니다[\s\S]*예전 방식으로 남긴 기록 2개/.test(await p.textContent('#logBody')),errs);
  await p.click('#vEvt');await wait(150);await p.click('#bBack');await wait(100);

  /* ── 무작위로 마구 눌러 보기 ── */
  const N=+process.env.STEPS||350;let bad=null;
  const vps=[[2560,1300],[1920,950],[1536,730]];
  for(let i=0;i<N&&!bad;i++){
    const r=R();let act;
    const modal=await p.isVisible('#mask');
    if(modal){
      /* 모달: 나가기(로그아웃)만 빼고 아무 버튼 · 가끔 Esc · 입력칸엔 글자 */
      const btns=await p.$$eval('#mask button',es=>es.map((e,i)=>({i,t:e.textContent.trim()})).filter(x=>!/나가기|비밀번호 바꾸기/.test(x.t)));
      if(await p.$('#mIn'))await p.fill('#mIn','판 '+Math.floor(R()*99)).catch(()=>{});
      if(!btns.length||r<0.25){act='모달 Esc';await p.keyboard.press('Escape');}
      else{const x=pick(btns);act='모달 ['+x.t.slice(0,12)+']';await p.$$('#mask button').then(es=>es[x.i]&&es[x.i].click().catch(()=>{}));}
    }else if(await p.isVisible('#logv')){
      const t=pick(['#vAtt','#vTrend','#vEvt','#bBack','#bBack','row']);act='기록 '+t;
      if(t==='row'){const rows=await p.$$('#logBody tr.click');if(rows.length)await pick(rows).click().catch(()=>{});}
      else await p.click(t).catch(()=>{});
    }else if(r<0.55){
      /* 보이는 버튼 아무거나(로그아웃 경로인 ⚙ 설정은 가끔만) */
      const btns=await p.$$eval('#app button',es=>es.filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.disabled;}).map(e=>e.id||e.textContent.trim().slice(0,10)));
      const cand=btns.filter(x=>x!=='bSet'||R()<0.2);
      const x=pick(cand);act='버튼 '+x;
      const h=x&&/^[A-Za-z]\w*$/.test(x)?await p.$('#'+x):null;
      if(h)await h.click({timeout:2000}).catch(()=>{});
      else await p.click('#app button:visible >> text="'+x+'"',{timeout:1500}).catch(()=>{});
    }else if(r<0.8){
      /* 당구대 클릭 · 드래그 */
      const box=await p.$eval('#tbl',e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
      const X=box[0]+box[2]*(0.05+R()*0.9),Y=box[1]+box[3]*(0.05+R()*0.9);
      if(R()<0.6){act='판 클릭';await p.mouse.click(X,Y);}
      else{act='판 드래그';await p.mouse.move(X,Y);await p.mouse.down();await p.mouse.move(X+(R()-0.5)*300,Y+(R()-0.5)*200,{steps:5});await p.mouse.up();}
    }else if(r<0.9){
      const k=pick(['Enter','Escape','Control+z','Control+y','Delete']);act='키 '+k;await p.keyboard.press(k);
    }else if(r<0.95){
      const bx=await p.$eval('#tip',e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width];}).catch(()=>null);
      act='당점';if(bx&&bx[2])await p.mouse.click(bx[0]+bx[2]*(0.15+R()*0.7),bx[1]+bx[2]*(0.15+R()*0.7));
    }else{
      const v=pick(vps);act='창 '+v.join('×');await p.setViewportSize({width:v[0],height:v[1]});
    }
    log.push(i+':'+act);
    await wait(25+Math.floor(R()*40));
    if(await p.isVisible('#login')){bad='로그인 화면으로 떨어짐 @'+log.slice(-4).join(' > ');break;}
    const e=await inv(act);if(e){bad=e+' @'+log.slice(-4).join(' > ');break;}
    if(errs.length){bad='화면 오류: '+errs[0];break;}
  }
  ok('M6 무작위 '+N+'동작 — 오류·멈춤·남은 불러오는 중 화면 없음 (씨앗 '+SEED+')',!bad,bad);
  /* 굴러가기는 결국 끝난다 */
  await p.keyboard.press('Escape');await wait(100);
  for(let i=0;i<120&&await p.evaluate(()=>!!(window.SIMV&&SIMV.playing));i++)await wait(100);
  ok('M7 굴러가기가 끝까지 간다(멈춰 있지 않음)',!(await p.evaluate(()=>!!(window.SIMV&&SIMV.playing))));
  /* 새로고침: 불러오는 중 → 앱, 둘이 같이 보이지 않는다 */
  await p.reload();await wait(600);
  ok('M8 새로고침 뒤 불러오는 중 화면이 남지 않음',!(await inv('새로고침'))&&!errs.length,[await inv('새로고침'),errs]);
  await c.close();
 }finally{await b.close();}
 let f=0;R2.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
 if(f){console.log('실패 '+f+'건 · 다시 돌리기: SEED='+SEED+' node tests/b03.js');console.log('마지막 동작: '+log.slice(-12).join(' > '));process.exit(1);}
 console.log('전부 통과 ('+R2.length+'건 · 씨앗 '+SEED+')');
})().catch(e=>{console.error(e);process.exit(1);});
