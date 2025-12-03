import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÃO DO CORS (O PORTEIRO) ---
// Isso libera qualquer site (*) de acessar seu servidor
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
// -----------------------------------------

app.use(express.json());

// Log para avisar que uma requisição chegou (ajuda a debugar)
app.use((req, res, next) => {
  console.log(`> Requisição recebida: ${req.method} ${req.url}`);
  next();
});

app.use(routes);

app.listen(PORT, () => {
  console.log(`🔥 Servidor NOVO rodando na porta ${PORT}`);
  console.log(`🔓 CORS liberado para todos os sites`);
});