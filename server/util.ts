export function generateWsUniqueId() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return 'ws_' + s4() + s4() + '-' + s4();
}

export function generateRoomId() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}
