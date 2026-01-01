import { startChat, model } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Import auth
import { listMessages, getMessage } from "@/lib/gmail";
import { analyzeEmail } from "@/lib/mail-agent";
import { createEvent, listEvents } from "@/lib/google-calendar";

export async function POST(req: Request) {
    try {
        const { message, history: clientHistory } = await req.json(); // clientHistory might be passed
        const session = await auth(); // Get session for Gmail access

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // 1. Fetch recent history from DB (limit 10 for context window)
        // If client sends history, use it? Or stick to DB? DB is better for integrity.
        const dbHistory = await prisma.message.findMany({
            orderBy: { timestamp: 'asc' },
            take: 20,
        });

        // 1.5 Fetch long-term memories
        const memories = await prisma.memory.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50, // 最新50件の記憶をコンテキストに入れる
        });
        const memoryContext = memories.map((m: any) => `- ${m.content} [${m.category}]`).join("\n");


        // 2. Format history for Gemini
        const formattedHistory = dbHistory.map((msg: { role: string; text: string }) => ({
            role: msg.role as "user" | "model",
            parts: msg.text,
        }));

        // 3. Generate response with Function Calling loop
        const chatSession = startChat(formattedHistory);

        let messageToSend = message;
        if (memoryContext) {
            messageToSend = `[System Memory Integration]\nユーザーに関する記憶:\n${memoryContext}\n\nユーザーの発言:\n${message}`;
        }

        // Add Gmail Context hint if logged in
        if (session) {
            messageToSend += `\n[System Info] User is logged in to Gmail. You can use 'checkGmail' to search emails.`;
        } else {
            messageToSend += `\n[System Info] User is NOT logged in to Gmail. If they ask about emails, tell them to click 'Connect' button.`;
        }

        let result = await chatSession.sendMessage(messageToSend);
        let response = await result.response;
        let functionCalls = response.functionCalls();

        while (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0]; // Handle first call
            const { name, args } = call;
            const functionArgs = args as any;

            let functionResponse;

            // Common access token logic
            // @ts-ignore
            const accessToken = session?.accessToken;

            if (name === "addSchedule") {
                if (!accessToken) {
                    functionResponse = { error: "Login required to access Google Calendar." };
                } else {
                    try {
                        const newEvent = await createEvent(accessToken, {
                            summary: functionArgs.title,
                            start: { dateTime: functionArgs.start },
                            end: { dateTime: functionArgs.end },
                            description: `Created by NetNavi [Category: ${functionArgs.category || 'general'}]`
                        });
                        functionResponse = { result: "Schedule created in Google Calendar", eventLink: newEvent.htmlLink };
                    } catch (e) {
                        console.error("Calendar Create Error", e);
                        functionResponse = { error: "Failed to create event in Google Calendar" };
                    }
                }
            } else if (name === "getSchedules") {
                if (!accessToken) {
                    functionResponse = { error: "Login required to access Google Calendar." };
                } else {
                    try {
                        const events = await listEvents(accessToken, functionArgs.start, functionArgs.end);
                        functionResponse = {
                            schedules: events.map((e) => ({
                                title: e.summary,
                                start: e.start.dateTime || e.start.date,
                                end: e.end.dateTime || e.end.date
                            }))
                        };
                    } catch (e) {
                        console.error("Calendar List Error", e);
                        functionResponse = { error: "Failed to list events" };
                    }
                }
            } else if (name === "remember") {
                const newMemory = await prisma.memory.create({
                    data: {
                        content: functionArgs.info,
                        category: functionArgs.category || "general",
                    }
                });
                functionResponse = { result: "Memory saved", memory: newMemory };
            } else if (name === "checkGmail") {
                // Check Gmail logic with AI analysis
                // @ts-ignore
                const accessToken = session?.accessToken;
                if (!accessToken) {
                    functionResponse = { error: "Failed to access Gmail. User not authenticated." };
                } else {
                    try {
                        const query = functionArgs.query || "is:unread category:primary";
                        const maxResults = functionArgs.maxResults || 5;
                        const messages = await listMessages(accessToken, query, maxResults);

                        const analyzedEmails = [];
                        for (const msg of messages) {
                            const details = await getMessage(accessToken, msg.id);
                            // Use AI to analyze each email
                            const analysis = await analyzeEmail(details.subject, details.body, details.from);

                            if (analysis.isImportant) {
                                analyzedEmails.push({
                                    subject: details.subject,
                                    from: details.from,
                                    date: details.date,
                                    category: analysis.category,
                                    summary: analysis.summary,
                                    scheduleCandidate: analysis.scheduleCandidate,
                                    replyDraft: analysis.replyDraft,
                                });
                            }
                        }

                        if (analyzedEmails.length === 0) {
                            functionResponse = { result: "No important emails found." };
                        } else {
                            functionResponse = {
                                result: `Found ${analyzedEmails.length} important email(s)`,
                                importantEmails: analyzedEmails
                            };
                        }
                    } catch (e) {
                        console.error("Gmail tool error:", e);
                        functionResponse = { error: "Error checking Gmail: " + (e instanceof Error ? e.message : String(e)) };
                    }
                }
            }

            // Send function response back to model
            result = await chatSession.sendMessage([
                {
                    functionResponse: {
                        name: name,
                        response: functionResponse || { error: "No response from tool" }
                    }
                }
            ]);
            response = await result.response;
            functionCalls = response.functionCalls();
        }

        const responseText = response.text();

        // Save user message and AI response to DB
        // User message
        await prisma.message.create({
            data: {
                role: "user",
                text: message,
                timestamp: new Date()
            }
        });

        // AI response
        await prisma.message.create({
            data: {
                role: "model",
                text: responseText,
                timestamp: new Date()
            }
        });

        return NextResponse.json({ response: responseText });
    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            { error: "Failed to generate response", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
