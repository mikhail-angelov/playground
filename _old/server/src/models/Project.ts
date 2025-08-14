import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

class Project extends Model {
  public id!: number;
  public userId!: string;
  public name!: string;
  public projectId!: string;
  public image?: string;
  public rating!: number;
}

Project.init(
  {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rating: {
      type: DataTypes.NUMBER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'projects',
  }
);

export { Project };