// Per-instance preferences survive unequipping; absent legacy data means common only.
export const RECYCLE_RARITIES=Object.freeze(['common','uncommon','rare','relic']);
export const reverseStomachHealth=p=>1+.5*(Math.max(1,Math.min(5,p.tier??1))-1)+.5*Object.values(p.upgrades||{}).reduce((sum,n)=>sum+n,0);
export const recycleRarities=p=>Array.isArray(p.recycleRarities)?RECYCLE_RARITIES.filter(r=>p.recycleRarities.includes(r)):['common'];
export function setRecycleRarity(p,rarity,checked){
 if(p?.key!=='reverseStomach'||!['all',...RECYCLE_RARITIES].includes(rarity))return false;
 const selected=new Set(recycleRarities(p));
 if(rarity==='all')p.recycleRarities=checked?[...RECYCLE_RARITIES]:[];
 else{if(checked)selected.add(rarity);else selected.delete(rarity);p.recycleRarities=RECYCLE_RARITIES.filter(r=>selected.has(r));}
 return true;
}
export const autoRecycleSelected=(s,p)=>s.organs.some(q=>q?.key==='reverseStomach'&&recycleRarities(q).includes(p.rarity||'common'));
