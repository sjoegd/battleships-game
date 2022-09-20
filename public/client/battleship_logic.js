let own_matrix = document.querySelector("#self_container .battleships_matrix");

// DRAG SYSTEM TEST

// Prevent default
own_matrix.ondragstart = (() => {
    return false
});

own_matrix.addEventListener("pointerdown", (event) => {
    if(!event.target.closest(".ship")) {
        return;
    }
    let ship = event.target.closest(".ship")

    let matrix_width = own_matrix.getBoundingClientRect().width

    function getShipLeft() {
        return ship.getBoundingClientRect().left - own_matrix.getBoundingClientRect().left
    }
    function getShipTop() {
        return ship.getBoundingClientRect().top - own_matrix.getBoundingClientRect().top
    }

    let shiftX = event.clientX
    let shiftY = event.clientY 
    
    moveAt(event.pageX, event.pageY)

    function moveAt(pageX, pageY) {
        ship.style.left = pageX - shiftX + 'px';
        ship.style.top =  pageY - shiftY + 'px';
        // Column and Row calculations, nice for showing where it will land
        console.log("Column:" + Math.round(((getShipLeft()/matrix_width)*10) + 1))
        console.log("Row:" + Math.round(((getShipTop()/matrix_width)*10) + 1))
    }

    function onMouseMove(event) {
        moveAt(event.pageX, event.pageY);
    }

    document.addEventListener("pointermove", onMouseMove)

    document.onpointerup = function() {
        document.removeEventListener('pointermove', onMouseMove);
        document.onpointerup = null;

        //  TESTING
        ship.style.gridArea = `${Math.round(((getShipTop()/matrix_width)*10) + 1)} / ${Math.round(((getShipLeft()/matrix_width)*10) + 1)} / span 3 / span 2`
        ship.style.left = ""
        ship.style.top = ""
    };
})

