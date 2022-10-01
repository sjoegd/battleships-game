const express = require("express");
const app = express();
const server = require('http').createServer(app)
const io = require("socket.io")(server, {cors: {origin: "*"}})

const PORT = 3000;

// setup static folder
app.use(express.static("./public/client"));

server.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`)
})

const sockets = [];
io.on("connect", (socket) => {
    console.log("Player connected: ", socket.id)
    /* TEST
    sockets.push(socket)
    socket.on("attack", ({x, y}) => {
        sockets.forEach(player => {
            if(player == socket | !player) {
                return;
            }
            player.emit("attack", {x,y})
        })
    })*/
})

