/* Microphone-driven mouth image mapper
   - Preloads images named mouth1.png .. mouthN.png inside images/talkImages/
   - Requests microphone permission on first interaction
   - Computes RMS volume from AnalyserNode, applies simple smoothing
   - Maps volume to image index and updates #mouth.src
*/

(function(){
  const imgEl = document.getElementById('mouth');
  const statusEl = document.getElementById('status');
  const imagesPath = 'images/talkImages/';

  // Discover how many mouth images are present by trying to preload until miss.
  // We'll optimistically try 1..40 (safe upper bound). If you have more, increase.
  const MAX_TRIES = 60;
  let frames = [];

  function preloadFrames(){
    for(let i=1;i<=MAX_TRIES;i++){
      // get 0001.png, 0002.png, etc
      const idxStr = i.toString().padStart(4, '0');
      const url = `${imagesPath}${idxStr}.png`;
      const img = new Image();
      img.src = url;
      img.onerror = function(){ /* stop adding further frames if missing */ };
      frames.push(img);
    }
  }

  preloadFrames();

  // Determine actual frame count by checking which images finished loading
  function actualFrameCount(){
    return frames.filter(f => f.complete && f.naturalWidth !== 0).length || 1;
  }

  // Audio state
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let rafId = null;

  // Calibration and smoothing
  let noiseFloor = 0.001; // initial guess
  let maxObserved = 0.02;
  const smoothing = 0.9; // exponential smoothing (0..1) higher -> slower
  let smoothed = 0;

  function startAudio(){
    if(audioCtx) return;
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      dataArray = new Float32Array(analyser.fftSize);

      statusEl.textContent = 'Calibrating — stay quiet for 1.5s';
      // collect a short silence baseline
      const calibrateMs = 1500;
      const start = performance.now();
      let minSeen = Infinity;
      let maxSeen = 0;

      function sampleOnce(){
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for(let i=0;i<dataArray.length;i++){ sum += dataArray[i]*dataArray[i]; }
        const rms = Math.sqrt(sum/dataArray.length);
        if(rms < minSeen) minSeen = rms;
        if(rms > maxSeen) maxSeen = rms;
        if(performance.now() - start < calibrateMs){
          requestAnimationFrame(sampleOnce);
        } else {
          noiseFloor = Math.max(1e-5, minSeen*1.2);
          maxObserved = Math.max(1e-4, maxSeen*1.5);
          statusEl.textContent = 'Listening — speak to animate';
          // just hide it
          statusEl.style.display = 'none';
          runLoop();
        }
      }
      sampleOnce();
    }).catch(err => {
      statusEl.textContent = 'Microphone access denied or unavailable';
      console.error(err);
    });
  }

  function runLoop(){
    if(!analyser) return;
    analyser.getFloatTimeDomainData(dataArray);
    let sum = 0;
    for(let i=0;i<dataArray.length;i++){ sum += dataArray[i]*dataArray[i]; }
    const rms = Math.sqrt(sum/dataArray.length);

    // update observed max slowly
    maxObserved = Math.max(maxObserved * 0.995, rms);

    // normalize between noiseFloor..maxObserved
    const norm = Math.min(1, Math.max(0, (rms - noiseFloor) / (maxObserved - noiseFloor + 1e-9)));

    // smooth
    smoothed = smoothed * smoothing + norm * (1 - smoothing);

    // pick frame
    const count = actualFrameCount();
    const idx = Math.min(count, Math.max(1, Math.round(smoothed * (count - 1)) + 1));

    // update image
    // get 0001.png, 0002.png, etc
    const idxStr = idx.toString().padStart(4, '0');
    
    const newSrc = `${imagesPath}${idxStr}.png`;
    // console.log(newSrc);
    if(imgEl.src.indexOf(newSrc) === -1){
      imgEl.src = newSrc;
    }

    rafId = requestAnimationFrame(runLoop);
  }

  // click/tap anywhere to start
  document.addEventListener('click', function onFirstClick(){
    document.removeEventListener('click', onFirstClick);
    startAudio();
  }, {once:true});

  // also provide keyboard start for accessibility
  document.addEventListener('keydown', function onKey(){
    document.removeEventListener('keydown', onKey);
    startAudio();
  }, {once:true});

  // expose a small API on window for debugging
  window.talkingFish = {
    start: startAudio,
    stop: ()=>{ if(rafId) cancelAnimationFrame(rafId); if(audioCtx) audioCtx.close(); audioCtx=null; analyser=null; statusEl.textContent='Stopped'; }
  };

})();
