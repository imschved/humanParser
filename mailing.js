var async, mongoose, emailjs,swig;
try {
    async = require('async');
    mongoose = require('mongoose');
    emailjs   = require("emailjs");
    swig = require('swig');
} catch( err ) {
    //TODO сделать обработчик неправильного подключения
}


//класс отправки сообщений
var emailWrapper = function(options){
    if(!options){
        options = {};
        options.server = {
            user:       "you login",
            password:   "you pass",
            host:    "smpt host",
            ssl:     true
        };
        options.shortTemplatepath = '/templates/newcar.html';
    }
     this.connect = undefined;
    this.connect = emailjs.server.connect(options.server);
    //отправка сообщения
    this.send = function ( message, cb){
        //коннектимся к серверу
       // this.connect = emailjs.server.connect(options.server);
        if(!cb){
            cb = function(err, results){
                console.log('send...');
                if(err){
                    console.log('send[Errors]...');
                }
                if(results){
                    console.log('send[Results]...');
                }
            };
        }
        this.connect.send(message, function(err, result){
            if(!err){
                result.id = message.id;
                console.log('нет ошибок отправки сообщения');
                console.log(message.id);
            }
            else{
                console.log('ошибки отправки сообщения');
                console.log(err);
            }
            setTimeout(function(){
                console.log('Ожидание');
                cb(err,result.id);
            }, MAIL.timeout);

        });
    }
    this.templateShortPath = __dirname + options.shortTemplatepath;
    //формирование html шаблона короткогои письма зависит от SWIG!!!!
    this.makeShortHtml = function(vars){
        var tmpl = swig.compileFile(this.templateShortPath);
        var html = tmpl.render({
            title : vars.title,
            link : vars.link,
            price : vars.price,
            location : vars.location
        });
        return html;
    }

    //формирование Plain текста
    this.makeShortPlain = function(item){
        return item.title + '\r\n' + item.price + '\r\n' + item.location + '\r\n' + item.link;
    }
};
//класс для действий с базой
var dbWrapper = function (mongoose, schema, modelName){
    console.log('dbWrapper');
    //конструктор
    if(!mongoose){
        mongoose.connect('mongodb://localhost/irrru');
    }
    //соединение
    this._db = mongoose.connection;
    this._db.on('error', console.error.bind(console, 'connection error:'));
    this._db.once('open', function callback () {
        console.log('dbWrapper');
    });
    //схема
    if(!schema){
        schema = {};
    }
    this._schema = mongoose.Schema(schema);
    if(!modelName){
        modelName = 'NewModel';
    }
    //модель
    this._model = mongoose.model(modelName, this._schema);
    //документ

    //закрытие соединения
    this.close = function (cb){
        if(!cb){
            cb = function(err, results){
                console.log('close connection...');
                if(err){
                    console.log('close connection[Errors]...');
                    console.log(err);
                }
                if(results){
                    console.log('close connection[Results]...');
                    console.log(results);
                }
            };
        }
        this._db.close(cb);
    }
    //функция добавления документа
    this.add = function(item, cb){
        var doc = new this._model;

        for(prop in schema){
            if(item[prop]){
                doc[prop] = item[prop];
            }
        }

        if(!cb){
            cb = function(err, results){
                console.log('add ...');
                if(err){
                    console.log('add[Errors]...');
                    console.log(err);
                }
                if(results){
                    console.log('add[Results]...');
                    console.log(results);
                }
            };
        }

        doc.save(function(err, results){
            if(err){
                console.log('add[Errors]...');
                console.log(err);
            }
            cb(null,results);
        });
    }


};
//TODO сделать подгрузку конфигов
var MAIL = {
    server : {
        user:    "*********",
        password: "********",
        host:    "smtp.mail.ru",
        port : 465,
        ssl:     true
    },
    from:    "Из рук в руки <******@****>",
    to:      "другу <******@******>",
    shortTemplatepath : '/templates/newcar.html',
    subject : 'Новый автомобиль',
    timeout : 5000

},
    DB = {
        MONGODB : 'mongodb://localhost/irr',
        MONGOCODBLLECTION : 'result',
        MONGODBSCHEMA : {
            title : String,
            link :  {type : String , unique : true},
            price : String,
            location : String,
            phone : String,
            text : String,
            images : Array,
            sms : {type : Boolean, default : false },
            email : {type : Boolean, default : false }
        }
    };


//соединяемся с базой
mongoose.connect(DB.MONGODB);
//создаем экземпляр для доступа к базе
var dbObj =  new dbWrapper(mongoose,DB.MONGODBSCHEMA, DB.MONGOCODBLLECTION),
    emailObj = new emailWrapper(MAIL);
//получаем все не отправленные оповещения
async.waterfall(
    [   //получаем все не отправленные оповещения
        function(callback){
            console.log('получаем все не отправленные оповещения');
            dbObj._model.find({email : false},function(err, ads){
                callback(err,ads);
            });
        },
        // формируем письма
        function(ads, callback){
            console.log('формируем письма в количестве ' + ads.length);
            var MAILS = [];
            async.eachSeries(ads,
                function(item, eachCb){
                   MAILS.push({html : emailObj.makeShortHtml(item), plain : emailObj.makeShortPlain(item), id : item._id});
                    eachCb(null);
                },
                function(err, results){
                   // console.log(MAILS);
                    callback(err, MAILS);
                });
        },
        //рассылаем письма
        function(MAILS,callback){
            console.log('рассылаем письма в количестве ' + MAILS.length);
            async.mapSeries(MAILS,
                function(item, eachCb){
                    console.log(item);
                    emailObj.send({
                        id : item.id,
                        from : MAIL.from,
                        to : MAIL.to,
                        text : item.plain,
                        subject : MAIL.subject,
                        attachment:
                            [
                                {data: item.html, alternative:true}
                            ]
                    },
                        function(err,item){
                            if(item != undefined){
                                dbObj._model.findByIdAndUpdate(item,{email : true}, null, function(err, results){     //обновляем те которые отправлены
                                    eachCb(err, results);
                                });
                            }
                            else{
                                eachCb(null, item);
                            }
                        });
                },
                function(err, results){
                    callback(err, results);
                });
        }
          ],
    function(err, results){
        console.log('Результаты выполнения');
        console.log(results);
        console.log('Ошибки выполнения');
       console.log(err);
        dbObj.close();
    }
);

//