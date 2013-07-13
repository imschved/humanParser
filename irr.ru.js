var async, wd, fs, mongoose;
try {
    async = require('async');
    wd = require('wd');
    assert = require('assert');
    fs = require('fs');
    mongoose = require('mongoose');
    emailjs   = require("emailjs");
} catch( err ) {
     //TODO сделать обработчик неправильного подключения
}

var browser = wd.promiseRemote();
//TODO сделать подгрузку конфигов
var URL = 'http://www.irr.ru',
    LOCATOR = { className: 'popupRegions', cssPath : '.popupRegions > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > div:nth-child(1) > span:nth-child(1)'},
    OPTION = {  region : 'Нижний Новгород',
        category: 'Легковые автомобили',
        price : {from : 0 , to : 1800000},
        cy : 'RUR',
        releaseYear : {from : 2010, to : 2013},
        mileage : {from : 0 , to : 99000 },
        mark : ['BMW','ВАЗ', 'Audi','Hyundai'],
        model : ['X1', 'X3', 'X5'],
        carcass : ['седан', 'хэтчбек'],
        transmisson : ['автоматическая', 'механическая'],
        motor : ['бензин'],
        gear : ['задний','передний','постоянный полный','подключаемый полный'],
        photo : false,
        video : false,
        district : ['Заречный','Нагорный'],
        area : ['Автозаводский', 'Канавинский', 'Ленинский'],
        metro : {   lines : ['Автозаводская', 'Сормовская'],
                    station : ['Горьковская м.', 'Пролетарская м.']},
        source : ['любой'],
        submitted : ['вчера и сегодня'],
        ajaxWaitMilisec : 2000,

        elWait : 3000},
    PARSER= {   SHORT : [],
                STOP : false,
                LOGFILE : 'log.js',
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
                }};

//соединяемся с базой
mongoose.connect(PARSER.MONGODB);
//класс отправки сообщений
var emailWrapper = function(options){
    if(!options){
        options = {};
        options.server = {
            user:    "user",
            password:"pass",
            host:    "smtp.gmail.com",
            ssl:     true
        };
    }
    //коннектимся к серверу
    this.connect = emailjs.server.connect(options.server);
    //отправка сообщения
    this.send = function ( message, cb){

        if(!cb){
            cb = function(err, results){
                //console.log('send...');
                if(err){
                    //console.log('send[Errors]...');
                    console.log(err);
                }
                if(results){
                    //console.log('send[Results]...');
                    //console.log(results);
                }
            };
        }
        this.connect.send(message, cb);
    }
};
//класс для действий с базой
var dbWrapper = function (mongoose, schema, modelName){
    //console.log('dbWrapper');
    //конструктор
    if(!mongoose){
        mongoose.connect('mongodb://localhost/irrru');
    }
    //соединение
    this._db = mongoose.connection;
    this._db.on('error', console.error.bind(console, 'connection error:'));
    this._db.once('open', function callback () {
        //console.log('dbWrapper');
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

    //закрытие соединяи
    this.close = function (cb){
        if(!cb){
            cb = function(err, results){
                //console.log('close connection...');
                if(err){
                    //console.log('close connection[Errors]...');
                    console.log(err);
                }
                if(results){
                    //console.log('close connection[Results]...');
                    //console.log(results);
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
                //console.log('add ...');
                if(err){
                    //console.log('add[Errors]...');
                    console.log(err);
                }
                if(results){
                    //console.log('add[Results]...');
                    //console.log(results);
                }
            };
        }

        doc.save(function(err, results){
            if(err){
                //console.log('add[Errors]...');
                console.log(err);
            }
                cb(null,results);
        });
    }

};
//класс установщика парметров
var ParamsSetter = function (params){
    //console.log('работает Конструктор установщика парметров');
    //------function
    this.param = params;         //TODO поменять на конструктор, который по дефолту заполняет поля параметров поиска

    //функция установки параметров цены от до
    this.price = function(cb){

        //console.log('работает функция установки параметров цены от до');
        var self = this;
        async.series({
            from : function(callback){
                //console.log('from');
                self.typping(
                    'price[from]',
                    OPTION.price.from,
                callback);
            },
            to :  function(callback){
                //console.log('to');
                self.typping(
                    'price[to]',
                    OPTION.price.to,
                    callback);
            }
        }, function(err, results){
            if(err){
                //console.log('Ошибки установки параметров цены от до');
                console.log(err);
            }
            //console.log('Результаты установки параметров цены от до');
            //console.log(results);
            if(cb){
                cb(null, true);
            }
        });
    }
    //функция установки параметров пробега
    this.mileage = function(cb){

        //console.log('работает функция установки параметров пробега');
        var self = this;
        async.series({
            from : function(callback){
                //console.log('from');
                self.typping(
                    'mileage[from]',
                    OPTION.mileage.from,
                callback);
            },
            to :  function(callback){
                //console.log('to');
                self.typping(
                    'mileage[to]',
                    OPTION.mileage.to,
                    callback);
            }
        }, function(err, results){
            if(err){
                //console.log('Ошибки установки параметров пробега');
                console.log(err);
            }
            //console.log('Результаты установки параметров пробега');
            //console.log(results);
            if(cb){
                cb(null, true);
            }
        });
    }
    //функция установки валюты
    this.cy = function (cb){
        //console.log('работает функция установки параметров валюты');
        var self = this;
        async.series({
                set : function(callback){
                   //console.log('set');
                    self.selectChange(
                        'div.filtersSelect:nth-child(4) > div:nth-child(2) > div:nth-child(1)',
                        'div.filtersSelect:nth-child(4) > div:nth-child(3) > div:nth-child(1) > div',
                        OPTION.cy,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров валюты');
                    console.log(err);
                }
                //console.log('Результаты установки параметров валюты');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
        });

    }
    //функция установки года выпуск до
    this.releaseYear = function (cb){
        //console.log('работает функция установки установки года выпуска');
        var self = this;
        async.series({
            from : function(callback){
                //console.log('from');
                self.selectChange(
                    'div.filtersSelect:nth-child(1) > div:nth-child(2) > div:nth-child(1)',
                    'div.filtersSelect:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div',
                    OPTION.releaseYear.from,
                    callback);
            },
            to : function(callback){
                //console.log('to');
                self.selectChange(
                    'div.filtersSelect:nth-child(3) > div:nth-child(2) > div:nth-child(1)',
                    'div.filtersSelect:nth-child(3) > div:nth-child(3) > div:nth-child(1) > div',
                    OPTION.releaseYear.to,
                    callback);
            }
        }, function(err, results){
            if(err){
                //console.log('Ошибки установки параметров цены от до');
                console.log(err);
            }
            //console.log('Результаты установки параметров цены от до');
            //console.log(results);
            if(cb){
                cb(null, true);
            }
        });
    }
    //функция выбора марки автомобиля
    this.mark = function (cb){
        //console.log('работает функция установки выбора марки');
        var self = this;
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByCss(
                        'div.filterItem:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)',
                        'input[name="make[]"]',
                        OPTION.mark,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров выбора марки');
                    console.log(err);
                }
                //console.log('Результаты установки параметров выбора марки');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора модели автомобиля
    this.model = function (cb){
        //console.log('работает функция установки модели автомобиля');
        var self = this,
            values = [];
        async.series({
                wait : function(callback){
                    //console.log('wait');
                    setTimeout(function(){
                        callback(null);
                    }, OPTION.ajaxWaitMilisec);
                },
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[6]/div/div[1]',
                        '//div[@class="level2"]/label[@class="chk-b"]',
                        OPTION.model,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров модели автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров модели автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора кузова автомобиля
    this.carcass = function (cb){
        //console.log('работает функция установки кузова  автомобиля');
        var self = this,
            values = [];
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[7]/div/div[2]/div[1]/div[1]',
                        '//div[@class="wrap"]/label[@class="chk-b"]',
                        OPTION.carcass,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров кузова автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров кузова автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора трансмиссии автомобиля
    this.transmisson = function (cb){
        //console.log('работает функция установки трансмиссии  автомобиля');
        var self = this,
            values = [];
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[8]/div/div[2]/div[1]/div[1]',
                        '//div[@class="wrap"]/label[@class="chk-b"]',
                        OPTION.transmisson,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров трансмиссии автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров трансмиссии автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора типа двигателя автомобиля
    this.motor = function (cb){
        //console.log('работает функция установки  типа двигателя  автомобиля');
        var self = this,
            values = [];
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[9]/div/div[2]/div[1]/div[1]',
                        '//div[@class="wrap"]/label[@class="chk-b"]',
                        OPTION.motor,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров  типа двигателя автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров  типа двигателя автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора типа двигателя автомобиля
    this.gear = function (cb){
        //console.log('работает функция установки  типа двигателя  автомобиля');
        var self = this,
            values = [];
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[10]/div/div[2]/div[1]/div[1]',
                        '//div[@class="wrap"]/label[@class="chk-b"]',
                        OPTION.gear,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров  типа двигателя автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров  типа двигателя автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора наличия фотографии автомобиля
    this.photo = function (cb){
        //console.log('работает функция установки  наличия фотографии   автомобиля');
        var self = this;
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.clickCheck(
                        'hasimages',
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров  наличия фотографии  автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров  наличия фотографии  автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
        //функция выбора наличия видео автомобиля
    this.video = function (cb){
        //console.log('работает функция установки  наличия видео   автомобиля');
        var self = this;
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.clickCheck(
                        'isvideo',
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки установки параметров  наличия видео  автомобиля');
                    console.log(err);
                }
                //console.log('Результаты установки параметров  наличия видео  автомобиля');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора округа
    this.district = function (cb){
        //console.log('работает функция установки  округа');
        var self = this,
            values = [];
        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[13]/div/div[2]/div[1]/div[1]',
                        '//label[@class="chk-b"]',
                        OPTION.district,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция установки  округа');
                    console.log(err);
                }
                //console.log('работает функция установки  округа');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
       //функция выбора района
    this.area = function (cb){
        //console.log('работает функция установки  района');
        var self = this;

        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[13]/div/div[3]/div[1]/div[1]',
                        '//label[@class="chk-b"]',
                        OPTION.area,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция установки  района');
                    console.log(err);
                }
                //console.log('работает функция установки  района');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора метро линий
    this.metroLine = function (cb){
        //console.log('работает функция установки  метро линий');
        var self = this;

        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[14]/div/div[2]/div[1]/div[1]',
                        '//label[@class="chk-b"]',
                        OPTION.metro.lines,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция установки  метро линий');
                    console.log(err);
                }
                //console.log('работает функция установки  метро линий');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора метро станций
    this.metroStation = function (cb){
        //console.log('работает функция установки  метро станций');
        var self = this;

        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[14]/div/div[3]/div[1]/div[1]',
                        '//label[@class="chk-b"]',
                        OPTION.metro.station,
                        callback);
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция установки  метро станций');
                    console.log(err);
                }
                //console.log('работает функция установки  метро станций');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора источника
    this.source = function (cb){
        //console.log('работает функция выбора источника');
        var self = this;

        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[15]/div/div[2]/div[1]/div[1]',
                        '//div[@class="selectSelectedItem"]',
                        OPTION.source,
                        callback,
                        false
                    );
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция выбора источника');
                    console.log(err);
                }
                //console.log('работает функция выбора источника');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция выбора даты подачи объявления
    this.submitted = function (cb){
        //console.log('работает функция выбора источника');
        var self = this;

        async.series({
                set : function(callback){
                    //console.log('set');
                    self.selectCheckBoxesByXPath(
                        '//*[@id="filter"]/div/div[2]/div[16]/div/div[2]/div[1]/div[1]',
                        '//div[@class="selectSelectedItem"]',
                        OPTION.submitted,
                        callback,
                        false
                    );
                }
            },
            function(err, results){
                if(err){
                    //console.log('работает функция выбора даты подачи объявления');
                    console.log(err);
                }
                //console.log('работает функция выбора даты подачи объявления');
                //console.log(results);
                if(cb){
                    cb(null, true);
                }
            });

    }
    //функция нажатия на селект
    this.selectChange = function(selectCss, optionCss, optionVal, callback){
        browser.elementByCss(selectCss)
            .then(function(el){
                el.click();
                return;
            })
            .then(function(){
                return browser.elementByCss(optionCss + '[value="' + optionVal + '"]');
            })
            .then(function(el){
                el.click();
                return;
            }).then(function(){
                if(callback){
                    callback(null);
                }
                //console.log('...end selectChange');
            });
    }
    //функция нажатия на селект  c чекбоксом  c помощью css
    this.selectCheckBoxesByCss = function(selectCss, optionCss, options, callback){
        var locators = [];

        async.series({
            initLocators : function(cb){
                async.eachSeries(options, function(item, cbEach){
                    locators.push(optionCss + '[value="' + item +'"]');
                    cbEach(null);
                }, function(err){
                    cb(null);
                });
            },
            clickOnMenu : function(cb){
                browser.elementByCss(selectCss)
                    .then(function(el){
                        el.click();
                        return;
                    })
                    .then(function(){
                        cb(null);
                    });
            },
            clickOnCheckboxes : function(cb){
                async.eachSeries(locators, function(item, cbEach){
                    browser.elementByCss(item)
                        .then(function(el){
                            el.click();
                        })
                        .then(function(){
                            cbEach(null);
                        });
                }, function(err){
                    cb(null);
                });
            },
            clickOnMenuEnd : function(cb){
                browser.elementByCss(selectCss)
                    .then(function(el){
                        el.click();
                        return;
                    })
                    .then(function(){
                        cb(null);
                    });
            }

        },function(err){
            callback(null);
        });

    }
    //функция нажатия на селект  c чекбоксом  c помощью xpath
    this.selectCheckBoxesByXPath = function(selectXPath, optionXPath, options, callback, clickMenuOnEnd){
        var locators = [];

        async.series({
            initLocators : function(cb){
                async.eachSeries(options, function(item, cbEach){
                    locators.push(optionXPath + '[contains(text(), "' + item + '")][1]');
                    cbEach(null);
                }, function(err){
                    cb(null);
                });
            },
            clickOnMenu : function(cb){
                browser.elementByXPath(selectXPath)
                    .then(function(el){
                        el.click();
                        return;
                    })
                    .then(function(){
                        cb(null);
                    });
            },
            clickOnCheckboxes : function(cb){
                async.eachSeries(locators, function(item, cbEach){
                    browser.elementByXPath(item)
                        .then(function(el){
                            el.click();
                        })
                        .then(function(){
                            cbEach(null);
                        });
                }, function(err){
                    cb(null);
                });
            },
            clickOnMenuEnd : function(cb){
                if(clickMenuOnEnd == undefined)  {
                    browser.elementByXPath(selectXPath)
                        .then(function(el){
                            el.click();
                            return;
                        })
                        .then(function(){
                            cb(null);
                        });
                }
                else{
                    cb(null);
                }

            }

        },function(err){
            callback(null);
        });

    }
    //функция ввода значения в инпут
    this.typping = function (inputName, val, callback){
        browser.elementByName(inputName)
            .then(function(el){
                el.type(val);
                return;
            }).then(function(){
                if(callback){
                    callback(null);
                }
                //console.log('...end typping ' + inputName);
            });
    }
    //функция нажатия на чекбокс
    this.clickCheck = function (inputName, callback){
        browser.elementByName(inputName)
            .then(function(el){
                el.click();
                return;
            }).then(function(){
                if(callback){
                    //console.log('...end clickChecking ' + inputName);
                    callback(null);
                }

            });
    }
    //функция нажатия на элемент по id
    this.clickId = function (id, callback){
        browser.elementById(id)
            .then(function(el){
                el.click();
                return;
            }).then(function(){
                if(callback){
                    //console.log('...end click ' + inputName);
                    callback(null);
                }

            });
    }

};
//класс парсера
var parser = function (params){
    //console.log('работает  парсер');
    //------function
    this.param = params;         //TODO поменять на конструктор, который по дефолту заполняет поля параметров поиска
   //функция сбора коротких данных
    this.short = function (xpath, cb){
        //console.log('работает функция сбора коротких данных');
        var self = this,
            locators = [];
        async.series({
                wait : function(callback){
                    //console.log('wait');
                    setTimeout(function(){
                        callback(null, true);
                    }, OPTION.ajaxWaitMilisec);
                },
                makeLocators : function(callback){
                    //console.log('makeLocators');
                    browser.elementByXPathOrNull(xpath)
                        .then(function(el){
                            if(el) {
                                return ;
                            }
                            else{
                                callback('Нет такого элемента - ' + xpath);
                            }
                        })
                        .then(function(){
                            return browser.elementsByXPath(xpath);
                        })
                        .then(function(elements){
                            var i = 1;
                            locators = [];
                            async.eachSeries(elements, function(item, cbEach){
                                locators.push(xpath + '[' + i + ']');
                                i++;
                                cbEach(null);
                            }, function(err){
                                //console.log(err);
                                //console.log(locators);
                                callback(null, true);
                            });
                        });
                },
                getShortInfo : function(callback){
                    //console.log('getShortInfo');
                    async.mapSeries(locators, function(item, cbMap){
                        self.getInfoByXPath(item,cbMap);
                    }, function(err,results){
                            if(results != undefined){
                                results.forEach(function(item){
                                    PARSER['SHORT'].push(item);
                                });

                            }
                            if(err){
                                //console.log('ошибки работа короткого парсера');
                                console.log(err);
                            }
                            callback(null, true);

                    });
                },
                clickNext : function(callback) {
                    //console.log('clickNext');
                    browser.elementByClassNameOrNull('ico-blueStrR')
                        .then(function(el){
                             if(el){
                                 el.click();
                             }
                            else {
                                 PARSER['STOP'] = true;
                             }
                        })
                        .then(function(){
                            callback(null, true);
                        });
                }
            },
            function(err, results){
                if(err){
                    //console.log('Ошибки сбора коротких данных');
                    console.log(err);
                }
                //console.log('Результаты сбора коротких данных');
                //console.log(results);
                /*//console.log('Короткие данные :');
                //console.log(PARSER['SHORT']); */

                if(cb){
                    cb(null, true);
                }
            });
    }
    //функция получения тескта и url ссылки по xpath
    this.getInfoByXPath = function (xpath, callback){
        var itemText  = '',
            itemHref = '',
            itemPrice = '',
            itemLocation = '',
            textLinkXPath =  xpath + '/td[@class="tdTxt"][1]/div/a[1]',
            priceXPath =  xpath + '/td[@class="tdPrise"][1]',
            locationXPath = xpath + '/following-sibling::tr[1]';//[@class="bottomParams"]
        //console.log(textLinkXPath + ' ' + priceXPath + ' ' + locationXPath);
        async.series({
            getText : function(cb){
                browser.elementByXPathOrNull(textLinkXPath)
                    .then(function(el){
                        if(el) {
                            return el.text();
                        }
                        else{
                            cb('Нет такого элемента - ' + textLinkXPath);
                        }
                    })
                    .then(function(text){
                        itemText = text;
                        cb(null);
                    });
            },
            getHref: function(cb){
                browser.elementByXPathOrNull(textLinkXPath)
                .then(function(el){
                    return el.getAttribute('href');
                })
                .then(function(href){
                    itemHref = href;
                    cb(null);
                });
            },
            getPrice : function(cb){
                browser.elementByXPathOrNull(priceXPath)
                    .then(function(el){
                        if(el) {
                            return el.text();
                        }
                        else{
                            cb('Нет такого элемента - ' + priceXPath);
                        }
                    })
                    .then(function(text){
                        itemPrice = text;
                        cb(null);
                    });
            },
            getLocation : function(cb){
                browser.elementByXPathOrNull(locationXPath)
                    .then(function(el){
                        if(el) {
                            //получаем текст
                            return el.text();
                        }
                        else{
                            cb('Нет такого элемента - ' + locationXPath);
                        }
                    })
                    .then(function(text){
                        itemLocation = text;
                        cb(null);
                    });
            }

        },function(err){
            if(err){
                callback(err);
            }
            else{
                callback(null, {title : itemText, link : itemHref, price : itemPrice, location : itemLocation});
            }
        });
    }
    //функция получения количества коротких объявлений
    this.getShortCount = function(){
        PARSER.countShort =  PARSER.SHORT.length;
    }

}

//роутер для установки параметров
function setParamsRouter(param, cb){
    //console.log('работает роутер конфигурации');
    var setter = new ParamsSetter(param);
    switch(param.category){
        case 'Легковые автомобили':
            async.series({
                price : function(callback){
                    //console.log('price');
                    setter.price.call(setter, callback);

                   //callback(null, true);
                },
                cy : function(callback){
                   //setter.cy.apply(setter);
                    //console.log('cy');
                    setter.cy.call(setter, callback);
                },
                releaseYearTo : function(callback){
                  //setter.releaseYearTo.apply(setter);
                    //console.log('releaseYearTo');
                    setter.releaseYear.call(setter, callback);
                },
                mileage : function(callback){
                  //setter.releaseYearTo.apply(setter);
                    //console.log('mileage');
                    setter.mileage.call(setter, callback);
                },
                mark : function(callback){
                  //setter.releaseYearTo.apply(setter);
                    //console.log('mark');
                    setter.mark.call(setter, callback);
                },
                model :  function(callback){
                    //console.log('model');
                    setter.model.call(setter, callback);
                },
                carcass :  function(callback){
                    //console.log('carcass');
                    setter.carcass.call(setter, callback);
                },
                transmisson :  function(callback){
                    //console.log('transmisson');
                    setter.transmisson.call(setter, callback);
                },
                motor :  function(callback){
                    //console.log('motor');
                    setter.motor.call(setter, callback);
                },
                gear :  function(callback){
                    //console.log('gear');
                    setter.gear.call(setter, callback);
                },
              /*  photo :  function(callback){
                    //console.log('photo');
                    setter.photo.call(setter, callback);
                },
                video :  function(callback){
                    //console.log('video');
                    setter.video.call(setter, callback);
                },
                district :  function(callback){
                    //console.log('disctrict');
                    setter.district.call(setter, callback);
                },
                area :  function(callback){
                    //console.log('area');
                    setter.area.call(setter, callback);
                },
                metroLine :  function(callback){
                    //console.log('metroLine');
                    setter.metroLine.call(setter, callback);
                },
                metroStation :  function(callback){
                    //console.log('metroStation');
                    setter.metroStation.call(setter, callback);
                }, */
                source :  function(callback){
                    //console.log('source');
                    setter.source.call(setter, callback);
                },
                submitted :  function(callback){
                    //console.log('submitted');
                    setter.submitted.call(setter, callback);
                }



            }, function(err, results){
                if(err){
                    //console.log('Ошибки заполнения параметров');
                    console.log(err);
                }
                //console.log('Результаты заполнения параметров');
                //console.log(results);
                if(cb){
                    cb(err, null);
                }
            });


        break;
        default:
            break;
    }
}

//роутер для  парсинга элементов
function parsingRouter(param, cb){
    //console.log('работает роутер парсинга');
    var myParser = new parser(param);

    switch(param.category){
        case 'Легковые автомобили':
            async.whilst(
                function() { return !(PARSER['STOP']);},
                function(callback){
                    myParser.short.call(myParser,'//table/tbody/tr[@data-itemid][@data-position]',callback);
                },
                function (err){
                    myParser.getShortCount();
                    console.log(err);
                    //console.log('... end parsing');
                    cb(null, true);
                }
            );
        break;
        default:
            break;
    }
}
//--------------



browser.on('status', function(info){
    //console.log('\x1b[36m%s\x1b[0m', info);
});
 /*
browser.on('command', function(meth, path, data){
    //console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path, data || '');
});  */

//засекаем время
var startTime = new Date(),
    endTime = undefined;
    startTime = startTime.getTime();
//начинаем работу

async.series({
        init: function(callback){
            //console.log('init');
            browser.init({browserName: 'firefox'})
                .then(function(){
                    browser.deleteAllCookies();
                    return;
                })
                .then(function(){
                    browser.get(URL);
                    return;
                }).then(function(){
                    callback(null, true);
                });
        },
        setRegions: function(callback){
            //console.log('setRegions');
            browser.waitForVisibleByClassName(LOCATOR.className, OPTION.elWait)
                .then(function(){
                    return browser.elementByClassName(LOCATOR.className);})
                .then(function(el){
                    //определяем виден ли попап с регионом
                    return el.isVisible();
                })
                .then(function(isVisible){
                    if(!isVisible) {
                        ;    //TODO: Если попап не видим нажать на ссылку для появления попапа
                    }
                    //меняем локатор с элемента попапа на инпут попапа
                    LOCATOR.className = 'ui-autocomplete-input';
                    LOCATOR.cssPath = '.b-searchPopup > .inp-b > input';
                    return ;
                }).then(function(){
                    //находи инпут для ввода региона
                    return browser.elementByCss(LOCATOR.cssPath);
                }).then(function(el){

                    //меняем локатор с элемента на пустой результат поиска города
                    LOCATOR.className = 'dontSearch';
                    LOCATOR.cssPath = '';

                    //набираем регион
                    return el.type(OPTION.region);
                })
                .then(function(){
                    //ждем элемент т.к. ajax подгрузится не сразу. 5 секнуд  будет достаточно
                    return browser.waitForVisibleByClassName(LOCATOR.className, OPTION.ajaxWaitMilisec);
                })
                .then(function(isVisible){
                    if(isVisible !== false) {  //если видимы значит такого населенного пункта нет
                        callback('Нет такого города', false);
                    }
                    //меняем локатор на первый город в списке
                    LOCATOR.className = '';
                    LOCATOR.cssPath = '.b-searchRegion > ul:nth-child(1) > li:nth-child(1)';
                    return browser.elementByXPath('//span[contains(text(), "' + OPTION.region + '")]');
                })
                .then(function(el){
                    el.click();
                    callback(null, true);
                });
        },
        setCategory:function(callback){
            //console.log('setCategory');
            var cb = callback;
            browser.waitForVisibleByPartialLinkText(OPTION.category,OPTION.elWait)
                .then(function(){
                    return browser.elementByPartialLinkText(OPTION.category);
                })
                .then(function(el){
                    el.click();
                    return ;
                })
                .then(function() {
                    //показываем рассширенные параметры
                    LOCATOR.className = 'expand_extended_more';
                    LOCATOR.cssPath = '.expand_extended_more > span:nth-child(1)';
                    return  browser.waitForElementByClassName(LOCATOR.className, OPTION.elWait);
                })
                .then(function(){
                    return browser.elementByClassName(LOCATOR.className);
                })
                .then(function(el){
                    el.click();
                })
                .then(function(){
                    setParamsRouter(OPTION, cb); //установка параметров поиска
                });

        },
        find : function(callback){
            browser.elementById('show-result-search')
                .then(function(el){
                    el.click();
                })
                .then(function(){
                    callback(null, true);
                });
        },
        parser : function(callback){
            parsingRouter(OPTION, callback);
        },
        saveShort : function(callback){
            //console.log('saveShort');
            /*fs.writeFile("log.js", JSON.stringify(PARSER['SHORT']), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    //console.log("The file was saved!");
                }
                //calback(err, true);
            }); */
            var dbObj = new dbWrapper(mongoose,PARSER.MONGODBSCHEMA, PARSER.MONGOCODBLLECTION);
            async.map(PARSER.SHORT, function(item, cbMap){
                dbObj.add(item,cbMap);
            }, function(err,results){
                if(err){
                    //console.log('ошибки добавления в базу');
                    console.log(err);
                }
                dbObj.close();
                callback(err, true);

            });
        }

    },
    function(err, results) {
        //console.log('Результаты выполнения');
        //console.log(results);
        //console.log('Ошибки выполнения');
        console.log(err);
        endTime = new Date();
        endTime = endTime.getTime();
        //console.log('Время выполнения: ' + (endTime - startTime)/1000 + ' c.');
        //console.log('Количество спарсенных результатов: ' + PARSER.countShort);
        //console.log('Количество спарсенных результатов в секунду: ' + (PARSER.countShort/((endTime - startTime)/1000)));
        browser.quit();
        //mongoose.connection.close();
    });
