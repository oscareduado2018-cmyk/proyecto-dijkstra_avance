var lienzo = document.getElementById("lienzo");
var ctx = lienzo.getContext("2d");

var n = 0;
var aristas = [];   // cada arista: {desde, hasta, peso}
var posiciones = [];

document.getElementById("botonGenerar").onclick = generarGrafo;
document.getElementById("botonCalcular").onclick = calcular;

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarGrafo() {
  n = parseInt(document.getElementById("cantidadNodos").value);
  if (isNaN(n) || n < 7 || n > 16) {
    alert("La cantidad de nodos debe estar entre 7 y 16");
    return;
  }

  aristas = [];

  // las aristas siempre van de un nodo menor a uno mayor, asi no hay ciclos
  for (var i = 1; i <= n; i++) {
    for (var j = i + 1; j <= n; j++) {
      if (Math.random() < 0.3) {
        aristas.push({ desde: i, hasta: j, peso: numeroAleatorio(1, 9) });
      }
    }
  }

  // que todos los nodos (menos el 1) tengan al menos una arista que llegue
  for (var k = 2; k <= n; k++) {
    var llega = false;
    for (var a = 0; a < aristas.length; a++) {
      if (aristas[a].hasta == k) llega = true;
    }
    if (!llega) {
      aristas.push({ desde: numeroAleatorio(1, k - 1), hasta: k, peso: numeroAleatorio(1, 9) });
    }
  }

  calcularPosiciones();
  llenarSelects();
  dibujarGrafo();
  document.getElementById("resultado").innerHTML = "Elige origen y destino.";
  document.getElementById("listaPasos").innerHTML = "";
}

function calcularPosiciones() {
  posiciones = [];
  var centroX = lienzo.width / 2;
  var centroY = lienzo.height / 2;
  var radio = 170;
  for (var i = 0; i < n; i++) {
    var angulo = (2 * Math.PI * i) / n - Math.PI / 2;
    posiciones.push({
      x: centroX + radio * Math.cos(angulo),
      y: centroY + radio * Math.sin(angulo)
    });
  }
}

function llenarSelects() {
  var selectOrigen = document.getElementById("selectOrigen");
  var selectDestino = document.getElementById("selectDestino");
  selectOrigen.innerHTML = "";
  selectDestino.innerHTML = "";
  for (var i = 1; i <= n; i++) {
    selectOrigen.innerHTML += "<option value='" + i + "'>" + i + "</option>";
    selectDestino.innerHTML += "<option value='" + i + "'>" + i + "</option>";
  }
  selectDestino.value = n;
}

function dibujarFlecha(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // punta de la flecha
  var angulo = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angulo - 0.4), y2 - 10 * Math.sin(angulo - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angulo + 0.4), y2 - 10 * Math.sin(angulo + 0.4));
  ctx.closePath();
  ctx.fill();
}

function dibujarGrafo() {
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  ctx.strokeStyle = "#555";
  ctx.fillStyle = "#555";
  ctx.lineWidth = 1;

  for (var i = 0; i < aristas.length; i++) {
    var a = aristas[i];
    var p1 = posiciones[a.desde - 1];
    var p2 = posiciones[a.hasta - 1];

    // la flecha termina en el borde del nodo (radio 16)
    var angulo = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    var xFin = p2.x - 16 * Math.cos(angulo);
    var yFin = p2.y - 16 * Math.sin(angulo);
    dibujarFlecha(p1.x, p1.y, xFin, yFin);

    // peso en la mitad de la arista
    ctx.fillStyle = "#b00020";
    ctx.font = "13px Arial";
    ctx.fillText(a.peso, (p1.x + p2.x) / 2 + 4, (p1.y + p2.y) / 2 - 4);
    ctx.fillStyle = "#555";
  }

  for (var j = 0; j < n; j++) {
    ctx.beginPath();
    ctx.arc(posiciones[j].x, posiciones[j].y, 16, 0, 2 * Math.PI);
    ctx.fillStyle = "#cde4ff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.fillText(j + 1, posiciones[j].x - 4, posiciones[j].y + 5);
  }
}

function calcular() {
  if (n == 0) {
    alert("Primero genera un grafo");
    return;
  }
  var origen = parseInt(document.getElementById("selectOrigen").value);
  var destino = parseInt(document.getElementById("selectDestino").value);
  if (origen == destino) {
    alert("El origen y el destino no pueden ser iguales");
    return;
  }
  dijkstra(origen, destino);
}

function dijkstra(origen, destino) {
  var distancia = [];
  var visitado = [];
  var anterior = [];
  var infinito = 999999;

  for (var i = 1; i <= n; i++) {
    distancia[i] = infinito;
    visitado[i] = false;
    anterior[i] = 0;
  }
  distancia[origen] = 0;

  var lista = document.getElementById("listaPasos");
  lista.innerHTML = "";

  for (var vez = 0; vez < n; vez++) {
    // buscar el nodo no visitado con menor distancia
    var actual = 0;
    for (var i = 1; i <= n; i++) {
      if (!visitado[i] && (actual == 0 || distancia[i] < distancia[actual])) {
        actual = i;
      }
    }
    if (distancia[actual] == infinito) break;

    visitado[actual] = true;
    lista.innerHTML += "<li>Se visita el nodo " + actual + " (distancia " + distancia[actual] + ")</li>";

    // actualizar las distancias de sus vecinos
    for (var j = 0; j < aristas.length; j++) {
      var a = aristas[j];
      if (a.desde == actual && !visitado[a.hasta]) {
        var nueva = distancia[actual] + a.peso;
        if (nueva < distancia[a.hasta]) {
          distancia[a.hasta] = nueva;
          anterior[a.hasta] = actual;
          lista.innerHTML += "<li>&nbsp;&nbsp;Se actualiza el nodo " + a.hasta + " a " + nueva + "</li>";
        }
      }
    }
  }

  mostrarResultado(origen, destino, distancia, anterior, infinito);
}

function mostrarResultado(origen, destino, distancia, anterior, infinito) {
  var texto = document.getElementById("resultado");
  if (distancia[destino] == infinito) {
    texto.innerHTML = "No hay camino del nodo " + origen + " al nodo " + destino + ".";
    return;
  }

  var camino = [];
  var nodo = destino;
  while (nodo != 0) {
    camino.unshift(nodo);
    nodo = anterior[nodo];
  }

  texto.innerHTML = "Distancia mínima: <b>" + distancia[destino] + "</b><br>Camino: " + camino.join(" -> ");
}
