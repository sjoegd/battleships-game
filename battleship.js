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

/**
 * TODO:
 * Make lobbies (for friend lobbies) main idea: create a link that a friend can join, and i separate listener for those.
 */

const playerQueue = new PlayerQueue();

io.on("connect", (socket) => {
    console.log("Player connected: ", socket.id);

    const readyHandler = () => {
        console.log("Player looking for a game: ", socket.id);

        playerQueue.addPlayer(socket);

        if(playerQueue.enoughPlayers(2)) {
            let [player1, player2] = playerQueue.getPlayers(2);
            startNewGame(player1, player2);
        }
    }

    socket.on("ready", readyHandler);

    const cancelHandler = () => {
        console.log("Player stopped looking for a game: ", socket.id)
        playerQueue.removePlayer(socket);
    }

    socket.on("cancel", cancelHandler);

    const disconnectHandler = () => {
        console.log("Player disconnected", socket.id);
        playerQueue.removePlayer(socket);
        socket.off("ready", readyHandler);
        socket.off("cancel", cancelHandler);
        socket.off('disconnect', disconnectHandler);
    }

    socket.on("disconnect", disconnectHandler);
})

async function startNewGame(player1, player2) {
    console.log("Starting new game")
    
    let ended = false;

    let player1_attacking = false;
    let player2_attacking = false;

    player1.emit("start");
    player2.emit("start");

    // wait 2 seconds before starting
    await (new Promise((res) => {
        setTimeout(() => res(), 1000)
    }))

    // decide random starter..
    if(Math.round(Math.random()) == 0) {
        player1.emit("attacking", {attacking: true})
        player1_attacking = true;
    } else {
        player2.emit("attacking", {attacking: true})
        player2_attacking = true;
    }
    
    // handle attacking
    const player1_attack = ({x, y}) => {
        if(!player1_attacking || ended) {
            return;
        }
        player2.emit("attack", {x, y});
        player1_attacking = false;
    }

    const player2_attack = ({x, y}) => {
        if(!player2_attacking || ended) {
            return;
        }
        player1.emit("attack", {x, y});
        player2_attacking = false;
    }

    const player1_attack_info = ({x, y, hit}) => {
        if(ended) {
            return;
        }
        player2.emit("attack_info", {x, y, hit});
        
        changeAttacker(!hit, hit);
    }

    const player2_attack_info = ({x, y, hit}) => {
        if(ended) {
            return;
        }
        player1.emit("attack_info", {x, y, hit});

        changeAttacker(hit, !hit);
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

        changeAttacker(true, false);
    }

    const player2_dead_ship = ({x, y, width, height}) => {
        if(ended) {
            return;
        }
        player1.emit("dead_ship", {x, y, width, height})

        changeAttacker(false, true);
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

    player1.on("disconnect", player1_disconnect)
    player2.on("disconnect", player2_disconnect)

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

    player1.on("dead", player1_dead)
    player2.on("dead", player2_dead)

    const player1_leave = () => {
        if(ended) {
            return;
        }
        ended = true;
        player1.emit("reset");
        player2.emit("ended", {winner: true, message: "Enemy disconnected"});
        setReset(true)
    }

    const player2_leave = () => {
        if(ended) {
            return;
        }
        ended = true;
        player2.emit("reset");
        player1.emit("ended", {winner: true, message: "Enemy disconnected"});
        setReset(false, true)
    }

    player1.on("leave", player1_leave)
    player2.on("leave", player2_leave)

    function changeAttacker(play1, play2) {
        player1.emit("attacking", {attacking: play1}) 
        player2.emit("attacking", {attacking: play2})
        player1_attacking = play1;
        player2_attacking = play2;
    }

    function setReset(p1_left, p2_left) {
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
        player1.off("leave", player1_leave)
        player2.off("leave", player2_leave)
        setTimeout(() => {
            if(!p1_left) {
                player1.emit("reset")
            }
            if(!p2_left) {
                player2.emit("reset")
            }
        }, 5000)
    }
}

