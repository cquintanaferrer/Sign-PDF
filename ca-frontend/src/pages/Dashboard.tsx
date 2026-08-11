import { useEffect } from "react";
import { getProfile } from "../services/auth.service";

export default function Dashboard() {

  useEffect(() => {
  getProfile()
    .then((data) => {
      console.log("Perfil:", data);
    })
    .catch((error) => {
      console.error("Error perfil:", error);
    });
    }, []);

}