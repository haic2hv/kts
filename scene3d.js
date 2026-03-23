/* ============================================
   SCENE3D.JS - Three.js 3D Visualization
   ============================================ */

class Scene3D {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;

    this.scene = new THREE.Scene();
    this.meshGroup = new THREE.Group();
    this.edgeGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.scene.add(this.meshGroup);
    this.scene.add(this.edgeGroup);
    this.scene.add(this.labelGroup);

    this.dims = { a: 4, b: 3, c: 2 };
    this.shapeType = 'box'; // 'box' or 'cube'
    this.showEdges = true;
    this.showLabels = true;
    this.highlightFace = -1;
    this.isWireframe = false;

    this._initRenderer();
    this._initCamera();
    this._initControls();
    this._initLights();
    this._initGrid();
    this._animate = this._animate.bind(this);
    this._animate();

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this._updateSize();
    this.container.appendChild(this.renderer.domElement);
  }

  _updateSize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  _initCamera() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 0, 0);
  }

  _initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0x00d4ff, 0.6);
    dir1.position.set(5, 8, 5);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xa855f7, 0.4);
    dir2.position.set(-5, 4, -5);
    this.scene.add(dir2);

    const point = new THREE.PointLight(0x22ff88, 0.3, 20);
    point.position.set(0, 5, 0);
    this.scene.add(point);
  }

  _initGrid() {
    const grid = new THREE.GridHelper(20, 20, 0x222244, 0x111133);
    grid.position.y = -0.01;
    this.scene.add(grid);
    this.grid = grid;
  }

  _onResize() {
    this._updateSize();
  }

  _animate() {
    requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  createShape(type, dims) {
    this.shapeType = type;
    this.dims = { ...dims };

    // Clear previous
    this._clearGroup(this.meshGroup);
    this._clearGroup(this.edgeGroup);
    this._clearGroup(this.labelGroup);

    let a, b, c;
    if (type === 'cube') {
      a = b = c = dims.a;
    } else {
      a = dims.a;
      b = dims.b;
      c = dims.c;
    }

    // Face colors: BoxGeometry face order is +x, -x, +y, -y, +z, -z
    const faceColors = [
      0x00d4ff, // right  (+x)
      0x0088cc, // left   (-x)
      0x22ff88, // top    (+y)
      0x119955, // bottom (-y)
      0xa855f7, // front  (+z)
      0x7733bb, // back   (-z)
    ];

    const faceNames = ['Mặt phải', 'Mặt trái', 'Mặt trên', 'Mặt dưới', 'Mặt trước', 'Mặt sau'];

    const hw = a / 2, hh = c / 2, hd = b / 2;

    // Use a single BoxGeometry with per-face materials (6 material array)
    // This guarantees zero gaps since all faces share the same geometry
    const boxGeo = new THREE.BoxGeometry(a, c, b);
    const materials = faceColors.map((color, i) => {
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        side: THREE.FrontSide,
        shininess: 80,
        depthWrite: true,
      });
      return mat;
    });

    // Assign material indices to BoxGeometry groups (each face = 1 group of 2 triangles)
    // BoxGeometry already has 6 groups for the 6 faces in order: +x, -x, +y, -y, +z, -z
    const boxMesh = new THREE.Mesh(boxGeo, materials);
    boxMesh.userData = { faceNames: faceNames, isBoxMesh: true };
    boxMesh.renderOrder = 0; // Render before edges for depth buffer
    this.meshGroup.add(boxMesh);

    // Store face meshes reference for wireframe toggling
    this._faceMaterials = materials;

    // ===== EDGE RENDERING (Hidden-Line Style) =====
    // Two passes: solid lines for visible edges, dashed lines for hidden edges.
    // The box mesh's depth buffer determines which edges are visible/hidden.

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(a, c, b));

    // Pass 1: Solid edges (visible/front edges) — always shown
    const solidEdgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4,
    });
    const solidEdges = new THREE.LineSegments(edgesGeo, solidEdgeMat);
    solidEdges.renderOrder = 1;
    solidEdges.userData = { isSolidEdge: true };
    this.edgeGroup.add(solidEdges);

    // Pass 2: Dashed edges (hidden/back edges) — only shown in wireframe mode
    // Uses GreaterDepth so only renders where depth test FAILS (behind the box)
    const dashedEdgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(a, c, b));
    const dashedEdgeMat = new THREE.LineDashedMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4,
      dashSize: 0.2, gapSize: 0.15, scale: 1,
      depthFunc: THREE.GreaterDepth,
    });
    const dashedEdges = new THREE.LineSegments(dashedEdgesGeo, dashedEdgeMat);
    dashedEdges.computeLineDistances();
    dashedEdges.renderOrder = 2;
    dashedEdges.visible = false;
    dashedEdges.userData = { isHiddenEdge: true };
    this.edgeGroup.add(dashedEdges);

    // Space diagonals (4 lines connecting opposite corners) — dashed, white
    const diagGeo = new THREE.BufferGeometry();
    const diagVertices = new Float32Array([
      -hw, -hh, -hd,   hw,  hh,  hd,   // diagonal 1
       hw, -hh, -hd,  -hw,  hh,  hd,   // diagonal 2
      -hw,  hh, -hd,   hw, -hh,  hd,   // diagonal 3
       hw,  hh, -hd,  -hw, -hh,  hd,   // diagonal 4
    ]);
    diagGeo.setAttribute('position', new THREE.BufferAttribute(diagVertices, 3));
    const diagMat = new THREE.LineDashedMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5,
      dashSize: 0.2, gapSize: 0.15, scale: 1,
      depthTest: false, // Always visible (diagonals are inside, always shown dashed)
    });
    const diagLines = new THREE.LineSegments(diagGeo, diagMat);
    diagLines.computeLineDistances();
    diagLines.renderOrder = 3;
    diagLines.visible = false;
    diagLines.userData = { isDiagonal: true };
    this.edgeGroup.add(diagLines);

    // Dimension labels using sprites
    this._addDimLabel(`a = ${a}`, [0, -hh - 0.5, hd + 0.3], 0x00d4ff);
    this._addDimLabel(`b = ${b}`, [hw + 0.5, -hh - 0.5, 0], 0xa855f7);
    this._addDimLabel(`c = ${c}`, [-hw - 0.7, 0, hd + 0.3], 0x22ff88);

    // Adjust camera
    const maxDim = Math.max(a, b, c);
    this.camera.position.set(maxDim * 1.8, maxDim * 1.4, maxDim * 1.8);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Grid position
    this.grid.position.y = -hh - 0.02;
  }

  _addDimLabel(text, position, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;


    ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.15)`;
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.fill();

    ctx.font = 'bold 32px JetBrains Mono, monospace';
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...position);
    sprite.scale.set(2, 0.5, 1);
    this.labelGroup.add(sprite);
  }

  /**
   * Create an unfolding shape with faces that rotate on hinge edges.
   * @param {string} type - 'box' or 'cube'
   * @param {object} dims - { a, b, c } or { a } for cube
   * @param {number} progress - 0 (folded box) to 1 (flat net)
   */
  createUnfoldingShape(type, dims, progress = 0) {
    this.shapeType = type;
    this.dims = { ...dims };
    this.isUnfolding = true;
    this.unfoldProgress = progress;

    // Clear previous
    this._clearGroup(this.meshGroup);
    this._clearGroup(this.edgeGroup);
    this._clearGroup(this.labelGroup);

    let a, b, c;
    if (type === 'cube') {
      a = b = c = dims.a;
    } else {
      a = dims.a;
      b = dims.b;
      c = dims.c;
    }

    const faceColors = [
      0xa855f7, // front (base) - purple
      0x22ff88, // top - green
      0x119955, // bottom - dark green
      0x0088cc, // left - blue
      0x00d4ff, // right - cyan
      0x7733bb, // back - dark purple
    ];

    const faceNames = ['Mặt trước', 'Mặt trên', 'Mặt dưới', 'Mặt trái', 'Mặt phải', 'Mặt sau'];

    const t = progress; // 0 = box, 1 = flat

    // Store pivot references for later updates
    this._unfoldPivots = [];

    // ---- FRONT FACE (base - stays flat on z=0 plane) ----
    const frontGeo = new THREE.PlaneGeometry(a, c);
    const frontMat = this._makeFaceMat(faceColors[0]);
    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    frontMesh.userData = { name: faceNames[0] };
    this.meshGroup.add(frontMesh);

    // ---- TOP FACE: hinges from top edge of front ----
    // Pivot at top edge of front face (y = c/2)
    const topPivot = new THREE.Group();
    topPivot.position.set(0, c / 2, 0);
    const topGeo = new THREE.PlaneGeometry(a, b);
    const topMat = this._makeFaceMat(faceColors[1]);
    const topMesh = new THREE.Mesh(topGeo, topMat);
    // In folded state: rotated -90° around X (face goes back in Z)
    // In unfolded state: rotated 0° (flat, extending upward from hinge)
    topMesh.position.set(0, b / 2, 0);
    topPivot.rotation.x = -Math.PI / 2 * (1 - t);
    topPivot.userData = { targetRotX: 0, startRotX: -Math.PI / 2 };
    topMesh.userData = { name: faceNames[1] };
    topPivot.add(topMesh);
    this.meshGroup.add(topPivot);
    this._unfoldPivots.push({ pivot: topPivot, axis: 'x', start: -Math.PI / 2, end: 0 });

    // ---- BOTTOM FACE: hinges from bottom edge of front ----
    const botPivot = new THREE.Group();
    botPivot.position.set(0, -c / 2, 0);
    const botGeo = new THREE.PlaneGeometry(a, b);
    const botMat = this._makeFaceMat(faceColors[2]);
    const botMesh = new THREE.Mesh(botGeo, botMat);
    botMesh.position.set(0, -b / 2, 0);
    botPivot.rotation.x = Math.PI / 2 * (1 - t);
    botMesh.userData = { name: faceNames[2] };
    botPivot.add(botMesh);
    this.meshGroup.add(botPivot);
    this._unfoldPivots.push({ pivot: botPivot, axis: 'x', start: Math.PI / 2, end: 0 });

    // ---- LEFT FACE: hinges from left edge of front ----
    const leftPivot = new THREE.Group();
    leftPivot.position.set(-a / 2, 0, 0);
    const leftGeo = new THREE.PlaneGeometry(b, c); // width=b (depth), height=c
    const leftMat = this._makeFaceMat(faceColors[3]);
    const leftMesh = new THREE.Mesh(leftGeo, leftMat);
    leftMesh.position.set(-b / 2, 0, 0);
    leftPivot.rotation.y = -Math.PI / 2 * (1 - t);
    leftMesh.userData = { name: faceNames[3] };
    leftPivot.add(leftMesh);
    this.meshGroup.add(leftPivot);
    this._unfoldPivots.push({ pivot: leftPivot, axis: 'y', start: -Math.PI / 2, end: 0 });

    // ---- RIGHT FACE: hinges from right edge of front ----
    const rightPivot = new THREE.Group();
    rightPivot.position.set(a / 2, 0, 0);
    const rightGeo = new THREE.PlaneGeometry(b, c); // width=b (depth), height=c
    const rightMat = this._makeFaceMat(faceColors[4]);
    const rightMesh = new THREE.Mesh(rightGeo, rightMat);
    rightMesh.position.set(b / 2, 0, 0);
    rightPivot.rotation.y = Math.PI / 2 * (1 - t);
    rightMesh.userData = { name: faceNames[4] };
    rightPivot.add(rightMesh);
    this.meshGroup.add(rightPivot);
    this._unfoldPivots.push({ pivot: rightPivot, axis: 'y', start: Math.PI / 2, end: 0 });

    // ---- BACK FACE: double-hinge from right face's far edge ----
    // The back face hinges from the right edge of the right face
    // It's a child of the right pivot group
    const backPivot = new THREE.Group();
    backPivot.position.set(b, 0, 0); // at the far edge of the right face (relative to right pivot)
    const backGeo = new THREE.PlaneGeometry(a, c);
    const backMat = this._makeFaceMat(faceColors[5]);
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(a / 2, 0, 0);
    backPivot.rotation.y = Math.PI / 2 * (1 - t);
    backMesh.userData = { name: faceNames[5] };
    backPivot.add(backMesh);
    rightPivot.add(backPivot);
    this._unfoldPivots.push({ pivot: backPivot, axis: 'y', start: Math.PI / 2, end: 0, isChild: true });

    // Add edges for each face
    this._addFaceEdges(frontMesh);
    this._addFaceEdges(topMesh);
    this._addFaceEdges(botMesh);
    this._addFaceEdges(leftMesh);
    this._addFaceEdges(rightMesh);
    this._addFaceEdges(backMesh);

    // Rotate mesh group so the net unfolds horizontally (XZ plane)
    // This makes it visible from above/isometric camera
    this.meshGroup.rotation.x = -Math.PI / 2;

    // Adjust camera for good visibility at any progress
    const maxDim = Math.max(a, b, c);
    const spread = maxDim * 2.8;
    // Position camera at an isometric angle - good for both folded and flat states
    this.camera.position.set(spread * 0.5, spread * 0.8, spread * 0.7);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Hide the grid for cleaner view
    if (this.grid) this.grid.visible = false;
  }

  _makeFaceMat(color) {
    return new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      shininess: 80,
    });
  }

  _addFaceEdges(mesh) {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5
    }));
    // Match mesh transform
    mesh.add(line);
  }

  /**
   * Update the unfold progress (0 = box, 1 = flat net) without recreating geometry.
   */
  updateUnfoldProgress(progress) {
    if (!this._unfoldPivots) return;
    this.unfoldProgress = progress;
    const t = progress;

    this._unfoldPivots.forEach(({ pivot, axis, start, end }) => {
      const angle = start + (end - start) * t;
      if (axis === 'x') {
        pivot.rotation.x = angle;
      } else {
        pivot.rotation.y = angle;
      }
    });
  }

  /**
   * Restore the regular solid shape (exit unfolding mode).
   */
  exitUnfolding() {
    this.isUnfolding = false;
    this._unfoldPivots = null;
    // Reset mesh group rotation that was set during unfolding
    this.meshGroup.rotation.set(0, 0, 0);
    if (this.grid) this.grid.visible = true;
  }

  _clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      // Recursively clear child groups
      if (child.children && child.children.length > 0) {
        this._clearGroup(child);
      }
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
      group.remove(child);
    }
    this._faceMaterials = null;
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    const wf = this.isWireframe;

    // ===== BOX FACES =====
    // Wireframe ON: make box invisible but still write depth buffer
    //   (colorWrite: false = no visible color, depthWrite stays true)
    // Wireframe OFF: restore normal colored faces
    if (this._faceMaterials) {
      this._faceMaterials.forEach(mat => {
        mat.colorWrite = !wf;
        mat.opacity = 0.85;
        mat.depthWrite = true;
      });
    }

    // Handle unfolding mode meshes
    this.meshGroup.traverse(child => {
      if (child.isMesh && child.material && !Array.isArray(child.material)) {
        child.material.colorWrite = !wf;
        child.material.opacity = wf ? 0.85 : 0.85;
        child.material.depthWrite = true;
      }
    });

    // ===== EDGE LINES =====
    this.edgeGroup.traverse(child => {
      if (!child.material) return;

      if (child.userData && child.userData.isSolidEdge) {
        // Solid visible edges: brighter in wireframe mode
        child.material.opacity = wf ? 0.9 : 0.4;
      } else if (child.userData && child.userData.isHiddenEdge) {
        // Dashed hidden edges: only visible in wireframe mode
        child.visible = wf;
      } else if (child.userData && child.userData.isDiagonal) {
        // Space diagonals: only visible in wireframe mode
        child.visible = wf;
      }
    });
  }

  toggleAutoRotate() {
    this.controls.autoRotate = !this.controls.autoRotate;
    return this.controls.autoRotate;
  }

  setAutoRotate(val) {
    this.controls.autoRotate = val;
  }

  resetView() {
    const maxDim = Math.max(this.dims.a, this.dims.b || this.dims.a, this.dims.c || this.dims.a);
    this.camera.position.set(maxDim * 1.8, maxDim * 1.4, maxDim * 1.8);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  dispose() {
    this._clearGroup(this.meshGroup);
    this._clearGroup(this.edgeGroup);
    this._clearGroup(this.labelGroup);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
