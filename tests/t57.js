/* t57 — 🏛 2027 대사주토론분석회 탭 (v4.62 · 사주방 핸드오프 saju-summit-2027 v2)
   🔒 서버 규칙(블라인드·잠금·falsify·로한만 결재)은 DB 에서 직접 검산했다(롤백). 여기서는
      **화면이 그 규칙을 거스르지 않는지**만 본다:
      ① 봉인된 제출은 화면에도 내용이 없다(글자 수·영역 수도 안 새어 나간다)
      ② 쟁점을 다 골라야 결재 단추가 켜진다 — 「둘 다」 기본값이 없다
      ③ 합의·쟁점 색은 **짐작이 아니라** 최종안 / R2 의 동의·반대에서만 나온다
      ④ 기존 사주 화면은 첫 탭에 그대로 있다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=()=>({schemaVersion:7,ui:{month:'2026-10'},
 timelog:{},accounts:[],cards:[],categories:[],transactions:[],meals:{},checks:{},
 goals:[],routines:[],rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],
 netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

/* v4.65 — 양력 m 1~12 · 1월=전년 丑월(辛丑) · 절입 시각(서버 saju_months_solar) */
const GZ=['辛丑','壬寅','癸卯','甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子'].map((g,i)=>({m:i+1,branch:g[1],ganji:g,jieqi:['소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설'][i],jieqi_kst:String(i+1).padStart(2,'0')+'-05 10:00',near_midnight:i===10}));
const AREA=(a,c,f)=>({area:a,claim:c,falsify:f,confidence:'중'});
const read=(over)=>Object.assign({
  summit:{year:2027,dry:false,phase:'r1',frozen_at:'2026-10-31T23:59:00Z',approved_at:null,choices:null,skipped:[]},
  dossier:{known:'2027-02 이사'},ganji:{year:'丁未',months:GZ},
  rounds:[{round:1,open:false,claude:{submitted:true,sealed:true},suyeon:{submitted:false,absent:false}},
          {round:2,open:false,claude:{submitted:false},suyeon:{submitted:false}},
          {round:3,open:false,claude:{submitted:false},suyeon:{submitted:false}}],
  finals:[],sign:null},over||{});

let __BR=null;
async function boot(){
  if(!__BR)__BR=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const c=await __BR.newContext({viewport:{width:1440,height:1100}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;window.__rpc=[];window.__rpcRes={};
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   /* 🔒 RPC 는 부른 기록을 남기고, 테스트가 정한 응답을 돌려준다 */
   const rpc=(fn,args)=>{window.__rpc.push({fn:fn,args:args});
     const r=window.__rpcRes[fn];return Promise.resolve(typeof r==='function'?r(args):(r||{data:null,error:null}));};
   window.supabase={createClient:()=>({from:()=>q,rpc:rpc,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:BASE()});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);
  await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.saju,null,{timeout:15000});
  return {b:c,p,errs};
}
const show=async(p,data)=>{
  await p.evaluate(d=>{window.__rpcRes.summit_read=typeof d==='string'?{data:null,error:{message:d}}:{data:d,error:null};
    SM.data=null;SM.err='';SM.pick={};gotoTab('saju');sjSetTab('summit');},data);
  await p.waitForTimeout(250);
  return p.$eval('#v-saju',e=>e.textContent);
};

(async()=>{
 const {b,p,errs}=await boot();

 /* ── A. 탭 — 기존 화면은 첫 탭에 그대로 ── */
 const main=await p.evaluate(()=>{gotoTab('saju');sjSetTab('main');
   return {tabs:[...document.querySelectorAll('#v-saju .logtabs button')].map(x=>x.textContent.trim()),
           txt:document.querySelector('#v-saju').textContent};});
 ok('A1 사주 페이지에 탭이 둘이다',main.tabs.length===2&&/사주/.test(main.tabs[0])&&/대토론/.test(main.tabs[1]),JSON.stringify(main.tabs));
 ok('A2 🔒 기존 사주 화면(총운·대운)은 첫 탭에 그대로 있다',main.txt.indexOf('총운')>=0&&main.txt.indexOf('대운')>=0);

 /* ── B. 대회가 없으면 「열기」 ── */
 const none=await show(p,'SUMMIT: 2027년 대회가 없다 — summit_open 으로 연다');
 ok('B1 대회가 없으면 고장이 아니라 「열기」를 준다',none.indexOf('대회 열기')>=0&&none.indexOf('⚠')<0,none.slice(0,120));
 const err=await show(p,'network down');
 ok('B2 진짜 오류는 오류라고 말한다',err.indexOf('⚠')>=0&&err.indexOf('network down')>=0);
 const called=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_read').map(x=>x.args));
 ok('B3 🔒 로한은 member=rohan 으로 읽는다 (블라인드는 서버가 지킨다)',
    called.length>0&&called.every(a=>a.p_member==='rohan'&&a.p_year===2027),JSON.stringify(called.slice(-1)));

 /* ── C. 블라인드 — 봉인된 제출은 화면에도 없다 ── */
 const sealed=await show(p,read());
 ok('C1 🔒 봉인된 R1 은 「작성 완료 · 내용 비공개」만 보인다',sealed.indexOf('작성 완료 · 내용 비공개')>=0);
 ok('C2 로한도 못 본다고 말한다',sealed.indexOf('로한도 내용을 못 본다')>=0);
 const leak=await p.evaluate(()=>{
   const t=document.querySelector('#v-saju .smmx').textContent;
   return {claim:/적자|흑자/.test(t),cnt:/\d+\s*자|영역\s*\d/.test(t)};});
 ok('C3 🔒 내용·글자 수·영역 수가 새지 않는다',!leak.claim&&!leak.cnt,JSON.stringify(leak));
 ok('C4 상대가 아직이면 「작성 중」',sealed.indexOf('작성 중')>=0);
 ok('C5 진행 단계가 R1 에 서 있다',
    (await p.$eval('#v-saju .smstep .now',e=>e.textContent)).indexOf('R1')>=0);

 /* ── D. 둘 다 내면 열린다 — 합의·쟁점은 R2 에서만 판정 ── */
 const r1={submitted:true,submitted_at:'2026-11-01T09:12:00Z',content:'x',
   structured:{areas:[AREA('재물','상반기 적자','1~6월 흑자 50만↑면 틀림'),AREA('건강','하반기 회복','10월 체중 +3kg 면 틀림')],
               months:GZ.map(g=>({m:g.m,level:g.m===3?'주의':'보통',watch:['월수지']}))}};
 const r1b={submitted:true,submitted_at:'2026-11-01T09:20:00Z',content:'y',
   structured:{areas:[AREA('재물','하반기 흑자','7~12월 적자면 틀림'),AREA('건강','하반기 회복','10월 체중 +3kg 면 틀림'),AREA('관계','새 인연','12월까지 기록 없으면 틀림')],
               months:GZ.map(g=>({m:g.m,level:g.m===3?'기회':'보통',watch:['월수지']}))}};
 const open1=await show(p,read({summit:{year:2027,dry:false,phase:'r2',frozen_at:'x',skipped:[]},
   rounds:[{round:1,open:true,claude:r1,suyeon:r1b},{round:2,open:false,claude:{submitted:false},suyeon:{submitted:false}},{round:3,open:false,claude:{submitted:false},suyeon:{submitted:false}}]}));
 ok('D1 둘 다 내면 양쪽 내용이 열린다',open1.indexOf('상반기 적자')>=0&&open1.indexOf('하반기 흑자')>=0);
 ok('D2 반증 조건도 같이 보인다',open1.indexOf('반증 — 1~6월 흑자 50만↑면 틀림')>=0);
 const colors0=await p.evaluate(()=>[...document.querySelectorAll('#v-saju .smrow')].map(r=>r.className));
 ok('D3 🔒 R2 전에는 합의·쟁점 색을 **짐작으로 칠하지 않는다**',
    colors0.filter(c=>/smag|smdis/.test(c)).length===0,JSON.stringify(colors0));
 ok('D4 한쪽만 다룬 영역은 「한쪽만」',colors0.some(c=>/smone/.test(c)));
 const md=await p.evaluate(()=>({diff:document.querySelectorAll('#v-saju .smm.diff').length,
   head:[...document.querySelectorAll('#v-saju .smmhead .smm')].map(x=>x.textContent)}));
 ok('D5 🔴 월별 12칸은 양력 1~12월 — 1월=辛丑(전년 丑월), 12월=壬子 · 절입이 같이 보인다',md.head.length===12&&/^1월辛丑소한/.test(md.head[0])&&/^12월壬子대설/.test(md.head[11]),JSON.stringify(md.head));
 ok('D5b 자정 근처 절입은 ⚠️',md.head[10].indexOf('⚠️')>=0&&md.head[0].indexOf('⚠️')<0,md.head[10]);
 ok('D6 둘의 판단이 다른 달에 테두리 (3월 주의/기회)',md.diff===2,String(md.diff));
 /* R2 동의·반대가 들어오면 색이 붙는다 */
 await show(p,read({summit:{year:2027,dry:false,phase:'r3',frozen_at:'x',skipped:[]},
   rounds:[{round:1,open:true,claude:r1,suyeon:r1b},
     {round:2,open:true,claude:{submitted:true,structured:{responses:[{area:'재물',stance:'반대',reason:'7월 적자 기록'},{area:'건강',stance:'동의',reason:'같음'}]}},
                        suyeon:{submitted:true,structured:{responses:[{area:'재물',stance:'반대',reason:'x'},{area:'건강',stance:'동의',reason:'같음'}]}}},
     {round:3,open:false,claude:{submitted:false},suyeon:{submitted:false}}]}));
 const colors=await p.evaluate(()=>{const o={};[...document.querySelectorAll('#v-saju .smrow')].forEach(r=>{
   o[r.querySelector('.smarea b').textContent]=r.className;});return o;});
 ok('D7 R2 에서 둘 다 동의 → 합의',/smag/.test(colors['건강']),JSON.stringify(colors));
 ok('D8 반대가 하나라도 있으면 → 쟁점',/smdis/.test(colors['재물']),JSON.stringify(colors));
 /* 🔴 v4.67 — 로한: 「둘다 교차반론을 했는데 그 내용은 왜 안보이지?」 — 접힘 안에만 있었다 */
 const r2v=await p.evaluate(()=>{const rows=[...document.querySelectorAll('#v-saju .smrow')];
   const row=rows.find(r=>r.querySelector('.smarea').textContent.indexOf('재물')>=0);
   const cells=row.querySelectorAll(':scope > span');
   const v=[...row.querySelectorAll('.smr2')].filter(x=>!x.closest('details'));
   return {n:v.length, suyeonCell:cells[2].textContent, inDetails:row.querySelectorAll('details .smr2').length};});
 ok('D9 🔴 R2 반론은 접지 않고 셀 밑에 펼쳐 보인다',r2v.n===2&&r2v.inDetails===0,JSON.stringify(r2v));
 ok('D9b 수연 칸 밑에 로버트의 반론(동의·반대·수정 + 근거)',r2v.suyeonCell.indexOf('로버트 · 반대')>=0&&r2v.suyeonCell.indexOf('7월 적자 기록')>=0,r2v.suyeonCell);
 const orig=await p.evaluate(()=>{const o=document.querySelector('#v-saju .smorig');return o?{t:o.textContent,open:[...o.querySelectorAll('details')].map(d=>d.open)}:null;});
 ok('D10 🔴 라운드 원문(본문)이 보이고, 가장 최근 열린 라운드가 펼쳐져 있다',!!orig&&orig.t.indexOf('R2 교차반론')>=0&&orig.open[orig.open.length-1]===true,JSON.stringify(orig&&orig.open));

 /* ── E. 결재 — 쟁점을 다 골라야 켜진다 ── */
 const fin={id:'f1',submitted_at:'2026-11-01T15:00:00Z',content:'2027 최종안 본문',
   structured:{agreed:[AREA('건강','하반기 회복','10월 체중 +3kg 면 틀림')],
     disputes:[{area:'재물',claude:{claim:'상반기 적자',falsify:'a'},suyeon:{claim:'하반기 흑자',falsify:'b'}},
               {area:'관계',claude:{claim:'변화 없음',falsify:'c'},suyeon:{claim:'새 인연',falsify:'d'}}]}};
 const r4=read({summit:{year:2027,dry:false,phase:'r4',frozen_at:'x',skipped:[]},
   rounds:[{round:1,open:true,claude:r1,suyeon:r1b},{round:2,open:true,claude:{submitted:false},suyeon:{submitted:false}},{round:3,open:true,claude:{submitted:false},suyeon:{submitted:false}}],
   finals:[fin],sign:{decision:'동의',reason:'동의'}});
 const f0=await show(p,r4);
 ok('E1 최종안·합의·쟁점 수가 보인다',f0.indexOf('합의 1 · 쟁점 2')>=0&&f0.indexOf('2027 최종안 본문')>=0);
 const dis0=await p.$eval('#v-saju .smfin button.btn',e=>e.disabled);
 ok('E2 🔒 쟁점을 안 골랐으면 결재 단추가 꺼져 있다',dis0===true);
 await p.evaluate(()=>smChoose('재물','suyeon'));
 const dis1=await p.$eval('#v-saju .smfin button.btn',e=>e.disabled);
 ok('E3 🔒 하나만 골라도 아직 꺼져 있다 (「둘 다 유지」 기본값은 없다)',dis1===true);
 await p.evaluate(()=>smChoose('관계','claude'));
 const dis2=await p.$eval('#v-saju .smfin button.btn',e=>e.disabled);
 ok('E4 다 고르면 켜진다',dis2===false);
 await p.evaluate(()=>{window.__rpcRes.summit_approve={data:{approved:true},error:null};});
 await p.click('#v-saju .smfin button.btn');await p.waitForTimeout(250);
 const ap=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_approve').map(x=>x.args)[0]);
 ok('E5 고른 대로 결재를 보낸다',ap&&ap.p_choices&&ap.p_choices['재물']==='suyeon'&&ap.p_choices['관계']==='claude',JSON.stringify(ap));
 /* 결재 뒤 */
 const done=await show(p,Object.assign({},r4,{summit:{year:2027,dry:false,phase:'done',frozen_at:'x',skipped:[],
   approved_at:'2026-11-01T20:00:00Z',choices:{'재물':'suyeon','관계':'claude'}}}));
 ok('E6 결재되면 잠겼다고 말한다',done.indexOf('결재됨')>=0&&done.indexOf('공식 예측')>=0);
 const locked=await p.evaluate(()=>[...document.querySelectorAll('#v-saju .smfin input[type=radio]')].every(x=>x.disabled));
 ok('E7 🔒 결재 뒤엔 선택을 못 바꾼다',locked===true);
 /* ── J. v4.65 — 사주방 v3 §11 · 수연 §12 ── */
 const pickAll=()=>p.evaluate(()=>{smChoose('재물','suyeon');smChoose('관계','claude');});
 await show(p,Object.assign({},r4,{sign:null,signs:[]}));await pickAll();
 const j1=await p.evaluate(()=>({dis:document.querySelector('#v-saju .smfin button.btn').disabled,t:document.querySelector('#v-saju').textContent}));
 ok('J1 🔴 수연 서명이 없으면 쟁점을 다 골라도 결재가 꺼져 있다',j1.dis===true&&j1.t.indexOf('서명(동의·이의)이 있어야 결재된다')>=0,j1.t.slice(0,80));
 await show(p,Object.assign({},r4,{sign:null,signs:[{decision:'동의',final_id:'old'}]}));await pickAll();
 const j2=await p.evaluate(()=>({dis:document.querySelector('#v-saju .smfin button.btn').disabled,t:document.querySelector('#v-saju').textContent}));
 ok('J2 🔴 옛 안에만 서명했으면 「새 안에 다시 서명」이라 말하고 꺼져 있다',j2.dis===true&&j2.t.indexOf('옛 최종안에 있다')>=0);
 await show(p,Object.assign({},r4,{sign:null,signs:[],suyeon_absent:true}));await pickAll();
 ok('J3 수연 R1 결석이면 서명 없이 결재된다',(await p.$eval('#v-saju .smfin button.btn',e=>e.disabled))===false);
 await show(p,Object.assign({},r4,{sign:{decision:'이의',reason:'근거 부족',final_id:'f1'}}));await pickAll();
 const j4=await p.evaluate(()=>({dis:document.querySelector('#v-saju .smfin button.btn').disabled,t:document.querySelector('#v-saju').textContent}));
 ok('J4 이의면 결재는 되고, 이의가 같이 잠긴다고 말한다',j4.dis===false&&j4.t.indexOf('이의와 사유가 같이 잠긴다')>=0);
 const rc=JSON.parse(JSON.stringify(r4)); rc.rounds[0].claude.structured.chains=['이사 → 통근 감소','b','c','d',{path:'e → f'}];
 rc.rounds[0].claude.structured.risks=[{event:'부모 건강',prob:'낮음',impact:'높음',path:'공부 리듬'}];
 rc.areas=['총운','재물','건강','시험학업','일사업','관계','가족','이동주거']; rc.month_rule='「주의」 달은 watch 지표가 나쁘면 적중';
 rc.reads={total:5,leak_risk:[{member:'suyeon',via:'server',phase:'r1',at:'2026-11-01T09:00:00Z'}]};
 const j5=await show(p,rc);
 ok('J5 연쇄·저확률고충격이 보인다(수연 §12)',j5.indexOf('이사 → 통근 감소')>=0&&j5.indexOf('e → f')>=0&&j5.indexOf('깨지는 경로 — 공부 리듬')>=0);
 ok('J6 영역은 서버 정본 · 화면에만 가운뎃점',j5.indexOf('시험·학업')>=0&&j5.indexOf('가족·집안')>=0);
 ok('J7 월별 판정 규칙(지금 고정)을 보인다',j5.indexOf('판정 규칙(지금 고정)')>=0&&j5.indexOf('watch 지표가 나쁘면')>=0);
 ok('J8 🔍 블라인드가 샐 수 있는 읽기를 숨기지 않는다',j5.indexOf('그 이름으로 읽은 기록 1건')>=0&&j5.indexOf('본인 확인일 수도')>=0);
 const rs=JSON.parse(JSON.stringify(r4)); rs.rounds[1]={round:2,open:false,claude:{submitted:true,sealed:true},suyeon:{submitted:false}};
 await show(p,rs);
 ok('J9 🔒 R2 가 안 열렸으면(한쪽만 냄) 반론을 그리지 않는다',await p.evaluate(()=>document.querySelectorAll('#v-saju .smr2').length===0));
 const n0=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_read').length);
 await p.evaluate(()=>{sjSetTab('main');sjSetTab('summit');});await p.waitForTimeout(200);
 ok('J10 🔴 대토론 탭에 다시 들어오면 새로 읽는다(다른 방 제출이 보이게)',(await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_read').length))>n0);



 /* ── F. R0 — 로한 몫(2027 known)과 결석 처리 ── */
 const r0=await show(p,read({summit:{year:2027,dry:false,phase:'r0',frozen_at:null,skipped:[]},dossier:{}}));
 ok('F1 R0 에서 2027 known 을 적을 수 있다',!!(await p.$('#smKnown'))&&r0.indexOf('적중으로 세지 않는다')>=0);
 await p.evaluate(()=>{document.getElementById('smKnown').value='2027-02 이사';smKnownSave(true);});
 await p.waitForTimeout(200);
 const dz=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_dossier').map(x=>x.args).slice(-1)[0]);
 ok('F2 동결하면 known 을 담아 보낸다',dz&&dz.p_freeze===true&&dz.p_dossier.known==='2027-02 이사',JSON.stringify(dz));

 /* 🔴 v4.66 — 실전 2027 R0: 사주방이 known 을 known_2027(JSON 문자열)에 넣었다 */
 const DOS={'원국':'丙寅 癸巳 甲寅 乙亥','known_2027':JSON.stringify({'가족':['남동생 결혼 2027-04-24(토)'],'주거이동':['2026-12-31 계약 종료']}),'변수풀_41세남성_1년':'{\"A\":[\"원생 증감\"]}'};
 const k0=await show(p,read({summit:{year:2027,dry:false,phase:'r0',frozen_at:null,skipped:[]},dossier:DOS,known_text:'[known_2027] {…}'}));
 ok('F4 🔴 자료팩이 차 있으면 「모으는 중」이 아니라 「n칸 적재됨」',k0.indexOf('자료팩 3칸 적재됨')>=0&&k0.indexOf('모으는 중')<0,k0.slice(0,200));
 ok('F5 🔴 사주방 known_2027 이 「잠길 known」에 펼쳐 보인다(JSON 괄호 덩어리가 아니다)',k0.indexOf('남동생 결혼 2027-04-24(토)')>=0&&k0.indexOf('{\"가족')<0);
 ok('F6 로한 입력칸은 「추가 known」 — 비어 있다',await p.evaluate(()=>document.getElementById('smKnown').value===''));
 await p.evaluate(()=>{document.getElementById('smKnown').value='';smKnownSave(false);});await p.waitForTimeout(200);
 const dz2=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_dossier').map(x=>x.args).slice(-1)[0]);
 ok('F7 🔒 비운 채 저장해도 빈 known 칸을 만들지 않고, 사주방 칸은 그대로 보낸다',dz2&&!('known' in dz2.p_dossier)&&dz2.p_dossier.known_2027===DOS.known_2027,JSON.stringify(dz2&&Object.keys(dz2.p_dossier)));
 const k1=await p.evaluate(()=>document.querySelector('#v-saju').textContent);
 ok('F8 자료팩의 JSON 문자열도 펼친다',k1.indexOf('원생 증감')>=0);
 const absent=await show(p,read({summit:{year:2027,dry:false,phase:'r2',frozen_at:'x',skipped:[{round:1,author:'suyeon'}]},
   rounds:[{round:1,open:true,claude:r1,suyeon:{submitted:false,absent:true}},{round:2,open:false,claude:{submitted:false},suyeon:{submitted:false}},{round:3,open:false,claude:{submitted:false},suyeon:{submitted:false}}]}));
 ok('F3 결석은 결석이라고 쓴다 (동의로 치지 않는다)',absent.indexOf('결석')>=0);

 /* ── G. 드라이런 ── */
 await p.evaluate(()=>smDry(true));await p.waitForTimeout(200);
 const dr=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='summit_read').slice(-1)[0].args);
 ok('G1 드라이런은 dry=true 로 따로 읽는다',dr.p_dry===true,JSON.stringify(dr));

 /* ── H. 🔴 예측 머리가 「로버트」로 박혀 있었다 — 대토론 합의안을 로버트 것이라 적게 된다 ── */
 const au=await p.evaluate(()=>{
   ST_DRILL=null; SM.data=null; sjSetTab('main');
   const st=todayStr().slice(0,7)+'-01';
   const mk=(id,author,v)=>({id:id,author:author,version:v,period_type:'month',target_start:st,
     target_end:st,status:'locked',timing:'prior',timing_trust:'server',locked_at:'2026-10-01T00:00:00Z',
     content:'본문 '+author,known:'없음',structured:null,legacy:false});
   SJ.fc=[mk('a','claude',1),mk('b','suyeon',2),mk('c','consensus',3)]; SJ.ev={};
   SJ.notes=[{forecast_id:'c',kind:'event',note_date:'2026-10-15',body:'[일정변경·known 정정] 풍무고 커피차 10/16 → 취소. 10/16 항목 평가 제외'},
             {forecast_id:'c',kind:'event',note_date:'2026-10-14',body:'[일진 오류 고지 — 로버트 자기신고] 일진 근거가 틀렸다'},
             {forecast_id:'c',kind:'intervention',note_date:'2026-10-02',body:'개입'}];
   renderSaju();
   const t=document.querySelector('#v-saju').textContent;
   return {t:t,who:(document.querySelector('#v-saju .sjwho')||{}).textContent||'',
     tags:[...document.querySelectorAll('#v-saju .sjexcl')].map(x=>x.textContent)};});
 ok('H1 🔴 합의안은 「대토론 합의안」이라고 적는다 (로버트라고 적지 않는다)',/대토론 합의안/.test(au.who),au.who);
 ok('H2 같은 기간 다른 작성자는 「이전 버전」이 아니라 따로 적는다',
    au.t.indexOf('같은 기간 다른 작성자')>=0&&au.t.indexOf('이전 버전')<0,au.t.slice(0,160));
 /* 🔴 event 메모가 화면 어디에도 안 나왔다 */
 ok('H3 🔴 정정·고지 메모가 예측 밑에 보인다',au.t.indexOf('정정·고지 2건')>=0&&au.t.indexOf('풍무고 커피차')>=0);
 ok('H4 평가 제외 메모엔 「평가 제외 · 일정 변경」 배지',au.tags.indexOf('평가 제외 · 일정 변경')>=0,JSON.stringify(au.tags));
 ok('H5 일진 오류 고지엔 「일진 오류」 배지',au.tags.indexOf('일진 오류')>=0,JSON.stringify(au.tags));
 /* ── I. 일진 말풍선 — 서버 계산 간지와 대조(§6②) ── */
 const gz=async(text)=>{
   await p.evaluate(tx=>{window.__rpcRes.saju_ganji={data:'己巳',error:null};
     DB.saju.readings=DB.saju.readings||{}; DB.saju.readings['day:2026-10-22']={text:tx,savedAt:'x'};
     sajuRead('day:2026-10-22','10/22');},text);
   await p.waitForTimeout(200);
   const t=await p.evaluate(()=>(document.getElementById('sjGzChk')||{}).textContent||'');
   await p.evaluate(()=>closeModal()); return t;};
 const g1=await gz('오늘은 丁卯일이다. 寅申충.');
 ok('I1 서버가 계산한 일진을 찍는다',g1.indexOf('己巳')>=0,g1);
 ok('I2 🔴 본문 간지가 서버와 다르면 ⚠️ (손계산 의심)',g1.indexOf('⚠️')>=0&&g1.indexOf('丁卯')>=0,g1);
 const g2=await gz('오늘은 己巳일. 월건 戊戌.');
 ok('I3 본문에 서버 일진이 있으면 일치로 본다',g2.indexOf('일치')>=0&&g2.indexOf('⚠️')<0,g2);
 const called2=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='saju_ganji').map(x=>x.args.p_date));
 ok('I4 🔒 간지는 앱이 계산하지 않고 서버 함수에 묻는다',called2.length>=2&&called2.every(d=>d==='2026-10-22'),JSON.stringify(called2));
 ok('Z 에러 0',errs.length===0,errs.join(' | '));
 await b.close(); await __BR.close();
 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
