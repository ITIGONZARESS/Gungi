export class Piece {
    constructor(name, owner) {
        this.name = name;
        this.owner = owner; // 'self' or 'opponent'
    }

    static get DIR() {
        return {
            UP: { r: -1, c: 0 },
            DOWN: { r: 1, c: 0 },
            LEFT: { r: 0, c: -1 },
            RIGHT: { r: 0, c: 1 },
            UP_LEFT: { r: -1, c: -1 },
            UP_RIGHT: { r: -1, c: 1 },
            DOWN_LEFT: { r: 1, c: -1 },
            DOWN_RIGHT: { r: 1, c: 1 }
        };
    }

    get displayName() {
        return this.originalName;
    }

    /**
     * tier: 現在の段数 (1, 2, 3...)
     * 戻り値: Array of definitions
     * definition: { 
     *   dr: number, dc: number, 
     *   range: number ('Infinity' or integer), 
     *   canJump: boolean (default false) 
     * }
     */
    getMoveDefinitions(tier) {
        return [];
    }
}

const D = Piece.DIR;
const ALL_8 = [D.UP, D.DOWN, D.LEFT, D.RIGHT, D.UP_LEFT, D.UP_RIGHT, D.DOWN_LEFT, D.DOWN_RIGHT];
const CROSS = [D.UP, D.DOWN, D.LEFT, D.RIGHT];
const DIAG = [D.UP_LEFT, D.UP_RIGHT, D.DOWN_LEFT, D.DOWN_RIGHT];

// Helper to create definitions
// range: max distance from origin
// startDist: start distance from origin (default 1) - Deprecated by originOffset but kept for compatibility if needed.
// originOffset: coordinate offset from piece position to start move calculation from.
const def = (dirs, range, canJump = false, originOffset = { r: 0, c: 0 }) => {
    return dirs.map(d => ({ dr: d.r, dc: d.c, range, canJump, originOffset }));
};

// ... (Marshal to Cannon definitions remain same, verify Pawn/Fortress etc are correct) ...
// Since this is a partial replace, I need to be careful not to delete others if I replace 'def'. 
// But replace_file_content replaces a block.
// I will rewrite the def function and Archer/Musket classes around line 43-167? No, that's too big.
// I'll target the top of the file for def, and the bottom for Archer.
// Actually, I can do it in two chunks? replace_file_content is single contiguous.
// I will replace from 'def' helper down to 'Pawn' first? No, too risky.
// Let's replace just the def helper first, then the Archer class.
// Wait, I can do it in one go if I include everything. But that's large.
// Let's use multi_replace for safety? No, user prefers replace_file_content for single block.
// Let's rewrite 'def' and all classes. It's safer to ensure consistency.

// 1. 帥 (Marshal): 全方位 n マス
export class Marshal extends Piece {
    constructor(owner) { super('Marshal', owner); this.originalName = '帥'; }
    getMoveDefinitions(tier) {
        return def(ALL_8, tier);
    }
}

// 2. 大 (General): 十字無限、斜め n
export class General extends Piece {
    constructor(owner) { super('General', owner); this.originalName = '大'; }
    getMoveDefinitions(tier) {
        return [
            ...def(CROSS, Infinity),
            ...def(DIAG, tier)
        ];
    }
}

// 3. 中 (LtGeneral): 斜め無限、十字 n
export class LtGeneral extends Piece {
    constructor(owner) { super('LtGeneral', owner); this.originalName = '中'; }
    getMoveDefinitions(tier) {
        return [
            ...def(DIAG, Infinity),
            ...def(CROSS, tier)
        ];
    }
}

// 4. 小 (Major): 前・左・右・左前・右前 + 後ろ n
export class Major extends Piece {
    constructor(owner) { super('Major', owner); this.originalName = '小'; }
    getMoveDefinitions(tier) {
        const dirs = [D.UP, D.LEFT, D.RIGHT, D.UP_LEFT, D.UP_RIGHT, D.DOWN];
        return def(dirs, tier);
    }
}

// 5. 侍 (Samurai): 前、左前、右前、後ろ n
export class Samurai extends Piece {
    constructor(owner) { super('Samurai', owner); this.originalName = '侍'; }
    getMoveDefinitions(tier) {
        const dirs = [D.UP, D.UP_LEFT, D.UP_RIGHT, D.DOWN];
        return def(dirs, tier);
    }
}

// 6. 槍 (Lance): 前 n+1、左前 n、右前 n、後ろ n
export class Lance extends Piece {
    constructor(owner) { super('Lance', owner); this.originalName = '槍'; }
    getMoveDefinitions(tier) {
        return [
            ...def([D.UP], tier + 1),
            ...def([D.UP_LEFT, D.UP_RIGHT, D.DOWN], tier)
        ];
    }
}

// 7. 馬 (Knight): 十字 n+1
export class Knight extends Piece {
    constructor(owner) { super('Knight', owner); this.originalName = '馬'; }
    getMoveDefinitions(tier) {
        return def(CROSS, tier + 1);
    }
}

// 8. 忍 (Ninja): 斜め n+1
export class Ninja extends Piece {
    constructor(owner) { super('Ninja', owner); this.originalName = '忍'; }
    getMoveDefinitions(tier) {
        return def(DIAG, tier + 1);
    }
}

// 9. 砦 (Fortress): 前・左右・斜め後ろ2方向 n
export class Fortress extends Piece {
    constructor(owner) { super('Fortress', owner); this.originalName = '砦'; }
    getMoveDefinitions(tier) {
        const dirs = [D.UP, D.LEFT, D.RIGHT, D.DOWN_LEFT, D.DOWN_RIGHT];
        return def(dirs, tier);
    }
}

// 10. 兵 (Pawn): 縦（前後） n
export class Pawn extends Piece {
    constructor(owner) { super('Pawn', owner); this.originalName = '兵'; }
    getMoveDefinitions(tier) {
        return def([D.UP, D.DOWN], tier);
    }
}

// 11. 砲 (Cannon): 前方2マス飛び越え(3マス目から)、左右・後ろ n
export class Cannon extends Piece {
    constructor(owner) { super('Cannon', owner); this.originalName = '砲'; }
    getMoveDefinitions(tier) {
        const forwardOffset = { r: -2, c: 0 };
        return [
            ...def([D.UP], tier, true, forwardOffset),
            ...def([D.LEFT, D.RIGHT, D.DOWN], tier, false)
        ];
    }
}

// 12. 弓 (Archer): 
// 前方一マス飛び越えたのち(起点オフセット: 前1)、そこから前n、右前n、左前n。
// 後ろは通常通りn。
export class Archer extends Piece {
    constructor(owner) { super('Archer', owner); this.originalName = '弓'; }
    getMoveDefinitions(tier) {
        const forwardOffset = { r: -1, c: 0 };
        return [
            // 前方起点からの放射移動 (前、左前、右前)
            // range: n (起点からnマス)
            ...def([D.UP, D.UP_LEFT, D.UP_RIGHT], tier, true, forwardOffset),
            // 後ろ (通常起点)
            ...def([D.DOWN], tier, false)
        ];
    }
}

// 13. 筒 (Musket): 前方1マス飛び越え(2マス目から)、斜め後ろ n
export class Musket extends Piece {
    constructor(owner) { super('Musket', owner); this.originalName = '筒'; }
    getMoveDefinitions(tier) {
        const forwardOffset = { r: -1, c: 0 };
        return [
            ...def([D.UP], tier, true, forwardOffset),
            ...def([D.DOWN_LEFT, D.DOWN_RIGHT], tier, false)
        ];
    }
}

// 14. 謀 (Spy): 斜め前・真後ろ（Y字） n
export class Spy extends Piece {
    constructor(owner) { super('Spy', owner); this.originalName = '謀'; }
    getMoveDefinitions(tier) {
        return def([D.UP_LEFT, D.UP_RIGHT, D.DOWN], tier);
    }
}
