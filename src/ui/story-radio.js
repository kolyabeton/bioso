import {icon} from './atoms.js';

const DEFAULT_DURATION=7200;
const QUEUE_GAP=320;

export const storyRadioShouldSuspend=screen=>!!screen&&!['level','map'].includes(screen);

export function createStoryRadio(host,{localize=()=>{},play=()=>{},stop=()=>{},pause=()=>{},resumeAudio=()=>{}}={}){
  const root=document.createElement('aside');
  root.id='story-radio';root.className='ui-frame story-radio';root.hidden=true;
  root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');
  root.innerHTML=`<div class="story-radio-copy"><small></small><p></p></div><button type="button" class="story-radio-close" aria-label="Закрыть">${icon('close')}</button>`;
  host.append(root);
  const close=root.querySelector('.story-radio-close');
  close.addEventListener('pointerdown',event=>event.stopPropagation());
  close.addEventListener('click',event=>{event.stopPropagation();hide();host.querySelector('#world')?.focus({preventScroll:true});});
  const speaker=root.querySelector('small'),text=root.querySelector('p');
  const queue=[];let timer=0,serial=0,active=null,suspended=false,remaining=0,deadline=0;
  function deactivate(){clearTimeout(timer);timer=0;remaining=0;deadline=0;stop();active=null;root.classList.remove('is-visible');root.hidden=true;}
  function armTimer(){if(remaining>0){deadline=performance.now()+remaining;timer=setTimeout(finish,remaining);}}
  function finish(){deactivate();timer=setTimeout(next,QUEUE_GAP);}
  function present(cue,{duration=cue.duration??DEFAULT_DURATION,playAudio=true}={}){
    if(!cue?.speaker||!cue?.text)return false;
    clearTimeout(timer);serial++;active=cue;
    speaker.textContent=cue.speaker;text.textContent=cue.text;
    root.dataset.voice=cue.voice||'robot';root.dataset.kind=cue.kind||'dialogue';root.dataset.cue=cue.id||`cue-${serial}`;root.hidden=false;
    localize(root);requestAnimationFrame(()=>{if(active===cue&&!suspended)root.classList.add('is-visible');});
    const voiced=playAudio&&play(cue)===true;remaining=duration>0?Math.max(2200,voiced?60000:duration):0;armTimer();
    return true;
  }
  function next(){if(suspended||active)return;clearTimeout(timer);timer=0;if(queue.length)present(queue.shift());}
  function enqueue(cue){if(!cue)return false;queue.push(cue);next();return true;}
  function show(cue,options){clear();return present(cue,options);}
  function suspend(){
    if(suspended)return;suspended=true;
    if(active&&remaining>0)remaining=Math.max(1,deadline-performance.now());
    clearTimeout(timer);timer=0;pause();root.classList.remove('is-visible');root.hidden=true;
  }
  function resume(){
    if(!suspended)return;suspended=false;
    if(active){root.hidden=false;root.classList.add('is-visible');resumeAudio();armTimer();}else next();
  }
  function clear(){queue.length=0;suspended=false;deactivate();}
  function audioEnded(id){if(active&&(!id||active.id===id))finish();}
  function hide(){clear();}
  function dispose(){clear();root.remove();}
  return{show,enqueue,suspend,resume,clear,hide,dispose,audioEnded,get visible(){return !root.hidden;},get cue(){return active?.id||'';},get queued(){return queue.map(cue=>cue.id);}};
}
