"use client";
import Grid from "@mui/material/Unstable_Grid2";
import { getSession, useSession, signOut } from "next-auth/react";
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
    const [session, setSession] = useState(null);
    const [searchedUsersAndGroups, setSearchedUsersAndGroups] = useState([]);
    const [usersAndGroups, setUsersAndGroups] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [connection, setConnection] = useState(null);
    const [connectedUser, setConnectedUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [message, setMessage] = useState("");

    const dispatch = useAppDispatch();
    const chatHistoryState = useAppSelector((state) => state.chatHistory);

    const checkAndSetSession = async () => {
        try {
            const sess = await getSession();
            console.log("Current session:", sess); // Debug için

            if (!sess?.user?.apiToken) {
                console.log("No valid session found");
                window.location.href = "/login";
                return false;
            }

            setSession(sess);
            setConnectedUser(sess.user);
            return true;
        } catch (error) {
            console.error("Session check error:", error);
            window.location.href = "/login";
            return false;
        }
    };

    useEffect(() => {
        const initialize = async () => {
            const hasValidSession = await checkAndSetSession();
            if (hasValidSession && session?.user?.apiToken) {
                startConnection(session.user.apiToken);
            }
        };

        initialize();
    }, []);

    useEffect(() => {
        if (session?.user?.apiToken) {
            console.log("Session is valid, fetching users and groups");
            fetchUsersAndGroups();
        }
    }, [session]);

    function startConnection(apiToken) {
        if (!apiToken) return;

        const newConnection = new HubConnectionBuilder()
            .withUrl("https://localhost:7184/chathub", {
                accessTokenFactory: () => apiToken,
                withCredentials: false,
            })
            .withAutomaticReconnect()
            .build();

        newConnection
            .start()
            .then(() => {
                console.log("Connection started! Connection ID:", newConnection.connectionId);
                setConnection(newConnection);
            })
            .catch((err) => {
                console.error("Connection error:", err);
                alert("Chat bağlantısı kurulamadı. Lütfen sayfayı yenileyin.");
            });

        newConnection.onclose((error) => {
            console.log("Connection closed", error);
            setConnection(null);
        });

        newConnection.on("ReceiveMessageFromAll", (user, message) => {
            console.log(`Message from All: ${message}`);
        });

        newConnection.on("ReceiveMessageFromUser", (user, message) => {
            if (user === session?.user?.username) {
                dispatch(
                    setChatHistory([{
                        id: chatHistoryState.length + 1,
                        type: "R",
                        name: message,
                    }])
                );
            }
        });

        newConnection.on("ReceiveMessageFromGroup", (user, message) => {
            console.log(`Message from Group: ${user}: ${message}`);
        });
    }

    const fetchUsersAndGroups = async (searchTerm = "") => {
        if (!session?.user?.apiToken) {
            console.log("No valid session for fetch:", session); // Debug için
            return;
        }

        try {
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.user.apiToken}`
            };

            const [usersRes, groupsRes] = await Promise.all([
                fetch(`/api/users?name=${searchTerm}`, { headers }),
                fetch(`/api/groups?name=${searchTerm}`, { headers })
            ]);

            if (!usersRes.ok || !groupsRes.ok) {
                throw new Error("Failed to fetch users or groups");
            }

            const [usersData, groupsData] = await Promise.all([
                usersRes.json(),
                groupsRes.json()
            ]);

            // Debug için
            console.log("Users data:", usersData);
            console.log("Groups data:", groupsData);

            const userOptions = (usersData.data || []).map(user => ({
                label: user.name || user.username,
                value: user.id,
                type: "U",
                username: user.username,
                key: `user_${user.id}`
            }));

            const groupOptions = (groupsData.data || []).map(group => ({
                label: group.name,
                value: group.id,
                type: "G",
                username: group.name,
                key: `group_${group.id}`
            }));

            setSearchedUsersAndGroups([...userOptions, ...groupOptions]);
        } catch (err) {
            console.error('Error fetching users and groups:', err);
            alert("Kullanıcılar ve gruplar yüklenirken bir hata oluştu");
        }
    };

    function autoCompleteOnChanged(e, value) {
        if (value) {
            const isUserExists = usersAndGroups.some(user => user.id === value.value);

            if (!isUserExists) {
                setUsersAndGroups(prev => [
                    ...prev,
                    {
                        id: value.value,
                        name: value.label,
                        type: value.type,
                        isActive: true,
                        username: value.username,
                        key: value.key
                    }
                ]);

                boxClicked({
                    id: value.value,
                    username: value.username,
                    type: value.type
                });
            }
        }
    }

    const [searchTimeout, setSearchTimeout] = useState(null);

    function searchChanged(e) {
        const value = e.target.value;
        
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const newTimeout = setTimeout(() => {
            fetchUsersAndGroups(value);
        }, 300);

        setSearchTimeout(newTimeout);
    }

    async function boxClicked(item) {
        try {
            if (!session?.user?.apiToken) {
                throw new Error("No session available");
            }

            dispatch(setChatHistory({ type: "Reset" }));

            const newUsersAndGroups = usersAndGroups.map((x) => ({
                ...x,
                isActive: x.id === item.id
            }));

            setSelectedUser(item);
            setUsersAndGroups(newUsersAndGroups);

            let url = '/api/message?';
            if (item.type === "G") {
                url += `groupName=${encodeURIComponent(item.username)}`;
            } else {
                url += `receiverUsername=${encodeURIComponent(item.username)}`;
            }

            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${session.user.apiToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch messages');
            }

            const messages = await response.json();
            dispatch(setChatHistory(messages));
            localStorage.setItem("username", item.username);
        } catch (error) {
            console.error('Error in boxClicked:', error);
            alert(error.message || "Mesajlar yüklenirken bir hata oluştu");
        }
    }

    function handleMenu(e) {
        setAnchorEl(e.currentTarget);
    }

    function handleClose() {
        setAnchorEl(null);
    }

    async function handleExit() {
        try {
            await signOut({ callbackUrl: "/login" });
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/login";
        }
    }

    function testMessageHandler() {
        connection
            .invoke("SendMessageToUser", "mehmet.baytar", "Merhaba Fatih")
            .then(() => console.log("Message Sent!"))
            .catch((err) => console.error(err));
    }

    async function messageSendHandler() {
        if (!selectedUser || !message.trim()) return;
        
        try {
            // API üzerinden mesajı veritabanına kaydetme
            const response = await fetch('/api/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: message,
                    ...(selectedUser.type === "G" 
                        ? { groupName: selectedUser.username }
                        : { receiverUsername: selectedUser.username }
                    )
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save message');
            }

            // SignalR üzerinden real-time mesaj gönderme
            if (selectedUser.type === "G") {
                await connection.invoke("SendMessageToGroup", selectedUser.username, message);
            } else {
                await connection.invoke("SendMessageToUser", selectedUser.username, message);
            }

            // UI'ı güncelle
            dispatch(
                setChatHistory([{
                    id: chatHistoryState.length + 1,
                    type: selectedUser.type === "G" ? "G" : "S",
                    name: message,
                    sender: connectedUser.username,
                    receiver: selectedUser.username
                }])
            );
            
            setMessage("");
        } catch (err) {
            console.error("Error sending message:", err);
            // Kullanıcıya hata göster
            alert(err.message || "Mesaj gönderilirken bir hata oluştu");
        }
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
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            renderOption={(props, option) => (
                <li {...props} key={option.key}>
                    {option.type === "U" ? "👤" : "👥"} {option.label}
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Kullanıcı ve Grup Ara"
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
                <h3>{item.type === "U" ? "👤" : "👥"}</h3>
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
                      {selectedUser.type === "G" && (
                        <small>{item.sender}</small>
                      )}
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
