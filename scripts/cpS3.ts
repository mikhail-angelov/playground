import dotenv from "dotenv";
import { copyAllObjects } from "../src/services/s3Service";

dotenv.config();

copyAllObjects("playground-yat", "app.js2go.ru");
