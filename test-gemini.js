const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = "AIzaSyBkfnjTJo1SN-wnl-ksMLVMsHaXOb3fWck";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // There is no direct listModels on the instance in some versions, but we can try a simple generation to see error details or just print success if it works.
        // Actually, let's try to just generate content to see if it works with *any* standard model.

        console.log("Testing gemini-1.5-flash...");
        const result = await model.generateContent("Hello");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
