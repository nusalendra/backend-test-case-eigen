'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BorrowingBook extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BorrowingBook.belongsTo(models.Book, { foreignKey: 'book_id' });
      BorrowingBook.belongsTo(models.Member, { foreignKey: 'member_id' });
    }
  }
  BorrowingBook.init({
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Books',
        key: 'id'
      }
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
  }, {
    sequelize,
    modelName: 'BorrowingBook',
  });
  return BorrowingBook;
};