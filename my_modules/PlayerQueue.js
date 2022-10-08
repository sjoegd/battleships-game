// Basic implementation of a FIFO queue, with some extra spice for my needs.

class PlayerQueue {
    constructor() {
        this.array = [];
    }

    // not the best time complexity, but it works..
    dequeue() {
        this.array.reverse();
        let player = this.array.pop();
        this.array.reverse();
        return player;
    }

    enqueue(player) {
        this.array.push(player)
    }

    enoughPlayers(amount) {
        return this.array.length >= amount
    }

    removePlayer(player) {
        this.array = this.array.filter(socket => socket != player);
    }

    addPlayer(player) {
        this.enqueue(player)
    }

    getPlayers(amount) {
        let players = [];
        for(let i = 0; i < amount; i++) {
            players.push(this.dequeue())
        }
        return players;
    }
}

module.exports = PlayerQueue;