const express = require("express");
const app = express();
const server = require('http').createServer(app)
const io = require("socket.io")(server, {cors: {origin: "*"}}) // change?
const PlayerQueue = require("./my_modules/PlayerQueue.js");

const PORT = 3000;

// setup static folder
app.use(express.static("./public/client"));

server.listen(PORT, () => {
    console.log(`Started! Listening on port: ${PORT}`)
})

// Simple battleship setup

/**
 * TODO:
 * Let user attack keep attacking if he/she hit a ship, but always make it stop when he/she kills a ship
 * Make lobbies (for friend lobbies) main idea: create a link that a friend can join
 */

const playerQueue = new PlayerQueue();

io.on("connect", (socket) => {
    console.log("Player connected: ", socket.id)

    const readyHandler = () => {
        console.log("Player looking for a game: ", socket.id)

        playerQueue.addPlayer(socket);

        if(playerQueue.enoughPlayers(2)) {
            let [player1, player2] = playerQueue.getPlayers(2)
            startNewGame(player1, player2)
        }
    }

    socket.on("ready", readyHandler)

    const disconnectHandler = () => {
        console.log("Player disconnected", socket.id);
        playerQueue.removePlayer(socket);
        socket.off("ready", readyHandler);
        socket.off('disconnect', disconnectHandler)
    }

    socket.on("disconnect", disconnectHandler)
})

async function startNewGame(player1, player2) {
    console.log("Starting new game")
    
    let ended = false;

    let player1_attacking = false;
    let player2_attacking = false;

    // wait 1 second before starting
    await (new Promise((res) => {
        setTimeout(() => res(), 1000)
    }))

    player1.emit("start");
    player2.emit("start");

    // decide random starter..
    if(Math.round(Math.random()) == 0) {
        player1.emit("attacking", {attacking: true})
        player1_attacking = true;
    } else {
        player2.emit("attacking", {attacking: true})
        player2_attacking = true;
    }
   
    const player1_attack = ({x, y}) => {
        if(!player1_attacking || ended) {
            return;
        }
        player2.emit("attack", {x, y});
        player1.emit("attacking", {attacking: false}); // move to attack info
        player1_attacking = false;
    }

    const player2_attack = ({x, y}) => {
        if(!player2_attacking || ended) {
            return;
        }
        player1.emit("attack", {x, y});
        player2.emit("attacking", {attacking: false}); // move to attack info
        player2_attacking = false;
    }

    const player1_attack_info = ({x, y, hit}) => {
        if(ended) {
            return;
        }
        player2.emit("attack_info", {x, y, hit});
        player1.emit("attacking", {attacking: true}) 
        player1_attacking = true;

        // if(hit) {
        //     player1.emit("attacking", {attacking: true}) 
        //     player1_attacking = true;
        // } else {
        //     player2.emit("attacking", {attacking: true}) 
        //     player2_attacking = true;
        // }
    }

    const player2_attack_info = ({x, y, hit}) => {
        if(ended) {
            return;
        }
        player1.emit("attack_info", {x, y, hit});
        player2.emit("attacking", {attacking: true})
        player2_attacking = true;
    }
    
    player1.on("attack", player1_attack)
    player2.on("attack", player2_attack)

    player1.on("attack_info", player1_attack_info)
    player2.on("attack_info", player2_attack_info)

    // handle ships dying
    const player1_dead_ship = ({x, y, width, height}) => {
        if(ended) {
            return;
        }
        player2.emit("dead_ship", {x, y, width, height})
    }

    const player2_dead_ship = ({x, y, width, height}) => {
        if(ended) {
            return;
        }
        player1.emit("dead_ship", {x, y, width, height})
    }

    player1.on("dead_ship", player1_dead_ship)
    player2.on("dead_ship", player2_dead_ship)

    // handle leavers, winning and resetting for the clients
    const player1_disconnect = (() => {
        if(ended) {
            return;
        }
        ended = true;
        player2.emit("ended", {winner: true, message: "Enemy disconnected"})
        setReset()
    })

    const player2_disconnect = (() => {
        if(ended) {
            return;
        }
        ended = true;
        player1.emit("ended", {winner: true, message: "Enemy disconnected"})
        setReset()
    })

    const player1_dead = () => {
        if(ended) {
            return;
        }
        ended = true;
        player1.emit("ended", {winner: false, message: "All your ships are destroyed.."})
        player2.emit("ended", {winner: true, message: "You destroyed all the enemy ships"})
        setReset()
    }

    const player2_dead = () => {
        if(ended) {
            return;
        }
        ended = true;
        player1.emit("ended", {winner: true, message: "You destroyed all the enemy ships"})
        player2.emit("ended", {winner: false, message: "All your ships are destroyed.."})
        setReset()
    }

    player1.on("disconnect", player1_disconnect)
    player2.on("disconnect", player2_disconnect)

    player1.on("dead", player1_dead)
    player2.on("dead", player2_dead)

    function setReset() {
        player1.off("attack", player1_attack)
        player2.off("attack", player2_attack)
        player1.off("attack_info", player1_attack_info)
        player2.off("attack_info", player2_attack_info)
        player1.off("dead_ship", player1_dead_ship)
        player2.off("dead_ship", player2_dead_ship)
        player1.off("disconnect", player1_disconnect)
        player2.off("disconnect", player2_disconnect)
        player1.off("dead", player1_dead)
        player2.off("dead", player2_dead)
        setTimeout(() => {
            player1.emit("reset")
            player2.emit("reset")
        }, 5000)
    }
}

