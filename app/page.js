"use client";
import { Grid2 as Grid, TextField, Button } from '@mui/material';
import { useState } from "react";

import { loginRequest } from "./request/loginRequest";

export default function Home() {
  
  const [user, setUser] = useState({
    username: '',
    password: ''
  });

  function loginButtonClicked(){
     console.log(user);
     
  }

  

  return (
    <Grid 
      height="100vh"
      width="100vw"
      container
      direction="column"
      justifyContent="center" 
      alignItems="center"
    >
      <Grid  xs={3}>
        <h1>Chat App Login Page</h1>
      </Grid>
      
      <Grid  container direction="column" spacing={2} maxWidth="300px">
        <Grid >
          <TextField
            fullWidth
            id="username-field"
            label="Username"
            variant="outlined"
            value={user.username}
            name="username"
            onChange={e=>setUser({...user,username:e.target.value})}
          />
        </Grid>
        
        <Grid >
          <TextField
            fullWidth
            id="password-field"
            type="password"
            label="Password"
            variant="outlined"
            value={user.password}
            name="password"
            onChange={e=>setUser({...user,password:e.target.value})}
          />
        </Grid>
        
        <Grid >
          <Button 
            fullWidth 
            variant="contained" 
            color="primary"
            onClick={loginButtonClicked}
          >
            Login
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}
