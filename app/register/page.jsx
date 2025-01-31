"use client";
import { Alert, Button, Link, TextField } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { useState, useEffect } from "react";

export default function Page() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (shouldRedirect) {
      const timer = setTimeout(() => {
        window.location.href = "/Chat";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldRedirect]);

  function handleSubmit(e) {
    e.preventDefault();

    const username = e.currentTarget.username.value;
    const password = e.currentTarget.password.value;
    const passwordAgain = e.currentTarget.passwordAgain.value;
    const email = e.currentTarget.email.value;
    const fullName = e.currentTarget.fullName.value;
    setError("");
    setSuccess("");
    if (password !== passwordAgain) {
      setError("Passwords are not the same");
      return;
    }
    fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username, password, email, fullName
      }),
    }).then(response => {
      return response.json();
    }).then(data => {
      if (data && (data.statusCode === 201 || data.statusCode === 200)) {
        setSuccess("User registered successfully!");
        setShouldRedirect(true);
      } else {
        setError(data.message || "Registration failed");
      }
    }).catch(error => {
      setError(error.message || "An error occurred during registration");
    });
  }
  return (
    <form onSubmit={handleSubmit}>
      <Grid
        sx={{
          minHeight: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          paddingY: 4,
        }}
        direction="column"
        container
        justifyContent="center"
        alignItems="center"
        rowGap={2}
      >
        <Grid
          xs={3}
          height={"30vh"}
          style={{
            textAlign: "center",
            backgroundImage: 'url("images/loginBackground.jpeg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            borderRadius: "10px",
          }}
        ></Grid>
        <Grid xs={3}>
          <h1>Chat App Register Page</h1>
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
            label="Email"
            variant="outlined"
            name="email"
            type="email"
          />
        </Grid>
        <Grid xs={3}>
          <TextField
            fullWidth
            id="outlined-basic"
            label="Full Name"
            variant="outlined"
            name="fullName"
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
        <Grid xs={3}>
          <TextField
            fullWidth
            id="outlined-basic"
            label="Password Again"
            variant="outlined"
            type="password"
            name="passwordAgain"
          />
        </Grid>
        <Grid xs={3} container direction="column" spacing={1}>
          {error && (
            <Grid item>
              <Alert severity="error" style={{ width: '100%' }}>{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item>
              <Alert severity="success" style={{ width: '100%' }}>{success}</Alert>
            </Grid>
          )}
        </Grid>
        <Grid xs={3}>
          <Button
            variant="contained"
            color="primary"
            label="Log In"
            fullWidth
            type="submit"
          >
            Register
          </Button>
        </Grid>
      </Grid>
    </form>
  );
}
