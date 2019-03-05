let Sequelize = require('sequelize');
let db = syzoj.db;

let model = db.define('user_apply', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: Sequelize.INTEGER },
    school: { type: Sequelize.STRING(120) },
    cur_class: { type: Sequelize.STRING(120) },
    training_type_id: { type: Sequelize.INTEGER },
    training_class_id: { type: Sequelize.INTEGER },
    apply_time: { type: Sequelize.INTEGER}
}, {
    timestamps: false,
    tableName: 'user_apply',
});

let Model = require('./common');
class UserApply extends Model {
    static async create(val) {
        return UserApply.fromRecord(UserApply.model.build(Object.assign({
            id: 0,
            user_id: null,
            school: null,
            cur_class: null,
            training_class_id: null,
            training_type_id: null,
            apply_time: parseInt((new Date()).getTime() / 1000)
        }, val)));
    }

    getModel() { return model; }
}

UserApply.model = model;

module.exports = UserApply;