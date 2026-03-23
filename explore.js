/* ============================================
   EXPLORE.JS - Interactive 3D Shape Explorer
   ============================================ */

const ExploreMode = (() => {
  let scene3d = null;
  let currentShape = 'box';
  let dims = { a: 4, b: 3, c: 2 };
  let netCanvas = null;
  let showingNet = false;
  let unfoldAnimId = null;
  let isUnfoldPlaying = false;

  function init() {
    scene3d = new Scene3D('#explore-viewer');
    scene3d.createShape('box', dims);
    setupControls();
    updateInfo();
  }

  function setupControls() {
    // Shape selector
    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        SoundEngine.click();
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentShape = btn.dataset.shape;

        const cubeDims = document.getElementById('cube-dims');
        const boxDims = document.getElementById('box-dims');

        if (currentShape === 'cube') {
          cubeDims.style.display = 'block';
          boxDims.style.display = 'none';
          dims = { a: parseFloat(document.getElementById('dim-cube-a').value) };
        } else {
          cubeDims.style.display = 'none';
          boxDims.style.display = 'block';
          dims = {
            a: parseFloat(document.getElementById('dim-a').value),
            b: parseFloat(document.getElementById('dim-b').value),
            c: parseFloat(document.getElementById('dim-c').value),
          };
        }
        updateShape();
      });
    });

    // Box dimension sliders
    ['a', 'b', 'c'].forEach(dim => {
      const slider = document.getElementById(`dim-${dim}`);
      const valueEl = document.getElementById(`val-${dim}`);
      if (slider) {
        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value);
          dims[dim] = val;
          valueEl.textContent = val;
          updateShape();
        });
      }
    });

    // Cube dimension slider
    const cubeSlider = document.getElementById('dim-cube-a');
    const cubeVal = document.getElementById('val-cube-a');
    if (cubeSlider) {
      cubeSlider.addEventListener('input', () => {
        const val = parseFloat(cubeSlider.value);
        dims = { a: val };
        cubeVal.textContent = val;
        updateShape();
      });
    }

    // Action buttons
    document.getElementById('btn-wireframe')?.addEventListener('click', () => {
      SoundEngine.click();
      scene3d.toggleWireframe();
      document.getElementById('btn-wireframe').classList.toggle('active');
    });

    document.getElementById('btn-rotate')?.addEventListener('click', () => {
      SoundEngine.click();
      const isRotating = scene3d.toggleAutoRotate();
      const btn = document.getElementById('btn-rotate');
      btn.classList.toggle('active', isRotating);
    });

    document.getElementById('btn-reset-view')?.addEventListener('click', () => {
      SoundEngine.click();
      scene3d.resetView();
    });

    document.getElementById('btn-net')?.addEventListener('click', () => {
      SoundEngine.click();
      showingNet = !showingNet;
      document.getElementById('btn-net').classList.toggle('active', showingNet);
      const container = document.getElementById('net-container');
      if (showingNet) {
        container.style.display = 'block';
        // Switch to unfolding 3D view
        const slider = document.getElementById('unfold-slider');
        const progress = slider ? parseFloat(slider.value) : 0;
        scene3d.createUnfoldingShape(currentShape, dims, progress);
        scene3d.setAutoRotate(false);
        document.getElementById('btn-rotate')?.classList.remove('active');
        drawNet();
      } else {
        container.style.display = 'none';
        // Restore normal shape
        stopUnfoldAnimation();
        scene3d.exitUnfolding();
        scene3d.createShape(currentShape, dims);
        // Reset slider
        const slider = document.getElementById('unfold-slider');
        if (slider) slider.value = 0;
        const progressText = document.getElementById('unfold-progress-text');
        if (progressText) progressText.textContent = '0%';
        const playBtn = document.getElementById('btn-unfold-play');
        if (playBtn) {
          playBtn.textContent = '▶ Tự động mở';
          playBtn.classList.remove('active');
        }
      }
    });

    // Unfold slider
    document.getElementById('unfold-slider')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      scene3d.updateUnfoldProgress(val);
      document.getElementById('unfold-progress-text').textContent = Math.round(val * 100) + '%';
    });

    // Auto play/pause
    document.getElementById('btn-unfold-play')?.addEventListener('click', () => {
      SoundEngine.click();
      if (isUnfoldPlaying) {
        stopUnfoldAnimation();
      } else {
        startUnfoldAnimation();
      }
    });
  }

  function startUnfoldAnimation() {
    isUnfoldPlaying = true;
    const btn = document.getElementById('btn-unfold-play');
    btn.textContent = '⏸ Tạm dừng';
    btn.classList.add('active');

    const slider = document.getElementById('unfold-slider');
    const progressText = document.getElementById('unfold-progress-text');
    let val = parseFloat(slider.value);

    // If already at 1, reset to 0
    if (val >= 0.99) {
      val = 0;
      slider.value = 0;
      scene3d.updateUnfoldProgress(0);
    }

    const speed = 0.006; // progress per frame

    function animateStep() {
      val += speed;
      if (val >= 1) {
        val = 1;
        slider.value = val;
        scene3d.updateUnfoldProgress(val);
        progressText.textContent = '100%';
        stopUnfoldAnimation();
        return;
      }
      slider.value = val;
      scene3d.updateUnfoldProgress(val);
      progressText.textContent = Math.round(val * 100) + '%';
      unfoldAnimId = requestAnimationFrame(animateStep);
    }

    unfoldAnimId = requestAnimationFrame(animateStep);
  }

  function stopUnfoldAnimation() {
    isUnfoldPlaying = false;
    if (unfoldAnimId) {
      cancelAnimationFrame(unfoldAnimId);
      unfoldAnimId = null;
    }
    const btn = document.getElementById('btn-unfold-play');
    if (btn) {
      btn.textContent = '▶ Tự động mở';
      btn.classList.remove('active');
    }
  }

  function updateShape() {
    if (showingNet) {
      const slider = document.getElementById('unfold-slider');
      const progress = slider ? parseFloat(slider.value) : 0;
      scene3d.createUnfoldingShape(currentShape, dims, progress);
      drawNet();
    } else {
      if (currentShape === 'cube') {
        scene3d.createShape('cube', dims);
      } else {
        scene3d.createShape('box', dims);
      }
    }
    updateInfo();
  }

  function updateInfo() {
    let a, b, c;
    if (currentShape === 'cube') {
      a = b = c = dims.a;
    } else {
      a = dims.a;
      b = dims.b;
      c = dims.c;
    }

    const sxq = currentShape === 'cube'
      ? 4 * a * a
      : 2 * (a + b) * c;

    const stp = currentShape === 'cube'
      ? 6 * a * a
      : 2 * (a * b + b * c + a * c);

    const v = a * b * c;

    // Update info values
    document.getElementById('info-sxq').textContent = sxq;
    document.getElementById('info-stp').textContent = stp;
    document.getElementById('info-v').textContent = v;
    document.getElementById('info-canhsum').textContent = currentShape === 'cube' ? 12 * a : 4 * (a + b + c);

    // Update formula
    const formulaEl = document.getElementById('formula-text');
    const resultEl = document.getElementById('formula-result');

    if (currentShape === 'cube') {
      formulaEl.innerHTML = `S<sub>xq</sub> = 4 × a²<br>S<sub>xq</sub> = 4 × ${a}²<br>S<sub>xq</sub> = 4 × ${a * a}`;
      resultEl.textContent = `= ${sxq}`;
    } else {
      formulaEl.innerHTML = `S<sub>xq</sub> = 2 × (a + b) × c<br>S<sub>xq</sub> = 2 × (${a} + ${b}) × ${c}<br>S<sub>xq</sub> = 2 × ${a + b} × ${c}`;
      resultEl.textContent = `= ${sxq}`;
    }
  }

  function drawNet() {
    const canvas = document.getElementById('net-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let a, b, c;
    if (currentShape === 'cube') {
      a = b = c = dims.a;
    } else {
      a = dims.a;
      b = dims.b;
      c = dims.c;
    }

    // Net layout matching the 3D unfolding:
    // Horizontal strip: Left(b×c) - Front(a×c) - Right(b×c) - Back(a×c)
    // Top(a×b) above Front, Bottom(a×b) below Front
    const totalW = b + a + b + a; // width of net
    const totalH = b + c + b; // height of net
    const padding = 40;
    const scale = Math.min(
      (canvas.width - padding * 2) / totalW,
      (canvas.height - padding * 2) / totalH
    );

    const offsetX = (canvas.width - totalW * scale) / 2;
    const offsetY = (canvas.height - totalH * scale) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const faces = [
      // [x, y, w, h, color, label] — matches 3D unfolding layout
      [b, 0, a, b, 'rgba(34, 255, 136, 0.4)', 'Mặt trên'],        // top (above front)
      [0, b, b, c, 'rgba(0, 136, 204, 0.4)', 'Mặt trái'],         // left
      [b, b, a, c, 'rgba(168, 85, 247, 0.4)', 'Mặt trước'],       // front (base)
      [b + a, b, b, c, 'rgba(0, 212, 255, 0.4)', 'Mặt phải'],     // right
      [b + a + b, b, a, c, 'rgba(119, 51, 187, 0.4)', 'Mặt sau'], // back
      [b, b + c, a, b, 'rgba(17, 153, 85, 0.4)', 'Mặt dưới'],    // bottom (below front)
    ];

    faces.forEach(([fx, fy, fw, fh, color, label]) => {
      const sx = offsetX + fx * scale;
      const sy = offsetY + fy * scale;
      const sw = fw * scale;
      const sh = fh * scale;

      ctx.fillStyle = color;
      ctx.fillRect(sx, sy, sw, sh);

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.max(10, Math.min(14, sw / 6))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx + sw / 2, sy + sh / 2 - 8);

      // Dimensions
      ctx.fillStyle = 'rgba(0,212,255,0.9)';
      ctx.font = `bold ${Math.max(9, Math.min(12, sw / 8))}px JetBrains Mono, monospace`;
      ctx.fillText(`${fw}×${fh}`, sx + sw / 2, sy + sh / 2 + 10);
    });

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hình khai triển 2D', canvas.width / 2, canvas.height - 10);
  }

  function destroy() {
    if (scene3d) {
      stopUnfoldAnimation();
      scene3d.exitUnfolding();
      scene3d.dispose();
      scene3d = null;
    }
    showingNet = false;
    isUnfoldPlaying = false;
  }

  return { init, destroy, updateShape };
})();
