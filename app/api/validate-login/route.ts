// api/validate-login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import validator from 'validator';

// Definir a URL do portal de login a partir de variável de ambiente
const LOGIN_PORTAL_URL = process.env.NEXT_PUBLIC_LOGIN_PORTAL_URL || 'https://hsevento.internet10.net.br';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Sanitização e validação dos campos
    const name = validator.trim(String(body.name || ''));
    const email = validator.trim(String(body.email || ''));
    const phone = validator.trim(String(body.phone || ''));
    const mac = validator.trim(String(body.mac || ''));
    const username = validator.trim(String(body.username || ''));
    
    // Obter IP do cliente da requisição
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? 
      forwardedFor.split(',')[0].trim() : 
      request.headers.get('x-real-ip') || '0.0.0.0';

    // Validação dos campos
    if (!name || !email || !phone || !mac || !username) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de tamanho para prevenir ataques de buffer overflow
    if (name.length > 100 || email.length > 100 || phone.length > 20 || mac.length > 30 || username.length > 50) {
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

    // Verificar se o login existe e está ativo
    const loginData = await prisma.login.findFirst({
      where: {
        username: username,
        active: true,
      },
    });

    if (!loginData) {
      return NextResponse.json(
        { message: 'Login não encontrado ou inativo' },
        { status: 400 }
      );
    }

    // Verificar se este MAC já está registrado com este login
    const existingUser = await prisma.user.findFirst({
      where: {
        mac: mac,
        loginId: loginData.id,
      },
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'Sua navegação já foi liberada',
        alreadyActive: true,
        username: loginData.username,
        password: loginData.password
      });
    }

    // Criar um novo usuário associado ao login
    await prisma.user.create({
      data: {
        name: validator.escape(name), // Escapar HTML para prevenir XSS
        email: email.toLowerCase(), // Normalizar email
        phone: phoneDigits,
        ip: ip,
        mac: mac,
        loginId: loginData.id,
      },
    });

    return NextResponse.json({
      message: 'Login validado com sucesso!',
      username: loginData.username,
      password: loginData.password,
    });
  } catch (error) {
    console.error('Erro ao validar login:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}