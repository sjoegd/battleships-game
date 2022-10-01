// setup socket
const socket = io();

// setup variables
const MATRIX_OWN = document.querySelector(".matrix_own")
const MATRIX_ENEMY = document.querySelector(".matrix_enemy");
const MATRIX_WIDTH = MATRIX_WIDTH.getBoundingClientRect().width;

/* TEST
MATRIX_ENEMY.addEventListener("click", (event) => {
    socket.emit("attack", {
        x: Math.floor((event.offsetX/MATRIX_WIDTH) * 10),
        y: Math.floor((event.offsetY/MATRIX_WIDTH) * 10)
    })
})

socket.on("attack", ({x,y}) => {
    x++;
    y++;
    let div = document.createElement("div")
    div.classList.add("block", "sea", "destroyed")
    div.style = `grid-row-start: ${y}; grid-column-start: ${x}`
    MATRIX_OWN.append(div);
})
*/