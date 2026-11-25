import axios from 'axios';

const apiClients = axios.create({
    baseURL: 'https://shopapi-52ef.onrender.com/api/',
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
        Accept: 'application/json'
    }
});

export default apiClients;
