import dotenv from "dotenv";
import { copyAllObjects } from "../services/s3Service";

dotenv.config();

copyAllObjects("playground-yat", "app.js2go.ru")