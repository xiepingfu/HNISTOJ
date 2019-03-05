let Sequelize = require('sequelize');
let db = syzoj.db;

let model = db.define('school', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(120) }
}, {
    timestamps: false,
    tableName: 'school',
});

let Model = require('./common');
class School extends Model {
    static async create(val) {
        return School.fromRecord(School.model.build(Object.assign({
            id: 0,
            name: null
        }, val)));
    }

    getModel() { return model; }
}

School.model = model;

module.exports = School;