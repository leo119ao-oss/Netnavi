const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = "AIzaSyBkfnjTJo1SN-wnl-ksMLVMsHaXOb3fWck";
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    try {
        // Note: listModels is usually on the GoogleGenerativeAI instance or a reliable way is via direct fetch
        // But keeping it simple with the SDK maintenance
        // Let's try to infer if we can list models.
        // Since SDK specific method might be wrapped, let's look at the error message suggestion
        // which says "Call ListModels".

        // In @google/generative-ai, there is no direct listModels on the genAI instance in some versions?
        // Wait, let's check if the SDK exposes a ModelManager.
        // Actually, simple fetch to the endpoint might be better to debug.

        console.log("Fetching models directly via REST...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

checkModels();
