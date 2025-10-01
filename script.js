const difficulties = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const boardElement = document.getElementById("board");
const difficultySelect = document.getElementById("difficulty");
const customForm = document.getElementById("custom-form");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const minesInput = document.getElementById("mines");
const restartButton = document.getElementById("restart");
const minesLeftElement = document.getElementById("mines-left");
const timerElement = document.getElementById("timer");
const messageElement = document.getElementById("message");

let state = {
  rows: 0,
  cols: 0,
  mines: 0,
  board: [],
  revealedCount: 0,
  flags: 0,
  timerId: null,
  secondsElapsed: 0,
  started: false,
  finished: false,
};

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      element: null,
    }))
  );
}

function placeMines(board, mineCount, initialRow, initialCol) {
  const positions = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (r === initialRow && c === initialCol) return;
      positions.push([r, c]);
    })
  );

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  positions.slice(0, mineCount).forEach(([r, c]) => {
    board[r][c].mine = true;
  });
}

function calculateAdjacents(board) {
  const rows = board.length;
  const cols = board[0].length;
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
          count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

function resetTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
  }
  state.secondsElapsed = 0;
  timerElement.textContent = "0";
  state.timerId = null;
}

function startTimer() {
  if (state.timerId) return;
  state.timerId = setInterval(() => {
    state.secondsElapsed += 1;
    timerElement.textContent = state.secondsElapsed.toString();
  }, 1000);
}

function updateMinesLeft() {
  const remaining = Math.max(state.mines - state.flags, 0);
  minesLeftElement.textContent = remaining.toString();
}

function showMessage(text, type = "") {
  messageElement.textContent = text;
  messageElement.dataset.type = type;
  if (type === "win") {
    messageElement.style.color = "var(--success)";
  } else if (type === "lose") {
    messageElement.style.color = "var(--accent)";
  } else {
    messageElement.style.color = "inherit";
  }
}

function revealCell(row, col) {
  const cell = state.board[row][col];
  if (cell.revealed || cell.flagged || state.finished) return;

  if (!state.started) {
    state.started = true;
    placeMines(state.board, state.mines, row, col);
    calculateAdjacents(state.board);
    startTimer();
  }

  cell.revealed = true;
  cell.element.classList.add("revealed");
  state.revealedCount += 1;

  if (cell.mine) {
    cell.element.classList.add("mine");
    endGame(false);
    return;
  }

  if (cell.adjacent > 0) {
    cell.element.dataset.value = cell.adjacent;
    cell.element.textContent = cell.adjacent;
  } else {
    floodReveal(row, col);
  }

  checkWinCondition();
}

function floodReveal(row, col) {
  const queue = [[row, col]];
  const rows = state.rows;
  const cols = state.cols;
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  while (queue.length) {
    const [r, c] = queue.shift();
    const cell = state.board[r][c];

    if (cell.adjacent > 0) {
      cell.element.dataset.value = cell.adjacent;
      cell.element.textContent = cell.adjacent;
      continue;
    }

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = state.board[nr][nc];
      if (neighbor.revealed || neighbor.flagged) continue;
      neighbor.revealed = true;
      neighbor.element.classList.add("revealed");
      state.revealedCount += 1;
      if (neighbor.adjacent === 0) {
        queue.push([nr, nc]);
      } else {
        neighbor.element.dataset.value = neighbor.adjacent;
        neighbor.element.textContent = neighbor.adjacent;
      }
    }
  }
}

function toggleFlag(row, col) {
  const cell = state.board[row][col];
  if (cell.revealed || state.finished) return;

  cell.flagged = !cell.flagged;
  cell.element.classList.toggle("flagged", cell.flagged);
  state.flags += cell.flagged ? 1 : -1;
  updateMinesLeft();
}

function endGame(win) {
  state.finished = true;
  clearInterval(state.timerId);
  state.timerId = null;
  showMessage(win ? "恭喜过关！" : "踩到雷啦，再试一次吧~", win ? "win" : "lose");

  if (!win) {
    state.board.forEach((row) =>
      row.forEach((cell) => {
        if (cell.mine) {
          cell.element.classList.add("mine", "revealed");
        }
      })
    );
  }
}

function checkWinCondition() {
  const totalSafe = state.rows * state.cols - state.mines;
  if (state.revealedCount >= totalSafe && !state.finished) {
    endGame(true);
  }
}

function buildBoard() {
  boardElement.innerHTML = "";
  boardElement.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;
  boardElement.style.gridTemplateRows = `repeat(${state.rows}, var(--cell-size))`;

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cellElement = document.createElement("button");
      cellElement.type = "button";
      cellElement.className = "cell";
      cellElement.setAttribute("role", "gridcell");
      cellElement.setAttribute("aria-label", `第${r + 1}行第${c + 1}列`);

      cellElement.addEventListener("click", () => revealCell(r, c));
      cellElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(r, c);
      });
      cellElement.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") {
          event.preventDefault();
          toggleFlag(r, c);
        }
      });

      state.board[r][c].element = cellElement;
      boardElement.appendChild(cellElement);
    }
  }
}

function initGame() {
  const selected = difficultySelect.value;
  let rows;
  let cols;
  let mines;

  if (selected === "custom") {
    customForm.hidden = false;
    rows = Number(rowsInput.value);
    cols = Number(colsInput.value);
    mines = Number(minesInput.value);
    const maxMines = rows * cols - 1;
    if (mines > maxMines) {
      mines = maxMines;
      minesInput.value = String(maxMines);
    }
  } else {
    customForm.hidden = true;
    ({ rows, cols, mines } = difficulties[selected]);
  }

  state = {
    rows,
    cols,
    mines,
    board: createEmptyBoard(rows, cols),
    revealedCount: 0,
    flags: 0,
    timerId: null,
    secondsElapsed: 0,
    started: false,
    finished: false,
  };

  updateMinesLeft();
  resetTimer();
  showMessage("点击任意格子开始游戏！");
  buildBoard();
}

restartButton.addEventListener("click", initGame);
difficultySelect.addEventListener("change", initGame);
customForm.addEventListener("input", () => {
  if (difficultySelect.value === "custom") {
    initGame();
  }
});

document.addEventListener("DOMContentLoaded", initGame);
