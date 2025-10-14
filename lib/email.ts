// lib/email.ts
import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!),
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
    },
});

interface SendEmailParams {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
    try {
        const mailOptions = {
            from: "Finapp <noreply@finapp.com>",
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}

// Function to send password reset email with HTML template
export async function sendPasswordResetEmail({
    to,
    resetUrl,
    userName
}: {
    to: string;
    resetUrl: string;
    userName?: string;
}) {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinir Senha - Finapp</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: #f8f9fa;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }

        .header h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header .logo {
          font-size: 18px;
          opacity: 0.9;
          font-weight: 300;
        }

        .content {
          padding: 40px 30px;
        }

        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 20px;
        }

        .message {
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 30px;
          color: #4a5568;
        }

        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
        }

        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .link-container {
          background-color: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }

        .link-label {
          font-size: 14px;
          color: #718096;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .link-text {
          word-break: break-all;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #2d3748;
          background-color: #edf2f7;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e0;
        }

        .warning {
          background-color: #fff5f5;
          border-left: 4px solid #e53e3e;
          padding: 16px 20px;
          margin: 25px 0;
          border-radius: 0 8px 8px 0;
        }

        .warning-text {
          color: #c53030;
          font-size: 14px;
          font-weight: 500;
        }

        .footer {
          background-color: #f7fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }

        .footer-text {
          font-size: 12px;
          color: #a0aec0;
          line-height: 1.5;
        }

        .footer-brand {
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 8px;
        }

        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }

          .header {
            padding: 30px 20px;
          }

          .header h2 {
            font-size: 24px;
          }

          .content {
            padding: 30px 20px;
          }

          .button {
            display: block;
            width: 100%;
            padding: 18px;
          }

          .link-container {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Redefinição de Senha</h2>
          <div class="logo">Finapp</div>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${userName ? `${userName}` : ''}!</div>
          <div class="message">
            Recebemos uma solicitação para redefinir a senha da sua conta. Para continuar, clique no botão abaixo:
          </div>

          <a href="${resetUrl}" class="button">Redefinir Minha Senha</a>

          <div class="link-container">
            <div class="link-label">Ou copie e cole este link no seu navegador:</div>
            <div class="link-text">${resetUrl}</div>
          </div>

          <div class="warning">
            <div class="warning-text">
              Este link expira em 1 hora por questões de segurança.
            </div>
          </div>

          <div class="message">
            Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.
          </div>
        </div>
        <div class="footer">
          <div class="footer-brand">Finapp</div>
          <div class="footer-text">
            Este é um e-mail automático, por favor não responda.<br>
            © ${new Date().getFullYear()} Finapp. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to,
        subject: 'Redefinição de Senha - Finapp',
        html: htmlTemplate,
        text: `Olá${userName ? ` ${userName}` : ''}!\n\nRecebemos uma solicitação para redefinir a senha da sua conta. Clique no link para redefinir: ${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou a redefinição de senha, ignore este e-mail.`,
    });
}

// Function to send verification email with HTML template
export async function sendVerificationEmail({
    to,
    verificationUrl,
    userName
}: {
    to: string;
    verificationUrl: string;
    userName?: string;
}) {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificação de E-mail - Finapp</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: #f8f9fa;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }

        .header h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header .logo {
          font-size: 18px;
          opacity: 0.9;
          font-weight: 300;
        }

        .content {
          padding: 40px 30px;
        }

        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 20px;
        }

        .message {
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 30px;
          color: #4a5568;
        }

        .button {
          display: inline-block;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
          transition: all 0.3s ease;
        }

        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(72, 187, 120, 0.6);
        }

        .link-container {
          background-color: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }

        .link-label {
          font-size: 14px;
          color: #718096;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .link-text {
          word-break: break-all;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #2d3748;
          background-color: #edf2f7;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e0;
        }

        .info-box {
          background-color: #ebf8ff;
          border-left: 4px solid #4299e1;
          padding: 16px 20px;
          margin: 25px 0;
          border-radius: 0 8px 8px 0;
        }

        .info-text {
          color: #2b6cb0;
          font-size: 14px;
          font-weight: 500;
        }

        .footer {
          background-color: #f7fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }

        .footer-text {
          font-size: 12px;
          color: #a0aec0;
          line-height: 1.5;
        }

        .footer-brand {
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 8px;
        }

        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }

          .header {
            padding: 30px 20px;
          }

          .header h2 {
            font-size: 24px;
          }

          .content {
            padding: 30px 20px;
          }

          .button {
            display: block;
            width: 100%;
            padding: 18px;
          }

          .link-container {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Verificação de E-mail</h2>
          <div class="logo">Finapp</div>
        </div>
        <div class="content">
          <div class="greeting">Olá${userName ? ` ${userName}` : ''}!</div>
          <div class="message">
            Obrigado por se cadastrar no Finapp! Para ativar sua conta e começar a usar nossos serviços, verifique seu endereço de e-mail clicando no botão abaixo:
          </div>

          <a href="${verificationUrl}" class="button">Verificar Meu E-mail</a>

          <div class="link-container">
            <div class="link-label">Ou copie e cole este link no seu navegador:</div>
            <div class="link-text">${verificationUrl}</div>
          </div>

          <div class="info-box">
            <div class="info-text">
              Esta verificação garante a segurança da sua conta e permite que você aproveite todos os recursos da plataforma.
            </div>
          </div>

          <div class="message">
            Se você não criou uma conta, pode ignorar este e-mail com segurança. Nenhuma ação adicional será necessária.
          </div>
        </div>
        <div class="footer">
          <div class="footer-brand">Finapp</div>
          <div class="footer-text">
            Este é um e-mail automático, por favor não responda.<br>
            © ${new Date().getFullYear()} Finapp. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to,
        subject: 'Verifique seu E-mail - Bem-vindo ao Finapp!',
        html: htmlTemplate,
        text: `Olá${userName ? ` ${userName}` : ''}!\n\nObrigado por se cadastrar no Finapp! Clique no link para verificar seu e-mail: ${verificationUrl}\n\nSe você não criou uma conta, ignore este e-mail.`,
    });
}
