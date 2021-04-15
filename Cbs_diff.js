const mssql = require('mssql');
const mysql = require('mysql');
const log4js = require('log4js');
const config = require('./config');
const querys = require('./querys');


const logsDate = new Date();
const logsConfig = 
{
    appenders: { fileAppender: {type: 'file', filename: `./logs/Cbs_diff/${logsDate.toYMD()}_Cbs_diff.log`}},
    categories: { default: { appenders: ['fileAppender'], level: 'info' }}
}
//configure loging package
log4js.configure(logsConfig);

//setting up a logger
const logger = log4js.getLogger();

//getting configs for connections with DBs
const configSIS = config.configSISHistory;
const configGrafana = config.configGrafana;

//making connections variables
const sisHistoryPool = mssql.connect(configSIS);
const grafanaMySQL = mysql.createConnection(configGrafana);


//connection with SIS is handled as promise
sisHistoryPool
    .then( 
        //resolved
        () => {
            logger.info(`Connection with databaes ${configSIS.database} at ${configSIS.host} succesfull!`);
                
            return mssql.query(querys.CbsDiffQuery);
        },
        //rejected
        e => logger.error(e)
    )
    .then(result =>
    {   
        //logging info about succesfull query
        logger.info('Query Cbs_diff in SIS_History exetuced succesfully!');

        console.log(`1 ${result}`)
        console.log(`2 ${typeof result}`)
        

        const queryData = result.recordset[0];
        
        //logging info about succesfull data fetch
        if(queryData) logger.info('Data from query Cbs_diff available!');

        console.log(`3 ${queryData}`)
        const date = queryData.date.toYMD();

        const percent = queryData['Procent of good REC'];
        const diff = queryData['The difference in grams between CBS1 and CBS2'];

        grafanaMySQL.connect(err=>
            {
                if(err){ logger.error(err); return;}
        
                logger.info('Connected as id ' + grafanaMySQL.threadId + ' with MySQL at ' + configGrafana.host);
            })

        

        grafanaMySQL.query(
            `INSERT INTO Cbs_diff (Date, All_Rec, Percent, Diff, OK) VALUES ('${date}', ${queryData.ALL_REC}, ${percent} , ${diff} ,${queryData.ok});`, 
            err =>
            {
                if(err) throw err;

                console.log('Insert succesfully made to cbsDiff!');
            });
            
    },
    e => logger.error(e)
    )
    .then(  //resolved
            () => mssql.query(querys.scalesMotionQuery),
            //rejected
            e => logger.error(e)
    )
    .then(result =>
        {
            //logging info about succesfull query
            logger.info('Query motion_scales in SIS_History exetuced succesfully!');

            const queryDataRows = result.recordset;
    
            //logging info about succesfull data fetch
            if(queryDataRows.length > 0) logger.info('Data from query motion_scales available!');

            queryDataRows.forEach(element => {
                const date = element.dataTime.toYMD();
                const totalDay = element.totalDay;
                const percent = element.percent;
                const mode = element.mode;
                const Scale = element.Scale;

                grafanaMySQL.query(
                    `INSERT INTO Grafana_Motion_Scales (date, totalDay, percent, mode, Scale) VALUES ('${date}', ${totalDay}, ${percent} , ${mode} ,${Scale});`, 
                    err =>
                    {
                        if(err) throw err;
        
                    });
            });
            console.log('Insert succesfully made to motionScales!')
            grafanaMySQL.end();
            
        },
        e => logger.error(e)
    )
    .then(()=> mssql.close());







//

