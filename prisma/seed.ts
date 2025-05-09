const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Credenciais fixas - idealmente, buscar de variáveis de ambiente
const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME || 'internet';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'acesso2024';

async function main() {
  // Limpar tabelas existentes se necessário
  // Para produção, é melhor comentar essas linhas para preservar os dados
  // await prisma.user.deleteMany();
  // await prisma.login.deleteMany();
  // console.log('Banco de dados limpo');

  try {
    // Verificar se o login padrão já existe
    const existingLogin = await prisma.login.findFirst({
      where: {
        username: DEFAULT_USERNAME
      }
    });

    if (existingLogin) {
      console.log(`Login padrão '${DEFAULT_USERNAME}' já existe.`);
      
      // Atualizar a senha se necessário e garantir que esteja ativo
      if (existingLogin.password !== DEFAULT_PASSWORD || !existingLogin.active) {
        await prisma.login.update({
          where: { id: existingLogin.id },
          data: {
            password: DEFAULT_PASSWORD,
            active: true
          }
        });
        console.log(`Login padrão '${DEFAULT_USERNAME}' foi atualizado.`);
      }
    } else {
      // Criar o login padrão
      await prisma.login.create({
        data: {
          username: DEFAULT_USERNAME,
          password: DEFAULT_PASSWORD,
          active: true,
        },
      });
      console.log(`Login padrão '${DEFAULT_USERNAME}' foi criado.`);
    }
    
    // Contar usuários no sistema
    const userCount = await prisma.user.count();
    console.log(`Total de usuários cadastrados: ${userCount}`);
    
  } catch (error) {
    console.error('Erro durante a inicialização:', error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
