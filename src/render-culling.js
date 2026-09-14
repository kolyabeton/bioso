export function projectedOnScreen(camera,projected,e,margin=1.3){
 projected.set(e.x,(e.y??0)+1,e.z).project(camera);
 return projected.z>=-1.2&&projected.z<=1.2&&projected.x>=-margin&&projected.x<=margin&&projected.y>=-margin&&projected.y<=margin;
}
