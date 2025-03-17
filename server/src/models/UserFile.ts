import { Sequelize, DataTypes, Model } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
});

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
    modelName: 'UserFile',
  }
);

export { sequelize, UserFile };