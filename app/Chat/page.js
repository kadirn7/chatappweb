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
    overflow: "auto",
    padding: theme.spacing(2),
    backgroundColor: '#121212',
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
    borderRadius: isOwn ? '1.3em' : '1.3em',
    boxShadow: 'none',
    '&:first-of-type': {
        borderTopRightRadius: isOwn ? '1.3em' : '1.3em',
        borderTopLeftRadius: '1.3em',
    },
    '&:last-of-type': {
        borderBottomRightRadius: '1.3em',
        borderBottomLeftRadius: isOwn ? '1.3em' : '1.3em',
    },
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

    const checkAndSetSession = async () => {
        try {
            const sess = await getSession();
            console.log("Current session:", sess); // Debug için

            if (!sess || !sess.user?.apiToken) {
                console.log("No valid session found, redirecting to login");
                window.location.href = "/login";
                return false;
            }

            setSession(sess);
            setConnectedUser(sess.user);
            return true;
        } catch (error) {
            console.error("Session check error:", error);
            return false;
        }
    };

    useEffect(() => {
        const initialize = async () => {
            const hasValidSession = await checkAndSetSession();
            if (hasValidSession) {
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

    // Mesaj içeriğini ayıklama fonksiyonu
    const extractMessageContent = (fullMessage) => {
        // Mesajı ve tarih/saat bilgisini ayır
        const parts = fullMessage.split(' ');
        // Sadece mesaj içeriğini döndür (son parçayı at)
        return parts.slice(0, -1).join(' ');
    };

    async function messageSendHandler() {
        if (!selectedUser || !message.trim()) return;
        
        try {
            // API üzerinden mesajı veritabanına kaydetme
            const messageData = {
                content: message,
                senderUsername: connectedUser.username,
                receiverUsername: selectedUser.type === "G" ? null : selectedUser.username,
                groupId: selectedUser.type === "G" ? selectedUser.value : null,
                messageType: selectedUser.type === "G" ? "G" : "P"
            };

            console.log("Sending message data:", messageData); // Debug için

            const response = await fetch('/api/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.user?.apiToken}`
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                throw new Error(errorData.error || 'Mesaj gönderilemedi');
            }

            // SignalR üzerinden real-time mesaj gönderme
            try {
                if (selectedUser.type === "G") {
                    await connection.invoke("SendMessageToGroup", selectedUser.username, message);
                } else {
                    await connection.invoke("SendMessageToUser", selectedUser.username, message);
                }
            } catch (signalRError) {
                console.error("SignalR Error:", signalRError);
                // SignalR hatası olsa bile devam et
            }

            // UI güncelleme
            const newMessage = {
                id: chatHistoryState.length + 1,
                type: "S",
                name: message, // Sadece mesaj içeriği
                sender: connectedUser.username,
                receiver: selectedUser.username
            };

            dispatch(setChatHistory([...chatHistoryState, newMessage]));
            setMessage("");

        } catch (err) {
            console.error("Error sending message:", err);
            alert(err.message || "Mesaj gönderilirken bir hata oluştu");
        }
    }
    
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
                                    key={item.key}
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
                                        secondary={item.type === "U" ? "Kullanıcı" : "Grup"}
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
                                {chatHistoryState.map((msg, index) => {
                                    const isOwn = msg.type === "S" || msg.sender === connectedUser?.username;
                                    const messageContent = extractMessageContent(msg.name);
                                    
                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isOwn ? 'flex-end' : 'flex-start',
                                                mb: 1
                                            }}
                                        >
                                            <MessageBubble isOwn={isOwn}>
                                                <Typography variant="body1">
                                                    {messageContent}
                                                </Typography>
                                            </MessageBubble>
                                        </Box>
                                    );
                                })}
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
