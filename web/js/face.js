// Face recognition helpers (runs fully offline, models in /models)
const Face = (() => {
  let ready = null;
  let stream = null;

  function load(onProgress) {
    if (ready) return ready;
    ready = (async () => {
      if (!window.faceapi) throw new Error('Face library missing');
      try { await faceapi.tf.setBackend('webgl'); } catch { /* fall back to cpu */ }
      await faceapi.tf.ready();
      const steps = [
        ['tinyFaceDetector', faceapi.nets.tinyFaceDetector],
        ['ssdMobilenetv1', faceapi.nets.ssdMobilenetv1],
        ['faceLandmark68Net', faceapi.nets.faceLandmark68Net],
        ['faceRecognitionNet', faceapi.nets.faceRecognitionNet],
      ];
      let i = 0;
      for (const [, net] of steps) {
        await net.loadFromUri('/models');
        onProgress && onProgress(++i / steps.length);
      }
      return true;
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }

  async function startCamera(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not available. Open this page as http://localhost:8000 on the computer with the camera.');
    }
    if (stream) stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.muted = true; video.playsInline = true;
    await video.play();
    await new Promise(r => (video.readyState >= 2 ? r() : (video.onloadeddata = r)));
    return stream;
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  // Quick detection for live preview (fast)
  async function quick(input) {
    return faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks();
  }

  // Accurate detection + 128-number face signature
  async function describe(input) {
    let d = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
    if (!d) d = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptor();
    return d || null;
  }

  async function countFaces(input) {
    const all = await faceapi.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }));
    return all.length;
  }

  // Snapshot of the video (mirrored like the preview), optional crop to a face box
  function snapshot(video, size = 320, box = null) {
    const c = document.createElement('canvas');
    const vw = video.videoWidth, vh = video.videoHeight;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (box) {
      const pad = 0.6;
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const s = Math.max(box.width, box.height) * (1 + pad);
      sw = sh = Math.min(s, vw, vh);
      sx = Math.max(0, Math.min(vw - sw, cx - sw / 2));
      sy = Math.max(0, Math.min(vh - sh, cy - sh / 2));
    }
    const scale = size / Math.max(sw, sh);
    c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
    const g = c.getContext('2d');
    g.translate(c.width, 0); g.scale(-1, 1);
    g.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .82);
  }

  // Eye-aspect-ratio for blink detection (liveness)
  function ear(eye) {
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * d(eye[0], eye[3]));
  }
  function eyeOpenness(landmarks) {
    return (ear(landmarks.getLeftEye()) + ear(landmarks.getRightEye())) / 2;
  }

  function averageDescriptors(list) {
    const out = new Array(128).fill(0);
    list.forEach(d => d.forEach((v, i) => { out[i] += v / list.length; }));
    return out;
  }

  // Interactive helper: runs a loop on a video, calls onFrame(det) for UI
  function loop(video, onFrame) {
    let alive = true;
    (async function tick() {
      while (alive) {
        if (video.readyState >= 2) {
          try { await onFrame(await quick(video)); } catch (e) { console.warn(e); }
        }
        await new Promise(r => setTimeout(r, 120));
      }
    })();
    return () => { alive = false; };
  }

  // Draw box on overlay canvas (mirrored by CSS)
  function draw(canvas, video, det, color = '#4ade80') {
    const g = canvas.getContext('2d');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (!det) return;
    const b = det.detection.box;
    g.strokeStyle = color; g.lineWidth = 4;
    g.strokeRect(b.x, b.y, b.width, b.height);
  }

  return { load, startCamera, stopCamera, quick, describe, countFaces, snapshot, eyeOpenness, averageDescriptors, loop, draw };
})();
