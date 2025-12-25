import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export type EmailAnalysisResult = {
    isImportant: boolean;
    category: "job_interview" | "grad_school" | "other";
    summary: string;
    scheduleCandidate?: {
        title: string;
        start: string;
        end: string;
    };
    replyDraft?: string;
};

const analysisSchema = {
    type: SchemaType.OBJECT,
    properties: {
        isImportant: { type: SchemaType.BOOLEAN, description: "ユーザーにとって重要かどうか（面接、選考、大学院関連など対応が必要なもの）" },
        category: { type: SchemaType.STRING, enum: ["job_interview", "grad_school", "other"] },
        summary: { type: SchemaType.STRING, description: "メールの要約（1行程度）" },
        scheduleCandidate: {
            type: SchemaType.OBJECT,
            description: "スケジュールに登録すべき候補日程がある場合のみ出力",
            properties: {
                title: { type: SchemaType.STRING },
                start: { type: SchemaType.STRING, description: "開始日時 (ISO 8601)" },
                end: { type: SchemaType.STRING, description: "終了日時 (ISO 8601)" },
            },
            required: ["title", "start", "end"],
        },
        replyDraft: { type: SchemaType.STRING, description: "返信が必要な場合の返信文案（敬語、ビジネスメール形式）" },
    },
    required: ["isImportant", "category", "summary"],
};

export async function analyzeEmail(subject: string, body: string, sender: string): Promise<EmailAnalysisResult> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema as any,
        },
        systemInstruction: `
あなたは優秀な秘書「NetNavi」です。ユーザーのメールを解析し、必要なアクションを抽出してください。
ユーザーは現在「転職活動」と「大学院進学」を目指しています。これらに関連するメールは特に重要です。

タスク:
1. メールの重要度判定
2. カテゴリ分類
3. スケジュール情報の抽出（もしあれば）
4. 返信案の作成（もし返信が必要なら）

今日の日付: ${new Date().toISOString()} (これを基準に日程を計算してください)
`,
    });

    const prompt = `
Sender: ${sender}
Subject: ${subject}
Body:
${body}
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text) as EmailAnalysisResult;
    } catch (error) {
        console.error("Failed to analyze email:", error);
        return {
            isImportant: false,
            category: "other",
            summary: "解析失敗",
        };
    }
}
