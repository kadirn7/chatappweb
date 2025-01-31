import axios from 'axios'

let options = {
    method:'',
    headers:{
        "Content-Type":"application/json"
    },
}

export const loginRequest = async (user) =>{
    options.method = "POST";
    options.url = "https://localhost:7184/api/Auth/login";
    options.data = JSON.stringify(user);
    return axios(options);
}