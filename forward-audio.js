/* MIRA Forward 8: the official audio stays on publisher's site or user's device. */
(() => {
  'use strict';
  const pick=document.getElementById('forwardLocalAudio');
  const audio=document.getElementById('forwardAudioPlayer');
  const clear=document.getElementById('forwardAudioClear');
  const status=document.getElementById('forwardAudioStatus');
  if(!pick||!audio||!clear||!status)return;
  let objectUrl='';
  function release(){
    try {audio.pause();}catch(_){}
    audio.removeAttribute('src'); audio.load();audio.hidden=true;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
    clear.hidden=true;
  }
  pick.addEventListener('change',()=>{
    release();
    const file=pick.files&&pick.files[0];
    if(!file){status.textContent='Файл не выбран. Можно слушать у издателя по ссылке выше.';return;}
    const extension=/\.(mp3|m4a|mp4|wav|ogg|webm)$/i.test(file.name);
    if(!extension && !file.type.startsWith('audio/')){
      pick.value='';
      status.textContent='Выбери распакованный аудиофайл, а не ZIP-архив: MP3, M4A, WAV, OGG или WEBM.';
      return;
    }
    if(file.size===0){
      pick.value='';status.textContent='Этот файл пустой. Выбери другую запись.';return;
    }
    objectUrl=URL.createObjectURL(file);
    audio.src=objectUrl;audio.hidden=false;clear.hidden=false;
    status.textContent='Выбрана запись: '+file.name+'. Нажми ▶ в плеере. Файл не отправляется на сервер.';
  });
  audio.addEventListener('error',()=>{
    if(!objectUrl)return;
    status.textContent='Не получилось воспроизвести этот формат. Попробуй MP3 или M4A, либо слушай на сайте издателя.';
  });
  clear.addEventListener('click',()=>{
    release();pick.value='';
    status.textContent='Запись убрана. Можно выбрать другую или слушать на сайте издателя.';
  });
  window.addEventListener('pagehide',()=>{
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
  });
})();
