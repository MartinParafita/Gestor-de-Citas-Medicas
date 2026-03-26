import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_prescription_email(patient_email, patient_name, doctor_name, medication, dosage, instructions):
    """
    Envía la receta médica por email al paciente.

    Requiere las variables de entorno MAIL_USERNAME y MAIL_PASSWORD.
    Retorna True si el email se envió, False en caso contrario.
    """
    mail_user   = os.environ.get("MAIL_USERNAME")
    mail_pass   = os.environ.get("MAIL_PASSWORD")
    mail_server = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    mail_port   = int(os.environ.get("MAIL_PORT", 587))

    if not mail_user or not mail_pass:
        print("[EMAIL] Sin credenciales configuradas. El email no fue enviado.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Tu receta médica — GG Salud"
        msg["From"]    = mail_user
        msg["To"]      = patient_email

        body_text = (
            f"Hola {patient_name},\n\n"
            f"El/La Dr/a. {doctor_name} te ha emitido la siguiente receta:\n\n"
            f"Medicamento: {medication}\n"
            f"Dosis: {dosage}\n"
            f"Instrucciones: {instructions or 'Sin indicaciones adicionales.'}\n\n"
            f"GG Salud — Sistema de gestión médica"
        )

        body_html = f"""
        <html><body>
        <h2 style="color:#20B2AA;">Receta Médica — GG Salud</h2>
        <p>Hola <strong>{patient_name}</strong>,</p>
        <p>El/La <strong>Dr/a. {doctor_name}</strong> te ha emitido la siguiente receta:</p>
        <table style="border-collapse:collapse; width:100%; max-width:500px;">
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Medicamento</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">{medication}</td></tr>
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Dosis</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">{dosage}</td></tr>
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Instrucciones</td>
                <td style="padding:8px;">{instructions or 'Sin indicaciones adicionales.'}</td></tr>
        </table>
        <br/><p style="color:#888; font-size:12px;">GG Salud — Sistema de gestión médica</p>
        </body></html>
        """

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(mail_server, mail_port) as server:
            server.starttls()
            server.login(mail_user, mail_pass)
            server.sendmail(mail_user, patient_email, msg.as_string())

        print(f"[EMAIL] Receta enviada a {patient_email}")
        return True

    except Exception as e:
        print(f"[EMAIL] Error al enviar email: {e}")
        return False
