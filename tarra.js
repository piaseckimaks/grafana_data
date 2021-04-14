const mssql = require('mssql');
const mysql = require('mysql');
const log4js = require('log4js');
const config = require('./config');

const logsDate = new Date();

//configure loging package
log4js.configure(
    {
        appenders: { fileAppender: {type: 'file', filename: `./logs/tarra/${logsDate.toYMD()}_tarra.log`}},
        categories: { default: { appenders: ['fileAppender'], level: 'info' }}
    }
)
//setting up a logger
const logger = log4js.getLogger();


const configSIS = config.configSISHistory;
const configGrafana = config.configGrafana;

const sisHistoryPool = mssql.connect(configSIS);
const grafanaMySQL = mysql.createConnection(configGrafana);


sisHistoryPool
    .then( () => {
        logger.info(`Connection with ${configSIS.database} at ${configSIS.server} is succesfull!`);

        grafanaMySQL.connect(err=>
            {
            if(err){ logger.error(err); return;}
            
            logger.info('Connected as id ' + grafanaMySQL.threadId + ' with MySQL at ' + configGrafana.host);
        })
    })
    .then( () => mssql.query(
        `
        select top(5) ID, Scale, Tarra, dtCreated
        from [SIS_History].[dbo].[t_hist_Weight]
        where dtCreated >= DATEADD(minute, -30, GETDATE())
        and Mode = 3
        and Scale in (22, 26, 27, 48, 49)
        order by ROW_NUMBER() OVER (PARTITION BY Scale ORDER BY ID), Scale
   
        `
    ))
    .then(result =>
    {   
        logger.info('Query in SIS_History succesfully executed!');

        const queryDataRows = result.recordset;

        if(queryDataRows.length > 0) logger.info('Data from SIS_History query available');

        const newArray = [];
        queryDataRows.map(element => {
            //console.log(element)
            
            const id = element.ID;
            const scale = element.Scale;
            const tarra = element.Tarra;
            //for (key in element.dtCreated) {
            //    console.log(key)
            //}
            const dtCreated = element.dtCreated.toDBString();
            newArray.push(id, scale, tarra, dtCreated)
            //dtCreated = dtCreated.toISOString()
            console.log(element.dtCreated)
                
            //console.log(newArray)
            grafanaMySQL.query(
                `INSERT INTO Grafana_Tarra_Scales_Slachterij (ID, Scales, Tarra, dtCreated) VALUES (${id}, ${scale}, ${tarra},'${dtCreated}');`,
                err => 
                {
                    if (err) throw err;
                });
        }); 
        console.log(newArray)
        logger.info('Insert succesfully made to tarraTable');

        grafanaMySQL.end();
        })
    .then(()=> mssql.close());