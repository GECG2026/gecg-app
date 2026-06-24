const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'gecg_secret_key_2024';

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== RUTA DEL FRONTEND ====================
const frontendPath = path.join(__dirname, 'frontend');
console.log('📁 Ruta del frontend:', frontendPath);
app.use(express.static(frontendPath));

// ==================== BASE DE DATOS ====================
const sqlite3 = require('sqlite3').verbose();

// Usar SQLite siempre (en desarrollo y producción)
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('❌ Error al conectar a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a SQLite');
    }
});

// ==================== CREAR TABLAS ====================
db.serialize(() => {
    // ===== USUARIOS =====
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre_completo TEXT NOT NULL,
        rol TEXT DEFAULT 'Operador',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ==================== CONFIGURACIÓN ====================
app.get('/api/configuracion', verificarToken, (req, res) => {
    db.all('SELECT * FROM configuracion ORDER BY tipo, orden', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else {
            const config = {};
            rows.forEach(row => {
                if (!config[row.tipo]) config[row.tipo] = [];
                config[row.tipo].push(row.valor);
            });
            res.json(config);
        }
    });
});

// GUARDAR CONFIGURACIÓN
app.post('/api/configuracion', verificarToken, (req, res) => {
    console.log('📥 Recibiendo configuración:', req.body);
    
    const { tipo, valores } = req.body;
    if (!tipo || !Array.isArray(valores)) {
        console.log('❌ Datos inválidos:', { tipo, valores });
        return res.status(400).json({ error: 'Datos inválidos' });
    }
    
    // Eliminar valores vacíos
    const valoresFiltrados = valores.filter(v => v.trim() !== '');
    if (valoresFiltrados.length === 0) {
        valoresFiltrados.push('Seleccionar...');
    }
    
    db.run('DELETE FROM configuracion WHERE tipo = ?', [tipo], function(err) {
        if (err) {
            console.error('❌ Error al eliminar:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const stmt = db.prepare('INSERT INTO configuracion (tipo, valor, orden) VALUES (?, ?, ?)');
        valoresFiltrados.forEach((valor, idx) => {
            stmt.run(tipo, valor, idx);
        });
        stmt.finalize((err) => {
            if (err) {
                console.error('❌ Error al insertar:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Configuración de ${tipo} guardada:`, valoresFiltrados);
            res.json({ success: true, message: 'Configuración actualizada' });
        });
    });
});

    // ===== EMBALSES =====
    db.run(`CREATE TABLE IF NOT EXISTS embalses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        embalse TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        cota_embalse REAL,
        cota_parada REAL,
        cota_arranque REAL,
        diferencia REAL,
        estado TEXT,
        observaciones TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== PLANTAS =====
    db.run(`CREATE TABLE IF NOT EXISTS plantas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        planta TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        turbiedad REAL,
        color REAL,
        cloro_residual REAL,
        ph REAL,
        produccion REAL,
        sustancias TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== ESTACIONES - CORREGIDA CON DESCARGA =====
    db.run(`CREATE TABLE IF NOT EXISTS estaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        estacion TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        tension REAL,
        succion REAL,
        potencia REAL,
        descarga REAL,
        grupos TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== DIQUES =====
    db.run(`CREATE TABLE IF NOT EXISTS diques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        hora TEXT,
        dique TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        cota REAL,
        caudal REAL,
        ph REAL,
        turbiedad REAL,
        situacion TEXT,
        detalle TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== MANIOBRAS =====
    db.run(`CREATE TABLE IF NOT EXISTS maniobras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        hora TEXT,
        ubicacion TEXT,
        responsable TEXT,
        tipo TEXT,
        equipo TEXT,
        descripcion TEXT,
        resultado TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== PRESIONES - CORREGIDA CON PRESIONES =====
    db.run(`CREATE TABLE IF NOT EXISTS presiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        presiones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== CONFIGURACIÓN INICIAL =====
    const configInicial = {
        embalses: ['AGUA FRIA', 'LA MARIPOSA'],
        operadores: ['Juan Pérez', 'María González', 'Carlos López', 'Ana Rodríguez'],
        diques: ['AGUA FRIA', 'CAÑAOTE', 'QUEBRADA DE LA VIRGEN', 'E/LA CULEBRA', 'EC.TACATA'],
        estaciones: ['E/B 1 Panamericano', 'E/B 2 Panamericano', 'E/B 3 Panamericano', 'E/B La Matica'],
        plantas: ['Planta La Guairita', 'Planta Tuy II', 'Planta Los Teques', 'Planta Mariposa']
    };

    db.get('SELECT * FROM configuracion LIMIT 1', (err, row) => {
        if (!row) {
            const stmt = db.prepare('INSERT INTO configuracion (tipo, valor, orden) VALUES (?, ?, ?)');
            Object.keys(configInicial).forEach(tipo => {
                configInicial[tipo].forEach((valor, idx) => {
                    stmt.run(tipo, valor, idx);
                });
            });
            stmt.finalize();
            console.log('✅ Configuración inicial creada');
        }
    });

    // ===== USUARIO ADMIN =====
    db.get('SELECT * FROM usuarios WHERE username = "admin"', (err, row) => {
        if (!row) {
            db.run(`INSERT INTO usuarios (username, password, nombre_completo, rol) 
                    VALUES (?, ?, ?, ?)`, 
                    ['admin', 'admin123', 'Administrador', 'Administrador']);
            console.log('✅ Usuario admin creado');
        }
    });

    // ===== USUARIO OPERADOR =====
    db.get('SELECT * FROM usuarios WHERE username = "operador"', (err, row) => {
        if (!row) {
            db.run(`INSERT INTO usuarios (username, password, nombre_completo, rol) 
                    VALUES (?, ?, ?, ?)`, 
                    ['operador', 'operador123', 'Operador Principal', 'Operador']);
            console.log('✅ Usuario operador creado');
        }
    });
});

// ==================== LOGIN ====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        if (user.password !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, rol: user.rol },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nombre: user.nombre_completo,
                rol: user.rol
            }
        });
    });
});

// ==================== VERIFICAR TOKEN ====================
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}

// ============================================================ //
// ==================== CRUD EMBALSES ==================== //
// ============================================================ //

app.get('/api/embalses', verificarToken, (req, res) => {
    db.all('SELECT * FROM embalses ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/embalses', verificarToken, (req, res) => {
    const { fecha, embalse, operador_entrante, operador_saliente, cota_embalse, cota_parada, cota_arranque, diferencia, estado, observaciones, usuario } = req.body;
    db.run(`INSERT INTO embalses (fecha, embalse, operador_entrante, operador_saliente, cota_embalse, cota_parada, cota_arranque, diferencia, estado, observaciones, usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, embalse, operador_entrante, operador_saliente, cota_embalse, cota_parada, cota_arranque, diferencia, estado, observaciones, usuario],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/embalses/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM embalses WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CRUD PLANTAS ==================== //
// ============================================================ //

app.get('/api/plantas', verificarToken, (req, res) => {
    db.all('SELECT * FROM plantas ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/plantas', verificarToken, (req, res) => {
    const { fecha, planta, operador_entrante, operador_saliente, turbiedad, color, cloro_residual, ph, produccion, sustancias, usuario } = req.body;
    db.run(`INSERT INTO plantas (fecha, planta, operador_entrante, operador_saliente, turbiedad, color, cloro_residual, ph, produccion, sustancias, usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, planta, operador_entrante, operador_saliente, turbiedad, color, cloro_residual, ph, produccion, JSON.stringify(sustancias), usuario],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/plantas/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM plantas WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CRUD ESTACIONES - CORREGIDO ==================== //
// ============================================================ //

app.get('/api/estaciones', verificarToken, (req, res) => {
    db.all('SELECT * FROM estaciones ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/estaciones', verificarToken, (req, res) => {
    const { fecha, estacion, operador_entrante, operador_saliente, tension, succion, potencia, Descarga, grupos, usuario } = req.body;
    db.run(`INSERT INTO estaciones (fecha, estacion, operador_entrante, operador_saliente, tension, succion, potencia, Descarga, grupos, usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, estacion, operador_entrante, operador_saliente, tension, succion, potencia, Descarga, JSON.stringify(grupos), usuario],
        function(err) {
            if (err) {
                console.error('Error al guardar estación:', err);
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/estaciones/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM estaciones WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CRUD DIQUES ==================== //
// ============================================================ //

app.get('/api/diques', verificarToken, (req, res) => {
    db.all('SELECT * FROM diques ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/diques', verificarToken, (req, res) => {
    const { fecha, hora, dique, operador_entrante, operador_saliente, cota, caudal, ph, turbiedad, situacion, detalle, usuario } = req.body;
    db.run(`INSERT INTO diques (fecha, hora, dique, operador_entrante, operador_saliente, cota, caudal, ph, turbiedad, situacion, detalle, usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, hora, dique, operador_entrante, operador_saliente, cota, caudal, ph, turbiedad, situacion, detalle, usuario],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/diques/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM diques WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CRUD MANIOBRAS ==================== //
// ============================================================ //

app.get('/api/maniobras', verificarToken, (req, res) => {
    db.all('SELECT * FROM maniobras ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/maniobras', verificarToken, (req, res) => {
    const { fecha, hora, ubicacion, responsable, tipo, equipo, descripcion, resultado, usuario } = req.body;
    db.run(`INSERT INTO maniobras (fecha, hora, ubicacion, responsable, tipo, equipo, descripcion, resultado, usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, hora, ubicacion, responsable, tipo, equipo, descripcion, resultado, usuario],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/maniobras/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM maniobras WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CRUD PRESIONES - CORREGIDO ==================== //
// ============================================================ //

app.get('/api/presiones', verificarToken, (req, res) => {
    db.all('SELECT * FROM presiones ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/presiones', verificarToken, (req, res) => {
    const { fecha, operador_entrante, operador_saliente, presiones } = req.body;
    
    // Verificar que presiones sea un array
    const presionesJson = Array.isArray(presiones) ? JSON.stringify(presiones) : JSON.stringify([]);
    
    db.run(`INSERT INTO presiones (fecha, operador_entrante, operador_saliente, presiones) 
            VALUES (?, ?, ?, ?)`,
        [fecha, operador_entrante, operador_saliente, presionesJson],
        function(err) {
            if (err) {
                console.error('Error al guardar presiones:', err);
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        });
});

app.delete('/api/presiones/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM presiones WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== CONFIGURACIÓN ==================== //
// ============================================================ //

app.get('/api/configuracion', verificarToken, (req, res) => {
    db.all('SELECT * FROM configuracion ORDER BY tipo, orden', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else {
            const config = {};
            rows.forEach(row => {
                if (!config[row.tipo]) config[row.tipo] = [];
                config[row.tipo].push(row.valor);
            });
            res.json(config);
        }
    });
});

// ============================================================ //
// ==================== USUARIOS ==================== //
// ============================================================ //

app.get('/api/usuarios', verificarToken, (req, res) => {
    db.all('SELECT id, username, nombre_completo, rol FROM usuarios', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/usuarios', verificarToken, (req, res) => {
    const { username, password, nombre_completo, rol } = req.body;
    db.run('INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES (?, ?, ?, ?)',
        [username, password, nombre_completo, rol || 'Operador'],
        function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ id: this.lastID });
        });
});

app.delete('/api/usuarios/:id', verificarToken, (req, res) => {
    db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// ============================================================ //
// ==================== REPORTES ==================== //
// ============================================================ //

app.get('/api/reporte/exportar', verificarToken, (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const reporte = {};
    const tablas = ['embalses', 'diques', 'plantas', 'estaciones', 'maniobras', 'presiones'];
    let completadas = 0;

    tablas.forEach(tabla => {
        let sql = `SELECT * FROM ${tabla}`;
        let params = [];
        if (fecha_inicio && fecha_fin) {
            sql += ` WHERE fecha BETWEEN ? AND ?`;
            params = [fecha_inicio, fecha_fin];
        }
        db.all(sql, params, (err, rows) => {
            reporte[tabla] = rows || [];
            completadas++;
            if (completadas === tablas.length) {
                res.json(reporte);
            }
        });
    });
});

// ============================================================ //
// ==================== RESPALDOS ==================== //
// ============================================================ //

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
    console.log('📁 Carpeta de respaldos creada');
}

// Respaldo automático cada hora
setInterval(() => {
    try {
        const dbFile = path.join(__dirname, 'database.sqlite');
        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupsDir, `backup_${fecha}.sqlite`);
        fs.copyFileSync(dbFile, backupFile);
        console.log(`⏰ Respaldo automático: ${path.basename(backupFile)}`);
        
        // Mantener solo los últimos 30 respaldos
        const archivos = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sqlite')).sort();
        if (archivos.length > 30) {
            const eliminar = archivos.slice(0, archivos.length - 30);
            eliminar.forEach(f => {
                fs.unlinkSync(path.join(backupsDir, f));
                console.log(`🗑️ Respaldo antiguo eliminado: ${f}`);
            });
        }
    } catch (error) {
        console.error('Error en respaldo automático:', error);
    }
}, 3600000);

// Crear respaldo manual
app.post('/api/respaldos', verificarToken, (req, res) => {
    try {
        const dbFile = path.join(__dirname, 'database.sqlite');
        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupsDir, `backup_${fecha}.sqlite`);
        fs.copyFileSync(dbFile, backupFile);
        res.json({ message: '✅ Respaldo creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar respaldos
app.get('/api/respaldos', verificarToken, (req, res) => {
    try {
        const archivos = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.sqlite'))
            .map(f => {
                const fecha = f.replace('backup_', '').replace('.sqlite', '').replace(/-/g, ':').slice(0, 19);
                return { nombre: f, fecha: fecha };
            })
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
        res.json(archivos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restaurar respaldo
app.post('/api/respaldos/restaurar', verificarToken, (req, res) => {
    const { nombre } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'Nombre del respaldo requerido' });
    }
    
    const backupFile = path.join(backupsDir, nombre);
    if (!fs.existsSync(backupFile)) {
        return res.status(404).json({ error: 'Respaldo no encontrado' });
    }
    
    try {
        const dbFile = path.join(__dirname, 'database.sqlite');
        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPrev = path.join(backupsDir, `backup_antes_restaurar_${fecha}.sqlite`);
        fs.copyFileSync(dbFile, backupPrev);
        fs.copyFileSync(backupFile, dbFile);
        res.json({ message: '✅ Datos restaurados correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================ //
// ==================== SERVIR FRONTEND ==================== //
// ============================================================ //

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

// ============================================================ //
// ==================== INICIAR SERVIDOR ==================== //
// ============================================================ //

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 GECG - Servidor corriendo');
    console.log(`📡 http://localhost:${PORT}`);
    console.log('========================================');
    console.log('📝 Credenciales:');
    console.log('   admin / admin123');
    console.log('   operador / operador123');
    console.log('========================================\n');
});