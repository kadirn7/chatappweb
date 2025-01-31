import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";


export async function GET(req){
    const receiverUsername = await req.nextUrl.searchParams.get("receiverUsername");
    const isPrivateChat = await req.nextUrl.searchParams.get("isPrivateChat");

    const token = await getServerSession(authOptions);
    const senderUsername = token.user.username;

    const result = await fetch(
        `${process.env.API_URL}/message/GetMessageHistory?senderUsername=${senderUsername}&receiverUsername=${receiverUsername}&messageForPrivateChat=${isPrivateChat}`,{
            method:'GET',
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token?.user.apiToken}`,
            },
        }
    );

    const data = await result.json();
    const list = data.data.map((u)=>{
        return {id:u.id, type:u.type, name:u.content+ " "+ u.createdAt};
    });

    return NextResponse.json(list);
}