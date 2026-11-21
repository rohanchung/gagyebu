/* 🔒 문법 선검사 — 브라우저를 띄우기 **전에** 1초 안에 끝난다.
   2026-09-21: CHANGELOG 문자열 안에 작은따옴표를 그대로 넣어 `note:'… '앞으로 할 것' …'` 이 됐다.
   문자열이 거기서 끊겨 앱 전체가 안 떴고, **32개 테스트가 222초를 태우고 전부 실패**했다.
   총붕괴는 1초에 잡혀야 한다 — 32번 크로미움을 띄워 확인할 일이 아니다.
   ⚠️ 단순 정규식으로 <script> 를 가르면 문자열 안의 `</script>` 에서 잘린다.
      마지막 <script> ~ 마지막 </script> 만 본다 — 앱 코드는 전부 거기 있다. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const h=fs.readFileSync(FILE,'utf8');
const i=h.lastIndexOf('<script>'), j=h.lastIndexOf('</script>');
if(i<0||j<i){console.log('✗ <script> 블록을 못 찾았다');process.exit(1);}
const body=h.slice(i+8,j);
const line0=h.slice(0,i+8).split('\n').length;   /* 이 블록이 시작하는 html 줄 번호 */
try{
  new vm.Script(body,{filename:FILE});
}catch(e){
  console.log('✗ SYNTAX '+e.message);
  /* 🔒 줄 번호를 **html 기준**으로 바꿔준다 — 스크립트 블록 기준으로 주면 800KB 파일에서 못 찾는다.
     스택 첫 줄이 `<파일>:1234` 형태로 블록 안 줄 번호를 준다. */
  const st=String(e.stack||'').split('\n');
  const m=/:(\d+)\s*$/.exec((st[0]||'').trim());
  if(m){
    const ln=+m[1];
    console.log('   → '+path.basename(FILE)+' '+(line0+ln-1)+'번째 줄');
    const src=h.split('\n')[line0+ln-2]||'';
    console.log('   '+src.trim().slice(0,160));
  }
  process.exit(1);
}
console.log('전부 통과 (문법 1건)');
