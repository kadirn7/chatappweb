import axios from 'axios'



let options={
    method:'',
    headers:{
        "Content-Type":"application/json"
    },
}
export const loginRequest =async (user) =>{
    options.method = "POST";
    options.url="http://localhost:7184/api/auth/login";
    options.data=JSON.stringify(user);
    return await axios(options);
}
