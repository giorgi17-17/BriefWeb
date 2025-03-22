import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContextValue";

export function useAuth() {
  console.log("Using Auth Hook");
  return useContext(AuthContext);
}
