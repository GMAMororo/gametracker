import express from 'express';
import cors from 'cors'; // O pacote mágico que libera o acesso
import routes from './routes'; 

const app = express();

// O Render define a porta automaticamente
const PORT = process.env.PORT || 3000;

// --- A CORREÇÃO ESTÁ AQUI ---
// app.use(cors()) sem parâmetros libera para TODO MUNDO.
// É o jeito mais garantido de funcionar agora.
app.use(cors()); 

app.use(express.json());

// Rota de teste para você ver no navegador se a API está viva
app.get('/', (req, res) => {
  res.send('🚀 API GameTracker está rodando e com CORS liberado!');
});

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});