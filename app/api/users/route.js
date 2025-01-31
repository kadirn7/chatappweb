import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import https from 'https';
// SSL sertifika kontrolünü devre dışı bırak
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET(req) {
    const name = await req.nextUrl.searchParams.get("name");
    //console.log(name);

    const session = await getServerSession(authOptions);
    const result = await fetch(`${process.env.API_URL}/User?name=${name}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user.apiToken}`
        }
    });

    const data = await result.json();
    const list = data.data.map((u) => {
        return { label: u.fullName, value: u.id, type: "U", username: u.username }
    });
    return NextResponse.json(list);
}


export async function POST(req) {
    try {
        const { username, password, email, fullName } = await req.json();

        console.log('Sending request to:', `${process.env.API_URL}/Auth/register`);
        console.log('Request body:', { username, email, fullName }); // password'ü loglamıyoruz

        const response = await fetch(`${process.env.API_URL}/Auth/register`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, email, fullName })
        });

        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (error) {
            console.error('JSON parse error:', error);
            return NextResponse.json(
                { error: 'Invalid response from server' },
                { status: 500 }
            );
        }

        if (!response.ok) {
            return NextResponse.json(
                { error: responseData?.message || 'Registration failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(responseData);
        
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}