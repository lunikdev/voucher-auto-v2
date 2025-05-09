// api/validate-voucher/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import validator from 'validator';

// Definir a URL do portal de login a partir de variável de ambiente
const LOGIN_PORTAL_URL = process.env.NEXT_PUBLIC_LOGIN_PORTAL_URL || 'https://hsevento.internet10.net.br';

// Credenciais fixas - idealmente, buscar de variáveis de ambiente
const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME || 'qrtempo';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'B1AK26L2M4';

// Tempo limite padrão em minutos para considerar uma navegação como ativa
const DEFAULT_ACTIVE_TIME_MINUTES = 15;

// Tipo para o resultado da consulta SQL
type ConfRow = {
  active_time_minutes: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Sanitização e validação dos campos
    const name = validator.trim(String(body.name || ''));
    const email = validator.trim(String(body.email || ''));
    const phone = validator.trim(String(body.phone || ''));
    const mac = validator.trim(String(body.mac || ''));
    
    // Obter IP do cliente da requisição
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? 
      forwardedFor.split(',')[0].trim() : 
      request.headers.get('x-real-ip') || '0.0.0.0';

    // Validação dos campos
    if (!name || !email || !phone || !mac) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de tamanho para prevenir ataques de buffer overflow
    if (name.length > 100 || email.length > 100 || phone.length > 20 || mac.length > 30) {
      return NextResponse.json(
        { message: 'Dados inválidos: Um ou mais campos excedem o tamanho permitido' },
        { status: 400 }
      );
    }

    // Validação de e-mail
    if (!validator.isEmail(email)) {
      return NextResponse.json(
        { message: 'E-mail inválido' },
        { status: 400 }
      );
    }

    // Validação de telefone (apenas dígitos)
    const phoneDigits = phone.replace(/\D/g, '');
    if (!validator.isNumeric(phoneDigits) || phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json(
        { message: 'Telefone inválido' },
        { status: 400 }
      );
    }

    // Validação de MAC address (formato básico xx:xx:xx:xx:xx:xx ou similar)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}[.]){2}([0-9A-Fa-f]{4})$/;
    if (!macRegex.test(mac)) {
      return NextResponse.json(
        { message: 'Endereço MAC inválido' },
        { status: 400 }
      );
    }
    
    // Obter o tempo ativo da configuração
    let activeTimeMinutes = DEFAULT_ACTIVE_TIME_MINUTES;
    
    // Primeiro tentar obter da variável de ambiente (prioridade)
    if (process.env.ACTIVE_VOUCHER_TIME_MINUTES) {
      const envTime = parseInt(process.env.ACTIVE_VOUCHER_TIME_MINUTES, 10);
      if (!isNaN(envTime) && envTime > 0) {
        activeTimeMinutes = envTime;
      }
    } else {
      // Se não estiver no ambiente, tentar obter do banco de dados
      try {
        const confResults = await prisma.$queryRawUnsafe<ConfRow[]>(`SELECT active_time_minutes FROM Conf LIMIT 1`);
        if (Array.isArray(confResults) && confResults.length > 0 && confResults[0].active_time_minutes > 0) {
          activeTimeMinutes = confResults[0].active_time_minutes;
        }
      } catch (error) {
        console.warn('Erro ao obter tempo ativo do banco de dados:', error);
        // Em caso de erro, usar o valor padrão
      }
    }

    // Calcular o tempo limite para considerar uma navegação ativa
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - activeTimeMinutes);

    // Verificar se já existe um usuário com este MAC
    const existingUser = await prisma.user.findFirst({
      where: {
        mac: mac,
        updatedAt: {
          gte: recentTime // Verifica se foi atualizado recentemente
        }
      },
      include: {
        login: true
      }
    });

    if (existingUser) {
      // Por segurança, não retornamos credenciais quando o usuário já está ativo
      return NextResponse.json({
        message: 'Sua navegação já foi liberada',
        alreadyActive: true
      });
    }

    // Obter ou criar o login padrão
    let loginData = await prisma.login.findFirst({
      where: {
        username: DEFAULT_USERNAME,
        active: true
      }
    });

    // Se não existir, criar o login padrão
    if (!loginData) {
      loginData = await prisma.login.create({
        data: {
          username: DEFAULT_USERNAME,
          password: DEFAULT_PASSWORD,
          active: true
        }
      });
    }

    // Criar ou atualizar o usuário associado ao login
    const existingUserAnyTime = await prisma.user.findFirst({
      where: {
        mac: mac
      }
    });
    
    if (existingUserAnyTime) {
      // Atualizar o usuário existente
      await prisma.user.update({
        where: {
          id: existingUserAnyTime.id
        },
        data: {
          name: validator.escape(name),
          email: email.toLowerCase(),
          phone: phoneDigits,
          ip: ip,
          loginId: loginData.id,
          updatedAt: new Date() // Atualizar o timestamp
        }
      });
    } else {
      // Criar um novo usuário
      await prisma.user.create({
        data: {
          name: validator.escape(name), // Escapar HTML para prevenir XSS
          email: email.toLowerCase(), // Normalizar email
          phone: phoneDigits,
          ip: ip,
          mac: mac,
          loginId: loginData.id
        }
      });
    }

    return NextResponse.json({
      message: 'Login validado com sucesso!',
      voucher: loginData.username, // Para compatibilidade com o código antigo
      username: loginData.username,
      password: loginData.password
    });
  } catch (error) {
    console.error('Erro ao validar acesso:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
