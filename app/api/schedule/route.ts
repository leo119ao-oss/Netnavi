import { auth } from "@/lib/auth";
import { listEvents, createEvent } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
        return NextResponse.json({ error: "Missing start or end params" }, { status: 400 });
    }

    const session = await auth();
    // @ts-ignore
    const accessToken = session?.accessToken;

    if (!accessToken) {
        // Fallback for demo or non-logged-in user: return empty
        // Or could verify session at all
        return NextResponse.json({ schedules: [] });
    }

    try {
        const events = await listEvents(accessToken, start, end);

        // Map to internal format compatible with frontend
        const schedules = events.map(event => ({
            id: event.id,
            title: event.summary,
            start: event.start.dateTime || event.start.date, // handling all-day
            end: event.end.dateTime || event.end.date,
            category: "google", // Default category
            // createdAt: ...
        }));

        return NextResponse.json({ schedules });
    } catch (error) {
        console.error("Schedule fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedules" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const session = await auth();
    // @ts-ignore
    const accessToken = session?.accessToken;

    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, start, end, description, location, category } = body;

        if (!title || !start || !end) {
            return NextResponse.json(
                { error: "Missing required fields: title, start, end" },
                { status: 400 }
            );
        }

        const newEvent = await createEvent(accessToken, {
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
            description: description || `Created by NetNavi [Category: ${category || "general"}]`,
            location: location,
        });

        return NextResponse.json({
            success: true,
            event: {
                id: newEvent.id,
                title: newEvent.summary,
                start: newEvent.start?.dateTime || newEvent.start?.date,
                end: newEvent.end?.dateTime || newEvent.end?.date,
                link: newEvent.htmlLink,
            },
        });
    } catch (error) {
        console.error("Schedule creation error:", error);
        return NextResponse.json(
            { error: "Failed to create schedule", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

