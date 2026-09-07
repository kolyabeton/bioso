import {readProfile} from './assembly.js';

export function createProfileStorage(storage,{notify=()=>{}}={}) {
  const profile=readProfile(storage);
  let saved=true;
  return {
    profile,
    get saved(){return saved;},
    save(){
      try {
        storage.setItem('biomecha.profile.v1',JSON.stringify(profile));
        saved=true;
      } catch {
        saved=false;
        notify('Открытия действуют в этой сессии. Сохранить каталог не удалось.');
      }
      return saved;
    },
  };
}
