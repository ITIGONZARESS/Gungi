import { Game } from './Game.js';
import { NetworkManager } from './Network.js';

// Elements
const lobbyScreen = document.getElementById('lobby-screen');
const lobbyMain = document.getElementById('lobby-main-menu');
const lobbyOnline = document.getElementById('lobby-online-menu');
const btnLocal = document.getElementById('btn-local-play');
const btnOnline = document.getElementById('btn-online-menu');
const btnCreate = document.getElementById('btn-create-room');
const btnJoin = document.getElementById('btn-join-room');
const inputRoomId = document.getElementById('input-room-id');
const btnBack = document.getElementById('btn-back-lobby');
const lobbyStatus = document.getElementById('lobby-status');
const myIdDisplay = document.getElementById('my-id-display');

// Instance
let game = null;
let network = null;

// Local Play
if (btnLocal) {
    btnLocal.addEventListener('click', () => {
        if (lobbyScreen) lobbyScreen.style.display = 'none';
        game = new Game();
        game.start();
        game.restart(); // Show level selection
    });
}

// Online Menu
if (btnOnline) {
    btnOnline.addEventListener('click', () => {
        lobbyMain.classList.add('hidden');
        lobbyOnline.classList.remove('hidden');

        // Init Network if not yet
        if (!network) {
            network = new NetworkManager();
            network.callbacks.onStatus = (msg) => {
                if (lobbyStatus) lobbyStatus.textContent = msg;
            };
            network.init();

            // Wait for ID
            if (lobbyStatus) lobbyStatus.textContent = '初期化中...';
        }
    });
}

if (btnBack) {
    btnBack.addEventListener('click', () => {
        lobbyOnline.classList.add('hidden');
        lobbyMain.classList.remove('hidden');
    });
}

// Create Room (Host)
if (btnCreate) {
    btnCreate.addEventListener('click', () => {
        if (!network || !network.myId) return;
        const id = network.createRoom();
        if (myIdDisplay) {
            myIdDisplay.classList.remove('hidden');
            myIdDisplay.innerHTML = `あなたのID: <span class="highlight" style="color:#fff; font-weight:bold;">${id}</span><br>このIDを相手に伝えてください`;
        }
        if (lobbyStatus) lobbyStatus.textContent = '対戦相手を待っています...';

        network.callbacks.onConnected = (role) => {
            // Connected!
            if (lobbyScreen) lobbyScreen.style.display = 'none';
            setTimeout(() => {
                startGameOnline(role);
            }, 50);
        };

        network.callbacks.onData = (data) => {
            if (game) game.onNetworkData(data);
        };
    });
}

// Join Room (Client)
if (btnJoin) {
    btnJoin.addEventListener('click', () => {
        const hostId = inputRoomId.value.trim();
        if (!hostId) return;
        if (!network) return;

        network.joinRoom(hostId);

        network.callbacks.onConnected = (role) => {
            // Connected!
            if (lobbyScreen) lobbyScreen.style.display = 'none';
            setTimeout(() => {
                startGameOnline(role);
            }, 50);
        };

        network.callbacks.onData = (data) => {
            if (game) game.onNetworkData(data);
        };
    });
}

function startGameOnline(role) {
    console.log(`[Main] startGameOnline called. Role: ${role}`);
    // Game initialize
    game = new Game();
    game.start();
    // Inject Network
    if (game.setNetwork) {
        console.log('[Main] Calling game.setNetwork');
        game.setNetwork(network, role);
    } else {
        console.error('[Main] game.setNetwork not found!');
    }

    if (role === 'host') {
        // Host selects level
        game.restart(); // Shows level modal
    } else {
        // Client waits
        alert('ホストが対局設定中です。\nお待ちください...');
    }
}
