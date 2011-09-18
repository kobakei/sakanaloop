
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
var TITLE = "SAKANALOOP";
var viewerCount = 0;
var VIDEO_IDS = [
	"vS6wzjpCvec",	// アルクアラウンド
	"1awua0YrSRs",	// アイデンティティ 
	"ZdWX0IDhbCU",	// ルーキー
	"tZbXHt3xPr8",	// バッハ
	"xOqvFHwh3rk",	// 目が明く藍色
	"IiqfKF9BlcI",	// ネイティブダンサー
	"eM4wFhp7BRg",	// セントレイ
	"iqrwN-HhnC8",	// サンプル
];
var VIDEO_TITLES = [
	"アルクアラウンド",
	"アイデンティティ",
	"ルーキー",
	"『バッハの旋律を夜に聴いたせいです。』",
	"目が明く藍色",
	"ネイティブダンサー",
	"セントレイ",
	"サンプル"
	
];

// 現在の再生情報
var count = 0;
var index = Math.floor(Math.random() * VIDEO_IDS.length);
var videoId = VIDEO_IDS[index];
var videoTitle = VIDEO_TITLES[index];
var startTime = new Date();

app.get('/', function(req, res){
  var date = new Date();
  res.render('index', {
    title: TITLE,
    video_title: videoTitle,
    video_id: videoId,
    time: date.getTime() - startTime.getTime(),	// 経過時間[msec]
    video_count: count,
    viewer: viewerCount
  });
});
app.get('/video', function(req, res){
  console.log("video!!!");
  var old_video_id = req.query.video_id;
  var old_video_count = req.query.video_count;
  console.log("Old count = " + old_video_count);
  
  // 終了した動画カウントがcountと一致するとき、次の動画をランダムに決める
  if (old_video_count == count) {
    console.log("Next video");
    do {
      var index = Math.floor(VIDEO_IDS.length * Math.random());
      videoId = VIDEO_IDS[index];
      videoTitle = VIDEO_TITLES[index]
      startTime = new Date();
    } while (videoId == old_video_id);
    count++;
    if (count >= 100) {
      count = 0;
    }
  }
  
  var date = new Date();
  var params = {
    title: TITLE,
    video_title: videoTitle,
    video_id: videoId,
    time: date.getTime() - startTime.getTime(),	// 経過時間[msec]
    video_count: count,
    viewer: viewerCount
  };
  res.send(params);
});

// Socket.io
var io = require('socket.io').listen(app);
// Herokuではwebsocketが使えなかったのでXHR-POLLING
io.configure('production', function(){
  io.set('transports', [
    'xhr-polling'
  , 'jsonp-polling'
  ]);
});
io.sockets.on('connection', function(socket) {
	// 接続数
	console.log("connection!");
	viewerCount++;
	socket.emit("viewer", viewerCount);
	socket.broadcast.emit("viewer", viewerCount);
	
	// 再生時間の送信開始
	setInterval(function () {
		var date = new Date();
		var time = date.getTime() - startTime.getTime();
		socket.emit("playtime", time);
	}, 1000);
	
	// disconnect
	socket.on('disconnect', function() {
		viewerCount--;
		socket.emit("viewer", viewerCount);
		socket.broadcast.emit("viewer", viewerCount);
		
		if (viewerCount == 0) {
			console.log("No viewers. Reset.");
			index = Math.floor(Math.random() * VIDEO_IDS.length);
			videoId = VIDEO_IDS[index];
			videoTitle = VIDEO_TITLES[index];
			startTime = new Date();
		}
	});
});

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


