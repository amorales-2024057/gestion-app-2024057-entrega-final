import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Buscar y cargar el archivo .env desde las rutas más comunes (desarrollo y producción)
const posiblesRutasEnv = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'src/.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
];

for (const ruta of posiblesRutasEnv) {
    if (fs.existsSync(ruta)) {
        dotenv.config({ path: ruta });
        break;
    }
}

export const env = {
    port: Number(process.env.PORT) || 4000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'finanzas_personales',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
    },
    jwtSecret: process.env.JWT_SECRET || 'Koda2021@',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '4h',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    googleClientId:
        process.env.GOOGLE_CLIENT_ID ||
        '54233591416-tl9qusi7f4vq8co8evl3g8dpvti5u0em.apps.googleusercontent.com',
};