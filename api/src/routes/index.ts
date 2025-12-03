import { Router } from 'express';
import { 
  searchGame, 
  saveGame, 
  getLibrary, 
  deleteGame, 
  updateGame, 
  getDeals, 
  getTopRated 
} from '../controllers/GameController';
import { createUser, login, updateUser, deleteUser } from '../controllers/UserController';

const router = Router();

// --- JOGOS (ORDEM IMPORTA MUITO AQUI!) ---

// 1º Rotas Estáticas (Nomes fixos)
router.get('/games/search', searchGame);          // /api/games/search
router.get('/games/deals/ofertas', getDeals);     // /api/games/deals/ofertas
router.get('/games/deals/top', getTopRated);      // /api/games/deals/top

// 2º Rotas Dinâmicas (Variáveis)
// Se colocar isso antes das de cima, o Express acha que "deals" é um ID de usuário!
router.get('/games/:userId', getLibrary);         // /api/games/123
router.post('/games', saveGame);
router.delete('/games/:id', deleteGame);
router.put('/games/:id', updateGame);

// --- USUÁRIOS ---
router.post('/users', createUser);
router.post('/login', login);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;