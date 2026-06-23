// ==================== API SERVICE ====================
const API_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('gecg_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('gecg_token', token);
        } else {
            localStorage.removeItem('gecg_token');
        }
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = 'Bearer ' + this.token;
        }

        try {
            const response = await fetch(API_URL + endpoint, {
                ...options,
                headers: headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error en la petición');
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============ AUTENTICACIÓN ============
    async login(username, password) {
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setToken(data.token);
        return data;
    }

    logout() {
        this.setToken(null);
    }

    // ============ CRUD GENÉRICO ============
    async getAll(tabla, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('/' + tabla + (query ? '?' + query : ''));
    }

    async create(tabla, data) {
        return this.request('/' + tabla, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async delete(tabla, id) {
        return this.request('/' + tabla + '/' + id, {
            method: 'DELETE'
        });
    }

    // ============ CONFIGURACIÓN ============
    async getConfiguracion() {
        return this.request('/configuracion');
    }

    // ============ USUARIOS ============
    async getUsuarios() {
        return this.request('/usuarios');
    }

    async crearUsuario(data) {
        return this.request('/usuarios', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async eliminarUsuario(id) {
        return this.request('/usuarios/' + id, {
            method: 'DELETE'
        });
    }

    // ============ REPORTES ============
    async exportarReporte(fechaInicio, fechaFin) {
        return this.request('/reporte/exportar?fecha_inicio=' + fechaInicio + '&fecha_fin=' + fechaFin);
    }
}

// ============ CREAR INSTANCIA GLOBAL ============
const api = new ApiService();