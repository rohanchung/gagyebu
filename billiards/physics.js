/* 🎱 4구 물리 엔진 — 당구 연습장 v2 (2026-09-26)
 *
 * 무엇을 계산하나 (위에서 내려다본 2D + 회전 3축)
 *   · 큐 타격: 조준 방향·속도·당점 → 처음 속도와 회전(밀기·끌기·좌우)
 *   · 천 위: 미끄러짐(슬라이딩) → 구름(롤링). 밀기·끌기로 휘는 궤적이 여기서 저절로 나온다
 *   · 공끼리: 두께에 따라 갈라진다(마찰 없는 순간 충돌). 회전은 그대로 남아 이후 궤적을 휜다
 *   · 쿠션: v3.3 충격량 적분 — 쿠션 코 높이 · 쿠션 마찰 · 눌린 만큼 천 마찰 · 속도별 반발
 *
 * 좌표: 미터. x 오른쪽, y 아래(화면과 같다). 그래서 z 는 **테이블 안쪽(아래)** 이고 "위"는 -z 다.
 *       외적은 이 오른손 좌표계로 그대로 쓴다 — 부호를 손으로 맞추지 않는다(틀리기 쉽다).
 *
 * 🔒 정확도: 분리각·무회전 반사는 교과서 값과 맞는다(테스트로 잠금).
 *    강한 회전 + 쿠션 복합은 근사다. 천·쿠션 상태는 당구장마다 달라 v2.1 에서 보정을 붙인다.
 */
(function(root){
'use strict';
var G=9.81;
/* 중대 표준값 — 안쪽 2.24 × 1.12 m, 4구 공 지름 65.5 mm. 다이아 1칸 = 0.28 m */
var DEF={
  L:2.24, W:1.12, R:0.03275,
  muS:0.2,      /* 미끄럼 마찰(천-공) */
  muR:0.010,    /* 구름 저항 — 🔒 "보통 속도(3단) = 2쿠션" 으로 속도표와 함께 맞춘다 */
  muSp:0.022,   /* 좌우 회전이 천에서 줄어드는 정도 */
  eB:0.94,      /* 공-공 반발 */
  eC:0.86,      /* 쿠션 반발(1 m/s 로 들어올 때) */
  eV:0.03,      /* 들어오는 속도 1 m/s 마다 반발이 줄어드는 양 — 세게 칠수록 쿠션이 더 먹는다 */
  muC:0.18,     /* 쿠션 마찰(좌우 회전이 반사각을 바꾸는 정도) */
  kN:1, kT:1,   /* 쿠션을 떠날 때 구름을 나가는 속도에 맞추는 몫(0~1) — 쿠션 방향 · 쿠션 따라 · 아버지 기준(X법)으로 맞춘다 */
  cushH:0.63,   /* 쿠션 코 높이 ÷ 공 지름 — 공 중심보다 위(표준 62~64%) */
  dt:0.0004, tMax:30, fps:60
};
/* 속도 단계(m/s) — 🔒 3단 = 보통 = 2.0 m/s (v3.3.2 아버지 X법 기준으로 다시 맞춤 · 예전 1.6 → 1.85). 아버지: "보통 속도면 어느 방향이든 2쿠션"
   3단에서 짧은 방향·긴 방향은 정확히 2쿠션, 대각선은 2~3쿠션(tests/b02 P13 설명) */
var SPEED=[0.92,1.35,2.0,2.75,3.7];

function cross(a,b){return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];}
function len2(x,y){return Math.sqrt(x*x+y*y);}

/* 큐 타격 → {v:[vx,vy], w:[wx,wy,wz]}
   tip: {x,y} 당점(-1~1). x+ = 오른쪽, y- = 위(밀기). 최대 당점(1) = 공 중심에서 반지름의 0.5 */
function strike(V,dx,dy,tip,R){
  var a=tip?(tip.x||0):0, b=tip?-(tip.y||0):0;       /* b+ = 위 */
  var right=[-dy,dx,0], up=[0,0,-1];
  var r=[R*0.5*(a*right[0]+b*up[0]), R*0.5*(a*right[1]+b*up[1]), R*0.5*(a*right[2]+b*up[2])];
  var J=[dx*V,dy*V,0];                                 /* 단위 질량당 충격 */
  var c=cross(r,J), k=1/(0.4*R*R);
  return {v:[dx*V,dy*V], w:[c[0]*k,c[1]*k,c[2]*k]};
}

/* simulate(opt)
   opt.balls: {id:{x,y}} (미터) · opt.cue: 치는 공 id · opt.dir:{x,y} 단위벡터 · opt.V: m/s · opt.tip
   반환: {frames:[{t,p:{id:[x,y]}}], events:[...], stops:{id:[x,y]}, T} */
function simulate(opt){
  var P={};for(var k in DEF)P[k]=DEF[k];
  if(opt.params)for(k in opt.params)P[k]=opt.params[k];
  var R=P.R, ids=Object.keys(opt.balls), B={};
  ids.forEach(function(id){B[id]={id:id,x:opt.balls[id].x,y:opt.balls[id].y,v:[0,0],w:[0,0,0],on:false};});
  var d=len2(opt.dir.x,opt.dir.y)||1, s=strike(opt.V,opt.dir.x/d,opt.dir.y/d,opt.tip,R);
  var cb=B[opt.cue];cb.v=s.v;cb.w=s.w;cb.on=true;
  var frames=[],events=[],t=0,nextF=0,dt=P.dt,fstep=1/P.fps;
  var slideK=1/(0.4*R*R);
  function snap(){var p={};ids.forEach(function(id){p[id]=[B[id].x,B[id].y];});frames.push({t:t,p:p});}
  snap();nextF=fstep;
  /* opt.stopWhen(ev) 가 참이면 그 자리에서 멈춘다 — 맞는 범위·힌트 계산처럼 결과만 필요할 때 빨라진다 */
  var stopped=false;
  function emit(ev){events.push(ev);if(opt.stopWhen&&opt.stopWhen(ev))stopped=true;}
  while(t<P.tMax){
    var moving=false;
    for(var i=0;i<ids.length;i++){
      var b=B[ids[i]];if(!b.on)continue;
      /* 접점 미끄럼 u = v + ω × (0,0,R) */
      var ux=b.v[0]+b.w[1]*R, uy=b.v[1]-b.w[0]*R, u=len2(ux,uy);
      if(u>1e-4){
        var tr=u/(3.5*P.muS*G), h=Math.min(dt,tr);          /* 구름이 되는 데 걸리는 시간 */
        var fx=-P.muS*G*ux/u, fy=-P.muS*G*uy/u;
        b.v[0]+=fx*h;b.v[1]+=fy*h;
        var tq=cross([0,0,R],[fx,fy,0]);
        b.w[0]+=tq[0]*slideK*h;b.w[1]+=tq[1]*slideK*h;
        if(tr<=dt){b.w[0]=b.v[1]/R;b.w[1]=-b.v[0]/R;
          emit({t:t+tr,type:'roll',ball:b.id,x:b.x,y:b.y,v:[b.v[0],b.v[1]]});}
      }else{
        var sp=len2(b.v[0],b.v[1]);
        if(sp>0){var ns=Math.max(0,sp-P.muR*G*dt);b.v[0]*=ns/sp;b.v[1]*=ns/sp;}
        b.w[0]=b.v[1]/R;b.w[1]=-b.v[0]/R;
      }
      /* 좌우 회전은 천에서 조금씩 준다 */
      var dz=2.5*P.muSp*G/R*dt;
      b.w[2]=Math.abs(b.w[2])<=dz?0:b.w[2]-Math.sign(b.w[2])*dz;
      b.x+=b.v[0]*dt;b.y+=b.v[1]*dt;
      /* 쿠션 */
      cushion(b,b.x<R&&b.v[0]<0,[1,0],'L');
      cushion(b,b.x>P.L-R&&b.v[0]>0,[-1,0],'R');
      cushion(b,b.y<R&&b.v[1]<0,[0,1],'T');
      cushion(b,b.y>P.W-R&&b.v[1]>0,[0,-1],'B');
      var ss=len2(b.v[0],b.v[1]);
      if(ss<0.003&&len2(b.v[0]+b.w[1]*R,b.v[1]-b.w[0]*R)<0.003){b.v=[0,0];b.w=[0,0,0];b.on=false;emit({t:t,type:'stop',ball:b.id,x:b.x,y:b.y});}
      else moving=true;
    }
    /* 공끼리 */
    for(i=0;i<ids.length;i++)for(var j=i+1;j<ids.length;j++){
      var A=B[ids[i]],C=B[ids[j]],nx=C.x-A.x,ny=C.y-A.y,dd=len2(nx,ny);
      if(dd<2*R&&dd>0){
        nx/=dd;ny/=dd;
        var vn=(A.v[0]-C.v[0])*nx+(A.v[1]-C.v[1])*ny;
        if(vn>0){
          var jn=(1+P.eB)/2*vn;
          A.v[0]-=jn*nx;A.v[1]-=jn*ny;C.v[0]+=jn*nx;C.v[1]+=jn*ny;
          A.on=true;C.on=true;moving=true;
          emit({t:t,type:'ball',a:A.id,b:C.id,x:A.x,y:A.y,bx:C.x,by:C.y,n:[nx,ny],
            va:[A.v[0],A.v[1]],vb:[C.v[0],C.v[1]]});
        }
        var ov=(2*R-dd)/2;A.x-=nx*ov;A.y-=ny*ov;C.x+=nx*ov;C.y+=ny*ov;
      }
    }
    t+=dt;
    if(t>=nextF){snap();nextF+=fstep;}
    if(!moving||stopped)break;
  }
  snap();
  var stops={};ids.forEach(function(id){stops[id]=[B[id].x,B[id].y];});
  return {frames:frames,events:events,stops:stops,T:t,P:P};

  /* 🔒 v3.3 쿠션 = 충격량 적분 모델(Mathavan 외 2010 방식)
     · 쿠션 코는 공 중심보다 높다(cushH × 지름) → 쿠션이 공을 **비스듬히 아래로** 민다
     · 그래서 접점이 둘: 쿠션 접점(마찰 muC) + 바닥 접점(눌린 만큼 천 마찰 muS)
     · 충격을 잘게 나눠 쌓는다: 압축(들어오는 속도가 0 될 때까지) → 복원(압축 일의 e² 만큼)
       → 반사각·회전 변화·되튐 뒤 휘어 나감이 따로 손대지 않아도 나온다(예전 kC 보정 없앰)
     · 세게 칠수록 쿠션이 덜 튕겨 준다: e = eC - eV × (들어오는 속도 - 1 m/s) */
  function cushion(b,hit,n2,side){
    if(!hit)return;
    var st=2*P.cushH-1, ct=Math.sqrt(1-st*st);
    var n=[n2[0],n2[1],0], nI=[ct*n[0],ct*n[1],st], rI=[-R*nI[0],-R*nI[1],-R*nI[2]], rC=[0,0,R];
    var v=[b.v[0],b.v[1],0], w=b.w;
    function at(r){var c=cross(w,r);return [v[0]+c[0],v[1]+c[1],v[2]+c[2]];}
    var vn0=-(v[0]*n[0]+v[1]*n[1]);
    var e=Math.max(0.4,Math.min(0.98,P.eC-P.eV*(vn0-1)));
    var vI=at(rI),vn=vI[0]*nI[0]+vI[1]*nI[1]+vI[2]*nI[2];
    if(vn<0){
      var dP=-vn*(1+e)/(ct*ct)/120, Wc=0, Wr=0, ph=0;
      for(var k=0;k<2000;k++){
        vI=at(rI);vn=vI[0]*nI[0]+vI[1]*nI[1]+vI[2]*nI[2];
        if(!ph&&vn>=0)ph=1;
        if(ph&&Wr>=e*e*Wc)break;
        if(ph)Wr+=vn*dP;else Wc+=-vn*dP;
        /* 쿠션 접점: 수직 충격 + 미끄럼 반대 마찰 */
        var J=[dP*nI[0],dP*nI[1],dP*nI[2]], sx=vI[0]-vn*nI[0], sy=vI[1]-vn*nI[1], sz=vI[2]-vn*nI[2], sl=Math.sqrt(sx*sx+sy*sy+sz*sz);
        if(sl>1e-9){var jt=Math.min(P.muC*dP,sl/3.5);J[0]-=jt*sx/sl;J[1]-=jt*sy/sl;J[2]-=jt*sz/sl;}
        /* 바닥 접점: 아래로 눌린 만큼 받치고, 그 힘으로 천 마찰 */
        var Nd=Math.max(0,J[2]), JC=[0,0,-Nd];
        if(Nd>0){var vC=at(rC),cl=len2(vC[0],vC[1]);if(cl>1e-9){var j2=Math.min(P.muS*Nd,cl/3.5);JC[0]-=j2*vC[0]/cl;JC[1]-=j2*vC[1]/cl;}}
        v[0]+=J[0]+JC[0];v[1]+=J[1]+JC[1];v[2]=0;   /* 공은 바닥을 떠나지 않는다 */
        var t1=cross(rI,J),t2=cross(rC,JC);
        w[0]+=(t1[0]+t2[0])*slideK;w[1]+=(t1[1]+t2[1])*slideK;w[2]+=(t1[2]+t2[2])*slideK;
      }
      /* 🔒 v3.3.2 쿠션을 떠날 때의 구름 — 적분 모델만으론 들어올 때의 구름이 그대로 남아(쿠션 쪽 + 쿠션을 따라),
         떠난 뒤 천에서 다시 붙으며 거울보다 크게 휘어 나갔다. 아버지 실측 "보통 속도·정중앙이면 X법 교차점이 정답" 과 5~9 차이.
         → 수평 회전을 '나가는 속도에 맞는 구름' 쪽으로 맞춘다. 쿠션 방향(kN)과 쿠션을 따라가는 방향(kT)을 따로:
           kN 이 작으면 정면으로 받은 공의 구름이 브레이크로 남는다(실제로 그렇다 — "보통 속도 = 어느 방향이든 2쿠션" 이 여기서 나온다)
           kT 가 크면 쿠션이 늦춘 만큼 쿠션을 따라가는 구름도 맞춰져, 떠난 뒤 옆으로 더 달려 나가지 않는다. 좌우 회전 w[2] 는 그대로
           kN 은 비스듬할수록 크게(sin² 입사각): 정면은 브레이크가 남고, 비스듬히 스친 공은 거울처럼 나간다 */
      var rvx=-R*w[1],rvy=R*w[0],tx=-n[1],ty=n[0],s2=1-vn0*vn0/Math.max(1e-9,b.v[0]*b.v[0]+b.v[1]*b.v[1]);
      var an=(v[0]-rvx)*n[0]+(v[1]-rvy)*n[1],at=(v[0]-rvx)*tx+(v[1]-rvy)*ty,kn=Math.min(1,P.kN*s2);
      rvx+=kn*an*n[0]+P.kT*at*tx;rvy+=kn*an*n[1]+P.kT*at*ty;w[1]=-rvx/R;w[0]=rvy/R;
      b.v=[v[0],v[1]];b.w=w;
    }
    if(side==='L')b.x=R;else if(side==='R')b.x=P.L-R;else if(side==='T')b.y=R;else b.y=P.W-R;
    emit({t:t,type:'cushion',ball:b.id,side:side,x:b.x,y:b.y});
  }
}

var API={VERSION:'3.3.2',DEF:DEF,SPEED:SPEED,strike:strike,simulate:simulate};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.BBPhys=API;
})(this);
