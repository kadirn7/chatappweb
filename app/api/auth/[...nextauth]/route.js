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
                try {
                    const axiosInstance = axios.create({
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false
                        })
                    });

                    const response = await axiosInstance.post(`${process.env.API_URL}/Auth/Login`, {
                        username: credentials.username,
                        password: credentials.password
                    });

                    if (response.data.statusCode === 200) {
                        return {
                            id: 1, // Veya API'den gelen gerçek ID
                            name: credentials.username,
                            username: credentials.username,
                            apiToken: response.data.data
                        };
                    }
                    
                    throw new Error("Giriş bilgilerinde problem var....");
                }
                catch (error) {
                    console.error("Login error:", error);
                    throw new Error("Giriş sırasında bir hata oluştu");
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.user = {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    apiToken: user.apiToken
                };
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.user) {
                session.user = token.user;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login'
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development'
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };