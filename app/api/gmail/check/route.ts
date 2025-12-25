import { auth } from "@/lib/auth";
import { listMessages, getMessage, sendEmail } from "@/lib/gmail";
import { analyzeEmail } from "@/lib/mail-agent";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await auth();
    // @ts-ignore
    const accessToken = session?.accessToken;

    if (!session || !accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch recent emails (e.g. unread or from specific period)
        // For demo, let's fetch last 5 messages regardless of read status to ensure hit
        const messages = await listMessages(accessToken, "category:primary", 5);

        const results = [];

        for (const msg of messages) {
            // Get details
            const details = await getMessage(accessToken, msg.id);

            // Analyze
            const analysis = await analyzeEmail(details.subject, details.body, details.from);

            if (analysis.isImportant) {
                results.push({
                    email: details,
                    analysis: analysis
                });
            }
        }

        return NextResponse.json({
            count: results.length,
            importantEmails: results
        });

    } catch (error) {
        console.error("Gmail check failed:", error);
        return NextResponse.json(
            { error: "Failed to check emails", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
