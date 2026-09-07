import {EVENTS} from '../systems/events/definitions.js';
/** World presentation contracts. Interactions remain owned by simulation systems. */
export const GAMEPLAY_MODULES=Object.freeze({
 membrane:{domain:'organs',shape:'incubator',color:0x879475,label:'Органный тайник'},
 slab:{domain:'secrets',shape:'slab',color:0xada99b,label:'Треснувшая плита'},
 nursery:{domain:'sets',shape:'rack',color:0x819a91,label:'Питомник семейства'},
 ...Object.fromEntries(Object.entries(EVENTS).filter(([,d])=>d.kind==='altar').map(([type,d])=>[type,{domain:'events',shape:'surgery',color:0xb2ada0,label:d.name}])),
 sealed:{domain:'events',shape:'gate',color:0xba9770,label:'Запечатанный питомник'},
 infection:{domain:'events',shape:'well',color:0x859866,label:'Заражённый круг'},
 hunt:{domain:'events',shape:'beacon',color:0xb99c75,label:'Охота на носителя'},
});
export function modulePresentation(node,available=true){
 const definition=GAMEPLAY_MODULES[node.type];
 if(!definition)return null;
 return {...definition,visible:available,state:node.state,opened:['reward','complete'].includes(node.state),
  signal:node.state==='reward'?'reward':node.state==='active'?'active':node.state==='ready'&&definition.domain==='events'?'idle':'off',
  zone:node.state==='active'||node.state==='ready'&&['sealed','infection','hunt'].includes(node.type)};
}
