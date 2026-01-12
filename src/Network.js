export class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.myId = null;
        this.callbacks = {
            onConnected: null, // (role) => {} role: 'host' or 'client'
            onData: null,      // (data) => {}
            onStatus: null     // (msg) => {}
        };
        this.isHost = false;
    }

    init() {
        // PeerJS object creation
        this.peer = new Peer();

        this.peer.on('open', (id) => {
            this.myId = id;
            console.log('My Peer ID is: ' + id);
            if (this.callbacks.onStatus) this.callbacks.onStatus('ID取得完了: ' + id);
        });

        this.peer.on('connection', (conn) => {
            // Passive connection (Host side)
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error(err);
            if (this.callbacks.onStatus) this.callbacks.onStatus('エラー: ' + err.type);
        });
    }

    createRoom() {
        this.isHost = true;
        if (this.callbacks.onStatus) this.callbacks.onStatus('ルーム作成中... ID: ' + this.myId);
        return this.myId;
    }

    joinRoom(hostId) {
        if (!this.peer) return;
        this.isHost = false;
        if (this.callbacks.onStatus) this.callbacks.onStatus(hostId + ' に接続中...');

        const conn = this.peer.connect(hostId);
        this.handleConnection(conn);
    }

    handleConnection(conn) {
        this.conn = conn;

        this.conn.on('open', () => {
            console.log('Connected!');
            if (this.callbacks.onStatus) this.callbacks.onStatus('接続しました！');
            if (this.callbacks.onConnected) this.callbacks.onConnected(this.isHost ? 'host' : 'client');
        });

        this.conn.on('data', (data) => {
            console.log('[Network] Received:', data);
            if (this.callbacks.onData) this.callbacks.onData(data);
        });

        this.conn.on('close', () => {
            alert('接続が切れました');
            location.reload();
        });
    }

    send(data) {
        if (this.conn && this.conn.open) {
            console.log('[Network] Sending:', data);
            this.conn.send(data);
        } else {
            console.warn('[Network] Connection not open, cannot send:', data);
        }
    }
}
