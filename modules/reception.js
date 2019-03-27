let User = syzoj.model('user');
let JudgeState = syzoj.model('judge_state');
const RatingCalculation = syzoj.model('rating_calculation');
const Contest = syzoj.model('contest');
let UserApply = syzoj.model('user_apply');
let Problem = syzoj.model('problem');
let Article = syzoj.model('article');
let UserPrivilege = syzoj.model('user_privilege');
const RatingHistory = syzoj.model('rating_history');
let ContestPlayer = syzoj.model('contest_player');
const calcRating = require('../libs/rating');
let TrainingType = syzoj.model('training_type');
let TrainigClass = syzoj.model('training_class');

app.get('/reception/info', async (req, res) => {
  try {
    if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

    let allSubmissionsCount = await JudgeState.count();
    let todaySubmissionsCount = await JudgeState.count({ submit_time: { $gte: syzoj.utils.getCurrentDate(true) } });
    let problemsCount = await Problem.count();
    let articlesCount = await Article.count();
    let contestsCount = await Contest.count();
    let usersCount = await User.count();

    res.render('reception_info', {
      allSubmissionsCount: allSubmissionsCount,
      todaySubmissionsCount: todaySubmissionsCount,
      problemsCount: problemsCount,
      articlesCount: articlesCount,
      contestsCount: contestsCount,
      usersCount: usersCount
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    })
  }
});

app.get('/reception/register', async (req, res) => {
  try {
    if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

    let lastuser = await User.query([1, 1], {}, [['id', 'desc']]);
    let username;
    if (lastuser) {
      username = lastuser[0].username;
    }
    if (username && /^[0-9]+$/.test(username)) {
      username = parseInt(username) + 1;
    }
    else {
      let date = new Date;
      username = parseInt(parseInt(date.getFullYear().toString()) % 100) * 10000;
    }
    res.render('reception_register', {
      username: username,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    })
  }
});

app.get('/reception/manage/:id/edit', async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user = await User.fromID(id);
    if (!user) throw new ErrorMessage('无此用户。');

    let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    if (!allowedEdit) {
      throw new ErrorMessage('您没有权限进行此操作。');
    }

    user.privileges = await user.getPrivileges();

    res.locals.user.allowedManage = await res.locals.user.hasPrivilege('manage_user');

    let School = syzoj.model('school');
    let schools = await School.query(null, null, [['id', 'asc']]);
    let user_applys = await UserApply.query(null, null, [['apply_time', 'desc']]);

    res.render('reception_user_edit', {
      edited_user: user,
      schools: schools,
      user_applys: user_applys,
      error_info: null
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/forget', async (req, res) => {
  res.render('forget');
});

app.post('/reception/manage/:id/edit', async (req, res) => {
  let user;
  try {
    let id = parseInt(req.params.id);
    user = await User.fromID(id);
    if (!user) throw new ErrorMessage('无此用户。');

    let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    if (!allowedEdit) throw new ErrorMessage('您没有权限进行此操作。');

    if (req.body.old_password && req.body.new_password) {
      if (user.password !== req.body.old_password && !await res.locals.user.hasPrivilege('manage_user')) throw new ErrorMessage('旧密码错误。');
      user.password = req.body.new_password;
    }

    if (res.locals.user && await res.locals.user.hasPrivilege('manage_user')) {
      if (!syzoj.utils.isValidUsername(req.body.username)) throw new ErrorMessage('无效的用户名。');
      user.username = req.body.username;
    }
    user.realname = req.body.realname;
    user.phone = req.body.phone.toString();

    await user.save();

    if (user.id === res.locals.user.id) res.locals.user = user;

    user.privileges = await user.getPrivileges();
    res.locals.user.allowedManage = await res.locals.user.hasPrivilege('manage_user');

    res.render('reception_user_edit', {
      edited_user: user,
      error_info: ''
    });
  } catch (e) {
    user.privileges = await user.getPrivileges();
    res.locals.user.allowedManage = await res.locals.user.hasPrivilege('manage_user');

    res.render('reception_user_edit', {
      edited_user: user,
      error_info: e.message
    });
  }
});

app.get('/reception/manage', async (req, res) => {
  try {
    if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

    let where = { is_show: true };
    let username = req.query.username;
    if (username) where.username = username;
    let realname = req.query.realname;
    if (realname) where.realname = realname;
    let min_time = parseInt((new Date(req.query.min_time)).getTime() / 1000);
    let max_time = parseInt((new Date(req.query.max_time)).getTime() / 1000);
    if (!isNaN(min_time) || !isNaN(max_time)) {
      if (!isNaN(min_time) && !isNaN(max_time)) {
        where.register_time = {
          $and: {
            $gte: parseInt(min_time),
            $lte: parseInt(max_time)
          }
        };
      }
      else if (!isNaN(min_time)) {
        where.register_time = {
          $and: {
            $gte: parseInt(min_time)
          }
        };
      }
      else if (!isNaN(max_time)) {
        where.register_time = {
          $and: {
            $lte: parseInt(max_time)
          }
        };
      }
    }

    let training_type_id = parseInt(req.query.training_type);
    if (!isNaN(training_type_id))
      where.training_type_id = training_type_id;
    let training_class_id = parseInt(req.query.training_class);
    if (!isNaN(training_class_id))
      where.training_class_id = training_class_id;
        
    const sort = req.query.sort || syzoj.config.sorting.reception.field;
    const order = req.query.order || syzoj.config.sorting.reception.order;
    if (!['realname', 'id', 'username', 'register_time'].includes(sort) || !['asc', 'desc'].includes(order)) {
      throw new ErrorMessage('错误的排序参数。');
    }
    let paginate = syzoj.utils.paginate(await User.count(where), req.query.page, syzoj.config.page.reception);
    let users = await User.query(null, null, [[sort, order]]);
    
    let training_classs = await TrainigClass.query(null, null, [['id', 'asc']]);
    let training_types = await TrainingType.query(null, null, [['id', 'asc']]);

    res.render('reception_manage', {
      users: users,
      paginate: paginate,
      curSort: sort,
      curOrder: order === 'asc',
      training_classs: training_classs,
      training_types: training_types,
      form: req.query,
      min_time: min_time
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    })
  }
});

app.get('/reception/manage/:id', async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user = await User.fromID(id);
    if (!user) throw new ErrorMessage('无此用户。');

    let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    if (!allowedEdit) {
      throw new ErrorMessage('您没有权限进行此操作。');
    }

    user.privileges = await user.getPrivileges();

    res.locals.user.allowedManage = await res.locals.user.hasPrivilege('manage_user');

    let School = syzoj.model('school');
    let schools = await School.query(null, null, [['id', 'asc']]);
    let training_types = await TrainingType.query(null, null, [['id', 'asc']]);
    let training_classs = await TrainigClass.query(null, null, [['id', 'asc']]);

    let user_applys = await UserApply.query(null, { 'user_id': id }, [['apply_time', 'desc']]);
    if (user_applys) {
      for (let user_apply of user_applys) {
        for (school of schools) {
          if (parseInt(user_apply.school) == parseInt(school.id))
            user_apply.school = school.name.toString();
        }
        for (let training_type of training_types) {
          if (parseInt(user_apply.training_type_id) == parseInt(training_type.id)) {
            user_apply.training_type_id = training_type.name;
          }
        }
        for (let training_class of training_classs) {
          if (parseInt(user_apply.training_class_id) == parseInt(training_class.id)) {
            user_apply.training_class_id = training_class.name;
          }
        }
      }
    }

    res.render('reception_user', {
      show_user: user,
      schools: schools,
      training_types: training_types,
      training_classs: training_classs,
      user_applys: user_applys,
      error_info: null
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/forget', async (req, res) => {
  res.render('forget');
});

app.post('/reception/manage/:id/add_training', async (req, res) => {
  let user;
  try {
    res.setHeader('Content-Type', 'application/json');
    let id = parseInt(req.params.id);
    user = await User.fromID(id);
    if (!user) throw 2001;

    let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    if (!allowedEdit) throw 2002;

    user_apply = await UserApply.create({
      user_id: id,
      school: req.body.school ? req.body.school : null,
      cur_class: req.body.cur_class ? req.body.cur_class : null,
      training_type_id: req.body.training_type ? req.body.training_type : null,
      training_class_id: req.body.training_class ? req.body.training_class : null
    });
    await user_apply.save();

    res.send(JSON.stringify({ error_code: 1 }));
  } catch (e) {
    syzoj.log(e);
    res.send(JSON.stringify({ error_code: e }));
  }

});