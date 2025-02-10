"use client";
import { useState, useEffect, useRef } from "react";
import { getSession, signOut } from "next-auth/react";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { setChatHistory } from "@/lib/features/useSlice";
import {
    Box,
    Container,
    Grid,
    Paper,
    TextField,
    IconButton,
    Typography,
    AppBar,
    Toolbar,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    InputAdornment,
    Autocomplete,
    Badge,
    Menu,
    MenuItem,
    Tooltip,
} from "@mui/material";
import {
    Send as SendIcon,
    Search as SearchIcon,
    ExitToApp as LogoutIcon,
    Person as PersonIcon,
    Group as GroupIcon,
    Settings as SettingsIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { ThemeProvider } from '@mui/material/styles';
import { darkTheme } from '../theme';

// Özel stil bileşenleri
const ChatContainer = styled(Paper)(({ theme }) => ({
    height: "calc(100vh - 140px)",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.chat,
}));

const MessageList = styled(Box)(({ theme }) => ({
    flexGrow: 1,
    overflow: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.chat,
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
    },
}));

const MessageBubble = styled(Paper)(({ theme, isOwn }) => ({
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(1),
    maxWidth: "70%",
    wordWrap: "break-word",
    backgroundColor: isOwn ? '#0B93F6' : theme.palette.background.paper,
    color: isOwn ? '#fff' : theme.palette.text.primary,
    alignSelf: isOwn ? "flex-end" : "flex-start",
    borderRadius: isOwn ? '1.3em 1.3em 0.3em 1.3em' : '1.3em 1.3em 1.3em 0.3em',
    boxShadow: 'none',
    position: 'relative',
    '&:after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        [isOwn ? 'right' : 'left']: -8,
        width: 20,
        height: 20,
        backgroundColor: isOwn ? '#0B93F6' : theme.palette.background.paper,
        borderRadius: '50%',
        zIndex: -1,
    }
}));

const UserListItem = styled(ListItem)(({ theme, isActive }) => ({
    marginBottom: theme.spacing(0.5),
    borderRadius: theme.spacing(1),
    backgroundColor: isActive ? 'rgba(33, 150, 243, 0.15)' : 'transparent',
    '&:hover': {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
    },
}));

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

    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistoryState]);

    useEffect(() => {
        const initialize = async () => {
            const sess = await getSession();
            if (sess?.user?.apiToken) {
                setSession(sess);
                setConnectedUser(sess.user);
                await startConnection(sess.user.apiToken);
                await fetchLastMessages();
            } else {
                window.location.href = "/login";
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
                    'Authorization': `Bearer ${session.user.apiToken}`
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
                throw new Error('Failed to save message');
            }

            // SignalR üzerinden real-time mesaj gönderme
            if (selectedUser.type === "G") {
                await connection.invoke("SendMessageToGroup", selectedUser.username, message);
            } else {
                await connection.invoke("SendMessageToUser", selectedUser.username, message);
            }

            // UI'ı güncelle
            dispatch(
                setChatHistory([
                    ...chatHistoryState,
                    {
                        id: chatHistoryState.length + 1,
                        type: "S", // Her zaman gönderen olarak işaretle
                        name: message,
                        sender: session.user.username,
                        receiver: selectedUser.username
                    }
                ])
            );
            
            setMessage("");
        } catch (err) {
            console.error("Error sending message:", err);
            alert("Mesaj gönderilemedi");
        }
    }

    // Son mesajlaşılan kullanıcıları getir
    const fetchLastMessages = async () => {
        try {
            const response = await fetch('/api/message/lastMessages', {
                headers: {
                    "Authorization": `Bearer ${session?.user?.apiToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent messages');
            }

            const data = await response.json();
            console.log("Last messages data:", data); // Debug için

            if (data.success && Array.isArray(data.data)) {
                const formattedUsers = data.data.map(user => ({
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    type: "U",
                    isActive: false,
                    lastMessage: user.lastMessage,
                    key: `user_${user.id}`
                }));

                setUsersAndGroups(formattedUsers);
            }
        } catch (error) {
            console.error('Error fetching last messages:', error);
        }
    };

    // Session yüklendiğinde son mesajları getir
    useEffect(() => {
        if (session?.user?.apiToken) {
            fetchLastMessages();
        }
    }, [session]);

    return (
        <ThemeProvider theme={darkTheme}>
            <Container maxWidth={false} disableGutters>
                <AppBar position="static" elevation={0} color="transparent">
                    <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main' }}>
                            Chat App
                        </Typography>
                        {connectedUser && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.dark' }}>
                                    {connectedUser.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                                    {connectedUser.name}
                                </Typography>
                                <Tooltip title="Ayarlar">
                                    <IconButton color="primary">
                                        <SettingsIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Çıkış Yap">
                                    <IconButton onClick={handleExit} color="primary">
                                        <LogoutIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Toolbar>
                </AppBar>

                <Grid container sx={{ height: 'calc(100vh - 64px)' }}>
                    {/* Sol Panel */}
                    <Grid item xs={3} sx={{ 
                        borderRight: 1, 
                        borderColor: 'divider',
                        backgroundColor: 'background.paper'
                    }}>
                        <Box sx={{ p: 2 }}>
                            <Autocomplete
                                fullWidth
                                options={searchedUsersAndGroups}
                                onChange={autoCompleteOnChanged}
                                getOptionLabel={(option) => option.label}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Ara..."
                                        variant="outlined"
                                        size="small"
                                        onChange={searchChanged}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon color="primary" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <ListItem {...props}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.dark' }}>
                                                {option.type === "U" ? <PersonIcon /> : <GroupIcon />}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={option.label}
                                            secondary={option.type === "U" ? "Kullanıcı" : "Grup"}
                                        />
                                    </ListItem>
                                )}
                            />
                        </Box>
                        <Divider />
                        <List sx={{ 
                            overflow: 'auto', 
                            maxHeight: 'calc(100vh - 180px)',
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(33, 150, 243, 0.3)',
                                borderRadius: '4px',
                            },
                        }}>
                            {usersAndGroups.map((item) => (
                                <UserListItem
                                    key={item.id}
                                    isActive={item.isActive}
                                    onClick={() => boxClicked(item)}
                                    button
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: item.isActive ? 'primary.main' : 'primary.dark' }}>
                                            {item.type === "U" ? <PersonIcon /> : <GroupIcon />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={item.name}
                                        secondary={
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{
                                                    color: 'text.secondary',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {item.lastMessage || (item.type === "U" ? "Kullanıcı" : "Grup")}
                                            </Typography>
                                        }
                                        primaryTypographyProps={{
                                            color: item.isActive ? 'primary' : 'text.primary'
                                        }}
                                    />
                                </UserListItem>
                            ))}
                        </List>
                    </Grid>

                    {/* Sağ Panel */}
                    <Grid item xs={9} sx={{ backgroundColor: 'background.chat' }}>
                        <ChatContainer elevation={0}>
                            {selectedUser && (
                                <Box sx={{ 
                                    p: 2, 
                                    borderBottom: 1, 
                                    borderColor: 'divider',
                                    backgroundColor: 'background.paper' 
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: 'primary.dark' }}>
                                            {selectedUser.type === "U" ? <PersonIcon /> : <GroupIcon />}
                                        </Avatar>
                                        <Typography variant="h6">
                                            {selectedUser.username}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                            
                            <MessageList>
                                {chatHistoryState.map((msg, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: msg.type === "S" ? 'flex-end' : 'flex-start',
                                            mb: 1.5
                                        }}
                                    >
                                        <MessageBubble isOwn={msg.type === "S"}>
                                            <Typography variant="body1" sx={{ 
                                                fontSize: '0.9375rem',
                                                lineHeight: 1.4,
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {msg.name}
                                            </Typography>
                                        </MessageBubble>
                                    </Box>
                                ))}
                                <div ref={messagesEndRef} />
                            </MessageList>

                            <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                                <TextField
                                    fullWidth
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Mesajınızı yazın..."
                                    variant="outlined"
                                    size="small"
                                    onKeyPress={(e) => e.key === 'Enter' && messageSendHandler()}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={messageSendHandler} color="primary">
                                                    <SendIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>
                        </ChatContainer>
                    </Grid>
                </Grid>
            </Container>
        </ThemeProvider>
    );
}
