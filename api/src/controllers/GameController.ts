import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- HELPERS ---
const getSteamPrice = async (steamAppID: string) => {
    try {
        const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppID}&cc=br&filters=price_overview,basic`;
        const response = await axios.get(url);
        const gameData = response.data[steamAppID];
        if (gameData && gameData.success) {
            if (gameData.data.is_free) return 0; 
            if (gameData.data.price_overview) return gameData.data.price_overview.final / 100;
        }
        return null;
    } catch (error) { return null; }
};

const converterParaBRL = async (games: any[]) => {
    return Promise.all(games.map(async (game: any) => {
        let realPrice = game.salePrice || game.cheapest;
        let isRegionalPrice = false;
        const steamAppID = game.steamAppID || (game.steamworksURL ? game.steamworksURL.split('/').pop() : null);

        if (steamAppID) {
            const steamPrice = await getSteamPrice(steamAppID);
            if (steamPrice !== null) {
                realPrice = steamPrice;
                isRegionalPrice = true;
            }
        }
        
        return {
            ...game,
            salePrice: realPrice,
            cheapest: realPrice,
            isRegionalPrice: isRegionalPrice,
            thumb: game.thumb || game.header_image
        };
    }));
};

// --- ROTAS API ---
export const getDeals = async (req: Request, res: Response) => {
    const page = req.query.page || 0;
    try {
        const response = await axios.get(`https://www.cheapshark.com/api/1.0/deals?onSale=1&pageSize=12&pageNumber=${page}`);
        const dealsBRL = await converterParaBRL(response.data);
        return res.json(dealsBRL);
    } catch (error) { return res.status(500).json([]); }
};

export const getTopRated = async (req: Request, res: Response) => {
    try {
        const response = await axios.get(`https://www.cheapshark.com/api/1.0/deals?sortBy=Metacritic&pageSize=12`);
        const topBRL = await converterParaBRL(response.data);
        return res.json(topBRL);
    } catch (error) { return res.status(500).json([]); }
};

export const searchGame = async (req: Request, res: Response) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

    try {
        const response = await axios.get(`https://www.cheapshark.com/api/1.0/games?title=${name}&limit=25`);
        const gamesWithBrl = await Promise.all(response.data.map(async (game: any) => {
            let price = game.cheapest;
            let isRegional = false;
            if (game.steamAppID) {
                const brl = await getSteamPrice(game.steamAppID);
                if (brl !== null) {
                    price = brl;
                    isRegional = true;
                }
            }
            return { ...game, cheapest: price, thumb: game.thumb, isRegionalPrice: isRegional };
        }));
        return res.json(gamesWithBrl);
    } catch (error) { return res.status(500).json({ error: 'Erro na busca' }); }
};

// --- ROTAS DB ---
export const saveGame = async (req: Request, res: Response) => {
    const { steamId, title, image, price, userId, status } = req.body;
    try {
        const novoJogo = await prisma.game.create({
            data: {
                steamId: String(steamId),
                title,
                image,
                price: parseFloat(price) || 0,
                userId: Number(userId),
                status: status || 'JOGANDO' // Default
            }
        });
        return res.json(novoJogo);
    } catch (error) { return res.status(500).json({ error: 'Erro ao salvar jogo' }); }
};

export const getLibrary = async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (isNaN(Number(userId))) return res.status(400).json({ error: 'ID inválido' });
    try {
        const biblioteca = await prisma.game.findMany({
            where: { userId: Number(userId) },
            orderBy: { id: 'desc' }
        });
        return res.json(biblioteca);
    } catch (error) { return res.status(500).json({ error: 'Erro ao buscar biblioteca' }); }
};

export const deleteGame = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.game.delete({ where: { id: Number(id) } });
        return res.json({ message: 'Jogo removido' });
    } catch (error) { return res.status(500).json({ error: 'Erro ao deletar' }); }
};

export const updateGame = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { price, status } = req.body;
    try {
        const data: any = {};
        if (price !== undefined) data.price = parseFloat(price);
        if (status !== undefined) data.status = status;

        const atualizado = await prisma.game.update({
            where: { id: Number(id) },
            data
        });
        return res.json(atualizado);
    } catch (error) { return res.status(500).json({ error: 'Erro ao atualizar' }); }
};