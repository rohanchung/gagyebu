/* t80 — 🧭 화면 틀 계약 (v4.81 · ui-frame-plan.md)
   로한: 「UI가 전 페이지가 통일화 됐으면 좋겠거든? … 헤더, 레이어1, 레이어2, 본문 … 모바일도 똑같은 개념으로」
   🔒 모든 페이지 × (1440 · 390):
      F1 헤더(.phead)가 정확히 하나 · 페이지 제목 h1 이 정확히 하나 — 네비 이름과 같다
      F2 칸 순서 = 헤더 → L1 → L2 → 본문 (빈 칸은 접는다)
      F3 KPI 는 4개 이하
      F4 가로 넘침 없음
      F5 옛 페이지 제목 블록(.emrhead · .aghd · h2)이 남아 있지 않다
      F6 고정 — 데스크톱: 헤더 sticky · 모바일: 헤더는 풀리고 L1 이 sticky
   🔒 긴 페이지 L1: 계좌·부채 4탭 · 체성분·사고 2탭 · 보험 3탭 — 탭마다 그 카드만 보인다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  for(const W of [1440,390]){
   const ctx=await b.newContext({viewport:{width:W,height:900}});
   await ctx.addInitScript(()=>{
    function mk(){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},gt(){return q},update(){return q},
      upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},
      maybeSingle(){return Promise.resolve({data:null,error:null})},then(a){return Promise.resolve({data:[],error:null}).then(a)}};return q;}
    window.supabase={createClient:()=>({from:()=>mk(),rpc:()=>Promise.resolve({data:null,error:null}),
      auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
   await p.route('**/*supabase*',r=>r.abort());
   await p.goto('file://'+file);await p.waitForTimeout(1500);
   const views=await p.$$eval('.side .m[data-v]',es=>es.map(e=>e.dataset.v));
   ok('F0 페이지 20개 @'+W,views.length===20,views.length);
   const fails=[];
   for(const v of views){
    const e0=errs.length;
    await p.evaluate(v=>document.querySelector('.side .m[data-v="'+v+'"]').click(),v);await p.waitForTimeout(350);
    const r=await p.evaluate(v=>{
      const root=document.getElementById('v-'+v), nav=document.querySelector('.side .m[data-v="'+v+'"] .mt');
      const kids=[...root.children].map(c=>c.classList.contains('phead')?'H':c.classList.contains('pl1')?'1':c.classList.contains('pl2')?'2':'B');
      const ph=root.querySelector('.phead'), l1=root.querySelector('.pl1');
      return {ph:root.querySelectorAll('.phead').length,h1:root.querySelectorAll('h1').length,
        title:(root.querySelector('.phead h1')||{}).textContent||'',nav:nav?nav.textContent:'',
        order:kids.join('').replace(/B+/g,'B'),kpi:root.querySelectorAll('.pl2 .kpi').length,
        ow:document.documentElement.scrollWidth-window.innerWidth,
        old:root.querySelectorAll('.emrhead,.aghd,h2').length,
        phPos:ph?getComputedStyle(ph).position:'',l1Pos:l1?getComputedStyle(l1).position:''};},v);
    const why=[];
    if(r.ph!==1||r.h1!==1)why.push('헤더 '+r.ph+'·h1 '+r.h1);
    if(r.nav&&r.title.indexOf(r.nav)<0)why.push('제목 「'+r.title+'」≠네비 「'+r.nav+'」');
    if(!/^H1?2?B?$/.test(r.order))why.push('순서 '+r.order);
    if(r.kpi>4)why.push('KPI '+r.kpi);
    if(r.ow>0)why.push('가로넘침 '+r.ow);
    if(r.old)why.push('옛 제목 블록 '+r.old);
    if(W>900&&r.phPos!=='sticky')why.push('헤더 고정 아님');
    if(W<=900&&r.phPos==='sticky')why.push('모바일 헤더가 고정됨');
    if(r.l1Pos&&r.l1Pos!=='sticky')why.push('L1 고정 아님');
    if(errs.length>e0)why.push('에러 '+errs.slice(e0).join('|'));
    if(why.length)fails.push(v+': '+why.join(', '));
   }
   ok('F1~F6 전 페이지 틀 계약 @'+W,fails.length===0,fails.join(' ‖ '));

   if(W===1440){
    /* 긴 페이지 L1 — 탭마다 그 카드만 */
    const L=await p.evaluate(async()=>{
      const vis=(v)=>[...document.querySelectorAll('#v-'+v+' [data-l1]')].filter(e=>e.offsetParent!==null).map(e=>e.dataset.l1);
      const out={};
      document.querySelector('.side .m[data-v="acct"]').click();await new Promise(r=>setTimeout(r,200));
      out.acct0=vis('acct');pfL1Set('acct','debt');await new Promise(r=>setTimeout(r,200));out.acct1=vis('acct');
      out.acctTab=(document.querySelector('#v-acct .pl1 .tab.on')||{}).dataset.tab;
      document.querySelector('.side .m[data-v="weight"]').click();await new Promise(r=>setTimeout(r,200));
      out.w0=vis('weight');pfL1Set('weight','event');await new Promise(r=>setTimeout(r,200));out.w1=vis('weight');
      document.querySelector('.side .m[data-v="insu"]').click();await new Promise(r=>setTimeout(r,200));
      out.i0=vis('insu');pfL1Set('insu','mtx');await new Promise(r=>setTimeout(r,200));out.i1=vis('insu');
      out.persist=JSON.stringify(DB.ui.pfl1);
      return out;});
    ok('L1 계좌·부채 — 기본 계좌만, 부채 탭이면 부채만',L.acct0.join()==='acc'&&L.acct1.join()==='debt'&&L.acctTab==='debt',JSON.stringify(L));
    ok('L1 체성분·사고 — 체성분 2카드 → 사고 1카드',L.w0.join()==='body,body'&&L.w1.join()==='event',JSON.stringify([L.w0,L.w1]));
    ok('L1 보험 — 매트릭스 탭이면 매트릭스만',L.i0.every(x=>x==='all')&&L.i1.every(x=>x==='mtx'),JSON.stringify([L.i0,L.i1]));
    ok('L1 고른 탭은 기기에 남는다',/"acct":"debt"/.test(L.persist)&&/"insu":"mtx"/.test(L.persist),L.persist);
    /* 부품 하나씩 — 같은 역할에 옛 부품이 화면 틀 밖에 남지 않는다 */
    const C=await p.evaluate(()=>({tabsInL1:document.querySelectorAll('.pl1 .tabs .tab').length>0,
      pnavCal:(document.querySelector('.side .m[data-v="cal"]').click(),!!document.querySelector('#v-cal .pl2 .pnav'))}));
    ok('부품 — L1 은 .tabs · 가계부 기간 이동은 .pnav',C.tabsInL1&&C.pnavCal,JSON.stringify(C));
    /* v4.82 — 카드 안 옛 부품이 표준 세 모양을 입는다: 밑줄 탭 · 세그먼트 · 칩 */
    const S=await p.evaluate(async()=>{
      const cs=(el,pr)=>el?getComputedStyle(el)[pr]:'';
      document.querySelector('.side .m[data-v="daily"]').click();await new Promise(r=>setTimeout(r,200));
      const dt=document.querySelector('#v-daily .dtab.on'), l1=null;
      const acc=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      document.querySelector('.side .m[data-v="cal"]').click();await new Promise(r=>setTimeout(r,200));
      const sg2=document.querySelector('#v-cal .seg2 .sg.on');
      txnModal(null);await new Promise(r=>setTimeout(r,200));
      const sg=document.querySelector('#ov .seg button.on');
      const out={dtabLine:cs(dt,'borderBottomColor'),dtabBg:cs(dt,'backgroundColor'),
        segBg:cs(sg,'backgroundColor'),seg2Bg:cs(sg2,'backgroundColor'),segShadow:cs(sg,'boxShadow')!=='none'};
      /* 🔴 v4.82 — 덮개(z 20)가 고정 헤더(z 40) 밑에 깔려 헤더가 어둡게 안 덮였다 */
      const hb=document.querySelector('#v-cal .phead').getBoundingClientRect();
      const top=document.elementFromPoint(hb.left+40,hb.top+hb.height/2);
      out.ovOverHead=!!(top&&top.closest('#ov'));
      closeModal();
      document.querySelector('.side .m[data-v="log"]').click();await new Promise(r=>setTimeout(r,200));
      out.logChipsInL2=!!document.querySelector('#v-log .pl2 .horoom')||HO_STATE!=='ok';
      out.noChipsInBody=!document.querySelector('#v-log .sec .horoom');
      return out;});
    ok('부품 — 카드 안 탭(.dtab)은 밑줄 탭 모양',/rgb\(47, 109, 246\)/.test(S.dtabLine)&&/rgba\(0, 0, 0, 0\)|transparent/.test(S.dtabBg),JSON.stringify(S));
    ok('부품 — 입력창 .seg 와 틀의 .seg2 는 같은 모양',S.segBg&&S.segBg===S.seg2Bg&&S.segShadow,JSON.stringify(S));
    ok('부품 — 로그 칩은 L2 에(본문에 없다)',S.logChipsInL2&&S.noChipsInBody,JSON.stringify(S));
    ok('🔴 모달 덮개는 고정 헤더 위에 깔린다',S.ovOverHead,JSON.stringify(S));
   }
   ok('Z 페이지 에러 없음 @'+W,errs.length===0,errs.join(' | '));
   await ctx.close();
  }
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t80 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
