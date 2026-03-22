/* ============================================
   QUIZ.JS - AI-Powered Quiz Mode
   Smart question generation with adaptive difficulty
   ============================================ */

const QuizMode = (() => {
  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = { easy: 30, medium: 25, hard: 20 };

  // Module-level timer reference - never lost on state reset
  let _activeTimerInterval = null;
  let state = {
    currentQuestion: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correct: 0,
    wrong: 0,
    difficulty: 'easy',
    timer: 0,
    timerInterval: null,
    questions: [],
    answered: false,
    hintUsed: false,
  };

  // ======= Question Templates =======
  const scenarios = {
    hhcn: [
      'Một chiếc hộp quà có chiều dài {a} cm, chiều rộng {b} cm và chiều cao {c} cm.',
      'Một bể cá hình hộp chữ nhật có chiều dài {a} dm, chiều rộng {b} dm và chiều cao {c} dm.',
      'Phòng học hình hộp chữ nhật có chiều dài {a} m, chiều rộng {b} m và chiều cao {c} m.',
      'Một thùng gỗ hình hộp chữ nhật có chiều dài {a} cm, chiều rộng {b} cm và chiều cao {c} cm.',
      'Một viên gạch hình hộp chữ nhật có chiều dài {a} cm, chiều rộng {b} cm và chiều cao {c} cm.',
    ],
    hlp: [
      'Một hộp Rubik hình lập phương có cạnh {a} cm.',
      'Một xúc xắc hình lập phương có cạnh {a} cm.',
      'Một viên đá hình lập phương có cạnh {a} dm.',
      'Một khối gỗ hình lập phương có cạnh {a} m.',
      'Một chiếc hộp hình lập phương có cạnh {a} cm.',
    ],
  };

  const dimRanges = {
    easy:   { min: 2, max: 10, step: 1 },
    medium: { min: 5, max: 30, step: 1 },
    hard:   { min: 3, max: 50, step: 0.5 },
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randDim(difficulty) {
    const r = dimRanges[difficulty];
    if (r.step === 0.5) {
      return (randInt(r.min * 2, r.max * 2) / 2);
    }
    return randInt(r.min, r.max);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateDistractors(correct, count = 3) {
    const distractors = new Set();
    const offsets = [
      () => correct + randInt(1, 10),
      () => correct - randInt(1, Math.max(1, Math.floor(correct * 0.3))),
      () => correct * 2,
      () => Math.floor(correct / 2),
      () => correct + correct * 0.1 * randInt(1, 5),
      () => correct - correct * 0.1 * randInt(1, 3),
    ];

    let attempts = 0;
    while (distractors.size < count && attempts < 50) {
      const d = Math.round(pickRandom(offsets)() * 100) / 100;
      if (d > 0 && d !== correct) {
        distractors.add(d);
      }
      attempts++;
    }

    // Fill remaining if needed
    let fill = 1;
    while (distractors.size < count) {
      distractors.add(correct + fill * (fill % 2 === 0 ? 1 : -1) * randInt(2, 20));
      fill++;
    }

    return [...distractors].slice(0, count);
  }

  // ======= Calculation Question Generators (Medium/Hard) =======
  function genSxqHHCN(difficulty) {
    const a = randDim(difficulty);
    const b = randDim(difficulty);
    const c = randDim(difficulty);
    const sxq = 2 * (a + b) * c;
    const scenario = pickRandom(scenarios.hhcn)
      .replace('{a}', a).replace('{b}', b).replace('{c}', c);
    return {
      type: 'hhcn',
      text: `${scenario} Tính diện tích xung quanh của hình hộp chữ nhật đó.`,
      answer: sxq,
      options: shuffle([sxq, ...generateDistractors(sxq)]),
      hint: {
        formula: 'S_xq = 2 × (a + b) × c',
        steps: [
          `a = ${a}, b = ${b}, c = ${c} (chiều cao)`,
          `S_xq = 2 × (${a} + ${b}) × ${c}`,
          `S_xq = 2 × ${a + b} × ${c}`,
          `S_xq = ${sxq}`,
        ],
      },
      dims: { a, b, c },
      shape: 'box',
    };
  }

  function genSxqHLP(difficulty) {
    const a = randDim(difficulty);
    const sxq = 4 * a * a;
    const scenario = pickRandom(scenarios.hlp).replace('{a}', a);
    return {
      type: 'hlp',
      text: `${scenario} Tính diện tích xung quanh của hình lập phương đó.`,
      answer: sxq,
      options: shuffle([sxq, ...generateDistractors(sxq)]),
      hint: {
        formula: 'S_xq = 4 × a²',
        steps: [`a = ${a}`, `S_xq = 4 × ${a}²`, `S_xq = 4 × ${a * a}`, `S_xq = ${sxq}`],
      },
      dims: { a },
      shape: 'cube',
    };
  }

  function genStpHHCN(difficulty) {
    const a = randDim(difficulty), b = randDim(difficulty), c = randDim(difficulty);
    const stp = 2 * (a * b + b * c + a * c);
    const scenario = pickRandom(scenarios.hhcn)
      .replace('{a}', a).replace('{b}', b).replace('{c}', c);
    return {
      type: 'hhcn',
      text: `${scenario} Tính diện tích toàn phần của hình hộp chữ nhật đó.`,
      answer: stp,
      options: shuffle([stp, ...generateDistractors(stp)]),
      hint: {
        formula: 'S_tp = 2 × (a×b + b×c + a×c)',
        steps: [
          `a = ${a}, b = ${b}, c = ${c}`,
          `S_tp = 2 × (${a}×${b} + ${b}×${c} + ${a}×${c})`,
          `S_tp = 2 × (${a * b} + ${b * c} + ${a * c})`,
          `S_tp = ${stp}`,
        ],
      },
      dims: { a, b, c },
      shape: 'box',
    };
  }

  function genStpHLP(difficulty) {
    const a = randDim(difficulty);
    const stp = 6 * a * a;
    const scenario = pickRandom(scenarios.hlp).replace('{a}', a);
    return {
      type: 'hlp',
      text: `${scenario} Tính diện tích toàn phần của hình lập phương đó.`,
      answer: stp,
      options: shuffle([stp, ...generateDistractors(stp)]),
      hint: {
        formula: 'S_tp = 6 × a²',
        steps: [`a = ${a}`, `S_tp = 6 × ${a}²`, `S_tp = 6 × ${a * a}`, `S_tp = ${stp}`],
      },
      dims: { a },
      shape: 'cube',
    };
  }

  function genCompare(difficulty) {
    const a1 = randDim(difficulty), b1 = randDim(difficulty), c1 = randDim(difficulty);
    const a2 = randDim(difficulty);
    const sxq1 = 2 * (a1 + b1) * c1;
    const sxq2 = 4 * a2 * a2;
    let answer;
    if (sxq1 > sxq2) answer = 1;
    else if (sxq2 > sxq1) answer = 2;
    else answer = 3;
    const options = shuffle([
      `Hình hộp chữ nhật (${sxq1})`, `Hình lập phương (${sxq2})`, `Bằng nhau`, `Không so sánh được`,
    ]);
    const correctOption = options.findIndex(o => {
      if (answer === 1) return o.includes('Hình hộp chữ nhật');
      if (answer === 2) return o.includes('Hình lập phương');
      return o === 'Bằng nhau';
    });
    return {
      type: 'compare',
      text: `Hình hộp chữ nhật có kích thước ${a1}×${b1}×${c1} và hình lập phương có cạnh ${a2}. Hình nào có diện tích xung quanh lớn hơn?`,
      answer: options[correctOption],
      options: options,
      isTextAnswer: true,
      hint: {
        formula: 'So sánh S_xq của hai hình',
        steps: [
          `S_xq (HHCN) = 2 × (${a1} + ${b1}) × ${c1} = ${sxq1}`,
          `S_xq (HLP) = 4 × ${a2}² = 4 × ${a2 * a2} = ${sxq2}`,
          sxq1 > sxq2 ? `${sxq1} > ${sxq2} → HHCN lớn hơn` : sxq2 > sxq1 ? `${sxq2} > ${sxq1} → HLP lớn hơn` : `Bằng nhau`,
        ],
      },
      dims: { a: a1, b: b1, c: c1 },
      shape: 'box',
    };
  }

  // ======= Recognition Questions (Easy Mode) =======
  const recognitionPool = [
    // Số đỉnh
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu đỉnh?',
      answer: '8',
      options: ['4', '6', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số đỉnh của hình hộp chữ nhật',
        steps: [
          'Mặt đáy dưới có 4 đỉnh',
          'Mặt đáy trên có 4 đỉnh',
          'Tổng cộng: 4 + 4 = 8 đỉnh',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu đỉnh?',
      answer: '8',
      options: ['6', '8', '10', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số đỉnh của hình lập phương',
        steps: [
          'Hình lập phương là trường hợp đặc biệt của hình hộp chữ nhật',
          'Mặt đáy dưới: 4 đỉnh, mặt đáy trên: 4 đỉnh',
          'Tổng cộng: 8 đỉnh',
        ],
      },
    },
    // Số cạnh
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu cạnh?',
      answer: '12',
      options: ['8', '10', '12', '16'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số cạnh của hình hộp chữ nhật',
        steps: [
          '4 cạnh ở mặt đáy dưới',
          '4 cạnh ở mặt đáy trên',
          '4 cạnh bên (nối 2 mặt đáy)',
          'Tổng cộng: 4 + 4 + 4 = 12 cạnh',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu cạnh?',
      answer: '12',
      options: ['6', '8', '12', '24'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số cạnh của hình lập phương',
        steps: [
          'Giống hình hộp chữ nhật: 4 cạnh đáy dưới + 4 cạnh đáy trên + 4 cạnh bên',
          'Tổng cộng: 12 cạnh',
          'Tất cả các cạnh đều bằng nhau',
        ],
      },
    },
    // Số mặt
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu mặt?',
      answer: '6',
      options: ['4', '6', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số mặt của hình hộp chữ nhật',
        steps: [
          'Mặt trước + mặt sau = 2 mặt',
          'Mặt trái + mặt phải = 2 mặt',
          'Mặt trên + mặt dưới = 2 mặt',
          'Tổng cộng: 6 mặt',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu mặt?',
      answer: '6',
      options: ['4', '6', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Đếm số mặt của hình lập phương',
        steps: [
          '6 mặt, tất cả đều là hình vuông bằng nhau',
        ],
      },
    },
    // Mặt bên
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu mặt bên?',
      answer: '4',
      options: ['2', '4', '6', '8'],
      isTextAnswer: true,
      hint: {
        formula: 'Mặt bên là các mặt không phải mặt đáy',
        steps: [
          'Hình hộp chữ nhật có tổng cộng 6 mặt',
          'Trong đó: 2 mặt đáy (trên và dưới)',
          'Còn lại: 4 mặt bên (trước, sau, trái, phải)',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu mặt bên?',
      answer: '4',
      options: ['2', '4', '6', '8'],
      isTextAnswer: true,
      hint: {
        formula: 'Mặt bên là các mặt không phải mặt đáy',
        steps: [
          'Hình lập phương có 6 mặt',
          '2 mặt đáy (trên và dưới)',
          '4 mặt bên (trước, sau, trái, phải)',
        ],
      },
    },
    // Mặt đáy
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu mặt đáy?',
      answer: '2',
      options: ['1', '2', '4', '6'],
      isTextAnswer: true,
      hint: {
        formula: 'Mặt đáy là mặt trên và mặt dưới',
        steps: [
          'Mặt đáy trên: 1 mặt',
          'Mặt đáy dưới: 1 mặt',
          'Tổng cộng: 2 mặt đáy',
        ],
      },
    },
    // Cạnh bên
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu cạnh bên?',
      answer: '4',
      options: ['2', '4', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Cạnh bên nối đỉnh mặt đáy dưới với đỉnh mặt đáy trên',
        steps: [
          'Mỗi đỉnh đáy dưới nối với 1 đỉnh đáy trên',
          'Mặt đáy có 4 đỉnh → 4 cạnh bên',
          'Cạnh bên có độ dài bằng chiều cao',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu cạnh bên?',
      answer: '4',
      options: ['2', '4', '6', '8'],
      isTextAnswer: true,
      hint: {
        formula: 'Cạnh bên nối 2 mặt đáy',
        steps: [
          '4 cạnh bên, mỗi cạnh nối 1 đỉnh đáy dưới với 1 đỉnh đáy trên',
          'Cạnh bên bằng cạnh đáy (vì là hình lập phương)',
        ],
      },
    },
    // Cạnh đáy
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu cạnh đáy?',
      answer: '8',
      options: ['4', '6', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Cạnh đáy nằm trên 2 mặt đáy',
        steps: [
          'Mặt đáy dưới có 4 cạnh',
          'Mặt đáy trên có 4 cạnh',
          'Tổng cộng: 4 + 4 = 8 cạnh đáy',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu cạnh đáy?',
      answer: '8',
      options: ['4', '6', '8', '12'],
      isTextAnswer: true,
      hint: {
        formula: 'Cạnh đáy nằm trên 2 mặt đáy',
        steps: [
          'Đáy dưới: 4 cạnh, đáy trên: 4 cạnh',
          'Tổng: 8 cạnh đáy',
        ],
      },
    },
    // Đường chéo
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu đường chéo?',
      answer: '4',
      options: ['2', '4', '6', '8'],
      isTextAnswer: true,
      hint: {
        formula: 'Đường chéo nối 2 đỉnh đối diện qua tâm hình hộp',
        steps: [
          'Mỗi đường chéo đi từ 1 đỉnh đến đỉnh đối diện',
          'Hình hộp chữ nhật có 4 đường chéo',
          'Tất cả 4 đường chéo đều cắt nhau tại tâm hình hộp',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Hình lập phương có bao nhiêu đường chéo?',
      answer: '4',
      options: ['2', '4', '6', '8'],
      isTextAnswer: true,
      hint: {
        formula: 'Đường chéo hình lập phương nối 2 đỉnh đối diện',
        steps: [
          'Hình lập phương có 4 đường chéo',
          'Tất cả đều bằng nhau và cắt nhau tại tâm',
        ],
      },
    },
    // Nhận dạng hình dạng mặt
    {
      type: 'hhcn',
      text: 'Các mặt bên của hình hộp chữ nhật là hình gì?',
      answer: 'Hình chữ nhật',
      options: ['Hình vuông', 'Hình chữ nhật', 'Hình thang', 'Hình bình hành'],
      isTextAnswer: true,
      hint: {
        formula: 'Nhận dạng hình dạng mặt bên',
        steps: [
          'Mặt bên của hình hộp chữ nhật luôn là hình chữ nhật',
          'Có thể là hình vuông (trường hợp đặc biệt)',
        ],
      },
    },
    {
      type: 'hlp',
      text: 'Tất cả các mặt của hình lập phương có hình dạng gì?',
      answer: 'Hình vuông',
      options: ['Hình chữ nhật', 'Hình vuông', 'Hình thoi', 'Hình bình hành'],
      isTextAnswer: true,
      hint: {
        formula: 'Đặc điểm của hình lập phương',
        steps: [
          'Hình lập phương có tất cả các cạnh bằng nhau',
          'Nên tất cả 6 mặt đều là hình vuông bằng nhau',
        ],
      },
    },
    // Quan hệ giữa các hình
    {
      type: 'hlp',
      text: 'Hình lập phương là trường hợp đặc biệt của hình nào?',
      answer: 'Hình hộp chữ nhật',
      options: ['Hình chữ nhật', 'Hình hộp chữ nhật', 'Hình vuông', 'Hình trụ'],
      isTextAnswer: true,
      hint: {
        formula: 'Quan hệ giữa hình lập phương và hình hộp chữ nhật',
        steps: [
          'Hình hộp chữ nhật có 3 kích thước: dài, rộng, cao',
          'Khi dài = rộng = cao → thành hình lập phương',
          'Vậy hình lập phương là HHCN đặc biệt (3 kích thước bằng nhau)',
        ],
      },
    },
    // Mặt đối diện
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu cặp mặt đối diện?',
      answer: '3',
      options: ['2', '3', '4', '6'],
      isTextAnswer: true,
      hint: {
        formula: 'Các cặp mặt đối diện',
        steps: [
          'Cặp 1: Mặt trước - Mặt sau',
          'Cặp 2: Mặt trái - Mặt phải',
          'Cặp 3: Mặt trên - Mặt dưới',
          'Tổng cộng: 3 cặp mặt đối diện',
        ],
      },
    },
    {
      type: 'hhcn',
      text: 'Hai mặt đối diện của hình hộp chữ nhật có đặc điểm gì?',
      answer: 'Bằng nhau',
      options: ['Vuông góc với nhau', 'Bằng nhau', 'Khác nhau', 'Song song nhưng khác kích thước'],
      isTextAnswer: true,
      hint: {
        formula: 'Tính chất mặt đối diện',
        steps: [
          'Hai mặt đối diện của hình hộp chữ nhật song song và bằng nhau',
          'Ví dụ: mặt trước = mặt sau, mặt trái = mặt phải, mặt trên = mặt dưới',
        ],
      },
    },
    // Đường chéo mặt đáy
    {
      type: 'hhcn',
      text: 'Mỗi mặt đáy của hình hộp chữ nhật có bao nhiêu đường chéo?',
      answer: '2',
      options: ['1', '2', '4', '6'],
      isTextAnswer: true,
      hint: {
        formula: 'Đường chéo của mặt đáy hình chữ nhật',
        steps: [
          'Mặt đáy là hình chữ nhật',
          'Hình chữ nhật có 2 đường chéo',
          'Hai đường chéo cắt nhau tại trung điểm',
        ],
      },
    },
    // Cạnh bằng nhau
    {
      type: 'hhcn',
      text: 'Hình hộp chữ nhật có bao nhiêu nhóm cạnh bằng nhau?',
      answer: '3 nhóm (mỗi nhóm 4 cạnh)',
      options: ['2 nhóm (mỗi nhóm 6 cạnh)', '3 nhóm (mỗi nhóm 4 cạnh)', '4 nhóm (mỗi nhóm 3 cạnh)', '6 nhóm (mỗi nhóm 2 cạnh)'],
      isTextAnswer: true,
      hint: {
        formula: 'Phân nhóm cạnh bằng nhau',
        steps: [
          '12 cạnh chia thành 3 nhóm:',
          'Nhóm 1: 4 cạnh dài (chiều dài a)',
          'Nhóm 2: 4 cạnh rộng (chiều rộng b)',
          'Nhóm 3: 4 cạnh cao (chiều cao c)',
        ],
      },
    },
  ];

  function genRecognition() {
    const q = pickRandom(recognitionPool);
    return {
      ...q,
      options: shuffle([...q.options]),
      dims: q.dims || { a: 3 },
      shape: q.type === 'hlp' ? 'cube' : 'box',
    };
  }

  function generateQuestion(difficulty) {
    if (difficulty === 'easy') {
      return genRecognition();
    }
    const generators = [genSxqHHCN, genSxqHLP, genStpHHCN, genStpHLP];
    if (difficulty === 'hard') generators.push(genCompare);

    return pickRandom(generators)(difficulty);
  }

  function generateQuestions() {
    state.questions = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      state.questions.push(generateQuestion(state.difficulty));
    }
  }

  // ======= UI Functions =======
  function init(difficulty = 'easy') {
    // CRITICAL: Clear old timer using module-level reference
    if (_activeTimerInterval) {
      clearInterval(_activeTimerInterval);
      _activeTimerInterval = null;
    }

    state = {
      currentQuestion: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correct: 0,
      wrong: 0,
      difficulty: difficulty,
      timer: 0,
      timerInterval: null,
      questions: [],
      answered: false,
      hintUsed: false,
    };

    generateQuestions();
    setupDifficultySelector();
    showQuestion();
    updateStats();
  }

  function setupDifficultySelector() {
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.diff === state.difficulty) btn.classList.add('active');
      btn.onclick = () => {
        SoundEngine.click();
        state.difficulty = btn.dataset.diff;
        init(state.difficulty);
      };
    });
  }

  function showQuestion() {
    const q = state.questions[state.currentQuestion];
    if (!q) return showResults();

    state.answered = false;
    state.hintUsed = false;

    // Update progress
    const progress = ((state.currentQuestion) / QUESTIONS_PER_ROUND) * 100;
    document.getElementById('quiz-progress-fill').style.width = progress + '%';
    document.getElementById('quiz-progress-text').textContent =
      `${state.currentQuestion + 1}/${QUESTIONS_PER_ROUND}`;

    // Question type badge
    const badge = document.getElementById('question-badge');
    badge.className = 'question-type-badge';
    if (q.type === 'hhcn') {
      badge.classList.add('badge-hhcn');
      badge.textContent = 'Hình hộp chữ nhật';
    } else if (q.type === 'hlp') {
      badge.classList.add('badge-hlp');
      badge.textContent = 'Hình lập phương';
    } else {
      badge.classList.add('badge-compare');
      badge.textContent = 'So sánh';
    }

    // Question text
    document.getElementById('question-text').textContent = q.text;

    // Answer options
    const optionsEl = document.getElementById('answer-options');
    optionsEl.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.innerHTML = `<span class="option-label">${labels[i]}</span><span>${q.isTextAnswer ? opt : opt}</span>`;
      btn.addEventListener('click', () => selectAnswer(i, btn));
      optionsEl.appendChild(btn);
    });

    // Hide hint and next
    document.getElementById('hint-box').classList.remove('visible');
    document.getElementById('btn-quiz-next').classList.remove('visible');
    document.getElementById('btn-quiz-hint').style.display = 'inline-flex';

    // Start timer
    startTimer();

    // Animate question card
    const card = document.querySelector('.question-card');
    card.style.animation = 'none';
    card.offsetHeight; // force reflow
    card.style.animation = 'scaleIn 0.4s ease-out';
  }

  function selectAnswer(index, btnEl) {
    if (state.answered) return;
    state.answered = true;

    clearInterval(_activeTimerInterval);
    _activeTimerInterval = null;

    const q = state.questions[state.currentQuestion];
    const selectedValue = q.options[index];
    const isCorrect = q.isTextAnswer
      ? selectedValue === q.answer
      : selectedValue === q.answer;

    // Disable all buttons
    document.querySelectorAll('.answer-btn').forEach(btn => btn.classList.add('disabled'));

    if (isCorrect) {
      btnEl.classList.add('correct');
      state.correct++;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;

      // Score calculation
      const timeBonus = Math.max(0, state.timer * 2);
      const streakMultiplier = Math.min(state.streak, 5);
      const hintPenalty = state.hintUsed ? 0.5 : 1;
      const difficultyBonus = state.difficulty === 'hard' ? 3 : state.difficulty === 'medium' ? 2 : 1;
      const points = Math.round((10 + timeBonus) * streakMultiplier * hintPenalty * difficultyBonus);
      state.score += points;

      SoundEngine.correct();
      if (state.streak >= 3) {
        SoundEngine.streak();
        showToast(`🔥 Combo x${state.streak}! +${points} điểm`, 'streak');
      } else {
        showToast(`✅ Chính xác! +${points} điểm`, 'correct');
      }

      // Confetti on streaks
      if (state.streak >= 3) createConfetti();

    } else {
      btnEl.classList.add('wrong');
      state.wrong++;
      state.streak = 0;

      // Highlight correct answer
      document.querySelectorAll('.answer-btn').forEach((btn, i) => {
        const val = q.options[i];
        const isCorr = q.isTextAnswer ? val === q.answer : val === q.answer;
        if (isCorr) btn.classList.add('correct');
      });

      SoundEngine.wrong();
      showToast('❌ Sai rồi! Xem gợi ý bên dưới', 'wrong');

      // Auto show hint on wrong answer
      showHint();
    }

    // Show next button
    document.getElementById('btn-quiz-next').classList.add('visible');
    updateStats();
  }

  function showHint() {
    state.hintUsed = true;
    const q = state.questions[state.currentQuestion];
    const hintBox = document.getElementById('hint-box');

    document.getElementById('hint-formula').textContent = q.hint.formula;
    const stepsList = document.getElementById('hint-steps');
    stepsList.innerHTML = '';
    q.hint.steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      stepsList.appendChild(li);
    });

    hintBox.classList.add('visible');
    document.getElementById('btn-quiz-hint').style.display = 'none';
  }

  function nextQuestion() {
    state.currentQuestion++;
    SoundEngine.click();
    if (state.currentQuestion >= QUESTIONS_PER_ROUND) {
      showResults();
    } else {
      showQuestion();
    }
  }

  function startTimer() {
    // Always clear any existing timer first
    if (_activeTimerInterval) {
      clearInterval(_activeTimerInterval);
      _activeTimerInterval = null;
    }
    state.timer = TIME_PER_QUESTION[state.difficulty];
    updateTimerDisplay();

    _activeTimerInterval = setInterval(() => {
      state.timer--;
      updateTimerDisplay();
      if (state.timer <= 5) SoundEngine.tick();
      if (state.timer <= 0) {
        clearInterval(_activeTimerInterval);
        _activeTimerInterval = null;
        // Auto select wrong
        if (!state.answered) {
          state.answered = true;
          state.wrong++;
          state.streak = 0;
          SoundEngine.wrong();
          showToast('⏰ Hết giờ!', 'wrong');

          const q = state.questions[state.currentQuestion];
          document.querySelectorAll('.answer-btn').forEach((btn, i) => {
            btn.classList.add('disabled');
            const val = q.options[i];
            const isCorr = q.isTextAnswer ? val === q.answer : val === q.answer;
            if (isCorr) btn.classList.add('correct');
          });
          showHint();
          document.getElementById('btn-quiz-next').classList.add('visible');
          updateStats();
        }
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('quiz-timer');
    if (el) {
      el.textContent = state.timer;
      el.style.color = state.timer <= 5 ? 'var(--color-red)' : '';
    }
  }

  function updateStats() {
    const scoreEl = document.getElementById('quiz-score-value');
    const streakEl = document.getElementById('quiz-streak-value');
    if (scoreEl) scoreEl.textContent = state.score;
    if (streakEl) streakEl.textContent = state.streak;

    // Update global score
    GameApp.updateScore(state.score);
  }

  function showResults() {
    clearInterval(state.timerInterval);

    const pct = Math.round((state.correct / QUESTIONS_PER_ROUND) * 100);
    const modal = document.getElementById('result-modal');

    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const subtitle = document.getElementById('result-subtitle');

    if (pct >= 80) {
      icon.textContent = '🏆';
      title.textContent = 'Xuất sắc!';
      title.className = 'result-title great';
      subtitle.textContent = 'Bạn thật giỏi! Hãy thử thách ở mức độ cao hơn!';
      SoundEngine.levelUp();
      createConfetti();
    } else if (pct >= 50) {
      icon.textContent = '⭐';
      title.textContent = 'Tốt lắm!';
      title.className = 'result-title good';
      subtitle.textContent = 'Tiếp tục luyện tập để cải thiện nhé!';
      SoundEngine.correct();
    } else {
      icon.textContent = '💪';
      title.textContent = 'Cố lên!';
      title.className = 'result-title';
      subtitle.textContent = 'Hãy xem lại bài giảng và thử lại nhé!';
    }

    document.getElementById('result-score').textContent = state.score;
    document.getElementById('result-correct').textContent = `${state.correct}/${QUESTIONS_PER_ROUND}`;
    document.getElementById('result-streak').textContent = state.maxStreak;

    modal.classList.add('visible');

    // Update global stats
    GameApp.addStats(state.correct, QUESTIONS_PER_ROUND);
  }

  function closeResults() {
    document.getElementById('result-modal').classList.remove('visible');
  }

  function restart() {
    closeResults();
    init(state.difficulty);
  }

  function destroy() {
    if (_activeTimerInterval) {
      clearInterval(_activeTimerInterval);
      _activeTimerInterval = null;
    }
  }

  return {
    init,
    nextQuestion,
    showHint,
    restart,
    closeResults,
    destroy,
    getState: () => state,
  };
})();
