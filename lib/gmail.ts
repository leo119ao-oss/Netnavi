export type EmailMessage = {
    id: string;
    threadId: string;
    snippet: string;
    payload: {
        headers: { name: string; value: string }[];
        body: { data: string }; // Base64url encoded
        parts?: { body: { data: string } }[];
    };
};

export type ParsedEmail = {
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
};

const BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function listMessages(accessToken: string, query: string = "is:unread category:primary", maxResults: number = 10) {
    const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
    });

    const res = await fetch(`${BASE_URL}/messages?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`Gmail API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.messages as { id: string; threadId: string }[] || [];
}

export async function getMessage(accessToken: string, messageId: string): Promise<ParsedEmail> {
    const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`Gmail API Error: ${res.status} ${res.statusText}`);
    }

    const data: EmailMessage = await res.json();

    // Header parsing
    const headers = data.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
    const from = headers.find((h) => h.name === "From")?.value || "(Unknown)";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    // Body parsing (simplify multipart)
    let bodyData = data.payload.body.data;
    if (!bodyData && data.payload.parts) {
        // Prefer text/plain, then text/html
        // For simplicity, just take the first part that has data
        const part = data.payload.parts.find((p: any) => p.body.data);
        if (part) {
            bodyData = part.body.data;
        }
    }

    let body = "";
    if (bodyData) {
        // Base64url decode
        // Replace - with +, _ with /
        const base64 = bodyData.replace(/-/g, "+").replace(/_/g, "/");
        // Decode
        try {
            // Note: In Node environment (Server Action/API Route), Buffer is available.
            // If running on edge, might need other decoding. Using Buffer for Node.
            body = Buffer.from(base64, "base64").toString("utf-8");
        } catch (e) {
            console.error("Failed to decode email body", e);
            body = data.snippet;
        }
    } else {
        body = data.snippet;
    }

    return {
        id: data.id,
        subject,
        from,
        date,
        snippet: data.snippet,
        body,
    };
}

export async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
    // Construct raw email
    // format:
    // To: to
    // Subject: subject
    // 
    // body

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        body,
    ];
    const message = messageParts.join("\n");

    // Base64url encode
    const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const res = await fetch(`${BASE_URL}/messages/send`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            raw: encodedMessage,
        }),
    });

    if (!res.ok) {
        throw new Error(`Gmail API Error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
}
