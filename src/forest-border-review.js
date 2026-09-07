// Development-only fixture on the actual game route, using the real world and renderer.
export function prepareForestBorderReview(run,params){
 const poses={west:[-26,0],east:[282,0],north:[0,-26],south:[0,282],corner:[-29,-27],ne:[282,-26],sw:[-26,282],se:[282,282]};
 const [x,z]=poses[params.get('side')]||poses.west;
 Object.assign(run.player,{x,z,y:0});
 return{paused:true};
}
