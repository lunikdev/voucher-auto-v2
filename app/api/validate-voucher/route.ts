// api/validate-voucher/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import validator from 'validator'; // Necessário instalar: npm install validator @types/validator

// Tempo limite em minutos para considerar uma navegação como ativa
// Usar variável de ambiente ou valor padrão de 15 minutos
const ACTIVE_TIME_LIMIT_MINUTES = process.env.ACTIVE_VOUCHER_TIME_MINUTES 
  ? parseInt(process.env.ACTIVE_VOUCHER_TIME_MINUTES, 10) 
  : 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Sanitização e validação dos campos
    const name = validator.trim(String(body.name || ''));
    const email = validator.trim(String(body.email || ''));
    const phone = validator.trim(String(body.phone || ''));
    const mac = validator.trim(String(body.mac || ''));
    
    // Obter IP do cliente da requisição
    // Primeiro tenta obter do cabeçalho x-forwarded-for (usado em algumas configurações de proxy)
    // Se não estiver disponível, usa o IP remoto da requisição
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

    // Verificar se o MAC já está associado a um voucher usado recentemente
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - ACTIVE_TIME_LIMIT_MINUTES);

    // Usar updatedAt como proxy para usedAt, já que updatedAt é atualizado quando o voucher é marcado como usado
    const recentVoucher = await prisma.voucher.findFirst({
      where: {
        mac: mac,
        used: true,
        updatedAt: {
          gte: recentTime
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (recentVoucher) {
      return NextResponse.json({
        message: 'Sua navegação já foi liberada',
        alreadyActive: true
      });
    }

    // Verificar se existe algum voucher disponível
    const availableVoucher = await prisma.voucher.findFirst({
      where: {
        used: false,
      },
    });

    if (!availableVoucher) {
      return NextResponse.json(
        { message: 'Não há vouchers disponíveis no momento' },
        { status: 400 }
      );
    }

    // Atualizar o voucher e criar o usuário
    const updateVoucher = prisma.voucher.update({
      where: {
        id: availableVoucher.id,
      },
      data: {
        used: true,
        mac: mac, // Já temos o campo MAC na tabela Voucher
        usedAt: new Date(), // Registrar quando o voucher foi usado
      },
    });

    const createUser = prisma.user.create({
      data: {
        name: validator.escape(name), // Escapar HTML para prevenir XSS
        email: email.toLowerCase(), // Normalizar email
        phone: phoneDigits,
        voucherId: availableVoucher.id,
      },
    });

    // Executar as duas operações em uma transação
    await prisma.$transaction([updateVoucher, createUser]);

    return NextResponse.json({
      message: 'Voucher validado com sucesso!',
      voucher: availableVoucher.voucher,
    });
  } catch (error) {
    console.error('Erro ao validar voucher:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
