import { where } from "sequelize";
import { User, Api } from "../models/User";

export const profileService = {
  async get(userId: number): Promise<Api| undefined> {
   const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    return user.api
  },

  async save(userId: number, api: Api) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    await user.update({api},{where: { id: userId }});
  },

};
