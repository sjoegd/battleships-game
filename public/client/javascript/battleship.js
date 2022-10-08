// setup socket
const socket = io();

// setup consts
const MATRIX_OWN = document.querySelector('.matrix_own');
const MATRIX_ENEMY = document.querySelector('.matrix_enemy');
const BUTTON_START = document.querySelector('.button_start');
const SIDE_WAITING = document.querySelector('.side_waiting');
const CONTAINER_ENDING = document.querySelector(".container_ending");
const DISPLAY_WON = document.querySelector(".display_won");
const DISPLAY_MESSAGE = document.querySelector(".display_message");
const DISPLAY_TURN = document.querySelector(".display_turn");
const ROTATE_KEY = "r";

function getMATRIX_WIDTH() {
  return MATRIX_ENEMY.getBoundingClientRect().width;
}

function getMATRIX_BOUNDS() {
  return MATRIX_OWN.getBoundingClientRect();
}

// Ship info (based on horizontal)
const SHIP_INFO = new Map(
  Object.entries({
    small: {
      width: 2,
      height: 1,
    },
    medium: {
      width: 3,
      height: 1,
    },
    big: {
      width: 5,
      height: 1,
    },
  })
);

const SHIP_POSITIONS = new Map();
const SHIP_CHILDREN_BASE = new Map();
let ALIVE_SHIPS = 0;

let READY = false;
let ATTACKING = false;

// setup matrix represenation
const MATRIX_INFO = [];
for (let i = 0; i < 10; i++) {
  MATRIX_INFO[i] = [];
}

// Setup matrix rep for each ship
// and there positions/children base
document.querySelectorAll('.ship').forEach(ship => {
  ALIVE_SHIPS++;

  let shipInfo;
  let vertical = false;

  ship.classList.forEach(class_name => {
    if (SHIP_INFO.has(class_name)) {
      shipInfo = SHIP_INFO.get(class_name);
    }
    if (class_name == 'vertical') {
      vertical = true;
    }
  });

  let { width, height } = shipInfo;
  if (vertical) {
    // swap because its vertical instead of horizontal
    [width, height] = [height, width];
  }

  let css = getComputedStyle(ship);
  let x = +css.gridColumnStart - 1;
  let y = +css.gridRowStart - 1;
  let children = height * width;

  SHIP_CHILDREN_BASE.set(ship, {children});
  SHIP_POSITIONS.set(ship, { x, y, width, height, children });
  setShipPosition(ship, { x, y });
});

// Create the listeners of both matrixes and the button
MATRIX_OWN.addEventListener('pointerdown', event => {
  let ship = event.target.closest(".ship")
  if(!ship || READY) {
    return;
  }
  ship.style.zIndex = "3";

  ship.ondragstart = () => {
    return false; // cancel
  }

  // handle rotating
  // IMPLEMENT
  let rotated = false;
  let lastMove = event;
  
  // handle drag n drop
  let SHIP_BOUNDS = ship.getBoundingClientRect();

  let x_offsetShip = event.pageX - SHIP_BOUNDS.x
  let y_offsetShip = event.pageY - SHIP_BOUNDS.y

  function moveAt(event) {
    ship.style.left = `${event.pageX - SHIP_BOUNDS.x - x_offsetShip}px`
    ship.style.top = `${event.pageY - SHIP_BOUNDS.y - y_offsetShip}px`
    lastMove = event;
  }

  function rotateAt(event) {
    if(event.key != ROTATE_KEY) {
      return;
    }
    rotated = !rotated;
    
    // swap offsets
    let temp = x_offsetShip;
    x_offsetShip = y_offsetShip;
    y_offsetShip = temp;

    ship.style.left = `${lastMove.pageX - SHIP_BOUNDS.x - x_offsetShip}px`
    ship.style.top = `${lastMove.pageY - SHIP_BOUNDS.y - y_offsetShip}px`

    rotateShip(ship);
  }

  document.addEventListener('pointermove', moveAt);
  document.addEventListener('keypress', rotateAt);
  
  function stopAt() {
    document.removeEventListener('pointermove', moveAt)
    document.removeEventListener('keypress', rotateAt)
    document.removeEventListener('pointerup', stopAt)
    // handle dropping
    SHIP_BOUNDS = ship.getBoundingClientRect();
    let x = Math.round(((SHIP_BOUNDS.x - getMATRIX_BOUNDS().x) / getMATRIX_WIDTH()) * 10)
    let y = Math.round(((SHIP_BOUNDS.y - getMATRIX_BOUNDS().y) / getMATRIX_WIDTH()) * 10)
    setShipPosition(ship, {x, y}, rotated)
    ship.style.left = '';
    ship.style.top = '';
    ship.style.zIndex = '';
  }

  document.addEventListener('pointerup', stopAt)

})

MATRIX_ENEMY.addEventListener('click', event => {
  if (event.target != MATRIX_ENEMY || !ATTACKING) {
    return;
  }
  // send attack to enemy through server
  socket.emit('attack', {
    x: Math.floor((event.offsetX / getMATRIX_WIDTH()) * 10),
    y: Math.floor((event.offsetY / getMATRIX_WIDTH()) * 10),
  });
});

BUTTON_START.addEventListener('click', () => {
  BUTTON_START.disabled = true;
  BUTTON_START.classList.add('disabled');
  SIDE_WAITING.style.display = 'block';
  READY = true;
  handleShipMoveables(true);
  socket.emit('ready');
});

// Setup socket communication

socket.on('start', () => {
  SIDE_WAITING.innerText = 'Found a game!';
  setTimeout(() => {
    SIDE_WAITING.style.display = 'none';
  }, 2000);
  DISPLAY_TURN.innerText = "Waiting for turn.."
});

socket.on('ended', ({winner, message}) => {
  ATTACKING = false;
  // display messages, make sure nothing can be send to server anymore.
  CONTAINER_ENDING.style.display = "block"
  DISPLAY_WON.innerText = winner ? "You won!!" : "You lost.."
  DISPLAY_MESSAGE.innerText = message;
  DISPLAY_TURN.innerText = "";
})

socket.on('reset', () => {
  // reset vars
  READY = false;
  handleShipMoveables(false);
  ATTACKING = false;

  // reset enemy matrix
  MATRIX_ENEMY.replaceChildren();

  // reset my matrix 
  let remove_list = []
  for(let child of MATRIX_OWN.children) {
    if(child.classList.contains("dead") || child.classList.contains("destroyed")) {
      remove_list.push(child)
    }
    if(child.classList.contains("ship")) {
      for(let nested_child of child.children) {
        if(nested_child.classList.contains("destroyed")) {
          remove_list.push(nested_child)
        }
      }
    }
  }
  remove_list.forEach(child => child.remove());

  // reset representation of ships
  // ship positions, ships alive
  ALIVE_SHIPS = 0;
  document.querySelectorAll('.ship').forEach(ship => {
    ALIVE_SHIPS++;
    let ship_pos = SHIP_POSITIONS.get(ship);
    ship_pos.children = SHIP_CHILDREN_BASE.get(ship).children
    SHIP_POSITIONS.set(ship, ship_pos)
  })

  // reset UI
  CONTAINER_ENDING.style.display = "none"
  DISPLAY_WON.innerText = "";
  DISPLAY_MESSAGE.innerText = "";

  // reset button
  BUTTON_START.disabled = false;
  BUTTON_START.classList.remove('disabled');
  SIDE_WAITING.style.display = 'none';
  SIDE_WAITING.innerText = 'Finding a game...';
})

socket.on('attack', ({ x, y }) => {
  // receive attack from enemy
  // get hit info set it to hit.
  let hit_info = MATRIX_INFO[x][y];
  socket.emit('attack_info', { x, y, hit: hit_info ? true : false });

  let div = document.createElement('div')
  if(hit_info) {
    // ship has been hit
    let {x: ship_x, y: ship_y, width, height, children} = SHIP_POSITIONS.get(hit_info);
    let new_x = 1 + (x - ship_x) ;
    let new_y = 1 + (y - ship_y);
    div.classList.add("block", 'ship_part', 'destroyed')
    div.style = `grid-row-start: ${new_y}; grid-column-start: ${new_x}`;
    hit_info.append(div)
    // handle ship children count etc
    children--;
    if(children == 0) {
      // ship died
      socket.emit("dead_ship", {x: ship_x, y: ship_y, width, height})
      // create cross over ship.. or something
      let dead_ship = createDeadShip({x: ship_x, y: ship_y, width, height});
      MATRIX_OWN.append(dead_ship);
      // handle alive ships
      ALIVE_SHIPS--;
      if(ALIVE_SHIPS == 0) {
        // lost game
        socket.emit("dead");
      }
    }
    SHIP_POSITIONS.set(hit_info, {x: ship_x, y: ship_y, width, height, children})
  } else {
    // sea was hit
    div.classList.add('block', 'sea', 'destroyed');
    div.style = `grid-row-start: ${y+1}; grid-column-start: ${x+1}`;
    MATRIX_OWN.append(div);
  }
});

socket.on("dead_ship", (info) => {
  let dead_ship = createDeadShip(info)
  MATRIX_ENEMY.append(dead_ship);
})

socket.on('attack_info', ({ x, y, hit }) => {
  // receive info about my last attack
  // based on hit..
  let div = document.createElement('div');
  div.classList.add('block', hit ? 'ship_part' : 'sea', 'destroyed', 'enemy');
  div.style = `grid-row-start: ${y+1}; grid-column-start: ${x+1}`;
  MATRIX_ENEMY.append(div);
});

socket.on('attacking', ({ attacking }) => {
  // server turns my attacking mode on/off
  ATTACKING = attacking;
  changeTurn();
});

// Helper functions

function createDeadShip({x, y, width, height}, enemy) {
  let dead_div = document.createElement("div");
  dead_div.classList.add("dead", "ship")
  dead_div.style = `
    grid-row-start: ${y+1}; 
    grid-column-start: ${x+1};
    grid-row-end: span ${height};
    grid-column-end: span ${width};
  `;
  return dead_div;
}

function validShipPosition(ship, {x, y, width, height}) {
  // check if new position is valid.
  if(x < 0 || y < 0 || x + width > 10 || y + height > 10) {
    return false;
  }

  for(let i = x; i < x + width; i++) {
    for(let j = y; j < y + height; j++) {
      let info = MATRIX_INFO[i][j];
      if( info && info != ship) {
        return false;
      }
    }
  }
  return true;
}

function UpdateMatrixInfo(ship, del) {
  let {x, y, width, height} = SHIP_POSITIONS.get(ship);
  for(let i = x; i < x + width; i++) {
    for(let j = y; j < y + height; j++) {
      MATRIX_INFO[i][j] = del ? undefined : ship;
    }
  }
}

function rotateShip(ship) {
  let isHorizontal = ship.classList.contains("horizontal");
  ship.classList.remove(isHorizontal ? "horizontal" : "vertical");
  ship.classList.add(isHorizontal ? "vertical" : "horizontal")
}

function setShipPosition(ship, { x, y }, rotated) {
  let { width, height, children } = SHIP_POSITIONS.get(ship);
  if(rotated) {
    [width, height] = [height, width];
  }
  if(!validShipPosition(ship, {x, y, width, height})) {
    if(rotated) {
      rotateShip(ship);
    }
    return false;
  }
  UpdateMatrixInfo(ship, true);
  SHIP_POSITIONS.set(ship, { x, y, width, height, children });
  UpdateMatrixInfo(ship, false);
  ship.style = `grid-row-start: ${y+1}; grid-column-start: ${x+1}`
  return true;
}

function handleShipMoveables(remove) {
  document.querySelectorAll(".ship").forEach(ship => {
    if(remove) {
      ship.classList.remove("moveable");
    } else {
      ship.classList.add("moveable");
    }
  })
}

function changeTurn() {
  if(ATTACKING) {
    DISPLAY_TURN.innerText = "Your turn!"
  } else {
    DISPLAY_TURN.innerText = "Enemy turn!"
  }
}