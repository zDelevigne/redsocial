const express = require('express'); //libreria de node, tiene los comandos app.get, app.post, permite hacer también put, delete, etc
const mongoose = require('mongoose'); //se usa para conectarse con la base de datos
const cors = require('cors'); //permite que desde http://127.0.0.1:5500/public/index.html saque información de por ejemplo http://localhost:3000
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS para permitir peticiones desde otros orígenes (dominios/puertos) (si no la usamos nos tira un error de cors policy acceso denegado)
app.use(express.json()); // Habilita el parsing de JSON en las peticiones
app.use(express.static('public')); //Permite que en lugar de tener que hacer http://127.0.0.1:5500/public/index.html conectes directamente con http://127.0.0.1:5500/index.html (sin el public de por medio)

// Conexión MongoDB
//useNewUrlParser (Un parser más moderno para las URL)
//useUnifiedTopology (motor de manejo de conexiones (Unified Topology), que mejora el monitoreo de servidores y eventos de red, recomendado por MongoDB) 
mongoose.connect('mongodb+srv://blackknight:ktfY1GA3cMLMw4wI@cluster0.2c0qzvt.mongodb.net/redsocial?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});





// Modelos
// type: mongoose.Schema.Types.ObjectId significa que este valor será un ID válido de MongoDB
const Usuario = mongoose.model('Usuario', {
  nombre: String,
  email: { type: String, unique: true },
  password: String,
  siguiendo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }]
});




const Seguidor = mongoose.model('Seguidor', {
  seguidor_id: mongoose.Schema.Types.ObjectId,
  seguido_id: mongoose.Schema.Types.ObjectId,
});




const Publicacion = mongoose.model('Publicacion', {
  autor_id: mongoose.Schema.Types.ObjectId,
  contenido: String,
  fecha: Date,
  comentarios: 
  [
    {
      autor_id: mongoose.Schema.Types.ObjectId,
      texto: String,
      fecha: Date,
    },
  ],
});





// Rutas





// Registrar usuario (Prepara todo en localhost:3000 para en script.js realizar un fetch a mongodb)
//cuando el frontend manda un JSON con fetch(...), esos datos llegan al backend y se guardan automáticamente dentro de req.body
//si hacemos un app.post a /usuarios por ejemplo y ponemos console.log(req.body) nos mostraría los datos del usuario
//req = lo que el cliente le envía (la solicitud, los datos)
//res = lo que el servidor va a responde (res.send(usuario) mandaría al localhost la información de registro del usuario)

app.post('/usuarios', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const usuario = new Usuario({ nombre, email, password });
    await usuario.save();
    res.send(usuario);
  } catch (error) {
    res.status(400).send({ error: "Error al registrar usuario. ¿Email duplicado?" });
  }
});










// Login
//!user: si el correo ingresado y la contraseña no coinciden con lo que hay en el localhost, dirá que las credenciales son incorrectas
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Usuario.findOne({ email, password });
  if (!user) return res.status(401).send({ error: "Credenciales incorrectas" });
  res.send(user);
});

// Obtener todos los usuarios (para mostrar a quién seguir)
app.get('/usuarios', async (req, res) => {
  const usuarios = await Usuario.find();
  res.send(usuarios);
});






// Crear publicación
//pub.save() guarda la publicacion y res.send(pub) la envia al localhost
app.post('/publicar', async (req, res) => {
  const { autor_id, contenido } = req.body;
  const pub = new Publicacion({
    autor_id,
    contenido,
    fecha: new Date(),
    comentarios: [],
  });
  await pub.save();
  res.send(pub);
});





//const publicacionId = req.params.id; aquí guardamos el id de esa publicación y sirve para buscarla en mongodb
app.post('/comentar/:id', async (req, res) => {
  const publicacionId = req.params.id;
  const { autor_id, texto } = req.body;
  // Convertir a ObjectId
  const autorObjectId = new mongoose.Types.ObjectId(autor_id);
  // Buscar publicación en mongodb
  const pub = await Publicacion.findById(publicacionId);
  // Verificar si el autor del comentario es el mismo que el autor de la publicación
  const esElMismoAutor = pub.autor_id.toString() === autor_id;
  // Buscar si el autor sigue al dueño de la publicación
  const sigue = await Seguidor.findOne({
    seguidor_id: autorObjectId,
    seguido_id: pub.autor_id,
  });
  // Si no es el mismo autor ni sigue al autor original, prohibir comentar
  if (!esElMismoAutor && !sigue) {
    return res.status(403).send("No puedes comentar esta publicación (no eres ni el autor ni sigues al mismo)");
  }
  // Agregar comentario (push en el array de publicacions de la db mongodb)
  pub.comentarios.push({ autor_id: autorObjectId, texto, fecha: new Date() });
  await pub.save();
  res.send(pub);
});




// Manda todas las publicaciones a http://localhost:3000/publicaciones
app.get('/publicaciones', async (req, res) => {
  const pubs = await Publicacion.find();
  res.send(pubs);
});

app.post('/seguir', async (req, res) => {
  try {
    const { seguidor_id, seguido_id } = req.body;
    if (seguidor_id === seguido_id) {
      return res.status(400).send({ error: "No puedes seguirte a ti mismo" });
    }
    const existe = await Seguidor.findOne({ seguidor_id, seguido_id });
    if (existe) {
      return res.status(400).send({ error: "Ya sigues a este usuario" });
    }
    const nuevoSeguidor = new Seguidor({ seguidor_id, seguido_id });
    await nuevoSeguidor.save();
    await Usuario.findByIdAndUpdate(seguidor_id, { $addToSet: { siguiendo: seguido_id } });
    res.send({ mensaje: "Usuario seguido correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error al seguir usuario" });
  }
});


//INICIAR SERVIDOR app.listen(3000) basicamente dice "escuchá peticiones del puerto 3000"
app.listen(3000, '0.0.0.0'); // o usá tu IP local

