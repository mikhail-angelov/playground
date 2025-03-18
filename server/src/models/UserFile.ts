import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

class UserFile extends Model {
  public id!: number;
  public userId!: string;
  public fileName!: string;
  public s3Key!: string;
}

UserFile.init(
  {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'user_files',
  }
);

export { UserFile };