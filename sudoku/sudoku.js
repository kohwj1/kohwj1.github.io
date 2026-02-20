// ===== DOM Elements =====
const boardElement = document.getElementById('sudoku-board');
const difficultySelect = document.getElementById('difficulty-select');
const newGameBtn = document.getElementById('new-game-btn');
const calculateBtn = document.getElementById('calculate-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const winMessage = document.getElementById('win-message');
const winNewGameBtn = document.getElementById('win-new-game-btn');
const tooltipNumpad = document.getElementById('tooltip-numpad');
const tooltipButtons = document.querySelectorAll('.tooltip-btn');

// ===== Game State =====
let solution = [];
let initialBoard = [];
let currentBoard = [];
let selectedCell = null; // {row, col, element}
let previousDifficulty = 'easy';

// Constants
const GRID_SIZE = 9;
const BOX_SIZE = 3;
const DIFFICULTIES = {
    easy: 30,   // Number of holes
    medium: 45,
    hard: 60
};

// ===== Initialization =====
function initGame() {
    winMessage.classList.add('hidden');
    if (typeof hideTooltip === 'function') hideTooltip();
    previousDifficulty = difficultySelect.value;
    generatePuzzle();
    renderBoard();
}

// ===== Board Generation (Backtracking Algorithm) =====

function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function copyGrid(grid) {
    return grid.map(row => [...row]);
}

function isValid(grid, row, col, num) {
    // Check row
    for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[row][x] === num) return false;
    }
    // Check col
    for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[x][col] === num) return false;
    }
    // Check 3x3 box
    const startRow = row - row % BOX_SIZE;
    const startCol = col - col % BOX_SIZE;
    for (let i = 0; i < BOX_SIZE; i++) {
        for (let j = 0; j < BOX_SIZE; j++) {
            if (grid[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function fillGrid(grid) {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j] === 0) {
                // Try random numbers
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                nums.sort(() => Math.random() - 0.5);

                for (let num of nums) {
                    if (isValid(grid, i, j, num)) {
                        grid[i][j] = num;
                        if (fillGrid(grid)) return true;
                        grid[i][j] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function removeNumbers(grid, numHoles) {
    const puzzle = copyGrid(grid);
    let count = numHoles;
    while (count > 0) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        if (puzzle[row][col] !== 0) {
            puzzle[row][col] = 0;
            count--;
        }
    }
    return puzzle;
}

function generatePuzzle() {
    solution = createEmptyGrid();
    fillGrid(solution);

    const difficultyStr = difficultySelect.value;
    const holes = DIFFICULTIES[difficultyStr] || DIFFICULTIES.medium;

    initialBoard = removeNumbers(solution, holes);
    currentBoard = copyGrid(initialBoard);
}

// ===== Rendering & UI =====

function renderBoard() {
    boardElement.innerHTML = '';
    selectedCell = null;

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const val = currentBoard[row][col];
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Block borders (already handled by grid gap and bg, but let's add optional explicit borders if needed)
            if (col % 3 === 2 && col !== 8) cell.classList.add('right-border');
            if (row % 3 === 2 && row !== 8) cell.classList.add('bottom-border');

            if (initialBoard[row][col] !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            } else {
                if (val !== 0) cell.textContent = val;
                // Add click listener to non-fixed cells
                cell.addEventListener('mousedown', () => selectCell(row, col, cell));
            }

            boardElement.appendChild(cell);
        }
    }
}

function clearHighlights() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(c => {
        c.classList.remove('selected', 'related', 'error', 'correct');
    });
}

function highlightRelated(row, col) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(c => {
        const cRow = parseInt(c.dataset.row);
        const cCol = parseInt(c.dataset.col);
        const startRow = row - row % BOX_SIZE;
        const startCol = col - col % BOX_SIZE;

        if (cRow === row || cCol === col || (cRow >= startRow && cRow < startRow + BOX_SIZE && cCol >= startCol && cCol < startCol + BOX_SIZE)) {
            if (cRow !== row || cCol !== col) {
                c.classList.add('related');
            }
        }
    });
}

function selectCell(row, col, element) {
    if (initialBoard[row][col] !== 0) {
        hideTooltip();
        return; // Cannot select fixed cell
    }

    clearHighlights();
    selectedCell = { row, col, element };
    element.classList.add('selected');
    highlightRelated(row, col);

    showTooltip(element, row);
}

function showTooltip(cellElement, row) {
    const rect = cellElement.getBoundingClientRect();

    // Ensure it has layout before measuring
    tooltipNumpad.classList.add('visible');

    // Defer bounds calculation slightly if needed, but since display: grid is applied immediately via class, it should be fine.
    const tooltipRect = tooltipNumpad.getBoundingClientRect();

    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
    let top;

    // Show tooltip ABOVE the cell if it's in the bottom 3 rows (indexes 6, 7, 8)
    if (row >= 6) {
        top = rect.top + window.scrollY - tooltipRect.height - 8;
    } else {
        top = rect.bottom + window.scrollY + 8;
    }

    // Adjust if tooltip goes off-screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > document.documentElement.clientWidth - 10) {
        left = document.documentElement.clientWidth - tooltipRect.width - 10;
    }

    tooltipNumpad.style.top = `${top}px`;
    tooltipNumpad.style.left = `${left}px`;
}

function hideTooltip() {
    tooltipNumpad.classList.remove('visible');
}

// ===== Input Handling =====

function setCellValue(val) {
    if (!selectedCell) return;
    const { row, col, element } = selectedCell;

    // Remove any error/correct styles if typing something new
    element.classList.remove('error', 'correct');

    if (val === 0) {
        currentBoard[row][col] = 0;
        element.textContent = '';
    } else {
        currentBoard[row][col] = val;
        element.textContent = val;
    }
}

// Keyboard
window.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
        setCellValue(num);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setCellValue(0);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Simple navigation
        let { row, col } = selectedCell;
        if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
        if (e.key === 'ArrowDown') row = Math.min(GRID_SIZE - 1, row + 1);
        if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') col = Math.min(GRID_SIZE - 1, col + 1);

        const newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (newCell && initialBoard[row][col] === 0) {
            selectCell(row, col, newCell);
        }
    }
});

// Tooltip Numpad
tooltipButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent document click from closing immediately
        const val = parseInt(btn.dataset.val);
        setCellValue(val);
        hideTooltip();
    });
});

// Prevent click inside tooltip from closing it
tooltipNumpad.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ===== Validation & Win State =====

function validateBoard() {
    clearHighlights();
    selectedCell = null;
    let isComplete = true;
    let hasErrors = false;

    const cells = document.querySelectorAll('.cell');

    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const val = currentBoard[row][col];

        if (initialBoard[row][col] === 0) {
            if (val === 0) {
                isComplete = false; // Not filled
            } else if (val !== solution[row][col]) {
                cell.classList.add('error');
                hasErrors = true;
                isComplete = false;
            } else {
                cell.classList.add('correct');
            }
        }
    });

    if (isComplete && !hasErrors) {
        showWinMessage();
    }
}

function showWinMessage() {
    winMessage.classList.remove('hidden');
}

// ===== Event Listeners =====
newGameBtn.addEventListener('click', initGame);
winNewGameBtn.addEventListener('click', initGame);

function hasUserInputs() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (initialBoard[r][c] === 0 && currentBoard[r][c] !== 0) {
                return true;
            }
        }
    }
    return false;
}

difficultySelect.addEventListener('change', (e) => {
    if (hasUserInputs()) {
        if (!confirm("난이도를 변경하면 진행중인 게임이 초기화됩니다. 계속하시겠습니까?")) {
            difficultySelect.value = previousDifficulty;
            return;
        }
    }
    initGame();
});

calculateBtn.addEventListener('click', validateBoard);

clearAllBtn.addEventListener('click', () => {
    if (confirm("입력한 내용을 모두 리셋합니다. 계속하시겠습니까?")) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (initialBoard[r][c] === 0) {
                    currentBoard[r][c] = 0;
                    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (cell) {
                        cell.textContent = '';
                        cell.classList.remove('error', 'correct');
                    }
                }
            }
        }
        hideTooltip();
        clearHighlights();
        selectedCell = null;
    }
});

// Click outside to deselect
document.addEventListener('click', (e) => {
    // If we clicked on a cell or inside the tooltip, don't hide
    if (!e.target.closest('.cell') && !e.target.closest('.tooltip-numpad')) {
        hideTooltip();
        clearHighlights();
        selectedCell = null;
    }
});

// Initialize on load
initGame();
