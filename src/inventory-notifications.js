function unseenIds(run){
 if(run.unseenInventoryIds instanceof Set)return run.unseenInventoryIds;
 return run.unseenInventoryIds=new Set(Array.isArray(run.unseenInventoryIds)?run.unseenInventoryIds:[]);
}

function seenIds(run){
 if(run.seenInventoryIds instanceof Set)return run.seenInventoryIds;
 return run.seenInventoryIds=new Set(Array.isArray(run.seenInventoryIds)?run.seenInventoryIds:[]);
}

export function markInventoryUnseen(run,parts){
 const ids=unseenIds(run),seen=seenIds(run),inventoryIds=new Set(run.inventory.map(part=>part.id));
 for(const part of Array.isArray(parts)?parts:[parts])if(part&&inventoryIds.has(part.id)&&!seen.has(part.id))ids.add(part.id);
 return unseenInventoryCount(run);
}

export function unseenInventoryCount(run){
 const ids=unseenIds(run),inventoryIds=new Set(run.inventory.map(part=>part.id));
 for(const id of ids)if(!inventoryIds.has(id))ids.delete(id);
 return ids.size;
}

export function markInventorySeen(run){
 const seen=seenIds(run);for(const part of run.inventory)seen.add(part.id);unseenIds(run).clear();
}
