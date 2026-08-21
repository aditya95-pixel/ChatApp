import axios from "axios";

export const axiosInstance = axios.create({

  baseURL: "http://192.168.0.235:5001/api", 
  withCredentials: true,
});