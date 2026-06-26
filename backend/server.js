const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'gecg_secret_key_2024';

app.use(cors());
app.use(express.json());

// ==================== BASE DE DATOS ====================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('❌ Error SQLite:', err.message);
    else console.log('✅ Conectado a SQLite');
});

// ==================== RESPALDOS AUTOMÁTICOS ====================
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
    console.log('📁 Carpeta de respaldos creada');
}

// ==================== RESPALDOS EN JSON (para descargar) ====================
const jsonBackupsDir = path.join(__dirname, 'json_backups');
if (!fs.existsSync(jsonBackupsDir)) {
    fs.mkdirSync(jsonBackupsDir);
    console.log('📁 Carpeta de respaldos JSON creada');
}

function crearRespaldoAutomatico() {
    try {
        const dbFile = path.join(__dirname, 'database.sqlite');
        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupsDir, `backup_${fecha}.sqlite`);
        fs.copyFileSync(dbFile, backupFile);
        console.log(`⏰ Respaldo automático: ${path.basename(backupFile)}`);
        
        const archivos = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sqlite')).sort();
        if (archivos.length > 30) {
            const eliminar = archivos.slice(0, archivos.length - 30);
            eliminar.forEach(f => {
                fs.unlinkSync(path.join(backupsDir, f));
                console.log(`🗑️ Respaldo antiguo eliminado: ${f}`);
            });
        }
    } catch (error) {
        console.error('Error en respaldo:', error);
    }
}

setInterval(crearRespaldoAutomatico, 3600000);
crearRespaldoAutomatico();
console.log('✅ Respaldos automáticos activados (cada hora)');

// ==================== CREAR TABLAS ====================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre_completo TEXT NOT NULL,
        rol TEXT DEFAULT 'Operador'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        valor TEXT NOT NULL,
        orden INTEGER DEFAULT 0
    )`);

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

    db.run(`CREATE TABLE IF NOT EXISTS presiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        operador_entrante TEXT,
        operador_saliente TEXT,
        presiones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Usuario admin
    db.get('SELECT * FROM usuarios WHERE username = "admin"', (err, row) => {
        if (!row) {
            db.run(`INSERT INTO usuarios (username, password, nombre_completo, rol) 
                    VALUES (?, ?, ?, ?)`, 
                    ['admin', 'admin123', 'Administrador', 'Administrador']);
            console.log('✅ Usuario admin creado');
        }
    });

    db.get('SELECT * FROM usuarios WHERE username = "operador"', (err, row) => {
        if (!row) {
            db.run(`INSERT INTO usuarios (username, password, nombre_completo, rol) 
                    VALUES (?, ?, ?, ?)`, 
                    ['operador', 'operador123', 'Operador Principal', 'Operador']);
            console.log('✅ Usuario operador creado');
        }
    });

    // Configuración inicial
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
});

// ==================== LOGIN ====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Usuario no encontrado' });
        if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });
        const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, nombre: user.nombre_completo, rol: user.rol } });
    });
});

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}

// ==================== CRUD GENÉRICO ====================
function crearCRUD(tabla, fields) {
    app.get(`/api/${tabla}`, verificarToken, (req, res) => {
        db.all(`SELECT * FROM ${tabla} ORDER BY id DESC`, (err, rows) => {
            if (err) res.status(500).json({ error: err.message });
            else res.json(rows);
        });
    });

    app.post(`/api/${tabla}`, verificarToken, (req, res) => {
        const keys = Object.keys(req.body).filter(k => fields.includes(k));
        const placeholders = keys.map(() => '?').join(',');
        const values = keys.map(k => req.body[k]);
        const sql = `INSERT INTO ${tabla} (${keys.join(',')}) VALUES (${placeholders})`;
        db.run(sql, values, function(err) {
            if (err) { res.status(500).json({ error: err.message }); }
            else { res.json({ id: this.lastID }); }
        });
    });

    app.delete(`/api/${tabla}/:id`, verificarToken, (req, res) => {
        db.run(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id], function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ deleted: this.changes });
        });
    });

    // 👇 NUEVA RUTA: Eliminar TODOS los registros de una tabla (para restaurar)
    app.delete(`/api/${tabla}/todos`, verificarToken, (req, res) => {
        db.run(`DELETE FROM ${tabla}`, function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ deleted: this.changes });
        });
    });
}

crearCRUD('diques', ['fecha', 'hora', 'dique', 'operador_entrante', 'operador_saliente', 'cota', 'caudal', 'ph', 'turbiedad', 'situacion', 'detalle', 'usuario']);
crearCRUD('embalses', ['fecha', 'embalse', 'operador_entrante', 'operador_saliente', 'cota_embalse', 'cota_parada', 'cota_arranque', 'diferencia', 'estado', 'observaciones', 'usuario']);
crearCRUD('plantas', ['fecha', 'planta', 'operador_entrante', 'operador_saliente', 'turbiedad', 'color', 'cloro_residual', 'ph', 'produccion', 'sustancias', 'usuario']);
crearCRUD('estaciones', ['fecha', 'estacion', 'operador_entrante', 'operador_saliente', 'tension', 'succion', 'potencia', 'descarga', 'grupos', 'usuario']);
crearCRUD('maniobras', ['fecha', 'hora', 'ubicacion', 'responsable', 'tipo', 'equipo', 'descripcion', 'resultado', 'usuario']);

// ==================== CRUD PRESIONES CORREGIDO ====================
app.get('/api/presiones', verificarToken, (req, res) => {
    db.all('SELECT * FROM presiones ORDER BY id DESC', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/presiones', verificarToken, (req, res) => {
    const { fecha, operador_entrante, operador_saliente, presiones } = req.body;
    let presionesJson = '[]';
    if (Array.isArray(presiones) && presiones.length > 0) {
        presionesJson = JSON.stringify(presiones);
    }
    const sql = `INSERT INTO presiones (fecha, operador_entrante, operador_saliente, presiones) 
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [fecha, operador_entrante, operador_saliente, presionesJson], function(err) {
        if (err) {
            console.error('❌ Error al guardar presiones:', err);
            res.status(500).json({ error: err.message });
        } else {
            console.log('✅ Presiones guardadas con ID:', this.lastID);
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

// 👇 ELIMINAR TODAS LAS PRESIONES (para restaurar)
app.delete('/api/presiones/todos', verificarToken, (req, res) => {
    db.run('DELETE FROM presiones', function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

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

app.post('/api/configuracion', verificarToken, (req, res) => {
    const { tipo, valores } = req.body;
    if (!tipo || !Array.isArray(valores)) return res.status(400).json({ error: 'Datos inválidos' });
    db.run('DELETE FROM configuracion WHERE tipo = ?', [tipo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const stmt = db.prepare('INSERT INTO configuracion (tipo, valor, orden) VALUES (?, ?, ?)');
        valores.forEach((valor, idx) => { stmt.run(tipo, valor, idx); });
        stmt.finalize();
        res.json({ success: true });
    });
});

// ==================== USUARIOS ====================
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

// ==================== REPORTES ====================
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

// ==================== RESPALDOS ====================

// 📋 LISTAR RESPALDOS (SQLite)
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

// 💾 CREAR RESPALDO (SQLite y JSON)
app.post('/api/respaldos', verificarToken, (req, res) => {
    try {
        // Respaldo SQLite
        const dbFile = path.join(__dirname, 'database.sqlite');
        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupsDir, `backup_${fecha}.sqlite`);
        fs.copyFileSync(dbFile, backupFile);
        
        // Respaldo JSON (para descargar y restaurar)
        const jsonFile = path.join(jsonBackupsDir, `respaldo_${fecha}.json`);
        const tablas = ['embalses', 'diques', 'plantas', 'estaciones', 'maniobras', 'presiones'];
        const datos = {};
        let completadas = 0;
        
        tablas.forEach(tabla => {
            db.all(`SELECT * FROM ${tabla}`, (err, rows) => {
                if (err) {
                    datos[tabla] = [];
                } else {
                    datos[tabla] = rows || [];
                }
                completadas++;
                if (completadas === tablas.length) {
                    fs.writeFileSync(jsonFile, JSON.stringify(datos, null, 2));
                    console.log(`✅ Respaldo JSON creado: ${path.basename(jsonFile)}`);
                    res.json({ message: '✅ Respaldo creado', archivo: path.basename(jsonFile) });
                }
            });
        });
        
        // Limpiar respaldos JSON antiguos (mantener últimos 30)
        setTimeout(() => {
            try {
                const jsonArchivos = fs.readdirSync(jsonBackupsDir).filter(f => f.endsWith('.json')).sort();
                if (jsonArchivos.length > 30) {
                    const eliminar = jsonArchivos.slice(0, jsonArchivos.length - 30);
                    eliminar.forEach(f => {
                        fs.unlinkSync(path.join(jsonBackupsDir, f));
                        console.log(`🗑️ Respaldo JSON antiguo eliminado: ${f}`);
                    });
                }
            } catch(e) {}
        }, 1000);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📥 DESCARGAR RESPALDO (JSON)
app.get('/api/respaldos/:nombre', verificarToken, (req, res) => {
    try {
        const { nombre } = req.params;
        // Buscar primero en json_backups, luego en backups
        let filePath = path.join(jsonBackupsDir, nombre);
        if (!fs.existsSync(filePath)) {
            // Si no es JSON, buscar en backups
            filePath = path.join(backupsDir, nombre);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Respaldo no encontrado' });
            }
            // Si es .sqlite, convertirlo a JSON
            if (nombre.endsWith('.sqlite')) {
                return res.status(400).json({ error: 'Formato no soportado para descarga. Use respaldos JSON.' });
            }
        }
        res.download(filePath, nombre, (err) => {
            if (err) {
                console.error('Error al descargar:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al descargar' });
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📤 RESTAURAR DESDE ARCHIVO LOCAL (requiere archivo JSON)
app.post('/api/restaurar', verificarToken, (req, res) => {
    try {
        const datos = req.body;
        const tablas = ['embalses', 'diques', 'plantas', 'estaciones', 'maniobras', 'presiones'];
        let procesadas = 0;
        
        // Verificar que los datos tengan las tablas esperadas
        const tablasFaltantes = tablas.filter(t => !datos[t]);
        if (tablasFaltantes.length > 0) {
            return res.status(400).json({ 
                error: 'Formato inválido. Faltan tablas: ' + tablasFaltantes.join(', ') 
            });
        }
        
        // Procesar cada tabla
        tablas.forEach(tabla => {
            db.run(`DELETE FROM ${tabla}`, function(err) {
                if (err) {
                    console.error(`Error al limpiar ${tabla}:`, err);
                    procesadas++;
                    if (procesadas === tablas.length) {
                        res.json({ success: true, procesadas: procesadas });
                    }
                    return;
                }
                
                const registros = datos[tabla] || [];
                if (registros.length === 0) {
                    procesadas++;
                    if (procesadas === tablas.length) {
                        res.json({ success: true, procesadas: procesadas });
                    }
                    return;
                }
                
                // Insertar registros de la tabla
                let insertados = 0;
                const insertarRegistro = (idx) => {
                    if (idx >= registros.length) {
                        procesadas++;
                        if (procesadas === tablas.length) {
                            res.json({ success: true, procesadas: procesadas });
                        }
                        return;
                    }
                    
                    const registro = registros[idx];
                    const keys = Object.keys(registro).filter(k => k !== 'id' && k !== 'created_at');
                    const placeholders = keys.map(() => '?').join(',');
                    const values = keys.map(k => registro[k]);
                    const sql = `INSERT INTO ${tabla} (${keys.join(',')}) VALUES (${placeholders})`;
                    
                    db.run(sql, values, function(err) {
                        if (err) {
                            console.error(`Error al insertar en ${tabla}:`, err);
                        }
                        insertados++;
                        if (insertados === registros.length) {
                            procesadas++;
                            if (procesadas === tablas.length) {
                                res.json({ success: true, procesadas: procesadas, total: registros.length });
                            }
                        }
                    });
                };
                
                // Iniciar inserción
                insertarRegistro(0);
            });
        });
        
    } catch (error) {
        console.error('Error al restaurar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVIDOR FRONTEND ====================
const frontendPath = path.join(__dirname, 'frontend');
console.log('📁 Ruta del frontend:', frontendPath);
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`\n🚀 GECG - Servidor corriendo en http://localhost:${PORT}`);
    console.log('📝 Credenciales: admin / admin123');
    console.log('📁 Respaldos SQLite: ./backups/');
    console.log('📁 Respaldos JSON: ./json_backups/');
});