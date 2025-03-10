import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(req) {
    const searchName = req.nextUrl.searchParams.get("name");
    
    const token = await getServerSession(authOptions);
    
    if (!token?.user?.apiToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const apiUrl = `${process.env.API_URL}/User${searchName ? `?name=${searchName}` : ''}`;
        
        const result = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.user.apiToken}`,
            },
        });

        if (!result.ok) {
            const errorData = await result.json();
            return NextResponse.json(
                { error: errorData.message || "Failed to fetch users" },
                { status: result.status }
            );
        }

        const data = await result.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
