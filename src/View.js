export class View {
    constructor(board, game) {
        this.board = board;
        this.game = game;
        this.boardEl = document.getElementById('board');
        this.handEls = {
            self: document.getElementById('self-hand'),
            opponent: document.getElementById('opponent-hand')
        };
        this.statusEl = document.getElementById('game-status');
        this.levelModal = document.getElementById('level-modal');
        this.draftDoneBtn = document.getElementById('draft-done-btn');
        this.draftPassBtn = document.getElementById('draft-pass-btn');
        this.restartBtn = document.getElementById('restart-btn');

        // Check level modal existence manually since it was added dynamically in Game flow notion,
        // but actually we added it to HTML now.

        if (this.levelModal) {
            this.levelModal.querySelectorAll('.level-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.dataset.level;
                    this.levelModal.style.display = 'none';
                    this.game.startLevel(level);
                });
            });
        }

        if (this.draftDoneBtn) {
            this.draftDoneBtn.addEventListener('click', () => {
                this.game.declareSetupDone();
            });
        }

        if (this.draftPassBtn) {
            this.draftPassBtn.addEventListener('click', () => {
                this.game.switchDraftTurn();
            });
        }

        this.ensureDebugElements(); // Ensure DOM elements exist

        // Debug elements
        this.debugToggleBtn = document.getElementById('debug-toggle-btn');
        this.debugPanel = document.getElementById('debug-panel');
        this.debugClearBtn = document.getElementById('debug-clear-btn');
        this.debugPieceSelect = document.getElementById('debug-piece-select');
        this.debugTierInput = document.getElementById('debug-tier-input');
        this.debugOwnerSelect = document.getElementById('debug-owner-select');
        this.isDebugMode = false;

        this.initDOM();
        this.bindEvents();
        this.injectStyles();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .reversed {
                transform: rotate(180deg);
            }
            .reversed .cell .piece {
                transform: rotate(180deg);
            }
        `;
        document.head.appendChild(style);
    }

    ensureDebugElements() {
        const controls = document.getElementById('controls');
        // Add Toggle Button if missing
        if (controls && !document.getElementById('debug-toggle-btn')) {
            const btn = document.createElement('button');
            btn.id = 'debug-toggle-btn';
            btn.className = 'btn';
            btn.style.marginLeft = '20px';
            btn.textContent = 'デバッグモード';
            controls.appendChild(btn);
            console.log('Created debug-toggle-btn dynamically');
        }

        // Add Debug Panel if missing
        if (!document.getElementById('debug-panel')) {
            const panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.className = 'debug-panel hidden';
            panel.innerHTML = `
            <h3>デバッグ設定</h3>
            <div class="debug-controls">
                <label>
                    駒を選択:
                    <select id="debug-piece-select">
                        <option value="Marshal">帥 (Marshal)</option>
                        <option value="General">大 (General)</option>
                        <option value="LtGeneral">中 (Lt. General)</option>
                        <option value="Major">小 (Major)</option>
                        <option value="Samurai">侍 (Samurai)</option>
                        <option value="Lance">槍 (Lance)</option>
                        <option value="Knight">馬 (Knight)</option>
                        <option value="Ninja">忍 (Ninja)</option>
                        <option value="Fortress">砦 (Fortress)</option>
                        <option value="Pawn">兵 (Pawn)</option>
                        <option value="Cannon">砲 (Cannon)</option>
                        <option value="Archer">弓 (Archer)</option>
                        <option value="Musket">筒 (Musket)</option>
                        <option value="Spy">謀 (Spy)</option>
                    </select>
                </label>
                <label>
                    段数 (Tier): 
                    <input type="number" id="debug-tier-input" value="1" min="1" max="3">
                </label>
                <label>
                    所属:
                    <select id="debug-owner-select">
                        <option value="self">先手 (黒)</option>
                        <option value="opponent">後手 (白)</option>
                    </select>
                </label>
                <button id="debug-clear-btn" class="btn small">盤面クリア</button>
                <p class="note">盤面をクリックして駒を配置・移動確認</p>
            </div>`;
            document.getElementById('app').appendChild(panel);
            console.log('Created debug-panel dynamically');
        }
    }

    initDOM() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                this.boardEl.appendChild(cell);
            }
        }
        this.render();
    }

    bindEvents() {
        this.boardEl.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);

                // Show details for clicked cell
                this.showCellDetails(r, c);

                if (this.isDebugMode) {
                    this.handleDebugBoardClick(r, c);
                } else {
                    this.game.handleBoardClick(r, c);
                }
            }
        });

        this.handEls.self.addEventListener('click', (e) => {
            if (this.isDebugMode) return;
            const pieceEl = e.target.closest('.piece');
            if (pieceEl) {
                const index = parseInt(pieceEl.dataset.index);
                this.game.handleHandClick('self', index);
            }
        });

        this.handEls.opponent.addEventListener('click', (e) => {
            if (this.isDebugMode) return;
            const pieceEl = e.target.closest('.piece');
            if (pieceEl) {
                const index = parseInt(pieceEl.dataset.index);
                this.game.handleHandClick('opponent', index);
            }
        });

        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => {
                if (confirm('対局をリセットしますか？')) {
                    this.game.restart();
                }
            });
        }

        // Debug Listeners
        if (this.debugToggleBtn) {
            console.log('Debug button found');
            this.debugToggleBtn.addEventListener('click', () => {
                console.log('Debug button clicked');
                this.isDebugMode = !this.isDebugMode;
                this.debugPanel.classList.toggle('hidden', !this.isDebugMode);
                this.updateDebugState();
            });
        } else {
            console.error('Debug button NOT found');
        }

        if (this.debugClearBtn) {
            this.debugClearBtn.addEventListener('click', () => {
                this.game.clearBoard();
            });
        }
    }

    updateDebugState() {
        const title = document.querySelector('h1');
        if (this.isDebugMode) {
            this.boardEl.style.borderColor = '#484';
            title.textContent = '軍儀 (DEBUG MODE)';
            title.style.color = '#8f8';
        } else {
            this.boardEl.style.borderColor = '#444';
            title.textContent = '軍儀';
            title.style.color = '#ddd';
        }
    }

    handleDebugBoardClick(r, c) {
        const name = this.debugPieceSelect.value;
        const tier = parseInt(this.debugTierInput.value) || 1;
        const owner = this.debugOwnerSelect.value;

        // Place debug piece
        this.game.debugPlacePiece(r, c, name, owner, tier); // Count as stack height

        // Visualize moves immediately
        // Need to reconstruct Game logic usage here or add method in Game
        // Let's create a temporary selected state to show moves

        // Highlight logic
        this.render(); // Redraw board first

        // Manually calculate moves for visualization
        // Need to get the piece instance we just placed
        const piece = this.board.getPiece(r, c);
        // Note: debugPlacePiece creates 'tier' number of pieces.
        // So stack height is 'tier'.

        if (piece) {
            const moves = this.game.calculateMoves(piece, tier, r, c);
            this.highlightValidMoves(moves);
            this.highlightSelected(r, c);
        }
    }

    render() {
        const cells = this.boardEl.querySelectorAll('.cell');
        // Clear highlights first? Usually handled by re-rendering content and classes

        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const stack = this.board.getStack(r, c);
            const piece = this.board.getPiece(r, c);

            cell.innerHTML = '';
            cell.className = 'cell';

            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.classList.add('piece');
                pieceEl.classList.add(piece.owner);
                // 軍儀の駒名表示 (2文字対応)
                pieceEl.textContent = piece.originalName;

                // スタックバッジ
                if (stack.length > 1) {
                    const badge = document.createElement('div');
                    badge.className = 'stack-badge';
                    badge.textContent = stack.length;
                    pieceEl.appendChild(badge);
                }

                cell.appendChild(pieceEl);

                // 下の駒を少し見せる演出（Optional）
                if (stack.length > 1) {
                    pieceEl.classList.add('stacked');
                }
            }
        });

        this.renderHand('self');
        this.renderHand('opponent');

        this.updateStatus();
    }

    updateStatus() {
        this.statusEl.textContent = `手番: ${this.game.turn === 'self' ? '先手(黒)' : '後手(白)'}`;
        this.updateDraftButtonState();

        if (this.game.isOnline && this.game.mySide === 'opponent') {
            this.boardEl.classList.add('reversed');
        } else {
            this.boardEl.classList.remove('reversed');
        }
    }

    updateDraftButtonState() {
        if (!this.draftDoneBtn || !this.draftPassBtn) return;

        let disabled = false;
        // Online: Disable if not my turn
        if (this.game.isOnline && this.game.turn !== this.game.mySide) {
            disabled = true;
        }

        this.draftDoneBtn.disabled = disabled;
        this.draftPassBtn.disabled = disabled;
    }

    showLevelSelection() {
        if (this.levelModal) {
            this.levelModal.style.display = 'flex';
        }
    }

    hideLevelSelection() {
        if (this.levelModal) {
            this.levelModal.style.display = 'none';
        }
    }

    toggleDraftControls(show) {
        if (this.draftDoneBtn) {
            this.draftDoneBtn.classList.toggle('hidden', !show);
        }
        if (this.draftPassBtn) {
            this.draftPassBtn.classList.toggle('hidden', !show);
        }
        if (show) {
            this.updateDraftButtonState();
        }
    }

    renderHand(owner) {
        if (!this.game.hands || !this.game.hands[owner]) return;

        const container = this.handEls[owner];
        container.innerHTML = '';
        const hand = this.game.hands[owner];

        hand.forEach((piece, index) => {
            const pieceEl = document.createElement('div');
            pieceEl.classList.add('piece');
            pieceEl.classList.add(owner);
            pieceEl.textContent = piece.originalName;
            pieceEl.dataset.index = index;
            container.appendChild(pieceEl);
        });
    }

    highlightSelected(r, c) {
        const cell = this.getCell(r, c);
        if (cell && cell.querySelector('.piece')) {
            cell.querySelector('.piece').classList.add('selected');
        }
    }

    highlightValidMoves(moves) {
        moves.forEach(move => {
            const cell = this.getCell(move.r, move.c);
            if (cell) {
                cell.classList.add('valid-move');
                // アクションタイプによって色を変える？
                if (move.type === 'attack') {
                    cell.classList.add('attack-move');
                } else if (move.type === 'stack') {
                    cell.classList.add('stack-move');
                }
            }
        });
    }

    highlightHandSelected(owner, index) {
        const container = this.handEls[owner];
        const pieces = container.querySelectorAll('.piece');
        if (pieces[index]) {
            pieces[index].classList.add('selected');
        }
    }

    getCell(r, c) {
        return this.boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    }

    async askActionType(types) {
        let msg = "アクションを選択してください:\n";
        const map = {};

        types.forEach((t, i) => {
            let label = t;
            if (t === 'attack') label = "攻撃（取る）";
            if (t === 'stack') label = "ツケ（乗る）";
            if (t === 'betrayal') label = "寝返り（交換）";

            msg += `${i + 1}: ${label}\n`;
            map[i + 1] = t;
        });

        const input = prompt(msg, "1");
        if (!input) return null;

        const key = parseInt(input);
        if (map[key]) return map[key];

        return null;
    }

    showCellDetails(r, c) {
        const detailsEl = document.getElementById('cell-details');
        const listEl = document.getElementById('stack-list');

        if (!detailsEl || !listEl) return;

        const stack = this.board.getStack(r, c);

        if (stack.length === 0) {
            detailsEl.classList.add('hidden');
            return;
        }

        detailsEl.classList.remove('hidden');
        listEl.innerHTML = '';

        // Show stack from bottom (Tier 1) to top (Tier N)
        stack.forEach((piece, index) => {
            const item = document.createElement('div');
            item.className = 'stack-item';

            const pieceEl = document.createElement('div');
            pieceEl.classList.add('piece');
            pieceEl.classList.add(piece.owner);
            pieceEl.textContent = piece.originalName;

            const label = document.createElement('span');
            label.className = 'tier-label';
            label.textContent = `${index + 1}段目`; // 1-indexed for display

            item.appendChild(pieceEl);
            item.appendChild(label);
            listEl.appendChild(item);
        });
    }

    showWinMessage(winner) {
        setTimeout(() => alert(`${winner === 'self' ? '先手' : '後手'}の勝利です！`), 100);
    }
}
