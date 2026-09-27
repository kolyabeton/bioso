// Refined variants reuse the organ generator's fittings and canonical atlas.
// Closed, thick panel surfaces follow the organ volume instead of floating scutes.
import * as T from 'three';
export function buildRefinedOrgan(key,A){
 const {add,ball,cyl,rod,ring,box,path,fastener,features}=A;
 const V=a=>new T.Vector3(...a);
 function surface({height=.8,width=.29,depth=.19,bend=0,taper=0}){
  return(a,t,d=0)=>{const q=2*t-1,r=Math.sqrt(Math.max(.0001,1-q*q)),w=width*r*(1+taper*q),z=depth*r;return [bend*Math.sin(t*Math.PI*1.25)+(w+d)*Math.sin(a),height*(t-.5),(z+d)*Math.cos(a)];};
 }
 function skin(kind,f,a0,a1,t0,t1,offset=0,thickness=.012){
  const nu=22,nv=18,positions=[],uv=[],indices=[];
  const sample=(u,v,layer)=>{const a=a0+(a1-a0)*u;const lo=t0+Math.sin(u*Math.PI)*.026,hi=t1-Math.sin(u*Math.PI)*.024;
   return f(a,lo+(hi-lo)*v,offset-layer*thickness);};
  for(let layer=0;layer<2;layer++)for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){positions.push(...sample(i/nu,j/nv,layer));uv.push(i/nu,j/nv);}
  const n=(nu+1)*(nv+1),at=(i,j)=>j*(nu+1)+i;
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=at(i,j),b=a+1,c=a+nu+1,d=c+1;indices.push(a,b,d,a,d,c,n+a,n+d,n+b,n+a,n+c,n+d);}
  const edge=[];for(let i=0;i<=nu;i++)edge.push(at(i,0));for(let j=1;j<=nv;j++)edge.push(at(nu,j));for(let i=nu-1;i>=0;i--)edge.push(at(i,nv));for(let j=nv-1;j>0;j--)edge.push(at(0,j));
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,n+a,n+b,a,n+b,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(kind,g);
 }
 function panel(f,a0,a1,t0,t1){skin('steel',f,a0-.025,a1+.025,t0-.007,t1+.007,.012,.012);skin('ceramic',f,a0,a1,t0,t1,.025,.015);}
 function clasp(f,a,t){const p=f(a,t,.041);ball('steel',p,[.019,.029,.010]);fastener([p[0],p[1],p[2]+.010],.006);}
 function socket(p,r,axis){
  const dir=V(axis).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir),point=(x,y,z)=>V([x,y,z]).applyQuaternion(q).add(V(p)).toArray();
  // Open bore with recessed dark floor, annular rims and separate clamp shoes.
  add('steel',new T.CylinderGeometry(r,r,.115,28,1,true),p,[1,1,1],axis);
  cyl('steel',point(0,-.058,0),r*.91,.01,axis);
  ring('steel',point(0,.06,0),r,.016,axis);ring('brass',point(0,.064,0),r*.85,.006,axis);
  ring('steel',point(0,-.048,0),r*1.03,.015,axis);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*r,z=Math.sin(a)*r;
   rod('steel',point(x,-.046,z),point(x,.042,z),.014);
   fastener(point(x,.062,z),.008,axis);
  }
 }
 function hose(points,r,{armor=false}={}){
  const c=path(armor?'ceramic':'olive',points,r,30);
  for(let i=1;i<=7;i++){const t=i/9,p=c.getPoint(t),axis=c.getTangent(t).toArray();ring(i%3===0?'brass':'steel',p.toArray(),r*1.04,.005,axis);}
  return c;
 }
 function inset(p,r){
  cyl('steel',[p[0],p[1],p[2]-.018],r*1.3,.038,[0,0,1]);
  ring('steel',p,r,.017);ring('brass',[p[0],p[1],p[2]+.004],r*.78,.006);
  ball('glass',[p[0],p[1],p[2]-.013],[r*.72,r*.72,.012]);
  ring('light',[p[0],p[1],p[2]-.003],r*.47,.003);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.25;fastener([p[0]+Math.cos(a)*r*1.17,p[1]+Math.sin(a)*r*1.17,p[2]+.009],.007);}
 }
 if(key==='reverseStomach'){
  const f=surface({height:.70,width:.255,depth:.185,bend:.09,taper:.05});
  skin('olive',f,-Math.PI,Math.PI,.002,.998,0,.007);
  // Recessed organic belly remains visible through a small, asymmetric aperture.
  panel(f,-2.9,-.50,.09,.76);panel(f,.78,3.1,.07,.78);
  panel(f,-.51,.79,.07,.245);panel(f,-.70,.90,.72,.96);
  for(let j=0;j<8;j++){
   const pts=[];for(let i=0;i<=14;i++){const t=.26+i/14*.44,a=-.43+j*.145+.065*Math.sin(t*17+j*.9);pts.push(f(a,t,.008));}path('olive',pts,.007,18);
  }
  // Thick continuous elbow, ceramic dorsal cover and dark flexible throat.
  hose([[.09,.20,-.015],[.035,.29,-.015],[-.11,.34,.010],[-.26,.37,.025]],.086,{armor:true});
  socket([-.29,.387,.045],.125,[-.82,.45,.24]);
  hose([[.055,-.285,0],[-.025,-.355,.025],[-.115,-.402,.07]],.063);
  socket([-.14,-.424,.075],.073,[-.6,-.77,.15]);
  for(const [a,t]of [[-.5,.3],[.8,.34],[-.5,.67],[.78,.70]])clasp(f,a,t);
  const eye=f(.37,.82,.023);inset([eye[0],eye[1],eye[2]+.009],.027);
  features.push('continuous bent stomach with recessed fibrous belly','thick fitted ceramic panels with dark seams','open clamped side inlet and curved lower outlet','small recessed pressure indicator');
 }else if(key==='revivalCore'){
  const f=surface({height:.73,width:.28,depth:.19,bend:-.035,taper:.27});
  skin('olive',f,-Math.PI,Math.PI,.002,.998,0,.007);
  // Offset shell halves nest around the pressure housing; no separate oval cage.
  panel(f,-2.9,-.40,.16,.95);panel(f,.43,3.15,.08,.87);
  panel(f,-.43,.46,.06,.30);
  for(let j=0;j<5;j++){
   const pts=[];for(let i=0;i<=12;i++){const t=.25+i/12*.58;pts.push(f(-.27+j*.13+.06*Math.sin(t*16+j*.8),t,.008));}path('olive',pts,.008,20);
  }
  const arteries=[
   [[-.13,.23,-.03],[-.17,.32,-.03],[-.20,.39,.005],[-.27,.40,.065]],
   [[-.025,.28,-.03],[.005,.39,-.05],[-.025,.49,-.035],[-.10,.51,.025]],
   [[.13,.23,-.045],[.185,.32,-.03],[.17,.40,.02],[.105,.435,.07]]
  ];
  for(const pts of arteries){const c=hose(pts,.047,{armor:true});socket(pts.at(-1),.053,c.getTangent(1).toArray());}
  // Recessed jade pressure dial with a small illuminated annulus.
  cyl('steel',[.015,-.015,.158],.112,.060,[0,0,1]);
  ring('steel',[.015,-.015,.197],.102,.018);ring('brass',[.015,-.015,.198],.077,.006);
  inset([.015,-.015,.200],.058);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;fastener([.015+Math.cos(a)*.095,-.015+Math.sin(a)*.095,.212],.007);}
  for(const [a,t]of [[-.45,.39],[.47,.4],[-.44,.75],[.48,.72]])clasp(f,a,t);
  socket([-.018,-.365,.015],.058,[.1,-1,.05]);
  features.push('compact tapered heart with nested asymmetric ceramic halves','three hooked ribbed arteries with open bores','recessed dark pressure housing and small jade dial');
 }else if(key==='broodNode'){
  const f=surface({height:.83,width:.255,depth:.17,bend:.015,taper:-.20});
  skin('olive',f,-Math.PI,Math.PI,.002,.998,0,.007);
  // A closed armored cocoon; stepped side plates meet a recessed signal spine.
  panel(f,-3.10,-.36,.09,.93);panel(f,.36,3.10,.08,.91);
  panel(f,-.35,.35,.78,.985);panel(f,-.36,.36,.02,.20);
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const t=.20+i*.14;
   skin('steel',f,side<0?-.92:.35,side<0?-.35:.92,t,t+.075,.032,.012);
   skin('ceramic',f,side<0?-1.00:.41,side<0?-.41:1.00,t+.015,t+.10,.041,.018);
  }
  // No antennae: three low-profile relay cartridges sit inside the narrow slot.
  for(const [i,t]of [[0,.30],[1,.47],[2,.64]]){
   const y=.83*(t-.5),z=.17*Math.sqrt(1-(2*t-1)**2);
   box('steel',[.015,y,z-.005],[.11,.091,.038],-.07);
   for(const side of [-1,1])cyl('brass',[.015+side*.037,y,z+.018],.013,.068,[0,1,0],.013,12);
   box('glass',[.015,y,z+.018],[.046,.063,.012]);
   box('light',[.015,y+.020,z+.026],[.028,.004,.003]);
   for(const side of [-1,1]){
    const pts=[];for(let k=0;k<=8;k++){const a=side*(.11+k/8*.40);pts.push(f(a,t+.02*Math.sin(k/8*Math.PI),.012));}path('steel',pts,.007,12);
   }
  }
  for(const [a,t]of [[-.48,.25],[.48,.25],[-.42,.73],[.42,.73]])clasp(f,a,t);
  socket([0,-.408,0],.069,[0,-1,0]);
  for(const side of [-1,1])hose([[side*.05,-.35,-.04],[side*.14,-.29,-.075],[side*.20,-.13,-.06]],.025);
  features.push('closed tapered controller cocoon without antennae','four overlapping rib plates on each side','three recessed relay cartridges with tiny status slits','short buried lower signal hoses');
 }
}
