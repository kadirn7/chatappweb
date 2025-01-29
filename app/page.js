"use client";
import { Grid2 as Grid, TextField, Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import { useState } from "react";
import { signIn } from "next-auth/react";
export default function Home() {
  
  const [user, setUser] = useState({
    username: '',
    password: ''
  });
  const [error,setError]=useState(null);

  function handleSubmit(e){
    e.preventDefault();
    const username=e.currentTarget.username.value;
    const password=e.currentTarget.password.value;
    
    signIn("credentials",{
      username,password,redirect:false
    }).then((result)=>{
      if(result.ok){
        alert("Login Success");
      }
      else if(result.error){
        console.log(result.error);
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid
        height="100vh"
        direction="column"
        container
        justifyContent="center"
        alignItems="center"
        rowGap={2}
      >
        
        <Grid xs={3}>
          <h1>Chat App Login Page</h1>
        </Grid>
        <Grid xs={3}>
          <TextField
            fullWidth
            id="outlined-basic"
            label="Username"
            variant="outlined"
            name="username"
          />
        </Grid>
        <Grid xs={3}>
          <TextField
            fullWidth
            id="outlined-basic"
            label="Password"
            variant="outlined"
            type="password"
            name="password"
          />
        </Grid>
        {error &&<Grid xs={3}>
        <Alert severity="error">{error}</Alert>
        </Grid>}
        
        <Grid xs={3}>
          <Button
            variant="contained"
            color="primary"
            label="Log In"
            fullWidth
            type="submit"
          >
            Log In
          </Button>
          <a href="/register">Register</a>
        </Grid>
      </Grid>
    </form>
  );
}