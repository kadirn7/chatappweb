import axios from 'axios'

const options = {
    headers: {
        "Content-Type": "application/json",
        "accept": "text/plain"
    },
};

export const loginRequest = async (user) => {
    try {
        const response = await axios.post(
            'https://localhost:7184/api/Auth/login',
            user,
            options
        );
        return response;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
};
