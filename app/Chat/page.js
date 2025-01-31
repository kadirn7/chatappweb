"use client";
import Grid from "@mui/material/Unstable_Grid2";
import { getSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";
import styles from "./styles.module.css";
import {
  Autocomplete,
  Divider,
  Stack,
  TextField,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Button,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { setChatHistory } from "@/lib/features/useSlice";
export default function Page() {
  const session = getSession();
  const [searchedUsersAndGroups, setSearchedUsersAndGroups] = useState([]);
  const [usersAndGroups, setUsersAndGroups] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [connection, setConnection] = useState(null);
  const [connectedUser, setConnectedUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [message, setMessage] = useState("");

  //Redux
  const dispatch = useAppDispatch();
  const chatHistoryState = useAppSelector((state) => state.chatHistory);

  function startConnection(apiToken) {
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5246/chathub", {
        accessTokenFactory: () => apiToken,
      })
      .build();

    connection
      .start()
      .then(() => {
        console.log(
          "Connection started! Connection:" + connection.connectionId
        );
        setConnection(connection);
      })
      .catch((err) => console.error("Hata...." + err));

    connection.on("ReceiveMessageFromAll", (user, message) => {
      console.log(`Message from All:${message}`);
    });
    connection.on("ReceiveMessageFromUser", (user, message) => {
      const lsUsername = localStorage.getItem("username");
      if (lsUsername === user) {
        //chatHistoryState doldur.
        dispatch(
          setChatHistory([{
            id: chatHistoryState.length + 1,
            type: "R",
            name: message,
          }])
        );
      }
      console.log(`Message from User:${user}:${message}`);
    });
    connection.on("ReceiveMessageFromGroup", (user, message) => {
      console.log(`Message from Group:${user}:${message}`);
    });
    connection.onclose(() => {
      console.log("Connection Closed");
    });
  }
  useEffect(() => {
    session.then((s) => {
      if (s) {
        //console.log(s);
        setConnectedUser(s.user);
        startConnection(s.user.apiToken);
      } else {
        location.href = "/";
      }
    });
    //TODO: Veritabanından çekilecek.
    setSearchedUsersAndGroups([
      { label: "Fatih", value: 1, type: "U" },
      { label: "AileGrubu", value: 2, type: "G" },
    ]);
  }, []);
  function autoCompleteOnChanged(e, value) {
    //console.log("autoCC", value);
    //TODO: Daha önce eklenmiş ise tekrar eklenmesin.
    if (value) {
      setUsersAndGroups([
        ...usersAndGroups,
        {
          id: value.value,
          name: value.label,
          type: value.type,
          isActive: true,
          username: value.username,
        },
      ]);
    }
  }
  async function searchChanged(e) {
    const value = e.target.value;
    await fetch(`/api/users?name=${value}`)
      .then((res) => res.json())
      .then((data) => setSearchedUsersAndGroups(data))
      .catch((err) => console.error(err));
    //setSearchedUsersAndGroups([{label:"Fatih", value:1, type:"U"}, {label:"AileGrubu", value:2, type:"G"}]);
  }
  function boxClicked(item) {
    dispatch(
      setChatHistory({
        type: "Reset",
      })
    );
    const newUsersAndGroups = usersAndGroups.map((x) => {
      if (x.id === item.id) {
        x.isActive = true;
      } else {
        x.isActive = false;
      }
      return x;
    });
    setSelectedUser(item);
    setUsersAndGroups(newUsersAndGroups);
    //console.log("Selected User", item);

    //* ChatHistory
    const isPrivateChat = item.type === "U";
    fetch(`/api/message?receiverUsername=${item.username}&isPrivateChat=${isPrivateChat}`)
      .then((res) => res.json())
      .then((data) => {
        dispatch(setChatHistory(data));
      }).catch((err) => console.error(err));

    localStorage.setItem("username", item.username);
  }
  function handleMenu(e) {
    setAnchorEl(e.currentTarget);
  }
  function handleClose() {
    setAnchorEl(null);
  }
  function handleExit(e) {
    signOut({ callbackUrl: "/", redirect: true });
  }
  function testMessageHandler() {
    connection
      .invoke("SendMessageToUser", "mehmet.baytar", "Merhaba Fatih")
      .then(() => console.log("Message Sent!"))
      .catch((err) => console.error(err));
  }
  function messageSendHandler() {
    // console.log("SelectedUser", selectedUser);
    // console.log("Message", message);
    if (!selectedUser) return;
    const user = selectedUser?.username;
    connection
      .invoke("SendMessageToUser", user, message)
      .then((r) => {
        console.log("chatHistoryState", chatHistoryState)
        dispatch(
          setChatHistory([{
            id: chatHistoryState.length + 1,
            type: "S",
            name: message,
          }])
        );
      })
      .catch((err) => console.error(err));
    setMessage("");
  }
  return (
    <Grid container height={"100vh"}>
      <Grid xs={3} borderRadius={1} className={styles.leftPanelGrid}>
        <Grid margin={1}>
          <Autocomplete
            disablePortal
            id="combo-box-demo"
            options={searchedUsersAndGroups}
            fullWidth
            onChange={autoCompleteOnChanged}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Users and Groups"
                onChange={searchChanged}
              />
            )}
          />
        </Grid>
        <Divider />
        <Grid style={{ textAlign: "center" }}>
          <h3>Kullanıcılar ve Gruplar</h3>
        </Grid>
        <Divider />
        <Grid>
          {usersAndGroups.map((item) => (
            <Box
              key={item.id}
              border="1px solid azure"
              className={[styles.box, item.isActive ? styles.active : ""]}
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
      <Grid xs={9} border="solid" borderRadius={2}>
        <Grid>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Menü {connectedUser && connectedUser.username}
              </Typography>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-contols="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "top" }}
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                role="menu"
                style={{ top: "50px" }}
              >
                <MenuItem onClick={testMessageHandler}>
                  Test Mesajı Gönder
                </MenuItem>
                <MenuItem onClick={handleExit}>Çıkış</MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>
        </Grid>
        {selectedUser && (
          <Grid>
            <Grid height="86vh">
              <Box border="1px solid azure" borderRadius={1}>
                {chatHistoryState.map((item, index) => (
                  <Box key={index} margin={1}>
                    <Stack
                      spacing={2}
                      direction="row"
                      justifyContent={
                        item.type === "S" ? "flex-end" : "flex-start"
                      }
                    >
                      <h3>{item.type}</h3>
                      <h4>{item.name}</h4>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid
              container
              spacing={4}
              marginX={1}
              alignItems="center"
              justifyContent="end"
            >
              <Grid xs>
                <TextField
                  id="txt-message-send"
                  label="Mesajınızı yazınız"
                  variant="outlined"
                  fullWidth
                  onChange={(e) => setMessage(e.target.value)}
                  value={message}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      messageSendHandler();
                    }
                  }}
                />
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  fullWidth
                  onClick={messageSendHandler}
                >
                  Gönder
                </Button>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
