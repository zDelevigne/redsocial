const api = "http://localhost:3000";
let usuarioActual = null;
let mapaUsuarios = {}; // para mapear id -> nombre

// Recuperar usuario guardado al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  const guardado = localStorage.getItem("usuarioActual");
  if (guardado) {
    usuarioActual = JSON.parse(guardado);
    document.getElementById("login").style.display = "none";
    document.getElementById("registro").style.display = "none";
    document.getElementById("privado").style.display = "block";
    await cargarUsuariosParaSeguir();
    await cargarPublicaciones();
  }
});

async function registrarse() {
  const nombre = document.getElementById("regNombre").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;
  const res = await fetch(`${api}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password })
  });

  if (res.ok) {
    alert("Usuario registrado con éxito");
    document.getElementById("regNombre").value = "";
    document.getElementById("regEmail").value = "";
    document.getElementById("regPass").value = "";
  } else {
    alert("Error al registrar");
  }
}







async function login() {
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPass").value;

  const res = await fetch(`${api}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    usuarioActual = data;
    localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual)); // guardar usuario
    document.getElementById("login").style.display = "none";
    document.getElementById("registro").style.display = "none";
    document.getElementById("privado").style.display = "block";
    await cargarUsuariosParaSeguir();
    await cargarPublicaciones();
  } else {
    alert("Credenciales incorrectas");
  }
}







async function cargarUsuariosParaSeguir() {
  const res = await fetch(`${api}/usuarios`);
  const usuarios = await res.json();
  const lista = document.getElementById("listaUsuarios");
  lista.innerHTML = "";

  mapaUsuarios = {};
  usuarios.forEach(u => {
    mapaUsuarios[u._id] = u.nombre;
  });

  usuarios.forEach(u => {
    if (u._id !== usuarioActual._id && !usuarioActual.siguiendo.includes(u._id)) {
      const div = document.createElement("div");
      div.className = "d-flex justify-content-between align-items-center mb-2";
      div.innerHTML = `
        <span>${u.nombre}</span>
        <button class="btn btn-sm btn-success" onclick="seguir('${u._id}')">Seguir</button>
      `;
      lista.appendChild(div);
    }
  });
}






async function seguir(id) {
  await fetch(`${api}/seguir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seguidor_id: usuarioActual._id, seguido_id: id })
  });

  alert("Usuario seguido");

  // Actualizar la lista de seguidos en el usuario actual
  usuarioActual.siguiendo.push(id);
  localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual)); // actualizar usuario

  // 🆕 Guardar también en localStorage en "seguidors"
  let seguidors = JSON.parse(localStorage.getItem("seguidors")) || [];
  seguidors.push({ seguidor_id: usuarioActual._id, seguido_id: id });
  localStorage.setItem("seguidors", JSON.stringify(seguidors));

  await cargarUsuariosParaSeguir();
  await cargarPublicaciones();
}


async function publicar() {
  const contenido = document.getElementById("contenido").value;
  if (!contenido) return;

  await fetch(`${api}/publicar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor_id: usuarioActual._id, contenido })
  });

  document.getElementById("contenido").value = "";
  await cargarPublicaciones();
}

async function comentar(pubId, inputId) {
  const texto = document.getElementById(inputId).value;
  if (!texto) return;

  const res = await fetch(`${api}/comentar/${pubId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor_id: usuarioActual._id, texto })
  });

  const msg = await res.text();
  if (res.ok) {
    await cargarPublicaciones();
  } else {
    alert(msg);
  }
}

function esUrlImagen(texto) {
  return /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg))/i.test(texto);
}

async function cargarPublicaciones() {
  const res = await fetch(`${api}/publicaciones`);
  const publicaciones = await res.json();
  const div = document.getElementById("publicaciones");
  div.innerHTML = "";

  publicaciones.forEach(pub => {
    const card = document.createElement("div");
    card.className = "card mb-3";

    let puedeComentar = pub.autor_id === usuarioActual._id || usuarioActual?.siguiendo.includes(pub.autor_id);
    const nombreAutor = mapaUsuarios[pub.autor_id] || "Usuario desconocido";

    const contenidoHTML = esUrlImagen(pub.contenido)
      ? `<img src="${pub.contenido}" alt="Imagen publicada" style="max-width: 100%;">`
      : `<p>${pub.contenido}</p>`;

    const comentariosHTML = pub.comentarios.map(c => {
      const nombreComentador = mapaUsuarios[c.autor_id] || "Usuario desconocido";
      return `<li><b>${nombreComentador}</b>: ${c.texto}</li>`;
    }).join("");

    card.innerHTML = `
      <div class="card-header">Publicación de: ${nombreAutor}</div>
      <div class="card-body">
        ${contenidoHTML}
        <h6>Comentarios:</h6>
        <ul>${comentariosHTML}</ul>
        ${usuarioActual && puedeComentar ? `
          <input id="com-${pub._id}" class="form-control mb-2" placeholder="Comentar">
          <button class="btn btn-sm btn-secondary" onclick="comentar('${pub._id}', 'com-${pub._id}')">Comentar</button>
        ` : usuarioActual ? `<p class="text-muted">Debes seguir a este usuario para comentar.</p>` : ""}
      </div>
    `;

    div.appendChild(card);
  });
}



// Cierre de sesión
function logout() {
  localStorage.removeItem("usuarioActual");
  location.reload();
}
