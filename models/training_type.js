let Sequelize = require('sequelize');
let db = syzoj.db;

let model = db.define('training_type', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(120) }
}, {
    timestamps: false,
    tableName: 'training_type',
});

let Model = require('./common');
class TrainingType extends Model {
    static async create(val) {
        return TrainingType.fromRecord(TrainingType.model.build(Object.assign({
            id: 0,
            name: null
        }, val)));
    }

    getModel() { return model; }
}

TrainingType.model = model;

module.exports = TrainingType;