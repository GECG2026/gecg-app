const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ============================================
// CONFIGURACIÓN
// ============================================
const PORT = process.env.PORT || 3000;

// ============================================
// CONEXIÓN A SQLITE
// ============================================
const db = new sqlite3.Database('./database.sqlite');
db.run('PRAGMA foreign_keys = ON');

// ============================================
// CREAR TABLAS
// ============================================
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS presiones`);
  db.run(`DROP TABLE IF EXISTS plantas`);
  db.run(`DROP TABLE IF EXISTS estaciones`);
  db.run(`DROP TABLE IF EXISTS diques`);
  db.run(`DROP TABLE IF EXISTS embalses`);
  db.run(`DROP TABLE IF EXISTS maniobras`);
  db.run(`DROP TABLE IF EXISTS usuarios`);
  db.run(`DROP TABLE IF EXISTS configuracion`);
  db.run(`DROP TABLE IF EXISTS respaldos`);

  db.run(`CREATE TABLE presiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    operador_entrante TEXT NOT NULL,
    operador_saliente TEXT NOT NULL,
    presiones TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE plantas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    planta TEXT NOT NULL,
    operador_entrante TEXT NOT NULL,
    operador_saliente TEXT NOT NULL,
    turbiedad TEXT,
    color TEXT,
    cloro_residual TEXT,
    ph TEXT,
    produccion TEXT,
    sustancias TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE estaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    estacion TEXT NOT NULL,
    operador_entrante TEXT NOT NULL,
    operador_saliente TEXT NOT NULL,
    tension TEXT,
    succion TEXT,
    potencia TEXT,
    descarga TEXT,
    grupos TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE diques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    hora TEXT,
    dique TEXT NOT NULL,
    operador_entrante TEXT NOT NULL,
    operador_saliente TEXT NOT NULL,
    cota TEXT,
    caudal TEXT,
    ph TEXT,
    turbiedad TEXT,
    situacion TEXT,
    detalle TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE embalses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    embalse TEXT NOT NULL,
    operador_entrante TEXT NOT NULL,
    operador_saliente TEXT NOT NULL,
    cota_embalse TEXT,
    cota_parada TEXT,
    cota_arranque TEXT,
    diferencia TEXT,
    estado TEXT,
    observaciones TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE maniobras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    hora TEXT,
    ubicacion TEXT NOT NULL,
    responsable TEXT NOT NULL,
    tipo TEXT,
    equipo TEXT,
    descripcion TEXT,
    resultado TEXT,
    usuario TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT DEFAULT 'Operador',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    valor TEXT NOT NULL,
    UNIQUE(tipo, valor)
  )`);

  db.run(`CREATE TABLE respaldos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    fecha TEXT NOT NULL,
    data TEXT NOT NULL
  )`);

  // ============================================
  // CREAR USUARIO ADMIN AUTOMÁTICAMENTE
  // ============================================
  db.get('SELECT * FROM usuarios WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('❌ Error al verificar usuario admin:', err.message);
      return;
    }
    if (!row) {
      db.run(`INSERT INTO usuarios (username, password, nombre_completo, rol) 
              VALUES ('admin', 'admin123', 'Administrador', 'Administrador')`, function(err) {
        if (err) console.error('❌ Error al crear usuario admin:', err.message);
        else console.log('✅ Usuario admin creado correctamente');
      });
    } else {
      console.log('✅ Usuario admin ya existe');
    }
  });

  // Configuración por defecto
  const configDefault = {
    embalses: ['AGUA FRIA', 'LA MARIPOSA'],
    operadores: ['Juan Pérez', 'María González', 'Carlos López', 'Ana Rodríguez'],
    diques: ['AGUA FRIA', 'CAÑAOTE', 'QUEBRADA DE LA VIRGEN', 'E/LA CULEBRA', 'EC.TACATA'],
    estaciones: ['E/B 1 Panamericano', 'E/B 2 Panamericano', 'E/B 3 Panamericano', 'E/B La Matica'],
    plantas: ['Planta La Guairita', 'Planta Tuy II', 'Planta Los Teques', 'Planta Mariposa']
  };

  Object.keys(configDefault).forEach(tipo => {
    configDefault[tipo].forEach(valor => {
      db.run(`INSERT OR IGNORE INTO configuracion (tipo, valor) VALUES (?, ?)`, [tipo, valor]);
    });
  });
});

console.log('📊 Base de datos SQLite inicializada');

// ============================================
// EXPRESS
// ============================================
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend')));

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// ============================================
// RUTAS: LOGIN (CON LOGS)
// ============================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('🔐 Intento de login:', username);
  
  db.get(
    'SELECT id, username, nombre_completo, rol FROM usuarios WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        console.error('❌ Error en login:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        console.log('❌ Usuario no encontrado o contraseña incorrecta:', username);
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      console.log('✅ Login exitoso:', username);
      res.json({ 
        token: 'token_' + Date.now(),
        user: { 
          id: row.id, 
          username: row.username, 
          nombre: row.nombre_completo, 
          rol: row.rol 
        }
      });
    }
  );
});

// ============================================
// RUTAS: CONFIGURACIÓN
// ============================================
app.get('/api/configuracion', (req, res) => {
  db.all('SELECT tipo, valor FROM configuracion', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const config = { 
      embalses: [], 
      operadores: [], 
      diques: [], 
      estaciones: [], 
      plantas: [] 
    };
    rows.forEach(row => {
      if (config[row.tipo]) config[row.tipo].push(row.valor);
    });
    res.json(config);
  });
});

app.post('/api/configuracion', authMiddleware, (req, res) => {
  const { tipo, valores } = req.body;
  if (!tipo || !valores || !Array.isArray(valores)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  db.run('DELETE FROM configuracion WHERE tipo = ?', [tipo], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    let inserted = 0;
    valores.forEach(valor => {
      if (valor.trim()) {
        db.run('INSERT INTO configuracion (tipo, valor) VALUES (?, ?)', [tipo, valor.trim()], function(err) {
          if (!err) inserted++;
        });
      }
    });

    setTimeout(() => {
      res.json({ mensaje: `Configuración guardada: ${inserted} elementos` });
    }, 100);
  });
});

// ============================================
// RUTAS: USUARIOS
// ============================================
app.get('/api/usuarios', authMiddleware, (req, res) => {
  db.all('SELECT id, username, nombre_completo, rol FROM usuarios', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/usuarios', authMiddleware, (req, res) => {
  const { username, password, nombre_completo, rol } = req.body;
  db.run(
    'INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES (?, ?, ?, ?)',
    [username, password, nombre_completo, rol || 'Operador'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Usuario creado' });
    }
  );
});

app.delete('/api/usuarios/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Usuario eliminado' });
  });
});

// ============================================
// RUTAS: EMBALSES
// ============================================
app.get('/api/embalses', (req, res) => {
  db.all('SELECT * FROM embalses ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/embalses', authMiddleware, (req, res) => {
  const { 
    fecha, embalse, operador_entrante, operador_saliente, 
    cota_embalse, cota_parada, cota_arranque, 
    diferencia, estado, observaciones, usuario 
  } = req.body;
  
  db.run(
    `INSERT INTO embalses (
      fecha, embalse, operador_entrante, operador_saliente, 
      cota_embalse, cota_parada, cota_arranque, 
      diferencia, estado, observaciones, usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, embalse, operador_entrante, operador_saliente, 
      cota_embalse, cota_parada, cota_arranque, 
      diferencia, estado, observaciones, usuario || 'admin'
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Registro guardado' });
    }
  );
});

app.delete('/api/embalses/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM embalses WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTAS: PLANTAS
// ============================================
app.get('/api/plantas', (req, res) => {
  db.all('SELECT * FROM plantas ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/plantas', authMiddleware, (req, res) => {
  const { 
    fecha, planta, operador_entrante, operador_saliente, 
    turbiedad, color, cloro_residual, ph, produccion, 
    sustancias, usuario 
  } = req.body;
  
  db.run(
    `INSERT INTO plantas (
      fecha, planta, operador_entrante, operador_saliente, 
      turbiedad, color, cloro_residual, ph, produccion, 
      sustancias, usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, planta, operador_entrante, operador_saliente, 
      turbiedad, color, cloro_residual, ph, produccion, 
      JSON.stringify(sustancias), usuario || 'admin'
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Registro guardado' });
    }
  );
});

app.delete('/api/plantas/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM plantas WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTAS: ESTACIONES
// ============================================
app.get('/api/estaciones', (req, res) => {
  db.all('SELECT * FROM estaciones ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/estaciones', authMiddleware, (req, res) => {
  const { 
    fecha, estacion, operador_entrante, operador_saliente, 
    tension, succion, potencia, descarga, grupos, usuario 
  } = req.body;
  
  db.run(
    `INSERT INTO estaciones (
      fecha, estacion, operador_entrante, operador_saliente, 
      tension, succion, potencia, descarga, grupos, usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, estacion, operador_entrante, operador_saliente, 
      tension, succion, potencia, descarga, 
      JSON.stringify(grupos), usuario || 'admin'
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Registro guardado' });
    }
  );
});

app.delete('/api/estaciones/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM estaciones WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTAS: DIQUES
// ============================================
app.get('/api/diques', (req, res) => {
  db.all('SELECT * FROM diques ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/diques', authMiddleware, (req, res) => {
  const { 
    fecha, hora, dique, operador_entrante, operador_saliente, 
    cota, caudal, ph, turbiedad, situacion, detalle, usuario 
  } = req.body;
  
  db.run(
    `INSERT INTO diques (
      fecha, hora, dique, operador_entrante, operador_saliente, 
      cota, caudal, ph, turbiedad, situacion, detalle, usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, hora, dique, operador_entrante, operador_saliente, 
      cota, caudal, ph, turbiedad, situacion, detalle, usuario || 'admin'
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Registro guardado' });
    }
  );
});

app.delete('/api/diques/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM diques WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTAS: MANIOBRAS
// ============================================
app.get('/api/maniobras', (req, res) => {
  db.all('SELECT * FROM maniobras ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/maniobras', authMiddleware, (req, res) => {
  const { 
    fecha, hora, ubicacion, responsable, 
    tipo, equipo, descripcion, resultado, usuario 
  } = req.body;
  
  db.run(
    `INSERT INTO maniobras (
      fecha, hora, ubicacion, responsable, 
      tipo, equipo, descripcion, resultado, usuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fecha, hora, ubicacion, responsable, 
      tipo, equipo, descripcion, resultado, usuario || 'admin'
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Registro guardado' });
    }
  );
});

app.delete('/api/maniobras/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM maniobras WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTAS: PRESIONES (Dispositivo)
// ============================================
app.get('/api/presiones', (req, res) => {
  db.all('SELECT * FROM presiones ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/presiones', authMiddleware, (req, res) => {
  const { fecha, operador_entrante, operador_saliente, presiones, usuario } = req.body;
  db.run(
    'INSERT INTO presiones (fecha, operador_entrante, operador_saliente, presiones, usuario) VALUES (?, ?, ?, ?, ?)',
    [fecha, operador_entrante, operador_saliente, JSON.stringify(presiones), usuario || 'admin'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, mensaje: 'Presiones guardadas' });
    }
  );
});

app.delete('/api/presiones/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM presiones WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Registro eliminado' });
  });
});

// ============================================
// RUTA: REPORTE EXCEL
// ============================================
app.get('/api/reporte/exportar', (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  
  const query = (tabla) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM ${tabla}`;
      const params = [];
      if (fecha_inicio && fecha_fin) {
        sql += ` WHERE fecha >= ? AND fecha <= ? ORDER BY fecha DESC`;
        params.push(fecha_inicio, fecha_fin);
      } else {
        sql += ` ORDER BY fecha DESC LIMIT 500`;
      }
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  Promise.all([
    query('embalses'),
    query('plantas'),
    query('estaciones'),
    query('diques'),
    query('maniobras'),
    query('presiones')
  ])
  .then(([embalses, plantas, estaciones, diques, maniobras, presiones]) => {
    res.json({ embalses, plantas, estaciones, diques, maniobras, presiones });
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// ============================================
// RUTAS: RESPALDOS
// ============================================
app.post('/api/respaldos', authMiddleware, (req, res) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombre = `respaldo_${fecha}.json`;
  
  const tablas = ['presiones', 'plantas', 'estaciones', 'diques', 'embalses', 'maniobras', 'usuarios', 'configuracion'];
  
  const data = {};
  let pendientes = tablas.length;
  let error = null;

  tablas.forEach(tabla => {
    db.all(`SELECT * FROM ${tabla}`, (err, rows) => {
      if (err) {
        error = err;
        return;
      }
      data[tabla] = rows;
      pendientes--;
      if (pendientes === 0) {
        const jsonData = JSON.stringify(data, null, 2);
        
        db.run(
          'INSERT INTO respaldos (nombre, fecha, data) VALUES (?, ?, ?)',
          [nombre, fecha, jsonData],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensaje: 'Respaldo creado', nombre, fecha });
          }
        );
      }
    });
  });
});

app.get('/api/respaldos', authMiddleware, (req, res) => {
  db.all('SELECT id, nombre, fecha FROM respaldos ORDER BY fecha DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/respaldos/:nombre', authMiddleware, (req, res) => {
  db.get('SELECT data FROM respaldos WHERE nombre = ?', [req.params.nombre], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Respaldo no encontrado' });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.nombre}"`);
    res.send(row.data);
  });
});

app.post('/api/restaurar', authMiddleware, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const tablas = ['presiones', 'plantas', 'estaciones', 'diques', 'embalses', 'maniobras'];
  let pendientes = tablas.length;
  let error = null;

  tablas.forEach(tabla => {
    if (data[tabla] && Array.isArray(data[tabla])) {
      db.run(`DELETE FROM ${tabla}`, function(err) {
        if (err) { error = err; return; }
        
        data[tabla].forEach(row => {
          const columns = Object.keys(row).filter(k => k !== 'id');
          const placeholders = columns.map(() => '?').join(',');
          const values = columns.map(k => row[k]);
          
          db.run(
            `INSERT INTO ${tabla} (${columns.join(',')}) VALUES (${placeholders})`,
            values,
            function(err) {
              if (err) error = err;
            }
          );
        });
        
        pendientes--;
        if (pendientes === 0) {
          if (error) return res.status(500).json({ error: error.message });
          res.json({ mensaje: 'Restauración completada' });
        }
      });
    } else {
      pendientes--;
      if (pendientes === 0) {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ mensaje: 'Restauración completada' });
      }
    }
  });
});

// ============================================
// RUTAS DEL FRONTEND
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GECG Server corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: SQLite`);
  console.log(`👤 Usuario: admin / Contraseña: admin123`);
  console.log(`🔗 Acceso desde: http://localhost:${PORT}`);
});

// ============================================
// MANEJO DE CIERRE
// ============================================
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('❌ Error al cerrar la base de datos:', err);
    else console.log('📊 Base de datos cerrada correctamente');
    process.exit(0);
  });
});