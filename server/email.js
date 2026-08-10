const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config({ path: "server/.env" });

const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const api = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendOTP(email, code) {

    const result = await api.sendTransacEmail({

        sender: {
            email: "naamaouiazzouz96@gmail.com",
            name: "UltraAI V5"
        },

        to: [
            {
                email: email
            }
        ],

        subject: "رمز التحقق - UltraAI V5",

        htmlContent: `
        <div style="font-family:Arial;padding:20px">
            <h2>UltraAI V5</h2>

            <p>رمز التحقق الخاص بك هو:</p>

            <h1 style="letter-spacing:6px">${code}</h1>

            <p>تنتهي صلاحية الرمز خلال 10 دقائق.</p>
        </div>
        `
    });

    console.log(result);

    return result;
}

module.exports = { sendOTP };
