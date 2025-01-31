import axios from "axios";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import https from 'https';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "User Name" },
                password: { label: "Password", type: "password", placeholder: "Password" }
            },
            async authorize(credentials, req) {
                const url = `${process.env["API_URL"]}/Auth/Login`;
                const user = { id: 0, name: "Kadir Pasaoglu" };

                const axiosInstance = axios.create({
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false // Geliştirme ortamında self-signed sertifikaları kabul et
                    })
                });

                try {
                    const response = await axiosInstance.post(url, {
                        username: credentials.username,
                        password: credentials.password
                    });
                    if (response.data.statusCode === 200) {
                        user.apiToken = response.data.data;
                        user.username = credentials.username;
                        return user;
                    }
                    else {
                        throw new Error("Giriş bilgilerinde problem var....");
                    }
                }
                catch (error) {
                    throw new Error(error);
                }
            }
        })
    ],
    // session: {
    //     jwt: true,
    //     maxAge: 30 * 24 * 60 * 60, //30 gün
    // },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.apiToken = user.apiToken;
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.apiToken = token.apiToken;
            session.user.username = token.username;
            return session;
        }
    }
}
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }