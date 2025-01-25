// Importar bibliotecas necessárias
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
const { Client, Buttons, List, MessageMedia } = pkg;

// Criar uma nova instância do cliente
const client = new Client();

// Evento para gerar o QR Code
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Evento para quando o cliente estiver pronto
client.on("ready", () => {
  console.log("Tudo certo! WhatsApp conectado.");
});

// Inicializar o cliente
client.initialize();

// Função para criar um delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Variáveis para controlar o pedido
let pedidoEmAndamento = false;
let cliente = null;
let numeroPedido = null;
let enderecoEntrega = null;
let descricaoPedido = null;
let valorPedido = null;

// Evento para lidar com mensagens recebidas
//client.on("message", async (msg) => {
// try {
// Verificar se a mensagem é uma imagem e se não há um pedido em andamento
client.on("message", async (msg) => {
  if (msg.type === "image" && msg.from.endsWith("@c.us") && !pedidoEmAndamento) {
    // código aqui
  //}
//});

  pedidoEmAndamento = true;
  cliente = await msg.getContact();
  await client.sendMessage(
    msg.from,
    "Certo, quase lá! Por favor, forneça o número do pedido:"
  );
}
// Verificar se há um pedido em andamento e se o número do pedido ainda não foi fornecido
else if (pedidoEmAndamento && !numeroPedido) {
  numeroPedido = msg.body;
  await client.sendMessage(
    msg.from,
    `Entendi, ${cliente.pushname}! Obrigado por enviar a arte. Por favor, forneça o endereço de entrega:`
  );
}
// Verificar se há um pedido em andamento e se o endereço de entrega ainda não foi fornecido
else if (pedidoEmAndamento && numeroPedido && !enderecoEntrega) {
  enderecoEntrega = msg.body;
  await client.sendMessage(
    msg.from,
    `Entendi, ${cliente.pushname}! Obrigado por enviar o endereço de entrega. Por favor, forneça a descrição do pedido:`
  );
}
// Verificar se há um pedido em andamento e se a descrição do pedido ainda não foi fornecida
else if (
  pedidoEmAndamento &&
  numeroPedido &&
  enderecoEntrega &&
  !descricaoPedido
) {
  descricaoPedido = msg.body;
  await client.sendMessage(
    msg.from,
    `Entendi, ${cliente.pushname}! Obrigado por enviar a descrição do pedido. Por favor, forneça o valor do pedido:`
  );
}
// Verificar se há um pedido em andamento e se o valor do pedido ainda não foi fornecido
else if (
  pedidoEmAndamento &&
  numeroPedido &&
  enderecoEntrega &&
  descricaoPedido &&
  !valorPedido
) {
  valorPedido = msg.body;
  const pedido = {
    id: numeroPedido,
    cliente: cliente.pushname,
    valor: valorPedido,
    descricao: descricaoPedido,
    tempoProducao: "3 dias",
    enderecoEntrega: enderecoEntrega,
    taxaEntrega: 10.0,
  };
  const mensagemResumo = `Resumo do Pedido: ID: ${pedido.id} Cliente: ${
    pedido.cliente
  } Valor: R$ ${pedido.valor.toFixed(2)} Descrição: ${
    pedido.descricao
  } Tempo de Produção: ${pedido.tempoProducao} Endereço de Entrega: ${
    pedido.enderecoEntrega
  } Taxa de Entrega: R$ ${pedido.taxaEntrega.toFixed(2)} Total: R$ ${(
    pedido.valor + pedido.taxaEntrega
  ).toFixed(2)}`;
  await client.sendMessage(msg.from, mensagemResumo);
  pedidoEmAndamento = false;
  cliente = null;
  numeroPedido = null;
  enderecoEntrega = null;
  descricaoPedido = null;
  valorPedido = null;
}
// Verificar se a mensagem é um comando de menu
else if (msg.body !== null && msg.body === "1" && msg.from.endsWith("@c.us")) {
  await client.sendMessage(
    msg.from,
    "Kits festa, legal vou te mandar 3 opções"
  );
  await delay(3000);
  await msg.getChat().sendStateTyping();
  await delay(3000);
  await client.sendMessage(
    msg.from,
    ` 9 - Para topo de bolo: https://drive.google.com/drive/folders/1Eb5cputR23V2g7kF_BzC-0xwvFIOhFT10 - Kit festa em casa (simples): https://drive.google.com/drive/mobile/folders/11audFhrmWep7TpO20cqjFrrmCzDNCdiH 11 - Kit festa : https://drive.google.com/drive/mobile/folders/1Q1paGFU8uiVxxMTrA3KhcCRGn-H9lyO_ `
  );
} else if (
  msg.body !== null &&
  msg.body === "2" &&
  msg.from.endsWith("@c.us")
) {
  const chat = await msg.getChat();
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(msg.from, "Impressões");
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(
    msg.from,
    ` Impressão sulfite Preto e branco: R$ 1,00 Impressão sulfite Colorido: R$ 1,50 Xerox: R$ 1,00 Papel offset 180gr Impressão: R$ 4,00 Papel fotográfico brilhante 180gr Impressão: R$ 5,00 Papel fotográfico adesivo Impressão: R$ 6,00 Papel Vinil adesivo Impressão: R$ 12,00 `
  );
} else if (
  msg.body !== null &&
  msg.body === "3" &&
  msg.from.endsWith("@c.us")
) {
  const chat = await msg.getChat();
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(msg.from, "Agendas e Planners");
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(msg.from, "Link: (valores a combinar)");
} else if (
  msg.body !== null &&
  msg.body === "4" &&
  msg.from.endsWith("@c.us")
) {
  const chat = await msg.getChat();
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(msg.from, "Caderneta de vacinação");
  await delay(3000);
  await chat.sendStateTyping();
  await delay(3000);
  await client.sendMessage(msg.from, "Link: Reforma: R$ 50,00 Nova: R$ 60,00");
} else if (msg.body !== null && msg.body === "5" && msg.from.endsWith("@c.us"))
  // const chat = await msg.getChat();
  await delay(3000);
await chat.sendStateTyping();
await delay(3000);
await client.sendMessage(msg.from, "Canecas personalizadas");
await delay(3000);
await chat.sendStateTyping();
await delay(3000);
await client.sendMessage(
  msg.from,
  "Plástico polímero: R$ 20,00 Cerâmica branca: R$ 30,00 Alumínio: R$ 25,00 Vidro: R$ 40,00 Chopp jateada: R$ 50,00"
);
client.on("message", async (msg) => {
  try {
    // código aqui
    if (msg.body !== null && msg.body === "6" && msg.from.endsWith("@c.us")) {
      try {
        const chat = await msg.getChat();
        await delay(3000);
        await chat.sendStateTyping();
        await delay(3000);
        await client.sendMessage(msg.from, "Camisetas");
        await delay(3000);
        await chat.sendStateTyping();
        await delay(3000);
        await client.sendMessage(
          msg.from,
          `Brancas: Body P ao EG: R$ 40,00 Infantil 1 ao 16: R$ 40,00 Adulto P ao EG: R$ 50,00 Coloridas: consultar`
        );
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
});
