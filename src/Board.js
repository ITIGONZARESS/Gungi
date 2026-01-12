import * as Pieces from './Piece.js';

export class Board {
    constructor() {
        this.rows = 9;
        this.cols = 9;
        this.grid = []; // 9x9 null or Piece instance
        this.initBoard();
    }

    initBoard() {
        // 空の盤面作成 (各セルはスタック=配列)
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push([]); // 空のスタック
            }
            this.grid.push(row);
        }
    }

    // 指定位置の一番上の駒を取得
    getPiece(row, col) {
        if (this.isValidPos(row, col)) {
            const stack = this.grid[row][col];
            if (stack.length > 0) {
                return stack[stack.length - 1];
            }
        }
        return null;
    }

    // 指定位置のスタック全体を取得
    getStack(row, col) {
        if (this.isValidPos(row, col)) {
            return this.grid[row][col];
        }
        return [];
    }

    // 駒を一番上に置く
    pushPiece(row, col, piece) {
        if (this.isValidPos(row, col)) {
            this.grid[row][col].push(piece);
        }
    }

    // 以前のメソッドとの互換性のため（上書き配置ではなくPushになる点に注意）
    // 初期配置など強制的に置く場合に使用
    placePiece(row, col, piece) {
        this.pushPiece(row, col, piece);
    }

    // 一番上の駒を取り除く
    popPiece(row, col) {
        if (this.isValidPos(row, col)) {
            const stack = this.grid[row][col];
            return stack.pop() || null;
        }
        return null;
    }

    // スタックを空にする（駒を取る時など）
    clearCell(row, col) {
        if (this.isValidPos(row, col)) {
            const stack = this.grid[row][col];
            const captured = [...stack];
            this.grid[row][col] = [];
            return captured; // 取った駒全てを返す
        }
        return [];
    }

    isValidPos(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
}
