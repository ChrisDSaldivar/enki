import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

// order of InferAttributes & InferCreationAttributes is important.
class Note extends Model<InferAttributes<Note>, InferCreationAttributes<Note>> {
  // 'CreationOptional' is a special type that marks the field as optional
  // when creating an instance of the model (such as using Model.create()).
  declare commit: string;

  declare lineNumber: number;

  declare repo: string;

  declare owner: string;

  declare file: string;

  declare note: string;
}

export default Note;
