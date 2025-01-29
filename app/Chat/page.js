"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { Grid2 as Grid, TextField, Button } from '@mui/material';
import styles from "./styles.module.css";

export default function Page() {
  const session = getSession();
  
  useEffect(() => {
    session.then(session => {
      if (session) {
        console.log(session);
      } else {
        location.href = "/";
      }
    });
  }, []);

  return (
    <Grid container height="100vh" sx={{ backgroundColor: '#f5f5f5' }}>
      <Grid 
        xl={2} borderRadius={2} className={styles.leftPanelGrid}   
      ></Grid>
    </Grid>
  );
}
