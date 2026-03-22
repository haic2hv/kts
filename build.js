/* ============================================
   BUILD.JS - Build & Calculate Mode
   ============================================ */

const BuildMode = (() => {
  let scene3d = null;
  let currentScenario = null;
  let builtDims = null;

  const scenarioTemplates = [
    {
      icon: '🎁',
      title: 'Gói quà sinh nhật',
      desc: 'Bạn cần gói giấy bọc cho hộp quà. Hãy nhập kích thước và tính diện tích giấy gói (diện tích xung quanh).',
      shape: 'box',
      challengeText: 'Tính diện tích xung quanh của hộp quà:',
      calcFn: (a, b, c) => 2 * (a + b) * c,
      formulaName: 'S_xq = 2 × (a + b) × c',
    },
    {
      icon: '🏠',
      title: 'Sơn tường phòng học',
      desc: 'Phòng học cần sơn lại 4 bức tường. Hãy nhập kích thước phòng và tính diện tích cần sơn (diện tích xung quanh).',
      shape: 'box',
      challengeText: 'Tính diện tích xung quanh (4 bức tường) của phòng học:',
      calcFn: (a, b, c) => 2 * (a + b) * c,
      formulaName: 'S_xq = 2 × (a + b) × c',
    },
    {
      icon: '🎲',
      title: 'Tô màu xúc xắc',
      desc: 'Tô màu cho mặt bên của xúc xắc hình lập phương. Tính diện tích cần tô.',
      shape: 'cube',
      challengeText: 'Tính diện tích xung quanh của xúc xắc:',
      calcFn: (a) => 4 * a * a,
      formulaName: 'S_xq = 4 × a²',
    },
    {
      icon: '📦',
      title: 'Đóng thùng hàng',
      desc: 'Cần dán băng keo xung quanh thùng hàng hình hộp chữ nhật. Tính diện tích xung quanh.',
      shape: 'box',
      challengeText: 'Tính diện tích xung quanh thùng hàng:',
      calcFn: (a, b, c) => 2 * (a + b) * c,
      formulaName: 'S_xq = 2 × (a + b) × c',
    },
    {
      icon: '🧊',
      title: 'Khối đá lập phương',
      desc: 'Tính diện tích bề mặt xung quanh của khối đá hình lập phương để biết lượng sơn cần dùng.',
      shape: 'cube',
      challengeText: 'Tính diện tích xung quanh khối đá:',
      calcFn: (a) => 4 * a * a,
      formulaName: 'S_xq = 4 × a²',
    },
    {
      icon: '🏢',
      title: 'Tòa nhà mini',
      desc: 'Thiết kế tòa nhà hình hộp chữ nhật. Tính diện tích mặt ngoài xung quanh tòa nhà.',
      shape: 'box',
      challengeText: 'Tính diện tích xung quanh tòa nhà:',
      calcFn: (a, b, c) => 2 * (a + b) * c,
      formulaName: 'S_xq = 2 × (a + b) × c',
    },
  ];

  function init() {
    scene3d = new Scene3D('#build-viewer');
    loadScenario();
    setupControls();
  }

  function loadScenario() {
    currentScenario = scenarioTemplates[Math.floor(Math.random() * scenarioTemplates.length)];
    builtDims = null;

    document.getElementById('scenario-icon').textContent = currentScenario.icon;
    document.getElementById('scenario-title').textContent = currentScenario.title;
    document.getElementById('scenario-desc').textContent = currentScenario.desc;

    const cubeInputs = document.getElementById('build-cube-inputs');
    const boxInputs = document.getElementById('build-box-inputs');

    if (currentScenario.shape === 'cube') {
      cubeInputs.style.display = 'block';
      boxInputs.style.display = 'none';
    } else {
      cubeInputs.style.display = 'none';
      boxInputs.style.display = 'block';
    }

    // Clear previous
    document.getElementById('build-challenge-card').classList.remove('visible');
    document.getElementById('build-result').classList.remove('visible');
    document.getElementById('build-result').style.display = 'none';

    // Reset inputs
    document.querySelectorAll('#build-inputs input[type="number"]').forEach(inp => inp.value = '');

    // Show placeholder shape
    scene3d.createShape(currentScenario.shape, currentScenario.shape === 'cube' ? { a: 3 } : { a: 4, b: 3, c: 2 });
  }

  function setupControls() {
    document.getElementById('btn-build-shape')?.addEventListener('click', buildShape);
    document.getElementById('btn-check-answer')?.addEventListener('click', checkAnswer);
    document.getElementById('btn-new-scenario')?.addEventListener('click', () => {
      SoundEngine.click();
      loadScenario();
    });

    // Enter key on inputs
    document.querySelectorAll('#build-inputs input[type="number"]').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') buildShape();
      });
    });

    document.getElementById('build-answer')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') checkAnswer();
    });
  }

  function buildShape() {
    let a, b, c;

    if (currentScenario.shape === 'cube') {
      a = parseFloat(document.getElementById('build-dim-a-cube').value);
      if (!a || a <= 0) {
        showToast('⚠️ Vui lòng nhập cạnh hợp lệ!', 'wrong');
        return;
      }
      builtDims = { a };
      scene3d.createShape('cube', { a });
    } else {
      a = parseFloat(document.getElementById('build-dim-a').value);
      b = parseFloat(document.getElementById('build-dim-b').value);
      c = parseFloat(document.getElementById('build-dim-c').value);
      if (!a || !b || !c || a <= 0 || b <= 0 || c <= 0) {
        showToast('⚠️ Vui lòng nhập đầy đủ kích thước!', 'wrong');
        return;
      }
      builtDims = { a, b, c };
      scene3d.createShape('box', { a, b, c });
    }

    SoundEngine.build();

    // Show challenge
    const challenge = document.getElementById('build-challenge-card');
    document.getElementById('challenge-question').textContent = currentScenario.challengeText;
    document.getElementById('challenge-formula-name').textContent = currentScenario.formulaName;
    challenge.classList.add('visible');

    // Clear previous result
    document.getElementById('build-result').classList.remove('visible');
    document.getElementById('build-result').style.display = 'none';
    document.getElementById('build-answer').value = '';
    document.getElementById('build-answer').focus();
  }

  function checkAnswer() {
    const userAnswer = parseFloat(document.getElementById('build-answer').value);
    if (isNaN(userAnswer)) {
      showToast('⚠️ Vui lòng nhập đáp án!', 'wrong');
      return;
    }

    let correctAnswer;
    if (currentScenario.shape === 'cube') {
      correctAnswer = currentScenario.calcFn(builtDims.a);
    } else {
      correctAnswer = currentScenario.calcFn(builtDims.a, builtDims.b, builtDims.c);
    }

    const resultEl = document.getElementById('build-result');
    resultEl.style.display = 'block';
    resultEl.classList.add('visible');

    if (Math.abs(userAnswer - correctAnswer) < 0.01) {
      resultEl.className = 'build-result visible correct';
      let explanation;
      if (currentScenario.shape === 'cube') {
        explanation = `✅ Chính xác! ${currentScenario.formulaName}\n= 4 × ${builtDims.a}² = 4 × ${builtDims.a * builtDims.a} = ${correctAnswer}`;
      } else {
        explanation = `✅ Chính xác! ${currentScenario.formulaName}\n= 2 × (${builtDims.a} + ${builtDims.b}) × ${builtDims.c} = 2 × ${builtDims.a + builtDims.b} × ${builtDims.c} = ${correctAnswer}`;
      }
      resultEl.textContent = explanation;
      SoundEngine.correct();
      showToast('🎉 Tuyệt vời! Đáp án chính xác!', 'correct');
      createConfetti();
      GameApp.updateScore(GameApp.getScore() + 15);
      GameApp.addStats(1, 1);
    } else {
      resultEl.className = 'build-result visible wrong';
      let explanation;
      if (currentScenario.shape === 'cube') {
        explanation = `❌ Sai rồi! Đáp án đúng là ${correctAnswer}\n\n${currentScenario.formulaName}\n= 4 × ${builtDims.a}² = 4 × ${builtDims.a * builtDims.a} = ${correctAnswer}`;
      } else {
        explanation = `❌ Sai rồi! Đáp án đúng là ${correctAnswer}\n\n${currentScenario.formulaName}\n= 2 × (${builtDims.a} + ${builtDims.b}) × ${builtDims.c}\n= 2 × ${builtDims.a + builtDims.b} × ${builtDims.c} = ${correctAnswer}`;
      }
      resultEl.textContent = explanation;
      SoundEngine.wrong();
      showToast('❌ Chưa đúng! Xem lời giải bên dưới', 'wrong');
      GameApp.addStats(0, 1);
    }
  }

  function destroy() {
    if (scene3d) {
      scene3d.dispose();
      scene3d = null;
    }
  }

  return { init, destroy, loadScenario };
})();
