'use strict';
const { Model } = require('sequelize')
const Sequelize = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class StoreKeys extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate() { 
      // define association here
    }
  }
  StoreKeys.init({
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
  },
    domain: DataTypes.STRING,
    store_url: DataTypes.STRING,
    api_key: DataTypes.STRING,
    api_secret: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'StoreKeys',
    tableName: 'storeKeys',
    underscored: true,
  });
  return StoreKeys;
};
