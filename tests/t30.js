/* t30 — v1.8 루틴 순서 (▲▼)
   로한: "여기 순서를 내가 조정할 수 있었으면 좋겠다. 조정 시 캘린더나 기타 다른 부분도 순서가 바뀌어야 된다."
   → 핵심은 '한 곳에서 바꾸면 세 화면이 같이 움직인다' 이다. 그것만 본다.
   ⚠️ 규칙대로 order 가 아예 없는 '구 루틴' 상태부터 먹인다 — v1.7까지 실제 DB 가 그 상태였다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

/* 코드순(B.8A · B1 · C.8A · D3 · E.8A · E.8B)과 배열순을 **일부러 어긋나게** 넣는다.
   order 필드는 없다. 마이그레이션이 코드순으로 기준을 잡아야 한다. */
const R=(id,code,goalId,title,freq,days)=>({id,code,goalId,title,freq,days:days||[],
  start:'2026-08-01',end:'',status:'active'});
const BASE=()=>({schemaVersion:7,ui:{month:'2026-08'},
 transactions:[],categories:[],cards:[],accounts:[],debts:[],items:[],budgets:{},journal:[],
 fixed:[],events:[],posts:[],logs:[],rewards:[],rewardCards:{},
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 goals:[{id:'gB',code:'B',kind:'year',parentId:null,period:'2026',title:'몸',due:'2026-12-31',
         metric:{type:'binary',target:0,unit:''},startYM:'2026-08',status:'active'},
        {id:'gB8',code:'B.8',kind:'milestone',parentId:'gB',period:'2026-08',title:'8월',due:'2026-08-31',
         metric:{type:'binary',target:0,unit:''},status:'active'},
        {id:'gD',code:'D',kind:'year',parentId:null,period:'2026',title:'글',due:'2026-12-31',
         metric:{type:'binary',target:0,unit:''},startYM:'2026-08',status:'active'}],
 routines:[
   R('r5','E.8A',null,'7시 기상','daily'),
   R('r1','B.8A','gB8','매일 유산균&비타민C 챙기기','daily'),
   R('r4','D3','gD','주말 최소 1만자 쓰기','weekly',[0,6]),
   R('r2','B1','gB','오전 오십견 스트레칭','daily'),
   R('r6','E.8B',null,'24시 전 취침','daily'),
   R('r3','C.8A',null,'아침 8시-12시전 학습 뽀모 수행','daily')],
 checks:{}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1300);
  return {b,p,errs};
}
/* 화면에 실제로 그려진 순서를 읽는다 — 배열이 아니라 DOM 을 본다. */
const matrixCodes = p => p.evaluate(()=>[].map.call(
  document.querySelectorAll('#v-goal .rtm tbody tr.rtmrow .gcode'), n=>n.textContent.trim()));
const dailyCodes = p => p.evaluate(()=>[].map.call(
  document.querySelectorAll('#v-daily .rcode'), n=>n.textContent.trim()));

(async()=>{
{
  const {b,p,errs}=await boot(BASE());

  /* ── A. 마이그레이션: order 없는 구 루틴에 코드순으로 기준을 잡는다 ── */
  const a=await p.evaluate(()=>({
    ords:DB.routines.map(r=>r.code+':'+r.order).sort(),
    seeded:DB.meta.rtOrdSeeded,
    sorted:routinesSorted().map(r=>r.code)
  }));
  ok('A1 rtOrdSeeded 플래그',a.seeded===1,a.seeded);
  ok('A2 코드순 1..6 부여',a.sorted.join(',')==='B.8A,B1,C.8A,D3,E.8A,E.8B',a.sorted.join(','));
  ok('A3 번호가 촘촘하다',a.ords.join('|')==='B.8A:1|B1:2|C.8A:3|D3:4|E.8A:5|E.8B:6',a.ords.join('|'));

  await p.click('.m[data-v="goal"]');await p.waitForTimeout(400);
  const m0=await matrixCodes(p);
  ok('A4 루틴 설계 화면이 그 순서로 뜬다',m0.join(',')==='B.8A,B1,C.8A,D3,E.8A,E.8B',m0.join(','));

  /* ── B. ▲▼ 버튼 상태 ── */
  const btn=await p.evaluate(()=>{
    const rows=[].slice.call(document.querySelectorAll('#v-goal .rtm tbody tr.rtmrow'));
    return rows.map(tr=>[].map.call(tr.querySelectorAll('.mv'),n=>n.classList.contains('off')?'off':'on').join('/'));
  });
  ok('B1 첫 줄은 ▲ 비활성',btn[0]==='off/on',btn[0]);
  ok('B2 마지막 줄은 ▼ 비활성',btn[btn.length-1]==='on/off',btn[btn.length-1]);
  ok('B3 가운데 줄은 둘 다 활성',btn[2]==='on/on',btn[2]);

  /* ── C. 실제 클릭으로 내린다 (이벤트 위임까지 확인) ── */
  await p.click('#v-goal .rtm tbody tr.rtmrow:nth-child(1) [data-rtmv]');
  await p.waitForTimeout(350);
  const m1=await matrixCodes(p);
  ok('C1 B.8A 가 한 칸 내려간다',m1.join(',')==='B1,B.8A,C.8A,D3,E.8A,E.8B',m1.join(','));
  const o1=await p.evaluate(()=>routinesSorted().map(r=>r.code+':'+r.order).join('|'));
  ok('C2 번호가 1..6 로 다시 촘촘해진다',o1==='B1:1|B.8A:2|C.8A:3|D3:4|E.8A:5|E.8B:6',o1);

  /* ── D. 🔒 핵심: 데일리가 같이 움직인다 ──
     D3 는 주말 전용이라 오늘이 무슨 요일이냐에 따라 뜨고 안 뜬다.
     🔒 날짜에 기대는 단정은 쓰지 않는다 (t23 이 08-20 을 박아 뒀다가 날짜가 넘어가며 터졌다).

     ⚠️ v1.8 은 목표별 그룹만 있어서 '그룹째' 움직였다 — 로한: "반영이 안된다. 서로 연동되어야지."
        v1.9 부터 정렬 토글이 있다.
          · 기본 '순서대로' = 설계 순서를 **그대로 일렬로** 복사한다
          · '목표별'       = 그룹 안 순서 유지 + 그룹 순서는 첫 루틴 기준
        둘 다 검증한다. */
  const gkeyMap = p => p.evaluate(()=>{
    const m={};
    (DB.routines||[]).forEach(r=>{
      const g=r.goalId?goalById(r.goalId):null;
      m[r.code]=g?((g.kind==='milestone')?(g.parentId||g.id):g.id):'_z';
    });
    return m;
  });
  /* 데일리 목록이 설계 순서를 '그룹 보존' 형태로 따르는가 */
  function follows(daily,design,gk){
    const rank={};design.forEach((c,i)=>{rank[c]=i;});
    /* ① 그룹 안 상대 순서 */
    const per={};
    for(const c of daily){(per[gk[c]]=per[gk[c]]||[]).push(c);}
    for(const k in per){
      const r=per[k].map(c=>rank[c]);
      for(let i=1;i<r.length;i++)if(r[i]<r[i-1])return '그룹 '+k+' 안 순서 어긋남: '+per[k].join(',');
    }
    /* ② 그룹이 뭉쳐 있고, 그룹 순서가 첫 루틴 순위를 따르는가 */
    const seq=[],firsts=[];
    for(const c of daily){const k=gk[c];if(seq[seq.length-1]!==k){if(seq.indexOf(k)>=0)return '그룹 '+k+' 이 흩어짐';seq.push(k);firsts.push(rank[c]);}}
    for(let i=1;i<firsts.length;i++)if(firsts[i]<firsts[i-1])return '그룹 순서 어긋남: '+seq.join('>');
    return '';
  }
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(400);
  const d1=await dailyCodes(p);
  const gk=await gkeyMap(p);
  const mode=await p.evaluate(()=>rtGroupMode());
  ok('D0 기본은 순서대로',mode==='order',mode);
  ok('D1 데일리에 루틴이 뜬다',d1.length>=5,d1.join(','));
  /* 🔒 순서대로 모드 = 설계 순서를 그대로 복사한다. 그룹이 끼어들면 안 된다. */
  const dueOrder=await p.evaluate(()=>routinesForDay(curDate()).map(r=>r.code));
  ok('D2 데일리가 설계 순서 그대로다',d1.join(',')===dueOrder.join(','),d1.join(',')+' vs '+dueOrder.join(','));
  const noHd=await p.evaluate(()=>document.querySelectorAll('#v-daily .rghd').length);
  ok('D2b 순서대로일 땐 그룹 머리글이 없다',noHd===0,noHd);
  ok('D2c 정렬 토글이 보인다',await p.evaluate(()=>document.querySelectorAll('#v-daily .rsort').length===2));

  /* 맨 아래를 맨 위로 5번 올린다 → 데일리 그룹 순서까지 뒤집히는가 */
  await p.click('.m[data-v="goal"]');await p.waitForTimeout(300);
  for(let i=0;i<5;i++){
    await p.evaluate(()=>rtMove('r6',-1));await p.waitForTimeout(120);
  }
  const m2=await matrixCodes(p);
  ok('D3 E.8B 가 맨 위로 올라온다',m2[0]==='E.8B',m2.join(','));
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(400);
  const d2=await dailyCodes(p);
  ok('D4 데일리도 E.8B 가 맨 위',d2[0]==='E.8B',d2.join(','));
  const dueOrder2=await p.evaluate(()=>routinesForDay(curDate()).map(r=>r.code));
  ok('D5 바뀐 설계 순서를 그대로 따른다',d2.join(',')===dueOrder2.join(','),d2.join(',')+' vs '+dueOrder2.join(','));

  /* 🔒 '목표별' 모드로 바꾸면 그룹이 살아나고, 그 안에서 순서를 지킨다 */
  await p.evaluate(()=>setRtGroupMode('goal'));await p.waitForTimeout(350);
  const d3=await dailyCodes(p);
  const hd=await p.evaluate(()=>document.querySelectorAll('#v-daily .rghd').length);
  ok('D6 목표별로 바꾸면 그룹 머리글이 생긴다',hd>=2,hd);
  ok('D7 그룹 안에서는 설계 순서를 지킨다',follows(d3,m2,gk)==='',follows(d3,m2,gk));
  ok('D8 모드가 저장된다',await p.evaluate(()=>DB.ui.dailyGroup==='goal'));
  await p.evaluate(()=>setRtGroupMode('order'));await p.waitForTimeout(350);
  const d4=await dailyCodes(p);
  ok('D9 되돌리면 다시 일렬',d4.join(',')===dueOrder2.join(','),d4.join(','));

  /* ── E. 전체 루틴 목록도 같은 순서 ── */
  await p.click('.m[data-v="goal"]');await p.waitForTimeout(300);
  await p.click('#routineListBtn');await p.waitForTimeout(300);
  const li=await p.evaluate(()=>[].map.call(document.querySelectorAll('#modal .row .gcode'),n=>n.textContent.trim()));
  ok('E1 전체 목록이 뜬다',li.length===6,li.join(','));
  ok('E2 전체 목록도 같은 순서',li.join(',')===m2.join(','),li.join(',')+' vs '+m2.join(','));
  await p.evaluate(()=>closeModal());await p.waitForTimeout(200);

  /* ── F. 경계: 맨 위에서 더 올리거나 맨 아래에서 더 내려도 안 깨진다 ── */
  const before=await p.evaluate(()=>routinesSorted().map(r=>r.code).join(','));
  await p.evaluate(()=>{rtMove(routinesSorted()[0].id,-1);
                        rtMove(routinesSorted()[routinesSorted().length-1].id,1);});
  await p.waitForTimeout(250);
  const after=await p.evaluate(()=>routinesSorted().map(r=>r.code).join(','));
  ok('F1 경계 밖으로는 안 나간다',after===before,after);
  const noDup=await p.evaluate(()=>{const o=DB.routines.map(r=>r.order);
    return o.length===new Set(o).size && Math.min.apply(null,o)===1 && Math.max.apply(null,o)===o.length;});
  ok('F2 번호 중복·구멍 없음',noDup===true);

  /* ── G. 새 루틴은 맨 아래로 ── */
  const g=await p.evaluate(()=>{
    routineModal(null);
    document.getElementById('rt_title').value='새 루틴';
    saveRoutine(null);
    const s=routinesSorted();
    return {last:s[s.length-1].title,n:s.length,ord:s[s.length-1].order};
  });
  ok('G1 새 루틴이 맨 아래',g.last==='새 루틴',g.last);
  ok('G2 번호가 이어진다',g.ord===g.n,`${g.ord}/${g.n}`);

  ok('Z JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── H. 이미 기준을 잡은 판은 다시 안 건드린다 (로한이 정한 순서 보존) ── */
{
  const st=BASE();
  st.meta={rtOrdSeeded:1};
  /* 배열 순서: E.8A, B.8A, D3, B1, E.8B, C.8A → 여기에 아래 번호를 그대로 먹인다.
     기대: B.8A(1) · B1(2) · E.8A(3) · C.8A(4) · E.8B(5) · D3(6) */
  st.routines.forEach((r,i)=>{r.order=[3,1,6,2,5,4][i];});   /* 로한이 정해 놓은 임의 순서 */
  const {b,p,errs}=await boot(st);
  const r=await p.evaluate(()=>routinesSorted().map(x=>x.code).join(','));
  ok('H1 로한이 정한 순서를 유지한다',r==='B.8A,B1,E.8A,C.8A,E.8B,D3',r);
  ok('H2 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── I. order 에 구멍·중복이 나 있어도 상대 순서를 지키며 번호만 조인다 ── */
{
  const st=BASE();
  st.meta={rtOrdSeeded:1};
  /* r5=E.8A:10, r1=B.8A:10(중복), r4=D3:99, r2=B1(없음), r6=E.8B:3, r3=C.8A:3(중복) */
  st.routines[0].order=10; st.routines[1].order=10; st.routines[2].order=99;
  st.routines[4].order=3;  st.routines[5].order=3;
  const {b,p,errs}=await boot(st);
  const r=await p.evaluate(()=>({
    codes:routinesSorted().map(x=>x.code).join(','),
    dense:(()=>{const o=DB.routines.map(x=>x.order);
      return o.length===new Set(o).size&&Math.min.apply(null,o)===1&&Math.max.apply(null,o)===o.length;})()
  }));
  /* order 없음(0) → B1 이 맨 앞. 그다음 3 동률(C.8A·E.8B)은 코드순, 10 동률(B.8A·E.8A)도 코드순, 99 는 D3 */
  ok('I1 상대 순서 유지 + 동률은 코드순',r.codes==='B1,C.8A,E.8B,B.8A,E.8A,D3',r.codes);
  ok('I2 1..N 로 촘촘해진다',r.dense===true);
  ok('I3 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── J. 데일리 상단 일진 — 길/흉/평 + 말풍선 (사주 페이지와 같은 판정·같은 키) ── */
{
  const st=BASE();
  st.saju={birth:{solar:'1986-05-10',lunar:'1986-04-02',gender:'M'},
    natal:{year:'丙寅',month:'癸巳',day:'甲寅',hour:'乙亥'},ilgan:'甲',gongmang:['子','丑'],gyeok:'식신격',
    daeun:{startAge:9,dir:'순행',list:[[9,'甲午'],[19,'乙未'],[29,'丙申'],[39,'丁酉']]},
    readings:{}};
  const {b,p,errs}=await boot(st);

  /* 판정 규칙 — 충·형이 있으면 凶, 합 계열만 있으면 吉, 아무것도 없으면 平 */
  const v=await p.evaluate(()=>{
    const mk=fl=>dayVerdict({flags:fl});
    return {
      chung:mk([{t:'충'}]).k, hyeong:mk([{t:'형'}]).k, ganchung:mk([{t:'천간충'}]).k,
      hap:mk([{t:'합'}]).k, samhap:mk([{t:'삼합'}]).k, banhap:mk([{t:'반합'}]).k,
      none:mk([]).k, gongmang:mk([{t:'공망'}]).k,
      mixed:mk([{t:'충'},{t:'합'}]).k,          /* 충이 있으면 합이 있어도 凶 */
      marks:[mk([{t:'충'}]).mark,mk([{t:'합'}]).mark,mk([]).mark]
    };
  });
  ok('J1 충·형·천간충 → 凶',v.chung==='bad'&&v.hyeong==='bad'&&v.ganchung==='bad',
     `${v.chung}/${v.hyeong}/${v.ganchung}`);
  ok('J2 합·삼합·반합 → 吉',v.hap==='good'&&v.samhap==='good'&&v.banhap==='good',
     `${v.hap}/${v.samhap}/${v.banhap}`);
  ok('J3 아무것도 없으면 平',v.none==='neu',v.none);
  ok('J4 공망만 있으면 平',v.gongmang==='neu',v.gongmang);
  ok('J5 충이 섞이면 합이 있어도 凶',v.mixed==='bad',v.mixed);
  /* ⚠️ ⚔/⚜ 는 폰트에 따라 두부(□)로 뜬다 — 한자만 쓴다. */
  ok('J6 표기가 凶/吉/平',v.marks.join(',')==='凶,吉,平',v.marks.join(','));

  /* 화면 */
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(400);
  const ui=await p.evaluate(()=>{
    const e=document.querySelector('#v-daily .dsaju');
    return e?{html:e.innerHTML,badge:!!e.querySelector('.fbadge'),bub:!!e.querySelector('.bub'),
              tip:e.getAttribute('title')}:null;
  });
  ok('J7 데일리 상단에 일진 블록이 있다',ui!==null);
  ok('J8 길흉 뱃지가 붙는다',ui&&ui.badge===true);
  ok('J9 말풍선이 붙는다',ui&&ui.bub===true);
  ok('J10 근거가 툴팁에 들어간다',ui&&typeof ui.tip==='string'&&ui.tip.length>0,ui&&ui.tip);

  /* 🔒 사주 페이지와 같은 키를 쓴다 — 저장된 해석이 데일리에서 켜져야 한다 */
  const off=await p.evaluate(()=>document.querySelector('#v-daily .bub').classList.contains('on'));
  ok('J11 해석이 없으면 말풍선 꺼짐',off===false);
  const on=await p.evaluate(()=>{
    const d=curDate();
    DB.saju.readings['day:'+d]={text:'테스트 해석',savedAt:d};
    renderDaily();
    return document.querySelector('#v-daily .bub').classList.contains('on');
  });
  ok('J12 사주 페이지에 저장된 day: 해석이 데일리에서 켜진다',on===true);
  const opened=await p.evaluate(()=>{
    document.querySelector('#v-daily .bub').click();
    const h=document.getElementById('modal').innerHTML;
    closeModal(); return h.indexOf('테스트 해석')>=0;
  });
  ok('J13 눌러서 해석을 읽을 수 있다',opened===true);

  /* 🔒 사주 페이지가 같은 함수를 쓰는가 — 두 벌로 갈라지면 반드시 어긋난다 */
  const dup=await p.evaluate(()=>{
    const src=renderSaju.toString();
    return src.indexOf('dayVerdictBadge')>=0 && src.indexOf("f.t==='충'")<0;
  });
  ok('J14 사주 페이지도 dayVerdictBadge 를 쓴다 (판정 중복 없음)',dup===true);

  ok('J15 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t30 루틴 순서·일진 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
