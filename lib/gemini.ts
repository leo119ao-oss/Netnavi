import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!apiKey) {
    console.warn("Gemini API Key is not set. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local");
} else {
    console.log("Gemini API Key is set (" + apiKey.length + " chars)");
}

const genAI = new GoogleGenerativeAI(apiKey);

// ツール定義
const tools = [
    {
        functionDeclarations: [
            {
                name: "addSchedule",
                description: "スケジュールを追加します。ユーザーが日程を指定した場合に呼び出します。",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "予定のタイトル" },
                        start: { type: SchemaType.STRING, description: "開始日時 (ISO 8601 format, e.g. 2023-12-24T10:00:00)" },
                        end: { type: SchemaType.STRING, description: "終了日時 (ISO 8601 format, e.g. 2023-12-24T11:00:00)" },
                        category: { type: SchemaType.STRING, description: "カテゴリ（任意）" },
                    },
                    required: ["title", "start", "end"],
                } as any,
            },
            {
                name: "getSchedules",
                description: "指定された範囲のスケジュールを取得します。",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        start: { type: SchemaType.STRING, description: "取得開始日時 (ISO 8601)" },
                        end: { type: SchemaType.STRING, description: "取得終了日時 (ISO 8601)" },
                    },
                    required: ["start", "end"],
                } as any,
            },
            {
                name: "remember",
                description: "ユーザーに関する重要な情報を長期記憶に保存します。好み、仕事、人間関係、将来の目標など、忘れてはいけない情報を保存してください。",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        info: { type: SchemaType.STRING, description: "保存する記憶の内容" },
                        category: { type: SchemaType.STRING, description: "記憶のカテゴリ (user_preference, work, hobby, relationship, other)" },
                    },
                    required: ["info"],
                } as any,
            },
            {
                name: "checkGmail",
                description: "ユーザーのGmailを確認して、新しいメールや特定のトピックに関するメールを探します。ユーザーから「メール見て」「転職の状況は？」などと聞かれたらこのツールを使ってください。",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        query: { type: SchemaType.STRING, description: "検索クエリ (例: 'is:unread', 'subject:面接', 'from:university', 'category:primary')" },
                        maxResults: { type: SchemaType.NUMBER, description: "取得件数 (デフォルト5)" },
                    },
                } as any,
            },
        ],
    },
];

export const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    systemInstruction: "あなたの名前は「NetNavi（ネットナビ）」です。日本語で話してください。あなたはユーザー（オペレーター）を深く理解し、自律的にサポートするパートナーです。\n\n**重要なお願い**\n1. **記憶へのアクセス**: あなたはユーザーに関する長期記憶を持っています。会話の文脈に合わせて、過去に聞いた情報を積極的に活用してください。もしユーザーが「私のこと覚えてる？」のような質問をしたら、まずは記憶を検索し、なければ「メールを確認しましょうか？」と提案してください。\n2. **メール連携**: ユーザーのGmailにアクセスできます。「メール見て」「転職の進捗は？」などの質問には `checkGmail` ツールを使って最新情報を確認してください。\n3. **記憶の保存**: ユーザーの好み、仕事、将来の夢など、重要だと思われる情報は `remember` ツールを使って積極的に記録してください。\n4. **スケジュール管理**: スケジュールの追加・確認もあなたの仕事です。\n\n現在の日時は " + new Date().toLocaleString('ja-JP') + " です。",
    tools: tools,
});

export const startChat = (history: { role: "user" | "model"; parts: string | any[] }[] = []) => {
    return model.startChat({
        history: history.map((msg) => ({
            role: msg.role,
            parts: Array.isArray(msg.parts) ? msg.parts : [{ text: msg.parts }],
        })),
    });
};
