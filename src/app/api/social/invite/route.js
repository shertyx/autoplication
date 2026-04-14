import { auth } from "@/auth";
import nodemailer from "nodemailer";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const { toEmail } = await request.json();
  if (!toEmail || !toEmail.includes("@")) return Response.json({ success: false, error: "Email invalide" });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Autoplication" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${session.user.name} t'invite sur Autoplication`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0d1117;color:#e6edf3;border-radius:12px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#58a6ff,#bc8cff);line-height:56px;font-size:24px;margin-bottom:16px;">⚡</div>
            <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#e6edf3;">Autoplication</h1>
            <p style="color:#8b949e;font-size:14px;margin:0;">Ta plateforme de recherche d'emploi intelligente</p>
          </div>
          <div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:24px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              ${session.user.image ? `<img src="${session.user.image}" style="width:40px;height:40px;border-radius:50%;" />` : ""}
              <div>
                <p style="margin:0;font-weight:600;color:#e6edf3;">${session.user.name}</p>
                <p style="margin:0;font-size:12px;color:#8b949e;">${session.user.email}</p>
              </div>
            </div>
            <p style="margin:0;color:#8b949e;font-size:14px;line-height:1.6;">
              t'invite à rejoindre Autoplication — offres d'emploi personnalisées selon ton CV, lettres de motivation générées par IA, et suivi de candidatures.
            </p>
          </div>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="https://autoplication.vercel.app" style="display:inline-block;padding:12px 28px;background:#238636;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              Rejoindre Autoplication →
            </a>
          </div>
          <p style="color:#484f58;font-size:11px;text-align:center;margin:0;">Connexion avec Google · Gratuit</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
