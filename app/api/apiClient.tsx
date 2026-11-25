import axios from "axios";
import { env } from "@/app/config/env";

const apiClients = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: 15000,
    headers: {
        "content-Type": "application/json",
        Accept: "application/json"
    }
})


export default apiClients;