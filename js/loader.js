(function(){
  // Simple Loader controller: reference-counted, with 30s safety fallback.
  const OVERLAY_ID = 'loadingOverlay';
  let _count = 0;
  let _timeout = null;

  function getOverlay(){ return document.getElementById(OVERLAY_ID); }

  function _clearTimeout(){ if (_timeout) { clearTimeout(_timeout); _timeout = null; } }

  function show(){
    const ov = getOverlay();
    if (!ov) return;
    _count++;
    ov.classList.remove('hidden');
    ov.style.display = 'flex';
    console.debug('Loader.show count=', _count);
    _clearTimeout();
    // safety hide after 30s if hide isn't called
    _timeout = setTimeout(()=>{
      console.warn('Loader fallback hide after timeout');
      _count = 0;
      try { ov.classList.add('hidden'); ov.style.display = 'none'; } catch(e){}
      _timeout = null;
    }, 30000);
  }

  function hide(force){
    const ov = getOverlay();
    if (!ov) return;
    if (!force) _count = Math.max(0, _count - 1);
    if (_count <= 0) {
      try { ov.classList.add('hidden'); ov.style.display = 'none'; } catch(e){}
      _count = 0;
      _clearTimeout();
    }
    console.debug('Loader.hide count=', _count);
  }

  window.Loader = { show, hide, isVisible: ()=>{ const ov = getOverlay(); return ov && !ov.classList.contains('hidden') && ov.style.display !== 'none'; } };

  // Backwards-compatible global function used by existing code
  window.toggleLoading = function(on){ if (on) window.Loader.show(); else window.Loader.hide(); };
})();
