/** Opt-in DEV evidence capture. Records the actual WebGL canvas, never simulates frames. */
export function installBiotechRecorder(canvas,{onStart=()=>{},seconds=Number(new URLSearchParams(globalThis.location?.search||'').get('captureSeconds'))||8}={}) {
 const duration=Math.max(2,Math.min(12,seconds));
 const box=document.createElement('aside');box.id='bio-capture';box.style.cssText='position:fixed;bottom:8px;right:8px;z-index:100;background:#182426;padding:8px;color:#c8e2d5;font:12px sans-serif';
 const button=document.createElement('button');button.textContent=`Записать бой · ${duration} секунд`;const status=document.createElement('output');status.style.display='block';box.append(button,status);document.body.append(box);
 button.onclick=()=>{
  if(!canvas.captureStream||typeof MediaRecorder==='undefined'){status.textContent='Запись не поддерживается';return;}
  const stream=canvas.captureStream(30),chunks=[];let recorder;
  const mimeType=['video/mp4;codecs=avc1.42001f','video/mp4','video/webm;codecs=vp9','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  try{recorder=new MediaRecorder(stream,{mimeType});}catch{stream.getTracks().forEach(t=>t.stop());status.textContent='Запись не поддерживается';return;}
  button.disabled=true;status.textContent=`Запись настоящего боя · ${duration} секунд`;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>{const a=document.createElement('a');a.id='bio-recording';a.href=reader.result;a.download=`bioso-biotech-battle.${mimeType?.includes('mp4')?'mp4':'webm'}`;a.textContent='Скачать запись боя';status.replaceChildren(a);button.disabled=false;};reader.readAsDataURL(new Blob(chunks,{type:mimeType}));};
  recorder.start();onStart();setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},duration*1000);
 };
}
