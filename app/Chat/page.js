"use client";
import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { Grid2 as Grid, Autocomplete, TextField, Divider, Box, Stack } from '@mui/material';
import styles from "./styles.module.css";

export default function Page() {
  const session = getSession();
  const [searchedUsersAndGroups, setSearchedUsersAndGroups] = useState([]);
  const[usersAndGroups,setUsersAndGroups] = useState([]);
  
  useEffect(() => {
    session.then(session => {
      if (session) {
        console.log(session);
      } else {
        location.href = "/";
      }
    });
    //TODO: Veri tabanından arama yapılacak
    setSearchedUsersAndGroups([{label:"Fatih",value:1,type:"U"},{label:"AileGrubu",value:2,type:"G"}]);
  }, []);

  function autoCompleteOnChanged(event, value) {
    //TODO: daha önce eklenmiş ise tekrar eklenmeyecek
    if(value){
      setUsersAndGroups([...usersAndGroups,{name:value.label,id:value.value,type:value.type,isActive:true}]);
    }
  }

  function serachChanged(event) {
    
  }
  function boxClicked(item){
    
  }

  return (
    <Grid container height="100vh" sx={{ backgroundColor: '#f5f5f5' }}>
      <Grid xl={2} borderRadius={2} className={styles.leftPanelGrid}> 
        <Grid margin={1}>
          <Autocomplete 
            disablePortal 
            id="combo-box-demo" 
            options={searchedUsersAndGroups} 
            fullWidth 
            onChange={autoCompleteOnChanged}  
            renderInput={(params) => 
              <TextField {...params} 
                label="Kullanıcı veya Grup Ara" 
                onChange={serachChanged} 
              />
            }
          />
        </Grid>
        <Divider/>
        <Grid style={{textAlign:"center"}}>
          <h3>Kullanıcılar ve Gruplar</h3>
        </Grid>
        <Divider/>
        <Grid>
          {usersAndGroups.map((item) => (
            <Box 
              key={item.id} 
              border="1px solid azure" 
              className={`${styles.box} ${item.isActive ? styles.active : ''}`}
              boxShadow="1" 
              borderRadius={1} 
              margin={1} 
              padding={1}
              onClick={() => boxClicked(item)}    
            >
              <Stack spacing={2} direction="row">
                <h3>{item.type}</h3>
                <h4>{item.name}</h4>
              </Stack>
            </Box>
          ))}
        </Grid>
      </Grid>
      <Grid xl={10} borderRadius={2} border="Solid"></Grid>
    </Grid>
  );
}
