import dotenv from 'dotenv';

dotenv.config();

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
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};