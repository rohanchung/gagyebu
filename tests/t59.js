/* t59 — 📝 마크다운 렌더러 v2 (v4.69 · handoff-renderer v1)
   로한: 「** 이거 다 뭐냐고」 — 실측 핸드오프 29개 중 표 23 · 인용 8 · 코드 블록 16 이 기호 덩어리로 보였다.
   🔒 불변식:
      A 이스케이프가 먼저다 — 서버 본문의 <script>·onerror 가 어디서도(표·인용·코드·하이라이트) 살아나지 않는다
      B 표는 머리줄 + 구분줄이 있어야 표다. 구분줄 없는 | 줄은 그냥 글이다
      C 코드 블록 안은 그대로 — 제목·목록·굵게 규칙을 적용하지 않는다. 인라인 코드 안의 ** 도 그대로
      D 색 규약 — 이모지로 「시작하는」 줄·항목·표 행만 색 띠. 문장 중간 이모지는 안 건드린다
      E 렌더러는 하나 — 대토론 본문(라운드 원문·최종안)도 mdRender 를 탄다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext();
  await ctx.addInitScript(()=>{const store={v:{schemaVersion:7,ui:{},transactions:[],accounts:[],cards:[],categories:[]}};
   function mk(){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;return Promise.resolve({data:[{updated_at:null}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:()=>mk(),rpc:()=>Promise.resolve({data:null,error:null}),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  const R=(src)=>p.evaluate(s=>{const d=document.createElement('div');d.innerHTML=mdRender(s);document.body.appendChild(d);
    const o={html:d.innerHTML,text:d.textContent,
      tables:d.querySelectorAll('table.mdtb').length,th:[...d.querySelectorAll('th')].map(x=>x.textContent),
      td:[...d.querySelectorAll('td')].map(x=>x.textContent),q:d.querySelectorAll('blockquote.mdq').length,
      pre:[...d.querySelectorAll('pre.mdpre')].map(x=>x.textContent),b:[...d.querySelectorAll('b')].map(x=>x.textContent),
      mark:[...d.querySelectorAll('mark')].map(x=>x.textContent),code:[...d.querySelectorAll('code')].map(x=>x.textContent),
      cls:[...d.querySelectorAll('[class*="mdc-"]')].map(x=>x.className),scripts:d.querySelectorAll('script,img,[onerror]').length};
    d.remove();return o;},src);

  /* A 보안 */
  const x=await R('| a | b |\n|---|---|\n| <script>x</script> | <img src=x onerror=alert(1)> |\n\n> <b>hi</b>\n\n```\n<script>y</script>\n```\n\n==<img onerror=1>==');
  ok('A1 🔒 표·인용·코드·하이라이트 어디서도 태그가 살아나지 않는다',x.scripts===0&&x.text.indexOf('<script>x</script>')>=0&&x.text.indexOf('<script>y</script>')>=0,x.html.slice(0,200));

  /* B 표 */
  const t=await R('| 구분 | A 통지대로 | B |\n|---|---|---|\n| 총수입 | **58,500,000** | 63,954,543 |\n| 🔴 세액 | `tax_x` | 0 |');
  ok('B1 머리줄 + 구분줄 → 표',t.tables===1&&t.th.join('/')==='구분/A 통지대로/B',JSON.stringify(t.th));
  ok('B2 칸 안의 굵게·코드도 렌더링',t.b.indexOf('58,500,000')>=0&&t.code.indexOf('tax_x')>=0&&t.text.indexOf('**')<0&&t.text.indexOf('|')<0);
  ok('B3 🔴 로 시작하는 행에 색 띠',t.cls.indexOf('mdc-r')>=0,JSON.stringify(t.cls));
  const nt=await R('| 그냥 | 파이프 글 |\n다음 줄');
  ok('B4 구분줄이 없으면 표가 아니다(그냥 글)',nt.tables===0&&nt.text.indexOf('그냥')>=0);
  const al=await R('| a | b |\n|:---|---:|\n| 1 | 2 |');
  ok('B5 정렬 구분줄(:---:)도 표',al.tables===1&&al.td.join('/')==='1/2');
  const ep=await R('| 문법 | 쓰는 법 |\n|---|---|\n| 표 | `\\| a \\| b \\|` 다음 줄 |');
  ok('B6 \\| 는 칸 나눔이 아니라 글자 | (GFM) — 표 안에서 표 문법을 설명할 수 있다',ep.td.length===2&&ep.td[1].indexOf('| a | b |')>=0,JSON.stringify(ep.td));

  /* C 코드 */
  const c=await R('```sql\n## 제목 아님\n- 목록 아님\nselect **x**;\n```\n뒤 `a**b**c` 끝');
  ok('C1 🔒 코드 블록 안은 그대로(제목·목록·굵게 규칙 없음)',c.pre.length===1&&c.pre[0]==='## 제목 아님\n- 목록 아님\nselect **x**;',JSON.stringify(c.pre));
  ok('C2 🔒 인라인 코드 안의 ** 는 굵게가 아니다',c.code.indexOf('a**b**c')>=0&&c.b.length===0,JSON.stringify(c));
  const uc=await R('```\n열린 채 끝');
  ok('C3 닫히지 않은 코드 블록도 터지지 않는다',uc.pre.length===1&&uc.pre[0]==='열린 채 끝');

  /* 인용·하이라이트·기존 문법 */
  const q=await R('> 로한: 「** 이거 다 뭐냐고」\n> 둘째 줄\n\n본문 ==중요== 끝\n\n## 🟠 미해결\n- 🟢 확정 항목\n- 일반 🔴 중간\n1. ⚫ 규칙\n---\n🔵 정보 줄');
  ok('D0 인용 두 줄 → 하나의 인용',q.q===1);
  ok('D1 ==하이라이트== → mark',q.mark.join()==='중요');
  ok('D2 🔒 이모지로 시작하는 제목·항목·줄만 색 띠 · 문장 중간 이모지는 그대로',
     q.cls.filter(x=>/mdc-o/.test(x)).length===1&&q.cls.filter(x=>/mdc-g/.test(x)).length===1&&q.cls.filter(x=>/mdc-k/.test(x)).length===1
     &&q.cls.filter(x=>/mdc-b/.test(x)).length===1&&q.cls.filter(x=>/mdc-r/.test(x)).length===0,JSON.stringify(q.cls));
  ok('D3 별표가 화면에 남지 않는다(굵게만 있는 줄)',(await R('**-515,906** 적자')).text==='-515,906 적자');

  /* E 대토론 본문도 같은 렌더러 */
  const e=await p.evaluate(()=>{
    SM.data={summit:{year:2027,dry:false,phase:'r4',frozen_at:'x',skipped:[]},dossier:{},ganji:{months:[]},
      rounds:[{round:1,open:true,claude:{submitted:true,content:'**굵은 총론**\n| a | b |\n|---|---|\n| 1 | 2 |',structured:{areas:[]}},suyeon:{submitted:true,content:'> 인용',structured:{areas:[]}}},
              {round:2,open:false,claude:{submitted:false},suyeon:{submitted:false}},{round:3,open:false,claude:{submitted:false},suyeon:{submitted:false}}],
      finals:[{id:'f',content:'**최종 굵게**',structured:{agreed:[],disputes:[]}}],sign:null,signs:[]};
    DB.ui=DB.ui||{};DB.ui.sajuTab='summit';
    const h=renderSummit();const d=document.createElement('div');d.innerHTML=h;
    return {orig:d.querySelector('.smorig').textContent,bold:[...d.querySelectorAll('.smorig b,.smfintx b')].map(x=>x.textContent),tb:d.querySelectorAll('.smorig table').length,q:d.querySelectorAll('.smorig blockquote').length};});
  ok('E1 🔴 대토론 라운드 원문도 렌더링(별표·파이프가 안 보인다)',e.bold.indexOf('굵은 총론')>=0&&e.tb===1&&e.q===1&&e.orig.indexOf('**')<0,JSON.stringify(e));
  ok('E2 최종안 본문도 렌더링',e.bold.indexOf('최종 굵게')>=0);
  ok('Z 콘솔 에러 0',errs.length===0,errs.join('|'));
 }finally{await b.close();}
 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
