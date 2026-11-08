// constantes para cambiarlas desde un solo sitio
var MIN_NODOS = 7;
var MAX_NODOS = 16;
var PROBABILIDAD_ARISTA = 0.3;   // 30% de que haya arista entre dos nodos
var PESO_MIN = 1;
var PESO_MAX = 9;
var INFINITO = 999999;
var RADIO_NODO = 16;
var RADIO_CIRCULO = 180;

var lienzo = document.getElementById("lienzo");
var ctx = lienzo.getContext("2d");

var n = 0;
var aristas = [];   // cada arista: {desde, hasta, peso}

// variables de dijkstra
var distancia = [];
var visitado = [];
var anterior = [];
var pasos = [];     // aqui se guarda una foto de cada paso
var pasoActual = 0;

document.getElementById("botonAleatorio").onclick = clickAleatorio;
document.getElementById("botonManual").onclick = clickManual;
document.getElementById("archivo").onchange = clickArchivo;
document.getElementById("botonArista").onclick = clickAgregarArista;
document.getElementById("botonNodo").onclick = clickAgregarNodo;
document.getElementById("botonCalcular").onclick = clickCalcular;

document.getElementById("botonInicio").onclick = function () { mostrarPaso(0); };
document.getElementById("botonAnterior").onclick = function () { mostrarPaso(pasoActual - 1); };
document.getElementById("botonSiguiente").onclick = function () { mostrarPaso(pasoActual + 1); };
document.getElementById("botonFinal").onclick = function () { mostrarPaso(pasos.length - 1); };

document.getElementById("cantidadNodos").min = MIN_NODOS;
document.getElementById("cantidadNodos").max = MAX_NODOS;
document.getElementById("textoRango").innerHTML = MIN_NODOS + " a " + MAX_NODOS;

limpiarPasos();
mostrarAristas();


// ---- generar y leer datos (aqui no se dibuja nada) ----

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarDatos(cantidad) {
  var lista = [];

  // las aristas van de un nodo menor a uno mayor, asi no hay ciclos
  for (var i = 1; i <= cantidad; i++) {
    for (var j = i + 1; j <= cantidad; j++) {
      if (Math.random() < PROBABILIDAD_ARISTA) {
        lista.push({ desde: i, hasta: j, peso: numeroAleatorio(PESO_MIN, PESO_MAX) });
      }
    }
  }

  // que todos los nodos (menos el 1) tengan una arista que llegue
  for (var k = 2; k <= cantidad; k++) {
    var llega = false;
    for (var a = 0; a < lista.length; a++) {
      if (lista[a].hasta == k) llega = true;
    }
    if (!llega) {
      lista.push({ desde: numeroAleatorio(1, k - 1), hasta: k, peso: numeroAleatorio(PESO_MIN, PESO_MAX) });
    }
  }

  return { n: cantidad, aristas: lista };
}

// lee el texto del archivo, cada linea es: desde,hasta,peso
// si la primera linea dice "nodos,8" se usa ese numero de nodos
// si algo esta mal avisa con alert y devuelve null
function leerDatosCSV(texto) {
  var lineas = texto.split("\n");
  var filas = [];
  var cantidad = 0;
  var mayor = 0;

  for (var i = 0; i < lineas.length; i++) {
    var linea = lineas[i].trim();
    if (linea == "") continue;
    var partes = linea.split(",");

    if (partes[0] == "nodos") {
      cantidad = parseInt(partes[1]);
      continue;
    }
    // el encabezado (desde,hasta,peso) no es numero, se salta
    if (isNaN(parseInt(partes[0]))) continue;

    if (partes.length != 3) {
      alert("Línea " + (i + 1) + ": tiene que ser desde,hasta,peso");
      return null;
    }
    var fila = {
      desde: parseInt(partes[0]),
      hasta: parseInt(partes[1]),
      peso: parseInt(partes[2]),
      linea: i + 1
    };
    filas.push(fila);
    if (fila.desde > mayor) mayor = fila.desde;
    if (fila.hasta > mayor) mayor = fila.hasta;
  }

  var total = mayor;
  if (cantidad > 0) total = cantidad;
  if (total < MIN_NODOS || total > MAX_NODOS) {
    alert("El archivo tiene " + total + " nodos, tiene que estar entre " + MIN_NODOS + " y " + MAX_NODOS);
    return null;
  }

  // se van metiendo una por una para revisar cada arista antes de guardarla
  var lista = [];
  for (var k = 0; k < filas.length; k++) {
    var f = filas[k];
    var problema = validarArista(lista, total, f.desde, f.hasta, f.peso);
    if (problema != "") {
      alert("Línea " + f.linea + ": " + problema);
      return null;
    }
    lista.push({ desde: f.desde, hasta: f.hasta, peso: f.peso });
  }

  return { n: total, aristas: lista };
}


// ---- revisar aristas y ciclos (sirve para aleatorio, manual y archivo) ----

// true si siguiendo las flechas se llega de inicio a fin
function hayCamino(lista, inicio, fin) {
  var pila = [inicio];
  var visto = {};
  while (pila.length > 0) {
    var nodo = pila.pop();
    if (nodo == fin) return true;
    if (visto[nodo]) continue;
    visto[nodo] = true;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].desde == nodo) pila.push(lista[i].hasta);
    }
  }
  return false;
}

// desde -> hasta cierra un ciclo si ya se podia ir de hasta a desde
function formaCiclo(lista, desde, hasta) {
  if (desde == hasta) return true;
  return hayCamino(lista, hasta, desde);
}

// devuelve "" si esta bien, o el mensaje de lo que esta mal
function validarArista(lista, cantidad, desde, hasta, peso) {
  if (isNaN(desde) || isNaN(hasta) || desde < 1 || hasta < 1 || desde > cantidad || hasta > cantidad) {
    return "Los nodos tienen que estar entre 1 y " + cantidad;
  }
  if (desde == hasta) {
    return "Un nodo no se puede conectar con él mismo";
  }
  if (isNaN(peso) || peso < 1) {
    return "El peso tiene que ser un número mayor que 0";
  }
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].desde == desde && lista[i].hasta == hasta) {
      return "La conexión " + desde + " -> " + hasta + " ya existe";
    }
  }
  if (formaCiclo(lista, desde, hasta)) {
    return "¡Cuidado! La conexión " + desde + " -> " + hasta + " forma un ciclo. Cámbiala por otra.";
  }
  return "";
}


// ---- botones para armar el grafo ----

function leerCantidad() {
  var cantidad = parseInt(document.getElementById("cantidadNodos").value);
  if (isNaN(cantidad) || cantidad < MIN_NODOS || cantidad > MAX_NODOS) {
    alert("La cantidad de nodos debe estar entre " + MIN_NODOS + " y " + MAX_NODOS);
    return 0;
  }
  return cantidad;
}

function clickAleatorio() {
  var cantidad = leerCantidad();
  if (cantidad == 0) return;
  cargarGrafo(generarDatos(cantidad));
  avisar("Grafo aleatorio con " + cantidad + " nodos.");
}

function clickManual() {
  var cantidad = leerCantidad();
  if (cantidad == 0) return;
  cargarGrafo({ n: cantidad, aristas: [] });
  avisar("Grafo con " + cantidad + " nodos y sin aristas, agrégalas abajo.");
}

function clickArchivo() {
  var entrada = document.getElementById("archivo");
  var archivo = entrada.files[0];
  if (!archivo) return;

  var lector = new FileReader();
  lector.onload = function () {
    var datos = leerDatosCSV(lector.result);
    if (datos != null) {
      cargarGrafo(datos);
      avisar("Se cargó " + archivo.name + " con " + datos.n + " nodos y " + datos.aristas.length + " aristas.");
    }
  };
  lector.readAsText(archivo);
  entrada.value = "";   // para poder elegir el mismo archivo otra vez
}

function clickAgregarArista() {
  if (n == 0) {
    alert("Primero crea un grafo");
    return;
  }
  var desde = parseInt(document.getElementById("selectDesde").value);
  var hasta = parseInt(document.getElementById("selectHasta").value);
  var peso = parseInt(document.getElementById("pesoArista").value);

  var problema = validarArista(aristas, n, desde, hasta, peso);
  if (problema != "") {
    alert(problema);
    return;
  }

  aristas.push({ desde: desde, hasta: hasta, peso: peso });
  refrescar();
  avisar("Se agregó la arista " + desde + " -> " + hasta + " (peso " + peso + ").");
}

// agrega un nodo al grafo que ya esta, sin volver a ingresar todo
function clickAgregarNodo() {
  if (n == 0) {
    alert("Primero crea un grafo");
    return;
  }
  if (n >= MAX_NODOS) {
    alert("No se pueden más de " + MAX_NODOS + " nodos");
    return;
  }
  n++;
  refrescar();
  avisar("Se agregó el nodo " + n + ", ahora ponle sus aristas.");
}

function quitarArista(posicion) {
  aristas.splice(posicion, 1);
  refrescar();
  avisar("Se quitó la arista.");
}

function avisar(texto) {
  document.getElementById("aviso").innerHTML = texto;
}

function cargarGrafo(datos) {
  n = datos.n;
  aristas = datos.aristas;
  refrescar();
  document.getElementById("selectOrigen").value = 1;
  document.getElementById("selectDestino").value = n;
}

// cuando cambia el grafo se actualiza todo lo que se ve en pantalla
function refrescar() {
  llenarSelect("selectOrigen");
  llenarSelect("selectDestino");
  llenarSelect("selectDesde");
  llenarSelect("selectHasta");
  mostrarAristas();
  limpiarPasos();
  dibujarGrafo(n, aristas, null);
}

function llenarSelect(id) {
  var select = document.getElementById(id);
  var antes = select.value;
  select.innerHTML = "";
  for (var i = 1; i <= n; i++) {
    select.innerHTML += "<option value='" + i + "'>" + i + "</option>";
  }
  if (antes != "" && antes <= n) select.value = antes;   // que no se pierda lo que habia elegido
}

function mostrarAristas() {
  var caja = document.getElementById("listaAristas");
  if (aristas.length == 0) {
    caja.innerHTML = "Todavía no hay aristas.";
    return;
  }
  var html = "<table><tr><th>Desde</th><th>Hasta</th><th>Peso</th><th></th></tr>";
  for (var i = 0; i < aristas.length; i++) {
    html += "<tr><td>" + aristas[i].desde + "</td><td>" + aristas[i].hasta + "</td><td>" + aristas[i].peso + "</td>";
    html += "<td><button onclick='quitarArista(" + i + ")'>Quitar</button></td></tr>";
  }
  caja.innerHTML = html + "</table>";
}


// ---- dibujar el grafo (solo usa lo que le pasan) ----

function calcularPosiciones(cantidad) {
  var lista = [];
  var centroX = lienzo.width / 2;
  var centroY = lienzo.height / 2;
  for (var i = 0; i < cantidad; i++) {
    var angulo = (2 * Math.PI * i) / cantidad - Math.PI / 2;
    lista.push({
      x: centroX + RADIO_CIRCULO * Math.cos(angulo),
      y: centroY + RADIO_CIRCULO * Math.sin(angulo)
    });
  }
  return lista;
}

function dibujarFlecha(x1, y1, x2, y2, color, grosor) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = grosor;

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

// true si la arista esta en alguno de los caminos minimos
function enCamino(caminos, a) {
  for (var c = 0; c < caminos.length; c++) {
    for (var i = 0; i < caminos[c].length - 1; i++) {
      if (caminos[c][i] == a.desde && caminos[c][i + 1] == a.hasta) return true;
    }
  }
  return false;
}

// color y grosor de la flecha segun el paso que se esta mostrando
function estiloArista(i, a, paso) {
  if (paso == null) return { color: "#555", grosor: 1 };
  if (enCamino(paso.caminos, a)) return { color: "#1b9e3e", grosor: 4 };
  if (i == paso.aristaRevisada) return { color: "#f08c00", grosor: 4 };
  if (paso.anterior[a.hasta] == a.desde) return { color: "#1c6dd0", grosor: 2 };
  return { color: "#aaa", grosor: 1 };
}

// cantidad = nodos, lista = aristas, paso = foto de dijkstra (null si no hay)
function dibujarGrafo(cantidad, lista, paso) {
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  if (cantidad == 0) return;

  var pos = calcularPosiciones(cantidad);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (var i = 0; i < lista.length; i++) {
    var a = lista[i];
    var p1 = pos[a.desde - 1];
    var p2 = pos[a.hasta - 1];
    var estilo = estiloArista(i, a, paso);

    // la flecha termina en el borde del nodo
    var angulo = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    var xFin = p2.x - RADIO_NODO * Math.cos(angulo);
    var yFin = p2.y - RADIO_NODO * Math.sin(angulo);
    dibujarFlecha(p1.x, p1.y, xFin, yFin, estilo.color, estilo.grosor);
  }

  // los pesos al final para que no los tape ninguna flecha
  ctx.font = "13px Arial";
  for (var k = 0; k < lista.length; k++) {
    var q1 = pos[lista[k].desde - 1];
    var q2 = pos[lista[k].hasta - 1];
    var mx = (q1.x + q2.x) / 2;
    var my = (q1.y + q2.y) / 2;
    ctx.fillStyle = "white";
    ctx.fillRect(mx - 7, my - 8, 14, 16);
    ctx.fillStyle = "#b00020";
    ctx.fillText(lista[k].peso, mx, my);
  }

  for (var j = 0; j < cantidad; j++) {
    var color = "#cde4ff";
    if (paso != null && paso.visitado[j + 1]) color = "#b7e4c7";
    if (paso != null && paso.actual == j + 1) color = "#ffe066";

    ctx.beginPath();
    ctx.arc(pos[j].x, pos[j].y, RADIO_NODO, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.fillText(j + 1, pos[j].x, pos[j].y);

    // la distancia que lleva el nodo, abajo
    if (paso != null) {
      var d = paso.distancia[j + 1];
      if (d == INFINITO) d = "∞";
      ctx.font = "bold 12px Arial";
      ctx.fillText(d, pos[j].x, pos[j].y + RADIO_NODO + 10);
    }
  }
}


// ---- dijkstra con pasos ----

function clickCalcular() {
  if (n == 0) {
    alert("Primero crea un grafo");
    return;
  }
  var origen = parseInt(document.getElementById("selectOrigen").value);
  var destino = parseInt(document.getElementById("selectDestino").value);
  if (origen == destino) {
    alert("El origen y el destino no pueden ser iguales");
    return;
  }
  dijkstra(origen, destino);
  mostrarResultado(origen, destino);
  mostrarTabla();
  mostrarPaso(0);
}

// guarda una foto de como esta todo en este momento
function guardarPaso(titulo, texto, actual, aristaRevisada, caminos) {
  pasos.push({
    titulo: titulo,
    texto: texto,
    actual: actual,                  // nodo que se visita (0 si ninguno)
    aristaRevisada: aristaRevisada,  // posicion de la arista que se revisa (-1 si ninguna)
    caminos: caminos,                // solo el paso final lo usa
    distancia: distancia.slice(),
    visitado: visitado.slice(),
    anterior: anterior.slice()
  });
}

function dijkstra(origen, destino) {
  distancia = [];
  visitado = [];
  anterior = [];
  pasos = [];

  for (var i = 1; i <= n; i++) {
    distancia[i] = INFINITO;
    visitado[i] = false;
    anterior[i] = 0;
  }
  distancia[origen] = 0;
  guardarPaso("Inicio", "Todos los nodos empiezan en infinito y el origen (nodo " + origen + ") en 0.", 0, -1, []);

  for (var vez = 0; vez < n; vez++) {
    // buscar el nodo no visitado con menor distancia
    var actual = 0;
    for (var m = 1; m <= n; m++) {
      if (!visitado[m] && (actual == 0 || distancia[m] < distancia[actual])) {
        actual = m;
      }
    }
    if (actual == 0 || distancia[actual] == INFINITO) break;

    visitado[actual] = true;
    guardarPaso("Visitar el nodo " + actual,
      "Es el no visitado con menor distancia (" + distancia[actual] + "), se marca como visitado.",
      actual, -1, []);

    // si ya llegamos al destino no hace falta seguir
    if (actual == destino) break;

    // revisar las aristas que salen del nodo
    for (var j = 0; j < aristas.length; j++) {
      var a = aristas[j];
      if (a.desde == actual && !visitado[a.hasta]) {
        var nueva = distancia[actual] + a.peso;
        var cuenta = distancia[actual] + " + " + a.peso + " = " + nueva;
        var antes = distancia[a.hasta];
        if (antes == INFINITO) antes = "∞";

        if (nueva < distancia[a.hasta]) {
          distancia[a.hasta] = nueva;
          anterior[a.hasta] = actual;
          guardarPaso("Revisar la arista " + a.desde + " -> " + a.hasta,
            cuenta + " es menor que " + antes + ", el nodo " + a.hasta + " baja a " + nueva + ".",
            actual, j, []);
        } else if (nueva == distancia[a.hasta]) {
          // empate: este es otro camino igual de corto, por eso despues hay que contar todos
          guardarPaso("Revisar la arista " + a.desde + " -> " + a.hasta,
            cuenta + " es igual a " + antes + ", el nodo no cambia pero hay otro camino igual de corto.",
            actual, j, []);
        } else {
          guardarPaso("Revisar la arista " + a.desde + " -> " + a.hasta,
            cuenta + " no es menor que " + antes + ", no cambia nada.",
            actual, j, []);
        }
      }
    }
  }

  var caminos = buscarCaminos(destino, origen);
  if (caminos.length == 0) {
    guardarPaso("Resultado", "No hay camino del nodo " + origen + " al nodo " + destino + ".", 0, -1, []);
  } else {
    guardarPaso("Resultado",
      "La distancia mínima es " + distancia[destino] + " y hay " + caminos.length + " camino(s) mínimo(s).",
      0, -1, caminos);
  }
}

// busca todos los caminos minimos de origen a nodo, yendo hacia atras
// una arista sirve si distancia[desde] + peso es justo la distancia del nodo
function buscarCaminos(nodo, origen) {
  if (distancia[nodo] == INFINITO) return [];
  if (nodo == origen) return [[origen]];

  var lista = [];
  for (var i = 0; i < aristas.length; i++) {
    var a = aristas[i];
    if (a.hasta == nodo && distancia[a.desde] != INFINITO && distancia[a.desde] + a.peso == distancia[nodo]) {
      var anteriores = buscarCaminos(a.desde, origen);
      for (var j = 0; j < anteriores.length; j++) {
        lista.push(anteriores[j].concat([nodo]));
      }
    }
  }
  return lista;
}

// suma de los pesos de un camino
function sumarPesos(camino) {
  var pesos = [];
  for (var i = 0; i < camino.length - 1; i++) {
    pesos.push(buscarPeso(camino[i], camino[i + 1]));
  }
  return pesos;
}

function buscarPeso(desde, hasta) {
  for (var i = 0; i < aristas.length; i++) {
    if (aristas[i].desde == desde && aristas[i].hasta == hasta) return aristas[i].peso;
  }
  return 0;
}


// ---- mostrar resultados ----

function limpiarPasos() {
  pasos = [];
  pasoActual = 0;
  if (n == 0) {
    document.getElementById("resultado").innerHTML = "Primero crea un grafo.";
  } else {
    document.getElementById("resultado").innerHTML = "Elige origen y destino y calcula.";
  }
  document.getElementById("tablaPasos").innerHTML = "";
  document.getElementById("numeroPaso").innerHTML = "";
  document.getElementById("textoPaso").innerHTML = "Todavía no se ha calculado nada.";
  document.getElementById("botonInicio").disabled = true;
  document.getElementById("botonAnterior").disabled = true;
  document.getElementById("botonSiguiente").disabled = true;
  document.getElementById("botonFinal").disabled = true;
}

function mostrarPaso(i) {
  if (i < 0 || i >= pasos.length) return;
  pasoActual = i;
  var p = pasos[i];

  dibujarGrafo(n, aristas, p);
  document.getElementById("numeroPaso").innerHTML = "Paso " + (i + 1) + " de " + pasos.length;
  document.getElementById("textoPaso").innerHTML = "<b>" + p.titulo + "</b><br>" + p.texto;

  for (var k = 0; k < pasos.length; k++) {
    document.getElementById("fila" + k).className = (k == i) ? "filaActual" : "";
  }

  document.getElementById("botonInicio").disabled = (i == 0);
  document.getElementById("botonAnterior").disabled = (i == 0);
  document.getElementById("botonSiguiente").disabled = (i == pasos.length - 1);
  document.getElementById("botonFinal").disabled = (i == pasos.length - 1);
}

function mostrarResultado(origen, destino) {
  var texto = document.getElementById("resultado");
  var caminos = buscarCaminos(destino, origen);
  if (caminos.length == 0) {
    texto.innerHTML = "No hay camino del nodo " + origen + " al nodo " + destino + ".";
    return;
  }

  var html = "<table><tr><th>Origen</th><th>Destino</th><th>Distancia mínima</th><th>Cantidad de caminos mínimos</th></tr>" +
    "<tr><td>" + origen + "</td><td>" + destino + "</td><td><b>" + distancia[destino] + "</b></td><td><b>" + caminos.length + "</b></td></tr></table><br>";

  // un renglon por cada camino minimo
  html += "<table><tr><th>N°</th><th>Camino</th><th>Suma de pesos</th></tr>";
  for (var i = 0; i < caminos.length; i++) {
    html += "<tr><td>" + (i + 1) + "</td><td>" + caminos[i].join(" -> ") + "</td><td>" +
      sumarPesos(caminos[i]).join(" + ") + " = " + distancia[destino] + "</td></tr>";
  }
  texto.innerHTML = html + "</table>";
}

// tabla con todos los pasos y las distancias en cada uno
function mostrarTabla() {
  var html = "<table><caption>Distancia a cada nodo en cada paso (en verde los ya visitados). Haz clic en una fila para verla en el grafo.</caption>";
  html += "<tr><th>Paso</th><th>Qué pasa</th>";
  for (var nodo = 1; nodo <= n; nodo++) {
    html += "<th>" + nodo + "</th>";
  }
  html += "</tr>";

  for (var k = 0; k < pasos.length; k++) {
    var p = pasos[k];
    html += "<tr id='fila" + k + "' onclick='mostrarPaso(" + k + ")'>";
    html += "<td>" + (k + 1) + "</td><td class='izq'><b>" + p.titulo + ".</b> " + p.texto + "</td>";
    for (var m = 1; m <= n; m++) {
      var d = p.distancia[m];
      if (d == INFINITO) d = "∞";
      var clase = "";
      if (p.visitado[m]) clase = " class='listo'";
      html += "<td" + clase + ">" + d + "</td>";
    }
    html += "</tr>";
  }
  document.getElementById("tablaPasos").innerHTML = html + "</table>";
}
