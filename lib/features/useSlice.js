import { createSlice } from "@reduxjs/toolkit";

export const chatHistorySlice = createSlice({
  name: "chatHistory",
  initialState: [],
  reducers: {
    setChatHistory: (state, action) => {
      console.log(action);
      console.log("State", state);
      if (action.payload.type == "Reset") {
        return []
      } else {
        //state.push(action.payload);
        return [...state, ...action.payload]
      }
    },
  },
});

export const { setChatHistory } = chatHistorySlice.actions;
export const chatHistoryReducer = chatHistorySlice.reducer;
