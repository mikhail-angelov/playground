import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export interface Api { provider: string; key: string}
class User extends Model {
  public id!: string;
  public email!: string;
  public token?: string;
  public api?: Api;
}

User.init(
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    api: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'users',
  }
);

export { sequelize, User };