// Upload View Handler
(function initUploadView() {
  const uploadView = document.getElementById('uploadView');
  const editorView = document.getElementById('editorView');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectBtn');
  const uploadMenu = document.getElementById('uploadMenu');
  
  if (!dropzone) return; // Exit if no dropzone (editor is already shown)
  
  // Dropdown toggle
  selectBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBtn.classList.toggle('active');
    uploadMenu.classList.toggle('show');
  });
  
  // Close dropdown
  document.addEventListener('click', () => {
    selectBtn?.classList.remove('active');
    uploadMenu?.classList.remove('show');
  });
  
  // File input
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
  
  // Dropzone click
  dropzone?.addEventListener('click', (e) => {
    if (!e.target.closest('.upload-dropdown')) {
      fileInput.click();
    }
  });
  
  // Drag and drop
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  // Upload options
  document.getElementById('fromDevice')?.addEventListener('click', () => {
    fileInput.click();
  });
  
  document.getElementById('fromURL')?.addEventListener('click', () => {
    showURLModal();
  });
  
  // Back button
  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (uploadView && editorView) {
      editorView.style.display = 'none';
      uploadView.style.display = 'block';
    }
  });
  
  function handleFile(file) {
    // Support HEIC format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isValid = file.type.startsWith('image/') || validTypes.some(t => file.type === t);
    
    if (!isValid) {
      NotificationModal.error('Please select a valid image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      NotificationModal.error('File size exceeds 10 MB limit');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Resize canvas to match image aspect ratio
        const canvas = document.getElementById('c');
        if (canvas) {
          const maxSize = 1200;
          let newWidth = img.width;
          let newHeight = img.height;
          
          // Scale down if too large
          if (newWidth > maxSize || newHeight > maxSize) {
            const ratio = Math.min(maxSize / newWidth, maxSize / newHeight);
            newWidth = Math.round(newWidth * ratio);
            newHeight = Math.round(newHeight * ratio);
          }
          
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Store the image object for canvas
          img.dataURL = e.target.result;
        }
        
        // Show editor view
        if (uploadView && editorView) {
          uploadView.style.display = 'none';
          editorView.style.display = 'flex';
        }
        
        // Add image to canvas after a short delay to ensure canvas is ready
        setTimeout(() => {
          if (window.canvaState) {
            window.canvaState.addImageFromDataURL(e.target.result, img.width, img.height);
          }
        }, 100);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  function showURLModal() {
    const modal = document.getElementById('urlModal');
    const urlInput = document.getElementById('imageUrl');
    const cancelBtn = document.getElementById('cancelUrlBtn');
    const loadBtn = document.getElementById('loadUrlBtn');
    
    modal.style.display = 'flex';
    urlInput.value = '';
    urlInput.focus();
    
    const hideModal = () => {
      modal.style.display = 'none';
    };
    
    cancelBtn.onclick = hideModal;
    modal.querySelector('.modal-overlay').onclick = hideModal;
    
    loadBtn.onclick = () => {
      const url = urlInput.value.trim();
      if (!url) {
        NotificationModal.error('Please enter a URL');
        return;
      }
      
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'image.jpg', { type: blob.type });
          handleFile(file);
          hideModal();
        })
        .catch(() => {
          NotificationModal.error('Failed to load image from URL');
        });
    };
  }
})();

// Canvas Editor
(function(){
  const canvas = document.getElementById('c');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const state = {
    objects: [], sel: null, drag: null, history: [], future: [], bgColor: null
  };
  
  // Expose state for upload handler
  window.canvaState = {
    addImageFromDataURL: (dataURL, width, height) => {
      const img = new Image();
      img.onload = () => {
        const id = Date.now();
        const canvas = document.getElementById('c');
        const canvasWidth = canvas ? canvas.width : 1080;
        const canvasHeight = canvas ? canvas.height : 1080;
        
        state.objects.push({
          id, 
          type: 'image', 
          x: 0, 
          y: 0,
          w: canvasWidth, 
          h: canvasHeight,
          r: 0, 
          src: dataURL, 
          img: img,
          opacity: 1
        });
        draw();
        status('Image loaded - Ready to edit');
      };
      img.src = dataURL;
    }
  };

  const $ = id => document.getElementById(id);
  const status = t => $('status').textContent = t || 'Ready';
  const snap = () => JSON.stringify({objects: state.objects, bgColor: state.bgColor});
  const pushHistory = () => { state.history.push(snap()); state.future.length = 0; };

  function loadSnap(json){
    try{
      const data = JSON.parse(json);
      state.objects = data.objects || [];
      state.bgColor = ('bgColor' in data) ? data.bgColor : null;
      draw();
    }catch(e){ NotificationModal.error('Invalid JSON'); }
  }

  const deg = a => a*Math.PI/180;

  function clear(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(state.bgColor){ ctx.save(); ctx.fillStyle=state.bgColor; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore(); }
  }

  function fillStroke(fill, stroke, o){
    if(o.fill){ ctx.fillStyle = o.fill; fill(); }
    if(o.sw>0){ ctx.strokeStyle = o.stroke||'#000'; ctx.lineWidth = o.sw; stroke(); }
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = String(text).split(/\s+/);
    let line='', yy=y - lineHeight/2, lines=[];
    for (let n=0;n<words.length;n++){
      const test = line + words[n] + ' ';
      if (ctx.measureText(test).width > maxWidth && n>0) { lines.push(line); line = words[n] + ' '; }
      else line = test;
    }
    lines.push(line);
    yy = y - (lines.length-1)*lineHeight/2;
    lines.forEach((ln,i)=> ctx.fillText(ln.trimEnd(), x, yy + i*lineHeight));
  }

  function drawObj(o){
    ctx.save();
    ctx.globalAlpha = (o.opacity ?? 1);
    ctx.translate(o.x + o.w/2, o.y + o.h/2);
    ctx.rotate(deg(o.angle||0));
    
    // Handle flipping for images
    if(o.type==='image' && (o.flipH || o.flipV)){
      ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
    }
    
    ctx.translate(-o.w/2, -o.h/2);
    if(o.type==='rect'){
      fillStroke(()=>ctx.fillRect(0,0,o.w,o.h), ()=>ctx.strokeRect(0,0,o.w,o.h), o);
    }else if(o.type==='circle'){
      const r = Math.min(o.w,o.h)/2;
      ctx.beginPath(); ctx.arc(o.w/2, o.h/2, r, 0, Math.PI*2);
      fillStroke(()=>ctx.fill(), ()=>ctx.stroke(), o);
    }else if(o.type==='tri'){
      ctx.beginPath(); ctx.moveTo(o.w/2,0); ctx.lineTo(o.w,o.h); ctx.lineTo(0,o.h); ctx.closePath();
      fillStroke(()=>ctx.fill(), ()=>ctx.stroke(), o);
    }else if(o.type==='text'){
      ctx.fillStyle = o.fill||'#fff';
      ctx.font = `${o.fontWeight||600} ${o.fontSize||48}px ${o.font||'Inter'}`;
      ctx.textAlign = (o.align||'left');
      const x = o.align==='center'? o.w/2 : o.align==='right'? o.w-4 : 4;
      ctx.textBaseline = 'middle';
      wrapText(ctx, o.text||'Your text', x, o.h/2, o.w-8, (o.fontSize||48)*1.2);
      if(o.sw>0){ ctx.strokeStyle=o.stroke||'#000'; ctx.lineWidth=o.sw; ctx.strokeText(o.text||'Your text', x, o.h/2); }
    }else if(o.type==='image' && o.img){
      ctx.drawImage(o.img, 0, 0, o.w, o.h);
      if(o.sw>0){ ctx.strokeStyle=o.stroke||'#000'; ctx.lineWidth=o.sw; ctx.strokeRect(0,0,o.w,o.h); }
    }
    ctx.restore();
  }

  function draw(){
    clear();
    state.objects.forEach(drawObj);
    if(state.sel!=null){
      const o = state.objects[state.sel];
      ctx.save();
      ctx.translate(o.x + o.w/2, o.y + o.h/2);
      ctx.rotate(deg(o.angle||0));
      ctx.translate(-o.w/2, -o.h/2);
      ctx.strokeStyle = '#6ea8fe'; ctx.setLineDash([4,3]); ctx.lineWidth = 1;
      ctx.strokeRect(0,0,o.w,o.h);
      ctx.restore();
    }
  }

  function hit(x,y){
    for(let i=state.objects.length-1;i>=0;i--){
      const o = state.objects[i];
      if(x>=o.x && y>=o.y && x<=o.x+o.w && y<=o.y+o.h) return i;
    }
    return null;
  }

  canvas.addEventListener('mousedown', e=>{
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const i = hit(x,y);
    state.sel = i;
    if(i!=null){ state.drag = {dx:x-state.objects[i].x, dy:y-state.objects[i].y}; pushHistory(); }
    draw();
  });
  window.addEventListener('mousemove', e=>{
    if(!state.drag || state.sel==null) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const o = state.objects[state.sel];
    o.x = Math.round(x - state.drag.dx); o.y = Math.round(y - state.drag.dy);
    draw();
  });
  window.addEventListener('mouseup', ()=> state.drag=null);

  function add(o){ state.objects.push(Object.assign({x:100,y:100,w:300,h:200,fill:'#ffffff',stroke:'#000000',sw:0,opacity:1,angle:0}, o)); pushHistory(); draw(); }
  $('add-text').onclick = ()=> add({type:'text', text:'Double-click to edit', fill:'#ffffff', stroke:'#000000', sw:0, font:'Inter', fontSize:48, align:'center'});
  $('add-rect').onclick = ()=> add({type:'rect', fill:'#ffffff'});
  $('add-circle').onclick = ()=> add({type:'circle', fill:'#ffffff'});
  $('add-triangle').onclick = ()=> add({type:'tri', fill:'#ffffff'});

  $('add-image').onclick = ()=> $('img-file').click();
  $('img-file').addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const img = new Image();
    img.onload = ()=> add({type:'image', img, src: URL.createObjectURL(f), w: Math.min(640,img.width), h: Math.min(640,img.height)});
    img.src = URL.createObjectURL(f);
  });

  $('add-image-url').onclick = async ()=>{
    const url = $('img-url').value.trim(); if(!url) return;
    try{
      const res = await fetch(url, {mode:'cors'});
      if(!res.ok) throw new Error(res.status);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = ()=> add({type:'image', img, src: objUrl, w: Math.min(640,img.width), h: Math.min(640,img.height)});
      img.src = objUrl;
    }catch(e){ NotificationModal.error('Could not load image URL'); }
  };

  const selected = ()=> state.sel!=null ? state.objects[state.sel] : null;
  $('bring-front').onclick = ()=>{ const o = selected(); if(!o) return; pushHistory(); const i=state.sel; state.objects.splice(i,1); state.objects.push(o); state.sel = state.objects.length-1; draw(); };
  $('send-back').onclick = ()=>{ const o = selected(); if(!o) return; pushHistory(); const i=state.sel; state.objects.splice(i,1); state.objects.unshift(o); state.sel = 0; draw(); };
  $('clone').onclick = ()=>{ const o = selected(); if(!o) return; pushHistory(); const c = JSON.parse(JSON.stringify(o)); c.x += 20; c.y += 20; if(c.type==='image' && o.img){ const img = new Image(); img.src = o.img.src; c.img = img; } state.objects.push(c); state.sel = state.objects.length-1; draw(); };
  $('del').onclick = ()=>{ if(state.sel==null) return; pushHistory(); state.objects.splice(state.sel,1); state.sel=null; draw(); };

  // Flip and Transform
  $('flip-h').onclick = ()=>{ 
    const o = selected(); 
    if(!o || o.type!=='image') { NotificationModal.info('Select an image to flip'); return; }
    pushHistory(); 
    o.flipH = !o.flipH; 
    draw(); 
    status('Flipped horizontally');
  };
  
  $('flip-v').onclick = ()=>{ 
    const o = selected(); 
    if(!o || o.type!=='image') { NotificationModal.info('Select an image to flip'); return; }
    pushHistory(); 
    o.flipV = !o.flipV; 
    draw(); 
    status('Flipped vertically');
  };
  
  $('rotate-90').onclick = ()=>{ 
    const o = selected(); 
    if(!o) { NotificationModal.info('Select an object to rotate'); return; }
    pushHistory(); 
    o.angle = (o.angle || 0) + 90;
    if(o.angle >= 360) o.angle = 0;
    draw(); 
    status('Rotated 90°');
  };
  
  $('enhance').onclick = async ()=>{ 
    const o = selected(); 
    if(!o || o.type!=='image') { NotificationModal.error('Select an image to enhance'); return; }
    try{
      status('Enhancing image…');
      NotificationModal.info('Enhancing image...');
      
      // Create a temporary canvas for enhancement
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = o.img.width;
      tempCanvas.height = o.img.height;
      
      // Draw original image
      tempCtx.drawImage(o.img, 0, 0);
      
      // Get image data
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // Auto-enhance: increase contrast and brightness
      for(let i = 0; i < data.length; i += 4) {
        // Increase contrast (factor 1.2)
        data[i] = Math.min(255, (data[i] - 128) * 1.2 + 128);     // R
        data[i+1] = Math.min(255, (data[i+1] - 128) * 1.2 + 128); // G
        data[i+2] = Math.min(255, (data[i+2] - 128) * 1.2 + 128); // B
        
        // Slight brightness boost
        data[i] = Math.min(255, data[i] + 10);
        data[i+1] = Math.min(255, data[i+1] + 10);
        data[i+2] = Math.min(255, data[i+2] + 10);
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // Create new image from enhanced data
      const enhancedUrl = tempCanvas.toDataURL();
      const img = new Image();
      await new Promise((resolve)=>{ img.onload=resolve; img.src=enhancedUrl; });
      
      pushHistory();
      o.img = img; 
      o.src = enhancedUrl;
      draw();
      status('Image enhanced');
      NotificationModal.success('Image enhanced successfully');
    }catch(e){
      NotificationModal.error('Enhancement failed'); 
      status('Ready');
    }
  };

  $('fill').addEventListener('input', e=>{ const o=selected(); if(!o) return; o.fill=e.target.value; draw(); });
  $('stroke').addEventListener('input', e=>{ const o=selected(); if(!o) return; o.stroke=e.target.value; draw(); });
  $('stroke-w').addEventListener('input', e=>{ const o=selected(); if(!o) return; o.sw=parseFloat(e.target.value)||0; draw(); });
  $('opacity').addEventListener('input', e=>{ const o=selected(); if(!o) return; o.opacity=parseFloat(e.target.value); draw(); });
  $('font').addEventListener('change', e=>{ const o=selected(); if(!o || o.type!=='text') return; o.font=e.target.value; draw(); });
  $('align-left').onclick = ()=>{ const o=selected(); if(!o || o.type!=='text') return; o.align='left'; draw(); };
  $('align-center').onclick = ()=>{ const o=selected(); if(!o || o.type!=='text') return; o.align='center'; draw(); };
  $('align-right').onclick = ()=>{ const o=selected(); if(!o || o.type!=='text') return; o.align='right'; draw(); };

  canvas.addEventListener('dblclick', e=>{
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const i = (function(){ for(let k=state.objects.length-1;k>=0;k--){ const o=state.objects[k]; if(x>=o.x && y>=o.y && x<=o.x+o.w && y<=o.y+o.h) return k; } return null; })();
    if(i==null) return;
    const o = state.objects[i];
    if(o.type==='text'){
      const t = prompt('Edit text:', o.text||'');
      if(t!=null){ pushHistory(); o.text=t; state.sel=i; draw(); }
    }
  });

  $('undo').onclick = ()=>{ if(!state.history.length) return; const cur = snap(); state.future.push(cur); const prev = state.history.pop(); loadSnap(prev); };
  $('redo').onclick = ()=>{ if(!state.future.length) return; const cur = snap(); state.history.push(cur); const next = state.future.pop(); loadSnap(next); };

  $('btn-resize').onclick = ()=>{
    const w = Math.max(64, Math.min(4096, parseInt($('w').value||1080)));
    const h = Math.max(64, Math.min(4096, parseInt($('h').value||1080)));
    canvas.width = w; canvas.height = h; draw();
  };
  $('bg-color').addEventListener('input', e=>{ state.bgColor = e.target.value; draw(); });
  $('bg-clear').onclick = ()=>{ state.bgColor = null; draw(); };

  $('bg-remove').onclick = async ()=>{
    const o = selected();
    if(!o || o.type!=='image'){ NotificationModal.error('Select an image layer first'); return; }
    try{
      // Show loading modal
      LoadingModal.show('Removing Background', 'Processing your image with AI');
      LoadingModal.simulateProgress(5000);
      
      status('Removing background…');
      const blob = await fetch(o.src).then(r=>r.blob());
      const fd = new FormData();
      fd.append('file', blob, 'image.png');
      fd.append('format','png');
      fd.append('backdrop','transparent');
      const res = await fetch('/api/remove-bg', {method:'POST', body: fd});
      if(!res.ok) throw new Error('Server error');
      const out = await res.blob();
      const url = URL.createObjectURL(out);
      const img = new Image();
      await new Promise((resolve)=>{ img.onload=resolve; img.src=url; });
      o.img = img; o.src = url;
      draw();
      
      // Update loading and hide
      LoadingModal.updateProgress(100);
      LoadingModal.updateMessage('✓ Background removed!');
      await LoadingModal.hide();
      
      status('Background removed');
      NotificationModal.success('Background removed successfully');
    }catch(e){
      await LoadingModal.hide();
      NotificationModal.error('Background removal failed'); 
      status('Ready');
    }
  };

  $('btn-export').onclick = ()=>{
    // Create custom export modal
    const modal = document.createElement('div');
    modal.id = 'export-modal';
    modal.className = 'confirm-modal show';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="confirm-overlay"></div>
      <div class="confirm-dialog">
        <div class="confirm-icon">💾</div>
        <div class="confirm-message">Choose export format:</div>
        <div class="confirm-buttons">
          <button class="confirm-btn-cancel">PNG</button>
          <button class="confirm-btn-ok">JPG</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const exportImage = (type) => {
      const link = document.createElement('a');
      link.download = 'design' + (type==='image/png'? '.png':'.jpg');
      link.href = canvas.toDataURL(type, 0.95);
      link.click();
      document.body.removeChild(modal);
    };
    
    modal.querySelector('.confirm-btn-cancel').onclick = () => exportImage('image/png');
    modal.querySelector('.confirm-btn-ok').onclick = () => exportImage('image/jpeg');
    modal.querySelector('.confirm-overlay').onclick = () => document.body.removeChild(modal);
  };

  $('btn-save').onclick = ()=>{
    const data = snap();
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='design.json'; a.click();
  };
  $('btn-load').onclick = ()=>{
    const i = document.createElement('input'); i.type='file'; i.accept='application/json';
    i.onchange = async (e)=>{ const f = e.target.files[0]; if(!f) return; const txt = await f.text(); loadSnap(txt); draw(); };
    i.click();
  };
  $('btn-new').onclick = ()=>{ 
    NotificationModal.confirm('Clear canvas?', () => { 
      state.objects=[]; 
      state.sel=null; 
      state.bgColor=null; 
      draw(); 
    }); 
  };

  pushHistory();
  draw();
})();