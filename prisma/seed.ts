const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Credenciais fixas - idealmente, buscar de variáveis de ambiente
const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME || 'qrtempo';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'B1AK26L2M4';
const ACTIVE_TIME_MINUTES = process.env.ACTIVE_VOUCHER_TIME_MINUTES 
  ? parseInt(process.env.ACTIVE_VOUCHER_TIME_MINUTES, 10) 
  : 15;

async function main() {
  // Não limpar tabelas existentes em produção
  // Comentar essas linhas para preservar os dados
  // await prisma.user.deleteMany();
  // await prisma.login.deleteMany();
  // console.log('Banco de dados limpo');

  try {
    // Verificar se o login padrão já existe
    const existingLogin = await prisma.Login.findFirst({
      where: {
        username: DEFAULT_USERNAME
      }
    });

    if (existingLogin) {
      console.log(`Login padrão '${DEFAULT_USERNAME}' já existe.`);
      
      // Atualizar a senha se necessário e garantir que esteja ativo
      if (existingLogin.password !== DEFAULT_PASSWORD || !existingLogin.active) {
        await prisma.Login.update({
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
      await prisma.Login.create({
        data: {
          username: DEFAULT_USERNAME,
          password: DEFAULT_PASSWORD,
          active: true,
        },
      });
      console.log(`Login padrão '${DEFAULT_USERNAME}' foi criado.`);
    }
    
    // Verificar se já existe configuração
    const existingConf = await prisma.Conf.findFirst();
    
    if (existingConf) {
      // Atualizar a configuração existente se o valor do ambiente for diferente
      if (existingConf.active_time_minutes !== ACTIVE_TIME_MINUTES) {
        await prisma.Conf.update({
          where: { id: existingConf.id },
          data: {
            active_time_minutes: ACTIVE_TIME_MINUTES
          }
        });
        console.log(`Configuração de tempo ativo atualizada para ${ACTIVE_TIME_MINUTES} minutos.`);
      } else {
        console.log(`Configuração de tempo ativo já existe: ${existingConf.active_time_minutes} minutos.`);
      }
    } else {
      // Criar nova configuração
      await prisma.Conf.create({
        data: {
          active_time_minutes: ACTIVE_TIME_MINUTES
        }
      });
      console.log(`Configuração de tempo ativo criada: ${ACTIVE_TIME_MINUTES} minutos.`);
    }
    
    // Contar usuários no sistema
    const userCount = await prisma.User.count();
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
