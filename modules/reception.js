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
        if(lastuser) {
            username = lastuser[0].username;
        }
        if(username && /^[0-9]+$/.test(username)) {
            username = parseInt(username) + 1;
        }
        else {
            let date = new Date;
            username = parseInt(parseInt(date.getFullYear().toString())%100)*10000;
        }
        res.render('reception_register', {
            username: username
        });
      } catch (e) {
        syzoj.log(e);
        res.render('error', {
          err: e
        })
      }
});


app.get('/reception/:id/edit', async (req, res) => {
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

    res.render('user_edit', {
      edited_user: user,
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

app.post('/reception/:id/edit', async (req, res) => {
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
      user.email = req.body.email;
      user.phone = req.phone;
    }

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
