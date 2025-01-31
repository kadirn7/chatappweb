import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, useStore } from "react-redux";
import { chatHistoryReducer } from "./features/useSlice";

export const makeStore = () => {
  return configureStore({
    reducer: { chatHistory: chatHistoryReducer },
  });
};

export const useAppDispatch = useDispatch.withTypes();
export const useAppSelector = useSelector.withTypes();
export const useAppStore = useStore.withTypes();
