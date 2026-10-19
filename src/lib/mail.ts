import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

// Configuração do Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Configuração do SMTP (Nodemailer)
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

/**
 * Envia um e-mail pelo SMTP (se configurado) ou pelo Resend. Retorna false
 * se nenhum dos dois funcionou. Em desenvolvimento sem serviço configurado,
 * mostra o conteúdo no console - nunca em produção (o conteúdo pode ter
 * senha provisória ou link de redefinição).
 */
async function enviarEmail(para: string, assunto: string, html: string, textoParaConsoleDev: string): Promise<boolean> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Áxis" <no-reply@axis.app>',
        to: para,
        subject: assunto,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via SMTP:', error);
    }
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: para,
        subject: assunto,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Nenhum serviço de e-mail configurado (SMTP ou Resend). Simulação:');
    console.log(`Para: ${para}\nAssunto: ${assunto}\n${textoParaConsoleDev}`);
  } else {
    console.error(`Nenhum serviço de e-mail configurado - e-mail "${assunto}" não enviado.`);
  }
  return false;
}

async function nomeDaEscola(escolaId?: string) {
  const escola = escolaId
    ? await prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true } })
    : null;
  return escola?.nome || 'Áxis';
}

function moldura(conteudo: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      ${conteudo}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;
}

const botao = (href: string, texto: string) =>
  `<a href="${href}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">${texto}</a>`;

export async function enviarSenhaPorEmail(email: string, nome: string, senhaGerada: string, escolaId?: string) {
  const nomeEscola = await nomeDaEscola(escolaId);
  const baseUrl = process.env.NEXTAUTH_URL || '';
  const html = moldura(`
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Seu acesso ao sistema foi criado com sucesso.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Seus dados de acesso:</p>
        <p style="margin: 10px 0 0 0; color: #0f172a;"><strong>Login:</strong> ${email}</p>
        <p style="margin: 5px 0 0 0; color: #0f172a;"><strong>Senha Provisória:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${senhaGerada}</code></p>
      </div>
      <p style="color: #ef4444; font-size: 13px; font-weight: bold;">No primeiro acesso, o sistema vai pedir que você crie uma senha própria.</p>
      ${botao(`${baseUrl}/login`, 'Acessar o Sistema')}
  `);
  return enviarEmail(email, `Seu acesso ao sistema ${nomeEscola}`, html, `Senha provisória: ${senhaGerada}`);
}

/** Link de "esqueci minha senha" - `link` já vem com o subdomínio da escola. */
export async function enviarLinkRedefinicaoSenha(email: string, nome: string, link: string, validadeMinutos: number, escolaId?: string) {
  const nomeEscola = await nomeDaEscola(escolaId);
  const html = moldura(`
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Recebemos um pedido para redefinir sua senha no sistema ${nomeEscola}.</p>
      ${botao(link, 'Criar nova senha')}
      <p style="color: #64748b; font-size: 13px; margin-top: 20px;">O link vale por ${validadeMinutos} minutos e só pode ser usado uma vez.</p>
      <p style="color: #64748b; font-size: 13px;">Se você não pediu isso, ignore este e-mail - sua senha atual continua valendo.</p>
  `);
  return enviarEmail(email, `Redefinição de senha - ${nomeEscola}`, html, `Link: ${link}`);
}
