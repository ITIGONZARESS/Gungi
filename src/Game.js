import { Board } from './Board.js';
import { View } from './View.js';
import * as Pieces from './Piece.js';

export class Game {
    constructor() {
        this.board = new Board();

        this.turn = 'self';
        this.gameWinner = null;

        // Level Configuration
        this.level = null;
        this.phase = 'setup';
        this.maxStackHeight = 2;
        this.canMarshalStack = false;

        // Draft State
        this.draftState = {
            selfDone: false,
            opponentDone: false,
            selfMarshalPlaced: false,
            opponentMarshalPlaced: false
        };

        this.hands = {
            self: [],
            opponent: []
        };

        this.selected = null;
        this.gameOver = false; // Add gameOver if used

        // View requires board and game references, and might access game state immediately on init
        this.view = new View(this.board, this);

        // Initial setup for UI (Show level modal via View)
        // View constructor handles binding events, so we just wait for startLevel call from View.
    }

    start() {
        this.view.render();
    }

    setNetwork(network, role) {
        console.log(`[Game] setNetwork called. Role: ${role}`);
        this.network = network;
        this.isOnline = true;
        this.onlineRole = role;
        this.mySide = role === 'host' ? 'self' : 'opponent';
    }

    onNetworkData(data) {
        if (!data || !data.type) return;
        console.log('Processed:', data);

        switch (data.type) {
            case 'CONFIG':
                this.mySide = data.hostIsSelf ? 'opponent' : 'self';
                this.startLevel(data.level, true);
                const myColor = this.mySide === 'self' ? '先手(黒)' : '後手(白)';
                setTimeout(() => {
                    alert(`対局設定を受信しました。\nレベル: ${data.level}\nあなたは: ${myColor}`);
                }, 100);
                break;
            case 'MOVE':
                this.tryMovePiece(data.fromR, data.fromC, data.toR, data.toC, true, data.actionType);
                break;
            case 'DROP':
                this.tryDropPiece(data.index, data.r, data.c, true);
                break;
            case 'DRAFT_DROP':
                this.tryDraftDrop(data.index, data.r, data.c, true);
                break;
            case 'PASS':
                this.switchDraftTurn(true);
                break;
            case 'DONE':
                this.declareSetupDone(true);
                break;
        }
    }

    startLevel(level, isRemote = false) {
        if (this.isOnline && !isRemote && this.onlineRole !== 'host') {
            return;
        }

        if (this.isOnline && !isRemote && this.onlineRole === 'host') {
            const wantBlack = confirm("レベル: " + level + "\n先手(黒)でプレイしますか？\n[OK] 先手(黒) / [Cancel] 後手(白)");
            const hostIsSelf = wantBlack;
            this.mySide = hostIsSelf ? 'self' : 'opponent';

            this.network.send({
                type: 'CONFIG',
                level: level,
                hostIsSelf: hostIsSelf
            });
        }

        this.level = level;
        this.board = new Board(); // Reset board
        this.board.initBoard();
        this.view.board = this.board; // Update view reference
        this.turn = 'self';
        this.gameWinner = null;
        this.selected = null;

        // Ensure modal is hidden for client
        if (isRemote) {
            this.view.hideLevelSelection();
        }

        // Config per level
        switch (level) {
            case 'BEGINNER':
                this.maxStackHeight = 2;
                this.canMarshalStack = false;
                this.phase = 'playing';
                this.setupFixedBoard(false);
                break;
            case 'NOVICE':
                this.maxStackHeight = 2;
                this.canMarshalStack = false;
                this.phase = 'playing';
                this.setupFixedBoard('archer_only');
                break;
            case 'INTERMEDIATE':
                this.maxStackHeight = 2;
                this.canMarshalStack = true;
                this.phase = 'draft';
                this.setupDraftBoard();
                break;
            default:
                console.error('Unknown Level:', level);
                alert('エラー: 不明なレベル "' + level + '" が指定されました。');
                this.setupFixedBoard(false); // Fallback to beginner
                break;
        }

        this.view.render();
        this.view.updateStatus();
        this.view.toggleDraftControls(this.phase === 'draft');
    }

    restart() {
        if (this.isOnline && this.onlineRole !== 'host') {
            alert("ホストのみが設定を変更できます。");
            return;
        }
        this.phase = 'setup';
        this.view.showLevelSelection();
        this.view.toggleDraftControls(false);
    }

    // 自由配置用の初期状態
    setupDraftBoard() {
        this.hands.self = [];
        this.hands.opponent = [];

        // 全25枚
        const pieces = [
            'Marshal', 'General', 'LtGeneral', 'Spy', 'Musket', 'Cannon', 'Archer',
            'Major', 'Major', 'Samurai', 'Samurai', 'Ninja', 'Ninja',
            'Knight', 'Knight', 'Fortress', 'Fortress',
            'Lance', 'Lance', 'Lance',
            'Pawn', 'Pawn', 'Pawn', 'Pawn'
        ];

        pieces.forEach(name => {
            if (name === 'Marshal') {
                this.hands.self.unshift(this.createPieceInstance(name, 'self'));
                this.hands.opponent.unshift(this.createPieceInstance(name, 'opponent'));
            } else {
                this.hands.self.push(this.createPieceInstance(name, 'self'));
                this.hands.opponent.push(this.createPieceInstance(name, 'opponent'));
            }
        });

        this.draftState = {
            selfDone: false,
            opponentDone: false,
            selfMarshalPlaced: false,
            opponentMarshalPlaced: false,
            turnMoved: false
        };
    }

    // 固定配置
    setupFixedBoard(specialType) {
        console.log(`[Game] setupFixedBoard called. Type: ${specialType}`);
        this.hands.self = [];
        this.hands.opponent = [];
        const initialHand = ['Major', 'Major', 'Lance', 'Knight', 'Ninja', 'Pawn', 'Cannon', 'Musket', 'Spy'];

        // Helper
        const place = (r, c, name, owner) => {
            const p = this.createPieceInstance(name, owner);
            if (p) {
                this.board.pushPiece(r, c, p);
            } else {
                console.error(`[Game] Failed to create piece: ${name}`);
            }
        };

        // --- Opponent (White) ---
        place(0, 3, 'General', 'opponent');
        place(0, 4, 'Marshal', 'opponent');
        place(0, 5, 'LtGeneral', 'opponent');
        place(1, 1, 'Ninja', 'opponent');
        place(1, 2, 'Archer', 'opponent');
        place(1, 4, 'Lance', 'opponent');
        place(1, 6, 'Archer', 'opponent');
        place(1, 7, 'Knight', 'opponent');
        place(2, 0, 'Pawn', 'opponent');
        place(2, 2, 'Fortress', 'opponent');
        place(2, 3, 'Samurai', 'opponent');
        place(2, 4, 'Pawn', 'opponent');
        place(2, 5, 'Samurai', 'opponent');
        place(2, 6, 'Fortress', 'opponent');
        place(2, 8, 'Pawn', 'opponent');

        // --- Self (Black) ---
        place(8, 3, 'LtGeneral', 'self');
        place(8, 4, 'Marshal', 'self');
        place(8, 5, 'General', 'self');
        place(7, 1, 'Ninja', 'self');
        place(7, 2, 'Archer', 'self');
        place(7, 4, 'Lance', 'self');
        place(7, 6, 'Archer', 'self');
        place(7, 7, 'Knight', 'self');
        place(6, 0, 'Pawn', 'self');
        place(6, 2, 'Fortress', 'self');
        place(6, 3, 'Samurai', 'self');
        place(6, 4, 'Pawn', 'self');
        place(6, 5, 'Samurai', 'self');
        place(6, 6, 'Fortress', 'self');
        place(6, 8, 'Pawn', 'self');

        // Filter pieces based on specialType
        // removeTypes: pieces to remove
        const removeTypes = [];
        if (specialType === false) {
            // 入門: 特殊駒なし
            removeTypes.push('Archer', 'Musket', 'Cannon', 'Spy');
        } else if (specialType === 'archer_only') {
            // 初級: 弓のみあり -> 筒,砲,謀なし
            removeTypes.push('Musket', 'Cannon', 'Spy');
        }

        // Remove matched pieces from board
        if (removeTypes.length > 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const stack = this.board.getStack(r, c);
                    if (stack.length > 0) {
                        const p = stack[0]; // Top piece check
                        if (removeTypes.includes(p.name)) {
                            this.board.clearCell(r, c);
                        }
                    }
                }
            }
        }

        // Hands filtering setup (if we put initial hands)
        // Fixed board mode usually doesn't have initial hands in this implementation yet, 
        // but if we were to add them:
        // ['self', 'opponent'].forEach(owner => {
        //     initialHand.forEach(name => {
        //         if (!removeTypes.includes(name)) {
        //             this.hands[owner].push(this.createPieceInstance(name, owner));
        //         }
        //     });
        // });
        // NOTE: Previous 'setupInitialState' had hands code but commented out logic implies no hands by default for fixed setup?
        // Step 244 code HAD logic to push to hands: lines 76-82.
        // So I should keep it but filter it.

        ['self', 'opponent'].forEach(owner => {
            initialHand.forEach(name => {
                if (!removeTypes.includes(name)) {
                    this.hands[owner].push(this.createPieceInstance(name, owner));
                }
            });
        });
    }

    handleBoardClick(r, c) {
        if (this.gameWinner) return;

        // Online check
        if (this.isOnline && this.turn !== this.mySide) return;

        if (this.phase === 'draft') {
            this.handleDraftClick(r, c);
            return;
        }

        // ... (rest is same logic, just modifying top guard)

        if (this.phase !== 'playing') return;

        // Try Move first if selected
        // 選択中の駒があり、クリックした場所が有効な移動先なら移動を実行する
        // これにより、自分の駒の上へのツケ（移動先が自分の駒）が可能になる
        if (this.selected) {
            const moves = this.selected.type === 'board'
                ? this.getValidMoves(this.selected.r, this.selected.c)
                : this.getValidDrops(this.selected.owner, this.selected.index);

            const isValidMove = moves.some(m => m.r === r && m.c === c);
            if (isValidMove) {
                if (this.selected.type === 'board') {
                    this.tryMovePiece(this.selected.r, this.selected.c, r, c);
                } else if (this.selected.type === 'hand') {
                    this.tryDropPiece(this.selected.index, r, c);
                }
                return;
            }
        }

        // 移動でなければ、駒の選択処理
        const piece = this.board.getPiece(r, c);
        if (piece && piece.owner === this.turn) {
            this.selectPieceOnBoard(r, c);
            return;
        }

        // 選択解除
        this.selected = null;
        this.view.render();
    }

    handleHandClick(owner, index) {
        if (this.gameWinner) return;
        if (owner !== this.turn) return;
        if (this.isOnline && this.turn !== this.mySide) return;

        if (this.phase === 'draft' && this.draftState.turnMoved) {
            alert('「番を返す」か「配置完了」を選択してください。');
            return;
        }

        // Draft or Playing
        this.selectPieceInHand(owner, index);
    }

    handleDraftClick(r, c) {
        if (this.selected && this.selected.type === 'hand') {
            this.tryDraftDrop(this.selected.index, r, c);
        }
    }

    tryDraftDrop(index, r, c, isRemote = false) {
        if (!isRemote && (!this.selected || this.turn !== this.selected.owner)) return;

        // Check Area
        const isSelf = this.turn === 'self';
        const validRows = isSelf ? [6, 7, 8] : [0, 1, 2];
        if (!validRows.includes(r)) {
            if (!isRemote) alert('配置フェーズでは手前3列のみに配置できます。');
            return;
        }

        // Stack Limit
        const stack = this.board.getStack(r, c);
        if (stack.length > 0) {
            if (!isRemote) alert('既に駒がある場所には配置できません。');
            return;
        }

        const hand = this.hands[this.turn];
        const piece = hand[index];

        // Marshal Constraint
        const state = this.draftState;
        const marshalPlaced = isSelf ? state.selfMarshalPlaced : state.opponentMarshalPlaced;

        if (!marshalPlaced && piece.name !== 'Marshal') {
            if (!isRemote) alert('最初は「帥」を配置してください。');
            return;
        }

        this.board.pushPiece(r, c, piece);
        hand.splice(index, 1);

        if (piece.name === 'Marshal') {
            if (isSelf) state.selfMarshalPlaced = true;
            else state.opponentMarshalPlaced = true;
        }

        this.selected = null;

        if (this.isOnline && !isRemote) {
            this.network.send({ type: 'DRAFT_DROP', index, r, c });
        }

        // If Self is already Done, and Opponent places a piece -> Game Start immediately
        if (!isSelf && state.selfDone) {
            this.startGame();
            return;
        }

        // Turn is NOT switched automatically. User must click "Pass" or "Done".
        this.draftState.turnMoved = true;
        this.view.render();
    }

    switchDraftTurn(isRemote = false) {
        // If Self is Done, and Opponent Passes (switches turn) -> Game Start
        if (this.turn === 'opponent' && this.draftState.selfDone) {
            this.startGame();
            return;
        }

        this.draftState.turnMoved = false;

        const nextTurn = this.turn === 'self' ? 'opponent' : 'self';
        const nextDone = nextTurn === 'self' ? this.draftState.selfDone : this.draftState.opponentDone;

        if (!nextDone) {
            this.turn = nextTurn;
        }

        if (this.isOnline && !isRemote) {
            this.network.send({ type: 'PASS' });
        }

        this.view.updateStatus();
    }

    declareSetupDone(isRemote = false) {
        if (this.phase !== 'draft') return;

        const state = this.draftState;
        const isSelf = this.turn === 'self';
        if (isSelf && !state.selfMarshalPlaced) {
            if (!isRemote) alert('帥を配置しないと完了できません。');
            return;
        }
        if (!isSelf && !state.opponentMarshalPlaced) {
            if (!isRemote) alert('帥を配置しないと完了できません。');
            return;
        }

        if (isSelf) {
            state.selfDone = true;
            // 先手が完了 -> 後手番へ
            this.turn = 'opponent';
            this.draftState.turnMoved = false;
            this.view.updateStatus();
            this.view.render();
            if (!isRemote) alert("先手が配置完了しました。後手の手番です。");
        } else {
            // 後手が完了 -> 即座に対局開始
            state.opponentDone = true;
            this.startGame();
        }

        if (this.isOnline && !isRemote) {
            this.network.send({ type: 'DONE' });
        }
    }

    startGame() {
        this.phase = 'playing';
        this.view.toggleDraftControls(false);
        this.turn = 'self';
        this.view.render();
        // Allow UI to update before showing alert
        setTimeout(() => {
            alert('対局開始！');
        }, 50);
    }

    selectPieceOnBoard(r, c) {
        this.selected = { type: 'board', r, c };
        this.view.render();
        this.view.highlightSelected(r, c);

        const moves = this.getValidMoves(r, c);
        this.view.highlightValidMoves(moves);
    }

    selectPieceInHand(owner, index) {
        this.selected = { type: 'hand', owner, index };
        this.view.render();
        this.view.highlightHandSelected(owner, index);

        // Draft: Valid moves are just area drops
        // Playing: Valid moves are drops
        let moves = [];
        if (this.phase === 'draft') {
            // Calculate valid draft drops (front 3 rows)
            const isSelf = owner === 'self';
            const validRows = isSelf ? [6, 7, 8] : [0, 1, 2];
            for (let r of validRows) {
                for (let c = 0; c < 9; c++) {
                    if (this.board.getStack(r, c).length === 0) {
                        moves.push({ r, c, type: 'drop' });
                    }
                }
            }
        } else {
            moves = this.getValidDrops(owner, index);
        }
        this.view.highlightValidMoves(moves);
    }

    getValidMoves(r, c) {
        const piece = this.board.getPiece(r, c);
        if (!piece) return [];
        const currentStack = this.board.getStack(r, c);
        const stackHeight = currentStack.length;
        return this.calculateMoves(piece, stackHeight, r, c);
    }

    calculateMoves(piece, stackHeight, r, c) {
        const moves = [];
        const definitions = piece.getMoveDefinitions(stackHeight);
        const owner = piece.owner;

        definitions.forEach(def => {
            const dr = owner === 'self' ? def.dr : -def.dr;
            const dc = owner === 'self' ? def.dc : -def.dc;
            const offset = def.originOffset || { r: 0, c: 0 };
            const offR = owner === 'self' ? offset.r : -offset.r;
            const offC = owner === 'self' ? offset.c : -offset.c;

            let currR = r + offR + dr;
            let currC = c + offC + dc;

            const range = def.range;
            const canJump = def.canJump;
            let dist = 0;

            while (this.board.isValidPos(currR, currC)) {
                dist++;
                if (range !== Infinity && dist > range) break;

                const targetStack = this.board.getStack(currR, currC);
                const targetHeight = targetStack.length;
                const targetPiece = this.board.getPiece(currR, currC);

                let isBlocked = false;

                if (!targetPiece) {
                    moves.push({ r: currR, c: currC, type: 'move' });
                } else {
                    const canInteract = stackHeight >= targetHeight;
                    const notFull = targetHeight < this.maxStackHeight;

                    // Marshal Stack Check
                    let isMarshalStacking = (piece.name === 'Marshal');
                    // Forbidden to stack ON Marshal (Self or Opponent)
                    let isTargetMarshal = (targetPiece.name === 'Marshal');

                    const allowStack = notFull && (!isMarshalStacking || this.canMarshalStack) && !isTargetMarshal;

                    if (targetPiece.owner !== owner) {
                        if (canInteract) {
                            moves.push({ r: currR, c: currC, type: 'attack' });
                            if (allowStack) {
                                moves.push({ r: currR, c: currC, type: 'stack' });

                                // Spy Betrayal Logic (INTERMEDIATE)
                                if (piece.name === 'Spy' && this.level === 'INTERMEDIATE') {
                                    const hand = this.hands[owner];
                                    if (hand.some(p => p.name === targetPiece.name)) {
                                        moves.push({ r: currR, c: currC, type: 'betrayal' });
                                    }
                                }
                            }
                        }
                    } else {
                        if (allowStack) {
                            moves.push({ r: currR, c: currC, type: 'stack' });
                        }
                    }

                    if (canJump && targetHeight < stackHeight) {
                        // Pass
                    } else {
                        isBlocked = true;
                    }
                }
                if (isBlocked) break;
                currR += dr;
                currC += dc;
            }
        });
        return moves;
    }

    getValidDrops(owner, index) {
        const moves = [];

        // Find frontline (furthest piece towards enemy)
        let minR = 9; // For self (smaller is further)
        let maxR = -1; // For opponent (larger is further)
        let hasPiece = false;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board.getPiece(r, c);
                if (piece && piece.owner === owner) {
                    hasPiece = true;
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                }
            }
        }

        let startR = 0;
        let endR = 8;

        if (hasPiece) {
            if (owner === 'self') {
                // Self moves up (decrement R). Furthest is minR.
                // Valid drops are from minR to 8 (cannot drop ahead of frontline).
                startR = minR;
                endR = 8;
            } else {
                // Opponent moves down (increment R). Furthest is maxR.
                // Valid drops are from 0 to maxR (cannot drop ahead of frontline).
                startR = 0;
                endR = maxR;
            }
        }

        for (let r = startR; r <= endR; r++) {
            for (let c = 0; c < 9; c++) {
                if (!this.board.getPiece(r, c)) {
                    moves.push({ r, c, type: 'drop' });
                }
            }
        }
        return moves;
    }

    async tryMovePiece(fromR, fromC, toR, toC, isRemote = false, remoteActionType = null) {
        const validMoves = this.getValidMoves(fromR, fromC);
        const targetMoves = validMoves.filter(m => m.r === toR && m.c === toC);

        if (targetMoves.length === 0) return;

        let actionType = targetMoves[0].type;

        if (isRemote && remoteActionType) {
            actionType = remoteActionType;
        } else if (targetMoves.length > 1) {
            // Filter unique types to avoid multiple prompts for same type if any
            const types = [...new Set(targetMoves.map(m => m.type))];
            if (types.length > 1) {
                const answer = await this.view.askActionType(types);
                if (!answer) return;
                actionType = answer;
            } else {
                actionType = types[0];
            }
        }

        const movingPiece = this.board.popPiece(fromR, fromC);

        if (actionType === 'attack') {
            // Consecutive capture: remove all opponent pieces from top
            while (true) {
                const topStackPiece = this.board.getPiece(toR, toC);
                if (!topStackPiece || topStackPiece.owner === this.turn) break;

                const captured = this.board.popPiece(toR, toC);
                if (captured && captured.name === 'Marshal') {
                    this.gameWinner = this.turn;
                    this.view.showWinMessage(this.turn);
                }
            }
            this.board.pushPiece(toR, toC, movingPiece);
        } else if (actionType === 'stack') {
            this.board.pushPiece(toR, toC, movingPiece);
        } else if (actionType === 'betrayal') {
            const targetPiece = this.board.getPiece(toR, toC);
            const hand = this.hands[this.turn];
            const handIndex = hand.findIndex(p => p.name === targetPiece.name);

            if (handIndex !== -1) {
                const exchangePiece = hand[handIndex];
                hand.splice(handIndex, 1);

                // Remove opponent piece
                this.board.popPiece(toR, toC);

                // Place my piece from hand
                this.board.pushPiece(toR, toC, exchangePiece);

                // Place spy on top
                this.board.pushPiece(toR, toC, movingPiece);
            } else {
                console.error("Betrayal failed: piece not found in hand");
                this.board.pushPiece(toR, toC, movingPiece);
            }
        } else {
            this.board.pushPiece(toR, toC, movingPiece);
        }

        this.selected = null;
        this.switchTurn();
        this.view.render();

        if (this.isOnline && !isRemote) {
            this.network.send({
                type: 'MOVE',
                fromR, fromC, toR, toC,
                actionType: actionType
            });
        }
    }

    tryDropPiece(handIndex, r, c, isRemote = false) {
        const validDrops = this.getValidDrops(this.turn, handIndex);
        if (!validDrops.some(m => m.r === r && m.c === c)) return;

        const piece = this.hands[this.turn][handIndex];
        this.hands[this.turn].splice(handIndex, 1);
        this.board.pushPiece(r, c, piece);
        this.selected = null;
        this.switchTurn();
        this.view.render();

        if (this.isOnline && !isRemote) {
            this.network.send({ type: 'DROP', index: handIndex, r, c });
        }
    }

    switchTurn() {
        this.turn = this.turn === 'self' ? 'opponent' : 'self';
        this.view.updateStatus();
    }

    createPieceInstance(name, owner) {
        return new Pieces[name](owner);
    }

    // Debug
    clearBoard() {
        this.board = new Board();
        this.board.initBoard();
        this.hands = { self: [], opponent: [] };
        this.view.render();
    }

    debugPlacePiece(r, c, name, owner, count = 1) {
        this.board.grid[r][c] = [];
        for (let i = 0; i < count; i++) {
            const piece = this.createPieceInstance(name, owner);
            this.board.pushPiece(r, c, piece);
        }
        this.view.render();
    }
}
