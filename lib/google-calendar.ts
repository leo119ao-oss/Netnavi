const BASE_URL = "https://www.googleapis.com/calendar/v3";

export type CalendarEvent = {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
};

export async function listEvents(accessToken: string, minDate: string, maxDate: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
        timeMin: minDate,
        timeMax: maxDate,
        singleEvents: "true",
        orderBy: "startTime",
    });

    const res = await fetch(`${BASE_URL}/calendars/primary/events?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        // Handle token expiry or error
        throw new Error(`Calendar API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.items || [];
}

export async function createEvent(accessToken: string, event: {
    summary: string;
    start: { dateTime: string };
    end: { dateTime: string };
    description?: string;
    location?: string;
}) {
    const res = await fetch(`${BASE_URL}/calendars/primary/events`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
    });

    if (!res.ok) {
        throw new Error(`Calendar Create Error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
}
