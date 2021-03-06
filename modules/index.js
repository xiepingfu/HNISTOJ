let User = syzoj.model('user');
let Article = syzoj.model('article');
let Contest = syzoj.model('contest');
let Problem = syzoj.model('problem');
let ArticleComment = syzoj.model('article-comment');

let Divine = require('syzoj-divine');
let TimeAgo = require('javascript-time-ago');
let zh = require('../libs/timeago');

TimeAgo.locale(zh);
const timeAgo = new TimeAgo('zh-CN');

app.get('/start_page', async (req, res) => {
  try {
    let start_pages = syzoj.config.start_pages;
    let id = req.query.id ? parseInt(req.query.id) : (start_pages[0] ? start_pages[0].article_id : 1);
    let article = await Article.fromID(id);
    if (article) {
      await article.loadRelationships();
      article.allowedEdit = await article.isAllowedEditBy(res.locals.user);
      article.allowedComment = await article.isAllowedCommentBy(res.locals.user);
      article.content = await syzoj.utils.markdown(article.content);
    }
    res.render('start_page', {
      article: article,
      start_pages: start_pages
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/', async (req, res) => {
  try {
    let ranklist = await User.query([1, syzoj.config.page.ranklist_index], { is_show: true }, [[syzoj.config.sorting.ranklist.field, syzoj.config.sorting.ranklist.order]]);
    await ranklist.forEachAsync(async x => x.renderInformation());

    let notices = (await Article.query(null, { is_notice: true }, [['public_time', 'desc']])).map(article => ({
      title: article.title,
      url: syzoj.utils.makeUrl(['article', article.id]),
      date: syzoj.utils.formatDate(article.public_time, 'L')
    }));

    let fortune = null;
    if (res.locals.user) {
      fortune = Divine(res.locals.user.username, res.locals.user.sex);
    }

    let contests = await Contest.query([1, 5], { is_public: true }, [['start_time', 'desc']]);

    let problems = (await Problem.query([1, 5], { is_public: true }, [['publicize_time', 'desc']])).map(problem => ({
      id: problem.id,
      title: problem.title,
      time: timeAgo.format(new Date(problem.publicize_time)),
    }));

    res.render('index', {
      ranklist: ranklist,
      notices: notices,
      fortune: fortune,
      contests: contests,
      problems: problems,
      links: syzoj.config.links
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/help', async (req, res) => {
  try {
    res.render('help');
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});
