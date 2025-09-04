import axios, { AxiosInstance } from 'axios';

let client: AxiosInstance | undefined;

const createApiClient = () => {
  client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
  });

  client.interceptors.request.use(config => {
    // TODO: here might be added access_token to the headers

    return config;
  });
};

if (!client) {
  createApiClient();
}

export default client as AxiosInstance;
