
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

export async function enviarSenhaPorEmail(email: string, nome: string, senhaGerada: string, escolaId?: string) {
  const escola = escolaId
    ? await prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true } })
    : null;
  const nomeEscola = escola?.nome || 'Áxis';

  const baseUrl = process.env.NEXTAUTH_URL || 'https://ceteplnab.com.br';
  const subject = `Seu acesso ao Sistema de Notas ${nomeEscola}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Seu acesso ao sistema foi criado com sucesso.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Seus dados de acesso:</p>
        <p style="margin: 10px 0 0 0; color: #0f172a;"><strong>Login:</strong> ${email}</p>
        <p style="margin: 5px 0 0 0; color: #0f172a;"><strong>Senha Provisória:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${senhaGerada}</code></p>
      </div>
      <p style="color: #ef4444; font-size: 13px; font-weight: bold;">Recomendamos trocar sua senha após o primeiro acesso.</p>
      <a href="${baseUrl}/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Acessar o Sistema</a>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;

  // 1. Tentar via SMTP se configurado
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
        to: email,
        subject,
        html,
      });
      console.log('E-mail enviado via SMTP para:', email);
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via SMTP:', error);
    }
  }

  // 2. Tentar via Resend se configurado
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      console.log('E-mail enviado via Resend para:', email);
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
    }
  }

  // 3. Fallback: Log em desenvolvimento se nada estiver configurado
  console.warn('⚠️ NENHUM SERVIÇO DE E-MAIL CONFIGURADO (SMTP ou Resend).');
  console.log('-----------------------------------');
  console.log('SIMULAÇÃO DE E-MAIL:');
  console.log('Para:', email);
  console.log('Senha:', senhaGerada);
  console.log('-----------------------------------');

  return false;
}

export async function enviarEmailConfirmacaoCadastro(email: string, nome: string) {
  const subject = 'Recebemos sua solicitação de cadastro - CETEP/LNAB';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Sua solicitação de cadastro no Sistema de Notas CETEP/LNAB foi recebida com sucesso.</p>
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
        <p style="margin: 0; color: #0369a1; font-weight: bold;">Status: Aguardando Aprovação</p>
        <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 14px;">Um administrador revisará seus dados em breve. Assim que seu acesso for liberados, você receberá um novo e-mail com sua senha temporária.</p>
      </div>
      <p style="color: #64748b; font-size: 12px;">Se você não solicitou este cadastro, por favor ignore este e-mail.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação:', error);
    }
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação via Resend:', error);
    }
  }

  return false;
}
