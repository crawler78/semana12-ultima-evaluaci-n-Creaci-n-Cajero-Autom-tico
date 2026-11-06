/* =====================================================================
   CAJERO AUTOMÁTICO - SCOTIABANK
   Reglas:
   - Al menos 3 cuentas (arreglo de objetos del enunciado).
   - Login por DNI o por selección de tarjeta + clave (con reintento).
   - Operaciones: Consultar saldo / Ingresar monto / Retirar monto.
   - Regla de negocio: el saldo NUNCA puede ser menor a $0.
   - PRIVACIDAD: los DNI y los nombres reales NO se muestran en pantalla.
     Solo se usan internamente; en la interfaz aparecen como "Cuenta 1/2/3".
   ===================================================================== */

// ---- Datos internos (NO se muestran en pantalla) --------------------
let cuentas = [
  { nombre: "Mali", saldo: 200, password: "1234", dni: 44788834 },
  { nombre: "Gera", saldo: 150, password: "5678", dni: 10247439 },
  { nombre: "Sabi", saldo: 60,  password: "9102", dni: 98005362 }
];

// Etiquetas genéricas públicas (preservan la privacidad)
const etiqueta = i => `Cuenta ${i + 1}`;

let cuentaActivaIdx = null;   // índice de la cuenta seleccionada

// ---- Referencias del DOM --------------------------------------------
const $ = id => document.getElementById(id);

const screenLogin = $("screen-login");
const screenPass  = $("screen-pass");
const screenOps   = $("screen-ops");

const selectCard  = $("select-card");
const inputDni    = $("input-dni");
const loginMsg    = $("login-msg");

const passAccount = $("pass-account");
const inputPass   = $("input-pass");
const passMsg     = $("pass-msg");

const opsAccount  = $("ops-account");
const opPanel     = $("op-panel");
const opTitle     = $("op-title");
const opAmountWrap= $("op-amount-wrap");
const opAmount    = $("op-amount");
const opResult    = $("op-result");

let opActual = null; // 'saldo' | 'ingresar' | 'retirar'

// ---- Utilidades -----------------------------------------------------
function mostrarPantalla(el){
  [screenLogin, screenPass, screenOps].forEach(s => s.classList.add("hidden"));
  el.classList.remove("hidden");
}
function money(n){
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function setMsg(el, texto, tipo){
  el.textContent = texto;
  el.className = "login-msg" + (tipo ? " " + tipo : "");
}

// ---- Poblar el desplegable con etiquetas genéricas ------------------
cuentas.forEach((c, i) => {
  const op = document.createElement("option");
  op.value = i;
  op.textContent = etiqueta(i);   // "Cuenta 1", "Cuenta 2", "Cuenta 3"
  selectCard.appendChild(op);
});

// =====================================================================
// PANTALLA 1: LOGIN
// =====================================================================
$("btn-continuar").addEventListener("click", () => {
  const dniTxt = inputDni.value.trim();
  const cardSel = selectCard.value;
  let idx = null;

  if (dniTxt !== "") {
    // Login por DNI
    if (!/^\d{8}$/.test(dniTxt)) {
      setMsg(loginMsg, "El DNI debe tener 8 dígitos numéricos.", "error");
      return;
    }
    idx = cuentas.findIndex(c => String(c.dni) === dniTxt);
    if (idx === -1) {
      setMsg(loginMsg, "No encontramos una cuenta con ese DNI.", "error");
      return;
    }
  } else if (cardSel !== "") {
    // Login por tarjeta (etiqueta genérica)
    idx = Number(cardSel);
  } else {
    setMsg(loginMsg, "Ingresa tu DNI o selecciona una tarjeta.", "error");
    return;
  }

  cuentaActivaIdx = idx;
  setMsg(loginMsg, "", "");
  irAClave();
});

[inputDni, selectCard].forEach(el =>
  el.addEventListener("input", () => setMsg(loginMsg, "", ""))
);

// =====================================================================
// PANTALLA 2: CLAVE (con reintento)
// =====================================================================
function irAClave(){
  passAccount.textContent = etiqueta(cuentaActivaIdx) + " seleccionada";
  inputPass.value = "";
  setMsg(passMsg, "", "");
  mostrarPantalla(screenPass);
  inputPass.focus();
}

$("btn-ingresar").addEventListener("click", validarClave);
inputPass.addEventListener("keydown", e => { if (e.key === "Enter") validarClave(); });

function validarClave(){
  const clave = inputPass.value.trim();
  const cuenta = cuentas[cuentaActivaIdx];

  if (clave === "") {
    setMsg(passMsg, "Ingresa tu clave.", "error");
    return;
  }
  if (clave !== cuenta.password) {
    // Clave incorrecta -> notificar y permitir reintentar
    setMsg(passMsg, "Clave incorrecta. Inténtalo nuevamente.", "error");
    inputPass.value = "";
    inputPass.focus();
    return;
  }
  // Clave correcta -> entrar a operaciones
  setMsg(passMsg, "", "");
  irAOperaciones();
}

$("btn-volver-login").addEventListener("click", () => {
  cuentaActivaIdx = null;
  inputDni.value = "";
  selectCard.value = "";
  mostrarPantalla(screenLogin);
});

// =====================================================================
// PANTALLA 3: OPERACIONES
// =====================================================================
function irAOperaciones(){
  opsAccount.textContent = etiqueta(cuentaActivaIdx); // sin nombre ni DNI
  cerrarPanel();
  mostrarPantalla(screenOps);
}

document.querySelectorAll(".op-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".op-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    abrirOperacion(btn.dataset.op);
  });
});

function abrirOperacion(op){
  opActual = op;
  opPanel.classList.remove("hidden");
  opResult.classList.add("hidden");
  opResult.textContent = "";
  opAmount.value = "";

  if (op === "saldo") {
    opTitle.textContent = "Consultar saldo";
    opAmountWrap.classList.add("hidden");
    mostrarSaldo();              // muestra el resultado de inmediato
  } else if (op === "ingresar") {
    opTitle.textContent = "Ingresar monto";
    opAmountWrap.classList.remove("hidden");
    opAmount.focus();
  } else if (op === "retirar") {
    opTitle.textContent = "Retirar monto";
    opAmountWrap.classList.remove("hidden");
    opAmount.focus();
  }
}

function mostrarResultado(html, tipo){
  opResult.innerHTML = html;
  opResult.className = "op-result " + tipo;
  opResult.classList.remove("hidden");
}

// ---- Consultar saldo ----
function mostrarSaldo(){
  const c = cuentas[cuentaActivaIdx];
  mostrarResultado(
    `Tu saldo actual es:<span class="big">S/ ${money(c.saldo)}</span>`, "ok"
  );
}

// ---- Confirmar (ingresar / retirar) ----
$("op-confirm").addEventListener("click", () => {
  if (opActual === "saldo") { mostrarSaldo(); return; }

  const c = cuentas[cuentaActivaIdx];
  const raw = opAmount.value.trim().replace(",", ".");
  const monto = Number(raw);

  // Validaciones de monto
  if (raw === "") {
    mostrarResultado("Debes escribir un monto.", "error"); return;
  }
  if (isNaN(monto)) {
    mostrarResultado("El monto ingresado no es un número válido.", "error"); return;
  }
  if (monto <= 0) {
    mostrarResultado("El monto debe ser mayor a S/ 0.00.", "error"); return;
  }

  if (opActual === "ingresar") {
    c.saldo += monto;
    mostrarResultado(
      `Monto ingresado: <strong>S/ ${money(monto)}</strong>` +
      `<span class="big">Nuevo saldo: S/ ${money(c.saldo)}</span>`, "ok"
    );
    opAmount.value = "";
  }

  if (opActual === "retirar") {
    // Regla de negocio: el saldo NUNCA puede ser menor a $0
    if (monto > c.saldo) {
      mostrarResultado(
        `Fondos insuficientes. Tu saldo es S/ ${money(c.saldo)}.`, "error"
      );
      return;
    }
    c.saldo -= monto;
    mostrarResultado(
      `Monto retirado: <strong>S/ ${money(monto)}</strong>` +
      `<span class="big">Nuevo saldo: S/ ${money(c.saldo)}</span>`, "ok"
    );
    opAmount.value = "";
  }
});

opAmount.addEventListener("keydown", e => {
  if (e.key === "Enter") $("op-confirm").click();
});

// ---- Cancelar panel ----
$("op-cancel").addEventListener("click", cerrarPanel);
function cerrarPanel(){
  opPanel.classList.add("hidden");
  opResult.classList.add("hidden");
  opResult.textContent = "";
  opAmount.value = "";
  opActual = null;
  document.querySelectorAll(".op-btn").forEach(b => b.classList.remove("active"));
}

// ---- Salir ----
$("btn-salir").addEventListener("click", () => {
  cuentaActivaIdx = null;
  inputDni.value = "";
  selectCard.value = "";
  inputPass.value = "";
  cerrarPanel();
  mostrarPantalla(screenLogin);
});
