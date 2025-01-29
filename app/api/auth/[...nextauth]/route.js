import axios from "axios";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import https from 'https';


const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "Enter your username" },
                password: { label: "Password", type: "password", placeholder: "Enter your password" }
            },
            async authorize(credentials, req ) {
                const url=`${process.env.API_URL}/Auth/login`;
                const user={id:1,name:"Kadirn7"};
                
                // Axios instance oluşturup SSL sertifika kontrolünü yapılandırıyoruz
                const axiosInstance = axios.create({
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false // Geliştirme ortamında self-signed sertifikaları kabul et
                    })
                });

                try{
                    const response = await axiosInstance.post(url, {
                        username:credentials.username,
                        password:credentials.password
                    });
                    if(response.data.statusCode===200){
                        user.apiToken=response.data.data;
                        return user;
                    }
                    else{
                        throw new Error("Kullanıcı adı veya şifre hatalı");
                    }
                }catch(error){
                    console.error("Login error:", error.message);
                    throw new Error(error.message);
                }
            }
        })
    ],
    session: {
        jwt: true,
        maxAge:30*24*60*60 //30 gün
    },
    callbacks:{
        async jwt({token,user}){
            if(user){
                token.id=user.id;
                token.apiToken=user.apiToken;
            }
            return token;
        },
        async session({session,token}){
            session.user.id=token.id;
            session.user.apiToken=token.apiToken;
            return session;
        }
    }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
