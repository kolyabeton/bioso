export const FAMILIES={
 hive:{name:'Улей',keys:['rocket','fangs','parasite','digestion'],description:'Выпускает 3 личинки каждые 2 с, если видимый враг находится не дальше 12 м. Темп роя ускоряет призыв.'},
 conductor:{name:'Проводник',keys:['arc','shield','stabilizer','accelerator'],description:'Каждая пятая атака выпускает электрическую цепь на 3 цели.'},
 mire:{name:'Топь',keys:['acid','slime','regen','plated'],description:'Лужи шире на 50%; внутри них движение и атаки +25%.'},
};
export function mutationView(s){const keys=new Set([...s.arms,...s.legs,...s.organs].filter(Boolean).map(p=>p.key));return Object.entries(FAMILIES).map(([id,f])=>({...f,id,count:f.keys.filter(k=>keys.has(k)).length,active:f.keys.filter(k=>keys.has(k)).length>=3}));}
export const activeMutation=(s,id)=>mutationView(s).find(f=>f.id===id).active;
export function removalWarning(before,after){const next=mutationView(after);return mutationView(before).filter(f=>f.active&&!next.find(n=>n.id===f.id).active).map(f=>f.name);}
