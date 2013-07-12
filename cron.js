var cp = require('child_process'),
    cronJob = require('cron').CronJob;
var OPTIONS = {
    parser : {
        dir : __dirname,
        exe : 'node',
        options : null,
        params : ' irr.ru.js'
    },
    mail : {
        dir : __dirname,
        exe : 'node',
        options : null,
        params : ' mailing.js'
    }

};

var job = new cronJob('0 */20 * * * *', function(){
        //запуск парсера
        console.log('//запуск парсера');
        cp.exec(OPTIONS.parser.exe + OPTIONS.parser.params,   function (error, stdout) {
            console.log(stdout);
            if (error !== null) {
                console.log(error);
            }
            else{
                console.log('//запуск оповещатора');
                cp.exec(OPTIONS.mail.exe + OPTIONS.mail.params,   function (error, stdout) {
                    console.log(stdout);
                    if (error !== null) {
                        console.log(error);
                    }});
            }
        });
    }, null,
    true
);
