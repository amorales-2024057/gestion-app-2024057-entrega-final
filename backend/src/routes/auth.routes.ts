import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/registro', authController.registrar);
router.post('/google', authController.loginGoogle);
router.get('/perfil', verificarToken, authController.perfil);

export default router;