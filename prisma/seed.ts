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
    
    // Criar a tabela Conf se não existir
    // Usando SQL bruto para contornar o problema do modelo Conf
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`Conf\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`active_time_minutes\` INT NOT NULL DEFAULT 15,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Inserir um registro se a tabela estiver vazia
      await prisma.$executeRawUnsafe(`
        INSERT INTO \`Conf\` (\`active_time_minutes\`, \`updatedAt\`)
        SELECT 
          ${ACTIVE_TIME_MINUTES},
          CURRENT_TIMESTAMP(3)
        FROM dual
        WHERE NOT EXISTS (SELECT * FROM \`Conf\` LIMIT 1);
      `);
      
      console.log(`Configuração de tempo ativo verificada/criada: ${ACTIVE_TIME_MINUTES} minutos.`);
    } catch (error) {
      console.error('Erro ao criar tabela Conf:', error);
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
