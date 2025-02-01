import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(req) {
    const receiverUsername = req.nextUrl.searchParams.get("receiverUsername");
    const groupName = req.nextUrl.searchParams.get("groupName");

    const token = await getServerSession(authOptions);
    
    if (!token?.user?.apiToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const senderUsername = token.user.username;

    try {
        // Query parametrelerini oluştur
        let apiUrl = `${process.env.API_URL}/message/GetMessageHistory`;
        const queryParams = new URLSearchParams();

        if (groupName) {
            // Grup mesajları için
            queryParams.append("groupName", groupName);
            // Eğer backend grup mesajları için senderUsername gerektiriyorsa:
            queryParams.append("senderUsername", senderUsername);
        } else if (receiverUsername) {
            // Özel mesajlar için
            queryParams.append("senderUsername", senderUsername);
            queryParams.append("receiverUsername", receiverUsername);
        } else {
            return NextResponse.json(
                { error: "Either groupName or receiverUsername must be provided" },
                { status: 400 }
            );
        }

        apiUrl = `${apiUrl}?${queryParams.toString()}`;
        console.log("Fetching messages from:", apiUrl); // Debug için URL'i logla

        const result = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.user.apiToken}`,
            },
        });

        if (!result.ok) {
            const errorData = await result.json();
            console.error("API Error:", errorData); // Debug için hata detayını logla
            return NextResponse.json(
                { error: errorData.message || "Failed to fetch messages" },
                { status: result.status }
            );
        }

        const data = await result.json();
        console.log("API Response:", data); // Debug için API yanıtını logla
        
        if (!data.success) {
            return NextResponse.json(
                { error: data.message || "Failed to fetch messages" },
                { status: 400 }
            );
        }

        const messages = data.data.map(message => ({
            id: message.id,
            type: groupName ? "G" : message.senderUsername === senderUsername ? "S" : "R",
            name: `${message.content} ${message.createdAt}`,
            sender: message.senderUsername,
            receiver: groupName ? groupName : message.receiverUsername
        }));

        return NextResponse.json(messages);

    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

export async function POST(req) {
    const token = await getServerSession(authOptions);
    
    if (!token?.user?.apiToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const messageData = await req.json();
        console.log("Received message data:", messageData); // Debug için

        // API endpoint'ini düzelt
        const response = await fetch(`${process.env.API_URL}/Message`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.user.apiToken}`,
            },
            body: JSON.stringify({
                content: messageData.content,
                senderUsername: messageData.senderUsername,
                receiverUsername: messageData.receiverUsername,
                groupId: messageData.groupId,
                messageType: messageData.messageType,
                isDeleted: false,
                createdAt: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("API Error Response:", error); // Debug için
            return NextResponse.json(
                { error: error.message || "Failed to send message" },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log("API Success Response:", data); // Debug için
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in message POST:", error);
        return NextResponse.json(
            { error: "An error occurred while sending message" },
            { status: 500 }
        );
    }
}