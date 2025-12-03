import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(3, "O nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Esquema de ATUALIZAÇÃO (Campos opcionais, mas se vierem, tem regras)
const updateSchema = z.object({
  name: z.string().min(1, "Nome não pode ser vazio").optional(),
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(6, "Senha muito curta").optional(),
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(err => err.message).join(', ');
      return res.status(400).json({ error: errors });
    }
    const { name, email, password } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email }, { name: name }] }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Usuário ou E-mail já estão em uso.' });
    }

    const user = await prisma.user.create({ data: { name, email, password } });
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body; 
  try {
    const user = await prisma.user.findFirst({ where: { name: username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return res.status(500).json({ error: 'Erro no servidor' });
  }
};

// CORREÇÃO: Validação na atualização para evitar "tela cinza"
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Valida os dados recebidos
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
     return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { name, email, password } = result.data;

  // Garante que não estamos salvando string vazia ou espaços em branco
  if (name !== undefined && name.trim() === '') return res.status(400).json({ error: 'Nome inválido' });
  if (email !== undefined && email.trim() === '') return res.status(400).json({ error: 'Email inválido' });

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { 
         ...(name && { name }), 
         ...(email && { email }),
         ...(password && { password })
      }
    });
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.game.deleteMany({ where: { userId: Number(id) } });
    await prisma.user.delete({ where: { id: Number(id) } });
    return res.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar conta' });
  }
};