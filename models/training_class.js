let Sequelize = require('sequelize');
let db = syzoj.db;

let model = db.define('training_class', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(120) }
}, {
    timestamps: false,
    tableName: 'training_class',
});

let Model = require('./common');
class TrainingClass extends Model {
    static async create(val) {
        return TrainingClass.fromRecord(TrainingClass.model.build(Object.assign({
            id: 0,
            name: null
        }, val)));
    }

    getModel() { return model; }
}

TrainingClass.model = model;

module.exports = TrainingClass;