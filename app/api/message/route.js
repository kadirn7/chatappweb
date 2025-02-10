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

        const messages = data.data.map(message => {
            // Mesaj içeriğinden tarih bilgisini çıkaralım
            const content = message.content;
            
            return {
                id: message.id,
                // Gönderen ben isem "S", değilse "R"
                type: message.senderUsername === senderUsername ? "S" : "R",
                name: content, // Sadece mesaj içeriği
                sender: message.senderUsername,
                receiver: groupName ? groupName : message.receiverUsername
            };
        });

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
        const body = await req.json();
        const { content, receiverUsername, groupName } = body;

        const messageData = {
            content,
            senderUsername: token.user.username,
            ...(groupName 
                ? { 
                    groupName,
                    messageType: "G"
                } 
                : { 
                    receiverUsername,
                    messageType: "P"
                })
        };

        console.log("Sending message data:", messageData); // Debug için

        const result = await fetch(
            `${process.env.API_URL}/message/SendMessage`,
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token.user.apiToken}`,
                },
                body: JSON.stringify(messageData)
            }
        );

        if (!result.ok) {
            const errorData = await result.json();
            console.error("API Error:", errorData); // Debug için
            return NextResponse.json(
                { error: errorData.message || "Failed to send message" },
                { status: result.status }
            );
        }

        const data = await result.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in POST /api/message:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}