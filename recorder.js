/* Local-only voice recorder for MIRA. Does not send or understand audio. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const start = $('recordStart'), stop = $('recordStop'), playback = $('recordPlayback');
  const status = $('recordStatus'), download = $('recordDownload');
  if (!start || !stop || !playback || !status || !download) return;

  let recorder = null, stream = null, currentUrl = '';
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
    typeof window.MediaRecorder === 'function' && window.isSecureContext);

  function message(value) { status.textContent = value; }
  function clearPrevious() {
    playback.pause();
    playback.hidden = true;
    playback.removeAttribute('src');
    playback.load();
    download.hidden = true;
    download.removeAttribute('href');
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = '';
  }
  function releaseStream() {
    try { stream?.getTracks().forEach(track => track.stop()); } catch (_) {}
    stream = null;
  }
  function resetButtons() { start.disabled = !supported(); start.hidden = false; stop.hidden = true; }
  const types = ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
  function preferredFormat() {
    return types.find(type => { try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; } }) || '';
  }
  start.addEventListener('click', async () => {
    if (!supported()) {
      message('Запись в этом браузере недоступна. Можно использовать обычный «Диктофон» телефона и отправить файл в чат.');
      return;
    }
    if (recorder && recorder.state !== 'inactive') return;
    start.disabled = true;
    clearPrevious();
    message('Запрашиваю разрешение на микрофон…');
    try {
      window.MiraVoice?.stopDictation();
      window.MiraVoice?.stopPlayback();
      const captured = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true,noiseSuppression:true}});
      stream = captured;
      const mimeType = preferredFormat();
      recorder = mimeType ? new MediaRecorder(captured,{mimeType}) : new MediaRecorder(captured);
      const parts = [];
      recorder.ondataavailable = event => { if(event.data && event.data.size>0) parts.push(event.data); };
      recorder.onerror = () => { message('Запись прервалась. Проверь микрофон и попробуй ещё раз.'); releaseStream();resetButtons(); };
      recorder.onstop = () => {
        releaseStream(); resetButtons();
        const mime = recorder?.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(parts,{type:mime});
        if(!blob.size){message('Не удалось получить аудио. Попробуй ещё раз или запиши в диктофоне телефона.');return;}
        currentUrl = URL.createObjectURL(blob);
        playback.src = currentUrl;playback.hidden = false;
        download.href = currentUrl;
        download.download = 'mira-my-voice.' + (/mp4/.test(mime)?'m4a':/ogg/.test(mime)?'ogg':'webm');
        download.hidden = false;
        message('Запись готова. Можно послушать и сохранить файл на устройстве.');
      };
      recorder.start();
      start.hidden = true;stop.hidden = false;start.disabled = false;
      message('● Запись идёт. Нажми «Завершить запись», когда закончишь.');
    } catch (error) {
      releaseStream(); recorder=null;resetButtons();
      const name = error?.name;
      message(name==='NotAllowedError'||name==='PermissionDeniedError'
        ? 'Браузер не разрешил доступ к микрофону. Разреши его для сайта в настройках браузера.'
        : name==='NotFoundError' ? 'Микрофон не найден. Подключи микрофон или используй диктофон телефона.'
        : 'Запись не запустилась. Попробуй другой браузер или обычный диктофон.');
    }
  });
  stop.addEventListener('click', () => {
    if(!recorder || recorder.state==='inactive'){resetButtons();return;}
    stop.disabled=true;message('Завершаю запись…');
    try {recorder.stop();} catch (_) {releaseStream();resetButtons();message('Запись остановлена.');}
    stop.disabled=false;
  });
  window.addEventListener('pagehide', () => {
    if(recorder?.state==='recording')try{recorder.stop();}catch(_){}
    releaseStream();
    if(currentUrl)URL.revokeObjectURL(currentUrl);
  });
  if(!supported()){
    message('Запись недоступна здесь. Используй диктофон телефона или открой MIRA в Chrome/Safari по HTTPS.');
    start.disabled=true;
  }
})();
