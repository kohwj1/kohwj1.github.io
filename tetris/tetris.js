const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

context.scale(20, 20);
nextContext.scale(20, 20); // Scale next piece canvas too

// Modern Neon Colors
const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // O
    '#0DFF72', // L
    '#F538FF', // J
    '#FF8E0D', // I
    '#FFE138', // S
    '#3877FF', // Z
];

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function arenaSweep() {
    let rowCount = 1;
    let sweeped = false;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
        sweeped = true;
    }

    // Add visual flash effect on clear
    if (sweeped) {
        canvas.classList.add('flash');
        setTimeout(() => {
            canvas.classList.remove('flash');
        }, 100);
    }
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Draw a matrix to a specific context with offset
function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];

                // Add shadow for neon glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = colors[value];

                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                // Reset shadow to avoid affecting other draws excessively
                ctx.shadowBlur = 0;

                // Inner highlight for 3D/Glass block effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                ctx.lineWidth = 0.05;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    // Clear Main Board
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawMatrix(player.matrix, player.pos, context);

    // Draw Next Piece
    nextContext.fillStyle = '#202028'; // Match bg color usually, or transparent
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Center the next piece in the 5x5 grid (approx) logic for 100x100 canvas (scale 20 -> 5x5 blocks)
    if (player.next) {
        // Calculate offset to center: (5 - width) / 2
        const offsetX = (5 - player.next[0].length) / 2;
        const offsetY = (5 - player.next.length) / 2;
        drawMatrix(player.next, { x: offsetX, y: offsetY }, nextContext);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

// 블록 생성 및 게임 오버 처리
function playerReset() {
    const pieces = 'ILJOTSZ';
    // If we have a next piece, use it. Otherwise generate one (first game)
    if (player.next === null) {
        player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    }

    player.matrix = player.next;
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    // Reset hard drop state
    isHardDropping = false;

    if (collide(arena, player)) {
        // Game Over
        gameOver = true;
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-score').innerText = player.score;
        arena.forEach(row => row.fill(0)); // Optional: keep board or clear it
    }
}

// Gacha Logic
const gachaCooldownTime = 30000; // 30 seconds
let lastGachaTime = -gachaCooldownTime; // Allow immediate first use
let pauseStartTime = 0; // Track when pause started

window.playerGacha = function () {
    if (gameOver || isPaused) return;

    const now = Date.now();
    if (now - lastGachaTime < gachaCooldownTime) return;

    const pieces = 'ILJOTSZ';
    // Reroll next piece
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);

    // Reset timer
    lastGachaTime = now;
    updateGachaButton();
    draw(); // Redraw immediately to show new next piece
}

function updateGachaButton() {
    if (isPaused) return; // Stop updating if paused

    const btn = document.getElementById('gacha-btn');
    const timerSpan = document.getElementById('gacha-timer');
    const now = Date.now();
    const timePassed = now - lastGachaTime;

    if (timePassed < gachaCooldownTime) {
        btn.disabled = true;
        const remaining = Math.ceil((gachaCooldownTime - timePassed) / 1000);
        timerSpan.innerText = `${remaining}s`;
        requestAnimationFrame(updateGachaButton);
    } else {
        btn.disabled = false;
        timerSpan.innerText = 'Ready';
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000; // This variable is now effectively unused due to dynamic speed scaling
let lastTime = 0;
let gameOver = false;
let isPaused = false;
let isHardDropping = false;

window.togglePause = function () {
    if (gameOver) return;

    isPaused = !isPaused;

    const overlay = document.getElementById('pause-overlay');

    if (isPaused) {
        overlay.classList.remove('hidden');
        pauseStartTime = Date.now();
        // Drawing handled by last state, update stops
    } else {
        overlay.classList.add('hidden');
        // Adjust timers so cooldown doesn't run during pause
        const pauseDuration = Date.now() - pauseStartTime;
        lastGachaTime += pauseDuration;
        lastTime = performance.now(); // Reset lastTime to avoid huge delta
        update(); // Resume loop
        updateGachaButton(); // Resume timer visual
    }
}

function update(time = 0) {
    if (gameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;

    // Dynamic Speed Scaling: Decrease 50ms per 1000 points, min 100ms
    const speedIncrease = Math.floor(player.score / 1000) * 50;
    const currentInterval = Math.max(100, 1000 - speedIncrease);

    if (dropCounter > currentInterval || isHardDropping) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

// Global reset function called by button
window.resetGame = function () {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.next = null; // Reset next piece
    updateScore();
    gameOver = false;
    isPaused = false;
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    lastGachaTime = -gachaCooldownTime; // Reset gacha cooldown
    updateGachaButton();
    playerReset();
    update();
}

const arena = createMatrix(12, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null, // Store next piece
    score: 0,
};

document.addEventListener('keydown', event => {
    if (gameOver) return; // Disable controls on game over

    // Pause toggle
    if (event.keyCode === 27) { // Esc
        togglePause();
        return;
    }

    if (isPaused) return; // Disable movement when paused

    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 38) {
        playerRotate(1);
    } else if (event.keyCode === 32) { // Space - Hard Drop
        isHardDropping = true;
    } else if (event.keyCode === 80) { // P - Gacha
        playerGacha();
    }
});

playerReset();
updateScore();
updateGachaButton(); // Start button loop
update();
