/**
 * @typedef {{x:number,z:number,y?:number}} Position
 * @typedef {{id:string}} UpgradeChoice
 * @typedef {{key:string,id:string,tier:number}} EnemyPart
 * @typedef {{body:EnemyPart,arms:(EnemyPart|null)[],legs:EnemyPart[],organs:(EnemyPart|null)[]}} EnemyAssembly
 * @typedef {{index:number,readyAt:number,warning:object|null}} EnemyAttackState
 * @typedef {{recipeId:string,enemyLevel:number,tier:number,threat:number,assembly:EnemyAssembly,enemyAttack:EnemyAttackState}} ModularEnemyFields
 * @typedef {{x:number,y:number,z:number,dx:number,dy:number,dz:number,life:number,speed?:number,travel?:number,key:'seed'|'needle'|'legacy',owner?:number,targetNode?:number|string}} HostileShot
 * @typedef {{id:string,name:string,tier:number,requires:string[],state:'learned'|'available'|'locked'}} AbilityNodeView
 * @typedef {{id:string,index:number,name:string,description:string,branchName:string,tier:number,nodes:AbilityNodeView[]}} AbilityCardView
 * @typedef {{current:number,max:number,segments:boolean[],shield:boolean,shieldCharges:number,shieldMax:number,armor:number,armorMax:number,shieldEquipped:boolean,invulnerable:boolean}} HealthView
 * @typedef {{type:'attack'|'arc'|'hit'|'blast'|'death'|'destroy'|'enemy-shot'|'reload-start'|'reload-end'|'fuse-start'|'volatile-blast',x:number,z:number,y?:number,tx?:number,tz?:number,ty?:number,source?:number|string,key?:string,radius?:number}} SpatialCombatEvent
 * @typedef {{type:'player-hit',hp:number,cause:string,dx?:number,dz?:number}} PlayerHitEvent
 * @typedef {{type:'unlock'|'notice'|'victory',text:string}} NoticeEvent
 * @typedef {SpatialCombatEvent|PlayerHitEvent|NoticeEvent} CombatEvent
 * @typedef {(target:object,damage:number)=>void} SecondaryDamage
 * @typedef {(kind:'normal'|'elite'|'boss'|'final',position?:Position|null,role?:'mass'|'fast'|'armored'|'ranged')=>void} SpawnRequest
 *
 * Simulation modules receive explicit run time and seeded RNG. Callbacks are synchronous.
 * SecondaryDamage intentionally does not expose attackTriggers: damage cannot recurse into attacks.
 * Presentation adapters read state and never execute commands. No system imports a view or DOM API.
 */
export {};
