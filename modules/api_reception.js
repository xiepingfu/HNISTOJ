let User = syzoj.model('user');
let Problem = syzoj.model('problem');
let File = syzoj.model('file');
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
  