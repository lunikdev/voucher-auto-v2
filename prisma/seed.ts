const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  // Limpar tabelas existentes
  await prisma.user.deleteMany();
  await prisma.voucher.deleteMany();

  console.log('Banco de dados limpo');

  try {
    // Caminho para o arquivo de vouchers
    const voucherFilePath = path.join(__dirname, '../vouchers.txt');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(voucherFilePath)) {
      console.error('Arquivo vouchers.txt não encontrado!');
      console.log('Certifique-se de que o arquivo existe na raiz do projeto.');
      return;
    }
    
    // Ler o arquivo de vouchers
    const voucherData = fs.readFileSync(voucherFilePath, 'utf8');
    
    // Dividir o conteúdo por linhas e filtrar linhas vazias
    const vouchers = voucherData.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    
    // Verificar se há vouchers no arquivo
    if (vouchers.length === 0) {
      console.log('Nenhum voucher encontrado no arquivo!');
      return;
    }
    
    // Inserir vouchers no banco de dados
    for (const voucherCode of vouchers) {
      await prisma.voucher.create({
        data: {
          voucher: voucherCode,
          used: false,
        },
      });
    }
    
    console.log(`${vouchers.length} vouchers foram importados do arquivo`);
  } catch (error) {
    console.error('Erro ao importar vouchers:', error);
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