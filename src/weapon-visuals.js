// Presentation only: dimensions never participate in collision or weapon timing.
export const PROJECTILE_STYLES=Object.freeze({
 harpoon:{width:.12,height:.12,length:1.7,trail:4,thickness:.05,color:0xaee5d6},
 pistol:{width:.11,height:.1,length:.28,trail:.7,thickness:.055,color:0xf3d4a0},
 seed:{width:.19,height:.19,length:.38,trail:1.3,thickness:.09,color:0xd2e8ad},
 shotgun:{width:.035,height:.035,length:.09,trail:.45,thickness:.018,color:0xe5d8be},
 needle:{width:.07,height:.07,length:1.35,trail:5,thickness:.035,color:0xc3f5ff},
 rocket:{width:.27,height:.23,length:.72,trail:3.2,thickness:.22,color:0xffbe79},
 acid:{width:.43,height:.32,length:.44,trail:.7,thickness:.25,color:0xb3e35b},
});
export const projectileStyle=q=>PROJECTILE_STYLES[q.w?.key]||PROJECTILE_STYLES[q.mode]||PROJECTILE_STYLES.seed;
