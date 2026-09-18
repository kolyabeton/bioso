import {summonTuning} from '../systems/symbionts.js';
import {activeMutation} from '../systems/mutations.js';

export function soulSummonStats(s,buff){
  const swarm=summonTuning(s,buff),count=s.abilities.companions?.filter(c=>c.phase!=='dead').length||0,wombs=(s.organs||[]).filter(p=>p?.key==='parasite').length;
  const broodSize=wombs*2+(s.arms&&s.legs&&s.organs&&activeMutation(s,'hive')?3:0);
  if(!swarm.count&&!count&&!s.isaac?.larvae?.length&&!broodSize)return [];
  return [
    ...(swarm.count||count?[['Помощники',`${count} из ${swarm.count}`]]:[]),
    ...(broodSize?[['Призыв личинок',`${broodSize} каждые ${(2/swarm.rate).toFixed(2)} с`]]:[]),
    ['Урон роя',`×${swarm.damage.toFixed(2)}`],
    ['Темп роя',`×${swarm.rate.toFixed(2)}`],
    ['Призыв нового',`${swarm.replacementInterval.toFixed(2)} с`],
    ...(swarm.baseCount||swarm.setCount||!swarm.drones.length?[['Поиск роя',`${swarm.search.toFixed(0)} м`]]:[]),
    ...(swarm.drones.length?[['Поиск дронов',`${swarm.droneSearch.toFixed(0)} м`]]:[]),
  ];
}
