/* 🔒 v5.14 — 테스트용 가짜 씨앗 (공개 저장소 정리 · 핸드오프 id 64)
   앱의 씨앗(SAJU_SEED 등)은 비었다 — 실데이터가 공개 파일에 있었기 때문이다.
   원국이 있어야 도는 테스트는 이 **지어낸** 원국을 쓴다. 실제 생년월일·팔자가 아니다.
   쓰는 법: await ctx.addInitScript(require('./_fakeseed').saju);
   🔒 페이지의 `var SAJU_SEED=…` 보다 먼저 창에 접근자를 걸어 두면, 페이지의 대입은 무시되고 이 값이 읽힌다(앱 코드는 그대로) */
const FAKE_SAJU={birth:{solar:'1990-01-01',lunar:'1989-12-05',gender:'M'},
  natal:{year:'己巳',month:'丙子',day:'丙寅',hour:'戊子'},ilgan:'丙',gongmang:['戌','亥'],gyeok:'가짜격',
  daeun:{startAge:5,dir:'역행',list:[[5,'乙亥'],[15,'甲戌'],[25,'癸酉'],[35,'壬申'],[45,'辛未'],[55,'庚午'],[65,'己巳'],[75,'戊辰']]}};
function saju(){
  const v=__FAKE__;
  Object.defineProperty(window,'SAJU_SEED',{configurable:true,get(){return v;},set(_){}});
}
module.exports={FAKE_SAJU,
  saju:'('+saju.toString().replace('__FAKE__',JSON.stringify(FAKE_SAJU))+')()'};
