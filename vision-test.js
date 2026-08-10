require("dotenv").config({path:"server/.env"});
const fs = require("fs");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const file = process.argv[2];

if (!file || !fs.existsSync(file)) {
  console.error("❌ الصورة غير موجودة");
  process.exit(1);
}

const base64 = fs.readFileSync(file).toString("base64");

(async () => {
  try {
    const r = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "شنو كيبان فهاد الصورة؟ جاوب بالدارجة المغربية فـ3 جمل فقط."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64}`
            }
          }
        ]
      }],
      max_completion_tokens: 2048
    });

    console.log(JSON.stringify(r, null, 2));

  } catch (e) {
    console.error("VISION TEST ERROR:");
    console.error(e.message);
  }
})();
