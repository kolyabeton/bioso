// UV windows in the original leg-worker texture atlas, in source image texels.
// No recoloring, replacement raster or generated noise: all PBR maps keep these UVs.
export const EQUIPMENT_SURFACE_RECTS={
 ceramic:[[232,320,56,56],[240,344,56,56],[248,376,56,56]],
 brass:[[316,8,20,20]],
 steel:[[32,244,20,20]],
};
export function equipmentSurfaceUV(geometry,kind,variant=0){
 const windows=EQUIPMENT_SURFACE_RECTS[kind];if(!windows)return geometry;
 const [x,y,w,h]=windows[variant%windows.length],uv=geometry.getAttribute('uv');if(!uv)return geometry;
 for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,(x+Math.max(0,Math.min(1,u))*w)/512,(y+Math.max(0,Math.min(1,v))*h)/512);}
 return geometry;
}
