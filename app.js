/* ============================================
   APP.JS - Main Application Controller
   ============================================ */

// ===== Global Helpers =====
function showToast(message, type = 'correct') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('visible');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('visible'), 2500);
}

function createConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#00d4ff', '#a855f7', '#22ff88', '#ff8c00', '#f472b6', '#ffd700', '#ff4757'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 8 + 4) + 'px';
    piece.style.height = (Math.random() * 8 + 4) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    container.appendChild(piece);

    setTimeout(() => piece.remove(), 4000);
  }
}

// ===== Main Game App =====
const GameApp = (() => {
  let currentScreen = 'landing';
  let totalScore = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  let playerName = '';

  // ===== Player Name Management =====
  function checkPlayerName() {
    try {
      const data = JSON.parse(localStorage.getItem('kientrucsu_progress'));
      if (data && data.playerName) {
        playerName = data.playerName;
        hideNameOverlay();
        updatePlayerDisplay();
        return;
      }
    } catch (e) { /* ignore */ }
    showNameOverlay();
  }

  function showNameOverlay() {
    const overlay = document.getElementById('name-overlay');
    overlay.classList.remove('hidden');
    const input = document.getElementById('player-name-input');
    input.value = '';
    setTimeout(() => input.focus(), 300);
  }

  function hideNameOverlay() {
    document.getElementById('name-overlay').classList.add('hidden');
  }

  function submitName() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (!name) {
      input.style.borderColor = 'var(--color-red)';
      input.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.animation = '';
      }, 600);
      return;
    }
    playerName = name;
    hideNameOverlay();
    updatePlayerDisplay();
    saveProgress();
    SoundEngine.levelUp();
    showToast(`🎉 Chào mừng ${playerName}! Hãy bắt đầu khám phá!`, 'correct');
  }

  function updatePlayerDisplay() {
    const el = document.getElementById('player-name-display');
    if (el) el.textContent = playerName;
  }

  function newPlayer() {
    // Reset all progress for new player
    totalScore = 0;
    totalCorrect = 0;
    totalAnswered = 0;
    playerName = '';
    localStorage.removeItem('kientrucsu_progress');
    updateLandingStats();
    showNameOverlay();
  }

  function resetProgress() {
    totalScore = 0;
    totalCorrect = 0;
    totalAnswered = 0;
    saveProgress();
    updateLandingStats();
    SoundEngine.click();
    showToast('🔄 Đã đặt lại điểm số! Chơi lại từ đầu nào!', 'correct');
  }

  // ===== Progress Management =====
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem('kientrucsu_progress'));
      if (data) {
        totalScore = data.totalScore || 0;
        totalCorrect = data.totalCorrect || 0;
        totalAnswered = data.totalAnswered || 0;
        playerName = data.playerName || '';
      }
    } catch (e) { /* ignore */ }
    updateLandingStats();
  }

  function saveProgress() {
    localStorage.setItem('kientrucsu_progress', JSON.stringify({
      totalScore, totalCorrect, totalAnswered, playerName
    }));
  }

  function updateLandingStats() {
    document.getElementById('stat-score').textContent = totalScore;
    document.getElementById('stat-correct').textContent = totalCorrect;
    document.getElementById('stat-answered').textContent = totalAnswered;
    const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    document.getElementById('stat-accuracy').textContent = pct + '%';
  }

  // ===== Screen Navigation =====
  function showScreen(screenId) {
    // Cleanup previous
    if (currentScreen === 'explore') ExploreMode.destroy();
    if (currentScreen === 'quiz') QuizMode.destroy();
    if (currentScreen === 'build') BuildMode.destroy();

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
      target.style.animation = 'none';
      target.offsetHeight;
      target.style.animation = '';
    }

    currentScreen = screenId;

    // Init new screen
    if (screenId === 'explore') ExploreMode.init();
    if (screenId === 'quiz') QuizMode.init();
    if (screenId === 'build') BuildMode.init();
  }

  function updateScore(score) {
    totalScore = Math.max(totalScore, score);
    saveProgress();
    updateLandingStats();
  }

  function addStats(correct, answered) {
    totalCorrect += correct;
    totalAnswered += answered;
    saveProgress();
    updateLandingStats();
  }

  function getScore() {
    return totalScore;
  }

  function getPlayerName() {
    return playerName;
  }

  // ===== Init =====
  function init() {
    SoundEngine.init();
    loadProgress();
    createParticles();
    checkPlayerName();

    // Name input
    document.getElementById('btn-start-game')?.addEventListener('click', submitName);
    document.getElementById('player-name-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitName();
    });

    // New player
    document.getElementById('btn-new-player')?.addEventListener('click', () => {
      SoundEngine.click();
      newPlayer();
    });

    // Reset progress
    document.getElementById('btn-reset-progress')?.addEventListener('click', resetProgress);

    // Mode card clicks
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        SoundEngine.click();
        showScreen(card.dataset.mode);
      });
    });

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        SoundEngine.click();
        showScreen('landing');
      });
    });

    // Quiz specific buttons
    document.getElementById('btn-quiz-hint')?.addEventListener('click', () => {
      SoundEngine.click();
      QuizMode.showHint();
    });

    document.getElementById('btn-quiz-next')?.addEventListener('click', () => {
      QuizMode.nextQuestion();
    });

    // Result modal buttons
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      QuizMode.restart();
    });

    document.getElementById('btn-back-home')?.addEventListener('click', () => {
      QuizMode.closeResults();
      showScreen('landing');
    });

    // Show landing
    showScreen('landing');
  }

  function createParticles() {
    const container = document.querySelector('.bg-particles');
    if (!container) return;

    const shapes = ['📐', '📏', '🔷', '🔶', '⬛', '🟦', '🟪'];
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.fontSize = (Math.random() * 16 + 10) + 'px';
      particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
      particle.style.animationDelay = (Math.random() * 15) + 's';
      container.appendChild(particle);
    }
  }

  return {
    init,
    showScreen,
    updateScore,
    addStats,
    getScore,
    getPlayerName,
  };
})();

// ===== Start =====
document.addEventListener('DOMContentLoaded', GameApp.init);
