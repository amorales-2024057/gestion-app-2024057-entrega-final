import { Router } from 'express';
import { movimientoController } from '../controllers/movimiento.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/categorias', movimientoController.categorias);
router.get('/resumen', movimientoController.resumen);
router.get('/', movimientoController.listar);
router.post('/lote', movimientoController.crearLote);
router.post('/', movimientoController.crear);
router.put('/:id', movimientoController.actualizar);
router.delete('/:id', movimientoController.eliminar);

export default router;