import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(req) {
    const token = await getServerSession(authOptions);
    
    if (!token?.user?.apiToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Önce kullanıcıları çekelim
        const usersResult = await fetch(
            `${process.env.API_URL}/User`,
            {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token.user.apiToken}`,
                },
            }
        );

        const usersData = await usersResult.json();

        // Sonra mesajları çekelim
        const messagesResult = await fetch(
            `${process.env.API_URL}/Message`,
            {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token.user.apiToken}`,
                },
            }
        );

        const messagesData = await messagesResult.json();

        if (!usersData.success || !messagesData.success) {
            return NextResponse.json(
                { error: "Failed to fetch data" },
                { status: 400 }
            );
        }

        // Kullanıcı bilgilerini map'e alalım
        const userMap = new Map(
            usersData.data.map(user => [user.username, user])
        );

        // Son mesajları kullanıcılara göre gruplayalım
        const lastMessagesByUser = new Map();

        messagesData.data.forEach(message => {
            const otherUser = message.senderUsername === token.user.username ? 
                message.receiverUsername : message.senderUsername;

            if (!lastMessagesByUser.has(otherUser) || 
                new Date(message.createdAt) > new Date(lastMessagesByUser.get(otherUser).createdAt)) {
                lastMessagesByUser.set(otherUser, message);
            }
        });

        // Son mesajlaşılan kullanıcıları oluşturalım
        const recentUsers = Array.from(lastMessagesByUser.entries())
            .map(([username, lastMessage]) => {
                const userInfo = userMap.get(username);
                return {
                    id: userInfo?.id || 0,
                    username: username,
                    name: userInfo?.fullName || username,
                    type: "U",
                    lastMessage: lastMessage.content,
                    lastMessageDate: lastMessage.createdAt
                };
            })
            .sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate))
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            data: recentUsers
        });

    } catch (error) {
        console.error("Error fetching last messages:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
} 