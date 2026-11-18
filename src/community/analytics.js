export async function sendInteraction(request, item) {
  // Один ограниченный повтор с тем же UUID: сервер обеспечивает идемпотентность.
  for (let attempt = 0; attempt < 2; attempt++) {
    try { await request('/community-interactions', { method: 'POST', body: { items: [item] } }); return true; }
    catch (error) { if (error.name === 'AbortError' || error.status) return false; }
  }
  return false;
}

export function startExperienceReading({ request, experienceId, source, isVisible, now = () => performance.now() }) {
  let stopped = false;
  let confirmed = false;
  let last = now();
  let lastAction = last;
  let duration = 0;
  let previouslyVisible = isVisible() && document.visibilityState === 'visible';
  const openId = crypto.randomUUID();
  const flush = () => {
    if (!confirmed || duration <= 0) return;
    const seconds = Math.min(15, duration / 1000);
    duration = 0;
    void sendInteraction(request, { id: crypto.randomUUID(), kind: 'experience_read_interval', experience_id: experienceId, source, open_id: openId, duration: seconds });
  };
  const sample = () => {
    const time = now();
    const visible = isVisible() && document.visibilityState === 'visible';
    if (confirmed && previouslyVisible && visible) duration += Math.max(0, Math.min(time, lastAction + 60000) - last);
    last = time;
    previouslyVisible = visible;
    if (duration >= 15000 || !visible || time >= lastAction + 60000) flush();
  };
  const activity = () => { sample(); lastAction = now(); };
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => window.addEventListener(event, activity, { passive: true }));
  document.addEventListener('visibilitychange', sample);
  const timer = setInterval(sample, 1000);
  void sendInteraction(request, { id: openId, kind: 'experience_open', experience_id: experienceId, source }).then(ok => {
    if (!stopped && ok) { confirmed = true; last = now(); }
  });
  return () => {
    if (stopped) return;
    sample(); flush(); stopped = true;
    clearInterval(timer);
    events.forEach(event => window.removeEventListener(event, activity));
    document.removeEventListener('visibilitychange', sample);
  };
}
