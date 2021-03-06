var Chat = Class.create({
  initialize: function () {
    // interval
    this.updateInterval = 5;
    this.updateMemberListInterval = 60;
    this.heartbeatInterval = 30;

    this.url = {};
    this.updateTimer = null;
    this.updateMemberListTimer = null;
    this.heartbeatTimer = null;

    this.lastID = 0;

    var html = '<dt>'
             + '<span class="number">#{number}</span>: '
             + '<a href="#{member_url}" target="_blank">#{member_name}</a> '
             + '#{created_at}'
             + '</dt>'
             + '<dd class="#{command}">#{body}</dd>';
    this.contentTemplate = new Template(html);

    html = '<dd id="restart">'
         + '<a href="javascript:void(0)" id="restartLink">再接続する</a>'
         + '</dd>';
    this.restartLink = html;

    Event.observe(window, 'load', this.onLoad.bind(this));
  },

  onLoad: function (evt) {
    this.checkLastID();
    this.scroll($('chatview'));

    Event.observe('chat_content', 'submit', this.onSubmit.bind(this));

    this.timerStart();
  },

  onSubmit: function (evt) {
    if ($F('chat_content_body') != '') {
      var param = Form.serialize('chat_content', true);
      $('chat_content_body').setValue('');
      this.post(param);
    }

    Event.stop(evt);
  },

  onRestartLinkClick: function (evt) {
    this.timerStart();
    Event.stop(evt);
  },

  checkLastID: function () {
    var num = $('chatview').getElementsByClassName('number');
    if (num.length == 0) return;
    this.lastID = parseInt(num[num.length - 1].innerHTML);
  },

  scroll: function (obj) {
    // 一番下までスクロール
    obj.scrollTop = 999999;
  },

  chatviewUpdated: function (response) {
    var json = response.responseJSON;

    if (!json || json.length == 0) {
      return;
    }

    var html = '';
    json.each(function (content) {
      content.number = parseInt(content.number);

      // 受信済みのIDを二度受信してしまった場合は破棄する
      if (content.number <= this.lastID) {
        return;
      }

      this.lastID = content.number;
      html += this.contentTemplate.evaluate(content);
    }, this);

    $('chatview').innerHTML += html;

    this.scroll($('chatview'));
  },

  update: function () {
    new Ajax.Request(this.url['show'], {
      method: 'get',
      parameters: { view: 'chat', last: this.lastID },
      insertion: Insertion.Bottom,
      onSuccess: function (response) {
        this.chatviewUpdated(response);
        this.startUpdateTimer();
      }.bind(this),
      onFailure: this.timerStop.bind(this),
      onException: this.timerStop.bind(this)
    });
  },

  startUpdateTimer: function () {
    this.updateTimer = setTimeout(this.update.bind(this), this.updateInterval * 1000);
  },

  updateMemberList: function () {
    new Ajax.Updater({success: 'memberlist'}, this.url['show'], {
      method: 'get',
      parameters: { view: 'member' },
      onSuccess: this.startUpdateMemberListTimer.bind(this),
      onFailure: this.timerStop.bind(this),
      onException: this.timerStop.bind(this)
    });
  },

  startUpdateMemberListTimer: function () {
    this.updateMemberListTimer = setTimeout(this.updateMemberList.bind(this), this.updateMemberListInterval * 1000);
  },

  post: function (param) {
    param['last'] = this.lastID;
    new Ajax.Request(this.url['post'], {
      method: 'post',
      parameters: param,
      insertion: Insertion.Bottom,
      onSuccess: function (response) {
        this.chatviewUpdated(response);
      }.bind(this)
    });
  },

  heartbeat: function () {
    new Ajax.Request(this.url['heartbeat'], {
      method: 'post',
      onSuccess: this.startHeartbeatTimer.bind(this),
      onFailure: this.timerStop.bind(this),
      onException: this.timerStop.bind(this)
    });
  },

  startHeartbeatTimer: function () {
    this.heartbeatTimer = setTimeout(this.heartbeat.bind(this), this.heartbeatInterval * 1000);
  },

  timerStop: function () {
    clearTimeout(this.updateTimer);
    clearTimeout(this.updateMemberListTimer);
    clearTimeout(this.heartbeatTimer);

    $('chatview').innerHTML += this.restartLink;
    Event.observe('restartLink', 'click', this.onRestartLinkClick.bind(this));
    this.scroll($('chatview'));
  },

  timerStart: function () {
    try {
      $('restart').remove();
    }
    catch (e) { }

    this.startUpdateTimer();
    this.startUpdateMemberListTimer();
    this.startHeartbeatTimer();
  }
});

var op_chat = new Chat();
