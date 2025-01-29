"use client";
import { Grid2 as Grid, TextField, Button } from '@mui/material';
import { useState } from "react";

import { loginRequest } from "./request/loginRequest";

export default function Home() {
  const[user,setUser]=useState({
    username: '',
    password: ''
  });

  function handleChange(e) {
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
  }

  function loginButtonClicked(){
    loginRequest(user).then((response)=>{
      console.log(response);
    })
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
      <Grid item mb={4}>
        <h1>Chat App Login Page</h1>
      </Grid>
      
      <Grid item container direction="column" spacing={2} maxWidth="300px">
        <Grid item>
          <TextField
            fullWidth
            name="username"
            label="Username"
            variant="outlined"
            value={user.username}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item>
          <TextField
            fullWidth
            name="password"
            type="password"
            label="Password"
            variant="outlined"
            value={user.password}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item>
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
