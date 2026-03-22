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

    // Face colors
    const faceColors = [
      0x00d4ff, // right  (+x)
      0x0088cc, // left   (-x)
      0x22ff88, // top    (+y)
      0x119955, // bottom (-y)
      0xa855f7, // front  (+z)
      0x7733bb, // back   (-z)
    ];

    const faceNames = ['Mặt phải', 'Mặt trái', 'Mặt trên', 'Mặt dưới', 'Mặt trước', 'Mặt sau'];

    // Build each face as a separate plane for highlighting
    const hw = a / 2, hh = c / 2, hd = b / 2;

    const faceDefs = [
      { pos: [hw, 0, 0], rot: [0, Math.PI / 2, 0], size: [b, c], color: faceColors[0], name: faceNames[0] },
      { pos: [-hw, 0, 0], rot: [0, -Math.PI / 2, 0], size: [b, c], color: faceColors[1], name: faceNames[1] },
      { pos: [0, hh, 0], rot: [-Math.PI / 2, 0, 0], size: [a, b], color: faceColors[2], name: faceNames[2] },
      { pos: [0, -hh, 0], rot: [Math.PI / 2, 0, 0], size: [a, b], color: faceColors[3], name: faceNames[3] },
      { pos: [0, 0, hd], rot: [0, 0, 0], size: [a, c], color: faceColors[4], name: faceNames[4] },
      { pos: [0, 0, -hd], rot: [0, Math.PI, 0], size: [a, c], color: faceColors[5], name: faceNames[5] },
    ];

    faceDefs.forEach((fd) => {
      const geo = new THREE.PlaneGeometry(fd.size[0], fd.size[1]);
      const mat = new THREE.MeshPhongMaterial({
        color: fd.color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...fd.pos);
      mesh.rotation.set(...fd.rot);
      mesh.userData = { name: fd.name, w: fd.size[0], h: fd.size[1] };
      this.meshGroup.add(mesh);
    });

    // Edges (wireframe box)
    const boxGeo = new THREE.BoxGeometry(a, c, b);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    const edges = new THREE.EdgesGeometry(boxGeo);
    const line = new THREE.LineSegments(edges, edgeMat);
    this.edgeGroup.add(line);

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

  _clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      group.remove(child);
    }
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.meshGroup.children.forEach(mesh => {
      mesh.material.wireframe = this.isWireframe;
      mesh.material.opacity = this.isWireframe ? 0.3 : 0.7;
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
