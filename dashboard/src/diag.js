// On-screen performance readout for tuning on the real frame.
// ?diag turns it on (remembered on the device), ?diag=0 turns it off.
const STORE = 'frame-diag';
const LONG_FRAME_MS = 50;

export function startDiag() {
  const flag = new URLSearchParams(location.search).get('diag');
  if (flag !== null) localStorage.setItem(STORE, flag === '0' ? 'off' : 'on');
  if (localStorage.getItem(STORE) !== 'on') return;

  // Frame timestamps from the last second give fps; gaps over LONG_FRAME_MS count as long frames.
  const stamps = [];
  let longFrames = 0;
  const onFrame = (now) => {
    const prev = stamps[stamps.length - 1];
    if (prev !== undefined && now - prev > LONG_FRAME_MS) longFrames++;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  const box = document.body.appendChild(document.createElement('div'));
  box.className = 'diag';
  box.style.whiteSpace = 'pre';

  const engine = /Chrome\/(\d+)/.exec(navigator.userAgent);
  const report = () => {
    const decoded = Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0);
    const pixels = decoded.reduce((sum, img) => sum + img.naturalWidth * img.naturalHeight, 0);
    const heap = performance.memory ? (performance.memory.usedJSHeapSize / 2 ** 20).toFixed(0) + ' MB' : '?';
    box.textContent = [
      `Chrome ${engine ? engine[1] : '?'}  ${innerWidth}x${innerHeight} css  dpr ${devicePixelRatio}`,
      `${stamps.length} fps  ${longFrames} long frames (>${LONG_FRAME_MS} ms)`,
      `${document.getElementsByTagName('*').length} nodes  ${decoded.length} images ${(pixels / 1e6).toFixed(1)} MP  heap ${heap}`,
    ].join('\n');
  };
  report();
  setInterval(report, 2000);
}
