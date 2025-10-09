function updateCounter(elementId, newValue, duration = 500) {
    const el = document.getElementById(elementId);
    if (!el) return;
  
    // hent dagens tallverdi fra elementet (fallback = 0)
    const currentValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
    const startTime = performance.now();
    const diff = newValue - currentValue;
  
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1); // 0 → 1
      const ease = 1 - Math.pow(1 - progress, 3);       // myk easing
      const current = currentValue + diff * ease;
  
      // hvis du vil ha heltall
      el.textContent = Math.round(current).toLocaleString('no-NO');
  
      if (progress < 1) requestAnimationFrame(animate);
    }
  
    requestAnimationFrame(animate);
  }
  