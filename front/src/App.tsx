import { useState, useEffect } from 'react';
import axios from 'axios';
import { Gamepad2, Search, Library, LogOut, User, Lock, Mail, PlusCircle, ExternalLink, ShoppingBag, AlertTriangle, X, Menu, Trash2, FileText, Info, Settings, Monitor, Gift, Dice5, ArrowRightCircle, HelpCircle, CheckCircle, Trophy, Heart, PlayCircle } from 'lucide-react';

// --- TIPOS ---
interface Game {
  gameID?: string; 
  dealID?: string; 
  cheapestDealID?: string; 
  steamAppID?: string; 
  storeID?: string;
  external?: string; 
  title?: string; 
  thumb: string;
  cheapest?: string; 
  salePrice?: string; 
  normalPrice?: string;
  savings?: string;
  isRegionalPrice?: boolean; 
}

interface SavedGame { 
    id: number; 
    title: string; 
    image: string; 
    price: number; 
    steamId?: string;
    status: 'JOGANDO' | 'DESEJO' | 'ZERADO'; 
}

interface Store { storeID: string; storeName: string; images: { logo: string; icon: string; } }

interface GameDetailsDeal {
  storeID: string;
  dealID: string;
  price: string;
  retailPrice: string;
  savings: string;
}

// Tipo para notificação
interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  // --- CONFIGURAÇÃO DA API (CORRIGIDA) ---
  const API_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000' 
    : 'https://gametracker-api.onrender.com'; // Ajuste se necessário
  
  axios.defaults.baseURL = API_URL;

  // --- LOGIN AUTOMÁTICO ---
  const [user, setUser] = useState<any>(() => {
    try {
        const savedUser = localStorage.getItem('gametracker_user');
        if (!savedUser) return null;
        
        const parsed = JSON.parse(savedUser);
        if (!parsed || !parsed.name || parsed.name.trim() === '') {
            localStorage.removeItem('gametracker_user');
            return null;
        }
        return parsed;
    } catch (e) {
        localStorage.removeItem('gametracker_user');
        return null;
    }
  });
  
  const [abaAtual, setAbaAtual] = useState('inicio');
  
  // Filtro da Biblioteca
  const [filtroBiblioteca, setFiltroBiblioteca] = useState<'JOGANDO' | 'DESEJO' | 'ZERADO'>('JOGANDO');

  // Dados Gerais
  const [ofertas, setOfertas] = useState<Game[]>([]);
  const [jogosBusca, setJogosBusca] = useState<Game[]>([]);
  const [buscou, setBuscou] = useState(false); 
  const [todosJogos, setTodosJogos] = useState<Game[]>([]); 
  const [minhaBiblioteca, setMinhaBiblioteca] = useState<SavedGame[]>([]);
  const [stores, setStores] = useState<Store[]>([]); 
  
  // Listas por Loja
  const [gamesSteam, setGamesSteam] = useState<Game[]>([]);
  const [pageSteam, setPageSteam] = useState(0);

  const [gamesGOG, setGamesGOG] = useState<Game[]>([]);
  const [pageGOG, setPageGOG] = useState(0);

  const [gamesEpic, setGamesEpic] = useState<Game[]>([]);
  const [pageEpic, setPageEpic] = useState(0);

  const [lojaAleatoriaNome, setLojaAleatoriaNome] = useState('Geral');

  // UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jogoSelecionado, setJogoSelecionado] = useState<Game | null>(null);
  const [statusSelecionado, setStatusSelecionado] = useState<'JOGANDO' | 'DESEJO' | 'ZERADO'>('JOGANDO'); 
  
  const [lojasDoJogoSelecionado, setLojasDoJogoSelecionado] = useState<GameDetailsDeal[]>([]); 
  const [descricaoJogo, setDescricaoJogo] = useState<string>('');
  const [carregandoLojas, setCarregandoLojas] = useState(false);
  
  // Estado de Notificação (Toast)
  const [notification, setNotification] = useState<Notification | null>(null);

  // Paginação Geral
  const [paginaTodos, setPaginaTodos] = useState(0);
  const [carregandoTodos, setCarregandoTodos] = useState(false);
  
  // Auth
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Edit Account
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const DOLAR_HOJE = 6.15;

  // FUNÇÃO AUXILIAR PARA MOSTRAR TOAST
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); 
  };

  const formatarPreco = (v: string | number, isRegional: boolean = true) => {
    const n = Number(v);
    
    if (isNaN(n)) return '-';
    if (n === 0) return 'Grátis';
    
    if (isRegional === true) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    } 
    
    const convertido = n * DOLAR_HOJE;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(convertido) + '*';
  };

  // Helper para exibir preço correto na lista de lojas
  const getPrecoLoja = (deal: GameDetailsDeal, jogoBase: Game) => {
      // Se for Steam (ID 1) e o jogo base já tiver preço regional confirmado
      if (deal.storeID === '1' && jogoBase.isRegionalPrice) {
          const precoReal = jogoBase.salePrice || jogoBase.cheapest || 0;
          return formatarPreco(precoReal, true);
      }
      // Para outras lojas (USD), passa false para converter
      return formatarPreco(deal.price, false);
  };

  useEffect(() => { 
    if (user) {
      carregarHome();
      carregarLojas();
      carregarListasIniciais();
      carregarTodosJogos(0);
      setEditName(user.name || ''); 
      setEditEmail(user.email || '');
      carregarBiblioteca(user.id);
    } 
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setBuscou(false);
      setJogosBusca([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (jogoSelecionado) {
      const gid = jogoSelecionado.gameID;
      const sid = jogoSelecionado.steamAppID;
      const title = jogoSelecionado.title; 

      const naLib = minhaBiblioteca.find(g => g.title === title);
      if (naLib) setStatusSelecionado(naLib.status);
      else setStatusSelecionado('JOGANDO');

      if (gid) {
          buscarLojasDetalhadas(gid as string);
      } else if (title) {
          buscarGameIdPorTitulo(title as string);
      } else {
          setLojasDoJogoSelecionado([]);
      }
      
      if (sid && sid !== 'custom') {
          buscarDescricaoSteam(sid as string);
      } else {
          setDescricaoJogo('Descrição indisponível para este título.');
      }
    } else {
      setLojasDoJogoSelecionado([]);
      setDescricaoJogo('');
    }
  }, [jogoSelecionado]);

  const carregarLojas = async () => {
    try {
      const resp = await axios.get('https://www.cheapshark.com/api/1.0/stores');
      setStores(resp.data);
    } catch (e) { console.error('Erro lojas'); }
  }

  const carregarListasIniciais = async () => {
    try {
        const lojasRandom = [2, 3, 11, 15, 21];
        const randomID = lojasRandom[Math.floor(Math.random() * lojasRandom.length)];

        const [resSteam, resGOG, resEpic, resRandom] = await Promise.all([
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=10&onSale=1&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=7&pageSize=10&onSale=1&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=25&pageSize=10&pageNumber=0'),
            axios.get(`https://www.cheapshark.com/api/1.0/deals?storeID=${randomID}&pageSize=10&onSale=1`)
        ]);
        
        setGamesSteam(resSteam.data);
        setGamesGOG(resGOG.data);
        setGamesEpic(resEpic.data);
        setOfertas(resRandom.data);
        setLojaAleatoriaNome(randomID.toString()); 
    } catch (e) { console.error('Erro ao carregar lojas especificas'); }
  }

  const carregarMaisLoja = async (storeID: string, page: number, setList: any, setPage: any) => {
      const nextPage = page + 1;
      try {
          const resp = await axios.get(`https://www.cheapshark.com/api/1.0/deals?storeID=${storeID}&pageSize=10&onSale=1&pageNumber=${nextPage}`);
          if (resp.data && resp.data.length > 0) {
              setList((prev: Game[]) => [...prev, ...resp.data]);
              setPage(nextPage);
          } else {
              showToast('Não há mais jogos para carregar nesta loja.', 'info');
          }
      } catch (e) {
          console.error("Erro ao carregar mais", e);
      }
  }

  const buscarDescricaoSteam = async (steamId: string) => {
    setDescricaoJogo('Carregando sinopse...');
    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = `https://store.steampowered.com/api/appdetails?appids=${steamId}&l=brazilian`;
      const resp = await axios.get(proxyUrl + encodeURIComponent(targetUrl));
      
      if (resp.data && resp.data[steamId] && resp.data[steamId].success) {
        setDescricaoJogo(resp.data[steamId].data.short_description);
      } else {
        setDescricaoJogo('Detalhes não disponíveis na Steam.');
      }
    } catch (e) {
      setDescricaoJogo('Falha ao carregar descrição.');
    }
  }

  const buscarGameIdPorTitulo = async (titulo: string) => {
      setCarregandoLojas(true);
      try {
          const resp = await axios.get(`https://www.cheapshark.com/api/1.0/games?title=${titulo}&limit=1`);
          if (resp.data && resp.data.length > 0) {
              buscarLojasDetalhadas(resp.data[0].gameID);
          } else {
              setLojasDoJogoSelecionado([]);
              setCarregandoLojas(false);
          }
      } catch (e) {
          setCarregandoLojas(false);
      }
  }

  const buscarLojasDetalhadas = async (gameID: string) => {
    setCarregandoLojas(true);
    try {
      const resp = await axios.get(`https://www.cheapshark.com/api/1.0/games?id=${gameID}`);
      setLojasDoJogoSelecionado(resp.data.deals || []);
    } catch (e) {
      console.error("Erro detalhes", e);
    } finally {
      setCarregandoLojas(false);
    }
  }

  const carregarHome = async () => { };

  const carregarTodosJogos = async (pagina: number) => {
    setCarregandoTodos(true);
    try {
      const resp = await axios.get(`/api/games/deals/ofertas?page=${pagina}&pageSize=12`); 
      
      if (resp.data && resp.data.length > 0) {
        setTodosJogos(prev => {
          const normalize = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const listaAtual = pagina === 0 ? [] : [...prev];
          const mapaUnico = new Map();
          
          listaAtual.forEach(g => mapaUnico.set(normalize(g.title || ''), g));
          resp.data.forEach((g: Game) => {
             const key = normalize(g.title || '');
             if (!mapaUnico.has(key)) mapaUnico.set(key, g);
          });
          return Array.from(mapaUnico.values());
        });
        setPaginaTodos(pagina);
      }
    } catch (e) { console.error('Erro todos jogos'); }
    finally { setCarregandoTodos(false); }
  };

  const fazerLogin = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(''); 
    try { 
      const resp = await axios.post('/api/login', { username, password }); 
      setUser(resp.data);
      localStorage.setItem('gametracker_user', JSON.stringify(resp.data));
      carregarBiblioteca(resp.data.id); 
    } catch (err: any) { 
      setAuthError(err.response?.data?.error || 'Falha no login'); 
    } 
  };

  const criarConta = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(''); 
    if (password !== confirmPassword) { setAuthError('Senhas não conferem!'); return; } 
    try { 
      await axios.post('/api/users', { name: username, email, password, confirmPassword }); 
      showToast('Conta criada com sucesso! Faça login.'); 
      setIsRegisterMode(false); 
    } catch (err: any) { 
      setAuthError(err.response?.data?.error || 'Erro ao criar'); 
    } 
  };

  const carregarBiblioteca = async (uid: number) => { 
    try { 
      const resp = await axios.get(`/api/games/${uid}`); 
      setMinhaBiblioteca(resp.data); 
    } catch (e) { } 
  };

  const buscarJogos = async () => { 
    if(!searchQuery) return; 
    try { 
      const resp = await axios.get(`/api/games/search?name=${searchQuery}`); 
      setJogosBusca(resp.data); 
      setBuscou(true); 
    } catch (e) { showToast('Erro ao buscar jogos', 'error'); } 
  };
  
  const deletarJogo = async (id: number) => { 
    try {
      await axios.delete(`/api/games/${id}`); 
      if (user) carregarBiblioteca(user.id);
      showToast('Jogo removido da biblioteca', 'info');
    } catch (e) {
      showToast('Erro ao remover jogo', 'error');
    }
  };
  
  const salvarOuAtualizarJogo = async (jogo: Game) => {
    if (!user) return;
    
    const jogoExistente = minhaBiblioteca.find(salvo => 
        (salvo.title.toLowerCase() === (jogo.title || '').toLowerCase()) || 
        (salvo.steamId && salvo.steamId === jogo.steamAppID)
    );

    if (jogoExistente) {
        if (jogoExistente.status !== statusSelecionado) {
            try {
                await axios.put(`/api/games/${jogoExistente.id}`, { status: statusSelecionado });
                showToast(`Status alterado para ${statusSelecionado}!`, 'success');
                carregarBiblioteca(user.id);
                setJogoSelecionado(null);
            } catch(e) { showToast('Erro ao atualizar status', 'error'); }
        } else {
            showToast('Jogo já está na lista com esse status!', 'info');
        }
        return;
    }

    const titulo = jogo.external || jogo.title || 'Jogo';
    const preco = jogo.cheapest || jogo.salePrice || '0';
    const idSteam = jogo.steamAppID || jogo.gameID || jogo.dealID || '0';
    try {
        await axios.post('/api/games', { 
            steamId: idSteam, 
            title: titulo, 
            image: jogo.thumb, 
            price: preco, 
            userId: user.id,
            status: statusSelecionado 
        });
        showToast('Adicionado à biblioteca com sucesso!'); 
        carregarBiblioteca(user.id);
        setJogoSelecionado(null);
        setSearchQuery(''); 
    } catch (e) { showToast('Erro ao salvar o jogo', 'error'); }
  };

  const atualizarConta = async () => {
    if (!oldPassword) return showToast('Confirme sua senha atual para salvar.', 'error');
    if (newPassword && newPassword !== confirmNewPassword) return showToast('Confirmação de senha incorreta.', 'error');
    
    if (!editName.trim() || !editEmail.trim()) {
        return showToast('Nome e Email não podem ser vazios.', 'error');
    }

    try {
        const payload: any = { name: editName, email: editEmail };
        if (newPassword) payload.password = newPassword;
        const resp = await axios.put(`/api/users/${user.id}`, payload);
        setUser(resp.data);
        localStorage.setItem('gametracker_user', JSON.stringify(resp.data));
        showToast('Conta atualizada com sucesso!'); 
        setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (e) { showToast('Erro ao atualizar conta.', 'error'); }
  };

  const logout = () => { 
    setUser(null); 
    setUsername(''); 
    setPassword('');
    localStorage.removeItem('gametracker_user');
  };

  const abrirDetalhesBiblioteca = (jogoSalvo: SavedGame) => {
      const gameAdaptado: Game = {
          gameID: undefined, 
          dealID: undefined,
          steamAppID: jogoSalvo.steamId,
          storeID: '1', 
          external: jogoSalvo.title,
          title: jogoSalvo.title,
          thumb: jogoSalvo.image,
          cheapest: jogoSalvo.price.toString(),
          salePrice: jogoSalvo.price.toString(),
          normalPrice: jogoSalvo.price.toString(),
          savings: '0',
          isRegionalPrice: true 
      };
      setJogoSelecionado(gameAdaptado);
  };

  const getStoreInfo = (id?: string) => {
    if (!id) return { name: 'Loja Externa', icon: '' };
    const store = stores.find(s => s.storeID === id);
    if (!store) return { name: 'Loja Parceira', icon: '' };
    return { name: store.storeName, icon: `https://www.cheapshark.com${store.images.icon}` };
  };

  const getUrlMelhorOferta = (jogo: Game, lojasDetalhes: GameDetailsDeal[]) => {
      if (lojasDetalhes && lojasDetalhes.length > 0) {
          const melhorDeal = lojasDetalhes.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
          if (melhorDeal) return `https://www.cheapshark.com/redirect?dealID=${melhorDeal.dealID}`;
      }
      if (jogo.dealID) return `https://www.cheapshark.com/redirect?dealID=${jogo.dealID}`;
      if (jogo.cheapestDealID) return `https://www.cheapshark.com/redirect?dealID=${jogo.cheapestDealID}`;
      if (jogo.steamAppID && jogo.steamAppID !== 'custom') return `https://store.steampowered.com/app/${jogo.steamAppID}`;
      return '#';
  };

  const GlobalStyles = () => (
    <style>{`
      * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      body { margin: 0; padding: 0; background-color: #09090b; color: #e4e4e7; width: 100vw; overflow-x: hidden; }
      input:focus { outline: 2px solid #8b5cf6; border-color: transparent; }
      button { cursor: pointer; transition: 0.2s; }
      button:active { transform: scale(0.96); }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #18181b; }
      ::-webkit-scrollbar-thumb { background: #3f3f46; borderRadius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
      .card-hover:hover { transform: translateY(-5px); border-color: #8b5cf6 !important; }
      .sidebar-link:hover { background-color: #27272a; color: #fff !important; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .modal-backdrop { animation: fadeIn 0.2s ease-out; }
      
      /* Toast Animation */
      @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .toast { animation: slideDown 0.3s ease-out; }

      @media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-header { display: flex !important; } }
      @media (min-width: 769px) { .mobile-header { display: none !important; } }
    `}</style>
  );

  // --- AUTH ---
  if (!user) {
    return (
      <div style={styles.authContainer}>
        <GlobalStyles />
        <div style={styles.authBox}>
          <div style={{textAlign: 'center', marginBottom: 30}}>
            <h1 style={{fontSize: 32, fontWeight: 'bold', margin: '0 0 10px', background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>GameTracker</h1>
            <p style={{color: '#71717a', fontSize: 14}}>Sua biblioteca definitiva</p>
          </div>
          {authError && <div style={styles.errorAlert}>{authError}</div>}
          
          {/* TOAST DE LOGIN/CADASTRO */}
          {notification && (
            <div className="toast" style={styles.toast(notification.type)}>
                {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                {notification.message}
            </div>
          )}

          <form onSubmit={isRegisterMode ? criarConta : fazerLogin} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
            <InputIcon icon={<User size={18} />} type="text" placeholder="Usuário" value={username} onChange={(e: any) => setUsername(e.target.value)} />
            {isRegisterMode && <InputIcon icon={<Mail size={18} />} type="email" placeholder="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} />}
            <InputIcon icon={<Lock size={18} />} type="password" placeholder="Senha" value={password} onChange={(e: any) => setPassword(e.target.value)} />
            {isRegisterMode && <InputIcon icon={<Lock size={18} />} type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />}
            <button type="submit" style={styles.btnPrimary}>{isRegisterMode ? 'Criar Conta' : 'Entrar'}</button>
          </form>
          <p style={{textAlign: 'center', marginTop: 20, fontSize: 14, color: '#71717a'}}>
            {isRegisterMode ? 'Já tem conta?' : 'Novo aqui?'}
            <button onClick={() => {setIsRegisterMode(!isRegisterMode); setAuthError('')}} style={styles.btnLink}>{isRegisterMode ? 'Fazer Login' : 'Cadastre-se'}</button>
          </p>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div style={{display: 'flex', minHeight: '100vh', width: '100vw'}}>
      <GlobalStyles />

      {notification && (
        <div className="toast" style={styles.toastFloating(notification.type)}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : notification.type === 'info' ? <Info size={20}/> : <AlertTriangle size={20} />}
            {notification.message}
        </div>
      )}

      {/* MODAL DETALHES & STATUS */}
      {jogoSelecionado && (
        <div className="modal-backdrop" style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button onClick={() => setJogoSelecionado(null)} style={styles.modalClose}><X /></button>
            <div style={styles.modalHeaderImage}>
              <img src={jogoSelecionado.thumb} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div style={styles.modalTitleOverlay}>
                <h2 style={{margin: 0, fontSize: 24, textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>{jogoSelecionado.external || jogoSelecionado.title}</h2>
              </div>
            </div>
            <div style={{padding: 25, maxHeight: '60vh', overflowY: 'auto'}}>
              {!jogoSelecionado.isRegionalPrice && jogoSelecionado.salePrice !== '0' && (
                 <div style={styles.alertBox}>
                    <AlertTriangle size={20} />
                    <span>Atenção: Preço convertido do Dólar. Valor real pode variar.</span>
                 </div>
              )}

              {/* SELETOR DE STATUS */}
              <div style={{background: '#27272a', borderRadius: 12, padding: 15, marginBottom: 20, display: 'flex', gap: 10, justifyContent: 'space-between'}}>
                 <button onClick={() => setStatusSelecionado('JOGANDO')} style={{...styles.statusButton, background: statusSelecionado === 'JOGANDO' ? '#3b82f6' : 'transparent', border: statusSelecionado === 'JOGANDO' ? 'none' : '1px solid #3f3f46'}}>
                    <PlayCircle size={18} /> Jogando
                 </button>
                 <button onClick={() => setStatusSelecionado('DESEJO')} style={{...styles.statusButton, background: statusSelecionado === 'DESEJO' ? '#f43f5e' : 'transparent', border: statusSelecionado === 'DESEJO' ? 'none' : '1px solid #3f3f46'}}>
                    <Heart size={18} /> Desejos
                 </button>
                 <button onClick={() => setStatusSelecionado('ZERADO')} style={{...styles.statusButton, background: statusSelecionado === 'ZERADO' ? '#eab308' : 'transparent', border: statusSelecionado === 'ZERADO' ? 'none' : '1px solid #3f3f46'}}>
                    <Trophy size={18} /> Zerado
                 </button>
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <a href={getUrlMelhorOferta(jogoSelecionado, lojasDoJogoSelecionado)} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                   <span style={{fontSize: 14, color: '#a1a1aa', display: 'block'}}>Melhor oferta encontrada</span>
                   <div style={{fontSize: 28, fontWeight: 'bold', color: '#c084fc', display: 'flex', alignItems: 'center', gap: 5}}>
                     {formatarPreco(jogoSelecionado.salePrice || jogoSelecionado.cheapest || 0, jogoSelecionado.isRegionalPrice)}
                     <ExternalLink size={20} />
                   </div>
                </a>
                <button onClick={() => salvarOuAtualizarJogo(jogoSelecionado)} style={styles.btnModalSave}>
                   <PlusCircle size={20} /> {minhaBiblioteca.find(g => g.title === jogoSelecionado.title) ? 'Atualizar Status' : 'Salvar na Biblioteca'}
                </button>
              </div>

              <div style={{marginBottom: 25}}>
                <h4 style={{fontSize: 16, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8}}><FileText size={18} color="#8b5cf6" /> Sobre o jogo</h4>
                <p style={{fontSize: 14, color: '#a1a1aa', lineHeight: '1.6', background: '#27272a', padding: 15, borderRadius: 8}}>{descricaoJogo}</p>
              </div>

              <div style={{background: '#27272a', borderRadius: 8, padding: 15}}>
                <h4 style={{margin: '0 0 10px 0', fontSize: 14, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1}}>Outras Lojas ({lojasDoJogoSelecionado.length})</h4>
                {carregandoLojas ? <div style={{color: '#71717a', padding: 10}}>Buscando...</div> : (
                  <>
                    {lojasDoJogoSelecionado.length > 0 ? lojasDoJogoSelecionado.map((deal, idx) => (
                      <a key={idx} href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`} target="_blank" rel="noreferrer" style={{...styles.storeRow, borderTop: idx > 0 ? '1px solid #3f3f46' : 'none'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                          {getStoreInfo(deal.storeID).icon ? <img src={getStoreInfo(deal.storeID).icon} style={{width: 20, height: 20, borderRadius: 2}} /> : <ShoppingBag size={20} color="#fff" />}
                          <div>
                            <span style={{fontWeight: 'bold', color: '#fff', display: 'block'}}>{getStoreInfo(deal.storeID).name}</span>
                            {/* CORREÇÃO AQUI: Usa getPrecoLoja para decidir se converte ou não */}
                            <span style={{fontSize: 12, color: '#4ade80'}}>{getPrecoLoja(deal, jogoSelecionado)}</span>
                          </div>
                        </div>
                        <ExternalLink size={16} color="#71717a" />
                      </a>
                    )) : <div style={{padding: 10, color: '#71717a'}}>Nenhuma outra loja encontrada nas ofertas atuais.</div>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR & NAV */}
      <aside className="desktop-sidebar" style={styles.sidebar}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, padding: '0 10px'}}>
          <Gamepad2 size={28} color="#8b5cf6" />
          <span style={{fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5}}>GameTracker</span>
        </div>
        <nav style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 5}}>
          <MenuButton active={abaAtual === 'inicio'} onClick={() => setAbaAtual('inicio')} icon={<Search size={20}/>} label="Explorar" />
          <MenuButton active={abaAtual === 'biblioteca'} onClick={() => setAbaAtual('biblioteca')} icon={<Library size={20}/>} label="Biblioteca" />
          <MenuButton active={abaAtual === 'conta'} onClick={() => setAbaAtual('conta')} icon={<Settings size={20}/>} label="Minha Conta" />
        </nav>
        <div style={styles.userFooter}>
          <div style={{width: 35, height: 35, borderRadius: '50%', background: 'linear-gradient(45deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
            {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : '?'}
          </div>
          <div style={{flex: 1, overflow: 'hidden'}}>
            <div style={{fontWeight: 600, fontSize: 14}}>{user.name}</div>
            <div style={{fontSize: 12, color: '#4ade80'}}>Online</div>
          </div>
          <button onClick={logout} style={{background: 'none', border: 'none', color: '#ef4444', padding: 5}}><LogOut size={18}/></button>
        </div>
      </aside>

      <div className="mobile-header" style={styles.mobileHeader}>
        <span style={{fontWeight: 'bold', fontSize: 18}}>GameTracker</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{background: 'none', border: 'none', color: '#fff'}}>{mobileMenuOpen ? <X /> : <Menu />}</button>
      </div>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <button onClick={() => {setAbaAtual('inicio'); setMobileMenuOpen(false)}} style={styles.mobileMenuItem}>Explorar</button>
          <button onClick={() => {setAbaAtual('biblioteca'); setMobileMenuOpen(false)}} style={styles.mobileMenuItem}>Biblioteca</button>
          <button onClick={() => {setAbaAtual('conta'); setMobileMenuOpen(false)}} style={styles.mobileMenuItem}>Minha Conta</button>
          <button onClick={logout} style={{...styles.mobileMenuItem, color: '#ef4444'}}>Sair</button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main style={{flex: 1, padding: 30, background: '#09090b', overflowY: 'auto', height: '100vh', width: '100%'}}>
        
        {abaAtual === 'inicio' && (
          <div style={{maxWidth: 1600, margin: '0 auto', width: '100%'}}>
            <div style={styles.heroBox}>
              <Search color="#71717a" />
              <input value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && buscarJogos()} placeholder="Pesquisar jogos..." style={styles.heroInput} />
              <button onClick={buscarJogos} style={styles.btnSearch}>Buscar</button>
            </div>

            {/* SEÇÃO DE RESULTADOS DA BUSCA */}
            {buscou && jogosBusca.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#71717a', background: '#18181b', borderRadius: 16, border: '1px solid #27272a'}}>
                    <HelpCircle size={48} style={{marginBottom: 10}} />
                    <p style={{fontSize: 18, marginBottom: 5}}>Nenhum jogo encontrado para "{searchQuery}".</p>
                    <p style={{fontSize: 14, marginBottom: 20}}>Dica: Jogos exclusivos da Epic Games (como Fortnite) ou de console podem não aparecer na busca.</p>
                </div>
            ) : jogosBusca.length > 0 && (
                <Section title="Resultados da Busca" icon={<Search color="#60a5fa" />}>
                    <div style={styles.grid}>
                    {jogosBusca.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} />)}
                    </div>
                </Section>
            )}

            {!buscou && (
                <>
                    <Section title="Destaques Steam" icon={<Gamepad2 color="#171a21" fill="#fff" />}>
                    <div className="scroll-row" style={styles.scrollRow}>
                        {gamesSteam.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} minW={240} />)}
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 100}}>
                        <button onClick={() => carregarMaisLoja("1", pageSteam, setGamesSteam, setPageSteam)} style={styles.btnLoadMoreSmall} title="Carregar mais"><ArrowRightCircle size={32}/></button>
                        </div>
                    </div>
                    </Section>

                    <Section title="Ofertas GOG" icon={<Monitor color="#a855f7" />}>
                    <div className="scroll-row" style={styles.scrollRow}>
                        {gamesGOG.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} minW={240} />)}
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 100}}>
                        <button onClick={() => carregarMaisLoja("7", pageGOG, setGamesGOG, setPageGOG)} style={styles.btnLoadMoreSmall} title="Carregar mais"><ArrowRightCircle size={32}/></button>
                        </div>
                    </div>
                    </Section>

                    <Section title="Epic Games Store" icon={<Gift color="#facc15" />}>
                    <div className="scroll-row" style={styles.scrollRow}>
                        {gamesEpic.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} minW={240} />)}
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 100}}>
                        <button onClick={() => carregarMaisLoja("25", pageEpic, setGamesEpic, setPageEpic)} style={styles.btnLoadMoreSmall} title="Carregar mais"><ArrowRightCircle size={32}/></button>
                        </div>
                    </div>
                    </Section>

                    <Section title={`Ofertas em Destaque (${getStoreInfo(lojaAleatoriaNome).name || 'Lojas Parceiras'})`} icon={<Dice5 color="#f472b6" />}>
                    <div className="scroll-row" style={styles.scrollRow}>
                        {ofertas.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} minW={240} isDeal />)}
                    </div>
                    </Section>

                    <div style={{marginTop: 60, paddingTop: 40, borderTop: '1px solid #27272a'}}>
                    <Section title="Todos os Jogos (Mix)" icon={<Gamepad2 color="#a78bfa" />}>
                        <div style={styles.grid}>
                            {todosJogos.map((j, i) => <Card key={i} data={j} onClick={() => setJogoSelecionado(j)} fmt={formatarPreco} />)}
                        </div>
                        <div style={{marginTop: 40, textAlign: 'center'}}>
                            <button onClick={() => carregarTodosJogos(paginaTodos + 1)} disabled={carregandoTodos} style={styles.btnLoadMore}>
                            {carregandoTodos ? 'Carregando...' : 'Carregar Mais Jogos'}
                            </button>
                        </div>
                    </Section>
                    </div>
                </>
            )}
          </div>
        )}

        {abaAtual === 'biblioteca' && (
          <div style={{maxWidth: 1600, margin: '0 auto', width: '100%'}}>
            <header style={{borderBottom: '1px solid #27272a', paddingBottom: 20, marginBottom: 30, display: 'flex', alignItems: 'center', gap: 20}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <Library color="#8b5cf6" size={32} />
                  <h2 style={{fontSize: 28, fontWeight: 'bold', margin: 0}}>Minha Coleção</h2>
              </div>
              {/* FILTROS DA BIBLIOTECA */}
              <div style={{display: 'flex', gap: 10}}>
                  <button onClick={() => setFiltroBiblioteca('JOGANDO')} style={{...styles.filterButton, background: filtroBiblioteca === 'JOGANDO' ? '#3b82f6' : 'transparent'}}>Jogando</button>
                  <button onClick={() => setFiltroBiblioteca('DESEJO')} style={{...styles.filterButton, background: filtroBiblioteca === 'DESEJO' ? '#f43f5e' : 'transparent'}}>Desejos</button>
                  <button onClick={() => setFiltroBiblioteca('ZERADO')} style={{...styles.filterButton, background: filtroBiblioteca === 'ZERADO' ? '#eab308' : 'transparent'}}>Zerados</button>
              </div>
            </header>
            
            {minhaBiblioteca.filter(g => g.status === filtroBiblioteca).length === 0 ? (
              <div style={{textAlign: 'center', padding: 80, color: '#52525b'}}>
                <Gamepad2 size={64} style={{marginBottom: 20}} />
                <p>Nenhum jogo nesta lista.</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {minhaBiblioteca.filter(g => g.status === filtroBiblioteca).map(j => (
                  <div key={j.id} className="card-hover" style={styles.card} onClick={() => abrirDetalhesBiblioteca(j)}>
                    <div style={{height: 160, position: 'relative'}}>
                      <img src={j.image} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      <button onClick={(e) => {e.stopPropagation(); deletarJogo(j.id)}} style={styles.btnDelete} title="Remover"><Trash2 size={16}/></button>
                    </div>
                    <div style={{padding: 15}}>
                      <h4 style={styles.cardTitle}>{j.title}</h4>
                      <div style={{color: '#4ade80', fontSize: 14, marginTop: 5}}>{formatarPreco(j.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {abaAtual === 'conta' && (
          <div style={{maxWidth: 600, margin: '0 auto', width: '100%'}}>
            <header style={{borderBottom: '1px solid #27272a', paddingBottom: 20, marginBottom: 30, display: 'flex', alignItems: 'center', gap: 10}}>
              <Settings color="#8b5cf6" size={32} />
              <h2 style={{fontSize: 28, fontWeight: 'bold', margin: 0}}>Minha Conta</h2>
            </header>
            <div style={{background: '#18181b', borderRadius: 16, border: '1px solid #27272a', padding: 30}}>
                <div style={{marginBottom: 20}}>
                    <label style={{display: 'block', color: '#a1a1aa', marginBottom: 8, fontSize: 14}}>Nome de Usuário</label>
                    <InputIcon icon={<User size={18}/>} value={editName} onChange={(e: any) => setEditName(e.target.value)} />
                </div>
                <div style={{marginBottom: 20}}>
                    <label style={{display: 'block', color: '#a1a1aa', marginBottom: 8, fontSize: 14}}>Email</label>
                    <InputIcon icon={<Mail size={18}/>} value={editEmail} onChange={(e: any) => setEditEmail(e.target.value)} />
                </div>
                <div style={{borderTop: '1px solid #27272a', margin: '30px 0'}}></div>
                <h3 style={{fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#fff'}}>Alterar Senha</h3>
                <div style={{marginBottom: 20}}>
                    <label style={{display: 'block', color: '#a1a1aa', marginBottom: 8, fontSize: 14}}>Senha Atual (Obrigatório)</label>
                    <InputIcon icon={<Lock size={18}/>} type="password" placeholder="Digite sua senha atual" value={oldPassword} onChange={(e: any) => setOldPassword(e.target.value)} />
                </div>
                <div style={{marginBottom: 20}}>
                    <label style={{display: 'block', color: '#a1a1aa', marginBottom: 8, fontSize: 14}}>Nova Senha</label>
                    <InputIcon icon={<Lock size={18}/>} type="password" placeholder="Opcional" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} />
                </div>
                <div style={{marginBottom: 20}}>
                    <label style={{display: 'block', color: '#a1a1aa', marginBottom: 8, fontSize: 14}}>Confirmar Nova Senha</label>
                    <InputIcon icon={<Lock size={18}/>} type="password" placeholder="Confirme a nova senha" value={confirmNewPassword} onChange={(e: any) => setConfirmNewPassword(e.target.value)} />
                </div>
                <button onClick={atualizarConta} style={{...styles.btnPrimary, marginTop: 10}}>Salvar Alterações</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const InputIcon = ({icon, ...props}: any) => (
  <div style={{position: 'relative'}}><div style={{position: 'absolute', left: 12, top: 12, color: '#71717a'}}>{icon}</div><input {...props} style={styles.input} /></div>
);
const MenuButton = ({active, onClick, icon, label}: any) => (
  <button onClick={onClick} className="sidebar-link" style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 8, border: 'none', background: active ? '#8b5cf6' : 'transparent', color: active ? '#fff' : '#a1a1aa', width: '100%', fontSize: 15, fontWeight: 500, textAlign: 'left'}}>{icon} {label}</button>
);
const Section = ({title, icon, children}: any) => (
  <div style={{marginBottom: 50}}><div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20}}>{icon} <h3 style={{fontSize: 22, fontWeight: 'bold', margin: 0}}>{title}</h3></div>{children}</div>
);
const Card = ({data, onClick, fmt, minW, isDeal}: any) => {
  const title = data.external || data.title;
  const price = isDeal ? data.salePrice : (data.cheapest || data.salePrice);
  return (
    <div className="card-hover" onClick={onClick} style={{...styles.card, minWidth: minW || 'auto', cursor: 'pointer'}}>
      <div style={{height: 180, position: 'relative'}}>
        <img src={data.thumb} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        {isDeal && <span style={styles.dealBadge}>OFF</span>}
      </div>
      <div style={{padding: 15, display: 'flex', flexDirection: 'column', height: 120}}>
        <h4 style={styles.cardTitle} title={title}>{title}</h4>
        <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            {isDeal && <div style={{textDecoration: 'line-through', fontSize: 12, color: '#71717a'}}>{fmt(data.normalPrice, data.isRegionalPrice)}</div>}
            <div style={{color: '#c084fc', fontWeight: 'bold', fontSize: 18}}>{fmt(price, data.isRegionalPrice)}</div>
          </div>
          <div style={{background: '#27272a', padding: 8, borderRadius: 6, color: '#a1a1aa'}}><PlusCircle size={20}/></div>
        </div>
      </div>
    </div>
  );
};

const styles: any = {
  authContainer: { minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', padding: 20, position: 'fixed', top: 0, left: 0 },
  authBox: { width: '100%', maxWidth: 400, background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' },
  errorAlert: { background: 'rgba(239,68,68,0.1)', border: '1px solid #991b1b', color: '#fca5a5', padding: 10, borderRadius: 8, fontSize: 14, marginBottom: 20, textAlign: 'center' },
  input: { width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '12px 12px 12px 40px', color: '#fff', fontSize: 14 },
  btnPrimary: { width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(to right, #8b5cf6, #6366f1)', color: '#fff', fontWeight: 'bold', fontSize: 15, marginTop: 10 },
  btnLink: { background: 'none', border: 'none', color: '#a78bfa', fontWeight: 'bold', marginLeft: 5 },
  sidebar: { width: 260, background: '#18181b', borderRight: '1px solid #27272a', padding: 20, display: 'flex', flexDirection: 'column', height: '100vh' },
  userFooter: { marginTop: 'auto', paddingTop: 15, borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 10 },
  mobileHeader: { padding: 15, background: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mobileMenu: { position: 'absolute', top: 60, left: 0, right: 0, background: '#18181b', borderBottom: '1px solid #27272a', padding: 20, zIndex: 100 },
  mobileMenuItem: { width: '100%', padding: 15, textAlign: 'left', background: 'none', border: 'none', color: '#fff', borderBottom: '1px solid #27272a', fontSize: 16 },
  heroBox: { background: '#18181b', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, border: '1px solid #27272a' },
  heroInput: { flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 16, padding: 10, outline: 'none' },
  btnSearch: { background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 },
  scrollRow: { display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 15 },
  card: { background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', transition: '0.2s', display: 'flex', flexDirection: 'column', cursor: 'pointer' },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f4f4f5' },
  dealBadge: { position: 'absolute', top: 10, left: 10, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 'bold', padding: '2px 6px', borderRadius: 4 },
  btnSave: { background: '#27272a', border: 'none', color: '#e4e4e7', padding: 8, borderRadius: 6 },
  btnDelete: { position: 'absolute', top: 10, right: 10, background: 'rgba(220, 38, 38, 0.9)', border: 'none', color: '#fff', padding: 8, borderRadius: '50%' },
  badge: { background: '#27272a', color: '#a1a1aa', fontSize: 14, padding: '2px 10px', borderRadius: 12 },
  btnLoadMore: { background: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '12px 30px', borderRadius: 8, fontSize: 16, cursor: 'pointer', marginTop: 20 },
  btnLoadMoreSmall: { background: '#18181b', border: '1px dashed #3f3f46', borderRadius: 12, width: 60, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', transition: '0.2s', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, background: '#18181b', borderRadius: 16, overflow: 'hidden', border: '1px solid #3f3f46', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  modalClose: { position: 'absolute', top: 15, right: 15, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: 5, zIndex: 10 },
  modalHeaderImage: { width: '100%', height: 250, position: 'relative' },
  modalTitleOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #18181b, transparent)', padding: '40px 25px 15px 25px' },
  btnModalSave: { background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 },
  storeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', textDecoration: 'none', transition: '0.2s' },
  alertBox: { background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.5)', color: '#fef08a', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' },
  statusButton: { padding: '10px 15px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff', flex: 1, justifyContent: 'center' },
  filterButton: { padding: '8px 16px', borderRadius: 20, border: '1px solid #3f3f46', color: '#fff', cursor: 'pointer', fontSize: 14, transition: '0.2s' },
  
  // TOAST STYLES
  toast: (type: string) => ({
    padding: '12px 20px', 
    borderRadius: 8, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10, 
    fontSize: 14, 
    fontWeight: 500,
    marginBottom: 20,
    background: type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
    border: type === 'error' ? '1px solid #b91c1c' : '1px solid #15803d',
    color: type === 'error' ? '#fca5a5' : '#86efac'
  }),
  toastFloating: (type: string) => ({
    position: 'fixed' as const,
    top: 20,
    right: 20,
    zIndex: 2000,
    padding: '15px 25px',
    borderRadius: 12,
    display: 'flex', 
    alignItems: 'center', 
    gap: 12,
    fontSize: 15,
    fontWeight: 'bold',
    background: '#18181b',
    borderLeft: `5px solid ${type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#22c55e'}`,
    color: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
  })
};

export default App;