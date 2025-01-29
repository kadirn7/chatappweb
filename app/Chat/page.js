"use client";
import { useEffect } from "react";
import { getSession } from "next-auth/react";



export default function Page() {
  const session =getSession();
  useEffect(()=>{
    session.then(session=>{
      console.log(session);
    });
  },[]);

  return <div>Chat Sayfası</div>;

}

