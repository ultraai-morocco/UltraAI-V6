const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config({ path: "./server/.env" });

const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey =
    process.env.BREVO_API_KEY;

const api = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendOTP(email, code) {

    if (!process.env.BREVO_API_KEY) {
        throw new Error("BREVO_API_KEY missing");
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
        email: "naamaouiazzouz96@gmail.com",
        name: "UltraAI"
    };

    sendSmtpEmail.to = [
        {
            email: String(email).trim().toLowerCase()
        }
    ];

    sendSmtpEmail.subject = "رمز التحقق - UltraAI";

    sendSmtpEmail.htmlContent = `
        <div style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
            padding:30px;
            text-align:center;
        ">
            <h2>UltraAI</h2>

            <p>رمز التحقق الخاص بك هو:</p>

            <div style="
                font-size:32px;
                font-weight:bold;
                letter-spacing:8px;
                margin:25px 0;
            ">
                ${code}
            </div>

            <p>
                تنتهي صلاحية الرمز خلال 10 دقائق.
            </p>
        </div>
    `;

    console.log("📧 BREVO SEND START:", sendSmtpEmail.to);

    try {

        const result =
            await api.sendTransacEmail(sendSmtpEmail);

        console.log(
            "✅ BREVO SEND SUCCESS:",
            result
        );

        return result;

    } catch (error) {

        console.error(
            "❌ BREVO SEND ERROR:"
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        if (error.response) {
            console.error(
                "RESPONSE:",
                error.response.body ||
                error.response.text ||
                error.response
            );
        }

        throw error;
    }
}

module.exports = {
    sendOTP
};
