let User = syzoj.model('user');
let Problem = syzoj.model('problem');
let File = syzoj.model('file');
let UserApply = syzoj.model('user_apply');
const Email = require('../libs/email');
const jwt = require('jsonwebtoken');

function setLoginCookie(username, password, res) {
    res.cookie('login', JSON.stringify([username, password]));
}

// Reception Sign up
app.post('/api_reception/reception_sign_up', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      let user = await User.fromName(req.body.username);
      if (user) throw 2008;
  
  
      // Because the salt is "syzoj2_xxx" and the "syzoj2_xxx" 's md5 is"59cb..."
      // the empty password 's md5 will equal "59cb.."
      let syzoj2_xxx_md5 = '59cb65ba6f9ad18de0dcd12d5ae11bd2';
      if (req.body.password === syzoj2_xxx_md5) throw 2007;
      if (!syzoj.utils.isValidUsername(req.body.username)) throw 2002;
      if (req.body.realname == '') throw 3002;
      
  
      if (syzoj.config.register_mail) {
        let sendObj = {
          username: req.body.username,
          password: req.body.password,
          email: req.body.email,
        };
  
        const token = jwt.sign(sendObj, syzoj.config.email_jwt_secret, {
          subject: 'register',
          expiresIn: '2d'
        });
  
        const vurl = req.protocol + '://' + req.get('host') + syzoj.utils.makeUrl(['api', 'sign_up_confirm'], { token: token });
        try {
          await Email.send(req.body.email,
            `${req.body.username} 的 ${syzoj.config.title} 注册验证邮件`,
            `<p>请点击该链接完成您在 ${syzoj.config.title} 的注册：</p><p><a href="${vurl}">${vurl}</a></p><p>如果您不是 ${req.body.username}，请忽略此邮件。</p>`
          );
        } catch (e) {
          return res.send({
            error_code: 2010,
            message: require('util').inspect(e)
          });
        }
  
        res.send(JSON.stringify({ error_code: 2 }));
      } else {
        user = await User.create({
          username: req.body.username,
          password: req.body.password,
          realname: req.body.realname,
          phone: req.body.phone,
          public_email: true
        });
        await user.save();
  
        res.send(JSON.stringify({ error_code: 1, new_user_id: user.id }));
      }
    } catch (e) {
      syzoj.log(e);
      res.send(JSON.stringify({ error_code: e }));
    }
});

// Reception batch register
function randPassword() {
  var text=['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ','1234567890'];
  var rand = function(min, max){return Math.floor(Math.max(min, Math.random() * (max+1)));}
  var len = 6; // 长度
  var pw = '';
  for(i=0; i<len; ++i) {
    var strpos = rand(0, 2);
    pw += text[strpos].charAt(rand(0, text[strpos].length));
  }
  return pw;
} 

app.post('/api_reception/reception_batch_register/preview/:type', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    let amount = req.body.amount;
    let school = req.body.school;
    let cur_class = req.body.cur_class;
    let training_type = req.body.training_type;
    let training_class = req.body.training_class;
    let type = req.params.type;
    let new_users = []
    let error_code = 0;

    if(type == 1) {
      let date = new Date;
      let prefix = parseInt(parseInt(date.getFullYear().toString()) % 100);
      let lastuser = await User.query([1, 1], {username: { $like: prefix.toString()+`%` }}, [['id', 'desc']]);
      let username;
      if (lastuser) {
        username = lastuser[0].username;
      }
      if (username && /^[0-9]+$/.test(username)) {
        username = parseInt(username) + 1;
      }
      else {
        username = prefix * 10000;
      }
      for (var i=0;i<parseInt(amount);i++) {
        let isExist = await User.fromName(parseInt(username) + i);
        if(isExist)
          error_code = 2008;
        new_users.push({
            username: parseInt(username) + i,
            password: randPassword(),
            school: school,
            cur_class: cur_class,
            training_type: training_type,
            training_class: training_class
        });
      }
    }
    else if(type==2) {
      let prefix = req.body.prefix;
      let n = amount.toString().length;
      for (var i=0;i<parseInt(amount);i++) { 
        let isExist =  await User.fromName(prefix + (Array(n).join(0) + i).slice(-n));
        if(isExist)
          error_code = 2008;
        new_users.push({
          username: prefix + (Array(n).join(0) + i).slice(-n),
          password: randPassword(),
          school: school,
          cur_class: cur_class,
          training_type: training_type,
          training_class: training_class
        });
      }
    }
    else {
      let username_array = req.body.usernames;
      let realname_array = req.body.realnames;
      let password_array = req.body.passwords;
      if (username_array.length <= 1 && username_array[0] == '') username_array=[];
      if (realname_array.length <= 1 && realname_array[0] == '') realname_array=[];
      if (password_array.length <= 1 && password_array[0] == '') password_array=[];

      await username_array.forEachAsync(async (element, i) => {
        let isExist =  await User.fromName(element);
        if(isExist)
          error_code = 2008;
        new_users.push({
          username: element,
          password: password_array.length>i ? password_array[i]:randPassword(),
          realname: realname_array.length>i ? realname_array[i]:'',
          school: school,
          cur_class: cur_class,
          training_type: training_type,
          training_class: training_class
        });
      });
    }
    
    res.send(JSON.stringify({ error_code: error_code, new_users: new_users }));
  } catch (e) {
    syzoj.log(e);
    res.send(JSON.stringify({ error_code: e }));
  }
});

app.post('/api_reception/reception_batch_register/comfirm', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    let new_users = req.body.new_users;
    await new_users.forEachAsync(async element => {
      let user = await User.fromName(element.username);
      if(user) throw 2008;
      user = await User.create({
        username: element.username,
        password: element.password,
        public_email: true
      });
      await user.save();
      if (user.id && (element.school || element.cur_class || element.training_type || element.training_class)) {
        let user_apply = await UserApply.create({
          user_id: user.id,
          school: element.school,
          cur_class: element.cur_class,
          training_type_id: element.training_type,
          training_class_id: element.training_class
        })
        await user_apply.save();
      }
    });
    res.send(JSON.stringify({ error_code: 0 }));
  } catch (e) {
    syzoj.log(e);
    res.send(JSON.stringify({ error_code: e }));
  }
});
  