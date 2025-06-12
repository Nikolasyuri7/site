const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const context = new (window.AudioContext || window.webkitAudioContext)();
let piano = null;
Soundfont.instrument(context, 'acoustic_grand_piano', { soundfont: 'MusyngKite' }).then(p => piano = p);
let currentChord = null, score = 0, round = 0, startTime, currentLevel = 'facil', activeSources = [];

function noteToFrequency(note) {
  const noteFreqMap = {
    C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13, E: 329.63,
    F: 349.23, 'F#': 369.99, G: 392.00, 'G#': 415.30,
    A: 440.00, 'A#': 466.16, B: 493.88
  };
  return noteFreqMap[note];
}

function playNote(name) {
  if (piano) {
    const node = piano.play(name + '4', context.currentTime, { gain: 0.5, duration: 2 });
    return { stop: (when) => node.stop(when) };
  }
  const freq = noteToFrequency(name);
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, context.currentTime);
  gain.gain.setValueAtTime(0.1, context.currentTime);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 2);
  return { stop: (when) => osc.stop(when), osc, gain };
}

function playChord() {
  stopChord();
  const { root, type } = currentChord;
  const intervals = {
    maior: [0, 4, 7],
    menor: [0, 3, 7],
    diminuto: [0, 3, 6],
    aumentado: [0, 4, 8],
    '7': [0, 4, 7, 10],
    '7M': [0, 4, 7, 11]
  }[type];
  const rootIndex = notes.indexOf(root);
  activeSources = [];
  for (let i of intervals) {
    const noteName = notes[(rootIndex + i) % notes.length];
    const src = playNote(noteName);
    activeSources.push(src);
  }
  document.getElementById('repeat-btn').style.display = 'inline-block';
}

function stopChord() {
  activeSources.forEach(src => {
    if (src.stop) {
      src.stop(context.currentTime + 0.2);
    } else if (src.osc && src.gain) {
      src.gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      src.osc.stop(context.currentTime + 0.2);
    }
  });
  activeSources = [];
}

function selectLevel(level) {
  currentLevel = level;
  document.getElementById('level-select').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  ['dimBtn', 'aumBtn', 'setimaBtn', 'setimaMaiorBtn'].forEach(id =>
    document.getElementById(id).style.display = (level === 'facil'
      ? 'none' : (level === 'medio'
        ? (id === 'dimBtn' || id === 'aumBtn' ? 'inline-block' : 'none')
        : 'inline-block'))
  );
}

function startGame() {
  score = 0; round = 0; startTime = Date.now();
  document.getElementById('result').innerHTML = '';
  nextRound();
}

function getRandomChord() {
  const types = {
    facil: ['maior', 'menor'],
    medio: ['maior', 'menor', 'diminuto', 'aumentado'],
    dificil: ['maior', 'menor', 'diminuto', 'aumentado', '7', '7M']
  }[currentLevel];
  const root = notes[Math.floor(Math.random() * notes.length)];
  return { root, type: types[Math.floor(Math.random() * types.length)] };
}

function nextRound() {
  if (round >= 10) return endGame();
  round++;
  currentChord = getRandomChord();
  document.getElementById('status').textContent = `Rodada ${round} de 10`;
  document.getElementById('choices').style.display = 'block';
  playChord();
}

function checkAnswer(answer) {
  stopChord();
  const buttons = document.querySelectorAll('#choices button');
  buttons.forEach(btn => btn.disabled = true);
  if (answer === currentChord.type) {
    score++;
    event.target.style.backgroundColor = 'green';
  } else {
    event.target.style.backgroundColor = 'red';
    buttons.forEach(btn => {
      if (btn.textContent.toLowerCase().includes(currentChord.type)) {
        btn.style.backgroundColor = 'green';
      }
    });
  }
  setTimeout(() => {
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.backgroundColor = '';
    });
    nextRound();
  }, 1000);
}

function endGame() {
  stopChord();
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const perc = ((10 - score) / 10) * 100;
  const color = perc < 50 ? 'red' : perc > 80 ? 'green' : 'white';
  document.getElementById('status').textContent = 'Jogo finalizado!';
  document.getElementById('choices').style.display = 'none';
  document.getElementById('repeat-btn').style.display = 'none';
  document.getElementById('result').innerHTML = `
    <p><strong>Resultado:</strong> ${score} de 10</p>
    <p style="color:${color};"><strong>Erros:</strong> ${perc.toFixed(1)}%</p>
    <p><strong>Tempo:</strong> ${Math.floor(timeTaken/60)}m ${timeTaken%60}s</p>
    <a href="#" onclick="startGame()" class="button">🔁 Continuar neste nível</a>
    <a href="#" onclick="window.location.reload()" class="button">🔄 Escolher outro nível</a>
  `;
}

window.playChord = playChord;
window.startGame = startGame;
window.checkAnswer = checkAnswer;
window.selectLevel = selectLevel;
