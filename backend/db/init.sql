CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    genero VARCHAR(20) NOT NULL CHECK (genero IN ('MASCULINO', 'FEMENINO', 'OTRO', 'PREFIERO_NO_DECIRLO')),
    rol VARCHAR(10) NOT NULL CHECK (rol IN ('ADMIN', 'USER')),
    telefono VARCHAR(20),
    avatar_url VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Si la base de datos ya existia de una entrega anterior (solo con
-- username/password/nombre/rol/creado_en), estas ALTER dejan la tabla al
-- dia sin perder los usuarios que ya estuvieran cargados. En una base
-- nueva no hacen nada porque el CREATE TABLE de arriba ya trae las
-- columnas.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(100) NOT NULL DEFAULT 'Sin apellido';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero VARCHAR(20) NOT NULL DEFAULT 'PREFIERO_NO_DECIRLO';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'usuarios' AND constraint_name = 'usuarios_email_key'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_key UNIQUE (email);
    END IF;
END $$;

-- Tabla para el apartado de "Nuevo Registro". Un "movimiento" es un
-- ingreso o un egreso, tal cual el toggle del maquetado de "Agregar
-- Transaccion". Por ahora la aplicacion solo permite crear movimientos
-- de tipo INGRESO (el toggle de EGRESO queda pendiente para una proxima
-- entrega), pero la tabla ya soporta ambos para no tener que migrar de
-- nuevo cuando se habilite.
CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
    descripcion VARCHAR(100) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha ON movimientos (usuario_id, fecha);
