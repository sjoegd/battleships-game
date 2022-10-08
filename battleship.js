const express = require("express");
const app = express();
const server = require('http').createServer(app)
const io = require("socket.io")(server, {cors: {origin: "*"}}) // change cors?

const PORT = 3000;

// setup static folder
app.use(express.static("./public/client"));

server.listen(PORT, () => {
    console.log(`Started! Listening on port: ${PORT}`)
})

// Simple battleship setup

/**
 * TODO:
 * Make the queue better suited for bigger amounts (can bug out really easily now)
 * Server must manage the incoming requests better (check for abuse etc)
 */

let sockets = [];
io.on("connect", (socket) => {
    console.log("Player connected: ", socket.id)

    const readyHandler = () => {
        console.log("Player looking for a game: ", socket.id)
        sockets.push(socket)
        if(sockets.length == 2) {
            startNewGame(sockets[0], sockets[1])
            sockets.length = 0; // reset waiting queue
        }
    }

    socket.on("ready", readyHandler)

    const disconnectHandler = () => {
        console.log("Player disconnected", socket.id)
        sockets = sockets.filter(player => player != socket);
        socket.off("ready", readyHandler);
        socket.off('disconnect', disconnectHandler)
    }

    socket.on("disconnect", disconnectHandler)
})

async function startNewGame(player1, player2) {
    console.log("Starting new game")
    let ended = false;

    // wait 2 seconds before starting
    await (new Promise((res) => {
        setTimeout(() => res(), 2000)
    }))

    player1.emit("start");
    player2.emit("start");

    // decide random starter..
    if(Math.round(Math.random()) == 0) {
        player1.emit("attacking", {attacking: true})
    } else {
        player2.emit("attacking", {attacking: true})
    }
   
    const player1_attack = ({x, y}) => {
        player2.emit("attack", {x, y})
        player1.emit("attacking", {attacking: false})
    }

    const player2_attack = ({x, y}) => {
        player1.emit("attack", {x, y})
        player2.emit("attacking", {attacking: false})
    }

    const player1_attack_info = ({x, y, hit}) => {
        player2.emit("attack_info", {x, y, hit});
        player1.emit("attacking", {attacking: true})
    }

    const player2_attack_info = ({x, y, hit}) => {
        player1.emit("attack_info", {x, y, hit});
        player2.emit("attacking", {attacking: true})
    }
    
    player1.on("attack", player1_attack)
    player2.on("attack", player2_attack)

    player1.on("attack_info", player1_attack_info)
    player2.on("attack_info", player2_attack_info)

    // handle ships dying
    const player1_dead_ship = ({x, y, width, height}) => {
        player2.emit("dead_ship", {x, y, width, height})
    }

    const player2_dead_ship = ({x, y, width, height}) => {
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
        ended = true;
        player1.emit("ended", {winner: false, message: "All your ships are destroyed.."})
        player2.emit("ended", {winner: true, message: "You destroyed all the enemy ships"})
        setReset()
    }

    const player2_dead = () => {
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

