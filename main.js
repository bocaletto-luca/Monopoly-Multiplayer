// main.js – Logica del gioco Cluedo (Release Definitiva)

// Flag per evitare esecuzioni duplicate nello stesso turno
let actionLock = false;
// Flag per sapere se il detective ha già effettuato il movimento nel turno corrente
let moved = false;

// ========================================================
// DATI DI GIOCO
// ========================================================
const suspectsList = [
  { name: "Miss Scarlet", color: "red" },
  { name: "Colonel Mustard", color: "yellow" },
  { name: "Mrs. White", color: "white" },
  { name: "Mr. Green", color: "green" },
  { name: "Mrs. Peacock", color: "blue" },
  { name: "Professor Plum", color: "purple" }
];

const weaponsList = [
  { name: "Candlestick", icon: "🕯️" },
  { name: "Knife", icon: "🔪" },
  { name: "Revolver", icon: "🔫" },
  { name: "Rope", icon: "🪢" },
  { name: "Lead Pipe", icon: "🛠️" },
  { name: "Wrench", icon: "🔧" }
];

const roomsList = [
  { name: "Studio" },
  { name: "Hall" },
  { name: "Salone" },
  { name: "Biblioteca" },
  { name: "Sala da Billardo" },
  { name: "Conservatorio" },
  { name: "Sala da Ballo" },
  { name: "Sala da Pranzo" },
  { name: "Cucina" }
];

// La soluzione segreta (nascosta ai detective)
let solution = { suspect: null, weapon: null, room: null };
// Il mazzo di carte (tutte le carte escluse quelle della soluzione)
let deck = [];

// Array dei detective (giocatori)
let cluedoPlayers = [];
let currentPlayer = 0;
let gamePhase = "move";

// ========================================================
// DEFINIZIONE DEL TABELLONE (Canvas)
// ========================================================
const boardRooms = [
  { name: "Studio", x: 20,  y: 20,  w: 240, h: 160 },
  { name: "Hall", x: 280, y: 20,  w: 240, h: 160 },
  { name: "Salone", x: 540, y: 20,  w: 240, h: 160 },
  { name: "Biblioteca", x: 20,  y: 200, w: 240, h: 160 },
  { name: "Sala da Billardo", x: 280, y: 200, w: 240, h: 160 },
  { name: "Conservatorio", x: 540, y: 200, w: 240, h: 160 },
  { name: "Sala da Ballo", x: 20,  y: 380, w: 240, h: 200 },
  { name: "Sala da Pranzo", x: 280, y: 380, w: 240, h: 200 },
  { name: "Cucina", x: 540, y: 380, w: 240, h: 200 }
];

// Mapping dei punti di partenza per i detective, in base al sospetto
const suspectStart = {
  "Miss Scarlet": "Salone",
  "Colonel Mustard": "Sala da Billardo",
  "Mrs. White": "Cucina",
  "Mr. Green": "Hall",
  "Mrs. Peacock": "Conservatorio",
  "Professor Plum": "Biblioteca"
};

// ========================================================
// FUNZIONE HELPER: Ritorna il centro di una stanza dato il suo nome
// ========================================================
function getRoomCenter(roomName) {
  const room = boardRooms.find(r => r.name === roomName);
  if (room) return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  return { x: 0, y: 0 };
}

// ========================================================
// FUNZIONE HELPER: Ritorna il nome della stanza in cui si trova un detective
// (Usata per mostrare la stanza attuale nel modal "Suggerimento")
function getCurrentRoom(position) {
  for (let room of boardRooms) {
    if (
      position.x >= room.x &&
      position.x <= room.x + room.w &&
      position.y >= room.y &&
      position.y <= room.y + room.h
    ) {
      return room.name;
    }
  }
  return "";
}

// ========================================================
// ENVIRONMENT: Canvas & Context
// ========================================================
const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

// ========================================================
// FUNZIONI DI SETUP DEL GIOCO
// ========================================================
function setupGame() {
  let numPlayers = parseInt(prompt("Inserisci il numero di detective (min 3, max 6):", "3"));
  if (isNaN(numPlayers) || numPlayers < 3 || numPlayers > 6) {
    numPlayers = 3;
    alert("Numero non valido! Si parte con 3 detective.");
  }
  cluedoPlayers = [];
  let availableSuspects = [...suspectsList];
  // Per ogni detective, assegna un sospetto casuale e posizionalo nella stanza corrispondente
  for (let i = 0; i < numPlayers; i++) {
    let playerName = prompt(`Nome del Detective ${i + 1}:`, `Detective ${i + 1}`);
    const idx = Math.floor(Math.random() * availableSuspects.length);
    let assignedSuspect = availableSuspects.splice(idx, 1)[0];
    cluedoPlayers.push({
      id: i,
      name: playerName || `Detective ${i + 1}`,
      suspect: assignedSuspect.name,
      color: assignedSuspect.color,
      cards: [],
      notes: { suspects: {}, weapons: {}, rooms: {} },
      position: getRoomCenter(suspectStart[assignedSuspect.name])
    });
  }
  generateSolutionAndDeck();
  distributeCards();
  currentPlayer = 0;
  gamePhase = "move";
  moved = false; // All'inizio del turno, il detective non ha ancora mosso
  updatePlayerInfo();
  updateCurrentTurn();
  updateNotepad();
  updateCardsDisplay();
  drawBoard();
  addLog("Il gioco è iniziato! È il turno di " + cluedoPlayers[currentPlayer].name);
}

function generateSolutionAndDeck() {
  solution.suspect = randomPick(suspectsList);
  solution.weapon = randomPick(weaponsList);
  solution.room = randomPick(roomsList);
  addLog("La soluzione segreta è stata definita (nascosta ai detective).");
  deck = [];
  suspectsList.forEach(s => { if (s.name !== solution.suspect.name) deck.push({ type: "sospetto", name: s.name }); });
  weaponsList.forEach(w => { if (w.name !== solution.weapon.name) deck.push({ type: "arma", name: w.name, icon: w.icon }); });
  roomsList.forEach(r => { if (r.name !== solution.room.name) deck.push({ type: "stanza", name: r.name }); });
  deck = shuffle(deck);
}

function distributeCards() {
  let cardIndex = 0;
  while (cardIndex < deck.length) {
    cluedoPlayers.forEach(p => {
      if (cardIndex < deck.length) {
        p.cards.push(deck[cardIndex]);
        cardIndex++;
      }
    });
  }
}

function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// ========================================================
// FUNZIONE PER DISEGNARE IL TABELLONE E LE PEDINE
// ========================================================
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Disegna le stanze
  boardRooms.forEach(room => {
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(room.x, room.y, room.w, room.h);
    ctx.fillStyle = "#000";
    ctx.font = "18px sans-serif";
    ctx.fillText(room.name, room.x + 10, room.y + 30);
  });
  // Per ogni stanza, trova tutti i detective presenti ed applica un offset verticale per evitare sovrapposizioni
  boardRooms.forEach(room => {
    const playersInRoom = cluedoPlayers.filter(player => getCurrentRoom(player.position) === room.name);
    if (playersInRoom.length > 0) {
      playersInRoom.forEach((player, idx) => {
        // Calcola un offset verticale:
        const offsetY = (idx - (playersInRoom.length - 1) / 2) * 15;
        // Center della stanza
        const cx = room.x + room.w / 2;
        const cy = room.y + room.h / 2 + offsetY;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();
        ctx.fillStyle = "#000";
        ctx.font = "12px sans-serif";
        ctx.fillText(player.name, cx + 12, cy + 4);
      });
    }
  });
  // Se per qualche motivo un detective non risulta in nessuna stanza (raro), lo disegniamo al suo punto
  cluedoPlayers.forEach(player => {
    if (!getCurrentRoom(player.position)) {
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "12px sans-serif";
      ctx.fillText(player.name, player.position.x + 12, player.position.y + 4);
    }
  });
}

// ========================================================
// FUNZIONI DI AGGIORNAMENTO DELL'INTERFACCIA
// ========================================================
function updatePlayerInfo() {
  let infoHTML = "";
  cluedoPlayers.forEach(player => {
    infoHTML += `<p>${player.name} (${player.suspect}) - ${player.cards.length} carte</p>`;
  });
  document.getElementById("playerInfo").innerHTML = infoHTML;
}

function updateCurrentTurn() {
  document.getElementById("currentTurn").innerHTML =
    `<i>Turno: ${cluedoPlayers[currentPlayer].name} (${cluedoPlayers[currentPlayer].suspect})</i>`;
}

function updateNotepad() {
  const suspectsHTML = suspectsList.map(s => `<div><input type="checkbox" class="noteSuspect" value="${s.name}"> ${s.name}</div>`).join("");
  const weaponsHTML = weaponsList.map(w => `<div><input type="checkbox" class="noteWeapon" value="${w.name}"> ${w.name} ${w.icon}</div>`).join("");
  const roomsHTML = roomsList.map(r => `<div><input type="checkbox" class="noteRoom" value="${r.name}"> ${r.name}</div>`).join("");
  document.getElementById("notepadSuspects").innerHTML = suspectsHTML;
  document.getElementById("notepadWeapons").innerHTML = weaponsHTML;
  document.getElementById("notepadRooms").innerHTML = roomsHTML;
}

function updateCardsDisplay() {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  const cards = cluedoPlayers[currentPlayer].cards;
  cards.forEach(card => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card m-1";
    cardDiv.style.width = "8rem";
    const cardBody = document.createElement("div");
    cardBody.className = "card-body p-2";
    if (card.type === "arma") {
      cardBody.innerHTML = `<h6 class="card-title">${card.name}</h6><p>${card.icon}</p>`;
    } else {
      cardBody.innerHTML = `<h6 class="card-title">${card.name}</h6>`;
    }
    cardDiv.appendChild(cardBody);
    container.appendChild(cardDiv);
  });
}

function addLog(message) {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML += message + "<br>";
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ========================================================
// FUNZIONE DI MOVIMENTO
// ========================================================
function movePlayerToRoom(player, roomName) {
  const room = boardRooms.find(r => r.name === roomName);
  if (room) {
    player.position = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
    addLog(`${player.name} si sposta in ${room.name}.`);
    drawBoard();
  }
}

// ========================================================
// CONTROLLO AZIONI E TURNI
// ========================================================
function disableActions() {
  $("#moveBtn, #suggestBtn, #accuseBtn, #endTurnBtn").prop("disabled", true);
}
function enableActionsForTurn() {
  // All'inizio del turno, il detective non ha ancora mosso
  $("#moveBtn, #accuseBtn, #endTurnBtn").prop("disabled", false);
  // "Effettua Suggerimento" si abilita solo dopo il movimento
  $("#suggestBtn").prop("disabled", true);
}

// Il pulsante "Fine Turno" termina il turno senza suggerimento
$("#endTurnBtn").click(function() {
  if (actionLock) return;
  actionLock = true;
  addLog(`${cluedoPlayers[currentPlayer].name} ha terminato il turno senza suggerire.`);
  nextTurn();
  actionLock = false;
});

function nextTurn() {
  actionLock = true;
  // Reset dello stato per il nuovo detective
  moved = false;
  currentPlayer = (currentPlayer + 1) % cluedoPlayers.length;
  addLog("È il turno di " + cluedoPlayers[currentPlayer].name);
  updatePlayerInfo();
  updateCurrentTurn();
  updateCardsDisplay();
  drawBoard();
  enableActionsForTurn();
  actionLock = false;
}

// ========================================================
// GESTIONE MODALI ED EVENTI CON jQuery
// ========================================================

// Modal Movimento
$("#moveBtn").click(function() {
  if (actionLock) return;
  disableActions();
  $("#roomList").empty();
  boardRooms.forEach(room => {
    const li = $("<li></li>").addClass("list-group-item").text(room.name);
    li.click(function() {
      $("#roomList li").removeClass("active");
      $(this).addClass("active");
    });
    $("#roomList").append(li);
  });
  $("#moveModal").modal("show");
});

$("#moveConfirm").click(function() {
  if (actionLock) return;
  actionLock = true;
  const selected = $("#roomList li.active").text();
  if (selected) {
    movePlayerToRoom(cluedoPlayers[currentPlayer], selected);
    $("#moveModal").modal("hide");
    moved = true; // Il detective ha effettuato il movimento
    // Abilita "Effettua Suggerimento" e "Fine Turno"
    $("#suggestBtn, #endTurnBtn").prop("disabled", false);
    updateCardsDisplay();
  } else {
    alert("Seleziona una stanza!");
  }
  actionLock = false;
});

// Modal Suggerimento
$("#suggestBtn").click(function() {
  if (actionLock) return;
  if (!moved) {
    alert("Devi muoverti prima di poter effettuare un suggerimento!");
    return;
  }
  disableActions();
  $("#suspectSelect").empty();
  $("#weaponSelect").empty();
  suspectsList.forEach(s => $("#suspectSelect").append(`<option>${s.name}</option>`));
  weaponsList.forEach(w => $("#weaponSelect").append(`<option>${w.name}</option>`));
  // Imposta la stanza attuale
  $("#currentRoom").val(getCurrentRoom(cluedoPlayers[currentPlayer].position));
  $("#suggestModal").modal("show");
});
  
$("#suggestConfirm").click(function() {
  if (actionLock) return;
  actionLock = true;
  const chosenSuspect = $("#suspectSelect").val();
  const chosenWeapon = $("#weaponSelect").val();
  const currentRoom = $("#currentRoom").val();
  addLog(`${cluedoPlayers[currentPlayer].name} suggerisce: "${chosenSuspect}" con "${chosenWeapon}" in "${currentRoom}".`);
  $("#suggestModal").modal("hide");
  nextTurn();  // Il turno si chiude automaticamente dopo il suggerimento
  actionLock = false;
});

// Modal Accusa Finale
$("#accuseBtn").click(function() {
  if (actionLock) return;
  disableActions();
  $("#accuseSuspect").empty();
  $("#accuseWeapon").empty();
  $("#accuseRoom").empty();
  suspectsList.forEach(s => $("#accuseSuspect").append(`<option>${s.name}</option>`));
  weaponsList.forEach(w => $("#accuseWeapon").append(`<option>${w.name}</option>`));
  roomsList.forEach(r => $("#accuseRoom").append(`<option>${r.name}</option>`));
  $("#accuseModal").modal("show");
});
  
$("#accuseConfirm").click(function() {
  if (actionLock) return;
  actionLock = true;
  const accusedSuspect = $("#accuseSuspect").val();
  const accusedWeapon = $("#accuseWeapon").val();
  const accusedRoom = $("#accuseRoom").val();
  $("#accuseModal").modal("hide");
  if (accusedSuspect === solution.suspect.name &&
      accusedWeapon === solution.weapon.name &&
      accusedRoom === solution.room.name) {
    addLog(`${cluedoPlayers[currentPlayer].name} ha accusato correttamente e vince il mistero!`);
    alert(`${cluedoPlayers[currentPlayer].name} ha risolto il mistero e vince!`);
  } else {
    addLog(`${cluedoPlayers[currentPlayer].name} ha accusato erroneamente ed è eliminato.`);
    cluedoPlayers.splice(currentPlayer, 1);
    if (cluedoPlayers.length === 0) {
      alert("Nessun detective rimasto. Il gioco termina.");
      return;
    }
  }
  updatePlayerInfo();
  updateCurrentTurn();
  updateCardsDisplay();
  drawBoard();
  actionLock = false;
});
  
// Modal Help
$("#helpBtn").click(function() {
  $("#helpModalMain").modal("show");
});
  
// Pulsante "Nuova Partita": ricarica la pagina
$("#newGameBtn").click(function() {
  location.reload();
});
  
// ========================================================
// AVVIO DEL GIOCO
// ========================================================
$(document).ready(function() {
  setupGame();
});
